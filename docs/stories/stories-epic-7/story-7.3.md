# Story 7.3: UI Provider Selector

**Epic:** 7 - LLM Provider Enhancement (Groq Integration + Pluggable Architecture)
**Status:** done
**Priority:** P0 (High - Core Infrastructure)
**Points:** 3
**Dependencies:** Story 7.1 (Pluggable Provider Interface), Story 7.2 (Groq Integration)
**Created:** 2026-01-23
**Developer:** TBD

---

## Story Description

Implement Settings → AI Configuration UI for runtime LLM provider switching with database persistence of user preferences. This story enables users to switch between Ollama, Gemini, and Groq providers through a user-friendly interface without requiring application restart or configuration file changes.

**User Value:** Content creators can switch between LLM providers (Ollama for privacy, Gemini for quality, Groq for speed) via Settings → AI Configuration page. Their selection persists across page reloads and is automatically used for all script generation operations.

**Note:** This story is part of **Feature 1.9 Enhancement (PRD v3.6)** and completes the Epic 7 trilogy by adding the UI layer on top of the pluggable provider architecture (Story 7.1) and Groq integration (Story 7.2).

---

## User Story

**As a** content creator,
**I want** to select my preferred LLM provider (Ollama, Gemini, or Groq) through a Settings UI,
**So that** I can switch between providers without editing configuration files or restarting the application.

**As a** content creator,
**I want** my provider selection to persist across page reloads,
**So that** I don't have to re-select my preferred provider every time I use the application.

**As a** content creator,
**I want** to see which provider is currently being used for script generation,
**So that** I can verify my selection is working as expected.

---

## Acceptance Criteria

### AC-7.3.1: Database Schema Migration

**Given** the user_preferences table exists from Epic 6
**When** the default_llm_provider column is added
**Then** the system shall:
- Create migration file `src/lib/db/migrations/020_user_preferences_default_provider.ts`
- Add `default_llm_provider TEXT DEFAULT 'ollama'` column to `user_preferences` table
- Add CHECK constraint validating values: `CHECK(default_llm_provider IN ('ollama', 'gemini', 'groq'))`
- Run migration automatically on application startup via `runMigrations()`
- Default to 'ollama' if not set (fallback to local provider)
- Log migration completion: "Applied migration 020: user_preferences_default_provider"

### AC-7.3.2: Database Query Functions

**Given** the user_preferences table has default_llm_provider column
**When** database query functions are implemented
**Then** the system shall:
- Add `getUserLLMProvider(): string` function in `src/lib/db/queries.ts`
- Query `SELECT default_llm_provider FROM user_preferences WHERE id = 'default'`
- Return 'ollama' if no row exists (safe default)
- Add `updateUserLLMProvider(provider: string): void` function in `src/lib/db/queries.ts`
- Update row: `UPDATE user_preferences SET default_llm_provider = ?, updated_at = datetime('now') WHERE id = 'default'`
- Insert row if not exists: `INSERT OR IGNORE INTO user_preferences (id) VALUES ('default')`
- Validate provider value before update (throw if not 'ollama', 'gemini', or 'groq')
- Update `updated_at` timestamp on every change

### AC-7.3.3: API Endpoints

**Given** the UI needs to read and update user preferences
**When** API endpoints are implemented
**Then** the system shall:
- Create `GET /api/user/preferences` endpoint in `src/app/api/user/preferences/route.ts`
- Return JSON: `{ default_llm_provider: 'ollama' }`
- Use `getUserLLMProvider()` to fetch current selection
- Return 200 OK on success
- Create `PUT /api/user/preferences` endpoint in `src/app/api/user/preferences/route.ts`
- Accept JSON body: `{ default_llm_provider: 'groq' }`
- Validate provider value (throw 400 if invalid)
- Use `updateUserLLMProvider()` to persist selection
- Return 200 OK on success
- Return 400 Bad Request if provider value is invalid

### AC-7.3.4: AI Configuration Settings UI Component

