# Executive Summary

The AI Video Generator is a desktop-first web application built with Next.js 15.5 that automates end-to-end video creation from conversational brainstorming to final rendered output. The architecture leverages flexible LLM provider support (local Ollama + Llama 3.2 or cloud Google Gemini 2.5 with free tier), KokoroTTS for local voice synthesis, YouTube Data API for B-roll sourcing, and a sophisticated visual curation interface for scene-by-scene clip selection. The system is designed as a single-user local application with a hybrid state management approach (Zustand + SQLite), providing fast performance, instant video preview capabilities through pre-downloaded segments, and complete privacy while maintaining a clear migration path to cloud multi-tenant deployment.

The primary technology stack is FOSS (Free and Open-Source Software) compliant per PRD requirements. Optional cloud services (Google Gemini) are available for users who prefer cloud-based LLM with generous free tiers (1,500 requests/day) over local setup.

---
