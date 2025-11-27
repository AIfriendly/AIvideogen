# Manual Testing Test Data

**Generated:** 2025-11-24T21:14:48.877Z

## Overview

This directory contains test data for manual acceptance testing of Stories 5.1, 5.2, and 5.3.

## Directory Structure

```
manual-testing/
├── videos/           # Test video files
├── audio/            # Test audio files
├── output/           # Output directory for test results
├── test-manifest.json # Test scenario definitions
└── README.md         # This file
```

## Test Files

### Videos
- **scene-1-short-5s.mp4**: 5s, 1280x720, 30fps
- **scene-2-medium-7s.mp4**: 7s, 1280x720, 30fps
- **scene-3-long-8s.mp4**: 8s, 1280x720, 30fps
- **scene-4-exact-10s.mp4**: 10s, 1280x720, 30fps
- **scene-5-longer-30s.mp4**: 30s, 1280x720, 30fps
- **hq-test-video.mp4**: 15s, 1920x1080, 60fps

### Audio
- **voiceover-1-5s.mp3**: 5s, 44100Hz
- **voiceover-2-7s.mp3**: 7s, 44100Hz
- **voiceover-3-8s.mp3**: 8s, 44100Hz
- **voiceover-exact-8.5s.mp3**: 8.5s, 44100Hz
- **voiceover-long-15s.mp3**: 15s, 44100Hz

## Test Scenarios

See `test-manifest.json` for detailed test scenario definitions.

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
2. Create test project with scenarios from `test-manifest.json`
3. Follow manual acceptance testing checklist
4. Document results in test execution tracking spreadsheet

### Automated Testing
```javascript
const manifest = require('./test-manifest.json');
// Use manifest.videos and manifest.audios in your tests
```

## Regenerating Test Data

To regenerate all test files:
```bash
node tests/test-data/prepare-test-data.js
```

To clean and regenerate:
```bash
rm -rf tests/test-data/manual-testing
node tests/test-data/prepare-test-data.js
```

## Notes

- All test videos use color bars with timecode overlay for easy visual verification
- All test audio uses 440 Hz sine wave tone (musical note A)
- File durations are verified after generation (tolerance: ±0.1s)
- FFmpeg 7.x required for generation
