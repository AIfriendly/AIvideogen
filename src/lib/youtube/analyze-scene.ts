import { createLLMProvider } from '../llm/factory';
import { buildVisualSearchPrompt } from '../llm/prompts/visual-search-prompt';
import { createFallbackAnalysis } from './keyword-extractor';
import type { SceneAnalysis } from './types';
import { ContentType } from './types';

/**
 * Scene Analysis Module
 *
 * This module provides intelligent scene text analysis using LLM to extract
 * visual themes and generate optimized YouTube search queries. It implements
 * robust error handling with retry logic and keyword extraction fallback.
 *
 * Pipeline:
 * 1. Validate input scene text
 * 2. Build LLM prompt from template
 * 3. Call LLM provider with 10-second timeout
 * 4. Parse and validate JSON response
 * 5. Handle errors with retry (1x) or fallback
 * 6. Return SceneAnalysis object
 *
 * Performance Targets:
 * - LLM analysis: <5s average (10s timeout)
 * - Fallback: <100ms
 * - No blocking delays for user workflow
 *
 * @module analyze-scene
 */

/**
 * Analyze scene text to extract visual themes and generate YouTube search queries
 *
 * This function leverages the LLM provider to perform intelligent scene analysis,
 * extracting visual elements (subject, setting, mood, action) and generating
 * optimized search queries for YouTube. It follows the existing LLM provider
 * pattern from Epic 1 Story 1.3.
 *
 * Error Handling:
 * - LLM connection failure -> Immediate fallback
 * - LLM timeout (>10s) -> Immediate fallback
 * - Empty response -> Retry once (1s delay) -> Fallback if retry fails
 * - Invalid JSON -> Immediate fallback (no retry)
 * - Missing required fields -> Retry once -> Fallback if retry fails
 *
 * Logging:
 * - INFO: Successful analysis with timing
 * - WARN: Slow analysis (>5s), retry attempts
 * - ERROR: LLM failures, fallback triggers
 *
 * @param sceneText - The scene narration text from the script (from database)
 * @returns Promise resolving to SceneAnalysis object with queries and metadata
 * @throws Error if scene text is empty or invalid
 *
 * @example
 * const analysis = await analyzeSceneForVisuals(
 *   "A majestic lion roams the savanna at sunset"
 * );
 *
 * console.log(analysis.primaryQuery);
 * // Output: "lion savanna sunset wildlife"
 *
 * console.log(analysis.alternativeQueries);
 * // Output: ["african lion sunset", "lion walking grassland golden hour"]
 *
 * console.log(analysis.contentType);
 * // Output: ContentType.NATURE
 */
