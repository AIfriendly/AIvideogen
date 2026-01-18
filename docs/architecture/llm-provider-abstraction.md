# LLM Provider Abstraction

### Architecture Pattern: Strategy Pattern

**Interface Definition:**
```typescript
// lib/llm/provider.ts
export interface LLMProvider {
  chat(messages: Message[], systemPrompt?: string): Promise<string>;
  generateScript(topic: string, systemPrompt?: string): Promise<Script>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Script {
  scenes: Scene[];
}

export interface Scene {
  sceneNumber: number;
  text: string;
  duration?: number;
}
```

**Ollama Implementation:**
```typescript
// lib/llm/ollama-provider.ts
import Ollama from 'ollama';
import { DEFAULT_SYSTEM_PROMPT } from './prompts/default-system-prompt';

export class OllamaProvider implements LLMProvider {
  private client: Ollama;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3.2') {
    this.client = new Ollama({ host: baseUrl });
    this.model = model;
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    // Prepend system prompt as first message
    const fullMessages = [
      {
        role: 'system' as const,
        content: systemPrompt || DEFAULT_SYSTEM_PROMPT
      },
      ...messages
    ];

    const response = await this.client.chat({
      model: this.model,
      messages: fullMessages,
    });
    return response.message.content;
  }

  async generateScript(topic: string, systemPrompt?: string): Promise<Script> {
    const scriptPrompt = `Generate a video script about "${topic}".
Structure it as numbered scenes with clear narrative flow.`;

    const response = await this.chat([
      { role: 'user', content: scriptPrompt }
    ], systemPrompt);

    // Parse response into scenes
    return parseScriptResponse(response);
  }
}
```

**Gemini Implementation:**
```typescript
// lib/llm/gemini-provider.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, Message, Script } from './provider';

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error(
        'Gemini API key not configured.\n' +
        'Get your free API key at: https://aistudio.google.com/apikey\n' +
        'Set GEMINI_API_KEY in .env.local'
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = model;
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      });

      // Gemini doesn't have separate system role - prepend to first user message
      const contents = messages.map((msg, idx) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{
          text: idx === 0 && systemPrompt
            ? `${systemPrompt}\n\n${msg.content}`
            : msg.content
        }],
      }));

      const result = await model.generateContent({ contents });
      return result.response.text();
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async generateScript(topic: string, systemPrompt?: string): Promise<Script> {
    const scriptPrompt = `Generate a video script about "${topic}".
Structure it as numbered scenes with clear narrative flow.`;

    const response = await this.chat([
      { role: 'user', content: scriptPrompt }
    ], systemPrompt);

    // Parse response into scenes
    return parseScriptResponse(response);
  }

  private handleError(error: any): Error {
    const errorMessage = error.message || error.toString();

    // Model not found (check BEFORE network errors - more specific)
    if (errorMessage.includes('models/') && errorMessage.includes('not found')) {
      return new Error(
        `Model '${this.modelName}' not found.\n\n` +
        'Available models (Gemini 2.5 and 2.0 only):\n' +
        '  - gemini-2.5-flash (recommended, fastest, stable)\n' +
        '  - gemini-2.5-pro (best quality, stable)\n' +
        '  - gemini-flash-latest (auto-updates to latest)\n' +
        '  - gemini-pro-latest (auto-updates to latest)\n' +
        'Note: Gemini 1.5 models are deprecated.\n' +
        'Update GEMINI_MODEL in .env.local'
      );
    }

    // Network / connection issues
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
      return new Error(
        'Network error connecting to Gemini API.\n\n' +
        'Please check your internet connection and try again.\n' +
        'If using a proxy or VPN, ensure it allows access to generativelanguage.googleapis.com'
      );
    }

    // API key issues
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key')) {
      return new Error(
        'Invalid Gemini API key.\n\n' +
        'Get a free API key at: https://aistudio.google.com/apikey\n' +
        'Set GEMINI_API_KEY in .env.local'
      );
    }

    // Rate limiting
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return new Error(
        'Gemini API rate limit exceeded.\n\n' +
        'Free tier limits: 15 requests/minute, 1,500 requests/day\n' +
        'Please wait a moment and try again.'
      );
    }

    // Safety filters
    if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
      return new Error(
        'Content was blocked by Gemini safety filters.\n\n' +
        'Try rephrasing your topic to avoid potentially sensitive content.\n' +
        'Gemini has stricter content policies than local models.'
      );
    }

    // Generic error with original message
    return new Error(`Gemini API error: ${errorMessage}`);
  }
}
```

