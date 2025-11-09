#!/usr/bin/env tsx
/**
 * Generate Voice Preview Audio Files
 *
 * This script generates preview audio samples for all MVP voices
 * to be used in the voice selection UI.
 *
 * Usage:
 *   npm run generate:previews
 */

import { spawn } from 'child_process';
import { mkdirSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { MVP_VOICES } from '../src/lib/tts/voice-profiles';

// Preview text for voice samples
const PREVIEW_TEXT = 'Welcome to the BMAD AI video generator. This is a sample of the voice you have selected.';

// Ensure preview directory exists
const previewDir = resolve(process.cwd(), '.cache', 'audio', 'previews');
mkdirSync(previewDir, { recursive: true });

console.log('============================================================');
console.log('Voice Preview Generation');
console.log('============================================================');
console.log(`Preview Directory: ${previewDir}`);
console.log(`Preview Text: "${PREVIEW_TEXT}"`);
console.log(`Voices to generate: ${MVP_VOICES.length}`);
console.log('');

async function generatePreview(voiceId: string, modelId: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const outputPath = join(previewDir, `${voiceId}.mp3`);

    console.log(`Generating preview for ${voiceId} (model: ${modelId})...`);

    // Use the Python helper script
    const pythonPath = 'C:\\Program Files\\Python310\\python.exe';
    const scriptPath = resolve(process.cwd(), '..', 'scripts', 'generate-voice-preview.py');

    const python = spawn(pythonPath, [
      scriptPath,
      voiceId,
      modelId,
      PREVIEW_TEXT,
      outputPath
    ], {
      cwd: resolve(process.cwd(), '..'),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        if (existsSync(outputPath)) {
          const stats = statSync(outputPath);
          console.log(`  ✓ Created ${voiceId}.mp3 (${Math.round(stats.size / 1024)}KB)`);
          resolvePromise();
        } else {
          console.log(`  ✗ Failed to create ${voiceId}.mp3`);
          reject(new Error('File not created'));
        }
      } else {
        console.log(`  ✗ Error generating ${voiceId}: ${error}`);
        reject(new Error(error));
      }
    });
  });
}

async function main() {
  console.log('Starting preview generation...\n');

  let successCount = 0;
  let failCount = 0;

  for (const voice of MVP_VOICES) {
    try {
      await generatePreview(voice.id, voice.modelId);
      successCount++;
    } catch (error) {
      console.error(`Failed to generate preview for ${voice.id}:`, error);
      failCount++;
    }
  }

  console.log('\n============================================================');
  console.log('Generation Complete');
  console.log('============================================================');
  console.log(`Success: ${successCount}/${MVP_VOICES.length}`);
  if (failCount > 0) {
    console.log(`Failed: ${failCount}/${MVP_VOICES.length}`);
  }
  console.log(`\nPreview files location: ${previewDir}`);

  process.exit(failCount > 0 ? 1 : 0);
}

// Run the script
main().catch(console.error);