export async function analyzeSceneForVisuals(
  sceneText: string
): Promise<SceneAnalysis> {
  const startTime = Date.now();

  // Step 1: Input validation
  if (!sceneText || sceneText.trim().length === 0) {
    throw new Error('Scene text cannot be empty');
  }

  const cleanText = sceneText.trim();
  console.log(
    `[SceneAnalyzer] Analyzing scene: "${cleanText.substring(0, 50)}${cleanText.length > 50 ? '...' : ''}"`
  );

  try {
    // Step 2: Build LLM prompt
    const prompt = buildVisualSearchPrompt(cleanText);

    // Step 3: Get LLM provider and call with timeout
    const llm = createLLMProvider();

    // Create timeout promise (60 seconds)
    // Note: 10s was too short for Gemini with the detailed visual search prompt
    // Gemini can take 15-45s for complex prompts, especially under load
    // 60s provides ample buffer for slow responses
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('LLM_TIMEOUT')), 60000)
    );

    // Race between LLM call and timeout
    const llmPromise = llm.chat([{ role: 'user', content: prompt }]);
    const response = await Promise.race([llmPromise, timeoutPromise]);

    // Step 4: Parse JSON response (with extraction for markdown-wrapped responses)
    let analysis: any;
    try {
      // Try direct parse first
      analysis = JSON.parse(response);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks or surrounding text
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                        response.match(/(\{[\s\S]*\})/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          analysis = JSON.parse(jsonMatch[1].trim());
          console.log('[SceneAnalyzer] Extracted JSON from wrapped response');
        } catch (extractError) {
          // Extraction failed - use fallback
          console.warn('[SceneAnalyzer] Invalid JSON response (even after extraction), using fallback');
          const duration = Date.now() - startTime;
          console.log(`[SceneAnalyzer] Fallback analysis completed in ${duration}ms`);
          return createFallbackAnalysis(cleanText);
        }
      } else {
        // No JSON found - use fallback
        console.warn('[SceneAnalyzer] Invalid JSON response, using fallback');
        const duration = Date.now() - startTime;
        console.log(`[SceneAnalyzer] Fallback analysis completed in ${duration}ms`);
        return createFallbackAnalysis(cleanText);
      }
    }

    // Step 5: Validate required fields
    if (!analysis.mainSubject || !analysis.primaryQuery) {
      console.warn(
        '[SceneAnalyzer] Missing required fields (mainSubject or primaryQuery), retrying...'
      );

      // Retry once with 1 second delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const retryResponse = await Promise.race([
          llm.chat([{ role: 'user', content: prompt }]),
          timeoutPromise
        ]);

        const retryAnalysis = JSON.parse(retryResponse);

        if (!retryAnalysis.mainSubject || !retryAnalysis.primaryQuery) {
          console.warn('[SceneAnalyzer] Retry failed, using fallback');
          const duration = Date.now() - startTime;
          console.log(`[SceneAnalyzer] Fallback analysis completed in ${duration}ms`);
          return createFallbackAnalysis(cleanText);
        }

        // Retry succeeded
        const duration = Date.now() - startTime;
        console.log(`[SceneAnalyzer] Analysis completed in ${duration}ms (after retry)`);
        console.log(`[SceneAnalyzer] Primary query: "${retryAnalysis.primaryQuery}"`);

        if (duration > 5000) {
          console.warn(
            `[SceneAnalyzer] WARNING: Analysis slow (${duration}ms). Consider LLM performance tuning.`
          );
        }

        return normalizeAnalysis(retryAnalysis);
      } catch (retryError: any) {
        console.warn(`[SceneAnalyzer] Retry error: ${retryError.message}, using fallback`);
        const duration = Date.now() - startTime;
        console.log(`[SceneAnalyzer] Fallback analysis completed in ${duration}ms`);
        return createFallbackAnalysis(cleanText);
      }
    }

    // Step 6: Success - Return analysis
    const duration = Date.now() - startTime;
    console.log(`[SceneAnalyzer] Analysis completed in ${duration}ms`);
    console.log(`[SceneAnalyzer] Primary query: "${analysis.primaryQuery}"`);

    if (duration > 5000) {
      console.warn(
        `[SceneAnalyzer] WARNING: Analysis slow (${duration}ms). Consider LLM performance tuning.`
      );
    }

    return normalizeAnalysis(analysis);

  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Log specific error types
    if (error.message === 'LLM_TIMEOUT') {
      console.warn(`[SceneAnalyzer] LLM timeout after 60s, using fallback`);
    } else if (error instanceof SyntaxError) {
      console.warn(`[SceneAnalyzer] Invalid JSON response, using fallback`);
    } else {
      console.error(`[SceneAnalyzer] LLM error: ${error.message}, using fallback`);
    }

    console.log(`[SceneAnalyzer] Fallback analysis completed in ${duration}ms`);
    return createFallbackAnalysis(cleanText);
  }
}

/**
 * Normalize and validate LLM analysis response
 *
 * This function ensures the LLM response conforms to the SceneAnalysis interface
 * by providing defaults for missing optional fields and validating the content type.
 *
 * @param analysis - Raw analysis object from LLM (may have missing/invalid fields)
 * @returns Normalized SceneAnalysis object with all fields properly typed
 */
function normalizeAnalysis(analysis: any): SceneAnalysis {
  // Ensure arrays exist
  const keywords = Array.isArray(analysis.keywords) ? analysis.keywords : [];
  const alternativeQueries = Array.isArray(analysis.alternativeQueries)
    ? analysis.alternativeQueries
    : [];

  // Validate and normalize content type
  let contentType: ContentType = ContentType.B_ROLL;
  const validTypes = Object.values(ContentType);
  if (analysis.contentType && validTypes.includes(analysis.contentType)) {
    contentType = analysis.contentType as ContentType;
  } else if (analysis.contentType) {
    console.warn(
      `[SceneAnalyzer] Invalid contentType "${analysis.contentType}", defaulting to B_ROLL`
    );
  }

  return {
    mainSubject: analysis.mainSubject || '',
    setting: analysis.setting || '',
    mood: analysis.mood || '',
    action: analysis.action || '',
    keywords,
    primaryQuery: analysis.primaryQuery || '',
    alternativeQueries,
    contentType
  };
}