**Provider Factory:**
```typescript
// lib/llm/factory.ts
import { OllamaProvider } from './ollama-provider';
import { GeminiProvider } from './gemini-provider';
import type { LLMProvider } from './provider';

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'ollama';

  switch (provider) {
    case 'ollama':
      return new OllamaProvider(
        process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        process.env.OLLAMA_MODEL || 'llama3.2'
      );

    case 'gemini':
      if (!process.env.GEMINI_API_KEY) {
        throw new Error(
          'GEMINI_API_KEY not configured in .env.local\n' +
          'Get a free API key at: https://aistudio.google.com/apikey'
        );
      }
      return new GeminiProvider(
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      );

    default:
      throw new Error(
        `Unknown LLM provider: ${provider}\n` +
        'Valid options: ollama, gemini\n' +
        'Set LLM_PROVIDER in .env.local'
      );
  }
}
```

**Environment Configuration:**
```bash
# .env.local

# ============================================
# LLM Provider Selection
# ============================================
# Choose: 'ollama' (local, FOSS) or 'gemini' (cloud, free tier)
LLM_PROVIDER=ollama

# ============================================
# Ollama Configuration (Primary, FOSS-compliant)
# ============================================
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# ============================================
# Gemini Configuration (Optional, Cloud-based)
# ============================================
# Get free API key at: https://aistudio.google.com/apikey
# Free tier: 15 requests/minute, 1,500 requests/day
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Available Gemini models:
# - gemini-2.5-flash (recommended, fastest)
# - gemini-2.5-pro (best quality, slower)
# - gemini-flash-latest (auto-updates)
# - gemini-pro-latest (auto-updates)
# Note: Gemini 1.5 models are deprecated

# ============================================
# Google Cloud Vision API (Epic 3 Story 3.7)
# ============================================
# Get API key at: https://console.cloud.google.com/apis/api/vision.googleapis.com
# Free tier: 1,000 units/month (thumbnail analysis ~3 units each)
# NOTE: Store in .env.example as template, copy to .env.local with actual key
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key_here
# Or use service account credentials file:
# GOOGLE_CLOUD_VISION_KEY_FILE=./google-cloud-credentials.json
```

**Usage in API Routes:**
```typescript
// app/api/chat/route.ts
import { getLLMProvider } from '@/lib/llm/factory';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const llm = getLLMProvider();
  const response = await llm.chat(messages);
  return Response.json({ success: true, data: response });
}
```

**Benefits:**
- ✅ Clean separation - All LLM calls go through abstraction
- ✅ Easy testing - Can mock LLMProvider interface
- ✅ Future-proof - Adding new providers is just a new class
- ✅ Configuration-driven - Switch providers via .env
- ✅ Cloud-ready - Easy migration to cloud LLM APIs
- ✅ Multiple providers - Supports both local (Ollama) and cloud (Gemini) options

### Provider Selection Guidelines

**When to Use Ollama (Primary):**
- ✅ Privacy-critical applications (all data stays local)
- ✅ No internet connectivity or behind firewall
- ✅ Unlimited usage without rate limits
- ✅ Complete FOSS compliance required
- ✅ Custom model fine-tuning needed
- ✅ Development and testing environments

**When to Use Gemini (Optional):**
- ✅ Quick setup without local model installation
- ✅ Access to Google's latest models (2.5 Flash/Pro)
- ✅ Lower resource usage on development machine
- ✅ Acceptable to use cloud services with free tier
- ✅ Moderate usage patterns (under 1,500 requests/day)
- ✅ Need for latest model capabilities

**Switching Providers:**
Simply change `LLM_PROVIDER` in `.env.local` - all code remains the same thanks to abstraction layer.

