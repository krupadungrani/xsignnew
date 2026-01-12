// Test PDF endpoint directly
async function testPdfEndpoint() {
  console.log('🔍 Testing PDF Endpoint');
  console.log('=======================');
  
  try {
    // Test 1: Server health
    console.log('\n1. Testing server health...');
    const healthResponse = await fetch('http://localhost:5000/api/health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Server is running:', healthData);
    } else {
      console.log('❌ Server health check failed:', healthResponse.status);
      return;
    }
    
    // Test 2: Test a specific document ID (you'll need to replace this with a real ID)
    console.log('\n2. Testing PDF view endpoint...');
    console.log('⚠️ Note: You need to replace DOCUMENT_ID with a real document ID from your database');
    
    // This is a placeholder - you need to replace with a real document ID
    const documentId = 'ba9be991-0e06-42c2-bb7e-839d37a04046'; // From your console logs
    
    const pdfUrl = `http://localhost:5000/api/documents/${documentId}/view?t=${Date.now()}`;
    console.log('Testing URL:', pdfUrl);
    
    const pdfResponse = await fetch(pdfUrl, { 
      method: 'HEAD'
    });
    
    console.log('Response status:', pdfResponse.status);
    console.log('Response headers:', Object.fromEntries(pdfResponse.headers.entries()));
    
    if (pdfResponse.ok) {
      const contentType = pdfResponse.headers.get('content-type');
      const contentLength = pdfResponse.headers.get('content-length');
      
      console.log('✅ PDF endpoint is responding');
      console.log('Content-Type:', contentType);
      console.log('Content-Length:', contentLength);
      
      if (contentType && contentType.includes('application/pdf')) {
        console.log('✅ Correct PDF content type');
      } else {
        console.log('⚠️ Unexpected content type');
      }
    } else {
      console.log('❌ PDF endpoint failed:', pdfResponse.status, pdfResponse.statusText);
      
      // Try to get error details
      try {
        const errorText = await pdfResponse.text();
        console.log('Error details:', errorText);
      } catch (e) {
        console.log('Could not read error details');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server is not running. Start it with: npm run dev');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Cannot reach localhost:5000. Check if server is running on correct port.');
    }
  }
}

// Run the test
testPdfEndpoint();
