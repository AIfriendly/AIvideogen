# 6.8. Visual Sourcing Loading UI (Epic 3, Story 3.5)

### 6.8.1 Overview

**Purpose:** Provide visual feedback during video sourcing process (YouTube API and browser-based providers), keeping users informed while video clips are being searched, retrieved, and filtered for each scene.

**User Value:** Transparent loading experience with scene-by-scene progress indication prevents user confusion during the 10-30 second sourcing delay and builds trust in the automation.

**Supported Provider Types:**
- **API-Based Providers (YouTube):** Fast, reliable, 2-5 seconds per scene
- **Browser-Based Providers (DVIDS, NASA - Feature 2.9):** Slower, requires browser startup, 5-10 seconds per scene

**Key Features:**
- Loading screen with scene-by-scene progress indication (e.g., "Analyzing scene 2 of 5...")
- Stage-based progress messages per scene (provider-specific: "Searching YouTube..." vs "Rendering page...")
- Provider type indicators to set timing expectations
- Error handling for API failures (quota exceeded, network error, no results)
- Browser-specific error handling (browser not installed, stealth detection, render timeout)
- Auto-navigation to Visual Curation UI when complete
- Retry mechanism for failed scenes
- Partial completion support (proceed with some scenes if others fail)

### 6.8.2 Visual Design

**Visual Sourcing Loading Screen:**

Similar to Section 6.6 (Script Generation Loading), but with scene-by-scene progress tracking:

```
┌─────────────────────────────────────┐
│                                     │
│            [Spinner]                │  <- Animated spinner
│                                     │
│    Sourcing Video Clips...          │  <- Main message
│                                     │
│    Analyzing scene 2 of 5           │  <- Scene counter
│    Searching YouTube for clips...   │  <- Stage message
│                                     │
│    ━━━━━━━━━━⬜⬜⬜⬜⬜⬜⬜⬜⬜        │  <- Progress bar (40% = 2/5)
│                                     │
│    Scene 1: ✓ 6 clips found        │  <- Scene status list
│    Scene 2: ⏳ Searching...         │
│    Scene 3: ⏸ Pending               │
│    Scene 4: ⏸ Pending               │
│    Scene 5: ⏸ Pending               │
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
- **Max Width:** 600px
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
- **Text:** "Sourcing Video Clips..."
- **Font Size:** 1.5rem (24px)
- **Font Weight:** 600 (semi-bold)
- **Color:** `#f8fafc` (Slate 50)
- **Margin Bottom:** 12px (sm)

**Provider Badge (Optional Enhancement for Feature 2.9):**
- **Position:** Below main message, above scene counter
- **Style:** Small inline badge with provider name and type
- **Padding:** 4px 12px
- **Border Radius:** 12px (pill shape)
- **Font Size:** 0.75rem (12px)
- **Font Weight:** 500 (medium)
- **Margin Bottom:** 8px

**Badge Colors by Provider:**
- **YouTube (API-based):** Background `#ef4444` (Red 500), Color: White, Text: "via YouTube"
- **DVIDS (Browser-based):** Background `#4d5c3e` (Olive/Drab), Color: White, Text: "via DVIDS (Browser)"
- **NASA (Browser-based):** Background `#1e3a8a` (Blue 900), Color: White, Text: "via NASA (Browser)"

**Badge Purpose:**
- Help users understand which provider is being used
- Explain why loading times vary (API vs Browser)
- Set expectations for slower browser-based providers
- Allow users to identify provider-specific issues

**Scene Counter:**
- **Text:** "Analyzing scene X of Y" (e.g., "Analyzing scene 2 of 5")
- **Font Size:** 1rem (16px)
- **Font Weight:** 500 (medium)
- **Color:** `#cbd5e1` (Slate 300)
- **Margin Bottom:** 8px

**Stage Message:**
- **Text:** Dynamic based on sourcing stage
- **Font Size:** 0.875rem (14px)
- **Font Weight:** 400 (regular)
- **Color:** `#94a3b8` (Slate 400)
- **Margin Bottom:** 20px (md)
- **Animation:** Fade in/out when stage changes (0.3s transition)

**Stage Messages (Per Scene Cycle):**

