/**
 * Gemini API Model Availability Test
 * Run this to see which models your API key can access
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = '';

async function testGeminiModels() {
  console.log('Testing Gemini API access...\n');

  const genAI = new GoogleGenerativeAI(API_KEY);

  // Test different model name formats
  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-pro',
    'gemini-1.5-flash-001',
    'gemini-1.5-pro-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro-002',
  ];

  console.log('Testing model names:\n');

  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "test successful" if you can read this.');
      const response = result.response.text();

      console.log(`✅ ${modelName} - WORKS`);
      console.log(`   Response: ${response.substring(0, 50)}...\n`);
    } catch (error) {
      const errorMsg = error.message || error.toString();
      if (errorMsg.includes('not found')) {
        console.log(`❌ ${modelName} - NOT FOUND (404)`);
      } else if (errorMsg.includes('API key')) {
        console.log(`❌ ${modelName} - API KEY ISSUE`);
      } else if (errorMsg.includes('quota')) {
        console.log(`❌ ${modelName} - QUOTA EXCEEDED`);
      } else {
        console.log(`❌ ${modelName} - ERROR: ${errorMsg.substring(0, 60)}...`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60));
}

testGeminiModels().catch(console.error);
