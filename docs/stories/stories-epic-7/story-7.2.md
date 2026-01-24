# Story 7.2: Groq Integration + Rate Limiting

**Epic:** 7 - LLM Provider Enhancement (Groq Integration + Pluggable Architecture)
**Status:** done
**Priority:** P0 (High - Core Infrastructure)
**Points:** 3
**Dependencies:** Story 7.1 (Pluggable Provider Interface)
**Created:** 2026-01-22
**Developer:** TBD

---

## Story Description

Implement Groq as the third LLM provider with Llama 3.3 70B Versatile model, configurable rate limiting using a sliding window algorithm, and HTTP header monitoring for proactive quota management. This story enables users to leverage Groq's ultra-fast inference (0.5-1s vs 2-5s for Ollama/Gemini) while preventing quota exhaustion through conservative rate limiting.

**User Value:** Content creators can use Groq's ultra-fast inference for rapid script generation, with automatic rate limiting to prevent hitting API quotas. The system gracefully handles rate limit errors with retry-after parsing and provides visibility into remaining quota via HTTP header monitoring.

**Note:** This story is part of **Feature 1.9 Enhancement (PRD v3.6)** and implements the Groq provider with rate limiting. UI provider selection happens in Story 7.3.

---

## User Story

**As a** content creator,
**I want** to use Groq's ultra-fast LLM inference for script generation,
**So that** I can generate scripts in 0.5-1 seconds instead of 2-5 seconds.

**As a** developer,
**I want** the Groq provider to have configurable rate limiting with HTTP header monitoring,
**So that** the syste2m prevents API quota exhaustion and provides visibility into remaining quota.

---

## Acceptance Criteria

### AC-7.2.1: GroqProvider Class Implementation

**Given** the LLMProvider interface is defined in Story 7.1
**When** GroqProvider class is implemented
**Then** the system shall:
- Create `GroqProvider` class in `src/lib/llm/providers/groq-provider.ts`
- Implement `LLMProvider` interface explicitly
- Use `groq-sdk` npm package for API communication
- Accept `apiKey` and `model` parameters in constructor
- Default to `llama-3.3-70b-versatile` for model
- Validate `GROQ_API_KEY` environment variable at initialization
- Throw descriptive error if API key is missing or invalid
- Convert Message[] format to Groq's chat completions format
- Support system prompt as separate message role (Groq supports this)
- Return plain text response from `chat()` method

### AC-7.2.2: Rate Limiting Middleware Implementation

**Given** Groq has strict rate limits (30 RPM, 1,000 RPD free tier)
**When** rate limiting middleware is implemented
**Then** the system shall:
- Create `RateLimiter` class in `src/lib/llm/rate-limiter.ts`
- Implement sliding window algorithm with 60-second window
- Track request timestamps per provider in memory
- Enforce `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE` limit (default: 2 RPM)
- Wait until oldest timestamp expires before allowing next request if limit hit
- Log wait duration when rate limit is enforced
- Support enabling/disabling via `GROQ_RATE_LIMIT_ENABLED` environment variable
- Be reusable for other providers (Gemini, future providers)

### AC-7.2.3: HTTP Header Monitoring

**Given** Groq returns rate limit information in HTTP response headers
**When** Groq API calls are made
**Then** the system shall:
- Monitor `x-ratelimit-remaining-requests` header
- Monitor `x-ratelimit-limit-requests` header
- Monitor `x-ratelimit-reset-requests` header
- Log rate limit status after each API call (e.g., "Rate limit: 998/1000 remaining")
- Parse `retry-after` header from 429 responses
- Include retry-after duration in rate limit exceeded errors

### AC-7.2.4: Graceful 429 Error Handling

**Given** Groq returns HTTP 429 when rate limit is exceeded
**When** a 429 error occurs
**Then** the system shall:
- Catch 429 errors from Groq API
- Parse `retry-after` header for wait duration
- Log warning message with retry-after duration
- Wait the suggested duration before retrying (if within reasonable time)
- Throw descriptive error with guidance: "Rate limit exceeded. Waiting 30s..."
- Include actionable guidance in error message (switch provider or wait)

