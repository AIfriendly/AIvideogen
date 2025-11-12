# Story 2.1 Manual Testing Guide

## 🎯 Acceptance Criteria Testing Checklist

This guide will help you verify all 6 acceptance criteria for Story 2.1: TTS Engine Integration & Voice Profile Setup

---

## 📦 Prerequisites

Before testing, ensure you have:
- Python 3.10 or higher installed
- Node.js 18+ installed
- UV package manager (or pip)
- ~320MB free disk space for the KokoroTTS model

---

## AC#1: TTS Engine Installation & Persistent Service

### 1.1 Install Python Dependencies

```bash
# Navigate to project root
cd "D:\BMAD video generator"

# Install Python packages (choose one method):
# Option A: Using UV (recommended)
uv pip install -r requirements.txt

# Option B: Using standard pip
pip install -r requirements.txt
```

**Expected Output:**
- kokoro-tts==0.3.0 installed
- numpy==1.24.3 installed
- scipy==1.11.1 installed

### 1.2 Verify TTS Installation

```bash
# Run the verification script
npm run verify:tts

# Or directly:
python scripts/verify-tts-setup.py
```

**✅ PASS Criteria:**
- [ ] Python version >= 3.10 confirmed
- [ ] KokoroTTS package detected
- [ ] Model downloads successfully (~320MB)
- [ ] Test audio file generated
- [ ] Audio format verified (MP3, 128kbps, 44.1kHz, Mono)

**Expected Output:**
```
✓ Python 3.10+ detected: 3.11.5
✓ KokoroTTS package installed: 0.3.0
✓ Downloading model (this may take 2-3 minutes)...
✓ Model loaded successfully
✓ Test audio generated: test_audio.mp3
✓ Audio format verified: MP3, 128kbps, 44.1kHz, Mono
✓ TTS setup complete!
```

### 1.3 Test Persistent Service

```bash
# Start the TTS service
python scripts/kokoro-tts-service.py
```

**✅ PASS Criteria:**
- [ ] Service starts without errors
- [ ] Shows "Model loaded successfully" message
- [ ] Shows "TTS Service ready. Listening for JSON requests..."

**Test JSON Request:**
```bash
# In a new terminal, test the service:
echo '{"action": "synthesize", "text": "Hello world", "voice_id": "af_sarah"}' | python scripts/kokoro-tts-service.py
```

**Expected Response:**
```json
{
  "success": true,
  "audio_path": ".cache/audio/test_[timestamp].mp3",
  "duration": 1.5
}
```

### 1.4 Performance Test

Test that synthesis meets performance targets:

```bash
# Test preview generation (should be <2s after model loaded)
echo '{"action": "synthesize", "text": "This is a preview test", "voice_id": "af_sarah"}' | python scripts/kokoro-tts-service.py

# Test longer scene (should be <3s)
echo '{"action": "synthesize", "text": "This is a longer scene with more content to test the performance of the text to speech synthesis engine", "voice_id": "af_sarah"}' | python scripts/kokoro-tts-service.py
```

**✅ PASS Criteria:**
- [ ] Preview (<30 words): <2 seconds
- [ ] Scene (~100 words): <3 seconds

---

## AC#2: Voice Catalog Documentation

### 2.1 Check Voice Profiles

```bash
# Navigate to ai-video-generator directory
cd "D:\BMAD video generator\ai-video-generator"

# Check if voice profiles file exists
ls src/lib/tts/voice-profiles.ts
```

**Verify in the file:**
```typescript
// Open src/lib/tts/voice-profiles.ts and verify:
```

**✅ PASS Criteria:**
- [ ] 48 total voices defined in VOICE_PROFILES array
- [ ] 5 voices have `mvpVoice: true` flag
- [ ] Each voice has: id, name, gender, accent, tone, previewUrl, modelId
- [ ] Voice categories present: American Female/Male, British Female/Male, Australian, Neutral

### 2.2 Test Voice Helper Functions

Create a test file to verify voice functions:

```bash
# Create test file
cat > test-voices.mjs << 'EOF'
import {
  VOICE_PROFILES,
  getVoiceById,
  getMVPVoices,
  getVoicesByGender,
  getVoicesByAccent
} from './src/lib/tts/voice-profiles.ts';

console.log('Total voices:', VOICE_PROFILES.length);
console.log('MVP voices:', getMVPVoices().length);
console.log('Female voices:', getVoicesByGender('female').length);
console.log('American voices:', getVoicesByAccent('american').length);
console.log('Sarah voice:', getVoiceById('af_sarah'));
EOF

# Run test
node test-voices.mjs
```

