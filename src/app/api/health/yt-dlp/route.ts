/**
 * yt-dlp Health Check Endpoint
 *
 * Verifies yt-dlp availability and version before allowing downloads.
 * Called at server startup, before enqueuing downloads, and optionally on a schedule.
 *
 * Story 3.6: Default Segment Download Service
 *
 * GET /api/health/yt-dlp
 * Returns: { available, version, supportsDownloadSections, error }
 */

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

// ============================================================================
// Types
// ============================================================================

interface HealthCheckResult {
  available: boolean;
  version?: string;
  supportsDownloadSections: boolean;
  error?: string;
}

// ============================================================================
// Health Check Logic
// ============================================================================

/**
 * Check if yt-dlp is available and supports required features
 */
async function checkYtDlpHealth(): Promise<HealthCheckResult> {
  try {
    // Execute yt-dlp --version
    const version = await getYtDlpVersion();

    if (!version) {
      return {
        available: false,
        supportsDownloadSections: false,
        error: 'yt-dlp not installed or not in PATH',
      };
    }

    // Parse version number
    const supportsDownloadSections = checkVersionSupport(version);

    return {
      available: true,
      version,
      supportsDownloadSections,
    };
  } catch (error: any) {
    return {
      available: false,
      supportsDownloadSections: false,
      error: error.message || 'Failed to check yt-dlp availability',
    };
  }
}

/**
 * Get yt-dlp version by executing yt-dlp --version
 */
async function getYtDlpVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const ytDlpProcess = spawn('yt-dlp', ['--version']);

    let stdout = '';
    let stderr = '';

    ytDlpProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ytDlpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytDlpProcess.on('close', (code) => {
      if (code === 0) {
        // Parse version from stdout (format: "2024.03.10" or similar)
        const version = stdout.trim();
        resolve(version || null);
      } else {
        console.error('[yt-dlp Health Check] yt-dlp --version failed:', stderr);
        resolve(null);
      }
    });

    ytDlpProcess.on('error', (error) => {
      // Command not found or execution failed
      console.error('[yt-dlp Health Check] Failed to execute yt-dlp:', error.message);
      resolve(null);
    });
  });
}

/**
 * Check if version supports --download-sections flag
 * Required version: 2023.03.04 or higher
 */
function checkVersionSupport(version: string): boolean {
  try {
    // Parse version string (format: "YYYY.MM.DD" or "YYYY.MM.DD.N")
    const parts = version.split('.');
    if (parts.length < 3) {
      return false;
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return false;
    }

    // Compare with required version: 2023.03.04
    if (year > 2023) return true;
    if (year < 2023) return false;

    if (month > 3) return true;
    if (month < 3) return false;

    if (day >= 4) return true;

    return false;
  } catch (error) {
    console.error('[yt-dlp Health Check] Failed to parse version:', error);
    return false;
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * GET /api/health/yt-dlp
 * Health check endpoint for yt-dlp availability
 */
export async function GET() {
  try {
    const healthResult = await checkYtDlpHealth();

    if (!healthResult.available) {
      return NextResponse.json(healthResult, { status: 503 });
    }

    if (!healthResult.supportsDownloadSections) {
      return NextResponse.json(
        {
          ...healthResult,
          error: `yt-dlp version ${healthResult.version} does not support --download-sections. Required: 2023.03.04 or higher.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(healthResult, { status: 200 });
  } catch (error: any) {
    console.error('[yt-dlp Health Check] Unexpected error:', error);
    return NextResponse.json(
      {
        available: false,
        supportsDownloadSections: false,
        error: 'Internal server error during health check',
      },
      { status: 500 }
    );
  }
}
