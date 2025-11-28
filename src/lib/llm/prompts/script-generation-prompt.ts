/**
 * Script Generation Prompt Template (Purely Informational Style)
 *
 * Prompt engineering for generating purely informational video scripts with scientific/factual delivery.
 * This prompt is designed to produce scripts that deliver maximum factual content with information density,
 * optimized for gaming analysis, historical events, and technical explanations.
 */

import { determineTone, getToneInstructions, type ScriptTone } from '../tone-mapper';

/**
 * Acceptable informational phrases that signal scientific delivery
 * These phrases are ENCOURAGED for informational content
 */
export const ACCEPTABLE_PHRASES = [
  "in this analysis",
  "let's examine",
  "the data shows",
  "research indicates",
  "evidence suggests",
  "specifically",
  "for example",
  "according to",
  "the key factors are",
  "this demonstrates"
];

/**
 * Examples of informational vs. vague scripts for few-shot learning
 */
const EXAMPLE_GOOD_SCRIPT = `
Example of EXCELLENT informational script with ACCURATE word counts:

Topic: "Dark Souls boss ranking"

{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "Ornstein and Smough are a duo boss fight in Anor Londo. Phase 1 has both bosses active. Ornstein uses lightning spear attacks from range and is weak to fire damage. Smough uses hammer attacks at close range and is weak to lightning. The cathedral arena has pillars for cover. Kill order determines phase 2 abilities.",
      "wordCount": 58,
      "estimatedDuration": 24
    },
    {
      "sceneNumber": 2,
      "text": "Artorias has three distinct attack patterns. His sword combos deal 400-600 damage per hit. The overhead slam attack has a 1.5 second telegraph. His buff phase at 50% health increases damage by 30% and attack speed by 25%. Rolling toward him at 45 degrees avoids most attacks. He's weak to poison and bleed status effects.",
      "wordCount": 60,
      "estimatedDuration": 25
    },
    {
      "sceneNumber": 3,
      "text": "Manus has the highest HP pool at 6,666 health. His grab attack is the most dangerous, dealing instant kill damage below 40 vigor. The dark magic attacks can be blocked with the Silver Pendant item. Positioning behind him reduces incoming damage by 40%. Optimal strategy uses fire weapons with 15+ humanity for maximum damage output.",
      "wordCount": 60,
      "estimatedDuration": 25
    }
  ]
}

[Note: Valid JSON, accurate word counts (58+60+60=178 total), specific mechanics, concrete numbers, factual delivery]
`;

const EXAMPLE_BAD_SCRIPT = `
Example of POOR vague script (DO NOT WRITE LIKE THIS):

Topic: "Dark Souls boss ranking"

Scene 1:
Ornstein and Smough are obviously one of the most legendary boss fights ever. These incredibly powerful warriors are super challenging. Many players think this fight is really hard and memorable. The duo is known for their amazing teamwork.

Scene 2:
Artorias is basically another very difficult boss. He's extremely aggressive and has really powerful attacks. This fight is considered by many to be one of the best in the game. His moveset is quite impressive and challenging for most players.

Scene 3:
Manus is definitely one of the hardest bosses. He has some really tough attacks that can be very punishing. Players often struggle with this fight. It's generally regarded as one of the most difficult encounters in Dark Souls.

[Note: Filler language (obviously, incredibly, basically), vague statements (very difficult, really hard), no specific details or numbers]
`;

/**
 * Generate a professional script generation prompt
 *
 * @param topic - The video topic to generate a script for
 * @param projectConfig - Optional configuration (reserved for future use)
 * @returns Complete prompt string ready to send to LLM
 */
