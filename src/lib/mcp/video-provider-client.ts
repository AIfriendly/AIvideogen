/**
 * VideoProviderClient - MCP Client for Video Provider Servers
 *
 * Implements an MCP (Model Context Protocol) client for connecting to
 * local video provider MCP servers via stdio transport.
 *
 * Story 6.9: MCP Video Provider Client Architecture
 * AC-6.9.1: VideoProviderClient Class
 * AC-6.9.4: MCP Client Integration
 *
 * @module lib/mcp/video-provider-client
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type {
  ProviderConfig,
  VideoSearchResult,
  VideoDetails,
} from './types';
import {
  MCPConnectionError,
  MCPTimeoutError,
  MCPServerError,
} from './types';

// Re-export errors for backward compatibility
export { MCPConnectionError, MCPTimeoutError, MCPServerError } from './types';

/**
 * VideoProviderClient - MCP client for video provider servers
 *
 * Manages connections to local MCP servers that provide video search
 * and download capabilities. Uses stdio transport for server communication.
 */
export class VideoProviderClient {
  private _client: Client | null = null;
  private _transport: StdioClientTransport | null = null;
  public readonly serverConfig: ProviderConfig;

  // Expose client and transport for testing purposes
  public get client(): Client | null {
    return this._client;
  }

  public get transport(): StdioClientTransport | null {
    return this._transport;
  }

  constructor(config: ProviderConfig) {
    this.serverConfig = config;
    this.validateCommandSecurity();
  }

