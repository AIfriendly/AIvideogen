# Sprint Change Proposal: Enhanced Thumbnail Text Styling

**Date:** 2025-11-30
**Triggered by:** User request for improved thumbnail aesthetics
**Affected Story:** 5.4 (Automated Thumbnail Generation) - Status: Done
**Change Scope:** Minor (Implementation adjustment, no architectural changes)

---

## 1. Issue Summary

### Problem Statement
The current thumbnail generation produces **generic, single-line white text** that lacks visual impact. The user requests a more visually appealing two-line text layout with color differentiation for better thumbnail aesthetics.

### Context
- Story 5.4 was completed on 2025-11-27
- Current implementation uses a single line of centered white text with black shadow
- Font size: `min(120, 2400/title.length)`
- Text is positioned vertically centered

### Evidence
User feedback: *"The text in the thumbnail is a bit too generic. I want the text to be a little bit bigger and I want the text to be 2 lines. The text above should be white and the text below is yellow."*

---

## 2. Impact Analysis

### Epic Impact
| Epic | Impact | Details |
|------|--------|---------|
| Epic 5 | Minor | Story 5.4 already complete, requires code modification only |
| Epic 6 | None | No dependency on thumbnail styling |
| Other Epics | None | Thumbnail is final output step, no downstream impact |

### Story Impact
| Story | Impact | Action Required |
|-------|--------|-----------------|
| 5.4 | Modify | Update `addTextOverlay()` in ffmpeg.ts |
| 5.5 | None | Export UI unchanged - displays whatever thumbnail is generated |
| Other | None | No dependencies on text styling |

### Artifact Conflicts
| Artifact | Conflict | Required Update |
|----------|----------|-----------------|
| PRD | None | FR-8.03 says "legible and visually appealing" - this enhances it |
| Architecture | None | No architectural changes needed |
| UX Design | None | No UI changes, only backend thumbnail generation |
| Tech Spec Epic 5 | Minor | Update Story 5.4 implementation notes |

### Technical Impact
- **Files to Modify:** 1 file (`src/lib/video/ffmpeg.ts`)
- **Database Changes:** None
- **API Changes:** None
- **Test Updates:** Update unit tests for new text format

---

## 3. Recommended Approach

### Selected: Option 1 - Direct Adjustment

**Rationale:**
- Change is isolated to a single function (`addTextOverlay`)
- No architectural impact
- No dependencies on other stories
- Story 5.4 is already marked Done but code can be enhanced
- Low effort, low risk

### Change Details

**Current Implementation (Single Line):**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         Video Title Here            │  ← White text, centered
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Proposed Implementation (Two Lines):**
```
┌─────────────────────────────────────┐
│                                     │
│          Video Title                │  ← Line 1: WHITE (#FFFFFF)
│            Here                     │  ← Line 2: GOLD (#FFD700)
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### Technical Specifications

| Aspect | Current | Proposed |
|--------|---------|----------|
| Lines | 1 | 2 |
| Line 1 Color | White (#FFFFFF) | White (#FFFFFF) |
| Line 2 Color | N/A | Gold (#FFD700) |
| Font Size | `min(120, 2400/title.length)` | `min(150, 3000/title.length)` per line |
| Text Split | N/A | Automatic word-wrap at middle boundary |
| Shadow | 3px offset black | 3px offset black (both lines) |
| Position | Vertically centered | Both lines vertically centered as group |

### Word-Wrap Algorithm
```typescript
function splitTitleIntoTwoLines(title: string): { line1: string; line2: string } {
  const words = title.split(' ');

  if (words.length === 1) {
    // Single word: put on line 1, line 2 empty
    return { line1: title, line2: '' };
  }

  // Find middle word boundary
  const midpoint = Math.ceil(words.length / 2);
  const line1 = words.slice(0, midpoint).join(' ');
  const line2 = words.slice(midpoint).join(' ');

  return { line1, line2 };
}
```

**Examples:**
- "The Secrets of Ancient Rome" → Line 1: "The Secrets of" | Line 2: "Ancient Rome"
- "Mars Colonization" → Line 1: "Mars" | Line 2: "Colonization"
- "AI" → Line 1: "AI" | Line 2: (empty, single line only)

---

## 4. Detailed Change Proposals

### File: `src/lib/video/ffmpeg.ts`

**Method:** `addTextOverlay()`

**OLD (lines 422-488):**
```typescript
async addTextOverlay(
  inputPath: string,
  title: string,
  outputPath: string,
  width: number = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_WIDTH,
  height: number = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_HEIGHT
): Promise<void> {
  // ... current single-line implementation
  const filterComplex = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    `drawtext=${fontFile}text='${escapedTitle}':fontsize=${fontSize}:fontcolor=black:x=(w-text_w)/2+3:y=(h-text_h)/2+3`,
    `drawtext=${fontFile}text='${escapedTitle}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
  ].join(',');
  // ...
}
```

**NEW:**
```typescript
async addTextOverlay(
  inputPath: string,
  title: string,
  outputPath: string,
  width: number = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_WIDTH,
  height: number = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_HEIGHT
): Promise<void> {
  // Split title into two lines at word boundary
  const { line1, line2 } = this.splitTitleIntoTwoLines(title);

  // Escape special characters for FFmpeg
  const escapedLine1 = this.escapeTextForFFmpeg(line1);
  const escapedLine2 = this.escapeTextForFFmpeg(line2);

  // Calculate font size - larger for two-line layout (max 150px)
  const maxTitleLength = Math.max(line1.length, line2.length, 10);
  const fontSize = Math.min(150, Math.floor(3000 / maxTitleLength));

  // Line spacing (gap between lines)
  const lineSpacing = Math.floor(fontSize * 0.3);

  // Font file for Windows compatibility
  const isWindows = process.platform === 'win32';
  const fontFile = isWindows ? 'fontfile=C\\\\:/Windows/Fonts/arial.ttf:' : '';

  // Build filter with two-line text
  const filterParts = [
    // Scale and pad
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
  ];

  if (line2) {
    // Two lines: position as group centered vertically
    // Line 1 shadow (white text)
    filterParts.push(
      `drawtext=${fontFile}text='${escapedLine1}':fontsize=${fontSize}:fontcolor=black:x=(w-text_w)/2+3:y=(h/2)-(${fontSize}+${lineSpacing}/2)+3`
    );
    // Line 1 main (WHITE)
    filterParts.push(
      `drawtext=${fontFile}text='${escapedLine1}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=(h/2)-(${fontSize}+${lineSpacing}/2)`
    );
    // Line 2 shadow (gold text)
    filterParts.push(
      `drawtext=${fontFile}text='${escapedLine2}':fontsize=${fontSize}:fontcolor=black:x=(w-text_w)/2+3:y=(h/2)+(${lineSpacing}/2)+3`
    );
    // Line 2 main (GOLD #FFD700)
    filterParts.push(
      `drawtext=${fontFile}text='${escapedLine2}':fontsize=${fontSize}:fontcolor=#FFD700:x=(w-text_w)/2:y=(h/2)+(${lineSpacing}/2)`
    );
  } else {
    // Single word: just one line, white, centered
    filterParts.push(
      `drawtext=${fontFile}text='${escapedLine1}':fontsize=${fontSize}:fontcolor=black:x=(w-text_w)/2+3:y=(h-text_h)/2+3`
    );
    filterParts.push(
      `drawtext=${fontFile}text='${escapedLine1}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`
    );
  }

  const filterComplex = filterParts.join(',');
  // ... rest of method unchanged
}

