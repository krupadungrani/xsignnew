import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import forge from 'node-forge';

export interface CertificateData {
  signatureName: string;
  fullName: string;
  companyName: string;
  location: string;
  timeZone: string;
  createdAt: string;
  certificateId: string;
  signatureImage?: string;
}

export class CertificateService {
  async generateAdobeStyleCertificate(certificateData: CertificateData): Promise<Uint8Array> {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    
    // Get fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = page.getSize();
    
    // Set up colors to match website theme exactly
    // Website gradient: linear-gradient(135deg, #3b82f6, #6366f1)
    const primaryColor = rgb(0.23, 0.51, 0.96); // #3b82f6 (lighter blue)
    const secondaryColor = rgb(0.39, 0.40, 0.95); // #6366f1 (darker blue)
    const lightGray = rgb(0.95, 0.95, 0.95); // Light background
    const accentColor = rgb(0.9, 0.95, 0.98); // Light blue accent
    const whiteColor = rgb(1, 1, 1); // Pure white
    
    // Header background with gradient effect (simulated with multiple rectangles)
    // Create gradient effect by drawing multiple rectangles with different colors
    const gradientSteps = 20;
    const stepHeight = 140 / gradientSteps;
    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / (gradientSteps - 1);
      const r = 0.23 + (0.39 - 0.23) * ratio;
      const g = 0.51 + (0.40 - 0.51) * ratio;
      const b = 0.96 + (0.95 - 0.96) * ratio;
      
      page.drawRectangle({
        x: 0,
        y: height - 140 + (i * stepHeight),
        width: width,
        height: stepHeight,
        color: rgb(r, g, b),
      });
    }
    
    // Main title (centered without logo)
    page.drawText('DIGITAL SIGNATURE CERTIFICATE', {
      x: 50,
      y: height - 35,
      size: 20,
      font: helveticaBold,
      color: whiteColor,
    });
    
    // Platform name
    page.drawText('XSignature Digital Signature Platform', {
      x: 50,
      y: height - 55,
      size: 11,
      font: helvetica,
      color: rgb(0.95, 0.95, 0.95),
    });
    
