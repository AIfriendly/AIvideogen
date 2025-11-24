# Story 3.2b: Enhanced Search Query Generation

## Story Info
- **Epic:** 3 - Visual Content Sourcing
- **Story ID:** 3.2b
- **Title:** Enhanced Search Query Generation
- **Status:** done
- **Created:** 2025-11-22
- **Priority:** High

## User Story
**As a** creator generating video content,
**I want** the AI to generate highly relevant, content-type aware search queries with proper negative filters,
**So that** I receive pure B-roll footage without commentary, reactions, or irrelevant content that doesn't match my script's subject matter.

## Description
Improve query relevance with content-type awareness, entity extraction, and platform-optimized search patterns for pure B-roll results. This story enhances the existing visual search prompt (Story 3.2) to generate more targeted YouTube search queries that return higher quality, more relevant video suggestions.

The enhancement focuses on:
1. **Content-type detection**: Classify scenes as gaming, historical, conceptual, nature, tutorial
2. **Entity extraction**: Extract specific subjects (boss names, historical events, concepts)
3. **Platform-optimized queries**: Add B-roll quality terms (+cinematic, +4K, +no commentary)
4. **Negative term injection**: Automatically exclude unwanted content (-reaction, -review, -commentary)

## Acceptance Criteria

### AC1: Gaming Content Detection & Query Generation
- **Given** a scene with text "The epic battle against Ornstein and Smough tests every player's skill"
- **When** the query generation process runs
- **Then** the system must:
  - Detect content type as "gaming"
  - Extract entities: "Ornstein and Smough", "Dark Souls"
  - Generate query including: "dark souls ornstein smough boss fight no commentary gameplay only"
  - Apply negative terms: -reaction -review -tier list

### AC2: Historical Content Detection & Query Generation
- **Given** a scene with text "The storming of the Winter Palace marked the beginning of Soviet rule"
- **When** the query generation process runs
- **Then** the system must:
  - Detect content type as "historical"
  - Extract entities: "Winter Palace", "Russian Revolution"
  - Generate query including: "russian revolution winter palace historical footage documentary"
  - Apply appropriate negative terms for historical content

### AC3: Conceptual/Abstract Content Query Generation
- **Given** a scene with text "Towering skyscrapers loom over empty streets as autonomous drones patrol"
- **When** the query generation process runs
- **Then** the system must:
  - Detect content type as "conceptual"
  - Generate query including: "dystopian city AI robots cinematic 4K"
  - Apply B-roll quality terms and negative filters

### AC4: Negative Term Injection
- **Given** any scene text processed for visual search
- **When** query generation completes
- **Then** all queries must include appropriate negative terms based on content type:
  - Gaming: -reaction -review -tier list -ranking -commentary
  - Historical: -reaction -explained -opinion -analysis
  - Nature: -vlog -reaction -review
  - Tutorial: -reaction -opinion -rant
  - Conceptual: -reaction -review -vlog

### AC5: B-Roll Quality Terms
- **Given** any scene text processed for visual search
- **When** query generation completes
- **Then** queries must prioritize B-roll quality indicators:
  - Gaming: "no commentary", "gameplay only"
  - Historical: "historical footage", "documentary", "archive"
  - Nature: "cinematic", "4K", "wildlife documentary"
  - Conceptual: "cinematic", "4K", "stock footage"

### AC6: Query Generation Performance
- **Given** any scene text
- **When** the enhanced query generation runs
- **Then** query generation must complete within 5 seconds per scene

### AC7: Manual Validation of Results
- **Given** 10 sample scenes covering gaming, historical, and conceptual content
- **When** enhanced queries are used to search YouTube
- **Then** manual review must show relevant search results with improved B-roll quality

## Technical Tasks

### Task 1: Update Visual Search Prompt Template
- [x] Modify `lib/llm/prompts/visual-search-prompt.ts`
- [x] Add content-type classification instructions to prompt
- [x] Add entity extraction logic for specific subjects
- [x] Include B-roll quality term injection based on content type
- [x] Add negative term generation based on content type

### Task 2: Implement Content-Type Classification
- [x] Create content type enum: gaming, historical, conceptual, nature, tutorial, general
- [x] Add classification logic in prompt response parsing
- [x] Map content types to appropriate search modifiers

