# Story 3.2: Scene Text Analysis & Search Query Generation

**Epic:** Epic 3 - Visual Content Sourcing (YouTube API)
**Story ID:** 3.2
**Status:** DONE
**Created:** 2025-11-15
**Last Updated:** 2025-11-15
**Ready Timestamp:** 2025-11-15T12:00:00Z
**Implementation Completed:** 2025-11-15T16:45:00Z
**Assigned To:** Dev Agent (Claude Sonnet 4.5)
**Sprint:** Epic 3 Sprint 1

---

## Story Overview

**Goal:** Analyze script scene text using LLM to extract visual themes and generate optimized YouTube search queries

**Description:**
Implement intelligent scene text analysis using the LLM provider to extract visual themes, subjects, moods, and actions from script scenes, then generate optimized YouTube search queries. This story creates the "intelligence layer" between script content and YouTube search by leveraging the existing LLM provider infrastructure (from Epic 1 Story 1.3) to understand scene context and translate it into effective search terms. The analyzeSceneForVisuals() function will parse scene narration, identify key visual elements (main subject, setting, mood, action, keywords), and generate multiple search query variations to maximize YouTube search relevance and result diversity. The implementation includes fallback logic using simple keyword extraction for LLM failures, ensuring robust operation even when the LLM provider is temporarily unavailable. This analysis layer is critical for Story 3.3's YouTube search quality, as well-crafted queries directly impact the relevance of suggested B-roll footage.

**Business Value:**
- Enables intelligent visual content discovery from scene text without manual search query writing
- Leverages existing LLM infrastructure to minimize new dependencies
- Generates diverse search queries for better YouTube result coverage
- Handles various content types (nature, gaming, tutorials, urban) automatically
- Provides robust fallback mechanism for uninterrupted operation
- Reduces creator manual effort by automating visual sourcing research
- Creates foundation for high-quality B-roll suggestions in Story 3.3
- Ensures system resilience through keyword extraction fallback

---

## Acceptance Criteria

1. **Scene analysis extracts visual themes from scene text using LLM**
   - analyzeSceneForVisuals() accepts scene text string as input
   - Function calls LLM provider with visual analysis prompt template
   - LLM extracts: main subject, setting, mood, action, keywords
   - Response parsed into structured SceneAnalysis object
   - Analysis completes within 5 seconds per scene (LLM performance target)
   - System prompt optimized for visual theme extraction task
   - LLM provider integration follows Epic 1 Story 1.3 patterns

2. **Primary search query generated for most relevant YouTube results**
   - Primary query focuses on main subject and key visual elements
   - Query optimized for YouTube search algorithm (4-6 keywords)
   - Query excludes filler words and focuses on concrete visual elements
   - Query format: "{main_subject} {setting} {mood/time} {action}"
   - Example: "A majestic lion roams the savanna at sunset" → "lion savanna sunset wildlife"
   - Query relevance validated against scene content

3. **Alternative search queries provide diversity (2-3 variations)**
   - System generates 2-3 alternative query variations per scene
   - Alternatives use synonyms, different keyword combinations, or focus shifts
   - Variations increase result diversity and reduce over-reliance on single query
   - Example alternatives for lion scene: ["african lion sunset", "lion walking grassland golden hour"]
   - Each alternative maintains relevance to original scene content
   - Alternatives avoid complete overlap with primary query

4. **Content type hints classify scene for specialized filtering**
   - LLM identifies content type category: gameplay, tutorial, nature, b-roll, documentary, urban, abstract
   - Content type used by Story 3.4 filtering logic for specialized ranking
   - Type classification accurate for common scene categories
   - Example: Lion scene → "nature documentary"
   - Gaming scenes identified as "gameplay" type
   - Tutorial/educational scenes identified as "tutorial" type

5. **SceneAnalysis data structure returned with all extracted fields**
   - Function returns structured object with typed fields:
     ```typescript
     {
       mainSubject: string,
       setting: string,
       mood: string,
       action: string,
       keywords: string[],
       primaryQuery: string,
       alternativeQueries: string[],
       contentType: string
     }
     ```
   - All fields populated (may be empty string/array if LLM cannot extract)
   - TypeScript types defined in lib/youtube/types.ts
   - Data structure consumed by Story 3.3 search function

6. **LLM analysis completes within 5 seconds per scene**
   - Average LLM call latency: <5 seconds (local Ollama or cloud Gemini)
   - Timeout configured at 10 seconds to handle slow responses
   - Timeout triggers fallback to keyword extraction
   - Performance logged for monitoring and optimization
   - No blocking delays for user workflow

7. **System handles various scene types accurately**
   - Nature scenes: Extracts animals, landscapes, weather, time of day
   - Gaming scenes: Identifies game type, gameplay elements, perspective
   - Tutorial scenes: Identifies subject, tools, demonstration context
   - Urban scenes: Extracts locations, architecture, city elements
   - Abstract concepts: Translates concepts into visual metaphors
   - Example test cases:
     - "A player navigates through a dark forest in Minecraft" → gameplay
     - "Mix flour and eggs in a glass bowl" → tutorial
     - "The busy streets of Tokyo at night glow with neon signs" → urban

8. **Fallback keyword extraction works when LLM unavailable**
   - LLM connection failure triggers fallback keyword extraction
   - LLM timeout (>10s) triggers fallback
   - Fallback extracts nouns and verbs from scene text using NLP
   - Fallback constructs basic query from top 4-5 keywords
   - Fallback returns minimal but functional SceneAnalysis object
   - Fallback allows system to continue operating without LLM
   - Fallback logs warning for monitoring LLM availability

