import { useState, useRef, useEffect } from "react";
import { type DigitalSignature, type AppliedSignature } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  Eye, 
  MousePointer,
  Save
} from "lucide-react";

interface SignatureBoxProps {
  signature: DigitalSignature;
  appliedSignature: AppliedSignature;
  position: { x: number; y: number };
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
  onViewDetails: () => void;
  onSaveToPages: (pageOption: 'current' | 'all') => void;
}

function SignatureBox({ 
  signature, 
  appliedSignature, 
  position, 
  onMove, 
  onRemove,
  onViewDetails,
  onSaveToPages
}: SignatureBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [dragPosition, setDragPosition] = useState(position);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  
  // Update drag position when position prop changes
  useEffect(() => {
    setDragPosition(position);
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDraggingRef.current) return;
    
    const rect = dragRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setIsDragging(true);
    isDraggingRef.current = true;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      
      // Bounds checking - keep within PDF area
      const clampedX = Math.max(0, Math.min(newX, 600 - 200));
      const clampedY = Math.max(0, Math.min(newY, 400 - 80));
      
      setDragPosition({ x: clampedX, y: clampedY });
    };
    
    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      
      setIsDragging(false);
      isDraggingRef.current = false;
      
      // Call onMove with final position
      onMove(dragPosition.x, dragPosition.y);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={dragRef}
      onMouseDown={handleMouseDown}
      className={`absolute bg-white rounded-lg border-2 border-blue-300 p-3 shadow-lg cursor-move select-none ${
        isDragging ? 'opacity-90 shadow-xl scale-105' : 'hover:shadow-md'
      }`}
      style={{
        left: dragPosition.x,
        top: dragPosition.y,
        width: 220,
        height: 100,
        zIndex: isDragging ? 9999 : 1000,
        userSelect: 'none',
        pointerEvents: 'auto',
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.2s ease',
      }}
      data-testid={`signature-box-${signature.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
          <MousePointer className="h-3 w-3 mr-1" />
          {isDragging ? 'Moving...' : 'Drag to move'}
        </Badge>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowSaveOptions(!showSaveOptions);
            }}
            className="h-6 w-6 p-0 text-green-500 hover:text-green-700"
            title="Save position"
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="font-medium text-gray-900 truncate">
          {signature.fullName}
        </div>
        <div className="text-gray-600 truncate">
          {signature.companyName}
        </div>
        <div className="text-gray-500 text-xs">
          {appliedSignature.appliedAt ? 
            new Date(appliedSignature.appliedAt).toLocaleDateString() : 
            'Recently applied'
          }
        </div>
      </div>

      {/* Save Options Popup */}
      {showSaveOptions && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
          <div className="text-xs font-medium text-gray-700 mb-2">Save to:</div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSaveToPages('current');
                setShowSaveOptions(false);
              }}
              className="w-full h-6 text-xs justify-start"
            >
              Current page only
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSaveToPages('all');
                setShowSaveOptions(false);
              }}
              className="w-full h-6 text-xs justify-start"
            >
              All pages
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EnhancedSignatureGridProps {
  signatures: DigitalSignature[];
  appliedSignatures: AppliedSignature[];
  onApplySignature: (signatureId: string, position: string) => void;
  onRemoveSignature: (appliedSignatureId: string) => void;
  onMoveSignature: (appliedSignatureId: string, x: number, y: number) => void;
  onPositionChange: (position: string) => void;
  selectedPosition: string;
  onSaveSignatureToPages: (appliedSignatureId: string, pageOption: 'current' | 'all') => void;
}

export function EnhancedSignatureGrid({ 
  signatures, 
  appliedSignatures, 
  onApplySignature, 
  onRemoveSignature,
  onMoveSignature,
  onPositionChange,
  selectedPosition,
  onSaveSignatureToPages
}: EnhancedSignatureGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMoveSignature = (appliedSignatureId: string, x: number, y: number) => {
    // Simple bounds checking with fixed dimensions
    const maxX = 600; // Fixed max width
    const maxY = 400; // Fixed max height
    
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));
    
    onMoveSignature(appliedSignatureId, clampedX, clampedY);
  };

  const getGridPosition = (gridPosition: string) => {
    // Fixed dimensions for consistent positioning
    const width = 600;
    const height = 400;
    const signatureWidth = 220;
    const signatureHeight = 100;
    const margin = 20;
    
    const gridMap: Record<string, { x: number; y: number }> = {
      "top-left": { x: margin, y: margin },
      "top-center": { x: (width - signatureWidth) / 2, y: margin },
      "top-right": { x: width - margin - signatureWidth, y: margin },
      "middle-left": { x: margin, y: (height - signatureHeight) / 2 },
      "middle-center": { x: (width - signatureWidth) / 2, y: (height - signatureHeight) / 2 },
      "middle-right": { x: width - margin - signatureWidth, y: (height - signatureHeight) / 2 },
      "bottom-left": { x: margin, y: height - margin - signatureHeight },
      "bottom-center": { x: (width - signatureWidth) / 2, y: height - margin - signatureHeight },
      "bottom-right": { x: width - margin - signatureWidth, y: height - margin - signatureHeight },
    };
    
    return gridMap[gridPosition] || gridMap["middle-center"];
  };

  return (
    <div 
      className="absolute inset-0" 
      data-testid="enhanced-signature-grid-container" 
      ref={containerRef}
      style={{
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {/* Applied signatures as draggable boxes */}
      {appliedSignatures.map((appliedSig) => {
        const signature = signatures.find(s => s.id === appliedSig.signatureId);
        if (!signature) return null;

        const position = appliedSig.position as any;
        let coords;
        
        if (position.gridPosition) {
          // Convert grid position to coordinates
          coords = getGridPosition(position.gridPosition);
        } else if (position.x !== undefined && position.y !== undefined) {
          // Use custom positioning
          coords = { x: position.x, y: position.y };
        } else {
          // Fallback to center position
          coords = getGridPosition("middle-center");
        }

        return (
          <div 
            key={appliedSig.id} 
            style={{ pointerEvents: 'auto' }}
          >
            <SignatureBox
              signature={signature}
              appliedSignature={appliedSig}
              position={coords}
              onMove={(x, y) => handleMoveSignature(appliedSig.id, x, y)}
              onRemove={() => onRemoveSignature(appliedSig.id)}
              onViewDetails={() => {
                console.log("View signature details:", signature);
              }}
              onSaveToPages={(pageOption) => onSaveSignatureToPages(appliedSig.id, pageOption)}
            />
          </div>
        );
      })}
    </div>
  );
}