### AC-7.2.5: Environment Variable Configuration

**Given** Groq provider requires configuration
**When** environment variables are configured
**Then** the system shall:
- Read `GROQ_API_KEY` for API authentication (required)
- Read `GROQ_MODEL` for model selection (default: "llama-3.3-70b-versatile")
- Read `GROQ_RATE_LIMIT_ENABLED` for rate limiting toggle (default: "true")
- Read `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE` for rate limit (default: "2")
- Validate `GROQ_API_KEY` is present at initialization
- Provide clear error message if API key is missing with link to console.groq.com
- Support alternative models: `llama-3.1-8b-instant`, `gemma-2-9b-it`

### AC-7.2.6: Provider Factory Registration

**Given** the provider factory is implemented in Story 7.1
**When** Groq provider is registered in the factory
**Then** the system shall:
- Add `groq` case to switch statement in `createLLMProvider()`
- Return `GroqProvider` instance for `providerType === 'groq'`
- Validate `GROQ_API_KEY` environment variable before instantiation
- Pass model parameter from `GROQ_MODEL` environment variable
- Include `groq` in error message listing supported providers
- Maintain consistency with existing provider registrations

### AC-7.2.7: Integration Tests

**Given** the Groq provider is implemented
**When** integration tests are executed
**Then** the tests shall validate:
- Groq API authentication with valid API key
- Chat completion with Llama 3.3 70B model
- Message format conversion (Message[] to Groq format)
- System prompt handling (separate role in Groq)
- Error handling for invalid API key
- Error handling for rate limit (429) with mocked response
- HTTP header monitoring (mocked headers)
- Rate limiter enforces 2 RPM (1 request per 30 seconds)
- Rate limiter allows requests after window expires

**Specific Test Scenarios:**
- Valid API key generates response from Groq API
- Missing `GROQ_API_KEY` throws descriptive error
- Invalid API key throws authentication error
- Rate limit enforced: 2nd request waits ~30s after 1st request
- HTTP headers logged: `x-ratelimit-remaining-requests: 998`
- 429 error parsed with `retry-after: 30` and logged

### AC-7.2.8: Rate Limiter Unit Tests

**Given** the RateLimiter class is implemented
**When** unit tests are executed
**Then** the tests shall validate:
- Sliding window algorithm tracks timestamps correctly
- Requests within limit pass through without delay
- Requests exceeding limit wait until oldest timestamp expires
- Old timestamps (> 60s) are removed from window
- Rate limiter can be disabled via `enabled` parameter
- Different providers have independent rate limits (groq, gemini)
- Wait duration is calculated correctly

**Specific Test Scenarios:**
- 1st request at t=0 passes immediately
- 2nd request at t=10s passes immediately (limit: 2 RPM)
- 3rd request at t=15s waits until t=60s (oldest timestamp expires)
- Request at t=61s passes immediately (window reset)
- Disabled rate limiter allows unlimited requests

---

## Technical Design

### Architecture: GroqProvider with Rate Limiting

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│              (Script Generation, Chat)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Provider Factory                              │
│         createLLMProvider('groq') → GroqProvider               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GroqProvider                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Rate Limiter (Sliding Window)                          │   │
│  │  - Check limit BEFORE API call                          │   │
│  │  - Wait if 2 RPM exceeded                               │   │
│  │  - Track timestamps in 60s window                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Groq SDK (groq-sdk)                                    │   │
│  │  - chat.completions.create()                            │   │
│  │  - Model: llama-3.3-70b-versatile                       │   │
│  │  - Monitor HTTP headers                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  HTTP Header Monitoring                                 │   │
│  │  - x-ratelimit-remaining-requests                       │   │
│  │  - x-ratelimit-limit-requests                           │   │
│  │  - retry-after (on 429)                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/lib/llm/
├── provider.ts                      # LLMProvider interface (from Story 7.1)
├── factory.ts                       # Provider factory (MODIFIED - add groq case)
├── rate-limiter.ts                  # Sliding window rate limiter (NEW - AC-7.2.2)
├── types.ts                         # GenerateResult, LLMProviderError (from Story 7.1)
└── providers/
    ├── ollama-provider.ts           # Ollama implementation (from Story 7.1)
    ├── gemini-provider.ts           # Gemini implementation (from Story 7.1)
    └── groq-provider.ts             # Groq implementation (NEW - AC-7.2.1)

