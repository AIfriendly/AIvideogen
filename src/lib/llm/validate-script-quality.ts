/**
 * Script Quality Validation (Purely Informational Style)
 *
 * Validates generated scripts against informational quality standards.
 * Checks information density, detects filler language, and validates factual content.
 */

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

  // Validation 3: Check information density
  const infoResult = checkInformationDensity(scenes);
  if (!infoResult.passed) {
    issues.push(...infoResult.issues);
    suggestions.push('Add more concrete facts, numbers, dates, or specific details');
    score -= 25;
  }

  // Validation 4: Check for filler language
  const fillerResult = checkForFiller(scenes);
  if (!fillerResult.passed) {
    issues.push(...fillerResult.issues);
    suggestions.push('Remove subjective adjectives without data (obviously, incredibly, basically)');
    score -= 20;
  }

  // Validation 5: Check for vagueness
  const vaguenessResult = checkForVagueness(scenes);
  if (!vaguenessResult.passed) {
    issues.push(...vaguenessResult.issues);
    suggestions.push('Replace vague statements with specific details and concrete examples');
    score -= 20;
  }

  // Validation 6: Check TTS readiness (no markdown, no meta-labels)
  const ttsIssues = checkTTSReadiness(scenes);
  if (ttsIssues.length > 0) {
    issues.push(...ttsIssues);
    suggestions.push('Remove all formatting characters and meta-labels - output only spoken narration');
    score -= 30;
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
 * Check information density - does the script contain concrete facts?
 */
function checkInformationDensity(scenes: Scene[]): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const allText = scenes.map(s => s.text).join(' ');
  const totalWords = allText.trim().split(/\s+/).length;

  // Count factual elements (numbers, dates, specific names, percentages)
  const numbers = allText.match(/\b\d+(\.\d+)?(%|HP|health|damage|seconds?|minutes?|degrees?|km|miles?)?\b/gi) || [];
  const dates = allText.match(/\b(19|20)\d{2}\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/gi) || [];
  const properNouns = allText.match(/\b[A-Z][a-z]+(\s+[A-Z][a-z]+)*\b/g) || [];

  // Calculate information density (factual elements per 100 words)
  const factualElements = numbers.length + dates.length + (properNouns.length / 2); // Weight proper nouns less
  const densityScore = (factualElements / totalWords) * 100;

  // Minimum density: 3 factual elements per 100 words
  const MIN_DENSITY = 3;

  if (densityScore < MIN_DENSITY) {
    issues.push(
      `Low information density: ${Math.round(densityScore * 10) / 10} factual elements per 100 words ` +
      `(minimum ${MIN_DENSITY}). Add more numbers, dates, or specific names.`
    );
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Check for filler language (subjective adjectives without supporting data)
 */
function checkForFiller(scenes: Scene[]): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const allText = scenes.map(s => s.text).join(' ');

  // Filler words that signal vague, subjective language
  const fillerPatterns = [
    /\bobviously\b/gi,
    /\bincredibly\b/gi,
    /\bbasically\b/gi,
    /\bkind of\b/gi,
    /\bsort of\b/gi,
    /\breally\s+(hard|difficult|powerful|strong|weak)/gi,
    /\bvery\s+(powerful|strong|weak|difficult|easy)/gi,
    /\bextremely\s+(powerful|strong|weak|difficult|easy)/gi,
    /\bsuper\s+(challenging|difficult|easy|powerful)/gi
  ];

  const foundFillers: string[] = [];
  for (const pattern of fillerPatterns) {
    const matches = allText.match(pattern);
    if (matches) {
      foundFillers.push(...matches);
    }
  }

  if (foundFillers.length > 2) { // Allow up to 2 instances
    issues.push(
      `Excessive filler language detected: "${foundFillers.slice(0, 3).join('", "')}"${foundFillers.length > 3 ? '...' : ''}. ` +
      `Replace with specific data or remove.`
    );
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Check for vagueness (generic statements without specifics)
 */
function checkForVagueness(scenes: Scene[]): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  // Vague patterns that signal lack of concrete information
  const vaguePatterns = [
    /\bmany (players|people|users|bosses|enemies)\b/gi,
    /\bsome (players|people|users|bosses|enemies)\b/gi,
    /\bmost (players|people|users|bosses|enemies)\b/gi,
    /\bquite\s+(impressive|challenging|powerful)\b/gi,
    /\bgenerally\s+regarded\b/gi,
    /\bconsidered\s+(by many|to be)\s+(one of|the)\b/gi,
    /\bis known for\b/gi,
    /\bis famous for\b/gi
  ];

  for (const scene of scenes) {
    const sceneVagueInstances: string[] = [];

    for (const pattern of vaguePatterns) {
      const matches = scene.text.match(pattern);
      if (matches) {
        sceneVagueInstances.push(...matches);
      }
    }

    if (sceneVagueInstances.length > 1) {
      issues.push(
        `Scene ${scene.sceneNumber}: Contains vague statements: "${sceneVagueInstances.slice(0, 2).join('", "')}". ` +
        `Replace with specific numbers, names, or concrete details.`
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
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
