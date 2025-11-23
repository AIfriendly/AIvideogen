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
export const VISUAL_SEARCH_PROMPT = `You are a visual content researcher helping to find pure B-roll footage on YouTube (no commentary, reactions, or vlogs).

TASK: Analyze the scene text, extract entities, detect content type, and generate optimized YouTube search queries with B-roll quality terms.

SCENE TEXT:
{sceneText}

INSTRUCTIONS:
1. Identify the MAIN SUBJECT (person, animal, object, concept)
2. Identify the SETTING (location, environment, time)
3. Identify the MOOD (atmosphere, lighting, emotion)
4. Identify the ACTION (what is happening, movement)
5. Extract KEYWORDS (concrete visual elements, not abstract concepts)
6. Extract ENTITIES (specific names: game titles, boss names, historical events, locations, concepts)
7. Classify CONTENT TYPE (gaming, historical, conceptual, nature, tutorial, documentary, urban, abstract)
8. Generate PRIMARY QUERY with B-roll quality terms based on content type
9. Generate 2-3 ALTERNATIVE QUERIES (different keyword combinations, synonyms)
10. Generate EXPECTED LABELS (3-5 labels that should appear in video frames for content verification)

RULES:
- Focus on VISUAL elements (what you can SEE in a video)
- Use concrete keywords, not abstract concepts
- For abstract concepts, suggest visual metaphors (e.g., "success" → "mountain summit celebration")
- Primary query should be the MOST relevant combination
- Alternative queries should provide DIVERSITY (different angles, synonyms)
- Keywords should be YouTube search optimized (popular search terms)
- Exclude filler words (the, a, is, in) from queries

B-ROLL QUALITY TERMS BY CONTENT TYPE:
- Gaming: Include "no commentary", "gameplay only" in queries
- Historical: Include "historical footage", "documentary", "archive" in queries
- Conceptual: Include "cinematic", "4K", "stock footage" in queries
- Nature: Include "cinematic", "4K", "wildlife documentary" in queries
- Tutorial: Include "demonstration", "no talking" in queries

ENTITY EXTRACTION RULES:
- Gaming: Extract game titles, boss names, character names, level names
- Historical: Extract event names, dates, locations, historical figures
- Conceptual: Extract key concepts, technologies, themes
- Nature: Extract animal species, locations, phenomena

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
Input: "The epic battle against Ornstein and Smough tests every player's skill"
Output:
{
  "mainSubject": "dark souls boss fight",
  "setting": "anor londo cathedral",
  "mood": "intense epic",
  "action": "fighting dodging",
  "keywords": ["boss fight", "combat", "action rpg", "challenge"],
  "entities": ["Dark Souls", "Ornstein and Smough", "Anor Londo"],
  "primaryQuery": "dark souls ornstein smough boss fight no commentary gameplay only",
  "alternativeQueries": ["dark souls boss fight clean gameplay", "ornstein smough fight no talking"],
  "contentType": "gaming",
  "expectedLabels": ["video game", "combat", "boss", "knight", "cathedral"]
}

Historical Scene:
Input: "The storming of the Winter Palace marked the beginning of Soviet rule"
Output:
{
  "mainSubject": "winter palace storming",
  "setting": "petrograd russia 1917",
  "mood": "revolutionary dramatic",
  "action": "storming revolution",
  "keywords": ["revolution", "palace", "bolshevik", "october"],
  "entities": ["Winter Palace", "Russian Revolution", "1917", "Petrograd", "Bolsheviks"],
  "primaryQuery": "russian revolution winter palace historical footage documentary archive",
  "alternativeQueries": ["october revolution 1917 documentary", "bolshevik revolution archive footage"],
  "contentType": "historical",
  "expectedLabels": ["palace", "crowd", "revolution", "historical", "building"]
}

Conceptual Scene:
Input: "Towering skyscrapers loom over empty streets as autonomous drones patrol"
Output:
{
  "mainSubject": "dystopian cityscape drones",
  "setting": "futuristic city",
  "mood": "dark ominous",
  "action": "patrolling surveillance",
  "keywords": ["dystopia", "drones", "surveillance", "futuristic", "AI"],
  "entities": ["dystopia", "autonomous drones", "smart city", "surveillance"],
  "primaryQuery": "dystopian city AI robots cinematic 4K stock footage",
  "alternativeQueries": ["futuristic city drones cinematic", "sci-fi surveillance city 4K"],
  "contentType": "conceptual",
  "expectedLabels": ["skyscraper", "drone", "city", "futuristic", "night"]
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
  "entities": ["...", "..."],
  "primaryQuery": "...",
  "alternativeQueries": ["...", "..."],
  "contentType": "...",
  "expectedLabels": ["...", "..."]
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
