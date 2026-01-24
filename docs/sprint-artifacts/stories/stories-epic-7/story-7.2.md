# Story 7.2: Groq Integration + Rate Limiting

**Epic:** 7 - LLM Provider Enhancement (Groq Integration + Pluggable Architecture)
**Status:** drafted
**Priority:** P0 (High - Core Feature)
**Points:** 3
**Dependencies:** Story 7.1 (Pluggable Provider Interface)
**Created:** 2026-01-22
**Developer:** TBD

---

## Story Description

Implement Groq as the third LLM provider with ultra-fast inference using Llama 3.3 70B Versatile model, configurable rate limiting with sliding window algorithm, HTTP header monitoring for proactive quota management, and graceful 429 error handling with retry-after parsing.

**User Value:** Content creators can use Groq's ultra-fast inference (0.5-1s vs 2-5s for Ollama/Gemini) for faster script generation, with built-in rate limiting preventing quota exhaustion and automatic handling of rate limit errors.

**Note:** This story is part of **Feature 1.9 Enhancement (PRD v3.6)** and implements the Groq provider with rate limiting. UI provider selection happens in Story 7.3.

---

## User Story

**As a** content creator,
**I want** to use Groq's ultra-fast LLM inference for script generation,
**So that** I can generate scripts 3-5x faster than with Ollama or Gemini.

**As a** developer,
**I want** configurable rate limiting with HTTP header monitoring,
**So that** the system prevents quota exhaustion and handles rate limits gracefully.

---

## Acceptance Criteria

### AC-7.2.1: Groq SDK Integration

**Given** the pluggable LLM provider interface from Story 7.1
**When** Groq provider is implemented
**Then** the system shall:
- Install `groq-sdk` npm package as a dependency
- Import `Groq` class from `groq-sdk` package
- Create `GroqProvider` class in `src/lib/llm/providers/groq-provider.ts`
- Implement `LLMProvider` interface explicitly
- Accept `apiKey` and `model` parameters in constructor
- Validate `apiKey` is not empty or placeholder at initialization
- Throw descriptive error: "Groq API key not configured.\nGet key at: console.groq.com/keys"

### AC-7.2.2: Groq Model Configuration

**Given** the Groq provider is initialized
**When** the provider is instantiated
**Then** the system shall:
- Use `llama-3.3-70b-versatile` as default model
- Support alternative models: `llama-3.1-8b-instant`, `gemma-2-9b-it`
- Load model from `GROQ_MODEL` environment variable if set
- Pass model name to Groq API `chat.completions.create()` call
- Configure generation parameters: `temperature: 0.7`, `max_tokens: 8192`, `top_p: 0.95`

### AC-7.2.3: Rate Limiter Implementation

**Given** multiple cloud providers with rate limits
**When** rate limiting middleware is implemented
**Then** the system shall:
- Create `RateLimiter` class in `src/lib/llm/rate-limiter.ts`
- Implement sliding window algorithm with 60-second window
- Track request timestamps per provider ID in `Map<string, number[]>`
- Filter timestamps older than window before checking limit
- Wait until oldest timestamp expires if limit reached
- Add current timestamp AFTER waiting
- Support `enabled` parameter to disable rate limiting per provider

### AC-7.2.4: Groq Rate Limiting Integration

**Given** the RateLimiter class is implemented
**When** Groq provider makes an API call
**Then** the system shall:
- Call `rateLimiter.wait('groq', requestsPerMinute, enabled)` BEFORE API call
- Parse `GROQ_RATE_LIMIT_ENABLED` environment variable (default: "true")
- Parse `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE` environment variable (default: "2")
- Default to 2 RPM (1 request per 30 seconds, 15x safety factor)
- Log rate limit check: "[RateLimiter] groq rate limit check passed (1/2 used)"
- Log wait duration: "[RateLimiter] groq rate limit hit, waiting 30.0s"

### AC-7.2.5: HTTP Header Monitoring

**Given** Groq API returns rate limit headers in responses
**When** Groq provider receives an API response
**Then** the system shall:
- Extract `x-ratelimit-remaining-requests` header
- Extract `x-ratelimit-limit-requests` header
- Extract `x-ratelimit-reset-requests` header
- Log rate limit status: "[GroqProvider] Rate limit: 998/1000 requests remaining"
- Log reset time: "[GroqProvider] Reset at: 1737550800"
- Store monitoring method in private `monitorRateLimits(headers: Headers)` method

