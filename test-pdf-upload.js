const fs = require('fs');
const path = require('path');

// Test PDF upload and viewing functionality
async function testPdfUpload() {
  console.log('Testing PDF upload and viewing...');
  
  try {
    // Test 1: Check if server is running
    const response = await fetch('http://localhost:5000/api/health');
    if (!response.ok) {
      throw new Error(`Server health check failed: ${response.status}`);
    }
    console.log('✅ Server is running');
    
    // Test 2: Check if uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('⚠️ Uploads directory does not exist');
    } else {
      console.log('✅ Uploads directory exists');
    }
    
    // Test 3: Check if there are any PDF files in uploads
    const files = fs.readdirSync(uploadsDir).filter(file => file.endsWith('.pdf'));
    console.log(`📁 Found ${files.length} PDF files in uploads directory`);
    
    if (files.length > 0) {
      // Test 4: Try to access the first PDF file
      const testFile = files[0];
      console.log(`Testing access to: ${testFile}`);
      
      const filePath = path.join(uploadsDir, testFile);
      const stats = fs.statSync(filePath);
      console.log(`✅ File exists, size: ${stats.size} bytes`);
      
      // Test 5: Check if file is readable
      try {
        const fileContent = fs.readFileSync(filePath);
        console.log(`✅ File is readable, content length: ${fileContent.length} bytes`);
      } catch (error) {
        console.log(`❌ File is not readable: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPdfUpload();
