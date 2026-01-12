import { PDFDocument, PDFPage, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

export interface SignatureData {
  fullName: string;
  companyName: string;
  location: string;
  timestamp: Date;
  timeZone: string;
}

export interface SignaturePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  gridPosition: string;
}

export class PdfService {
  async loadPdf(filePath: string): Promise<PDFDocument> {
    try {
      console.log(`PDF Service: Reading file from ${filePath}`);
      const pdfBytes = await fs.readFile(filePath);
      console.log(`PDF Service: File read successfully, size: ${pdfBytes.length} bytes`);
      
      console.log(`PDF Service: Loading PDF document...`);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      console.log(`PDF Service: PDF document loaded successfully`);
      
      return pdfDoc;
    } catch (error: any) {
      console.error(`PDF Service: Error loading PDF from ${filePath}:`, error);
      console.error(`PDF Service: Error stack:`, error.stack);
      
      if (error.code === 'ENOENT') {
        throw new Error(`PDF file not found: ${filePath}`);
      } else if (error.message && error.message.includes('Invalid PDF')) {
        throw new Error(`Invalid PDF file: ${filePath}`);
      } else {
        throw new Error(`Failed to load PDF: ${error.message}`);
      }
    }
  }

  async getPageCount(filePath: string): Promise<number> {
    try {
      console.log(`PDF Service: Loading PDF from ${filePath}`);
      const pdfDoc = await this.loadPdf(filePath);
      const pageCount = pdfDoc.getPageCount();
      console.log(`PDF Service: Page count is ${pageCount}`);
      return pageCount;
    } catch (error: any) {
      console.error(`PDF Service: Error getting page count for ${filePath}:`, error);
      console.error(`PDF Service: Error stack:`, error.stack);
      throw new Error(`Failed to get page count: ${error.message}`);
    }
  }

  async getPageSizes(filePath: string): Promise<Array<{ width: number; height: number }>> {
    try {
      console.log(`PDF Service: Getting page sizes for ${filePath}`);
      const pdfDoc = await this.loadPdf(filePath);
      const pages = pdfDoc.getPages();
      const pageSizes = pages.map(page => {
        const { width, height } = page.getSize();
        return { width, height };
      });
      console.log(`PDF Service: Page sizes:`, pageSizes);
      return pageSizes;
    } catch (error: any) {
      console.error(`PDF Service: Error getting page sizes for ${filePath}:`, error);
      console.error(`PDF Service: Error stack:`, error.stack);
      throw new Error(`Failed to get page sizes: ${error.message}`);
    }
  }

  async processDocument(filePath: string): Promise<{ pageCount: number; pageSizes: Array<{ width: number; height: number }> }> {
    try {
      console.log(`PDF Service: Processing document ${filePath}`);
      
      // Optimize by loading PDF once and getting both page count and sizes
      const pdfDoc = await this.loadPdf(filePath);
      const pages = pdfDoc.getPages();
      const pageCount = pages.length;
      const pageSizes = pages.map(page => {
        const { width, height } = page.getSize();
        return { width, height };
      });
      
      console.log(`PDF Service: Document processed successfully - Pages: ${pageCount}, Sizes:`, pageSizes);
      
      return { pageCount, pageSizes };
    } catch (error: any) {
      console.error(`PDF Service: Error processing document ${filePath}:`, error);
      throw error;
    }
  }

  async applySignatureToPdf(
    filePath: string,
    signatures: Array<{
      pageNumber: number;
      position: SignaturePosition;
      signatureData: SignatureData & { signatureImage?: string };
    }>
  ): Promise<Uint8Array> {
    const pdfDoc = await this.loadPdf(filePath);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const sig of signatures) {
      const page = pdfDoc.getPage(sig.pageNumber - 1);
      await this.drawSignature(page, sig.position, sig.signatureData, font, boldFont);
    }

