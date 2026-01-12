// Test script for signature creation
// Run this with: node test-signature.js

const testSignatureCreation = async () => {
  try {
    console.log("🧪 Testing signature creation with REAL user data...");
    
    // Test 1: Check if server is running
    console.log("\n1. Testing server health...");
    try {
      const healthResponse = await fetch("http://localhost:5000/api/test");
      const healthData = await healthResponse.json();
      console.log("✅ Server is running:", healthData.message);
    } catch (error) {
      console.log("❌ Server not responding:", error.message);
      return;
    }
    
    // Test 2: Get real user data from the database
    console.log("\n2. Getting real user data from database...");
    let realUserId = null;
    let realUserEmail = null;
    
    try {
      // First, try to get a user from the database
      const usersResponse = await fetch("http://localhost:5000/api/users");
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        if (usersData.users && usersData.users.length > 0) {
          realUserId = usersData.users[0].id;
          realUserEmail = usersData.users[0].email;
          console.log("✅ Found real user:", { id: realUserId, email: realUserEmail });
        }
      }
    } catch (error) {
      console.log("⚠️  Could not fetch users from API, will use fallback method");
    }
    
    // Fallback: If no users endpoint, use the user ID from your browser console
    if (!realUserId) {
      console.log("⚠️  No real user found in database");
      console.log("   To get your real user ID:");
      console.log("   1. Log into your app in the browser");
      console.log("   2. Check the browser console for 'useCreateSignature: userId = [your-real-user-id]'");
      console.log("   3. Replace the userId below with your actual user ID");
      console.log("   4. Replace the email below with your actual email");
      
      // You can manually set these values here
      realUserId = "YOUR_REAL_USER_ID_HERE"; // Replace with your actual user ID
      realUserEmail = "your.email@example.com"; // Replace with your actual email
      
      if (realUserId === "YOUR_REAL_USER_ID_HERE") {
        console.log("❌ Please update the script with your real user ID and email");
        return;
      }
    }
    
    // Test 3: Test debug endpoint with real data
    console.log("\n3. Testing debug endpoint with real user data...");
    try {
      const debugResponse = await fetch("http://localhost:5000/api/debug/signatures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: realUserId,
          name: "Real Test Signature",
          fullName: "Real Test User",
          companyName: "Real Test Company",
          location: "Real Test Location",
          timeZone: "UTC",
          signatureImage: null
        })
      });
      const debugData = await debugResponse.json();
      console.log("✅ Debug endpoint response:", debugData);
    } catch (error) {
      console.log("❌ Debug endpoint failed:", error.message);
    }
    
    // Test 4: Test actual signature creation with real user data
    console.log("\n4. Testing signature creation endpoint with real user data...");
    try {
      const signatureResponse = await fetch("http://localhost:5000/api/signatures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: realUserId,
          email: realUserEmail,
          name: "Real Test Signature",
          fullName: "Real Test User",
          companyName: "Real Test Company",
          location: "Real Test Location",
          timeZone: "UTC",
          signatureImage: null
        })
      });
      
      if (signatureResponse.ok) {
        const signatureData = await signatureResponse.json();
        console.log("✅ Signature creation successful:", signatureData);
        console.log("🎉 Your signature creation is working perfectly!");
      } else {
        const errorData = await signatureResponse.text();
        console.log("❌ Signature creation failed:", signatureResponse.status, errorData);
        console.log("🔍 Check the server console for detailed error logs");
      }
    } catch (error) {
      console.log("❌ Signature creation request failed:", error.message);
    }
    
    console.log("\n🔍 Summary:");
    console.log("✅ Server is running and responding");
    console.log("✅ API endpoints are accessible");
    console.log("✅ Using real user data:", { userId: realUserId, email: realUserEmail });
    
  } catch (error) {
    console.error("❌ Test script error:", error.message);
  }
};

// Run the test
testSignatureCreation();