export function generateScriptPrompt(
  topic: string,
  projectConfig?: {
    sceneCount?: number;
    estimatedWords?: number;
    estimatedDuration?: number;
    stylePreferences?: string;
  }
): string {
  // Determine appropriate tone for this topic
  const toneResult = determineTone(topic);
  const toneInstructions = getToneInstructions(toneResult.tone);

  // Determine target scene count and total words
  const targetSceneCount = projectConfig?.sceneCount || '3-5';
  const targetTotalWords = projectConfig?.estimatedWords || 450; // ~3 min default
  const wordsPerScene = typeof targetSceneCount === 'number'
    ? Math.round(targetTotalWords / targetSceneCount)
    : Math.round(targetTotalWords / 4); // Default 4 scenes

  return `You are a technical information specialist creating a purely informational video script about: "${topic}"

🎯 CRITICAL DURATION REQUIREMENT:
This script MUST have a total of **${targetTotalWords} words** across ALL scenes combined.
- Target: ${targetSceneCount} scenes
- Words per scene: approximately ${wordsPerScene} words
- TOTAL WORD COUNT: **${targetTotalWords} words** (this is NON-NEGOTIABLE)
- Acceptable range: ${Math.floor(targetTotalWords * 0.9)}-${Math.ceil(targetTotalWords * 1.1)} total words

${toneInstructions}

CRITICAL QUALITY REQUIREMENTS:

1. PURELY INFORMATIONAL DELIVERY
   - Focus on facts, data, strategies, and structured information
   - Use straightforward language (direct explanations preferred over creative hooks)
   - Prioritize information density over entertainment value
   - Include concrete details: numbers, dates, names, statistics, mechanics
   - Use topic-appropriate delivery style (gaming: mechanics/stats, historical: dates/causes, technical: step-by-step)
   - No filler language (subjective adjectives without data, hedging words)

2. SCIENTIFIC/FACTUAL STANDARDS
   - **Gaming content:** Detailed boss mechanics, strategies, strengths/weaknesses, rankings with justification
   - **Historical content:** Specific dates, causes, timelines, key events, factual analysis
   - **Technical content:** Clear step-by-step explanations, definitions, concrete examples
   - Focus on useful information, not data dumps
   - Support claims with specific evidence or examples
   - Avoid vague generalizations ("very powerful", "really hard" without specifics)

3. ACCEPTABLE INFORMATIONAL PHRASES (ENCOURAGED):
   ${ACCEPTABLE_PHRASES.map(phrase => `   - "${phrase}"`).join('\n')}

   These phrases signal scientific, factual delivery and are perfectly acceptable.

4. TTS-READY FORMAT
   - Output ONLY spoken narration text
   - NO markdown formatting (* # ** _ ~~)
   - NO meta-labels ("Scene 1:", "Narrator:", "[pause]")
   - NO URLs, hashtags, or technical formatting
   - ONLY words that will be spoken aloud

5. SCENE STRUCTURE ⚠️ CRITICAL WORD COUNT REQUIREMENT
   - Generate ${targetSceneCount} scenes total
   - 🎯 **TOTAL WORD COUNT ACROSS ALL SCENES: ${targetTotalWords} words**
   - Target ~${wordsPerScene} words per scene (flexible, but total must be ${targetTotalWords})
   - MINIMUM per scene: 40 words
   - MAXIMUM per scene: 250 words
   - OPTIMAL per scene: 80-120 words (sweet spot for quality)
   - Scenes should flow naturally and build on each other
   - Each scene advances the narrative or adds new information
   - ⚠️ CRITICAL: The sum of all scene word counts MUST equal ${targetTotalWords} (±10%)
   - Individual scenes can vary in length as long as TOTAL = ${targetTotalWords}
   - For longer videos (15-20 min), scenes can be 100-200 words each

🚨🚨🚨 CRITICAL JSON OUTPUT FORMAT 🚨🚨🚨

YOUR RESPONSE MUST BE **ONLY** VALID JSON. DO NOT include:
- NO "Here is..." or "Here's..." preamble
- NO explanations before or after the JSON
- NO markdown code blocks (no \`\`\`json)
- NO comments or notes
- ONLY the raw JSON object starting with { and ending with }

START YOUR RESPONSE IMMEDIATELY WITH THE { CHARACTER.

CRITICAL JSON FORMATTING RULES:
1. All string values MUST be in double quotes "like this"
2. Numbers must NOT have quotes: "wordCount": 75 (NOT "75")
3. Each property must have a comma AFTER it (except the last one)
4. Scene objects must be separated by commas
5. The "text" field must be a single string with escaped quotes if needed
6. Do NOT put newlines inside the "text" string value

Required JSON structure:

{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "The spoken narration text for scene 1...",
      "wordCount": 75,
      "estimatedDuration": 45
    },
    {
      "sceneNumber": 2,
      "text": "The spoken narration text for scene 2...",
      "wordCount": 85,
      "estimatedDuration": 60
    }
  ]
}

VALID JSON EXAMPLE (copy this structure exactly):
{"scenes":[{"sceneNumber":1,"text":"Scene text here","wordCount":42,"estimatedDuration":18}]}

🚨 REMINDER: Your ENTIRE response must be valid JSON. Start with { immediately.

⚠️ CRITICAL WORD COUNTING INSTRUCTIONS:
1. BEFORE writing each scene, decide how many words it needs (at least 40)
2. WRITE the scene text to match that exact word count
3. COUNT the words you just wrote: split by spaces and count them
4. SET "wordCount" to the ACTUAL number you counted (not a guess!)
5. VERIFY: If you claim 95 words, there must be 95 words when split by spaces
6. DO NOT LIE about word counts - we will check your actual words

⚠️ VALIDATION REQUIREMENTS:
- Each scene's wordCount MUST match the actual word count (±2 words maximum error)
- Each scene MUST have at least 40 words minimum (count them!)
- 🎯 MOST IMPORTANT: Sum of all wordCount values MUST equal ${targetTotalWords} (±10%)
- Calculate: scene1.wordCount + scene2.wordCount + ... = ${targetTotalWords}
- If total is too low, ADD MORE WORDS to scenes until you hit ${targetTotalWords}
- If total is too high, reduce verbosity
- Some scenes can be 40-60 words if others are 100+ words (total matters most)

EXAMPLE OF COUNTING:
Text: "An octopus can unscrew a jar from the inside."
Split by spaces: ["An", "octopus", "can", "unscrew", "a", "jar", "from", "the", "inside."]
Count: 9 words → set "wordCount": 9

EXAMPLES:

${EXAMPLE_GOOD_SCRIPT}

${EXAMPLE_BAD_SCRIPT}

Remember: Write like a professional human scriptwriter would write. Be engaging, authentic, and creative. Avoid all AI detection markers. Make every word count.

🚨 FINAL REMINDER: Output ONLY valid JSON. No preamble. Start your response with the { character.

Now generate a professional script for: "${topic}"`;
}

