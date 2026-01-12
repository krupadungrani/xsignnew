import { useState, useEffect } from "react";
import { useSignatureCertificate } from "@/hooks/use-signature";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Calendar, MapPin, User, Building, Hash, Clock } from "lucide-react";
import { format } from "date-fns";

interface CertificateViewerProps {
  signatureId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CertificateViewer({ signatureId, open, onOpenChange }: CertificateViewerProps) {
  const { data: certificateData, isLoading, error } = useSignatureCertificate(signatureId);
  const [certificateInfo, setCertificateInfo] = useState<any>(null);

  useEffect(() => {
    if (certificateData && certificateData.certificate) {
      setCertificateInfo(certificateData.certificate);
    }
  }, [certificateData]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !certificateInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certificate Information</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-red-500">
            Failed to load certificate information
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Digital Signature Certificate
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Certificate Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Certificate Status</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Valid
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Issued On</p>
                    <p className="text-sm font-medium">
                      {certificateInfo.validity?.notBefore ? 
                        format(new Date(certificateInfo.validity.notBefore), "MMM dd, yyyy") : 
                        "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Expires On</p>
                    <p className="text-sm font-medium">
                      {certificateInfo.validity?.notAfter ? 
                        format(new Date(certificateInfo.validity.notAfter), "MMM dd, yyyy") : 
                        "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Signer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-sm font-medium">{certificateInfo.subject?.commonName || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Organization</p>
                  <p className="text-sm font-medium">{certificateInfo.subject?.organizationName || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-sm font-medium">{certificateInfo.subject?.localityName || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificate Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Certificate Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Serial Number</p>
                  <p className="text-sm font-mono font-medium">{certificateInfo.serialNumber || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Fingerprint</p>
                  <p className="text-sm font-mono font-medium text-xs">
                    {certificateInfo.fingerprint ? 
                      certificateInfo.fingerprint.match(/.{1,2}/g)?.join(':') : 
                      "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validity Period */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Validity Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Valid From:</span>
                  <span className="text-sm font-medium">
                    {certificateInfo.validity?.notBefore ? 
                      format(new Date(certificateInfo.validity.notBefore), "MMM dd, yyyy HH:mm:ss") : 
                      "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Valid To:</span>
                  <span className="text-sm font-medium">
                    {certificateInfo.validity?.notAfter ? 
                      format(new Date(certificateInfo.validity.notAfter), "MMM dd, yyyy HH:mm:ss") : 
                      "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}