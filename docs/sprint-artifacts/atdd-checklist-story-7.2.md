# ATDD Checklist - Story 7.2: Groq Integration + Rate Limiting

**Story:** 7.2 - Groq Integration + Rate Limiting
**Epic:** 7 - LLM Provider Enhancement (Groq Integration + Pluggable Architecture)
**Phase:** TDD RED (Failing Tests)
**Generated:** 2026-01-22
**Test Status:** RED - All tests failing as expected

---

## ATDD Phase Overview

This document tracks the ATDD (Acceptance Test Driven Development) progress for Story 7.2. Tests are written to FAIL first (RED phase), defining the expected behavior before implementation.

### Current Phase: RED (Tests written and failing)
- **Purpose:** Define expected behavior through failing tests
- **Status:** Tests created and verified to FAIL
- **Next Phase:** GREEN (Implementation to make tests pass)

---

## Test Coverage Summary

| Acceptance Criterion | Test Count | Test Files | Status |
|---------------------|------------|------------|--------|
| AC-7.2.1: GroqProvider Class | 5 | groq-provider.test.ts | RED |
| AC-7.2.2: Rate Limiting Middleware | 7 | rate-limiter-groq.test.ts | RED |
| AC-7.2.3: HTTP Header Monitoring | 3 | groq-provider.test.ts | RED |
| AC-7.2.4: Graceful 429 Error Handling | 3 | groq-provider.test.ts | RED |
| AC-7.2.5: Environment Variable Config | 2 | groq-provider.test.ts | RED |
| AC-7.2.6: Provider Factory Registration | 7 | factory-groq.test.ts | RED |
| AC-7.2.7: Integration Tests | 11 | groq-provider.integration.test.ts | RED |
| AC-7.2.8: Rate Limiter Unit Tests | 6 | rate-limiter-groq.test.ts | RED |
| **TOTAL** | **44** | **4 files** | **RED** |

---

## Test Files Created

### 1. Unit Tests: `tests/unit/llm/groq-provider.test.ts`
**Tests:** 17 test scenarios
**Coverage:**
- AC-7.2.1: GroqProvider Class Implementation
- AC-7.2.3: HTTP Header Monitoring
- AC-7.2.4: Graceful 429 Error Handling
- AC-7.2.5: Environment Variable Configuration
- AC-7.2.7: Integration Test Scenarios (unit portion)

**Test Scenarios:**
- Constructor validates API key (missing, placeholder, invalid)
- Constructor with valid API key (default model, custom model)
- LLMProvider interface compliance (chat method, Message[] format)
- Message format conversion (system role, multiple messages)
- Plain text response from chat method
- GROQ_API_KEY validation
- Model configuration (llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma-2-9b-it)
- Rate limit header monitoring (x-ratelimit-* headers)
- Rate limit status logging
- 429 error detection and handling
- Retry-after header parsing
- Descriptive error messages with actionable guidance
- Authentication error handling
- Chat completion with Llama 3.3 70B model
- System prompt handling (separate message role)

### 2. Unit Tests: `tests/unit/llm/rate-limiter-groq.test.ts`
**Tests:** 20 test scenarios
**Coverage:**
- AC-7.2.2: Rate Limiting Middleware Implementation
- AC-7.2.8: Rate Limiter Unit Tests

**Test Scenarios:**
- Sliding window algorithm (timestamp tracking, 60-second window)
- Rate limit enforcement (2 RPM default, wait until oldest expires, log wait duration)
- Rate limiter enable/disable (via enabled parameter)
- Reusability for other providers (independent tracking per provider)
- Sliding window algorithm tracking (timestamps, old timestamp removal)
- Requests within limit (no delay)
- Requests exceeding limit (wait for expiration)
- Disabled rate limiter (unlimited requests)
- Different providers independent limits
- Wait duration calculation
- Environment variable parsing (GROQ_RATE_LIMIT_ENABLED, GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE)
- Story-specific scenarios (1st request immediate, 2nd at 10s, 3rd waits, disabled behavior)

### 3. Unit Tests: `tests/unit/llm/factory-groq.test.ts`
**Tests:** 15 test scenarios
**Coverage:**
- AC-7.2.6: Provider Factory Registration

**Test Scenarios:**
- Groq case in factory switch statement
- GROQ_API_KEY validation before instantiation
- Pass model parameter from GROQ_MODEL environment variable
- Include groq in error message listing supported providers
- Maintain consistency with existing provider registrations (ollama, gemini)
- Factory integration with LLMProvider interface
- Error handling consistency with other providers
- LLM_PROVIDER environment variable support
- User preference parameter priority

