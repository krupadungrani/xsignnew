import { storage } from "../storage";
import { CertificateService } from "./certificate";
import { type InsertSignature, type DigitalSignature } from "@shared/schema";
import crypto from "crypto";

export class SignatureService {
  private certificateService = new CertificateService();

  async createDigitalSignature(
    userId: string,
    signatureData: InsertSignature,
    userEmail: string
  ): Promise<DigitalSignature> {
    // Generate certificate and keys
    const { certificate, privateKey } = this.certificateService.generateKeyPairAndCertificate({
      fullName: signatureData.fullName,
      companyName: signatureData.companyName,
      location: signatureData.location,
      email: userEmail,
    });

    // Encrypt private key with a generated password
    const keyPassword = crypto.randomBytes(32).toString('hex');
    const encryptedPrivateKey = this.certificateService.encryptPrivateKey(privateKey, keyPassword);

    // Extract signature image if provided
    const { signatureImage, ...restSignatureData } = signatureData;
    
    // Store signature with certificate
    const signature = await storage.createSignature({
      ...restSignatureData,
      userId,
      certificate,
      privateKey: encryptedPrivateKey + ":" + keyPassword, // Store encrypted key with password
      signatureImage: signatureImage || null,
    });

    return signature;
  }

  async getUserSignatures(userId: string): Promise<DigitalSignature[]> {
    return storage.getUserSignatures(userId);
  }

  async validateSignature(signatureId: string): Promise<boolean> {
    const signature = await storage.getSignature(signatureId);
    if (!signature) {
      return false;
    }

    return this.certificateService.validateCertificate(signature.certificate);
  }

  async getSignatureCertificateInfo(signatureId: string) {
    const signature = await storage.getSignature(signatureId);
    if (!signature) {
      throw new Error("Signature not found");
    }

    return this.certificateService.getCertificateInfo(signature.certificate);
  }

  async deleteSignature(signatureId: string, userId: string): Promise<void> {
    const signature = await storage.getSignature(signatureId);
    if (!signature || signature.userId !== userId) {
      throw new Error("Signature not found or unauthorized");
    }

    await storage.deleteSignature(signatureId);
  }
}

export const signatureService = new SignatureService();
