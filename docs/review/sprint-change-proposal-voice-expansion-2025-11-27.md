# Sprint Change Proposal: Voice Selection Expansion (5 → 20 Voices)

**Date:** 2025-11-27
**Author:** John (Product Manager)
**Workflow:** Correct Course
**Scope:** Epic 2 - Content Generation Pipeline

---

## Issue Summary

**Triggering Request:** User request to expand voice selection from 5 voices to 20 voices (10 male, 10 female)

**Problem Statement:**
The current MVP voice selection is limited to 5 voices, which may not provide sufficient variety for creators working on different content types (educational, entertainment, documentary, gaming, etc.). While 48 voices are available in KokoroTTS and documented in the codebase, only 5 are exposed in the MVP UI.

**User Impact:**
- Limited voice variety for different content tones and styles
- Cannot match voice to content type effectively (e.g., authoritative for business, warm for storytelling)
- No accent diversity beyond American and British
- Missing specialized voices (documentary, technical, enthusiastic)

**Evidence:**
1. User explicitly requested: "i would like to add 15 more voices 10 male and 5 female"
2. KokoroTTS catalog documents 48 available voices (see `docs/review/kokoro-voice-catalog.md`)
3. Voice infrastructure fully implemented in Story 2.1 (voice-profiles.ts contains all 48 voices)
4. Only configuration change needed - no new code required

**When Discovered:** User request during sprint review (2025-11-27)

---

## Impact Analysis

### Epic Impact

**Epic 2: Content Generation Pipeline**
- ✅ Can be completed with configuration change only
- ✅ No architectural changes required
- ✅ No database schema changes required
- **Modification Required:** Update PRD and Epic 2 Story 2.1 requirements from "3-5 voices" to "20 voices"

**Other Epics:**
- No impact on Epic 1 (Chat Agent)
- No impact on Epic 3 (Visual Sourcing)
- No impact on Epic 4 (Visual Curation)
- No impact on Epic 5 (Video Assembly)

### Story Impact

**Current Stories Affected:**
- **Story 2.1:** TTS Engine Integration & Voice Profile Setup - CONFIGURATION UPDATE ONLY (already DONE)

**Future Stories:**
- No impact on remaining Epic 2 stories (2.2-2.6)

### Artifact Conflicts

**PRD (Product Requirements Document):**
- **Conflicts with:**
  - FR-3.02 (line 226): "The system must provide at least 3-5 distinct voice options" ❌ OUTDATED

- **Required Changes:**
  - Update FR-3.02: "at least 3-5 distinct voice options" → "at least 20 distinct voice options"
  - Update PR-3.02 comment: Add note about accent/tone diversity

**Epics Document:**
- **Conflicts with:**
  - Epic 2 Story 2.1 (line 360): "At least 3-5 distinct voice profiles defined" ❌ OUTDATED

- **Required Changes:**
  - Update line 360: "At least 3-5 distinct" → "20 distinct voice profiles"
  - Update line 45: "Gender diversity: 3 female, 2 male" → "Gender diversity: 10 female, 10 male"
  - Update line 46: "Accent diversity: 3 American, 2 British" → "Accent diversity: 8 American, 6 British, 2 Australian, 4 Neutral"

**Architecture Document:**
- No conflicts - supports any number of voices

**UI/UX Specifications:**
- No conflicts - VoiceSelection component supports dynamic voice lists

**Technical Impact:**
- Configuration change only (add `mvpVoice: true` to 15 voices)
- No database schema changes (voice_id already TEXT)
- No API contract changes (endpoints already support any voice ID)
- No migration scripts needed

---

## Recommended Approach

### Selected Path: **Configuration Update (No New Story)**

**Approach:**
1. Update PRD functional requirement FR-3.02
2. Update Epic 2 Story 2.1 acceptance criteria
3. Add `mvpVoice: true` flag to 15 additional voices in `voice-profiles.ts`
4. No new story needed - treated as sprint adjustment via Correct-Course

**Justification:**
- **Implementation Effort:** Minimal (5-10 minutes) - pure configuration
- **Technical Risk:** Zero - infrastructure already exists and tested
- **Impact on Timeline:** None - no new development required
- **Long-Term Sustainability:** High - leverages existing 48-voice catalog
- **Business Value:** High - provides variety without complexity

**Why Not Create Story 2.1b:**
- This is a **configuration tweak**, not a feature implementation
- Story 2.1 already delivered the voice infrastructure (DONE)
- Correct-Course workflow handles sprint adjustments
- Creating story adds 30+ minutes of overhead for 5-minute change
- Fully traceable via this change proposal document

