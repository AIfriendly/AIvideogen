# Story 1.5 Critical Tests

**Test Coverage:** Critical paths only (~40-50% coverage)
**Estimated Time:** 2-3 days
**Test Count:** 6 critical tests (15-20 test cases)

---

## 🎯 What's Tested

### ✅ Critical Test Coverage

1. **1.5-UNIT-010: UUID Fallback** - Browser compatibility
2. **1.5-INT-005: Error Code Mapping** - User-friendly errors
3. **1.5-INT-003: 30s Timeout** - Request abortion
4. **1.5-COMP-008: 5000 Char Validation** - Input limits
5. **1.5-INT-002: State Persistence** - Per-project isolation
6. **1.5-E2E-003: Project Isolation** - No conversation mixing

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## 📊 Expected Results

**All tests passing:**
```
✓ 1.5-UNIT-010: UUID Generation with Fallback (3 tests)
✓ 1.5-INT-005: Error Code Mapping (7 tests)
✓ 1.5-INT-003: Request Timeout Behavior (5 tests)
✓ 1.5-COMP-008: 5000 Character Validation (7 tests)
✓ 1.5-INT-002: State Persistence (3 tests)
✓ 1.5-E2E-003: Multiple Projects Don't Mix (4 tests)

Total: ~29 test cases across 6 critical areas
```

**Coverage Target:**
- Critical paths: 100%
- Overall: ~40-50%

---

## 🔧 Troubleshooting

### Tests Failing?

1. **"Cannot find module '@/...'"**
   - Check `vitest.config.ts` has correct path alias
   - Verify `tsconfig.json` paths configuration

2. **"localStorage is not defined"**
   - Check `tests/setup.ts` is loaded
   - Verify `setupFiles` in vitest.config.ts

3. **"crypto.randomUUID is not a function"**
   - Check `tests/setup.ts` has crypto mock
   - This is expected in test environment (testing fallback)

4. **Component tests failing**
   - Ensure Zustand store is mocked correctly
   - Check test IDs match implementation

---

## 📁 Test Structure

```
tests/
├── setup.ts                          # Global test configuration
├── unit/
│   └── utils/
│       └── message-helpers.test.ts   # UUID + Error mapping
├── component/
│   └── ChatInterface.test.tsx        # 5000 char validation
└── integration/
    ├── timeout-behavior.test.ts      # 30s timeout
    └── state-persistence.test.ts     # Project isolation
```

---

## 🎓 What's NOT Tested (Intentionally)

**Skipped for speed:**
- Complete UI interactions (just critical validation)
- MessageList rendering (simple display logic)
- API endpoint (would require full Next.js setup)
- E2E browser tests (would require Playwright)
- Auto-scroll behavior (UX, not critical)
- Error clearing logic (UX, not critical)

**Rationale:** These aren't high-risk. Manual testing is sufficient.

---

## 📈 Next Steps

### After Critical Tests Pass:

1. **Implement Story 1.X** (Project Management)
2. **Add tests for Story 1.X** alongside development (TDD)
3. **Optional:** Expand test coverage to ~80% later

### When to Add More Tests:

- Before deploying to production
- When bugs are found (regression tests)
- When refactoring complex logic
- For Epic 2-5 (establish testing habit)

---

## ✅ Definition of Done (Critical Tests)

**Story 1.5 is complete when:**

- ✅ All 6 critical tests pass
- ✅ Coverage report shows critical paths covered
- ✅ No flaky tests (run 3 times, all pass)
- ✅ Tests documented in this README
- ✅ CI/CD can run tests (optional)

---

## 🚨 Test Maintenance

**When to update tests:**

1. **Critical requirement changes** - Update matching test
2. **Bug found** - Add regression test
3. **Refactoring** - Tests should still pass (or update if interface changed)
4. **New critical feature** - Add new critical test

**When NOT to update tests:**

- UI styling changes (CSS only)
- Text content changes
- Non-critical UX improvements

---

## 💡 Tips

1. **Run tests before committing** - Catch issues early
2. **Fix failing tests immediately** - Don't let them accumulate
3. **Keep tests fast** - Critical tests should run <5 seconds
4. **Mock external dependencies** - No real API calls in tests
5. **Test behavior, not implementation** - Tests survive refactoring

---

**Questions?** See test files for inline documentation.
