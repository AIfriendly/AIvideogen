# Story 7.1: Pluggable LLM Provider Interface

**Epic:** 7 - LLM Provider Enhancement (Groq Integration + Pluggable Architecture)
**Status:** done
**Priority:** P0 (High - Core Infrastructure)
**Points:** 5
**Dependencies:** Epic 1 (LLM provider abstraction - existing Ollama/Gemini code)
**Created:** 2026-01-22
**Developer:** TBD

---

## Story Description

Refactor the existing LLM providers (Ollama, Gemini) into a pluggable architecture with a consistent interface, enabling runtime provider switching. This story establishes the foundation for adding Groq as a third provider and enables UI-based provider selection in Story 7.3.

**User Value:** The system can seamlessly switch between LLM providers (Ollama, Gemini, Groq) without code changes, enabling provider rotation for quota management and fallback options when a provider is unavailable.

**Note:** This story is part of **Feature 1.9 Enhancement (PRD v3.6)** and implements the pluggable provider interface. Groq integration happens in Story 7.2, UI provider selection in Story 7.3.

---

## User Story

**As a** developer,
**I want** a pluggable LLM provider architecture with a unified interface,
**So that** the system can switch between providers at runtime without code changes.

**As a** content creator,
**I want** the system to support multiple LLM providers with consistent behavior,
**So that** I can choose the best provider for my needs (speed, quality, privacy).

---

## Acceptance Criteria

### AC-7.1.1: LLMProvider Interface Definition

**Given** the existing Ollama and Gemini provider code from Epic 1
**When** the pluggable provider interface is defined
**Then** the system shall:
- Define `LLMProvider` interface in `src/lib/llm/provider.ts`
- Include `chat(messages: Message[], systemPrompt?: string): Promise<string>` method
- Include `Message` type definition with `role: 'user' | 'assistant' | 'system'` and `content: string`
- Document the interface with JSDoc comments explaining the contract
- Export both `LLMProvider` interface and `Message` type for provider implementations

### AC-7.1.2: Provider Factory Implementation

