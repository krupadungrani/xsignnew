import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  FileText, 
  CheckSquare, 
  Square,
  Calendar,
  HardDrive,
  Loader2,
  CheckCircle,
  X,
  Sparkles,
  Archive
} from "lucide-react";
import { type PdfDocument } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface DownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: PdfDocument[];
  userId: string;
}

export function DownloadModal({ open, onOpenChange, documents, userId }: DownloadModalProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedDocuments(new Set());
      setDownloadStatus('idle');
      setDownloadProgress(0);
    }
  }, [open]);

  const handleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      // Deselect all
      setSelectedDocuments(new Set());
    } else {
      // Select all
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    }
  };

  const handleDocumentSelect = (documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  };

  const handleDownload = async () => {
    if (selectedDocuments.size === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document to download.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    setDownloadStatus('downloading');
    setDownloadProgress(0);

    try {
      const selectedIds = Array.from(selectedDocuments);
      console.log('Downloading documents:', { documentIds: selectedIds, userId });
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      const response = await fetch(`/api/documents/bulk-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: selectedIds,
          userId: userId
        }),
      });

      clearInterval(progressInterval);
      setDownloadProgress(95);

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to download documents: ${response.status} ${errorText}`);
      }

      // Create blob from response
      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'bytes');
      console.log('Blob type:', blob.type);
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      setDownloadProgress(100);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'XSignature.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadStatus('success');
      
      toast({
        title: "Download successful",
        description: `${selectedDocuments.size} document(s) downloaded as XSignature.zip`,
      });

      // Auto-close modal after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);

    } catch (error: any) {
      console.error('Download error:', error);
      setDownloadStatus('error');
      toast({
        title: "Download failed",
        description: error.message || "Failed to download documents",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const allSelected = selectedDocuments.size === documents.length && documents.length > 0;
  const someSelected = selectedDocuments.size > 0 && selectedDocuments.size < documents.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-6 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Archive className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Download Documents
                </DialogTitle>
                <p className="text-blue-100 text-sm">
                  Select files to download as XSignature.zip
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
              disabled={isDownloading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {/* Selection controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center space-x-2 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                disabled={isDownloading}
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-green-600" />
                ) : someSelected ? (
                  <Square className="h-4 w-4 border-2 border-current" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </span>
              </Button>
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-0 px-3 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                {selectedDocuments.size} of {documents.length} selected
              </Badge>
            </div>
            <div className="text-sm text-gray-500 font-medium">
              {documents.length} document{documents.length !== 1 ? 's' : ''} total
            </div>
          </div>

          {/* Download progress */}
          {downloadStatus === 'downloading' && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-3 mb-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="font-medium text-blue-900">Preparing your download...</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-sm text-blue-700 mt-2">
                {Math.round(downloadProgress)}% complete
              </p>
            </div>
          )}

          {/* Success state */}
          {downloadStatus === 'success' && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Download completed successfully!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your files are being downloaded. This window will close automatically.
              </p>
            </div>
          )}

          {/* Documents list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 pl-2 px-4 py-3">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <FileText className="h-8 w-8" />
                </div>
                <p className="text-lg font-medium">No documents available</p>
                <p className="text-sm">Upload some PDFs to get started</p>
              </div>
            ) : (
              documents.map((document) => (
                <Card 
                  key={document.id} 
                  className={`cursor-pointer transition-all duration-300 hover:shadow-md ${
                    selectedDocuments.has(document.id) 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg border-2 border-blue-400' 
                      : 'hover:bg-gray-50 border border-gray-200'
                  }`}
                  onClick={() => handleDocumentSelect(document.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Checkbox
                          checked={selectedDocuments.has(document.id)}
                          onChange={() => handleDocumentSelect(document.id)}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <FileText className="h-4 w-4 text-red-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {document.originalName}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <HardDrive className="h-3 w-3" />
                            <span className="font-medium">{formatFileSize(document.fileSize)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>{document.pageCount} page{document.pageCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(document.uploadedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={document.status === 'processed' ? 'default' : 'secondary'}
                        className="flex-shrink-0 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-0"
                      >
                        {document.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Footer with download button */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
            <div className="text-sm text-gray-600">
              {selectedDocuments.size > 0 && (
                <span className="font-medium">
                  {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isDownloading}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDownload}
                disabled={selectedDocuments.size === 0 || isDownloading}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : downloadStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Downloaded!
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download {selectedDocuments.size > 0 ? `(${selectedDocuments.size})` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
