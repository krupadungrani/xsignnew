import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MousePointer, 
  Square, 
  Move, 
  Trash2, 
  Check,
  X,
  RotateCw
} from "lucide-react";

interface AreaSelectionProps {
  onAreaSelected: (area: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
  isActive: boolean;
}

export function AreaSelection({ onAreaSelected, onCancel, isActive }: AreaSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isActive) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
    setIsSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isActive || !isSelecting || !startPoint) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPoint({ x, y });
  };

  const handleMouseUp = () => {
    if (!isActive || !isSelecting || !startPoint || !currentPoint) return;
    
    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    
    // Only create area if it's large enough
    if (width > 10 && height > 10) {
      const newArea = {
        id: `area-${Date.now()}`,
        x,
        y,
        width,
        height
      };
      
      setSelectedAreas(prev => [...prev, newArea]);
      onAreaSelected({ x, y, width, height });
    }
    
    setIsSelecting(false);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  const removeArea = (id: string) => {
    setSelectedAreas(prev => prev.filter(area => area.id !== id));
  };

  const clearAllAreas = () => {
    setSelectedAreas([]);
  };

  const getSelectionBox = () => {
    if (!startPoint || !currentPoint) return null;
    
    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    
    return { x, y, width, height };
  };

  const selectionBox = getSelectionBox();

  return (
    <div className="relative">
      {/* Area Selection Overlay */}
      <div
        ref={containerRef}
        className={`relative w-full h-full ${isActive ? 'cursor-crosshair' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Selection Box */}
        {selectionBox && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-100/20 pointer-events-none"
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height,
            }}
          />
        )}

        {/* Selected Areas */}
        {selectedAreas.map((area) => (
          <div
            key={area.id}
            className="absolute border-2 border-green-500 bg-green-100/20 pointer-events-none"
            style={{
              left: area.x,
              top: area.y,
              width: area.width,
              height: area.height,
            }}
          >
            <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded">
              Selected Area
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      {isActive && (
        <div className="absolute top-4 left-4 z-10">
          <Card className="w-80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <MousePointer className="h-4 w-4 mr-2 text-blue-600" />
                Area Selection Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-gray-600">
                Click and drag to select areas on the PDF where you want to place signatures.
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Square className="h-3 w-3 mr-1" />
                  {selectedAreas.length} Area{selectedAreas.length !== 1 ? 's' : ''} Selected
                </Badge>
              </div>

              <div className="space-y-2">
                {selectedAreas.map((area, index) => (
                  <div key={area.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-xs">
                      Area {index + 1}: {Math.round(area.width)}×{Math.round(area.height)}px
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArea(area.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllAreas}
                  className="flex-1"
                >
                  <RotateCw className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="flex-1"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
