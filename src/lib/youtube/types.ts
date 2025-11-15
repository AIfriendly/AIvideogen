/**
 * Content type classification for YouTube search filtering
 *
 * Different content types require different search strategies and filtering rules:
 * - GAMEPLAY: Gaming footage and gameplay videos
 * - TUTORIAL: Educational and how-to content
 * - NATURE: Wildlife, landscapes, and natural phenomena
 * - B_ROLL: Generic background footage and b-roll clips
 * - DOCUMENTARY: Documentary-style footage and narration
 * - URBAN: City scenes, architecture, and urban environments
 * - ABSTRACT: Abstract concepts translated to visual metaphors
 */
export enum ContentType {
  GAMEPLAY = 'gameplay',
  TUTORIAL = 'tutorial',
  NATURE = 'nature',
  B_ROLL = 'b-roll',
  DOCUMENTARY = 'documentary',
  URBAN = 'urban',
  ABSTRACT = 'abstract'
}

/**
 * Scene analysis result containing visual themes and YouTube search queries
 *
 * This interface represents the output of LLM-based scene analysis, extracting
 * visual elements from script text and generating optimized YouTube search queries.
 *
 * @example
 * ```typescript
 * const analysis: SceneAnalysis = {
 *   mainSubject: 'lion',
 *   setting: 'savanna',
 *   mood: 'sunset',
 *   action: 'roaming',
 *   keywords: ['wildlife', 'grassland', 'golden hour', 'majestic'],
 *   primaryQuery: 'lion savanna sunset wildlife',
 *   alternativeQueries: [
 *     'african lion sunset',
 *     'lion walking grassland golden hour'
 *   ],
 *   contentType: ContentType.NATURE
 * };
 * ```
 */
export interface SceneAnalysis {
  /**
   * Primary visual subject (e.g., "lion", "player", "chef")
   * The main focus of the scene that should appear in search results
   */
  mainSubject: string;

  /**
   * Location or environment (e.g., "savanna", "dark forest", "kitchen")
   * The setting where the scene takes place
   */
  setting: string;

  /**
   * Atmosphere or tone (e.g., "sunset", "peaceful", "neon lights")
   * The mood, lighting, or emotional quality of the scene
   */
  mood: string;

  /**
   * Key action or movement (e.g., "roaming", "navigating", "mixing")
   * What is happening in the scene, the primary activity
   */
  action: string;

  /**
   * Additional relevant keywords for search diversification
   * Concrete visual elements that enhance search query effectiveness
   */
  keywords: string[];

  /**
   * Primary YouTube search query (4-6 keywords)
   * The most relevant search query optimized for YouTube's algorithm
   * Format: "{main_subject} {setting} {mood/time} {action}"
   */
  primaryQuery: string;

  /**
   * Alternative search query variations (2-3 queries)
   * Different keyword combinations, synonyms, or focus shifts
   * to increase result diversity and reduce over-reliance on single query
   */
  alternativeQueries: string[];

  /**
   * Scene category for specialized filtering
   * Used by Story 3.4 filtering logic to apply content-type-specific ranking rules
   */
  contentType: ContentType;
}

// ============================================================================
// Story 3.1: YouTube API Client Types
// ============================================================================

/**
 * Video search result from YouTube API
 */
export interface VideoResult {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  embedUrl: string;
  publishedAt: string;
  description: string;
  viewCount?: number;
  likeCount?: number;
  duration?: string;
}

/**
 * Search options for YouTube video queries
 */
export interface SearchOptions {
  maxResults?: number;
  relevanceLanguage?: string;
  videoEmbeddable?: boolean;
  videoDuration?: 'short' | 'medium' | 'long';
  order?: 'relevance' | 'date' | 'viewCount' | 'rating';
}

/**
 * Quota usage tracking information
 */
export interface QuotaUsage {
  used: number;
  limit: number;
  remaining: number;
  resetTime: Date;
}

/**
 * YouTube API error codes
 */
export enum YouTubeErrorCode {
  API_KEY_NOT_CONFIGURED = 'YOUTUBE_API_KEY_NOT_CONFIGURED',
  API_KEY_INVALID = 'YOUTUBE_API_KEY_INVALID',
  QUOTA_EXCEEDED = 'YOUTUBE_QUOTA_EXCEEDED',
  RATE_LIMITED = 'YOUTUBE_RATE_LIMITED',
  NETWORK_ERROR = 'YOUTUBE_NETWORK_ERROR',
  INVALID_REQUEST = 'YOUTUBE_INVALID_REQUEST',
  SERVICE_UNAVAILABLE = 'YOUTUBE_SERVICE_UNAVAILABLE'
}

/**
 * Custom error class for YouTube API errors
 */
export class YouTubeError extends Error {
  constructor(
    public code: YouTubeErrorCode,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'YouTubeError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, YouTubeError);
    }
  }

  toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack
    };
  }
}