**Given** the Settings page exists
**When** the AI Configuration settings panel is implemented
**Then** the system shall:
- Create `components/features/settings/ai-configuration.tsx` component
- Add provider dropdown selector with three options:
  - Ollama (Local) - Free, Unlimited, Privacy-Focused
  - Gemini (Cloud) - 1,500 requests/day free, Google AI
  - Groq (Cloud) - 1,000 requests/day free, Ultra-Fast
- Display provider description/characteristics below selector
- Show "Powered by {Provider}" indicator badge
- Persist selection immediately on change (debounce 500ms)
- Show success toast: "Switched to {PROVIDER} provider"
- Show error toast if update fails
- Load current selection on component mount
- Handle loading state while fetching preferences

### AC-7.3.5: Provider Selection Persistence

**Given** a user selects a provider in Settings → AI Configuration
**When** the selection is saved to database
**Then** the system shall:
- Call PUT /api/user/preferences with selected provider
- Update user_preferences.default_llm_provider column
- Update user_preferences.updated_at timestamp
- Persist across page reloads (read from database on mount)
- Persist across browser sessions (database storage)
- Return updated selection from GET /api/user/preferences
- Validate provider value before saving (CHECK constraint)

### AC-7.3.6: Script Generation Integration

**Given** a user has selected a provider in Settings
**When** script generation is triggered
**Then** the system shall:
- Read user preference from database via `getUserLLMProvider()`
- Pass provider to `createLLMProvider(userPreference)` factory call
- Use selected provider for script generation
- Log provider used: "Using {provider} provider for script generation"
- Fall back to 'ollama' if database read fails (safe default)
- Throw descriptive error if selected provider not available (e.g., API key missing)

### AC-7.3.7: Provider Indicator Badge

**Given** a user has selected a provider
**When** the user views any page
**Then** the system shall:
- Display "Powered by {Provider}" badge in header or sidebar
- Update badge when provider changes via Settings
- Show provider name in uppercase (OLLAMA, GEMINI, GROQ)
- Style badge with provider-specific color (Ollama: green, Gemini: blue, Groq: purple)
- Include icon or logo for each provider (optional)

### AC-7.3.8: E2E Tests

**Given** the UI provider selector is implemented
**When** E2E tests are executed
**Then** the tests shall validate:
- User opens Settings → AI Configuration page
- User switches provider from Ollama to Groq
- Selection persists to database (verify via API)
- Page reload preserves Groq selection
- Script generation uses Groq provider after selection
- User switches provider from Groq to Gemini
- Script generation uses Gemini provider
- Invalid provider value shows error message
- Provider indicator badge updates when selection changes

**Specific Test Scenarios:**
- User switches to Groq → database updated → page reload → Groq still selected
- User generates script after selecting Groq → Groq provider used (verify logs)
- User switches to Gemini without API key → error message shown
- Provider badge displays "Powered by GROQ" after selecting Groq

---

## Technical Design

### Architecture: UI Provider Selector with Database Persistence

```
 User → Settings → AI Configuration → PUT /api/user/preferences
   │                                      │
   │                                      ▼
   │                          updateUserLLMProvider('groq')
   │                                      │
   │                                      ▼
   │                    user_preferences.default_llm_provider = 'groq'
   │
   ▼ (page reload)
 GET /api/user/preferences
   │
   ▼
 getUserLLMProvider() → 'groq'
   │
   ▼
 UI displays "Groq" as selected
   │
   ▼ (user generates script)
 Script Generation API
   │
   ▼
 createLLMProvider(getUserLLMProvider())
   │
   ▼
 GroqProvider.chat() → Ultra-fast script generation
```

### File Structure

```
src/lib/db/
├── migrations/
│   └── 020_user_preferences_default_provider.ts   # NEW - AC-7.3.1
└── queries.ts                                      # MODIFIED - AC-7.3.2

src/app/api/user/preferences/
└── route.ts                                        # NEW - AC-7.3.3

components/features/settings/
└── ai-configuration.tsx                            # NEW - AC-7.3.4

src/app/api/
└── script/route.ts                                 # MODIFIED - AC-7.3.6

tests/e2e/
└── provider-switching.spec.ts                      # NEW - AC-7.3.8
```