### AC-7.2.6: Graceful 429 Error Handling

**Given** Groq API returns 429 Too Many Requests error
**When** rate limit is exceeded
**Then** the system shall:
- Catch 429 errors in try-catch block around API call
- Extract `retry-after` header for wait duration
- Parse header value as integer (seconds)
- Log warning: "[GroqProvider] Rate limit hit, retry-after: 30 seconds"
- Wait for specified duration using `setTimeout`
- Retry the API call after wait period
- Throw descriptive error if retry fails: "Rate limit exceeded. Waiting 30s..."

### AC-7.2.7: Message Format Conversion

**Given** the unified `Message[]` format from LLMProvider interface
**When** Groq provider converts messages for Groq API
**Then** the system shall:
- Prepend system prompt as first message with `role: 'system'` if provided
- Map Message[] to Groq format with `role: 'user' | 'assistant'`
- Preserve message order from input
- Pass converted messages to `groq.chat.completions.create()`
- Handle Groq's native system role support (unlike Gemini)

### AC-7.2.8: Provider Factory Registration

**Given** the GroqProvider class is implemented
**When** the provider factory is updated
**Then** the system shall:
- Import `GroqProvider` in `src/lib/llm/factory.ts`
- Add `case 'groq':` branch to switch statement
- Load `GROQ_API_KEY` from environment variables
- Validate API key is set before instantiation
- Pass `apiKey` and `model` parameters to GroqProvider constructor
- Throw error: "GROQ_API_KEY not configured in .env.local" if missing
- Return GroqProvider instance for `createLLMProvider('groq')` call

### AC-7.2.9: Environment Variable Configuration

**Given** Groq provider requires configuration
**When** environment variables are set
**Then** the system shall:
- Read `GROQ_API_KEY` (required) from environment
- Read `GROQ_MODEL` (optional, default: "llama-3.3-70b-versatile") from environment
- Read `GROQ_RATE_LIMIT_ENABLED` (optional, default: "true") from environment
- Read `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE` (optional, default: "2") from environment
- Validate API key is not empty string or "YOUR_GROQ_API_KEY_HERE" placeholder
- Include template in `.env.local.example` with comments explaining each variable

### AC-7.2.10: Integration Tests

**Given** Groq provider is implemented
**When** integration tests are executed
**Then** the tests shall validate:
- Groq provider instantiates with valid API key
- Groq provider throws error with invalid API key
- `chat()` method sends correct payload to Groq API
- Rate limiter enforces 2 RPM with mocked time
- Rate limiter waits 30 seconds between requests
- HTTP header monitoring extracts correct headers
- 429 error handling waits for `retry-after` duration
- Factory creates GroqProvider for 'groq' provider type
- Test coverage achieves 80%+ for new files

**Specific Test Scenarios:**
- `new GroqProvider('valid-key')` creates instance successfully
- `new GroqProvider('')` throws error with API key message
- `rateLimiter.wait('groq', 2, true)` called twice, third call waits 30s
- `groqProvider.chat()` converts Message[] to Groq format correctly
- 429 error with `retry-after: 30` triggers 30-second wait
- `createLLMProvider('groq')` returns instance of GroqProvider

---

## Technical Design

### Architecture: Provider Implementation with Rate Limiting

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                           │
│  (Script Generation, Chat Interface, RAG Pipeline)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Provider Factory                              │
│  createLLMProvider('groq') → GroqProvider instance              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GroqProvider                                 │
│  - Implements LLMProvider interface                             │
│  - Uses groq-sdk for API communication                          │
│  - Integrates RateLimiter for quota management                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Rate Limiter   │ │  Groq SDK       │ │  HTTP Header    │
│  (Sliding       │ │  API Client     │ │  Monitoring     │
│   Window)       │ │                 │ │                 │
│  • 2 RPM limit  │ │  • Chat API     │ │  • x-ratelimit-*│
│  • 60s window   │ │  • Llama 3.3    │ │  • retry-after  │
│  • Wait logic   │ │  • Error handl. │ │  • Logging      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### File Structure

