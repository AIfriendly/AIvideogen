/**
 * MCP Video Provider Module - Main Exports
 *
 * Story 6.9: MCP Video Provider Client Architecture
 *
 * This module provides the MCP client architecture for connecting to
 * local video provider MCP servers (DVIDS, NASA, etc.).
 *
 * @module lib/mcp
 */

// Export all types
export type {
  ProviderConfig,
  VideoSearchResult,
  VideoDetails,
  MCPServersConfig,
} from './types';

// Export all error classes
export {
  MCPConnectionError,
  MCPTimeoutError,
  MCPServerError,
  ConfigurationError,
  ProviderError,
} from './types';

// Export VideoProviderClient
export { VideoProviderClient } from './video-provider-client';

// Export ProviderRegistry
export { ProviderRegistry } from './provider-registry';