src/__tests__/unit/llm/
├── factory.test.ts                  # Factory tests (MODIFIED - add groq test)
├── rate-limiter.test.ts             # Rate limiter tests (NEW - AC-7.2.8)
└── groq-provider.test.ts            # Groq provider tests (NEW - AC-7.2.7)

src/__tests__/integration/
└── groq-provider.integration.test.ts # Groq integration tests (NEW - AC-7.2.7)
```

### GroqProvider Implementation (AC-7.2.1)

**Location:** `src/lib/llm/providers/groq-provider.ts`

```typescript
import Groq from 'groq-sdk';
import type { LLMProvider, Message } from '../provider';
import { RateLimiter } from '../rate-limiter';
import { parseRateLimitConfig } from '../rate-limiter';

export class GroqProvider implements LLMProvider {
  private client: Groq;
  private model: string;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
      throw new Error(
        'Groq API key not configured.\n' +
        'Get free API key at: https://console.groq.com/keys\n' +
        'Add to .env.local: GROQ_API_KEY=your_key_here'
      );
    }
    this.client = new Groq({ apiKey });
    this.model = model;
    this.rateLimiter = new RateLimiter();
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    // Check rate limit BEFORE API call
    const config = parseRateLimitConfig(
      'GROQ_RATE_LIMIT_ENABLED',
      'GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE',
      true,  // default enabled
      2      // default 2 RPM (1 request per 30 seconds)
    );
    await this.rateLimiter.wait('groq', config.requestsPerMinute, config.enabled);

    // Convert Message[] to Groq format
    const groqMessages: GroqMessage[] = [];

    // Add system prompt as first message if provided
    if (systemPrompt) {
      groqMessages.push({ role: 'system', content: systemPrompt });
    }

    // Add conversation messages
    groqMessages.push(...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })));

    try {
      // Make API call with HTTP header monitoring
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 8192,
        top_p: 0.95,
      });

      // Monitor rate limit headers for proactive management
      this.monitorRateLimits(response.headers);

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof Error) {
        // Handle 429 Rate Limit Exceeded
        if (error.message.includes('429') || error.message.includes('rate_limit_exceeded')) {
          throw new Error(
            'Groq rate limit exceeded.\n' +
            'Waiting 30s before retry...\n' +
            'Or switch provider: Ollama (local) or Gemini'
          );
        }
        // Handle authentication errors
        if (error.message.includes('401') || error.message.includes('invalid_api_key')) {
          throw new Error(
            'Groq API key invalid.\n' +
            'Get free API key at: https://console.groq.com/keys'
          );
        }
      }
      throw error;
    }
  }

  private monitorRateLimits(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining-requests');
    const limit = headers.get('x-ratelimit-limit-requests');
    const reset = headers.get('x-ratelimit-reset-requests');

    if (remaining !== null) {
      console.log(`[GroqProvider] Rate limit: ${remaining}/${limit} requests remaining`);
      console.log(`[GroqProvider] Reset at: ${reset}`);
    }

    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      console.warn(`[GroqProvider] Rate limit hit, retry-after: ${retryAfter} seconds`);
    }
  }
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### Rate Limiter Implementation (AC-7.2.2)

**Location:** `src/lib/llm/rate-limiter.ts`

