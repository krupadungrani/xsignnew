// Catch-all API route for Vercel that forwards to the Express app defined in index.ts
// This ensures that /api/* paths (e.g. /api/auth/register) are all handled by the same Express server.

import handler from "./index";

export default handler;