    // Certificate ID
    page.drawText(`Certificate ID: ${certificateData.certificateId}`, {
      x: 50,
      y: height - 80,
      size: 10,
      font: helvetica,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    // Decorative line
    page.drawLine({
      start: { x: 50, y: height - 100 },
      end: { x: width - 50, y: height - 100 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    
    // Main content area
    const contentY = height - 200;
    const contentWidth = width - 100;
    
    // Signature details section with accent background
    page.drawRectangle({
      x: 40,
      y: contentY - 10,
      width: contentWidth + 20,
      height: 30,
      color: accentColor,
    });
    
    page.drawText('SIGNATURE DETAILS', {
      x: 50,
      y: contentY,
      size: 16,
      font: helveticaBold,
      color: primaryColor,
    });
    
    // Draw signature details table
    const details = [
      { label: 'Signature Name:', value: certificateData.signatureName },
      { label: 'Full Name:', value: certificateData.fullName },
      { label: 'Company:', value: certificateData.companyName },
      { label: 'Location:', value: certificateData.location },
      { label: 'Time Zone:', value: certificateData.timeZone },
      { label: 'Created:', value: new Date(certificateData.createdAt).toLocaleString() },
    ];
    
    let currentY = contentY - 40;
    details.forEach((detail, index) => {
      // Alternate row background with website theme colors
      if (index % 2 === 0) {
        page.drawRectangle({
          x: 50,
          y: currentY - 5,
          width: contentWidth,
          height: 25,
          color: accentColor,
        });
      }
      
      // Label
      page.drawText(detail.label, {
        x: 60,
        y: currentY,
        size: 11,
        font: helveticaBold,
        color: secondaryColor,
      });
      
      // Value
      page.drawText(detail.value, {
        x: 200,
        y: currentY,
        size: 11,
        font: helvetica,
        color: secondaryColor,
      });
      
      currentY -= 30;
    });
    
    // Signature image section (if available)
    if (certificateData.signatureImage) {
      currentY -= 20;
      
      // Section background
      page.drawRectangle({
        x: 40,
        y: currentY - 10,
        width: contentWidth + 20,
        height: 30,
        color: accentColor,
      });
      
      page.drawText('SIGNATURE IMAGE', {
        x: 50,
        y: currentY,
        size: 16,
        font: helveticaBold,
        color: primaryColor,
      });
      
      try {
        // Convert base64 to image and embed
        const imageBytes = Buffer.from(certificateData.signatureImage.split(',')[1], 'base64');
        const image = await pdfDoc.embedPng(imageBytes);
        
        // Scale image to fit
        const maxWidth = 200;
        const maxHeight = 100;
        const { width: imgWidth, height: imgHeight } = image.scale(1);
        
        const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        page.drawImage(image, {
          x: 60,
          y: currentY - 20 - scaledHeight,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        currentY -= scaledHeight + 40;
    } catch (error) {
        console.error('Error embedding signature image:', error);
        page.drawText('Signature image could not be embedded', {
          x: 60,
          y: currentY - 20,
          size: 10,
          font: helvetica,
          color: rgb(0.8, 0.2, 0.2),
        });
        currentY -= 40;
      }
    }
    
    // Verification section
    currentY -= 20;
    
    // Section background
    page.drawRectangle({
      x: 40,
      y: currentY - 10,
      width: contentWidth + 20,
      height: 30,
      color: accentColor,
    });
    
    page.drawText('VERIFICATION INFORMATION', {
      x: 50,
      y: currentY,
      size: 16,
      font: helveticaBold,
      color: primaryColor,
    });
    
    const verificationInfo = [
      'This certificate verifies the authenticity of the digital signature.',
      'The signature was created using XSignature\'s secure digital signature platform.',
      'All signature data has been cryptographically secured and timestamped.',
      'This certificate can be used to verify the signature\'s authenticity.',
    ];
    
    currentY -= 30;
    verificationInfo.forEach((info) => {
      page.drawText('• ' + info, {
        x: 60,
        y: currentY,
        size: 10,
        font: helvetica,
        color: secondaryColor,
      });
      currentY -= 20;
    });
    
    // Footer with website theme gradient
    const footerY = 50;
    
    // Footer gradient background
    const footerGradientSteps = 10;
    const footerStepHeight = 50 / footerGradientSteps;
    for (let i = 0; i < footerGradientSteps; i++) {
      const ratio = i / (footerGradientSteps - 1);
      const r = 0.23 + (0.39 - 0.23) * ratio;
      const g = 0.51 + (0.40 - 0.51) * ratio;
      const b = 0.96 + (0.95 - 0.96) * ratio;
      
      page.drawRectangle({
        x: 0,
        y: i * footerStepHeight,
        width: width,
        height: footerStepHeight,
        color: rgb(r, g, b),
      });
    }
    
    page.drawText('XSignature Digital Signature Platform', {
      x: 50,
      y: footerY - 20,
      size: 10,
      font: helveticaBold,
      color: whiteColor,
    });
    
    page.drawText('This certificate was generated on ' + new Date().toLocaleString(), {
      x: 50,
      y: footerY - 35,
      size: 8,
      font: helvetica,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    // Security notice
    page.drawText('For verification, contact: support@xsignature.com', {
      x: width - 250,
      y: footerY - 20,
      size: 8,
      font: helvetica,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    return pdfDoc.save();
  }
  
  generateCertificateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `XS-${timestamp}-${random}`.toUpperCase();
  }

  generateKeyPairAndCertificate(data: {
    fullName: string;
    companyName: string;
    location: string;
    email: string;
  }): { certificate: string; privateKey: string } {
    // Generate RSA key pair
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    
    // Create certificate
    const cert = forge.pki.createCertificate();
    cert.publicKey = keyPair.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    // Set subject and issuer
    const attrs = [{
      name: 'commonName',
      value: data.fullName
    }, {
      name: 'organizationName',
      value: data.companyName
    }, {
      name: 'localityName',
      value: data.location
    }, {
      name: 'emailAddress',
      value: data.email
    }];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    // Set extensions
    cert.setExtensions([{
        name: 'basicConstraints',
      cA: true
    }, {
        name: 'keyUsage',
      keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
        name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
        emailProtection: true,
        timeStamping: true
    }, {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true
    }, {
        name: 'subjectAltName',
        altNames: [{
        type: 6, // URI
        value: `mailto:${data.email}`
        }]
    }]);
    
    // Sign certificate
    cert.sign(keyPair.privateKey);
    
    // Convert to PEM format
    const certificate = forge.pki.certificateToPem(cert);
    const privateKey = forge.pki.privateKeyToPem(keyPair.privateKey);
    
    return { certificate, privateKey };
  }

  encryptPrivateKey(privateKey: string, password: string): string {
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encryptedBuffer = Buffer.concat([
      cipher.update(privateKey, 'utf8'),
      cipher.final(),
    ]);

    return JSON.stringify({
      encrypted: encryptedBuffer.toString('hex'),
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      algorithm: 'aes-256-cbc',
      kdf: 'pbkdf2-sha256',
      iterations: 10000,
      keyLength: 32,
    });
  }

  validateCertificate(certificatePem: string): boolean {
    try {
      const cert = forge.pki.certificateFromPem(certificatePem);
      const now = new Date();
      
      // Check if certificate is valid
      if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
        return false;
      }
      
      // Basic validation - certificate exists and is properly formatted
      return cert.serialNumber && cert.publicKey;
    } catch (error) {
      console.error('Certificate validation error:', error);
      return false;
    }
  }

  getCertificateInfo(certificatePem: string): any {
    try {
      const cert = forge.pki.certificateFromPem(certificatePem);

      return {
        subject: cert.subject.getField('CN')?.value || 'Unknown',
        issuer: cert.issuer.getField('CN')?.value || 'Unknown',
        serialNumber: cert.serialNumber,
        validFrom: cert.validity.notBefore,
        validTo: cert.validity.notAfter,
        isValid: this.validateCertificate(certificatePem)
      };
    } catch (error) {
      console.error('Certificate info extraction error:', error);
      return {
        subject: 'Unknown',
        issuer: 'Unknown',
        serialNumber: 'Unknown',
        validFrom: null,
        validTo: null,
        isValid: false
      };
    }
  }
}