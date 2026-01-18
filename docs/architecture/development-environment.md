# Development Environment

### Prerequisites

**Required:**
- Node.js 18+ (for Next.js)
- Python 3.10+ (for yt-dlp, KokoroTTS)
- UV (Python package manager)
- Ollama installed and running (http://localhost:11434)
- FFmpeg 7.1.2+ installed and in PATH

**Optional:**
- VS Code with TypeScript, ESLint, Tailwind CSS IntelliSense extensions

### Setup Instructions

```bash
# 1. Clone repository
git clone <repo-url>
cd ai-video-generator

# 2. Install Node dependencies
npm install

# 3. Install Python dependencies (using UV)
uv pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 5. Initialize database
npm run db:init

# 6. Verify Ollama is running
ollama list  # Should show llama3.2

# 7. Start development server
npm run dev
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:init": "node scripts/init-db.js",
    "db:reset": "node scripts/reset-db.js",
    "db:seed": "node scripts/seed-db.js"
  }
}
```

### Environment Variables

```bash
# .env.local

# ============================================
# YouTube Data API (Epic 3)
# ============================================
# Get API key at: https://console.cloud.google.com
# Enable YouTube Data API v3 for your project
# Free tier: 10,000 quota units/day
YOUTUBE_API_KEY=your_youtube_api_key_here

# ============================================
# LLM Provider Configuration
# ============================================
# Choose: 'ollama' (local, FOSS) or 'gemini' (cloud, free tier)
LLM_PROVIDER=ollama

# Ollama Configuration (Primary, FOSS-compliant)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Gemini Configuration (Optional, Cloud-based)
# Get free API key at: https://aistudio.google.com/apikey
# Free tier: 15 requests/minute, 1,500 requests/day
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# ============================================
# Database & Storage
# ============================================
DATABASE_PATH=./ai-video-generator.db
CACHE_DIR=./.cache
OUTPUT_DIR=./.cache/output
```

---
