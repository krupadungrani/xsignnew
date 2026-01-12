import { useState, useRef, useEffect } from "react";
import { type DigitalSignature, type AppliedSignature } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  Trash2
} from "lucide-react";

interface SignatureBoxProps {
  signature: DigitalSignature;
  appliedSignature: AppliedSignature;
  position: { x: number; y: number };
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
  onRemoveFromAllPages: () => void;
  onRemoveWithPassword: (appliedSignatureId: string, removeFromAllPages: boolean) => void;
  onViewDetails: () => void;
  onSaveToPages: (pageOption: 'current' | 'all', position?: any) => void;
  applyToAllPages: boolean;
  pdfPageRect: DOMRect | null;
}

function SignatureBox({ 
  signature, 
  appliedSignature, 
  position, 
  onMove, 
  onRemove,
  onRemoveFromAllPages,
  onRemoveWithPassword,
  onViewDetails,
  onSaveToPages,
  applyToAllPages,
  pdfPageRect,
  containerRef
}: SignatureBoxProps & { containerRef: React.RefObject<HTMLDivElement> }) {
  const [isDragging, setIsDragging] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [showRemoveOptions, setShowRemoveOptions] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [isAtBoundary, setIsAtBoundary] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const currentPositionRef = useRef(position);
  const justFinishedDraggingRef = useRef(false);
  
  // Update position when prop changes (but not during drag or immediately after)
  useEffect(() => {
    if (!isDragging && !justFinishedDraggingRef.current) {
      if (currentPositionRef.current.x !== position.x || currentPositionRef.current.y !== position.y) {
        setCurrentPosition(position);
        currentPositionRef.current = position;
      }
    }
  }, [position, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = dragRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Store initial drag state
    dragStartRef.current = {
      x: currentPosition.x,
      y: currentPosition.y,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
    
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      
      // Calculate position relative to the container
      const relativeX = e.clientX - containerRect.left - dragStartRef.current.offsetX;
      const relativeY = e.clientY - containerRect.top - dragStartRef.current.offsetY;
      
      // Calculate bounds based on actual PDF content area (canvas or svg)
      const signatureWidth = 220;
      const signatureHeight = 100;
      
      // Get the PDF content element (canvas or svg) - try multiple selectors for reliability
      const pdfCanvas = document.querySelector('.react-pdf__Page canvas') as HTMLElement;
      const pdfSvg = document.querySelector('.react-pdf__Page svg') as HTMLElement;
      const pdfPage = document.querySelector('.react-pdf__Page') as HTMLElement;
      const pdfContentElement = pdfCanvas || pdfSvg || pdfPage;
      
      if (pdfContentElement) {
        const pdfContentRect = pdfContentElement.getBoundingClientRect();
        
        // Calculate offset from container to PDF content
        const offsetX = pdfContentRect.left - containerRect.left;
        const offsetY = pdfContentRect.top - containerRect.top;
        
        // Convert container-relative position to PDF content-relative position
        const pdfRelativeX = relativeX - offsetX;
        const pdfRelativeY = relativeY - offsetY;
        
        const minX = 0;
        const maxX = pdfContentRect.width - signatureWidth;
        const minY = 0;
        const maxY = pdfContentRect.height - signatureHeight;
        
        // Clamp position to PDF content boundaries
        const boundedPdfX = Math.max(minX, Math.min(pdfRelativeX, maxX));
        const boundedPdfY = Math.max(minY, Math.min(pdfRelativeY, maxY));
        
        // Convert back to container-relative position for display
        const boundedX = boundedPdfX + offsetX;
        const boundedY = boundedPdfY + offsetY;
        
        // Check if we're at a boundary
        const isAtEdge = (pdfRelativeX !== boundedPdfX) || (pdfRelativeY !== boundedPdfY);
        setIsAtBoundary(isAtEdge);
        
        const newPosition = { x: boundedX, y: boundedY };
        setCurrentPosition(newPosition);
        currentPositionRef.current = newPosition;
        return;
      }
      
      // Fallback to container bounds if PDF content not found
      const minX = 0;
      const maxX = containerRect.width - signatureWidth;
      const minY = 0;
      const maxY = containerRect.height - signatureHeight;
      
      // Clamp position to PDF content boundaries
      const boundedX = Math.max(minX, Math.min(relativeX, maxX));
      const boundedY = Math.max(minY, Math.min(relativeY, maxY));
      
      // Check if we're at a boundary
      const isAtEdge = (relativeX !== boundedX) || (relativeY !== boundedY);
      setIsAtBoundary(isAtEdge);
      
      const newPosition = { x: boundedX, y: boundedY };
      setCurrentPosition(newPosition);
      currentPositionRef.current = newPosition;
    };
    
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsAtBoundary(false);
    justFinishedDraggingRef.current = true;
    
    // Debounce the position update to avoid excessive API calls
    const debouncedUpdate = () => {
      const currentPos = currentPositionRef.current;
      onMove(currentPos.x, currentPos.y);
    };
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      setTimeout(debouncedUpdate, 100);
    });
    
    // Reset the flag after a short delay to allow for database updates
    setTimeout(() => {
      justFinishedDraggingRef.current = false;
    }, 300); // Reduced from 500ms
    
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
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setShowRemoveOptions(false);
        setShowSaveOptions(false);
      }}
      className={`absolute rounded-lg border-2 p-3 shadow-lg cursor-move select-none ${
        isDragging ? 'bg-white/20 shadow-xl scale-105' : 'hover:shadow-md bg-white'
      } ${
        isAtBoundary ? 'border-red-500 bg-red-50' : 'border-blue-300'
      }`}
              style={{
          left: currentPosition.x,
          top: currentPosition.y,
          width: 220,
          height: 100,
          zIndex: isDragging ? 99999 : 10000,
          userSelect: 'none',
          pointerEvents: 'auto',
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          transition: isDragging ? 'none' : 'all 0.1s ease',
        }}
      data-testid={`signature-box-${signature.id}`}
    >
      <div className="flex flex-row gap-3 items-center justify-between mb-2">
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

        <div className="flex items-center space-x-1">
          {/* Remove Options Dropdown */}
