# Pattern Correspondence: Epic 1 (LLM) ↔ Epic 2 (TTS)

**Purpose:** Document the architectural alignment between Epic 1's LLM infrastructure and Epic 2's TTS infrastructure
**Date:** 2025-11-06
**Status:** Implemented

## Overview

Epic 2's TTS architecture deliberately mirrors Epic 1's LLM architecture to maintain consistency, reduce cognitive load for developers, and enable code reuse. This document maps the correspondence between components.

**Core Principle:** Follow the same patterns, use the same abstractions, maintain the same quality standards.

## Provider Abstraction Pattern

Both epics use the **Strategy Pattern** to abstract provider implementations, enabling runtime selection and future extensibility.

| Epic 1 (LLM) | Epic 2 (TTS) | Purpose |
|--------------|--------------|---------|
| `LLMProvider` interface | `TTSProvider` interface | Abstract provider contract |
| `OllamaProvider` class | `KokoroProvider` class | Concrete implementation |
| `createLLMProvider()` | `createTTSProvider()` | Factory function |
| `chat()` method | `generateAudio()` method | Primary operation |
| `Message` type | `AudioResult` type | Operation result type |

### File Locations

| Component | Epic 1 Location | Epic 2 Location |
|-----------|-----------------|-----------------|
| **Interface** | `lib/llm/provider.ts` | `lib/tts/provider.ts` |
| **Implementation** | `lib/llm/ollama-provider.ts` | `lib/tts/kokoro-provider.ts` |
| **Factory** | `lib/llm/factory.ts` | `lib/tts/factory.ts` |

### Code Similarity

**Epic 1 (LLM Provider Interface):**
```typescript
export interface LLMProvider {
  chat(messages: Message[], systemPrompt?: string): Promise<string>;
}
```

**Epic 2 (TTS Provider Interface):**
```typescript
export interface TTSProvider {
  generateAudio(text: string, voiceId: string): Promise<AudioResult>;
  getAvailableVoices(): Promise<VoiceProfile[]>;
  cleanup(): Promise<void>;
}
```

**Similarity:** Both define a primary operation method and return Promise-based results.

### Factory Pattern

**Epic 1 (LLM Factory):**
```typescript
export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  if (provider === 'ollama') {
    return new OllamaProvider(baseUrl, model);
  }
  throw new Error(`Unsupported LLM provider: ${provider}`);
}
```

**Epic 2 (TTS Factory):**
```typescript
export function createTTSProvider(): TTSProvider {
  const provider = process.env.TTS_PROVIDER || 'kokoro';
  if (provider === 'kokoro') {
    return new KokoroProvider();
  }
  throw new Error(`Unsupported TTS provider: ${provider}`);
}
```

**Similarity:** Identical structure, environment-based selection, extensible for future providers.

## Persistent Service Pattern

Both epics use long-running services with model caching for optimal performance.

| Ollama (LLM) | KokoroTTS (TTS) | Purpose |
|--------------|-----------------|---------|
| HTTP server on port 11434 | JSON stdin/stdout protocol | Communication channel |
| Model cached in memory | Model cached in memory | Performance optimization |
| Long-running process | Long-running process | Persistent service |
| Fast subsequent requests | Fast subsequent requests | User experience |
| Health checks via HTTP | Health checks via stdin/stdout | Service monitoring |
| Graceful shutdown | Graceful shutdown | Clean exit |

### Performance Characteristics

| Metric | Epic 1 (Ollama LLM) | Epic 2 (KokoroTTS) |
|--------|---------------------|---------------------|
| **Cold Start** | First request loads model | First request loads model (~3-5s) |
| **Warm Requests** | Model cached, fast response | Model cached, fast synthesis (<2s) |
| **Memory Usage** | Model in RAM (~2GB for llama3.2:3b) | Model in RAM (~400MB for 82M params) |
| **Process Lifecycle** | Started externally (ollama serve) | Started on first request (automatic) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   EPIC 1: LLM (Ollama)                       │
├─────────────────────────────────────────────────────────────┤
│  TypeScript (OllamaProvider)                                │
│         │                                                    │
│         │ HTTP POST /api/chat                               │
│         ▼                                                    │
│  Ollama Server (localhost:11434)                            │
│         │                                                    │
│         │ Model: llama3.2:3b (cached in memory)            │
│         ▼                                                    │
│  Response: { message, role }                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   EPIC 2: TTS (KokoroTTS)                    │
├─────────────────────────────────────────────────────────────┤
│  TypeScript (KokoroProvider)                                │
│         │                                                    │
│         │ JSON via stdin/stdout                             │
│         ▼                                                    │
│  Python TTS Service (kokoro-tts-service.py)                 │
│         │                                                    │
│         │ Model: kokoro-82m (cached in memory)              │
│         ▼                                                    │
│  Response: { duration, filePath, fileSize }                 │
└─────────────────────────────────────────────────────────────┘
```

**Key Difference:** Ollama uses HTTP, KokoroTTS uses stdin/stdout. Both achieve the same goal: persistent model caching.

**Rationale for Difference:**
- Ollama: External service, pre-existing HTTP API
- KokoroTTS: Internal service, simpler stdin/stdout communication
- Both: Optimal performance through persistent caching

## Configuration Pattern

Both epics use environment-based configuration with consistent naming conventions.

| Configuration | Epic 1 | Epic 2 |
|---------------|--------|--------|
| **Provider Selection** | `LLM_PROVIDER=ollama` | `TTS_PROVIDER=kokoro` |
| **Service URL/Path** | `OLLAMA_BASE_URL=http://localhost:11434` | (Python script path, hardcoded) |
| **Model Selection** | `OLLAMA_MODEL=llama3.2:3b` | (Built into KokoroTTS, 82M params) |
| **Timeout** | (Default in Ollama SDK) | `TTS_TIMEOUT_MS_COLD=30000`<br>`TTS_TIMEOUT_MS_WARM=10000` |

