import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Signature, 
  FileText, 
  Grid3X3, 
  CheckCircle,
  X,
  Download,
  Eye
} from "lucide-react";
import { type DigitalSignature, type PdfDocument } from "@shared/schema";
import { useApplySignature, useDocumentSignatures } from "@/hooks/use-pdf";
import { useToast } from "@/hooks/use-toast";
import { PasswordVerificationModal } from "./password-verification-modal";

interface MultiDocumentSignatureProps {
  documents: PdfDocument[];
  signatures: DigitalSignature[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignatureApplied?: () => void;
}

interface SelectedDocument {
  document: PdfDocument;
  selected: boolean;
  appliedSignatures: any[];
}

interface GridPosition {
  id: string;
  name: string;
  description: string;
  className: string;
}

const gridPositions: GridPosition[] = [
  { id: "top-left", name: "Top Left", description: "Upper left corner", className: "col-start-1 row-start-1" },
  { id: "top-center", name: "Top Center", description: "Upper center", className: "col-start-2 row-start-1" },
  { id: "top-right", name: "Top Right", description: "Upper right corner", className: "col-start-3 row-start-1" },
  { id: "middle-left", name: "Middle Left", description: "Left center", className: "col-start-1 row-start-2" },
  { id: "middle-center", name: "Middle Center", description: "Center of page", className: "col-start-2 row-start-2" },
  { id: "middle-right", name: "Middle Right", description: "Right center", className: "col-start-3 row-start-2" },
  { id: "bottom-left", name: "Bottom Left", description: "Lower left corner", className: "col-start-1 row-start-3" },
  { id: "bottom-center", name: "Bottom Center", description: "Lower center", className: "col-start-2 row-start-3" },
  { id: "bottom-right", name: "Bottom Right", description: "Lower right corner", className: "col-start-3 row-start-3" },
];

export function MultiDocumentSignature({ 
  documents, 
  signatures, 
  open, 
  onOpenChange,
  onSignatureApplied
}: MultiDocumentSignatureProps) {
  const { toast } = useToast();
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>("");
  const [selectedGridPosition, setSelectedGridPosition] = useState<string>("");
  const [selectedDocuments, setSelectedDocuments] = useState<SelectedDocument[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentDocument, setCurrentDocument] = useState<string>("");
  const [processedCount, setProcessedCount] = useState(0);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [previewDocument, setPreviewDocument] = useState<PdfDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingBulkApplication, setPendingBulkApplication] = useState<{
    documents: SelectedDocument[];
    signatureId: string;
    gridPosition: string;
  } | null>(null);
  
  const applySignature = useApplySignature();

