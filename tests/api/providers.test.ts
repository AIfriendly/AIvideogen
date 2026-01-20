/**
 * API Tests: Providers Endpoint
 * Test IDs: 6.11-API-001 through 6.11-API-008
 *
 * Tests for Story 6.11 - Provider Selection Modal
 * Tests /api/providers endpoint for dynamic provider configuration loading
 *
 * @module tests/api/providers.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

// Mock fs and path modules using importActual to preserve module structure
const mockReadFileSync = vi.fn();
const mockExistsSync = vi.fn(() => true);
const mockJoin = vi.fn((...args: string[]) => args.filter(Boolean).join('/'));
const mockNormalize = vi.fn((path: string) => path);
const mockRelative = vi.fn(() => 'mcp_servers.json');

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: mockReadFileSync,
    existsSync: mockExistsSync,
  };
});

vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: mockJoin,
    normalize: mockNormalize,
    relative: mockRelative,
  };
});

describe('[P0] 6.11-API-001: Happy Path - Successful Provider Loading', () => {
  let GET: () => Promise<NextResponse>;

  beforeAll(async () => {
    // Import route module once after mocks are set up
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  beforeEach(() => {
    // Clear mock call history and reset to default behavior
    mockReadFileSync.mockClear();
    mockExistsSync.mockClear();
    mockExistsSync.mockReturnValue(true);
    mockJoin.mockClear();
    mockNormalize.mockClear();
    mockRelative.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 200 with providers array on successful load', async () => {
    // Given: Valid mcp_servers.json configuration file exists
    const mockConfig = {
      providers: [
        {
          id: 'dvids',
          name: 'DVIDS Military Videos',
          priority: 1,
          enabled: true,
          command: 'python',
          args: ['-m', 'mcp_servers.dvids_scraping_server'],
          env: {
            PYTHONPATH: './ai-video-generator',
            DVIDS_CACHE_DIR: './assets/cache/dvids',
            DVIDS_RATE_LIMIT: '30',
          },
        },
        {
          id: 'nasa',
          name: 'NASA Space Videos',
          priority: 2,
          enabled: true,
          command: 'python',
          args: ['-m', 'mcp_servers.nasa'],
          env: {
            PYTHONPATH: './ai-video-generator',
            NASA_CACHE_DIR: './assets/cache/nasa',
            NASA_RATE_LIMIT: '10',
          },
        },
      ],
    };

    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Calling GET /api/providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Should return 200 status with providers array
    expect(response.status).toBe(200);
    expect(jsonResponse).toHaveProperty('providers');
    expect(Array.isArray(jsonResponse.providers)).toBe(true);
    expect(jsonResponse.providers).toHaveLength(2);
  });

  it('should include all required provider fields', async () => {
    // Given: Valid provider configuration
    const mockConfig = {
      providers: [
        {
          id: 'youtube',
          name: 'YouTube Videos',
          priority: 3,
          enabled: true,
          command: 'python',
          args: ['-m', 'mcp_servers.youtube'],
          env: {
            PYTHONPATH: './ai-video-generator',
            YOUTUBE_CACHE_DIR: './assets/cache/youtube',
            YOUTUBE_RATE_LIMIT: '10',
          },
        },
      ],
    };

    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Fetching providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Provider should have all required fields
    const provider = jsonResponse.providers[0];
    expect(provider).toHaveProperty('id');
    expect(provider).toHaveProperty('name');
    expect(provider).toHaveProperty('priority');
    expect(provider).toHaveProperty('enabled');
    expect(provider).toHaveProperty('command');
    expect(provider).toHaveProperty('args');
    expect(provider).toHaveProperty('env');
  });

  it('should handle empty providers array gracefully', async () => {
    // Given: Configuration with no providers
    const mockConfig = { providers: [] };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Fetching providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Should return empty array
    expect(response.status).toBe(200);
    expect(jsonResponse.providers).toEqual([]);
  });
});

describe('[P0] 6.11-API-002: DVIDS Visibility Regression (Critical)', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset existsSync to default true for file exists scenarios
    mockExistsSync.mockReturnValue(true);
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should ensure DVIDS provider has enabled: true', async () => {
    // Given: mcp_servers.json with DVIDS provider configuration
    const mockConfig = {
      providers: [
        {
          id: 'dvids',
          name: 'DVIDS Military Videos',
          priority: 1,
          enabled: true, // CRITICAL: Must stay true
          command: 'python',
          args: ['-m', 'mcp_servers.dvids_scraping_server'],
          env: {
            DVIDS_CACHE_DIR: './assets/cache/dvids',
            DVIDS_RATE_LIMIT: '30',
          },
        },
      ],
    };

    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Fetching providers
    const response = await GET();
    const jsonResponse = await response.json();
    const dvidsProvider = jsonResponse.providers.find((p: any) => p.id === 'dvids');

    // Then: DVIDS must be enabled (regression prevention)
    expect(dvidsProvider).toBeDefined();
    expect(dvidsProvider.enabled).toBe(true);

    // Regression check: If this fails, DVIDS was disabled accidentally
    if (dvidsProvider.enabled !== true) {
      throw new Error('CRITICAL: DVIDS provider was disabled! This is a regression. Story 6.10 requires DVIDS to be enabled.');
    }
  });

  it('should prevent DVIDS from being disabled accidentally', async () => {
    // Given: Configuration with DVIDS disabled (regression scenario)
    const mockConfig = {
      providers: [
        {
          id: 'dvids',
          name: 'DVIDS Military Videos',
          priority: 1,
          enabled: false, // This should NOT happen
          command: 'python',
          args: ['-m', 'mcp_servers.dvids_scraping_server'],
          env: {},
        },
      ],
    };

    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Fetching providers
    const response = await GET();
    const jsonResponse = await response.json();
    const dvidsProvider = jsonResponse.providers.find((p: any) => p.id === 'dvids');

    // Then: Test should fail to alert developers of regression
    expect(dvidsProvider.enabled).toBe(true);
  });
});

describe('[P0] 6.11-API-003: Provider Priority Order Regression', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset existsSync to default true for file exists scenarios
    mockExistsSync.mockReturnValue(true);
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should maintain DVIDS priority 1, NASA priority 2, YouTube priority 3', async () => {
    // Given: Provider configuration with correct priority order
    const mockConfig = {
      providers: [
        {
          id: 'dvids',
          name: 'DVIDS Military Videos',
          priority: 1, // Highest priority for military niche
          enabled: true,
          command: 'python',
          args: ['-m', 'mcp_servers.dvids_scraping_server'],
          env: {},
        },
        {
          id: 'nasa',
          name: 'NASA Space Videos',
          priority: 2, // Second priority
          enabled: true,
          command: 'python',
          args: ['-m', 'mcp_servers.nasa'],
          env: {},
        },
        {
          id: 'youtube',
          name: 'YouTube Videos',
          priority: 3, // Lowest priority (fallback)
          enabled: true,
          command: 'python',
          args: ['-m', 'mcp_servers.youtube'],
          env: {},
        },
      ],
    };

    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Fetching providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Should verify correct priority order
    const dvidsProvider = jsonResponse.providers.find((p: any) => p.id === 'dvids');
    const nasaProvider = jsonResponse.providers.find((p: any) => p.id === 'nasa');
    const youtubeProvider = jsonResponse.providers.find((p: any) => p.id === 'youtube');

    expect(dvidsProvider.priority).toBe(1);
    expect(nasaProvider.priority).toBe(2);
    expect(youtubeProvider.priority).toBe(3);

    // Regression check: Priority order must be maintained
    if (dvidsProvider.priority !== 1) {
      throw new Error('REGRESSION: DVIDS priority changed from 1. This affects military niche video sourcing order.');
    }
  });
});

describe('[P1] 6.11-API-004: Error Handling - File Not Found', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset existsSync to default true for file exists scenarios
    mockExistsSync.mockReturnValue(true);
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 404 when config file does not exist', async () => {
    // Given: Configuration file not found
    mockExistsSync.mockReturnValue(false);

    // When: Calling GET /api/providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Should return 404 with descriptive error
    expect(response.status).toBe(404);
    expect(jsonResponse).toHaveProperty('error');
    expect(jsonResponse.error).toBe('CONFIG_NOT_FOUND');
    expect(jsonResponse.message).toContain('not found');
    expect(jsonResponse.message).toContain('mcp_servers.json');
  });

  it('should include helpful error message for missing config', async () => {
    // Given: Config file missing
    mockExistsSync.mockReturnValue(false);

    // When: Requesting providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Error message should guide user to fix
    expect(jsonResponse.message).toMatch(/ensure.*config.*mcp_servers.json.*exists/i);
  });
});

describe('[P1] 6.11-API-005: Error Handling - Invalid JSON', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset existsSync to default true for file exists scenarios
    mockExistsSync.mockReturnValue(true);
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 500 when config file contains invalid JSON', async () => {
    // Given: Configuration file with invalid JSON
    const invalidJson = '{ "providers": [ { "id": "dvids", } ]'; // Syntax error
    mockReadFileSync.mockReturnValue(invalidJson);

    // When: Calling GET /api/providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Should return 500 with invalid JSON error
    expect(response.status).toBe(500);
    expect(jsonResponse).toHaveProperty('error');
    expect(jsonResponse.error).toBe('INVALID_CONFIG');
    expect(jsonResponse.message).toContain('Invalid JSON');
  });

  it('should include JSON parse error details', async () => {
    // Given: Malformed JSON
    const invalidJson = '{"providers": invalid}';
    mockReadFileSync.mockReturnValue(invalidJson);

    // When: Parsing configuration
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Should provide parse error details
    expect(response.status).toBe(500);
    expect(jsonResponse.message).toBeDefined();
    expect(jsonResponse.message.length).toBeGreaterThan(0);
  });
});

describe('[P1] 6.11-API-006: Error Handling - Unknown Errors', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset existsSync to default true for file exists scenarios
    mockExistsSync.mockReturnValue(true);
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 500 for unexpected errors', async () => {
    // Given: Unexpected error occurs
    mockReadFileSync.mockImplementation(() => {
      throw new Error('Unexpected system error');
    });

    // When: Calling GET /api/providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Should return 500 with error details
    expect(response.status).toBe(500);
    expect(jsonResponse).toHaveProperty('error');
    expect(jsonResponse.error).toBe('UNKNOWN_ERROR');
    expect(jsonResponse.message).toContain('Failed to load provider configuration');
  });

  it('should preserve original error message', async () => {
    // Given: Error with specific message
    const originalError = new Error('Permission denied reading config file');
    mockReadFileSync.mockImplementation(() => {
      throw originalError;
    });

    // When: Requesting providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Original error message should be preserved
    expect(response.status).toBe(500);
    expect(jsonResponse.message).toContain('Permission denied');
  });
});

describe('[P2] 6.11-API-007: API Fallback Behavior', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset existsSync to default true for file exists scenarios
    mockExistsSync.mockReturnValue(true);
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty providers array when config has no providers field', async () => {
    // Given: Malformed config without providers field
    const mockConfig = { someOtherField: 'value' };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Fetching providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Should default to empty array
    expect(response.status).toBe(200);
    expect(jsonResponse.providers).toEqual([]);
  });

  it('should handle providers field as null gracefully', async () => {
    // Given: Config with null providers
    const mockConfig = { providers: null };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Fetching providers
    const response = await GET();
    const jsonResponse = await response.json();

    // Then: Should return empty array
    expect(response.status).toBe(200);
    expect(jsonResponse.providers).toEqual([]);
  });
});

describe('[P2] 6.11-API-008: Response Structure Validation', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset existsSync to default true for file exists scenarios
    mockExistsSync.mockReturnValue(true);
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return NextResponse with correct content-type', async () => {
    // Given: Valid configuration
    const mockConfig = {
      providers: [
        {
          id: 'youtube',
          name: 'YouTube',
          priority: 3,
          enabled: true,
          command: 'python',
          args: ['-m', 'test'],
          env: {},
        },
      ],
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Calling GET endpoint
    const response = await GET();

    // Then: Should return NextResponse instance
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('should preserve provider environment variables', async () => {
    // Given: Provider with environment configuration
    const mockConfig = {
      providers: [
        {
          id: 'dvids',
          name: 'DVIDS',
          priority: 1,
          enabled: true,
          command: 'python',
          args: ['-m', 'test'],
          env: {
            DVIDS_CACHE_DIR: './cache/dvids',
            DVIDS_RATE_LIMIT: '30',
            CUSTOM_VAR: 'custom-value',
          },
        },
      ],
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Fetching providers
    const response = await GET();
    const jsonResponse = await response.json();
    const provider = jsonResponse.providers[0];

    // Then: Environment variables should be preserved
    expect(provider.env).toHaveProperty('DVIDS_CACHE_DIR');
    expect(provider.env).toHaveProperty('DVIDS_RATE_LIMIT');
    expect(provider.env).toHaveProperty('CUSTOM_VAR');
    expect(provider.env.DVIDS_CACHE_DIR).toBe('./cache/dvids');
    expect(provider.env.DVIDS_RATE_LIMIT).toBe('30');
  });
});

describe('[P2] Provider Loading State Display Regression', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset existsSync to default true for file exists scenarios
    mockExistsSync.mockReturnValue(true);
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  it('should ensure providers have loading states for UI display', async () => {
    // Given: Valid provider configuration
    const mockConfig = {
      providers: [
        {
          id: 'dvids',
          name: 'DVIDS Military Videos',
          priority: 1,
          enabled: true,
          command: 'python',
          args: ['-m', 'mcp_servers.dvids_scraping_server'],
          env: {},
        },
      ],
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: Fetching providers for modal display
    const response = await GET();
    const jsonResponse = await response.json();
    const provider = jsonResponse.providers[0];

    // Then: Provider should have all fields needed for modal display
    expect(provider).toHaveProperty('id'); // For selection
    expect(provider).toHaveProperty('name'); // For display
    expect(provider).toHaveProperty('priority'); // For sorting
    expect(provider).toHaveProperty('enabled'); // For filtering

    // Regression: Modal needs these fields to display correctly
    const requiredFields = ['id', 'name', 'priority', 'enabled'];
    const missingFields = requiredFields.filter(field => !(field in provider));
    expect(missingFields).toEqual([]);
  });
});

describe('[P2] Provider Selection Persistence Regression', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset existsSync to default true for file exists scenarios
    mockExistsSync.mockReturnValue(true);
    const routeModule = await import('@/app/api/providers/route');
    GET = routeModule.GET;
  });

  it('should provider structure compatible with user preferences storage', async () => {
    // Given: Provider response from API
    const mockConfig = {
      providers: [
        {
          id: 'youtube',
          name: 'YouTube Videos',
          priority: 3,
          enabled: true,
          command: 'python',
          args: ['-m', 'mcp_servers.youtube'],
          env: {},
        },
      ],
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // When: User selects a provider
    const response = await GET();
    const jsonResponse = await response.json();
    const provider = jsonResponse.providers[0];

    // Then: Provider ID should be compatible with preferences storage
    expect(typeof provider.id).toBe('string');
    expect(provider.id.length).toBeGreaterThan(0);

    // Regression: Provider ID must be valid for database storage
    // User preferences table expects: provider_id VARCHAR(255)
    expect(provider.id).toMatch(/^[a-zA-Z0-9_-]+$/); // Alphanumeric, hyphen, underscore only
  });
});
