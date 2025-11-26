# Sprint Change Proposal: Script Generation Quality Fix

**Date:** 2025-11-26
**Author:** Bob (Scrum Master)
**Workflow:** Correct Course
**Scope:** Epic 2 - Content Generation Pipeline

---

## Issue Summary

**Triggering Story:** Epic 2, Story 2.4 (LLM-Based Script Generation)

**Problem Statement:**
The LLM-based script generation system produces generic, bland, and inappropriate scripts that fail to meet user expectations. Scripts sound like AI-generated entertainment content (narrative storytelling with creative hooks) rather than purely informational content focused on facts, strategies, and structured information delivery.

**User Impact:**
- Gaming content: Scripts lack specific mechanics, strategies, boss stats, and rankings
- Historical content: Scripts missing dates, causes, timelines, and key events
- Technical content: Scripts fail to provide clear, step-by-step factual explanations
- Overall: System unusable for informational/educational content types

**Evidence:**
1. User report: "Script generation is AWFUL, generates cringe bland scripts, especially for gaming content"
2. Current system designed for YouTube entertainment style (narrative hooks, engagement tactics)
3. Quality validation enforces "strong hooks" and bans straightforward openings
4. Prompt optimized for storytelling, not factual information delivery

**When Discovered:** During user testing of gaming content script generation

---

## Impact Analysis

### Epic Impact

**Epic 2: Content Generation Pipeline**
- ✅ Can be completed with modifications
- ❌ Cannot proceed "as originally planned" - requires fundamental approach change
- **Modification Required:** Story 2.4 scope expanded to implement purely informational script style

**Other Epics:**
- No impact on Epic 1 (Chat Agent)
- No impact on Epic 3 (Visual Sourcing)
- No impact on Epic 4 (Visual Curation)
- No impact on Epic 5 (Video Assembly)

### Story Impact

**Current Stories Affected:**
- **Story 2.4:** LLM-Based Script Generation (Professional Quality) - MAJOR CHANGES REQUIRED

**Future Stories:**
- No impact on remaining Epic 2 stories (2.1-2.3, 2.5-2.6)

### Artifact Conflicts

**PRD (Product Requirements Document):**
- **Conflicts with:**
  - FR-2.05: Scripts must sound professional and engaging ❌ FAILING
  - FR-2.06: Must adapt tone based on topic type ❌ FAILING (gaming not handled)
  - FR-2.07: Must avoid AI detection markers ❌ FAILING (bland/generic output)
  - FR-2.09: Must validate and reject bland scripts ❌ NOT CATCHING ISSUES

- **Required Changes:**
  - Add FR-2.09a: Purely informational style by default
  - Add FR-2.09b: Prioritize information density over entertainment
  - Add FR-2.09c: Focus on concrete facts and structured delivery

**Architecture Document:**
- No conflicts - supports tone-based script generation

**UI/UX Specifications:**
- No conflicts - backend-only changes

**Technical Impact:**
- Prompt engineering overhaul required
- Validation logic redesign required
- No database schema changes
- No API contract changes

---

## Recommended Approach

### Selected Path: **Option 1 - Direct Adjustment (Modify Story 2.4)**

**Approach:**
1. Replace narrative-focused prompt with purely informational prompt template
2. Update quality validation to check information density (not entertainment value)
3. Update acceptance criteria to reflect scientific/factual delivery standards
4. Maintain existing technical architecture (LLM → parse → validate → save)

**Justification:**
- **Implementation Effort:** Medium (2-3 days) - isolated to prompt engineering
- **Technical Risk:** Low - same architecture, content changes only
- **Impact on Timeline:** Minimal - isolated to Epic 2
- **Long-Term Sustainability:** High - sets foundation for future persona system (PRD 2.6)
- **Business Value:** Critical - makes app usable for gaming, historical, technical content

**Why Not Rollback:**
Nothing to roll back - system built for narrative style from start.

**Why Not MVP Review:**
This isn't scope bloat - it's a quality requirement correction.

---

## Detailed Change Proposals

### Change #1: Story 2.4 Acceptance Criteria

**File:** `docs/epics.md`
**Section:** Epic 2, Story 2.4 (lines 459-475)

**Changes:**
- ❌ Remove: "Scripts sound professional and human-written, NOT AI-generated"
- ❌ Remove: "Scripts avoid generic AI phrases"
- ❌ Remove: "Scripts use topic-appropriate tone (documentary, educational, conversational)"
- ❌ Remove: "Scripts have strong narrative hooks (no boring openings)"
- ✅ Add: "Scripts use scientific, factual delivery style with information-dense content"
- ✅ Add: "Scripts focus on facts, data, strategies, and structured information delivery"
- ✅ Add: "Scripts use straightforward language (direct explanations preferred)"
- ✅ Add: Gaming/Historical/Technical content specific requirements

**Rationale:**
Shifts quality standard from "narrative storytelling" to "purely informational" delivery.

---

### Change #2: Script Generation Prompt Template

**File:** `ai-video-generator/src/lib/llm/prompts/script-generation-prompt.ts`
**Function:** `generateScriptPrompt()` (lines 92-242)