**API-Based Providers (YouTube):**
1. "Analyzing scene text..." (5-10% per scene)
2. "Generating search queries..." (10-20%)
3. "Searching YouTube for clips..." (20-60%)
4. "Filtering and ranking results..." (60-90%)
5. "Found X clips" (90-100%)

**Browser-Based Providers (DVIDS, NASA - Feature 2.9):**
1. "Starting browser..." (0-10%, first scene only) - Playwright browser launch
2. "Rendering page..." (10-30%) - Waiting for JavaScript execution
3. "Intercepting video URLs..." (30-60%) - Capturing streaming URLs
4. "Extracting video metadata..." (60-90%) - Parsing rendered HTML
5. "Found X clips" (90-100%)

**Progress Bar:**
- **Width:** 100% of content box
- **Height:** 6px
- **Background:** `#334155` (Slate 700)
- **Fill:** Linear gradient (`#6366f1` → `#8b5cf6`)
- **Border Radius:** 3px
- **Animation:** Smooth progress fill based on completed scenes (e.g., 2/5 = 40%)
- **Margin Bottom:** 24px (lg)

**Scene Status List:**
- **Display:** Flex column, left-aligned within content box
- **Gap:** 8px (sm) between status items
- **Max Height:** 200px (scrollable if many scenes)
- **Margin Top:** 24px (lg)
- **Padding:** 16px
- **Background:** `#0f172a` (Slate 900)
- **Border Radius:** 8px

**Scene Status Item:**
- **Format:** "Scene N: [Icon] [Status]"
- **Font Size:** 0.875rem (14px)
- **Line Height:** 1.6
- **Display:** Flex row, align-items center

**Status Icons and Colors:**
- **✓ Complete (Emerald):** `#10b981` - "6 clips found"
- **⏳ In Progress (Indigo):** `#6366f1` - "Searching..." (animated pulse)
- **⏸ Pending (Gray):** `#64748b` - "Pending"
- **⚠ Error (Amber):** `#f59e0b` - "Retrying with broader search..."
- **✗ Failed (Red):** `#ef4444` - "Failed - Retry available"

**Quality Retry Message (If Applicable):**
- **Trigger:** No results found for scene, automatic retry with relaxed filters
- **Text:** "No results found - Trying broader search criteria"
- **Font Size:** 0.875rem (14px)
- **Color:** `#f59e0b` (Amber 500) - warning color
- **Icon:** ⚠ icon before text
- **Display:** Below scene status list when retry triggered

### 6.8.3 Interaction Patterns

**Normal Sourcing Flow:**
1. User clicks "Continue to Visual Sourcing" from Script Preview (Section 6.7)
2. System navigates to Visual Sourcing loading screen (full-screen overlay)
3. Spinner animates, main message "Sourcing Video Clips..." displays
4. For each scene (sequential or parallel processing):
   - Scene status changes to ⏳ "Searching..."
   - Scene counter updates: "Analyzing scene X of Y"
   - Stage messages cycle through sourcing phases
   - On success: Status changes to ✓ "X clips found" (where X is typically 4-6)
   - Progress bar updates (e.g., 1/5 = 20% → 2/5 = 40%)
5. All scenes complete → Auto-navigate to Visual Curation UI (Section 7) after 0.5s delay

**No User Interaction:**
- Loading screen is informational only (no buttons, no manual cancellation)
- User cannot dismiss or cancel sourcing (process is automatic)
- Navigation happens automatically on completion or partial success

**Error Handling Scenarios:**

**Scenario 1: No Results for Scene (Auto-Retry)**
1. YouTube API returns zero results for scene search
2. Scene status: ⚠ "No results - Retrying with broader search" (Amber)
3. Stage message: "Trying broader search criteria"
4. System applies relaxed filters (Epic 3 Story 3.4: relax criteria incrementally)
5. If retry succeeds: Status → ✓ "4 clips found"
6. If retry fails again: Status → ⚠ "Limited results - 2 clips found" (proceed with fewer clips)
7. If no clips after all retries: Status → ✗ "Failed - No clips available"