**Given** the LLMProvider interface is defined
**When** the provider factory is implemented
**Then** the system shall:
- Create `createLLMProvider(providerType: string)` function in `src/lib/llm/factory.ts`
- Return `OllamaProvider` instance for `providerType === 'ollama'`
- Return `GeminiProvider` instance for `providerType === 'gemini'`
- Throw descriptive error for unsupported provider types
- Load configuration from environment variables (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`)
- Validate required environment variables before instantiation
- Support optional `userPreference` parameter (for Story 7.3 database integration)

### AC-7.1.3: OllamaProvider Refactoring

**Given** the existing Ollama implementation from Epic 1
**When** OllamaProvider is refactored to implement LLMProvider interface
**Then** the system shall:
- Move existing Ollama code to `src/lib/llm/providers/ollama-provider.ts`
- Implement `LLMProvider` interface explicitly
- Maintain backward compatibility with existing `chat()` method signature
- Handle system prompt injection (Ollama supports separate system role)
- Use `ollama` npm package for API communication
- Default to `http://localhost:11434` for base URL
- Default to `llama3.2` for model
- Throw descriptive errors for connection failures and model not found
- NOT break existing functionality (all existing tests pass)

### AC-7.1.4: GeminiProvider Refactoring

**Given** the existing Gemini implementation from Epic 1
**When** GeminiProvider is refactored to implement LLMProvider interface
**Then** the system shall:
- Move existing Gemini code to `src/lib/llm/providers/gemini-provider.ts`
- Implement `LLMProvider` interface explicitly
- Maintain backward compatibility with existing `chat()` method signature
- Handle system prompt injection (Gemini doesn't support separate system role, prepend to first message)
- Convert Message[] format to Gemini's format (role mapping: 'assistant' → 'model')
- Use `@google/generative-ai` npm package for API communication
- Default to `gemini-2.5-flash` for model
- Validate API key at initialization
- Throw descriptive errors for authentication failures and model not found
- NOT break existing functionality (all existing tests pass)

### AC-7.1.5: Unified Response Format

**Given** multiple LLM providers with different response formats
**When** providers are called through the LLMProvider interface
**Then** the system shall:
- Define `GenerateResult` type in `src/lib/llm/types.ts` (optional, for future use)
- Return plain text `string` from `chat()` method (current approach)
- All providers return consistent `Promise<string>` response
- Response contains only the generated text content (no metadata in response)
- Future extensibility: `GenerateResult` type can add metadata without breaking existing code

### AC-7.1.6: Standardized Error Handling

**Given** different providers have different error formats
**When** errors occur during LLM calls
**Then** the system shall:
- Define `LLMProviderError` class in `src/lib/llm/errors.ts`
- Include `code` property with error codes: `RATE_LIMIT_EXCEEDED`, `AUTHENTICATION_FAILED`, `NETWORK_ERROR`, `INVALID_REQUEST`, `PROVIDER_UNAVAILABLE`
- Include `message` property with user-friendly error description
- Include `provider` property indicating which provider threw the error
- Include `originalError` property with the original error object
- All providers wrap errors in `LLMProviderError` before throwing
- Error messages include actionable guidance (e.g., "Get API key at console.groq.com")

### AC-7.1.7: Script Generation Service Integration

**Given** the existing script generation service from Epic 2
**When** the service is updated to use the factory pattern
**Then** the system shall:
- Update `src/lib/services/script-generation.ts` to use `createLLMProvider()`
- Remove direct provider instantiation (hardcoded Ollama/Gemini)
- Pass `providerType` parameter (from environment or user preference)
- Gracefully handle `LLMProviderError` with retry logic for rate limits
- Log provider selection for debugging
- NOT break existing script generation functionality
- Maintain backward compatibility with existing API routes

### AC-7.1.8: Unit Tests for Factory and Interface

**Given** the pluggable provider architecture is implemented
**When** unit tests are executed
**Then** the tests shall validate:
- Factory creates correct provider instance for 'ollama', 'gemini'
- Factory throws descriptive error for invalid provider type
- All providers implement `LLMProvider` interface (TypeScript compilation check)
- `chat()` method signature is consistent across all providers
- `LLMProviderError` is thrown with correct error codes
- Error messages are descriptive and actionable
- Test coverage achieves 80%+ for new files (factory, types, errors)

**Specific Test Scenarios:**
- `createLLMProvider('ollama')` returns instance of `OllamaProvider`
- `createLLMProvider('gemini')` returns instance of `GeminiProvider`
- `createLLMProvider('invalid')` throws error with message listing valid providers
- `OllamaProvider.chat()` calls ollama.chat() with correct parameters
- `GeminiProvider.chat()` converts Message[] to Gemini format correctly
- Missing `GEMINI_API_KEY` throws `LLMProviderError` with `AUTHENTICATION_FAILED` code
- Network error throws `LLMProviderError` with `NETWORK_ERROR` code

---

## Technical Design

### Architecture Pattern: Strategy Pattern + Factory Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                  Application Layer                             │
│  (Script Generation, Chat Interface, RAG Pipeline)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Provider Factory                              │
│  createLLMProvider(providerType: string): LLMProvider           │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ OllamaProvider  │ │ GeminiProvider  │ │  GroqProvider   │
│                 │ │                 │ │  (Story 7.2)    │
│ Implements      │ │ Implements      │ │ Implements      │
│ LLMProvider     │ │ LLMProvider     │ │ LLMProvider     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### File Structure

```
src/lib/llm/
├── provider.ts                      # LLMProvider interface and Message type (NEW - AC-7.1.1)
├── factory.ts                       # Provider factory function (NEW - AC-7.1.2)
├── types.ts                         # GenerateResult, LLMProviderError (NEW - AC-7.1.5, AC-7.1.6)
├── errors.ts                        # LLMProviderError class (NEW - AC-7.1.6)
└── providers/
    ├── ollama-provider.ts           # Ollama implementation (MOVED - AC-7.1.3)
    ├── gemini-provider.ts           # Gemini implementation (MOVED - AC-7.1.4)
    └── groq-provider.ts             # Groq implementation (Story 7.2 - NOT YET)

src/lib/services/
└── script-generation.ts             # Updated to use factory (MODIFIED - AC-7.1.7)

src/__tests__/unit/llm/
├── factory.test.ts                  # Factory tests (NEW - AC-7.1.8)
├── provider-interface.test.ts       # Interface compliance tests (NEW - AC-7.1.8)
├── ollama-provider.test.ts          # Ollama tests (EXISTING - verify pass)
└── gemini-provider.test.ts          # Gemini tests (EXISTING - verify pass)
```

### Interface Definition (AC-7.1.1)

**Location:** `src/lib/llm/provider.ts`

```typescript
/**
 * Message structure for LLM conversations
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * LLMProvider interface defines the contract for all LLM provider implementations
 *
 * This abstraction enables the application to interact with different LLM services
 * through a unified interface, following the Strategy Pattern for runtime provider selection.
 *
 * @interface LLMProvider
 */
export interface LLMProvider {
  /**
   * Send a chat message to the LLM and receive a response
   *
   * @param messages - Array of conversation messages including user and assistant turns
   * @param systemPrompt - Optional system prompt to prepend to the conversation
   * @returns Promise resolving to the assistant's response as a string
   * @throws Error if the LLM service is unavailable or returns an error
   */
  chat(messages: Message[], systemPrompt?: string): Promise<string>;
}
```

### Factory Implementation (AC-7.1.2)

**Location:** `src/lib/llm/factory.ts`

```typescript
import { OllamaProvider } from './providers/ollama-provider';
import { GeminiProvider } from './providers/gemini-provider';
import type { LLMProvider } from './provider';

/**
 * Factory function to create an LLMProvider instance based on configuration
 *
 * Priority Order:
 * 1. User preference parameter (for Story 7.3 database integration)
 * 2. Environment variable (LLM_PROVIDER)
 * 3. Default: 'ollama'
 *
 * @param userPreference - Optional provider type from user preferences
 * @returns LLMProvider instance
 * @throws Error if provider type is unsupported or required env vars missing
 */
export function createLLMProvider(userPreference?: string): LLMProvider {
  const provider = userPreference || process.env.LLM_PROVIDER || 'ollama';

  switch (provider) {
    case 'ollama':
      return new OllamaProvider(
        process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        process.env.OLLAMA_MODEL || 'llama3.2'
      );

    case 'gemini':
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        throw new Error(
          'GEMINI_API_KEY not configured in .env.local\n' +
          'Get free API key at: https://aistudio.google.com/apikey'
        );
      }
      return new GeminiProvider(
        apiKey,
        process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      );

    default:
      throw new Error(
        `Unsupported LLM provider: ${provider}. ` +
        `Supported providers: ollama, gemini. ` +
        `Check LLM_PROVIDER in .env.local or user preferences.`
      );
  }
}
```

### OllamaProvider Refactoring (AC-7.1.3)

**Location:** `src/lib/llm/providers/ollama-provider.ts`

```typescript
import Ollama from 'ollama';
import type { LLMProvider, Message } from '../provider';

export class OllamaProvider implements LLMProvider {
  private client: Ollama;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3.2') {
    this.client = new Ollama({ host: baseUrl });
    this.model = model;
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    const fullMessages = [
      { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
      ...messages
    ];

    try {
      const response = await this.client.chat({
        model: this.model,
        messages: fullMessages,
      });

      return response.message.content;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          throw new Error(
            'Ollama server not running.\n' +
            'Start Ollama: ollama serve\n' +
            'Check status: ollama ps'
          );
        }
        if (error.message.includes('model')) {
          throw new Error(
            `Model not found: ${this.model}\n` +
            `Pull model: ollama pull ${this.model}`
          );
        }
      }
      throw error;
    }
  }
}
```

### GeminiProvider Refactoring (AC-7.1.4)

**Location:** `src/lib/llm/providers/gemini-provider.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, Message } from '../provider';

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = model;
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    // Gemini doesn't have separate system role - prepend to first message
    const contents = messages.map((msg, idx) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{
        text: idx === 0 && systemPrompt
          ? `${systemPrompt}\n\n${msg.content}`
          : msg.content
      }],
    }));

    try {
      const result = await model.generateContent({ contents });
      return result.response.text();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error(
            'Gemini API key invalid.\n' +
            'Get free API key at: https://aistudio.google.com/apikey'
          );
        }
      }
      throw error;
    }
  }
}
```

### Error Handling (AC-7.1.6)

**Location:** `src/lib/llm/errors.ts`

```typescript
/**
 * Standardized error codes for LLM provider failures
 */
export enum LLMProviderErrorCode {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
}

/**
 * LLMProviderError wraps provider-specific errors with consistent format
 */
export class LLMProviderError extends Error {
  constructor(
    public code: LLMProviderErrorCode,
    public provider: string,
    message: string,
    public originalError?: unknown
  ) {
    super(`${provider}: ${message}`);
    this.name = 'LLMProviderError';
  }
}
```

### Script Generation Service Update (AC-7.1.7)

**Location:** `src/lib/services/script-generation.ts` (partial update)

```typescript
import { createLLMProvider } from '@/lib/llm/factory';
import type { LLMProvider, Message } from '@/lib/llm/provider';

// BEFORE: Direct provider instantiation
// const ollama = new OllamaProvider();

// AFTER: Factory-based instantiation
const llm: LLMProvider = createLLMProvider(); // Respects LLM_PROVIDER env var

// Generate script (works identically for all providers)
const messages: Message[] = [
  { role: 'user', content: prompt }
];

const script = await llm.chat(messages, systemPrompt);
```

---

## Tasks

### Task 1: Define LLMProvider Interface → AC-7.1.1
- [ ] Create `src/lib/llm/provider.ts`
- [ ] Define `Message` interface with `role` and `content` fields
- [ ] Define `LLMProvider` interface with `chat()` method
- [ ] Add JSDoc documentation for interface and methods
- [ ] Export interface and type definitions

### Task 2: Implement Provider Factory → AC-7.1.2
- [ ] Create `src/lib/llm/factory.ts`
- [ ] Import provider classes (OllamaProvider, GeminiProvider)
- [ ] Implement `createLLMProvider(userPreference?)` function
- [ ] Add switch statement for provider types: 'ollama', 'gemini'
- [ ] Add environment variable validation for API keys
- [ ] Add descriptive error messages for invalid providers
- [ ] Add default values for base URLs and models

### Task 3: Refactor OllamaProvider → AC-7.1.3
- [ ] Move existing Ollama code to `src/lib/llm/providers/ollama-provider.ts`
- [ ] Implement `LLMProvider` interface explicitly
- [ ] Update constructor to accept baseUrl and model parameters
- [ ] Implement `chat()` method with system prompt handling
- [ ] Add error handling for connection failures and model not found
- [ ] Test with existing Ollama functionality

### Task 4: Refactor GeminiProvider → AC-7.1.4
- [ ] Move existing Gemini code to `src/lib/llm/providers/gemini-provider.ts`
- [ ] Implement `LLMProvider` interface explicitly
- [ ] Update constructor to accept apiKey and model parameters
- [ ] Implement `chat()` method with Message[] format conversion
- [ ] Handle Gemini's role mapping ('assistant' → 'model')
- [ ] Prepend system prompt to first message (Gemini doesn't support separate system role)
- [ ] Add error handling for authentication failures
- [ ] Test with existing Gemini functionality

### Task 5: Define Unified Types and Errors → AC-7.1.5, AC-7.1.6
- [ ] Create `src/lib/llm/types.ts`
- [ ] Define `GenerateResult` type (optional, for future extensibility)
- [ ] Create `src/lib/llm/errors.ts`
- [ ] Define `LLMProviderErrorCode` enum with all error codes
- [ ] Implement `LLMProviderError` class with code, provider, message, originalError
- [ ] Document error handling pattern for providers

### Task 6: Update Script Generation Service → AC-7.1.7
- [ ] Update `src/lib/services/script-generation.ts`
- [ ] Replace direct provider instantiation with `createLLMProvider()`
- [ ] Remove hardcoded provider imports
- [ ] Add import for factory and interface
- [ ] Update type annotations to use `LLMProvider` interface
- [ ] Test script generation with both Ollama and Gemini

### Task 7: Write Unit Tests → AC-7.1.8
- [ ] Create `src/__tests__/unit/llm/factory.test.ts`
- [ ] Test factory creates correct provider instances
- [ ] Test factory throws error for invalid provider type
- [ ] Create `src/__tests__/unit/llm/provider-interface.test.ts`
- [ ] Test all providers implement `LLMProvider` interface
- [ ] Test `chat()` method signature consistency
- [ ] Test `LLMProviderError` thrown with correct codes
- [ ] Verify existing Ollama and Gemini tests still pass
- [ ] Achieve 80%+ test coverage for new files

---

## Dev Notes

### Architecture References
- **Tech Spec:** Epic 7 - Story 7.1 Acceptance Criteria
- **PRD:** Feature 1.9 Enhancement (FR-1.9.13, FR-1.9.14)
- **Epic File:** docs/epics/epic-7-llm-provider-enhancement-groq-integration.md
- **Architecture:** docs/architecture/llm-provider-abstraction-v2.md (Complete v2 architecture spec)
- **Quick Reference:** docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md
- **ADR-009:** Pluggable LLM Provider Interface
- **ADR-010:** Proactive Rate Limiting for Cloud LLM Providers

### Dependencies
- **Epic 1:** Existing LLM provider abstraction (Ollama, Gemini) → Refactor target
- **Epic 2:** Script generation pipeline → Consumer of LLM providers
- **ollama npm package:** Ollama API client (already installed)
- **@google/generative-ai npm package:** Gemini API client (already installed)

### Previous Story Learnings

**From Story 6.11 (NASA MCP Server) - Status: done**

- **Interface-First Design:** Story 6.11 showed the value of defining clear interfaces first (MCP tool interface), then implementing. Apply same pattern: define `LLMProvider` interface before refactoring existing providers.
- **Error Handling Pattern:** Story 6.11 used standardized error responses in MCP tools. Use similar pattern for `LLMProviderError` with error codes and descriptive messages.
- **Factory Pattern:** Story 6.11's `VideoProviderClient` used provider registry pattern. Apply similar approach: `createLLMProvider()` as factory function.
- **Testing Strategy:** Story 6.11 emphasized unit tests with mocked responses for external APIs. Mock HTTP responses for Ollama and Gemini in tests.
- **Backward Compatibility:** Story 6.11 maintained YouTube API as default while adding MCP providers. Maintain existing Ollama/Gemini functionality while refactoring to interface.

**Patterns to Reuse:**
- Interface definition with JSDoc documentation
- Factory function with validation and error messages
- Error wrapping with actionable guidance
- Unit tests with mocked API responses

[Source: docs/stories/stories-epic-6/story-6.11.md#Dev-Agent-Record]

### Project Structure Notes

**Unified Project Structure Alignment:**
- Library code in `src/lib/llm/` (consistent with existing `src/lib/` structure)
- Provider implementations in `src/lib/llm/providers/` subdirectory
- Services in `src/lib/services/` (existing `script-generation.ts`)
- Tests in `src/__tests__/unit/llm/` (consistent with test structure)

**No Conflicts Detected:** This story adds new files alongside existing LLM code, then migrates. No conflicts with unified project structure.

### Key Design Decisions

1. **Strategy Pattern + Factory Pattern:** Enables runtime provider selection without code changes
2. **Interface-First Approach:** Define contract first, then refactor existing implementations
3. **Backward Compatibility:** Existing Ollama/Gemini code continues to work during refactoring
4. **Simple Error Handling:** Standard `Error` class with descriptive messages (sufficient for MVP)
5. **Future-Proof:** `GenerateResult` type placeholder for metadata without breaking changes

### Implementation Notes

- **Non-Breaking Migration:** Refactor in phases: (1) Create interface and factory, (2) Refactor providers to implement interface, (3) Update services to use factory, (4) Verify tests pass
- **Environment Variables:** Reuse existing `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`
- **Story 7.2 Preparation:** Interface ready for Groq provider implementation
- **Story 7.3 Preparation:** Factory accepts `userPreference` parameter for database integration

### Testing Strategy

- **Unit Tests:** Test factory logic, interface compliance, error handling
- **Integration Tests:** Verify Ollama and Gemini providers work after refactoring
- **Backward Compatibility Tests:** Ensure existing script generation still works
- **Test Coverage:** 80%+ for new files (factory, provider, types, errors)

### Future Considerations

- **Rate Limiting:** Added in Story 7.2 (Groq integration)
- **UI Provider Selection:** Added in Story 7.3 (database persistence)
- **Streaming Responses:** Future enhancement (current: simple string response)
- **Metadata in Responses:** Future enhancement (current: plain text only)

---

## Definition of Done

- [ ] All Acceptance Criteria verified and passing
- [ ] LLMProvider interface defined with `chat()` method
- [ ] Provider factory creates correct instances for 'ollama', 'gemini'
- [ ] OllamaProvider refactored to implement interface
- [ ] GeminiProvider refactored to implement interface
- [ ] Script generation service uses factory pattern
- [ ] Unified error handling with `LLMProviderError`
- [ ] Unit tests achieve 80%+ coverage
- [ ] All existing tests pass (backward compatibility)
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## Story Points

**Estimate:** 5 points (Medium)

**Justification:**
- Interface definition and factory implementation (straightforward)
- Refactoring existing Ollama/Gemini code to interface (moderate)
- Updating script generation service to use factory (minor)
- Unit tests for factory and interface compliance (moderate)
- Backward compatibility verification (important)
- Foundation for Stories 7.2 (Groq) and 7.3 (UI selector)

---

## References

- PRD: Feature 1.9 Enhancement (FR-1.9.13, FR-1.9.14)
- Epic File: docs/epics/epic-7-llm-provider-enhancement-groq-integration.md - Story 7.1
- Architecture: docs/architecture/llm-provider-abstraction-v2.md (Complete v2 spec)
- Quick Reference: docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md
- ADR-009: Pluggable LLM Provider Interface
- ADR-010: Proactive Rate Limiting for Cloud LLM Providers
- Epic 1: Existing LLM provider abstraction (Ollama, Gemini)
- Epic 2: Script generation pipeline (consumer of LLM providers)

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
