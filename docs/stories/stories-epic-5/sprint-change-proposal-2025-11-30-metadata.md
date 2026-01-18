# Sprint Change Proposal: AI-Generated Video Metadata

**Date:** 2025-11-30
**Requested By:** User (master)
**Change Type:** New Feature Addition
**Scope:** Minor (PRD update only)

---

## Section 1: Issue Summary

**Problem Statement:**
When a video finishes assembly and is ready for export, creators still need to manually write YouTube/TikTok metadata (title, description, tags). This creates friction in the otherwise automated end-to-end video creation workflow.

**Discovery Context:**
User request to extend the Export page functionality to include AI-generated metadata for immediate upload to video platforms.

**Evidence:**
- Current workflow ends at video download - creator must manually write metadata
- LLM infrastructure already exists and can generate optimized metadata
- Export page (Story 5.5) provides natural integration point

---

## Section 2: Impact Analysis

### Epic Impact
- **Epic 5 (Video Assembly & Output):** Requires new story (Story 5.8)
- **Other Epics:** No impact

### Artifact Impact
| Artifact | Impact | Action Required |
|----------|--------|-----------------|
| PRD | Addition | Add Feature 1.11 |
| Epics | Addition | Add Story 5.8 (Architect) |
| Architecture | Minor | Add API endpoint, DB columns (Architect) |
| UX Design | Minor | Extend Export page section (Architect) |

### Technical Impact
- Uses existing LLM provider (no new dependencies)
- Extends existing Export page UI
- Adds 3 columns to projects table

---

## Section 3: Recommended Approach

**Selected Path:** Direct Adjustment (Option 1)

**Rationale:**
1. Clean additive feature extending existing Export page
2. Leverages existing LLM infrastructure (zero new dependencies)
3. Low effort (~1-2 days implementation)
4. Low risk (isolated to Export page)
5. High user value (completes video-to-publish workflow)

**Effort Estimate:** Low
**Risk Level:** Low

---

## Section 4: Detailed Change Proposals

### PRD Change: Add Feature 1.11

**Location:** docs/prd.md, after Feature 1.10

**Content to Add:**

```markdown
### 1.11. AI-Generated Video Metadata

*   **Description:** The system automatically generates optimized title, description, and tags for the completed video, tailored for YouTube and TikTok platforms. Metadata is displayed on the Export page alongside the download options, enabling creators to copy and paste directly to their upload forms.

*   **User Stories:**
    1.  **As a creator,** I want AI-generated video titles, descriptions, and tags ready when my video is done, **so that** I can upload to YouTube/TikTok immediately without writing metadata manually.
    2.  **As a creator,** I want platform-specific metadata formats (YouTube vs TikTok), **so that** I can optimize for each platform's requirements.

*   **Functional Requirements:**
    *   **FR-11.01:** The system shall generate metadata automatically after video assembly completes.
    *   **FR-11.02:** The system shall use the video topic, script content, and scene themes as inputs for metadata generation.
    *   **FR-11.03:** The system shall generate an optimized video title (max 100 characters, engaging, keyword-rich).
    *   **FR-11.04:** The system shall generate a short description (~150 characters) with relevant hashtags.
    *   **FR-11.05:** The system shall generate 10-15 comma-separated tags optimized for discoverability.
    *   **FR-11.06:** The system shall provide YouTube-optimized and TikTok-optimized variants.
    *   **FR-11.07:** The system shall display metadata on the Export page with copy-to-clipboard functionality.
    *   **FR-11.08:** The system shall store generated metadata in the project record.

*   **Acceptance Criteria:**
    *   **AC1: Metadata Generation**
        *   **Given** a video has been assembled with topic "Russian military operations in Ukraine".
        *   **When** the Export page loads.
        *   **Then** AI-generated title, description (with hashtags), and tags are displayed.
    *   **AC2: Platform Variants**
        *   **Given** generated metadata is displayed.
        *   **When** user switches between YouTube and TikTok tabs.
        *   **Then** description format and hashtag placement adjust for each platform.
    *   **AC3: Copy Functionality**
        *   **Given** metadata is displayed on Export page.
        *   **When** user clicks copy button for title, description, or tags.
        *   **Then** the text is copied to clipboard with success feedback.
```

---

## Section 5: Implementation Handoff

**Change Scope:** Minor

**Handoff Recipients:**

| Role | Responsibility |
|------|----------------|
| **Product Manager (You)** | Update PRD with Feature 1.11 |
| **Architect** | Update Architecture (API, DB schema), Epics (Story 5.8), UX spec |
| **Development Team** | Implement Story 5.8 after Architect updates |

**Success Criteria:**
- PRD updated with Feature 1.11
- Architect creates Story 5.8 with full technical specification
- Export page displays AI-generated metadata after video assembly
- Copy-to-clipboard works for all metadata fields
- YouTube and TikTok format variants available

---

## Approval

**Status:** ✅ APPROVED

- [x] User approves this Sprint Change Proposal
- [x] PRD update executed (v2.1 → v2.2, Feature 1.11 added)
- [ ] Handoff to Architect for epics, architecture, UX updates

---

*Generated by Correct Course Workflow*
