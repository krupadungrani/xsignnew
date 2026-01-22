import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../shared/schema";

// Configure Neon to use WebSocket
neonConfig.webSocketConstructor = ws;

// Log environment info (without exposing sensitive data)
console.log("Database environment:", {
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
  vercelUrl: process.env.VERCEL_URL ? 'set' : 'not set',
  isVercel: !!process.env.VERCEL
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set!");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database? in Vercel, make sure to add it to Environment Variables."
  );
}

// Optimized connection pool configuration for serverless environments
// Increased timeouts and retries for Vercel's cold starts
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 1, // Use single connection in serverless to avoid connection exhaustion
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 15000, // Timeout after 15 seconds for Vercel cold starts
  allowExitOnIdle: true, // Allow process to exit when idle
  // Enable keepalive to prevent connection drops
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create connection pool with retry logic
let pool: Pool | null = null;
let db: any = null;
let connectionRetries = 0;
const maxConnectionRetries = 3;
const connectionRetryDelay = 1000;

async function initializeDatabase(): Promise<{ pool: Pool; db: any }> {
  if (pool && db) {
    return { pool, db };
  }

  for (let attempt = 1; attempt <= maxConnectionRetries; attempt++) {
    try {
      console.log(`Attempting database connection (attempt ${attempt}/${maxConnectionRetries})...`);
      
      // Create new pool
      const newPool = new Pool(poolConfig);
      
      // Test the connection
      const client = await newPool.connect();
      try {
        const result = await client.query('SELECT NOW()');
        console.log('Database connection successful:', result.rows[0].now);
      } finally {
        client.release();
      }
      
      // Create drizzle client
      const newDb = drizzle({ 
        client: newPool, 
        schema,
        logger: process.env.NODE_ENV !== "production"
      });
      
      pool = newPool;
      db = newDb;
      connectionRetries = 0;
      
      console.log('Database initialized successfully');
      return { pool: newPool, db: newDb };
      
    } catch (error: any) {
      connectionRetries++;
      console.error(`Database connection attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxConnectionRetries) {
        console.log(`Retrying in ${connectionRetryDelay * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, connectionRetryDelay * attempt));
      } else {
        console.error('All database connection attempts failed');
        throw error;
      }
    }
  }
  
  throw new Error('Failed to initialize database after maximum retries');
}

// Initialize database immediately
initializeDatabase().catch((error) => {
  console.error('Failed to initialize database:', error);
});

// Handle pool errors
function handlePoolError(err: Error) {
  console.error('Unexpected error on idle client', err);
  // Attempt to reinitialize on pool errors in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Attempting to reinitialize database pool...');
    pool = null;
    db = null;
    initializeDatabase().catch(reinitError => {
      console.error('Failed to reinitialize database:', reinitError);
    });
  }
}

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log('Shutting down database connection...');
  try {
    if (pool) {
      await pool.end();
      pool = null;
      db = null;
      console.log('Database pool closed successfully');
    }
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
}

// Register graceful shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

// Export database access functions
export async function getDb() {
  const result = await initializeDatabase();
  return result.db;
}

export async function getPool() {
  const result = await initializeDatabase();
  return result.pool;
}

// Keep the pool and db exports for backward compatibility
export { pool, db };

// Helper function to get a client from the pool
export async function getClient() {
  const p = await getPool();
  return p.connect();
}

// Helper function to execute a query with retry logic
export async function queryWithRetry<T>(
  query: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const database = await getDb();
      return await query();
    } catch (error: any) {
      lastError = error;
      console.error(`Query attempt ${attempt} failed:`, error.message);
      
      // If it's a connection error and we have retries left, wait and retry
      if (attempt < maxRetries && error.code === '57P01') { // admin_shutdown
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

// Health check function for the database
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  try {
    const database = await getDb();
    const p = await getPool();
    const client = await p.connect();
    try {
      await client.query('SELECT 1');
      const latency = Date.now() - startTime;
      return { healthy: true, latency };
    } finally {
      client.release();
    }
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('Database health check failed:', error.message);
    return { healthy: false, error: error.message, latency };
  }
}