<div 
  className="relative"
  onMouseEnter={() => setShowRemoveOptions(true)}
  onMouseLeave={() => setShowRemoveOptions(false)}
>
  <Button
    variant="ghost"
    size="sm"
    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
    title="Remove signature"
    onClick={(e) => {
      e.stopPropagation();
      console.log("Delete button clicked - applyToAllPages:", applyToAllPages);
      if (signature.password && signature.password.trim() !== "") {
        console.log("Password-protected signature - calling onRemoveWithPassword with applyToAllPages:", applyToAllPages);
        onRemoveWithPassword(appliedSignature.id, applyToAllPages);
      } else if (applyToAllPages) {
        console.log("Removing from all pages");
        onRemoveFromAllPages();
      } else {
        console.log("Removing from current page only");
        onRemove();
      }
    }}
  >
    <Trash2 className="h-3 w-3" />
  </Button>

  {/* {showRemoveOptions && (
    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-[160px]">
      <div className="text-xs font-medium text-gray-700 mb-2">Remove from:</div>
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (signature.password && signature.password.trim() !== "") {
              onRemoveWithPassword(appliedSignature.id, false);
            } else {
              onRemove();
            }
            setShowRemoveOptions(false);
          }}
          className="w-full h-6 text-xs justify-start text-red-600 hover:text-red-800 hover:bg-red-50"
        >
          Current page only
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (signature.password && signature.password.trim() !== "") {
              onRemoveWithPassword(appliedSignature.id, true);
            } else {
              onRemoveFromAllPages();
            }
            setShowRemoveOptions(false);
          }}
          className="w-full h-6 text-xs justify-start text-red-600 hover:text-red-800 hover:bg-red-50"
        >
          All pages
        </Button>
      </div>
    </div>
  )} */}
</div>


        </div>
      
      </div>
      
    

    </div>
  );
}

interface EnhancedSignatureGridProps {
  signatures: DigitalSignature[];
  appliedSignatures: AppliedSignature[];
  onApplySignature: (signatureId: string, position: string) => void;
  onRemoveSignature: (appliedSignatureId: string) => void;
  onRemoveSignatureFromAllPages: (appliedSignatureId: string) => void;
  onRemoveWithPassword: (appliedSignatureId: string, removeFromAllPages: boolean) => void;
  onMoveSignature: (appliedSignatureId: string, x: number, y: number, viewerDimensions?: { viewerWidth: number; viewerHeight: number }) => void;
  onPositionChange: (position: string) => void;
  selectedPosition: string;
  onSaveSignatureToPages: (appliedSignatureId: string, pageOption: 'current' | 'all', position?: any) => void;
  applyToAllPages: boolean;
}

