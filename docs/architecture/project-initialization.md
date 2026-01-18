# Project Initialization

**First Implementation Story: Project Setup**

Execute the following commands to initialize the project:

```bash
# Create Next.js project with TypeScript, Tailwind CSS, ESLint, App Router
npx create-next-app@latest ai-video-generator --ts --tailwind --eslint --app

# Navigate to project
cd ai-video-generator

# Initialize shadcn/ui component library
npx shadcn@latest init

# Install additional dependencies
npm install zustand better-sqlite3 ollama @google/generative-ai plyr
npm install --save-dev @types/better-sqlite3

# Install Python dependencies (using UV package manager)
uv pip install yt-dlp kokoro-tts
# Or from requirements.txt: uv pip install -r requirements.txt

# Verify system dependencies
ollama --version  # Should be installed already
ffmpeg -version   # Install if missing
```

This establishes the base architecture with:
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for UI components
- Next.js App Router for routing
- ESLint for code quality

---