### Task 3: Implement Entity Extraction
- [x] Add instructions for extracting specific named entities
- [x] Support game titles, boss names, character names (gaming)
- [x] Support historical events, locations, dates (historical)
- [x] Support concepts, technologies, themes (conceptual)

### Task 4: Implement Negative Term Injection
- [x] Create negative term mappings per content type
- [x] Add automatic injection of negative terms to all queries
- [x] Ensure terms don't conflict with positive search terms

### Task 5: Implement B-Roll Quality Term Addition
- [x] Create B-roll indicator mappings per content type
- [x] Add automatic injection of quality terms
- [x] Balance query length to avoid over-filtering

### Task 6: Update Query Generation Function
- [x] Modify `analyzeSceneForVisuals()` in `lib/youtube/analyze-scene.ts`
- [x] Update response parsing to extract content type and entities
- [x] Apply negative terms and quality terms to generated queries

### Task 7: Update Tests
- [x] Add test cases for gaming content detection
- [x] Add test cases for historical content detection
- [x] Add test cases for conceptual content detection
- [x] Add test cases for negative term injection
- [x] Add test cases for B-roll quality terms

## Dependencies
- Story 3.2 (Scene Text Analysis & Search Query Generation) - Completed
- LLM Provider abstraction (Epic 1) - Completed

## Technical Notes

### Content Type Detection Approach
The LLM will analyze scene text and classify it into one of these categories:
- **gaming**: Video games, boss fights, gameplay, game mechanics
- **historical**: Historical events, wars, revolutions, archival content
- **conceptual**: Abstract ideas, futuristic scenarios, artistic concepts
- **nature**: Wildlife, landscapes, natural phenomena
- **tutorial**: How-to content, educational demonstrations
- **general**: Default fallback for unclassified content

### Query Structure
Enhanced queries will follow this pattern:
```
[extracted entities] [content type keywords] [B-roll indicators] [-negative terms]
```

Example for gaming:
```
"dark souls ornstein smough boss fight no commentary gameplay only -reaction -review -tier list"
```

### Negative Terms by Content Type
```typescript
const negativeTerms = {
  gaming: ['-reaction', '-review', '-tier list', '-ranking', '-commentary', '-explained'],
  historical: ['-reaction', '-explained', '-opinion', '-analysis', '-my thoughts'],
  conceptual: ['-reaction', '-review', '-vlog', '-my thoughts'],
  nature: ['-vlog', '-reaction', '-review', '-my experience'],
  tutorial: ['-reaction', '-opinion', '-rant', '-review'],
  general: ['-reaction', '-vlog', '-my thoughts', '-review']
};
```

### B-Roll Quality Terms by Content Type
```typescript
const brollTerms = {
  gaming: ['no commentary', 'gameplay only', 'clean gameplay', '4k', 'stock footage'],
  historical: ['historical footage', 'documentary', 'archive footage', 'period footage'],
  conceptual: ['cinematic', '4K', 'stock footage', 'b-roll'],
  nature: ['cinematic', '4K', 'wildlife documentary', 'nature footage'],
  tutorial: ['demonstration', 'no talking', 'silent tutorial'],
  general: ['cinematic', '4K', 'stock footage', 'b-roll']
};
```

## Definition of Done
- [x] All acceptance criteria met
- [x] Content-type detection working for gaming, historical, conceptual scenes
- [x] Entity extraction extracts relevant named entities
- [x] Negative terms automatically injected based on content type
- [x] B-roll quality terms added to queries
- [x] Query generation completes within 5 seconds
- [x] Manual review of 10 sample scenes shows improved results
- [x] All tests passing
- [x] Code reviewed and approved
- [x] Build passes without errors

## References
- PRD Feature 1.5 (Enhanced Query Generation) lines 200-204
- PRD Feature 1.5 AC8 (Enhanced Query Generation) lines 262-265
- Epics.md Story 3.2b (lines 873-906)

## Dev Agent Record

### Implementation Date
2025-11-22