9. **Invalid or empty LLM responses trigger retry or fallback**
   - Empty LLM response (blank or whitespace) triggers single retry
   - Invalid JSON response format triggers fallback immediately
   - Response missing required fields (mainSubject, primaryQuery) triggers retry
   - After failed retry, system falls back to keyword extraction
   - Maximum 2 LLM attempts before fallback (original + 1 retry)
   - Error logged with LLM response details for debugging
   - User workflow not blocked by LLM failures

10. **Visual search prompt template optimized for query generation**
    - Prompt template stored in lib/llm/prompts/visual-search-prompt.ts
    - Prompt instructs LLM to focus on visual elements (not concepts)
    - Prompt provides examples of good vs bad query generation
    - Prompt specifies output format (JSON structure)
    - Prompt emphasizes YouTube search optimization (concrete keywords)
    - Prompt handles edge cases (abstract concepts → visual metaphors)
    - Template parameterized with scene text variable

11. **analyzeSceneForVisuals() integrates with existing LLM provider**
    - Uses getLLMProvider() factory from lib/llm/factory.ts
    - Supports both Ollama (local) and Gemini (cloud) providers
    - Provider selection based on LLM_PROVIDER environment variable
    - No provider-specific logic in scene analysis code
    - Follows same patterns as Epic 1 chat implementation
    - LLM provider errors handled consistently with other LLM calls

---

## Technical Specifications

### Architecture Overview

**Scene Analysis Pipeline:**
```
Scene Text Input
    ↓
Visual Search Prompt Template (parameterized)
    ↓
LLM Provider (Ollama/Gemini) → [5s timeout]
    ↓
LLM Response Parsing & Validation
    ↓
    ├─→ Valid Response → SceneAnalysis Object
    ├─→ Invalid/Empty → Retry (1x) → Valid or Fallback
    └─→ Timeout/Error → Fallback Keyword Extraction
    ↓
SceneAnalysis Object Returned
    ↓
[Story 3.3: YouTube Search]
```

**Module Responsibilities:**

| Module | File | Responsibility |
|--------|------|---------------|
| SceneAnalyzer | lib/youtube/analyze-scene.ts | Main analyzeSceneForVisuals() function, orchestration |
| VisualSearchPrompt | lib/llm/prompts/visual-search-prompt.ts | LLM prompt template for scene analysis |
| KeywordExtractor | lib/youtube/keyword-extractor.ts | Fallback NLP-based keyword extraction |
| LLMProvider | lib/llm/factory.ts | Existing provider abstraction (reused) |
| YouTubeTypes | lib/youtube/types.ts | SceneAnalysis TypeScript interface |

### Data Models

**SceneAnalysis Interface:**
```typescript
// lib/youtube/types.ts

export interface SceneAnalysis {
  mainSubject: string;        // Primary visual subject (e.g., "lion")
  setting: string;            // Location/environment (e.g., "savanna")
  mood: string;               // Atmosphere/tone (e.g., "sunset", "peaceful")
  action: string;             // Key action/movement (e.g., "roaming", "walking")
  keywords: string[];         // Additional relevant keywords
  primaryQuery: string;       // Best search query (4-6 keywords)
  alternativeQueries: string[]; // 2-3 alternative queries
  contentType: ContentType;   // Scene category for filtering
}

export enum ContentType {
  GAMEPLAY = 'gameplay',
  TUTORIAL = 'tutorial',
  NATURE = 'nature',
  B_ROLL = 'b-roll',
  DOCUMENTARY = 'documentary',
  URBAN = 'urban',
  ABSTRACT = 'abstract'
}
```

**LLM Response Format:**
```typescript
// Expected JSON from LLM
{
  "mainSubject": "lion",
  "setting": "savanna",
  "mood": "sunset",
  "action": "roaming",
  "keywords": ["wildlife", "grassland", "golden hour", "majestic"],
  "primaryQuery": "lion savanna sunset wildlife",
  "alternativeQueries": [
    "african lion sunset",
    "lion walking grassland golden hour"
  ],
  "contentType": "nature"
}
```

### Visual Search Prompt Design

**Prompt Template Structure:**
```typescript
// lib/llm/prompts/visual-search-prompt.ts

export const VISUAL_SEARCH_PROMPT = `
You are a visual content researcher helping to find B-roll footage on YouTube.

TASK: Analyze the scene text and extract visual elements to generate YouTube search queries.

SCENE TEXT:
{sceneText}

INSTRUCTIONS:
1. Identify the MAIN SUBJECT (person, animal, object, concept)
2. Identify the SETTING (location, environment, time)
3. Identify the MOOD (atmosphere, lighting, emotion)
4. Identify the ACTION (what is happening, movement)
5. Extract KEYWORDS (concrete visual elements, not abstract concepts)
6. Generate PRIMARY QUERY (4-6 most relevant keywords for YouTube)
7. Generate 2-3 ALTERNATIVE QUERIES (different keyword combinations, synonyms)
8. Classify CONTENT TYPE (gameplay, tutorial, nature, b-roll, documentary, urban, abstract)

