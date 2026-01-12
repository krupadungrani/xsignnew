import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Type, Pen, Check, X, Sparkles, Shield, User, Mail, Phone, 
  Briefcase, Building, MapPin, Eye, EyeOff
} from "lucide-react";

interface AdobeStyleSignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (signatureData: { 
    signature: string; 
    name: string; 
    metadata?: any; 
    password?: string;
    details?: {
      fullName: string;
      email: string;
      phone: string;
      jobTitle: string;
      department: string;
      companyName: string;
      location: string;
    };
  }) => void;
}

export function AdobeStyleSignatureModal({ open, onOpenChange, onSave }: AdobeStyleSignatureModalProps) {
  const { toast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);
  
  // Form fields
  const [signatureName, setSignatureName] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [signaturePassword, setSignaturePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');

  const handleSave = () => {
    if (!signatureName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your signature",
        variant: "destructive",
      });
      return;
    }

    if (!fullName.trim()) {
      toast({
        title: "Full name required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (signatureMode === 'draw' && signatureRef.current && signatureRef.current.isEmpty()) {
      toast({
        title: "Signature required",
        description: "Please draw your signature before saving",
        variant: "destructive",
      });
      return;
    }

    if (!signaturePassword.trim()) {
      toast({
        title: "Password required",
        description: "Please enter a password to protect your signature",
        variant: "destructive",
      });
      return;
    }

    if (signaturePassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (signaturePassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    let signatureData = "";
    
         // Create a canvas for the signature
     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d');
     if (ctx) {
       canvas.width = 500;
       canvas.height = 200; // Increased height to accommodate all details
      
             // Set background to transparent for better PDF integration
       ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let yPosition = 30;
      
      if (signatureMode === 'draw' && signatureRef.current && !signatureRef.current.isEmpty()) {
        // For drawn signatures, we need to combine the drawn signature with text details
        // First, get the drawn signature data
        const drawnSignatureData = signatureRef.current.toDataURL();
        
        // Create a temporary image to get the drawn signature
        const tempImg = new Image();
                          tempImg.onload = () => {
            // Draw the signature in the top left portion
            ctx.drawImage(tempImg, 20, 15, 200, 80);
            
            // Add name text next to the signature (right side)
            ctx.font = `600 28px Arial`;
            ctx.fillStyle = "#000000";
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(fullName, 240, 55);
           
            // Add contact information directly under the name (right side)
            let textY = 85;
           
            // Add contact information first (email and phone)
            if (email || phone) {
              let contactText = "";
              if (email && phone) {
                contactText = `${email} • ${phone}`;
              } else if (email) {
                contactText = email;
              } else if (phone) {
                contactText = phone;
              }
              ctx.font = `400 14px Arial`;
              ctx.fillStyle = "#6b7280";
              ctx.fillText(contactText, 240, textY);
              textY += 18;
            }
           
            // Add company name under contact info
            if (companyName) {
              ctx.font = `500 18px Arial`;
              ctx.fillStyle = "#374151";
              ctx.fillText(companyName, 240, textY);
              textY += 22;
            }
           
            // Add job title and department
            if (jobTitle || department) {
              let titleText = "";
              if (jobTitle && department) {
                titleText = `${jobTitle} • ${department}`;
              } else if (jobTitle) {
                titleText = jobTitle;
              } else if (department) {
                titleText = department;
              }
              ctx.font = `400 16px Arial`;
              ctx.fillStyle = "#6b7280";
              ctx.fillText(titleText, 240, textY);
              textY += 20;
            }
           
            // Add location
            if (location) {
              ctx.font = `400 16px Arial`;
              ctx.fillStyle = "#9ca3af";
              ctx.fillText(location, 240, textY);
              textY += 20;
            }
           
            // Add timestamp at the bottom
            ctx.font = `400 12px Arial`;
            ctx.fillStyle = "#9ca3af";
            ctx.fillText(new Date().toLocaleString(), 240, textY);
          
                     // Get the final combined signature with transparency
           signatureData = canvas.toDataURL('image/png', 1.0);
          
          // Call onSave with the signature data
          const metadata = {
            type: 'adobe-style-modal',
            mode: signatureMode,
            createdAt: new Date().toISOString(),
            version: "1.0"
          };

          onSave({ 
            signature: signatureData, 
            name: signatureName, 
            metadata, 
            password: signaturePassword,
            details: {
              fullName,
              email,
              phone,
              jobTitle,
              department,
              companyName,
              location
            }
          });
          
          onOpenChange(false);
          handleClear();
        };
        tempImg.src = drawnSignatureData;
        
        // Return early for drawn signatures since we need to wait for image loading
        return;
             } else {
         // For typed signatures, show the name prominently
         ctx.font = `600 32px Arial`;
         ctx.fillStyle = "#000000";
         ctx.textAlign = 'left';
         ctx.textBaseline = 'middle';
         ctx.fillText(fullName, 20, yPosition);
         yPosition += 40;
      }
      
      // Add company name
      if (companyName) {
        ctx.font = `500 18px Arial`;
        ctx.fillStyle = "#374151";
        ctx.fillText(companyName, 20, yPosition);
        yPosition += 22;
      }
      
      // Add job title and department
      if (jobTitle || department) {
        let titleText = "";
        if (jobTitle && department) {
          titleText = `${jobTitle} • ${department}`;
        } else if (jobTitle) {
          titleText = jobTitle;
        } else if (department) {
          titleText = department;
        }
        ctx.font = `400 16px Arial`;
        ctx.fillStyle = "#6b7280";
        ctx.fillText(titleText, 20, yPosition);
        yPosition += 20;
      }
      
      // Add location
      if (location) {
        ctx.font = `400 16px Arial`;
        ctx.fillStyle = "#9ca3af";
        ctx.fillText(location, 20, yPosition);
        yPosition += 20;
      }
      
      // Add contact information
      if (email || phone) {
        let contactText = "";
        if (email && phone) {
          contactText = `${email} • ${phone}`;
        } else if (email) {
          contactText = email;
        } else if (phone) {
          contactText = phone;
        }
        ctx.font = `400 14px Arial`;
        ctx.fillStyle = "#6b7280";
        ctx.fillText(contactText, 20, yPosition);
        yPosition += 18;
      }
      
      // Add timestamp
      ctx.font = `400 12px Arial`;
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(new Date().toLocaleString(), 20, yPosition);
      
             signatureData = canvas.toDataURL('image/png', 1.0);
    }

    const metadata = {
      type: 'adobe-style-modal',
      mode: signatureMode,
      createdAt: new Date().toISOString(),
      version: "1.0"
    };

    onSave({ 
      signature: signatureData, 
      name: signatureName, 
      metadata, 
      password: signaturePassword,
      details: {
        fullName,
        email,
        phone,
        jobTitle,
        department,
        companyName,
        location
      }
    });
    
    onOpenChange(false);
    handleClear();
  };

  const handleClear = () => {
    setSignatureName("");
    setFullName("");
    setCompanyName("");
    setLocation("");
    setEmail("");
    setPhone("");
    setJobTitle("");
    setDepartment("");
    setSignaturePassword("");
    setConfirmPassword("");
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Adobe-Style Signature Modal
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
          {/* Left Panel - Signature Pad & Drawing */}
          <div className="space-y-6">
            {/* Signature Mode Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Signature Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Button
                    variant={signatureMode === 'draw' ? 'default' : 'outline'}
                    onClick={() => setSignatureMode('draw')}
                    className="flex-1"
                  >
                    <Pen className="h-4 w-4 mr-2" />
                    Draw Signature
                  </Button>
                  <Button
                    variant={signatureMode === 'type' ? 'default' : 'outline'}
                    onClick={() => setSignatureMode('type')}
                    className="flex-1"
                  >
                    <Type className="h-4 w-4 mr-2" />
                    Type Signature
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Signature Pad */}
            {signatureMode === 'draw' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Draw Your Signature</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: "w-full h-48 border border-gray-200 rounded-md",
                        style: { touchAction: "none" }
                      }}
                      backgroundColor="rgba(255, 255, 255, 0)"
                      penColor="black"
                      minWidth={1}
                      maxWidth={3}
                    />
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleClearSignature}>
                      Clear Signature
                    </Button>
                    <Badge variant="secondary" className="text-xs">
                      Use mouse or touch to draw
                    </Badge>
                  </div>
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    💡 Note: Your drawn signature will be combined with contact details to create a complete signature block.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Signature Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Signature Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-gray-200 rounded-lg p-4 bg-white min-h-[12rem]">
                                     {signatureMode === 'draw' && signatureRef.current && !signatureRef.current.isEmpty() ? (
                     <div className="space-y-3">
                       <div className="flex items-start space-x-4">
                         <div className="border border-gray-300 rounded p-2 bg-gray-50">
                           <img 
                             src={signatureRef.current.toDataURL()} 
                             alt="Drawn signature" 
                             className="h-16 w-auto"
                           />
                         </div>
                         <div className="flex-1">
                           <div className="text-xl font-semibold text-gray-900">
                             {fullName || "Your Name"}
                           </div>
                           {(email || phone) && (
                             <div className="text-sm text-gray-600 mt-1">
                               {email && phone ? `${email} • ${phone}` : (email || phone)}
                             </div>
                           )}
                         </div>
                       </div>
                       {companyName && (
                         <div className="text-lg font-medium text-gray-700">
                           {companyName}
                         </div>
                       )}
                       {(jobTitle || department) && (
                         <div className="text-base text-gray-600">
                           {jobTitle && department ? `${jobTitle} • ${department}` : (jobTitle || department)}
                         </div>
                       )}
                       {location && (
                         <div className="text-sm text-gray-500">
                           {location}
                         </div>
                       )}
                       <div className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                         {new Date().toLocaleString()}
                       </div>
                     </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="text-xl font-semibold text-gray-900">
                        {fullName || "Your Name"}
                      </div>
                      {companyName && (
                        <div className="text-lg font-medium text-gray-700">
                          {companyName}
                        </div>
                      )}
                      {(jobTitle || department) && (
                        <div className="text-base text-gray-600">
                          {jobTitle && department ? `${jobTitle} • ${department}` : (jobTitle || department)}
                        </div>
                      )}
                      {location && (
                        <div className="text-sm text-gray-500">
                          {location}
                        </div>
                      )}
                      {(email || phone) && (
                        <div className="text-sm text-gray-600">
                          {email && phone ? `${email} • ${phone}` : (email || phone)}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                        {new Date().toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Signature Name */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Signature Name</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="e.g., John Doe - Official Signature"
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Contact Details & Options */}
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center">
                  <User className="h-4 w-4 mr-2 text-blue-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="full-name">Full Name *</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@company.com"
                      className="w-full pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center">
                  <Briefcase className="h-4 w-4 mr-2 text-green-600" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="job-title">Job Title</Label>
                  <Input
                    id="job-title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Senior Manager"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Engineering"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company name"
                      className="w-full pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State/Country"
                      className="w-full pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Password Protection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-red-600" />
                  Password Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="signature-password">Signature Password *</Label>
                  <div className="relative">
                    <Input
                      id="signature-password"
                      type={showPassword ? "text" : "password"}
                      value={signaturePassword}
                      onChange={(e) => setSignaturePassword(e.target.value)}
                      placeholder="Enter password to protect signature"
                      className="w-full pr-10"
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
                  <p className="text-xs text-gray-500 mt-1">
                    This password will be required to apply this signature to documents
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {signaturePassword && confirmPassword && signaturePassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {signaturePassword && signaturePassword.length < 6 && (
                  <p className="text-xs text-red-500">Password must be at least 6 characters</p>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
                <Button
                  onClick={handleSave}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save Signature
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
