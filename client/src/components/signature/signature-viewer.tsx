import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Signature, 
  Shield, 
  Calendar, 
  MapPin, 
  Building, 
  Clock,
  Download,
  Eye,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { type DigitalSignature } from "@shared/schema";
import { useDeleteSignature } from "@/hooks/use-signature";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface SignatureViewerProps {
  signature: DigitalSignature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignatureViewer({ signature, open, onOpenChange }: SignatureViewerProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const deleteSignature = useDeleteSignature(user?.id || "");

  // Debug log to verify component is rendering
  console.log("SignatureViewer render:", { 
    signature: signature?.name, 
    open, 
    showDeleteConfirm,
    user: user?.id 
  });

  if (!signature) return null;

  // Reset states when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setIsImageLoaded(false);
      setImageError(false);
    }
    onOpenChange(newOpen);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsImageLoaded(false);
  };

  const handleRetryImage = () => {
    setImageError(false);
    setIsImageLoaded(false);
  };

  const handleDownloadSignature = () => {
    if (signature.signatureImage) {
      const link = document.createElement('a');
      link.href = signature.signatureImage;
      link.download = `${signature.name}-signature.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      // Download the Adobe-style PDF certificate
      const response = await fetch(`/api/signatures/${signature.id}/certificate`);
      
      if (!response.ok) {
        throw new Error('Failed to download certificate');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${signature.name}-certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Certificate downloaded",
        description: "Adobe-style signature certificate has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error('Certificate download error:', error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to download certificate",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSignature.mutateAsync(signature.id);
      toast({
        title: "Signature deleted",
        description: "The signature has been deleted successfully.",
      });
      onOpenChange(false);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete signature",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = () => {
    console.log("Delete button clicked for signature:", signature.name);
    toast({
      title: "Delete button clicked",
      description: `Attempting to delete signature: ${signature.name}`,
    });
    setShowDeleteConfirm(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900">
            Signature Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">

          
          {/* Signature Header */}
          <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Signature className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{signature.name}</h3>
              <p className="text-sm text-gray-600">Digital Signature</p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Shield className="h-3 w-3 mr-1" />
              Valid
            </Badge>
          </div>

          {/* Signature Image */}
          {signature.signatureImage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Signature Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={signature.signatureImage}
                      alt={`Signature of ${signature.fullName}`}
                      className={`max-w-full max-h-64 object-contain border border-gray-200 rounded-lg ${
                        isImageLoaded ? 'opacity-100' : 'opacity-0'
                      } transition-opacity duration-200`}
                      onLoad={() => setIsImageLoaded(true)}
                      onError={handleImageError}
                    />
                    {!isImageLoaded && !imageError && (
                      <div className="w-64 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    )}
                    {imageError && (
                      <div className="w-64 h-32 bg-red-100 rounded-lg flex flex-col items-center justify-center">
                        <p className="text-sm text-red-800">Failed to load image.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRetryImage}
                          className="mt-2"
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signature Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-gray-900">
                Signature Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Signature className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Full Name</p>
                      <p className="text-sm text-gray-600">{signature.fullName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Building className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Company</p>
                      <p className="text-sm text-gray-600">{signature.companyName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Location</p>
                      <p className="text-sm text-gray-600">{signature.location}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Time Zone</p>
                      <p className="text-sm text-gray-600">{signature.timeZone}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-600">
                        {signature.createdAt ? new Date(signature.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Certificate</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadCertificate}
                        className="h-6 px-2 text-xs"
                      >
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center">
              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={handleDeleteClick}
                  className="px-6 py-3 font-medium font-sm"
                  data-testid="delete-signature-button"
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  DELETE SIGNATURE
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-red-600 text-sm mr-3">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Confirm delete?
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteSignature.isPending}
                  >
                    {deleteSignature.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                onClick={handleDownloadSignature}
                disabled={!signature.signatureImage}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Signature
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
