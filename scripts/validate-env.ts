#!/usr/bin/env tsx

/**
 * Environment Variable Validation Script
 *
 * Validates that all required environment variables are properly configured
 * for the AI Video Generator application.
 *
 * Usage:
 *   npm run validate:env
 *
 * Exit Codes:
 *   0 - All environment variables valid
 *   1 - Validation failures detected
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ .env.local file not found');
  console.error('   Create .env.local from .env.local.example');
  process.exit(1);
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates YouTube API configuration
 */
function validateYouTubeConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check YOUTUBE_API_KEY
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    errors.push('YOUTUBE_API_KEY not configured');
    errors.push('  → Get API key from: https://console.cloud.google.com/apis/credentials');
    errors.push('  → Add to .env.local: YOUTUBE_API_KEY=your_actual_key');
  } else if (!/^[A-Za-z0-9_-]{39,}$/.test(apiKey)) {
    warnings.push('YOUTUBE_API_KEY format appears invalid (expected 39+ alphanumeric characters)');
    warnings.push('  → Verify key in Google Cloud Console');
  }

  // Check quota limit
  const quotaLimit = process.env.YOUTUBE_API_QUOTA_LIMIT;
  if (quotaLimit && (isNaN(Number(quotaLimit)) || Number(quotaLimit) <= 0)) {
    warnings.push('YOUTUBE_API_QUOTA_LIMIT must be a positive number (default: 10000)');
  }

  // Check rate limit
  const rateLimit = process.env.YOUTUBE_API_RATE_LIMIT;
  if (rateLimit && (isNaN(Number(rateLimit)) || Number(rateLimit) <= 0)) {
    warnings.push('YOUTUBE_API_RATE_LIMIT must be a positive number (default: 100)');
  }

  // Check rate window
  const rateWindow = process.env.YOUTUBE_API_RATE_WINDOW;
  if (rateWindow && (isNaN(Number(rateWindow)) || Number(rateWindow) <= 0)) {
    warnings.push('YOUTUBE_API_RATE_WINDOW must be a positive number (default: 100000)');
  }

  // Check timeout
  const timeout = process.env.YOUTUBE_API_TIMEOUT;
  if (timeout && (isNaN(Number(timeout)) || Number(timeout) <= 0)) {
    warnings.push('YOUTUBE_API_TIMEOUT must be a positive number (default: 30000)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates LLM provider configuration
 */
function validateLLMConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const provider = process.env.LLM_PROVIDER || 'ollama';

  if (provider === 'ollama') {
    const baseUrl = process.env.OLLAMA_BASE_URL;
    if (!baseUrl) {
      warnings.push('OLLAMA_BASE_URL not set (using default: http://localhost:11434)');
    }

    const model = process.env.OLLAMA_MODEL;
    if (!model) {
      warnings.push('OLLAMA_MODEL not set (using default: llama3.2:3b)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates database configuration
 */
function validateDatabaseConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const dbPath = process.env.DATABASE_PATH;
  if (!dbPath) {
    warnings.push('DATABASE_PATH not set (using default: ./data/app.db)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Main validation function
 */
function main() {
  console.log('🔍 Validating environment configuration...\n');

  const results = {
    youtube: validateYouTubeConfig(),
    llm: validateLLMConfig(),
    database: validateDatabaseConfig()
  };

  let hasErrors = false;
  let hasWarnings = false;

  // Display results for each category
  for (const [category, result] of Object.entries(results)) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

    if (result.errors.length > 0) {
      hasErrors = true;
      console.log(`❌ ${categoryName} Configuration - ERRORS:`);
      result.errors.forEach(error => console.log(`   ${error}`));
      console.log('');
    } else if (result.warnings.length > 0) {
      hasWarnings = true;
      console.log(`⚠️  ${categoryName} Configuration - WARNINGS:`);
      result.warnings.forEach(warning => console.log(`   ${warning}`));
      console.log('');
    } else {
      console.log(`✅ ${categoryName} Configuration - OK`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (hasErrors) {
    console.log('❌ Validation FAILED - Fix errors above');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Validation PASSED with warnings');
    console.log('   Application may function with reduced capabilities');
    process.exit(0);
  } else {
    console.log('✅ Validation PASSED - All configurations valid');
    process.exit(0);
  }
}

// Run validation
main();