```
src/lib/llm/
├── providers/
│   ├── ollama-provider.ts           # Story 7.1 (EXISTING)
│   ├── gemini-provider.ts           # Story 7.1 (EXISTING)
│   └── groq-provider.ts             # NEW - AC-7.2.1, AC-7.2.2
├── rate-limiter.ts                  # NEW - AC-7.2.3
├── factory.ts                       # MODIFIED - AC-7.2.8
└── provider.ts                      # Story 7.1 (EXISTING - interface)

src/__tests__/unit/llm/
├── groq-provider.test.ts            # NEW - AC-7.2.10
└── rate-limiter.test.ts             # NEW - AC-7.2.10

.env.local                           # MODIFIED - AC-7.2.9
package.json                         # MODIFIED - AC-7.2.1 (add groq-sdk)
```

### GroqProvider Implementation

**Location:** `src/lib/llm/providers/groq-provider.ts`

```typescript
import Groq from 'groq-sdk';
import type { LLMProvider, Message } from '../provider';
import { RateLimiter } from '../rate-limiter';
import { parseRateLimitConfig } from '../rate-limit-config';

export class GroqProvider implements LLMProvider {
  private client: Groq;
  private model: string;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
      throw new Error(
        'Groq API key not configured.\n' +
        'Get free API key at: https://console.groq.com/keys'
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

    // Make API call with retry logic for 429 errors
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: groqMessages,
          temperature: 0.7,
          max_tokens: 8192,
          top_p: 0.95,
        });

        // Monitor rate limit headers
        this.monitorRateLimits(response.headers);

        return response.choices[0]?.message?.content || '';

      } catch (error: any) {
        // Handle 429 rate limit errors
        if (error.status === 429 && retries < maxRetries) {
          const retryAfter = error.headers?.['retry-after'];
          const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 30;

          console.warn(
            `[GroqProvider] Rate limit hit, retry-after: ${waitSeconds} seconds`
          );

          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
          retries++;
          continue;
        }

        // Re-throw other errors
        throw error;
      }
    }

    throw new Error('Rate limit exceeded. Max retries reached.');
  }

  private monitorRateLimits(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining-requests');
    const limit = headers.get('x-ratelimit-limit-requests');
    const reset = headers.get('x-ratelimit-reset-requests');

    if (remaining !== null) {
      console.log(
        `[GroqProvider] Rate limit: ${remaining}/${limit} requests remaining`
      );
      console.log(`[GroqProvider] Reset at: ${reset}`);
    }

    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      console.warn(
        `[GroqProvider] Rate limit hit, retry-after: ${retryAfter} seconds`
      );
    }
  }
}
```

### RateLimiter Implementation

**Location:** `src/lib/llm/rate-limiter.ts`

```typescript
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly WINDOW_MS = 60000; // 1 minute

  async wait(
    providerId: string,
    requestsPerMinute: number,
    enabled: boolean
  ): Promise<void> {
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
        console.log(
          `[RateLimiter] ${providerId} rate limit hit, waiting ${waitMs/1000}s`
        );
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }

    // Add current timestamp AFTER waiting
    timestamps.push(now);
    this.requests.set(providerId, timestamps);
  }
}
```

### Rate Limit Configuration Parser

**Location:** `src/lib/llm/rate-limit-config.ts`

```typescript
export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
}

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
```

### Factory Update

**Location:** `src/lib/llm/factory.ts` (partial update)

```typescript
import { GroqProvider } from './providers/groq-provider';

export function createLLMProvider(userPreference?: string): LLMProvider {
  const provider = userPreference || process.env.LLM_PROVIDER || 'ollama';

  switch (provider) {
    case 'ollama':
      return new OllamaProvider(...);
    case 'gemini':
      return new GeminiProvider(...);

    case 'groq':
      if (!process.env.GROQ_API_KEY) {
        throw new Error(
          'GROQ_API_KEY not configured in .env.local\n' +
          'Get free API key at: https://console.groq.com/keys'
        );
      }
      return new GroqProvider(
        process.env.GROQ_API_KEY,
        process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
      );

    default:
      throw new Error(`Unsupported LLM provider: ${provider}...`);
  }
}
```