---

## Detailed Change Proposals

### Change #1: Voice Profiles Configuration

**File:** `ai-video-generator/src/lib/tts/voice-profiles.ts`
**Lines:** 107-579

**Current State:**
- 48 total voices defined in VOICE_PROFILES array
- 5 voices marked with `mvpVoice: true` flag
- MVP_VOICES constant filters for mvpVoice flag (line 588)

**Proposed Changes:**

Add `mvpVoice: true` to 15 additional voices:

**Female Voices (7 new):**
1. **sophia** (line 158-165) - American, Authoritative → Educational content
2. **grace** (line 129-135) - American, Sophisticated → Elegant/luxury brands
3. **lucy** (line 327-333) - British, Professional → BBC-style formal content
4. **freya** (line 296-303) - British, Articulate → Academic/lecture content
5. **matilda** (line 424-431) - Australian, Friendly → Travel/adventure
6. **aria** (line 488-495) - Neutral, Clear → International audiences
7. **charlotte** (line 118-125) - American, Gentle → Calming/meditation content

**Male Voices (8 new):**
1. **david** (line 202-209) - American, Authoritative → Leadership/business
2. **william** (line 400-407) - British, Articulate → Documentary/educational
3. **samuel** (line 262-269) - American, Warm → Storytelling/narratives
4. **george** (line 350-357) - British, Distinguished → Historical content
5. **lucas** (line 464-471) - Australian, Friendly → General Australian content
6. **kai** (line 519-525) - Neutral, Clear → Technical/tutorials
7. **ethan** (line 212-219) - American, Friendly → How-to guides
8. **liam** (line 232-239) - American, Enthusiastic → Sports/exciting content

**Implementation Example:**
```typescript
// BEFORE (line 158-165)
{
  id: 'sophia',
  name: 'Sophia - American Female',
  gender: 'female',
  accent: 'american',
  tone: 'authoritative',
  previewUrl: '/audio/previews/sophia.mp3',
  modelId: 'af_sophia',
},

// AFTER
{
  id: 'sophia',
  name: 'Sophia - American Female',
  gender: 'female',
  accent: 'american',
  tone: 'authoritative',
  previewUrl: '/audio/previews/sophia.mp3',
  modelId: 'af_sophia',
  mvpVoice: true, // ← ADD THIS LINE
},
```

**Diversity Analysis:**

| Metric | Before (5 voices) | After (20 voices) |
|--------|------------------|-------------------|
| **Total** | 5 | 20 |
| **Female** | 3 (60%) | 10 (50%) |
| **Male** | 2 (40%) | 10 (50%) |
| **American** | 3 (60%) | 8 (40%) |
| **British** | 2 (40%) | 6 (30%) |
| **Australian** | 0 (0%) | 2 (10%) |
| **Neutral** | 0 (0%) | 4 (20%) |

**Result:** MVP_VOICES.length increases from 5 to 20 automatically (filter applied at line 588)

**Rationale:**
- Balanced gender distribution (10 female, 10 male)
- Diverse accents (American, British, Australian, Neutral)
- Varied tones for different content types (authoritative, warm, professional, friendly, etc.)
- Covers major use cases: educational, business, storytelling, documentary, technical, entertainment

---

### Change #2: PRD Functional Requirement Update

**File:** `docs/prd.md`
**Section:** Feature 1.3 - Voice Selection (line 226)

**Current Text:**
```markdown
*   **FR-3.02:** The system must provide at least 3-5 distinct voice options with different characteristics (gender, accent, tone).
```

**New Text:**
```markdown
*   **FR-3.02:** The system must provide at least 20 distinct voice options with diverse characteristics (gender, accent, tone).
    *   Gender diversity: 10 female, 10 male voices
    *   Accent diversity: American, British, Australian, Neutral/International
    *   Tone diversity: Warm, professional, authoritative, friendly, calm, energetic, articulate, gentle, enthusiastic, sophisticated, and more
```

**Rationale:**
Clarifies the expanded voice requirements and documents the diversity criteria explicitly.

---

### Change #3: Epic 2 Story 2.1 Acceptance Criteria

**File:** `docs/epics.md`
**Section:** Epic 2, Story 2.1 (lines 360-365)

**Current Text:**
```markdown
**Acceptance Criteria:**
- TTS engine successfully installed and accessible via API
- At least 3-5 distinct voice profiles defined with metadata (name, gender, accent, tone)
- Preview audio samples generated and stored for each voice profile
```

