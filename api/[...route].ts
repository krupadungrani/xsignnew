import type { Express } from "express";
import { createServer, type Server } from "http";

// Re-export the handler from index.ts
// This file acts as a Vercel catch-all route that forwards to the main Express app
import handler from "./index";

export default handler;

// Export config for Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

