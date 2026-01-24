# Story 6.12: Pluggable LLM Provider Interface

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.12 - Pluggable LLM Provider Interface
**Status:** Done (completed as Epic 7 Story 7.1)
**Created:** 2026-01-22
**Points:** 5

---

## Story Description

Refactor existing LLM provider integrations (Ollama, Gemini) into a pluggable architecture with consistent interface, enabling runtime provider switching without code changes.

**User Value:** Creators can seamlessly switch between LLM providers (Ollama, Gemini, Groq) via UI without application restart, ensuring continuity when one provider hits quota limits.

---

## User Story

As a **creator**,
I want **the system to support multiple LLM providers through a unified interface**,
So that **I can switch between providers without interruption when one reaches quota limits**.

---

## Acceptance Criteria

### AC-6.12.1: Abstract LLM Provider Interface
- **Given** the pluggable provider architecture is implemented
- **When** a new LLM provider class is created
- **Then** it must implement the `LLMProvider` interface with:
  - `chat(messages: Message[], systemPrompt?: string, options?: GenerateOptions): Promise<GenerateResult>`
  - `getModel(): string`
  - `isAvailable(): Promise<boolean>`
  - Supports consistent error handling across all providers

### AC-6.12.2: Provider Factory Pattern
- **Given** the provider factory is implemented
- **When** `createLLMProvider(providerType: string)` is called
- **Then** it returns an instance of:
  - `OllamaProvider` for "ollama"
  - `GeminiProvider` for "gemini"
  - `GroqProvider` for "groq"
  - Throws error for unknown provider types

### AC-6.12.3: Ollama Provider Refactoring
- **Given** the existing Ollama integration code
- **When** refactored into pluggable architecture
- **Then** the `OllamaProvider` class:
  - Implements `LLMProvider` interface
  - Maintains all existing functionality
  - No breaking changes to existing script generation
  - Uses default model `llama3.2` from environment variable `OLLAMA_MODEL`

### AC-6.12.4: Gemini Provider Refactoring
- **Given** the existing Gemini integration code
- **When** refactored into pluggable architecture
- **Then** the `GeminiProvider` class:
  - Implements `LLMProvider` interface
  - Maintains all existing functionality including rate limiting
  - Uses default model `gemini-2.5-flash` from environment variable `GEMINI_MODEL`
  - Preserves existing rate limit behavior (1 RPM)

### AC-6.12.5: Unified Response Format
- **Given** any provider is used for script generation
- **When** the provider returns a response
- **Then** the `GenerateResult` type includes:
  - `content: string` - Generated text content
  - `model: string` - Model identifier used
  - `tokensUsed?: number` - Token consumption (if available)
  - `provider: string` - Provider name ("ollama", "gemini", "groq")
  - `latencyMs: number` - Request duration in milliseconds

### AC-6.12.6: Provider Configuration Interface
- **Given** the provider configuration system
- **When** provider settings are loaded
- **Then** each provider reads its configuration from:
  - `OLLAMA_MODEL` (default: "llama3.2")
  - `OLLAMA_BASE_URL` (default: "http://localhost:11434")
  - `GEMINI_MODEL` (default: "gemini-2.5-flash")
  - `GEMINI_API_KEY` (required for Gemini)
  - Future providers follow same pattern

### AC-6.12.7: Error Handling Consistency
- **Given** any LLM provider throws an error
- **When** the error is caught
- **Then** all providers throw standardized `LLMProviderError` with:
  - `provider: string` - Which provider failed
  - `code: string` - Error code (rate_limit, auth, network, etc.)
  - `retryable: boolean` - Whether request can be retried
  - `originalError: Error` - Original error for debugging

---

## Tasks

### Task 1: Create LLM Provider Interface
- [x] Define `LLMProvider` interface in `lib/llm/types.ts`
- [x] Define `Message`, `GenerateOptions`, `GenerateResult` types
- [x] Define `LLMProviderError` class with error codes
- [x] Add TypeScript exports for provider types

### Task 2: Create Provider Factory
- [x] Create `lib/llm/factory.ts` with `createLLMProvider()` function
- [x] Implement provider registration map
- [x] Add validation for provider types
- [x] Add error handling for unknown providers