```typescript
/**
 * Rate Limiter with Sliding Window Algorithm
 *
 * Tracks request timestamps in a 60-second rolling window.
 * If the number of requests in the window exceeds the limit,
 * waits until the oldest timestamp expires.
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly WINDOW_MS = 60000; // 1 minute

  /**
   * Wait if rate limit would be exceeded
   *
   * @param providerId - Provider identifier (e.g., 'groq', 'gemini')
   * @param requestsPerMinute - Maximum requests per minute
   * @param enabled - Whether rate limiting is enabled
   */
  async wait(providerId: string, requestsPerMinute: number, enabled: boolean): Promise<void> {
    if (!enabled) return;

    const now = Date.now();
    let timestamps = this.requests.get(providerId) || [];

    // Remove timestamps older than window (sliding window)
    timestamps = timestamps.filter(ts => now - ts < this.WINDOW_MS);

    // Check if at limit
    if (timestamps.length >= requestsPerMinute) {
      const oldestTimestamp = timestamps[0];
      const waitMs = oldestTimestamp + this.WINDOW_MS - now;

      if (waitMs > 0) {
        console.log(`[RateLimiter] ${providerId} rate limit hit, waiting ${waitMs/1000}s`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }

    // Add current timestamp AFTER waiting
    timestamps.push(now);
    this.requests.set(providerId, timestamps);
  }
}

/**
 * Parse rate limit configuration from environment variables
 *
 * @param enabledVar - Environment variable name for enabled flag
 * @param limitVar - Environment variable name for rate limit
 * @param defaultEnabled - Default value if env var not set
 * @param defaultLimit - Default rate limit if env var not set
 * @returns Rate limit configuration
 */
export function parseRateLimitConfig(
  enabledVar: string,
  limitVar: string,
  defaultEnabled: boolean,
  defaultLimit: number
): RateLimitConfig {
  const enabledRaw = process.env[enabledVar];
  let enabled = defaultEnabled;
  if (enabledRaw !== undefined) {
    enabled = enabledRaw.toLowerCase() === 'true';
  }

  const limitRaw = process.env[limitVar];
  let requestsPerMinute = defaultLimit;
  if (limitRaw !== undefined) {
    requestsPerMinute = parseInt(limitRaw, 10) || defaultLimit;
  }

  return { enabled, requestsPerMinute };
}

interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
}
```

### Factory Registration (AC-7.2.6)

**Location:** `src/lib/llm/factory.ts` (MODIFIED - add groq case)

```typescript
import { OllamaProvider } from './providers/ollama-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { GroqProvider } from './providers/groq-provider';
import type { LLMProvider } from './provider';

export function createLLMProvider(userPreference?: string): LLMProvider {
  const provider = userPreference || process.env.LLM_PROVIDER || 'ollama';

  switch (provider) {
    case 'ollama':
      return new OllamaProvider(
        process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        process.env.OLLAMA_MODEL || 'llama3.2'
      );

    case 'gemini':
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey || geminiApiKey === 'YOUR_API_KEY_HERE') {
        throw new Error(
          'GEMINI_API_KEY not configured in .env.local\n' +
          'Get free API key at: https://aistudio.google.com/apikey'
        );
      }
      return new GeminiProvider(
        geminiApiKey,
        process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      );

    case 'groq':
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey || groqApiKey === 'YOUR_GROQ_API_KEY_HERE') {
        throw new Error(
          'GROQ_API_KEY not configured in .env.local\n' +
          'Get free API key at: https://console.groq.com/keys'
        );
      }
      return new GroqProvider(
        groqApiKey,
        process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
      );

    default:
      throw new Error(
        `Unsupported LLM provider: ${provider}. ` +
        `Supported providers: ollama, gemini, groq. ` +
        `Check LLM_PROVIDER in .env.local or user preferences.`
      );
  }
}
```

### Environment Variables (AC-7.2.5)

**Location:** `.env.local`

