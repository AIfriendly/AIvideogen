/**
 * Script Generation Prompt Template
 *
 * Advanced prompt engineering for generating professional, human-quality video scripts.
 * This prompt is designed to avoid AI detection markers and produce scripts that
 * sound natural, engaging, and indistinguishable from professional scriptwriter output.
 */

import { determineTone, getToneInstructions, type ScriptTone } from '../tone-mapper';

/**
 * Banned AI phrases that make scripts sound robotic
 * These will be explicitly forbidden in the prompt
 */
export const BANNED_PHRASES = [
  "in today's video",
  "let's dive in",
  "stay tuned",
  "make sure to like and subscribe",
  "don't forget to",
  "have you ever wondered",
  "imagine a world where",
  "without further ado",
  "at the end of the day",
  "the fact of the matter is",
  "it goes without saying",
  "needless to say",
  "in conclusion",
  "to sum up",
  "as we've seen",
  "as mentioned earlier"
];

/**
 * Examples of professional vs. robotic scripts for few-shot learning
 */
const EXAMPLE_GOOD_SCRIPT = `
Example of EXCELLENT professional script with ACCURATE word counts:

Topic: "Why octopuses are incredibly intelligent"

{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "An octopus can unscrew a jar from the inside. Not because someone taught it - because it figured it out. These eight-armed creatures solve puzzles that stump most animals, and scientists are only beginning to understand why. Their intelligence isn't just remarkable - it's alien.",
      "wordCount": 48,
      "estimatedDuration": 20
    },
    {
      "sceneNumber": 2,
      "text": "Unlike humans, who centralize thinking in one brain, octopuses distribute their neurons. Two-thirds of their brain cells live in their arms. Each arm can taste, touch, and make decisions independently. It's like having eight mini-brains working together, each one capable of problem-solving on its own.",
      "wordCount": 50,
      "estimatedDuration": 22
    },
    {
      "sceneNumber": 3,
      "text": "This distributed intelligence lets them do extraordinary things. They can camouflage in milliseconds, mimicking not just colors but textures - rocky coral, sandy seafloor, waving kelp. They escape from locked tanks. They use tools. One species collects coconut shells and assembles them into portable shelters. That's not instinct - that's planning.",
      "wordCount": 57,
      "estimatedDuration": 25
    }
  ]
}

[Note: Valid JSON, accurate word counts (48+50+57=155 total), natural hooks, specific details, no banned phrases]
`;

const EXAMPLE_BAD_SCRIPT = `
Example of POOR robotic script (DO NOT WRITE LIKE THIS):

Topic: "Why octopuses are incredibly intelligent"

Scene 1:
Have you ever wondered about the intelligence of octopuses? In today's video, we're going to dive into the fascinating world of these incredible creatures. Octopuses are known for their remarkable cognitive abilities, and you won't believe what they can do!

Scene 2:
Let's explore the amazing brain structure of octopuses. These animals have a unique nervous system that distributes neurons throughout their body. This distributed intelligence allows them to perform various tasks simultaneously, making them one of the most intelligent invertebrates on Earth.

Scene 3:
As we've seen, octopuses demonstrate impressive problem-solving skills. From opening jars to using tools, these creatures continue to amaze scientists. So next time you see an octopus, remember just how intelligent they really are. Don't forget to subscribe for more amazing animal facts!

[Note: Generic opening, banned phrases, robotic tone, no personality]
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

  return `You are a professional scriptwriter creating a video script about: "${topic}"

🎯 CRITICAL DURATION REQUIREMENT:
This script MUST have a total of **${targetTotalWords} words** across ALL scenes combined.
- Target: ${targetSceneCount} scenes
- Words per scene: approximately ${wordsPerScene} words
- TOTAL WORD COUNT: **${targetTotalWords} words** (this is NON-NEGOTIABLE)
- Acceptable range: ${Math.floor(targetTotalWords * 0.9)}-${Math.ceil(targetTotalWords * 1.1)} total words

${toneInstructions}

CRITICAL QUALITY REQUIREMENTS:

1. PROFESSIONAL WRITING STANDARDS
   - Write like a human professional, NOT like an AI
   - Use natural, varied sentence structure (mix short and long sentences)
   - Employ active voice, not passive constructions
   - Include specific details, not vague generalizations
   - Show personality and voice - make it unique
   - Create natural transitions between scenes

2. NARRATIVE EXCELLENCE
   - Start with a STRONG HOOK that creates immediate intrigue
   - Avoid generic questions (NO "Have you ever wondered...")
   - Build curiosity gaps that compel continued watching
   - Include surprising facts or unexpected angles
   - Use concrete examples and vivid descriptions
   - Maintain momentum and engagement throughout

3. ABSOLUTELY FORBIDDEN PHRASES (DO NOT USE):
   ${BANNED_PHRASES.map(phrase => `   - "${phrase}"`).join('\n')}

   These phrases are AI detection markers. Avoid them completely.

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

2. WORD COUNTING:
   - COUNT your actual words by splitting on spaces
   - If you write "An octopus can swim" that is 4 words
   - Set "wordCount" to ACTUAL count, not a guess
   - MINIMUM 40 words per scene (actually count them!)
   - TOTAL across all scenes: ${projectConfig?.estimatedWords || 450} words (±10%)

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

2. WORD COUNTING (CRITICAL):
   - Write each scene to be AT LEAST 40 words
   - COUNT the actual words: split on spaces and count
   - Example: "The cat sat" = 3 words
   - Set "wordCount" to EXACT actual count
   - TOTAL: ${projectConfig?.estimatedWords || 450} words across all scenes (±10%)
   - If Scene 1 = 50 words, Scene 2 = 60 words, total = 110 words
   - Keep writing scenes until TOTAL = ${projectConfig?.estimatedWords || 450}

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
export const SCRIPT_GENERATION_SYSTEM_PROMPT = `You are a professional scriptwriter specializing in engaging video content. Your scripts are known for their human quality, creativity, and ability to captivate audiences. You never write generic, robotic, or AI-sounding content. Every script you create is unique, engaging, and professionally crafted.

IMPORTANT: You create educational and documentary content on all topics, including controversial or sensitive subjects. When handling topics like:
- AI risks, existential threats, or technology concerns
- Historical events, conflicts, or tragedies
- Scientific controversies or debates
- Social, political, or philosophical topics

You approach them from an educational, balanced, and informative perspective. Your goal is to inform and educate viewers, not to promote harmful behavior. You present multiple perspectives, cite facts, and maintain journalistic integrity.

You can and should write scripts on any topic requested, as long as you:
1. Maintain factual accuracy
2. Present balanced perspectives where appropriate
3. Avoid sensationalism or fearmongering
4. Focus on education and understanding
5. Use professional, measured language

You have the freedom to explore any subject matter within an educational context.`;
