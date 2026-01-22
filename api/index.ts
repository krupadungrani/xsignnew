import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import { registerRoutes } from "../server/routes";
import { checkDatabaseHealth } from "../server/db";

// Simple logger (mirrors server/vite.ts style without importing Vite)
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // eslint-disable-next-line no-console
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Create a single Express app instance reused across invocations
const app = express();

// ===== CORS CONFIGURATION =====
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5173",
  "http://0.0.0.0:3000",
  "http://0.0.0.0:5000",
  "http://0.0.0.0:5173",
];

// Add production URLs if environment variables exist
if (process.env.NODE_ENV === "production") {
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow all for easier testing
      if (process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS policy"));
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  maxAge: 3600,
  optionsSuccessStatus: 200
}));

// ===== COMPRESSION MIDDLEWARE =====
app.use(compression({
  level: 6,
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Increase body parser limits for large file uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// Increase timeout for large file uploads
app.use((req, res, next) => {
  // Set timeout to 5 minutes for upload endpoints
  if (req.path.includes('/upload') || req.path.includes('/api/documents')) {
    req.setTimeout(300000, () => {
      console.log('Request timeout reached');
    });
    res.setTimeout(300000, () => {
      console.log('Response timeout reached');
    });
  }
  next();
});

// Basic request logging for /api routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json.bind(res);
  (res as any).json = function(bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
          // ignore JSON stringify errors
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Store the Promise that resolves when routes are registered
let routesReady: Promise<void> | null = null;

// Initialize routes once
async function initializeRoutes() {
  if (!routesReady) {
    routesReady = (async () => {
      try {
        console.log("Starting route registration...");
        await registerRoutes(app);
        log("Routes registered successfully");
      } catch (error) {
        console.error("Failed to register routes:", error);
        routesReady = null; // Reset so we can try again
        throw error;
      }
    })();
  }
  return routesReady;
}

// Global error handler with enhanced logging
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || "Internal Server Error";

  console.error("Express Error:", {
    message,
    status,
    stack: err?.stack,
    code: err?.code,
    name: err?.name
  });

  // Don't expose internal error details in production
  const responseMessage = process.env.NODE_ENV === "production" && status === 500
    ? "Internal Server Error"
    : message;

  res.status(status).json({ 
    message: responseMessage,
    ...(process.env.NODE_ENV !== "production" && { 
      error: err.message,
      stack: err.stack 
    })
  });
});

// Enhanced Vercel serverless function entrypoint with better error handling
export default async function handler(req: Request, res: Response) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] Incoming request:`, {
    method: req.method,
    path: req.path,
    query: req.query
  });

  try {
    // Check database health first
    const dbHealth = await checkDatabaseHealth();
    if (!dbHealth.healthy) {
      console.error(`[${requestId}] Database health check failed:`, dbHealth.error);
      return res.status(503).json({
        message: "Service temporarily unavailable - database connection failed",
        requestId,
        retryAfter: 30
      });
    }

    // Ensure routes are registered before handling request
    console.log(`[${requestId}] Initializing routes...`);
    await initializeRoutes();
    console.log(`[${requestId}] Routes ready, processing request...`);
    
    // Use the Express app to handle the request
    return app(req, res);
  } catch (error: any) {
    console.error(`[${requestId}] Handler error:`, {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Check if it's a database connection error
    if (error.message?.includes('database') || error.code === '57P01' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: "Service temporarily unavailable - database connection failed",
        requestId,
        retryAfter: 30
      });
    }
    
    res.status(500).json({ 
      message: "Internal Server Error",
      requestId
    });
  }
}

