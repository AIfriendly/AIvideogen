/**
 * Visual Search Prompt Template for Scene Analysis
 *
 * This prompt template is designed to extract visual themes from script scene text
 * and generate optimized YouTube search queries. The LLM is instructed to focus on
 * concrete visual elements (what you can SEE in a video) rather than abstract concepts.
 *
 * The prompt uses several prompt engineering techniques:
 * 1. Role Definition: Sets context as "visual content researcher"
 * 2. Clear Task: Specific goal of generating YouTube search queries
 * 3. Structured Instructions: Numbered steps (1-8) to reduce ambiguity
 * 4. Rules Section: Explicit constraints to prevent common errors
 * 5. Examples (Good/Bad): Few-shot learning with concrete examples
 * 6. JSON Format Specification: Structured output for easy parsing
 *
 * @module visual-search-prompt
 */

/**
 * Template string for visual search prompt with {sceneText} placeholder
 *
 * This prompt instructs the LLM to:
 * - Extract visual elements: subject, setting, mood, action, keywords
 * - Generate primary YouTube search query (4-6 keywords)
 * - Generate 2-3 alternative query variations
 * - Classify content type for filtering
 * - Translate abstract concepts into visual metaphors
 * - Return results as JSON for structured parsing
 */
export const VISUAL_SEARCH_PROMPT = `You are a visual content researcher helping to find B-roll footage on YouTube.

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

EXAMPLES BY SCENE TYPE:

Nature Scene:
Input: "A majestic lion roams the savanna at sunset"
Output:
{
  "mainSubject": "lion",
  "setting": "savanna",
  "mood": "sunset",
  "action": "roaming",
  "keywords": ["wildlife", "grassland", "golden hour", "majestic"],
  "primaryQuery": "lion savanna sunset wildlife",
  "alternativeQueries": ["african lion sunset", "lion walking grassland golden hour"],
  "contentType": "nature"
}

Gaming Scene:
Input: "A player navigates through a dark forest in Minecraft"
Output:
{
  "mainSubject": "minecraft gameplay",
  "setting": "dark forest",
  "mood": "dark",
  "action": "navigating",
  "keywords": ["minecraft", "forest", "survival", "exploration"],
  "primaryQuery": "minecraft dark forest gameplay",
  "alternativeQueries": ["minecraft forest exploration", "minecraft survival forest night"],
  "contentType": "gameplay"
}

Tutorial Scene:
Input: "Mix flour and eggs in a glass bowl"
Output:
{
  "mainSubject": "mixing ingredients",
  "setting": "kitchen",
  "mood": "",
  "action": "mixing",
  "keywords": ["baking", "flour", "eggs", "bowl", "cooking"],
  "primaryQuery": "mixing flour eggs bowl tutorial",
  "alternativeQueries": ["baking ingredients mixing", "flour eggs kitchen cooking"],
  "contentType": "tutorial"
}

Urban Scene:
Input: "The busy streets of Tokyo at night glow with neon signs"
Output:
{
  "mainSubject": "tokyo streets",
  "setting": "night city",
  "mood": "neon lights",
  "action": "busy traffic",
  "keywords": ["tokyo", "neon", "night", "cityscape", "urban"],
  "primaryQuery": "tokyo night neon streets",
  "alternativeQueries": ["tokyo neon lights cityscape", "tokyo busy streets night"],
  "contentType": "urban"
}

Abstract Concept:
Input: "Innovation drives technological progress"
Output:
{
  "mainSubject": "lightbulb moment idea",
  "setting": "modern lab",
  "mood": "bright inspiring",
  "action": "brainstorming",
  "keywords": ["innovation", "technology", "lightbulb", "ideas", "creativity"],
  "primaryQuery": "innovation technology lightbulb ideas",
  "alternativeQueries": ["creative brainstorming lightbulb", "technology innovation modern lab"],
  "contentType": "abstract"
}

Bad Analysis (DO NOT DO THIS):
Input: "The concept of innovation drives progress"
❌ mainSubject: "innovation" (too abstract, not visual)
✅ mainSubject: "lightbulb moment" (visual metaphor)

OUTPUT FORMAT:
Return ONLY the JSON object below. Do NOT include:
- Markdown code blocks (no \`\`\`json or \`\`\`)
- Explanations or commentary
- Any text before or after the JSON

Just output the raw JSON object:
{
  "mainSubject": "...",
  "setting": "...",
  "mood": "...",
  "action": "...",
  "keywords": ["...", "..."],
  "primaryQuery": "...",
  "alternativeQueries": ["...", "..."],
  "contentType": "..."
}`;

/**
 * Build a visual search prompt with scene text injected
 *
 * This function takes scene text and substitutes it into the prompt template's
 * {sceneText} placeholder, creating a complete prompt ready for LLM processing.
 *
 * @param sceneText - The scene narration text to analyze (from script database)
 * @returns Complete prompt string with scene text embedded
 *
 * @example
 * ```typescript
 * const prompt = buildVisualSearchPrompt(
 *   "A majestic lion roams the savanna at sunset"
 * );
 * const llm = createLLMProvider();
 * const response = await llm.chat([{ role: 'user', content: prompt }]);
 * const analysis = JSON.parse(response);
 * ```
 */
export function buildVisualSearchPrompt(sceneText: string): string {
  return VISUAL_SEARCH_PROMPT.replace('{sceneText}', sceneText);
}
