import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { signatureService } from "./services/signature";
import { pdfService } from "./services/pdf";
import { emailService } from "./services/email";
import { insertUserSchema, insertSignatureSchema, users, pdfDocuments, type PdfDocument } from "../shared/schema";
import { db } from "./db";
import multer from "multer";
import path from "path";
import { z } from "zod";
import crypto from "crypto";
import { promises as fs } from "fs";
import fsSync from "fs";

// Utility function for safe file deletion
async function safeDeleteFile(filePath: string, context: string = "file"): Promise<boolean> {
  try {
    // Check if file exists before trying to delete
    try {
      await fs.access(filePath);
    } catch (accessError: any) {
      if (accessError.code === 'ENOENT') {
        console.log(`${context} already deleted or not found: ${filePath}`);
        return true; // File doesn't exist, consider deletion successful
      }
      throw accessError; // Re-throw other access errors
    }

    // File exists, proceed with deletion
    await fs.unlink(filePath);
    console.log(`Successfully deleted ${context}: ${filePath}`);
    return true;
  } catch (error: any) {
    // File might already be deleted, ignore ENOENT errors
    if (error.code === 'ENOENT') {
      console.log(`${context} already deleted or not found: ${filePath}`);
      return true; // Consider this a success since the goal is achieved
    } else {
      console.error(`Failed to delete ${context} ${filePath}:`, error);
      return false;
    }
  }
}

import os from "os";