**Changes:**

**Section 1: CRITICAL QUALITY REQUIREMENTS**
- ❌ Remove: "PROFESSIONAL WRITING STANDARDS" (narrative focus)
- ❌ Remove: "NARRATIVE EXCELLENCE" (entertainment focus)
- ❌ Remove: "ABSOLUTELY FORBIDDEN PHRASES" (conflicts with informational style)
- ✅ Add: "SCIENTIFIC & FACTUAL DELIVERY" guidelines
- ✅ Add: "TOPIC-SPECIFIC REQUIREMENTS" (Gaming/Historical/Technical)
- ✅ Add: "ACCEPTABLE PHRASES" for scientific style

**Key Changes:**
```
OLD: "Start with a STRONG HOOK that creates immediate intrigue"
NEW: "Use straightforward language - no creative hooks or narrative gimmicks"

OLD: "Avoid generic questions (NO 'Have you ever wondered...')"
NEW: "Direct statements without hooks are ENCOURAGED"

OLD: "Build curiosity gaps that compel continued watching"
NEW: "Present information logically and systematically"
```

**Rationale:**
Complete replacement of narrative-focused requirements with scientific/factual style optimized for gaming, historical, and technical topics.

---

### Change #3: Script Quality Validation Logic

**File:** `ai-video-generator/src/lib/llm/validate-script-quality.ts`
**Function:** `validateScriptQuality()` (lines 70-272)

**Changes:**

**Validations to REMOVE:**
- ❌ Validation 3: Check for banned AI phrases (not applicable)
- ❌ Validation 4: Check for generic AI openings (direct statements encouraged)
- ❌ Validation 6: Check narrative flow (not a story)
- ❌ Validation 7: Check for robotic patterns (formal tone acceptable)

**Validations to ADD:**
- ✅ Validation 3: Check information density (concrete facts, numbers, names)
- ✅ Validation 4: Check for filler language (subjective adjectives, hedging)
- ✅ Validation 5: Check for vagueness (generic statements without specifics)

**New Helper Functions:**
1. `checkInformationDensity()` - Counts factual elements (numbers, dates, names, stats)
2. `checkForFiller()` - Detects entertainment/subjective language
3. `checkForVagueness()` - Identifies non-specific statements

**Rationale:**
Removes narrative/engagement validation, adds scientific validation for information density and factual content.

---

### Change #4: Script Generation System Prompt

**File:** `ai-video-generator/src/lib/llm/prompts/script-generation-prompt.ts`
**Constant:** `SCRIPT_GENERATION_SYSTEM_PROMPT` (lines 365-386)

**Changes:**

**OLD Core Identity:**
```
"You are a professional scriptwriter specializing in engaging video content.
Your scripts are known for their human quality, creativity, and ability to
captivate audiences."
```

**NEW Core Identity:**
```
"You are a technical information specialist creating purely informational
video scripts. Your scripts deliver maximum factual content with zero
entertainment filler. Every word must carry information value."
```

**Added Sections:**
- CORE PRINCIPLES: Pure information delivery, no entertainment
- TOPIC EXPERTISE: Gaming/Historical/Technical specific requirements
- OUTPUT REQUIREMENTS: Information density, factual accuracy, zero filler

**Rationale:**
Establishes "pure information delivery" as foundational principle. Removes all entertainment/engagement language.

---

### Change #5: Example Scripts (Few-Shot Learning)

**File:** `ai-video-generator/src/lib/llm/prompts/script-generation-prompt.ts`
**Constants:** `EXAMPLE_GOOD_SCRIPT` and `EXAMPLE_BAD_SCRIPT` (lines 37-83)

**Changes:**

**OLD Example Topic:** "Why octopuses are incredibly intelligent" (narrative storytelling)

**NEW Example Topic:** "Dark Souls: Ornstein and Smough Boss Analysis" (gaming informational)

**GOOD Script Example:**
- Straightforward facts: boss names, attack types, weaknesses, strategies
- Informational delivery: mechanics, phase changes, level recommendations
- No filler: No "legendary", "epic", "amazing"
- Balanced: Information without overwhelming data dump

**BAD Script Example:**
- Demonstrates filler words: "obviously", "incredibly", "basically", "kind of"
- Shows vague advice: "stay patient", "keep practicing"
- Highlights subjective adjectives without data