    return pdfDoc.save();
  }

  private async drawSignature(
    page: PDFPage,
    position: SignaturePosition,
    signatureData: SignatureData & { signatureImage?: string },
    font: any,
    boldFont: any
  ) {
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    // Handle custom positions with x, y coordinates
    let actualPosition;
    if (position.gridPosition === "custom" && position.x !== undefined && position.y !== undefined) {
      // Convert frontend coordinates to PDF coordinates
      // Frontend coordinates are in pixels relative to PDF viewer container
      // PDF coordinates are in points relative to PDF page
      
      const frontendX = position.x;
      const frontendY = position.y;
      
      // Get the actual viewer dimensions from the frontend
      const viewerWidth = (position as any).viewerWidth || 800;
      const viewerHeight = (position as any).viewerHeight || 600;
      
      // Convert to relative position (0-1)
      const relativeX = frontendX / viewerWidth;
      const relativeY = frontendY / viewerHeight;
      
      // Convert to PDF coordinates
      actualPosition = { 
        x: relativeX * pageWidth, 
        y: pageHeight - (relativeY * pageHeight) - 100 // Convert from top-left to bottom-left, subtract signature height
      };
      
 
    } else {
      // Convert grid position to actual coordinates
      actualPosition = this.gridPositionToCoordinates(
        position.gridPosition,
        pageWidth,
        pageHeight
      );
      console.log('📍 Using grid position for PDF:', actualPosition);
    }

    const signatureWidth = 220;
    const signatureHeight = 100;
    const padding = 8;

    // If we have a signature image, draw it instead of the text-based signature
    if (signatureData.signatureImage) {
      // No background or border - completely transparent
      // The signature image will be drawn directly on the PDF

      // Draw the signature image
      try {
        // Extract base64 data from data URL
        const base64Data = signatureData.signatureImage.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Embed the image in the PDF
        const signatureImage = await page.doc.embedPng(imageBuffer);
        
        // Draw the signature image
        page.drawImage(signatureImage, {
          x: actualPosition.x + padding,
          y: actualPosition.y + padding,
          width: signatureWidth - (2 * padding),
          height: signatureHeight - (2 * padding),
        });
      } catch (error) {
        console.error('Error embedding signature image:', error);
        // Fallback to text-based signature if image embedding fails
        await this.drawSignatureText(page, actualPosition, signatureData, font, boldFont, signatureWidth, signatureHeight, padding);
      }
    } else {
      // Draw text-based signature
      await this.drawSignatureText(page, actualPosition, signatureData, font, boldFont, signatureWidth, signatureHeight, padding);
    }
  }

  private async drawSignatureText(
    page: PDFPage,
    actualPosition: { x: number; y: number },
    signatureData: SignatureData,
    font: any,
    boldFont: any,
    signatureWidth: number,
    signatureHeight: number,
    padding: number
  ) {
    // No background or border - completely transparent
    // Text will be drawn directly on the PDF

    // Draw signature content
    let yOffset = actualPosition.y + signatureHeight - padding - 12;

    // Name
    page.drawText(signatureData.fullName, {
      x: actualPosition.x + padding,
      y: yOffset,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yOffset -= 15;

    // Company
    page.drawText(signatureData.companyName, {
      x: actualPosition.x + padding,
      y: yOffset,
      size: 10,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
    yOffset -= 13;

    // Location and timestamp
    const timestampStr = signatureData.timestamp.toLocaleString("en-US", {
      timeZone: signatureData.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    page.drawText(`${signatureData.location}`, {
      x: actualPosition.x + padding,
      y: yOffset,
      size: 9,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    yOffset -= 12;

    page.drawText(`${timestampStr} ${signatureData.timeZone}`, {
      x: actualPosition.x + padding,
      y: yOffset,
      size: 9,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Draw verification indicator
    page.drawText("✓ Digitally Verified", {
      x: actualPosition.x + padding,
      y: actualPosition.y + padding,
      size: 8,
      font: font,
      color: rgb(0, 0.6, 0),
    });
  }

  private gridPositionToCoordinates(
    gridPosition: string,
    pageWidth: number,
    pageHeight: number
  ): { x: number; y: number } {
    const signatureWidth = 220;
    const signatureHeight = 100;
    const margin = 50;

    const gridMap: Record<string, { x: number; y: number }> = {
      "top-left": { x: margin, y: pageHeight - margin - signatureHeight },
      "top-center": { x: (pageWidth - signatureWidth) / 2, y: pageHeight - margin - signatureHeight },
      "top-right": { x: pageWidth - margin - signatureWidth, y: pageHeight - margin - signatureHeight },
      "middle-left": { x: margin, y: (pageHeight - signatureHeight) / 2 },
      "middle-center": { x: (pageWidth - signatureWidth) / 2, y: (pageHeight - signatureHeight) / 2 },
      "middle-right": { x: pageWidth - margin - signatureWidth, y: (pageHeight - signatureHeight) / 2 },
      "bottom-left": { x: margin, y: margin },
      "bottom-center": { x: (pageWidth - signatureWidth) / 2, y: margin },
      "bottom-right": { x: pageWidth - margin - signatureWidth, y: margin },
    };

    return gridMap[gridPosition] || gridMap["middle-center"];
  }
}

export const pdfService = new PdfService();