### Database Schema (AC-7.3.1)

**Migration:** `src/lib/db/migrations/020_user_preferences_default_provider.ts`

```typescript
import type { Migration } from '../migrations';

export const migration: Migration = {
  version: 20,
  name: 'user_preferences_default_provider',
  up: (db) => {
    // Add default_llm_provider column to user_preferences
    db.exec(`
      ALTER TABLE user_preferences ADD COLUMN default_llm_provider TEXT DEFAULT 'ollama';

      -- Add CHECK constraint for valid provider values
      -- Note: SQLite requires recreating table to add constraint to existing column
      -- For simplicity, validate at application level in queries.ts
    `);

    // Set default value for existing rows
    db.exec(`
      UPDATE user_preferences
      SET default_llm_provider = 'ollama'
      WHERE default_llm_provider IS NULL;
    `);
  }
};
```

**Note:** SQLite doesn't support adding CHECK constraints to existing columns with ALTER TABLE. The constraint validation is handled at the application level in `updateUserLLMProvider()`.

### Database Query Functions (AC-7.3.2)

**Location:** `src/lib/db/queries.ts` (MODIFIED)

```typescript
import db from './client';

/**
 * Get user's preferred LLM provider
 * @returns Provider name ('ollama', 'gemini', 'groq')
 */
export function getUserLLMProvider(): string {
  const pref = db.prepare(`
    SELECT default_llm_provider
    FROM user_preferences
    WHERE id = 'default'
  `).get() as { default_llm_provider: string } | undefined;

  return pref?.default_llm_provider || 'ollama';
}

/**
 * Update user's preferred LLM provider
 * @param provider - Provider name ('ollama', 'gemini', 'groq')
 * @throws Error if provider value is invalid
 */
export function updateUserLLMProvider(provider: string): void {
  const validProviders = ['ollama', 'gemini', 'groq'];

  if (!validProviders.includes(provider)) {
    throw new Error(
      `Invalid provider: ${provider}. ` +
      `Valid providers: ${validProviders.join(', ')}`
    );
  }

  // Ensure row exists
  db.prepare(`
    INSERT OR IGNORE INTO user_preferences (id) VALUES ('default')
  `).run();

  // Update provider preference
  db.prepare(`
    UPDATE user_preferences
    SET default_llm_provider = ?, updated_at = datetime('now')
    WHERE id = 'default'
  `).run(provider);
}
```

### API Endpoints (AC-7.3.3)

**Location:** `src/app/api/user/preferences/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserLLMProvider, updateUserLLMProvider } from '@/lib/db/queries';

// GET /api/user/preferences - Get user's current LLM provider
export async function GET() {
  try {
    const provider = getUserLLMProvider();
    return NextResponse.json({ default_llm_provider: provider });
  } catch (error) {
    console.error('[GET /api/user/preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/user/preferences - Update user's LLM provider
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { default_llm_provider } = body;

    // Validate provider value
    const validProviders = ['ollama', 'gemini', 'groq'];
    if (!default_llm_provider || !validProviders.includes(default_llm_provider)) {
      return NextResponse.json(
        {
          error: `Invalid provider: ${default_llm_provider}`,
          validProviders
        },
        { status: 400 }
      );
    }

    // Update database
    updateUserLLMProvider(default_llm_provider);

    return NextResponse.json({
      success: true,
      default_llm_provider
    });
  } catch (error) {
    console.error('[PUT /api/user/preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}
```

### AI Configuration UI Component (AC-7.3.4)

