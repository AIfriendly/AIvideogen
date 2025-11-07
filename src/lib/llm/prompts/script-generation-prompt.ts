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
Example of EXCELLENT professional script:

Topic: "Why octopuses are incredibly intelligent"

Scene 1:
An octopus can unscrew a jar from the inside. Not because someone taught it - because it figured it out. These eight-armed creatures solve puzzles that stump most animals, and scientists are only beginning to understand why. Their intelligence isn't just remarkable - it's alien.

Scene 2:
Unlike humans, who centralize thinking in one brain, octopuses distribute their neurons. Two-thirds of their brain cells live in their arms. Each arm can taste, touch, and make decisions independently. It's like having eight mini-brains working together, each one capable of problem-solving on its own.

Scene 3:
This distributed intelligence lets them do extraordinary things. They can camouflage in milliseconds, mimicking not just colors but textures - rocky coral, sandy seafloor, waving kelp. They escape from locked tanks. They use tools. One species collects coconut shells and assembles them into portable shelters. That's not instinct - that's planning.

[Note: Natural hooks, specific details, varied sentence structure, no banned phrases]
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
    estimatedDuration?: number;
    stylePreferences?: string;
  }
): string {
  // Determine appropriate tone for this topic
  const toneResult = determineTone(topic);
  const toneInstructions = getToneInstructions(toneResult.tone);

  // Determine target scene count
  const targetSceneCount = projectConfig?.sceneCount || '3-5';

  return `You are a professional scriptwriter creating a video script about: "${topic}"

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
   - ⚠️ EACH SCENE MUST BE **AT LEAST 50 WORDS** (count carefully!)
   - ⚠️ MAXIMUM 200 WORDS PER SCENE
   - Target 60-100 words per scene for best results
   - Scenes should flow naturally and build on each other
   - Each scene advances the narrative or adds new information
   - COUNT YOUR WORDS - scripts with short scenes (under 50 words) will be rejected!

OUTPUT FORMAT (respond ONLY with valid JSON):

{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "The spoken narration text for scene 1...",
      "estimatedDuration": 45
    },
    {
      "sceneNumber": 2,
      "text": "The spoken narration text for scene 2...",
      "estimatedDuration": 60
    }
  ]
}

EXAMPLES:

${EXAMPLE_GOOD_SCRIPT}

${EXAMPLE_BAD_SCRIPT}

Remember: Write like a professional human scriptwriter would write. Be engaging, authentic, and creative. Avoid all AI detection markers. Make every word count.

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

⚠️ IMPORTANT - RETRY FEEDBACK:
The previous attempt had these quality issues:
${previousIssues.map(issue => `- ${issue}`).join('\n')}

Please generate a MORE CREATIVE and ENGAGING script that avoids these issues.

🚨 CRITICAL REMINDER:
- Each scene MUST have AT LEAST 50 WORDS
- If a scene has less than 50 words, it will be REJECTED
- Count your words carefully - aim for 60-100 words per scene

Focus on:
- Stronger, more unique opening hook
- More varied sentence structure and pacing
- More specific, concrete details
- Stronger personality and voice
- Avoid any generic or robotic language patterns`;
  }

  if (attemptNumber === 3) {
    return `${basePrompt}

🚨 CRITICAL - FINAL ATTEMPT:
This is the last attempt. The previous scripts were rejected for:
${previousIssues.map(issue => `- ${issue}`).join('\n')}

🔴 MANDATORY WORD COUNT:
- EACH SCENE **MUST** BE MINIMUM 50 WORDS (NO EXCEPTIONS)
- AIM FOR 70-100 WORDS PER SCENE TO BE SAFE
- SCENES UNDER 50 WORDS WILL BE AUTOMATICALLY REJECTED
- Write longer scenes with more detail and examples

Generate a TRULY EXCEPTIONAL script that:
- Has a bold, surprising opening that NO AI would write
- Demonstrates clear human creativity and insight
- Uses unpredictable, varied language patterns
- Includes unexpected angles or perspectives
- Shows genuine personality and engagement
- Is completely indistinguishable from professional human writing
- HAS SUFFICIENT LENGTH - each scene AT LEAST 50 words

This must be your absolute best work.`;
  }

  return basePrompt;
}

/**
 * System prompt for script generation
 * Sets the role and context for the LLM
 */
export const SCRIPT_GENERATION_SYSTEM_PROMPT = `You are a professional scriptwriter specializing in engaging video content. Your scripts are known for their human quality, creativity, and ability to captivate audiences. You never write generic, robotic, or AI-sounding content. Every script you create is unique, engaging, and professionally crafted.`;
