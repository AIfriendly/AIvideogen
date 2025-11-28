/**
 * Script Generator - Business Logic Layer
 *
 * Handles LLM interaction, quality validation, and retry logic for script generation.
 * This is the core business logic that orchestrates the script generation process.
 */

import { createLLMProvider } from './factory';
import type { Message } from './provider';
import {
  generateScriptPrompt,
  generateEnhancedPrompt,
  SCRIPT_GENERATION_SYSTEM_PROMPT,
  generatePersonaAwareSystemPrompt
} from './prompts/script-generation-prompt';
import { validateScriptQuality, type Scene, type ValidationResult } from './validate-script-quality';
import { jsonrepair } from 'jsonrepair';

/**
 * Result of script generation with retry
 */
export interface ScriptGenerationResult {
  scenes: Scene[];
  attempts: number;
  validationScore: number;
}

/**
 * Error thrown when script generation fails after all retry attempts
 */
export class ScriptGenerationError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public validationIssues: string[]
  ) {
    super(message);
    this.name = 'ScriptGenerationError';
  }
}

/**
 * Parse LLM response and extract scenes
 */
function parseScriptResponse(response: string): Scene[] {
  // Clean up response - strip common preambles that LLMs add
  let cleanedResponse = response.trim();

  // Remove common preambles like "Here is...", "Here's...", etc.
  const preamblePatterns = [
    /^Here is (?:a |the |my )?(?:script|professional script|video script)[^\n]*\n*/i,
    /^Here's (?:a |the |my )?(?:script|professional script|video script)[^\n]*\n*/i,
    /^I've (?:created|generated|written) (?:a |the )?(?:script|professional script)[^\n]*\n*/i,
    /^Below is (?:a |the |my )?(?:script|professional script)[^\n]*\n*/i,
  ];

  for (const pattern of preamblePatterns) {
    cleanedResponse = cleanedResponse.replace(pattern, '');
  }

  // Trim again after removing preamble
  cleanedResponse = cleanedResponse.trim();

  try {
    // Try to repair and parse as JSON
    // jsonrepair fixes common issues: missing commas, trailing commas, unclosed braces, etc.
    const repairedResponse = jsonrepair(cleanedResponse);
    const parsed = JSON.parse(repairedResponse);

    // Validate structure
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
      throw new Error('Response missing scenes array');
    }

    // Validate each scene
    for (const scene of parsed.scenes) {
      if (typeof scene.sceneNumber !== 'number') {
        throw new Error(`Scene missing sceneNumber: ${JSON.stringify(scene)}`);
      }
      if (typeof scene.text !== 'string') {
        throw new Error(`Scene missing text: ${JSON.stringify(scene)}`);
      }
    }

    return parsed.scenes as Scene[];
  } catch (error) {
    // If JSON parsing fails, try to extract JSON from markdown code blocks
    const jsonMatch = cleanedResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      try {
        const repairedJson = jsonrepair(jsonMatch[1]);
        const parsed = JSON.parse(repairedJson);
        if (parsed.scenes && Array.isArray(parsed.scenes)) {
          return parsed.scenes as Scene[];
        }
      } catch {
        // Fall through to error
      }
    }

    // Try to find JSON object even if there's text before/after
    const jsonObjectMatch = cleanedResponse.match(/\{[\s\S]*"scenes"[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        const repairedJson = jsonrepair(jsonObjectMatch[0]);
        const parsed = JSON.parse(repairedJson);
        if (parsed.scenes && Array.isArray(parsed.scenes)) {
          return parsed.scenes as Scene[];
        }
      } catch {
        // Fall through to error
      }
    }

    throw new Error(
      `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate a script with retry logic for quality and technical failures
 *
 * This function implements the complete retry strategy:
 * - Attempt 1: Standard prompt
 * - Attempt 2: Enhanced prompt with feedback from previous issues
 * - Attempt 3: Final enhanced prompt with critical emphasis
 *
 * Technical failures (timeout, rate limit) use exponential backoff.
 * Quality failures trigger immediate retry with enhanced prompt.
 *
 * @param topic - The video topic to generate a script for
 * @param projectConfig - Optional configuration for scene count, duration, etc.
 * @param maxAttempts - Maximum number of attempts (default: 6)
 * @param personaPrompt - Optional persona prompt to influence script style (Story 1.8)
 * @returns ScriptGenerationResult with scenes and attempt count
 * @throws ScriptGenerationError if all attempts fail
 *
 * @example
 * ```typescript
 * try {
 *   const result = await generateScriptWithRetry("Why octopuses are intelligent");
 *   console.log(`Generated ${result.scenes.length} scenes in ${result.attempts} attempts`);
 * } catch (error) {
 *   if (error instanceof ScriptGenerationError) {
 *     console.error(`Failed after ${error.attempts} attempts:`, error.validationIssues);
 *   }
 * }
 * ```
 */
export async function generateScriptWithRetry(
  topic: string,
  projectConfig?: any,
  maxAttempts: number = 6,
  personaPrompt?: string | null
): Promise<ScriptGenerationResult> {
  const provider = createLLMProvider();
  let lastValidationResult: ValidationResult | null = null;
  const allIssues: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Script Generation] Attempt ${attempt}/${maxAttempts} for topic: "${topic}"`);

      // DISABLED: Scene optimization was making LLM generate shorter content
      // Issue: Splitting into more scenes (8 → 11) made task more complex
      // Result: LLM generated ~43% of target instead of ~70%
      // Fix: Use user's requested scene count directly (simpler = better)
      const optimizedConfig = projectConfig;

      if (projectConfig?.estimatedWords && projectConfig?.sceneCount) {
        const totalWords = projectConfig.estimatedWords;
        const sceneCount = projectConfig.sceneCount;
        const wordsPerScene = Math.round(totalWords / sceneCount);

        console.log(
          `[Script Generation] Using requested ${sceneCount} scenes ` +
          `(${wordsPerScene} words/scene target, total ${totalWords} words)`
        );
      }

      // Generate appropriate prompt based on attempt number
      let prompt: string;
      if (attempt === 1) {
        prompt = generateScriptPrompt(topic, optimizedConfig);
      } else {
        const previousIssues = lastValidationResult?.issues || [];
        prompt = generateEnhancedPrompt(topic, attempt, previousIssues, optimizedConfig);
      }

      // DEBUG: Log prompt configuration details
      console.log(`[DEBUG] Prompt config: Target ${optimizedConfig?.estimatedWords || 'N/A'} words, ` +
                  `${optimizedConfig?.sceneCount || 'N/A'} scenes, ` +
                  `${Math.round((optimizedConfig?.estimatedWords || 0) / (optimizedConfig?.sceneCount || 1))} words/scene`);

      // Call LLM with persona-aware system prompt (Story 1.8 integration)
      const messages: Message[] = [
        { role: 'user', content: prompt }
      ];

      // Generate system prompt - use persona if provided, otherwise use default
      const systemPrompt = personaPrompt
        ? generatePersonaAwareSystemPrompt(personaPrompt)
        : SCRIPT_GENERATION_SYSTEM_PROMPT;

      console.log(`[Script Generation] Calling LLM provider${personaPrompt ? ' (with persona)' : ''}...`);
      const startTime = Date.now();
      const response = await provider.chat(messages, systemPrompt);
      const llmDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[DEBUG] LLM response received in ${llmDuration}s, length: ${response.length} chars`);

      // Parse response
      console.log(`[Script Generation] Parsing LLM response...`);
      const scenes = parseScriptResponse(response);

      // DEBUG: Calculate actual word counts from parsed scenes
      const actualTotalWords = scenes.reduce((sum, scene) => {
        return sum + scene.text.trim().split(/\s+/).length;
      }, 0);
      const targetWords = optimizedConfig?.estimatedWords || 0;
      const percentOfTarget = targetWords > 0 ? Math.round((actualTotalWords / targetWords) * 100) : 0;

      console.log(`[Script Generation] Parsed ${scenes.length} scenes, validating quality...`);
      console.log(`[DEBUG] LLM generated ${actualTotalWords} words (target: ${targetWords}, ${percentOfTarget}% of target)`);

      // Extract target total words and scene count from projectConfig for duration-based validation
      // Use the optimized config (which may have adjusted scene count for LLM capabilities)
      const targetTotalWords = optimizedConfig?.estimatedWords || undefined;
      const targetSceneCount = optimizedConfig?.sceneCount || undefined;

      // Validate quality with dynamic word count limits and attempt number for penalty escalation
      const validation = validateScriptQuality(scenes, targetTotalWords, targetSceneCount, attempt);
      lastValidationResult = validation;

      console.log(
        `[Script Generation] Validation score: ${validation.score}/100, ` +
        `passed: ${validation.passed}, issues: ${validation.issues.length}`
      );

      // DEBUG: Show validation decision details
      if (validation.issues.length > 0) {
        console.log(`[DEBUG] Validation issues: ${validation.issues.join('; ')}`);
      }
      if (validation.passed) {
        console.log(`[DEBUG] ✅ PASSED - Script accepted (${actualTotalWords} words, ${percentOfTarget}% of target)`);
      } else {
        console.log(`[DEBUG] ❌ FAILED - Will retry (${actualTotalWords} words, ${percentOfTarget}% of target, score ${validation.score}/100)`);
      }

      if (validation.passed) {
        // Success!
        console.log(`[Script Generation] ✓ Quality validation passed on attempt ${attempt}`);
        return {
          scenes,
          attempts: attempt,
          validationScore: validation.score
        };
      }

      // Quality validation failed
      console.log(`[Script Generation] ✗ Quality validation failed:`, validation.issues);
      allIssues.push(...validation.issues);

      if (attempt < maxAttempts) {
        console.log(`[Script Generation] Retrying with enhanced prompt (attempt ${attempt + 1})...`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Script Generation] Attempt ${attempt} failed:`, errorMessage);

      // Check if this is a technical failure (timeout, rate limit, connection error)
      const isTechnicalFailure =
        errorMessage.includes('timeout') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT');

      if (isTechnicalFailure && attempt < maxAttempts) {
        // Exponential backoff for technical failures
        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`[Script Generation] Technical failure, retrying after ${backoffMs}ms backoff...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      // For parsing errors or other failures, add to issues and continue
      allIssues.push(`Attempt ${attempt}: ${errorMessage}`);

      if (attempt < maxAttempts) {
        console.log(`[Script Generation] Retrying after error (attempt ${attempt + 1})...`);
      }
    }
  }

  // All attempts exhausted
  console.error(
    `[Script Generation] All ${maxAttempts} attempts failed. Final validation:`,
    lastValidationResult
  );

  throw new ScriptGenerationError(
    `Script generation failed after ${maxAttempts} attempts. Issues: ${allIssues.join('; ')}`,
    maxAttempts,
    allIssues
  );
}

/**
 * Generate a script without retry (for testing or single-attempt use cases)
 *
 * @param topic - The video topic
 * @param projectConfig - Optional configuration
 * @returns Scene array
 * @throws Error if generation or validation fails
 */
export async function generateScript(
  topic: string,
  projectConfig?: any
): Promise<Scene[]> {
  const result = await generateScriptWithRetry(topic, projectConfig, 1);
  return result.scenes;
}
