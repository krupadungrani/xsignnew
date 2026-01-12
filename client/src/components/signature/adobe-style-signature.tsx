import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Type,
  Pen,
  Upload,
  Download,
  Check,
  X,
  Sparkles,
  Shield,
  Clock,
  MapPin,
  Building,
  User,
  FileText,
  Eye,
  EyeOff,
  Settings,
  Palette,
  RotateCcw,
  RotateCw,
} from "lucide-react";

interface AdobeStyleSignatureProps {
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

interface SignatureStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  style: string;
  preview: string;
}

const signatureStyles: SignatureStyle[] = [
  {
    id: "elegant",
    name: "Elegant Script",
    fontFamily: "Dancing Script",
    fontSize: 24,
    fontWeight: "400",
    color: "#1f2937",
    style: "cursive",
    preview: "John Doe"
  },
  {
    id: "professional",
    name: "Professional",
    fontFamily: "Playfair Display",
    fontSize: 22,
    fontWeight: "600",
    color: "#374151",
    style: "serif",
    preview: "John Doe"
  },
  {
    id: "modern",
    name: "Modern Sans",
    fontFamily: "Inter",
    fontSize: 20,
    fontWeight: "500",
    color: "#111827",
    style: "sans-serif",
    preview: "John Doe"
  },
  {
    id: "classic",
    name: "Classic",
    fontFamily: "Times New Roman",
    fontSize: 18,
    fontWeight: "400",
    color: "#4b5563",
    style: "serif",
    preview: "John Doe"
  },
  {
    id: "bold",
    name: "Bold Signature",
    fontFamily: "Roboto",
    fontSize: 26,
    fontWeight: "700",
    color: "#000000",
    style: "sans-serif",
    preview: "John Doe"
  },
  {
    id: "minimal",
    name: "Minimal",
    fontFamily: "Helvetica",
    fontSize: 16,
    fontWeight: "300",
    color: "#6b7280",
    style: "sans-serif",
    preview: "John Doe"
  }
];

