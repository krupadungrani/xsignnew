import { 
  users, 
  digitalSignatures, 
  pdfDocuments, 
  appliedSignatures,
  type User, 
  type InsertUser,
  type DigitalSignature,
  type InsertSignature,
  type PdfDocument,
  type InsertDocument,
  type AppliedSignature,
  type InsertAppliedSignature
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser, verificationToken?: string): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>; // Added for testing purposes
  
  // Digital signature methods
  createSignature(signature: InsertSignature): Promise<DigitalSignature>;
  getUserSignatures(userId: string): Promise<DigitalSignature[]>;
  getSignature(id: string): Promise<DigitalSignature | undefined>;
  deleteSignature(id: string): Promise<void>;
  
  // PDF document methods
  createDocument(document: InsertDocument): Promise<PdfDocument>;
  getUserDocuments(userId: string): Promise<PdfDocument[]>;
  getDocument(id: string): Promise<PdfDocument | undefined>;
  deleteDocument(id: string): Promise<void>;
  updateDocumentStatus(id: string, status: string, pageCount?: number, pageSizes?: string): Promise<void>;
  // updateDocumentReadOnlyStatus(id: string, isReadOnly: boolean): Promise<void>; // temporarily removed
  
  // Applied signature methods
  applySignature(appliedSignature: InsertAppliedSignature): Promise<AppliedSignature>;
  getDocumentSignatures(documentId: string): Promise<AppliedSignature[]>;
  removeSignature(id: string): Promise<void>;
  removeSignaturesFromPage(documentId: string, pageNumber: number): Promise<void>;
  removeSignaturesFromDocument(documentId: string): Promise<void>;
  updateSignaturePosition(id: string, position: any): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser, verificationToken?: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        verificationToken: verificationToken || null,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createSignature(insertSignature: InsertSignature & { certificate: string; privateKey: string; signatureImage?: string | null }): Promise<DigitalSignature> {
    const [signature] = await db
      .insert(digitalSignatures)
      .values(insertSignature)
      .returning();
    return signature;
  }

  async getUserSignatures(userId: string): Promise<DigitalSignature[]> {
    return await db
      .select()
      .from(digitalSignatures)
      .where(eq(digitalSignatures.userId, userId));
  }

  async getSignature(id: string): Promise<DigitalSignature | undefined> {
    const [signature] = await db
      .select()
      .from(digitalSignatures)
      .where(eq(digitalSignatures.id, id));
    return signature || undefined;
  }

  async deleteSignature(id: string): Promise<void> {
    try {
      console.log(`Storage: Deleting signature ${id} and all associated applied signatures`);
      
      // First, delete all applied signatures that reference this signature
      const deletedAppliedSignatures = await db
        .delete(appliedSignatures)
        .where(eq(appliedSignatures.signatureId, id))
        .returning();
      
      console.log(`Storage: Deleted ${deletedAppliedSignatures.length} applied signatures for signature ${id}`);
      
      // Then delete the signature itself
      await db.delete(digitalSignatures).where(eq(digitalSignatures.id, id));
      
      console.log(`Storage: Successfully deleted signature ${id}`);
    } catch (error: any) {
      console.error(`Storage: Error deleting signature ${id}:`, error);
      throw error;
    }
  }

  async createDocument(insertDocument: InsertDocument): Promise<PdfDocument> {
    const [document] = await db
      .insert(pdfDocuments)
      .values(insertDocument)
      .returning();
    return document;
  }

  async getUserDocuments(userId: string): Promise<PdfDocument[]> {
    return await db
      .select()
      .from(pdfDocuments)
      .where(eq(pdfDocuments.userId, userId));
  }

  async getDocument(id: string): Promise<PdfDocument | undefined> {
    const [document] = await db
      .select()
      .from(pdfDocuments)
      .where(eq(pdfDocuments.id, id));
    return document || undefined;
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      console.log(`Storage: Deleting document ${id} and all associated signatures`);
      
      // First, delete all applied signatures for this document
      const deletedSignatures = await db
        .delete(appliedSignatures)
        .where(eq(appliedSignatures.documentId, id))
        .returning();
      
      console.log(`Storage: Deleted ${deletedSignatures.length} applied signatures for document ${id}`);
      
      // Then delete the document
      await db.delete(pdfDocuments).where(eq(pdfDocuments.id, id));
      
      console.log(`Storage: Successfully deleted document ${id}`);
    } catch (error: any) {
      console.error(`Storage: Error deleting document ${id}:`, error);
      throw error;
    }
  }

  async updateDocumentStatus(id: string, status: string, pageCount?: number, pageSizes?: string): Promise<void> {
    const updateData: any = { status };
    if (pageCount !== undefined) updateData.pageCount = pageCount;
    if (pageSizes !== undefined) updateData.pageSizes = pageSizes;
    
    await db
      .update(pdfDocuments)
      .set(updateData)
      .where(eq(pdfDocuments.id, id));
  }

  // async updateDocumentReadOnlyStatus(id: string, isReadOnly: boolean): Promise<void> {
  //   await db
  //     .update(pdfDocuments)
  //     .set({ isReadOnly })
  //     .where(eq(pdfDocuments.id, id));
  // }

  async applySignature(insertAppliedSignature: InsertAppliedSignature, isAllPagesOperation: boolean = false): Promise<AppliedSignature> {
    try {
      // Validate required fields
      if (!insertAppliedSignature.documentId) {
        throw new Error("documentId is required");
      }
      if (!insertAppliedSignature.signatureId) {
        throw new Error("signatureId is required");
      }
      if (!insertAppliedSignature.pageNumber || insertAppliedSignature.pageNumber < 1) {
        throw new Error("pageNumber is required and must be >= 1");
      }
      // Validate position object
      if (!insertAppliedSignature.position || 
          typeof insertAppliedSignature.position !== 'object' || 
          insertAppliedSignature.position === null) {
        throw new Error("position object is required");
      }
      
      const position = insertAppliedSignature.position as any;
      if (!position.gridPosition || 
          typeof position.gridPosition !== 'string' || 
          position.gridPosition.trim() === '') {
        throw new Error("position.gridPosition is required and must be a non-empty string");
      }

      // Optimized: Single query to check for existing signature on this page
      const existingOnPage = await db
        .select()
        .from(appliedSignatures)
        .where(
          and(
            eq(appliedSignatures.documentId, insertAppliedSignature.documentId),
            eq(appliedSignatures.pageNumber, insertAppliedSignature.pageNumber),
            eq(appliedSignatures.signatureId, insertAppliedSignature.signatureId)
          )
        )
        .limit(1);
      
      if (existingOnPage.length > 0 && !isAllPagesOperation) {
        // Update existing signature position instead of creating duplicate
        await this.updateSignaturePosition(existingOnPage[0].id, insertAppliedSignature.position);
        return existingOnPage[0];
      }

      // Insert new applied signature
      const [appliedSignature] = await db
        .insert(appliedSignatures)
        .values(insertAppliedSignature)
        .returning();
      
      return appliedSignature;
    } catch (error: any) {
      console.error("Storage: Error applying signature:", error);
      throw error;
    }
  }

  async getDocumentSignatures(documentId: string): Promise<AppliedSignature[]> {
    return await db
      .select()
      .from(appliedSignatures)
      .where(eq(appliedSignatures.documentId, documentId));
  }

  async removeSignature(id: string): Promise<void> {
    await db.delete(appliedSignatures).where(eq(appliedSignatures.id, id));
  }

  async removeSignaturesFromPage(documentId: string, pageNumber: number): Promise<void> {
    await db
      .delete(appliedSignatures)
      .where(
        and(
          eq(appliedSignatures.documentId, documentId),
          eq(appliedSignatures.pageNumber, pageNumber)
        )
      );
  }

  async removeSignaturesFromDocument(documentId: string): Promise<void> {
    await db
      .delete(appliedSignatures)
      .where(eq(appliedSignatures.documentId, documentId));
  }

  async updateSignaturePosition(id: string, position: any): Promise<void> {
    // Optimized: Direct update without logging overhead
    const result = await db
      .update(appliedSignatures)
      .set({ position })
      .where(eq(appliedSignatures.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Signature with ID ${id} not found for position update`);
    }
  }
}

export const storage = new DatabaseStorage();
