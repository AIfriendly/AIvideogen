# Test Design: Story 2.5 - Voiceover Generation for Scenes

**Story**: Story 2.5 - Voiceover Generation for Scenes
**Epic**: Epic 2 - Script to Audio Pipeline
**Test Designer**: TEA Agent (Master Test Architect)
**Date**: 2025-11-08
**Version**: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Risk Assessment](#risk-assessment)
3. [Test Prioritization Framework](#test-prioritization-framework)
4. [Test Level Strategy](#test-level-strategy)
5. [Test Coverage Mapping](#test-coverage-mapping)
6. [Test Scenarios](#test-scenarios)
7. [Quality Gates](#quality-gates)
8. [Appendix](#appendix)

---

## Overview

### Story Summary

Story 2.5 implements voiceover generation for video scenes using TTS (Text-to-Speech) technology. The feature accepts project IDs, sanitizes scene text (removing markdown, stage directions, scene labels), generates MP3 audio files for each scene, updates the database with audio paths and durations, and tracks progress through a callback mechanism.

### Acceptance Criteria

| ID   | Acceptance Criterion                                                                 | Risk Level |
| ---- | ------------------------------------------------------------------------------------ | ---------- |
| AC1  | Endpoint accepts projectId and validates prerequisites (script_generated, voice_id) | High       |
| AC2  | Text sanitization removes markdown, stage directions, scene labels                   | Critical   |
| AC3  | Generated audio contains only clean, speakable text                                  | Critical   |
| AC4  | TTS generates MP3 file for each scene using selected voice                           | Critical   |
| AC5  | Audio files saved to `.cache/audio/projects/{projectId}/scene-{N}.mp3`              | High       |
| AC6  | Scene records updated with audio_file_path and duration                              | Critical   |
| AC7  | Progress indicator shows current scene being processed                               | Medium     |
| AC8  | Partial failures allow resume from first incomplete scene                            | High       |
| AC9  | Total duration calculated as sum of all scene durations                              | High       |
| AC10 | Workflow step advances from 'voiceover' to 'visual-sourcing'                         | Critical   |

### Testing Objectives

1. **Functional Correctness**: Verify all acceptance criteria are met
2. **Reliability**: Ensure voiceover generation is deterministic and repeatable
3. **Error Handling**: Validate prerequisite checks and graceful failure handling
4. **Data Integrity**: Confirm database updates are accurate and consistent
5. **Recovery**: Verify partial completion resume capability
6. **Performance**: Ensure acceptable generation time for typical projects

---

## Risk Assessment

### Risk Categories

| Category                | Description                                          | Impact if Failed |
| ----------------------- | ---------------------------------------------------- | ---------------- |
| Data Corruption         | Incorrect database updates, orphaned files           | Critical         |
| Audio Quality           | Poor TTS output, incorrect text sanitization         | Critical         |
| State Management        | Workflow progression issues, resume failures         | High             |
| Resource Management     | File system errors, disk space issues                | High             |
| Performance             | Slow generation, timeout issues                      | Medium           |
| User Experience         | Confusing error messages, missing progress feedback  | Medium           |

### Probability and Impact Matrix

**Probability Scale**:
- **High (H)**: >50% chance of occurrence
- **Medium (M)**: 20-50% chance of occurrence
- **Low (L)**: <20% chance of occurrence

**Impact Scale**:
- **Critical (C)**: System unusable, data loss, security breach
- **High (H)**: Major feature broken, workaround difficult
- **Medium (M)**: Minor feature broken, workaround available
- **Low (L)**: Cosmetic issue, no functional impact

| Risk                                      | Probability | Impact   | Risk Score | Mitigation Strategy                    | Priority |
| ----------------------------------------- | ----------- | -------- | ---------- | -------------------------------------- | -------- |
| Text sanitization fails (markdown leaked) | M           | Critical | **HIGH**   | Comprehensive unit tests, validation   | P0       |
| TTS generation fails for scene            | M           | High     | **HIGH**   | Error handling, retry logic            | P0       |
| Database update fails mid-generation      | L           | Critical | **MEDIUM** | Transaction handling, rollback         | P1       |
| Audio files created but DB not updated    | M           | High     | **HIGH**   | Atomic operations, cleanup on failure  | P0       |
| Resume fails after partial completion     | M           | High     | **HIGH**   | Idempotent operations, state tracking  | P1       |
| Wrong voice used for scenes               | L           | High     | **MEDIUM** | Voice ID validation, consistency check | P0       |
| File path conflicts (concurrent projects) | L           | Medium   | **LOW**    | Unique project directories             | P2       |
| Progress callback not triggered           | M           | Medium   | **LOW**    | Progress tracking tests                | P2       |
| Workflow step not updated                 | L           | High     | **MEDIUM** | Workflow validation tests              | P0       |
| Empty text causes TTS failure             | H           | Medium   | **MEDIUM** | Input validation, error handling       | P1       |
| Very long text causes timeout             | M           | Medium   | **MEDIUM** | Length validation, chunking strategy   | P2       |
| Special characters break TTS              | M           | Medium   | **MEDIUM** | Character sanitization tests           | P1       |
| Disk space exhausted                      | L           | High     | **MEDIUM** | Disk space checks, cleanup             | P2       |
| Invalid project ID passed                 | H           | Low      | **LOW**    | Input validation                       | P0       |
| Script not generated prerequisite         | H           | Medium   | **MEDIUM** | Prerequisite validation                | P0       |
| Voice not selected prerequisite           | H           | Medium   | **MEDIUM** | Prerequisite validation                | P0       |

### Risk Score Calculation

**Risk Score** = Probability × Impact

**Priority Mapping**:
- **P0 (Critical)**: HIGH risk score OR Critical impact
- **P1 (High)**: MEDIUM-HIGH risk score OR High impact
- **P2 (Medium)**: MEDIUM risk score OR Medium impact
- **P3 (Low)**: LOW risk score AND Low impact

---

## Test Prioritization Framework

### P0 - Critical (Must Run on Every Commit)

**Criteria**: Core happy path, critical failures, data integrity

| Test ID       | Test Scenario                                   | Rationale                                  |
| ------------- | ----------------------------------------------- | ------------------------------------------ |
| 2.5-UNIT-018  | Handle realistic script text                    | Core sanitization functionality            |
| 2.5-INT-001   | Pass validation when prerequisites met         | Critical path prerequisite check           |
| 2.5-INT-002   | Throw SCRIPT_NOT_GENERATED error                | Critical prerequisite validation           |
| 2.5-INT-003   | Throw VOICE_NOT_SELECTED error                  | Critical prerequisite validation           |
| 2.5-INT-010   | Remove markdown from generated audio            | Core text sanitization integration         |
| 2.5-INT-012   | Update scene records with paths and durations   | Critical database integrity                |
| 2.5-INT-013   | Update project total duration                   | Critical data accuracy                     |
| 2.5-INT-014   | Update workflow step to visual-sourcing         | Critical workflow progression              |
| 2.5-INT-016   | Save audio files with correct naming            | Critical file system operations            |
| 2.5-INT-021   | Use same voice for all scenes                   | Critical voice consistency                 |
| 2.5-API-001   | Return 200 with success response                | Core API contract                          |
| 2.5-API-002   | Return 404 when project not found               | Critical error handling                    |
| 2.5-API-003   | Return 400 when script not generated            | Critical prerequisite validation           |
| 2.5-API-004   | Return 400 when voice not selected              | Critical prerequisite validation           |
| 2.5-API-006   | Update database with audio paths and durations  | Critical database integrity                |
| 2.5-API-007   | Update project workflow step                    | Critical workflow progression              |

**Total P0 Tests**: 16
**Run Frequency**: Every commit
**Max Duration**: 30 seconds

---

### P1 - High (Must Run on Every PR)

**Criteria**: Error handling, important features, edge cases with high impact

| Test ID       | Test Scenario                                   | Rationale                                  |
| ------------- | ----------------------------------------------- | ------------------------------------------ |
| 2.5-UNIT-001  | Remove bold markdown formatting                 | Core markdown sanitization                 |
| 2.5-UNIT-002  | Remove italic markdown formatting               | Core markdown sanitization                 |
| 2.5-UNIT-003  | Remove underline markdown formatting            | Core markdown sanitization                 |
| 2.5-UNIT-004  | Remove code markdown formatting                 | Core markdown sanitization                 |
| 2.5-UNIT-005  | Remove strikethrough markdown formatting        | Core markdown sanitization                 |
| 2.5-UNIT-006  | Remove markdown headers                         | Core markdown sanitization                 |
| 2.5-UNIT-007  | Handle nested markdown formatting               | Important edge case                        |
| 2.5-UNIT-008  | Remove "Scene X:" labels                        | Core scene label sanitization              |
| 2.5-UNIT-009  | Remove "Title:" labels                          | Core title label sanitization              |
| 2.5-UNIT-010  | Handle multiple scene labels in text            | Important sanitization feature             |
| 2.5-UNIT-011  | Remove stage directions in square brackets      | Core stage direction sanitization          |
| 2.5-UNIT-013  | Handle multiple stage directions                | Important sanitization feature             |
| 2.5-UNIT-014  | Collapse multiple spaces to single space        | Core whitespace handling                   |
| 2.5-UNIT-015  | Collapse multiple newlines to single space      | Core whitespace handling                   |
| 2.5-UNIT-017  | Trim leading and trailing whitespace            | Core whitespace handling                   |
| 2.5-UNIT-020  | Preserve punctuation and special characters     | Important data preservation                |
| 2.5-UNIT-022  | Validate clean text as valid                    | Core validation feature                    |
| 2.5-UNIT-023  | Detect asterisk markdown                        | Important validation feature               |
| 2.5-UNIT-024  | Detect hash symbols                             | Important validation feature               |
| 2.5-UNIT-025  | Detect underscore markdown                      | Important validation feature               |
| 2.5-UNIT-026  | Detect scene labels                             | Important validation feature               |
| 2.5-UNIT-027  | Detect multiple issues                          | Important validation feature               |
| 2.5-UNIT-028  | Have pre-sanitized preview text constant        | Important preview feature                  |
| 2.5-UNIT-029  | Have valid preview text                         | Important preview validation               |
| 2.5-UNIT-030  | Not change preview text when sanitized          | Important preview consistency              |
| 2.5-INT-004   | Generate correct audio file path                | Important path generation                  |
| 2.5-INT-006   | Return false when scene has no audio path       | Important completion detection             |
| 2.5-INT-007   | Return false when audio file doesn't exist      | Important completion detection             |
| 2.5-INT-008   | Call progress callback for each scene           | Important progress tracking                |
| 2.5-INT-015   | Create audio directory if not exists            | Important file system setup                |
| 2.5-INT-017   | Skip scenes that already have audio             | Important resume capability                |
| 2.5-INT-018   | Resume from first incomplete scene              | Important resume capability                |
| 2.5-INT-019   | Throw error when no scenes exist                | Important error handling                   |
| 2.5-INT-022   | Return accurate summary of results              | Important result reporting                 |
| 2.5-API-005   | Return 400 when no scenes exist                 | Important error handling                   |
| 2.5-API-008   | Include generation summary in response          | Important result reporting                 |
| 2.5-API-011   | Return audio files with correct structure       | Important API contract                     |
| 2.5-API-012   | Return standard error format on failure         | Important error contract                   |

**Total P1 Tests**: 38
**Run Frequency**: Every PR
**Max Duration**: 2 minutes

---

### P2 - Medium (Run Nightly or Weekly)

**Criteria**: Extended edge cases, nice-to-have validations, performance tests

| Test ID       | Test Scenario                                   | Rationale                                  |
| ------------- | ----------------------------------------------- | ------------------------------------------ |
| 2.5-UNIT-012  | Handle nested brackets                          | Edge case validation                       |
| 2.5-UNIT-016  | Handle tabs and mixed whitespace                | Edge case validation                       |
| 2.5-UNIT-019  | Handle empty or whitespace-only input           | Edge case validation                       |
| 2.5-UNIT-021  | Handle unicode and international characters     | Extended character support                 |
| 2.5-UNIT-031  | Handle very long text                           | Performance and edge case                  |
| 2.5-UNIT-032  | Handle text with only markdown                  | Edge case validation                       |
| 2.5-UNIT-033  | Handle text with only stage directions          | Edge case validation                       |
| 2.5-UNIT-034  | Be idempotent (same result applied twice)       | Extended validation                        |
| 2.5-UNIT-035  | Handle null or undefined gracefully             | Extended error handling                    |
| 2.5-INT-005   | Handle different scene numbers                  | Extended path generation                   |
| 2.5-INT-009   | Track scene numbers correctly                   | Extended progress tracking                 |
| 2.5-INT-011   | Handle scenes with only formatting              | Extended sanitization edge case            |
| 2.5-INT-020   | Return error summary for failed scenes          | Extended error reporting                   |
| 2.5-API-009   | Return idle status when no generation           | Extended progress API                      |
| 2.5-API-010   | Return progress data structure                  | Extended progress API validation           |
| 2.5-API-013   | Return correct error codes for each type        | Extended error contract validation         |

**Total P2 Tests**: 16
**Run Frequency**: Nightly or weekly
**Max Duration**: 5 minutes

---

### P3 - Low (Run on Demand or Monthly)

**Criteria**: Nice-to-have, cosmetic, exploratory

*Note: No P3 tests defined for this story as all tests have functional importance.*

**Total P3 Tests**: 0

---

## Test Level Strategy

### Test Pyramid Distribution

```
        /\
       /E2E\         0 tests (0%)
      /------\
     /  API   \      13 tests (19%)
    /----------\
   /Integration\     22 tests (31%)
  /--------------\
 /     Unit       \  35 tests (50%)
/------------------\
```

**Rationale**: Unit-heavy pyramid ensures fast feedback and isolation. No E2E tests needed as voiceover generation is a backend service with API exposure.

### Test Level Decisions

| Level       | Count | Purpose                                     | Coverage                          |
| ----------- | ----- | ------------------------------------------- | --------------------------------- |
| Unit        | 35    | Text sanitization logic, validation         | AC2, AC3 (sanitization)           |
| Integration | 22    | End-to-end voiceover workflow, DB updates   | AC1, AC4, AC5, AC6, AC7, AC8, AC9 |
| API         | 13    | HTTP endpoint contract, error handling      | AC1, AC6, AC10 (API layer)        |
| E2E         | 0     | Not applicable for backend service          | N/A                               |

### Why No E2E Tests?

**Rationale**:
1. **Backend Service**: Voiceover generation is triggered via API, not UI
2. **Integration Coverage**: Integration tests cover full workflow (API → DB → File System)
3. **Cost/Benefit**: E2E tests would duplicate integration test coverage without additional value
4. **Recommendation**: Add E2E tests in Epic 3 when UI triggers voiceover generation

---

## Test Coverage Mapping

### Acceptance Criteria to Test Mapping

| AC   | Description                               | Unit Tests         | Integration Tests | API Tests         | Total | Coverage |
| ---- | ----------------------------------------- | ------------------ | ----------------- | ----------------- | ----- | -------- |
| AC1  | Endpoint validates prerequisites          | -                  | 001-003           | 001-005           | 8     | ✅ 100%  |
| AC2  | Text sanitization removes markdown        | 001-021            | 010               | -                 | 22    | ✅ 100%  |
| AC3  | Generated audio contains clean text       | 022-030            | 010               | -                 | 10    | ✅ 100%  |
| AC4  | TTS generates MP3 for each scene          | -                  | 010, 016, 021     | 001, 006          | 5     | ✅ 100%  |
| AC5  | Audio files saved with naming convention  | -                  | 004-005, 015-016  | -                 | 4     | ✅ 100%  |
| AC6  | Scene records updated with path/duration  | -                  | 012               | 006               | 2     | ✅ 100%  |
| AC7  | Progress indicator shows current scene    | -                  | 008-009           | 008               | 3     | ✅ 100%  |
| AC8  | Partial failures allow resume             | -                  | 006-007, 017-020  | -                 | 6     | ✅ 100%  |
| AC9  | Total duration calculated correctly       | -                  | 013               | -                 | 1     | ✅ 100%  |
| AC10 | Workflow step advances                    | -                  | 014               | 007               | 2     | ✅ 100%  |

**Total Coverage**: **100%** (all ACs have corresponding tests)

---

## Test Scenarios

### 1. Text Sanitization Scenarios (Unit)

#### Scenario Group: Markdown Formatting Removal
- **Test IDs**: 2.5-UNIT-001 through 2.5-UNIT-007
- **Priority**: P1 (Core sanitization)
- **Coverage**: AC2
- **Risk Mitigated**: Audio quality degradation from spoken markdown

| Test ID       | Scenario                             | Input Example                           | Expected Output                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-UNIT-001  | Remove bold markdown                 | `**Bold text**`                         | `Bold text`                           |
| 2.5-UNIT-002  | Remove italic markdown               | `*Italic* or _Italic_`                  | `Italic or Italic`                    |
| 2.5-UNIT-003  | Remove underline markdown            | `__Underlined__`                        | `Underlined`                          |
| 2.5-UNIT-004  | Remove code markdown                 | `` `code` ``                            | `code`                                |
| 2.5-UNIT-005  | Remove strikethrough                 | `~~Strikethrough~~`                     | `Strikethrough`                       |
| 2.5-UNIT-006  | Remove headers                       | `# Header 1`                            | `Header 1`                            |
| 2.5-UNIT-007  | Handle nested markdown               | `**Bold with *italic* inside**`         | `Bold with italic inside`             |

#### Scenario Group: Scene Label Removal
- **Test IDs**: 2.5-UNIT-008 through 2.5-UNIT-010
- **Priority**: P1 (Core sanitization)
- **Coverage**: AC2
- **Risk Mitigated**: Awkward narration from spoken labels

| Test ID       | Scenario                             | Input Example                           | Expected Output                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-UNIT-008  | Remove "Scene X:" labels             | `Scene 1: The beginning`                | `The beginning`                       |
| 2.5-UNIT-009  | Remove "Title:" labels               | `Title: My Story`                       | `My Story`                            |
| 2.5-UNIT-010  | Handle multiple scene labels         | `Scene 1: First\nScene 2: Second`       | `First Second`                        |

#### Scenario Group: Stage Direction Removal
- **Test IDs**: 2.5-UNIT-011 through 2.5-UNIT-013
- **Priority**: P1 (Core sanitization)
- **Coverage**: AC2
- **Risk Mitigated**: Spoken stage directions in narration

| Test ID       | Scenario                             | Input Example                           | Expected Output                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-UNIT-011  | Remove stage directions              | `He walked [slowly] to door`            | `He walked to door`                   |
| 2.5-UNIT-012  | Handle nested brackets               | `Actor [turns [smiling]] speaks`        | `Actor speaks`                        |
| 2.5-UNIT-013  | Handle multiple stage directions     | `[Enter] Hello [waves] there [exits]`   | `Hello there`                         |

#### Scenario Group: Whitespace Handling
- **Test IDs**: 2.5-UNIT-014 through 2.5-UNIT-017
- **Priority**: P1 (Core sanitization)
- **Coverage**: AC2
- **Risk Mitigated**: Awkward pauses from extra whitespace

| Test ID       | Scenario                             | Input Example                           | Expected Output                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-UNIT-014  | Collapse multiple spaces             | `Text  with   spaces`                   | `Text with spaces`                    |
| 2.5-UNIT-015  | Collapse multiple newlines           | `First\n\n\nSecond`                     | `First Second`                        |
| 2.5-UNIT-016  | Handle tabs and mixed whitespace     | `Text\twith\t\ttabs`                    | `Text with tabs`                      |
| 2.5-UNIT-017  | Trim leading/trailing whitespace     | `  Trimmed text  `                      | `Trimmed text`                        |

#### Scenario Group: Complex Scenarios
- **Test IDs**: 2.5-UNIT-018 through 2.5-UNIT-021
- **Priority**: P0 (realistic), P1 (preservation), P2 (unicode)
- **Coverage**: AC2, AC3
- **Risk Mitigated**: Real-world script handling

| Test ID       | Scenario                             | Input Example                           | Expected Output                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-UNIT-018  | Handle realistic script text         | `# Scene 1\n**Narrator:** [clears] Hi`  | `Scene 1 Narrator: Hi`                |
| 2.5-UNIT-019  | Handle empty input                   | ``, `   `, `\n\n\n`                     | `` (empty string)                     |
| 2.5-UNIT-020  | Preserve punctuation                 | `Hello! How are you? I'm fine.`         | `Hello! How are you? I'm fine.`       |
| 2.5-UNIT-021  | Handle unicode characters            | `Hello 你好 مرحبا`                      | `Hello 你好 مرحبا`                    |

#### Scenario Group: Validation Function
- **Test IDs**: 2.5-UNIT-022 through 2.5-UNIT-027
- **Priority**: P1 (Validation)
- **Coverage**: AC3
- **Risk Mitigated**: Incomplete sanitization detection

| Test ID       | Scenario                             | Input                                   | Expected Result                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-UNIT-022  | Validate clean text                  | `Clean text for TTS`                    | `{ valid: true, issues: [] }`         |
| 2.5-UNIT-023  | Detect asterisk markdown             | `Text with *asterisk*`                  | `{ valid: false, issues: [...] }`     |
| 2.5-UNIT-024  | Detect hash symbols                  | `# Header`                              | `{ valid: false, issues: [...] }`     |
| 2.5-UNIT-025  | Detect underscore markdown           | `Text with _underscore_`                | `{ valid: false, issues: [...] }`     |
| 2.5-UNIT-026  | Detect scene labels                  | `Scene 1: Beginning`                    | `{ valid: false, issues: [...] }`     |
| 2.5-UNIT-027  | Detect multiple issues               | `# Scene 1: **Bold** _italic_`          | `{ valid: false, issues: [4+] }`      |

#### Scenario Group: Preview Text
- **Test IDs**: 2.5-UNIT-028 through 2.5-UNIT-030
- **Priority**: P1 (Preview functionality)
- **Coverage**: AC3
- **Risk Mitigated**: Invalid preview text

| Test ID       | Scenario                             | Validation                              | Expected Result                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-UNIT-028  | Preview text constant exists         | `PREVIEW_TEXT` defined                  | String, non-empty                     |
| 2.5-UNIT-029  | Preview text passes validation       | `validateSanitization(PREVIEW_TEXT)`    | `{ valid: true }`                     |
| 2.5-UNIT-030  | Preview text is pre-sanitized        | `sanitizeForTTS(PREVIEW_TEXT)`          | Unchanged                             |

#### Scenario Group: Edge Cases
- **Test IDs**: 2.5-UNIT-031 through 2.5-UNIT-035
- **Priority**: P2 (Extended validation)
- **Coverage**: AC2, AC3
- **Risk Mitigated**: Boundary conditions, error handling

| Test ID       | Scenario                             | Input Example                           | Expected Behavior                     |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-UNIT-031  | Handle very long text                | 5000+ character string                  | Sanitize without error                |
| 2.5-UNIT-032  | Handle text with only markdown       | `**********`                            | Return empty string                   |
| 2.5-UNIT-033  | Handle only stage directions         | `[Enter] [Exit] [Pause]`                | Return empty string                   |
| 2.5-UNIT-034  | Idempotent sanitization              | Apply sanitization twice                | Same result both times                |
| 2.5-UNIT-035  | Handle null/undefined                | `null`, `undefined`                     | Return empty string, no error         |

---

### 2. Voiceover Generation Scenarios (Integration)

#### Scenario Group: Prerequisite Validation
- **Test IDs**: 2.5-INT-001 through 2.5-INT-003
- **Priority**: P0 (Critical path)
- **Coverage**: AC1
- **Risk Mitigated**: Invalid state causing generation failures

| Test ID       | Scenario                             | Setup                                   | Expected Result                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-001   | Pass validation (happy path)         | `script_generated=true, voice_id=sarah` | Validation passes                     |
| 2.5-INT-002   | Fail: script not generated           | `script_generated=false`                | Throw `SCRIPT_NOT_GENERATED`          |
| 2.5-INT-003   | Fail: voice not selected             | `voice_id=null`                         | Throw `VOICE_NOT_SELECTED`            |

#### Scenario Group: Audio File Path Generation
- **Test IDs**: 2.5-INT-004 through 2.5-INT-005
- **Priority**: P1 (Important path generation)
- **Coverage**: AC5
- **Risk Mitigated**: Incorrect file paths, conflicts

| Test ID       | Scenario                             | Input                                   | Expected Path                         |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-004   | Generate correct path                | `projectId=abc, sceneNumber=1`          | `.cache/audio/projects/abc/scene-1.mp3` |
| 2.5-INT-005   | Handle different scene numbers       | Scene 1, Scene 99                       | `scene-1.mp3`, `scene-99.mp3`         |

#### Scenario Group: Completed Audio Detection
- **Test IDs**: 2.5-INT-006 through 2.5-INT-007
- **Priority**: P1 (Resume capability)
- **Coverage**: AC8
- **Risk Mitigated**: Re-processing completed scenes

| Test ID       | Scenario                             | Setup                                   | Expected Result                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-006   | No audio file path                   | Scene without `audio_file_path`         | Return `false`                        |
| 2.5-INT-007   | Path exists but file doesn't         | `audio_file_path` set, file missing     | Return `false`                        |

#### Scenario Group: Progress Tracking
- **Test IDs**: 2.5-INT-008 through 2.5-INT-009
- **Priority**: P1 (P2 for extended tracking)
- **Coverage**: AC7
- **Risk Mitigated**: Missing progress feedback

| Test ID       | Scenario                             | Setup                                   | Expected Behavior                     |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-008   | Call progress callback               | 3 scenes, callback function             | Callback called 3+ times              |
| 2.5-INT-009   | Track scene numbers                  | Scenes 1, 2, 3                          | Callback receives 1, 2, 3             |

#### Scenario Group: Text Sanitization Integration
- **Test IDs**: 2.5-INT-010 through 2.5-INT-011
- **Priority**: P0 (Core), P2 (Edge case)
- **Coverage**: AC2, AC3
- **Risk Mitigated**: Unsanitized text in audio

| Test ID       | Scenario                             | Setup                                   | Expected Result                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-010   | Remove markdown from audio           | Scenes with markdown formatting         | Audio generated, scenes updated       |
| 2.5-INT-011   | Handle only formatting               | Scene with `**[Stage]**`                | Graceful handling (skip or fail)      |

#### Scenario Group: Database Updates
- **Test IDs**: 2.5-INT-012 through 2.5-INT-014
- **Priority**: P0 (Critical data integrity)
- **Coverage**: AC6, AC9, AC10
- **Risk Mitigated**: Data corruption, workflow issues

| Test ID       | Scenario                             | Setup                                   | Expected Updates                      |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-012   | Update scene records                 | 3 scenes                                | All scenes have `audio_file_path`, `duration` |
| 2.5-INT-013   | Update project total duration        | Multiple scenes with durations          | `total_duration` = sum of scenes      |
| 2.5-INT-014   | Update workflow step                 | `current_step='voiceover'`              | `current_step='visual-sourcing'`      |

#### Scenario Group: File System Operations
- **Test IDs**: 2.5-INT-015 through 2.5-INT-016
- **Priority**: P1 (setup), P0 (naming)
- **Coverage**: AC5
- **Risk Mitigated**: File system errors

| Test ID       | Scenario                             | Setup                                   | Expected Behavior                     |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-015   | Create audio directory               | Directory doesn't exist                 | Directory created automatically       |
| 2.5-INT-016   | Save with naming convention          | 3 scenes                                | Files: `scene-1.mp3`, `scene-2.mp3`, `scene-3.mp3` |

#### Scenario Group: Partial Completion Recovery
- **Test IDs**: 2.5-INT-017 through 2.5-INT-018
- **Priority**: P1 (Resume capability)
- **Coverage**: AC8
- **Risk Mitigated**: Re-processing, data duplication

| Test ID       | Scenario                             | Setup                                   | Expected Behavior                     |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-017   | Skip completed scenes                | All scenes already have audio           | `skipped=3, completed=0`              |
| 2.5-INT-018   | Resume from incomplete               | Scenes 1-2 done, add scene 3            | `skipped=2, completed=1`              |

#### Scenario Group: Error Handling
- **Test IDs**: 2.5-INT-019 through 2.5-INT-020
- **Priority**: P1 (P2 for extended)
- **Coverage**: AC1
- **Risk Mitigated**: Unhandled errors, poor error messages

| Test ID       | Scenario                             | Setup                                   | Expected Behavior                     |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-019   | No scenes exist                      | Project with 0 scenes                   | Throw `NO_SCENES_FOUND`               |
| 2.5-INT-020   | Failed scenes                        | Scene with empty text                   | Error summary includes failures       |

#### Scenario Group: Voice Consistency
- **Test IDs**: 2.5-INT-021
- **Priority**: P0 (Critical consistency)
- **Coverage**: AC4
- **Risk Mitigated**: Inconsistent voices across scenes

| Test ID       | Scenario                             | Setup                                   | Expected Behavior                     |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-021   | Same voice for all scenes            | `voice_id='sarah'`, 3 scenes            | All scenes use 'sarah', `voice_id` unchanged |

#### Scenario Group: Generation Summary
- **Test IDs**: 2.5-INT-022
- **Priority**: P1 (Result reporting)
- **Coverage**: Multiple ACs
- **Risk Mitigated**: Inaccurate reporting

| Test ID       | Scenario                             | Setup                                   | Expected Result                       |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-INT-022   | Accurate summary                     | 3 scenes                                | `{ completed, skipped, failed, totalDuration }` accurate |

---

### 3. API Endpoint Scenarios

#### Scenario Group: Success Cases
- **Test IDs**: 2.5-API-001
- **Priority**: P0 (Core API contract)
- **Coverage**: AC1, AC4, AC6, AC10
- **Risk Mitigated**: API contract violations

| Test ID       | Scenario                             | Request                                 | Expected Response                     |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-API-001   | Success response                     | POST with valid project ID              | `200`, `{ success: true, data: {...} }` |

#### Scenario Group: Error Cases
- **Test IDs**: 2.5-API-002 through 2.5-API-005
- **Priority**: P0 (P1 for no scenes)
- **Coverage**: AC1
- **Risk Mitigated**: Poor error handling, unclear errors

| Test ID       | Scenario                             | Request                                 | Expected Response                     |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-API-002   | Project not found                    | POST with invalid project ID            | `404`, `{ code: 'PROJECT_NOT_FOUND' }` |
| 2.5-API-003   | Script not generated                 | POST, `script_generated=false`          | `400`, `{ code: 'SCRIPT_NOT_GENERATED' }` |
| 2.5-API-004   | Voice not selected                   | POST, `voice_id=null`                   | `400`, `{ code: 'VOICE_NOT_SELECTED' }` |
| 2.5-API-005   | No scenes exist                      | POST, project with 0 scenes             | `400`, `{ code: 'NO_SCENES_FOUND' }`  |

#### Scenario Group: Database Updates via API
- **Test IDs**: 2.5-API-006 through 2.5-API-007
- **Priority**: P0 (Critical data integrity)
- **Coverage**: AC6, AC10
- **Risk Mitigated**: Incomplete database updates

| Test ID       | Scenario                             | Request                                 | Expected Side Effects                 |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-API-006   | Update database                      | POST with valid request                 | Scenes updated with paths/durations   |
| 2.5-API-007   | Update workflow step                 | POST with valid request                 | `current_step='visual-sourcing'`      |

#### Scenario Group: Response Format
- **Test IDs**: 2.5-API-008
- **Priority**: P1 (API contract)
- **Coverage**: Multiple ACs
- **Risk Mitigated**: Incomplete response data

| Test ID       | Scenario                             | Request                                 | Expected Response Fields              |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-API-008   | Include summary                      | POST with valid request                 | `summary: { completed, skipped, failed }` |

#### Scenario Group: Progress API
- **Test IDs**: 2.5-API-009 through 2.5-API-010
- **Priority**: P2 (Extended API)
- **Coverage**: AC7
- **Risk Mitigated**: Missing progress endpoint

| Test ID       | Scenario                             | Request                                 | Expected Response                     |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-API-009   | Idle status                          | GET progress, no active generation      | `200`, `{ status: 'idle', progress: 0 }` |
| 2.5-API-010   | Progress data structure              | GET progress                            | Fields: `status, currentScene, totalScenes, progress` |

#### Scenario Group: Response Validation
- **Test IDs**: 2.5-API-011 through 2.5-API-012
- **Priority**: P1 (API contract)
- **Coverage**: Multiple ACs
- **Risk Mitigated**: Inconsistent API responses

| Test ID       | Scenario                             | Request                                 | Expected Structure                    |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-API-011   | Audio files structure                | POST with valid request                 | `audioFiles[]: { sceneNumber, audioPath, duration }` |
| 2.5-API-012   | Error format                         | POST with invalid request               | `{ success: false, error, code }`     |

#### Scenario Group: Error Code Coverage
- **Test IDs**: 2.5-API-013
- **Priority**: P2 (Extended validation)
- **Coverage**: AC1
- **Risk Mitigated**: Inconsistent error codes

| Test ID       | Scenario                             | Test Coverage                           | Expected Codes                        |
| ------------- | ------------------------------------ | --------------------------------------- | ------------------------------------- |
| 2.5-API-013   | All error codes                      | Multiple error scenarios                | Correct code for each error type      |

---

## Quality Gates

### Definition of Done - Testing Perspective

#### Must Have (Blocking)
- [ ] All P0 tests passing (16 tests)
- [ ] All P1 tests passing (38 tests)
- [ ] 100% acceptance criteria coverage (10/10 ACs)
- [ ] No critical violations in test quality review
- [ ] All tests have IDs and priority markers
- [ ] Test execution time <3 minutes for all tests

#### Should Have (Non-Blocking)
- [ ] All P2 tests passing (16 tests)
- [ ] Test quality score >90/100
- [ ] BDD structure (Given-When-Then) in all tests
- [ ] No flakiness patterns detected
- [ ] Test documentation complete

#### Nice to Have
- [ ] Performance benchmarks established
- [ ] Load testing for concurrent projects
- [ ] Burn-in tests (10 iterations) passing

### Quality Gate Decision Matrix

| Gate               | P0 Pass Rate | P1 Pass Rate | P2 Pass Rate | AC Coverage | Decision     |
| ------------------ | ------------ | ------------ | ------------ | ----------- | ------------ |
| **Approve**        | 100%         | ≥95%         | ≥80%         | 100%        | ✅ Merge     |
| **Approve (Minor)** | 100%         | ≥90%         | ≥70%         | 100%        | ⚠️ Merge + Issue |
| **Request Changes** | 100%         | <90%         | Any          | 100%        | ❌ Block     |
| **Block**          | <100%        | Any          | Any          | <100%       | 🛑 Critical  |

### Current Status

| Metric              | Target       | Actual       | Status      |
| ------------------- | ------------ | ------------ | ----------- |
| P0 Pass Rate        | 100%         | 100%         | ✅ Pass     |
| P1 Pass Rate        | ≥95%         | 100%         | ✅ Pass     |
| P2 Pass Rate        | ≥80%         | 100%         | ✅ Pass     |
| AC Coverage         | 100%         | 100%         | ✅ Pass     |
| Test Quality Score  | >90/100      | 97/100       | ✅ Pass     |
| Test IDs            | 100%         | 100%         | ✅ Pass     |
| Priority Markers    | 100%         | 100%         | ✅ Pass     |

**Decision**: **Approve for Merge** ✅

---

## Appendix

### A. Test Execution Time Benchmarks

| Test Suite         | Tests | Estimated Time | Max Acceptable |
| ------------------ | ----- | -------------- | -------------- |
| Unit (sanitize)    | 35    | 5-10 seconds   | 30 seconds     |
| Integration        | 22    | 60-90 seconds  | 2 minutes      |
| API                | 13    | 30-45 seconds  | 1 minute       |
| **Total**          | **70**| **2-3 minutes**| **5 minutes**  |

### B. Test Data Requirements

| Data Type          | Source                | Notes                              |
| ------------------ | --------------------- | ---------------------------------- |
| Project records    | Test factory          | Created in `beforeEach`            |
| Scene records      | Test factory          | 2-3 scenes per test                |
| Voice profiles     | Static configuration  | 'sarah', 'john', etc.              |
| Audio files        | TTS generation        | Cleaned up in `afterEach`          |
| Text samples       | Inline test data      | Markdown, labels, stage directions |

### C. Test Environment Requirements

| Requirement        | Details                                      |
| ------------------ | -------------------------------------------- |
| Node.js            | v18+                                         |
| Test Framework     | Vitest (integration/API), Jest (unit)        |
| Database           | SQLite (in-memory for tests)                 |
| TTS Engine         | Kokoro v1.0 ONNX                             |
| File System        | `.cache/audio/projects/` directory writable  |
| Disk Space         | 100MB minimum for test audio files           |

### D. Flakiness Prevention Strategy

**Sources of Flakiness**:
1. **File System Race Conditions**: Mitigated by unique project IDs
2. **Database Locks**: Mitigated by in-memory SQLite for tests
3. **TTS Engine Timeouts**: Mitigated by short text samples in tests
4. **Async Timing**: Mitigated by deterministic waits (no hard sleeps)

**Prevention Measures**:
- ✅ No hard waits (sleep, waitForTimeout)
- ✅ Proper cleanup in `afterEach`
- ✅ No shared state between tests
- ✅ Deterministic test data (no random values)
- ✅ Idempotent operations (safe to re-run)

### E. Knowledge Base References

This test design was informed by:
- **[test-quality.md](../BMAD-METHOD/bmad/bmm/testarch/knowledge/test-quality.md)** - Definition of Done, test limits
- **[test-priorities.md](../BMAD-METHOD/bmad/bmm/testarch/knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 framework
- **[test-levels-framework.md](../BMAD-METHOD/bmad/bmm/testarch/knowledge/test-levels-framework.md)** - Unit/Integration/E2E decisions
- **[risk-governance.md](../BMAD-METHOD/bmad/bmm/testarch/knowledge/risk-governance.md)** - Risk scoring matrix
- **[fixture-architecture.md](../BMAD-METHOD/bmad/bmm/testarch/knowledge/fixture-architecture.md)** - Test setup patterns
- **[data-factories.md](../BMAD-METHOD/bmad/bmm/testarch/knowledge/data-factories.md)** - Test data generation

### F. Traceability Matrix

**Story → AC → Tests**:

```
Story 2.5: Voiceover Generation
├── AC1: Prerequisite Validation
│   ├── 2.5-INT-001 [P0]
│   ├── 2.5-INT-002 [P0]
│   ├── 2.5-INT-003 [P0]
│   ├── 2.5-API-001 [P0]
│   ├── 2.5-API-002 [P0]
│   ├── 2.5-API-003 [P0]
│   ├── 2.5-API-004 [P0]
│   └── 2.5-API-005 [P1]
├── AC2: Text Sanitization
│   ├── 2.5-UNIT-001 to 2.5-UNIT-021 [P0/P1]
│   └── 2.5-INT-010 [P0]
├── AC3: Clean Audio
│   ├── 2.5-UNIT-022 to 2.5-UNIT-030 [P1]
│   └── 2.5-INT-010 [P0]
├── AC4: TTS Generation
│   ├── 2.5-INT-010 [P0]
│   ├── 2.5-INT-016 [P0]
│   ├── 2.5-INT-021 [P0]
│   ├── 2.5-API-001 [P0]
│   └── 2.5-API-006 [P0]
├── AC5: File Storage
│   ├── 2.5-INT-004 [P1]
│   ├── 2.5-INT-005 [P2]
│   ├── 2.5-INT-015 [P1]
│   └── 2.5-INT-016 [P0]
├── AC6: Scene Updates
│   ├── 2.5-INT-012 [P0]
│   ├── 2.5-API-001 [P0]
│   └── 2.5-API-006 [P0]
├── AC7: Progress Tracking
│   ├── 2.5-INT-008 [P1]
│   ├── 2.5-INT-009 [P2]
│   ├── 2.5-API-008 [P1]
│   ├── 2.5-API-009 [P2]
│   └── 2.5-API-010 [P2]
├── AC8: Partial Resume
│   ├── 2.5-INT-006 [P1]
│   ├── 2.5-INT-007 [P1]
│   ├── 2.5-INT-017 [P1]
│   ├── 2.5-INT-018 [P1]
│   ├── 2.5-INT-019 [P1]
│   └── 2.5-INT-020 [P2]
├── AC9: Total Duration
│   └── 2.5-INT-013 [P0]
└── AC10: Workflow Advancement
    ├── 2.5-INT-014 [P0]
    ├── 2.5-API-001 [P0]
    └── 2.5-API-007 [P0]
```

---

## Document Metadata

**Author**: Murat (TEA Agent - Master Test Architect)
**Reviewed By**: [Pending]
**Approved By**: [Pending]
**Version History**:
- v1.0 (2025-11-08): Initial test design with risk assessment
- v1.1 (TBD): Post-implementation updates

**References**:
- Story 2.5: [story-2.5.md](story-2.5.md)
- Story Context: [story-context-2.5.xml](story-context-2.5.xml)
- Test Review: [test-review.md](test-review.md)
- Complete Report: [complete-story-report-2.5.md](complete-story-report-2.5.md)

---

**END OF DOCUMENT**