export function SimpleDragLayer({ 
  signatures, 
  appliedSignatures, 
  onApplySignature, 
  onRemoveSignature,
  onRemoveSignatureFromAllPages,
  onRemoveWithPassword,
  onMoveSignature,
  onPositionChange,
  selectedPosition,
  onSaveSignatureToPages,
  applyToAllPages
}: EnhancedSignatureGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfPageRect, setPdfPageRect] = useState<DOMRect | null>(null);
  const [pdfViewerRect, setPdfViewerRect] = useState<DOMRect | null>(null);
  const pdfPageRectRef = useRef<DOMRect | null>(null);

  // Update PDF page dimensions when appliedSignatures change or on mount
  useEffect(() => {
    const updateRects = () => {
      // Try to find the actual PDF content area (canvas or svg)
      const pdfCanvas = document.querySelector('.react-pdf__Page canvas') as HTMLElement;
      const pdfSvg = document.querySelector('.react-pdf__Page svg') as HTMLElement;
      const pdfPageElement = document.querySelector('.react-pdf__Page') as HTMLElement;
      const pdfViewerElement = document.querySelector('[data-testid="pdf-document"]') as HTMLElement || 
                               document.querySelector('.react-pdf__Document') as HTMLElement ||
                               document.querySelector('.pdf-viewer-container') as HTMLElement;

      // Use canvas/svg if available, otherwise fall back to page element
      const pdfContentElement = pdfCanvas || pdfSvg || pdfPageElement;

      if (pdfContentElement) {
        const rect = pdfContentElement.getBoundingClientRect();
        setPdfPageRect(rect);
        pdfPageRectRef.current = rect;
      }
      if (pdfViewerElement) {
        setPdfViewerRect(pdfViewerElement.getBoundingClientRect());
      }
    };

    // Debounce function to prevent excessive calls
    let resizeTimeout: NodeJS.Timeout;
    let scrollTimeout: NodeJS.Timeout;
    
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateRects, 100);
    };
    
    const debouncedScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateRects, 100);
    };

    updateRects();
    window.addEventListener('resize', debouncedResize);
    const scrollContainer = document.querySelector('.react-pdf__Document');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', debouncedScroll);
    }

    // Add a timeout to retry if elements aren't found immediately
    const retryTimeout = setTimeout(() => {
      updateRects();
    }, 1000);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', debouncedScroll);
      }
      clearTimeout(resizeTimeout);
      clearTimeout(scrollTimeout);
      clearTimeout(retryTimeout);
    };
  }, [appliedSignatures]);

  const handleMoveSignature = (appliedSignatureId: string, x: number, y: number) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    const signatureWidth = 220;
    const signatureHeight = 100;
    
    // Get the PDF content element (canvas or svg) - try multiple selectors for reliability
    const pdfCanvas = document.querySelector('.react-pdf__Page canvas') as HTMLElement;
    const pdfSvg = document.querySelector('.react-pdf__Page svg') as HTMLElement;
    const pdfPage = document.querySelector('.react-pdf__Page') as HTMLElement;
    const pdfContentElement = pdfCanvas || pdfSvg || pdfPage;
    
    if (pdfContentElement) {
      const pdfContentRect = pdfContentElement.getBoundingClientRect();
      
      // Calculate offset from container to PDF content
      const offsetX = pdfContentRect.left - containerRect.left;
      const offsetY = pdfContentRect.top - containerRect.top;
      
      // Convert container-relative position to PDF content-relative position
      const pdfRelativeX = x - offsetX;
      const pdfRelativeY = y - offsetY;
      
      const minX = 0;
      const maxX = pdfContentRect.width - signatureWidth;
      const minY = 0;
      const maxY = pdfContentRect.height - signatureHeight;
      
      const clampedPdfX = Math.max(minX, Math.min(pdfRelativeX, maxX));
      const clampedPdfY = Math.max(minY, Math.min(pdfRelativeY, maxY));
      
      // Get viewer dimensions for proper coordinate conversion
      const viewerDimensions = {
        viewerWidth: pdfContentRect.width,
        viewerHeight: pdfContentRect.height
      };
      
      console.log('📍 Signature move coordinates:', {
        originalX: x,
        originalY: y,
        pdfRelativeX: clampedPdfX,
        pdfRelativeY: clampedPdfY,
        viewerDimensions,
        pdfContentRect: {
          width: pdfContentRect.width,
          height: pdfContentRect.height
        }
      });
      
      // Save PDF content-relative coordinates with viewer dimensions
      onMoveSignature(appliedSignatureId, clampedPdfX, clampedPdfY, viewerDimensions);
      return;
    }
    
    // Fallback to container bounds if PDF content not found
    const minX = 0;
    const maxX = containerRect.width - signatureWidth;
    const minY = 0;
    const maxY = containerRect.height - signatureHeight;
    
    const clampedX = Math.max(minX, Math.min(x, maxX));
    const clampedY = Math.max(minY, Math.min(y, maxY));
    
    const fallbackDimensions = {
      viewerWidth: containerRect.width,
      viewerHeight: containerRect.height
    };
    
    console.log('⚠️ Using fallback coordinates:', {
      clampedX,
      clampedY,
      fallbackDimensions
    });
    
    onMoveSignature(appliedSignatureId, clampedX, clampedY, fallbackDimensions);
  };

  // Don't render until PDF page dimensions are known
  if (!pdfPageRect) {
    return null;
  }

  // Use PDF page as viewer if viewer not found
  const viewerRect = pdfViewerRect || pdfPageRect;

  return (
    <div 
      className="absolute" 
      data-testid="enhanced-signature-grid-container" 
      ref={containerRef}
      style={{
        pointerEvents: 'auto',
        zIndex: 1000,
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Applied signatures as draggable boxes */}
      {appliedSignatures.map((appliedSig) => {
        const signature = signatures.find(s => s.id === appliedSig.signatureId);
        if (!signature) {
          return null;
        }

        const position = appliedSig.position as any;
        let coords;
        
        // Get the PDF content element to calculate proper offset - try multiple selectors
        const pdfCanvas = document.querySelector('.react-pdf__Page canvas') as HTMLElement;
        const pdfSvg = document.querySelector('.react-pdf__Page svg') as HTMLElement;
        const pdfPage = document.querySelector('.react-pdf__Page') as HTMLElement;
        const pdfContentElement = pdfCanvas || pdfSvg || pdfPage;
        
        if (pdfContentElement && containerRef.current) {
          const pdfContentRect = pdfContentElement.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // Calculate offset from container to PDF content
          const offsetX = pdfContentRect.left - containerRect.left;
          const offsetY = pdfContentRect.top - containerRect.top;
          
          // Use consistent coordinate system - scale coordinates to match current PDF dimensions
          const storedViewerWidth = (position as any).viewerWidth || pdfContentRect.width;
          const storedViewerHeight = (position as any).viewerHeight || pdfContentRect.height;
          const currentPdfWidth = pdfContentRect.width;
          const currentPdfHeight = pdfContentRect.height;
          
          // Calculate scale factors - avoid division by zero
          const scaleX = storedViewerWidth > 0 ? currentPdfWidth / storedViewerWidth : 1;
          const scaleY = storedViewerHeight > 0 ? currentPdfHeight / storedViewerHeight : 1;
          
          console.log('📐 Coordinate scaling:', {
            storedDimensions: { width: storedViewerWidth, height: storedViewerHeight },
            currentDimensions: { width: currentPdfWidth, height: currentPdfHeight },
            scaleFactors: { scaleX, scaleY }
          });
          
          if (position.gridPosition === "custom" && position.x !== undefined && position.y !== undefined) {
            // Scale coordinates from stored dimensions to current PDF dimensions
            const scaledX = position.x * scaleX;
            const scaledY = position.y * scaleY;
            coords = { x: scaledX + offsetX, y: scaledY + offsetY };
          } else if (position.gridPosition && position.gridPosition !== "custom") {
            // Calculate grid position relative to PDF content, then add offset
            const pdfWidth = pdfContentRect.width;
            const pdfHeight = pdfContentRect.height;
            const signatureWidth = 220;
            const signatureHeight = 100;
            const margin = 20;
            
            const gridMap: Record<string, { x: number; y: number }> = {
              "top-left": { x: margin, y: margin },
              "top-center": { x: (pdfWidth - signatureWidth) / 2, y: margin },
              "top-right": { x: pdfWidth - margin - signatureWidth, y: margin },
              "middle-left": { x: margin, y: (pdfHeight - signatureHeight) / 2 },
              "middle-center": { x: (pdfWidth - signatureWidth) / 2, y: (pdfHeight - signatureHeight) / 2 },
              "middle-right": { x: pdfWidth - margin - signatureWidth, y: (pdfHeight - signatureHeight) / 2 },
              "bottom-left": { x: margin, y: pdfHeight - margin - signatureHeight },
              "bottom-center": { x: (pdfWidth - signatureWidth) / 2, y: pdfHeight - margin - signatureHeight },
              "bottom-right": { x: pdfWidth - margin - signatureWidth, y: pdfHeight - margin - signatureHeight },
            };
            
            const gridCoords = gridMap[position.gridPosition] || gridMap["middle-center"];
            coords = { x: gridCoords.x + offsetX, y: gridCoords.y + offsetY };
          } else if (position.x !== undefined && position.y !== undefined) {
            // Scale coordinates from stored dimensions to current PDF dimensions
            const scaledX = position.x * scaleX;
            const scaledY = position.y * scaleY;
            coords = { x: scaledX + offsetX, y: scaledY + offsetY };
          } else {
            // Default to center of PDF content, then add offset
            const pdfWidth = pdfContentRect.width;
            const pdfHeight = pdfContentRect.height;
            const signatureWidth = 220;
            const signatureHeight = 100;
            const centerX = (pdfWidth - signatureWidth) / 2;
            const centerY = (pdfHeight - signatureHeight) / 2;
            coords = { x: centerX + offsetX, y: centerY + offsetY };
          }
        } else {
          // Fallback to direct coordinates if PDF content not found
          if (position.gridPosition === "custom" && position.x !== undefined && position.y !== undefined) {
            coords = { x: position.x, y: position.y };
          } else if (position.gridPosition && position.gridPosition !== "custom") {
            const containerWidth = pdfPageRect.width;
            const containerHeight = pdfPageRect.height;
            const signatureWidth = 220;
            const signatureHeight = 100;
            const margin = 20;
            
            const gridMap: Record<string, { x: number; y: number }> = {
              "top-left": { x: margin, y: margin },
              "top-center": { x: (containerWidth - signatureWidth) / 2, y: margin },
              "top-right": { x: containerWidth - margin - signatureWidth, y: margin },
              "middle-left": { x: margin, y: (containerHeight - signatureHeight) / 2 },
              "middle-center": { x: (containerWidth - signatureWidth) / 2, y: (containerHeight - signatureHeight) / 2 },
              "middle-right": { x: containerWidth - margin - signatureWidth, y: (containerHeight - signatureHeight) / 2 },
              "bottom-left": { x: margin, y: containerHeight - margin - signatureHeight },
              "bottom-center": { x: (containerWidth - signatureWidth) / 2, y: containerHeight - margin - signatureHeight },
              "bottom-right": { x: containerWidth - margin - signatureWidth, y: containerHeight - margin - signatureHeight },
            };
            
            coords = gridMap[position.gridPosition] || gridMap["middle-center"];
          } else if (position.x !== undefined && position.y !== undefined) {
            coords = { x: position.x, y: position.y };
          } else {
            const containerWidth = pdfPageRect.width;
            const containerHeight = pdfPageRect.height;
            const signatureWidth = 220;
            const signatureHeight = 100;
            coords = { 
              x: (containerWidth - signatureWidth) / 2, 
              y: (containerHeight - signatureHeight) / 2 
            };
          }
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
              onRemoveFromAllPages={() => onRemoveSignatureFromAllPages(appliedSig.id)}
              onRemoveWithPassword={(appliedSignatureId, removeFromAllPages) => onRemoveWithPassword(appliedSignatureId, removeFromAllPages)}
              onViewDetails={() => {
                console.log("View signature details:", signature);
              }}
              onSaveToPages={(pageOption, position) => onSaveSignatureToPages(appliedSig.id, pageOption, position)}
              applyToAllPages={applyToAllPages}
              pdfPageRect={pdfPageRect}
              containerRef={containerRef}
            />
          </div>
        );
      })}
    </div>
  );
}
