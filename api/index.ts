import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import { registerRoutes } from "../server/routes";

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

// ===== CORS CONFIGURATION (same logic as server/index.ts) =====
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

if (process.env.NODE_ENV === "production") {
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
}

app.use(
  cors({
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
    optionsSuccessStatus: 200,
  })
);

// ===== COMPRESSION & BODY PARSING =====
app.use(
  compression({
    level: 6,
    threshold: 1024, // Only compress responses larger than 1KB
  })
);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: false, limit: "100mb" }));

// Increase timeout for large file uploads
app.use((req, res, next) => {
  if (req.path.includes("/upload") || req.path.includes("/api/documents")) {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes
  }
  next();
});

// Basic request logging for /api routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  (res as Response).json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    // @ts-expect-error - spread args to original json
    return originalResJson(bodyJson, ...args);
  } as Response["json"];

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

// Register all API routes (reuses existing Express routes)
const routesReady = registerRoutes(app);

// Global error handler (same semantics as server/index.ts)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || "Internal Server Error";

  res.status(status).json({ message });
  // eslint-disable-next-line no-console
  console.error(err);
});

// Vercel serverless function entrypoint
export default async function handler(req: any, res: any) {
  await routesReady; // ensure routes are attached
  return app(req, res);
}
