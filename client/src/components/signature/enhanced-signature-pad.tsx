import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pen,
  Eraser,
  RotateCcw,
  RotateCw,
  Download,
  Upload,
  Palette,
  Type,
  Sparkles,
  X,
  Check,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";

interface EnhancedSignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (signatureData: { signature: string; name: string; metadata?: any }) => void;
}

interface StrokeHistory {
  points: Array<{ x: number; y: number; pressure?: number }>;
  color: string;
  width: number;
  type: 'pen' | 'eraser';
}

export function EnhancedSignaturePad({ open, onOpenChange, onSave }: EnhancedSignaturePadProps) {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureName, setSignatureName] = useState("");
  const [penColor, setPenColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState([2]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [opacity, setOpacity] = useState([100]);
  const [showGrid, setShowGrid] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [canvasBackground, setCanvasBackground] = useState('white');
  const [strokeHistory, setStrokeHistory] = useState<StrokeHistory[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokeHistory | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { toast } = useToast();

  const penColors = [
    "#000000", "#1f2937", "#374151", "#6b7280", "#9ca3af",
    "#dc2626", "#ea580c", "#d97706", "#65a30d", "#16a34a",
    "#0d9488", "#0891b2", "#2563eb", "#7c3aed", "#dc2626",
    "#ec4899", "#f43f5e", "#f97316", "#eab308", "#84cc16"
  ];

  const strokeWidths = [1, 2, 3, 4, 6, 8, 12, 16];

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
      const metadata = {
        penColor,
        strokeWidth: strokeWidth[0],
        opacity: opacity[0],
        tool,
        canvasBackground,
        createdAt: new Date().toISOString(),
        version: "2.0"
      };
      
      onSave({ signature: signatureData, name: signatureName, metadata });
      onOpenChange(false);
      handleClear();
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
    setStrokeHistory([]);
    setCurrentStroke(null);
    setSignatureName("");
  };

  const handleUndo = () => {
    if (strokeHistory.length > 0) {
      const newHistory = strokeHistory.slice(0, -1);
      setStrokeHistory(newHistory);
      
      // Redraw canvas
      signatureRef.current?.clear();
      newHistory.forEach(stroke => {
        if (signatureRef.current) {
          const ctx = signatureRef.current.getCanvas().getContext('2d');
          if (ctx) {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.globalAlpha = stroke.type === 'eraser' ? 0 : 1;
            ctx.beginPath();
            stroke.points.forEach((point, index) => {
              if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.stroke();
          }
        }
      });
    }
  };

  const handleRedo = () => {
    // Implementation for redo functionality
    toast({
      title: "Redo",
      description: "Redo functionality coming soon!",
    });
  };

  const handleStrokeStart = (event: any) => {
    setIsDrawing(true);
    const newStroke: StrokeHistory = {
      points: [],
      color: tool === 'eraser' ? '#ffffff' : penColor,
      width: strokeWidth[0],
      type: tool
    };
    setCurrentStroke(newStroke);
  };

  const handleStrokeEnd = () => {
    setIsDrawing(false);
    if (currentStroke && currentStroke.points.length > 0) {
      setStrokeHistory(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  };

  const handleStrokeUpdate = (event: any) => {
    if (isDrawing && currentStroke) {
      const canvas = signatureRef.current?.getCanvas();
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        setCurrentStroke(prev => prev ? {
          ...prev,
          points: [...prev.points, { x, y }]
        } : null);
      }
    }
  };

  const handleDownload = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const link = document.createElement('a');
      link.download = `signature-${Date.now()}.png`;
      link.href = signatureRef.current.toDataURL();
      link.click();
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            if (signatureRef.current) {
              const canvas = signatureRef.current.getCanvas();
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              }
            }
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  useEffect(() => {
    if (signatureRef.current) {
      const canvas = signatureRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : penColor;
        ctx.lineWidth = strokeWidth[0];
        ctx.globalAlpha = opacity[0] / 100;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [penColor, strokeWidth, tool, opacity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Enhanced Signature Pad
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-6 min-h-[600px]">
          {/* Left Panel - Tools */}
          <div className="w-80 space-y-4 overflow-y-auto max-h-[70vh] pr-2">
            <Tabs defaultValue="draw" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="draw">Draw</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
              </TabsList>
              
              <TabsContent value="draw" className="space-y-4">
                {/* Tool Selection */}
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-sm font-medium mb-3 block">Tools</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={tool === 'pen' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTool('pen')}
                        className="flex-1"
                      >
                        <Pen className="h-4 w-4 mr-2" />
                        Pen
                      </Button>
                      <Button
                        variant={tool === 'eraser' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTool('eraser')}
                        className="flex-1"
                      >
                        <Eraser className="h-4 w-4 mr-2" />
                        Eraser
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Color Palette */}
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-sm font-medium mb-3 block">Colors</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {penColors.map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            penColor === color ? 'border-blue-600 scale-110' : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setPenColor(color)}
                        />
                      ))}
                    </div>
                    <div className="mt-3">
                      <input
                        type="color"
                        value={penColor}
                        onChange={(e) => setPenColor(e.target.value)}
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Stroke Width */}
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-sm font-medium mb-3 block">
                      Stroke Width: {strokeWidth[0]}px
                    </Label>
                                         <Slider
                       value={strokeWidth}
                       onValueChange={setStrokeWidth}
                       max={20}
                       min={1}
                       step={1}
                       className="w-full mb-2"
                     />
                    <div className="flex gap-1 mt-2">
                      {strokeWidths.map((width) => (
                        <button
                          key={width}
                          className={`px-2 py-1 text-xs rounded ${
                            strokeWidth[0] === width ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          onClick={() => setStrokeWidth([width])}
                        >
                          {width}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                                 {/* Opacity */}
                 <Card>
                   <CardContent className="p-4">
                     <Label className="text-sm font-medium mb-3 block">
                       Opacity: {opacity[0]}%
                     </Label>
                     <Slider
                       value={opacity}
                       onValueChange={setOpacity}
                       max={100}
                       min={10}
                       step={5}
                       className="w-full mb-2"
                     />
                     <div className="flex justify-between text-xs text-gray-500">
                       <span>10%</span>
                       <span>100%</span>
                     </div>
                   </CardContent>
                 </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-sm font-medium mb-3 block">Canvas Settings</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Show Grid</span>
                        <Button
                          variant={showGrid ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setShowGrid(!showGrid)}
                        >
                          {showGrid ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Show Guidelines</span>
                        <Button
                          variant={showGuidelines ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setShowGuidelines(!showGuidelines)}
                        >
                          {showGuidelines ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="export" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-sm font-medium mb-3 block">Actions</Label>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUndo}
                        className="w-full"
                        disabled={strokeHistory.length === 0}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Undo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRedo}
                        className="w-full"
                      >
                        <RotateCw className="h-4 w-4 mr-2" />
                        Redo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="w-full"
                        disabled={!signatureRef.current?.isEmpty()}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUpload}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Signature Name */}
            <Card>
              <CardContent className="p-4">
                <Label htmlFor="signature-name" className="text-sm font-medium mb-2 block">
                  Signature Name
                </Label>
                <Input
                  id="signature-name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="e.g., John Doe - Official Signature"
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Canvas */}
          <div className="flex-1 flex flex-col min-h-[500px]">
            <div className="flex-1 relative bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden min-h-[400px]">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "w-full h-full",
                  style: { 
                    touchAction: "none",
                    background: canvasBackground,
                    cursor: tool === 'eraser' ? 'crosshair' : 'crosshair'
                  }
                }}
                backgroundColor="rgba(255, 255, 255, 0)"
                penColor={penColor}
                minWidth={strokeWidth[0]}
                maxWidth={strokeWidth[0]}
                onBegin={handleStrokeStart}
                onEnd={handleStrokeEnd}
                onUpdate={handleStrokeUpdate}
              />
              
              {/* Guidelines */}
              {showGuidelines && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-blue-200 opacity-50"></div>
                  <div className="absolute bottom-1/3 left-0 right-0 h-px bg-blue-200 opacity-50"></div>
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-blue-200 opacity-50"></div>
                  <div className="absolute right-1/3 top-0 bottom-0 w-px bg-blue-200 opacity-50"></div>
                </div>
              )}
              
              {/* Grid */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="w-full h-full" style={{
                    backgroundImage: `
                      linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}></div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={handleClear} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
              <Button onClick={handleSave} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700">
                <Check className="h-4 w-4" />
                Save Signature
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
