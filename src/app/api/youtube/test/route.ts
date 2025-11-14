/**
 * YouTube API Test Endpoint
 *
 * GET /api/youtube/test
 *
 * Tests YouTube API client initialization and connectivity.
 * Performs a simple search to verify API key and configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeClient } from '@/lib/youtube/factory';
import { YouTubeError, YouTubeErrorCode } from '@/lib/youtube/types';

/**
 * Test response structure
 */
interface TestResponse {
  success: boolean;
  message?: string;
  quotaUsage?: {
    used: number;
    limit: number;
    remaining: number;
    resetTime: string;
  };
  testResults?: {
    searchWorking: boolean;
    videoId?: string;
    title?: string;
    resultCount?: number;
  };
  error?: {
    code: string;
    message: string;
    guidance?: string;
  };
}

/**
 * GET /api/youtube/test
 *
 * Test YouTube API client initialization and basic search functionality.
 *
 * @returns Test results including quota usage and search test
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/youtube/test');
 * const data = await response.json();
 *
 * if (data.success) {
 *   console.log('YouTube API configured correctly');
 *   console.log(`Quota: ${data.quotaUsage.used}/${data.quotaUsage.limit}`);
 * }
 * ```
 */
export async function GET(request: NextRequest): Promise<NextResponse<TestResponse>> {
  try {
    // Initialize YouTube client
    const client = getYouTubeClient();

    // Get current quota usage
    const quotaUsage = client.getQuotaUsage();

    // Perform test search
    const results = await client.searchVideos('test', { maxResults: 1 });

    // Build success response
    const response: TestResponse = {
      success: true,
      message: 'YouTube API client initialized successfully',
      quotaUsage: {
        used: quotaUsage.used,
        limit: quotaUsage.limit,
        remaining: quotaUsage.remaining,
        resetTime: quotaUsage.resetTime.toISOString()
      },
      testResults: {
        searchWorking: true,
        videoId: results[0]?.videoId,
        title: results[0]?.title,
        resultCount: results.length
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    // Handle YouTube-specific errors
    if (error instanceof YouTubeError) {
      const errorResponse: TestResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          guidance: error.context?.guidance
        }
      };

      // Determine HTTP status based on error code
      let status = 500;

      switch (error.code) {
        case YouTubeErrorCode.API_KEY_NOT_CONFIGURED:
          status = 503; // Service Unavailable
          break;
        case YouTubeErrorCode.API_KEY_INVALID:
          status = 401; // Unauthorized
          break;
        case YouTubeErrorCode.QUOTA_EXCEEDED:
          status = 429; // Too Many Requests
          break;
        case YouTubeErrorCode.RATE_LIMITED:
          status = 429; // Too Many Requests
          break;
        case YouTubeErrorCode.INVALID_REQUEST:
          status = 400; // Bad Request
          break;
        case YouTubeErrorCode.NETWORK_ERROR:
        case YouTubeErrorCode.SERVICE_UNAVAILABLE:
          status = 503; // Service Unavailable
          break;
      }

      return NextResponse.json(errorResponse, { status });
    }

    // Handle generic errors
    console.error('YouTube test endpoint error:', error);

    const errorResponse: TestResponse = {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        guidance: 'Check server logs for details'
      }
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
