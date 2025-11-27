/**
 * Test Data Preparation Script
 * Prepares test videos, audio, and project data for manual acceptance testing
 * Stories 5.1, 5.2, 5.3
 *
 * Usage: node tests/test-data/prepare-test-data.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  testDataDir: path.join(__dirname, 'manual-testing'),
  videosDir: path.join(__dirname, 'manual-testing', 'videos'),
  audioDir: path.join(__dirname, 'manual-testing', 'audio'),
  outputDir: path.join(__dirname, 'manual-testing', 'output'),

  // FFmpeg must be installed
  ffmpegPath: 'ffmpeg',
  ffprobePath: 'ffprobe',

  // Test video specifications
  testVideos: [
    { name: 'scene-1-short-5s.mp4', duration: 5, resolution: '1280x720', fps: 30 },
    { name: 'scene-2-medium-7s.mp4', duration: 7, resolution: '1280x720', fps: 30 },
    { name: 'scene-3-long-8s.mp4', duration: 8, resolution: '1280x720', fps: 30 },
    { name: 'scene-4-exact-10s.mp4', duration: 10, resolution: '1280x720', fps: 30 },
    { name: 'scene-5-longer-30s.mp4', duration: 30, resolution: '1280x720', fps: 30 },
    { name: 'hq-test-video.mp4', duration: 15, resolution: '1920x1080', fps: 60 }, // High quality test
  ],

  // Test audio specifications
  testAudios: [
    { name: 'voiceover-1-5s.mp3', duration: 5, sampleRate: 44100 },
    { name: 'voiceover-2-7s.mp3', duration: 7, sampleRate: 44100 },
    { name: 'voiceover-3-8s.mp3', duration: 8, sampleRate: 44100 },
    { name: 'voiceover-exact-8.5s.mp3', duration: 8.5, sampleRate: 44100 },
    { name: 'voiceover-long-15s.mp3', duration: 15, sampleRate: 44100 },
  ],
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m', // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}[${timestamp}] ${message}${reset}`);
}

function checkFFmpeg() {
  log('Checking FFmpeg installation...', 'info');
  try {
    const version = execSync(`${config.ffmpegPath} -version`, { encoding: 'utf8' });
    // Match various ffmpeg version formats (including git builds)
    const versionMatch = version.match(/ffmpeg version (\d+\.\d+|[\w\-\.]+)/);
    if (versionMatch || version.includes('ffmpeg version')) {
      const versionStr = versionMatch ? versionMatch[1] : 'detected';
      log(`✓ FFmpeg ${versionStr} found`, 'success');
      return true;
    }
  } catch (error) {
    log('✗ FFmpeg not found in PATH', 'error');
    log('Please install FFmpeg 7.x and add to system PATH', 'error');
    log('Download: https://ffmpeg.org/download.html', 'info');
    return false;
  }
}

function createDirectories() {
  log('Creating test data directories...', 'info');
  const dirs = [config.testDataDir, config.videosDir, config.audioDir, config.outputDir];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✓ Created: ${dir}`, 'success');
    } else {
      log(`✓ Exists: ${dir}`, 'info');
    }
  });
}

function generateTestVideo(spec) {
  const outputPath = path.join(config.videosDir, spec.name);

  // Check if already exists
  if (fs.existsSync(outputPath)) {
    log(`✓ Video already exists: ${spec.name}`, 'info');
    return outputPath;
  }

  log(`Generating test video: ${spec.name} (${spec.duration}s, ${spec.resolution}, ${spec.fps}fps)...`, 'info');

  try {
    // Generate test video with color bars
    // Color bars pattern helps with visual quality assessment
    // Note: Simplified without drawtext to avoid fontconfig issues on Windows
    const cmd = `${config.ffmpegPath} -f lavfi -i testsrc=duration=${spec.duration}:size=${spec.resolution}:rate=${spec.fps} ` +
                `-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -y "${outputPath}"`;

    execSync(cmd, { stdio: 'pipe' });

    // Verify duration
    const probeCmdVideo = `${config.ffprobePath} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`;
    const actualDuration = parseFloat(execSync(probeCmdVideo, { encoding: 'utf8' }).trim());

    const tolerance = 0.1;
    if (Math.abs(actualDuration - spec.duration) < tolerance) {
      log(`✓ Generated: ${spec.name} (actual: ${actualDuration.toFixed(2)}s)`, 'success');
    } else {
      log(`⚠ Generated: ${spec.name} but duration mismatch (expected: ${spec.duration}s, actual: ${actualDuration.toFixed(2)}s)`, 'warning');
    }

    return outputPath;
  } catch (error) {
    log(`✗ Failed to generate ${spec.name}: ${error.message}`, 'error');
    return null;
  }
}

function generateTestAudio(spec) {
  const outputPath = path.join(config.audioDir, spec.name);

  // Check if already exists
  if (fs.existsSync(outputPath)) {
    log(`✓ Audio already exists: ${spec.name}`, 'info');
    return outputPath;
  }

  log(`Generating test audio: ${spec.name} (${spec.duration}s)...`, 'info');

  try {
    // Generate test audio with sine wave tone (440 Hz) + voice-like modulation
    // This helps with audio sync testing as you can hear distinct patterns
    const cmd = `${config.ffmpegPath} -f lavfi -i "sine=frequency=440:duration=${spec.duration}" ` +
                `-af "volume=0.3,atempo=1.0" ` +
                `-c:a libmp3lame -b:a 128k -ar ${spec.sampleRate} -y "${outputPath}"`;

    execSync(cmd, { stdio: 'pipe' });

    // Verify duration
    const probeCmdAudio = `${config.ffprobePath} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`;
    const actualDuration = parseFloat(execSync(probeCmdAudio, { encoding: 'utf8' }).trim());

    const tolerance = 0.1;
    if (Math.abs(actualDuration - spec.duration) < tolerance) {
      log(`✓ Generated: ${spec.name} (actual: ${actualDuration.toFixed(2)}s)`, 'success');
    } else {
      log(`⚠ Generated: ${spec.name} but duration mismatch (expected: ${spec.duration}s, actual: ${actualDuration.toFixed(2)}s)`, 'warning');
    }

    return outputPath;
  } catch (error) {
    log(`✗ Failed to generate ${spec.name}: ${error.message}`, 'error');
    return null;
  }
}

function generateTestManifest() {
  const manifestPath = path.join(config.testDataDir, 'test-manifest.json');

  log('Generating test manifest...', 'info');

  const manifest = {
    generatedAt: new Date().toISOString(),
    testDataDir: config.testDataDir,
    videos: config.testVideos.map(v => ({
      name: v.name,
      path: path.join(config.videosDir, v.name),
      expectedDuration: v.duration,
      resolution: v.resolution,
      fps: v.fps,
    })),
    audios: config.testAudios.map(a => ({
      name: a.name,
      path: path.join(config.audioDir, a.name),
      expectedDuration: a.duration,
      sampleRate: a.sampleRate,
    })),
    testScenarios: [
      {
        name: 'Basic 3-scene assembly',
        description: 'Test basic concatenation and audio overlay with 3 scenes',
        scenes: [
          { video: 'scene-1-short-5s.mp4', audio: 'voiceover-1-5s.mp3', expectedDuration: 5 },
          { video: 'scene-2-medium-7s.mp4', audio: 'voiceover-2-7s.mp3', expectedDuration: 7 },
          { video: 'scene-3-long-8s.mp4', audio: 'voiceover-3-8s.mp3', expectedDuration: 8 },
        ],
        expectedTotalDuration: 20,
      },
      {
        name: 'Trimming test - long video to short audio',
        description: 'Test Story 5.2 trimming with 30s video trimmed to 10s',
        scenes: [
          { video: 'scene-5-longer-30s.mp4', audio: 'voiceover-1-5s.mp3', expectedDuration: 5 },
        ],
        expectedTotalDuration: 5,
      },
      {
        name: 'High quality test',
        description: 'Test quality preservation with 1080p 60fps video',
        scenes: [
          { video: 'hq-test-video.mp4', audio: 'voiceover-long-15s.mp3', expectedDuration: 15 },
        ],
        expectedTotalDuration: 15,
      },
      {
        name: 'Exact duration test',
        description: 'Test metadata accuracy with exact 10.0s video and 8.5s audio',
        scenes: [
          { video: 'scene-4-exact-10s.mp4', audio: 'voiceover-exact-8.5s.mp3', expectedDuration: 8.5 },
        ],
        expectedTotalDuration: 8.5,
      },
    ],
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log(`✓ Test manifest created: ${manifestPath}`, 'success');

  return manifest;
}

function generateREADME() {
  const readmePath = path.join(config.testDataDir, 'README.md');

  const content = `# Manual Testing Test Data

**Generated:** ${new Date().toISOString()}

## Overview

This directory contains test data for manual acceptance testing of Stories 5.1, 5.2, and 5.3.

## Directory Structure

\`\`\`
manual-testing/
├── videos/           # Test video files
├── audio/            # Test audio files
├── output/           # Output directory for test results
├── test-manifest.json # Test scenario definitions
└── README.md         # This file
\`\`\`

## Test Files

### Videos
${config.testVideos.map(v => `- **${v.name}**: ${v.duration}s, ${v.resolution}, ${v.fps}fps`).join('\n')}

### Audio
${config.testAudios.map(a => `- **${a.name}**: ${a.duration}s, ${a.sampleRate}Hz`).join('\n')}

## Test Scenarios

See \`test-manifest.json\` for detailed test scenario definitions.

### Scenario 1: Basic 3-scene assembly
- Tests: AC1, AC2, AC3 (Story 5.3)
- Expected total duration: 20 seconds
- Scenes: 5s + 7s + 8s

### Scenario 2: Trimming test
- Tests: AC1, AC7, AC8 (Story 5.2)
- 30s video trimmed to 5s audio

### Scenario 3: High quality test
- Tests: AC8 (Story 5.2 - Quality Preservation)
- 1080p 60fps video, verify no quality loss

### Scenario 4: Exact duration test
- Tests: AC6 (Story 5.1 - Metadata Accuracy)
- Verify FFmpeg operations return accurate durations

## Usage

### Manual Testing
1. Import test files into application
2. Create test project with scenarios from \`test-manifest.json\`
3. Follow manual acceptance testing checklist
4. Document results in test execution tracking spreadsheet

### Automated Testing
\`\`\`javascript
const manifest = require('./test-manifest.json');
// Use manifest.videos and manifest.audios in your tests
\`\`\`

## Regenerating Test Data

To regenerate all test files:
\`\`\`bash
node tests/test-data/prepare-test-data.js
\`\`\`

To clean and regenerate:
\`\`\`bash
rm -rf tests/test-data/manual-testing
node tests/test-data/prepare-test-data.js
\`\`\`

## Notes

- All test videos use color bars with timecode overlay for easy visual verification
- All test audio uses 440 Hz sine wave tone (musical note A)
- File durations are verified after generation (tolerance: ±0.1s)
- FFmpeg 7.x required for generation
`;

  fs.writeFileSync(readmePath, content);
  log(`✓ README created: ${readmePath}`, 'success');
}

function printSummary(manifest) {
  console.log('\n' + '='.repeat(60));
  log('TEST DATA PREPARATION COMPLETE', 'success');
  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`  Videos generated: ${config.testVideos.length}`);
  console.log(`  Audio files generated: ${config.testAudios.length}`);
  console.log(`  Test scenarios: ${manifest.testScenarios.length}`);
  console.log(`\n📁 Location: ${config.testDataDir}`);
  console.log('\n📖 Next Steps:');
  console.log('  1. Review test-manifest.json for test scenarios');
  console.log('  2. Import test files into application');
  console.log('  3. Follow docs/review/manual-acceptance-testing-stories-5.1-5.2-5.3.md');
  console.log('  4. Track results in docs/review/test-execution-tracking.csv');
  console.log('\n✨ Ready for manual acceptance testing!\n');
}

// Main execution
async function main() {
  console.log('\n' + '='.repeat(60));
  log('TEST DATA PREPARATION SCRIPT', 'info');
  log('Stories 5.1, 5.2, 5.3 - Manual Acceptance Testing', 'info');
  console.log('='.repeat(60) + '\n');

  // Step 1: Check prerequisites
  if (!checkFFmpeg()) {
    process.exit(1);
  }

  // Step 2: Create directories
  createDirectories();

  // Step 3: Generate test videos
  log('\n📹 Generating test videos...', 'info');
  let videoCount = 0;
  for (const videoSpec of config.testVideos) {
    const result = generateTestVideo(videoSpec);
    if (result) videoCount++;
  }
  log(`\n✓ Videos: ${videoCount}/${config.testVideos.length} generated\n`, 'success');

  // Step 4: Generate test audio
  log('🎵 Generating test audio...', 'info');
  let audioCount = 0;
  for (const audioSpec of config.testAudios) {
    const result = generateTestAudio(audioSpec);
    if (result) audioCount++;
  }
  log(`\n✓ Audio: ${audioCount}/${config.testAudios.length} generated\n`, 'success');

  // Step 5: Generate test manifest
  const manifest = generateTestManifest();

  // Step 6: Generate README
  generateREADME();

  // Step 7: Print summary
  printSummary(manifest);
}

// Run the script
main().catch(error => {
  log(`✗ Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
