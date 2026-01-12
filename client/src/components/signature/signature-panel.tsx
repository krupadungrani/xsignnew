import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDigitalSignatures } from "@/hooks/use-signature";
import { useApplySignature, useRemoveSignature } from "@/hooks/use-pdf";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Signature,
  Shield,
  Trash2,
  Tag,
  Plus,
} from "lucide-react";
import { type PdfDocument, type DigitalSignature } from "@shared/schema";
import { WorkflowTester } from "@/components/ui/workflow-tester";
import { PasswordVerificationModal } from "./password-verification-modal";

interface SignaturePanelProps {
  document: PdfDocument | null;
  currentPage: number;
  onPositionChange?: (position: string) => void;
  selectedPosition?: string;
  selectedSignatureId?: string;
  onSignatureIdChange?: (signatureId: string) => void;
  onSignatureApplied?: () => void;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onProgressChange?: (progress: number) => void;
  onProgressMessageChange?: (message: string) => void;
  pageSelection?: string;
  onPageSelectionChange?: (selection: string) => void;
}

export function SignaturePanel({ 
  document, 
  currentPage, 
  onPositionChange,
  selectedPosition: externalSelectedPosition,
  selectedSignatureId: externalSelectedSignatureId,
  onSignatureIdChange,
  onSignatureApplied,
  onLoadingStateChange,
  onProgressChange,
  onProgressMessageChange,
  pageSelection: externalPageSelection,
  onPageSelectionChange
}: SignaturePanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [internalSelectedSignatureId, setInternalSelectedSignatureId] = useState<string>("");
  
  // Use external signature ID if provided, otherwise use internal state
  const selectedSignatureId = externalSelectedSignatureId || internalSelectedSignatureId;
  
  const setSelectedSignatureId = (id: string) => {
    if (onSignatureIdChange) {
      onSignatureIdChange(id);
    } else {
      setInternalSelectedSignatureId(id);
    }
  };
  // Use external page selection if provided, otherwise use internal state
  const pageOption = externalPageSelection || "current";
  const setPageOption = (value: string) => {
    console.log("Signature Panel - page selection changed to:", value);
    if (onPageSelectionChange) {
      onPageSelectionChange(value);
    }
  };

  // Debug page selection state
  useEffect(() => {
    console.log("Signature Panel - externalPageSelection:", externalPageSelection, "pageOption:", pageOption);
  }, [externalPageSelection, pageOption]);
  const [pageRange, setPageRange] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("middle-center");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingSignatureApplication, setPendingSignatureApplication] = useState<{
    signatureId: string;
    pageNumbers: number[];
    position: any;
  } | null>(null);
  
  // Use external position if provided, otherwise use internal state
  // Ensure we always have a valid position and never use empty strings
  const currentPosition = (externalSelectedPosition && externalSelectedPosition.trim() !== "") 
    ? externalSelectedPosition 
    : (selectedPosition && selectedPosition.trim() !== "") 
    ? selectedPosition 
    : "middle-center";

  const { data: signaturesData } = useDigitalSignatures(user?.id || "");
  const applySignature = useApplySignature();
  const removeSignature = useRemoveSignature();

  const signatures = signaturesData?.signatures || [];
  const selectedSignature = signatures.find(s => s.id === selectedSignatureId);

  const gridPositions = [
    { id: "top-left", label: "TL", name: "Top Left" },
    { id: "top-center", label: "TC", name: "Top Center" },
    { id: "top-right", label: "TR", name: "Top Right" },
    { id: "middle-left", label: "ML", name: "Middle Left" },
    { id: "middle-center", label: "MC", name: "Middle Center" },
    { id: "middle-right", label: "MR", name: "Middle Right" },
    { id: "bottom-left", label: "BL", name: "Bottom Left" },
    { id: "bottom-center", label: "BC", name: "Bottom Center" },
    { id: "bottom-right", label: "BR", name: "Bottom Right" },
  ];

  const parsePageRange = (range: string): number[] => {
    if (!range.trim()) return [];
    
    const pages: number[] = [];
    const parts = range.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(num => parseInt(num.trim()));
        if (start && end && start <= end) {
          for (let i = start; i <= end; i++) {
            pages.push(i);
          }
        }
      } else {
        const pageNum = parseInt(trimmed);
        if (pageNum) {
          pages.push(pageNum);
        }
      }
    }
    
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  };

  const getPageNumbers = (): number[] => {
    switch (pageOption) {
      case "current":
        return [currentPage];
      case "all":
        return document ? Array.from({ length: document.pageCount }, (_, i) => i + 1) : [];
      case "range":
        return parsePageRange(pageRange);
      default:
        return [currentPage];
    }
  };

  const handleApplySignature = async () => {
    console.log('📊 Signature Panel: handleApplySignature called');
    if (!selectedSignatureId || !document) {
      console.log('📊 Signature Panel: Missing signature or document');
      toast({
        title: "Missing selection",
        description: "Please select a signature and ensure a document is loaded.",
        variant: "destructive",
      });
      return;
    }

    const pageNumbers = getPageNumbers();
    if (pageNumbers.length === 0) {
      toast({
        title: "Invalid page selection",
        description: "Please select valid pages to apply the signature.",
        variant: "destructive",
      });
      return;
    }

    // Validate position object
    if (!currentPosition || currentPosition.trim() === "") {
      toast({
        title: "Position not selected",
        description: "Please select a position for the signature.",
        variant: "destructive",
      });
      return;
    }

    // Check if signature has password protection
    const selectedSignature = signatures.find(s => s.id === selectedSignatureId);
    console.log("=== SIGNATURE PANEL DEBUG ===");
    console.log("Selected signature ID:", selectedSignatureId);
    console.log("Selected signature:", selectedSignature);
    console.log("Signature password:", selectedSignature?.password);
    console.log("Password type:", typeof selectedSignature?.password);
    console.log("Password length:", selectedSignature?.password?.length);
    console.log("Password trimmed:", selectedSignature?.password?.trim());
    console.log("Password check result:", selectedSignature?.password && selectedSignature.password.trim() !== "");
    
    if (selectedSignature?.password && selectedSignature.password.trim() !== "") {
      // Store pending application and show password modal
      const finalPosition = currentPosition && currentPosition.trim() !== "" ? currentPosition : "middle-center";
      const positionData = {
        gridPosition: finalPosition,
        x: 0,
        y: 0,
        width: 220,
        height: 100,
      };
      
      setPendingSignatureApplication({
        signatureId: selectedSignatureId,
        pageNumbers,
        position: positionData,
      });
      setPasswordModalOpen(true);
      return;
    }

    // No password required, apply directly
    console.log('📊 Signature Panel: About to call applySignatureWithData');
    await applySignatureWithData(selectedSignatureId, pageNumbers, {
      gridPosition: currentPosition && currentPosition.trim() !== "" ? currentPosition : "middle-center",
      x: 0,
      y: 0,
      width: 220,
      height: 100,
    });
    console.log('📊 Signature Panel: applySignatureWithData completed');
  };

  // Automatic progress function with random increments
  const startAutomaticProgress = () => {
    console.log('📊 Signature Panel: startAutomaticProgress called');
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
      // Random increment between 5% and 8%
      const increment = Math.floor(Math.random() * 4) + 5; // 5, 6, 7, or 8
      currentProgress = Math.min(currentProgress + increment, 99);
      
      // Get random message
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      // Update progress
      if (onProgressChange) {
        console.log(`📊 Signature Panel: Calling onProgressChange(${currentProgress})`);
        onProgressChange(currentProgress);
      } else {
        console.log('📊 Signature Panel: onProgressChange is not provided!');
      }
      
      if (onProgressMessageChange) {
        onProgressMessageChange(randomMessage);
      }
      
      console.log(`📊 Signature Panel Auto Progress: ${currentProgress}% - ${randomMessage}`);
      
      // Stop at 99%
      if (currentProgress >= 99) {
        clearInterval(progressInterval);
        console.log('📊 Signature Panel Auto Progress: Stopped at 99%');
      }
    }, 1000); // Update every second
    
    return progressInterval;
  };

  const applySignatureWithData = async (signatureId: string, pageNumbers: number[], positionData: any, password?: string) => {
    try {
      // Notify parent component that loading has started
      if (onLoadingStateChange) {
        console.log('📊 Signature Panel: Calling onLoadingStateChange(true)');
        onLoadingStateChange(true);
      } else {
        console.log('📊 Signature Panel: onLoadingStateChange is not provided!');
      }

      // Start automatic progress
      const progressInterval = startAutomaticProgress();
      console.log('📊 Signature Panel: Starting automatic progress tracking');

      // Apply signature to all pages at once
      await applySignature.mutateAsync({
        documentId: document!.id,
        signatureId,
        pageNumbers,
        position: positionData,
        password, // Include password if provided
      });

      // Clear automatic progress and set to 100%
      clearInterval(progressInterval);
      if (onProgressChange) {
        onProgressChange(100);
      }
      if (onProgressMessageChange) {
        onProgressMessageChange("Signature applied successfully!");
      }
      console.log('📊 Signature Panel: Signature application completed - set to 100%');

      toast({
        title: "Signature applied successfully",
        description: `Signature applied to ${pageNumbers.length} page(s).`,
      });

      // Reset form
      setSelectedSignatureId("");
      setPageOption("current");
      setPageRange("");
      setSelectedPosition("middle-center");
      
      // Notify parent component to refresh PDF
      if (onSignatureApplied) {
        onSignatureApplied();
      }
    } catch (error: any) {
      console.error("Failed to apply signature:", error);
      
      let errorMessage = "Failed to apply signature";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      }
      
      toast({
        title: "Failed to apply signature",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Notify parent component that loading has finished
      if (onLoadingStateChange) {
        onLoadingStateChange(false);
      }
      // Reset progress after a brief delay to show completion
      setTimeout(() => {
        if (onProgressChange) {
          onProgressChange(0);
        }
      }, 1000); // Show 100% for 1 second before hiding
    }
  };

  const handlePasswordVerified = async (password: string) => {
    if (!pendingSignatureApplication) return;
    
    await applySignatureWithData(
      pendingSignatureApplication.signatureId,
      pendingSignatureApplication.pageNumbers,
      pendingSignatureApplication.position,
      password
    );
    
    setPendingSignatureApplication(null);
  };

  const handleRemoveSignatures = async () => {
    if (!document) {
      toast({
        title: "No document selected",
        description: "Please select a document first.",
        variant: "destructive",
      });
      return;
    }

    if (confirm("Are you sure you want to remove all signatures from this document?")) {
      try {
        // Get all applied signatures for this document
        const appliedSignatures = await fetch(`/api/documents/${document.id}/signatures`).then(res => res.json());
        
        if (appliedSignatures.signatures && appliedSignatures.signatures.length > 0) {
          // Remove each applied signature
          for (const appliedSig of appliedSignatures.signatures) {
            await removeSignature.mutateAsync({
              documentId: document.id,
              signatureId: appliedSig.signatureId,
            });
          }
          
          toast({
            title: "Signatures removed",
            description: `Removed ${appliedSignatures.signatures.length} signature(s) from the document.`,
          });
          
          // Notify parent component to refresh PDF
          if (onSignatureApplied) {
            onSignatureApplied();
          }
        } else {
          toast({
            title: "No signatures found",
            description: "This document has no applied signatures to remove.",
          });
        }
      } catch (error: any) {
        toast({
          title: "Failed to remove signatures",
          description: error.message || "An error occurred while removing signatures.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      <div className="w-80 sticky top-0 h-screen border-l border-blue-200/50 custom-scrollbar">
      <div className="w-full h-full">
        <Card className="w-full !h-full !shadow-none !bg-transparent !border-0 ">
          <CardHeader className="bg-white !py-[22px] border-b border-blue-200/50">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <Signature className="h-3 w-3 text-white" />
              </div>
              <p className="m-0">Signature Options</p>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 !h-full">
            {/* Selected Signature */}
            <div className="mt-5">
              <Label className="text-sm font-medium text-gray-700">Select Signature</Label>
              <Select value={selectedSignatureId} onValueChange={setSelectedSignatureId}>
                <SelectTrigger className="mt-2" data-testid="select-signature">
                  <SelectValue placeholder="Choose a signature" />
                </SelectTrigger>
                <SelectContent>
                  {signatures.map((signature) => (
                    <SelectItem key={signature.id} value={signature.id}>
                      {signature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* {selectedSignature && (
                <div className="mt-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                      <Signature className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-medium text-sm text-gray-800" data-testid="selected-signature-name">
                      {selectedSignature.name}
                    </span>
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <Shield className="h-3 w-3 text-green-600" />
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div data-testid="selected-signature-company" className="font-medium">{selectedSignature.companyName}</div>
                    <div className="text-green-600">✓ Valid Digital Tag</div>
                  </div>
                </div>
              )} */}
            </div>

            {/* Page Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Apply to Pages</Label>
              <RadioGroup value={pageOption} onValueChange={setPageOption} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current" id="current" />
                  <Label htmlFor="current" className="text-sm text-gray-700">
                    Current page only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="text-sm text-gray-700">
                    All pages
                  </Label>
                </div>
                {/* <div className="flex items-center space-x-2">
                  <RadioGroupItem value="range" id="range" />
                  <Label htmlFor="range" className="text-sm text-gray-700">
                    Page range
                  </Label>
                </div> */}
              </RadioGroup>
              
              {pageOption === "range" && (
                <Input
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  placeholder="e.g., 1-3, 5, 7-8"
                  className="mt-2"
                  data-testid="input-page-range"
                />
              )}
            </div>

            {/* Position Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Signature Position
              </Label>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {gridPositions.map((pos) => (
                  <Button
                    key={pos.id}
                    variant={currentPosition === pos.id ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setSelectedPosition(pos.id);
                      if (onPositionChange) {
                        onPositionChange(pos.id);
                      }
                    }}
                    data-testid={`button-position-${pos.id}`}
                  >
                    {pos.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Click a position or drag the signature directly on the page
              </p>
              

            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleApplySignature}
                disabled={!selectedSignatureId || !document || applySignature.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                data-testid="button-apply-signature-to-pages"
              >
                <Signature className="mr-2 h-4 w-4" />
                Apply Signature
              </Button>
              <Button
                variant="outline"
                onClick={handleRemoveSignatures}
                disabled={!document || removeSignature.isPending}
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                data-testid="button-remove-signatures"
              >
                {removeSignature.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                    <span>Removing...</span>
                  </div>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Signatures
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Signature Management */}
      </div>
    </div>
    
    {/* Password Verification Modal */}
    <PasswordVerificationModal
      open={passwordModalOpen}
      onOpenChange={setPasswordModalOpen}
      onPasswordVerified={handlePasswordVerified}
      signatureName={selectedSignature?.name || ""}
    />
  </>
  );
}
