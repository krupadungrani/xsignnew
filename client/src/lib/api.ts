// API configuration for production and development
// Since backend serves both API and frontend on the same port,
// we use relative paths (same origin)
const API_BASE_URL = '';

export const apiUrl = (path: string) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // If no base URL (production), just use relative path
  if (!API_BASE_URL) {
    return `/${cleanPath}`;
  }
  
  return `${API_BASE_URL}/${cleanPath}`;
};

export const apiRequest = async (
  method: string,
  path: string,
  data?: unknown
): Promise<Response> => {
  const url = apiUrl(path);
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",  // ✅ IMPORTANT: Include credentials for CORS
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
};
