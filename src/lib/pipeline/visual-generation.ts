/**
 * Visual Generation Pipeline
 *
 * Generates visual suggestions for scenes based on their content.
 * Uses MCP video providers (DVIDS, NASA) exclusively.
 *
 * DYNAMIC FETCHING: Keeps fetching videos until total duration requirement is met.
 * For a 5-minute video (300s), needs 30-60 clips (5-10s per clip).
 *
 * Story 6.9: Task 7 - Integration with Quick Production Flow
 *
 * @module lib/pipeline/visual-generation
 */

import type { Scene } from '@/lib/db/queries';
import { saveVisualSuggestions } from '@/lib/db/queries';
import { ProviderRegistry, type VideoSearchResult } from '@/lib/mcp';

export interface VisualSuggestion {
  video_id: string;
  title: string;
  duration: number;
  thumbnail_url: string;
  rank: number;
}

export interface VisualGenerationResult {
  completed: number;
  totalSuggestions: number;
  totalDuration: number; // Total duration of all fetched videos in seconds
  targetDuration: number; // Target duration to meet
  errors?: Array<{ sceneNumber: number; error: string }>;
}

export interface VisualGenerationOptions {
  /**
   * MCP provider ID to use (e.g., 'dvids', 'nasa')
   * If not specified, tries all enabled providers in priority order
   */
  providerId?: string;

  /**
   * Path to MCP servers configuration file
   * @default 'config/mcp_servers.json'
   */
  mcpConfigPath?: string;

  /**
   * Average clip duration in seconds (used to calculate how many clips needed)
   * @default 8 (between 5-10 seconds per clip)
   */
  averageClipDuration?: number;

  /**
   * Minimum clips per scene (ensures variety)
   * @default 6
   */
  minClipsPerScene?: number;

  /**
   * Progress callback for reporting generation status
   */
  onProgress?: (sceneNumber: number, status: string) => void;
}

/**
 * Generates visual suggestions for all scenes in a project
 *
 * Uses MCP video providers (DVIDS, NASA) exclusively with DYNAMIC fetching:
 * - Calculates total project duration from all scenes
 * - Determines how many clips needed (totalDuration / averageClipDuration)
 * - Fetches videos in batches using query variations until duration met
 *
 * @param projectId - The project ID
 * @param scenes - Array of scenes to generate visuals for
 * @param ragContext - Optional RAG context for better visual matching
 * @param options - Visual generation options
 * @returns Promise with generation results
 *
 * @example
 * // Generate visuals using MCP providers with dynamic fetching
 * const result = await generateVisuals(
 *   projectId,
 *   scenes,
 *   ragContext,
 *   { providerId: 'dvids', averageClipDuration: 8 }
 * );
 * console.log(`Fetched ${result.totalSuggestions} clips totaling ${result.totalDuration}s`);
 */