**Location:** `components/features/settings/ai-configuration.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type Provider = 'ollama' | 'gemini' | 'groq';

interface UserPreferences {
  default_llm_provider: Provider;
}

const PROVIDER_INFO = {
  ollama: {
    name: 'Ollama (Local)',
    description: 'Free, Unlimited, Privacy-Focused',
    color: 'bg-green-100 text-green-800',
  },
  gemini: {
    name: 'Gemini (Cloud)',
    description: '1,500 requests/day free, Google AI',
    color: 'bg-blue-100 text-blue-800',
  },
  groq: {
    name: 'Groq (Cloud)',
    description: '1,000 requests/day free, Ultra-Fast',
    color: 'bg-purple-100 text-purple-800',
  },
};

export function AIConfigurationSettings() {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('ollama');
  const [isLoading, setIsLoading] = useState(true);

  // Load current preference on mount
  useEffect(() => {
    async function loadPreference() {
      try {
        const res = await fetch('/api/user/preferences');
        const data: UserPreferences = await res.json();
        setSelectedProvider(data.default_llm_provider);
      } catch (error) {
        console.error('Failed to load provider preference:', error);
        toast.error('Failed to load provider preference');
      } finally {
        setIsLoading(false);
      }
    }
    loadPreference();
  }, []);

  // Handle provider change
  const handleProviderChange = async (provider: Provider) => {
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_llm_provider: provider }),
      });

      if (!res.ok) {
        throw new Error('Failed to update provider preference');
      }

      setSelectedProvider(provider);
      toast.success(`Switched to ${PROVIDER_INFO[provider].name} provider`);
    } catch (error) {
      console.error('Failed to update provider:', error);
      toast.error('Failed to update provider preference');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const info = PROVIDER_INFO[selectedProvider];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">AI Configuration</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium">LLM Provider</label>

        <select
          value={selectedProvider}
          onChange={(e) => handleProviderChange(e.target.value as Provider)}
          className="w-full border rounded-md p-2"
        >
          <option value="ollama">{PROVIDER_INFO.ollama.name}</option>
          <option value="gemini">{PROVIDER_INFO.gemini.name}</option>
          <option value="groq">{PROVIDER_INFO.groq.name}</option>
        </select>

        <p className="text-sm text-gray-600">{info.description}</p>
      </div>

      <div className={`inline-block px-3 py-1 rounded-full text-sm ${info.color}`}>
        Powered by {selectedProvider.toUpperCase()}
      </div>
    </div>
  );
}
```

### Script Generation Integration (AC-7.3.6)

**Location:** `src/app/api/script/route.ts` (MODIFIED)

```typescript
import { createLLMProvider } from '@/lib/llm/factory';
import { getUserLLMProvider } from '@/lib/db/queries';

export async function POST(req: Request) {
  const { topic, projectId } = await req.json();

  // Get user's preferred provider from database
  const userProvider = getUserLLMProvider();
  console.log(`[Script Generation] Using ${userProvider} provider`);

  // Create provider instance (respects user preference)
  const llm = createLLMProvider(userProvider);

  // Generate script (works identically for all providers)
  const script = await llm.chat([
    { role: 'user', content: `Generate a video script about "${topic}"` }
  ], selectedSystemPrompt);

  return Response.json({ success: true, script });
}
```

### E2E Tests (AC-7.3.8)

**Location:** `tests/e2e/provider-switching.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Provider Switching Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('User switches from Ollama to Groq and script generation uses Groq', async ({ page }) => {
    // Navigate to Settings → AI Configuration
    await page.click('[data-testid="settings-link"]');
    await page.click('[data-testid="ai-configuration-tab"]');

    // Switch provider to Groq
    await page.selectOption('select[name="provider"]', 'groq');
    await expect(page.locator('.toast-success')).toContainText('Switched to Groq');

    // Verify database updated (via API)
    const prefResponse = await page.request.get('/api/user/preferences');
    const pref = await prefResponse.json();
    expect(pref.default_llm_provider).toBe('groq');

    // Reload page and verify selection persisted
    await page.reload();
    await page.click('[data-testid="settings-link"]');
    await page.click('[data-testid="ai-configuration-tab"]');
    await expect(page.locator('select[name="provider"]')).toHaveValue('groq');

    // Verify provider badge shows Groq
    await expect(page.locator('[data-testid="provider-badge"]')).toContainText('Powered by GROQ');

    // Generate script and verify Groq was used (check console logs)
    page.on('console', msg => {
      if (msg.text().includes('Using')) {
        expect(msg.text()).toContain('groq');
      }
    });

    // Navigate to project and generate script
    await page.click('[data-testid="project-link"]');
    await page.click('[data-testid="generate-script-button"]');

    // Wait for script generation to complete
    await expect(page.locator('[data-testid="script-output"]')).toBeVisible();
  });

  test('Provider selection persists across page reloads', async ({ page }) => {
    // Select Gemini provider
    await page.goto('/settings/ai-configuration');
    await page.selectOption('select[name="provider"]', 'gemini');

    // Reload page
    await page.reload();

    // Verify Gemini still selected
    await expect(page.locator('select[name="provider"]')).toHaveValue('gemini');
  });

  test('Invalid provider value shows error message', async ({ page }) => {
    await page.goto('/settings/ai-configuration');

    // Try to set invalid provider (via API directly)
    const response = await page.request.put('/api/user/preferences', {
      data: { default_llm_provider: 'invalid' }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('Invalid provider');
  });
});
```