// Configure multer for file uploads with optimized settings
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (increased from 50MB)
    fieldSize: 10 * 1024 * 1024, // 10MB for field data
    files: 10, // Maximum number of files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  // Use memory storage for better performance with large files
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
      // Generate unique filename to avoid conflicts
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
    }
  })
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Enhanced health check endpoint for Vercel monitoring
  app.get("/api/health", async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("Health check requested");

      // Check database connection
      let dbHealthy = false;
      let dbLatency = 0;
      try {
        const dbStart = Date.now();
        const result = await db.select({ now: db.raw('NOW()') }).from(users).limit(1);
        dbLatency = Date.now() - dbStart;
        dbHealthy = true;
        console.log("Database health check passed");
      } catch (dbError: any) {
        console.error("Database health check failed:", dbError.message);
      }

      // Get system metrics
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const response = {
        status: dbHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        checks: {
          database: {
            status: dbHealthy ? "healthy" : "unhealthy",
            latency: dbLatency,
            error: dbHealthy ? null : "Database connection failed"
          }
        },
        metrics: {
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024),
            unit: "MB"
          },
          cpu: process.cpuUsage()
        },
        requestLatency: Date.now() - startTime
      };

      const statusCode = dbHealthy ? 200 : 503;
      res.status(statusCode).json(response);
    } catch (error: any) {
      console.error("Health check error:", error);
      res.status(500).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
        requestLatency: Date.now() - startTime
      });
    }
  });

  // Test PDF processing endpoint
  app.post("/api/test/pdf", upload.single("pdf"), async (req, res) => {
    try {
      console.log("=== PDF TEST ENDPOINT ===");

      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      const file = req.file;
      console.log("Test file:", {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        path: file.path,
        mimetype: file.mimetype
      });

      // Test PDF processing
      const pageCount = await pdfService.getPageCount(file.path);
      const pageSizes = await pdfService.getPageSizes(file.path);

      // Clean up test file
      await safeDeleteFile(file.path, "test file");

      res.json({
        success: true,
        message: "PDF processing test successful",
        pageCount,
        pageSizes,
        fileInfo: {
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype
        }
      });

    } catch (error: any) {
      console.error("PDF test error:", error);

      // Try to clean up test file
      if (req.file) {
        await safeDeleteFile(req.file.path, "test file");
      }

      res.status(400).json({ error: error.message });
    }
  });

  // Users endpoint to get real user data for testing
  app.get("/api/users", async (req, res) => {
    try {
      // Get the first user from the database for testing purposes
      const users = await storage.getAllUsers();

      // Only return minimal user information for security
      const safeUsers = users.slice(0, 5).map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        companyName: user.companyName
      }));

      res.json({ success: true, users: safeUsers });
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auth routes with enhanced error handling
  app.post("/api/auth/register", async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("Registration request received:", {
        email: req.body.email ? 'provided' : 'missing',
        hasFullName: !!req.body.fullName
      });

      const userData = insertUserSchema.parse(req.body);
      const user = await authService.register(userData);

      console.log("Registration successful:", { userId: user.id, email: user.email });
      res.json({ success: true, user });

    } catch (error: any) {
      console.error("Registration error:", error.message);
      const statusCode = error.message?.includes("already exists") ? 409 : 400;
      res.status(statusCode).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const startTime = Date.now();
    try {
      const { email, password } = req.body;

      console.log("Login attempt:", { email: email ? 'provided' : 'missing' });

      // Validate input
      if (!email || !password) {
        console.log("Login failed: Missing credentials");
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await authService.login(email, password);

      console.log("Login successful:", { userId: user.id, email: user.email, duration: Date.now() - startTime });
      res.json({ success: true, user });

    } catch (error: any) {
      console.error("Login error:", {
        message: error.message,
        duration: Date.now() - startTime
      });
      
      // Don't expose whether email or password was wrong for security
      if (error.message === "Invalid credentials" || error.message === "Please verify your email before logging in") {
        return res.status(401).json({ error: error.message });
      }
      
      res.status(500).json({ error: "An error occurred during login" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      await authService.verifyEmail(token);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isVerified) {
        return res.status(400).json({ error: "User is already verified" });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Update user with new token
      await storage.updateUser(user.id, { verificationToken });

      // Send new verification email
      await emailService.sendVerificationEmail(user.email, user.fullName, verificationToken);

      res.json({ success: true, message: "Verification email sent" });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // Debug endpoint for signature creation
  app.post("/api/debug/signatures", (req, res) => {
    console.log("=== DEBUG SIGNATURE ENDPOINT ===");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    console.log("Request body type:", typeof req.body);
    console.log("Request body keys:", Object.keys(req.body || {}));
    res.json({
      message: "Debug endpoint hit",
      body: req.body,
      bodyKeys: Object.keys(req.body || {}),
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/signatures", async (req, res) => {
    try {
      console.log("=== SIGNATURE CREATION REQUEST ===");
      console.log("Raw request body:", req.body);
      console.log("Request body type:", typeof req.body);
      console.log("Request body keys:", Object.keys(req.body));

      const { userId, email, signatureImage, ...signatureData } = req.body;

      console.log("Extracted data:");
      console.log("- userId:", userId, "type:", typeof userId);
      console.log("- email:", email, "type:", typeof email);
      console.log("- signatureImage:", signatureImage, "type:", typeof signatureImage);
      console.log("- signatureData:", signatureData);
      console.log("- signatureData keys:", Object.keys(signatureData));

      // Validate that userId is provided
      if (!userId) {
        console.error("Missing userId in signature creation");
        return res.status(400).json({ error: "userId is required" });
      }

      // Validate that email is provided
      if (!email) {
        console.error("Missing email in signature creation");
        return res.status(400).json({ error: "email is required" });
      }

      // Create the complete signature data including userId
      const completeSignatureData = {
        userId,
        ...signatureData,
        signatureImage: signatureImage || null,
      };

      console.log("Complete signature data:", completeSignatureData);
      console.log("Complete data keys:", Object.keys(completeSignatureData));

      // Create a request schema that matches what we're receiving
      const requestSchema = z.object({
        userId: z.string(),
        name: z.string(),
        fullName: z.string(),
        companyName: z.string(),
        location: z.string(),
        timeZone: z.string(),
        signatureImage: z.string().nullable().optional(),
        password: z.string().optional(), // Add password field
      });

      console.log("Validating against request schema...");
      // Validate the request data
      const validatedRequestData = requestSchema.parse(completeSignatureData);
      console.log("Request schema validation passed:", validatedRequestData);

      // Transform the data for the service layer (remove userId since it's passed separately)
      const { userId: _, ...serviceData } = validatedRequestData;
      console.log("Service data (without userId):", serviceData);
      console.log("Service data keys:", Object.keys(serviceData));

      // Create a service schema that matches what the service layer expects (without userId)
      const serviceSchema = z.object({
        name: z.string(),
        fullName: z.string(),
        companyName: z.string(),
        location: z.string(),
        timeZone: z.string(),
        signatureImage: z.string().nullable().optional(),
        password: z.string().optional(), // Add password field
      });

      // Validate that serviceData matches service schema (without userId)
      console.log("Validating against service schema...");
      const validatedServiceData = serviceSchema.parse(serviceData);
      console.log("Service schema validation passed:", validatedServiceData);

      // Cast the validated data to InsertSignature type for the service layer
      const serviceSignatureData = validatedServiceData as any;

      const signature = await signatureService.createDigitalSignature(
        userId,
        serviceSignatureData,
        email
      );

      console.log("Signature created successfully:", signature.id);
      res.json({ success: true, signature });
    } catch (error: any) {
      console.error("Error creating signature:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/signatures/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const signatures = await signatureService.getUserSignatures(userId);
      res.json({ success: true, signatures });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/signatures/:signatureId", async (req, res) => {
    try {
      const { signatureId } = req.params;
      const { userId } = req.body;
      await signatureService.deleteSignature(signatureId, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });


  // PDF document routes
  app.post("/api/documents/upload", upload.array("pdfs", 10), async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("=== PDF UPLOAD REQUEST ===");
      console.log("Request body:", req.body);
      console.log("Files:", req.files);

      const { userId } = req.body;
      const files = req.files as Express.Multer.File[];

      console.log("Extracted userId:", userId);
      console.log("Extracted files:", files);

      // Log file sizes for debugging
      if (files && files.length > 0) {
        files.forEach((file, index) => {
          console.log(`File ${index + 1}: ${file.originalname}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        });
      }

      if (!userId) {
        console.error("Missing userId in PDF upload");
        return res.status(400).json({ error: "userId is required" });
      }

      if (!files || files.length === 0) {
        console.error("No files uploaded");
        return res.status(400).json({ error: "No files uploaded" });
      }

      console.log(`Processing ${files.length} PDF file(s)...`);
      const documents = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}:`, {
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          path: file.path,
          mimetype: file.mimetype
        });

        try {
          // Check if file exists and is readable
          await fs.access(file.path);
          console.log(`File ${file.filename} is accessible`);

          // Create document in database with initial status
          console.log(`Creating document record for ${file.filename}...`);
          const document = await storage.createDocument({
            userId,
            fileName: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            filePath: file.path,
            pageCount: 0, // Will be updated after processing
            pageSizes: "[]", // Will be updated after processing
            status: "pending", // Explicitly set initial status
          });

          console.log(`Document created successfully:`, document.id);

          try {
            // Process the PDF document
            console.log(`Processing PDF document ${file.filename}...`);
            const { pageCount, pageSizes } = await pdfService.processDocument(file.path);

            // Update document with processed information
            console.log(`Updating document status to processed for ID: ${document.id}`);
            await storage.updateDocumentStatus(document.id, "processed", pageCount, JSON.stringify(pageSizes));
            console.log(`Document status updated to processed: ${document.id}`);

            // Update page count and sizes (you might need to add these fields to your update method)
            // For now, we'll just update the status

            documents.push(document);
          } catch (processingError: any) {
            console.error(`Error processing PDF ${file.filename}:`, processingError);

            // Update status to error
            console.log(`Updating document status to error for ID: ${document.id}`);
            await storage.updateDocumentStatus(document.id, "error");
            console.log(`Document status updated to error: ${document.id}`);

            // Remove the document from the array since it failed
            // documents.pop(); // Remove the last added document

            throw processingError;
          }

        } catch (fileError: any) {
          console.error(`Error processing file ${file.filename}:`, fileError);
          console.error(`File error stack:`, fileError.stack);

          // Try to clean up the uploaded file
          await safeDeleteFile(file.path, `uploaded file ${file.filename}`);

          // If we created a document record, update its status to error
          if (documents.length > 0) {
            const lastDocument = documents[documents.length - 1];
            try {
              await storage.updateDocumentStatus(lastDocument.id, "error");
              console.log(`Updated document status to error:`, lastDocument.id);
            } catch (statusError) {
              console.error(`Failed to update document status:`, statusError);
            }
          }

          throw new Error(`Failed to process PDF file ${file.originalname}: ${fileError.message}`);
        }
      }

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      console.log(`Successfully processed ${documents.length} PDF file(s) in ${totalTime.toFixed(2)} seconds`);
      res.json({ success: true, documents });

    } catch (error: any) {
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      console.error(`PDF upload failed after ${totalTime.toFixed(2)} seconds:`, error);
      console.error("Error stack:", error.stack);
      res.status(400).json({ error: error.message });
    }
  });

  // Manual update endpoint to fix existing documents
  app.post("/api/documents/fix-status", async (req, res) => {
    try {
      console.log("=== FIXING DOCUMENT STATUS ===");

      // Get all documents
      const allDocuments: PdfDocument[] = await db.select().from(pdfDocuments);
      console.log("All documents:", allDocuments.map((d: PdfDocument) => ({ id: d.id, status: d.status, fileName: d.fileName })));

      // Update documents without status
      let updatedCount = 0;
      for (const doc of allDocuments) {
        if (!doc.status) {
          console.log(`Updating document ${doc.id} with missing status`);
          await storage.updateDocumentStatus(doc.id, "processed");
          updatedCount++;
        }
      }

      console.log(`Updated ${updatedCount} documents`);
      res.json({ success: true, updatedCount });

    } catch (error: any) {
      console.error("Error fixing document status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cleanup endpoint to remove invalid documents
  app.post("/api/documents/cleanup", async (req, res) => {
    try {
      console.log("=== CLEANING UP INVALID DOCUMENTS ===");

      // Get all documents
      const allDocuments = await db.select().from(pdfDocuments);
      console.log(`Found ${allDocuments.length} total documents`);

      let cleanedUpCount = 0;
      let validCount = 0;
      let errorCount = 0;

      for (const doc of allDocuments) {
        try {
          // Check if file exists
          await fs.access(doc.filePath);
          validCount++;
        } catch (accessError: any) {
          if (accessError.code === 'ENOENT') {
            // File doesn't exist, clean up the database record
            console.log(`Cleaning up invalid document: ${doc.id} (file missing: ${doc.filePath})`);

            try {
              // Delete any applied signatures first
              const appliedSignatures = await storage.getDocumentSignatures(doc.id);
              for (const sig of appliedSignatures) {
                try {
                  await storage.removeSignature(sig.id);
                  console.log(`Deleted applied signature: ${sig.id}`);
                } catch (sigError) {
                  console.error(`Failed to delete applied signature ${sig.id}:`, sigError);
                }
              }

              // Delete the document record
              await storage.deleteDocument(doc.id);
              cleanedUpCount++;
              console.log(`Successfully cleaned up invalid document: ${doc.id}`);
            } catch (cleanupError) {
              console.error(`Failed to cleanup invalid document ${doc.id}:`, cleanupError);
              errorCount++;
            }
          } else {
            // Other access error
            console.error(`File access error for document ${doc.id}:`, accessError);
            errorCount++;
          }
        }
      }

      console.log(`Cleanup complete: ${cleanedUpCount} invalid documents removed, ${validCount} valid documents, ${errorCount} errors`);

      res.json({
        success: true,
        cleanedUpCount,
        validCount,
        errorCount,
        totalProcessed: allDocuments.length
      });

    } catch (error: any) {
      console.error("Error during cleanup:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user documents
  app.get("/api/documents/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const documents = await storage.getUserDocuments(userId);

      // Clean up invalid documents and update status for valid ones
      const validDocuments = [];
      let cleanedUpCount = 0;

      for (const doc of documents) {
        try {
          // Check if file exists
          await fs.access(doc.filePath);

          // File exists, update status if needed
          if (!doc.status) {
            console.log(`Updating document ${doc.id} with missing status field`);
            await storage.updateDocumentStatus(doc.id, "processed");
            doc.status = "processed";
          }

          validDocuments.push(doc);
        } catch (accessError: any) {
          if (accessError.code === 'ENOENT') {
            // File doesn't exist, clean up the database record
            console.log(`Cleaning up invalid document: ${doc.id} (file missing: ${doc.filePath})`);

            try {
              // Delete any applied signatures first
              const appliedSignatures = await storage.getDocumentSignatures(doc.id);
              for (const sig of appliedSignatures) {
                try {
                  await storage.removeSignature(sig.id);
                  console.log(`Deleted applied signature: ${sig.id}`);
                } catch (sigError) {
                  console.error(`Failed to delete applied signature ${sig.id}:`, sigError);
                }
              }

              // Delete the document record
              await storage.deleteDocument(doc.id);
              cleanedUpCount++;
              console.log(`Successfully cleaned up invalid document: ${doc.id}`);
            } catch (cleanupError) {
              console.error(`Failed to cleanup invalid document ${doc.id}:`, cleanupError);
              // If cleanup fails, don't include it in valid documents
            }
          } else {
            // Other access error, log but keep the document
            console.error(`File access error for document ${doc.id}:`, accessError);
            validDocuments.push(doc);
          }
        }
      }

      console.log(`Cleaned up ${cleanedUpCount} invalid documents, returning ${validDocuments.length} valid documents`);

      res.json({
        success: true,
        documents: validDocuments,
        cleanedUpCount,
        totalProcessed: documents.length
      });
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/documents/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      console.log(`API: Attempting to delete document ${documentId}`);

      const document = await storage.getDocument(documentId);

      if (!document) {
        console.log(`API: Document ${documentId} not found`);
        return res.status(404).json({ error: "Document not found" });
      }

      console.log(`API: Found document ${documentId}, checking for applied signatures`);

      // Check if document has applied signatures
      const appliedSignatures = await storage.getDocumentSignatures(documentId);
      console.log(`API: Document ${documentId} has ${appliedSignatures.length} applied signatures`);

      // Delete file from filesystem (this won't fail the operation)
      const fileDeleted = await safeDeleteFile(document.filePath, "document file");
      console.log(`API: File deletion result: ${fileDeleted}`);

      // Delete from database (this will also delete applied signatures)
      await storage.deleteDocument(documentId);

      console.log(`API: Successfully deleted document ${documentId} and ${appliedSignatures.length} signatures`);

      res.json({
        success: true,
        message: "Document deleted successfully",
        fileDeleted: fileDeleted,
        signaturesDeleted: appliedSignatures.length
      });
    } catch (error: any) {
      console.error("Document deletion error:", error);
      res.status(500).json({
        error: "Failed to delete document",
        details: error.message
      });
    }
  });

  // Debug endpoint for troubleshooting
  app.get("/api/debug/signatures/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const appliedSignatures = await storage.getDocumentSignatures(documentId);

      res.json({
        success: true,
        document: {
          id: document.id,
          fileName: document.fileName,
          pageCount: document.pageCount,
          userId: document.userId
        },
        appliedSignatures: appliedSignatures.map(sig => ({
          id: sig.id,
          signatureId: sig.signatureId,
          pageNumber: sig.pageNumber,
          position: sig.position,
          appliedAt: sig.appliedAt
        })),
        totalSignatures: appliedSignatures.length
      });
    } catch (error: any) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Applied signature routes
  app.post("/api/documents/:documentId/signatures", async (req, res) => {
    try {
      const { documentId } = req.params;
      const { signatureId, pageNumbers, position, password } = req.body;

      console.log("Applying signature:", { documentId, signatureId, pageNumbers, position });
      console.log("Position validation details:", {
        positionExists: !!position,
        positionType: typeof position,
        isObject: typeof position === 'object',
        isNull: position === null,
        hasGridPosition: position && typeof position === 'object' && 'gridPosition' in position,
        gridPositionValue: position && typeof position === 'object' ? position.gridPosition : 'undefined',
        gridPositionType: position && typeof position === 'object' ? typeof position.gridPosition : 'undefined',
        positionKeys: position && typeof position === 'object' ? Object.keys(position) : 'undefined',
        fullPosition: JSON.stringify(position)
      });

      // Validate required fields
      if (!signatureId || !pageNumbers || !position) {
        console.error("Missing required fields:", { signatureId, pageNumbers, position });
        return res.status(400).json({
          error: "Missing required fields: signatureId, pageNumbers, and position are required"
        });
      }

      // Validate pageNumbers is an array
      if (!Array.isArray(pageNumbers) || pageNumbers.length === 0) {
        console.error("Invalid pageNumbers:", pageNumbers);
        return res.status(400).json({
          error: "pageNumbers must be a non-empty array"
        });
      }

      // Validate position object
      if (!position || typeof position !== 'object') {
        console.error("Position is not an object:", position);
        return res.status(400).json({
          error: "position must be a valid object"
        });
      }

      // Validate gridPosition is present and is a string
      if (!position.gridPosition || typeof position.gridPosition !== 'string') {
        console.error("Invalid position object - missing or invalid gridPosition:", position);
        return res.status(400).json({
          error: "position must include a valid gridPosition string"
        });
      }

      // Validate custom coordinates if present
      if (position.x !== undefined && (typeof position.x !== 'number' || position.x < 0)) {
        console.error("Invalid x coordinate:", position.x);
        return res.status(400).json({
          error: "position.x must be a valid non-negative number"
        });
      }

      if (position.y !== undefined && (typeof position.y !== 'number' || position.y < 0)) {
        console.error("Invalid y coordinate:", position.y);
        return res.status(400).json({
          error: "position.y must be a valid non-negative number"
        });
      }

      // Check if document exists
      const document = await storage.getDocument(documentId);
      if (!document) {
        console.error("Document not found:", documentId);
        return res.status(404).json({
          error: "Document not found",
          documentId,
          message: "The requested document could not be found in the database"
        });
      }

      // Check if signature exists
      const signature = await storage.getSignature(signatureId);
      if (!signature) {
        console.error("Signature not found:", signatureId);
        return res.status(404).json({ error: "Signature not found" });
      }

      // Check password if signature is password protected
      if (signature.password && signature.password.trim() !== "") {
        if (!password || password.trim() === "") {
          console.error("Password required for signature:", signatureId);
          return res.status(401).json({
            error: "Password required",
            message: "This signature is password protected. Please provide the correct password."
          });
        }

        if (password !== signature.password) {
          console.error("Invalid password for signature:", signatureId);
          return res.status(401).json({
            error: "Invalid password",
            message: "The provided password is incorrect."
          });
        }
      }

      // Validate page numbers are within document bounds
      const invalidPages = pageNumbers.filter(page => page < 1 || page > document.pageCount);
      if (invalidPages.length > 0) {
        console.error("Invalid page numbers:", invalidPages, "Document has", document.pageCount, "pages");
        return res.status(400).json({
          error: `Invalid page numbers: ${invalidPages.join(', ')}. Document has ${document.pageCount} pages.`
        });
      }

      console.log("Applying signature with data:", {
        documentId,
        signatureId,
        pageNumbers,
        position,
        hasPassword: !!signature.password
      });

      const appliedSignatures = [];

      for (const pageNumber of pageNumbers) {
        console.log(`Applying signature to page ${pageNumber}`);
        try {
          const appliedSignature = await storage.applySignature({
            documentId,
            signatureId,
            pageNumber,
            position,
          }, pageNumbers.length > 1); // Pass true if this is an "All pages" operation
          appliedSignatures.push(appliedSignature);
          console.log(`Successfully applied signature to page ${pageNumber}:`, appliedSignature.id);
        } catch (dbError: any) {
          console.error(`Failed to apply signature to page ${pageNumber}:`, dbError);
          throw new Error(`Database error applying signature to page ${pageNumber}: ${dbError.message}`);
        }
      }

      console.log("Successfully applied signatures to all pages:", appliedSignatures.length);

      // Note: Document read-only status is not automatically set
      // Users can continue to edit documents even after applying signatures
      console.log("Signatures applied successfully to document:", documentId);

      res.json({ success: true, appliedSignatures });
    } catch (error: any) {
      console.error("Error applying signature:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/documents/:documentId/signatures", async (req, res) => {
    try {
      const { documentId } = req.params;
      const signatures = await storage.getDocumentSignatures(documentId);
      res.json({ success: true, signatures });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/documents/:documentId/signatures/:signatureId", async (req, res) => {
    try {
      const { signatureId } = req.params;
      await storage.removeSignature(signatureId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/documents/:documentId/signatures/page/:pageNumber", async (req, res) => {
    try {
      const { documentId, pageNumber } = req.params;
      await storage.removeSignaturesFromPage(documentId, parseInt(pageNumber));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/documents/:documentId/signatures/:signatureId/position", async (req, res) => {
    try {
      const { signatureId } = req.params;
      const { position } = req.body;

      // Optimized: Direct update without additional logging
      await storage.updateSignaturePosition(signatureId, position);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Toggle document read-only status - temporarily removed for database compatibility
  // app.put("/api/documents/:documentId/readonly", async (req, res) => {
  //   try {
  //     const { documentId } = req.params;
  //     const { isReadOnly } = req.body;
  //     
  //     if (typeof isReadOnly !== 'boolean') {
  //       return res.status(400).json({ error: "isReadOnly must be a boolean value" });
  //     }
  //     
  //     await storage.updateDocumentReadOnlyStatus(documentId, isReadOnly);
  //     res.json({ success: true, isReadOnly });
  //   } catch (error: any) {
  //     res.status(400).json({ error: error.message });
  //   }
  // });

  // PDF download with signatures
  app.get("/api/documents/:documentId/download", async (req, res) => {
    try {
      const { documentId } = req.params;
      const document = await storage.getDocument(documentId);
      const appliedSignatures = await storage.getDocumentSignatures(documentId);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Get signature data for each applied signature
      const signaturesToApply = [];
      for (const appliedSig of appliedSignatures) {
        const signature = await storage.getSignature(appliedSig.signatureId);
        if (signature) {
          signaturesToApply.push({
            pageNumber: appliedSig.pageNumber,
            position: appliedSig.position as any,
            signatureData: {
              fullName: signature.fullName,
              companyName: signature.companyName,
              location: signature.location,
              timestamp: appliedSig.appliedAt || new Date(),
              timeZone: signature.timeZone,
              signatureImage: signature.signatureImage || undefined,
            },
          });
        }
      }

      const signedPdfBytes = await pdfService.applySignatureToPdf(
        document.filePath,
        signaturesToApply
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${document.originalName}"`);
      res.send(Buffer.from(signedPdfBytes));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk download multiple PDFs as zip
  app.post("/api/documents/bulk-download", async (req, res) => {
    try {
      const { documentIds, userId } = req.body;

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ error: "Document IDs array is required" });
      }

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      console.log('Bulk download request:', { documentIds, userId });

      // Get all documents and verify they belong to the user
      const documents: PdfDocument[] = [];
      for (const documentId of documentIds) {
        const document = await storage.getDocument(documentId);
        if (!document) {
          return res.status(404).json({ error: `Document ${documentId} not found` });
        }
        if (document.userId !== userId) {
          return res.status(403).json({ error: `Access denied for document ${documentId}` });
        }
        documents.push(document);
      }

      console.log('Documents to zip:', documents.length);

      if (documents.length === 0) {
        return res.status(400).json({ error: "No documents could be processed" });
      }

      // Import archiver dynamically
      const archiver = require('archiver');

      // Create zip archive with low compression (PDFs are already compressed)
      const archive = archiver('zip', {
        zlib: { level: 0 }
      });

      // Handle archive errors
      archive.on('error', (err: any) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Archive creation failed' });
        }
      });

      archive.on('warning', (err: any) => {
        console.warn('Archive warning:', err);
      });

      // Handle archive finish
      archive.on('end', () => {
        console.log('Archive finalized, bytes:', archive.pointer());
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="XSignature.zip"');

      // Pipe archive to response so download starts immediately
      archive.pipe(res);

      // Track used filenames to handle duplicates
      const usedFilenames = new Map<string, number>();

      const getUniqueFilename = (originalName: string) => {
        let finalFilename = originalName;
        if (usedFilenames.has(originalName)) {
          const count = usedFilenames.get(originalName)! + 1;
          usedFilenames.set(originalName, count);
          const lastDotIndex = originalName.lastIndexOf('.');
          if (lastDotIndex > 0) {
            const nameWithoutExt = originalName.substring(0, lastDotIndex);
            const extension = originalName.substring(lastDotIndex);
            finalFilename = `${nameWithoutExt} (${count})${extension}`;
          } else {
            finalFilename = `${originalName} (${count})`;
          }
        } else {
          usedFilenames.set(originalName, 1);
        }
        return finalFilename;
      };

      // Concurrency-limited processor
      const maxConcurrency = Math.min(3, documents.length);
      let currentIndex = 0;
      let active = 0;
      let completed = 0;

      const runNext = async (): Promise<void> => {
        if (currentIndex >= documents.length) return;
        const myIndex = currentIndex++;
        const document = documents[myIndex];
        active++;
        console.log(`Processing document ${myIndex + 1}/${documents.length}: ${document.originalName}`);

        try {
          const appliedSignatures = await storage.getDocumentSignatures(document.id);
          const signaturesToApply = [] as any[];
          for (const appliedSig of appliedSignatures) {
            const signature = await storage.getSignature(appliedSig.signatureId);
            if (signature) {
              signaturesToApply.push({
                pageNumber: appliedSig.pageNumber,
                position: appliedSig.position as any,
                signatureData: {
                  fullName: signature.fullName,
                  companyName: signature.companyName,
                  location: signature.location,
                  timestamp: appliedSig.appliedAt || new Date(),
                  timeZone: signature.timeZone,
                  signatureImage: signature.signatureImage || undefined,
                },
              });
            }
          }

          const signedPdfBytes = await pdfService.applySignatureToPdf(
            document.filePath,
            signaturesToApply
          );

          if (signedPdfBytes && signedPdfBytes.length > 0) {
            const pdfBuffer = Buffer.isBuffer(signedPdfBytes) ? signedPdfBytes as Buffer : Buffer.from(signedPdfBytes);
            const finalFilename = getUniqueFilename(document.originalName);
            console.log(`Appending to zip: ${finalFilename} (${pdfBuffer.length} bytes)`);
            // Store without compression for speed
            archive.append(pdfBuffer, { name: finalFilename, date: new Date(), store: true });
          } else {
            console.error(`Empty PDF for ${document.originalName}, skipping.`);
          }
        } catch (err) {
          console.error(`Error processing ${document.originalName}:`, err);
        } finally {
          active--;
          completed++;
          if (completed === documents.length) {
            console.log('Finalizing archive...');
            archive.finalize();
          } else {
            // Kick off next task if any remain
            if (currentIndex < documents.length) {
              runNext();
            }
          }
        }
      };

      // Start initial workers
      for (let i = 0; i < maxConcurrency; i++) {
        runNext();
      }

    } catch (error: any) {
      console.error('Bulk download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to create zip file" });
      }
    }
  });

  // Test endpoint to verify archiver works
  app.get("/api/test-zip", async (req, res) => {
    try {
      console.log('=== TEST ZIP ENDPOINT CALLED ===');
      const archiver = require('archiver');

      // Create zip archive
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      // Handle archive errors
      archive.on('error', (err: any) => {
        console.error('Test archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Archive creation failed' });
        }
      });

      // Handle archive finish
      archive.on('end', () => {
        console.log('Test archive finalized, bytes:', archive.pointer());
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="test.zip"');

      // Pipe archive to response
      archive.pipe(res);

      // Add a simple text file
      console.log('Adding test files to archive...');
      archive.append('Hello World! This is a test file.', { name: 'test.txt' });
      archive.append('Another test file content.', { name: 'test2.txt' });

      // Finalize the archive
      console.log('Finalizing test archive...');
      await archive.finalize();
      console.log('Test archive finalization completed');

    } catch (error: any) {
      console.error('Test zip error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to create test zip file" });
      }
    }
  });

  // Simple test endpoint that returns a single PDF without zip
  app.post("/api/test-single-pdf", async (req, res) => {
    try {
      const { documentId, userId } = req.body;

      if (!documentId || !userId) {
        return res.status(400).json({ error: "Document ID and User ID are required" });
      }

      console.log('=== TEST SINGLE PDF ENDPOINT ===');
      const document = await storage.getDocument(documentId);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (document.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      console.log(`Processing document: ${document.originalName}`);

      const appliedSignatures = await storage.getDocumentSignatures(document.id);
      console.log(`Found ${appliedSignatures.length} signatures`);

      // Get signature data
      const signaturesToApply = [];
      for (const appliedSig of appliedSignatures) {
        const signature = await storage.getSignature(appliedSig.signatureId);
        if (signature) {
          signaturesToApply.push({
            pageNumber: appliedSig.pageNumber,
            position: appliedSig.position as any,
            signatureData: {
              fullName: signature.fullName,
              companyName: signature.companyName,
              location: signature.location,
              timestamp: appliedSig.appliedAt || new Date(),
              timeZone: signature.timeZone,
              signatureImage: signature.signatureImage || undefined,
            },
          });
        }
      }

      // Apply signatures to PDF
      console.log('Calling pdfService.applySignatureToPdf...');
      const signedPdfBytes = await pdfService.applySignatureToPdf(
        document.filePath,
        signaturesToApply
      );

      console.log(`Generated PDF size: ${signedPdfBytes.length} bytes`);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${document.originalName}"`);
      res.send(Buffer.from(signedPdfBytes));

    } catch (error: any) {
      console.error('Test single PDF error:', error);
      res.status(500).json({ error: error.message || "Failed to process PDF" });
    }
  });

  // Generate Adobe-style signature certificate
  app.get("/api/signatures/:signatureId/certificate", async (req, res) => {
    try {
      console.log("=== CERTIFICATE REQUEST ===");
      const { signatureId } = req.params;
      console.log("Signature ID:", signatureId);

      const signature = await storage.getSignature(signatureId);
      console.log("Signature found:", !!signature);

      if (!signature) {
        console.log("Signature not found for ID:", signatureId);
        return res.status(404).json({ error: "Signature not found" });
      }

      // Import certificate service
      const { CertificateService } = require('./services/certificate');
      const certificateService = new CertificateService();

      // Generate certificate ID
      const certificateId = certificateService.generateCertificateId();

      // Prepare certificate data
      const certificateData = {
        signatureName: signature.name,
        fullName: signature.fullName,
        companyName: signature.companyName,
        location: signature.location,
        timeZone: signature.timeZone,
        createdAt: signature.createdAt,
        certificateId: certificateId,
        signatureImage: signature.signatureImage
      };

      // Generate PDF certificate
      console.log("Generating PDF certificate...");
      const pdfBytes = await certificateService.generateAdobeStyleCertificate(certificateData);
      console.log("PDF generated, size:", pdfBytes.length, "bytes");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${signature.name}-certificate.pdf"`);
      res.send(Buffer.from(pdfBytes));
      console.log("PDF sent to client");

    } catch (error: any) {
      console.error('Certificate generation error:', error);
      res.status(500).json({ error: error.message || "Failed to generate certificate" });
    }
  });

  // Serve PDF files for viewing with performance optimizations
  app.get("/api/documents/:documentId/view", async (req, res) => {
    try {
      console.log("=== PDF VIEW REQUEST ===");
      const { documentId } = req.params;
      const { t } = req.query; // Cache busting parameter
      console.log("Document ID:", documentId, "Timestamp:", t);

      const document = await storage.getDocument(documentId);
      console.log("Document found:", document ? "Yes" : "No");

      if (!document) {
        console.error("Document not found for ID:", documentId);
        return res.status(404).json({
          error: "Document not found",
          documentId,
          message: "The requested document could not be found in the database"
        });
      }

      console.log("Document details:", {
        id: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        filePath: document.filePath,
        fileSize: document.fileSize
      });

      // Check if file exists with optimized error handling
      try {
        await fs.access(document.filePath);
        console.log("File exists and is accessible");
      } catch (accessError: any) {
        console.error("File access error:", accessError);
        if (accessError.code === 'ENOENT') {
          console.error(`PDF file not found on disk: ${document.filePath}`);

          // Clean up invalid database record since file is missing
          try {
            console.log(`Cleaning up invalid document record: ${document.id}`);

            // Delete any applied signatures first
            const appliedSignatures = await storage.getDocumentSignatures(document.id);
            for (const sig of appliedSignatures) {
              try {
                await storage.removeSignature(sig.id);
                console.log(`Deleted applied signature: ${sig.id}`);
              } catch (sigError) {
                console.error(`Failed to delete applied signature ${sig.id}:`, sigError);
              }
            }

            // Delete the document record
            await storage.deleteDocument(document.id);
            console.log(`Successfully cleaned up invalid document: ${document.id}`);

            return res.status(404).json({
              error: "Document cleaned up",
              documentId: document.id,
              message: "The document has been automatically cleaned up due to missing file. Please re-upload if needed."
            });
          } catch (cleanupError) {
            console.error(`Failed to cleanup invalid document ${document.id}:`, cleanupError);
            return res.status(500).json({
              error: "Failed to cleanup invalid document",
              message: "Please contact support to resolve this issue."
            });
          }
        }
        return res.status(500).json({ error: "File access error" });
      }

      // Check if document has applied signatures with caching
      const appliedSignatures = await storage.getDocumentSignatures(documentId);

      if (appliedSignatures.length > 0) {
        // Apply signatures for preview with performance optimizations
        console.log("Applying signatures for preview...");
        const signaturesToApply = [];

        // Batch signature lookups for better performance
        const signatureIds = Array.from(new Set(appliedSignatures.map(sig => sig.signatureId)));
        const signatures = await Promise.all(
          signatureIds.map(id => storage.getSignature(id))
        );
        const signatureMap = new Map(signatures.filter(Boolean).map(sig => [sig!.id, sig!]));

        for (const appliedSig of appliedSignatures) {
          const signature = signatureMap.get(appliedSig.signatureId);
          if (signature) {
            signaturesToApply.push({
              pageNumber: appliedSig.pageNumber,
              position: appliedSig.position as any,
              signatureData: {
                fullName: signature.fullName,
                companyName: signature.companyName,
                location: signature.location,
                timestamp: appliedSig.appliedAt || new Date(),
                timeZone: signature.timeZone,
                signatureImage: signature.signatureImage || undefined,
              },
            });
          }
        }

        // Apply signatures and serve the signed PDF
        const signedPdfBytes = await pdfService.applySignatureToPdf(
          document.filePath,
          signaturesToApply
        );

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", signedPdfBytes.length.toString());
        res.setHeader("Cache-Control", "public, max-age=300"); // Cache for 5 minutes
        res.setHeader("ETag", `"${documentId}-${t || Date.now()}"`);
        res.send(Buffer.from(signedPdfBytes));
        console.log("Signed PDF sent successfully for preview");
      } else {
        // No signatures, serve original PDF with streaming for large files
        console.log("Reading PDF file...");

        // Use streaming for better performance on large files
        const stat = await fs.stat(document.filePath);
        const fileSize = stat.size;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", fileSize.toString());
        res.setHeader("Cache-Control", "public, max-age=300"); // Cache for 5 minutes
        res.setHeader("ETag", `"${documentId}-${t || Date.now()}"`);

        // Check if client has cached version
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === `"${documentId}-${t || Date.now()}"`) {
          return res.status(304).end(); // Not Modified
        }

        // Stream the file for better performance
        const fileStream = fsSync.createReadStream(document.filePath);
        fileStream.pipe(res);
        console.log("Original PDF streamed successfully");
      }

    } catch (error: any) {
      console.error("PDF view error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  // Email verification endpoint (now under /api for Vercel compatibility)
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Invalid Verification Link</h1>
              <p>The verification link is invalid or has expired.</p>
              <a href="/">Return to XSignature</a>
            </body>
          </html>
        `);
      }

      const result = await authService.verifyEmail(token);

      if (result.success) {
        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #4CAF50;">Email Verified Successfully!</h1>
              <p>Your email has been verified. You can now log in to your XSignature account.</p>
              <a href="/" style="background-color: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to XSignature
              </a>
            </body>
          </html>
        `);
      } else {
        res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Verification Failed</h1>
              <p>${result.error}</p>
              <a href="/">Return to XSignature</a>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Server Error</h1>
            <p>An error occurred during verification. Please try again later.</p>
            <a href="/">Return to XSignature</a>
          </body>
        </html>
      `);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