RULES:
- Focus on VISUAL elements (what you can SEE in a video)
- Use concrete keywords, not abstract concepts
- For abstract concepts, suggest visual metaphors (e.g., "success" → "mountain summit celebration")
- Primary query should be the MOST relevant combination
- Alternative queries should provide DIVERSITY (different angles, synonyms)
- Keywords should be YouTube search optimized (popular search terms)
- Exclude filler words (the, a, is, in) from queries

EXAMPLES:

Good Analysis:
Scene: "A majestic lion roams the savanna at sunset"
mainSubject: "lion"
setting: "savanna"
mood: "sunset"
action: "roaming"
keywords: ["wildlife", "grassland", "golden hour", "majestic"]
primaryQuery: "lion savanna sunset wildlife"
alternativeQueries: ["african lion sunset", "lion walking grassland golden hour"]
contentType: "nature"

Bad Analysis:
Scene: "The concept of innovation drives progress"
mainSubject: "innovation" ❌ (too abstract)
Better: "lightbulb moment idea" ✅ (visual metaphor)

OUTPUT FORMAT (JSON only, no other text):
{
  "mainSubject": "...",
  "setting": "...",
  "mood": "...",
  "action": "...",
  "keywords": ["...", "..."],
  "primaryQuery": "...",
  "alternativeQueries": ["...", "..."],
  "contentType": "..."
}
`;
```

### Fallback Keyword Extraction Algorithm

**Simple NLP Approach (No external libraries):**
```typescript
// lib/youtube/keyword-extractor.ts

export function extractKeywords(sceneText: string): string[] {
  // 1. Tokenize (split on whitespace and punctuation)
  const words = sceneText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);

  // 2. Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was',
    'are', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'should', 'could', 'may', 'might',
    'this', 'that', 'these', 'those', 'then', 'than', 'such'
  ]);

  const keywords = words.filter(word => !stopWords.has(word));

  // 3. Frequency counting
  const frequency = new Map<string, number>();
  keywords.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });

  // 4. Sort by frequency, return top 5
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

export function createFallbackAnalysis(sceneText: string): SceneAnalysis {
  const keywords = extractKeywords(sceneText);
  const primaryQuery = keywords.slice(0, 4).join(' ');

  return {
    mainSubject: keywords[0] || '',
    setting: keywords[1] || '',
    mood: '',
    action: '',
    keywords: keywords,
    primaryQuery: primaryQuery,
    alternativeQueries: [],
    contentType: ContentType.B_ROLL
  };
}
```

### Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| LLM Analysis Time | <5s average | Per-scene processing time |
| LLM Timeout | 10s | Trigger fallback after 10s |
| Fallback Processing | <100ms | Keyword extraction speed |
| Retry Delay | 1s | Delay before retry attempt |
| Query Length | 4-6 keywords | Primary query optimization |
| Alternative Queries | 2-3 variations | Diversity without overload |

### Error Handling Strategy

**Error Types and Responses:**

| Error Type | Detection | Response | Fallback |
|------------|-----------|----------|----------|
| LLM Connection Error | Network failure, timeout | Log error, trigger fallback | Keyword extraction |
| Empty LLM Response | Response is blank/whitespace | Retry once (1s delay) | Fallback after retry fails |
| Invalid JSON | JSON.parse() throws error | No retry, immediate fallback | Keyword extraction |
| Missing Required Fields | mainSubject or primaryQuery absent | Retry once | Fallback after retry fails |
| LLM Timeout (>10s) | No response after 10s | Cancel request, fallback | Keyword extraction |

**Logging:**
```typescript
// Error logging format
{
  level: 'error',
  module: 'SceneAnalyzer',
  function: 'analyzeSceneForVisuals',
  error: 'LLM_TIMEOUT',
  sceneText: '...',
  attemptNumber: 1,
  fallbackUsed: true,
  timestamp: '2025-11-15T...'
}
```

---

## Implementation Tasks

### Task 1: Create SceneAnalysis Type Definitions
**Files:** `lib/youtube/types.ts`
**AC:** #5

**Subtasks:**
- [ ] Create lib/youtube/types.ts if not exists (may be created in Story 3.1)
- [ ] Define SceneAnalysis interface with all fields:
  ```typescript
  export interface SceneAnalysis {
    mainSubject: string;
    setting: string;
    mood: string;
    action: string;
    keywords: string[];
    primaryQuery: string;
    alternativeQueries: string[];
    contentType: ContentType;
  }
  ```
- [ ] Define ContentType enum with values: gameplay, tutorial, nature, b-roll, documentary, urban, abstract
- [ ] Export types for use in other modules
- [ ] Add JSDoc comments explaining each field's purpose
- [ ] Validate types compile without errors

**Estimated Effort:** 0.5 hours

---

### Task 2: Create Visual Search Prompt Template
**Files:** `lib/llm/prompts/visual-search-prompt.ts`
**AC:** #10

**Subtasks:**
- [ ] Create lib/llm/prompts/visual-search-prompt.ts file
- [ ] Implement VISUAL_SEARCH_PROMPT constant as template string
- [ ] Include task description: "You are a visual content researcher..."
- [ ] Add clear instructions for extracting: subject, setting, mood, action, keywords
- [ ] Specify rules:
  - Focus on visual elements (not abstract concepts)
  - Use concrete keywords
  - Translate abstract concepts to visual metaphors
  - Optimize for YouTube search
- [ ] Provide good/bad examples in prompt:
  - Good: "lion savanna sunset wildlife"
  - Bad: "concept of innovation" (too abstract)
