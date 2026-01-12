// Debug script for signature application
// Run this with: node debug-signatures.js

const testSignatureApplication = async () => {
  try {
    console.log("🔍 Testing signature application...");
    
    // Test 1: Check if server is running
    const healthCheck = await fetch("http://localhost:5000/api/debug/signatures/test");
    if (!healthCheck.ok) {
      console.log("❌ Server not responding or no test document");
      return;
    }
    
    console.log("✅ Server is running");
    
    // Test 2: Try to get a real document ID (you'll need to replace this with an actual document ID)
    console.log("\n📋 To test signature application:");
    console.log("1. Upload a PDF document first");
    console.log("2. Create a digital signature");
    console.log("3. Replace 'YOUR_DOCUMENT_ID' in the URL below with the actual document ID");
    console.log("4. Visit: http://localhost:5000/api/debug/signatures/YOUR_DOCUMENT_ID");
    
    console.log("\n🔧 Common issues to check:");
    console.log("- Database connection (check server console for DATABASE_URL errors)");
    console.log("- Document exists in database");
    console.log("- Signature exists in database");
    console.log("- User authentication (check if user ID matches)");
    console.log("- Position object structure (must include gridPosition)");
    
    console.log("\n🐛 Debugging signature creation:");
    console.log("1. Check browser console for 'useCreateSignature: userId =' logs");
    console.log("2. Check server console for 'Creating signature with data:' logs");
    console.log("3. Verify user is logged in and has an ID");
    console.log("4. Check if the signature form is submitting the correct data");
    
  } catch (error) {
    console.error("❌ Debug script error:", error.message);
  }
};

// Run the debug script
testSignatureApplication();
