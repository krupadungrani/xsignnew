const fs = require('fs');
const path = require('path');

// Simple PDF loading diagnostic
async function diagnosePdfLoading() {
  console.log('🔍 PDF Loading Diagnostic');
  console.log('========================');
  
  try {
    // Check 1: Server health
    console.log('\n1. Checking server health...');
    const healthResponse = await fetch('http://localhost:5000/api/health');
    if (healthResponse.ok) {
      console.log('✅ Server is running');
    } else {
      console.log('❌ Server health check failed:', healthResponse.status);
      return;
    }
    
    // Check 2: Uploads directory
    console.log('\n2. Checking uploads directory...');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));
      console.log(`✅ Uploads directory exists with ${pdfFiles.length} PDF files`);
      
      if (pdfFiles.length > 0) {
        // Check 3: Test first PDF file
        const testFile = pdfFiles[0];
        const filePath = path.join(uploadsDir, testFile);
        const stats = fs.statSync(filePath);
        console.log(`📄 Test file: ${testFile} (${stats.size} bytes)`);
        
        // Check 4: Test PDF view endpoint
        console.log('\n3. Testing PDF view endpoint...');
        const viewResponse = await fetch(`http://localhost:5000/api/documents/test/view?t=${Date.now()}`);
        console.log(`📊 View endpoint response: ${viewResponse.status} ${viewResponse.statusText}`);
        
        if (viewResponse.ok) {
          const contentType = viewResponse.headers.get('content-type');
          console.log(`📋 Content-Type: ${contentType}`);
          
          if (contentType === 'application/pdf') {
            console.log('✅ PDF endpoint is working correctly');
          } else {
            console.log('⚠️ Unexpected content type');
          }
        } else {
          console.log('❌ PDF view endpoint failed');
        }
      }
    } else {
      console.log('❌ Uploads directory does not exist');
    }
    
    // Check 5: Check for any error logs
    console.log('\n4. Common issues to check:');
    console.log('   - Is the server running on port 5000?');
    console.log('   - Are there any PDF files in the uploads directory?');
    console.log('   - Check browser console for CORS errors');
    console.log('   - Check server console for file access errors');
    console.log('   - Verify PDF files are not corrupted');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

// Run the diagnostic
diagnosePdfLoading();
