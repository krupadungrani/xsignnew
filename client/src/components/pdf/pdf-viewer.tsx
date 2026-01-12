import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useDocumentSignatures, useApplySignature, useRemoveSignature, useUpdateSignaturePosition } from "@/hooks/use-pdf";
import { useDigitalSignatures } from "@/hooks/use-signature";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PasswordVerificationModal } from "@/components/signature/password-verification-modal";
import { DownloadModal } from "./download-modal";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { SimpleDragLayer } from "./simple-drag-layer";
import { AreaSelection } from "./area-selection";
import { type PdfDocument } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Grid3X3,
  RefreshCw,
  FileText,
} from "lucide-react";

// Set up PDF.js worker with improved error handling
console.log("Setting up PDF.js worker, version:", pdfjs.version);

// Initialize worker with multiple fallback options
const initializeWorker = () => {
  try {
    // Try local worker first
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    console.log("PDF.js worker set to local file");
    return true;
  } catch (error) {
    console.warn("Local worker failed, trying CDN:", error);
    
    try {
      // Try primary CDN
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
      console.log("PDF.js worker set to unpkg CDN");
      return true;
    } catch (cdnError) {
      console.warn("Primary CDN failed, trying backup:", cdnError);
      
      try {
        // Try backup CDN
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        console.log("PDF.js worker set to cdnjs CDN");
        return true;
      } catch (backupError) {
        console.error("All worker sources failed:", backupError);
        return false;
      }
    }
  }
};

// Initialize worker
const workerInitialized = initializeWorker();

// Performance optimizations
pdfjs.GlobalWorkerOptions.workerPort = null;

interface PdfViewerProps {
  document: PdfDocument;
  documents: PdfDocument[];
  onPositionChange?: (position: string) => void;
  selectedPosition?: string;
  onPageChange?: (page: number) => void;
  onRefresh?: () => void;
  selectedSignatureId?: string;
  onAreaSelected?: (area: { x: number; y: number; width: number; height: number }) => void;
  isSignaturePanelLoading?: boolean;
  signatureProgress?: number;
  signatureProgressMessage?: string;
  pageSelection?: string;
}

