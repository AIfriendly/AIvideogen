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
  SCRIPT_GENERATION_SYSTEM_PROMPT
} from './prompts/script-generation-prompt';
import { validateScriptQuality, type Scene, type ValidationResult } from './validate-script-quality';

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
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(response);

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
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
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
 * @param maxAttempts - Maximum number of attempts (default: 3)
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
  maxAttempts: number = 3
): Promise<ScriptGenerationResult> {
  const provider = createLLMProvider();
  let lastValidationResult: ValidationResult | null = null;
  const allIssues: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Script Generation] Attempt ${attempt}/${maxAttempts} for topic: "${topic}"`);

      // Generate appropriate prompt based on attempt number
      let prompt: string;
      if (attempt === 1) {
        prompt = generateScriptPrompt(topic, projectConfig);
      } else {
        const previousIssues = lastValidationResult?.issues || [];
        prompt = generateEnhancedPrompt(topic, attempt, previousIssues, projectConfig);
      }

      // Call LLM
      const messages: Message[] = [
        { role: 'user', content: prompt }
      ];

      console.log(`[Script Generation] Calling LLM provider...`);
      const response = await provider.chat(messages, SCRIPT_GENERATION_SYSTEM_PROMPT);

      // Parse response
      console.log(`[Script Generation] Parsing LLM response...`);
      const scenes = parseScriptResponse(response);

      console.log(`[Script Generation] Parsed ${scenes.length} scenes, validating quality...`);

      // Validate quality
      const validation = validateScriptQuality(scenes);
      lastValidationResult = validation;

      console.log(
        `[Script Generation] Validation score: ${validation.score}/100, ` +
        `passed: ${validation.passed}, issues: ${validation.issues.length}`
      );

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
