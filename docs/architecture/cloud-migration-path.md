# Cloud Migration Path

### Future Multi-Tenant Cloud Deployment

**When to migrate:** If the application needs to support multiple users via web hosting

**Required Changes:**

1. **Database: SQLite → PostgreSQL**
   ```sql
   -- Add users table
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     name VARCHAR(255),
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Add user_id to existing tables
   ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES users(id);
   ALTER TABLE messages ADD COLUMN user_id UUID; -- Denormalized for query performance
   ```

2. **Authentication: Add NextAuth.js or Clerk**
   ```typescript
   // Middleware for protected routes
   export { default } from "next-auth/middleware";
   export const config = { matcher: ["/api/:path*", "/projects/:path*"] };
   ```

3. **File Storage: Local → S3/R2**
   ```typescript
   // Upload to S3 instead of local filesystem
   await s3Client.putObject({
     Bucket: 'video-generator',
     Key: `${userId}/${projectId}/audio/scene1.mp3`,
     Body: audioBuffer,
   });
   ```

4. **LLM Provider: Local Ollama → Cloud API or Shared Ollama**
   ```typescript
   // Provider abstraction already supports this!
   case 'openai':
     return new OpenAIProvider(user.openaiApiKey);
   case 'anthropic':
     return new AnthropicProvider(user.anthropicApiKey);
   ```

5. **Video Processing: Local FFmpeg → Cloud Worker**
   - Use queue system (BullMQ, Inngest)
   - Run FFmpeg on worker instances
   - Store results in S3

6. **Data Isolation**
   ```typescript
   // Add user_id filter to all queries
   const projects = await db.query(
     'SELECT * FROM projects WHERE user_id = ?',
     [userId]
   );
   ```

**Deployment Platforms:**
- Vercel (Next.js frontend + API routes)
- Supabase or Neon (PostgreSQL)
- Cloudflare R2 or AWS S3 (file storage)
- Fly.io or Railway (self-hosted Ollama with GPU)

**Migration Checklist:**
- [ ] Add user authentication (NextAuth.js)
- [ ] Migrate SQLite → PostgreSQL
- [ ] Implement user isolation (add user_id filters)
- [ ] Replace local file storage with S3
- [ ] Update LLM provider to cloud API or shared Ollama
- [ ] Add background job processing for video assembly
- [ ] Implement rate limiting per user
- [ ] Add billing/subscription (if monetizing)

---