/**
 * Split title into two lines at word boundary
 */
private splitTitleIntoTwoLines(title: string): { line1: string; line2: string } {
  const words = title.trim().split(/\s+/);

  if (words.length <= 1) {
    return { line1: title.trim(), line2: '' };
  }

  const midpoint = Math.ceil(words.length / 2);
  return {
    line1: words.slice(0, midpoint).join(' '),
    line2: words.slice(midpoint).join(' '),
  };
}

/**
 * Escape text for FFmpeg drawtext filter
 */
private escapeTextForFFmpeg(text: string): string {
  return text
    .replace(/\\/g, '\\\\\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\''");
}
```

**Rationale:**
- Two-line layout with white/gold color scheme provides stronger visual impact
- Larger font size (150px max vs 120px) improves readability
- Automatic word-wrap ensures balanced line lengths
- Single-word titles gracefully fall back to single-line

---

## 5. Implementation Handoff

### Change Scope Classification: **Minor**

**Can be implemented directly by development team.**

### Responsibilities

| Role | Responsibility |
|------|----------------|
| Developer | Implement code changes in `ffmpeg.ts` |
| Developer | Update unit tests for two-line format |
| Developer | Manual testing with various title lengths |
| SM (Bob) | Verify change matches user requirements |

### Implementation Tasks

1. **Update `addTextOverlay()` method** in `src/lib/video/ffmpeg.ts`
   - Add `splitTitleIntoTwoLines()` helper method
   - Add `escapeTextForFFmpeg()` helper method
   - Modify filter complex to render two lines with different colors
   - Increase font size calculation (150px max)

2. **Update Unit Tests** in `tests/unit/video/thumbnail.test.ts`
   - Test two-line split logic for various title lengths
   - Test single-word fallback
   - Test special character escaping

3. **Manual Validation**
   - Generate thumbnails with short titles (1-2 words)
   - Generate thumbnails with long titles (5+ words)
   - Verify white/gold color scheme renders correctly
   - Verify text is legible on various video backgrounds

### Success Criteria

- [ ] Two-line text layout renders correctly
- [ ] Line 1 is white (#FFFFFF)
- [ ] Line 2 is gold (#FFD700)
- [ ] Font size is larger (up to 150px)
- [ ] Single-word titles display as single white line
- [ ] Text remains legible with shadow
- [ ] Unit tests pass
- [ ] Manual review confirms improved visual appeal

---

## 6. Approval

**Status:** Awaiting User Approval

**Presented to:** master
**Date:** 2025-11-30

---

*Generated by Scrum Master (Bob) via Correct Course Workflow*