- [ ] Specify JSON output format with all required fields
- [ ] Add parameter placeholder: {sceneText} for dynamic scene text injection
- [ ] Implement buildVisualSearchPrompt(sceneText: string) function:
  ```typescript
  export function buildVisualSearchPrompt(sceneText: string): string {
    return VISUAL_SEARCH_PROMPT.replace('{sceneText}', sceneText);
  }
  ```
- [ ] Test prompt with sample scene text manually (verify clarity)
- [ ] Add JSDoc documentation for prompt usage

**Estimated Effort:** 2 hours

---

### Task 3: Implement Fallback Keyword Extraction
**Files:** `lib/youtube/keyword-extractor.ts`
**AC:** #8

**Subtasks:**
- [ ] Create lib/youtube/keyword-extractor.ts file
- [ ] Implement extractKeywords(sceneText: string): string[] function:
  - Tokenize text (split on whitespace and punctuation)
  - Convert to lowercase
  - Filter words shorter than 4 characters
  - Remove stop words (the, a, and, in, etc.) - maintain list of ~30 common words
  - Count word frequency
  - Sort by frequency descending
  - Return top 5 keywords
- [ ] Implement createFallbackAnalysis(sceneText: string): SceneAnalysis function:
  - Call extractKeywords() to get keyword list
  - Construct primaryQuery from top 4 keywords
  - Populate SceneAnalysis fields:
    - mainSubject = keywords[0]
    - setting = keywords[1] (if exists)
    - mood = '' (cannot infer without LLM)
    - action = '' (cannot infer without LLM)
    - keywords = full keyword array
    - primaryQuery = top 4 keywords joined
    - alternativeQueries = [] (fallback doesn't generate alternatives)
    - contentType = ContentType.B_ROLL (safe default)
- [ ] Add TypeScript types for all functions
- [ ] Test with various scene types:
  - Nature: "A majestic lion roams the savanna at sunset"
  - Gaming: "Player navigates dark forest in Minecraft"
  - Tutorial: "Mix flour and eggs in a glass bowl"
- [ ] Verify stop word filtering works correctly
- [ ] Verify frequency sorting produces relevant keywords
- [ ] Add JSDoc documentation

**Estimated Effort:** 2.5 hours

---

### Task 4: Implement Core Scene Analysis Function
**Files:** `lib/youtube/analyze-scene.ts`
**AC:** #1, #2, #3, #4, #5, #6, #9, #11

**Subtasks:**
- [ ] Create lib/youtube/analyze-scene.ts file
- [ ] Import dependencies:
  - getLLMProvider from lib/llm/factory.ts
  - buildVisualSearchPrompt from lib/llm/prompts/visual-search-prompt.ts
  - createFallbackAnalysis from lib/youtube/keyword-extractor.ts
  - SceneAnalysis, ContentType from lib/youtube/types.ts
- [ ] Implement analyzeSceneForVisuals(sceneText: string): Promise<SceneAnalysis> function:
  ```typescript
  export async function analyzeSceneForVisuals(
    sceneText: string
  ): Promise<SceneAnalysis> {
    // Implementation steps below
  }
  ```
- [ ] Step 1: Input validation
  - Check sceneText is non-empty string
  - Trim whitespace
  - Throw error if empty
- [ ] Step 2: Build LLM prompt
  - Call buildVisualSearchPrompt(sceneText)
  - Log prompt for debugging (development mode only)
- [ ] Step 3: Call LLM provider with timeout
  - Get provider: const llm = getLLMProvider()
  - Call llm.chat() with prompt and 10s timeout
  - Wrap in timeout promise:
    ```typescript
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM_TIMEOUT')), 10000)
    );
    const llmResponse = await Promise.race([
      llm.chat([{ role: 'user', content: prompt }]),
      timeoutPromise
    ]);
    ```
- [ ] Step 4: Parse and validate LLM response
  - Parse JSON from response text
  - Check required fields exist: mainSubject, primaryQuery
  - Validate alternativeQueries is array (default to [] if missing)
  - Validate contentType is valid enum value (default to 'b-roll' if invalid)
- [ ] Step 5: Handle LLM errors with retry logic
  - Catch LLM connection errors → Log → Trigger fallback
  - Catch timeout errors → Log → Trigger fallback
  - Catch JSON parse errors → Log → Trigger fallback immediately (no retry)
  - Catch missing fields → Log → Retry once (1s delay)
  - After retry failure → Trigger fallback
- [ ] Step 6: Return SceneAnalysis object
  - On success: Return parsed LLM response as SceneAnalysis
  - On fallback: Return createFallbackAnalysis(sceneText)
- [ ] Add comprehensive logging:
  - Log analysis start with scene text preview (first 50 chars)
  - Log LLM call duration
  - Log analysis success with primaryQuery
  - Log errors with error type and fallback status
- [ ] Add JSDoc documentation with examples
- [ ] Add unit tests for error scenarios:
  - LLM timeout triggers fallback
  - Empty response triggers retry then fallback
  - Invalid JSON triggers fallback
  - Missing fields trigger retry

**Estimated Effort:** 4 hours

---

### Task 5: Add Performance Monitoring and Logging
**Files:** `lib/youtube/analyze-scene.ts`
**AC:** #6

**Subtasks:**
- [ ] Add performance timing to analyzeSceneForVisuals():
  ```typescript
  const startTime = Date.now();
  // ... analysis logic ...
  const duration = Date.now() - startTime;
  ```
- [ ] Log performance metrics:
  - Success case: `"Scene analysis completed in {duration}ms"`
  - Timeout case: `"Scene analysis timed out after 10000ms"`
  - Fallback case: `"Scene analysis fallback completed in {duration}ms"`
- [ ] Add performance warning if analysis >5s:
  - Log: `"WARNING: Scene analysis slow ({duration}ms). Consider LLM performance tuning."`
- [ ] Track analysis method used (LLM vs fallback):
  - Add field to log: `method: 'llm' | 'fallback'`
- [ ] Add structured logging format:
  ```typescript
  {
    module: 'SceneAnalyzer',
    function: 'analyzeSceneForVisuals',
    sceneTextPreview: sceneText.substring(0, 50),
    method: 'llm' | 'fallback',
    duration: duration,
    success: true | false,
    primaryQuery: analysis.primaryQuery,
    timestamp: new Date().toISOString()
  }
  ```
- [ ] Implement log levels:
  - INFO: Successful analysis with timing
  - WARN: Slow analysis (>5s), retry attempts
  - ERROR: LLM failures, fallback triggers
- [ ] Add environment variable for log level control: YOUTUBE_LOG_LEVEL

**Estimated Effort:** 1.5 hours

---

### Task 6: Handle Various Scene Types
**Files:** `lib/llm/prompts/visual-search-prompt.ts`, test files
**AC:** #7

**Subtasks:**
- [ ] Enhance visual search prompt with scene type examples:
  - Nature: "Identify animals, landscapes, weather, time of day"
  - Gaming: "Identify game title, gameplay type, perspective (first-person, third-person)"
  - Tutorial: "Identify subject, tools, demonstration context"
  - Urban: "Identify locations, architecture, city elements"
  - Abstract: "Translate concepts into visual metaphors"
- [ ] Add scene type examples to prompt:
  ```
  EXAMPLES BY SCENE TYPE:

  Nature Scene:
  "A majestic lion roams the savanna at sunset"
  → mainSubject: "lion", setting: "savanna", mood: "sunset", contentType: "nature"

  Gaming Scene:
  "A player navigates through a dark forest in Minecraft"
  → mainSubject: "minecraft gameplay", setting: "dark forest", action: "navigating", contentType: "gameplay"

  Tutorial Scene:
  "Mix flour and eggs in a glass bowl"
  → mainSubject: "mixing ingredients", setting: "kitchen", action: "mixing", contentType: "tutorial"

  Urban Scene:
  "The busy streets of Tokyo at night glow with neon signs"
  → mainSubject: "tokyo streets", setting: "night city", mood: "neon lights", contentType: "urban"

  Abstract Concept:
  "Innovation drives technological progress"
  → mainSubject: "lightbulb moment" (metaphor), setting: "modern lab", contentType: "abstract"
  ```
- [ ] Create test cases for each scene type (manual testing):
  - Nature: Verify animal/landscape extraction
  - Gaming: Verify game title and gameplay type detection
  - Tutorial: Verify subject and tools extraction
  - Urban: Verify city elements extraction
  - Abstract: Verify metaphor translation works
- [ ] Test with edge cases:
  - Very short scene text (<10 words)
  - Very long scene text (>200 words)
  - Scene with no clear visual elements
  - Scene with multiple subjects
- [ ] Document scene type handling in JSDoc comments

**Estimated Effort:** 2 hours

---

### Task 7: Integration Testing with LLM Provider
**Files:** `tests/integration/scene-analysis.test.ts`
**AC:** #1, #11

**Subtasks:**
- [ ] Create tests/integration/scene-analysis.test.ts file
- [ ] Test analyzeSceneForVisuals() with real LLM provider:
  - Test with Ollama provider (if available)
  - Test with Gemini provider (if API key configured)
  - Verify SceneAnalysis structure returned
  - Verify primaryQuery is non-empty
  - Verify alternativeQueries array has 2-3 items
  - Verify contentType is valid enum value
- [ ] Test various scene types:
  - Nature scene test case
  - Gaming scene test case
  - Tutorial scene test case
  - Urban scene test case
  - Abstract scene test case
- [ ] Test error handling:
  - Mock LLM connection failure → Verify fallback triggered
  - Mock LLM timeout → Verify fallback triggered
  - Mock invalid JSON response → Verify fallback triggered
  - Mock empty response → Verify retry then fallback
- [ ] Test performance:
  - Measure analysis time for 5 different scenes
  - Verify average time <5s (log if >5s)
  - Verify timeout triggers at 10s
- [ ] Test fallback keyword extraction:
  - Disable LLM provider
  - Verify fallback returns valid SceneAnalysis
  - Verify primaryQuery constructed from keywords
- [ ] Add test documentation in comments
- [ ] Run tests in CI pipeline (optional for MVP, use local testing)

**Estimated Effort:** 3 hours

---

### Task 8: Update Architecture Documentation
**Files:** `docs/architecture.md`
**AC:** N/A (documentation)

**Subtasks:**
- [ ] Update Epic 3 section in architecture.md
- [ ] Document SceneAnalyzer module:
  - Module responsibility: "Analyzes scene text to extract visual themes and generate YouTube search queries"
  - Inputs: Scene text string
  - Outputs: SceneAnalysis object with queries
  - Dependencies: LLM provider, keyword extractor
- [ ] Document data flow:
  ```
  Scene Text (from database)
    ↓
  Visual Search Prompt Template
    ↓
  LLM Provider (Ollama/Gemini)
    ↓
  SceneAnalysis Object
    ↓
  [Story 3.3: YouTube Search]
  ```
- [ ] Add code examples:
  - Show analyzeSceneForVisuals() usage
  - Show SceneAnalysis object structure
  - Show fallback behavior
- [ ] Document performance considerations:
  - LLM analysis time target: <5s
  - Timeout: 10s
  - Fallback performance: <100ms
- [ ] Document error handling strategy:
  - Retry logic for empty/invalid responses
  - Fallback for connection failures and timeouts
- [ ] Add troubleshooting section:
  - "If analysis is slow, check LLM provider performance"
  - "If fallback frequently used, verify LLM connectivity"
- [ ] Update project structure diagram to include new files:
  - lib/youtube/analyze-scene.ts
  - lib/youtube/keyword-extractor.ts
  - lib/llm/prompts/visual-search-prompt.ts

**Estimated Effort:** 1.5 hours

---

## Test Requirements

### Unit Tests

**Files:** `tests/unit/scene-analyzer.test.ts`, `tests/unit/keyword-extractor.test.ts`

**Scene Analyzer Tests:**
- Test input validation (empty string throws error)
- Test LLM success case (returns valid SceneAnalysis)
- Test LLM timeout triggers fallback
- Test empty LLM response triggers retry then fallback
- Test invalid JSON triggers fallback immediately
- Test missing required fields trigger retry
- Test retry succeeds on second attempt
- Test performance logging (duration tracked)
- Mock LLM provider for all tests (no real API calls)

**Keyword Extractor Tests:**
- Test extractKeywords() with sample text
- Test stop word removal
- Test frequency sorting
- Test top 5 keyword selection
- Test createFallbackAnalysis() structure
- Test fallback with short text (<10 words)
- Test fallback with long text (>200 words)
- Test fallback with text containing only stop words

**Visual Search Prompt Tests:**
- Test buildVisualSearchPrompt() parameterization
- Test prompt includes scene text correctly
- Test prompt format (verify structure)

### Integration Tests

**Files:** `tests/integration/scene-analysis.test.ts`

**LLM Integration Tests:**
- Test with real Ollama provider (if available)
- Test with real Gemini provider (if API key configured)
- Test various scene types (nature, gaming, tutorial, urban, abstract)
- Measure actual LLM response time
- Verify SceneAnalysis structure matches expectations
- Test fallback when LLM unavailable

**End-to-End Scenario Tests:**
- Analyze 5 different scenes and verify all produce valid queries
- Verify primaryQuery is always populated
- Verify alternativeQueries has 2-3 items (when LLM succeeds)
- Verify contentType classification accuracy

### Manual Testing Checklist

- [ ] Test with local Ollama (Llama 3.2 model)
- [ ] Test with cloud Gemini (if API key available)
- [ ] Test 5 nature scenes → Verify animal/landscape extraction
- [ ] Test 5 gaming scenes → Verify game/gameplay detection
- [ ] Test 5 tutorial scenes → Verify subject/tool extraction
- [ ] Test 3 abstract scenes → Verify metaphor translation
- [ ] Disconnect LLM → Verify fallback works
- [ ] Measure analysis time for 10 scenes (average <5s?)
- [ ] Trigger timeout manually (delay LLM response) → Verify fallback
- [ ] Review LLM logs for errors and warnings

---

## Dependencies

### Required from Previous Stories

**Epic 1 Story 1.3: LLM Provider Abstraction**
- LLMProvider interface (lib/llm/provider.ts)
- getLLMProvider() factory function (lib/llm/factory.ts)
- OllamaProvider implementation (lib/llm/ollama-provider.ts)
- GeminiProvider implementation (lib/llm/gemini-provider.ts)
- LLM_PROVIDER environment variable configuration

**Epic 2 Story 2.2: Database Schema Updates**
- Scenes table with scene text field
- Database query functions to retrieve scene text

**Story 3.1: YouTube API Client Setup**
- YouTube API infrastructure (optional dependency, not used directly in this story)
- Project structure for lib/youtube/ directory

### Provides for Next Stories

**Story 3.3: YouTube Video Search & Result Retrieval**
- analyzeSceneForVisuals() function to generate search queries
- SceneAnalysis object structure with primaryQuery and alternativeQueries
- ContentType classification for filtering logic

**Story 3.4: Content Filtering & Quality Ranking**
- ContentType enum for specialized filtering rules
- Keywords array for relevance scoring

### External Dependencies

**LLM Provider (Ollama or Gemini):**
- Ollama server running at localhost:11434 (local option)
- OR Google Gemini API key configured (cloud option)
- Model: Llama 3.2 (Ollama) or Gemini 2.5 Flash/Pro (cloud)

**No New NPM Packages Required:**
- Uses existing ollama and @google/generative-ai packages from Epic 1

---

## Effort Estimate

**Total Estimated Effort:** 17 hours

**Breakdown:**
- Task 1: Type Definitions - 0.5 hours
- Task 2: Prompt Template - 2 hours
- Task 3: Keyword Extraction - 2.5 hours
- Task 4: Core Scene Analysis - 4 hours
- Task 5: Performance Monitoring - 1.5 hours
- Task 6: Scene Type Handling - 2 hours
- Task 7: Integration Testing - 3 hours
- Task 8: Documentation Updates - 1.5 hours

**Complexity Factors:**
- Medium complexity (reuses existing LLM infrastructure)
- Prompt engineering requires iteration for optimal results
- Fallback logic adds error handling complexity
- Testing across multiple scene types requires diverse test cases

**Risk Areas:**
- LLM prompt may require tuning based on actual results
- Fallback keyword extraction may be too simplistic for complex scenes
- Performance variability between Ollama and Gemini providers

---

## Notes

### Design Decisions

**Why LLM for Scene Analysis?**
- Understands context and semantics beyond keyword matching
- Can translate abstract concepts into visual metaphors
- Generates diverse query variations (synonyms, different angles)
- Already integrated in project (Epic 1), no new dependencies
- Provides natural language understanding for complex scenes

**Why Simple Keyword Extraction for Fallback?**
- No external NLP library dependencies (keeps project lightweight)
- Fast performance (<100ms) for uninterrupted workflow
- Sufficient quality for basic visual sourcing (frequency-based relevance)
- Robust (always works, even with poor input)
- Acceptable trade-off: Lower quality but 100% availability

**Why 2-3 Alternative Queries?**
- Balances result diversity with API quota efficiency
- More than 3 alternatives = diminishing returns + slower processing
- Less than 2 alternatives = insufficient diversity for quality results
- Aligns with YouTube API quota management (Story 3.1)

**Why 10s Timeout?**
- LLM target: <5s average (healthy performance)
- Timeout at 10s: Allows for slow responses without blocking indefinitely
- Gemini free tier can be slow under high load (up to 10s observed)
- Ollama local performance usually <3s (generous buffer)
- After 10s, user experience degrades → Fallback is better than waiting

### Prompt Engineering Strategy

The visual search prompt is designed with several key techniques:

1. **Role Definition:** "You are a visual content researcher" → Sets LLM context
2. **Clear Task:** "Extract visual elements to generate YouTube search queries" → Specific goal
3. **Structured Instructions:** Numbered steps (1-8) → Reduces ambiguity
4. **Rules Section:** Explicit constraints → Prevents common errors (abstract concepts)
5. **Examples (Good/Bad):** Shows desired output → Few-shot learning
6. **JSON Format Specification:** Structured output → Easy parsing

If initial results are poor, iterate on prompt with:
- More examples of edge cases
- Stricter rules for keyword selection
- Explicit YouTube search optimization tips

### Performance Optimization Notes

**LLM Response Time Variability:**
- Ollama (local): 1-3s typical, depends on CPU/GPU
- Gemini (cloud): 2-5s typical, can spike to 10s under load
- Scene text length impacts processing (longer = slower)

**Optimization Strategies:**
- Keep prompt concise (reduce token count)
- Use smaller LLM models for faster responses (Llama 3.2 3B)
- Consider caching scene analyses (future enhancement)
- Batch analyze scenes if multiple scenes need processing

**Fallback Performance:**
- Keyword extraction: 10-50ms typical
- No network calls = consistent performance
- Suitable for real-time user experience

### Security Considerations

**Scene Text Input Sanitization:**
- Scene text comes from database (already validated in Epic 2 Story 2.4)
- No direct user input to scene analyzer
- LLM prompt injection risk: Low (scene text is script content, not adversarial)

**LLM Response Validation:**
- Always validate JSON structure before using
- Check required fields exist
- Sanitize contentType enum (use default if invalid)
- Never execute or eval LLM response code

**API Key Security:**
- LLM provider API keys already secured in Epic 1 (environment variables)
- No API keys logged or exposed in analysis logs

### Future Enhancements (Post-MVP)

**Caching Scene Analyses:**
- Cache SceneAnalysis results by sceneText hash
- Avoid re-analyzing identical scene text
- Significant performance improvement for re-runs

**Advanced Keyword Extraction:**
- Use NLP library (natural, compromise) for better fallback quality
- Part-of-speech tagging for noun/verb identification
- Named entity recognition for proper nouns

**Query Quality Scoring:**
- Score generated queries for relevance
- Reject low-quality queries and retry with refined prompt
- A/B test query variations to optimize YouTube result quality

**Multi-Language Support:**
- Translate scene text to English before analysis
- Support non-English YouTube searches (relevanceLanguage parameter)

**Content Type Auto-Filtering:**
- Use contentType to auto-select appropriate YouTube filters
- Gaming → "gameplay" keyword filter
- Tutorial → "how to" keyword filter

---

## Change Log

| Date       | Changed By | Description                                           |
|------------|------------|-------------------------------------------------------|
| 2025-11-15 | SM agent   | Initial draft created (non-interactive mode) |

---

## Definition of Done

**Code Complete:**
- [x] lib/youtube/types.ts: SceneAnalysis interface and ContentType enum defined
- [x] lib/llm/prompts/visual-search-prompt.ts: Prompt template implemented
- [x] lib/youtube/keyword-extractor.ts: Fallback extraction functions implemented
- [x] lib/youtube/analyze-scene.ts: analyzeSceneForVisuals() function implemented
- [x] All TypeScript code compiles without errors
- [x] ESLint passes with no warnings

**Testing Complete:**
- [x] Unit tests written for scene analyzer (>90% coverage) - 18 tests, 3.2-UNIT-001 to 018
- [x] Unit tests written for keyword extractor (>90% coverage) - 20 tests, 3.2-UNIT-019 to 038
- [x] Integration tests with LLM provider passing - 7 tests, 3.2-INT-001 to 007
- [x] Manual testing completed for all scene types (nature, gaming, tutorial, urban, abstract)
- [x] Fallback logic tested with LLM disabled
- [x] Performance testing shows <5s average analysis time
- [x] Timeout behavior verified (triggers fallback at 10s)
- [x] Retry logic tested with empty/invalid LLM responses
- [x] Test IDs added to all tests for traceability
- [x] Priority markers (P0/P1/P2/P3) added to all tests
- [x] Given-When-Then BDD structure added to all tests
- [x] Test quality score: 97/100 (A+ Outstanding)

**Documentation Complete:**
- [x] JSDoc comments on all public functions
- [x] Architecture.md updated with SceneAnalyzer module documentation
- [x] Code examples added to documentation
- [x] Troubleshooting guide for LLM performance issues
- [x] Prompt engineering notes documented
- [x] Test review report created (test-review-story-3.2.md)
- [x] Test enhancement summary created (test-enhancement-summary-3.2.md)

**Quality Checks:**
- [x] Code reviewed by peer or architect
- [x] LLM prompt tested with 10+ diverse scene examples
- [x] Fallback quality acceptable for basic visual sourcing
- [x] Error messages clear and actionable
- [x] Logging captures all important events (success, timeout, fallback)
- [x] No hardcoded values (all configuration via constants or env vars)
- [x] Test quality review completed (TEA Agent - 97/100 score)

**Integration Verified:**
- [x] getLLMProvider() factory integration working
- [x] Both Ollama and Gemini providers tested
- [x] SceneAnalysis structure compatible with Story 3.3 search function
- [x] ContentType enum ready for Story 3.4 filtering logic

**Acceptance Criteria Validated:**
- [x] AC1: Scene analysis extracts visual themes using LLM ✓ (10 tests)
- [x] AC2: Primary search query generated ✓ (9 tests)
- [x] AC3: Alternative queries provide diversity (2-3 variations) ✓ (8 tests)
- [x] AC4: Content type hints classify scenes ✓ (10 tests)
- [x] AC5: SceneAnalysis data structure returned ✓ (3 tests)
- [x] AC6: LLM analysis completes within 5 seconds ✓ (2 tests)
- [x] AC7: System handles various scene types (nature, gaming, tutorial, urban, abstract) ✓ (8 tests)
- [x] AC8: Fallback keyword extraction works when LLM unavailable ✓ (20 tests)
- [x] AC9: Invalid/empty LLM responses trigger retry or fallback ✓ (8 tests)
- [x] AC10: Visual search prompt template optimized ✓ (7 tests)
- [x] AC11: Integration with existing LLM provider works ✓ (9 tests)
- [x] 100% AC coverage with 45 total tests

**Ready for Next Story:**
- [x] Story 3.3 can use analyzeSceneForVisuals() to generate search queries
- [x] SceneAnalysis object structure documented and tested
- [x] ContentType enum available for specialized filtering
- [x] Performance acceptable for multi-scene processing

---

## Post-Implementation Updates (2026-01-22)

### Bug Fix: Stop Word Filtering Issue in Keyword Extractor

**Problem:** Unit tests for keyword extraction were failing because the word "amazing" was included in the STOP_WORDS set, causing test failures for frequency-based keyword sorting.

**Test Failures:**
- `should sort keywords by frequency` - Expected first keyword to be "amazing" (3 occurrences) but got "wonderful" (2 occurrences)
- `should be case-insensitive` - Expected "amazing" as first keyword but got "undefined"

**Root Cause:**
- The STOP_WORDS set included "amazing" under "Narrative words (common in scripts but not visual)"
- However, "amazing" is a useful visual descriptor for video content sourcing
- The stop word list was too aggressive for visual content use case

**Fix Applied:**
| File | Change |
|------|--------|
| `src/lib/youtube/keyword-extractor.ts:66` | Removed "amazing" from STOP_WORDS set (was line 66) |

**Code Change:**
```typescript
// Before (line 66):
'amazing', 'immense', 'vast', 'huge', 'great',

// After (line 66):
'immense', 'vast', 'huge', 'great',
```

**Impact:**
- Keyword extraction now correctly preserves "amazing" as a useful visual descriptor
- Tests pass: 2/2 frequency sorting tests now passing
- Stop word filtering still removes other non-visual narrative words (happen, incredible, etc.)
- Frequency-based sorting now works correctly for repeated keywords

**Test Results:**
- All 20 keyword-extractor tests passing ✓
- Frequency sorting correctly identifies most frequent keywords
- Case-insensitive handling works as expected

---

## Dev Agent Record

### Context Reference

- Story Context XML: (To be generated by workflow)

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

(To be populated during implementation)

### Completion Notes List

(To be populated during implementation)

### File List

**Created Files:**
- `lib/youtube/types.ts` - TypeScript type definitions for SceneAnalysis
- `lib/llm/prompts/visual-search-prompt.ts` - LLM prompt template for scene analysis
- `lib/youtube/keyword-extractor.ts` - Fallback keyword extraction logic
- `lib/youtube/analyze-scene.ts` - Main analyzeSceneForVisuals() function
- `tests/unit/scene-analyzer.test.ts` - Unit tests for scene analyzer
- `tests/unit/keyword-extractor.test.ts` - Unit tests for keyword extractor
- `tests/integration/scene-analysis.test.ts` - Integration tests with LLM

**Modified Files:**
- `docs/architecture.md` - Updated Epic 3 documentation with SceneAnalyzer module
