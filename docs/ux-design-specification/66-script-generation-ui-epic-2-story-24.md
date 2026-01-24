# 6.6. Script Generation UI (Epic 2, Story 2.4)

### 6.6.1 Overview

**Purpose:** Provide visual feedback during AI script generation process, keeping users informed while script is being created.

**User Value:** Transparent loading experience with progress indication prevents user confusion and builds trust in the automation process.

**Key Features:**
- Loading screen with progress indication
- Stage-based progress messages ("Analyzing topic...", "Structuring scenes...", etc.)
- Quality check feedback (if script regeneration triggered)
- Error handling with retry mechanism
- Auto-navigation to script preview when complete

### 6.6.2 Visual Design

**Script Generation Loading Screen:**

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│            [Spinner]                │  <- Animated spinner
│                                     │
│    Generating Your Script...        │  <- Main message
│                                     │
│    Analyzing topic and structure    │  <- Stage message
│                                     │
│    ━━━━━━━━━━━━━━━━━━━━━━━━        │  <- Progress bar (optional)
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Loading Container:**
- **Position:** Full-screen modal overlay
- **Background:** `#0f172a` (Slate 900, 95% opacity) - slight transparency
- **Backdrop Blur:** 8px (modern glass effect)
- **Display:** Flex, center aligned
- **Z-Index:** 9999 (top-most layer)

**Loading Content Box:**
- **Max Width:** 500px
- **Padding:** 48px
- **Background:** `#1e293b` (Slate 800)
- **Border:** 1px solid `#334155` (Slate 700)
- **Border Radius:** 16px
- **Box Shadow:** 0 8px 24px rgba(0,0,0,0.4)
- **Text Align:** Center

**Spinner:**
- **Type:** Circular indeterminate spinner
- **Size:** 64px diameter
- **Color:** `#6366f1` (Indigo 500)
- **Animation:** Smooth rotation, 1.2s duration, infinite
- **Style:** Ring with gradient (indigo → violet)
- **Margin Bottom:** 24px (lg)

**Main Message:**
- **Text:** "Generating Your Script..."
- **Font Size:** 1.5rem (24px)
- **Font Weight:** 600 (semi-bold)
- **Color:** `#f8fafc` (Slate 50)
- **Margin Bottom:** 12px (sm)

**Stage Message:**
- **Text:** Dynamic based on generation stage
- **Font Size:** 1rem (16px)
- **Font Weight:** 400 (regular)
- **Color:** `#cbd5e1` (Slate 300)
- **Margin Bottom:** 20px (md)
- **Animation:** Fade in/out when stage changes (0.3s transition)

**Stage Messages (Cycle):**
1. "Analyzing topic and structure..." (0-30%)
2. "Crafting professional narration..." (30-60%)
3. "Structuring scenes..." (60-80%)
4. "Quality check in progress..." (80-95%)
5. "Finalizing your script..." (95-100%)

**Progress Bar (Optional Enhancement):**
- **Width:** 100% of content box
- **Height:** 4px
- **Background:** `#334155` (Slate 700)
- **Fill:** Linear gradient (`#6366f1` → `#8b5cf6`)
- **Border Radius:** 2px
- **Animation:** Smooth progress fill (indeterminate if % unknown, determinate if stages tracked)

**Quality Check Retry Message (If Applicable):**
- **Trigger:** Quality validation fails, regeneration initiated
- **Text:** "Improving script quality, regenerating..."
- **Font Size:** 0.875rem (14px)
- **Color:** `#f59e0b` (Amber 500) - warning color
- **Icon:** ⚠ icon before text
- **Margin Top:** 12px
- **Display:** Only shown when quality check triggers retry

### 6.6.3 Interaction Patterns

**Script Generation Flow:**
1. User clicks "Continue" from voice selection (Section 6.5)
2. System navigates to script generation loading screen (full-screen overlay)
3. Spinner animates, main message displays
4. Stage messages cycle through generation phases (every 3-5 seconds or based on actual progress)
5. Progress bar fills (if determinate tracking available)
6. If quality check fails → Show quality retry message, continue loading
7. Script generation completes → Auto-navigate to Script Preview UI (Section 6.7)

**No User Interaction:**
- Loading screen is informational only (no buttons, no cancellation)
- User cannot dismiss or cancel generation (process is automatic)
- Navigation happens automatically on completion

### 6.6.4 States

**Loading (Normal):**
- Spinner rotating
- Stage messages cycling
- Progress bar filling (optional)
- No errors, smooth progression

**Loading (Quality Retry):**
- Spinner continues rotating
- Stage message: "Quality check in progress..."
- Quality retry message displayed: "Improving script quality, regenerating..."
- Amber warning icon
- Progress bar may reset or continue (depends on implementation)

**Error State:**
- Spinner stops
- Error icon displayed (red circle with X)
- Main message: "Script Generation Failed"
- Stage message: Error description ("LLM connection failed" or "Max retries exceeded")
- **Retry Button** appears:
  - Style: Secondary button
  - Text: "Retry Script Generation"
  - Background: `#6366f1` (Indigo 500)
  - Action: Restarts script generation process
- **Back Button** (optional): Return to voice selection

**Success (Transition):**
- Progress bar completes (100%)
- Stage message: "Finalizing your script..."
- Success checkmark animation (optional, brief)
- Auto-navigate to Script Preview UI (Section 6.7) after 0.5s delay

---
