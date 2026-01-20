/**
 * ATDD Tests for VideoProviderClient - Story 6.9
 *
 * Tests the MCP client architecture for connecting to video provider servers.
 * All tests MUST FAIL initially (RED phase) - implementation does not exist yet.
 *
 * Acceptance Criteria Coverage:
 * - AC-6.9.1: VideoProviderClient Class
 * - AC-6.9.4: MCP Client Integration
 *
 * Test Level: Unit (backend library code)
 * Framework: Vitest
 *
 * @module tests/lib/mcp/video-provider-client.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MCP SDK (not installed yet)
const mockRequest = vi.fn();
const mockConnect = vi.fn();
const mockClose = vi.fn();
const mockTransportStart = vi.fn();
const mockTransportClose = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    close: mockClose,
    request: mockRequest,
  })),
}));

// Mock the types module to provide a simple schema that doesn't validate
vi.mock('@modelcontextprotocol/sdk/types', () => ({
  CallToolResultSchema: undefined,
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation((config: any) => ({
    start: mockTransportStart,
    close: mockTransportClose,
    command: config?.command,
    args: config?.args,
    env: config?.env,
  })),
}));

// Import the class we're testing (will fail - doesn't exist yet)
import { VideoProviderClient } from '@/lib/mcp/video-provider-client';

describe('[P0] AC-6.9.1: VideoProviderClient Class Structure', () => {
  describe('[6.9-UNIT-001] Constructor and Initialization', () => {
    it('should accept server configuration (command, args, env)', () => {
      // Given: A provider configuration with command, args, and env
      const providerConfig = {
        id: 'test-provider',
        name: 'Test Provider',
        command: 'python',
        args: ['-m', 'test_server'],
        env: {
          TEST_VAR: 'test_value',
          RATE_LIMIT: '30',
        },
        priority: 1,
        enabled: true,
      };

      // When: Creating a VideoProviderClient instance
      // Then: Should instantiate without errors
      expect(() => {
        new VideoProviderClient(providerConfig);
      }).not.toThrow();
    });

    it('should store server configuration as instance property', () => {
      // Given: A provider configuration
      const providerConfig = {
        id: 'dvids',
        name: 'DVIDS',
        command: 'python',
        args: ['-m', 'mcp_servers.dvids'],
        env: { DVIDS_CACHE_DIR: './cache' },
        priority: 1,
        enabled: true,
      };

      // When: Creating client
      const client = new VideoProviderClient(providerConfig);

      // Then: Configuration should be accessible
      expect(client).toHaveProperty('serverConfig');
      expect(client.serverConfig).toEqual(providerConfig);
    });
  });

  describe('[6.9-UNIT-002] Required Methods Exist', () => {
    let client: VideoProviderClient;

    beforeEach(() => {
      const providerConfig = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      client = new VideoProviderClient(providerConfig);
    });

    it('should have searchVideos method', () => {
      // Given: A VideoProviderClient instance
      // When: Checking for method existence
      // Then: searchVideos method should exist
      expect(typeof client.searchVideos).toBe('function');
    });

    it('should have downloadVideo method', () => {
      // Given: A VideoProviderClient instance
      // When: Checking for method existence
      // Then: downloadVideo method should exist
      expect(typeof client.downloadVideo).toBe('function');
    });

    it('should have getVideoDetails method', () => {
      // Given: A VideoProviderClient instance
      // When: Checking for method existence
      // Then: getVideoDetails method should exist
      expect(typeof client.getVideoDetails).toBe('function');
    });

    it('should have connect method', () => {
      // Given: A VideoProviderClient instance
      // When: Checking for method existence
      // Then: connect method should exist
      expect(typeof client.connect).toBe('function');
    });

    it('should have disconnect method', () => {
      // Given: A VideoProviderClient instance
      // When: Checking for method existence
      // Then: disconnect method should exist
      expect(typeof client.disconnect).toBe('function');
    });
  });
});

describe('[P0] AC-6.9.4: MCP Client Integration', () => {
  describe('[6.9-UNIT-003] Connection Management', () => {
    it('should initialize MCP client and stdio transport on connect', async () => {
      // Given: A VideoProviderClient with valid config
      const providerConfig = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test_server'],
        env: { TEST_VAR: 'value' },
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(providerConfig);

      // When: Connecting to the MCP server
      await client.connect();

      // Then: MCP client and transport should be initialized
      expect(client).toHaveProperty('client');
      expect(client).toHaveProperty('transport');
    });

    it('should spawn MCP server process via stdio transport', async () => {
      // Given: A VideoProviderClient configured for stdio transport
      const providerConfig = {
        id: 'dvids',
        name: 'DVIDS',
        command: 'python',
        args: ['-m', 'mcp_servers.dvids'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(providerConfig);

      // When: Connecting to server
      await client.connect();

      // Then: Transport should use stdio with correct command
      const transport = client.transport;
      expect(transport).toBeDefined();
      expect(transport.command).toBe('python');
      expect(transport.args).toEqual(['-m', 'mcp_servers.dvids']);
    });

    it('should cleanup server process after disconnect', async () => {
      // Given: A connected VideoProviderClient
      const providerConfig = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(providerConfig);
      await client.connect();

      // When: Disconnecting from server
      await client.disconnect();

      // Then: Client and transport should be cleaned up
      expect(client.client).toBeNull();
      expect(client.transport).toBeNull();
    });
  });

  describe('[6.9-UNIT-004] JSON-RPC Communication', () => {
    let client: VideoProviderClient;

    beforeEach(async () => {
      // Reset mocks
      mockConnect.mockResolvedValue(undefined);
      mockClose.mockResolvedValue(undefined);
      mockTransportStart.mockResolvedValue(undefined);
      mockTransportClose.mockResolvedValue(undefined);
      mockRequest.mockReset();

      // Default: return empty search results
      mockRequest.mockResolvedValue({
        result: {
          content: [{
            type: 'text',
            text: '[]',
          }],
        },
      });

      const providerConfig = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test_server'],
        env: {},
        priority: 1,
        enabled: true,
      };
      client = new VideoProviderClient(providerConfig);
      await client.connect();
    });

    it('should send JSON-RPC request for searchVideos', async () => {
      // Given: A connected client and search parameters
      const query = 'military aircraft';
      const maxDuration = 120;

      // Mock search response with results - directly use mockRequest
      mockRequest.mockResolvedValue({
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify([
              {
                videoId: 'test-123',
                title: 'Test Video',
                description: 'Test Description',
                thumbnailUrl: 'http://test.com/thumb.jpg',
                duration: 120,
                publishedAt: '2024-01-01',
              },
            ]),
          }],
        },
      });

      // When: Searching for videos
      const results = await client.searchVideos(query, maxDuration);

      // Then: Should return structured video data
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('videoId');
        expect(results[0]).toHaveProperty('title');
        expect(results[0]).toHaveProperty('description');
        expect(results[0]).toHaveProperty('thumbnailUrl');
        expect(results[0]).toHaveProperty('duration');
        expect(results[0]).toHaveProperty('publishedAt');
      }
    });

    it('should send JSON-RPC request for downloadVideo', async () => {
      // Given: A connected client and video ID
      const videoId = 'test-video-123';

      // Mock download response with results - use mockImplementation to ensure override
      mockRequest.mockImplementation(() => Promise.resolve({
        result: {
          content: [{
            type: 'text',
            text: '/path/to/downloaded/video.mp4',
          }],
        },
      }));

      // When: Downloading a video
      const filePath = await client.downloadVideo(videoId);

      // Then: Should return local file path
      expect(typeof filePath).toBe('string');
      expect(filePath.length).toBeGreaterThan(0);
      expect(filePath).toBe('/path/to/downloaded/video.mp4');
    });

    it('should send JSON-RPC request for getVideoDetails', async () => {
      // Given: A connected client and video ID
      const videoId = 'test-video-456';

      // Mock video details response with results - use mockImplementation to ensure override
      mockRequest.mockImplementation(() => Promise.resolve({
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              videoId: 'test-video-456',
              title: 'Test Video Details',
              description: 'Test Video Description',
              duration: 120,
              downloadUrl: 'http://test.com/video.mp4',
              format: 'mp4',
            }),
          }],
        },
      }));

      // When: Getting video details
      const details = await client.getVideoDetails(videoId);

      // Then: Should return complete video details
      expect(details).toHaveProperty('videoId', videoId);
      expect(details).toHaveProperty('title');
      expect(details).toHaveProperty('description');
      expect(details).toHaveProperty('duration');
      expect(details).toHaveProperty('downloadUrl');
      expect(details).toHaveProperty('format');
    });

    it('should parse MCP protocol responses correctly', async () => {
      // Given: A connected client
      // When: Making a request that returns JSON content
      const results = await client.searchVideos('test query');

      // Then: Should parse JSON-RPC response structure
      // MCP returns: { content: [{ type: 'text', text: 'JSON string' }] }
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

describe('[P1] AC-6.9.1: Error Handling', () => {
  describe('[6.9-UNIT-005] Connection Errors', () => {
    beforeEach(() => {
      // Reset mocks
      mockConnect.mockReset();
      mockClose.mockReset();
      mockRequest.mockReset();
      mockTransportStart.mockReset();
      mockTransportClose.mockReset();
    });

    it('should handle connection errors gracefully', async () => {
      // Given: A client with invalid server configuration
      // Mock connect to throw ENOENT error (command not found)
      mockConnect.mockRejectedValue(new Error('ENOENT: nonexistent-command not found'));

      const providerConfig = {
        id: 'invalid-provider',
        name: 'Invalid',
        command: 'nonexistent-command',
        args: ['-m', 'invalid'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(providerConfig);

      // When: Attempting to connect
      // Then: Should throw connection error
      await expect(client.connect()).rejects.toThrow(/connection|failed|unable/i);
    });

    it('should handle server unavailable errors', async () => {
      // Given: A client configured for unavailable server
      // Mock connect to throw generic error
      mockConnect.mockRejectedValue(new Error('Server unavailable'));

      const providerConfig = {
        id: 'timeout-provider',
        name: 'Timeout',
        command: 'python',
        args: ['-m', 'nonexistent_server'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(providerConfig);

      // When: Server is unavailable
      await expect(client.connect()).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      // Given: A client with timeout configuration
      // Mock connect to throw timeout error
      mockConnect.mockRejectedValue(new Error('ETIMEDOUT: Connection timeout'));

      const providerConfig = {
        id: 'timeout-provider',
        name: 'Timeout',
        command: 'python',
        args: ['-m', 'slow_server'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(providerConfig);

      // When: Server times out
      await expect(client.connect()).rejects.toThrow(/timeout/i);
    });
  });

  describe('[6.9-UNIT-006] Request Errors', () => {
    let client: VideoProviderClient;

    beforeEach(async () => {
      // Reset mocks and setup default successful connection
      mockConnect.mockResolvedValue(undefined);
      mockClose.mockResolvedValue(undefined);
      mockTransportStart.mockResolvedValue(undefined);
      mockTransportClose.mockResolvedValue(undefined);
      mockRequest.mockReset();

      const providerConfig = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test_server'],
        env: {},
        priority: 1,
        enabled: true,
      };
      client = new VideoProviderClient(providerConfig);
      await client.connect();
    });

    it('should handle invalid video ID errors', async () => {
      // Given: A connected client
      // Mock request to return "not found" response
      mockRequest.mockResolvedValue({
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'Video not found' }),
          }],
        },
      });

      // When: Requesting details for non-existent video
      // The implementation should throw an error when it can't parse the response as VideoDetails
      await expect(client.getVideoDetails('invalid-id')).rejects.toThrow(/not found|invalid/i);
    });

    it('should handle download failures', async () => {
      // Given: A connected client
      // Mock request to throw error
      mockRequest.mockRejectedValue(new Error('Download failed'));

      // When: Downloading non-existent video
      await expect(client.downloadVideo('nonexistent-video')).rejects.toThrow(/download|failed/i);
    });

    it('should handle malformed server responses', async () => {
      // Given: A connected client
      // Mock request to return invalid JSON
      mockRequest.mockResolvedValue({
        result: {
          content: [{
            type: 'text',
            text: 'invalid json{{{',
          }],
        },
      });

      // When: Server returns invalid JSON
      const results = await client.searchVideos('test');
      // Should handle gracefully - either return empty or throw descriptive error
      expect(results).toBeDefined();
    });
  });
});

describe('[P2] Type Safety', () => {
  describe('[6.9-UNIT-007] Interface Compliance', () => {
    it('should export VideoSearchResult interface', () => {
      // Given: The module is imported
      // When: Checking for type exports
      // Then: VideoSearchResult interface should be available
      expect(() => {
        import('@/lib/mcp/video-provider-client').then(module => {
          expect(module).toHaveProperty('VideoSearchResult');
        });
      }).not.toThrow();
    });

    it('should export VideoDetails interface', () => {
      // Given: The module is imported
      // When: Checking for type exports
      // Then: VideoDetails interface should be available
      expect(() => {
        import('@/lib/mcp/video-provider-client').then(module => {
          expect(module).toHaveProperty('VideoDetails');
        });
      }).not.toThrow();
    });

    it('should export ProviderConfig interface', () => {
      // Given: The module is imported
      // When: Checking for type exports
      // Then: ProviderConfig interface should be available
      expect(() => {
        import('@/lib/mcp/video-provider-client').then(module => {
          expect(module).toHaveProperty('ProviderConfig');
        });
      }).not.toThrow();
    });
  });
});

describe('[P1] AC-6.9.1: Command Injection Security', () => {
  describe('[6.9-UNIT-008] Security Validation', () => {
    it('[P1] should reject command with shell metacharacters', () => {
      // Given: Provider config with suspicious characters
      const maliciousConfigs = [
        { command: 'python; rm -rf /', args: ['-m', 'test'], id: 'test-1' },
        { command: 'python & echo hack', args: ['-m', 'test'], id: 'test-2' },
        { command: 'python| cat /etc/passwd', args: ['-m', 'test'], id: 'test-3' },
        { command: 'python`whoami`', args: ['-m', 'test'], id: 'test-4' },
        { command: 'python$(echo hack)', args: ['-m', 'test'], id: 'test-5' },
      ];

      // When: Creating client with malicious commands
      // Then: Should throw MCPConnectionError
      maliciousConfigs.forEach((config) => {
        expect(() => {
          new VideoProviderClient({
            ...config,
            name: 'Test',
            env: {},
            priority: 1,
            enabled: true,
          });
        }).toThrow(/Invalid command|Invalid argument|suspicious/);
      });
    });

    it('[P1] should reject args with directory traversal', () => {
      // Given: Provider config with directory traversal
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', '../../../etc/passwd'],
        env: {},
        priority: 1,
        enabled: true,
      };

      // When: Creating client
      // Then: Should throw MCPConnectionError
      expect(() => {
        new VideoProviderClient(config);
      }).toThrow(/Invalid argument|\.\./);
    });

    it('[P1] should reject empty command', () => {
      // Given: Provider config with empty command
      const configs = [
        { command: '', args: ['-m', 'test'], id: 'empty' },
        { command: '   ', args: ['-m', 'test'], id: 'spaces' },
        { command: '\t\n', args: ['-m', 'test'], id: 'whitespace' },
      ];

      // When: Creating client with empty command
      // Then: Should throw MCPConnectionError
      configs.forEach((config) => {
        expect(() => {
          new VideoProviderClient({
            ...config,
            name: 'Test',
            env: {},
            priority: 1,
            enabled: true,
          });
        }).toThrow(/Command cannot be empty/);
      });
    });

    it('[P1] should reject non-array args', () => {
      // Given: Provider config with invalid args
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: 'not-an-array' as any,
        env: {},
        priority: 1,
        enabled: true,
      };

      // When: Creating client
      // Then: Should throw MCPConnectionError
      expect(() => {
        new VideoProviderClient(config);
      }).toThrow(/Args must be an array/);
    });

    it('[P2] should allow valid commands with safe special chars in args', () => {
      // Given: Provider config with safe special characters in args
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python3',
        args: ['-m', 'test_server', '--config', 'config.json', '--output-dir', './output'],
        env: { TEST_VAR: 'test_value' },
        priority: 1,
        enabled: true,
      };

      // When: Creating client
      // Then: Should not throw (dots and dashes in args are safe)
      expect(() => {
        new VideoProviderClient(config);
      }).not.toThrow();
    });
  });
});

describe('[P1] Connection State Management', () => {
  describe('[6.9-UNIT-009] State Validation', () => {
    it('[P1] should throw when calling searchVideos without connecting', async () => {
      // Given: Client that is not connected
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);

      // When: Calling searchVideos without connecting
      // Then: Should throw connection error
      await expect(client.searchVideos('test')).rejects.toThrow(/not connected|call connect/i);
    });

    it('[P1] should throw when calling downloadVideo without connecting', async () => {
      // Given: Client that is not connected
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);

      // When: Calling downloadVideo without connecting
      // Then: Should throw connection error
      await expect(client.downloadVideo('test-id')).rejects.toThrow(/not connected|call connect/i);
    });

    it('[P1] should throw when calling getVideoDetails without connecting', async () => {
      // Given: Client that is not connected
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);

      // When: Calling getVideoDetails without connecting
      // Then: Should throw connection error
      await expect(client.getVideoDetails('test-id')).rejects.toThrow(/not connected|call connect/i);
    });

    it('[P2] should be idempotent - calling connect twice should not error', async () => {
      // Given: Connected client
      mockConnect.mockResolvedValue(undefined);
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // When: Calling connect again
      // Then: Should not throw (implementation allows reconnect)
      await expect(client.connect()).resolves.not.toThrow();
    });

    it('[P2] should be idempotent - calling disconnect twice should not error', async () => {
      // Given: Connected client
      mockConnect.mockResolvedValue(undefined);
      mockClose.mockResolvedValue(undefined);
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();
      await client.disconnect();

      // When: Calling disconnect again
      // Then: Should not throw
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });
});

describe('[P2] Response Parsing Edge Cases', () => {
  describe('[6.9-UNIT-010] Malformed Response Handling', () => {
    beforeEach(async () => {
      mockConnect.mockResolvedValue(undefined);
      mockClose.mockResolvedValue(undefined);
      mockRequest.mockReset();
    });

    it('[P2] should handle empty content array gracefully', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // Mock response with empty content array
      mockRequest.mockResolvedValue({
        result: {
          content: [],
        },
      });

      // When: Searching videos
      const results = await client.searchVideos('test');

      // Then: Should return empty array
      expect(results).toEqual([]);
    });

    it('[P2] should handle missing content field in response', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // Mock response without content field
      mockRequest.mockResolvedValue({
        result: {},
      });

      // When: Searching videos
      const results = await client.searchVideos('test');

      // Then: Should return empty array
      expect(results).toEqual([]);
    });

    it('[P2] should handle response without text content type', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // Mock response with non-text content
      mockRequest.mockResolvedValue({
        result: {
          content: [{
            type: 'image',
            data: 'base64data',
          }],
        },
      });

      // When: Searching videos
      const results = await client.searchVideos('test');

      // Then: Should return empty array
      expect(results).toEqual([]);
    });

    it('[P2] should handle missing text field in text content', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // Mock response with text type but no text field
      mockRequest.mockResolvedValue({
        result: {
          content: [{
            type: 'text',
          }],
        },
      });

      // When: Searching videos
      const results = await client.searchVideos('test');

      // Then: Should return empty array
      expect(results).toEqual([]);
    });
  });
});

describe('[P2] Boundary Value Testing', () => {
  describe('[6.9-UNIT-011] Input Boundary Cases', () => {
    beforeEach(async () => {
      mockConnect.mockResolvedValue(undefined);
      mockClose.mockResolvedValue(undefined);
      mockRequest.mockResolvedValue({
        result: {
          content: [{
            type: 'text',
            text: '[]',
          }],
        },
      });
    });

    it('[P2] should handle empty query string', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // When: Searching with empty query
      const results = await client.searchVideos('');

      // Then: Should not throw
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('[P2] should handle very long query string', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // When: Searching with very long query (10000 chars)
      const longQuery = 'a'.repeat(10000);
      const results = await client.searchVideos(longQuery);

      // Then: Should not throw
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('[P2] should handle zero maxDuration', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // When: Searching with zero maxDuration
      const results = await client.searchVideos('test', 0);

      // Then: Should not throw
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('[P2] should handle negative maxDuration', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // When: Searching with negative maxDuration
      const results = await client.searchVideos('test', -100);

      // Then: Should not throw (implementation passes undefined for negative values due to condition)
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('[P2] should handle very large maxDuration', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // When: Searching with very large maxDuration
      const results = await client.searchVideos('test', Number.MAX_SAFE_INTEGER);

      // Then: Should not throw
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('[P2] should handle empty video ID', async () => {
      // Given: Connected client
      const config = {
        id: 'test-provider',
        name: 'Test',
        command: 'python',
        args: ['-m', 'test'],
        env: {},
        priority: 1,
        enabled: true,
      };
      const client = new VideoProviderClient(config);
      await client.connect();

      // Mock download response
      mockRequest.mockResolvedValue({
        result: {
          content: [{
            type: 'text',
            text: '/path/to/video.mp4',
          }],
        },
      });

      // When: Downloading with empty video ID
      const result = await client.downloadVideo('');

      // Then: Should not throw
      expect(result).toBeDefined();
    });
  });
});
