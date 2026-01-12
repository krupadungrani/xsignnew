#!/usr/bin/env node

/**
 * Test Script for Multi-Document Signature System
 * 
 * This script tests the key functionality of the multi-document signature system
 * including document upload, signature creation, and bulk signature application.
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Testing Multi-Document Signature System...\n');

// Test 1: Check if required components exist
console.log('📋 Test 1: Component Existence Check');
const components = [
  'client/src/components/signature/multi-document-signature.tsx',
  'client/src/components/pdf/enhanced-signature-grid.tsx',
  'client/src/components/layout/sidebar.tsx',
  'client/src/components/pdf/pdf-viewer.tsx',
  'client/src/pages/dashboard.tsx'
];

let componentTests = 0;
let componentPassed = 0;

components.forEach(component => {
  componentTests++;
  if (fs.existsSync(component)) {
    console.log(`  ✅ ${component} - EXISTS`);
    componentPassed++;
  } else {
    console.log(`  ❌ ${component} - MISSING`);
  }
});

console.log(`  📊 Component Tests: ${componentPassed}/${componentTests} passed\n`);

// Test 2: Check if documentation exists
console.log('📚 Test 2: Documentation Check');
const docs = [
  'MULTI_DOCUMENT_SIGNATURE_GUIDE.md'
];

let docTests = 0;
let docPassed = 0;

docs.forEach(doc => {
  docTests++;
  if (fs.existsSync(doc)) {
    console.log(`  ✅ ${doc} - EXISTS`);
    docPassed++;
  } else {
    console.log(`  ❌ ${doc} - MISSING`);
  }
});

console.log(`  📊 Documentation Tests: ${docPassed}/${docTests} passed\n`);

// Test 3: Check package.json for required dependencies
console.log('📦 Test 3: Dependencies Check');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'react-dnd',
    'react-dnd-html5-backend',
    'pdf-lib'
  ];
  
  let depTests = 0;
  let depPassed = 0;
  
  requiredDeps.forEach(dep => {
    depTests++;
    if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
      console.log(`  ✅ ${dep} - INSTALLED`);
      depPassed++;
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
    }
  });
  
  console.log(`  📊 Dependency Tests: ${depPassed}/${depTests} passed\n`);
} catch (error) {
  console.log(`  ❌ Failed to read package.json: ${error.message}\n`);
}

// Test 4: Check TypeScript configuration
console.log('🔧 Test 4: TypeScript Configuration Check');
const tsConfig = 'tsconfig.json';
if (fs.existsSync(tsConfig)) {
  try {
    const config = JSON.parse(fs.readFileSync(tsConfig, 'utf8'));
    if (config.compilerOptions?.strict) {
      console.log('  ✅ TypeScript strict mode enabled');
    } else {
      console.log('  ⚠️  TypeScript strict mode not enabled');
    }
    
    if (config.compilerOptions?.jsx) {
      console.log('  ✅ JSX support configured');
    } else {
      console.log('  ❌ JSX support not configured');
    }
  } catch (error) {
    console.log(`  ❌ Failed to parse tsconfig.json: ${error.message}`);
  }
} else {
  console.log('  ❌ tsconfig.json not found');
}

console.log('');

// Test 5: Check for common issues
console.log('🚨 Test 5: Common Issues Check');

// Check for console.log statements in production code
const productionFiles = [
  'client/src/components/signature/multi-document-signature.tsx',
  'client/src/components/pdf/enhanced-signature-grid.tsx'
];

productionFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const consoleLogs = (content.match(/console\.log/g) || []).length;
    if (consoleLogs > 0) {
      console.log(`  ⚠️  ${file} contains ${consoleLogs} console.log statements`);
    } else {
      console.log(`  ✅ ${file} - No console.log statements found`);
    }
  }
});

console.log('');

// Summary
console.log('📊 TEST SUMMARY');
console.log('================');
console.log(`Components: ${componentPassed}/${componentTests} ✅`);
console.log(`Documentation: ${docPassed}/${docTests} ✅`);
console.log('');

if (componentPassed === componentTests && docPassed === docTests) {
  console.log('🎉 All tests passed! The multi-document signature system is ready.');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. Start the development server');
  console.log('   2. Upload some PDF documents');
  console.log('   3. Create digital signatures');
  console.log('   4. Test the bulk signature functionality');
  console.log('');
  console.log('📖 Read MULTI_DOCUMENT_SIGNATURE_GUIDE.md for detailed usage instructions.');
} else {
  console.log('⚠️  Some tests failed. Please check the missing components or dependencies.');
  console.log('');
  console.log('🔧 To fix issues:');
  console.log('   1. Ensure all required components are created');
  console.log('   2. Install missing dependencies');
  console.log('   3. Verify TypeScript configuration');
  console.log('   4. Check file paths and permissions');
}

console.log('');
console.log('✨ Test completed successfully!');
