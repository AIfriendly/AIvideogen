/**
 * Story 6.7: Channel Intelligence API Tests - RAG Setup
 *
 * ATDD: Failing tests (RED phase) for RAG setup and status API endpoints.
 * Tests cover AC-6.7.1, AC-6.7.2, AC-6.7.5, AC-6.7.6
 *
 * @see docs/stories/stories-epic-6/story-6.7.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRAGConfig, createEstablishedRAGConfig, createChannel } from '../../factories/rag-factories';

// Mock request helper (similar to existing API test patterns)
const mockRequest = async (method: string, url: string, data?: unknown) => {
  // This would be implemented with actual fetch or supertest
  // For now, we're creating the test structure
  throw new Error('Not implemented - test should fail in RED phase');
};

describe('RAG Setup API', () => {
  describe('POST /api/rag/setup - AC-6.7.1, AC-6.7.2', () => {
    it('6.7-INT-003: should persist RAG configuration for established channel mode', async () => {
      // GIVEN: Valid RAG config for established channel
      const config = createEstablishedRAGConfig({
        userChannelId: 'UCtest1234567890abcdef',
        competitorChannels: ['UCcomp1234567890abcdef'],
        niche: 'military',
      });

      // WHEN: Creating RAG setup via API
      const response = await mockRequest('POST', '/api/rag/setup', {
        mode: config.mode,
        config: {
          userChannelId: config.userChannelId,
          competitorChannels: config.competitorChannels,
          niche: config.niche,
          newsEnabled: config.newsEnabled,
          trendsEnabled: config.trendsEnabled,
        },
      });

      // THEN: Setup should succeed
      expect(response.status).toBe(201);

      // AND: Response should include job IDs for initial sync
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.jobIds).toBeDefined();
      expect(Array.isArray(body.jobIds)).toBe(true);
      expect(body.jobIds.length).toBeGreaterThan(0);
    });

    it('6.7-INT-003b: should persist RAG configuration for cold start mode', async () => {
      // GIVEN: Valid RAG config for cold start
      const config = createRAGConfig({
        mode: 'cold_start',
        niche: 'gaming',
        competitorChannels: [
          'UCgaming1234567890abcd',
          'UCgaming2234567890abcd',
          'UCgaming3234567890abcd',
        ],
      });

      // WHEN: Creating RAG setup via API
      const response = await mockRequest('POST', '/api/rag/setup', {
        mode: config.mode,
        config: {
          niche: config.niche,
          competitorChannels: config.competitorChannels,
          newsEnabled: config.newsEnabled,
          trendsEnabled: config.trendsEnabled,
        },
      });

      // THEN: Setup should succeed
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.jobIds).toHaveLength(3); // One job per channel
    });

    it('6.7-INT-003c: should reject invalid mode', async () => {
      // GIVEN: Invalid mode value
      // WHEN: Creating RAG setup with invalid mode
      const response = await mockRequest('POST', '/api/rag/setup', {
        mode: 'invalid_mode',
        config: {
          niche: 'military',
        },
      });

      // THEN: Should return validation error
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('mode');
    });

    it('6.7-INT-003d: should require userChannelId for established mode', async () => {
      // GIVEN: Established mode without userChannelId
      // WHEN: Creating RAG setup
      const response = await mockRequest('POST', '/api/rag/setup', {
        mode: 'established',
        config: {
          niche: 'military',
          // Missing userChannelId
        },
      });

      // THEN: Should return validation error
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('userChannelId');
    });
  });

  describe('GET /api/rag/status - AC-6.7.5', () => {
    it('6.7-INT-004: should return accurate sync status', async () => {
      // GIVEN: RAG is configured and has synced content

      // WHEN: Fetching RAG status
      const response = await mockRequest('GET', '/api/rag/status');

      // THEN: Should return success
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);

      // AND: Should include RAG enabled status
      expect(body.data.ragEnabled).toBe(true);

      // AND: Should include config
      expect(body.data.ragConfig).toBeDefined();
      expect(body.data.ragConfig.mode).toBeDefined();

      // AND: Should include last sync timestamp
      expect(body.data.lastSync).toBeDefined();

      // AND: Should include stats
      expect(body.data.stats).toBeDefined();
      expect(typeof body.data.stats.videosIndexed).toBe('number');
      expect(typeof body.data.stats.newsArticles).toBe('number');
      expect(typeof body.data.stats.pendingJobs).toBe('number');
    });

    it('6.7-INT-004b: should return empty stats when RAG not configured', async () => {
      // GIVEN: RAG is not configured

      // WHEN: Fetching RAG status
      const response = await mockRequest('GET', '/api/rag/status');

      // THEN: Should return success but ragEnabled false
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.ragEnabled).toBe(false);
      expect(body.data.ragConfig).toBeNull();
    });
  });

  describe('POST /api/rag/sync - AC-6.7.6', () => {
    it('6.7-INT-002: should trigger sync job correctly', async () => {
      // GIVEN: RAG is configured

      // WHEN: Triggering manual sync
      const response = await mockRequest('POST', '/api/rag/sync', {
        syncType: 'all',
      });

      // THEN: Should return success
      expect(response.status).toBe(202); // Accepted

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.jobId).toBeDefined();
    });

    it('6.7-INT-002b: should allow sync type selection', async () => {
      // GIVEN: RAG is configured

      // WHEN: Triggering channel-only sync
      const response = await mockRequest('POST', '/api/rag/sync', {
        syncType: 'channel',
      });

      // THEN: Should return success
      expect(response.status).toBe(202);

      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('6.7-INT-002c: should prevent concurrent syncs (debounce)', async () => {
      // GIVEN: A sync is already running

      // WHEN: Triggering another sync immediately
      const response = await mockRequest('POST', '/api/rag/sync', {
        syncType: 'all',
      });

      // THEN: Should return conflict or existing job ID
      // Either 409 Conflict or 200 with existing job ID
      expect([200, 202, 409]).toContain(response.status);

      if (response.status === 409) {
        const body = await response.json();
        expect(body.error).toContain('sync already');
      }
    });
  });
});

describe('Channel Validation API', () => {
  describe('POST /api/channels/validate - AC-6.7.2', () => {
    it('6.7-INT-001: should validate YouTube channel URL', async () => {
      // GIVEN: Valid YouTube channel URL
      const channelUrl = 'https://youtube.com/@TestChannel';

      // WHEN: Validating channel
      const response = await mockRequest('POST', '/api/channels/validate', {
        channelUrl,
      });

      // THEN: Should return success with channel data
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.valid).toBe(true);
      expect(body.channel).toBeDefined();
      expect(body.channel.channelId).toBeDefined();
      expect(body.channel.name).toBeDefined();
      expect(body.channel.videoCount).toBeDefined();
    });

    it('6.7-INT-008: should handle invalid URL formats gracefully', async () => {
      // GIVEN: Invalid URL format
      const invalidUrls = [
        'not-a-url',
        'https://example.com',
        'https://youtube.com/invalid',
        '',
        'javascript:alert(1)',
      ];

      for (const url of invalidUrls) {
        // WHEN: Validating invalid channel
        const response = await mockRequest('POST', '/api/channels/validate', {
          channelUrl: url,
        });

        // THEN: Should return validation error
        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.valid).toBe(false);
        expect(body.error).toBeDefined();
      }
    });

    it('6.7-INT-009: should handle YouTube API rate limits', async () => {
      // GIVEN: YouTube API is rate limited (mock scenario)

      // WHEN: Validating channel
      const response = await mockRequest('POST', '/api/channels/validate', {
        channelUrl: 'https://youtube.com/@TestChannel',
      });

      // THEN: Should return appropriate error with retry hint
      // This test would need mocking of YouTube API
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.error).toContain('rate limit');
      expect(body.retryAfter).toBeDefined();
    });
  });
});

describe('Competitor Management API', () => {
  describe('POST /api/rag/competitors - AC-6.7.4', () => {
    it('6.7-INT-005: should enforce 5-channel limit server-side', async () => {
      // GIVEN: User already has 5 competitors (seeded)

      // WHEN: Trying to add 6th competitor
      const response = await mockRequest('POST', '/api/rag/competitors', {
        channelUrl: 'https://youtube.com/@SixthCompetitor',
      });

      // THEN: Should return error
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('maximum');
      expect(body.error).toContain('5');
    });

    it('6.7-INT-005b: should add competitor and trigger sync', async () => {
      // GIVEN: User has fewer than 5 competitors

      // WHEN: Adding a new competitor
      const response = await mockRequest('POST', '/api/rag/competitors', {
        channelUrl: 'https://youtube.com/@NewCompetitor',
      });

      // THEN: Should return success with job ID
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.competitor).toBeDefined();
      expect(body.syncJobId).toBeDefined();
    });
  });

  describe('DELETE /api/rag/competitors/[id] - AC-6.7.4', () => {
    it('6.7-INT-005c: should remove competitor channel', async () => {
      // GIVEN: User has a competitor channel

      // WHEN: Removing the competitor
      const competitorId = 'test-competitor-id';
      const response = await mockRequest('DELETE', `/api/rag/competitors/${competitorId}`);

      // THEN: Should return success
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });
});

describe('RAG Health API', () => {
  describe('GET /api/rag/health - AC-6.7.7', () => {
    it('6.7-INT-006: should perform deep ChromaDB health check', async () => {
      // GIVEN: ChromaDB is running

      // WHEN: Checking RAG health
      const response = await mockRequest('GET', '/api/rag/health');

      // THEN: Should return comprehensive health status
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.chromadb).toBeDefined();
      expect(body.chromadb.connected).toBe(true);

      // AND: Should include collection counts
      expect(body.collections).toBeDefined();
      expect(typeof body.collections.videos).toBe('number');
      expect(typeof body.collections.news).toBe('number');
      expect(typeof body.collections.trends).toBe('number');
    });

    it('6.7-INT-006b: should report disconnected status correctly', async () => {
      // GIVEN: ChromaDB is not running (mock scenario)

      // WHEN: Checking RAG health
      const response = await mockRequest('GET', '/api/rag/health');

      // THEN: Should return disconnected status
      expect(response.status).toBe(200); // Still 200, but status is disconnected

      const body = await response.json();
      expect(body.chromadb.connected).toBe(false);
      expect(body.chromadb.error).toBeDefined();
    });
  });
});

describe('Topic Suggestions API', () => {
  describe('GET /api/rag/topics - AC-6.7.8', () => {
    it('6.7-INT-007: should return AI-generated topic suggestions', async () => {
      // GIVEN: User has indexed content via RAG

      // WHEN: Requesting topic suggestions
      const response = await mockRequest('GET', '/api/rag/topics');

      // THEN: Should return 3-5 topics
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.topics).toBeDefined();
      expect(body.topics.length).toBeGreaterThanOrEqual(3);
      expect(body.topics.length).toBeLessThanOrEqual(5);

      // AND: Each topic should have title and description
      for (const topic of body.topics) {
        expect(topic.title).toBeDefined();
        expect(topic.description).toBeDefined();
      }
    });

    it('6.7-INT-007b: should return empty array when no content indexed', async () => {
      // GIVEN: No content has been indexed

      // WHEN: Requesting topic suggestions
      const response = await mockRequest('GET', '/api/rag/topics');

      // THEN: Should return success with empty or minimal suggestions
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.topics).toBeDefined();
      // May return empty or generic suggestions
    });
  });

  describe('GET /api/channels/suggestions - AC-6.7.3', () => {
    it('6.7-INT-010: should return suggested channels for niche', async () => {
      // GIVEN: User is in Cold Start setup

      // WHEN: Requesting channel suggestions for a niche
      const response = await mockRequest('GET', '/api/channels/suggestions?niche=military');

      // THEN: Should return 5 suggested channels
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.channels).toBeDefined();
      expect(body.channels.length).toBe(5);

      // AND: Each channel should have required fields
      for (const channel of body.channels) {
        expect(channel.channelId).toBeDefined();
        expect(channel.name).toBeDefined();
        expect(channel.thumbnailUrl).toBeDefined();
      }
    });

    it('6.7-INT-010b: should return empty gracefully for unknown niche', async () => {
      // GIVEN: Unknown or obscure niche

      // WHEN: Requesting channel suggestions
      const response = await mockRequest('GET', '/api/channels/suggestions?niche=obscure-niche-xyz');

      // THEN: Should return success but empty or minimal channels
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.channels).toBeDefined();
      // May be empty array for unknown niches
    });
  });
});
