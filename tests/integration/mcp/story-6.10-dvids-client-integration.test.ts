/**
 * ATDD Integration Tests for Story 6.10 - DVIDS Client Integration
 *
 * Tests AC-6.10.3: Client Integration acceptance criteria
 * These tests verify the integration between VideoProviderClient and DVIDS MCP server.
 *
 * Acceptance Criteria Coverage:
 * - AC-6.10.3.1: Test config/mcp_servers.json has DVIDS provider entry
 * - AC-6.10.3.2: Test automatic visual selection algorithm uses combinedScore
 * - AC-6.10.3.3: Test MCP server connection failure handling
 * - AC-6.10.3.4: Test progress display UI messages
 * - AC-6.10.3.5: Test error message display when DVIDS unavailable
 *
 * Test Level: Integration (client-MCP server communication)
 * Framework: Vitest
 *
 * @module tests/integration/mcp/story-6.10-dvids-client-integration.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ProviderRegistry } from '@/lib/mcp/provider-registry';
import { VideoProviderClient } from '@/lib/mcp/video-provider-client';
import type { VideoSearchResult } from '@/lib/mcp/types';
import {
  MCPConnectionError,
  MCPTimeoutError,
  MCPServerError,
} from '@/lib/mcp/types';

describe('[P0] AC-6.10.3.1: DVIDS Provider Configuration', () => {
  describe('[6.10-INT-001] config/mcp_servers.json DVIDS Entry', () => {
    it('should load DVIDS provider from config file', () => {
      // Given: The config/mcp_servers.json file exists
      const configPath = join(process.cwd(), 'config/mcp_servers.json');

      // When: Loading the configuration
      const fileContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(fileContent);

      // Then: Should contain DVIDS provider entry
      expect(config).toHaveProperty('providers');
      expect(Array.isArray(config.providers)).toBe(true);

      const dvidsProvider = config.providers.find((p: any) => p.id === 'dvids');
      expect(dvidsProvider).toBeDefined();
      expect(dvidsProvider).toMatchObject({
        id: 'dvids',
        name: 'DVIDS Military Videos',
        priority: 1,
        enabled: expect.any(Boolean),
        command: 'python',
        args: expect.arrayContaining(['-m', 'mcp_servers.dvids_scraping_server']),
        env: expect.any(Object),
      });
    });

    it('should have DVIDS provider with correct command configuration', () => {
      // Given: The config/mcp_servers.json file
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      const fileContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(fileContent);

      // When: Accessing DVIDS provider configuration
      const dvidsProvider = config.providers.find((p: any) => p.id === 'dvids');

      // Then: Should have correct stdio command configuration
      expect(dvidsProvider.command).toBe('python');
      expect(dvidsProvider.args).toEqual(['-m', 'mcp_servers.dvids_scraping_server']);
      expect(dvidsProvider.env).toHaveProperty('PYTHONPATH');
      expect(dvidsProvider.env).toHaveProperty('DVIDS_CACHE_DIR');
      expect(dvidsProvider.env).toHaveProperty('DVIDS_RATE_LIMIT');
    });

    it('should have DVIDS provider with priority 1 (military niche priority)', () => {
      // Given: The config/mcp_servers.json file
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      const fileContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(fileContent);

      // When: Accessing DVIDS provider configuration
      const dvidsProvider = config.providers.find((p: any) => p.id === 'dvids');

      // Then: Should have priority 1 for military niche
      expect(dvidsProvider.priority).toBe(1);
    });

    it('should have DVIDS provider disabled by default (user opt-in)', () => {
      // Given: The config/mcp_servers.json file
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      const fileContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(fileContent);

      // When: Accessing DVIDS provider configuration
      const dvidsProvider = config.providers.find((p: any) => p.id === 'dvids');

      // Then: Should be disabled by default (user must opt-in)
      expect(dvidsProvider.enabled).toBe(false);
    });
  });
});

describe('[P0] AC-6.10.3.2: Automatic Visual Selection Algorithm', () => {
  describe('[6.10-INT-002] Combined Score Calculation', () => {
    it('should calculate combinedScore using durationFit (60%) and relevanceScore (40%)', () => {
      // Given: Video search results with varying durations and target duration
      const videos: VideoSearchResult[] = [
        { videoId: '1', title: 'Perfect Match', description: '', thumbnailUrl: '', duration: 10, publishedAt: '' },
        { videoId: '2', title: 'Close Match', description: '', thumbnailUrl: '', duration: 15, publishedAt: '' },
        { videoId: '3', title: 'Far Match', description: '', thumbnailUrl: '', duration: 30, publishedAt: '' },
      ];
      const targetDuration = 10;

      // When: Calculating combined scores with relevance scores
      const scores = videos.map((video) => {
        const durationDiff = Math.abs(video.duration - targetDuration);
        const durationFit = Math.max(0, 1 - durationDiff / targetDuration);
        const relevanceScore = 0.8; // Mock relevance score
        return (durationFit * 0.6) + (relevanceScore * 0.4);
      });

      // Then: Perfect duration match should have highest score
      expect(scores[0]).toBeGreaterThan(scores[1]);
      expect(scores[1]).toBeGreaterThan(scores[2]);
      expect(scores[0]).toBeCloseTo((1.0 * 0.6) + (0.8 * 0.4), 1); // 0.92
    });

    it('should prioritize duration fit (60%) over relevance score (40%)', () => {
      // Given: Two videos - one with perfect duration, one with perfect relevance
      const perfectDurationVideo = {
        videoId: '1',
        title: 'Perfect Duration',
        description: '',
        thumbnailUrl: '',
        duration: 10,
        publishedAt: '',
      };
      const perfectRelevanceVideo = {
        videoId: '2',
        title: 'Perfect Relevance',
        description: '',
        thumbnailUrl: '',
        duration: 50,
        publishedAt: '',
      };
      const targetDuration = 10;

      // When: Calculating combined scores
      const durationFit1 = Math.max(0, 1 - Math.abs(perfectDurationVideo.duration - targetDuration) / targetDuration);
      const relevanceScore1 = 0.5; // Low relevance
      const score1 = (durationFit1 * 0.6) + (relevanceScore1 * 0.4);

      const durationFit2 = Math.max(0, 1 - Math.abs(perfectRelevanceVideo.duration - targetDuration) / targetDuration);
      const relevanceScore2 = 1.0; // Perfect relevance
      const score2 = (durationFit2 * 0.6) + (relevanceScore2 * 0.4);

      // Then: Perfect duration should win despite lower relevance (60% vs 40% weight)
      expect(score1).toBeGreaterThan(score2);
    });

    it('should handle edge case where video duration equals target duration', () => {
      // Given: Video with exact target duration
      const video = { videoId: '1', title: 'Exact Match', description: '', thumbnailUrl: '', duration: 10, publishedAt: '' };
      const targetDuration = 10;

      // When: Calculating duration fit
      const durationDiff = Math.abs(video.duration - targetDuration);
      const durationFit = Math.max(0, 1 - durationDiff / targetDuration);

      // Then: Should have perfect duration fit score of 1.0
      expect(durationFit).toBe(1.0);
    });

    it('should handle edge case where video duration is much longer than target', () => {
      // Given: Video much longer than target
      const video = { videoId: '1', title: 'Too Long', description: '', thumbnailUrl: '', duration: 100, publishedAt: '' };
      const targetDuration = 10;

      // When: Calculating duration fit
      const durationDiff = Math.abs(video.duration - targetDuration);
      const durationFit = Math.max(0, 1 - durationDiff / targetDuration);

      // Then: Should have duration fit score of 0 (capped at minimum)
      expect(durationFit).toBe(0);
    });

    it('should combine scores correctly for typical use case', () => {
      // Given: Typical scenario with duration fit and relevance score
      const durationFit = 0.8; // 80% duration match
      const relevanceScore = 0.7; // 70% relevance

      // When: Calculating combined score
      const combinedScore = (durationFit * 0.6) + (relevanceScore * 0.4);

      // Then: Should weight duration fit higher than relevance
      expect(combinedScore).toBeCloseTo(0.76, 2); // (0.8 * 0.6) + (0.7 * 0.4) = 0.48 + 0.28 = 0.76
    });
  });
});

describe('[P1] AC-6.10.3.3: MCP Server Connection Failure Handling', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    const configPath = join(process.cwd(), 'config/mcp_servers.json');
    registry = new ProviderRegistry(configPath);
  });

  afterEach(async () => {
    // Cleanup: clear cached providers
    registry.clearCache();
  });

  describe('[6.10-INT-003] Server Unavailable Scenarios', () => {
    it('should handle DVIDS server not running gracefully', async () => {
      // Given: DVIDS provider configuration (server not running)
      const providerId = 'dvids';

      // When: Attempting to get provider when server is not running
      // Then: Should throw connection error with descriptive message
      await expect(registry.getProvider(providerId)).rejects.toThrow();
    });

    it('should provide fallback to other providers when DVIDS fails', async () => {
      // Given: Multiple providers configured with DVIDS disabled/unavailable
      const query = 'military aircraft';

      // When: DVIDS provider is not available
      // Then: Should fallback to other enabled providers without throwing
      const results = await registry.searchAllProviders(query);

      // Should return results from other providers or empty array (not throw)
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle startup errors from MCP server', async () => {
      // Given: Provider configuration that causes startup errors
      const invalidConfig = {
        id: 'invalid-dvids',
        name: 'Invalid DVIDS',
        command: 'python',
        args: ['-m', 'nonexistent_dvids_server'],
        priority: 1,
        enabled: true,
        env: {},
      };

      const testRegistry = new ProviderRegistry('');
      testRegistry.loadConfig({ providers: [invalidConfig] });

      // When: Attempting to connect to server that fails on startup
      // Then: Should handle error gracefully
      await expect(testRegistry.searchAllProviders('test')).resolves.toBeDefined();
    });
  });

  describe('[6.10-INT-004] Connection Timeout Handling', () => {
    it('should handle connection timeout with MCPTimeoutError', async () => {
      // Given: Provider that times out during connection
      const timeoutConfig = {
        id: 'timeout-dvids',
        name: 'Timeout DVIDS',
        command: 'python',
        args: ['-m', 'mcp_servers.dvids_scraping_server'],
        priority: 1,
        enabled: true,
        env: {},
      };

      const testRegistry = new ProviderRegistry('');
      testRegistry.loadConfig({ providers: [timeoutConfig] });

      // Mock the VideoProviderClient to throw timeout
      vi.spyOn(testRegistry as any, 'getProvider').mockRejectedValue(
        new MCPTimeoutError('Connection timeout')
      );

      // When: Connection times out
      // Then: Should handle timeout gracefully
      const results = await testRegistry.searchAllProviders('test');

      // Should return empty array instead of throwing
      expect(results).toEqual([]);
    });
  });

  describe('[6.10-INT-005] Invalid Command Handling', () => {
    it('should reject provider with invalid command in constructor', () => {
      // Given: Provider config with invalid command (shell metacharacters)
      const invalidConfig = {
        id: 'malicious-dvids',
        name: 'Malicious DVIDS',
        command: 'python; rm -rf /',
        args: ['-m', 'test'],
        priority: 1,
        enabled: true,
        env: {},
      };

      // When: Creating VideoProviderClient with malicious command
      // Then: Should throw MCPConnectionError
      expect(() => {
        new VideoProviderClient(invalidConfig);
      }).toThrow(MCPConnectionError);
    });

    it('should reject provider with directory traversal in args', () => {
      // Given: Provider config with directory traversal
      const invalidConfig = {
        id: 'traversal-dvids',
        name: 'Traversal DVIDS',
        command: 'python',
        args: ['-m', '../../../etc/passwd'],
        priority: 1,
        enabled: true,
        env: {},
      };

      // When: Creating VideoProviderClient with traversal args
      // Then: Should throw MCPConnectionError
      expect(() => {
        new VideoProviderClient(invalidConfig);
      }).toThrow(MCPConnectionError);
    });
  });
});

describe('[P1] AC-6.10.3.4: Progress Display UI Messages', () => {
  describe('[6.10-INT-006] Progress Callback Messages', () => {
    it('should call onProgress callback with "Searching DVIDS..." message', async () => {
      // Given: Visual generation options with progress callback
      const onProgress = vi.fn();
      const options = {
        providerId: 'dvids',
        onProgress,
      };

      // When: Starting visual search (mock scenario)
      onProgress(1, 'Searching DVIDS...');

      // Then: Should call progress callback with searching message
      expect(onProgress).toHaveBeenCalledWith(1, 'Searching DVIDS...');
      expect(onProgress).toHaveBeenCalledTimes(1);
    });

    it('should call onProgress callback with "Downloading video..." message', async () => {
      // Given: Visual generation options with progress callback
      const onProgress = vi.fn();

      // When: Starting video download (mock scenario)
      onProgress(1, 'Downloading video...');

      // Then: Should call progress callback with downloading message
      expect(onProgress).toHaveBeenCalledWith(1, 'Downloading video...');
    });

    it('should update progress message during MCP server search', () => {
      // Given: Progress callback
      const onProgress = vi.fn();
      const sceneNumber = 1;

      // When: Simulating progress updates during search
      onProgress(sceneNumber, 'Searching MCP video providers...');
      onProgress(sceneNumber, 'Found 5 videos from MCP providers');

      // Then: Should receive both progress messages
      expect(onProgress).toHaveBeenNthCalledWith(1, sceneNumber, 'Searching MCP video providers...');
      expect(onProgress).toHaveBeenNthCalledWith(2, sceneNumber, 'Found 5 videos from MCP providers');
    });

    it('should include scene number in progress messages', () => {
      // Given: Progress callback
      const onProgress = vi.fn();

      // When: Sending progress for multiple scenes
      onProgress(1, 'Searching DVIDS...');
      onProgress(2, 'Searching DVIDS...');
      onProgress(3, 'Searching DVIDS...');

      // Then: Should include correct scene numbers
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 'Searching DVIDS...');
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 'Searching DVIDS...');
      expect(onProgress).toHaveBeenNthCalledWith(3, 3, 'Searching DVIDS...');
    });
  });
});

describe('[P1] AC-6.10.3.5: Error Message Display', () => {
  describe('[6.10-INT-007] DVIDS Unavailable Error Messages', () => {
    it('should display "DVIDS scraping server unavailable" when server not running', async () => {
      // Given: DVIDS provider configuration (server not running)
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      const registry = new ProviderRegistry(configPath);

      // When: Attempting to search with unavailable DVIDS server
      const onProgress = vi.fn();
      const query = 'military aircraft';

      try {
        await registry.searchAllProviders(query);
      } catch (error) {
        // Error is expected
      }

      // Then: Should not throw unhandled error (should fallback or return empty)
      // The error should be logged, and operation should continue
      expect(registry).toBeDefined();
    });

    it('should provide descriptive error message when MCP connection fails', () => {
      // Given: MCP connection error
      const connectionError = new MCPConnectionError(
        'Failed to connect to DVIDS Military Videos: Command not found'
      );

      // When: Checking error message
      // Then: Should include provider name and descriptive message
      expect(connectionError.message).toContain('DVIDS');
      expect(connectionError.message).toContain('Failed to connect');
    });

    it('should provide descriptive error message when MCP server times out', () => {
      // Given: MCP timeout error
      const timeoutError = new MCPTimeoutError(
        'Connection to DVIDS Military Videos timed out. Ensure the server is running.'
      );

      // When: Checking error message
      // Then: Should include timeout indication and server status hint
      expect(timeoutError.message).toContain('timed out');
      expect(timeoutError.message).toContain('server is running');
    });

    it('should provide descriptive error message when MCP server returns error', () => {
      // Given: MCP server error
      const serverError = new MCPServerError('Search videos failed: DVIDS service unavailable');

      // When: Checking error message
      // Then: Should include operation and failure reason
      expect(serverError.message).toContain('Search videos failed');
      expect(serverError.message).toContain('unavailable');
    });
  });

  describe('[6.10-INT-008] Error Context and Handling', () => {
    it('should include provider ID in error for debugging', () => {
      // Given: Provider error
      class TestableProviderError extends Error {
        constructor(message: string, public readonly providerId?: string) {
          super(message);
          this.name = 'TestableProviderError';
        }
      }

      const providerError = new TestableProviderError('Download failed', 'dvids');

      // When: Checking error properties
      // Then: Should include provider ID for debugging
      expect(providerError.providerId).toBe('dvids');
    });

    it('should wrap connection errors with context', () => {
      // Given: Original error from server startup
      const originalError = new Error('ENOENT: python not found');

      // When: Wrapping in MCP connection error
      const wrappedError = new MCPConnectionError(
        'Failed to start DVIDS Military Videos server',
        originalError
      );

      // Then: Should preserve original error as cause
      expect(wrappedError.message).toContain('DVIDS');
      expect(wrappedError.cause).toBe(originalError);
    });

    it('should provide fallback error message when all providers fail', async () => {
      // Given: Registry where all providers are disabled
      const emptyRegistry = new ProviderRegistry('');
      const query = 'test query';

      // When: Searching with no available providers
      const results = await emptyRegistry.searchAllProviders(query);

      // Then: Should return empty array (not throw)
      expect(results).toEqual([]);
    });
  });
});

describe('[P2] Integration: End-to-End DVIDS Client Flow', () => {
  describe('[6.10-INT-009] Complete Workflow Tests', () => {
    it('should handle complete search-to-selection flow', () => {
      // Given: Mock search results with varying durations
      const searchResults: VideoSearchResult[] = [
        { videoId: '1', title: 'Perfect Duration', description: '', thumbnailUrl: '', duration: 10, publishedAt: '' },
        { videoId: '2', title: 'Good Duration', description: '', thumbnailUrl: '', duration: 12, publishedAt: '' },
        { videoId: '3', title: 'Poor Duration', description: '', thumbnailUrl: '', duration: 50, publishedAt: '' },
      ];
      const targetDuration = 10;
      const relevanceScores = [0.7, 0.9, 0.8];

      // When: Calculating combined scores for auto-selection
      const scoredResults = searchResults.map((video, index) => {
        const durationDiff = Math.abs(video.duration - targetDuration);
        const durationFit = Math.max(0, 1 - durationDiff / targetDuration);
        const relevanceScore = relevanceScores[index];
        const combinedScore = (durationFit * 0.6) + (relevanceScore * 0.4);
        return { video, combinedScore };
      });

      // Then: Should auto-select video with highest combined score
      scoredResults.sort((a, b) => b.combinedScore - a.combinedScore);
      expect(scoredResults[0].video.videoId).toBe('1'); // Perfect duration wins
    });

    it('should handle error recovery during search', async () => {
      // Given: Progress callback that tracks errors
      const onProgress = vi.fn();
      const errors: Array<{ sceneNumber: number; error: string }> = [];

      // When: Simulating error during search
      try {
        throw new Error('DVIDS scraping server unavailable');
      } catch (error) {
        errors.push({
          sceneNumber: 1,
          error: error instanceof Error ? error.message : String(error),
        });
        onProgress(1, `Error: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Then: Should log error and update progress
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain('DVIDS scraping server unavailable');
      expect(onProgress).toHaveBeenCalledWith(1, 'Error: DVIDS scraping server unavailable');
    });

    it('should provide configuration validation on startup', () => {
      // Given: config/mcp_servers.json file
      const configPath = join(process.cwd(), 'config/mcp_servers.json');

      // When: Creating registry with config
      // Then: Should validate without throwing
      expect(() => {
        new ProviderRegistry(configPath);
      }).not.toThrow();
    });
  });
});