---

## Tasks

### Task 1: Create Database Migration → AC-7.3.1
- [ ] Create `src/lib/db/migrations/020_user_preferences_default_provider.ts`
- [ ] Add `default_llm_provider TEXT DEFAULT 'ollama'` column via ALTER TABLE
- [ ] Set default value for existing rows
- [ ] Add migration to migrations array in `src/lib/db/migrations.ts`
- [ ] Test migration runs successfully on application startup
- [ ] Verify column exists in database schema

### Task 2: Implement Database Query Functions → AC-7.3.2
- [ ] Add `getUserLLMProvider()` function to `src/lib/db/queries.ts`
- [ ] Query `default_llm_provider` from `user_preferences` table
- [ ] Return 'ollama' as safe default if no row exists
- [ ] Add `updateUserLLMProvider(provider)` function to `src/lib/db/queries.ts`
- [ ] Validate provider value (ollama, gemini, groq) before update
- [ ] Ensure row exists before update (INSERT OR IGNORE)
- [ ] Update `updated_at` timestamp on every change
- [ ] Throw descriptive error if provider value is invalid

### Task 3: Create API Endpoints → AC-7.3.3
- [ ] Create `src/app/api/user/preferences/route.ts`
- [ ] Implement GET endpoint returning `{ default_llm_provider }`
- [ ] Implement PUT endpoint accepting `{ default_llm_provider }`
- [ ] Validate provider value in PUT endpoint (400 if invalid)
- [ ] Call `updateUserLLMProvider()` to persist selection
- [ ] Add error handling (500 on database errors)
- [ ] Test endpoints manually with curl or Postman

### Task 4: Create AI Configuration UI Component → AC-7.3.4
- [ ] Create `components/features/settings/ai-configuration.tsx`
- [ ] Add provider dropdown with three options (Ollama, Gemini, Groq)
- [ ] Add provider description/characteristics display
- [ ] Implement `useEffect` to load current preference on mount
- [ ] Implement `handleProviderChange()` with API call
- [ ] Add success toast on provider change
- [ ] Add error toast on failure
- [ ] Add loading state while fetching preference
- [ ] Style with Tailwind CSS (consistent with Settings page)

### Task 5: Add Provider Indicator Badge → AC-7.3.7
- [ ] Add provider badge component to header or sidebar
- [ ] Display "Powered by {PROVIDER}" text
- [ ] Style badge with provider-specific colors
- [ ] Update badge when provider changes (reactive state)
- [ ] Test badge displays correct provider after selection change

### Task 6: Integrate with Script Generation → AC-7.3.6
- [ ] Modify `src/app/api/script/route.ts` to read user preference
- [ ] Call `getUserLLMProvider()` before script generation
- [ ] Pass provider to `createLLMProvider()` factory call
- [ ] Log provider used: "Using {provider} provider"
- [ ] Add fallback to 'ollama' if database read fails
- [ ] Test script generation with each provider

### Task 7: Write E2E Tests → AC-7.3.8
- [ ] Create `tests/e2e/provider-switching.spec.ts`
- [ ] Test user switches from Ollama to Groq
- [ ] Test selection persists to database (via API)
- [ ] Test page reload preserves selection
- [ ] Test script generation uses selected provider (verify logs)
- [ ] test provider indicator badge updates
- [ ] Test invalid provider value shows error

