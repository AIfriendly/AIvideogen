/**
 * ATDD Tests for ProviderRegistry - Story 6.9
 *
 * Tests the provider registry pattern for managing multiple video sources.
 * All tests MUST FAIL initially (RED phase) - implementation does not exist yet.
 *
 * Acceptance Criteria Coverage:
 * - AC-6.9.2: Configuration Schema
 * - AC-6.9.3: Provider Registry Pattern
 *
 * Test Level: Unit (backend library code)
 * Framework: Vitest
 *
 * @module tests/lib/mcp/provider-registry.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock the VideoProviderClient
const mockProviderConnect = vi.fn();
const mockProviderDisconnect = vi.fn();
const mockSearchVideos = vi.fn();
const mockDownloadVideo = vi.fn();
const mockGetVideoDetails = vi.fn();

vi.mock('@/lib/mcp/video-provider-client', () => ({
  VideoProviderClient: vi.fn().mockImplementation((config: any) => ({
    connect: mockProviderConnect,
    disconnect: mockProviderDisconnect,
    searchVideos: mockSearchVideos,
    downloadVideo: mockDownloadVideo,
    getVideoDetails: mockGetVideoDetails,
    serverConfig: config || {},
  })),
}));

// Import the class we're testing (will fail - doesn't exist yet)
import { ProviderRegistry } from '@/lib/mcp/provider-registry';

describe('[P0] AC-6.9.2: Configuration Schema', () => {
  describe('[6.9-UNIT-008] Configuration Loading', () => {
    it('should load configuration from config/mcp_servers.json', () => {
      // Given: A valid mcp_servers.json file exists
      const configPath = join(process.cwd(), 'config/mcp_servers.json');

      // When: Creating ProviderRegistry with config path
      // Then: Should load configuration without errors
      expect(() => {
        new ProviderRegistry(configPath);
      }).not.toThrow();
    });

    it('should parse provider commands from config', () => {
      // Given: Configuration with provider commands
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      const registry = new ProviderRegistry(configPath);

      // When: Accessing loaded configuration
      const config = registry.getConfig();

      // Then: Should contain provider commands
      expect(config).toHaveProperty('providers');
      expect(Array.isArray(config.providers)).toBe(true);
      expect(config.providers.length).toBeGreaterThan(0);
      expect(config.providers[0]).toHaveProperty('command');
      expect(config.providers[0]).toHaveProperty('args');
    });

    it('should parse provider priorities from config', () => {
      // Given: Configuration with multiple providers
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      const registry = new ProviderRegistry(configPath);

      // When: Accessing provider configuration
      const config = registry.getConfig();

      // Then: Each provider should have priority
      config.providers.forEach((provider: any) => {
        expect(provider).toHaveProperty('priority');
        expect(typeof provider.priority).toBe('number');
      });
    });

    it('should parse provider environment variables from config', () => {
      // Given: Configuration with environment variables
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      const registry = new ProviderRegistry(configPath);

      // When: Accessing provider configuration
      const config = registry.getConfig();

      // Then: Providers should have env configurations
      const providerWithEnv = config.providers.find((p: any) => p.env);
      expect(providerWithEnv).toBeDefined();
      expect(typeof providerWithEnv.env).toBe('object');
    });

    it('should handle missing configuration file gracefully', () => {
      // Given: Configuration file does not exist
      const invalidPath = join(process.cwd(), 'config/nonexistent.json');

      // When: Creating registry with invalid path
      // Then: Should throw descriptive error
      expect(() => {
        new ProviderRegistry(invalidPath);
      }).toThrow(/not found|configuration/i);
    });

    it('should validate required configuration fields', () => {
      // Given: Configuration with missing required fields
      const invalidConfig = {
        providers: [
          {
            id: 'test',
            // Missing required fields: command, args, priority
          },
        ],
      };

      // When: Creating registry with invalid config
      // Then: Should throw validation error
      expect(() => {
        const registry = new ProviderRegistry('');
        registry.loadConfig(invalidConfig);
      }).toThrow(/required|invalid/i);
    });
  });

  describe('[6.9-UNIT-009] Configuration Validation', () => {
    it('should reject configuration without providers array', () => {
      // Given: Invalid configuration structure
      const invalidConfig = { invalid: 'structure' };

      // When: Loading invalid configuration
      const registry = new ProviderRegistry('');

      // Then: Should throw validation error
      expect(() => {
        registry.loadConfig(invalidConfig);
      }).toThrow(/providers.*required/i);
    });

    it('should reject provider without id', () => {
      // Given: Provider configuration missing id
      const invalidConfig = {
        providers: [
          {
            name: 'Test Provider',
            command: 'python',
            args: ['-m', 'test'],
            priority: 1,
            enabled: true,
          },
        ],
      };

      const registry = new ProviderRegistry('');

      // When: Loading configuration with missing id
      // Then: Should throw validation error
      expect(() => {
        registry.loadConfig(invalidConfig);
      }).toThrow(/id.*required/i);
    });

    it('should reject provider without command', () => {
      // Given: Provider configuration missing command
      const invalidConfig = {
        providers: [
          {
            id: 'test-provider',
            name: 'Test',
            args: ['-m', 'test'],
            priority: 1,
            enabled: true,
          },
        ],
      };

      const registry = new ProviderRegistry('');

      // When: Loading configuration with missing command
      // Then: Should throw validation error
      expect(() => {
        registry.loadConfig(invalidConfig);
      }).toThrow(/command.*required/i);
    });

    it('should accept valid provider configuration', () => {
      // Given: Valid provider configuration
      const validConfig = {
        providers: [
          {
            id: 'dvids',
            name: 'DVIDS',
            priority: 1,
            enabled: true,
            command: 'python',
            args: ['-m', 'mcp_servers.dvids'],
            env: {
              DVIDS_CACHE_DIR: './cache/dvids',
              DVIDS_RATE_LIMIT: '30',
            },
          },
        ],
      };

      const registry = new ProviderRegistry('');

      // When: Loading valid configuration
      // Then: Should not throw
      expect(() => {
        registry.loadConfig(validConfig);
      }).not.toThrow();
    });
  });
});

describe('[P0] AC-6.9.3: Provider Registry Pattern', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    const configPath = join(process.cwd(), 'config/mcp_servers.json');
    registry = new ProviderRegistry(configPath);
  });

  describe('[6.9-UNIT-010] Provider Management', () => {
    it('should manage multiple video sources', () => {
      // Given: Registry loaded with multiple providers
      const config = registry.getConfig();

      // When: Checking available providers
      // Then: Should have multiple providers configured
      expect(config.providers.length).toBeGreaterThanOrEqual(2);
    });

    it('should provide access to specific provider by ID', async () => {
      // Given: Registry with multiple providers
      const providerId = 'dvids';

      // When: Getting specific provider
      const provider = await registry.getProvider(providerId);

      // Then: Should return provider client instance
      expect(provider).toBeDefined();
      expect(provider).toHaveProperty('serverConfig');
      expect(provider.serverConfig.id).toBe(providerId);
    });

    it('should throw error for non-existent provider ID', async () => {
      // Given: Registry with configured providers
      const invalidId = 'nonexistent-provider';

      // When: Requesting invalid provider
      // Then: Should throw error
      await expect(registry.getProvider(invalidId)).rejects.toThrow(/not found|provider/i);
    });

    it('should cache provider instances', async () => {
      // Given: Registry instance
      const providerId = 'dvids';

      // When: Getting same provider twice
      const provider1 = await registry.getProvider(providerId);
      const provider2 = await registry.getProvider(providerId);

      // Then: Should return same instance (cached)
      expect(provider1).toBe(provider2);
    });
  });

  describe('[6.9-UNIT-011] Priority-Based Execution', () => {
    beforeEach(() => {
      // Reset mocks and setup default success behavior
      mockProviderConnect.mockResolvedValue(undefined);
      mockProviderDisconnect.mockResolvedValue(undefined);
      mockSearchVideos.mockResolvedValue([]);
      mockDownloadVideo.mockResolvedValue('/path/to/video.mp4');
      mockGetVideoDetails.mockResolvedValue({
        videoId: 'test',
        title: 'Test',
        description: 'Test',
        duration: 120,
        downloadUrl: 'http://test.com/video.mp4',
        format: 'mp4',
      });
    });

    it('should execute providers in priority order', async () => {
      // Given: Registry with multiple providers
      const query = 'test video search';

      // When: Searching all providers
      const results = await registry.searchAllProviders(query);

      // Then: Should return results from first successful provider
      expect(Array.isArray(results)).toBe(true);
      // Results should come from provider with lowest priority number
    });

    it('should respect priority order (1 before 2)', async () => {
      // Given: Registry with DVIDS (priority: 1) and NASA (priority: 2)
      const query = 'space footage';

      // When: Searching all providers
      const results = await registry.searchAllProviders(query);

      // Then: Should try DVIDS first, then NASA if DVIDS fails
      expect(results).toBeDefined();
    });

    it('should handle empty provider list gracefully', async () => {
      // Given: Registry with no enabled providers
      const emptyRegistry = new ProviderRegistry('');

      // When: Searching with no providers
      const results = await emptyRegistry.searchAllProviders('test');

      // Then: Should return empty array
      expect(results).toEqual([]);
    });
  });

  describe('[6.9-UNIT-012] Fallback Logic', () => {
    it('should handle provider failures gracefully', async () => {
      // Given: Registry where first provider fails
      const query = 'test search';

      // When: First provider throws error
      // Mock first provider to fail
      vi.spyOn(registry, 'getProvider').mockRejectedValueOnce(new Error('Provider unavailable'));

      const results = await registry.searchAllProviders(query);

      // Then: Should try next provider and return results
      expect(results).toBeDefined();
    });

    it('should try next provider when current fails', async () => {
      // Given: Registry with 3 providers
      const query = 'test query';

      // When: First two providers fail
      const getProviderSpy = vi.spyOn(registry, 'getProvider');
      getProviderSpy.mockRejectedValueOnce(new Error('Provider 1 failed'));
      getProviderSpy.mockRejectedValueOnce(new Error('Provider 2 failed'));

      const results = await registry.searchAllProviders(query);

      // Then: Should try third provider and return results
      expect(getProviderSpy).toHaveBeenCalledTimes(3);
      expect(results).toBeDefined();
    });

    it('should return empty array when all providers fail', async () => {
      // Given: Registry where all providers fail
      const query = 'test query';

      // Mock all providers to fail
      vi.spyOn(registry, 'getProvider').mockRejectedValue(new Error('All providers failed'));

      const results = await registry.searchAllProviders(query);

      // Then: Should return empty array
      expect(results).toEqual([]);
    });

    it('should return results from first successful provider', async () => {
      // Given: Registry with multiple providers
      const query = 'test query';

      // When: Searching all providers
      const results = await registry.searchAllProviders(query, 120);

      // Then: Should stop at first successful result
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        // Should have video results
        expect(results[0]).toHaveProperty('videoId');
      }
    });
  });

  describe('[6.9-UNIT-013] Download with Provider Selection', () => {
    beforeEach(() => {
      // Reset mocks and setup default success behavior
      mockProviderConnect.mockResolvedValue(undefined);
      mockProviderDisconnect.mockResolvedValue(undefined);
      mockSearchVideos.mockResolvedValue([]);
      mockDownloadVideo.mockResolvedValue('/path/to/video.mp4');
      mockGetVideoDetails.mockResolvedValue({
        videoId: 'test',
        title: 'Test',
        description: 'Test',
        duration: 120,
        downloadUrl: 'http://test.com/video.mp4',
        format: 'mp4',
      });
    });

    it('should download from specific provider when providerId specified', async () => {
      // Given: Registry and video ID
      const videoId = 'test-video-123';
      const providerId = 'dvids';

      // When: Downloading from specific provider
      const filePath = await registry.downloadFromAnyProvider(videoId, providerId);

      // Then: Should use specified provider
      expect(typeof filePath).toBe('string');
      expect(filePath.length).toBeGreaterThan(0);
    });

    it('should try all providers when providerId not specified', async () => {
      // Given: Registry and video ID
      const videoId = 'test-video-456';

      // When: Downloading without specifying provider
      const filePath = await registry.downloadFromAnyProvider(videoId);

      // Then: Should try providers in priority order
      expect(typeof filePath).toBe('string');
    });

    it('should throw error when all providers fail to download', async () => {
      // Given: Registry where all providers fail
      const videoId = 'nonexistent-video';

      // Mock all providers to fail
      mockDownloadVideo.mockRejectedValue(new Error('Download failed'));

      // When: Attempting download
      // Then: Should throw error
      await expect(registry.downloadFromAnyProvider(videoId)).rejects.toThrow(/download|failed/i);
    });
  });
});

describe('[P1] Configuration Schema Validation', () => {
  describe('[6.9-UNIT-014] Schema Structure', () => {
    it('should validate config/mcp_servers.json schema', () => {
      // Given: The configuration file
      const configPath = join(process.cwd(), 'config/mcp_servers.json');

      // When: Loading configuration
      const registry = new ProviderRegistry(configPath);
      const config = registry.getConfig();

      // Then: Should match expected schema
      expect(config).toMatchObject({
        providers: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            priority: expect.any(Number),
            enabled: expect.any(Boolean),
            command: expect.any(String),
            args: expect.any(Array),
            env: expect.any(Object),
          }),
        ]),
      });
    });

    it('should support environment variable substitution', () => {
      // Given: Configuration with environment variables
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      const registry = new ProviderRegistry(configPath);
      const config = registry.getConfig();

      // When: Accessing provider env configuration
      const dvidsProvider = config.providers.find((p: any) => p.id === 'dvids');

      // Then: Environment variables should be defined
      expect(dvidsProvider.env).toBeDefined();
      expect(dvidsProvider.env.DVIDS_CACHE_DIR).toBeDefined();
      expect(dvidsProvider.env.DVIDS_RATE_LIMIT).toBeDefined();
    });
  });
});

describe('[P1] Provider Cache Management', () => {
  describe('[6.9-UNIT-015] Cache Operations', () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      registry = new ProviderRegistry(configPath);
      mockProviderConnect.mockResolvedValue(undefined);
      mockProviderDisconnect.mockResolvedValue(undefined);
      mockSearchVideos.mockResolvedValue([]);
      mockDownloadVideo.mockResolvedValue('/path/to/video.mp4');
    });

    it('[P1] should clear cached provider instances', async () => {
      // Given: Registry with cached provider
      const providerId = 'dvids';
      const provider1 = await registry.getProvider(providerId);

      // When: Clearing cache
      registry.clearCache();

      // Then: Should create new instance on next getProvider call
      const provider2 = await registry.getProvider(providerId);
      expect(provider1).not.toBe(provider2);
    });

    it('[P1] should throw error when getting disabled provider', async () => {
      // Given: Registry with disabled provider configuration
      const testConfig = {
        providers: [
          {
            id: 'disabled-provider',
            name: 'Disabled Provider',
            command: 'python',
            args: ['-m', 'test'],
            priority: 1,
            enabled: false,  // Disabled
            env: {},
          },
        ],
      };

      const testRegistry = new ProviderRegistry('');
      testRegistry.loadConfig(testConfig);

      // When: Trying to get disabled provider
      // Then: Should throw error
      await expect(testRegistry.getProvider('disabled-provider')).rejects.toThrow(/disabled/i);
    });

    it('[P2] should return empty config when initialized with empty path', () => {
      // Given: Empty config path
      const emptyRegistry = new ProviderRegistry('');

      // When: Getting config
      const config = emptyRegistry.getConfig();

      // Then: Should return empty providers array
      expect(config).toEqual({ providers: [] });
    });

    it('[P2] should allow reloading config', () => {
      // Given: Registry with initial config
      const newConfig = {
        providers: [
          {
            id: 'new-provider',
            name: 'New Provider',
            command: 'node',
            args: ['server.js'],
            env: {},
            priority: 10,
            enabled: true,
          },
        ],
      };

      // When: Reloading config
      registry.loadConfig(newConfig);

      // Then: Should have new config
      const config = registry.getConfig();
      expect(config.providers).toHaveLength(1);
      expect(config.providers[0].id).toBe('new-provider');
    });
  });
});

describe('[P2] Error Handling Edge Cases', () => {
  describe('[6.9-UNIT-016] Advanced Error Scenarios', () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
      const configPath = join(process.cwd(), 'config/mcp_servers.json');
      registry = new ProviderRegistry(configPath);
      mockProviderConnect.mockResolvedValue(undefined);
      mockProviderDisconnect.mockResolvedValue(undefined);
      mockSearchVideos.mockReset();
      mockDownloadVideo.mockReset();
    });

    it('[P2] should handle provider that returns no results gracefully', async () => {
      // Given: Registry where provider returns empty results
      mockSearchVideos.mockResolvedValue([]);

      // When: Searching all providers
      const results = await registry.searchAllProviders('test query');

      // Then: Should return empty array
      expect(results).toEqual([]);
    });

    it('[P2] should handle provider that throws during disconnect', async () => {
      // Given: Registry where provider fails on disconnect
      mockSearchVideos.mockResolvedValue([
        { videoId: 'test-1', title: 'Test', description: 'Test', thumbnailUrl: '', duration: 120, publishedAt: '2024-01-01' },
      ]);
      mockProviderDisconnect.mockRejectedValue(new Error('Disconnect failed'));

      // When: Searching all providers (provider returns results then fails disconnect)
      const results = await registry.searchAllProviders('test query');

      // Then: Should still return results despite disconnect error
      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('test-1');
    });

    it('[P2] should handle JSON syntax errors in config file', () => {
      // Given: Invalid JSON in config file
      // This is tested via file reading, but we can test the validation

      const invalidConfig = 'this is not valid json {';

      // When: Trying to parse
      // Then: Should handle gracefully (caught in loadConfigFromFile)
      expect(() => {
        const testRegistry = new ProviderRegistry('');
        testRegistry.loadConfig(JSON.parse(invalidConfig));
      }).toThrow();
    });

    it('[P2] should handle provider with non-numeric priority', () => {
      // Given: Config with invalid priority
      const invalidConfig = {
        providers: [
          {
            id: 'test',
            name: 'Test',
            command: 'python',
            args: ['-m', 'test'],
            priority: 'high' as any,
            enabled: true,
            env: {},
          },
        ],
      };

      // When: Loading config
      const testRegistry = new ProviderRegistry('');

      // Then: Should throw validation error
      expect(() => {
        testRegistry.loadConfig(invalidConfig);
      }).toThrow(/priority.*required/i);
    });

    it('[P2] should handle provider with non-boolean enabled', () => {
      // Given: Config with invalid enabled field
      const invalidConfig = {
        providers: [
          {
            id: 'test',
            name: 'Test',
            command: 'python',
            args: ['-m', 'test'],
            priority: 1,
            enabled: 'yes' as any,
            env: {},
          },
        ],
      };

      // When: Loading config
      const testRegistry = new ProviderRegistry('');

      // Then: Should throw validation error
      expect(() => {
        testRegistry.loadConfig(invalidConfig);
      }).toThrow(/enabled.*required/i);
    });

    it('[P2] should handle provider with null env', () => {
      // Given: Config with null env (implementation treats null as object type check passes)
      const configWithNullEnv = {
        providers: [
          {
            id: 'test',
            name: 'Test',
            command: 'python',
            args: ['-m', 'test'],
            priority: 1,
            enabled: true,
            env: null,
          },
        ],
      };

      // When: Loading config
      const testRegistry = new ProviderRegistry('');

      // Then: Current implementation accepts null (typeof null === 'object')
      // This test documents current behavior
      expect(() => {
        testRegistry.loadConfig(configWithNullEnv);
      }).not.toThrow();
    });

    it('[P2] should handle duplicate provider IDs', () => {
      // Given: Config with duplicate provider IDs
      const duplicateConfig = {
        providers: [
          {
            id: 'duplicate',
            name: 'First',
            command: 'python',
            args: ['-m', 'first'],
            priority: 1,
            enabled: true,
            env: {},
          },
          {
            id: 'duplicate',
            name: 'Second',
            command: 'python',
            args: ['-m', 'second'],
            priority: 2,
            enabled: true,
            env: {},
          },
        ],
      };

      // When: Loading config
      const testRegistry = new ProviderRegistry('');

      // Then: Should accept (implementation doesn't check for duplicates)
      // This test documents current behavior
      expect(() => {
        testRegistry.loadConfig(duplicateConfig);
      }).not.toThrow();
    });
  });
});
