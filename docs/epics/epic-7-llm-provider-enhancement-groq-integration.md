# Epic 7: LLM Provider Enhancement (Groq Integration + Pluggable Architecture)

**Goal:** Add Groq as a third LLM provider with ultra-fast inference, implement pluggable provider architecture for runtime switching, and add UI-based provider selection with configurable rate limiting.

**Features Included:**
- 1.9 Enhancement: LLM Configuration & Script Personas (Extended)

**User Value:** Creators can:
- Switch between LLM providers (Ollama, Gemini, Groq) via UI without restart
- Use Groq's ultra-fast inference (0.5-1s vs 2-5s) for faster script generation
- Avoid quota exhaustion by rotating providers when one hits limits
- Have reliable fallback options when a provider is unavailable

**Technical Approach:**
- Pluggable provider interface using Strategy Pattern + Factory Pattern
- Groq SDK integration with Llama 3.3 70B Versatile model
- Rate limiting middleware with sliding window algorithm
- HTTP header monitoring for proactive quota management
- Database persistence of user provider preferences

**Story Count:** 3 stories

**Dependencies:**
- Epic 1 (LLM provider abstraction - provides existing Ollama/Gemini code)
- Epic 2 (Script generation pipeline - consumer of LLM providers)

**Total Points:** 11 points

**Acceptance:**
- All three LLM providers (Ollama, Gemini, Groq) accessible through unified interface
- Provider selection persists per-user in database
- UI dropdown in Settings → AI Configuration for provider switching
- Rate limiting configurable via environment variables
- Proactive monitoring of Groq HTTP headers (x-ratelimit-*)
- Graceful 429 handling with retry-after parsing

**Architecture References:**
- `docs/architecture/llm-provider-abstraction-v2.md` - Complete architecture specification
- `docs/architecture/llm-provider-diagrams.md` - Visual architecture diagrams
- `docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md` - Developer cheat sheet
- `docs/architecture/architecture-decision-records.md` - ADR-009, ADR-010

---

## Epic 7 Stories

### Story 7.1: Pluggable LLM Provider Interface (5 points)

**Goal:** Refactor existing LLM providers (Ollama, Gemini) into pluggable architecture with consistent interface, enabling runtime provider switching.

**Tasks:**
- Define `LLMProvider` interface with `chat()`, `getModel()`, `isAvailable()` methods
- Create provider factory with `createLLMProvider(providerType)` function
- Refactor `OllamaProvider` class to implement interface
- Refactor `GeminiProvider` class to implement interface
- Define unified response format (`GenerateResult` type)
- Define standardized error handling (`LLMProviderError`)
- Update script generation service to use factory pattern
- Add unit tests for factory and interface compliance

**Acceptance Criteria:**
- `LLMProvider` interface defined with consistent method signatures
- Provider factory returns correct instance for "ollama", "gemini", "groq"
- Existing Ollama/Gemini code refactored without breaking changes
- All providers return unified `GenerateResult` format
- All providers throw standardized `LLMProviderError` with error codes
- Script generation service uses factory for provider instantiation
- Unit tests achieve 80%+ coverage
- Existing functionality unchanged (backward compatible)

**Prerequisites:** None

**Technical Notes:**
- Files to create: `lib/llm/types.ts`, `lib/llm/factory.ts`, `lib/llm/providers/*.ts`
- Files to modify: `lib/services/script-generation.ts`
- Pattern: Strategy Pattern + Factory Pattern
- Error codes: `RATE_LIMIT_EXCEEDED`, `AUTHENTICATION_FAILED`, `NETWORK_ERROR`, `INVALID_REQUEST`, `PROVIDER_UNAVAILABLE`

---

### Story 7.2: Groq Integration + Rate Limiting (3 points)

**Goal:** Implement Groq as third LLM provider with Llama 3.3 70B model, configurable rate limiting, and HTTP header monitoring.

**Tasks:**
- Install `groq-sdk` npm package
- Create `GroqProvider` class implementing `LLMProvider` interface
- Implement rate limiting middleware with sliding window algorithm
- Add HTTP header monitoring (`x-ratelimit-*`, `retry-after`)
- Implement graceful 429 error handling with retry-after parsing
- Add environment variables: `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_RATE_LIMIT_ENABLED`, `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE`
- Register Groq provider in factory
- Add integration tests for Groq API calls
- Add rate limiting tests with mocked HTTP headers