**Rationale:**
Provides clear template for LLM showing information vs data distinction. Demonstrates expected style for gaming content (user's primary use case).

---

### Change #6: PRD Functional Requirements

**File:** `docs/prd.md`
**Section:** Feature 1.2 - Automated Script Generation (lines 126-169)

**Changes:**

Add after FR-2.08 (line 144):

```markdown
*   **FR-2.09a:** The system must generate scripts in purely informational
    style by default (scientific/factual delivery)
*   **FR-2.09b:** Scripts must prioritize information density over
    entertainment value
*   **FR-2.09c:** Scripts must focus on concrete facts, strategies, and
    structured information delivery
```

**Rationale:**
Documents "purely informational" as explicit product requirement. Clarifies expected default behavior for script generation.

---

## PRD MVP Impact and High-Level Action Plan

### MVP Impact

**MVP Status:** ✅ **Achievable with fixes**

This is a quality issue, not a scope issue. All Epic 2 functional requirements remain achievable:
- ✅ Generate structured scripts (unchanged)
- ✅ Divide into scenes (unchanged)
- ✅ Use selected voice (unchanged)
- ✅ Generate voiceovers (unchanged)
- ✅ Quality validation (improved approach)

**MVP Timeline:** Minimal impact - 2-3 day delay for Story 2.4 rework

### High-Level Action Plan

**Phase 1: Prompt Engineering (Day 1)**
1. Update `script-generation-prompt.ts`:
   - Replace narrative prompt with informational template
   - Update example scripts (good/bad)
   - Update system prompt
2. Test with sample topics:
   - Gaming: "Dark Souls boss ranking"
   - Historical: "Collapse of USSR timeline"
   - Technical: "How quantum computing works"

**Phase 2: Validation Update (Day 2)**
1. Update `validate-script-quality.ts`:
   - Remove narrative validations
   - Add information density checks
   - Add filler detection
   - Add vagueness detection
2. Update unit tests to reflect new validation rules

**Phase 3: Documentation & Testing (Day 3)**
1. ✅ Update `docs/epics.md` (Story 2.4 acceptance criteria) - DONE by SM during correct-course
2. ✅ Update `docs/prd.md` (add FR-2.09a, b, c) - DONE by SM during correct-course
3. ✅ Update `docs/tech-spec-epic-2.md` (informational requirements) - DONE by SM during correct-course
4. ✅ Update `docs/stories/stories-epic-2/story-2.4.md` (correct-course update) - DONE by SM during correct-course
5. Integration testing with full pipeline
6. Manual quality review of generated scripts

**Dependencies:**
- No external dependencies
- No database migrations
- No API changes
- No UI changes

**Sequencing:**
1. Prompt changes first (Day 1)
2. Validation changes second (Day 2)
3. Documentation last (Day 3)

---

## Agent Handoff Plan

### Change Scope Classification

**Scope:** 🟡 **Minor** (Direct implementation by development team)

**Rationale:**
- Isolated to Epic 2, Story 2.4
- No architectural changes
- No database schema changes
- No API contract changes
- Prompt engineering and validation logic only

### Handoff: Development Team

**Assigned To:** Developer Agent (Dev)

**Responsibilities:**
1. Implement all 6 approved change proposals
2. Update prompt templates and validation logic
3. Test script generation with gaming, historical, technical topics
4. Update documentation (epics.md, prd.md)
5. Verify quality improvements with manual review

**Deliverables:**
1. Updated `script-generation-prompt.ts` with informational prompt
2. Updated `validate-script-quality.ts` with information density validation
3. Updated `docs/epics.md` with revised Story 2.4 acceptance criteria
4. Updated `docs/prd.md` with FR-2.09a, b, c
5. Updated `docs/tech-spec-epic-2.md` with informational requirements
6. Updated `docs/stories/stories-epic-2/story-2.4.md` with correct-course update
7. Test results showing improved script quality for target content types

**Success Criteria:**
- Gaming scripts focus on mechanics, strategies, stats
- Historical scripts include dates, causes, timelines
- Technical scripts provide clear step-by-step explanations
- No filler language or vague statements in generated scripts
- Quality validation correctly rejects non-informational scripts

**Timeline:** 2-3 days (Story 2.4 rework)

---

## Approval and Next Steps

### Approval Status

- ✅ Change Proposal #1: Story 2.4 Acceptance Criteria - **APPROVED**
- ✅ Change Proposal #2: Script Generation Prompt Template - **APPROVED**
- ✅ Change Proposal #3: Script Quality Validation Logic - **APPROVED**
- ✅ Change Proposal #4: Script Generation System Prompt - **APPROVED**
- ✅ Change Proposal #5: Example Scripts - **APPROVED**
- ✅ Change Proposal #6: PRD Functional Requirements - **APPROVED**

**User Approval:** Pending

### Next Steps

1. **User Review:** Review this Sprint Change Proposal
2. **User Approval:** Confirm approval to proceed with implementation
3. **Handoff to Dev:** Assign Story 2.4 rework to Developer agent
4. **Implementation:** Execute changes per action plan (2-3 days)
5. **Testing:** Validate script quality improvements
6. **Sprint Status Update:** Mark Story 2.4 as "In Progress" → "Complete"

---

## Summary

**Issue:** Script generation produces narrative entertainment content instead of purely informational content

**Root Cause:** Prompt engineered for YouTube storytelling, not factual information delivery

**Solution:** Replace narrative-focused prompt and validation with purely informational approach

**Impact:** Epic 2 Story 2.4 rework (2-3 days), no other stories affected

**Value:** Makes system usable for gaming, historical, technical content - critical for user success

**Risk:** Low - isolated changes, same architecture

**Recommendation:** ✅ **APPROVE and proceed with implementation**