export async function generateVisuals(
  projectId: string,
  scenes: Scene[],
  ragContext?: any,
  options?: VisualGenerationOptions
): Promise<VisualGenerationResult> {
  const {
    providerId,
    mcpConfigPath = 'config/mcp_servers.json',
    averageClipDuration = 8, // Default: 8 seconds per clip (between 5-10s)
    minClipsPerScene = 6,
    onProgress,
  } = options || {};

  // Calculate total project duration (sum of all scene durations)
  const totalProjectDuration = scenes.reduce((sum, scene) => {
    return sum + (scene.duration || 0);
  }, 0);

  // Calculate target duration (add 50% buffer for variety)
  const targetDuration = Math.ceil(totalProjectDuration * 1.5);

  // Calculate how many clips we need
  const targetClipsNeeded = Math.ceil(targetDuration / averageClipDuration);
  const minTotalClips = Math.max(targetClipsNeeded, scenes.length * minClipsPerScene);

  console.log(`[Visual Generation] Project duration: ${totalProjectDuration}s, Target: ${targetDuration}s, Need ~${minTotalClips} clips`);

  let providerRegistry: ProviderRegistry | null = null;
  const errors: Array<{ sceneNumber: number; error: string }> = [];
  let completed = 0;
  let totalSuggestions = 0;
  let totalFetchedDuration = 0;

  try {
    // Initialize MCP provider registry
    providerRegistry = new ProviderRegistry(mcpConfigPath);

    // Collect all videos across all scenes
    const allVideos: Map<string, VideoSearchResult> = new Map(); // Deduplicate by videoId

    // Generate visuals for each scene
    for (const scene of scenes) {
      const sceneNumber = scene.scene_number;
      const baseQuery = buildSearchQuery(scene, ragContext);
      const sceneTargetClips = Math.ceil((scene.duration || averageClipDuration) / averageClipDuration);

      try {
        onProgress?.(sceneNumber, `Searching for visuals (need ~${sceneTargetClips} clips): "${baseQuery}"`);

        // Dynamically fetch videos until we have enough for this scene
        const sceneVideos = await fetchVideosUntilQuotaMet(
          providerRegistry,
          baseQuery,
          sceneTargetClips,
          providerId,
          scene.duration ?? undefined,
          onProgress ? (status) => onProgress(sceneNumber, status) : undefined
        );

        if (sceneVideos.length > 0) {
          // Add to global collection (deduplicated)
          for (const video of sceneVideos) {
            if (!allVideos.has(video.videoId)) {
              allVideos.set(video.videoId, video);
              totalFetchedDuration += video.duration;
            }
          }

          // Save scene-specific suggestions
          const suggestionsToSave = sceneVideos.map(result => ({
            videoId: result.videoId,
            title: result.title,
            thumbnailUrl: result.thumbnailUrl,
            channelTitle: result.publishedAt, // Use publishedAt as placeholder for channelTitle
            embedUrl: result.thumbnailUrl, // Use thumbnailUrl as placeholder for embedUrl
            duration: result.duration.toString(), // Convert number to string as expected by saveVisualSuggestions
            provider: result.providerId, // Story 6.12: Save provider info (dvids, nasa, youtube)
            sourceUrl: result.sourceUrl, // Story 6.12: Save actual download URL
          }));

          saveVisualSuggestions(scene.id, suggestionsToSave);

          completed++;
          totalSuggestions += sceneVideos.length;
          onProgress?.(sceneNumber, `Found ${sceneVideos.length} videos (cumulative: ${allVideos.size} unique, ${totalFetchedDuration}s)`);
        } else {
          // No results from MCP providers - save empty array and log error
          saveVisualSuggestions(scene.id, []);
          errors.push({
            sceneNumber,
            error: 'No video results found from MCP providers',
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          sceneNumber,
          error: errorMessage,
        });
        onProgress?.(sceneNumber, `Error: ${errorMessage}`);
      }
    }

    // If we still don't have enough unique videos, try additional queries
    if (allVideos.size < minTotalClips) {
      console.log(`[Visual Generation] Only ${allVideos.size} unique videos fetched, need ${minTotalClips}. Trying additional queries...`);

      const additionalVideos = await fetchAdditionalVideos(
        providerRegistry,
        scenes,
        ragContext,
        minTotalClips - allVideos.size,
        providerId,
        totalProjectDuration,
        onProgress
      );

      for (const video of additionalVideos) {
        if (!allVideos.has(video.videoId)) {
          allVideos.set(video.videoId, video);
          totalFetchedDuration += video.duration;
        }
      }

      console.log(`[Visual Generation] Fetched ${additionalVideos.length} additional videos. Total: ${allVideos.size} unique, ${totalFetchedDuration}s`);
    }

    return {
      completed,
      totalSuggestions,
      totalDuration: totalFetchedDuration,
      targetDuration,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    // Handle MCP initialization errors - no fallback, just return error
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize MCP provider registry:', errorMessage);

    errors.push({
      sceneNumber: 0,
      error: `MCP initialization failed: ${errorMessage}`,
    });

    return {
      completed,
      totalSuggestions,
      totalDuration: totalFetchedDuration,
      targetDuration,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

/**
 * Fetch videos from MCP providers until quota is met
 * Uses query variations to get different results from each search
 */
async function fetchVideosUntilQuotaMet(
  registry: ProviderRegistry,
  baseQuery: string,
  targetClips: number,
  providerId?: string,
  maxDuration?: number,
  onProgress?: (status: string) => void
): Promise<VideoSearchResult[]> {
  const allResults: VideoSearchResult[] = [];
  const seenVideoIds = new Set<string>();
  const maxAttempts = 5; // Maximum query variations to try
  let attempt = 0;

  while (allResults.length < targetClips && attempt < maxAttempts) {
    const query = generateQueryVariation(baseQuery, attempt);
    onProgress?.(`Fetching batch ${attempt + 1} with query: "${query}"`);

    try {
      const results = await searchMCPProviders(registry, query, providerId, undefined);

      // Deduplicate and add new results
      for (const result of results) {
        if (!seenVideoIds.has(result.videoId)) {
          // Filter by max duration if specified
          if (!maxDuration || result.duration <= maxDuration) {
            seenVideoIds.add(result.videoId);
            allResults.push(result);
          }
        }
      }

      onProgress?.(`Batch ${attempt + 1}: ${results.length} results (${allResults.length}/${targetClips} unique)`);

      // If we got no new results, stop trying
      if (results.length === 0) {
        break;
      }
    } catch (error) {
      console.warn(`[Visual Generation] Query variation ${attempt + 1} failed:`, error);
    }

    attempt++;
  }

  return allResults;
}

/**
 * Generate query variations to get different results from MCP providers
 */
function generateQueryVariation(baseQuery: string, variation: number): string {
  const modifiers = [
    '', // Original query
    'high quality',
    'hd',
    'official',
    'footage',
    'video',
    'clip',
  ];

  // Add modifier to base query
  if (variation === 0) {
    return baseQuery;
  }

  const modifier = modifiers[variation % modifiers.length];
  if (modifier) {
    return `${baseQuery} ${modifier}`;
  }

  // Try varying the query order
  const words = baseQuery.split(' ').filter(w => w.length > 0);
  if (words.length > 1) {
    // Reverse word order for variation
    return words.reverse().join(' ');
  }

  return baseQuery;
}

/**
 * Fetch additional videos when initial fetch doesn't meet quota
 */
async function fetchAdditionalVideos(
  registry: ProviderRegistry,
  scenes: Scene[],
  ragContext: any,
  clipsNeeded: number,
  providerId: string | undefined,
  totalProjectDuration: number,
  onProgress?: (sceneNumber: number, status: string) => void
): Promise<VideoSearchResult[]> {
  const allResults: VideoSearchResult[] = [];
  const seenVideoIds = new Set<string>();

  // Use broader queries based on RAG context
  const broadQueries = generateBroadQueries(scenes, ragContext);

  for (const query of broadQueries) {
    if (allResults.length >= clipsNeeded) break;

    try {
      onProgress?.(0, `Fetching additional videos with query: "${query}"`);
      const results = await searchMCPProviders(registry, query, providerId, undefined);

      for (const result of results) {
        if (!seenVideoIds.has(result.videoId)) {
          seenVideoIds.add(result.videoId);
          allResults.push(result);
        }
      }

      onProgress?.(0, `Query "${query}" returned ${results.length} videos`);
    } catch (error) {
      console.warn(`[Visual Generation] Broad query "${query}" failed:`, error);
    }
  }

  return allResults;
}

/**
 * Generate broad search queries based on all scenes
 */
function generateBroadQueries(scenes: Scene[], ragContext?: any): string[] {
  const queries: string[] = [];

  // Extract key themes from all scenes
  const allText = scenes.map(s => s.text).join(' ');

  // Extract common words (simple extraction)
  const words = allText.split(/\s+/).filter(w => w.length > 4);
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  // Get top 5 most frequent words
  const topWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(e => e[0]);

  // Generate queries from top words
  for (const word of topWords) {
    queries.push(word);
    queries.push(`${word} footage`);
    queries.push(`${word} video`);
  }

  // Add domain-specific queries
  if (ragContext?.domain?.type) {
    const domainQueries: Record<string, string[]> = {
      military: ['military operation', 'training exercise', 'combat footage'],
      space: ['space mission', 'satellite footage', 'astronaut'],
      news: ['news report', 'breaking news', 'interview'],
    };
    const domainSpecific = domainQueries[ragContext.domain.type];
    if (domainSpecific) {
      queries.push(...domainSpecific);
    }
  }

  return queries.slice(0, 10); // Limit to 10 broad queries
}

/**
 * Builds a search query from scene content and RAG context
 */
function buildSearchQuery(scene: Scene, ragContext?: any): string {
  const sceneText = scene.text || '';
  const baseQuery = sceneText.substring(0, 200); // Limit query length

  if (ragContext?.domain?.type) {
    // Add domain-specific context for better matching
    const domainTerms: Record<string, string> = {
      military: 'footage',
      space: 'nasa',
      news: 'news report',
    };
    const term = domainTerms[ragContext.domain.type];
    if (term) {
      return `${baseQuery} ${term}`;
    }
  }

  return baseQuery;
}

/**
 * Searches MCP video providers for videos matching the query
 */
async function searchMCPProviders(
  registry: ProviderRegistry,
  query: string,
  providerId?: string,
  onProgress?: (status: string) => void
): Promise<VideoSearchResult[]> {
  try {
    onProgress?.('Searching MCP video providers...');
    const results = await registry.searchAllProviders(query);
    return results;
  } catch (error) {
    onProgress?.(`MCP search failed: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}