### 4. Integration Tests: `tests/integration/llm/groq-provider.integration.test.ts`
**Tests:** 25 test scenarios
**Coverage:**
- AC-7.2.7: Integration Tests

**Test Scenarios:**
- Groq API authentication (valid key, invalid key)
- Chat completion with Llama 3.3 70B model
- Message format conversion (Message[] to Groq format)
- System prompt handling (separate role, without system prompt, empty system prompt)
- Error handling for invalid API key
- Error handling for rate limit (429) with mocked response
- HTTP header monitoring (rate limit headers, remaining requests, reset time)
- Rate limiter integration (2 RPM enforcement, window expiration)
- Specific integration scenarios from story (valid API key, missing API key, invalid key, rate limit enforcement, header logging, 429 error parsing)
- Edge cases (network errors, timeouts, malformed responses, long messages, special characters)
- Model selection scenarios (llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma-2-9b-it)

---

## Acceptance Criteria Coverage Details

### AC-7.2.1: GroqProvider Class Implementation

**Status:** TESTED (RED)

**Requirements:**
- Create `GroqProvider` class in `src/lib/llm/providers/groq-provider.ts`
- Implement `LLMProvider` interface explicitly
- Use `groq-sdk` npm package for API communication
- Accept `apiKey` and `model` parameters in constructor
- Default to `llama-3.3-70b-versatile` for model
- Validate `GROQ_API_KEY` environment variable at initialization
- Throw descriptive error if API key is missing or invalid
- Convert Message[] format to Groq's chat completions format
- Support system prompt as separate message role
- Return plain text response from `chat()` method

**Tests:** TEST-AC-7.2.1.1 through TEST-AC-7.2.1.5

---

### AC-7.2.2: Rate Limiting Middleware Implementation

**Status:** TESTED (RED)

**Requirements:**
- Create `RateLimiter` class in `src/lib/llm/rate-limiter.ts`
- Implement sliding window algorithm with 60-second window
- Track request timestamps per provider in memory
- Enforce `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE` limit (default: 2 RPM)
- Wait until oldest timestamp expires before allowing next request if limit hit
- Log wait duration when rate limit is enforced
- Support enabling/disabling via `GROQ_RATE_LIMIT_ENABLED` environment variable
- Be reusable for other providers (Gemini, future providers)

**Tests:** TEST-AC-7.2.2.1 through TEST-AC-7.2.2.5

---

### AC-7.2.3: HTTP Header Monitoring

**Status:** TESTED (RED)

**Requirements:**
- Monitor `x-ratelimit-remaining-requests` header
- Monitor `x-ratelimit-limit-requests` header
- Monitor `x-ratelimit-reset-requests` header
- Log rate limit status after each API call (e.g., "Rate limit: 998/1000 remaining")
- Parse `retry-after` header from 429 responses
- Include retry-after duration in rate limit exceeded errors

**Tests:** TEST-AC-7.2.3.1 and TEST-AC-7.2.3.2

---

### AC-7.2.4: Graceful 429 Error Handling

**Status:** TESTED (RED)

**Requirements:**
- Catch 429 errors from Groq API
- Parse `retry-after` header for wait duration
- Log warning message with retry-after duration
- Wait the suggested duration before retrying (if within reasonable time)
- Throw descriptive error with guidance: "Rate limit exceeded. Waiting 30s..."
- Include actionable guidance in error message (switch provider or wait)

**Tests:** TEST-AC-7.2.4.1 through TEST-AC-7.2.4.3

---

### AC-7.2.5: Environment Variable Configuration

**Status:** TESTED (RED)

**Requirements:**
- Read `GROQ_API_KEY` for API authentication (required)
- Read `GROQ_MODEL` for model selection (default: "llama-3.3-70b-versatile")
- Read `GROQ_RATE_LIMIT_ENABLED` for rate limiting toggle (default: "true")
- Read `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE` for rate limit (default: "2")
- Validate `GROQ_API_KEY` is present at initialization
- Provide clear error message if API key is missing with link to console.groq.com
- Support alternative models: `llama-3.1-8b-instant`, `gemma-2-9b-it`

**Tests:** TEST-AC-7.2.5.1 and TEST-AC-7.2.5.2

---

### AC-7.2.6: Provider Factory Registration

**Status:** TESTED (RED)

**Requirements:**
- Add `groq` case to switch statement in `createLLMProvider()`
- Return `GroqProvider` instance for `providerType === 'groq'`
- Validate `GROQ_API_KEY` environment variable before instantiation
- Pass model parameter from `GROQ_MODEL` environment variable
- Include `groq` in error message listing supported providers
- Maintain consistency with existing provider registrations

