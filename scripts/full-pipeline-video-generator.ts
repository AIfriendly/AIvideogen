#!/usr/bin/env tsx
/**
 * Full Pipeline Video Generator
 *
 * Autonomous end-to-end video generation script that:
 * 1. Creates a project with a specified topic
 * 2. Generates script using LLM (Groq/Gemini/Ollama)
 * 3. Generates voiceovers using TTS (Kokoro)
 * 4. Generates visuals using DVIDS MCP provider
 * 5. Downloads and trims video clips
 * 6. Selects clips for each scene
 * 7. Assembles the final video
 *
 * Usage:
 *   tsx scripts/full-pipeline-video-generator.ts "Topic: Military Aviation" [duration_minutes]
 *   tsx scripts/full-pipeline-video-generator.ts "Black Holes: The Universe's Most Mysterious Objects" 3
 *
 * @module scripts/full-pipeline-video-generator
 */

// Load environment variables first
import { config } from 'dotenv';
// Try loading from .env.local first, then fall back to .env
const envLoaded = config({ path: '.env.local' }).error !== undefined;
if (!envLoaded) {
  config(); // Try .env as fallback
}

import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  createProject,
  updateProject,
  getProject,
} from '../src/lib/db/queries';
import {
  createScenes,
  getScenesByProjectId,
  updateSceneAudio,
  updateProjectDuration,
  updateSceneSelectedClip,
} from '../src/lib/db/queries';
import { generateScriptWithRetry } from '../src/lib/llm/script-generator';
import { createLLMProvider } from '../src/lib/llm/factory';
import { generateVoiceoversWithProgress } from '../src/lib/tts/voiceover-generator';
import { generateVisuals } from '../src/lib/pipeline/visual-generation';
import { getVisualSuggestionsByProject, getVisualSuggestions } from '../src/lib/db/queries';
import { VideoAssembler } from '../src/lib/video/assembler';
import { Trimmer } from '../src/lib/video/trimmer';
import { FFmpegClient } from '../src/lib/video/ffmpeg';
import { downloadVideo } from '../src/lib/download/universal-downloader';
import type { AssemblyScene } from '../src/lib/video/assembler';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Default voice for TTS (use a valid voice name)
  defaultVoice: 'sarah', // Changed from 'default' to valid voice

  // Visual generation options
  visuals: {
    providerId: 'dvids', // Use DVIDS MCP provider
    averageClipDuration: 8, // seconds
    minClipsPerScene: 3,
  },

  // Download options
  download: {
    maxHeight: 720, // 720p
    tempDir: '.cache/temp',
  },

  // Output directory
  outputDir: 'output',
};

// ============================================================================
// Types
// ============================================================================

interface PipelineResult {
  success: boolean;
  projectId: string;
  projectTopic: string;
  totalScenes: number;
  totalDuration: number;
  videoPath?: string;
  thumbnailPath?: string;
  errors: string[];
  stageResults: {
    script: boolean;
    voiceover: boolean;
    visuals: boolean;
    download: boolean;
    assembly: boolean;
  };
}