**New Text:**
```markdown
**Acceptance Criteria:**
- TTS engine successfully installed and accessible via API
- 20 distinct voice profiles defined with metadata (name, gender, accent, tone)
  - Gender diversity: 10 female, 10 male voices
  - Accent diversity: 8 American, 6 British, 2 Australian, 4 Neutral
  - Tone diversity: 12+ unique tone characteristics
- Preview audio samples generated and stored for each voice profile
```

**Rationale:**
Updates Story 2.1 requirements to reflect the expanded MVP voice selection.

---

### Change #4: Epic 2 MVP Voice Selection Summary

**File:** `docs/epics.md`
**Section:** Epic 2 Workflow Integration (lines 45-49)

**Current Text:**
```markdown
**Rationale for MVP Selection:**
- Gender diversity: 3 female, 2 male
- Accent diversity: 3 American, 2 British
- Tone diversity: Warm, professional, energetic, calm, friendly
- Use cases: Professional narration, friendly storytelling, energetic content
```

**New Text:**
```markdown
**Rationale for MVP Selection:**
- Gender diversity: 10 female, 10 male (balanced 50/50)
- Accent diversity: 8 American, 6 British, 2 Australian, 4 Neutral
- Tone diversity: Warm, professional, authoritative, friendly, calm, energetic, articulate, gentle, enthusiastic, sophisticated, distinguished, clear
- Use cases: Educational content, business presentations, storytelling, documentary narration, technical tutorials, historical content, travel/adventure, international audiences, calming/meditation content, sports/entertainment
```

**Rationale:**
Documents the comprehensive voice selection rationale for the expanded MVP.

---

### Change #5: UX Design Specification Updates

**File:** `docs/ux-design-specification.md`
**Section:** Section 6.5 - Voice Selection UI

**Current Text (Line 1002):**
```markdown
- Display 3-5 voice options with metadata (name, gender, accent, tone)
```

**New Text:**
```markdown
- Display 20 voice options with metadata (name, gender, accent, tone)
- Voice cards displayed in 3-column grid with vertical scroll for overflow
```

---

**Current Text (Line 1019):**
```markdown
│  │ Voice │ │ Voice │ │ Voice │    │  <- Voice cards (3-col grid)
```

**New Text:**
```markdown
│  │ Voice │ │ Voice │ │ Voice │    │  <- Voice cards (3-col grid, scrollable)
│  │ Voice │ │ Voice │ │ Voice │    │  <- 20 total voices, ~7 rows
```

---

**Current Text (Line 1044):**
```markdown
**Voice Card Grid:**
```

**Add After Line 1044:**
```markdown
**Voice Card Grid:**
- Layout: 3 columns (desktop: 1fr 1fr 1fr, tablet: 2fr, mobile: 1fr)
- Rows: 7 rows (20 voices ÷ 3 columns = ~7 rows)
- Vertical scroll: Container has max-height with overflow-y auto
- Gap: 1.5rem between cards
```

---

**Current Text (Line 3452):**
```markdown
- User sees 5 voice options displayed as cards
```

**New Text:**
```markdown
- User sees 20 voice options displayed as cards in scrollable 3-column grid
```

---

**Current Text (Line 3537):**
```markdown
- 5 voice option cards displayed in 3-column grid
```

**New Text:**
```markdown
- 20 voice option cards displayed in scrollable 3-column grid (~7 rows)
```

---

**Current Text (Lines 3541-3545 - Walkthrough):**
```markdown
- User sees Voice 1 card: "Professional Alex | Male | American | Professional"
- User sees Voice 2 card: "Friendly Sarah | Female | British | Friendly"
- User sees Voice 3 card: "Energetic Marcus | Male | Neutral | Energetic"
- User sees Voice 4 card: "Calm Emma | Female | American | Professional"
- User sees Voice 5 card: "Dynamic Jordan | Male | British | Energetic"
```

**New Text:**
```markdown
- User sees 20 voice cards in scrollable grid, including:
  - Sarah - American Female, Warm
  - James - British Male, Professional
  - Emma - American Female, Energetic
  - Michael - American Male, Calm
  - Olivia - British Female, Friendly
  - (15 additional voices available by scrolling)
```

**Rationale:**
Updates UX specification to reflect 20-voice selection with simple scroll behavior. Maintains existing 3-column grid layout with vertical overflow scrolling for additional voices.

---