```bash
# ============================================
# Groq Configuration (Optional, Ultra-Fast Cloud)
# ============================================
# Get free API key at: https://console.groq.com/keys
# Free tier: 30 requests/minute, 1,000 requests/day
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Available models:
# - llama-3.3-70b-versatile (recommended, best quality)
# - llama-3.1-8b-instruct (faster, lower quality)
# - gemma-2-9b-instruct (alternative)

# Rate limiting (default: 2 RPM = 1 request per 30 seconds)
GROQ_RATE_LIMIT_ENABLED=true
GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE=2
GROQ_RATE_LIMIT_SECONDS_PER_REQUEST=30
```

---

## Tasks

### Task 1: Implement Rate Limiter → AC-7.2.2, AC-7.2.8
- [ ] Create `src/lib/llm/rate-limiter.ts`
- [ ] Implement `RateLimiter` class with sliding window algorithm
- [ ] Add `wait(providerId, requestsPerMinute, enabled)` method
- [ ] Track request timestamps per provider in Map
- [ ] Remove timestamps older than 60 seconds (sliding window)
- [ ] Wait until oldest timestamp expires if limit hit
- [ ] Add `parseRateLimitConfig()` function for environment variable parsing
- [ ] Create `src/__tests__/unit/llm/rate-limiter.test.ts`
- [ ] Test sliding window algorithm (requests within limit pass through)
- [ ] Test rate limit enforcement (3rd request waits ~30s)
- [ ] Test old timestamp removal (> 60s)
- [ ] Test disabled rate limiter (unlimited requests)

### Task 2: Implement GroqProvider → AC-7.2.1
- [ ] Install `groq-sdk` npm package (`npm install groq-sdk`)
- [ ] Create `src/lib/llm/providers/groq-provider.ts`
- [ ] Implement `GroqProvider` class with `LLMProvider` interface
- [ ] Add constructor with `apiKey` and `model` parameters
- [ ] Validate `GROQ_API_KEY` at initialization with descriptive error
- [ ] Implement `chat()` method with Message[] to Groq format conversion
- [ ] Add system prompt handling (Groq supports separate system role)
- [ ] Add rate limit check BEFORE API call using RateLimiter
- [ ] Call Groq API using `groq-sdk` package
- [ ] Return response text from `choices[0].message.content`

### Task 3: Add HTTP Header Monitoring → AC-7.2.3, AC-7.2.4
- [ ] Add `monitorRateLimits()` method to GroqProvider
- [ ] Monitor `x-ratelimit-remaining-requests` header
- [ ] Monitor `x-ratelimit-limit-requests` header
- [ ] Monitor `x-ratelimit-reset-requests` header
- [ ] Log rate limit status after each API call
- [ ] Parse `retry-after` header from 429 responses
- [ ] Add catch block for 429 errors
- [ ] Throw descriptive error with retry-after duration

### Task 4: Register Groq in Factory → AC-7.2.6
- [ ] Update `src/lib/llm/factory.ts`
- [ ] Add `import { GroqProvider } from './providers/groq-provider'`
- [ ] Add `case 'groq'` to switch statement
- [ ] Validate `GROQ_API_KEY` environment variable
- [ ] Instantiate `GroqProvider` with `GROQ_MODEL` parameter
- [ ] Update error message to include 'groq' in supported providers list
- [ ] Update factory tests to include Groq case

### Task 5: Configure Environment Variables → AC-7.2.5
- [ ] Add `GROQ_API_KEY` to `.env.local` template
- [ ] Add `GROQ_MODEL` with default `llama-3.3-70b-versatile`
- [ ] Add `GROQ_RATE_LIMIT_ENABLED` with default `true`
- [ ] Add `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE` with default `2`
- [ ] Document available models in comments
- [ ] Document rate limit behavior (2 RPM = 1 req/30s)

