# E2E UI Tests - Video Generation Pipeline

This directory contains Playwright end-to-end tests that verify the **actual frontend UI** by simulating real user interactions through a browser.

## What Tests Cover

The E2E UI tests validate:

1. **Persona Selection Flow** - Selecting AI narrator persona
2. **Topic Input** - Entering video topic via chat interface
3. **Script Generation** - Triggering and waiting for script generation
4. **Voiceover Generation** - TTS generation progress and completion
5. **Visual Sourcing** - DVIDS/YouTube video search and suggestions
6. **Visual Curation** - Selecting clips for each scene
7. **Video Assembly** - FFmpeg assembly progress
8. **Export/Download** - Final video and thumbnail generation

## Prerequisites

1. Install Playwright:
```bash
cd ai-video-generator
npm install
npx playwright install
```

2. Start the dev server:
```bash
npm run dev
```

The dev server must be running on `http://localhost:3000` before running E2E tests.

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with Playwright UI (interactive mode)
npm run test:e2e:ui

# Run with debug mode (step through)
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/ui/video-pipeline-ui.spec.ts

# Run specific test
npx playwright test --grep "UI-001"
```

## Test Files

| Test File | Description |
|-----------|-------------|
| `video-pipeline-ui.spec.ts` | Complete pipeline flow from persona to export |

## Test Cases

| ID | Description | Status |
|----|-------------|--------|
| UI-001 | Full pipeline: persona → export | ✅ Created |
| UI-002 | Project creation from home page | ✅ Created |
| UI-003 | Project sidebar with history | ✅ Created |
| UI-004 | Chat interface interactions | ✅ Created |
| UI-005 | Visual curation interface | ✅ Created |
| UI-006 | Voice selection interface | ✅ Created |
| UI-007 | Settings pages | ✅ Created |
| UI-008 | Responsive design (mobile/desktop) | ✅ Created |

## Mock Backend

For reliable E2E testing without external dependencies, the tests should use mocked backend responses. This requires:

1. **Mock API Routes** - Intercept fetch calls to `/api/*` endpoints
2. **Mock MCP Server** - Avoid real DVIDS API calls
3. **Mock LLM** - Avoid Groq rate limits
4. **Mock TTS** - Avoid Kokoro installation requirements

To set up mocking, create `tests/mocks/api-handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock script generation
  http.post('/api/projects/:id/generate-script', () => {
    return HttpResponse.json({
      scenes: [
        { sceneNumber: 1, text: 'Test scene 1', estimatedDuration: 10 },
        { sceneNumber: 2, text: 'Test scene 2', estimatedDuration: 15 },
      ],
    });
  }),

  // Mock visual sourcing
  http.post('/api/projects/:id/generate-visuals', () => {
    return HttpResponse.json({
      completed: 2,
      suggestions: [
        { videoId: 'mock-1', title: 'Mock Video 1' },
        { videoId: 'mock-2', title: 'Mock Video 2' },
      ],
    });
  }),
];
```

## Debugging

To debug a failing test:

1. **Run with debug mode:**
   ```bash
   npx playwright test --debug
   ```

2. **Run headed (show browser):**
   ```bash
   npx playwright test --headed
   ```

3. **Run with slow motion:**
   ```bash
   npx playwright test --slow-mo=1000
   ```

4. **View trace after test:**
   ```bash
   npx playwright show-trace test-results/[test-name]
   ```

## Screenshots & Videos

Tests automatically capture:
- **Screenshots** on failure
- **Videos** of test execution
- **Traces** for debugging

Stored in: `test-results/`

## CI/CD Integration

For CI/CD pipelines (GitHub Actions, etc.), add:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: test-results/
```

## Common Issues

### Issue: "Connection refused" on port 3000
**Solution:** Make sure the dev server is running: `npm run dev`

### Issue: Tests timeout
**Solution:** Increase timeout in `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 60000, // 60 seconds
}
```

### Issue: Tests can't find elements
**Solution:** Add `data-testid` attributes to React components:
```tsx
<button data-testid="generate-script">Generate Script</button>
```

## Adding New Tests

1. Create test file in `tests/e2e/ui/`
2. Name it `*.spec.ts`
3. Use Playwright test APIs:
   - `page.goto()` - Navigate to URL
   - `page.locator()` - Find elements
   - `expect()` - Assertions
   - `page.click()`, `page.fill()` - Interactions

Example:
```typescript
test('should do something', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="my-button"]').click();
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
});
```

## Related Tests

| Test Type | Location | Purpose |
|-----------|----------|---------|
| **Unit Tests** | `tests/unit/` | Test individual functions/components |
| **Integration Tests** | `tests/integration/` | Test backend logic (API, DB) |
| **Mock Pipeline** | `tests/integration/mock-pipeline-with-dvids.test.ts` | Test pipeline with mocked DVIDS |
| **E2E UI** | `tests/e2e/ui/` | **Test actual UI through browser** ✅ |