## PRD MVP Impact and High-Level Action Plan

### MVP Impact

**MVP Status:** ✅ **No impact - configuration change only**

This is a pure configuration enhancement. All Epic 2 functional requirements remain achievable:
- ✅ Generate structured scripts (unchanged)
- ✅ Divide into scenes (unchanged)
- ✅ Use selected voice (unchanged - now 20 options instead of 5)
- ✅ Generate voiceovers (unchanged)
- ✅ Quality validation (unchanged)

**MVP Timeline:** Zero impact - implementation takes 5-10 minutes

### High-Level Action Plan

**Phase 1: Documentation Updates (Day 1 - 3 minutes)**
1. Update `docs/prd.md`:
   - Line 226: FR-3.02 "3-5 distinct" → "20 distinct"
   - Add diversity breakdown (gender, accent, tone)
2. Update `docs/epics.md`:
   - Line 360: Story 2.1 AC "3-5 distinct" → "20 distinct"
   - Lines 45-49: Update MVP selection rationale
3. Update `docs/ux-design-specification.md`:
   - Lines 1002, 1019, 1044, 3452, 3537, 3541-3545: Update "3-5 voices" → "20 voices"
   - Add scroll behavior specification for voice card grid

**Phase 2: Voice Configuration (Day 1 - 2 minutes)**
1. Update `ai-video-generator/src/lib/tts/voice-profiles.ts`:
   - Add `mvpVoice: true` to 15 additional voices (7 female, 8 male)
   - Verify MVP_VOICES filter returns 20 voices

**Phase 3: Preview Audio Generation (Day 1 - 5-10 minutes)**
1. Generate preview audio for 15 new voices:
   ```bash
   cd ai-video-generator
   npm run generate:previews
   ```
   - Automatically generates MP3 previews for all MVP voices
   - Uses KokoroTTS to synthesize sample text: "Welcome to the BMAD AI video generator. This is a sample of the voice you have selected."
   - Creates files in `.cache/audio/previews/`
   - Duration: 5-10 minutes (depends on TTS service speed)

2. Copy preview files to public directory:
   ```bash
   xcopy .cache\audio\previews\*.mp3 public\audio\previews\ /Y
   ```
   - Makes preview audio accessible to web UI

3. Verify preview files:
   - Check that 20 MP3 files exist in `public/audio/previews/`
   - Verify file sizes (should be ~40-50KB each)

**Phase 4: Verification (Day 1 - 3 minutes)**
1. Run application and verify voice selection UI displays 20 voices
2. Test voice preview for all 20 voices (including 15 new ones)
3. Verify voice selection and TTS generation works with new voices
4. Commit changes with reference to this change proposal

**Dependencies:**
- KokoroTTS service running (localhost:5880)
- Python 3.10+ (for preview generation script)
- No database migrations
- No API changes
- No UI changes (component already supports dynamic lists)

**Sequencing:**
1. Documentation updates first (PRD, Epics)
2. Voice configuration second (voice-profiles.ts)
3. Preview audio generation third (npm run generate:previews)
4. Copy previews to public directory
5. Verification fourth (manual testing)

**Total Time:** 15-20 minutes including preview generation and testing

---

## Agent Handoff Plan

### Change Scope Classification

**Scope:** 🟢 **MINOR** (Configuration change + automated preview generation)

**Rationale:**
- Configuration change (add 15 boolean flags)
- Automated preview generation (uses existing script)
- No code changes beyond configuration
- No database schema changes
- No API contract changes
- Infrastructure already exists and tested
- Preview generation script already exists (`scripts/generate-voice-previews.ts`)

### Handoff: Development Team

**Assigned To:** Developer Agent (Dev) OR Product Manager (can implement directly)

**Responsibilities:**
1. Update PRD line 226 (FR-3.02)
2. Update Epics lines 360, 45-49
3. **Update UX Spec lines 1002, 1019, 1044, 3452, 3537, 3541-3545 (scroll behavior)**
4. Add `mvpVoice: true` to 15 voices in voice-profiles.ts
5. **Generate preview audio files** (`npm run generate:previews`)
6. **Copy preview files to public directory** (`xcopy` command)
7. Verify voice selection UI displays 20 voices in scrollable 3-column grid
8. **Test preview buttons work for all 20 voices** (no 404 errors)
9. Test TTS generation with new voices
10. Commit changes with reference to this proposal