interface PipelineOptions {
  topic: string;
  targetDurationMinutes: number;
  sceneCount?: number;
  voiceId?: string;
  onProgress?: (stage: string, message: string) => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

function log(stage: string, message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${stage}] ${message}`);
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Pipeline Stages
// ============================================================================

/**
 * Stage 1: Create Project
 */
async function stageCreateProject(topic: string): Promise<{ projectId: string }> {
  log('PROJECT', `Creating project for topic: "${topic}"`);

  const project = createProject(topic);
  log('PROJECT', `✓ Created project ${project.id}`);

  return { projectId: project.id };
}

/**
 * Stage 2: Generate Script
 */
async function stageGenerateScript(
  projectId: string,
  topic: string,
  targetDurationMinutes: number,
  sceneCount?: number
): Promise<void> {
  log('SCRIPT', `Generating script for ${targetDurationMinutes}-minute video...`);

  // Calculate script configuration
  const wordsPerMinute = 140; // Average speaking rate
  const targetWords = targetDurationMinutes * wordsPerMinute;
  const scenes = sceneCount || Math.max(6, Math.ceil(targetDurationMinutes * 2));

  const projectConfig = {
    estimatedWords: targetWords,
    sceneCount: scenes,
    targetDuration: targetDurationMinutes * 60, // seconds
  };

  log('SCRIPT', `Target: ${targetWords} words in ${scenes} scenes (~${Math.round(targetWords / scenes)} words/scene)`);

  // Generate script with retry (using 'groq' provider explicitly)
  const result = await generateScriptWithRetry(topic, projectConfig, 6, null, 'groq');

  log('SCRIPT', `✓ Generated ${result.scenes.length} scenes in ${result.attempts} attempts (validation score: ${result.validationScore}/100)`);

  // Save scenes to database
  const scenesToCreate = result.scenes.map(scene => ({
    project_id: projectId,
    scene_number: scene.sceneNumber,
    text: scene.text,
  }));

  createScenes(scenesToCreate);
  log('SCRIPT', `✓ Saved ${scenesToCreate.length} scenes to database`);

  // Update project with topic
  const db = require('../src/lib/db/client').default;
  db.prepare('UPDATE projects SET topic = ? WHERE id = ?').run(topic, projectId);
}

/**
 * Stage 3: Generate Voiceovers (with fallback to placeholder durations)
 */
async function stageGenerateVoiceovers(
  projectId: string,
  voiceId: string
): Promise<void> {
  log('VOICEOVER', `Generating voiceovers with voice: ${voiceId}...`);

  const scenes = getScenesByProjectId(projectId);
  log('VOICEOVER', `Processing ${scenes.length} scenes...`);

  // First, try actual TTS generation
  const result = await generateVoiceoversWithProgress(
    projectId,
    scenes,
    voiceId,
    (current, total) => {
      log('VOICEOVER', `Progress: ${current}/${total} scenes (${Math.round(current / total * 100)}%)`);
    }
  );

  log('VOICEOVER', `✓ Voiceover generation complete:`);
  log('VOICEOVER', `  - Completed: ${result.completed}`);
  log('VOICEOVER', `  - Skipped: ${result.skipped}`);
  log('VOICEOVER', `  - Failed: ${result.failed}`);
  log('VOICEOVER', `  - Total duration: ${result.totalDuration}s (${Math.floor(result.totalDuration / 60)}m ${Math.round(result.totalDuration % 60)}s)`);

  if (result.errors && result.errors.length > 0) {
    log('VOICEOVER', `  - Errors: ${result.errors.length}`);
    result.errors.forEach(err => log('VOICEOVER', `    • Scene ${err.sceneNumber}: ${err.error}`));
  }

  // If TTS failed completely, use placeholder durations based on word count
  if (result.totalDuration === 0 && result.completed === 0) {
    log('VOICEOVER', `⚠ TTS failed to generate any audio. Using placeholder durations based on word count...`);

    const db = require('../src/lib/db/client').default;
    const scenesWithoutDuration = db.prepare('SELECT id, text FROM scenes WHERE project_id = ? AND (duration IS NULL OR duration = 0)').all(projectId);

    for (const scene of scenesWithoutDuration) {
      // Estimate duration: ~140 words per minute = 2.33 words per second
      const wordCount = scene.text.trim().split(/\s+/).length;
      const estimatedDuration = Math.max(5, Math.round(wordCount / 2.33)); // Minimum 5 seconds

      db.prepare('UPDATE scenes SET duration = ? WHERE id = ?').run(estimatedDuration, scene.id);
      log('VOICEOVER', `  Scene: Estimated ${estimatedDuration}s from ${wordCount} words`);
    }

    log('VOICEOVER', `✓ Placeholder durations set`);
  }
}

/**
 * Stage 4: Generate Visuals
 */
async function stageGenerateVisuals(
  projectId: string
): Promise<void> {
  log('VISUALS', `Generating visuals using DVIDS MCP provider...`);

  const scenes = getScenesByProjectId(projectId);
  log('VISUALS', `Searching for visuals for ${scenes.length} scenes...`);

  const result = await generateVisuals(
    projectId,
    scenes,
    { domain: { type: 'military' } }, // RAG context
    {
      providerId: CONFIG.visuals.providerId,
      averageClipDuration: CONFIG.visuals.averageClipDuration,
      minClipsPerScene: CONFIG.visuals.minClipsPerScene,
      onProgress: (sceneNumber, status) => {
        log('VISUALS', `Scene ${sceneNumber}: ${status}`);
      },
    }
  );

  log('VISUALS', `✓ Visual generation complete:`);
  log('VISUALS', `  - Scenes with results: ${result.completed}`);
  log('VISUALS', `  - Total suggestions: ${result.totalSuggestions}`);
  log('VISUALS', `  - Total duration: ${result.totalDuration}s (target: ${result.targetDuration}s)`);

  if (result.errors && result.errors.length > 0) {
    log('VISUALS', `  - Errors: ${result.errors.length}`);
    result.errors.forEach(err => log('VISUALS', `    • Scene ${err.sceneNumber}: ${err.error}`));
  }
}

/**
 * Stage 5: Select Clips
 */
async function stageSelectClips(
  projectId: string
): Promise<void> {
  log('SELECTION', `Selecting best clip for each scene...`);

  const scenes = getScenesByProjectId(projectId);
  let selectedCount = 0;

  for (const scene of scenes) {
    const suggestions = getVisualSuggestions(scene.id);

    if (suggestions.length === 0) {
      log('SELECTION', `⚠ Scene ${scene.scene_number}: No visual suggestions available`);
      continue;
    }

    // Select the first (highest-ranked) clip for each scene
    const bestClip = suggestions[0];
    updateSceneSelectedClip(scene.id, bestClip.id);
    selectedCount++;

    log('SELECTION', `Scene ${scene.scene_number}: Selected "${bestClip.title}" (${bestClip.duration}s) from ${bestClip.provider}`);
  }

  log('SELECTION', `✓ Selected clips for ${selectedCount}/${scenes.length} scenes`);
}

/**
 * Stage 6: Download Videos
 */
async function stageDownloadVideos(
  projectId: string
): Promise<Map<string, string>> {
  log('DOWNLOAD', `Downloading videos for all scenes...`);

  const scenes = getScenesByProjectId(projectId);
  const tempDir = path.join(process.cwd(), CONFIG.download.tempDir);
  ensureDir(tempDir);

  const downloadedPaths = new Map<string, string>(); // sceneId -> downloadedPath

  for (const scene of scenes) {
    if (!scene.selected_clip_id) {
      log('DOWNLOAD', `⚠ Scene ${scene.scene_number}: No clip selected, skipping`);
      continue;
    }

    // Get the selected visual suggestion
    const suggestions = getVisualSuggestions(scene.id);
    const selected = suggestions.find(s => s.id === scene.selected_clip_id);

    if (!selected) {
      log('DOWNLOAD', `⚠ Scene ${scene.scene_number}: Selected clip not found, skipping`);
      continue;
    }

    const outputPath = path.join(tempDir, `scene-${scene.scene_number}-${selected.video_id}.mp4`);
    const audioDuration = scene.duration || 10;

    // Skip download if no audio file (placeholder duration was used)
    if (!scene.audio_file_path || !fs.existsSync(scene.audio_file_path)) {
      log('DOWNLOAD', `⚠ Scene ${scene.scene_number}: No audio file, skipping download`);
      continue;
    }

    log('DOWNLOAD', `Scene ${scene.scene_number}: Downloading from ${selected.provider}...`);

    try {
      const result = await downloadVideo({
        videoId: selected.video_id,
        providerId: selected.provider,
        outputPath,
        segmentDuration: audioDuration,
        maxHeight: CONFIG.download.maxHeight,
      });

      if (result.success && result.filePath) {
        downloadedPaths.set(scene.id, result.filePath);
        log('DOWNLOAD', `  ✓ Downloaded to ${result.filePath}`);
      } else {
        log('DOWNLOAD', `  ✗ Failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('DOWNLOAD', `  ✗ Error: ${errorMessage}`);
    }

    // Small delay to avoid overwhelming the server
    await sleep(500);
  }

  log('DOWNLOAD', `✓ Downloaded ${downloadedPaths.size}/${scenes.length} videos`);

  return downloadedPaths;
}