**Scenario 2: YouTube API Quota Exceeded**
1. YouTube API returns 403 quota exceeded error
2. Spinner stops
3. Error icon displayed (red circle with !)
4. Main message: "YouTube API Quota Exceeded"
5. Stage message: "The YouTube API daily limit has been reached. Please try again later or contact support."
6. Scene status list shows: Completed scenes (✓), Current scene (✗ Failed), Remaining scenes (⏸ Pending)
7. **"Try Again Later" button** (disabled, shows timer if quota reset time known)
8. **"Back to Script Preview" button** (returns to Section 6.7)

**Scenario 3: Network Error (Auto-Retry with Backoff)**
1. YouTube API request fails due to network error
2. Scene status: ⚠ "Connection error - Retrying..." (Amber)
3. System retries with exponential backoff (Epic 3 Story 3.1: max 3 attempts)
4. After 3 failed retries:
   - Spinner stops
   - Error icon displayed
   - Main message: "Visual Sourcing Failed"
   - Stage message: "Could not connect to YouTube API. Check your internet connection."
   - **"Retry Visual Sourcing" button** (restarts entire sourcing process)
   - **"Back to Script Preview" button** (returns to Section 6.7)

**Scenario 4: Partial Failure (Some Scenes Succeed, Some Fail)**
1. Some scenes complete successfully (✓ "X clips found")
2. Some scenes fail after retries (✗ "Failed - Network error" or "No clips available")
3. Progress bar shows partial completion (e.g., 3/5 = 60%)
4. Main message: "Visual Sourcing Partially Complete"
5. Stage message: "3 of 5 scenes have clips. You can proceed with available clips or retry failed scenes."
6. Failed scenes show **"Retry Scene X" button** (inline, per scene)
7. **"Continue with Available Clips" button** (proceeds to Section 7 with only successful scenes)
8. **"Retry All Failed Scenes" button** (retries only failed scenes, not successful ones)

**Scenario 5: Browser Not Installed (Browser-Based Providers Only)**
1. User has configured browser-based provider (DVIDS/NASA) but Playwright browser not installed
2. First attempt to source video fails immediately
3. Scene status for all scenes: ✗ "Failed - Browser not installed"
4. Main message: "Playwright Browser Not Installed"
5. Stage message: "Browser-based video providers require Playwright browser installation. Run: playwright install chromium"
6. **"View Installation Guide" button** (opens help documentation)
7. **"Switch to YouTube Provider" button** (quick provider change in settings)
8. **"Back to Settings" button** (returns to provider configuration)

**Scenario 6: Stealth Detection / Bot Blocking (Browser-Based Providers Only)**
1. Website detects automated browser and blocks access after stealth fails
2. Scene status: ⚠ "Website blocked access - Trying stealth mode..." (Amber)
3. Stage message: "Applying anti-detection measures..."
4. If stealth succeeds: Status → ✓ "X clips found"
5. If stealth fails after 3 attempts:
   - Main message: "Website Access Blocked"
   - Stage message: "DVIDS website detected automated browser and blocked access. This website has strict anti-bot protections."
   - **"Try Different Provider" button** (switch to YouTube or other available providers)
   - **"Manual Source This Scene" button** (allow manual upload for blocked scene)
   - **"Retry with Different Settings" button** (adjust stealth configuration)

**Scenario 7: Page Render Timeout (Browser-Based Providers Only)**
1. Website takes > 30 seconds to render JavaScript content
2. Scene status: ⚠ "Page load timeout - Waiting for content..." (Amber)
3. Stage message: "Website is slow to respond. Extending timeout..."
4. System extends timeout to 60 seconds
5. If timeout succeeds: Status → ✓ "X clips found"
6. If timeout fails:
   - Main message: "Website Timeout"
   - Stage message: "DVIDS website took too long to respond. The website may be experiencing high traffic or technical issues."
   - **"Try Again Later" button** (disabled for 30 seconds, then enabled)
   - **"Use Different Provider" button** (switch to alternative video source)

### 6.8.4 Browser-Based Video Provider Loading (Playwright)

**Context:** Feature 2.9 (Domain-Specific Content APIs) introduces browser-based video providers (DVIDS, NASA) that use Playwright headless browser automation instead of HTTP APIs. These providers have different loading characteristics:

**Key Differences from API-Based Providers:**

| Characteristic | API-Based (YouTube) | Browser-Based (DVIDS/NASA) |
|----------------|---------------------|----------------------------|
| **Startup Time** | ~100ms | 2-3 seconds (browser launch) |
| **Page Rendering** | N/A (JSON response) | 1-2 seconds (JS execution) |
| **Network Interception** | N/A | 0.5-1 seconds (URL capture) |
| **Total Per-Scene Time** | 2-5 seconds | 5-10 seconds |
| **Error Types** | API quota, network | Browser not installed, stealth detection, rendering timeout |
| **Loading Messages** | "Searching YouTube..." | Multi-stage browser lifecycle messages |

**Browser-Specific Loading Stages:**

When using browser-based providers (Feature 2.9), add these stage messages to the loading UI:

**Stage 1: Browser Initialization (0-30% per scene)**
- "Starting browser..." (0-10%)
  - Indicates Playwright browser launch
  - Duration: 2-3 seconds
  - Only shown on FIRST request (browser is reused for subsequent scenes)

**Stage 2: Page Navigation & Rendering (30-50%)**
- "Rendering page..." (30-40%)
  - Indicates page load and JavaScript execution
  - Duration: 1-2 seconds
  - Shown per scene

**Stage 3: Content Extraction (50-90%)**
- "Intercepting video URLs..." (50-70%)
  - Indicates network request interception for streaming URLs
  - Duration: 0.5-1 second
- "Extracting video metadata..." (70-90%)
  - Indicates parsing rendered HTML for video details
  - Duration: 0.5-1 second

**Stage 4: Completion (90-100%)**
- "Found X clips" (90-100%)
  - Same as API-based providers

**Updated Stage Messages for Browser-Based Providers:**

Replace standard YouTube API stages with browser-specific stages:

```
API-Based Provider Stages:
1. "Analyzing scene text..." (5-10%)
2. "Generating search queries..." (10-20%)
3. "Searching YouTube for clips..." (20-60%)
4. "Filtering and ranking results..." (60-90%)
5. "Found X clips" (90-100%)

Browser-Based Provider Stages (DVIDS/NASA):
1. "Starting browser..." (0-10%) [First scene only]
2. "Rendering page..." (10-30%)
3. "Intercepting video URLs..." (30-60%)
4. "Extracting video metadata..." (60-90%)
5. "Found X clips" (90-100%)
```

**Visual Indicators for Browser-Based Providers:**

**Provider Badge (Optional Enhancement):**
- **Position:** Below main message, above scene counter
- **Style:** Small badge with provider name
- **Colors:**
  - YouTube: Red background (`#ef4444`)
  - DVIDS: Olive/drab background (`#4d5c3e`)
  - NASA: Blue background (`#1e3a8a`)
- **Text:** "via YouTube", "via DVIDS", "via NASA"
- **Purpose:** Help users understand why loading times vary

**Progress Bar Adjustment:**
- Browser-based providers: Extend expected duration display
- If progress bar shows estimated time remaining, add 2-3 seconds for browser startup
- Example: "Approximately 2 minutes remaining" (YouTube) vs "Approximately 3 minutes remaining" (DVIDS)

**Browser-Specific Error Handling:**

**Error Scenario: Browser Not Installed (Playwright Setup)**
1. First attempt to use browser-based provider fails
2. Spinner stops
3. Error icon (red circle with !)
4. Main message: "Browser Not Installed"
5. Stage message: "Playwright browser is not installed. Run 'playwright install chromium' and try again."
6. **"Installation Guide" button** (opens documentation with setup commands)
7. **"Back to Settings" button** (returns to provider selection)
8. Scene status list shows: ⏸ Pending (all scenes)

**Error Scenario: Stealth Detection / Bot Blocking**
1. Website detects automated browser and blocks access
2. Scene status: ⚠ "Access blocked - Retrying with stealth..." (Amber)
3. Stage message: "Website detected automation. Applying anti-detection measures..."
4. System applies `playwright-stealth` plugin
5. If retry succeeds: Status → ✓ "X clips found"
6. If retry fails: Status → ✗ "Failed - Website blocked access"
7. **"Try Different Provider" button** (fallback to other available providers)
8. **"Manual Source" button** (allow user to manually upload video for this scene)