### Task 8: Add AI Configuration to Settings Navigation → AC-7.3.4
- [ ] Add "AI Configuration" tab to Settings page
- [ ] Render `AIConfigurationSettings` component in tab
- [ ] Add navigation link to Settings menu
- [ ] Test navigation to AI Configuration page
- [ ] Verify component renders without errors

---

## Dev Notes

### Architecture References
- **Tech Spec:** Epic 7 - Story 7.3 Acceptance Criteria
- **PRD:** Feature 1.9 Enhancement (FR-1.9.08 - UI-based provider switching)
- **Epic File:** docs/epics/epic-7-llm-provider-enhancement-groq-integration.md - Story 7.3
- **Architecture:** docs/architecture/llm-provider-abstraction-v2.md (UI Switching section)
- **Quick Reference:** docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md
- **Database Schema:** docs/architecture/database-schema.md (user_preferences table)
- **ADR-009:** Pluggable LLM Provider Interface
- **ADR-010:** Proactive Rate Limiting for Cloud LLM Providers

### Dependencies
- **Story 7.1:** Pluggable LLM Provider Interface (LLMProvider interface, factory pattern)
- **Story 7.2:** Groq Integration + Rate Limiting (GroqProvider, RateLimiter)
- **Database:** SQLite with better-sqlite3 package
- **UI Framework:** React with Next.js 15 App Router
- **Styling:** Tailwind CSS
- **Notifications:** sonner package for toast messages

### Learnings from Previous Story

**From Story 7.2 (Groq Integration + Rate Limiting) - Status: done**

- **GroqProvider Implementation:** `chat(messages, systemPrompt)` method is the contract. UI provider selector must pass correct provider to factory.
- **Factory Pattern:** `createLLMProvider(userPreference)` accepts provider string. UI must call this with user's selection.
- **Rate Limiting:** Each provider has different rate limits (Ollama: unlimited, Gemini: 1 RPM, Groq: 2 RPM). UI should display these limits.
- **Environment Variables:** API keys required for Gemini and Groq. UI should show error if API key missing.
- **HTTP Headers:** Groq returns rate limit headers. Future enhancement: display remaining quota in UI.

**Patterns to Reuse:**
- Factory pattern for provider instantiation
- Environment variable validation
- Descriptive error messages with actionable guidance
- Database query functions for user preferences

**New Files Created in Story 7.2:**
- `src/lib/llm/providers/groq-provider.ts` - Groq implementation
- `src/lib/llm/rate-limiter.ts` - Sliding window rate limiter