### Environment File Structure

**.env.local.example:**
```bash
# LLM Configuration (Epic 1)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# TTS Configuration (Epic 2)
TTS_PROVIDER=kokoro
TTS_TIMEOUT_MS_COLD=30000
TTS_TIMEOUT_MS_WARM=10000
TTS_AUDIO_FORMAT=mp3
TTS_AUDIO_BITRATE=128
TTS_AUDIO_SAMPLE_RATE=44100
TTS_AUDIO_CHANNELS=1
```

**Similarity:** Grouped by epic, consistent PREFIX_PROPERTY naming convention.

## Error Handling Pattern

Both epics use standard error codes with user-friendly messages.

| Epic 1 (LLM) | Epic 2 (TTS) | Error Scenario |
|--------------|--------------|----------------|
| `OLLAMA_CONNECTION_ERROR` | `TTS_SERVICE_ERROR` | Service unavailable |
| `OLLAMA_MODEL_NOT_FOUND` | `TTS_MODEL_NOT_FOUND` | Model missing |
| `OLLAMA_TIMEOUT` | `TTS_TIMEOUT` | Request timeout |
| (N/A) | `TTS_NOT_INSTALLED` | Package not installed |
| (N/A) | `TTS_INVALID_VOICE` | Invalid voice ID |

### Error Response Format

Both epics use the same standard error response format:

```typescript
{
  success: false,
  error: {
    message: string,  // User-friendly message
    code: string      // Error code for programmatic handling
  }
}
```

**Example (Epic 1 - LLM):**
```typescript
{
  success: false,
  error: {
    message: "Could not connect to Ollama at http://localhost:11434",
    code: "OLLAMA_CONNECTION_ERROR"
  }
}
```

**Example (Epic 2 - TTS):**
```typescript
{
  success: false,
  error: {
    message: "TTS service not responding. Please restart.",
    code: "TTS_SERVICE_ERROR"
  }
}
```

## API Response Pattern

Both epics use consistent API response format for all endpoints.

### Success Response

```typescript
{
  success: true,
  data: {
    // Endpoint-specific data
  }
}
```

**Epic 1 Example (GET /api/projects):**
```typescript
{
  success: true,
  data: {
    projects: [...],
    totalProjects: 10
  }
}
```

**Epic 2 Example (GET /api/voice/list):**
```typescript
{
  success: true,
  data: {
    voices: [...],
    totalVoices: 5,
    totalAvailable: 48
  }
}
```

### Error Response

```typescript
{
  success: false,
  error: {
    message: string,
    code: string
  }
}
```

**Consistency Benefit:** Frontend can handle all API responses with same pattern.

## Database Integration Pattern

Both epics follow the same database query patterns.

| Pattern | Epic 1 | Epic 2 |
|---------|--------|--------|
| **Query Location** | `lib/db/queries.ts` | `lib/db/queries.ts` (Story 2.2) |
| **Parameterized Queries** | ✅ Yes | ✅ Yes |
| **Transaction Support** | ✅ Yes | ✅ Yes |
| **Error Handling** | Try-catch with logging | Try-catch with logging |

### Query Function Examples