  /**
   * Validate command and args to prevent command injection
   * @throws {MCPConnectionError} If command or args contain suspicious patterns
   */
  private validateCommandSecurity(): void {
    const suspiciousPatterns = [
      /[;&|`$()]/,  // Shell metacharacters
      /\.\./,       // Directory traversal
      /\/\//,       // Double slashes (potential bypass)
      /\\/,         // Backslashes (potential Windows bypass)
    ];

    // Check command
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(this.serverConfig.command)) {
        throw new MCPConnectionError(
          `Invalid command: contains suspicious characters. Command: ${this.serverConfig.command}`
        );
      }
    }

    // Check each arg
    for (const arg of this.serverConfig.args) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(arg)) {
          throw new MCPConnectionError(
            `Invalid argument: contains suspicious characters. Arg: ${arg}`
          );
        }
      }
    }

    // Ensure command is not empty
    if (!this.serverConfig.command || this.serverConfig.command.trim().length === 0) {
      throw new MCPConnectionError('Command cannot be empty');
    }

    // Ensure args is an array
    if (!Array.isArray(this.serverConfig.args)) {
      throw new MCPConnectionError('Args must be an array');
    }
  }

  /**
   * Connect to the MCP server via stdio transport
   */
  async connect(): Promise<void> {
    try {
      // Create stdio transport for server communication
      this._transport = new StdioClientTransport({
        command: this.serverConfig.command,
        args: this.serverConfig.args,
        env: this.serverConfig.env,
      });

      // Create MCP client instance
      this._client = new Client(
        {
          name: `video-provider-${this.serverConfig.id}`,
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect to the server
      await this._client.connect(this._transport);
    } catch (error) {
      // Handle connection errors
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw new MCPTimeoutError(
            `Connection to ${this.serverConfig.name} timed out. Ensure the server is running.`
          );
        }
        if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
          throw new MCPConnectionError(
            `Failed to start ${this.serverConfig.name} server. Command not found: ${this.serverConfig.command}`,
            error
          );
        }
        throw new MCPConnectionError(
          `Failed to connect to ${this.serverConfig.name}: ${error.message}`,
          error
        );
      }
      throw new MCPConnectionError(
        `Failed to connect to ${this.serverConfig.name}`,
        error as Error
      );
    }
  }

  /**
   * Search for videos using the MCP server
   *
   * @param query - Search query string
   * @param maxDuration - Maximum video duration in seconds (optional)
   * @returns Array of video search results
   */
  async searchVideos(
    query: string,
    maxDuration?: number
  ): Promise<VideoSearchResult[]> {
    if (!this._client) {
      throw new MCPConnectionError('Client not connected. Call connect() first.');
    }

    const request = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'tools/call' as const,
      params: {
        name: 'search_videos',
        arguments: {
          query,
          ...(maxDuration !== undefined && { max_duration: maxDuration }),
        },
      },
    };

    try {
      // Send JSON-RPC request to MCP server
      const response = await this._client.request(request, CallToolResultSchema);

      // Parse response content - CallToolResultSchema returns response with content directly
      const content = (response as any).content || response;
      if (content && content.length > 0) {
        const textContent = content.find((c: any) => c.type === 'text');
        if (textContent && 'text' in textContent && textContent.text) {
          const text = textContent.text;
          try {
            const parsed = JSON.parse(text) as VideoSearchResult[] | { error: string };
            // Check if response contains an error
            if (parsed && typeof parsed === 'object' && 'error' in parsed) {
              console.warn(`MCP search returned error: ${parsed.error}`);
              return [];
            }
            return parsed as VideoSearchResult[];
          } catch (parseError) {
            console.error('Failed to parse MCP search response as JSON:', {
              text: text.substring(0, 200),
              error: parseError instanceof Error ? parseError.message : String(parseError)
            });
            return [];
          }
        }
      }

      return [];
    } catch (error) {
      if (error instanceof MCPConnectionError || error instanceof MCPServerError) {
        throw error;
      }
      throw new MCPServerError(
        `Search videos failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Download a video using the MCP server
   *
   * @param videoId - Video identifier
   * @param outputPath - Optional output file path for downloaded video
   * @param segmentDuration - Optional duration of video segment to download (seconds)
   * @returns Local file path of downloaded video
   */
  async downloadVideo(
    videoId: string,
    outputPath?: string,
    segmentDuration?: number
  ): Promise<string> {
    if (!this._client) {
      throw new MCPConnectionError('Client not connected. Call connect() first.');
    }

    const request = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'tools/call' as const,
      params: {
        name: 'download_video',
        arguments: {
          video_id: videoId,
          ...(outputPath !== undefined && { output_path: outputPath }),
          ...(segmentDuration !== undefined && { duration: segmentDuration }),
        },
      },
    };

    try {
      // Send JSON-RPC request to MCP server
      const response = await this._client.request(request, CallToolResultSchema);

      // Parse response content - CallToolResultSchema returns response with content directly
      const content = (response as any).content || response;
      if (content && content.length > 0) {
        const textContent = content.find((c: any) => c.type === 'text');
        if (textContent && 'text' in textContent && textContent.text) {
          const text = textContent.text;
          // Response should contain file path
          return text;
        }
      }

      throw new MCPServerError('Download failed: No file path returned from server');
    } catch (error) {
      if (error instanceof MCPConnectionError || error instanceof MCPServerError) {
        throw error;
      }
      throw new MCPServerError(
        `Download video failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get video details using the MCP server
   *
   * @param videoId - Video identifier
   * @returns Video details object
   */
  async getVideoDetails(videoId: string): Promise<VideoDetails> {
    if (!this._client) {
      throw new MCPConnectionError('Client not connected. Call connect() first.');
    }

    const request = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'tools/call' as const,
      params: {
        name: 'get_video_details',
        arguments: {
          video_id: videoId,
        },
      },
    };

    try {
      // Send JSON-RPC request to MCP server
      const response = await this._client.request(request, CallToolResultSchema);

      // Parse response content - CallToolResultSchema returns response with content directly
      const content = (response as any).content || response;
      if (content && content.length > 0) {
        const textContent = content.find((c: any) => c.type === 'text');
        if (textContent && 'text' in textContent && textContent.text) {
          const text = textContent.text;
          try {
            const parsed = JSON.parse(text) as VideoDetails | { error: string };
            // Check if response contains an error
            if (parsed && typeof parsed === 'object' && 'error' in parsed) {
              throw new MCPServerError(`Video not found: ${parsed.error}`);
            }
            return parsed as VideoDetails;
          } catch (parseError) {
            if (parseError instanceof MCPServerError) {
              throw parseError;
            }
            console.error('Failed to parse MCP video details response as JSON:', {
              text: text.substring(0, 200),
              error: parseError instanceof Error ? parseError.message : String(parseError)
            });
            throw new MCPServerError('Invalid JSON response from server');
          }
        }
      }

      throw new MCPServerError('Video not found');
    } catch (error) {
      if (error instanceof MCPConnectionError || error instanceof MCPServerError) {
        throw error;
      }
      throw new MCPServerError(
        `Get video details failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disconnect from the MCP server and cleanup resources
   * Uses finally block to ensure cleanup happens even if close() fails
   */
  async disconnect(): Promise<void> {
    try {
      if (this._client) {
        await this._client.close();
      }
    } catch (error) {
      console.warn('Error closing MCP client:', error);
    } finally {
      this._client = null;
    }

    try {
      if (this._transport) {
        await this._transport.close();
      }
    } catch (error) {
      console.warn('Error closing MCP transport:', error);
    } finally {
      this._transport = null;
    }
  }
}
