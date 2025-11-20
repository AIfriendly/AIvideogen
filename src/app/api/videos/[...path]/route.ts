/**
 * Video Serving API Route - Epic 4, Story 4.3
 *
 * Serves video files from the .cache/videos/ directory with proper security
 * and HTTP Range request support for video seeking.
 *
 * Features:
 * - Path traversal attack prevention
 * - HTTP Range request support (206 Partial Content)
 * - Proper Content-Type headers for video files
 * - File existence validation
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/videos/[...path]
 *
 * Serves video files from .cache directory.
 * Supports Range requests for video seeking.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path;

    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Bad Request: No path provided', { status: 400 });
    }

    // Reconstruct the file path
    const requestedPath = pathSegments.join('/');

    // Construct the full file path within .cache directory
    const cacheDir = path.join(process.cwd(), '.cache');
    const filePath = path.join(cacheDir, requestedPath);

    // SECURITY: Normalize paths and validate within .cache directory
    const normalizedFilePath = path.normalize(filePath);
    const normalizedCacheDir = path.normalize(cacheDir);

    // Check for path traversal attacks
    if (!normalizedFilePath.startsWith(normalizedCacheDir)) {
      console.error(
        `[Video API] Path traversal attempt blocked: ${requestedPath}`
      );
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check for suspicious patterns in the original path
    if (
      requestedPath.includes('..') ||
      requestedPath.includes('//') ||
      requestedPath.includes('\\')
    ) {
      console.error(
        `[Video API] Suspicious path pattern blocked: ${requestedPath}`
      );
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if file exists
    if (!fs.existsSync(normalizedFilePath)) {
      console.warn(`[Video API] File not found: ${normalizedFilePath}`);
      return new NextResponse('Not Found', { status: 404 });
    }

    // Get file stats
    const stat = fs.statSync(normalizedFilePath);
    const fileSize = stat.size;

    // Determine content type based on file extension
    const ext = path.extname(normalizedFilePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.mp4') {
      contentType = 'video/mp4';
    } else if (ext === '.webm') {
      contentType = 'video/webm';
    } else if (ext === '.mkv') {
      contentType = 'video/x-matroska';
    }

    // Check for Range header
    const range = request.headers.get('range');

    if (range) {
      // Parse Range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse('Range Not Satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;

      // Read the requested chunk
      const buffer = Buffer.alloc(chunkSize);
      const fd = fs.openSync(normalizedFilePath, 'r');
      fs.readSync(fd, buffer, 0, chunkSize, start);
      fs.closeSync(fd);

      // Return 206 Partial Content
      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // No Range header - return full file
    const fileBuffer = fs.readFileSync(normalizedFilePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Video API] Error serving video:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