### Task 6: Write Integration Tests → AC-7.2.7
- [ ] Create `src/__tests__/integration/groq-provider.integration.test.ts`
- [ ] Test Groq API authentication with valid API key (requires real API key or mock)
- [ ] Test chat completion with Llama 3.3 70B model
- [ ] Test Message[] to Groq format conversion
- [ ] Test system prompt handling (separate role)
- [ ] Test error handling for invalid API key
- [ ] Test error handling for rate limit (429) with mocked response
- [ ] Test HTTP header monitoring with mocked headers
- [ ] Test rate limiter integration (2 RPM enforcement)

### Task 7: Update Documentation → AC-7.2.3, AC-7.2.5
- [ ] Update `docs/architecture/llm-provider-abstraction-v2.md` with Groq section
- [ ] Update `docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md`
- [ ] Add Groq environment variables to `.env.local` template
- [ ] Document rate limiting behavior in architecture docs
- [ ] Document HTTP headers monitored by GroqProvider

---

## Dev Notes

### Architecture References
- **Tech Spec:** Epic 7 - Story 7.2 Acceptance Criteria
- **PRD:** Feature 1.9 Enhancement (FR-1.9.09 - Rate Limiting)
- **Epic File:** docs/epics/epic-7-llm-provider-enhancement-groq-integration.md - Story 7.2
- **Architecture:** docs/architecture/llm-provider-abstraction-v2.md (Groq section)
- **Quick Reference:** docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md
- **ADR-009:** Pluggable LLM Provider Interface
- **ADR-010:** Proactive Rate Limiting for Cloud LLM Providers
- **Groq Documentation:** https://console.groq.com/docs

### Dependencies
- **Story 7.1:** Pluggable LLM Provider Interface (LLMProvider interface, factory pattern)
- **groq-sdk npm package:** Groq API client (needs installation)
- **ollama npm package:** Ollama API client (already installed, for comparison)
- **@google/generative-ai npm package:** Gemini API client (already installed, for comparison)

### Learnings from Previous Story

**From Story 7.1 (Pluggable LLM Provider Interface) - Status: done**

- **LLMProvider Interface:** `chat(messages, systemPrompt)` method is the contract. Groq must implement this exactly.
- **Factory Pattern:** Add `case 'groq'` to switch statement in `createLLMProvider()`. Validate `GROQ_API_KEY` before instantiation.
- **Error Handling:** Use descriptive Error messages with actionable guidance (link to console.groq.com).
- **Message Format:** Groq supports system role (unlike Gemini), so add system prompt as separate message.
- **Rate Limiting Placeholder:** Story 7.1 established interface but didn't implement rate limiting. Story 7.2 adds `RateLimiter` class with sliding window algorithm.

**Patterns to Reuse:**
- LLMProvider interface compliance
- Factory registration pattern
- Environment variable validation
- Descriptive error messages with links

**New Files Created in Story 7.1:**
- `src/lib/llm/provider.ts` - LLMProvider interface
- `src/lib/llm/factory.ts` - Provider factory
- `src/lib/llm/types.ts` - GenerateResult, LLMProviderError
- `src/lib/llm/errors.ts` - LLMProviderError class
- `src/lib/llm/providers/ollama-provider.ts` - Ollama implementation
- `src/lib/llm/providers/gemini-provider.ts` - Gemini implementation

