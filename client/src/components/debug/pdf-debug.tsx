import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

interface PdfDebugProps {
  documentId: string;
}

export function PdfDebug({ documentId }: PdfDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDebug = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Starting PDF debug for document:", documentId);
      
      // Test 1: Check document info
      const docResponse = await fetch(apiUrl(`api/documents/${documentId}`));
      const docData = await docResponse.json();
      console.log("📄 Document info:", docData);
      
      // Test 2: Check if file exists
      const viewResponse = await fetch(apiUrl(`api/documents/${documentId}/view?t=${Date.now()}`));
      console.log("👁️ View response status:", viewResponse.status);
      console.log("👁️ View response headers:", Object.fromEntries(viewResponse.headers.entries()));
      
      // Test 3: Test PDF worker
      const workerTest = await fetch('/pdf.worker.min.js');
      console.log("🔧 Worker test status:", workerTest.status);
      
      setDebugInfo({
        document: docData,
        viewStatus: viewResponse.status,
        viewHeaders: Object.fromEntries(viewResponse.headers.entries()),
        workerStatus: workerTest.status,
        timestamp: new Date().toISOString()
      });
      
    } catch (err: any) {
      console.error("❌ Debug failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">PDF Debug Tool</h3>
      
      <button
        onClick={runDebug}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Running..." : "Run Debug"}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {debugInfo && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Debug Results:</h4>
          <pre className="bg-white p-3 rounded border text-sm overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