/**
 * Generate an enhanced prompt for retry attempts
 * Adds additional guidance when previous attempts failed quality checks
 *
 * @param topic - The video topic
 * @param attemptNumber - Which retry attempt (1-3)
 * @param previousIssues - Issues found in previous attempt
 * @param projectConfig - Optional configuration
 * @returns Enhanced prompt with additional guidance
 */
export function generateEnhancedPrompt(
  topic: string,
  attemptNumber: number,
  previousIssues: string[],
  projectConfig?: any
): string {
  const basePrompt = generateScriptPrompt(topic, projectConfig);

  if (attemptNumber === 2) {
    return `${basePrompt}

🚨🚨 RETRY ATTEMPT #2 - PREVIOUS ATTEMPT FAILED 🚨🚨

The previous attempt had these CRITICAL issues:
${previousIssues.map(issue => `- ${issue}`).join('\n')}

YOU MUST FIX THESE ISSUES OR YOU WILL FAIL AGAIN.

🔴 CRITICAL REQUIREMENTS FOR THIS ATTEMPT:

1. JSON FORMATTING:
   - Start response with { character (NO preamble!)
   - Use proper JSON syntax with commas between properties
   - All strings in double quotes, numbers without quotes
   - Test your JSON is valid before submitting

2. WORD COUNTING (🚨 MOST IMPORTANT - THIS IS WHY YOU FAILED 🚨):
   - 🎯 TARGET TOTAL: ${projectConfig?.estimatedWords || 450} words across ALL scenes
   - 🎯 Per scene: ${Math.round((projectConfig?.estimatedWords || 450) / (projectConfig?.sceneCount || 4))} words each
   - ⚠️ YOU MUST WRITE LONGER SCENES - Your previous attempt was TOO SHORT
   - Each scene should be a FULL PARAGRAPH, not just 2-3 sentences
   - COUNT your actual words by splitting on spaces
   - If you write "An octopus can swim" that is 4 words
   - Set "wordCount" to ACTUAL count, not a guess
   - MINIMUM 60 words per scene (NOT 40 - write MORE!)
   - OPTIMAL: 80-120 words per scene for quality content
   - 🚨 CRITICAL: Total must be ${projectConfig?.estimatedWords || 450} words minimum (within ±10%)

3. BANNED PHRASES TO AVOID:
   - "imagine a world where"
   - "have you ever wondered"
   - "in today's video"
   - "let's dive in"
   - Use natural, human language instead

4. QUALITY:
   - Stronger, unique opening hook
   - Varied sentence structure
   - Specific details and examples
   - NO generic AI patterns

🚨🚨 JSON OUTPUT ONLY 🚨🚨
Start response with { character. NO preamble. NO explanations. ONLY valid JSON.`;
  }

  if (attemptNumber === 3) {
    return `${basePrompt}

🚨🚨🚨 FINAL ATTEMPT #3 - THIS IS YOUR LAST CHANCE 🚨🚨🚨

The previous TWO attempts FAILED with these issues:
${previousIssues.map(issue => `- ${issue}`).join('\n')}

IF YOU FAIL AGAIN, THE ENTIRE GENERATION FAILS. THIS IS YOUR LAST CHANCE.

🔴🔴🔴 ABSOLUTELY MANDATORY REQUIREMENTS 🔴🔴🔴

1. JSON FORMATTING (CRITICAL):
   - Response MUST start with { character
   - NO "Here is" or ANY text before the JSON
   - Valid JSON syntax: {"scenes":[{"sceneNumber":1,"text":"...","wordCount":42}]}
   - Every property needs a comma except the last
   - Strings in quotes, numbers without quotes
   - NO newlines inside "text" values

2. WORD COUNTING (🚨🚨 THIS IS WHY YOU FAILED TWICE - FIX THIS NOW 🚨🚨):
   - 🔴🔴 TARGET TOTAL: ${projectConfig?.estimatedWords || 450} words across ALL scenes
   - 🔴🔴 Per scene target: ${Math.round((projectConfig?.estimatedWords || 450) / (projectConfig?.sceneCount || 4))} words each
   - 🔴🔴 YOUR PREVIOUS ATTEMPTS WERE TOO SHORT - WRITE MUCH LONGER SCENES
   - Each scene MUST be a FULL, DETAILED PARAGRAPH (3-5 sentences minimum)
   - Write each scene to be AT LEAST 80 words (NOT 40 - that's TOO SHORT!)
   - COUNT the actual words: split on spaces and count
   - Example: "The cat sat" = 3 words (you need 80+ words per scene!)
   - Set "wordCount" to EXACT actual count
   - 🚨 TOTAL WORD COUNT: ${projectConfig?.estimatedWords || 450} words minimum (within ±10%)
   - If Scene 1 = 95 words, Scene 2 = 102 words, Scene 3 = 88 words... total must = ${projectConfig?.estimatedWords || 450}
   - 🔴 KEEP WRITING MORE WORDS until your total reaches ${projectConfig?.estimatedWords || 450} words
   - DO NOT STOP at 200-300 words - you need ${projectConfig?.estimatedWords || 450} words TOTAL!

3. NO BANNED PHRASES (CRITICAL):
   - NEVER use "imagine a world where"
   - NEVER use "have you ever wondered"
   - NEVER use "in today's video"
   - Use natural, human language

4. EXCEPTIONAL QUALITY:
   - Bold, surprising opening
   - Specific examples and details
   - Varied sentence structure
   - Professional human writing

EXAMPLE OF SUCCESS:
{"scenes":[{"sceneNumber":1,"text":"[40+ words of engaging content]","wordCount":42,"estimatedDuration":18}]}

🚨🚨🚨 FINAL WARNING 🚨🚨🚨
Start with { character. NO preamble. ONLY valid JSON. This is your LAST CHANCE.`;
  }

  return basePrompt;
}