**Acceptance Criteria:**
- Groq provider uses Llama 3.3 70B Versatile model by default
- Groq API key loaded from `GROQ_API_KEY` environment variable
- Rate limiting defaults to 2 RPM (1 request per 30 seconds)
- Sliding window algorithm tracks requests in 60-second window
- HTTP response headers monitored: `x-ratelimit-remaining-requests`, `x-ratelimit-reset-requests`, `retry-after`
- 429 errors trigger wait with `retry-after` duration
- Rate limit configurable via environment variables
- Integration tests pass with mocked Groq API
- Groq provider available through factory: `createLLMProvider('groq')`

**Prerequisites:** Story 7.1 (Pluggable Provider Interface)

**Technical Notes:**
- Groq model: `llama-3.3-70b-versatile` (default), alternatives: `llama-3.1-8b-instant`, `gemma-2-9b-it`
- Rate limit: 2 RPM (conservative, server limit is 30 RPM)
- Environment variables:
  - `GROQ_API_KEY` (required)
  - `GROQ_MODEL` (default: "llama-3.3-70b-versatile")
  - `GROQ_RATE_LIMIT_ENABLED` (default: "true")
  - `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE` (default: "2")
- File to create: `lib/llm/providers/groq-provider.ts`
- Groq docs: https://console.groq.com/docs

---

### Story 7.3: UI Provider Selector (3 points)

**Goal:** Implement Settings → AI Configuration UI for provider switching with database persistence of user preferences.

**Tasks:**
- Create database migration: `user_preferences` table with `default_llm_provider` column
- Create API endpoint: `GET /api/user/preferences` and `PUT /api/user/preferences`
- Create UI component: `AIConfiguration` settings panel
- Add provider dropdown: Ollama, Gemini, Groq
- Implement per-user preference persistence
- Add provider indicator badge in UI ("Powered by {provider}")
- Update script generation to read user preference
- Add E2E tests for provider switching workflow

**Acceptance Criteria:**
- `user_preferences` table created with `default_llm_provider` column
- CHECK constraint validates provider values: 'ollama', 'gemini', 'groq'
- Default value: 'ollama' (if not set)
- GET `/api/user/preferences` returns user's current provider selection
- PUT `/api/user/preferences` saves provider preference to database
- Settings → AI Configuration page displays provider dropdown
- Provider selection persists across page reloads
- Script generation uses user's selected provider
- UI displays "Powered by {provider}" badge
- E2E test: User switches from Ollama → Groq → script generation uses Groq
- E2E test: Page reload preserves Groq selection

**Prerequisites:** Story 7.1 (Pluggable Provider Interface), Story 7.2 (Groq Integration)

**Technical Notes:**
- Database migration: `migrations/020_user_preferences_default_provider.ts`
- Table schema:
  ```sql
  CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY DEFAULT 'default',
    default_llm_provider TEXT DEFAULT 'ollama',
    CHECK(default_llm_provider IN ('ollama', 'gemini', 'groq'))
  );
  ```
- API route: `src/app/api/user/preferences/route.ts`
- UI component: `components/features/settings/ai-configuration.tsx`
- E2E test: `tests/e2e/provider-switching.spec.ts`

---

## Epic Completion Criteria

- [ ] All 3 stories completed and marked as "Done"
- [ ] All acceptance criteria pass
- [ ] Unit tests achieve 80%+ coverage
- [ ] E2E tests pass for provider switching workflow
- [ ] Architecture documentation complete (ADR-009, ADR-010)
- [ ] Rate limiting tested with all three providers
- [ ] No breaking changes to existing functionality
- [ ] Code reviewed and approved

---

## Definition of Done for Epic

When Epic 7 is complete:
- Creators can switch between Ollama, Gemini, and Groq via Settings UI
- Provider selection persists per-user in database
- Groq provides ultra-fast script generation (0.5-1s latency)
- Rate limiting prevents quota exhaustion for all cloud providers
- System gracefully handles provider failures with automatic fallback
- Pluggable architecture enables easy addition of future providers

---

## References

- **PRD v3.6:** Feature 1.9 Enhancement (FR-1.9.08 through FR-1.9.14, AC5, AC6)
- **Architecture:** `docs/architecture/llm-provider-abstraction-v2.md`
- **Diagrams:** `docs/architecture/llm-provider-diagrams.md`
- **Quick Reference:** `docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md`
- **ADR-009:** Pluggable LLM Provider Interface
- **ADR-010:** Proactive Rate Limiting for Cloud LLM Providers
- **Groq Documentation:** https://console.groq.com/docs
