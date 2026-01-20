/**
 * Test Data Factory for MCP Video Providers - Story 6.9
 *
 * Provides factory functions to generate MCP provider test data.
 *
 * Usage:
 *   const provider = createMCPProvider({ id: 'custom-provider' });
 *   const registry = createMockRegistry({ providerCount: 3 });
 *
 * @module tests/factories/mcp.factory
 */

import { faker } from '@faker-js/faker';

export interface MCPProviderConfig {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface VideoSearchResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  publishedAt: string;
}

export interface VideoDetails {
  videoId: string;
  title: string;
  description: string;
  duration: number;
  downloadUrl: string;
  format: string;
}

/**
 * Creates an MCP provider configuration for testing
 *
 * @param overrides - Partial provider properties to override defaults
 * @returns MCP provider configuration object
 *
 * @example
 * // Create DVIDS provider
 * const dvids = createMCPProvider({
 *   id: 'dvids',
 *   name: 'DVIDS Military Videos'
 * });
 *
 * // Create provider with custom priority
 * const provider = createMCPProvider({ priority: 5 });
 */
export function createMCPProvider(overrides?: Partial<MCPProviderConfig>): MCPProviderConfig {
  return {
    id: faker.word.noun({ length: 1 }) + faker.string.alphanumeric(5),
    name: faker.company.name() + ' Videos',
    priority: faker.number.int({ min: 1, max: 10 }),
    enabled: faker.datatype.boolean(),
    command: 'python',
    args: ['-m', `mcp_servers.${faker.word.noun()}`],
    env: {
      CACHE_DIR: `./assets/cache/${faker.word.noun()}`,
      RATE_LIMIT: faker.number.int({ min: 5, max: 60 }).toString(),
    },
    ...overrides,
  };
}

/**
 * Creates multiple MCP provider configurations
 *
 * @param count - Number of providers to generate
 * @returns Array of MCP provider configurations
 *
 * @example
 * const providers = createMCPProviders(3);
 */
export function createMCPProviders(count: number): MCPProviderConfig[] {
  return Array.from({ length: count }, (_, i) =>
    createMCPProvider({
      priority: i + 1, // Ensure unique priorities
      enabled: true, // Most tests need enabled providers
    })
  );
}

/**
 * Creates a mock MCP server configuration
 *
 * @returns Mock server configuration object
 */
export function createMockServerConfig(): MCPProviderConfig {
  return {
    id: 'mock-server',
    name: 'Mock MCP Server',
    priority: 1,
    enabled: true,
    command: 'node',
    args: ['--version'], // Safe command that always works
    env: {
      MOCK_MODE: 'true',
    },
  };
}

/**
 * Creates a video search result for testing
 *
 * @param overrides - Partial result properties to override defaults
 * @returns Video search result object
 *
 * @example
 * const result = createVideoSearchResult({
 *   videoId: 'dvids-123',
 *   title: 'Military Aircraft Footage'
 * });
 */
export function createVideoSearchResult(overrides?: Partial<VideoSearchResult>): VideoSearchResult {
  return {
    videoId: `${faker.word.noun()}-${faker.number.int({ min: 1000, max: 9999 })}`,
    title: faker.lorem.sentence({ min: 4, max: 8 }),
    description: faker.lorem.paragraph({ min: 2, max: 4 }),
    thumbnailUrl: faker.image.url(),
    duration: faker.number.int({ min: 30, max: 300 }),
    publishedAt: faker.date.past({ years: 2 }).toISOString(),
    ...overrides,
  };
}

/**
 * Creates multiple video search results
 *
 * @param count - Number of results to generate
 * @returns Array of video search results
 *
 * @example
 * const results = createVideoSearchResults(10);
 */
export function createVideoSearchResults(count: number): VideoSearchResult[] {
  return Array.from({ length: count }, () => createVideoSearchResult());
}

/**
 * Creates video details for testing
 *
 * @param overrides - Partial details properties to override defaults
 * @returns Video details object
 *
 * @example
 * const details = createVideoDetails({
 *   videoId: 'nasa-456',
 *   format: 'mp4'
 * });
 */
export function createVideoDetails(overrides?: Partial<VideoDetails>): VideoDetails {
  const videoId = `${faker.word.noun()}-${faker.number.int({ min: 1000, max: 9999 })}`;

  return {
    videoId,
    title: faker.lorem.sentence({ min: 4, max: 8 }),
    description: faker.lorem.paragraph({ min: 2, max: 4 }),
    duration: faker.number.int({ min: 30, max: 300 }),
    downloadUrl: faker.internet.url() + `/videos/${videoId}.mp4`,
    format: faker.helpers.arrayElement(['mp4', 'webm', 'mov']),
    ...overrides,
  };
}

/**
 * Creates a mock MCP registry configuration
 *
 * @param options - Configuration options
 * @returns Mock registry configuration object
 *
 * @example
 * const registryConfig = createMockRegistryConfig({
 *   providerCount: 3,
 *   enabledOnly: true
 * });
 */
export function createMockRegistryConfig(options?: {
  providerCount?: number;
  enabledOnly?: boolean;
  includeEnv?: boolean;
}): { providers: MCPProviderConfig[] } {
  const { providerCount = 2, enabledOnly = false, includeEnv = true } = options || {};

  const providers = Array.from({ length: providerCount }, (_, i) => {
    const provider = createMCPProvider({
      priority: i + 1,
      enabled: enabledOnly ? true : faker.datatype.boolean(),
    });

    // Exclude env property if not needed using destructuring
    if (!includeEnv) {
      const { env, ...providerWithoutEnv } = provider;
      return providerWithoutEnv as MCPProviderConfig;
    }

    return provider;
  });

  return { providers };
}

/**
 * Creates a valid DVIDS provider configuration
 *
 * @returns DVIDS provider configuration matching story spec
 */
export function createDVIDSProvider(): MCPProviderConfig {
  return {
    id: 'dvids',
    name: 'DVIDS Military Videos',
    priority: 1,
    enabled: false,
    command: 'python',
    args: ['-m', 'mcp_servers.dvids'],
    env: {
      DVIDS_CACHE_DIR: './assets/cache/dvids',
      DVIDS_RATE_LIMIT: '30',
    },
  };
}

/**
 * Creates a valid NASA provider configuration
 *
 * @returns NASA provider configuration matching story spec
 */
export function createNASAProvider(): MCPProviderConfig {
  return {
    id: 'nasa',
    name: 'NASA Space Videos',
    priority: 2,
    enabled: false,
    command: 'python',
    args: ['-m', 'mcp_servers.nasa'],
    env: {
      NASA_CACHE_DIR: './assets/cache/nasa',
      NASA_RATE_LIMIT: '10',
    },
  };
}

/**
 * Creates the complete MCP servers configuration from story spec
 *
 * @returns Complete mcp_servers.json configuration
 */
export function createStorySpecConfig(): { providers: MCPProviderConfig[] } {
  return {
    providers: [createDVIDSProvider(), createNASAProvider()],
  };
}

/**
 * Generates a random video ID for testing
 *
 * @param providerId - Provider prefix (e.g., 'dvids', 'nasa')
 * @returns Random video ID
 *
 * @example
 * const videoId = generateVideoId('dvids'); // 'dvids-12345'
 */
export function generateVideoId(providerId: string): string {
  return `${providerId}-${faker.number.int({ min: 10000, max: 99999 })}`;
}

/**
 * Creates a local file path for downloaded video
 *
 * @param videoId - Video ID to use in filename
 * @returns Local file path
 */
export function createDownloadPath(videoId: string): string {
  return `./assets/downloads/${videoId}.mp4`;
}
