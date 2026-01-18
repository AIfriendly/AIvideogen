# Deployment Architecture

### Local Single-User Deployment

**Target Environment:** User's local machine (Windows, macOS, Linux)

**Installation Method:**
1. User clones repository or downloads release
2. Runs setup script (installs dependencies)
3. Starts application via `npm run dev` or `npm start`
4. Accesses at `http://localhost:3000`

**Dependencies:**
- Ollama must be installed and running
- FFmpeg must be installed
- Python 3.10+ must be installed

**Data Storage:**
- SQLite database: `./ai-video-generator.db`
- Temporary files: `./.cache/`
- Final videos: `./.cache/output/`

**No Server Required:**
- Everything runs locally
- No authentication needed (single user)
- No cloud costs

---
