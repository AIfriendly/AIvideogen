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

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation((config: any) => ({
    start: mockTransportStart,
    close: mockTransportClose,
    command: config?.command,
    args: config?.args,
    env: config?.env,
  })),
}));

// Import the class we're testing
import { VideoProviderClient } from './src/lib/mcp/video-provider-client';

describe('Debug test', () => {
  it('debug downloadVideo', async () => {
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
    const client = new VideoProviderClient(providerConfig);
    await client.connect();

    console.log('mockRequest calls BEFORE test setup:', mockRequest.mock.calls.length);

    // Now set up the specific mock for this test
    mockRequest.mockImplementationOnce(() => Promise.resolve({
      result: {
        content: [{
          type: 'text',
          text: '/path/to/downloaded/video.mp4',
        }],
      },
    }));

    console.log('Calling downloadVideo...');
    const filePath = await client.downloadVideo('test-video-123');
    console.log('filePath:', filePath);
    console.log('mockRequest calls AFTER:', mockRequest.mock.calls.length);
    console.log('mockRequest last call:', mockRequest.mock.calls[mockRequest.mock.calls.length - 1]);

    expect(filePath).toBe('/path/to/downloaded/video.mp4');
  });
});
