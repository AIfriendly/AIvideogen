# Testing Setup Guide - Story 1.5 Critical Tests

**Time Required:** 15-20 minutes setup + 2-3 days implementation
**Approach:** Critical tests only (pragmatic)

---

## 📦 Step 1: Install Dependencies (5 minutes)

Run this command in your project root:

```bash
npm install --save-dev \
  vitest@^1.0.0 \
  @vitest/ui@^1.0.0 \
  @testing-library/react@^14.1.2 \
  @testing-library/jest-dom@^6.1.5 \
  @testing-library/user-event@^14.5.1 \
  jsdom@^23.0.1 \
  @vitejs/plugin-react@^4.2.1 \
  @types/node@^20.10.6
```

Or add to `package.json` manually:

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "jsdom": "^23.0.1",
    "@vitejs/plugin-react": "^4.2.1",
    "@types/node": "^20.10.6"
  }
}
```

Then run: `npm install`

---

## ⚙️ Step 2: Add Test Scripts (2 minutes)

Update your `package.json` scripts section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 📁 Step 3: Verify Files Created (1 minute)

Check these files exist:

```
✅ vitest.config.ts              # Test configuration
✅ tests/setup.ts                 # Global test setup
✅ tests/README.md                # Test documentation
✅ tests/unit/utils/message-helpers.test.ts
✅ tests/component/ChatInterface.test.tsx
✅ tests/integration/timeout-behavior.test.ts
✅ tests/integration/state-persistence.test.ts
```

---

## ✅ Step 4: Run Tests (2 minutes)

```bash
# Run all tests
npm test

# Expected output:
# ✓ tests/unit/utils/message-helpers.test.ts (10 tests)
# ✓ tests/integration/timeout-behavior.test.ts (5 tests)
# ✓ tests/component/ChatInterface.test.tsx (7 tests)
# ✓ tests/integration/state-persistence.test.ts (7 tests)
#
# Test Files  4 passed (4)
#      Tests  29 passed (29)
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@/...'"

**Solution:** Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: Tests fail with "localStorage is not defined"

**Solution:** Check `tests/setup.ts` is loaded:
- Verify `vitest.config.ts` has `setupFiles: ['./tests/setup.ts']`

### Issue: "ReferenceError: React is not defined"

**Solution:** Ensure `@vitejs/plugin-react` is installed and in `vitest.config.ts`

### Issue: Component tests fail to import

**Solution:** Check mock in test file matches actual export:
```typescript
// Should match: export function ChatInterface({ projectId })
import { ChatInterface } from '@/components/features/conversation/ChatInterface';
```

---

## 📊 What Success Looks Like

**Terminal output:**
```
 ✓ tests/unit/utils/message-helpers.test.ts (10)
   ✓ 1.5-UNIT-010: UUID Generation with Fallback (3)
     ✓ should use crypto.randomUUID when available
     ✓ should use fallback when crypto.randomUUID unavailable
     ✓ should generate unique IDs on multiple calls
   ✓ 1.5-INT-005: Error Code Mapping (7)
     ✓ should map OLLAMA_CONNECTION_ERROR correctly
     ✓ should map INVALID_PROJECT_ID correctly
     ✓ [... more tests ...]

 ✓ tests/integration/timeout-behavior.test.ts (5)
   ✓ 1.5-INT-003: Request Timeout Behavior (5)
     ✓ should abort fetch request after 30 seconds
     ✓ [... more tests ...]

 ✓ tests/component/ChatInterface.test.tsx (7)
   ✓ 1.5-COMP-008: 5000 Character Validation (7)
     ✓ should render input field with maxLength 5000
     ✓ [... more tests ...]

 ✓ tests/integration/state-persistence.test.ts (7)
   ✓ 1.5-INT-002: State Persistence (3)
   ✓ 1.5-E2E-003: Multiple Projects Don't Mix (4)
     ✓ [... more tests ...]

Test Files  4 passed (4)
     Tests  29 passed (29)
  Start at  15:30:45
  Duration  1.23s
```

**All green ✅ = You're done!**

---

## 🎯 Next Steps After Setup

### Immediate (Today):
1. ✅ Run tests to verify setup
2. ✅ Fix any failing tests
3. ✅ Commit test files to git

### Short-term (This Week):
1. Implement Story 1.X (Project Management)
2. Write tests for Story 1.X alongside code (TDD)
3. Keep running `npm test` before commits

### Long-term (Future Epics):
1. Maintain critical test coverage for new features
2. Add tests when bugs found (regression prevention)
3. Optional: Expand coverage to ~80% before production

---

## 💡 Testing Best Practices

**DO:**
- ✅ Run tests before committing
- ✅ Fix failing tests immediately
- ✅ Write tests for new critical features
- ✅ Use test IDs for component testing
- ✅ Mock external dependencies

**DON'T:**
- ❌ Commit failing tests
- ❌ Skip tests because they're "annoying"
- ❌ Test implementation details
- ❌ Make tests depend on each other
- ❌ Ignore flaky tests

---

## 📚 Learn More

**Vitest Documentation:**
- https://vitest.dev/

**Testing Library:**
- https://testing-library.com/docs/react-testing-library/intro/

**Test Architecture Knowledge:**
- `BMAD-METHOD/bmad/bmm/testarch/knowledge/test-quality.md`

---

## ✅ Setup Complete Checklist

Before moving to implementation:

- [ ] Dependencies installed (`npm install` completed)
- [ ] Test scripts added to package.json
- [ ] All test files present (4 files)
- [ ] `npm test` runs without errors
- [ ] All 29 tests passing
- [ ] Coverage report can generate (`npm run test:coverage`)

**When all checked:** You're ready to implement Story 1.X! 🚀

---

**Questions?** Check `tests/README.md` or test file inline documentation.
