import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePdfDocuments } from "@/hooks/use-pdf";
import { useDigitalSignatures } from "@/hooks/use-signature";
import { Sidebar } from "@/components/layout/sidebar";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { SignaturePanel } from "@/components/signature/signature-panel";
import { MultiDocumentSignature } from "@/components/signature/multi-document-signature";
import { LandingPage } from "@/components/auth/landing-page";
import { PdfDiagnostic } from "@/components/debug/pdf-diagnostic";
import { type PdfDocument } from "@shared/schema";
import { FileText, RefreshCw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";


export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [selectedDocument, setSelectedDocument] = useState<PdfDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [landingPageOpen, setLandingPageOpen] = useState(false);
  const [multiSignatureModalOpen, setMultiSignatureModalOpen] = useState(false);
  const [selectedGridPosition, setSelectedGridPosition] = useState<string>("middle-center");
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>("");
  const [pdfRefreshKey, setPdfRefreshKey] = useState<number>(0);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [isSignaturePanelLoading, setIsSignaturePanelLoading] = useState<boolean>(false);
  const [signatureProgress, setSignatureProgress] = useState<number>(0);
  const [signatureProgressMessage, setSignatureProgressMessage] = useState<string>("");
  const [pageSelection, setPageSelection] = useState<string>("current");

  // Debug page selection state
  useEffect(() => {
    console.log("Dashboard - pageSelection state changed to:", pageSelection);
  }, [pageSelection]);


  const { data: documentsData, refetch: refetchDocuments } = usePdfDocuments(user?.id || "");
  const { data: signaturesData } = useDigitalSignatures(user?.id || "");
  const documents = documentsData?.documents || [];
  const signatures = signaturesData?.signatures || [];

  useEffect(() => {
    if (!isLoading && !user) {
      setLandingPageOpen(true);
    }
  }, [user, isLoading]);

  useEffect(() => {
    // Auto-select first document if none selected
    if (documents.length > 0 && !selectedDocument) {
      setSelectedDocument(documents[0]);
    }
    // Clear selected document if it no longer exists in the list
    if (selectedDocument && !documents.find(doc => doc.id === selectedDocument.id)) {
      setSelectedDocument(null);
    }
  }, [documents, selectedDocument]);

  // Listen for documents refresh events
  useEffect(() => {
    const handleDocumentsRefresh = () => {
      console.log("Refreshing documents list...");
      refetchDocuments();
    };

    window.addEventListener('documents-refresh', handleDocumentsRefresh);
    
    return () => {
      window.removeEventListener('documents-refresh', handleDocumentsRefresh);
    };
  }, [refetchDocuments]);

  // Auto-refresh documents list every 30 seconds to keep it in sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && documents.length > 0) {
        console.log("Auto-refreshing documents list...");
        refetchDocuments();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, documents.length, refetchDocuments]);

  // Reset position when document changes
  useEffect(() => {
    if (selectedDocument) {
      setSelectedGridPosition("middle-center");
    }
  }, [selectedDocument]);



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {/* <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to XSignature</h1>
            <p className="text-gray-600 mb-6">Please sign in to access your digital signature workspace.</p>
          </div>
        </div>
        {landingPageOpen && ( */}
          <LandingPage onClose={() => setLandingPageOpen(false)} />
        {/* // )} */}
      </>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-auto" data-testid="dashboard">
      {/* Sidebar */}
      <Sidebar
        selectedDocument={selectedDocument}
        onSelectDocument={setSelectedDocument}
        onOpenMultiSignature={() => setMultiSignatureModalOpen(true)}
        documents={documents}
        signatures={signatures}
        onDocumentsRefresh={refetchDocuments}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        
        <div className="flex-1 flex flex-col lg:flex-row">
          {selectedDocument ? (
            <>
              {/* PDF Viewer */}
              <div className="flex-1 min-h-0">
                <PdfViewer 
                  key={`pdf-${selectedDocument.id}-${pdfRefreshKey}`}
                  document={selectedDocument} 
                  documents={documents}
                  onPositionChange={setSelectedGridPosition}
                  selectedPosition={selectedGridPosition}
                  onPageChange={setCurrentPage}
                  onRefresh={() => {
                    // Gentle refresh - only update once
                    setPdfRefreshKey(prev => prev + 1);
                  }}
                  selectedSignatureId={selectedSignatureId}
                  onAreaSelected={(area) => {
                    console.log("Area selected from PDF viewer:", area);
                    // The area selection is handled within the PDF viewer
                  }}
                  isSignaturePanelLoading={isSignaturePanelLoading}
                  signatureProgress={signatureProgress}
                  signatureProgressMessage={signatureProgressMessage}
                  pageSelection={pageSelection}
                />
              </div>
            
            {/* Signature Panel */}
            <div className="w-full lg:w-80 min-h-100">
              <SignaturePanel
                document={selectedDocument}
                currentPage={currentPage}
                onPositionChange={setSelectedGridPosition}
                selectedPosition={selectedGridPosition}
                selectedSignatureId={selectedSignatureId}
                onSignatureIdChange={setSelectedSignatureId}
                onSignatureApplied={() => {
                  // Gentle refresh after signature application
                  setTimeout(() => {
                    setPdfRefreshKey(prev => prev + 1);
                  }, 1000); // Wait 1 second for server to process
                }}
                onLoadingStateChange={setIsSignaturePanelLoading}
                onProgressChange={setSignatureProgress}
                onProgressMessageChange={setSignatureProgressMessage}
                pageSelection={pageSelection}
                onPageSelectionChange={setPageSelection}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
            <div className="text-center max-w-sm sm:max-w-md" data-testid="no-document-selected">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">No Document Selected</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Upload a PDF document from the sidebar to get started with digital signatures.
              </p>
              <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mx-auto"></div>
            </div>
          </div>
        )}
        </div>
        {debugMode && <PdfDiagnostic documentId={selectedDocument?.id} />}
      </div>

      {/* Multi-Document Signature Modal */}
      <MultiDocumentSignature
        documents={documents}
        signatures={signatures}
        open={multiSignatureModalOpen}
        onOpenChange={setMultiSignatureModalOpen}
        onSignatureApplied={() => {
          // Gentle refresh after multi-document signature application
          setTimeout(() => {
            setPdfRefreshKey(prev => prev + 1);
          }, 1500); // Wait 1.5 seconds for server to process multiple documents
        }}
      />
    </div>
  );
}