**Error Scenario: Rendering Timeout**
1. Page takes too long to render JavaScript ( > 30 seconds)
2. Scene status: ⚠ "Page load timeout - Retrying..." (Amber)
3. Stage message: "Website is slow to respond. Waiting for content to render..."
4. System extends timeout and retries
5. If retry succeeds: Status → ✓ "X clips found"
6. If retry fails: Status → ✗ "Failed - Page render timeout"

**Technical UX Considerations for Browser-Based Providers:**

**Configuration UI Notes (for future provider settings):**
- Add provider type indicator in settings: "API-based" vs "Browser-based"
- Show resource usage warning: "Browser-based providers use ~200MB RAM per instance"
- Display installation status: "✓ Browser installed" or "⚠ Browser not installed"
- Add "Test Browser" button in provider settings to verify Playwright installation

**Performance Expectations:**
- Set user expectations: "Browser-based providers take 5-10 seconds per scene (vs 2-5 seconds for API providers)"
- Show provider type in loading UI so users understand timing differences
- Consider showing "First request will be slower (browser startup)" message for initial browser launch

**Resource Management:**
- If multiple browser-based providers are enabled, show message: "Reusing browser instance for faster subsequent requests..."
- Display browser cleanup message on completion: "Cleaning up browser resources..."

**Accessibility Updates for Browser Stages:**
- `aria-live="polite"` for all browser stage transitions
- Screen reader announcements: "Starting browser", "Page rendered", "Video URLs intercepted"
- Maintain focus management during extended browser operations

---

### 6.8.5 States (Updated for Browser-Based Providers)

**Loading (Normal - API-Based):**
- Spinner rotating
- Scene status list updating in real-time as scenes complete
- Progress bar filling based on completed scenes
- Stage messages cycling: "Analyzing scene...", "Searching YouTube...", "Filtering results..."
- No errors, smooth progression
- Typical duration: 2-5 seconds per scene

**Loading (Normal - Browser-Based):**
- Spinner rotating
- Scene status list updating in real-time as scenes complete
- Progress bar filling based on completed scenes (slower progression)
- Stage messages cycling: "Starting browser..." (first scene), "Rendering page...", "Intercepting URLs..."
- No errors, smooth progression
- Typical duration: 5-10 seconds per scene (first scene: 8-13 seconds with browser startup)

**Loading (Browser Startup - First Scene Only):**
- Scene status: ⏳ "Initializing browser..." (Indigo, with pulse animation)
- Stage message: "Starting browser for first request... This takes 2-3 seconds."
- Progress bar: Pauses at 5-10% during browser launch
- Other scenes: ⏸ Pending
- After browser launch: Resume normal loading stages

**Loading (Retry - No Results - API-Based):**
- Specific scene status: ⚠ "No results - Retrying with broader search" (Amber)
- Amber warning indicator
- Stage message: "Trying broader search criteria"
- Other scenes continue processing normally

**Loading (Retry - No Results - Browser-Based):**
- Specific scene status: ⚠ "No results - Retrying with different search..." (Amber)
- Amber warning indicator
- Stage message: "Trying different search terms on website..."
- Other scenes continue processing normally
- Browser remains running (no re-initialization needed)

**Error (Quota Exceeded):**
- Spinner stops
- Error icon (red circle with !)
- Main message: "YouTube API Quota Exceeded"
- Stage message: Explanation + action guidance
- "Try Again Later" button (disabled, may show timer)
- "Back to Script Preview" button (enabled)
- Scene status list shows: ✓ Completed, ✗ Failed (quota), ⏸ Pending

**Error (Network Failure):**
- Spinner stops
- Error icon (red circle with !)
- Main message: "Visual Sourcing Failed"
- Stage message: "Could not connect to YouTube API. Check your internet connection."
- **"Retry Visual Sourcing" button** (enabled, restarts process)
- **"Back to Script Preview" button** (enabled, returns to Section 6.7)
- Scene status list shows: ✓ Completed, ✗ Failed (network), ⏸ Pending

