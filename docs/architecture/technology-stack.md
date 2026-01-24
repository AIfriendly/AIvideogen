# Technology Stack

### Frontend Stack
- **Framework:** Next.js 15.5 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (Radix UI primitives)
- **State Management:** Zustand 5.0.8
- **Video Player:** Plyr
- **Build Tool:** Turbopack (dev), Next.js compiler (production)

### Backend Stack
- **Runtime:** Node.js 18+ (via Next.js)
- **API:** Next.js API Routes
- **Database:** SQLite 3.x via better-sqlite3 12.4.1
- **LLM (Primary):** Ollama (local server) with Llama 3.2 (3B instruct)
- **LLM (Optional):** Google Gemini 2.5 Flash/Pro (cloud, free tier)
- **LLM (Optional):** Groq (ultra-fast cloud) with Llama 3.3 70B Versatile
- **LLM SDK:** ollama 0.6.2, @google/generative-ai 0.21.0, groq-sdk
- **TTS:** KokoroTTS (82M parameter model)
- **Video Download:** yt-dlp 2025.10.22 (Python)
- **Video Processing:** FFmpeg 7.1.2 (binary)

### External Services
- **YouTube Data API:** v3 (for B-roll search and metadata)
- **Ollama Server:** http://localhost:11434 (local LLM runtime, primary)
- **Google Gemini API:** generativelanguage.googleapis.com (cloud LLM, optional)
- **Groq API:** api.groq.com (ultra-fast cloud LLM, optional)
- **Google Cloud Vision API:** vision.googleapis.com (content analysis for B-roll filtering, 1,000 units/month free tier)

### Development Tools
- **Linting:** ESLint (Next.js config)
- **Formatting:** Prettier (recommended)
- **Testing:** Vitest 2.1.x (native ESM support, fast, Vite-powered)
- **Version Control:** Git

---