### Task 3: Refactor Ollama Provider
- [x] Create `lib/llm/providers/ollama-provider.ts`
- [x] Implement `LLMProvider` interface
- [x] Migrate existing Ollama integration code
- [x] Add `getModel()`, `isAvailable()` methods
- [x] Update all imports to use new provider class

### Task 4: Refactor Gemini Provider
- [x] Create `lib/llm/providers/gemini-provider.ts`
- [x] Implement `LLMProvider` interface
- [x] Migrate existing Gemini integration code
- [x] Preserve existing rate limiting logic
- [x] Add `getModel()`, `isAvailable()` methods
- [x] Update all imports to use new provider class

### Task 5: Update Script Generation Service
- [x] Refactor `lib/services/script-generation.ts` to use factory
- [x] Replace direct provider instantiation with `createLLMProvider()`
- [x] Update all provider switching logic
- [x] Ensure backward compatibility with existing code

### Task 6: Add Unit Tests
- [x] Test provider factory creates correct instances
- [x] Test each provider implements interface correctly
- [x] Test error handling standardization
- [x] Test response format consistency
- [x] Test configuration loading for each provider

---

## Prerequisites

- None (this is foundational work for subsequent Groq stories)

---

## Technical Notes

**Architecture Pattern:** Strategy Pattern + Factory Pattern

**Interface Definition:**
```typescript
interface LLMProvider {
  chat(messages: Message[], systemPrompt?: string, options?: GenerateOptions): Promise<GenerateResult>;
  getModel(): string;
  isAvailable(): Promise<boolean>;
}

type Message = { role: 'user' | 'assistant' | 'system'; content: string };

type GenerateOptions = {
  temperature?: number;
  maxTokens?: number;
  model?: string;
};

type GenerateResult = {
  content: string;
  model: string;
  tokensUsed?: number;
  provider: string;
  latencyMs: number;
};
```

**Factory Usage:**
```typescript
import { createLLMProvider } from './lib/llm/factory';

const provider = createLLMProvider('gemini');
const result = await provider.chat([{role: 'user', content: 'Hello'}]);
```

**Error Codes:**
- `RATE_LIMIT_EXCEEDED` - Provider quota exhausted
- `AUTHENTICATION_FAILED` - Invalid API key
- `NETWORK_ERROR` - Connection failed
- `INVALID_REQUEST` - Malformed request
- `PROVIDER_UNAVAILABLE` - Provider is down

**Files to Create:**
- `lib/llm/types.ts` - Type definitions
- `lib/llm/factory.ts` - Provider factory
- `lib/llm/providers/ollama-provider.ts` - Ollama implementation
- `lib/llm/providers/gemini-provider.ts` - Gemini implementation
- `lib/llm/providers/base-provider.ts` - Base class with common logic

**Files to Modify:**
- `lib/services/script-generation.ts` - Use factory instead of direct instantiation
- Any other files with direct LLM provider calls

**Testing Strategy:**
- Unit tests for factory pattern
- Integration tests for each provider
- Mock responses for testing without API calls
- Verify backward compatibility with existing scripts

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] Ollama and Gemini providers refactored without breaking changes
- [x] Factory creates correct provider instances
- [x] Error handling is consistent across providers
- [x] Unit tests pass with 80%+ coverage (191 tests, 100% pass rate)
- [x] Existing script generation functionality works unchanged
- [x] Code reviewed and approved

---

## Completion Summary

**Completed:** 2026-01-24 (as Epic 7 Story 7.1)
**Validation Grade:** A (95/100)
**Test Results:** 191/191 tests passing (100% pass rate)
**Implementation Location:** `ai-video-generator/src/lib/llm/`

**Acceptance Criteria Met:**
- ✅ AC-6.12.1: Abstract LLM Provider Interface
- ✅ AC-6.12.2: Provider Factory Pattern
- ✅ AC-6.12.3: Ollama Provider Refactoring
- ✅ AC-6.12.4: Gemini Provider Refactoring
- ✅ AC-6.12.5: Unified Response Format
- ✅ AC-6.12.6: Provider Configuration Interface
- ✅ AC-6.12.7: Error Handling Consistency

**Bonus Implementation:** Groq provider included ahead of schedule
