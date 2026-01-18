# Decision Summary

**Version Verification Date:** 2025-11-29

| Category | Decision | Version | Verified | FOSS | Affects | Rationale |
|----------|----------|---------|----------|------|---------|-----------|
| **Frontend Framework** | Next.js | 15.5 | 2025-11-29 | ✅ | All | React-based, server components, excellent DX |
| **Language** | TypeScript | 5.x | 2025-11-29 | ✅ | All | Type safety, better tooling |
| **Styling** | Tailwind CSS | v4 | 2025-11-29 | ✅ | Epic 4 | Rapid styling, utility-first |
| **Component Library** | shadcn/ui | Latest | 2025-11-29 | ✅ | Epic 4 | Accessible, Tailwind-based |
| **State Management** | Zustand | 5.0.8 | 2025-11-29 | ✅ | All | Lightweight (3KB), TypeScript-friendly |
| **Database** | SQLite via better-sqlite3 | 12.4.1 | 2025-11-29 | ✅ | All | Embedded, no server, local single-user |
| **Vector Database** | ChromaDB | 0.5.x | 2025-11-29 | ✅ | Feature 2.7 | Local FOSS vector DB, Python native |
| **Embeddings** | all-MiniLM-L6-v2 | Latest | 2025-11-29 | ✅ | Feature 2.7 | Local embeddings, sentence-transformers |
| **LLM (Primary)** | Ollama + Llama 3.2 | 3B | 2025-11-29 | ✅ | Epic 1, 2 | Local, FOSS, 128K context |
| **LLM (Optional)** | Google Gemini 2.5 | flash/pro | 2025-11-29 | ✅ Free | Epic 1, 2 | Cloud, 1,500 req/day free |
| **LLM SDK (Ollama)** | ollama (npm) | 0.6.2 | 2025-11-29 | ✅ | Epic 1, 2 | Official JavaScript SDK |
| **LLM SDK (Gemini)** | @google/generative-ai | 0.21.0 | 2025-11-29 | ✅ Free | Epic 1, 2 | Official JavaScript SDK |
| **Text-to-Speech** | KokoroTTS | 82M | 2025-11-29 | ✅ | Epic 2 | 48+ voices, high quality |
| **YouTube Downloader** | yt-dlp | 2025.10.22 | 2025-11-29 | ✅ | Epic 3 | Industry standard, robust |
| **Caption Scraping** | youtube-transcript-api | 0.6.x | 2025-11-29 | ✅ | Feature 2.7 | Python, auto-captions |
| **Video Processing** | FFmpeg | 7.1.2 | 2025-11-29 | ✅ | Epic 5 | Full control, future-proof |
| **Video Player** | Plyr | 3.7.8 | 2025-11-29 | ✅ | Epic 4 | Lightweight, accessible |
| **Job Scheduler** | node-cron | 3.0.x | 2025-11-29 | ✅ | Feature 2.7 | Simple cron-like scheduling |
| **API Layer** | Next.js API Routes | 15.5 | 2025-11-29 | ✅ | All | Built-in, REST-style |
| **File Storage** | Local Filesystem | N/A | N/A | ✅ | All | `.cache/` directory |
| **Testing** | Vitest | 2.1.x | 2025-11-29 | ✅ | All | Native ESM, fast, Vite-powered |

---
