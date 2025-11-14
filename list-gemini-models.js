/**
 * List all models available with your Gemini API key
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyDFNDvhjeRc61YpN0nkTl0Qew7Ko7H10b8';

async function listAvailableModels() {
  console.log('Fetching available models from Gemini API...\n');

  const genAI = new GoogleGenerativeAI(API_KEY);

  try {
    // Try to list models using the SDK's built-in method
    const models = await genAI.listModels();

    console.log('✅ Available models:\n');
    console.log(JSON.stringify(models, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('Model names you can use:');
    console.log('='.repeat(60));

    models.forEach(model => {
      console.log(`- ${model.name}`);
    });

  } catch (error) {
    console.error('❌ Error listing models:');
    console.error(error.message);
    console.error('\nFull error:');
    console.error(error);

    console.log('\n' + '='.repeat(60));
    console.log('TROUBLESHOOTING:');
    console.log('='.repeat(60));
    console.log('1. Verify your API key at: https://aistudio.google.com/apikey');
    console.log('2. Check if Gemini API is enabled for your project');
    console.log('3. Ensure you have accepted Google AI Studio terms of service');
    console.log('4. Try generating a new API key');
    console.log('5. Check if your region has access to Gemini models');
  }
}

listAvailableModels();
