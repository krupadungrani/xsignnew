import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff, Check, X } from "lucide-react";

interface PasswordVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordVerified: (password: string) => void;
  signatureName: string;
}

export function PasswordVerificationModal({ 
  open, 
  onOpenChange, 
  onPasswordVerified, 
  signatureName 
}: PasswordVerificationModalProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleVerify = () => {
    if (!password.trim()) {
      toast({
        title: "Password required",
        description: "Please enter the signature password to continue.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    onPasswordVerified(password);
    setPassword("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-red-600" />
            Signature Password Required
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            To apply the signature <strong>"{signatureName}"</strong>, please enter the password you set when creating this signature.
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signature-password">Signature Password</Label>
            <div className="relative">
              <Input
                id="signature-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter signature password"
                className="w-full pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerify();
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Verify Password
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