### Environment Variables

**Location:** `.env.local` (add to existing file)

```bash
# ============================================================
# Groq Configuration (Optional, Ultra-Fast Cloud)
# ============================================================
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

### Task 1: Install Groq SDK → AC-7.2.1
- [ ] Run `npm install groq-sdk` to add Groq SDK package
- [ ] Verify package added to `package.json` dependencies
- [ ] Import `Groq` class from `groq-sdk` in provider file
- [ ] Test import compiles without errors

### Task 2: Implement RateLimiter Class → AC-7.2.3
- [ ] Create `src/lib/llm/rate-limiter.ts`
- [ ] Implement sliding window algorithm with 60-second window
- [ ] Track request timestamps per provider ID using Map
- [ ] Implement filter logic to remove timestamps older than window
- [ ] Implement wait logic when limit is reached
- [ ] Add current timestamp after waiting
- [ ] Add `enabled` parameter to disable rate limiting

### Task 3: Implement Rate Limit Config Parser → AC-7.2.4
- [ ] Create `src/lib/llm/rate-limit-config.ts`
- [ ] Define `RateLimitConfig` interface with `enabled` and `requestsPerMinute`
- [ ] Implement `parseRateLimitConfig()` function
- [ ] Parse enabled flag from environment variable (default: true)
- [ ] Parse requests per minute from environment variable (default: 2)
- [ ] Return configuration object

### Task 4: Implement GroqProvider Class → AC-7.2.1, AC-7.2.2, AC-7.2.5, AC-7.2.6, AC-7.2.7
- [ ] Create `src/lib/llm/providers/groq-provider.ts`
- [ ] Import `Groq` from `groq-sdk`, `LLMProvider` interface, `RateLimiter`
- [ ] Implement constructor with `apiKey` and `model` parameters
- [ ] Validate API key is not empty or placeholder
- [ ] Initialize Groq client with API key
- [ ] Initialize RateLimiter instance
- [ ] Implement `chat()` method with Message[] and systemPrompt parameters
- [ ] Parse rate limit config before API call
- [ ] Call `rateLimiter.wait()` with provider config
- [ ] Convert Message[] to Groq format with system prompt
- [ ] Make API call to `groq.chat.completions.create()`
- [ ] Call `monitorRateLimits()` with response headers
- [ ] Implement 429 error handling with retry-after parsing
- [ ] Implement retry logic for 429 errors
- [ ] Return response content or throw error

### Task 5: Implement HTTP Header Monitoring → AC-7.2.5
- [ ] Create private `monitorRateLimits(headers: Headers)` method
- [ ] Extract `x-ratelimit-remaining-requests` header
- [ ] Extract `x-ratelimit-limit-requests` header
- [ ] Extract `x-ratelimit-reset-requests` header
- [ ] Log rate limit status with remaining/limit counts
- [ ] Log reset time from header
- [ ] Extract and log `retry-after` header if present

### Task 6: Update Provider Factory → AC-7.2.8
- [ ] Import `GroqProvider` in `src/lib/llm/factory.ts`
- [ ] Add `case 'groq':` branch to switch statement
- [ ] Load `GROQ_API_KEY` from environment variables
- [ ] Validate API key is set before instantiation
- [ ] Pass `apiKey` and `model` parameters to GroqProvider constructor
- [ ] Add error message if API key missing
- [ ] Test factory creates GroqProvider for 'groq' type

### Task 7: Configure Environment Variables → AC-7.2.9
- [ ] Add `GROQ_API_KEY` to `.env.local.example` with comment
- [ ] Add `GROQ_MODEL` to `.env.local.example` with default value
- [ ] Add `GROQ_RATE_LIMIT_ENABLED` to `.env.local.example`
- [ ] Add `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE` to `.env.local.example`
- [ ] Add comments explaining each variable and available options
- [ ] Document Groq API key URL (console.groq.com/keys)

### Task 8: Write Unit Tests → AC-7.2.10
- [ ] Create `src/__tests__/unit/llm/groq-provider.test.ts`
- [ ] Test GroqProvider instantiation with valid API key
- [ ] Test GroqProvider throws error with invalid API key
- [ ] Test `chat()` method converts Message[] to Groq format
- [ ] Test rate limiter called before API call
- [ ] Test HTTP header monitoring extracts correct headers
- [ ] Test 429 error handling with retry-after parsing
- [ ] Create `src/__tests__/unit/llm/rate-limiter.test.ts`
- [ ] Test rate limiter enforces 2 RPM for Groq
- [ ] Test rate limiter waits 30 seconds between requests
- [ ] Test rate limiter sliding window filters old timestamps
- [ ] Test rate limiter respects `enabled` parameter
- [ ] Test factory creates GroqProvider for 'groq' type
- [ ] Achieve 80%+ test coverage for new files

### Task 9: Integration Testing → AC-7.2.10
- [ ] Create integration test for Groq provider with mocked API
- [ ] Test end-to-end script generation with Groq
- [ ] Test rate limiting behavior over multiple requests
- [ ] Test provider factory returns correct instance
- [ ] Test error handling for invalid API key
- [ ] Test error handling for rate limit exceeded
- [ ] Verify all integration tests pass

### Task 10: Documentation → AC-7.2.9
- [ ] Update README.md with Groq provider setup instructions
- [ ] Add Groq to provider comparison table
- [ ] Document environment variables in configuration section
- [ ] Add troubleshooting section for common Groq issues
- [ ] Update architecture documentation with Groq implementation
- [ ] Add code comments explaining rate limiting logic

---

## Dev Notes

### Architecture References
- **Tech Spec:** Epic 7 - Story 7.2 Acceptance Criteria
- **PRD:** Feature 1.9 Enhancement (FR-1.9.09, FR-1.9.13)
- **Epic File:** docs/epics/epic-7-llm-provider-enhancement-groq-integration.md - Story 7.2
- **Architecture:** docs/architecture/llm-provider-abstraction-v2.md (Complete v2 architecture)
- **Quick Reference:** docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md
- **Diagrams:** docs/architecture/llm-provider-diagrams.md
- **ADR-010:** Proactive Rate Limiting for Cloud LLM Providers

### Dependencies
- **Story 7.1:** Pluggable LLM Provider Interface (provides LLMProvider interface, factory pattern)
- **groq-sdk npm package:** Groq API client (NEW - install in this story)
- **Rate Limiter:** NEW implementation in this story (reusable for Gemini provider)

### Learnings from Previous Story

**From Story 7.1 (Pluggable Provider Interface) - Status: done**

- **Interface-First Design:** Story 7.1 defined `LLMProvider` interface first. Follow same pattern: implement GroqProvider by implementing the interface, no deviations.
- **Factory Pattern:** Story 7.1 created `createLLMProvider()` factory. Add Groq case to switch statement, maintain consistency with Ollama/Gemini implementations.
- **Error Handling:** Story 7.1 used descriptive error messages with actionable guidance. Follow pattern: "Get API key at console.groq.com/keys".
- **Testing Setup:** Story 7.1 created test infrastructure at `src/__tests__/unit/llm/`. Add `groq-provider.test.ts` and `rate-limiter.test.ts` following same patterns.
- **Environment Variables:** Story 7.1 used `process.env` for configuration. Add `GROQ_*` variables following naming convention: `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_RATE_LIMIT_*`.

**New Patterns to Implement:**
- **Rate Limiting:** NEW pattern not in Story 7.1. Implement sliding window algorithm in `RateLimiter` class for reuse by Gemini provider in future refactoring.
- **HTTP Header Monitoring:** NEW pattern for cloud providers. Extract and log rate limit headers for proactive quota management.
- **429 Error Handling:** NEW retry logic with `retry-after` parsing. Handle rate limit errors gracefully with automatic retry.

[Source: docs/sprint-artifacts/stories/stories-epic-7/story-7.1.md#Dev-Agent-Record]

### Project Structure Notes

**Unified Project Structure Alignment:**
- Library code in `src/lib/llm/` (consistent with Story 7.1 structure)
- Provider implementations in `src/lib/llm/providers/` subdirectory
- Rate limiter as separate module at `src/lib/llm/rate-limiter.ts` (NEW)
- Tests in `src/__tests__/unit/llm/` (consistent with test structure)

**No Conflicts Detected:** This story adds new files alongside existing providers, adds rate limiting capability.

### Key Design Decisions

1. **Sliding Window Rate Limiting:** Prevents quota exhaustion by enforcing conservative local limits (2 RPM vs 30 RPM actual)
2. **Proactive + Reactive Strategy:** Local enforcement prevents hitting quota, HTTP header monitoring tracks remaining quota
3. **Retry Logic for 429 Errors:** Parse `retry-after` header, wait specified duration, retry request automatically
4. **Groq Model Selection:** Default to `llama-3.3-70b-versatile` (best quality), support faster alternatives
5. **Reusable Rate Limiter:** Design for use by Gemini provider in future refactoring (not this story)

### Implementation Notes

- **Non-Breaking Addition:** Groq provider is additive, does not modify existing Ollama/Gemini providers
- **Story 7.3 Preparation:** Rate limiter and HTTP header monitoring prepare for UI provider selection
- **Groq SDK Documentation:** https://console.groq.com/docs - reference for API usage
- **Free Tier Limits:** 30 RPM actual, 1,000 requests/day - 2 RPM local limit provides 15x safety factor
- **Rate Limit Configuration:** Use `parseRateLimitConfig()` helper for consistent environment variable parsing across providers

### Rate Limiting Strategy

**Proactive:**
- Enforce 2 RPM locally (1 request per 30 seconds)
- Sliding window algorithm tracks requests in 60-second window
- Prevents hitting API quota before server-side limit

**Reactive:**
- Monitor `x-ratelimit-remaining-*` headers after each request
- Log remaining quota for visibility
- Parse `retry-after` header on 429 errors
- Automatic retry after wait period

**Comparison:**
- Ollama: No rate limiting (local, unlimited)
- Gemini: 1 RPM local (15 RPM actual, 15x safety factor)
- Groq: 2 RPM local (30 RPM actual, 15x safety factor)

### Testing Strategy

- **Unit Tests:** Test rate limiter logic, Message[] format conversion, error handling
- **Integration Tests:** Test Groq provider with mocked API responses
- **Rate Limiter Tests:** Test sliding window algorithm, wait logic, filtering old timestamps
- **429 Error Tests:** Test retry-after parsing, wait duration, retry logic
- **Test Coverage:** 80%+ for new files (groq-provider, rate-limiter)

### Future Considerations

- **Gemini Provider Enhancement:** Apply rate limiting to Gemini provider (uses current Story 7.1 implementation without rate limiting)
- **Rate Limit Monitoring UI:** Display rate limit status in Settings → AI Configuration (Story 7.3)
- **Dynamic Rate Limit Adjustment:** Auto-adjust local limits based on HTTP header feedback (future enhancement)
- **Rate Limit Warnings:** Proactive warnings when approaching quota (future enhancement)

---

## Definition of Done

- [ ] All Acceptance Criteria verified and passing
- [ ] Groq SDK installed and imported
- [ ] GroqProvider implements LLMProvider interface
- [ ] RateLimiter class with sliding window algorithm
- [ ] Groq rate limiting defaults to 2 RPM (1 req/30s)
- [ ] HTTP header monitoring implemented and logging
- [ ] 429 error handling with retry-after parsing
- [ ] Provider factory includes Groq case
- [ ] Environment variables documented in `.env.local.example`
- [ ] Unit tests achieve 80%+ coverage
- [ ] Integration tests pass with mocked Groq API
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## Story Points

**Estimate:** 3 points (Small-Medium)

**Justification:**
- Groq SDK integration (straightforward, similar to Gemini)
- Rate limiter implementation (moderate - new algorithm)
- HTTP header monitoring (minor)
- 429 error handling (moderate - retry logic)
- Provider factory update (minor - add one case)
- Unit and integration tests (moderate)
- Foundation for Story 7.3 (UI provider selector)

---

## References

- PRD: Feature 1.9 Enhancement (FR-1.9.09, FR-1.9.13)
- Epic File: docs/epics/epic-7-llm-provider-enhancement-groq-integration.md - Story 7.2
- Architecture: docs/architecture/llm-provider-abstraction-v2.md (Complete v2 spec)
- Quick Reference: docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md
- Diagrams: docs/architecture/llm-provider-diagrams.md
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