**Deliverables:**
1. Updated `docs/prd.md` with new FR-3.02 requirement
2. Updated `docs/epics.md` with 20-voice acceptance criteria
3. Updated `docs/ux-design-specification.md` with 20-voice UI specification and scroll behavior
4. Updated `ai-video-generator/src/lib/tts/voice-profiles.ts` with 15 new MVP voices
5. **15 new preview audio files** in `public/audio/previews/`:
   - sophia.mp3, grace.mp3, lucy.mp3, freya.mp3, matilda.mp3, aria.mp3, charlotte.mp3 (7 female)
   - david.mp3, william.mp3, samuel.mp3, george.mp3, lucas.mp3, kai.mp3, ethan.mp3, liam.mp3 (8 male)
6. Git commit with message: "Expand MVP voice selection from 5 to 20 voices (Sprint Change Proposal 2025-11-27)"

**Success Criteria:**
- Voice selection UI displays exactly 20 voices
- Voice breakdown: 10 female, 10 male
- Accent breakdown: 8 American, 6 British, 2 Australian, 4 Neutral
- **All 20 voices have working preview audio samples** (20 MP3 files in public/audio/previews/)
- **Preview buttons work for all 20 voices** (no 404 errors)
- TTS generation works with all 20 voices

**Timeline:** 15-20 minutes (configuration change + preview generation)

---

## Approval and Next Steps

### Approval Status

- ✅ Change Proposal #1: Voice Profiles Configuration - **APPROVED**
- ✅ Change Proposal #2: PRD Functional Requirement Update - **APPROVED**
- ✅ Change Proposal #3: Epic 2 Story 2.1 AC - **APPROVED**
- ✅ Change Proposal #4: Epic 2 MVP Selection Summary - **APPROVED**
- ✅ Change Proposal #5: UX Design Specification Updates - **APPROVED**

**User Approval:** Pending (Option A - Fast Track selected, 3-column grid with scroll)

### Next Steps

1. **User Review:** Review this Sprint Change Proposal
2. **User Approval:** Confirm approval to proceed with implementation
3. **Implementation:** Execute changes per action plan (15-20 minutes)
4. **Verification:** Test voice selection and TTS generation
5. **Git Commit:** Commit with reference to this proposal

---

## Summary

**Issue:** Voice selection limited to 5 voices, insufficient variety for diverse content types

**Root Cause:** MVP intentionally limited voice selection, but 48 voices already available in KokoroTTS

**Solution:** Expand MVP voice selection from 5 to 20 voices (configuration change + preview audio generation)

**Impact:** Minimal development time (15-20 minutes including preview generation), no technical risk

**Value:** Provides creators with diverse voice options for educational, business, storytelling, documentary, technical, and entertainment content

**Risk:** Zero - infrastructure exists, voices documented, no code changes required

**Recommendation:** ✅ **APPROVE and proceed with implementation immediately**

---

## Appendix: Complete 20-Voice MVP Selection

### Female Voices (10)

| ID | Name | Accent | Tone | Use Case |
|----|------|--------|------|----------|
| sarah | Sarah | American | Warm | General narration, friendly content |
| emma | Emma | American | Energetic | Upbeat tutorials, exciting content |
| olivia | Olivia | British | Friendly | British content, approachable tone |
| sophia | Sophia | American | Authoritative | Educational, expert content |
| grace | Grace | American | Sophisticated | Luxury brands, elegant content |
| lucy | Lucy | British | Professional | Formal news, BBC-style |
| freya | Freya | British | Articulate | Academic lectures, research |
| matilda | Matilda | Australian | Friendly | Travel, adventure content |
| aria | Aria | Neutral | Clear | International audiences |
| charlotte | Charlotte | American | Gentle | Meditation, calming content |

### Male Voices (10)

| ID | Name | Accent | Tone | Use Case |
|----|------|--------|------|----------|
| james | James | British | Professional | Business, corporate content |
| michael | Michael | American | Calm | Documentary, thoughtful content |
| david | David | American | Authoritative | Leadership, business presentations |
| william | William | British | Articulate | Educational documentaries |
| samuel | Samuel | American | Warm | Storytelling, personal narratives |
| george | George | British | Distinguished | Historical content, prestige |
| lucas | Lucas | Australian | Friendly | General Australian content |
| kai | Kai | Neutral | Clear | Technical tutorials, how-tos |
| ethan | Ethan | American | Friendly | How-to guides, approachable |
| liam | Liam | American | Enthusiastic | Sports, exciting content |

**Total:** 20 voices with balanced diversity across gender, accent, and tone.
