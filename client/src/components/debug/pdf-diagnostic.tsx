import { useState } from "react";
import { apiUrl } from "@/lib/api";

interface PdfDiagnosticProps {
  documentId?: string;
}

export function PdfDiagnostic({ documentId }: PdfDiagnosticProps) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    const diagnosticResults: any = {};

    try {
      console.log("🔍 Starting PDF diagnostic...");

      // Test 1: Server health
      console.log("1. Testing server health...");
      const healthResponse = await fetch(apiUrl('api/health'));
      diagnosticResults.serverHealth = {
        status: healthResponse.status,
        ok: healthResponse.ok,
        data: healthResponse.ok ? await healthResponse.json() : null
      };

      // Test 2: PDF worker
      console.log("2. Testing PDF worker...");
      const workerResponse = await fetch('/pdf.worker.min.js');
      diagnosticResults.pdfWorker = {
        status: workerResponse.status,
        ok: workerResponse.ok
      };

      // Test 3: Document endpoint (if documentId provided)
      if (documentId) {
        console.log("3. Testing document endpoint...");
        const docResponse = await fetch(apiUrl(`api/documents/${documentId}`));
        diagnosticResults.document = {
          status: docResponse.status,
          ok: docResponse.ok,
          data: docResponse.ok ? await docResponse.json() : null
        };

        // Test 4: PDF view endpoint
        console.log("4. Testing PDF view endpoint...");
        const viewResponse = await fetch(apiUrl(`api/documents/${documentId}/view?t=${Date.now()}`));
        diagnosticResults.pdfView = {
          status: viewResponse.status,
          ok: viewResponse.ok,
          contentType: viewResponse.headers.get('content-type'),
          contentLength: viewResponse.headers.get('content-length')
        };
      }

      // Test 5: Browser capabilities
      console.log("5. Testing browser capabilities...");
      diagnosticResults.browser = {
        userAgent: navigator.userAgent,
        pdfSupport: 'PDF' in window,
        fetchSupport: 'fetch' in window,
        corsSupport: 'XMLHttpRequest' in window
      };

      setResults(diagnosticResults);
      console.log("✅ Diagnostic completed");

    } catch (error: any) {
      console.error("❌ Diagnostic failed:", error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">PDF Diagnostic Tool</h3>
      
      <button
        onClick={runDiagnostic}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
      >
        {loading ? "Running..." : "Run Diagnostic"}
      </button>
      
      {results && (
        <div className="space-y-4">
          <h4 className="font-semibold">Results:</h4>
          
          {results.error ? (
            <div className="p-3 bg-red-100 border border-red-300 rounded">
              <strong>Error:</strong> {results.error}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Server Health */}
              <div className="p-3 bg-white border rounded">
                <h5 className="font-medium">Server Health</h5>
                <pre className="text-sm mt-2">{JSON.stringify(results.serverHealth, null, 2)}</pre>
              </div>

              {/* PDF Worker */}
              <div className="p-3 bg-white border rounded">
                <h5 className="font-medium">PDF Worker</h5>
                <pre className="text-sm mt-2">{JSON.stringify(results.pdfWorker, null, 2)}</pre>
              </div>

              {/* Document Info */}
              {results.document && (
                <div className="p-3 bg-white border rounded">
                  <h5 className="font-medium">Document Info</h5>
                  <pre className="text-sm mt-2">{JSON.stringify(results.document, null, 2)}</pre>
                </div>
              )}

              {/* PDF View */}
              {results.pdfView && (
                <div className="p-3 bg-white border rounded">
                  <h5 className="font-medium">PDF View Endpoint</h5>
                  <pre className="text-sm mt-2">{JSON.stringify(results.pdfView, null, 2)}</pre>
                </div>
              )}

              {/* Browser */}
              <div className="p-3 bg-white border rounded">
                <h5 className="font-medium">Browser Capabilities</h5>
                <pre className="text-sm mt-2">{JSON.stringify(results.browser, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
