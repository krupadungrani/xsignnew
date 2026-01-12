// Simple test to verify drag functionality
console.log('🧪 Testing drag functionality...');

// Check if the app is running
fetch('http://localhost:5173')
  .then(response => {
    if (response.ok) {
      console.log('✅ App is running on localhost:5173');
      console.log('📋 Manual Test Instructions:');
      console.log('1. Open your browser to http://localhost:5173');
      console.log('2. Upload a PDF document');
      console.log('3. Apply a signature to any grid position');
      console.log('4. Click the "Drag to move" button on the signature');
      console.log('5. Try dragging the signature to a custom location');
      console.log('6. Verify that:');
      console.log('   - PDF doesn\'t disappear or show loader');
      console.log('   - Signature moves smoothly');
      console.log('   - Signature stays within PDF boundaries');
      console.log('   - You can save the custom position');
      console.log('');
      console.log('🎯 Expected Behavior:');
      console.log('- Smooth dragging without PDF interference');
      console.log('- No PDF reloading or loader appearing');
      console.log('- Signature moves with mouse cursor');
      console.log('- Save options work for custom positions');
    } else {
      console.log('❌ App is not responding properly');
    }
  })
  .catch(error => {
    console.log('❌ Cannot connect to app:', error.message);
    console.log('💡 Make sure to run: cd client && npm run dev');
  });