**Error (Partial Failure):**
- Spinner stops
- Warning icon (amber triangle with !)
- Main message: "Visual Sourcing Partially Complete"
- Stage message: "X of Y scenes have clips. Proceed or retry?"
- Scene status list shows:
  - ✓ Successful scenes: "6 clips found"
  - ✗ Failed scenes: "Failed - No clips available" with inline **"Retry Scene X" button**
- **"Continue with Available Clips" button** (proceeds to curation with partial data)
- **"Retry All Failed Scenes" button** (retries only failed scenes)
- **"Back to Script Preview" button** (returns to Section 6.7)

**Success (Transition):**
- All scenes show ✓ Complete (Emerald): "X clips found"
- Progress bar: 100%
- Main message: "Clips Sourced Successfully!"
- Stage message: "Found clips for all scenes. Preparing curation interface..."
- Success checkmark animation (optional, brief)
- Auto-navigate to Visual Curation UI (Section 7) after 0.5s delay

**Error (Browser Not Installed):**
- Spinner stops
- Error icon (red circle with !)
- Main message: "Playwright Browser Not Installed"
- Stage message: "Browser-based video providers require Playwright browser installation. Run: playwright install chromium"
- **"View Installation Guide" button** (opens help docs)
- **"Switch to YouTube Provider" button** (quick provider change)
- **"Back to Settings" button** (returns to provider configuration)
- Scene status list shows: ✗ Failed (browser not installed) for all scenes

**Error (Stealth Detection - Browser-Based):**
- Spinner stops
- Warning icon (amber triangle with !)
- Main message: "Website Access Blocked"
- Stage message: "DVIDS website detected automated browser and blocked access after multiple stealth attempts."
- **"Try Different Provider" button** (switch to YouTube)
- **"Manual Source This Scene" button** (allow manual upload)
- Scene status list shows: ✗ Failed (access blocked)

**Error (Page Render Timeout - Browser-Based):**
- Spinner stops
- Warning icon (amber triangle with !)
- Main message: "Website Timeout"
- Stage message: "DVIDS website took too long to respond. The website may be experiencing high traffic or technical issues."
- **"Try Again Later" button** (disabled for 30s, then enabled)
- **"Use Different Provider" button** (switch to alternative)
- Scene status list shows: ✗ Failed (timeout)

---

### 6.8.6 Technical Implementation Notes (Playwright Browser Automation)

**UX Impact of Playwright Technology:**

The pivot from HTTP web scraping to Playwright headless browser automation (Sprint Change Proposal 2026-01-24) introduces specific UX considerations:

**Timing Differences:**

| Operation | HTTP Scraping (Old) | Playwright (New) | UX Impact |
|-----------|---------------------|------------------|-----------|
| First request | ~100ms | 2-3 seconds (browser startup) | Longer initial wait |
| Subsequent requests | ~100ms each | 0.5-1 seconds (page render) | Slower per-scene time |
| Network interception | N/A | 0.5-1 seconds | Additional stage needed |
| Total per scene | 2-5 seconds | 5-10 seconds | Extended loading duration |

**User Communication Strategy:**

1. **Set Expectations Early:**
   - When user enables browser-based provider: Show message "Browser-based providers take 5-10 seconds per scene (vs 2-5 seconds for API providers)"
   - In provider settings: Display resource usage warning "Browser-based providers use ~200MB RAM per instance"

2. **Transparent Loading Stages:**
   - Show specific browser stages: "Starting browser...", "Rendering page...", "Intercepting URLs..."
   - Helps users understand what's happening during longer waits
   - Reduces perceived wait time through progress indication

3. **Browser Reuse Communication:**
   - On first scene: "Starting browser for first request... This takes 2-3 seconds."
   - On subsequent scenes: "Reusing browser instance for faster requests..."
   - On completion: "Cleaning up browser resources..."

**Error Communication for Browser-Specific Failures:**

1. **Browser Not Installed:**
   - Clear, actionable error message
   - Provide exact command: `playwright install chromium`
   - Link to installation guide
   - Quick fallback: "Switch to YouTube Provider"

