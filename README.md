# AI Video Generator

An automated video creation tool that transforms conversational ideas into fully produced videos with AI-generated scripts, voiceovers, and curated visuals.

## Overview

The AI Video Generator is a desktop-first web application built with Next.js 15 that automates end-to-end video creation. Through natural conversation, users brainstorm video topics, generate scripts, select AI voices, curate visuals from YouTube, and assemble professional videos.

## Features

- **Conversational Topic Discovery** - Natural AI-powered brainstorming to develop video ideas
- **Script Generation** - Automatic scene-by-scene script creation with narration and visual descriptions
- **AI Voice Synthesis** - 48+ voice options using KokoroTTS (local TTS)
- **YouTube B-roll Integration** - Search and download relevant video clips
- **Visual Curation** - Interactive scene-by-scene visual selection
- **Automated Assembly** - FFmpeg-powered video rendering with voiceover and visuals

## Technology Stack

### Frontend & Framework
- **Next.js 15.5** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Accessible component library

### AI & Processing
- **Ollama + Llama 3.2 (3B)** - Local LLM with 128K context window
- **KokoroTTS** - High-quality text-to-speech (82M model, Apache 2.0)
- **yt-dlp** - YouTube video downloading
- **FFmpeg 7.1.2+** - Video processing and assembly
- **Gemini 2.5 Free** Free tier API
### State & Data
- **Zustand 5.0.8** - Lightweight client state management
- **SQLite (better-sqlite3)** - Embedded database for conversation history and projects
- **Local Filesystem** - Cached media storage

## Architecture

This is a **local-first, single-user application** designed for:
- Complete privacy (all AI processing runs locally)
- Fast performance (no network latency for LLM/TTS)
- Full control (bring-your-own-models)
- Clear cloud migration path (documented in architecture)

See [Architecture Documentation](../docs/architecture.md) for complete technical specification.

## Prerequisites

### Required
- **Node.js 18+** - JavaScript runtime
- **Python 3.9+** - For TTS and video downloading
- **UV Package Manager** - Python dependency management
- **Ollama** - Local LLM runtime (with Llama 3.2 model)
- **FFmpeg 7.1+** - Video processing

### Installation

1. **Install Node.js** - https://nodejs.org
2. **Install Python** - https://python.org
3. **Install UV** - https://github.com/astral-sh/uv
4. **Install Ollama** - https://ollama.com
   ```bash
   ollama pull llama3.2:3b-instruct-q8_0
   ```
5. **Install FFmpeg** - https://ffmpeg.org/download.html

## Setup

```bash
# Clone repository
git clone https://github.com/AIfriendly/AIvideogen.git
cd AIvideogen

# Install Node.js dependencies
npm install

# Install Python dependencies
cd ..
uv pip install -r requirements.txt

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

## Project Structure

```
ai-video-generator/
├── src/
│   ├── app/                 # Next.js App Router (pages & API routes)
│   ├── components/          # React components (UI & features)
│   ├── lib/                 # Utilities (LLM, TTS, video, database)
│   ├── stores/              # Zustand state management
│   └── types/               # TypeScript definitions
├── .cache/                  # Temporary media files (git-ignored)
├── data/                    # SQLite database (git-ignored)
└── public/                  # Static assets
```

## Development Workflow

This project follows the **BMAD Method** (BMad Architecture & Development):
- **Phase 1-2**: Requirements & Planning (PRD, UX Design) ✅
- **Phase 3**: Architecture & Solutioning ✅
- **Phase 4**: Implementation (Current Phase)

See [Workflow Status](../docs/bmm-workflow-status.md) for current progress.

## Configuration

### System Prompts (LLM Personas)
The application includes configurable system prompts to control AI behavior:
- **Creative Assistant** (default) - Unrestricted brainstorming
- **Viral Content Strategist** - Engagement-focused
- **Educational Content Designer** - Learning-focused
- **Documentary Filmmaker** - Narrative-driven

See architecture documentation for customization details.

### LLM Provider Configuration
Default: Local Ollama with Llama 3.2
Post-MVP: Support for OpenAI, Anthropic, custom endpoints

## License

[Specify License]

## Contributing

[Contribution guidelines]

## Support

For issues and questions:
- GitHub Issues: https://github.com/AIfriendly/AIvideogen/issues
- Architecture Documentation: [../docs/architecture.md](../docs/architecture.md)

---

**Status**: Phase 4 - Implementation Ready
**Version**: 0.1.0 (MVP)
**Last Updated**: 2025-11-01
