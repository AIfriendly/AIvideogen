# AI Video Generator - Setup Guide

This guide covers the setup and installation of the AI Video Generator, including all dependencies for Epic 1 (Topic Confirmation) and Epic 2 (Content Generation Pipeline with TTS).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [TTS Setup (Epic 2)](#tts-setup-epic-2)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js 20+** - JavaScript runtime
- **Python 3.10+** - For TTS engine
- **UV Package Manager** - Python package installer (faster than pip)
- **FFmpeg 7.1.2+** - Audio/video processing
- **Ollama 0.4.7+** - Local LLM server

### Installing Prerequisites

#### Node.js
```bash
# Download from https://nodejs.org/
# Verify installation:
node --version  # Should show v20.x or higher
npm --version
```

#### Python
```bash
# Download from https://www.python.org/
# Verify installation:
python --version  # Should show 3.10 or higher
```

#### UV Package Manager
```bash
# Install UV (cross-platform)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or using pip
pip install uv

# Verify installation:
uv --version
```

#### FFmpeg
```bash
# macOS (Homebrew)
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows (Chocolatey)
choco install ffmpeg

# Verify installation:
ffmpeg -version  # Should show 7.1.2 or higher
```

#### Ollama
```bash
# Download from https://ollama.ai/
# Follow platform-specific instructions

# After installation, pull the required model:
ollama pull llama3.2:3b

# Verify Ollama is running:
ollama list  # Should show llama3.2:3b
```

## System Requirements

### Minimum Requirements
- **CPU:** 4 cores (8 threads recommended)
- **RAM:** 8GB (16GB recommended)
- **Storage:** 5GB free space
  - Node modules: ~500MB
  - Python packages: ~300MB
  - KokoroTTS model: ~320MB
  - Ollama model (llama3.2:3b): ~2GB
  - Audio cache: ~1-2GB

### Disk Space Breakdown
- `.cache/audio/previews/`: ~1.5MB (5 MVP voice samples)
- `.cache/audio/projects/`: Variable (100KB per scene, ~500KB per project)
- Temporary files: ~100MB

## Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/AIfriendly/AIvideogen.git
cd "BMAD video generator"
```

### 2. Install Node.js Dependencies
```bash
cd ai-video-generator
npm install
```

### 3. Install Python Dependencies
```bash
# From project root (BMAD video generator/)
cd ..
uv pip install -r requirements.txt
```

This will install:
- `kokoro-tts==0.3.0` - TTS engine (82M parameters)
- `numpy==1.24.3` - Audio processing
- `scipy==1.11.1` - Audio utilities
- `yt-dlp>=2025.10.22` - YouTube downloader

### 4. Configure Environment
```bash
cd ai-video-generator
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration (see [Environment Configuration](#environment-configuration) below).

### 5. Initialize Database
```bash
# Database is auto-initialized on first run
npm run dev
```

## TTS Setup (Epic 2)

### Overview

The TTS system uses **KokoroTTS**, a high-quality FOSS text-to-speech engine with:
- 82M parameter model (~320MB download)
- 48+ voice options (male/female, various accents)
- 4.35 MOS score (Mean Opinion Score)
- 3.2x faster than XTTS
- Persistent model caching for performance

### Installation

Python dependencies are already installed from step 3 above. On first use, the KokoroTTS model will be automatically downloaded (~320MB).

### Persistent Service Model

The TTS system uses a **long-running Python service** (similar to Ollama's architecture):

- **Cold Start (First Request):** ~3-5 seconds (includes model loading)
- **Warm Requests (Subsequent):** <2 seconds (model cached in memory)
- **Memory Usage:** ~400MB (82M parameter model)

The service automatically:
1. Spawns on first TTS request
2. Loads model into memory once
3. Processes all subsequent requests without reloading
4. Shuts down gracefully when application exits

### Voice Profiles

**MVP (5 voices):**
- Sarah - American Female (warm)
- James - British Male (professional)
- Emma - American Female (energetic)
- Michael - American Male (calm)
- Olivia - British Female (friendly)

**Total Available:** 48+ voices documented in `docs/kokoro-voice-catalog.md`

### Audio Storage

Audio files are stored in `.cache/audio/`:
- **Preview Audio:** `.cache/audio/previews/{voiceId}.mp3`
  - Shared across all projects
  - NEVER deleted automatically
- **Scene Audio:** `.cache/audio/projects/{projectId}/scene-{number}.mp3`
  - Isolated per project
  - Deleted after 30 days of inactivity

All audio format:
- **Format:** MP3
- **Bitrate:** 128kbps
- **Sample Rate:** 44.1kHz
- **Channels:** Mono

## Verification

### Verify TTS Setup

Run the verification script to check all TTS components:

```bash
cd ai-video-generator
npm run verify:tts
```

This will:
1. Check Python version (3.10+)
2. Verify KokoroTTS package installation
3. Test model download and loading
4. Generate test audio file
5. Validate audio format

**Expected Output:**
```
============================================================
TTS Setup Verification
============================================================
Checking Python version...
✅ Python 3.10.x

Checking KokoroTTS installation...
✅ KokoroTTS package installed (version: 0.3.0)

Checking dependencies...
✅ NumPy 1.24.3
✅ SciPy 1.11.1

Testing model loading...
⏳ Loading KokoroTTS model (this may take a few seconds)...
✅ Model loaded successfully (~82M parameters, ~320MB)

Testing audio generation...
⏳ Generating test audio: 'This is a test of the text to speech system.'
✅ Audio file generated: .cache/audio/test/verification-test.mp3 (45231 bytes)
✅ Audio format appears to be MP3
✅ Test audio saved to: .cache/audio/test/verification-test.mp3

============================================================
Verification Summary
============================================================
✅ PASS: Python Version
✅ PASS: KokoroTTS Installation
✅ PASS: Dependencies
✅ PASS: Model Loading
✅ PASS: Audio Generation

🎉 All checks passed! TTS system is ready.
```

### Verify Ollama Setup

```bash
# Check Ollama is running
ollama list

# Test model response
ollama run llama3.2:3b "Hello, how are you?"
```

### Verify Application

```bash
cd ai-video-generator
npm run dev
```

Open http://localhost:3000 and verify:
1. Application loads
2. Can create new project
3. Can send messages
4. Topic confirmation workflow works

## Environment Configuration

Edit `.env.local` with the following:

```bash
# Database
DATABASE_PATH=./data/app.db

# LLM Configuration (Epic 1)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
LLM_PROVIDER=ollama

# TTS Configuration (Epic 2)
TTS_PROVIDER=kokoro
TTS_TIMEOUT_MS_COLD=30000    # Cold start timeout (with model loading)
TTS_TIMEOUT_MS_WARM=10000    # Warm timeout (model already loaded)
TTS_MODEL_PATH=./models/kokoro
TTS_AUDIO_FORMAT=mp3
TTS_AUDIO_BITRATE=128
TTS_AUDIO_SAMPLE_RATE=44100
TTS_AUDIO_CHANNELS=1         # Mono
```

## Troubleshooting

### TTS Issues

#### Error: TTS_NOT_INSTALLED
```
KokoroTTS not installed. Run: uv pip install -r requirements.txt
```
**Solution:**
```bash
cd "BMAD video generator"
uv pip install -r requirements.txt
```

#### Error: TTS_MODEL_NOT_FOUND
```
Voice synthesis model not found. Please run setup script.
```
**Solution:**
The model should auto-download on first use. If it doesn't:
```bash
cd ai-video-generator
npm run verify:tts
```

#### Error: TTS_TIMEOUT
```
Voice generation timed out. Please try again.
```
**Solution:**
- First request can take 3-5 seconds (model loading)
- Check system resources (CPU/RAM)
- Ensure no other heavy processes are running

#### Error: TTS_SERVICE_ERROR
```
TTS service not responding. Please restart.
```
**Solution:**
```bash
# Restart the application
# Service will automatically restart on next TTS request
```

### Ollama Issues

#### Error: Ollama Not Running
```
Error: Could not connect to Ollama at http://localhost:11434
```
**Solution:**
```bash
# Start Ollama service
ollama serve

# In another terminal, verify model is available:
ollama list
ollama pull llama3.2:3b
```

#### Error: Model Not Found
```
Error: Model llama3.2:3b not found
```
**Solution:**
```bash
ollama pull llama3.2:3b
```

### Python Version Issues

If you have multiple Python versions installed:

```bash
# Use specific Python version
python3.10 -m pip install uv
uv pip install -r requirements.txt

# Update npm script to use specific version
# Edit package.json: "verify:tts": "python3.10 ../scripts/verify-tts-setup.py"
```

### FFmpeg Issues

#### FFmpeg Not Found
```bash
# Verify FFmpeg is in PATH
ffmpeg -version

# If not found, reinstall and ensure it's in PATH
```

### Permission Issues

#### macOS/Linux
```bash
# If scripts aren't executable
chmod +x scripts/*.py
chmod +x scripts/*.ts
```

#### Windows
- Run terminal as Administrator if file permission errors occur
- Ensure Python and Node.js are added to PATH during installation

### Storage Issues

If running low on disk space:

```bash
# Clean audio cache (project audio only, keeps previews)
cd ai-video-generator
npm run cleanup:audio

# Or manually:
# Delete old projects: .cache/audio/projects/
# KEEP previews: .cache/audio/previews/
```

### Port Conflicts

If ports are already in use:

```bash
# Next.js (default: 3000)
PORT=3001 npm run dev

# Ollama (default: 11434)
# Edit OLLAMA_HOST in .env.local if running on different port
```

## Next Steps

After successful setup:

1. **Epic 1 (Complete):** Test topic confirmation workflow
2. **Epic 2 (In Progress):**
   - Test voice selection UI (Story 2.3)
   - Generate scripts (Story 2.4)
   - Generate voiceovers (Story 2.5)

## Support

For issues not covered here:
1. Check GitHub Issues: https://github.com/AIfriendly/AIvideogen/issues
2. Review architecture docs: `docs/architecture.md`
3. Review technical specs: `docs/tech-spec-epic-*.md`

## License

This project uses FOSS (Free and Open Source Software) components only. See LICENSE file for details.
