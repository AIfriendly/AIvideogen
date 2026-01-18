# Sprint Change Proposal - Quick Production Settings Navigation & Duration

**Date:** 2025-12-03
**Author:** SM Agent (Bob)
**Status:** Approved & Implemented
**Scope:** Minor

---

## Section 1: Issue Summary

### Problem Statement
Two issues identified with Quick Production settings:

1. **Navigation:** Users cannot access Quick Production settings after initial configuration. The settings page exists but has no navigation links.
2. **Missing Duration:** Users cannot configure default video duration in Quick Production settings.

### Context
- **Discovered:** During post-implementation review of Stories 6.8a and 6.8b
- **Reported by:** User (master)
- **Evidence:** User showed Project Settings modal which contains no Quick Production options. The TopicSuggestions component only shows "Setup Quick Production" button when defaults are NOT configured - once configured, the button disappears. Additionally, the settings page only has voice and persona - no duration setting.

### Root Cause
1. Story 6.8a created the `/settings/quick-production` page but did not add navigation links to existing UI components
2. Duration was not included in the original Quick Production settings design

---

## Section 2: Impact Analysis

### Epic Impact
- **Epic 6:** Channel Intelligence & Content Research - Minor UI gap

### Story Impact
- **Story 6.8a:** QPF Infrastructure - Missing navigation links
- **Story 6.8b:** QPF UI & Integration - TopicSuggestions button logic incomplete

### Artifact Conflicts
- **PRD:** No conflict - navigation was implied but not explicit
- **Architecture:** No conflict
- **UI/UX:** Minor gap - settings accessibility not fully specified

### Technical Impact
- **Code Changes:** 2 files modified
- **Risk:** Low - additive changes only
- **Testing:** Manual verification sufficient

---

## Section 3: Recommended Approach

### Approach: Direct Adjustment
Modify existing components to add navigation links. No rollback or MVP review needed.

### Rationale
- Simple UI enhancement
- No architectural changes
- Additive only (no breaking changes)
- Immediate user value

### Effort Estimate
- **Development:** 15 minutes
- **Testing:** 5 minutes
- **Risk:** Very Low

---

## Section 4: Detailed Change Proposals

### Change #1: Add Quick Production link to ProjectSidebar

**File:** `src/components/features/projects/ProjectSidebar.tsx`

**Before:**
```tsx
import { Brain } from 'lucide-react';
...
{/* Channel Intelligence link - fixed at bottom */}
<div className="p-4 border-t border-slate-700">
  <Link href="/settings/channel-intelligence" ...>
    <Brain className="h-5 w-5" />
    <span>Channel Intelligence</span>
  </Link>
</div>
```

**After:**
```tsx
import { Brain, Zap } from 'lucide-react';
...
{/* Settings links - fixed at bottom */}
<div className="p-4 border-t border-slate-700 space-y-1">
  <Link href="/settings/channel-intelligence" ...>
    <Brain className="h-5 w-5" />
    <span>Channel Intelligence</span>
  </Link>
  <Link href="/settings/quick-production" ...>
    <Zap className="h-5 w-5" />
    <span>Quick Production</span>
  </Link>
</div>
```

**Justification:** Users need persistent access to Quick Production settings from main sidebar navigation.

---

### Change #2: Update TopicSuggestions to always show settings button

**File:** `src/components/features/channel-intelligence/TopicSuggestions.tsx`

**Before:**
```tsx
{hasDefaults === false && (
  <Button onClick={() => router.push('/settings/quick-production')}>
    <Settings className="h-3 w-3 mr-1" />
    Setup Quick Production
  </Button>
)}
```

**After:**
```tsx
<Button onClick={() => router.push('/settings/quick-production')}>
  <Settings className="h-3 w-3 mr-1" />
  {hasDefaults === false ? 'Setup Quick Production' : 'QPF Settings'}
</Button>
```

**Justification:** Settings button should always be visible with context-aware label.

---

## Section 5: Implementation Handoff

### Scope Classification: Minor
Direct implementation by development team - no backlog reorganization needed.

### Handoff Recipients
- **Primary:** Development team (already implemented)

### Success Criteria
- [x] Quick Production link visible in sidebar navigation
- [x] QPF Settings button visible on Channel Intelligence page (both states)
- [x] Navigation works correctly to `/settings/quick-production`
- [x] No TypeScript errors
- [x] Existing functionality unaffected

### Implementation Status
**COMPLETED** - Both changes implemented on 2025-12-03

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/features/projects/ProjectSidebar.tsx` | Added Zap import, added Quick Production link |
| `src/components/features/channel-intelligence/TopicSuggestions.tsx` | Made settings button always visible with dynamic label |
| `src/lib/db/migrations/016_user_preferences_duration.ts` | **NEW** - Migration to add default_duration column |
| `src/lib/db/init.ts` | Registered migration 016 |
| `src/lib/db/queries-user-preferences.ts` | Added default_duration to interfaces and queries |
| `src/app/api/user-preferences/route.ts` | Added duration validation and handling in PUT |
| `src/app/settings/quick-production/page.tsx` | Added duration selector with presets and slider |

---

## Verification

To verify the changes:
1. Start dev server: `npm run dev`
2. Check sidebar - should show "Quick Production" link below "Channel Intelligence"
3. Navigate to Channel Intelligence page
4. Check Topic Suggestions section - should show "Setup Quick Production" or "QPF Settings" button
5. Click either link - should navigate to `/settings/quick-production`
6. Configure defaults, return to Channel Intelligence
7. Verify button now shows "QPF Settings" instead of "Setup Quick Production"

---

**Report Generated:** 2025-12-03
**SM Agent:** Bob
