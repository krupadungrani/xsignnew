// Test script to verify drag functionality
console.log('🧪 Testing Drag Functionality...');

// Test 1: Check if SimpleDragLayer is properly exported
try {
  const fs = require('fs');
  const simpleDragLayerContent = fs.readFileSync('./client/src/components/pdf/simple-drag-layer.tsx', 'utf8');
  
  if (simpleDragLayerContent.includes('export function SimpleDragLayer')) {
    console.log('✅ SimpleDragLayer is properly exported');
  } else {
    console.log('❌ SimpleDragLayer export not found');
  }
  
  if (simpleDragLayerContent.includes('pointerEvents: \'auto\'')) {
    console.log('✅ Pointer events are enabled');
  } else {
    console.log('❌ Pointer events not enabled');
  }
  
  if (simpleDragLayerContent.includes('currentPageSignatures.length > 0')) {
    console.log('✅ Drag layer shows when signatures exist');
  } else {
    console.log('❌ Drag layer condition not found');
  }
  
} catch (error) {
  console.log('❌ Error reading SimpleDragLayer file:', error.message);
}

// Test 2: Check PdfViewer integration
try {
  const pdfViewerContent = fs.readFileSync('./client/src/components/pdf/pdf-viewer.tsx', 'utf8');
  
  if (pdfViewerContent.includes('currentPageSignatures.length > 0')) {
    console.log('✅ PdfViewer shows drag layer when signatures exist');
  } else {
    console.log('❌ PdfViewer drag layer condition not found');
  }
  
  if (pdfViewerContent.includes('SimpleDragLayer')) {
    console.log('✅ SimpleDragLayer is imported in PdfViewer');
  } else {
    console.log('❌ SimpleDragLayer import not found in PdfViewer');
  }
  
} catch (error) {
  console.log('❌ Error reading PdfViewer file:', error.message);
}

console.log('🧪 Drag functionality test completed!');