### Error Handling Patterns

**Ollama Error Handling:**
```typescript
// Common Ollama errors
if (error.message.includes('ECONNREFUSED')) {
  // Ollama server not running
  throw new Error(
    'Ollama server not running at ' + OLLAMA_BASE_URL + '\n' +
    'Start it with: ollama serve'
  );
}

if (error.message.includes('model')) {
  // Model not found
  throw new Error(
    'Model not found. Pull it with: ollama pull ' + modelName
  );
}
```

**Gemini Error Handling:**
```typescript
// Model not found (404) - check BEFORE generic errors
if (error.message.includes('models/') && error.message.includes('not found')) {
  // Return specific guidance on available models
  // Note: Check this FIRST before network errors because error message contains "fetch"
}

// API key errors
if (error.message.includes('API_KEY_INVALID')) {
  // Guide user to get new key at https://aistudio.google.com/apikey
}

// Rate limiting (429)
if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
  // Inform about free tier limits: 15 RPM, 1,500 RPD
  // Suggest waiting or implementing caching
}

// Safety filters
if (error.message.includes('SAFETY') || error.message.includes('blocked')) {
  // Suggest rephrasing content
  // Note: Gemini has stricter policies than local models
}

// Network errors
if (error.message.includes('fetch') || error.message.includes('network')) {
  // Check internet connection, proxy settings
}
```

**Error Handling Best Practices:**
1. **Check specific errors before generic errors** - Model not found before network error
2. **Provide actionable guidance** - Tell user exactly how to fix the problem
3. **Include context** - Mention which provider failed, what they can try
4. **Graceful degradation** - For non-critical failures, continue with partial results
5. **Log errors** - Record all LLM errors for debugging

### Rate Limiting and Caching Strategy

**Gemini Free Tier Limits:**
- **15 requests per minute (RPM)**
- **1,500 requests per day (RPD)**
- **1 million tokens per minute (TPM)**

**Rate Limiting Implementation:**
```typescript
// lib/llm/rate-limiter.ts
export class RateLimiter {
  private requestTimestamps: number[] = [];
  private readonly windowMs = 60000; // 1 minute
  private readonly maxRequests = 15; // Gemini free tier

  async checkLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than window
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < this.windowMs
    );

    if (this.requestTimestamps.length >= this.maxRequests) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitMs = this.windowMs - (now - oldestTimestamp);
      throw new Error(
        `Rate limit reached. Please wait ${Math.ceil(waitMs / 1000)} seconds.`
      );
    }

    this.requestTimestamps.push(now);
  }
}
```

**Caching Strategy:**
```typescript
// lib/llm/cache.ts
import { createHash } from 'crypto';

export class LLMCache {
  private cache = new Map<string, { response: string; timestamp: number }>();
  private readonly ttlMs = 3600000; // 1 hour

  getCacheKey(messages: Message[], systemPrompt: string): string {
    const content = JSON.stringify({ messages, systemPrompt });
    return createHash('sha256').update(content).digest('hex');
  }

  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  }

  set(key: string, response: string): void {
    this.cache.set(key, { response, timestamp: Date.now() });
  }
}
```

**Caching Guidelines:**
1. **Cache script generations** - Same topic shouldn't regenerate multiple times
2. **Cache chat responses** - Identical conversation context can reuse responses
3. **Short TTL** - 1 hour max to keep responses fresh
4. **Clear cache on provider switch** - Different providers may give different responses
5. **Respect user expectations** - Don't cache when user explicitly regenerates

**Usage in GeminiProvider:**
```typescript
export class GeminiProvider implements LLMProvider {
  private rateLimiter = new RateLimiter();
  private cache = new LLMCache();

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    // Check cache first
    const cacheKey = this.cache.getCacheKey(messages, systemPrompt || '');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Check rate limit before API call
    await this.rateLimiter.checkLimit();

    // Make API call
    const response = await this.makeApiCall(messages, systemPrompt);

    // Cache response
    this.cache.set(cacheKey, response);

    return response;
  }
}
```

---
