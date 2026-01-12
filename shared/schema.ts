import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name"),
  isVerified: boolean("is_verified").default(false),
  verificationToken: text("verification_token"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const digitalSignatures = pgTable("digital_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  location: text("location").notNull(),
  timeZone: text("time_zone").notNull(),
  certificate: text("certificate").notNull(), // PEM encoded certificate
  privateKey: text("private_key").notNull(), // Encrypted private key
  signatureImage: text("signature_image"), // Base64 encoded signature image
  password: text("password"), // Optional password for signature protection
  createdAt: timestamp("created_at").defaultNow(),
});

export const pdfDocuments = pgTable("pdf_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  pageCount: integer("page_count").notNull(),
  pageSizes: text("page_sizes"), // JSON string of page sizes
  status: varchar("status").notNull().default("pending"), // pending, processing, processed, error
  // isReadOnly: boolean("is_read_only").default(false), // temporarily removed for database compatibility
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const appliedSignatures = pgTable("applied_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => pdfDocuments.id),
  signatureId: varchar("signature_id").notNull().references(() => digitalSignatures.id),
  pageNumber: integer("page_number").notNull(),
  position: jsonb("position").notNull(), // {x, y, width, height, gridPosition}
  appliedAt: timestamp("applied_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  signatures: many(digitalSignatures),
  documents: many(pdfDocuments),
}));

export const digitalSignaturesRelations = relations(digitalSignatures, ({ one, many }) => ({
  user: one(users, {
    fields: [digitalSignatures.userId],
    references: [users.id],
  }),
  appliedSignatures: many(appliedSignatures),
}));

export const pdfDocumentsRelations = relations(pdfDocuments, ({ one, many }) => ({
  user: one(users, {
    fields: [pdfDocuments.userId],
    references: [users.id],
  }),
  appliedSignatures: many(appliedSignatures),
}));

export const appliedSignaturesRelations = relations(appliedSignatures, ({ one }) => ({
  document: one(pdfDocuments, {
    fields: [appliedSignatures.documentId],
    references: [pdfDocuments.id],
  }),
  signature: one(digitalSignatures, {
    fields: [appliedSignatures.signatureId],
    references: [digitalSignatures.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isVerified: true,
  verificationToken: true,
});

export const insertSignatureSchema = createInsertSchema(digitalSignatures).omit({
  id: true,
  createdAt: true,
  certificate: true,
  privateKey: true,
}).extend({
  signatureImage: z.string().optional().nullable(),
  password: z.string().optional(),
});

export const insertDocumentSchema = createInsertSchema(pdfDocuments).omit({
  id: true,
  uploadedAt: true,
}).extend({
  status: z.string().default("pending"),
});

export const insertAppliedSignatureSchema = createInsertSchema(appliedSignatures).omit({
  id: true,
  appliedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type DigitalSignature = typeof digitalSignatures.$inferSelect;
export type InsertSignature = z.infer<typeof insertSignatureSchema>;
export type PdfDocument = typeof pdfDocuments.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type AppliedSignature = typeof appliedSignatures.$inferSelect;
export type InsertAppliedSignature = z.infer<typeof insertAppliedSignatureSchema>;
