# Groq LLM Provider Integration - Quick Reference

**Last Updated:** 2026-01-22

---

## Architecture Overview

```
User → UI Settings → Database → Factory → Provider Interface → LLM API
  ↓                   ↓           ↓            ↓                ↓
Select          User Prefs    createLLM    chat()          Groq/Gemini/
Provider        (table)       Provider()   Method          Ollama
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/llm/provider.ts` | LLMProvider interface |
| `src/lib/llm/factory.ts` | Provider factory |
| `src/lib/llm/groq-provider.ts` | Groq implementation ✨ |
| `src/lib/llm/rate-limiter.ts` | Sliding window rate limiter |
| `src/lib/db/migrations/020_*.ts` | User preferences schema |
| `components/features/settings/ai-configuration.tsx` | UI provider selector |

---

## Environment Variables

```bash
# Groq Configuration
GROQ_API_KEY=your_key_here              # Get at console.groq.com
GROQ_MODEL=llama-3.3-70b-versatile      # Default model
GROQ_RATE_LIMIT_ENABLED=true             # Enable rate limiting
GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE=2    # 2 RPM = 1 req/30s

# Alternative Providers
LLM_PROVIDER=groq                        # Can be: ollama, gemini, groq
GEMINI_API_KEY=your_key_here
GEMINI_RATE_LIMIT_REQUESTS_PER_MINUTE=1  # 1 RPM = 1 req/60s
OLLAMA_BASE_URL=http://localhost:11434
```

---

## Database Schema

```sql
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_llm_provider TEXT DEFAULT 'ollama',
  CHECK(default_llm_provider IN ('ollama', 'gemini', 'groq'))
);
```

---

## Usage Example

```typescript
// Get user's preferred provider
const userProvider = getUserLLMProvider(); // Returns 'groq'

// Create provider instance
const llm = createLLMProvider(userProvider);

// Generate script (works for all providers)
const script = await llm.chat(messages, systemPrompt);
```

---

## Provider Comparison

| Provider | Speed | Quality | Cost | Privacy |
|----------|-------|---------|------|---------|
| **Ollama** | 2-5s | Good | Free | 100% local |
| **Gemini** | 1-3s | Excellent | Free (1.5K/d) | Cloud |
| **Groq** | **0.5-1s** | Excellent | Free (1K/d) | Cloud |

---

## Rate Limits

| Provider | Local Limit | Actual Limit | Wait (R2) |
|----------|-------------|--------------|-----------|
| Ollama | Disabled | Unlimited | 0s |
| Gemini | 1 RPM | 15 RPM | 60s |
| Groq | 2 RPM | 30 RPM | 30s |

---

## HTTP Headers (Groq)

```
x-ratelimit-remaining-requests: 998
x-ratelimit-limit-requests: 1000
retry-after: 30
```

---

## Error Handling

```typescript
// Invalid API key
throw new Error('Groq API key not configured.\nGet key at: console.groq.com');

// Rate limit (429)
throw new Error('Rate limit exceeded. Waiting 30s...');

// Model not found
throw new Error('Model not found. Use: llama-3.3-70b-versatile');
```

---

## Testing

```bash
# Unit tests
npm test src/__tests__/unit/llm/groq-provider.test.ts

# Integration tests
npm test src/__tests__/integration/provider-factory.test.ts

# Rate limiter tests
npm test src/__tests__/unit/llm/rate-limiter.test.ts
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API key error | Check `.env.local` has `GROQ_API_KEY` |
| Rate limit hit | Wait 30s or switch provider |
| Model not found | Use `llama-3.3-70b-versatile` |
| Connection error | Check internet connection |

---

## Documentation

- **Full Architecture:** `llm-provider-abstraction-v2.md`
- **Diagrams:** `llm-provider-diagrams.md`
- **Summary:** `groq-integration-summary.md`
- **ADRs:** `architecture-decision-records.md` (ADR-009, ADR-010)

---

**Status:** ✅ Implemented
**Version:** 2.0
