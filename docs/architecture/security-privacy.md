# Security & Privacy

### Local-First Privacy

**Data Stays Local:**
- All processing happens on user's machine
- SQLite database stored locally
- No user data sent to cloud (except YouTube API queries)
- Conversation history never leaves the machine

### API Key Security

**YouTube Data API:**
- API key stored in `.env.local` (git-ignored)
- Never exposed to client-side code
- API calls made from Next.js API routes (server-side only)

**Environment Variables:**
```bash
# .env.local (git-ignored)
YOUTUBE_API_KEY=your_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Input Validation

**All user inputs validated:**
```typescript
// Example: Validate topic input
function validateTopic(topic: string): boolean {
  if (!topic || topic.trim().length === 0) {
    throw new Error('Topic cannot be empty');
  }
  if (topic.length > 500) {
    throw new Error('Topic too long (max 500 characters)');
  }
  return true;
}
```

### File System Security

**Sandboxed file operations:**
- All file operations confined to `.cache/` directory
- Validate file paths to prevent directory traversal
- Clean up temporary files after use

```typescript
function validateFilePath(filePath: string): void {
  const normalized = path.normalize(filePath);
  const cacheDir = path.resolve('.cache');

  if (!normalized.startsWith(cacheDir)) {
    throw new Error('Invalid file path: outside cache directory');
  }
}
```

### SQL Injection Prevention

**Always use parameterized queries:**
```typescript
// Good
db.prepare('SELECT * FROM messages WHERE project_id = ?').all(projectId);

// Bad (vulnerable to SQL injection)
db.exec(`SELECT * FROM messages WHERE project_id = '${projectId}'`);
```

---