**Epic 1 (Projects):**
```typescript
export function createProject(data: ProjectCreate) {
  return db.prepare(`
    INSERT INTO projects (id, name, topic, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(data.id, data.name, data.topic);
}
```

**Epic 2 (Scenes - Story 2.2):**
```typescript
export function createScene(data: SceneCreate) {
  return db.prepare(`
    INSERT INTO scenes (id, project_id, scene_number, text)
    VALUES (?, ?, ?, ?)
  `).run(data.id, data.projectId, data.sceneNumber, data.text);
}
```

**Similarity:** Same structure, parameterized queries, consistent naming.

## Testing Pattern

Both epics follow the same testing strategy.

| Test Type | Epic 1 | Epic 2 |
|-----------|--------|--------|
| **Unit Tests** | `tests/unit/llm/*.test.ts` | `tests/unit/tts/*.test.ts` |
| **Integration Tests** | `tests/integration/llm/*.test.ts` | `tests/integration/tts/*.test.ts` |
| **Test Framework** | Vitest | Vitest |
| **Mocking** | Mock Ollama responses | Mock Python service |

### Test Coverage Requirements

| Category | Epic 1 | Epic 2 |
|----------|--------|--------|
| **Provider Interface** | ✅ Tested | ✅ Tested |
| **Factory Function** | ✅ Tested | ✅ Tested |
| **Error Handling** | ✅ Tested | ✅ Tested |
| **API Endpoints** | ✅ Tested | ✅ Tested |

## Documentation Pattern

Both epics follow the same documentation structure.

| Document Type | Epic 1 | Epic 2 |
|---------------|--------|--------|
| **ADR (Architecture Decision Record)** | `docs/architecture.md` (ADR-002: Ollama) | `docs/architecture.md` (ADR-003: KokoroTTS) |
| **Technical Specification** | `docs/tech-spec-epic-1.md` | `docs/tech-spec-epic-2.md` |
| **Setup Guide** | `docs/setup-guide.md` (Ollama section) | `docs/setup-guide.md` (TTS section) |
| **API Documentation** | JSDoc in code | JSDoc in code |

## Future Extensibility

Both epics are designed for future provider additions.

### Epic 1: Future LLM Providers

```typescript
// Future providers (commented out)
// if (provider === 'openai') {
//   return new OpenAIProvider(process.env.OPENAI_API_KEY);
// }
// if (provider === 'anthropic') {
//   return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
// }
```

### Epic 2: Future TTS Providers

```typescript
// Future providers (commented out)
// if (provider === 'google') {
//   return new GoogleTTSProvider(process.env.GOOGLE_TTS_API_KEY);
// }
// if (provider === 'azure') {
//   return new AzureTTSProvider(
//     process.env.AZURE_TTS_KEY,
//     process.env.AZURE_TTS_REGION
//   );
// }
```

**Similarity:** Same extensibility pattern, ready for future providers without code changes.

## Why This Pattern Correspondence Matters

### 1. Reduced Cognitive Load

Developers familiar with Epic 1's LLM infrastructure can immediately understand Epic 2's TTS infrastructure because the patterns are identical.

### 2. Code Reuse

Similar patterns enable code reuse for:
- Error handling utilities
- API response formatters
- Database query builders
- Testing helpers

### 3. Consistent Behavior

Users experience consistent behavior across features:
- Same error message format
- Same API response structure
- Same configuration approach

### 4. Easier Onboarding

New developers learn one set of patterns that applies across the entire codebase.

### 5. Predictable Architecture

Knowing Epic 1's architecture predicts Epic 2's architecture, making the system easier to reason about.

## Pattern Divergences (Intentional)

Where patterns differ, there's a good reason:

| Aspect | Epic 1 | Epic 2 | Rationale |
|--------|--------|--------|-----------|
| **Service Communication** | HTTP (Ollama server) | stdin/stdout (Python child process) | Ollama is external, KokoroTTS is internal |
| **Service Lifecycle** | Externally managed (ollama serve) | Application-managed (spawn on first use) | Ollama pre-installed, KokoroTTS embedded |
| **Configuration Complexity** | Simple (URL + model) | More detailed (timeouts, audio format) | TTS has more configuration options |

## Mapping Summary Table

| Concern | Epic 1 (LLM) | Epic 2 (TTS) |
|---------|--------------|--------------|
| **Technology** | Ollama + Llama 3.2 | KokoroTTS |
| **Pattern** | Provider abstraction | Provider abstraction |
| **Communication** | HTTP | stdin/stdout |
| **Caching** | Persistent model in memory | Persistent model in memory |
| **Error Handling** | Standard error codes | Standard error codes |
| **API Format** | {success, data/error} | {success, data/error} |
| **Configuration** | Environment variables | Environment variables |
| **Testing** | Unit + Integration | Unit + Integration |
| **Documentation** | JSDoc + MD files | JSDoc + MD files |

## Benefits Realized

✅ **Consistency:** Same patterns across epics
✅ **Predictability:** Knowing one predicts the other
✅ **Maintainability:** Easier to maintain similar code
✅ **Extensibility:** Easy to add new providers
✅ **Quality:** Same quality standards
✅ **Developer Experience:** Lower learning curve

## References

- **Epic 1 LLM Provider:** `ai-video-generator/src/lib/llm/`
- **Epic 2 TTS Provider:** `ai-video-generator/src/lib/tts/`
- **Architecture Document:** `docs/architecture.md`
- **Tech Spec Epic 1:** `docs/tech-spec-epic-1.md`
- **Tech Spec Epic 2:** `docs/tech-spec-epic-2.md`
- **TTS Service Architecture:** `docs/tts-service-architecture.md`

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-06 | DEV Agent | Initial pattern correspondence documentation |

---

**Conclusion:** Epic 2's TTS infrastructure successfully mirrors Epic 1's LLM infrastructure while adapting to the specific needs of text-to-speech generation. This consistency delivers measurable benefits in developer productivity, code quality, and system maintainability.