[Source: docs/stories/stories-epic-7/story-7.2.md#Dev-Agent-Record]

**From Story 7.1 (Pluggable LLM Provider Interface) - Status: done**

- **LLMProvider Interface:** All providers implement `chat()` method consistently.
- **Factory Registration:** Add `case 'groq'` to switch statement. Already done in Story 7.2.
- **Error Handling:** Descriptive Error messages with actionable guidance.

**Database Schema Context:**
- `user_preferences` table already exists from Epic 6 (Quick Production Flow)
- Already has columns: `default_voice_id`, `default_persona_id`, `quick_production_enabled`
- This story adds `default_llm_provider` column to existing table

### Project Structure Notes

**Unified Project Structure Alignment:**
- Database migrations in `src/lib/db/migrations/` subdirectory
- API routes in `src/app/api/user/preferences/` (Next.js 15 App Router pattern)
- UI components in `components/features/settings/` (feature-based organization)
- E2E tests in `tests/e2e/` (consistent with test structure)

**No Conflicts Detected:** This story adds UI layer on top of existing provider architecture. No conflicts with unified project structure.

### Key Design Decisions

1. **Database-First Persistence:** User preferences stored in SQLite database (not localStorage) for server-side access.
2. **API-Backed UI:** UI uses REST API endpoints (/api/user/preferences) for consistency with other settings.
3. **Immediate Persistence:** Selection saved immediately on change (debounce 500ms) for better UX.
4. **Safe Defaults:** Fallback to 'ollama' if database read fails (local provider always available).
5. **Validation at Application Level:** SQLite doesn't support adding CHECK constraints to existing columns, so validation happens in `updateUserLLMProvider()`.
6. **Provider Badge:** Visual feedback to users about which provider is currently active.

### Implementation Notes

- **Non-Breaking Addition:** UI selector is additive. Existing environment variable (`LLM_PROVIDER`) still works as fallback.
- **Settings Navigation:** AI Configuration should be a new tab in existing Settings page.
- **API Key Validation:** If user selects Gemini/Groq without API key, show error message with link to get API key.
- **Rate Limit Display:** Future enhancement - show remaining quota in UI (from HTTP headers).
- **Settings Page Location:** Should be at `/settings/ai-configuration` or `/settings` with tab navigation.

### Testing Strategy

- **Unit Tests:** Test database query functions (getUserLLMProvider, updateUserLLMProvider)
- **Integration Tests:** Test API endpoints (GET/PUT /api/user/preferences)
- **E2E Tests:** Test full provider switching workflow (UI → database → script generation)
- **Manual Testing:** Verify provider selection persists across page reloads and browser sessions
- **Test Coverage:** 80%+ for new files (queries.ts modifications, route.ts, ai-configuration.tsx)

### Database Migration Notes

**SQLite Limitations:**
- SQLite doesn't support adding CHECK constraints to existing columns with ALTER TABLE
- Workaround: Validate at application level in `updateUserLLMProvider()`
- Future enhancement: Recreate table with CHECK constraint (requires data migration)

**Migration Testing:**
```bash
# Test migration in development
sqlite3 ai-video-generator.db ".schema user_preferences"
sqlite3 ai-video-generator.db "SELECT * FROM user_preferences"
```

### Future Considerations

- **Rate Limit Configuration UI:** Future enhancement (current: environment variable only)
- **Model Selection UI:** Future enhancement (current: environment variable only)
- **Provider-Specific Settings:** Different settings per provider (API keys, rate limits, models)
- **Usage Statistics:** Display per-provider usage statistics in UI
- **Cost Tracking:** Show estimated costs for cloud providers (Gemini, Groq)

---

## Definition of Done

- [ ] All Acceptance Criteria verified and passing
- [ ] Database migration created and tested (column added to user_preferences)
- [ ] Database query functions implemented (getUserLLMProvider, updateUserLLMProvider)
- [ ] API endpoints created (GET/PUT /api/user/preferences)
- [ ] AI Configuration UI component created in Settings
- [ ] Provider selection persists across page reloads
- [ ] Script generation uses user's selected provider
- [ ] Provider indicator badge displays current provider
- [ ] E2E tests pass for provider switching workflow
- [ ] Unit tests achieve 80%+ coverage
- [ ] Documentation updated (architecture, quick reference)
- [ ] Code reviewed and approved

---

## Story Points

**Estimate:** 3 points (Small-Medium)

**Justification:**
- Database migration (straightforward ALTER TABLE)
- Database query functions (simple CRUD operations)
- API endpoints (standard REST CRUD, low complexity)
- AI Configuration UI component (moderate complexity - dropdown, API calls, toast notifications)
- Script generation integration (minor modification - read preference, pass to factory)
- Provider indicator badge (minor UI component)
- E2E tests (moderate - full workflow testing)
- Documentation updates (minor)

---

## References

- PRD: Feature 1.9 Enhancement (FR-1.9.08 - UI-based provider switching)
- Epic File: docs/epics/epic-7-llm-provider-enhancement-groq-integration.md - Story 7.3
- Architecture: docs/architecture/llm-provider-abstraction-v2.md (UI Switching section)
- Quick Reference: docs/architecture/GROQ_ARCHITECTURE_QUICK_REFERENCE.md
- Database Schema: docs/architecture/database-schema.md (user_preferences table)
- ADR-009: Pluggable LLM Provider Interface
- ADR-010: Proactive Rate Limiting for Cloud LLM Providers
- Story 7.1: Pluggable LLM Provider Interface (dependency)
- Story 7.2: Groq Integration + Rate Limiting (dependency)

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/stories/story-7.3.context.xml

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
