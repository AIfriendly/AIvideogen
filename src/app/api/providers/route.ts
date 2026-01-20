/**
 * Providers API Endpoint
 *
 * GET /api/providers
 *
 * Returns the list of available video providers from mcp_servers.json configuration.
 * This allows the UI to dynamically load provider configuration instead of
 * using hardcoded defaults.
 *
 * @module app/api/providers
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join, normalize, relative } from 'path';

/**
 * Schema validation for provider configuration
 * Manual validation since Zod is not available
 */
interface Provider {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  command?: string;
  args?: string[];
}

interface ProvidersConfig {
  providers?: Provider[];
}

/**
 * Validates that a value is a valid provider object
 */
function isValidProvider(obj: unknown): obj is Provider {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const provider = obj as Record<string, unknown>;

  return (
    typeof provider.id === 'string' &&
    typeof provider.name === 'string' &&
    typeof provider.priority === 'number' &&
    typeof provider.enabled === 'boolean' &&
    (provider.command === undefined || typeof provider.command === 'string') &&
    (provider.args === undefined || Array.isArray(provider.args))
  );
}

/**
 * Validates that the config has the expected structure
 */
function isValidProvidersConfig(obj: unknown): obj is ProvidersConfig {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const config = obj as Record<string, unknown>;

  // Check if providers array exists and is valid
  if (config.providers !== undefined) {
    if (!Array.isArray(config.providers)) {
      return false;
    }

    // Validate each provider in the array
    for (const provider of config.providers) {
      if (!isValidProvider(provider)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * GET /api/providers
 *
 * Returns all configured video providers from mcp_servers.json.
 *
 * Success Response (200):
 * {
 *   providers: [
 *     {
 *       id: string,
 *       name: string,
 *       priority: number,
 *       enabled: boolean,
 *       command: string,
 *       args: string[]
 *     }
 *   ]
 * }
 *
 * Error Response (400/404/500):
 * {
 *   error: string,
 *   message: string
 * }
 */
export async function GET() {
  try {
    const configDir = join(process.cwd(), 'config');
    const configPath = join(configDir, 'mcp_servers.json');

    // SECURITY: Validate path is within config directory to prevent path traversal
    const relativePath = relative(configDir, configPath);
    if (relativePath.startsWith('..') || relativePath.includes('..')) {
      return NextResponse.json(
        {
          error: 'INVALID_PATH',
          message: 'Invalid config path',
        },
        { status: 400 }
      );
    }

    // Normalize path to prevent any path manipulation attempts
    const normalizedPath = normalize(configPath);
    if (normalizedPath !== configPath) {
      return NextResponse.json(
        {
          error: 'INVALID_PATH',
          message: 'Invalid config path',
        },
        { status: 400 }
      );
    }

    // Check file exists before attempting to read
    if (!existsSync(configPath)) {
      return NextResponse.json(
        {
          error: 'CONFIG_NOT_FOUND',
          message: 'Provider configuration file not found. Ensure config/mcp_servers.json exists.',
        },
        { status: 404 }
      );
    }

    // Parse configuration
    const configContent = readFileSync(configPath, 'utf-8');
    let config: unknown;

    try {
      config = JSON.parse(configContent);
    } catch (parseError) {
      return NextResponse.json(
        {
          error: 'INVALID_CONFIG',
          message: `Invalid JSON in configuration file: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
        },
        { status: 500 }
      );
    }

    // SECURITY: Validate response structure to prevent data exposure
    if (!isValidProvidersConfig(config)) {
      return NextResponse.json(
        {
          error: 'INVALID_CONFIG',
          message: 'Invalid provider configuration structure. Configuration must have a "providers" array with valid provider objects.',
        },
        { status: 500 }
      );
    }

    // Return validated providers array
    return NextResponse.json({
      providers: config.providers || [],
    });
  } catch (error) {
    // Handle any unexpected errors
    return NextResponse.json(
      {
        error: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load provider configuration',
      },
      { status: 500 }
    );
  }
}
