/**
 * Test Data Factories for Visual Suggestions (Story 3.3)
 * Following TEA data-factories.md best practices
 *
 * Factory Pattern: Pure functions with overrides for flexibility
 * Uses faker.js for realistic test data generation
 */

import { faker } from '@faker-js/faker';

/**
 * YouTube Video Result Factory
 * Creates realistic VideoResult objects from YouTube API responses
 */
export interface VideoResult {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  embedUrl: string;
  publishedAt?: string;
  description?: string;
  viewCount?: number;
  likeCount?: number;
  duration: string; // Duration in seconds as string (Story 3.3)
}

export function createVideoResult(overrides?: Partial<VideoResult>): VideoResult {
  const videoId = overrides?.videoId || faker.string.alphanumeric(11);

  return {
    videoId,
    title: faker.lorem.sentence({ min: 3, max: 10 }),
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    channelTitle: faker.company.name(),
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    publishedAt: faker.date.recent({ days: 30 }).toISOString(),
    description: faker.lorem.paragraph(),
    viewCount: faker.number.int({ min: 1000, max: 1000000 }),
    likeCount: faker.number.int({ min: 100, max: 50000 }),
    duration: faker.number.int({ min: 30, max: 600 }).toString(), // 30s - 10min
    ...overrides
  };
}

/**
 * Batch factory for multiple video results
 */
export function createVideoResults(count: number = 5, overrides?: Partial<VideoResult>): VideoResult[] {
  return Array.from({ length: count }, () => createVideoResult(overrides));
}

/**
 * Visual Suggestion Database Row Factory
 * Creates VisualSuggestion objects matching database schema
 */
export interface VisualSuggestion {
  id: string;
  scene_id: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
  channel_title: string;
  embed_url: string;
  rank: number;
  duration: number; // Integer seconds
  default_segment_path: string | null;
  download_status: 'pending' | 'downloading' | 'complete' | 'error';
  created_at: string;
}

export function createVisualSuggestion(overrides?: Partial<VisualSuggestion>): VisualSuggestion {
  const videoId = overrides?.video_id || faker.string.alphanumeric(11);
  const sceneId = overrides?.scene_id || faker.string.uuid();

  return {
    id: faker.string.uuid(),
    scene_id: sceneId,
    video_id: videoId,
    title: faker.lorem.sentence({ min: 3, max: 10 }),
    thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    channel_title: faker.company.name(),
    embed_url: `https://www.youtube.com/embed/${videoId}`,
    rank: faker.number.int({ min: 1, max: 15 }),
    duration: faker.number.int({ min: 30, max: 600 }), // 30s - 10min in seconds
    default_segment_path: null,
    download_status: 'pending',
    created_at: faker.date.recent().toISOString(),
    ...overrides
  };
}

/**
 * Batch factory for multiple visual suggestions
 */
export function createVisualSuggestions(
  count: number = 5,
  sceneId?: string,
  overrides?: Partial<VisualSuggestion>
): VisualSuggestion[] {
  const scene = sceneId || faker.string.uuid();

  return Array.from({ length: count }, (_, index) =>
    createVisualSuggestion({
      scene_id: scene,
      rank: index + 1, // Rank 1, 2, 3, 4, 5
      ...overrides
    })
  );
}

/**
 * Scene Analysis Result Factory
 * Creates SceneAnalysis objects from LLM analysis (Story 3.2 integration)
 */
export interface SceneAnalysis {
  mainSubject: string;
  setting: string;
  mood: string;
  action: string;
  keywords: string[];
  primaryQuery: string;
  alternativeQueries: string[];
  contentType: 'B_ROLL' | 'GAMEPLAY' | 'TUTORIAL' | 'NATURE' | 'DOCUMENTARY';
}

export function createSceneAnalysis(overrides?: Partial<SceneAnalysis>): SceneAnalysis {
  const subject = overrides?.mainSubject || faker.word.noun();
  const setting = overrides?.setting || faker.word.noun();

  return {
    mainSubject: subject,
    setting,
    mood: faker.word.adjective(),
    action: faker.word.verb(),
    keywords: Array.from({ length: 5 }, () => faker.word.noun()),
    primaryQuery: `${subject} ${setting} ${faker.word.adjective()}`,
    alternativeQueries: [
      `${faker.word.adjective()} ${subject}`,
      `${setting} ${faker.word.noun()}`
    ],
    contentType: 'B_ROLL',
    ...overrides
  };
}

/**
 * YouTube API Search Response Factory
 * Mimics actual YouTube Data API v3 search.list response structure
 */
export interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails: {
        high: { url: string };
      };
      publishedAt: string;
      description: string;
    };
  }>;
}

export function createYouTubeSearchResponse(count: number = 5): YouTubeSearchResponse {
  return {
    items: Array.from({ length: count }, () => {
      const videoId = faker.string.alphanumeric(11);
      return {
        id: { videoId },
        snippet: {
          title: faker.lorem.sentence({ min: 3, max: 10 }),
          channelTitle: faker.company.name(),
          thumbnails: {
            high: {
              url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            }
          },
          publishedAt: faker.date.recent({ days: 30 }).toISOString(),
          description: faker.lorem.paragraph()
        }
      };
    })
  };
}

