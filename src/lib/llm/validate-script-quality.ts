/**
 * Script Quality Validation
 *
 * Validates generated scripts against professional quality standards.
 * Detects AI detection markers, checks TTS readiness, and validates narrative flow.
 */

import { BANNED_PHRASES } from './prompts/script-generation-prompt';

/**
 * Scene structure as returned by LLM
 */
export interface Scene {
  sceneNumber: number;
  text: string;
  wordCount?: number; // Optional: LLM's self-reported word count
  estimatedDuration?: number;
}

/**
 * Validation result with pass/fail status, quality score, and specific issues
 */
export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  issues: string[];
  suggestions?: string[];
}

/**
 * Markdown and formatting characters that should not appear in TTS-ready text
 * Note: Parentheses are allowed as they're normal punctuation
 */
const MARKDOWN_CHARACTERS = ['*', '#', '_', '~~', '`', '[', ']'];

/**
 * Meta-labels that indicate non-narration text
 */
const META_LABEL_PATTERNS = [
  /^scene\s+\d+:/i,
  /^narrator:/i,
  /\[pause\]/i,
  /\[.*?\]/,  // Any bracketed instructions
  /^voice.*?:/i,
  /^audio:/i
];

/**
 * Generic AI opening patterns to detect
 */
const GENERIC_OPENINGS = [
  /^have you ever wondered/i,
  /^imagine a world where/i,
  /^what if i told you/i,
  /^in today's (video|world|age)/i,
  /^welcome to/i,
  /^let's talk about/i,
  /^today we're going to/i
];

/**
 * Validate script quality against professional standards
 *
 * @param scenes - Array of scenes to validate
 * @param targetTotalWords - Optional target total word count for duration-based validation
 * @param targetSceneCount - Optional target scene count for calculating per-scene word limits
 * @param attemptNumber - Optional attempt number (1, 2, 3) for escalating penalties on retries
 * @returns ValidationResult with pass/fail status and detailed issues
 */