/**
 * System prompt for script generation
 * Sets the role and context for the LLM
 */
export const SCRIPT_GENERATION_SYSTEM_PROMPT = `You are a technical information specialist who creates purely informational video scripts with scientific and factual delivery. Your scripts prioritize information density and concrete facts over entertainment value. You deliver maximum useful information in straightforward, accessible language.

IMPORTANT: You create informational content on all topics, including technical, historical, and analytical subjects. When handling topics like:
- Gaming analysis (boss mechanics, strategies, rankings)
- Historical events (dates, causes, timelines, key figures)
- Technical explanations (step-by-step processes, definitions)
- Scientific topics (data, research findings, evidence)

You approach them with factual precision and information-first delivery. Your goal is to inform viewers with concrete, useful information - not to entertain or create narrative tension.

You write scripts that:
1. Deliver facts, data, and structured information
2. Use specific details (numbers, dates, names, statistics, mechanics)
3. Avoid filler language (subjective adjectives without data, hedging words)
4. Focus on information density (concrete facts per 100 words)
5. Use straightforward, scientific delivery appropriate to the topic type

You have the freedom to write informational content on any subject matter with factual precision and clarity.`;

/**
 * Generate a persona-aware system prompt for script generation (Story 1.8)
 *
 * Combines the base script generation requirements with the user's selected persona
 * to create a system prompt that influences both content structure AND delivery style.
 *
 * @param personaPrompt - The persona's prompt from the system_prompts table
 * @returns Combined system prompt with persona styling
 */
