#!/usr/bin/env tsx
/**
 * Generate 3-Minute DVIDS Military Video
 *
 * This script creates a complete 3-minute video using:
 * - DVIDS official API (via MCP server)
 * - Groq for script generation
 * - Kokoro TTS for voiceover
 * - FFmpeg for video assembly
 *
 * Usage: npx tsx scripts/generate-dvids-test-video.ts
 */

import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_API = 'http://localhost:3000/api/projects';

// Colors for terminal output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RED = '\x1b[31m';
const BRIGHT = '\x1b[1m';
const RESET = '\x1b[0m';

function log(msg: string, color = '') {
  console.log(`${color}${msg}${RESET}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, BRIGHT);
  console.log('='.repeat(60));
}

async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${PROJECTS_API}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error (${response.status}): ${error}`);
  }

  return response.json();
}

async function main() {
  try {
    section('STEP 1: Create Project');

    // Create a new project with military topic
    const createResult = await fetchAPI('', {
      method: 'POST',
      body: JSON.stringify({
        name: 'DVIDS Test Video - 3 Minutes',
        topic: 'Modern Military Training: From Basic Drill to Advanced Tactical Operations',
        system_prompt_id: null, // Will use default
      }),
    });

    const projectId = createResult.project.id;
    log(`✅ Project created: ${projectId}`, GREEN);
    log(`   Topic: Modern Military Training`, BLUE);

    // Select a persona (use default)
    log('\n📝 Selecting default persona...', BLUE);
    await fetchAPI(`/${projectId}/select-persona`, {
      method: 'POST',
      body: JSON.stringify({ personaId: 'default' }),
    });
    log('✅ Persona selected', GREEN);

    section('STEP 2: Generate Script');

    // Generate script for 3-minute video (approximately 18-20 scenes at 10s each)
    log('⏳ Generating script for 3-minute video...', YELLOW);
    log('   Target: ~18 scenes × 10s each = 180 seconds (3 minutes)', BLUE);

    const scriptResult = await fetchAPI(`/${projectId}/generate-script`, {
      method: 'POST',
      body: JSON.stringify({
        numScenes: 18, // More scenes for 3-minute video
        context: {
          provider: 'dvids', // Use DVIDS for visuals
          branch: 'Army',    // Focus on Army content
          category: 'Training',
        },
      }),
    });

    log(`✅ Script generated: ${scriptResult.scenes?.length || 0} scenes`, GREEN);

    // Display first few scenes
    const scenes = scriptResult.scenes || [];
    log('\n   Sample scenes:', BLUE);
    scenes.slice(0, 3).forEach((scene: any, i: number) => {
      log(`   ${i + 1}. ${scene.text?.substring(0, 80)}...`);
    });
    log(`   ... and ${scenes.length - 3} more scenes`);

    section('STEP 3: Generate Voiceovers');

    log('⏳ Generating voiceovers with Kokoro TTS...', YELLOW);
    log('   This may take a few minutes for 18 scenes...', BLUE);

    const voiceoverResult = await fetchAPI(`/${projectId}/generate-voiceovers`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    log(`✅ Voiceovers generated: ${voiceoverResult.completed}/${voiceoverResult.total}`, GREEN);
    log(`   Total duration: ${Math.floor(voiceoverResult.totalDuration)}s`, BLUE);

    section('STEP 4: Source Visuals from DVIDS');

    log('⏳ Sourcing visuals from DVIDS official API...', YELLOW);
    log('   Using MCP server with API key authentication', BLUE);

    const visualsResult = await fetchAPI(`/${projectId}/generate-visuals`, {
      method: 'POST',
      body: JSON.stringify({
        provider: 'dvids',
        maxDuration: 90, // Short clips for dynamic content
        maxResults: 5, // Get multiple options per scene
      }),
    });

    log(`✅ Visuals sourced for ${visualsResult.completed} scenes`, GREEN);
    log(`   Provider: DVIDS (Official API)`, BLUE);

    section('STEP 5: Auto-Select Visuals');

    log('⏳ Auto-selecting best clips for each scene...', YELLOW);

    const selectResult = await fetchAPI(`/${projectId}/auto-select-visuals`, {
      method: 'POST',
    });

    log(`✅ Auto-selected clips for ${selectResult.selected} scenes`, GREEN);
    log(`   Selection method: CV-score based`, BLUE);

    section('STEP 6: Assemble Video');

    log('⏳ Assembling final video with FFmpeg...', YELLOW);
    log('   This may take 5-10 minutes for 3-minute video...', BLUE);

    const assembleResult = await fetchAPI(`/${projectId}/assemble`, {
      method: 'POST',
    });

    log(`✅ Video assembly started!`, GREEN);
    log(`   Assembly Job ID: ${assembleResult.assemblyJobId}`, BLUE);

    section('MONITORING ASSEMBLY PROGRESS');

    // Poll for assembly status
    let assemblyComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes (10s intervals)

    while (!assemblyComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s

      const statusResult = await fetchAPI(`/${projectId}/assembly-status`);
      const status = statusResult.status;

      if (status === 'complete') {
        assemblyComplete = true;
        log('✅ ASSEMBLY COMPLETE!', GREEN);
        log(`   Progress: ${statusResult.progress?.processedScenes || 0}/${statusResult.progress?.totalScenes || 0} scenes`, BLUE);
        log(`   Video path: ${statusResult.videoPath}`, BLUE);
        log(`   Thumbnail path: ${statusResult.thumbnailPath}`, BLUE);
      } else if (status === 'error') {
        log(`❌ ASSEMBLY FAILED: ${statusResult.error}`, RED);
        break;
      } else {
        const progress = statusResult.progress;
        log(`   [${attempts + 1}/${maxAttempts}] Status: ${status} | Scenes: ${progress?.processedScenes || 0}/${progress?.totalScenes || 0}`, YELLOW);
      }

      attempts++;
    }

    if (!assemblyComplete) {
      log('⚠️  Assembly monitoring timed out after 10 minutes', YELLOW);
      log('   Check the project page for current status:', BLUE);
      log(`   http://localhost:3000/projects/${projectId}`, BLUE);
    } else {
      section('✅ VIDEO GENERATION COMPLETE!');

      log(`🎉 Success! Your 3-minute DVIDS video is ready!`, GREEN);
      log('', BLUE);
      log(`📂 Project ID: ${projectId}`, BLUE);
      log(`🎬 Watch/Download: http://localhost:3000/projects/${projectId}/export`, BLUE);
      log(`   Video path: ${statusResult.videoPath}`, BLUE);
      log(`   Thumbnail: ${statusResult.thumbnailPath}`, BLUE);
    }

  } catch (error) {
    section('❌ ERROR');
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, RED);
    log('', RED);
    log('Troubleshooting:', YELLOW);
    log('1. Make sure the dev server is running: npm run dev');
    log('2. Make sure DVIDS MCP server is configured correctly');
    log('3. Check API key in .env.local: DVIDS_API_KEY');
    log('4. Check Kokoro TTS is installed');
    log('5. Check FFmpeg is installed');
    process.exit(1);
  }
}

main();
