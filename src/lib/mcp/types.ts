/**
 * MCP Video Provider Types
 *
 * Story 6.9: MCP Video Provider Client Architecture
 * AC-6.9.1: VideoProviderClient Class
 *
 * @module lib/mcp/types
 */

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  priority: number;
  enabled: boolean;
}

/**
 * Video search result interface
 */
export interface VideoSearchResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  publishedAt: string;
  /** Provider ID (youtube, dvids, nasa) - Story 6.12 */
  providerId?: string;
  /** Actual download URL for MCP providers - Story 6.12 */
  sourceUrl?: string;
}

/**
 * Video details interface
 */
export interface VideoDetails {
  videoId: string;
  title: string;
  description: string;
  duration: number;
  downloadUrl: string;
  format: string;
}

/**
 * MCP servers configuration interface
 */
export interface MCPServersConfig {
  providers: ProviderConfig[];
}

/**
 * Custom error class for MCP connection errors
 */
export class MCPConnectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'MCPConnectionError';
  }
}

/**
 * Custom error class for MCP timeout errors
 */
export class MCPTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MCPTimeoutError';
  }
}

/**
 * Custom error class for MCP server errors
 */
export class MCPServerError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'MCPServerError';
  }
}

/**
 * Custom error class for configuration errors
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Custom error class for provider errors
 */
export class ProviderError extends Error {
  constructor(message: string, public readonly providerId?: string) {
    super(message);
    this.name = 'ProviderError';
  }
}