/**
 * Stage 7: Trim Videos
 */
async function stageTrimVideos(
  projectId: string,
  downloadedPaths: Map<string, string>
): Promise<string[]> {
  log('TRIM', `Trimming videos to match audio duration...`);

  const scenes = getScenesByProjectId(projectId);
  const ffmpeg = new FFmpegClient();
  const trimmer = new Trimmer(ffmpeg);

  const trimmedPaths: string[] = [];

  for (const scene of scenes) {
    const downloadedPath = downloadedPaths.get(scene.id);

    if (!downloadedPath) {
      log('TRIM', `⚠ Scene ${scene.scene_number}: No downloaded video, skipping`);
      continue;
    }

    const audioDuration = scene.duration;
    if (!audioDuration || audioDuration <= 0) {
      log('TRIM', `⚠ Scene ${scene.scene_number}: Invalid audio duration (${audioDuration}), skipping`);
      continue;
    }

    const outputDir = path.join(process.cwd(), '.cache/trimmed', projectId);
    ensureDir(outputDir);

    log('TRIM', `Scene ${scene.scene_number}: Trimming to ${audioDuration}s...`);

    try {
      const trimmedPath = await trimmer.trimScene(
        {
          sceneId: scene.id,
          sceneNumber: scene.scene_number,
          audioFilePath: scene.audio_file_path || '',
          defaultSegmentPath: downloadedPath,
          audioDuration: audioDuration,
        } as AssemblyScene,
        outputDir
      );

      trimmedPaths.push(trimmedPath);
      log('TRIM', `  ✓ Trimmed to ${trimmedPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('TRIM', `  ✗ Error: ${errorMessage}`);
    }
  }

  log('TRIM', `✓ Trimmed ${trimmedPaths.length}/${scenes.length} videos`);

  return trimmedPaths;
}

/**
 * Stage 8: Assemble Video
 */
async function stageAssembleVideo(
  projectId: string,
  trimmedPaths: string[]
): Promise<{ videoPath?: string; thumbnailPath?: string }> {
  log('ASSEMBLY', `Assembling final video...`);

  const scenes = getScenesByProjectId(projectId);
  const ffmpeg = new FFmpegClient();
  const assembler = new VideoAssembler(ffmpeg);

  // Create assembly job
  const jobId = await assembler.createJob(projectId, scenes.length);
  log('ASSEMBLY', `Created assembly job: ${jobId}`);

  // Prepare assembly scenes
  const assemblyScenes: AssemblyScene[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const trimmedPath = trimmedPaths[i];

    if (!trimmedPath) {
      log('ASSEMBLY', `⚠ Scene ${scene.scene_number}: No trimmed video, skipping`);
      continue;
    }

    // If no audio file exists, create a silent audio track
    let audioFilePath = scene.audio_file_path || '';
    if (!audioFilePath || !fs.existsSync(audioFilePath)) {
      log('ASSEMBLY', `⚠ Scene ${scene.scene_number}: No audio file, creating silent audio...`);

      // Create silent audio file
      const silentAudioPath = path.join(process.cwd(), '.cache', 'temp', `silent-${scene.id}.aac`);
      ensureDir(path.dirname(silentAudioPath));

      try {
        // Generate silent audio using FFmpeg
        await new Promise<void>((resolve, reject) => {
          const { spawn } = require('child_process');
          const duration = scene.duration || 5;
          const ffmpegArgs = [
            '-f', 'lavfi',
            '-i', `anullsrc=r=44100:cl=mono`,
            '-t', duration.toString(),
            '-c:a', 'aac',
            '-y',
            silentAudioPath
          ];

          const ffmpegProc = spawn('ffmpeg', ffmpegArgs);
          ffmpegProc.on('close', (code: number) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`FFmpeg exited with code ${code}`));
            }
          });
        });

        audioFilePath = silentAudioPath;
        log('ASSEMBLY', `  ✓ Created silent audio: ${silentAudioPath}`);
      } catch (error) {
        log('ASSEMBLY', `  ✗ Failed to create silent audio: ${error}`);
        continue;
      }
    }

    assemblyScenes.push({
      sceneId: scene.id,
      sceneNumber: scene.scene_number,
      scriptText: scene.text,
      audioFilePath: audioFilePath,
      defaultSegmentPath: trimmedPath,
      audioDuration: scene.duration || 0,
    });
  }

  log('ASSEMBLY', `Assembling ${assemblyScenes.length} scenes...`);

  try {
    const finalPath = await assembler.assembleScenes(
      jobId,
      projectId,
      trimmedPaths,
      assemblyScenes
    );

    await assembler.completeJob(jobId);

    log('ASSEMBLY', `✓ Video assembled: ${finalPath}`);

    // Get thumbnail path
    const project = getProject(projectId);
    const thumbnailPath = project?.thumbnail_path || undefined;

    if (thumbnailPath) {
      log('ASSEMBLY', `✓ Thumbnail generated: ${thumbnailPath}`);
    }

    return {
      videoPath: finalPath,
      thumbnailPath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ASSEMBLY', `✗ Assembly failed: ${errorMessage}`);
    await assembler.failJob(jobId, errorMessage);
    throw error;
  }
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Run the complete video generation pipeline
 */
async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const errors: string[] = [];
  const stageResults = {
    script: false,
    voiceover: false,
    visuals: false,
    download: false,
    assembly: false,
  };

  let projectId = '';
  let videoPath: string | undefined;
  let thumbnailPath: string | undefined;
  let totalScenes = 0;
  let totalDuration = 0;

  try {
    // Stage 1: Create Project
    const projectResult = await stageCreateProject(options.topic);
    projectId = projectResult.projectId;

    // Stage 2: Generate Script
    try {
      await stageGenerateScript(
        projectId,
        options.topic,
        options.targetDurationMinutes,
        options.sceneCount
      );
      stageResults.script = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Script generation failed: ${errorMessage}`);
      log('ERROR', `Script generation failed: ${errorMessage}`);
      return {
        success: false,
        projectId,
        projectTopic: options.topic,
        totalScenes: 0,
        totalDuration: 0,
        errors,
        stageResults,
      };
    }

    // Stage 3: Generate Voiceovers
    try {
      await stageGenerateVoiceovers(projectId, options.voiceId || CONFIG.defaultVoice);
      stageResults.voiceover = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Voiceover generation failed: ${errorMessage}`);
      log('ERROR', `Voiceover generation failed: ${errorMessage}`);
    }

    // Stage 4: Generate Visuals
    try {
      await stageGenerateVisuals(projectId);
      stageResults.visuals = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Visual generation failed: ${errorMessage}`);
      log('ERROR', `Visual generation failed: ${errorMessage}`);
    }

    // Stage 5: Select Clips
    try {
      await stageSelectClips(projectId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Clip selection failed: ${errorMessage}`);
      log('ERROR', `Clip selection failed: ${errorMessage}`);
    }

    // Stage 6: Download Videos
    let downloadedPaths: Map<string, string> = new Map();
    try {
      downloadedPaths = await stageDownloadVideos(projectId);
      stageResults.download = downloadedPaths.size > 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Video download failed: ${errorMessage}`);
      log('ERROR', `Video download failed: ${errorMessage}`);
    }

    // Stage 7: Trim Videos
    let trimmedPaths: string[] = [];
    try {
      trimmedPaths = await stageTrimVideos(projectId, downloadedPaths);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Video trimming failed: ${errorMessage}`);
      log('ERROR', `Video trimming failed: ${errorMessage}`);
    }

    // Stage 8: Assemble Video
    if (trimmedPaths.length > 0) {
      try {
        const assemblyResult = await stageAssembleVideo(projectId, trimmedPaths);
        videoPath = assemblyResult.videoPath;
        thumbnailPath = assemblyResult.thumbnailPath;
        stageResults.assembly = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Video assembly failed: ${errorMessage}`);
        log('ERROR', `Video assembly failed: ${errorMessage}`);
      }
    }

    // Get final statistics
    const finalScenes = getScenesByProjectId(projectId);
    totalScenes = finalScenes.length;
    totalDuration = finalScenes.reduce((sum, s) => sum + (s.duration || 0), 0);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Pipeline execution failed: ${errorMessage}`);
    log('ERROR', `Pipeline execution failed: ${errorMessage}`);
  }

  // Determine overall success
  const success = stageResults.script &&
                 stageResults.voiceover &&
                 stageResults.visuals &&
                 stageResults.download &&
                 stageResults.assembly;

  return {
    success,
    projectId,
    projectTopic: options.topic,
    totalScenes,
    totalDuration,
    videoPath,
    thumbnailPath,
    errors,
    stageResults,
  };
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('  Full Pipeline Video Generator');
  console.log('  Autonomous End-to-End Video Generation');
  console.log('='.repeat(80));
  console.log();

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: tsx scripts/full-pipeline-video-generator.ts <topic> [duration_minutes] [scene_count]');
    console.log();
    console.log('Examples:');
    console.log('  tsx scripts/full-pipeline-video-generator.ts "Black Holes: The Universe\'s Most Mysterious Objects" 3');
    console.log('  tsx scripts/full-pipeline-video-generator.ts "Military Aviation Training" 2');
    console.log('  tsx scripts/full-pipeline-video-generator.ts "The History of Space Exploration" 5 12');
    console.log();
    process.exit(1);
  }

  const topic = args[0];
  const targetDurationMinutes = parseInt(args[1]) || 3;
  const sceneCount = parseInt(args[2]) || undefined;

  console.log(`Topic: ${topic}`);
  console.log(`Target Duration: ${targetDurationMinutes} minutes`);
  if (sceneCount) {
    console.log(`Scene Count: ${sceneCount}`);
  }
  console.log();
  console.log('='.repeat(80));
  console.log();

  // Run pipeline
  const startTime = Date.now();
  const result = await runPipeline({
    topic,
    targetDurationMinutes,
    sceneCount,
    voiceId: CONFIG.defaultVoice,
    onProgress: (stage, message) => {
      log(stage, message);
    },
  });
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Print results
  console.log();
  console.log('='.repeat(80));
  console.log('  PIPELINE RESULTS');
  console.log('='.repeat(80));
  console.log();

  console.log(`Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  console.log(`Project ID: ${result.projectId}`);
  console.log(`Topic: ${result.projectTopic}`);
  console.log(`Total Scenes: ${result.totalScenes}`);
  console.log(`Total Duration: ${result.totalDuration}s (${Math.floor(result.totalDuration / 60)}m ${Math.round(result.totalDuration % 60)}s)`);
  console.log(`Execution Time: ${duration}s`);
  console.log();

  console.log('Stage Results:');
  console.log(`  Script Generation: ${stageResultIcon(result.stageResults.script)}`);
  console.log(`  Voiceover Generation: ${stageResultIcon(result.stageResults.voiceover)}`);
  console.log(`  Visual Generation: ${stageResultIcon(result.stageResults.visuals)}`);
  console.log(`  Video Download: ${stageResultIcon(result.stageResults.download)}`);
  console.log(`  Video Assembly: ${stageResultIcon(result.stageResults.assembly)}`);
  console.log();

  if (result.videoPath) {
    console.log('✓ Video Output:');
    console.log(`  Path: ${result.videoPath}`);

    // Get file size
    const stats = fs.statSync(result.videoPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  Size: ${sizeMB} MB`);
    console.log();
  }

  if (result.thumbnailPath) {
    console.log(`✓ Thumbnail: ${result.thumbnailPath}`);
    console.log();
  }

  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(err => console.log(`  • ${err}`));
    console.log();
  }

  console.log('='.repeat(80));

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

function stageResultIcon(success: boolean): string {
  return success ? '✓' : '✗';
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runPipeline, PipelineResult, PipelineOptions };