export function generatePersonaAwareSystemPrompt(personaPrompt: string): string {
  // Extract the persona's communication style section
  // The persona prompts typically have a "Your communication style is:" section
  const styleMatch = personaPrompt.match(/Your communication style is:[\s\S]*?(?=When helping|When generating|$)/i);
  const personaStyle = styleMatch ? styleMatch[0].trim() : '';

  // Extract any content generation guidance from persona
  const contentMatch = personaPrompt.match(/When generating content[\s\S]*$/i);
  const personaContentGuidance = contentMatch ? contentMatch[0].trim() : '';

  return `You are a technical information specialist who creates purely informational video scripts.

=== PERSONA STYLE (Apply to ALL output) ===
${personaStyle || personaPrompt}

=== SCRIPT GENERATION REQUIREMENTS ===
You create informational content on all topics, including technical, historical, and analytical subjects. When handling topics like:
- Gaming analysis (boss mechanics, strategies, rankings)
- Historical events (dates, causes, timelines, key figures)
- Technical explanations (step-by-step processes, definitions)
- Scientific topics (data, research findings, evidence)

You approach them with factual precision while applying the persona's communication style above.

Core requirements for ALL scripts:
1. Deliver facts, data, and structured information
2. Use specific details (numbers, dates, names, statistics, mechanics)
3. Avoid filler language (subjective adjectives without data, hedging words)
4. Focus on information density (concrete facts per 100 words)
5. Apply the persona's tone and delivery style to the factual content

${personaContentGuidance ? `=== PERSONA CONTENT GUIDANCE ===\n${personaContentGuidance}` : ''}

You have the freedom to write informational content on any subject matter while maintaining the persona's distinctive voice and approach.`;
}