export function AdobeStyleSignature({ open, onOpenChange, onSave }: AdobeStyleSignatureProps) {
  const { toast } = useToast();
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
  const [selectedStyle, setSelectedStyle] = useState<SignatureStyle>(signatureStyles[0]);
  const [customText, setCustomText] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customFontSize, setCustomFontSize] = useState(selectedStyle.fontSize);
  const [customColor, setCustomColor] = useState(selectedStyle.color);
  const [customFontWeight, setCustomFontWeight] = useState(selectedStyle.fontWeight);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [includeCompany, setIncludeCompany] = useState(true);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [includePhone, setIncludePhone] = useState(false);
  const [includeJobTitle, setIncludeJobTitle] = useState(false);
  const [includeDepartment, setIncludeDepartment] = useState(false);
  const [signatureHistory, setSignatureHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Update custom values when style changes
  useEffect(() => {
    setCustomFontSize(selectedStyle.fontSize);
    setCustomColor(selectedStyle.color);
    setCustomFontWeight(selectedStyle.fontWeight);
  }, [selectedStyle]);

  // Generate signature preview
  const generateSignaturePreview = () => {
    const displayText = customText || fullName || "Your Name";
    const timestamp = includeTimestamp ? new Date().toLocaleString() : "";
    const locationText = includeLocation && location ? location : "";
    const companyText = includeCompany && companyName ? companyName : "";
    const emailText = includeEmail && email ? email : "";
    const phoneText = includePhone && phone ? phone : "";
    const jobTitleText = includeJobTitle && jobTitle ? jobTitle : "";
    const departmentText = includeDepartment && department ? department : "";
    
    return {
      mainText: displayText,
      timestamp,
      location: locationText,
      company: companyText,
      email: emailText,
      phone: phoneText,
      jobTitle: jobTitleText,
      department: departmentText
    };
  };

  // Render signature to canvas
  const renderSignatureToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 120;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set font properties
    ctx.font = `${customFontWeight} ${customFontSize}px ${selectedStyle.fontFamily}`;
    ctx.fillStyle = customColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const preview = generateSignaturePreview();
    let yPosition = 30;

    // Draw main signature text
    ctx.font = `${customFontWeight} ${customFontSize}px ${selectedStyle.fontFamily}`;
    ctx.fillText(preview.mainText, 20, yPosition);
    yPosition += 25;

    // Draw company if included
    if (preview.company) {
      ctx.font = `${parseInt(customFontWeight) - 200} ${customFontSize - 4}px ${selectedStyle.fontFamily}`;
      ctx.fillStyle = "#6b7280";
      ctx.fillText(preview.company, 20, yPosition);
      yPosition += 20;
    }

    // Draw location if included
    if (preview.location) {
      ctx.font = `${parseInt(customFontWeight) - 200} ${customFontSize - 6}px ${selectedStyle.fontFamily}`;
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(preview.location, 20, yPosition);
      yPosition += 18;
    }

    // Draw email if included
    if (preview.email) {
      ctx.font = `${parseInt(customFontWeight) - 200} ${customFontSize - 6}px ${selectedStyle.fontFamily}`;
      ctx.fillStyle = "#6b7280";
      ctx.fillText(preview.email, 20, yPosition);
      yPosition += 16;
    }

    // Draw phone if included
    if (preview.phone) {
      ctx.font = `${parseInt(customFontWeight) - 200} ${customFontSize - 6}px ${selectedStyle.fontFamily}`;
      ctx.fillStyle = "#6b7280";
      ctx.fillText(preview.phone, 20, yPosition);
      yPosition += 16;
    }

    // Draw job title if included
    if (preview.jobTitle) {
      ctx.font = `${parseInt(customFontWeight) - 200} ${customFontSize - 6}px ${selectedStyle.fontFamily}`;
      ctx.fillStyle = "#6b7280";
      ctx.fillText(preview.jobTitle, 20, yPosition);
      yPosition += 16;
    }

    // Draw department if included
    if (preview.department) {
      ctx.font = `${parseInt(customFontWeight) - 200} ${customFontSize - 6}px ${selectedStyle.fontFamily}`;
      ctx.fillStyle = "#6b7280";
      ctx.fillText(preview.department, 20, yPosition);
      yPosition += 16;
    }

    // Draw timestamp if included
    if (preview.timestamp) {
      ctx.font = `${parseInt(customFontWeight) - 200} ${customFontSize - 8}px ${selectedStyle.fontFamily}`;
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(preview.timestamp, 20, yPosition);
    }
  };

  // Update canvas when properties change
  useEffect(() => {
    renderSignatureToCanvas();
  }, [selectedStyle, customText, fullName, companyName, location, email, phone, jobTitle, department, customFontSize, customColor, customFontWeight, includeTimestamp, includeLocation, includeCompany, includeEmail, includePhone, includeJobTitle, includeDepartment]);

  const handleSave = () => {
    if (!signatureName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your signature",
        variant: "destructive",
      });
      return;
    }

    if (!fullName.trim() && !customText.trim()) {
      toast({
        title: "Signature text required",
        description: "Please enter your name or custom signature text",
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

    const canvas = canvasRef.current;
    if (!canvas) {
      toast({
        title: "Error",
        description: "Failed to generate signature",
        variant: "destructive",
      });
      return;
    }

    const signatureData = canvas.toDataURL('image/png');
    const metadata = {
      type: 'adobe-style',
      style: selectedStyle,
      customFontSize,
      customColor,
      customFontWeight,
      includeTimestamp,
      includeLocation,
      includeCompany,
      includeEmail,
      includePhone,
      includeJobTitle,
      includeDepartment,
      fullName,
      companyName,
      location,
      email,
      phone,
      jobTitle,
      department,
      customText,
      createdAt: new Date().toISOString(),
      version: "2.0"
    };

    // Add to history
    const newHistory = [...signatureHistory.slice(0, currentHistoryIndex + 1), signatureData];
    setSignatureHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);

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
    setCustomText("");
    setFullName("");
    setCompanyName("");
    setLocation("");
    setEmail("");
    setPhone("");
    setJobTitle("");
    setDepartment("");
    setSignaturePassword("");
    setConfirmPassword("");
    setSelectedStyle(signatureStyles[0]);
    setCustomFontSize(selectedStyle.fontSize);
    setCustomColor(selectedStyle.color);
    setCustomFontWeight(selectedStyle.fontWeight);
    setIncludeTimestamp(true);
    setIncludeLocation(true);
    setIncludeCompany(true);
    setIncludeEmail(true);
    setIncludePhone(false);
    setIncludeJobTitle(false);
    setIncludeDepartment(false);
    setSignatureHistory([]);
    setCurrentHistoryIndex(-1);
  };

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(currentHistoryIndex - 1);
      // Restore from history
      const canvas = canvasRef.current;
      if (canvas) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = signatureHistory[currentHistoryIndex - 1];
      }
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < signatureHistory.length - 1) {
      setCurrentHistoryIndex(currentHistoryIndex + 1);
      // Restore from history
      const canvas = canvasRef.current;
      if (canvas) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = signatureHistory[currentHistoryIndex + 1];
      }
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `adobe-signature-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const preview = generateSignaturePreview();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Adobe-Style Digital Signature
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
          {/* Left Panel - Configuration */}
          <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
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

            {/* Signature Text */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Signature Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-text">Custom Text (Optional)</Label>
                  <Input
                    id="custom-text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Custom signature text"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company name"
                    className="w-full"
                  />
                </div>
                                 <div>
                   <Label htmlFor="location">Location</Label>
                   <Input
                     id="location"
                     value={location}
                     onChange={(e) => setLocation(e.target.value)}
                     placeholder="City, State/Country"
                     className="w-full"
                   />
                 </div>
                 <div>
                   <Label htmlFor="email">Email</Label>
                   <Input
                     id="email"
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="your.email@company.com"
                     className="w-full"
                   />
                 </div>
                 <div>
                   <Label htmlFor="phone">Phone</Label>
                   <Input
                     id="phone"
                     type="tel"
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                     placeholder="+1 (555) 123-4567"
                     className="w-full"
                   />
                 </div>
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
              </CardContent>
            </Card>

            {/* Style Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Signature Style</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {signatureStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        selectedStyle.id === style.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div 
                        className="text-sm font-medium mb-1"
                        style={{ 
                          fontFamily: style.fontFamily,
                          fontSize: style.fontSize,
                          fontWeight: style.fontWeight,
                          color: style.color
                        }}
                      >
                        {style.preview}
                      </div>
                      <div className="text-xs text-gray-500">{style.name}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Advanced Settings</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-3">
                  <div>
                    <Label>Font Size: {customFontSize}px</Label>
                    <input
                      type="range"
                      min="12"
                      max="36"
                      value={customFontSize}
                      onChange={(e) => setCustomFontSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label>Font Weight</Label>
                    <select
                      value={customFontWeight}
                      onChange={(e) => setCustomFontWeight(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="300">Light (300)</option>
                      <option value="400">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi Bold (600)</option>
                      <option value="700">Bold (700)</option>
                    </select>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-8 h-8 rounded border"
                      />
                      <Input
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
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
                   <Label htmlFor="signature-password">Signature Password</Label>
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
                   <Label htmlFor="confirm-password">Confirm Password</Label>
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

             {/* Include Options */}
             <Card>
               <CardHeader>
                 <CardTitle className="text-sm font-medium">Include Information</CardTitle>
               </CardHeader>
               <CardContent className="space-y-2">
                 <label className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={includeTimestamp}
                     onChange={(e) => setIncludeTimestamp(e.target.checked)}
                     className="rounded"
                   />
                   <span className="text-sm">Timestamp</span>
                 </label>
                 <label className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={includeLocation}
                     onChange={(e) => setIncludeLocation(e.target.checked)}
                     className="rounded"
                   />
                   <span className="text-sm">Location</span>
                 </label>
                 <label className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={includeCompany}
                     onChange={(e) => setIncludeCompany(e.target.checked)}
                     className="rounded"
                   />
                   <span className="text-sm">Company</span>
                 </label>
                 <label className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={includeEmail}
                     onChange={(e) => setIncludeEmail(e.target.checked)}
                     className="rounded"
                   />
                   <span className="text-sm">Email</span>
                 </label>
                 <label className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={includePhone}
                     onChange={(e) => setIncludePhone(e.target.checked)}
                     className="rounded"
                   />
                   <span className="text-sm">Phone</span>
                 </label>
                 <label className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={includeJobTitle}
                     onChange={(e) => setIncludeJobTitle(e.target.checked)}
                     className="rounded"
                   />
                   <span className="text-sm">Job Title</span>
                 </label>
                 <label className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={includeDepartment}
                     onChange={(e) => setIncludeDepartment(e.target.checked)}
                     className="rounded"
                   />
                   <span className="text-sm">Department</span>
                 </label>
               </CardContent>
             </Card>
          </div>

          {/* Center Panel - Preview */}
          <div className="flex flex-col space-y-4">
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Live Preview</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showPreview ? (
                  <div className="space-y-4">
                    {/* Canvas Preview */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-32 border border-gray-200 rounded"
                        style={{ maxWidth: '100%', height: 'auto' }}
                      />
                    </div>
                    
                    {/* Text Preview */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 mb-2">Text Preview:</div>
                      <div 
                        className="text-lg"
                        style={{ 
                          fontFamily: selectedStyle.fontFamily,
                          fontSize: customFontSize,
                          fontWeight: customFontWeight,
                          color: customColor
                        }}
                      >
                        {preview.mainText}
                      </div>
                      {preview.company && (
                        <div 
                          className="text-sm text-gray-600 mt-1"
                          style={{ fontFamily: selectedStyle.fontFamily }}
                        >
                          {preview.company}
                        </div>
                      )}
                      {preview.location && (
                        <div 
                          className="text-xs text-gray-500 mt-1"
                          style={{ fontFamily: selectedStyle.fontFamily }}
                        >
                          {preview.location}
                        </div>
                      )}
                                             {preview.email && (
                         <div 
                           className="text-sm text-gray-600 mt-1"
                           style={{ fontFamily: selectedStyle.fontFamily }}
                         >
                           {preview.email}
                         </div>
                       )}
                       {preview.phone && (
                         <div 
                           className="text-sm text-gray-600 mt-1"
                           style={{ fontFamily: selectedStyle.fontFamily }}
                         >
                           {preview.phone}
                         </div>
                       )}
                       {preview.jobTitle && (
                         <div 
                           className="text-sm text-gray-600 mt-1"
                           style={{ fontFamily: selectedStyle.fontFamily }}
                         >
                           {preview.jobTitle}
                         </div>
                       )}
                       {preview.department && (
                         <div 
                           className="text-sm text-gray-600 mt-1"
                           style={{ fontFamily: selectedStyle.fontFamily }}
                         >
                           {preview.department}
                         </div>
                       )}
                       {preview.timestamp && (
                         <div 
                           className="text-xs text-gray-500 mt-1"
                           style={{ fontFamily: selectedStyle.fontFamily }}
                         >
                           {preview.timestamp}
                         </div>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    Preview hidden
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={currentHistoryIndex <= 0}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={currentHistoryIndex >= signatureHistory.length - 1}
                  className="flex-1"
                >
                  <RotateCw className="h-4 w-4 mr-1" />
                  Redo
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Preview
              </Button>
            </div>
          </div>

          {/* Right Panel - Information */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-green-600" />
                  Adobe-Style Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Professional Typography</div>
                    <div className="text-gray-600">Clean, readable fonts optimized for documents</div>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Automatic Timestamping</div>
                    <div className="text-gray-600">Includes date and time of signature</div>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Contextual Information</div>
                    <div className="text-gray-600">Company, location, and verification details</div>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">High Resolution</div>
                    <div className="text-gray-600">Vector-based rendering for crisp display</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Current Style</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Font:</span> {selectedStyle.fontFamily}</div>
                  <div><span className="font-medium">Size:</span> {customFontSize}px</div>
                  <div><span className="font-medium">Weight:</span> {customFontWeight}</div>
                  <div><span className="font-medium">Color:</span> 
                    <span 
                      className="ml-2 px-2 py-1 rounded text-xs"
                      style={{ backgroundColor: customColor, color: '#fff' }}
                    >
                      {customColor}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Signature Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