export function PdfViewer({ 
  document, 
  documents,
  onPositionChange, 
  selectedPosition: externalSelectedPosition,
  onPageChange,
  onRefresh,
  selectedSignatureId,
  onAreaSelected,
  isSignaturePanelLoading = false,
  signatureProgress: externalSignatureProgress = 0,
  signatureProgressMessage: externalProgressMessage = "",
  pageSelection = "current"
}: PdfViewerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [selectedGridPosition, setSelectedGridPosition] = useState<string>("middle-center");
  const [pdfTimestamp, setPdfTimestamp] = useState<number>(Date.now());
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApplyingSignature, setIsApplyingSignature] = useState<boolean>(false);
  const [signatureProgress, setSignatureProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Calculate whether to apply to all pages based on page selection
  const applyToAllPages = pageSelection === "all" || pageSelection === "range";
  console.log("PDF Viewer - pageSelection:", pageSelection, "applyToAllPages:", applyToAllPages);
  console.log("PDF Viewer - pageSelection === 'all':", pageSelection === "all");
  console.log("PDF Viewer - pageSelection === 'range':", pageSelection === "range");
  console.log("PDF Viewer - pageSelection === 'current':", pageSelection === "current");

  // Simple progress tracking
  const updateProgress = (progress: number, message: string) => {
    console.log(`📊 PDF Viewer: Setting progress: ${progress}% - ${message}`);
    setSignatureProgress(progress);
    setProgressMessage(message);
  };

  // Automatic progress function with random increments
  const startAutomaticProgress = () => {
    let currentProgress = 0;
    const messages = [
      "Initializing signature application...",
      "Preparing document...",
      "Processing signature data...",
      "Applying signature to pages...",
      "Validating signature...",
      "Finalizing document...",
      "Almost complete..."
    ];
    
    const progressInterval = setInterval(() => {
      const increment = Math.floor(Math.random() * 4) + 5;
      currentProgress = Math.min(currentProgress + increment, 99);
      
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      setSignatureProgress(currentProgress);
      setProgressMessage(randomMessage);
      
      console.log(`📊 Auto Progress: ${currentProgress}% - ${randomMessage}`);
      
      if (currentProgress >= 99) {
        clearInterval(progressInterval);
        console.log('📊 Auto Progress: Stopped at 99%');
      }
    }, 1000);
    
    return progressInterval;
  };

  // Debug external progress values
  console.log(`📊 PDF Viewer: External progress values - Panel Loading: ${isSignaturePanelLoading}, Panel Progress: ${externalSignatureProgress}%, PDF Progress: ${signatureProgress}%`);

  // Start automatic progress when loader appears
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;
    
    if (isSignaturePanelLoading) {
      console.log('📊 PDF Viewer: Signature panel loading detected - starting automatic progress');
      progressInterval = startAutomaticProgress();
    }
    
    if (isApplyingSignature) {
      console.log('📊 PDF Viewer: PDF viewer applying signature - starting automatic progress');
      progressInterval = startAutomaticProgress();
    }
    
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        console.log('📊 PDF Viewer: Automatic progress stopped');
      }
    };
  }, [isSignaturePanelLoading, isApplyingSignature]);

  const [pdfLoaded, setPdfLoaded] = useState<boolean>(false);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [preloadNext, setPreloadNext] = useState<boolean>(false);
  const [areaSelectionMode, setAreaSelectionMode] = useState<boolean>(false);
  const [selectedAreas, setSelectedAreas] = useState<Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>>([]);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pendingSignatureApplication, setPendingSignatureApplication] = useState<{
    signatureId: string;
    position: string | { x: number; y: number; width: number; height: number };
    pageNumbers?: number[];
    applyToAllPages?: boolean;
    isMoveOperation?: boolean;
    appliedSignatureId?: string;
  } | null>(null);
  const [pageInputValue, setPageInputValue] = useState<string>("");
  
  // Use external position if provided, otherwise use internal state
  const currentGridPosition = externalSelectedPosition || selectedGridPosition;
  const containerRef = useRef<HTMLDivElement>(null);
  const previousDocumentRef = useRef<string | null>(null);

  // Check document status and show appropriate message
  useEffect(() => {
    console.log("Document status changed:", document?.status);
    
    if (document?.status === 'error') {
      setPdfError("Document processing failed. Please try uploading again.");
      setIsLoading(false);
    } else if (document?.status === 'pending') {
      setPdfError("Document is still being processed. Please wait...");
      setIsLoading(false);
    } else if (document?.status === 'processing') {
      setPdfError("Document is being processed. Please wait...");
      setIsLoading(false);
    } else if (document?.status === 'processed') {
      setPdfError(null);
      setIsLoading(true);
    }
  }, [document?.status]);

  // Update timestamp when document changes to force refresh
  useEffect(() => {
    const currentDocumentId = document?.id;
    if (currentDocumentId === previousDocumentRef.current) {
      console.log("Document ID unchanged, skipping PDF reload");
      return;
    }
    
    console.log("Document changed, refreshing PDF viewer:", document?.id, "Status:", document?.status);
    previousDocumentRef.current = currentDocumentId;
    
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
    
    setPdfTimestamp(Date.now());
    setRetryCount(0);
    setPdfError(null);
    setNumPages(0);
    setPageNumber(1);
    setPageInputValue("1");
    
    if (document?.status === 'processed') {
      const pdfUrl = apiUrl(`api/documents/${document.id}/view?t=${pdfTimestamp}`);
      console.log("Starting PDF load for processed document");
      console.log("PDF URL:", pdfUrl);
      
      setPdfError(null);
      setIsLoading(true);
      
      const timeout = setTimeout(() => {
        console.warn("PDF loading timeout - forcing refresh");
        setPdfError("PDF loading timeout. The file may be too large or the server is slow. Please try again.");
        setIsLoading(false);
      }, 30000);
      setLoadTimeout(timeout);
      
      return () => {
        if (loadTimeout) {
          clearTimeout(loadTimeout);
        }
      };
    } else {
      console.log("Document not ready, clearing loading state");
      console.log("Document status:", document?.status);
      setIsLoading(false);
    }
  }, [document?.id, document?.status, document?.filePath]);

  // Update pageInputValue when pageNumber changes
  useEffect(() => {
    setPageInputValue(pageNumber.toString());
  }, [pageNumber]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [loadTimeout]);

  // Add error handling for PDF load failures
  const handlePdfLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      documentId: document?.id,
      documentStatus: document?.status,
      pdfUrl: document ? apiUrl(`api/documents/${document.id}/view?t=${pdfTimestamp}`) : 'N/A',
      workerSrc: pdfjs.GlobalWorkerOptions.workerSrc
    });
    
    if (error.message.includes("sendWithPromise") || error.message.includes("worker") || error.message.includes("Worker")) {
      console.log("🔄 Worker-related error detected, attempting worker reinitialization...");
      
      const reinitialized = initializeWorker();
      if (reinitialized && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setPdfTimestamp(Date.now());
        setIsLoading(true);
        
        toast({
          title: "PDF Worker Error",
          description: `Retrying with new worker... (${retryCount + 1}/2)`,
        });
        return;
      }
    }
    
    if (error.message.includes("404")) {
      console.log("Document not found, attempting to reload...");
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setPdfTimestamp(Date.now());
        setIsLoading(true);
        
        toast({
          title: "Document Loading",
          description: `Retrying to load document... (${retryCount + 1}/3)`,
        });
      } else {
        setPdfError("Document not found after multiple attempts. Please try refreshing the page or selecting the document again.");
        setRetryCount(0);
        setIsLoading(false);
      }
    } else {
      onDocumentLoadError(error);
    }
  };

  const { data: signaturesData } = useDigitalSignatures(user?.id || "");
  const { data: appliedSignaturesData } = useDocumentSignatures(document.id);
  const applySignature = useApplySignature();
  const removeSignature = useRemoveSignature();
  const updateSignaturePosition = useUpdateSignaturePosition();

  // Check if document is read-only (has been signed)
  useEffect(() => {
    if (document) {
      setIsReadOnly(false);
    }
  }, [document]);

  const signatures = (signaturesData as any)?.signatures || [];
  const appliedSignatures = (appliedSignaturesData as any)?.signatures || [];

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log("PDF loaded successfully with", numPages, "pages");
    setNumPages(numPages);
    setPdfError(null);
    setRetryCount(0);
    setIsLoading(false);
    setPdfLoaded(true);
    
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
    
    setPreloadNext(true);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    
    let errorMessage = error.message;
    
    if (errorMessage.includes("Setting up fake worker failed")) {
      errorMessage = "PDF worker failed to load. Please refresh the page and try again.";
    } else if (errorMessage.includes("Failed to fetch")) {
      errorMessage = "Failed to load PDF file. Please check your internet connection and server status.";
    } else if (errorMessage.includes("Worker")) {
      errorMessage = "PDF worker error. Please refresh the page and try again.";
    } else if (errorMessage.includes("404")) {
      errorMessage = "PDF file not found. The document may have been deleted or moved.";
    } else if (errorMessage.includes("500")) {
      errorMessage = "Server error while loading PDF. Please try again in a moment.";
    } else if (errorMessage.includes("timeout")) {
      errorMessage = "PDF loading timed out. The file may be too large or the server is slow.";
    } else if (errorMessage.includes("Invalid PDF")) {
      errorMessage = "The PDF file appears to be corrupted or invalid. Please try uploading a different file.";
    } else if (errorMessage.includes("CORS")) {
      errorMessage = "Cross-origin request blocked. Please check your server configuration.";
    } else if (errorMessage.includes("Failed to load PDF document")) {
      if (retryCount < 2) {
        console.log("Attempting fallback PDF loading approach...");
        setRetryCount(prev => prev + 1);
        setPdfTimestamp(Date.now());
        
        setTimeout(() => {
          console.log("Retrying with simplified PDF options...");
          setIsLoading(true);
        }, 1000);
        
        return;
      }
      errorMessage = "The PDF file could not be loaded after multiple attempts. This may be due to file corruption or server issues.";
    }
    
    setPdfError(errorMessage);
    setIsLoading(false);
    
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
    
    toast({
      title: "PDF Load Error",
      description: `Failed to load PDF: ${errorMessage}`,
      variant: "destructive",
    });
  };

  const changePage = (offset: number) => {
    const newPageNumber = pageNumber + offset;
    const finalPageNumber = Math.max(1, Math.min(newPageNumber, numPages));
    changePageWithWorkerRecovery(finalPageNumber);
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPageInputValue(value);
  };

  // Enhanced page change with worker error recovery
  const changePageWithWorkerRecovery = (newPageNumber: number) => {
    try {
      const validPageNumber = Math.max(1, Math.min(newPageNumber, numPages));
      
      setPageNumber(validPageNumber);
      setPageInputValue(validPageNumber.toString());
      
      if (onPageChange) {
        onPageChange(validPageNumber);
      }
      
      // Don't update pdfTimestamp for page navigation - this causes unnecessary PDF reload
      // setPdfTimestamp should only be called when signatures are applied/removed/moved
      
    } catch (error) {
      console.error('❌ Error changing page:', error);
      
      const reinitialized = initializeWorker();
      if (reinitialized) {
        console.log('✅ Worker reinitialized, retrying page change');
        setTimeout(() => {
          setPageNumber(newPageNumber);
          setPageInputValue(newPageNumber.toString());
          if (onPageChange) {
            onPageChange(newPageNumber);
          }
        }, 100);
      } else {
        console.error('❌ Failed to reinitialize worker');
        toast({
          title: "Page Navigation Error",
          description: "Failed to change page. Please refresh the document.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePageInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(pageInputValue);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
        changePageWithWorkerRecovery(pageNum);
      } else {
        setPageInputValue(pageNumber.toString());
      }
    }
  };

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInputValue);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      changePageWithWorkerRecovery(pageNum);
    } else {
      setPageInputValue(pageNumber.toString());
    }
  };

  const changeScale = (offset: number) => {
    setScale(prevScale => Math.max(0.5, Math.min(prevScale + offset, 2.0)));
  };

  // UPDATED: Handle apply signature with page selection
  const handleApplySignature = async (signatureId: string, position: string) => {
    const signatures = (signaturesData as any)?.signatures || [];
    const selectedSignature = signatures.find((s: any) => s.id === signatureId);
    console.log("PDF Viewer - Selected signature:", selectedSignature);
    console.log("PDF Viewer - Signature password:", selectedSignature?.password);
    
    if (selectedSignature?.password && selectedSignature.password.trim() !== "") {
      setPendingSignatureApplication({
        signatureId,
        position,
        applyToAllPages // Store the current setting
      });
      setPasswordModalOpen(true);
      return;
    }

    await applySignatureWithData(signatureId, position, undefined, applyToAllPages);
  };

  // UPDATED: Apply signature with page selection
  const applySignatureWithData = async (
    signatureId: string, 
    position: any, 
    password?: string,
    applyToAll: boolean = true
  ) => {
    try {
      console.log('🚀 applySignatureWithData called - setting isApplyingSignature to true');
      setIsApplyingSignature(true);
      
      let positionData;
      if (typeof position === 'string') {
        positionData = {
          gridPosition: position,
          width: 220,
          height: 100,
        };
      } else if (typeof position === 'object' && position.x !== undefined && position.y !== undefined) {
        const pdfPageElement = globalThis.document?.querySelector('.react-pdf__Page') as HTMLElement;
        const viewerDimensions = pdfPageElement ? {
          viewerWidth: pdfPageElement.getBoundingClientRect().width,
          viewerHeight: pdfPageElement.getBoundingClientRect().height
        } : { viewerWidth: 800, viewerHeight: 600 };
        
        positionData = {
          gridPosition: position.gridPosition || "custom",
          x: position.x,
          y: position.y,
          width: 220,
          height: 100,
          ...viewerDimensions
        };
      } else {
        positionData = {
          gridPosition: "middle-center",
          width: 220,
          height: 100,
        };
      }
      
      console.log('📤 Applying signature with position data:', positionData);
      
      // UPDATED: Use page selection instead of always all pages
      const pageNumbersToApply = applyToAll 
        ? Array.from({ length: numPages }, (_, i) => i + 1)
        : [pageNumber];
      
      const existingSignatures = await queryClient.fetchQuery({
        queryKey: ["/api/documents", document.id, "signatures"],
      }) as any;
      
      // UPDATED: Only remove signatures from the target pages
      const signaturesToRemove = existingSignatures?.signatures?.filter((sig: any) => 
        sig.signatureId === signatureId && 
        (!applyToAll || pageNumbersToApply.includes(sig.pageNumber))
      ) || [];
      
      for (const sig of signaturesToRemove) {
        await removeSignature.mutateAsync({
          documentId: document.id,
          signatureId: sig.id,
        });
      }
      
      await applySignature.mutateAsync({
        documentId: document.id,
        signatureId,
        pageNumbers: pageNumbersToApply,
        position: positionData,
        password,
      });
      
      setSignatureProgress(100);
      setProgressMessage("Signature applied successfully!");
      console.log('📊 Signature application completed - set to 100%');
      
      setTimeout(() => {
        const queryKey = ["/api/documents", document.id, "signatures"];
        queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'active'
        });
        
        setPdfTimestamp(Date.now());
      }, 100);
      
      toast({
        title: "Signature applied",
        description: `Signature applied to ${applyToAll ? 'all' : 'current'} page(s).`,
      });
      setSelectedGridPosition("");
      
    } catch (error: any) {
      toast({
        title: "Failed to apply signature",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsApplyingSignature(false);
        setSignatureProgress(0);
        setProgressMessage("");
      }, 1000);
    }
  };

  // UPDATED: Handle password verification with page selection
  const handlePasswordVerified = async (password: string) => {
    if (!pendingSignatureApplication) return;
    
    console.log('🔐 Password verified - pending application:', pendingSignatureApplication);
    
    try {
      const currentPageSignatures = appliedSignatures.filter(
        (sig: any) => sig.pageNumber === pageNumber
      );
      
      if (pendingSignatureApplication.position === "remove") {
        console.log('🗑️ Password verified for signature removal');
        
        const currentSignature = currentPageSignatures.find((sig: any) => sig.signatureId === pendingSignatureApplication.signatureId);
        if (!currentSignature) {
          toast({
            title: "Signature not found",
            description: "The signature could not be found for removal.",
            variant: "destructive",
          });
          setPendingSignatureApplication(null);
          return;
        }
        
        await removeSignatureWithPassword(currentSignature.id, password);
        setPendingSignatureApplication(null);
        return;
      }

      if (pendingSignatureApplication.position === "remove-all") {
        console.log('🗑️ Password verified for signature removal from all pages');
        
        const currentSignature = appliedSignatures.find((sig: any) => sig.signatureId === pendingSignatureApplication.signatureId);
        if (!currentSignature) {
          toast({
            title: "Signature not found",
            description: "The signature could not be found for removal from all pages.",
            variant: "destructive",
          });
          setPendingSignatureApplication(null);
          return;
        }
        
        await removeSignatureFromAllPagesWithPassword(currentSignature.id, password);
        setPendingSignatureApplication(null);
        return;
      }

      // Move operations now bypass password verification - handled directly in handleMoveSignature
      
      console.log('🔐 handlePasswordVerified called - setting isApplyingSignature to true');
      setIsApplyingSignature(true);
      
      const isPositionUpdate = currentPageSignatures.some((sig: any) => sig.signatureId === pendingSignatureApplication.signatureId);
    
      if (isPositionUpdate) {
        console.log('🔄 Password verified for signature position update');
        
        const appliedSignature = currentPageSignatures.find((sig: any) => sig.signatureId === pendingSignatureApplication.signatureId);
        if (!appliedSignature) {
          toast({
            title: "Signature not found",
            description: "The signature could not be found for position update.",
            variant: "destructive",
          });
          setPendingSignatureApplication(null);
          return;
        }
        
        let positionData;
        
        if (typeof pendingSignatureApplication.position === 'object' && pendingSignatureApplication.position !== null) {
          const pos = pendingSignatureApplication.position as { x: number; y: number; width: number; height: number };
          
          const pdfPageElement = globalThis.document?.querySelector('.react-pdf__Page') as HTMLElement;
          const viewerDimensions = pdfPageElement ? {
            viewerWidth: pdfPageElement.getBoundingClientRect().width,
            viewerHeight: pdfPageElement.getBoundingClientRect().height
          } : { viewerWidth: 800, viewerHeight: 600 };
          
          positionData = {
            gridPosition: "custom",
            x: pos.x,
            y: pos.y,
            width: pos.width || 220,
            height: pos.height || 100,
            ...viewerDimensions
          };
          console.log('✅ Using custom position from drag operation:', positionData);
        } else {
          positionData = {
            gridPosition: "middle-center",
            width: 220,
            height: 100,
          };
          console.log('🔄 Using fallback position:', positionData);
        }
        
        // UPDATED: Use the stored page selection setting
        const applyToAll = pendingSignatureApplication.applyToAllPages !== undefined 
          ? pendingSignatureApplication.applyToAllPages 
          : true;
        
        const pageNumbersToApply = applyToAll 
          ? Array.from({ length: numPages }, (_, i) => i + 1)
          : [pageNumber];
        
        const existingSignatures = await queryClient.fetchQuery({
          queryKey: ["/api/documents", document.id, "signatures"],
        }) as any;
        
        const signaturesToRemove = existingSignatures?.signatures?.filter((sig: any) => 
          sig.signatureId === pendingSignatureApplication.signatureId &&
          (!applyToAll || pageNumbersToApply.includes(sig.pageNumber))
        ) || [];
        
        for (const sig of signaturesToRemove) {
          await removeSignature.mutateAsync({
            documentId: document.id,
            signatureId: sig.id,
          });
        }
        
        await applySignature.mutateAsync({
          documentId: document.id,
          signatureId: pendingSignatureApplication.signatureId,
          pageNumbers: pageNumbersToApply,
          position: positionData,
          password,
        });
        
        toast({
          title: "Signature moved",
          description: `Signature position updated on ${applyToAll ? 'all' : 'current'} page(s).`,
          variant: "default",
        });
        
      } else {
        console.log('🆕 Password verified for new signature application');
        
        let positionData;
        
        if (typeof pendingSignatureApplication.position === 'string') {
          positionData = {
            gridPosition: pendingSignatureApplication.position,
            width: 220,
            height: 100,
          };
          console.log('📍 Using grid position from pending application:', positionData);
        } else if (typeof pendingSignatureApplication.position === 'object' && pendingSignatureApplication.position !== null) {
          const pos = pendingSignatureApplication.position as { x: number; y: number; width: number; height: number };
          
          const pdfPageElement = globalThis.document?.querySelector('.react-pdf__Page') as HTMLElement;
          const viewerDimensions = pdfPageElement ? {
            viewerWidth: pdfPageElement.getBoundingClientRect().width,
            viewerHeight: pdfPageElement.getBoundingClientRect().height
          } : { viewerWidth: 800, viewerHeight: 600 };
          
          positionData = {
            gridPosition: "custom",
            x: pos.x,
            y: pos.y,
            width: pos.width || 220,
            height: pos.height || 100,
            ...viewerDimensions
          };
          console.log('✅ Using custom position from drag operation:', positionData);
        } else {
          positionData = {
            gridPosition: "middle-center",
            width: 220,
            height: 100,
          };
          console.log('🔄 Using fallback position:', positionData);
        }
        
        console.log('🔐 Password verified - final position data:', positionData);
        
        // UPDATED: Use the stored page selection setting
        const applyToAll = pendingSignatureApplication.applyToAllPages !== undefined 
          ? pendingSignatureApplication.applyToAllPages 
          : true;
        
        await applySignatureWithData(
          pendingSignatureApplication.signatureId,
          positionData,
          password,
          applyToAll
        );
      }
      
      setTimeout(() => {
        const queryKey = ["/api/documents", document.id, "signatures"];
        queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'none'
        });
        
        setPdfTimestamp(Date.now());
      }, 50);
      
      setPendingSignatureApplication(null);
    } catch (error: any) {
      toast({
        title: "Failed to apply signature",
        description: error.message || "An error occurred during signature application.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingSignature(false);
    }
  };

  const handleRemoveSignature = async (appliedSignatureId: string) => {
    try {
      const currentSignature = currentPageSignatures.find((sig: any) => sig.id === appliedSignatureId);
      if (!currentSignature) {
        toast({
          title: "Signature not found",
          description: "The signature could not be found.",
          variant: "destructive",
        });
        return;
      }

      const originalSignature = signatures.find((s: any) => s.id === currentSignature.signatureId);
      if (!originalSignature) {
        toast({
          title: "Signature not found",
          description: "The signature data could not be found.",
          variant: "destructive",
        });
        return;
      }

      console.log('🗑️ Removing signature:', { 
        appliedSignatureId, 
        signatureId: currentSignature.signatureId,
        hasPassword: !!originalSignature.password 
      });

      if (originalSignature.password && originalSignature.password.trim() !== "") {
        setPendingSignatureApplication({
          signatureId: currentSignature.signatureId,
          position: "remove",
        });
        setPasswordModalOpen(true);
        console.log('🔐 Password required for signature removal - showing modal');
        return;
      }

      await removeSignatureWithPassword(appliedSignatureId);
      
    } catch (error: any) {
      console.error('❌ Failed to remove signature:', error);
      toast({
        title: "Failed to remove signature",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeSignatureWithPassword = async (appliedSignatureId: string, password?: string) => {
    try {
      await removeSignature.mutateAsync({
        documentId: document.id,
        signatureId: appliedSignatureId,
      });
      
      setTimeout(() => {
        const queryKey = ["/api/documents", document.id, "signatures"];
        queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'active'
        });
        
        setPdfTimestamp(Date.now());
      }, 100);
      
      toast({
        title: "Signature removed",
        description: "Signature has been removed successfully.",
      });
    } catch (error: any) {
      console.error('❌ Failed to remove signature with password:', error);
      toast({
        title: "Failed to remove signature",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveWithPassword = async (appliedSignatureId: string, removeFromAllPages: boolean) => {
    try {
      const currentSignature = appliedSignatures.find((sig: any) => sig.id === appliedSignatureId);
      if (!currentSignature) {
        toast({
          title: "Signature not found",
          description: "The signature could not be found.",
          variant: "destructive",
        });
        return;
      }

      const originalSignature = signatures.find((s: any) => s.id === currentSignature.signatureId);
      if (!originalSignature) {
        toast({
          title: "Signature not found",
          description: "The signature data could not be found.",
          variant: "destructive",
        });
        return;
      }

      console.log('🗑️ Removing signature with password verification:', { 
        appliedSignatureId, 
        signatureId: currentSignature.signatureId,
        removeFromAllPages,
        hasPassword: !!originalSignature.password 
      });

      setPendingSignatureApplication({
        signatureId: currentSignature.signatureId,
        position: removeFromAllPages ? "remove-all" : "remove",
      });
      setPasswordModalOpen(true);
      console.log('🔐 Password verification required - showing modal');
      
    } catch (error: any) {
      console.error('❌ Failed to initiate signature removal:', error);
      toast({
        title: "Failed to remove signature",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveSignatureFromAllPages = async (appliedSignatureId: string) => {
    try {
      const currentSignature = appliedSignatures.find((sig: any) => sig.id === appliedSignatureId);
      if (!currentSignature) {
        toast({
          title: "Signature not found",
          description: "The signature could not be found.",
          variant: "destructive",
        });
        return;
      }

      const originalSignature = signatures.find((s: any) => s.id === currentSignature.signatureId);
      if (!originalSignature) {
        toast({
          title: "Signature not found",
          description: "The signature data could not be found.",
          variant: "destructive",
        });
        return;
      }

      console.log('🗑️ Removing signature from all pages:', { 
        appliedSignatureId, 
        signatureId: currentSignature.signatureId,
        hasPassword: !!originalSignature.password 
      });

      if (originalSignature.password && originalSignature.password.trim() !== "") {
        setPendingSignatureApplication({
          signatureId: currentSignature.signatureId,
          position: "remove-all",
        });
        setPasswordModalOpen(true);
        console.log('🔐 Password required for signature removal from all pages - showing modal');
        return;
      }

      await removeSignatureFromAllPagesWithPassword(appliedSignatureId);
      
    } catch (error: any) {
      console.error('❌ Failed to remove signature from all pages:', error);
      toast({
        title: "Failed to remove signature",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeSignatureFromAllPagesWithPassword = async (appliedSignatureId: string, password?: string) => {
    try {
      const signaturesToRemove = appliedSignatures.filter((sig: any) => {
        const currentSig = appliedSignatures.find((s: any) => s.id === appliedSignatureId);
        return currentSig && sig.signatureId === currentSig.signatureId;
      });

      console.log(`🗑️ Removing ${signaturesToRemove.length} signature instances from all pages`);

      for (const sig of signaturesToRemove) {
        await removeSignature.mutateAsync({
          documentId: document.id,
          signatureId: sig.id,
        });
      }
      
      setTimeout(() => {
        const queryKey = ["/api/documents", document.id, "signatures"];
        queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'active'
        });
        
        setPdfTimestamp(Date.now());
      }, 100);
      
      toast({
        title: "Signature removed from all pages",
        description: `Signature has been removed from ${signaturesToRemove.length} page(s).`,
      });
    } catch (error: any) {
      console.error('❌ Failed to remove signature from all pages:', error);
      toast({
        title: "Failed to remove signature",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // UPDATED: Handle move signature with page selection - NO PASSWORD REQUIRED for drag operations
  const handleMoveSignature = async (appliedSignatureId: string, x: number, y: number, viewerDimensions?: { viewerWidth: number; viewerHeight: number }) => {
    try {
      const currentSignature = currentPageSignatures.find((sig: any) => sig.id === appliedSignatureId);
      if (!currentSignature) {
        toast({
          title: "Signature not found",
          description: "The signature could not be found.",
          variant: "destructive",
        });
        return;
      }

      const originalSignature = signatures.find((s: any) => s.id === currentSignature.signatureId);
      if (!originalSignature) {
        toast({
          title: "Signature not found",
          description: "The signature data could not be found.",
          variant: "destructive",
        });
        return;
      }

      const newPosition = { 
        gridPosition: "custom",
        x: x,
        y: y,
        width: 220,
        height: 100,
        ...(viewerDimensions || {})
      };

      console.log('🔄 Moving signature (drag operation - no password required):', { 
        appliedSignatureId, 
        newPosition, 
        hasPassword: !!originalSignature.password 
      });

      // SKIP PASSWORD CHECK FOR DRAG OPERATIONS - Directly update position
      // UPDATED: For move operations, respect page selection setting
      if (applyToAllPages) {
        // Update position for all signature instances across all pages
        const allSignatureInstances = appliedSignatures.filter((sig: any) => sig.signatureId === currentSignature.signatureId);
        
        // Update each signature instance
        for (const signatureInstance of allSignatureInstances) {
          await updateSignaturePosition.mutateAsync({
            documentId: document.id,
            signatureId: signatureInstance.id,
            position: newPosition,
          });
        }
      } else {
        // Update only the current signature position
        await updateSignaturePosition.mutateAsync({
          documentId: document.id,
          signatureId: appliedSignatureId,
          position: newPosition,
        });
      }
      
      // Force PDF refresh to show updated signature positions
      setPdfTimestamp(Date.now());
      
      toast({
        title: "Signature moved",
        description: "Signature position has been updated successfully.",
        variant: "default",
      });
      
    } catch (error: any) {
      console.error('❌ Failed to move signature:', error);
      toast({
        title: "Failed to move signature",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveSignatureToPages = async (appliedSignatureId: string, pageOption: 'current' | 'all', currentPosition?: any) => {
    try {
      console.log('💾 handleSaveSignatureToPages called - setting isApplyingSignature to true');
      setIsApplyingSignature(true);
      
      const appliedSignature = currentPageSignatures.find((sig: any) => sig.id === appliedSignatureId);
      if (!appliedSignature) {
        toast({
          title: "Signature not found",
          description: "The signature could not be found.",
          variant: "destructive",
        });
        return;
      }

      console.log('💾 Saving signature - current position data:', {
        appliedSignatureId,
        originalPosition: appliedSignature.position,
        currentPageSignatures: currentPageSignatures.map((s: any) => ({ id: s.id, position: s.position }))
      });

      const signature = signatures.find((s: any) => s.id === appliedSignature.signatureId);
      if (!signature) {
        toast({
          title: "Signature not found",
          description: "The signature data could not be found.",
          variant: "destructive",
        });
        return;
      }

      let pageNumbers: number[];
      if (pageOption === 'current') {
        pageNumbers = [pageNumber];
      } else {
        pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);
      }

      let finalPosition = currentPosition;
      if (!finalPosition) {
        const cachedData = queryClient.getQueryData(["/api/documents", document.id, "signatures"]) as any;
        const updatedSignature = cachedData?.signatures?.find((s: any) => s.id === appliedSignatureId);
        finalPosition = updatedSignature?.position || appliedSignature.position;
      }

      console.log('💾 Using position:', {
        providedPosition: currentPosition,
        originalPosition: appliedSignature.position,
        finalPosition: finalPosition
      });

      if (signature.password && signature.password.trim() !== "") {
        setPendingSignatureApplication({
          signatureId: appliedSignature.signatureId,
          position: finalPosition,
        });
        setPasswordModalOpen(true);
        return;
      }

      let positionData;
      if (finalPosition && typeof finalPosition === 'object') {
        const pos = finalPosition as any;
        
        console.log('🔍 Processing position data:', {
          pos,
          gridPosition: pos.gridPosition,
          hasX: pos.x !== undefined,
          hasY: pos.y !== undefined,
          x: pos.x,
          y: pos.y,
          gridPositionType: typeof pos.gridPosition
        });
        
        if (pos.gridPosition && typeof pos.gridPosition === 'object') {
          const gridPos = pos.gridPosition as any;
          positionData = { 
            gridPosition: "custom",
            x: gridPos.x,
            y: gridPos.y
          };
          console.log('✅ Using nested gridPosition object:', positionData);
        } else if (pos.gridPosition === "custom" && pos.x !== undefined && pos.y !== undefined) {
          positionData = { 
            gridPosition: "custom",
            x: pos.x,
            y: pos.y
          };
          console.log('✅ Using custom position with coordinates:', positionData);
        } else if (pos.gridPosition && typeof pos.gridPosition === 'string' && pos.gridPosition !== "custom") {
          positionData = { gridPosition: pos.gridPosition };
          console.log('📍 Using grid position:', positionData);
        } else if (pos.x !== undefined && pos.y !== undefined) {
          positionData = { 
            gridPosition: "custom",
            x: pos.x,
            y: pos.y
          };
          console.log('🎯 Using fallback custom position:', positionData);
        } else {
          positionData = finalPosition;
          console.log('🔄 Using fallback position:', positionData);
        }
      } else {
        positionData = finalPosition;
        console.log('🔄 Using original position (not object):', positionData);
      }

      console.log('💾 Processed position data:', positionData);

      console.log("Sending position data to backend:", positionData);
      await applySignature.mutateAsync({
        documentId: document.id,
        signatureId: appliedSignature.signatureId,
        pageNumbers: pageNumbers,
        position: positionData,
      });

      setTimeout(() => {
        const queryKey = ["/api/documents", document.id, "signatures"];
        queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'active'
        });
        
        setPdfTimestamp(Date.now());
      }, 100);

      toast({
        title: "Signature saved",
        description: `Signature saved to ${pageNumbers.length} page(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to save signature",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsApplyingSignature(false);
    }
  };

  const handleGridPositionChange = (position: string) => {
    setSelectedGridPosition(position);
    if (onPositionChange) {
      onPositionChange(position);
    }
  };

  const handleDownload = () => {
    setShowDownloadModal(true);
  };

  // Filter signatures based on page selection
  const currentPageSignatures = appliedSignatures.filter((sig: any) => {
    if (pageSelection === "all") {
      // When "all pages" is selected, show signatures that are applied to all pages
      // Check if this signature exists on multiple pages (indicating it was applied to all pages)
      const signatureInstances = appliedSignatures.filter((s: any) => s.signatureId === sig.signatureId);
      const isAppliedToAllPages = signatureInstances.length > 1;
      
      // Show the signature instance for the current page if it was applied to all pages
      return sig.pageNumber === pageNumber && isAppliedToAllPages;
    } else {
      // For "current page" or "page range", show only signatures on current page
      return sig.pageNumber === pageNumber;
    }
  });

  console.log('📄 Page signatures:', {
    pageNumber,
    totalSignatures: appliedSignatures.length,
    currentPageSignatures: currentPageSignatures.length,
    allSignatures: appliedSignatures.map((s: any) => ({ id: s.id, pageNumber: s.pageNumber, signatureId: s.signatureId }))
  });

  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  // UPDATED: Handle area selection with page selection
  const handleAreaSelected = async (area: { x: number; y: number; width: number; height: number }) => {
    if (!selectedSignatureId) {
      toast({
        title: "No signature selected",
        description: "Please select a signature from the Signature Options panel before selecting an area.",
        variant: "destructive",
      });
      return;
    }

    const signatures = (signaturesData as any)?.signatures || [];
    const selectedSignature = signatures.find((s: any) => s.id === selectedSignatureId);
    console.log("Area Selection - Selected signature:", selectedSignature);
    console.log("Area Selection - Signature password:", selectedSignature?.password);
    
    if (selectedSignature?.password && selectedSignature.password.trim() !== "") {
      setPendingSignatureApplication({
        signatureId: selectedSignatureId,
        pageNumbers: applyToAllPages ? undefined : [pageNumber],
        position: {
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
        },
        applyToAllPages // Store the current setting
      });
      setPasswordModalOpen(true);
      return;
    }

    await applySignatureWithData(selectedSignatureId, {
      gridPosition: "custom",
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
    }, undefined, applyToAllPages);

    const newArea = {
      id: `area-${Date.now()}`,
      ...area
    };
    setSelectedAreas(prev => [...prev, newArea]);
    console.log("Area selected and signature applied:", newArea);
    
    if (onAreaSelected) {
      onAreaSelected(area);
    }
  };

  const handleAreaSelectionCancel = () => {
    setAreaSelectionMode(false);
  };

  // Test worker availability with better error handling
  const testWorkerAvailability = async () => {
    try {
      const testUrl = pdfjs.GlobalWorkerOptions.workerSrc;
      console.log("Testing worker availability at:", testUrl);
      
      if (testUrl.startsWith('/')) {
        const response = await fetch(testUrl);
        if (!response.ok) {
          throw new Error(`Local worker not found: ${response.status}`);
        }
        console.log("✅ Local worker is available");
      } else {
        const response = await fetch(testUrl, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`CDN worker not available: ${response.status}`);
        }
        console.log("✅ CDN worker is available:", testUrl);
      }
    } catch (error: any) {
      console.error("❌ Worker availability test failed:", error.message);
      
      console.log("🔄 Attempting worker reinitialization...");
      const reinitialized = initializeWorker();
      
      if (reinitialized) {
        console.log("✅ Worker reinitialized successfully");
      } else {
        console.error("❌ Failed to reinitialize worker - PDF functionality may be limited");
      }
    }
  };

  // Run worker availability test only if worker was initialized
  if (workerInitialized) {
    testWorkerAvailability();
  } else {
    console.warn("⚠️ Worker not initialized - attempting fallback initialization");
    setTimeout(() => {
      const fallbackInitialized = initializeWorker();
      if (fallbackInitialized) {
        testWorkerAvailability();
      }
    }, 1000);
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Toolbar */}
      <div className="bg-white sticky top-0 z-[9999] border-b border-blue-200/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-semibold text-gray-800 text-base" data-testid="document-title" title={document.originalName}>
                {document.originalName.length > 10 
                  ? `${document.originalName.substring(0, 10)}...` 
                  : document.originalName
                }
              </h2>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="text-gray-400">Pages</span>
              <input
                type="number"
                min="1"
                max={numPages}
                value={pageInputValue}
                onChange={handlePageInputChange}
                onKeyPress={handlePageInputKeyPress}
                onBlur={handlePageInputBlur}
                className="w-12 no-arrows text-end font-medium bg-transparent border-none outline-none focus:bg-white/80 rounded px-1 py-0.5"
                data-testid="current-page-input"
              />
              <span className="text-gray-400">of</span>
              <span data-testid="total-pages" className="font-medium">{numPages}</span>
            </div>
            
            {/* <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={applyToAllPages}
                  onChange={(e) => setApplyToAllPages(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div> */}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeScale(-0.1)}
                disabled={scale <= 0.5}
                data-testid="button-zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 min-w-[50px] text-center" data-testid="zoom-level">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeScale(0.1)}
                disabled={scale >= 2.0}
                data-testid="button-zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Page Navigation */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
                data-testid="button-previous-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={toggleGrid}
                className={`${
                  showGrid 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-200/50"
                } rounded-xl transition-all duration-200 hover:scale-[1.02]`}
                data-testid="button-apply-signature"
              >
                <Grid3X3 className="mr-2 h-4 w-4" />
                {showGrid ? "Save " : "Edit"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownload}
                className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl transition-all duration-200 hover:scale-[1.02]"
                data-testid="button-download"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 p-4 overflow-auto" ref={containerRef}>
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <div className="relative bg-white shadow-2xl rounded-2xl overflow-auto border border-blue-200/30 flex-1 min-h-[700px] py-6 px-4" data-testid="pdf-container">
            {/* Error State */}
            {pdfError && (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-600 text-2xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Load Error</h3>
                  <p className="text-gray-600 mb-4">{pdfError}</p>
                  <div className="flex items-center space-x-3">
                    <Button 
                      onClick={() => {
                        console.log("Retry button clicked");
                        setPdfError(null);
                        setRetryCount(0);
                        setPdfTimestamp(Date.now());
                        setIsLoading(true);
                      }}
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                    >
                      Retry
                    </Button>
                    <Button 
                      onClick={() => {
                        console.log("Force refresh button clicked");
                        setPdfError(null);
                        setRetryCount(0);
                        setPdfTimestamp(Date.now());
                        setIsLoading(true);
                      }}
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                    >
                      Force Refresh
                    </Button>
                    <Button 
                      onClick={() => {
                        console.log("Reload page button clicked");
                        window.location.reload();
                      }}
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                    >
                      Reload Page
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Simple Working Loading State Display */}
            {(isLoading && !pdfError) || document?.status === 'pending' || document?.status === 'processing' || isApplyingSignature || isSignaturePanelLoading ? (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl min-h-[500px]">
                <div className="text-center max-w-md mx-auto px-6">
                  {/* Simple Spinner */}
                  <div className="mb-6">
                    <div className="w-16 h-16 mx-auto">
                      <div className="w-16 h-16 border-4 border-gray-200 rounded-full border-t-blue-500 animate-spin"></div>
                    </div>
                  </div>
                  
                  {isApplyingSignature || isSignaturePanelLoading ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        Applying Signature
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Please wait while we apply the signature to {applyToAllPages ? 'all' : 'current'} pages.
                      </p>
                      
                      {/* Simple Working Progress Bar */}
                      <div className="mb-6">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                            style={{width: `${isSignaturePanelLoading ? externalSignatureProgress : signatureProgress}%`}}
                          ></div>
                        </div>
                        
                        {/* Progress percentage */}
                        <div className="mt-2 text-center">
                          <span className="text-lg font-semibold text-gray-900">
                            {isSignaturePanelLoading ? externalSignatureProgress : signatureProgress}%
                          </span>
                        </div>
                        
                        {/* Progress message */}
                        {(isSignaturePanelLoading ? externalProgressMessage : progressMessage) && (
                          <div className="mt-2 text-center">
                            <p className="text-gray-600 text-sm">{isSignaturePanelLoading ? externalProgressMessage : progressMessage}</p>
                          </div>
                        )}
                        
                      </div>
                    </>
                  ) : document?.status === 'pending' || document?.status === 'processing' ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        {document?.status === 'pending' ? 'Document Queued' : 'Processing Document'}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {document?.status === 'pending' 
                          ? 'Your document is in the queue and will be processed shortly.' 
                          : 'Your document is being processed. This may take a few minutes for large files.'
                        }
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                        <div className="bg-blue-500 h-3 rounded-full animate-pulse" style={{width: '60%'}}></div>
                      </div>
                      {/* <div className="space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log("Check document status");
                            setPdfTimestamp(Date.now());
                          }}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                        >
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Check Status
                        </Button>
                      </div> */}
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Loading PDF...</h3>
                      <p className="text-gray-600 mb-6">
                        {retryCount > 0 ? `Retry attempt ${retryCount}/3` : "This may take a few moments"}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                        <div className="bg-blue-500 h-3 rounded-full animate-pulse" style={{width: '60%'}}></div>
                      </div>
                      <div className="space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log("Force refresh from loading state");
                            setPdfError(null);
                            setRetryCount(0);
                            setPdfTimestamp(Date.now());
                          }}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                        >
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Force Refresh
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log("Cancel loading");
                            setIsLoading(false);
                            setPdfError("Loading cancelled by user");
                          }}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {/* PDF Document */}
            {!pdfError && document?.status === 'processed' && document?.id && !isApplyingSignature && (
              <>
                {/* Main PDF Viewer */}
                <Document
                    key={`pdf-${document.id}-${pdfTimestamp}`}
                    file={apiUrl(`api/documents/${document.id}/view?t=${pdfTimestamp}`)}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={handlePdfLoadError}
                    onLoadProgress={() => {
                      if (loadTimeout) {
                        clearTimeout(loadTimeout);
                        setLoadTimeout(null);
                      }
                    }}
                    onItemClick={(item: any) => {
                      console.log('PDF item clicked:', item);
                    }}
                    className="flex justify-center"
                    loading={null}
                    error={
                      <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-red-600 text-2xl">⚠️</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Load Error</h3>
                          <p className="text-gray-600 mb-4">Failed to load PDF document</p>
                          <Button
                            onClick={() => {
                              console.log("Trying fallback PDF viewer...");
                              setPdfError(null);
                              setRetryCount(0);
                              setPdfTimestamp(Date.now());
                              setIsLoading(true);
                            }}
                            variant="outline"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl"
                          >
                            Try Fallback Viewer
                          </Button>
                        </div>
                      </div>
                    }
                    options={{
                      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                      cMapPacked: true,
                      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
                      disableFontFace: false,
                      useSystemFonts: true,
                      enableXfa: false,
                      disableRange: false,
                      disableStream: false,
                      disableAutoFetch: false,
                      maxImageSize: 1024 * 1024,
                      isEvalSupported: false,
                      useWorkerFetch: true,
                      rangeChunkSize: 65536
                    }}
                  >
                    <div className="relative">
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={
                          <div className="flex items-center justify-center h-16">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                          </div>
                        }
                        error={
                          <div className="flex items-center justify-center h-32 text-red-500">
                            {/* <span>Failed to load page</span> */}
                          </div>
                        }
                      />
                    </div>
                    
                    {/* Simple Drag Layer - Only show when grid is visible AND there are applied signatures */}
                    {!passwordModalOpen && showGrid && currentPageSignatures.length > 0 && (
                      <div 
                        className="absolute inset-0" 
                        data-testid="simple-drag-layer"
                        style={{
                          pointerEvents: 'none',
                          zIndex: 1000,
                        }}
                      >
                        <SimpleDragLayer
                          signatures={signatures}
                          appliedSignatures={currentPageSignatures}
                          onApplySignature={handleApplySignature}
                          onRemoveSignature={handleRemoveSignature}
                          onRemoveSignatureFromAllPages={handleRemoveSignatureFromAllPages}
                          onRemoveWithPassword={handleRemoveWithPassword}
                          onMoveSignature={handleMoveSignature}
                          onPositionChange={handleGridPositionChange}
                          selectedPosition={currentGridPosition}
                          onSaveSignatureToPages={handleSaveSignatureToPages}
                          applyToAllPages={applyToAllPages} 
                        />
                      </div>
                    )}

                    {/* Area Selection Overlay */}
                    {areaSelectionMode && (
                      <div className="absolute inset-0 pointer-events-none" data-testid="area-selection-overlay">
                        <AreaSelection
                          onAreaSelected={handleAreaSelected}
                          onCancel={handleAreaSelectionCancel}
                          isActive={areaSelectionMode}
                        />
                      </div>
                    )}
                </Document>
                
                {/* Fallback PDF Viewer (if main viewer fails) */}
                {retryCount >= 2 && (
                  <div className="w-full h-96 border border-gray-300 rounded-lg">
                    <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        Using fallback PDF viewer. Some features may be limited.
                      </p>
                    </div>
                    <iframe
                      src={apiUrl(`api/documents/${document.id}/view?t=${pdfTimestamp}`)}
                      className="w-full h-full"
                      title="PDF Viewer"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    
    {/* Password Verification Modal */}
    <PasswordVerificationModal
      open={passwordModalOpen}
      onOpenChange={setPasswordModalOpen}
      onPasswordVerified={handlePasswordVerified}
      signatureName={(signaturesData as any)?.signatures?.find((s: any) => s.id === pendingSignatureApplication?.signatureId)?.name || ""}
    />

    {/* Download Modal */}
    <DownloadModal
      open={showDownloadModal}
      onOpenChange={setShowDownloadModal}
      documents={documents}
      userId={user?.id || ""}
    />
  </>
  );
}