  // Initialize selected documents when modal opens or documents change
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && documents.length > 0) {
      setSelectedDocuments(
        documents.map(doc => ({
          document: doc,
          selected: false,
          appliedSignatures: []
        }))
      );
      setSelectedSignatureId("");
      setSelectedGridPosition("");
    }
    onOpenChange(newOpen);
  };

  // Update selected documents when documents prop changes
  React.useEffect(() => {
    if (open && documents.length > 0) {
      setSelectedDocuments(
        documents.map(doc => ({
          document: doc,
          selected: false,
          appliedSignatures: []
        }))
      );
    }
  }, [documents, open]);

  const handleDocumentSelection = (documentId: string, selected: boolean) => {
    setSelectedDocuments(prev => 
      prev.map(doc => 
        doc.document.id === documentId 
          ? { ...doc, selected } 
          : doc
      )
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedDocuments(prev => 
      prev.map(doc => ({ ...doc, selected }))
    );
  };

  const handleGridPositionSelect = (position: string) => {
    setSelectedGridPosition(position);
  };

  const handleApplyToAllSelected = async () => {
    if (!selectedSignatureId || !selectedGridPosition) {
      toast({
        title: "Missing Selection",
        description: "Please select both a signature and a grid position.",
        variant: "destructive",
      });
      return;
    }

    const documentsToSign = selectedDocuments.filter(doc => doc.selected);
    if (documentsToSign.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to sign.",
        variant: "destructive",
      });
      return;
    }

    // Validate document limit
    const maxDocuments = 20;
    if (documentsToSign.length > maxDocuments) {
      toast({
        title: "Too many documents selected",
        description: `You can only apply signatures to a maximum of ${maxDocuments} documents at once. Please select ${maxDocuments} or fewer documents.`,
        variant: "destructive",
      });
      return;
    }

    // Check if signature has password protection
    const selectedSignature = signatures.find(s => s.id === selectedSignatureId);
    console.log("Bulk - Selected signature:", selectedSignature);
    console.log("Bulk - Signature password:", selectedSignature?.password);
    if (selectedSignature?.password && selectedSignature.password.trim() !== "") {
      // Store pending application and show password modal
      setPendingBulkApplication({
        documents: documentsToSign,
        signatureId: selectedSignatureId,
        gridPosition: selectedGridPosition,
      });
      setPasswordModalOpen(true);
      return;
    }

    // No password required, apply directly
    await applyBulkSignatures(documentsToSign, selectedSignatureId, selectedGridPosition);
  };

  const applyBulkSignatures = async (documentsToSign: SelectedDocument[], signatureId: string, gridPosition: string, password?: string) => {
    setIsApplying(true);
    setProgress(0);
    setProcessedCount(0);
    setTotalDocuments(documentsToSign.length);
    setCurrentDocument("Initializing bulk signature process...");

    try {
      let successCount = 0;
      let errorCount = 0;
      const totalDocs = documentsToSign.length;

      // Process documents one by one for better progress tracking
      for (let i = 0; i < documentsToSign.length; i++) {
        const selectedDoc = documentsToSign[i];
        
        // Update current document being processed
        setCurrentDocument(`Processing: ${selectedDoc.document.originalName}`);
        setProcessedCount(i);
        
        // Calculate progress percentage
        const progressPercent = Math.min((i / totalDocs) * 100, 100);
        setProgress(progressPercent);
        
        console.log(`Processing document ${i + 1}/${totalDocs}: ${selectedDoc.document.originalName}`);

        try {
          // Apply signature to all pages of the document
          const pageNumbers = Array.from(
            { length: selectedDoc.document.pageCount }, 
            (_, pageIndex) => pageIndex + 1
          );

          await applySignature.mutateAsync({
            documentId: selectedDoc.document.id,
            signatureId,
            pageNumbers,
            position: {
              gridPosition,
              x: 0,
              y: 0,
              width: 220,
              height: 100,
            },
            password, // Include password if provided
          });

          console.log(`✅ Successfully applied signature to ${selectedDoc.document.originalName}`);
          successCount++;
        } catch (error: any) {
          console.error(`❌ Failed to apply signature to ${selectedDoc.document.originalName}:`, error);
          errorCount++;
        }
        
        // Add small delay between documents to prevent overwhelming the server
        if (i < documentsToSign.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Set final progress to 100%
      setProgress(100);
      setProcessedCount(totalDocs);
      setCurrentDocument("All signatures completed!");

      if (successCount > 0) {
        toast({
          title: "Signatures Applied Successfully",
          description: `Successfully applied signatures to ${successCount} document(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        });
        
        // Reset selections
        setSelectedDocuments(prev => 
          prev.map(doc => ({ ...doc, selected: false }))
        );
        
        // Notify parent component
        if (onSignatureApplied) {
          onSignatureApplied();
        }

        // Auto-close modal after a short delay to show completion
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        toast({
          title: "No Signatures Applied",
          description: "Failed to apply signatures to any documents.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Bulk signature application error:", error);
      setCurrentDocument("Error occurred during processing");
      toast({
        title: "Bulk Signature Error",
        description: error.message || "An error occurred during bulk signature application.",
        variant: "destructive",
      });
    } finally {
      // Keep the final state visible for a moment before resetting
      setTimeout(() => {
        setIsApplying(false);
        setProgress(0);
        setCurrentDocument("");
        setProcessedCount(0);
        setTotalDocuments(0);
      }, 3000);
    }
  };

  const handlePasswordVerified = async (password: string) => {
    if (!pendingBulkApplication) return;
    
    await applyBulkSignatures(
      pendingBulkApplication.documents,
      pendingBulkApplication.signatureId,
      pendingBulkApplication.gridPosition,
      password
    );
    
    setPendingBulkApplication(null);
  };

  const selectedCount = selectedDocuments.filter(doc => doc.selected).length;
  const totalCount = documents.length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900">
                Multi-Document Signature
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Show content or loading state */}
          {!isApplying ? (
            <div className="space-y-6">
              {/* Signature Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                    <Signature className="h-4 w-4 mr-2" />
                    Select Signature
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={selectedSignatureId}
                    onChange={(e) => setSelectedSignatureId(e.target.value)}
                    className="w-full p-3 border !outline-none !ring-0 focus:!outline-none border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a signature to apply</option>
                    {signatures.map((sig) => (
                      <option key={sig.id} value={sig.id}>
                        {sig.name}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              {/* Grid Position Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Select Grid Position
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Choose where to place the signature on each page. The signature will be applied to all pages of selected documents.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 w-96 mx-auto">
                    {gridPositions.map((position) => (
                      <div
                        key={position.id}
                        className={`aspect-square border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
                          selectedGridPosition === position.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleGridPositionSelect(position.id)}
                      >
                        <div className="text-xs font-medium text-gray-900 text-center">
                          {position.name}
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-1">
                          {position.description}
                        </div>
                        {selectedGridPosition === position.id && (
                          <CheckCircle className="h-4 w-4 text-blue-500 mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Document Selection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Select Documents
                    </CardTitle>
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll(true)}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll(false)}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedCount} of {totalCount} documents selected
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {documents.length === 0 && (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No documents available</p>
                        <p className="text-xs text-gray-400">Upload PDF documents to get started</p>
                      </div>
                    )}
                    {selectedDocuments.length === 0 && documents.length > 0 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">Loading documents...</p>
                      </div>
                    )}
                    {selectedDocuments.map((selectedDoc) => (
                      <div
                        key={selectedDoc.document.id}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={selectedDoc.selected}
                          onCheckedChange={(checked) => 
                            handleDocumentSelection(selectedDoc.document.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {selectedDoc.document.originalName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedDoc.document.pageCount} pages • {selectedDoc.document.fileSize} bytes
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPreviewDocument(selectedDoc.document);
                              setShowPreview(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Badge variant="secondary">
                            {selectedDoc.document.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isApplying}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyToAllSelected}
                  disabled={
                    !selectedSignatureId || 
                    !selectedGridPosition || 
                    selectedCount === 0 || 
                    isApplying
                  }
                  className="min-w-[120px]"
                >
                  <Signature className="h-4 w-4 mr-2" />
                  Apply to {selectedCount} Document{selectedCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          ) : (
            /* Centered Progress Loader */
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="w-full max-w-md space-y-6">
                {/* Main Progress Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 border border-blue-200 shadow-lg">
                  <div className="text-center space-y-6">
                    {/* Signature Icon with Animation */}
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                          <Signature className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-ping opacity-20"></div>
                      </div>
                    </div>
                    
                    {/* Progress Header */}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Applying Signatures
                      </h3>
                      <p className="text-sm text-gray-600">
                        Please wait while we process your documents
                      </p>
                    </div>
                    
                    {/* Current Document */}
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        {currentDocument}
                      </p>
                      <p className="text-xs text-blue-700">
                        Document {processedCount + 1} of {totalDocuments}
                      </p>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-semibold text-blue-900">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                          style={{ width: `${progress}%` }}
                        >
                          <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Completion Message */}
                    {progress === 100 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            All signatures completed successfully!
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Cancel Button (only show if not completed) */}
                {progress < 100 && (
                  <div className="text-center">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel Process
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      {showPreview && previewDocument && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Document Preview: {previewDocument.originalName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">File Name:</span>
                    <p className="text-gray-600">{previewDocument.fileName}</p>
                  </div>
                  <div>
                    <span className="font-medium">Page Count:</span>
                    <p className="text-gray-600">{previewDocument.pageCount}</p>
                  </div>
                  <div>
                    <span className="font-medium">File Size:</span>
                    <p className="text-gray-600">{previewDocument.fileSize} bytes</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge variant="secondary">{previewDocument.status}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Password Verification Modal */}
      <PasswordVerificationModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        onPasswordVerified={handlePasswordVerified}
        signatureName={signatures.find(s => s.id === selectedSignatureId)?.name || ""}
      />
    </>
  );
}