**Tests:** TEST-AC-7.2.6.1 through TEST-AC-7.2.6.7

---

### AC-7.2.7: Integration Tests

**Status:** TESTED (RED)

**Requirements:**
- Groq API authentication with valid API key
- Chat completion with Llama 3.3 70B model
- Message format conversion (Message[] to Groq format)
- System prompt handling (separate role in Groq)
- Error handling for invalid API key
- Error handling for rate limit (429) with mocked response
- HTTP header monitoring (mocked headers)
- Rate limiter enforces 2 RPM (1 request per 30 seconds)
- Rate limiter allows requests after window expires

**Tests:** TEST-AC-7.2.7.1 through TEST-AC-7.2.7.11

---

### AC-7.2.8: Rate Limiter Unit Tests

**Status:** TESTED (RED)

**Requirements:**
- Sliding window algorithm tracks timestamps correctly
- Requests within limit pass through without delay
- Requests exceeding limit wait until oldest timestamp expires
- Old timestamps (> 60s) are removed from window
- Rate limiter can be disabled via `enabled` parameter
- Different providers have independent rate limits (groq, gemini)
- Wait duration is calculated correctly

**Tests:** TEST-AC-7.2.8.1 through TEST-AC-7.2.8.7

---

## Test Execution Results

### Current Status: RED (Expected)

All tests are failing because the implementation doesn't exist yet. This is the correct and expected state for the TDD RED phase.

**Test Execution Summary:**
```
Test Files: 4
Tests: 44 test scenarios
Status: RED - All tests failing
Reason: Implementation files don't exist (GroqProvider, factory modifications)
```

**Failure Reason:**
```
Error: Failed to resolve import "../../../src/lib/llm/providers/groq-provider"
```

This is the expected RED state - tests are defining behavior that needs to be implemented.

---

## Priority Coverage

### P0 (Critical) - 100% Coverage
- AC-7.2.1: GroqProvider Class Implementation ✓
- AC-7.2.2: Rate Limiting Middleware Implementation ✓
- AC-7.2.6: Provider Factory Registration ✓

### P1 (Important) - 100% Coverage
- AC-7.2.3: HTTP Header Monitoring ✓
- AC-7.2.4: Graceful 429 Error Handling ✓
- AC-7.2.5: Environment Variable Configuration ✓
- AC-7.2.7: Integration Tests ✓
- AC-7.2.8: Rate Limiter Unit Tests ✓

---

## Implementation Tasks (Next Phase - GREEN)

To move from RED to GREEN, the following implementation is needed:

1. **Install groq-sdk package**
   ```bash
   npm install groq-sdk
   ```

2. **Create GroqProvider** (`src/lib/llm/providers/groq-provider.ts`)
   - Implement LLMProvider interface
   - Add constructor with API key validation
   - Implement chat() method with message conversion
   - Add rate limiting integration
   - Add HTTP header monitoring
   - Add 429 error handling

3. **Update Factory** (`src/lib/llm/factory.ts`)
   - Add `groq` case to switch statement
   - Validate GROQ_API_KEY before instantiation
   - Pass GROQ_MODEL to constructor

4. **Environment Variables** (`.env.local`)
   - Add GROQ_API_KEY template
   - Add GROQ_MODEL with default
   - Add rate limiting configuration

5. **Documentation**
   - Update architecture documentation
   - Add Groq section to LLM provider documentation

---

## Definition of Done - ATDD Phase

- [x] All acceptance criteria have test coverage
- [x] Tests are written in BDD format (Given-When-Then)
- [x] Tests have unique IDs mapping to ACs (TEST-AC-7.2.*)
- [x] Tests focus on USER BEHAVIOR, not implementation details
- [x] Tests are independent and idempotent
- [x] Tests are deterministic (no random data)
- [x] All tests FAIL (RED state verified)
- [x] ATDD checklist document created

---

## Next Steps

1. **Implementation Phase (GREEN)**
   - Create GroqProvider class
   - Update factory
   - Configure environment variables
   - Run tests until all pass

2. **Refactoring Phase (REFACTOR)**
   - Optimize code quality
   - Improve test coverage if needed
   - Ensure code follows patterns

3. **Documentation**
   - Update architecture docs
   - Add code comments
   - Update README if needed

---

**ATDD Checklist Version:** 1.0
**Last Updated:** 2026-01-22
**Status:** RED - Ready for implementation