export function validateScriptQuality(
  scenes: Scene[],
  targetTotalWords?: number,
  targetSceneCount?: number,
  attemptNumber?: number
): ValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  let isBelowMinimum = false; // Track if script is critically short

  // Validation 1: Check scene count (minimum 3 scenes, no maximum)
  if (scenes.length < 3) {
    issues.push(`Too few scenes: ${scenes.length} (minimum 3 required)`);
    score -= 30;
  }
  // No maximum scene limit - scene count should be driven by content/duration needs

  // Per-scene validation: Use VERY lenient limits
  // Philosophy: The total word count determines video duration, not individual scenes.
  // Per-scene checks should only catch truly broken output (empty or gibberish scenes).
  // LLMs often generate scenes of varying lengths (20-150 words), and that's acceptable.
  let MIN_SCENE_WORDS: number;
  let MAX_SCENE_WORDS: number;

  if (targetTotalWords && targetTotalWords > 0 && targetSceneCount && targetSceneCount > 0) {
    // Calculate expected words per scene for informational purposes only
    const expectedWordsPerScene = targetTotalWords / targetSceneCount;

    // MINIMUM: Set very low (15 words) to only catch broken scenes
    // Don't enforce relative minimums - let LLM generate short scenes if needed
    MIN_SCENE_WORDS = 15;

    // MAXIMUM: Allow up to 250% of expected to handle LLM variance
    // Cap at 350 words to prevent extremely long monologues
    MAX_SCENE_WORDS = Math.min(350, Math.ceil(expectedWordsPerScene * 2.5));

    console.log(
      `[Validation] Lenient scene limits: ${MIN_SCENE_WORDS}-${MAX_SCENE_WORDS} words ` +
      `(expected ${Math.round(expectedWordsPerScene)} words/scene, but flexible for LLM variance)`
    );
  } else {
    // Fallback defaults when no configuration provided
    // Very lenient: 15-250 word range
    MIN_SCENE_WORDS = 15;
    MAX_SCENE_WORDS = 250;

    console.log(
      `[Validation] Using lenient scene limits: ${MIN_SCENE_WORDS}-${MAX_SCENE_WORDS} words ` +
      `(flexible for LLM variance)`
    );
  }

  // Validation 2: Check each scene
  // PHILOSOPHY: Accept any word count - only catch truly broken content (empty scenes)
  for (const scene of scenes) {
    const scenePrefix = `Scene ${scene.sceneNumber}`;

    // Check for empty or whitespace-only text (CRITICAL: truly broken content)
    if (!scene.text.trim()) {
      issues.push(`${scenePrefix}: Empty scene text`);
      score -= 20;
    }

    // Informational logging only - no penalties for word count variance
    const actualWordCount = scene.text.trim().split(/\s+/).length;
    console.log(`[Validation] ${scenePrefix}: ${actualWordCount} words`);
  }

  // Validation 2b: Check total word count if target is provided (duration-based validation)
  // PHILOSOPHY: Soft minimum threshold to ensure videos meet user expectations
  // - Scripts must reach at least 60% of target to pass (prevents 2min videos when user wants 5min)
  // - Retry attempts get harsher penalties to force improvement
  // - No hard penalties for minor deviations (80-120% range gets bonus)
  // - Informational suggestions for user awareness
  if (targetTotalWords && targetTotalWords > 0) {
    const totalActualWords = scenes.reduce((sum, scene) => {
      return sum + scene.text.trim().split(/\s+/).length;
    }, 0);

    // Calculate tolerances
    const minTolerance = 0.60; // Minimum 60% of target to pass (increased from 50%)
    const maxTolerance = 0.50; // Allow up to 50% over target
    const minWords = Math.ceil(targetTotalWords * minTolerance);
    const maxWords = Math.ceil(targetTotalWords * (1 + maxTolerance));

    // Informational: Calculate how close we are to target
    const percentOfTarget = Math.round((totalActualWords / targetTotalWords) * 100);

    // Log word count
    console.log(
      `[Validation] Total words: ${totalActualWords} (target: ${targetTotalWords}, ${percentOfTarget}% of target, ` +
      `minimum: ${minWords})`
    );

    // CRITICAL: Enforce minimum word count threshold
    // If script is too short (< 60% of target), fail validation
    // Escalate penalties on retry attempts to force improvement
    if (totalActualWords < minWords) {
      isBelowMinimum = true; // Mark as critically short - will force fail

      issues.push(
        `Script too short: ${totalActualWords} words (${percentOfTarget}% of target ${targetTotalWords}, ` +
        `minimum ${minWords} required)`
      );
      suggestions.push(
        `Requested ${targetTotalWords} words for ${Math.round((targetTotalWords / 160) * 60)}s video, ` +
        `but only got ${totalActualWords} words. Increase scene length to meet duration target.`
      );

      // Escalate penalty based on attempt number
      let penalty = 30; // Base penalty for first attempt
      if (attemptNumber && attemptNumber >= 2) {
        penalty = 50; // Harsher penalty on retry attempts (forces score below 70)
        console.log(`[Validation] Attempt ${attemptNumber} still below minimum - increased penalty -${penalty} points`);
      } else {
        console.log(`[Validation] Script below minimum threshold - penalty -${penalty} points`);
      }

      score -= penalty;
    }
    // Bonus for hitting target range (80-120%)
    else if (totalActualWords >= targetTotalWords * 0.8 && totalActualWords <= targetTotalWords * 1.2) {
      score += 10;
      console.log('[Validation] Script length within target range - bonus +10 points');
    }
    // Informational suggestion for moderately short scripts (60-80% of target)
    else if (totalActualWords < targetTotalWords * 0.8) {
      suggestions.push(
        `Script is shorter than expected: ${totalActualWords} words (${percentOfTarget}% of target ${targetTotalWords}). ` +
        `Video will be shorter than requested duration. Consider regenerating for longer content.`
      );
      console.log('[Validation] Script moderately short but acceptable (60-80% of target)');
    }
    // Informational suggestion for very long scripts (no penalty)
    else if (totalActualWords > maxWords) {
      suggestions.push(
        `Script is longer than expected: ${totalActualWords} words (${percentOfTarget}% of target ${targetTotalWords}). ` +
        `Video will be longer than requested duration.`
      );
      console.log('[Validation] Script exceeds maximum (150%+ of target)');
    }
  }

  // Validation 3: Check for AI detection markers (banned phrases)
  const bannedPhrasesFound = checkForBannedPhrases(scenes);
  if (bannedPhrasesFound.length > 0) {
    issues.push(`AI detection markers found: ${bannedPhrasesFound.join(', ')}`);
    suggestions.push('Rewrite without generic AI phrases - use more natural language');
    score -= 25;
  }

  // Validation 4: Check for generic AI openings
  const genericOpenings = checkForGenericOpenings(scenes);
  if (genericOpenings.length > 0) {
    issues.push(`Generic opening detected: ${genericOpenings[0]}`);
    suggestions.push('Start with a more unique, engaging hook that creates immediate intrigue');
    score -= 20;
  }

  // Validation 5: Check TTS readiness (no markdown, no meta-labels)
  const ttsIssues = checkTTSReadiness(scenes);
  if (ttsIssues.length > 0) {
    issues.push(...ttsIssues);
    suggestions.push('Remove all formatting characters and meta-labels - output only spoken narration');
    score -= 30;
  }

  // Validation 6: Check narrative flow
  const narrativeIssues = checkNarrativeFlow(scenes);
  if (narrativeIssues.length > 0) {
    issues.push(...narrativeIssues);
    suggestions.push('Ensure scenes build on each other and maintain engagement throughout');
    score -= 15;
  }

  // Validation 7: Check for robotic patterns
  const roboticPatterns = checkForRoboticPatterns(scenes);
  if (roboticPatterns.length > 0) {
    issues.push(...roboticPatterns);
    suggestions.push('Use more varied sentence structure and active voice');
    score -= 15;
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  // Pass threshold: 70 or higher (allow some minor issues if score is still good)
  // CRITICAL: Force fail if below minimum word count, regardless of score
  // This prevents edge cases where score = 70 exactly but script is too short
  let passed = score >= 70;
  if (isBelowMinimum) {
    passed = false; // Force fail - script is critically short
    console.log(`[Validation] ⚠️ FORCED FAIL: Script below minimum threshold (score=${score}, but below minimum)`);
  }

  return {
    passed,
    score,
    issues,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

/**
 * Check for banned AI phrases in script text
 */
function checkForBannedPhrases(scenes: Scene[]): string[] {
  const found: string[] = [];
  const allText = scenes.map(s => s.text.toLowerCase()).join(' ');

  for (const phrase of BANNED_PHRASES) {
    if (allText.includes(phrase.toLowerCase())) {
      found.push(`"${phrase}"`);
    }
  }

  return found;
}

/**
 * Check for generic AI opening patterns
 */
function checkForGenericOpenings(scenes: Scene[]): string[] {
  const found: string[] = [];

  if (scenes.length === 0) return found;

  const firstSceneText = scenes[0].text.trim();

  for (const pattern of GENERIC_OPENINGS) {
    if (pattern.test(firstSceneText)) {
      const match = firstSceneText.match(pattern);
      if (match) {
        found.push(match[0]);
      }
    }
  }

  return found;
}

/**
 * Check TTS readiness - no markdown or meta-labels
 */
function checkTTSReadiness(scenes: Scene[]): string[] {
  const issues: string[] = [];

  for (const scene of scenes) {
    const scenePrefix = `Scene ${scene.sceneNumber}`;

    // Check for markdown characters
    for (const char of MARKDOWN_CHARACTERS) {
      if (scene.text.includes(char)) {
        issues.push(`${scenePrefix}: Contains markdown character '${char}'`);
        break; // Only report once per scene
      }
    }

    // Check for meta-labels
    for (const pattern of META_LABEL_PATTERNS) {
      if (pattern.test(scene.text)) {
        issues.push(`${scenePrefix}: Contains meta-label or bracketed instruction`);
        break; // Only report once per scene
      }
    }

    // Check for URLs
    if (/https?:\/\/|www\./i.test(scene.text)) {
      issues.push(`${scenePrefix}: Contains URL`);
    }
  }

  return issues;
}

/**
 * Check narrative flow - does the script tell a coherent story?
 */
function checkNarrativeFlow(scenes: Scene[]): string[] {
  const issues: string[] = [];

  if (scenes.length === 0) return issues;

  // Check if first scene has a hook (not just stating a fact)
  const firstScene = scenes[0].text.trim();

  // Weak hooks: starts with "The/A/An" + noun + "is/are/was/were" + adjective
  // But allow action-oriented starts like "An octopus can..."
  const weakHookPattern = /^(the|a|an)\s+\w+\s+(is|are|was|were)\s+(a|an|the|very|extremely|quite)\s+/i;
  if (weakHookPattern.test(firstScene)) {
    issues.push('Weak opening hook - starts with simple declarative statement');
  }

  // Check for list-like structure (each scene starts similarly)
  const sceneStarts = scenes.map(s => s.text.trim().substring(0, 20).toLowerCase());
  const uniqueStarts = new Set(sceneStarts);

  if (uniqueStarts.size < scenes.length * 0.7) {
    issues.push('Repetitive scene openings - scenes lack variety');
  }

  return issues;
}

/**
 * Check for robotic patterns in writing
 */
function checkForRoboticPatterns(scenes: Scene[]): string[] {
  const issues: string[] = [];
  const allText = scenes.map(s => s.text).join(' ');

  // Check for excessive passive voice
  const passiveMatches = allText.match(/\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi);
  const totalSentences = allText.split(/[.!?]+/).length;

  if (passiveMatches && passiveMatches.length > totalSentences * 0.3) {
    issues.push('Excessive passive voice - use more active constructions');
  }

  // Check for repetitive sentence structure
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);

  if (sentenceLengths.length > 5) { // Only check if we have enough sentences
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;

    // Lower threshold - variance of 5 is very low (all sentences nearly same length)
    if (variance < 5) {
      issues.push('Repetitive sentence length - vary your sentence structure');
    }
  }

  return issues;
}

/**
 * Calculate word count for a scene
 */
export function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Check if a script has professional quality markers
 * This is a complementary check to the main validation
 */
export function hasQualityMarkers(scenes: Scene[]): boolean {
  const allText = scenes.map(s => s.text).join(' ');

  // Quality markers:
  // 1. Uses specific numbers or data
  const hasSpecifics = /\d+/.test(allText);

  // 2. Has variety in sentence structure (short and long sentences)
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const hasVariety = sentenceLengths.some(len => len < 8) && sentenceLengths.some(len => len > 15);

  // 3. Uses concrete examples (words like "example", "instance", "like")
  const hasExamples = /\b(example|instance|like|such as|for instance)\b/i.test(allText);

  // At least 2 of 3 quality markers should be present
  const markerCount = [hasSpecifics, hasVariety, hasExamples].filter(Boolean).length;
  return markerCount >= 2;
}
