import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (signatureData: { signature: string; name: string }) => void;
}

export function SignaturePad({ open, onOpenChange, onSave }: SignaturePadProps) {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureName, setSignatureName] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      if (!signatureName.trim()) {
        toast({
          title: "Name required",
          description: "Please enter a name for your signature",
          variant: "destructive",
        });
        return;
      }
      
      const signatureData = signatureRef.current.toDataURL();
      onSave({ signature: signatureData, name: signatureName });
      onOpenChange(false);
      setSignatureName("");
      signatureRef.current.clear();
    } else {
      toast({
        title: "Signature required",
        description: "Please draw your signature before saving",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    signatureRef.current?.clear();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Draw Your Signature</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signature-name">Signature Name</Label>
            <Input
              id="signature-name"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="e.g., John Doe - Official Signature"
            />
          </div>
          
          <div className="border border-gray-300 rounded-md p-2">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: "w-full h-40 border border-gray-200 rounded-md",
                style: { touchAction: "none" }
              }}
              backgroundColor="rgba(255, 255, 255, 0)"
              penColor="black"
              minWidth={1}
              maxWidth={3}
            />
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button onClick={handleSave}>
              Save Signature
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}