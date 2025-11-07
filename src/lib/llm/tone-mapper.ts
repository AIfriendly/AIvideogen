/**
 * Tone Mapper - Topic-Based Tone Determination
 *
 * Analyzes a video topic and determines the most appropriate tone for script generation.
 * This ensures that scripts match the expected style for different content types.
 */

/**
 * Supported script tones for video generation
 */
export type ScriptTone =
  | 'educational'
  | 'entertaining'
  | 'dramatic'
  | 'casual'
  | 'formal'
  | 'inspirational';

/**
 * Result of tone determination including confidence score
 */
export interface ToneResult {
  tone: ScriptTone;
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * Keywords associated with each tone category
 */
const TONE_KEYWORDS: Record<ScriptTone, string[]> = {
  educational: [
    'learn', 'tutorial', 'how to', 'explain', 'understand', 'science',
    'history', 'guide', 'lesson', 'teach', 'study', 'knowledge',
    'education', 'theory', 'concept', 'principle', 'research', 'analysis',
    'facts', 'discover', 'explore', 'investigate', 'academic', 'school',
    'quantum', 'computing', 'works', 'machine learning', 'python', 'programming'
  ],
  entertaining: [
    'funny', 'comedy', 'humor', 'entertainment', 'fun', 'game',
    'movie', 'tv show', 'celebrity', 'viral', 'trending', 'meme',
    'prank', 'challenge', 'reaction', 'top 10', 'best', 'worst',
    'amazing', 'crazy', 'weird', 'bizarre', 'shocking', 'twist',
    'fails', 'compilation', 'tiktok', 'cat videos'
  ],
  dramatic: [
    'mystery', 'thriller', 'crime', 'investigation', 'murder', 'death',
    'war', 'conflict', 'battle', 'disaster', 'tragedy', 'horror',
    'suspense', 'danger', 'threat', 'conspiracy', 'secret', 'dark',
    'survival', 'escape', 'rescue', 'catastrophe'
  ],
  casual: [
    'chat', 'talk', 'discuss', 'opinion', 'thoughts', 'everyday',
    'lifestyle', 'routine', 'tips', 'tricks', 'hacks', 'advice',
    'personal', 'vlog', 'update', 'story', 'experience', 'journey',
    'simple', 'easy', 'quick', 'basic'
  ],
  formal: [
    'business', 'professional', 'corporate', 'legal', 'finance',
    'economics', 'politics', 'government', 'policy', 'regulation',
    'industry', 'market', 'analysis', 'report', 'statement',
    'official', 'technical', 'engineering', 'medical', 'scientific',
    'strategies', 'implications', 'economic', 'breakthrough', 'tribunal'
  ],
  inspirational: [
    'motivate', 'inspire', 'success', 'achievement', 'dream', 'goal',
    'overcome', 'triumph', 'transform', 'change', 'growth', 'mindset',
    'positive', 'hope', 'believe', 'courage', 'strength', 'perseverance',
    'journey', 'story', 'hero', 'champion', 'winner', 'rise'
  ]
};

/**
 * Tone-specific prompt modifications for script generation
 */
export const TONE_INSTRUCTIONS: Record<ScriptTone, string> = {
  educational: `
Tone: Educational and Clear
- Use clear, explanatory language with concrete examples
- Break down complex concepts into digestible pieces
- Include analogies and relatable comparisons
- Maintain an authoritative yet approachable voice
- Build knowledge progressively from simple to complex
- Use "you" to make it feel like a conversation, not a lecture
`,
  entertaining: `
Tone: Entertaining and Engaging
- Use humor, personality, and conversational language
- Include playful observations and witty commentary
- Keep energy high with dynamic pacing
- Use vivid, colorful descriptions
- Add surprising twists or unexpected angles
- Make it feel like chatting with a fun, knowledgeable friend
`,
  dramatic: `
Tone: Dramatic and Suspenseful
- Build tension and stakes throughout the narrative
- Use evocative, emotional language
- Create atmosphere with sensory details
- Employ short, impactful sentences for tension
- Reveal information strategically to maintain suspense
- Make the viewer feel the weight and significance
`,
  casual: `
Tone: Casual and Relatable
- Use friendly, approachable language
- Keep it conversational like talking to a friend
- Include personal touches and relatable examples
- Don't be afraid of contractions and natural speech patterns
- Make it feel authentic and unscripted
- Focus on practical, everyday relevance
`,
  formal: `
Tone: Formal and Professional
- Use precise, authoritative language
- Maintain objectivity and credibility
- Include specific data, facts, and expert perspectives
- Structure information logically and systematically
- Avoid slang or overly casual expressions
- Focus on accuracy and professionalism
`,
  inspirational: `
Tone: Inspirational and Uplifting
- Use emotionally resonant, uplifting language
- Focus on transformation, growth, and possibility
- Include powerful stories of overcoming challenges
- Build momentum towards a hopeful message
- Use aspirational language that motivates action
- Make the viewer feel empowered and capable
`
};

/**
 * Determine the most appropriate tone for a given topic
 *
 * @param topic - The video topic to analyze
 * @returns ToneResult with the determined tone, confidence score, and reasoning
 *
 * @example
 * ```typescript
 * const result = determineTone("How quantum computing works");
 * // Returns: { tone: 'educational', confidence: 0.85, reasoning: '...' }
 * ```
 */
export function determineTone(topic: string): ToneResult {
  const normalizedTopic = topic.toLowerCase();
  const scores: Record<ScriptTone, number> = {
    educational: 0,
    entertaining: 0,
    dramatic: 0,
    casual: 0,
    formal: 0,
    inspirational: 0
  };

  // Count keyword matches for each tone
  for (const [tone, keywords] of Object.entries(TONE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedTopic.includes(keyword)) {
        scores[tone as ScriptTone] += 1;
      }
    }
  }

  // Find the tone with the highest score
  let maxScore = 0;
  let selectedTone: ScriptTone = 'casual'; // Default fallback

  for (const [tone, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      selectedTone = tone as ScriptTone;
    }
  }

  // Calculate confidence based on score distribution
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;

  // Generate reasoning
  const matchedKeywords = TONE_KEYWORDS[selectedTone].filter(keyword =>
    normalizedTopic.includes(keyword)
  );

  const reasoning = totalScore > 0
    ? `Topic contains ${matchedKeywords.length} ${selectedTone} keywords: ${matchedKeywords.slice(0, 3).join(', ')}`
    : 'No strong tone indicators found, defaulting to casual tone';

  return {
    tone: selectedTone,
    confidence: Math.min(confidence, 1.0),
    reasoning
  };
}

/**
 * Get tone-specific instructions for prompt generation
 *
 * @param tone - The script tone
 * @returns Tone-specific instructions for the LLM
 */
export function getToneInstructions(tone: ScriptTone): string {
  return TONE_INSTRUCTIONS[tone];
}