**✅ PASS Criteria:**
- [ ] Total voices: 48
- [ ] MVP voices: 5
- [ ] Female voices: ~24
- [ ] Voice lookup by ID works

---

## AC#3: Preview Audio Samples

### 3.1 Test Text Sanitization

```bash
# Test the sanitization function
node -e "
const { sanitizeForTTS, validateSanitization } = require('./ai-video-generator/src/lib/tts/sanitize-text.ts');

const dirty = '# Hello *world* with **markdown** and [links](http://test.com)';
const clean = sanitizeForTTS(dirty);
console.log('Original:', dirty);
console.log('Sanitized:', clean);
console.log('Is valid:', validateSanitization(clean));
"
```

**✅ PASS Criteria:**
- [ ] Markdown removed (no #, *, **, [])
- [ ] URLs removed
- [ ] Special characters cleaned
- [ ] validateSanitization returns true

### 3.2 Generate Preview Audio

```bash
# Create a preview generation script
cat > generate-previews.py << 'EOF'
import sys
import json

# Test preview generation for MVP voices
mvp_voices = ['af_sarah', 'am_adam', 'bf_emma', 'bm_george', 'af_bella']
preview_text = "Hello, I'm your AI video narrator. Let me help bring your story to life with engaging content."

for voice_id in mvp_voices:
    request = {
        "action": "synthesize",
        "text": preview_text,
        "voice_id": voice_id,
        "output_path": f".cache/audio/previews/{voice_id}.mp3"
    }
    print(f"Generating preview for {voice_id}...")
    # Send to TTS service via stdin
    print(json.dumps(request))
EOF

# Run preview generation
python generate-previews.py | python scripts/kokoro-tts-service.py
```

**✅ PASS Criteria:**
- [ ] 5 preview files created in `.cache/audio/previews/`
- [ ] Each file is valid MP3
- [ ] Each file < 500KB
- [ ] Audio plays correctly

---

## AC#4: TTSProvider Interface

### 4.1 Check Provider Implementation

```bash
# Verify files exist
ls ai-video-generator/src/lib/tts/provider.ts
ls ai-video-generator/src/lib/tts/kokoro-provider.ts
ls ai-video-generator/src/lib/tts/factory.ts
```

**Verify interfaces match Epic 1 pattern:**

```typescript
// In provider.ts, verify:
// - TTSProvider interface exists
// - generateAudio method signature
// - AudioResult type with Uint8Array

// In kokoro-provider.ts, verify:
// - KokoroProvider implements TTSProvider
// - Service lifecycle management
// - Error handling with retry logic

// In factory.ts, verify:
// - getTTSProvider() function
// - Singleton pattern
```

**✅ PASS Criteria:**
- [ ] TTSProvider interface follows LLMProvider pattern
- [ ] generateAudio returns Promise<AudioResult>
- [ ] AudioResult uses Uint8Array (not Buffer)
- [ ] Factory returns singleton instance

---

## AC#5: Audio Storage Structure

### 5.1 Verify Directory Structure

```bash
# Check directory creation
ls -la .cache/audio/
ls -la .cache/audio/previews/
ls -la .cache/audio/projects/
```

**✅ PASS Criteria:**
- [ ] `.cache/audio/` directory exists
- [ ] `.cache/audio/previews/` subdirectory exists
- [ ] `.cache/audio/projects/` subdirectory exists
- [ ] `.cache/` is in .gitignore

### 5.2 Test Path Utilities

```bash
# Test path generation
node -e "
const {
  getPreviewAudioPath,
  getSceneAudioPath,
  validateAudioPath
} = require('./ai-video-generator/src/lib/utils/audio-storage.ts');

console.log('Preview path:', getPreviewAudioPath('af_sarah'));
console.log('Scene path:', getSceneAudioPath('project123', 1));
console.log('Valid path:', validateAudioPath('.cache/audio/test.mp3'));
console.log('Invalid path:', validateAudioPath('../../../etc/passwd'));
"
```

**✅ PASS Criteria:**
- [ ] Preview path: `.cache/audio/previews/af_sarah.mp3`
- [ ] Scene path: `.cache/audio/projects/project123/scene-1.mp3`
- [ ] Valid path returns true
- [ ] Invalid path (traversal) returns false

### 5.3 Check Schema Documentation

```bash
# Verify schema documentation exists
cat docs/story-2.1-schema-output.md
```

**✅ PASS Criteria:**
- [ ] scenes table schema documented
- [ ] audio_file_path column: TEXT (relative path)
- [ ] duration column: REAL (seconds)
- [ ] Path format examples provided

---

## AC#6: Error Handling

### 6.1 Test Error Codes

Test various error scenarios:

```bash
# Test 1: Invalid voice ID
curl -X GET http://localhost:3000/api/voice/list
# Then test synthesis with invalid voice:
echo '{"action": "synthesize", "text": "test", "voice_id": "invalid_voice"}' | python scripts/kokoro-tts-service.py
```

**Expected Error:**
```json
{
  "success": false,
  "error": {
    "message": "Unknown voice ID: invalid_voice",
    "code": "TTS_INVALID_VOICE"
  }
}
```

### 6.2 Test Service Errors

```bash
# Test 2: Service not running (kill the TTS service first)
# Try to call the API when service is down
curl -X POST http://localhost:3000/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "voiceId": "af_sarah"}'
```

**✅ PASS Criteria:**
- [ ] Returns TTS_SERVICE_ERROR when service down
- [ ] Returns TTS_INVALID_VOICE for unknown voice
- [ ] Returns TTS_TIMEOUT on timeout (if testable)
- [ ] All errors have message and code fields

---

## 🔥 API Integration Test

### Test Voice List Endpoint

```bash
# Start the development server
cd ai-video-generator
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/voice/list
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "voices": [
      {
        "id": "af_sarah",
        "name": "Sarah",
        "gender": "female",
        "accent": "american",
        "tone": "warm",
        "previewUrl": "/audio/previews/af_sarah.mp3"
      },
      // ... 4 more MVP voices
    ],
    "totalVoices": 5,
    "totalAvailable": 48,
    "defaultVoice": "af_sarah",
    "stats": {
      "byGender": { "male": 2, "female": 3 },
      "byAccent": { "american": 3, "british": 2 }
    }
  }
}
```

**✅ PASS Criteria:**
- [ ] Returns 5 MVP voices
- [ ] Each voice has all required fields
- [ ] totalAvailable shows 48
- [ ] Stats are accurate

---

## 📊 Summary Checklist

### Core Functionality
- [ ] Python dependencies installed
- [ ] KokoroTTS model downloaded (~320MB)
- [ ] TTS service starts and runs
- [ ] Voice catalog has 48 voices (5 MVP)
- [ ] API endpoint returns voice list
- [ ] Text sanitization works
- [ ] Audio storage paths created
- [ ] Error handling with proper codes

### Performance
- [ ] Preview generation: <2 seconds
- [ ] Scene generation: <3 seconds
- [ ] Model stays cached in memory

### Documentation
- [ ] Setup guide exists
- [ ] Architecture documented
- [ ] Voice catalog complete
- [ ] Schema for Story 2.2 provided
- [ ] Pattern correspondence documented

---

## 🚨 Common Issues & Solutions

### Issue: "ModuleNotFoundError: No module named 'kokoro_tts'"
**Solution:** Run `pip install kokoro-tts==0.3.0`

### Issue: "Model download failed"
**Solution:** Check internet connection, ensure 320MB disk space

### Issue: "TTS service not responding"
**Solution:**
1. Kill any existing Python processes
2. Restart with: `python scripts/kokoro-tts-service.py`

### Issue: "Voice not found"
**Solution:** Use one of the MVP voice IDs: af_sarah, am_adam, bf_emma, bm_george, af_bella

### Issue: "Build fails with TypeScript errors"
**Solution:** Ensure you're using TypeScript 5+ and run `npm install`

---

## ✅ When All Tests Pass

Once all acceptance criteria pass:

1. All 6 AC checkboxes should be checked
2. The implementation is ready for Story 2.2
3. Run `*complete-story` again to proceed

---

## 📝 Test Results Recording

Record your test results here:

```yaml
test_date: 2025-11-06
tester: lichking
environment: Windows/WSL/Mac

ac1_tts_installation:
  python_version: [YOUR VERSION]
  kokoro_installed: true/false
  model_downloaded: true/false
  service_starts: true/false
  performance_preview: [X]s
  performance_scene: [X]s

ac2_voice_catalog:
  total_voices: [COUNT]
  mvp_voices: [COUNT]
  all_metadata_present: true/false

ac3_preview_audio:
  sanitization_works: true/false
  previews_generated: true/false
  file_size_ok: true/false

ac4_provider_interface:
  follows_pattern: true/false
  singleton_works: true/false

ac5_storage_structure:
  directories_created: true/false
  paths_valid: true/false
  schema_documented: true/false

ac6_error_handling:
  error_codes_work: true/false
  messages_clear: true/false

overall_status: PASS/FAIL
notes: |
  [Any additional notes or issues encountered]
```

---

*Testing Guide Generated: 2025-11-06*
*Story: 2.1 - TTS Engine Integration & Voice Profile Setup*