[Source: docs/stories/stories-epic-7/story-7.1.md#Dev-Agent-Record]

### Project Structure Notes

**Unified Project Structure Alignment:**
- Provider implementations in `src/lib/llm/providers/` subdirectory (consistent with Story 7.1)
- Rate limiter in `src/lib/llm/rate-limiter.ts` (new utility class)
- Tests in `src/__tests__/unit/llm/` and `src/__tests__/integration/` (consistent with test structure)

**No Conflicts Detected:** This story adds new Groq provider alongside existing Ollama/Gemini providers. No conflicts with unified project structure.

### Key Design Decisions

1. **Sliding Window Rate Limiting:** Tracks request timestamps in 60-second rolling window. More accurate than token bucket for this use case.
2. **Proactive Rate Limiting:** Enforce 2 RPM locally (conservative) to prevent hitting 30 RPM server limit.
3. **HTTP Header Monitoring:** Log `x-ratelimit-*` headers for visibility into remaining quota.
4. **Graceful 429 Handling:** Parse `retry-after` header and wait before retrying.
5. **Conservative Defaults:** 2 RPM (1 request per 30 seconds) to prevent quota exhaustion.

### Implementation Notes

- **Non-Breaking Addition:** Groq provider is additive. Existing Ollama/Gemini providers continue to work.
- **groq-sdk Installation:** Run `npm install groq-sdk` before implementation.
- **API Key Validation:** Validate `GROQ_API_KEY` at constructor time, not at call time.
- **System Prompt Handling:** Groq supports separate system role (like Ollama, unlike Gemini).
- **Rate Limiter Reusability:** `RateLimiter` class can be used for Gemini and future providers.

### Testing Strategy

- **Unit Tests:** Test RateLimiter sliding window algorithm, environment variable parsing
- **Integration Tests:** Test Groq API calls with mocked responses (authentication, rate limits, headers)
- **Factory Tests:** Test `createLLMProvider('groq')` returns GroqProvider instance
- **Test Coverage:** 80%+ for new files (rate-limiter, groq-provider)

### Groq API Details

**Base URL:** `https://api.groq.com/openai/v1`

**Headers:**
```
Authorization: Bearer {GROQ_API_KEY}
Content-Type: application/json
```

**Request Format:**
```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Generate a script about..."}
  ],
  "temperature": 0.7,
  "max_tokens": 8192,
  "top_p": 0.95
}
```

**Response Format:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Generated script text..."
      }
    }
  ],
  "headers": {
    "x-ratelimit-remaining-requests": "998",
    "x-ratelimit-limit-requests": "1000",
    "x-ratelimit-reset-requests": "1737550800"
  }
}
```

**Rate Limits (Free Tier):**
- 30 requests/minute
- 1,000 requests/day
- Conservative local limit: 2 RPM (1 request per 30 seconds)

### Future Considerations

- **UI Provider Selection:** Added in Story 7.3 (database persistence)
- **Streaming Responses:** Future enhancement (current: simple string response)
- **Model Selection UI:** Future enhancement (current: environment variable only)
- **Rate Limit Configuration UI:** Future enhancement (current: environment variable only)

---

## Definition of Done

- [ ] All Acceptance Criteria verified and passing
- [ ] GroqProvider implements LLMProvider interface
- [ ] Rate limiter with sliding window algorithm implemented
- [ ] HTTP header monitoring (`x-ratelimit-*`, `retry-after`)
- [ ] Graceful 429 error handling with retry-after parsing
- [ ] Groq registered in provider factory
- [ ] Environment variables configured (`GROQ_API_KEY`, `GROQ_MODEL`, rate limits)
- [ ] Integration tests pass with mocked Groq API
- [ ] Unit tests achieve 80%+ coverage
- [ ] Documentation updated (architecture, quick reference)
- [ ] Code reviewed and approved

---

## Story Points

**Estimate:** 3 points (Small-Medium)

**Justification:**
- GroqProvider class implementation (similar to Ollama/Gemini, straightforward)
- Rate limiter with sliding window algorithm (moderate complexity)
- HTTP header monitoring and 429 error handling (minor)
- Factory registration (minor, following Story 7.1 pattern)
- Integration tests with mocked responses (moderate)
- Documentation updates (minor)

---

## References

- PRD: Feature 1.9 Enhancement (FR-1.9.09 - Rate Limiting)
- Epic File: docs/epics/epic-7-llm-provider-enhancement-groq-integration.md - Story 7.2
- Architecture: docs/architecture/llm-provider-abstraction-v2.md (Groq section)
- Quick Reference: docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md
- ADR-009: Pluggable LLM Provider Interface
- ADR-010: Proactive Rate Limiting for Cloud LLM Providers
- Groq Documentation: https://console.groq.com/docs
- Story 7.1: Pluggable LLM Provider Interface (dependency)

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
