import { useState } from "react";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { type DigitalSignature, type AppliedSignature } from "@shared/schema";
import { CertificateViewer } from "@/components/signature/certificate-viewer";

interface SignatureBoxProps {
  signature: DigitalSignature;
  appliedSignature?: AppliedSignature;
  position: { x: number; y: number };
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
}

function SignatureBox({ signature, appliedSignature, position, onMove, onRemove }: SignatureBoxProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "signature",
    item: { id: signature.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [showCertificate, setShowCertificate] = useState(false);

  return (
    <>
      <div
        ref={drag}
        className={`absolute bg-white rounded border border-gray-300 p-2 shadow-sm cursor-move ${
          isDragging ? 'opacity-50' : ''
        }`}
        style={{
          left: position.x,
          top: position.y,
          width: 220,
          height: 100,
        }}
        data-testid={`signature-box-${signature.id}`}
        onClick={() => setShowCertificate(true)}
      >
        <div className="text-xs space-y-1">
          <div className="font-medium text-gray-900" data-testid={`signature-fullname-${signature.id}`}>
            {signature.fullName}
          </div>
          <div className="text-gray-600" data-testid={`signature-company-${signature.id}`}>
            {signature.companyName}
          </div>
          <div className="text-gray-500" data-testid={`signature-timestamp-${signature.id}`}>
            {appliedSignature ? new Date(appliedSignature.appliedAt || Date.now()).toLocaleString() : 'Not applied'}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-green-600 flex items-center">
              <span className="mr-1">✓</span>
              <span>Verified</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-red-500 hover:text-red-700 text-xs"
              data-testid={`button-remove-signature-${signature.id}`}
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      <CertificateViewer
        signatureId={signature.id}
        open={showCertificate}
        onOpenChange={setShowCertificate}
      />
    </>
  );
}

interface GridCellProps {
  position: string;
  children?: React.ReactNode;
  onDrop: (position: string) => void;
  onClick: () => void;
}

function GridCell({ position, children, onDrop, onClick }: GridCellProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "signature",
    drop: () => onDrop(position),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`border border-gray-200 rounded flex items-center justify-center hover:bg-blue-50 cursor-pointer transition-colors ${
        isOver ? 'bg-blue-100 border-blue-300' : ''
      } ${children ? 'bg-blue-100 border-blue-300' : ''}`}
      onClick={onClick}
      data-testid={`grid-cell-${position}`}
    >
      {children || (
        <span className="text-xs text-gray-400">
          {position.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </span>
      )}
    </div>
  );
}

interface SignatureGridProps {
  signatures: DigitalSignature[];
  appliedSignatures: AppliedSignature[];
  onApplySignature: (signatureId: string, position: string) => void;
  onRemoveSignature: (appliedSignatureId: string) => void;
  onMoveSignature: (appliedSignatureId: string, x: number, y: number) => void;
}

export function SignatureGrid({ 
  signatures, 
  appliedSignatures, 
  onApplySignature, 
  onRemoveSignature,
  onMoveSignature 
}: SignatureGridProps) {
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>("");

  const gridPositions = [
    "top-left", "top-center", "top-right",
    "middle-left", "middle-center", "middle-right",
    "bottom-left", "bottom-center", "bottom-right"
  ];

  const getGridPositionCoordinates = (position: string, containerWidth: number, containerHeight: number) => {
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

    return gridMap[position] || gridMap["middle-center"];
  };

  const handleCellClick = (position: string) => {
    if (selectedSignatureId) {
      onApplySignature(selectedSignatureId, position);
    }
  };

  const handleDrop = (position: string) => {
    if (selectedSignatureId) {
      onApplySignature(selectedSignatureId, position);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="relative w-full h-full" data-testid="signature-grid-container">
        {/* Signature selection */}
        <div className="absolute top-4 left-4 z-10">
          <select
            value={selectedSignatureId}
            onChange={(e) => setSelectedSignatureId(e.target.value)}
            className="text-xs bg-white border border-gray-300 rounded px-2 py-1"
            data-testid="select-signature"
          >
            <option value="">Select signature to apply</option>
            {signatures.map((sig) => (
              <option key={sig.id} value={sig.id}>
                {sig.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3x3 Grid */}
        <div className="absolute bottom-8 left-4 right-4">
          <div className="grid grid-cols-3 gap-4 h-36 border-2 border-dashed border-gray-300 rounded-lg relative" data-testid="signature-grid">
            {gridPositions.map((position) => {
              const appliedSig = appliedSignatures.find(
                (as) => (as.position as any)?.gridPosition === position
              );
              
              return (
                <GridCell
                  key={position}
                  position={position}
                  onDrop={handleDrop}
                  onClick={() => handleCellClick(position)}
                >
                  {appliedSig && (
                    <div className="w-full h-full relative">
                      {/* Placeholder for applied signature - actual signature would be rendered differently */}
                      <div className="text-xs text-center">
                        <div className="font-medium">Signature Applied</div>
                        <div className="text-gray-500">Click to edit</div>
                      </div>
                    </div>
                  )}
                </GridCell>
              );
            })}
          </div>
        </div>

        {/* Applied signatures as draggable boxes */}
        {appliedSignatures.map((appliedSig) => {
          const signature = signatures.find(s => s.id === appliedSig.signatureId);
          if (!signature) return null;

          const position = appliedSig.position as any;
          const coords = getGridPositionCoordinates(
            position.gridPosition, 
            800, // PDF container width
            600  // PDF container height
          );

          return (
            <SignatureBox
              key={appliedSig.id}
              signature={signature}
              appliedSignature={appliedSig}
              position={coords}
              onMove={(x, y) => onMoveSignature(appliedSig.id, x, y)}
              onRemove={() => onRemoveSignature(appliedSig.id)}
            />
          );
        })}
      </div>
    </DndProvider>
  );
}