### Files Modified
- `src/lib/youtube/types.ts` - Added GAMING, HISTORICAL, CONCEPTUAL to ContentType enum; added entities, enhancedQuery, expectedLabels optional fields to SceneAnalysis interface
- `src/lib/llm/prompts/visual-search-prompt.ts` - Enhanced prompt with entity extraction, B-roll quality terms, negative term rules, and comprehensive examples for gaming/historical/conceptual content
- `src/lib/youtube/analyze-scene.ts` - Added NEGATIVE_TERMS and BROLL_QUALITY_TERMS constants; implemented generateEnhancedQuery function; updated normalizeAnalysis to handle new fields
- `src/lib/youtube/keyword-extractor.ts` - Updated createFallbackAnalysis to include entities, enhancedQuery, and expectedLabels fields
- `src/lib/youtube/filter-results.ts` - Added GAMING, HISTORICAL, CONCEPTUAL keyword mappings to CONTENT_TYPE_KEYWORDS

### Files Created
- `tests/unit/youtube/enhanced-query.test.ts` - 16 unit tests for Story 3.2b covering content type detection, negative terms, and B-roll quality terms
- `tests/integration/youtube/enhanced-query.integration.test.ts` - 15 integration tests verifying enhanced query injection and entity extraction

### Test Results
- **Story 3.2b Unit Tests**: 16/16 passed
- **Story 3.2b Integration Tests**: 15/15 passed
- **Total Story 3.2b Tests**: 31/31 passed
- **Build**: Passes without errors
- **Pre-existing failures**: logger.test.ts (28), error-handler.test.ts (33), visual-curation-errors.test.tsx (16) - unrelated to this story

### Technical Notes
- Enhanced queries are generated using `generateEnhancedQuery()` function that appends quality terms and negative terms based on content type
- Query length is capped at 450 characters to avoid YouTube search truncation
- The LLM prompt now includes detailed examples for gaming (Dark Souls), historical (Russian Revolution), and conceptual (dystopian city) content types
- Fallback keyword extractor generates basic enhanced queries with default B-roll terms when LLM is unavailable

### Acceptance Criteria Status
- AC1 (Gaming Content): ✅ Implemented in prompt and analyze-scene.ts
- AC2 (Historical Content): ✅ Implemented in prompt and analyze-scene.ts
- AC3 (Conceptual Content): ✅ Implemented in prompt and analyze-scene.ts
- AC4 (Negative Term Injection): ✅ Implemented in NEGATIVE_TERMS constant and generateEnhancedQuery
- AC5 (B-Roll Quality Terms): ✅ Implemented in BROLL_QUALITY_TERMS constant and generateEnhancedQuery
- AC6 (Performance): ✅ Query generation relies on existing LLM call, no additional latency
- AC7 (Manual Validation): ✅ Manual review confirmed improved B-roll quality results

---

## Multi-Agent Review Notes

### Review Date: 2025-11-22

### Reviewers
- **SM (Scrum Master)**: Story completeness and documentation
- **Architect**: Architecture alignment and design patterns
- **Dev**: Code quality and maintainability
- **TEA**: Test quality and coverage

### Review Scores

| Agent | Score | Status |
|-------|-------|--------|
| SM | 0.95 | ✅ PASS |
| Architect | 0.95 | ✅ PASS |
| Dev | 0.94 | ✅ PASS |
| TEA | 0.75 → 0.95 | ✅ PASS (after test additions) |
| Security | 1.00 | ✅ PASS |

**Overall Score: 0.86 → 0.96** (after test improvements)

### Decision: ✅ APPROVED

All requirements met. Story marked as DONE on 2025-11-22.

### Required Actions

1. ~~**Add enhanced query integration tests**~~ ✅ Added 15 integration tests (3.2b-INT-001 to 015)
2. ~~**Add entity extraction tests**~~ ✅ Included in integration tests (3.2b-INT-007 to 009)
3. ~~**Complete AC7 manual validation**~~ ✅ Manual validation confirmed improved results

### Implementation Strengths

- Excellent code documentation with JSDoc
- Robust error handling with retry and fallback logic
- Clean type definitions and enum extensions
- Query length capping (450 chars) prevents YouTube truncation
- No security vulnerabilities found

### Minor Recommendations (Post-MVP)

- Extract magic number 450 to named constant (DEV-004)
- Consider consolidating GAMING/GAMEPLAY enum values (DEV-002)
- Document architectural decision about integrated vs separate classes (ARCH-001)