2. **Stealth Detection:**
   - Explain why website blocked access: "Website detected automated browser"
   - Show retry attempts with stealth mode
   - Provide alternatives: "Try Different Provider" or "Manual Source This Scene"

3. **Render Timeout:**
   - Differentiate from network errors
   - Explain it's website-specific: "Website took too long to respond"
   - Suggest trying later or using different provider

**Performance Optimization UX:**

**Browser Lifecycle Indication:**
- Browser startup (first request): Show initialization stage
- Browser reuse (subsequent requests): Implicit (faster stages)
- Browser cleanup (completion): Brief message if cleanup takes > 1 second

**Resource Management:**
- If multiple browser-based providers enabled: Show "Reusing browser instance across providers..."
- Memory usage warning: "Browser-based providers use ~200MB RAM. Consider disabling unused providers."

**Configuration UI Recommendations (Future Enhancement):**

When implementing provider configuration UI (for Feature 2.9):

1. **Provider Type Indicator:**
   - Badge: "API-based" (fast) vs "Browser-based" (slower)
   - Help text explaining the difference
   - Expected timing: "2-5 seconds per scene" vs "5-10 seconds per scene"

2. **Installation Status:**
   - Visual indicator: ✓ "Browser installed" or ⚠ "Browser not installed"
   - "Test Browser" button to verify Playwright installation
   - "Install Browser" button with setup instructions

3. **Resource Usage Display:**
   - Show current browser instances: "1 browser active (~200MB RAM)"
   - Warn if multiple providers enabled: "Multiple browser providers may use 400-600MB RAM"

4. **Provider Priority:**
   - Allow users to set provider priority (YouTube first, DVIDS fallback)
   - Show "Primary Provider" badge
   - Explain fallback behavior

**Accessibility Considerations for Browser-Based Providers:**

1. **Screen Reader Announcements:**
   - Announce browser startup: "Starting browser for video search"
   - Announce stage transitions: "Rendering page", "Intercepting video URLs"
   - Announce browser errors clearly: "Browser not installed", "Website blocked access"

2. **Extended Timeout Tolerance:**
   - Browser operations take longer - ensure screen readers don't time out
   - Use `aria-live="polite"` for all stage updates
   - Maintain focus during extended browser operations

3. **Error Recovery Accessibility:**
   - Ensure all error buttons are keyboard accessible
   - Provide clear ARIA labels: "Install Playwright browser button", "Switch to YouTube provider button"
   - Focus management: Return focus to appropriate element after error resolution

**Progress Bar Adjustments for Browser-Based Providers:**

**Estimated Time Calculation:**
- API-based: `num_scenes × 3.5 seconds` (average)
- Browser-based: `(num_scenes × 7.5 seconds) + 3 seconds` (browser startup)
- Example: 5 scenes
  - YouTube: "Approximately 18 seconds remaining"
  - DVIDS: "Approximately 41 seconds remaining" (includes first-scene browser startup)

**Progress Bar Segmentation:**
- Browser startup (first scene): 0-10% (slower progression)
- Page rendering: 10-30%
- URL interception: 30-60%
- Metadata extraction: 60-90%
- Completion: 90-100%

**Smooth Progression:**
- Use CSS transitions for smooth bar movement
- Avoid jumpy progress during browser stages
- Consider staggered updates for finer granularity

**Testing Recommendations for Browser-Based Provider UX:**

1. **First-Request Experience:**
   - Test initial browser startup (2-3 second delay)
   - Verify loading stages display correctly
   - Ensure provider badge shows correct type

2. **Subsequent Requests:**
   - Verify browser reuse speeds up requests
   - Confirm "Reusing browser" message displays
   - Test cleanup message on completion

3. **Error Scenarios:**
   - Simulate "browser not installed" error
   - Test stealth detection and retry behavior
   - Verify timeout handling and error messages

4. **Resource Management:**
   - Test with multiple browser-based providers enabled
   - Verify memory usage warnings display
   - Test browser cleanup on completion

5. **Accessibility:**
   - Test screen reader announcements for all stages
   - Verify keyboard navigation through error recovery buttons
   - Test focus management during extended operations

---
