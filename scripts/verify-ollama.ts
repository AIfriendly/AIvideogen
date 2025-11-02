#!/usr/bin/env node
/**
 * Ollama Connection Verification Script
 * Tests AC5: Ollama service and llama3.2 model accessibility
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface OllamaTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: OllamaTestResult[] = [];

async function runTests() {
  console.log('🔍 Ollama Integration Verification\n');
  console.log('Testing AC5: Ollama Connection\n');

  // Load environment configuration
  let ollamaBaseUrl = 'http://localhost:11434';
  let ollamaModel = 'llama3.2';

  try {
    const envLocal = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
    const urlMatch = envLocal.match(/OLLAMA_BASE_URL=(.+)/);
    const modelMatch = envLocal.match(/OLLAMA_MODEL=(.+)/);

    if (urlMatch) ollamaBaseUrl = urlMatch[1].trim();
    if (modelMatch) ollamaModel = modelMatch[1].trim();

    results.push({
      name: 'Environment configuration loaded',
      passed: true,
      message: `✅ Loaded config: ${ollamaBaseUrl}, model: ${ollamaModel}`
    });
  } catch (error) {
    results.push({
      name: 'Environment configuration',
      passed: false,
      message: `⚠️ Could not load .env.local, using defaults`,
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 1: Check if Ollama server is reachable
  console.log(`Testing connection to ${ollamaBaseUrl}...`);

  try {
    const response = await fetch(ollamaBaseUrl);
    const isRunning = response.status === 200 || response.status === 404; // 404 is OK, means server is up

    results.push({
      name: 'Ollama server reachable',
      passed: isRunning,
      message: isRunning
        ? `✅ Ollama server is running at ${ollamaBaseUrl}`
        : `❌ Ollama server not responding at ${ollamaBaseUrl}`,
      details: `HTTP Status: ${response.status}`
    });

    if (!isRunning) {
      throw new Error('Server not reachable');
    }
  } catch (error) {
    results.push({
      name: 'Ollama server connection',
      passed: false,
      message: `❌ Failed to connect to Ollama at ${ollamaBaseUrl}`,
      details: error instanceof Error ? error.message : String(error)
    });
    printResults();
    process.exit(1);
  }

  // Test 2: List available models
  console.log('Checking for available models...');

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json() as { models?: Array<{ name: string }> };
    const models = data.models || [];
    const modelNames = models.map(m => m.name);

    results.push({
      name: 'List models API',
      passed: true,
      message: `✅ Retrieved ${models.length} available models`,
      details: modelNames.join(', ') || 'No models found'
    });

    // Test 3: Check if llama3.2 model is installed
    const hasLlama32 = modelNames.some(name => name.includes('llama3.2'));

    results.push({
      name: 'llama3.2 model installed',
      passed: hasLlama32,
      message: hasLlama32
        ? `✅ llama3.2 model is installed`
        : `❌ llama3.2 model not found. Available models: ${modelNames.join(', ')}`,
      details: hasLlama32 ? `Found in: ${modelNames.filter(n => n.includes('llama3.2')).join(', ')}` : undefined
    });

    if (!hasLlama32) {
      console.log('\n⚠️  To install llama3.2, run: ollama pull llama3.2\n');
    }

  } catch (error) {
    results.push({
      name: 'List models',
      passed: false,
      message: `❌ Failed to list models`,
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 4: Test basic model query (if model is available)
  const hasModel = results.find(r => r.name === 'llama3.2 model installed')?.passed;

  if (hasModel) {
    console.log('Testing model response...');

    try {
      const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: 'Say "Hello" in one word.',
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json() as { response?: string };
      const modelResponse = data.response || '';

      results.push({
        name: 'Model query test',
        passed: modelResponse.length > 0,
        message: modelResponse.length > 0
          ? `✅ Model responded successfully`
          : `❌ Model returned empty response`,
        details: `Response: "${modelResponse.trim().substring(0, 100)}"`
      });

    } catch (error) {
      results.push({
        name: 'Model query test',
        passed: false,
        message: `❌ Failed to query model`,
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  printResults();

  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

function printResults() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AC5 Verification Results\n');

  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
  });

  const totalPassed = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const allPassed = totalTests === totalPassed;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n${allPassed ? '✅' : '⚠️'} Overall: ${totalPassed}/${totalTests} checks passed\n`);

  if (!allPassed) {
    console.log('ℹ️  To fix Ollama issues:');
    console.log('   1. Install Ollama: https://ollama.com');
    console.log('   2. Start Ollama service');
    console.log('   3. Pull llama3.2 model: ollama pull llama3.2\n');
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
