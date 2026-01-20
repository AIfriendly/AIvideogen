# AI Video Generator

**Version:** 3.3 | **Last Updated:** 2025-12-06

An automated video creation tool that transforms a simple topic into a complete, share-ready video with an AI-generated script, professional voiceover, relevant visuals, and an eye-catching thumbnail.

## Overview

The AI Video Generator transforms video content creation from a multi-hour, multi-tool process into a streamlined 20-minute workflow. It's designed for content creators who value production speed and quality but lack the time, budget, or technical skills for traditional video production.

Our key value proposition is a **local-first, privacy-focused architecture**. Unlike cloud-dependent solutions, our system runs primarily on your own hardware using free and open-source (FOSS) technologies like Ollama and local TTS. For those seeking enhanced quality, the system seamlessly integrates with powerful cloud services like Google Gemini and ElevenLabs, maintaining a hybrid "FOSS-first, cloud-enhanced" approach with zero mandatory subscription costs.

## Core Features (Complete)

- **Conversational AI Agent:** Brainstorm and refine video ideas through a natural chat interface.
- **Automated Script Generation:** Get a professional, human-sounding script divided into logical scenes.
- **LLM Configuration & Script Personas:** Choose between local (Ollama) or cloud (Gemini) models and select from personas like 'Scientific Analyst' or 'Blackpill Realist' to define your content's tone.
- **Voice Selection & Synthesis:** Select from a diverse catalog of local (FOSS) or cloud (ElevenLabs) voices to narrate your script.
- **AI-Powered Visual Sourcing:** Automatically finds relevant B-roll from YouTube, using Google Cloud Vision to filter out talking heads, captions, and irrelevant content.
- **Visual Curation UI:** Review and select the perfect video clip for each scene from AI-powered suggestions.
- **Automated Video Assembly:** Automatically combines your selected visuals and voiceover into a final MP4 video using FFmpeg.
- **Automated Thumbnail Generation:** Instantly get a compelling thumbnail with a relevant background and your video's title.

## Enhancement Features (In Development)

- **Automated Background Music:** Automatically selects, mixes, and applies topic-appropriate background music.
- **AI-Generated SEO Toolkit:** A VidIQ-style command center that generates optimized titles, descriptions, and tags, plus keyword research and pre-upload SEO audits.
- **Automate Mode:** A full, one-click automation pipeline from topic confirmation to final export.
- **ElevenLabs TTS Integration:** Use premium cloud-based voices from ElevenLabs as an alternative to the local TTS engine.
- **Unified API Usage Dashboard:** A single dashboard to monitor your usage and quotas for all integrated APIs (Gemini, YouTube, ElevenLabs).

## Technology Stack

### Frontend & Framework
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Accessible component library

### AI & Data Processing
- **LLM:** Ollama (Llama 3.2) for local processing, Google Gemini for cloud-enhanced generation.
- **TTS:** KokoroTTS (local, FOSS), ElevenLabs (cloud).
- **Visuals:** YouTube Data API for sourcing, Google Cloud Vision API for filtering.
- **Audio/Video:** FFmpeg for assembly, yt-dlp for downloading.
- **Databases:** SQLite for project data, ChromaDB/LanceDB for future RAG capabilities.
- **State Management:** Zustand for lightweight client state.

## Prerequisites

### Required
- **Node.js 18+**
- **Python 3.9+**
- **UV Package Manager**
- **Ollama** (with a pulled model, e.g., `llama3.2`)
- **FFmpeg 7.1+**

## Setup

```bash
# Clone repository
git clone https://github.com/AIfriendly/AIvideogen.git
cd AIvideogen/ai-video-generator

# Install Node.js dependencies
npm install

# Install Python dependencies (from parent directory)
cd ..
uv pip install -r requirements.txt
cd ai-video-generator

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

## Future Enhancements

We are actively working on expanding our capabilities with features like:
- **Domain-Specific Video Sources:** Adding official sources like DVIDS for military footage.
- **Local Computer Vision:** A FOSS alternative to Google Vision using MediaPipe and Tesseract.js for zero-cost, private analysis.
- **RAG-Powered Channel Intelligence:** A VidIQ-style system to analyze competitors, monitor trends, and generate scripts informed by your specific niche.

## License

MIT License - See LICENSE file for details.