/**
 * YouTube API Videos Response Factory
 * Mimics YouTube Data API v3 videos.list response (for duration retrieval)
 */
export interface YouTubeVideosResponse {
  items: Array<{
    id: string;
    contentDetails: {
      duration: string; // ISO 8601 format (e.g., "PT4M13S")
    };
  }>;
}

export function createYouTubeVideosResponse(
  videoIds: string[],
  durationSeconds?: number
): YouTubeVideosResponse {
  return {
    items: videoIds.map(videoId => ({
      id: videoId,
      contentDetails: {
        duration: durationSeconds
          ? convertSecondsToISO8601(durationSeconds)
          : convertSecondsToISO8601(faker.number.int({ min: 30, max: 600 }))
      }
    }))
  };
}

/**
 * Helper: Convert seconds to ISO 8601 duration format
 * Example: 253 seconds → "PT4M13S"
 */
function convertSecondsToISO8601(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (minutes > 0) duration += `${minutes}M`;
  if (secs > 0) duration += `${secs}S`;

  return duration || 'PT0S';
}

/**
 * YouTube Error Response Factory
 * Mimics YouTube API error responses
 */
export interface YouTubeErrorResponse {
  error: {
    code: number;
    message: string;
    errors: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

export function createYouTubeErrorResponse(
  code: number,
  reason: string
): YouTubeErrorResponse {
  const messages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized - Invalid API key',
    403: 'Forbidden - Quota exceeded',
    404: 'Not Found',
    500: 'Internal Server Error'
  };

  return {
    error: {
      code,
      message: messages[code] || 'Unknown error',
      errors: [
        {
          domain: 'youtube.quota',
          reason,
          message: messages[code] || 'Unknown error'
        }
      ]
    }
  };
}

/**
 * Quota Usage Factory
 * Creates QuotaUsage objects for testing quota tracking
 */
export interface QuotaUsage {
  used: number;
  limit: number;
  remaining: number;
  resetTime?: Date;
}

export function createQuotaUsage(overrides?: Partial<QuotaUsage>): QuotaUsage {
  const limit = overrides?.limit || 10000;
  const used = overrides?.used || 0;

  return {
    used,
    limit,
    remaining: limit - used,
    resetTime: overrides?.resetTime || new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    ...overrides
  };
}

/**
 * Valid API Key Factory
 * Generates realistic-looking YouTube API keys for testing
 */
export function createValidApiKey(): string {
  return `AIzaSy${faker.string.alphanumeric(33)}`; // YouTube API keys are 39 chars
}

/**
 * Search Options Factory
 * Creates SearchOptions objects for YouTube API requests
 */
export interface SearchOptions {
  maxResults?: number;
  order?: 'relevance' | 'date' | 'rating' | 'viewCount';
  videoDuration?: 'short' | 'medium' | 'long' | 'any';
  relevanceLanguage?: string;
}

export function createSearchOptions(overrides?: Partial<SearchOptions>): SearchOptions {
  return {
    maxResults: 10,
    order: 'relevance',
    videoDuration: 'any',
    relevanceLanguage: 'en',
    ...overrides
  };
}

/**
 * Test Environment Variables Factory
 * Creates complete environment object for YouTube API tests
 */
export function createYouTubeEnv(): NodeJS.ProcessEnv {
  return {
    YOUTUBE_API_KEY: createValidApiKey(),
    NODE_ENV: 'test'
  };
}

/**
 * Project Factory (for integration tests)
 */
export interface TestProject {
  id: string;
  name: string;
  topic: string;
  current_step: string;
  visuals_generated: boolean;
}

export function createTestProject(overrides?: Partial<TestProject>): TestProject {
  return {
    id: faker.string.uuid(),
    name: faker.company.catchPhrase(),
    topic: faker.lorem.sentence(),
    current_step: 'visual-sourcing',
    visuals_generated: false,
    ...overrides
  };
}

/**
 * Scene Factory (for integration tests)
 */
export interface TestScene {
  id: string;
  project_id: string;
  scene_number: number;
  text: string;
  duration?: number; // Voiceover duration in seconds
}

export function createTestScene(overrides?: Partial<TestScene>): TestScene {
  return {
    id: faker.string.uuid(),
    project_id: faker.string.uuid(),
    scene_number: 1,
    text: faker.lorem.paragraph(),
    duration: faker.number.int({ min: 10, max: 120 }), // 10s - 2min
    ...overrides
  };
}

/**
 * Batch factory for multiple test scenes
 */
export function createTestScenes(
  count: number = 5,
  projectId?: string
): TestScene[] {
  const project = projectId || faker.string.uuid();

  return Array.from({ length: count }, (_, index) =>
    createTestScene({
      project_id: project,
      scene_number: index + 1
    })
  );
}
