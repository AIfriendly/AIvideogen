<!-- Copilot/AI agent instructions for contributors and automated agents -->
# Project-specific instructions for AI coding agents

This file captures the essential, discoverable knowledge an AI coding agent needs to be productive in this repository.

## Purpose
- Help an automated agent (or new engineer) understand the big-picture architecture, developer workflows, and project-specific conventions so edits are safe, consistent, and actionable.

## Big picture (what to know first)
- Core application: `ai-video-generator` — a Next.js 15 TypeScript app that implements the frontend, UI, and orchestration layers.
- Local-first hybrid architecture: heavy use of local FOSS LLM/TTS (Ollama, KokoroTTS) with optional cloud augmentation (Google Gemini, ElevenLabs). See `ai-video-generator/README.md` for rationale.
- Two runtimes: Node/Next (UI, orchestration, scripts in `ai-video-generator/`) and Python (TTS helpers, model setup, verification scripts at repository root and `ai-video-generator/scripts/`).
- Media pipeline: `yt-dlp` for downloads, `ffmpeg` for assembly, KokoroTTS for local TTS; models and runtime binaries are external prerequisites (not installed via pip/npm).

## Where to look (quick map)
- Frontend & orchestration: `ai-video-generator/src/` (components, lib, pages/app router).
- Voice/tts catalog: `ai-video-generator/src/lib/tts/voice-profiles.ts` (MVP and full voice catalog; used by `generate-voice-previews.ts`).
- Node scripts: `ai-video-generator/scripts/*` (e.g., `generate-voice-previews.ts`, `validate-env.ts`, `verify-tts-setup.py`).
- Python helpers & TTS: top-level `scripts/generate-voice-preview.py`, `scripts/verify-tts-setup.py`, and `requirements.txt` (root and `ai-video-generator/requirements.txt`).
- Models & binaries: `kokoro-v1.0.onnx` (root and duplicate under `ai-video-generator/models/`), `.cache/` used for generated previews and temporary assets.

## Key workflows & commands (explicit)
- Install Node deps (inside `ai-video-generator`):
  - `cd ai-video-generator && npm install`
- Install Python deps (root):
  - `uv pip install -r requirements.txt`  
    (project uses `uv` as the recommended Python/package wrapper; README demonstrates this.)
- Start dev server:
  - `cd ai-video-generator && npm run dev` → app available at `http://localhost:3000`.
- Generate voice previews (example flow used by CI/UX):
  - `cd ai-video-generator && npm run generate:previews` → calls `scripts/generate-voice-previews.ts` which invokes the Python helper `scripts/generate-voice-preview.py`.
  - Note: `generate-voice-previews.ts` currently hard-codes `python` to `C:\Program Files\Python310\python.exe` on Windows; adjust `pythonPath` when running on non-Windows environments or different installs.
- Verify TTS environment (recommended before TTS-related changes):
  - `cd ai-video-generator && npm run verify:tts` (this runs the Python verifier and checks model loading/MP3 generation).
- Run tests:
  - `cd ai-video-generator && npm test` (uses `vitest` — see `vitest.config.ts`).
  - For interactive dev: `npm run test:watch` or `npm run test:ui`.

## Project-specific conventions and gotchas
- Environment validation: `ai-video-generator/scripts/validate-env.ts` expects a `.env.local` (copy from example) and will exit non-zero when required keys are missing (especially `YOUTUBE_API_KEY` or `OLLAMA` settings).
- Python wrapper: the project recommends using `uv` for pip operations (`uv pip install ...`). If `uv` isn't available, fallback to the system Python but keep paths and environments consistent.
- Hard-coded Windows paths: some scripts use an absolute Windows Python path; prefer making these configurable or use `python` on PATH. When editing TypeScript scripts that spawn Python, update the spawn `pythonPath` with environment-friendly logic.
- Audio cache & artifacts: previews and test artifacts live under `.cache/audio/` (see `generate-voice-previews.ts`); avoid committing large binary artifacts.
- Voice catalog is canonical: `ai-video-generator/src/lib/tts/voice-profiles.ts` is the single source of truth for voice IDs and `modelId` values used across the app and scripts.

## Integration & external dependencies
- Local LLM/TTS: Ollama (LLM) and KokoroTTS (TTS) — both are expected to be installed and managed outside of pip/npm.
- Cloud integrations: Google Cloud Vision API, YouTube Data API, and optional ElevenLabs TTS. API keys and quotas are validated by `validate-env.ts` and documented in `ai-video-generator/README.md`.
- System binaries: `ffmpeg`, `yt-dlp` (installed via pip but FFmpeg must be available on PATH/system), and model files like `kokoro-v1.0.onnx`.

## Safety when editing
- Do not commit generated binaries or model files. Avoid changing the voice `id`/`modelId` mapping without updating `generate-voice-previews.ts` and related Python helpers.
- When adding/adjusting scripts that call Python, prefer detecting `python` on PATH or reading `PYTHON_EXECUTABLE` from env instead of using absolute paths.

## Quick examples for common edits
- To add a new Kokoro voice: update `ai-video-generator/src/lib/tts/voice-profiles.ts` (add `id`, `modelId`, and `previewUrl`), then run `npm run generate:previews` to validate sample generation.
- To add a new Node script: place it in `ai-video-generator/scripts/`, add an npm script to `ai-video-generator/package.json`, and reference any Python helpers from repository `scripts/` using relative paths.

## Where to ask questions / follow-up
- If uncertain about modes (local vs cloud) or missing env vars, run `npm run validate:env` and `npm run verify:tts` and file an issue in the repo with the exact output.

---
If anything here is unclear or you'd like more detail about a particular subsystem (video download pipeline, TTS model management, or Next.js routing), tell me which area and I will expand this file accordingly.
