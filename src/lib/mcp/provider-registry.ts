/**
 * ProviderRegistry - MCP Video Provider Registry
 *
 * Manages multiple video provider MCP servers with priority-based
 * fallback logic for video search and download operations.
 *
 * Story 6.9: MCP Video Provider Client Architecture
 * AC-6.9.2: Configuration Schema
 * AC-6.9.3: Provider Registry Pattern
 *
 * @module lib/mcp/provider-registry
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { VideoProviderClient } from './video-provider-client';
import type {
  VideoSearchResult,
  ProviderConfig,
  MCPServersConfig,
} from './types';
import {
  ConfigurationError,
  ProviderError,
} from './types';

// Re-export types for backward compatibility
export type { MCPServersConfig } from './types';
export { ConfigurationError, ProviderError } from './types';

/**
 * ProviderRegistry - Manages multiple video provider MCP servers
 *
 * Loads configuration from mcp_servers.json and provides methods for
 * searching and downloading videos with automatic fallback logic.
 */
export class ProviderRegistry {
  private providers: Map<string, VideoProviderClient> = new Map();
  private config: MCPServersConfig;
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.config = { providers: [] };

    // Load configuration if path is provided
    if (configPath && configPath.length > 0) {
      this.loadConfigFromFile(configPath);
    }
  }

  /**
   * Load configuration from JSON file
   */
  private loadConfigFromFile(filePath: string): void {
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const parsedConfig = JSON.parse(fileContent) as MCPServersConfig;
      this.loadConfig(parsedConfig);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ConfigurationError(
          `Configuration file not found: ${filePath}. Ensure config/mcp_servers.json exists.`
        );
      }
      if (error instanceof SyntaxError) {
        throw new ConfigurationError(
          `Invalid JSON in configuration file: ${filePath}. ${error.message}`
        );
      }
      throw new ConfigurationError(
        `Failed to load configuration from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load and validate configuration
   */
  loadConfig(config: MCPServersConfig): void {
    // Validate configuration structure
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(config: MCPServersConfig): void {
    if (!config || typeof config !== 'object') {
      throw new ConfigurationError('Configuration must be an object');
    }

    if (!config.providers || !Array.isArray(config.providers)) {
      throw new ConfigurationError('providers required');
    }

    // Validate each provider
    config.providers.forEach((provider, index) => {
      this.validateProvider(provider, index);
    });
  }

  /**
   * Validate a single provider configuration
   */
  private validateProvider(provider: any, index: number): void {
    if (!provider.id || typeof provider.id !== 'string') {
      throw new ConfigurationError('id required');
    }
    if (!provider.name || typeof provider.name !== 'string') {
      throw new ConfigurationError('name required');
    }
    if (!provider.command || typeof provider.command !== 'string') {
      throw new ConfigurationError('command required');
    }
    if (!provider.args || !Array.isArray(provider.args)) {
      throw new ConfigurationError('args required');
    }
    if (typeof provider.priority !== 'number') {
      throw new ConfigurationError('priority required');
    }
    if (typeof provider.enabled !== 'boolean') {
      throw new ConfigurationError('enabled required');
    }
    if (provider.env && typeof provider.env !== 'object') {
      throw new ConfigurationError(`Provider at index ${index} has invalid "env" field`);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): MCPServersConfig {
    return this.config;
  }

  /**
   * Get a specific provider by ID
   * Creates and caches the provider instance if not already cached
   */
  async getProvider(id: string): Promise<VideoProviderClient> {
    // Check if provider exists in configuration
    const providerConfig = this.config.providers.find((p) => p.id === id);
    if (!providerConfig) {
      throw new ProviderError(`Provider not found: ${id}`, id);
    }

    // Check if provider is enabled
    if (!providerConfig.enabled) {
      throw new ProviderError(`Provider is disabled: ${id}`, id);
    }

    // Check cache for existing instance
    if (this.providers.has(id)) {
      return this.providers.get(id)!;
    }

    // Create new provider instance
    const provider = new VideoProviderClient(providerConfig);
    this.providers.set(id, provider);
    return provider;
  }

  /**
   * Search all providers in priority order
   * Returns results from first successful provider
   */
  async searchAllProviders(
    query: string,
    maxDuration?: number
  ): Promise<VideoSearchResult[]> {
    // Get enabled providers sorted by priority
    const enabledProviders = this.config.providers
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Handle empty provider list
    if (enabledProviders.length === 0) {
      return [];
    }

    // Try each provider in priority order
    for (const providerConfig of enabledProviders) {
      try {
        const provider = await this.getProvider(providerConfig.id);
        await provider.connect();
        const results = await provider.searchVideos(query, maxDuration);

        // Return first successful result
        if (results.length > 0) {
          return results;
        }

        // If no results, try next provider
        await provider.disconnect();
      } catch (error) {
        // Log error and try next provider
        console.warn(`Provider ${providerConfig.id} failed:`, error);
        // Continue to next provider
      }
    }

    // All providers failed or returned no results
    return [];
  }

  /**
   * Download video from specific provider or try all providers
   *
   * @param videoId - Video identifier
   * @param providerId - Optional provider ID to use
   * @param outputPath - Optional output file path for downloaded video
   * @param segmentDuration - Optional duration of video segment to download (seconds)
   * @returns Local file path of downloaded video
   */
  async downloadFromAnyProvider(
    videoId: string,
    providerId?: string,
    outputPath?: string,
    segmentDuration?: number
  ): Promise<string> {
    if (providerId) {
      // Download from specific provider
      try {
        const provider = await this.getProvider(providerId);
        await provider.connect();
        const filePath = await provider.downloadVideo(videoId, outputPath, segmentDuration);
        await provider.disconnect();
        return filePath;
      } catch (error) {
        throw new ProviderError(
          `Failed to download from provider ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          providerId
        );
      }
    }

    // Try all providers in priority order
    const enabledProviders = this.config.providers
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (enabledProviders.length === 0) {
      throw new ProviderError('No enabled providers available');
    }

    const errors: Array<{ providerId: string; error: Error }> = [];

    for (const providerConfig of enabledProviders) {
      try {
        const provider = await this.getProvider(providerConfig.id);
        await provider.connect();
        const filePath = await provider.downloadVideo(videoId, outputPath, segmentDuration);
        await provider.disconnect();
        return filePath;
      } catch (error) {
        errors.push({
          providerId: providerConfig.id,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    // All providers failed
    const errorMessages = errors
      .map((e) => `${e.providerId}: ${e.error.message}`)
      .join(', ');
    throw new ProviderError(`All providers failed to download video: ${errorMessages}`);
  }

  /**
   * Clear cached provider instances
   */
  clearCache(): void {
    this.providers.clear();
  }
}
