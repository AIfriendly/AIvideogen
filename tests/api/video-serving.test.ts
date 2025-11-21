/**
 * API Route Tests - Video Serving Endpoint
 * Story 4.3: Video Preview & Playback Functionality
 *
 * Tests for /api/videos/[...path] route including file serving,
 * Range request support, Content-Type headers, and error handling.
 *
 * Test IDs: 4.3-API-001 to 4.3-API-010
 * Priority: P0 (Critical)
 * Acceptance Criteria: AC2, AC3
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/videos/[...path]/route';
import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

describe('Video Serving API - Story 4.3', () => {
  const testVideoDir = path.join(process.cwd(), '.cache/videos');
  const testProjectId = 'test-proj-123';
  const testVideoContent = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
    0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, // isom
    0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // isomiso2
    0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31, // avc1mp41
  ]);

  beforeEach(async () => {
    // Create test video directory and file
    const projectVideoDir = path.join(testVideoDir, testProjectId);
    await fs.mkdir(projectVideoDir, { recursive: true });

    // Create test video file with valid MP4 header
    const videoPath = path.join(projectVideoDir, 'scene-01-default.mp4');
    await fs.writeFile(videoPath, testVideoContent);
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      const projectVideoDir = path.join(testVideoDir, testProjectId);
      await fs.rm(projectVideoDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    vi.restoreAllMocks();
  });

  /**
   * [4.3-API-001] Serve Video Files
   */
  describe('[4.3-API-001] Video File Serving', () => {
    test('should serve video file from .cache/videos directory', async () => {
      // Given: Valid video path
      const validPath = ['videos', testProjectId, 'scene-01-default.mp4'];
      const request = new NextRequest(
        `http://localhost:3000/api/videos/${validPath.join('/')}`,
        { method: 'GET' }
      );

      // When: Requesting video file
      const response = await GET(request, {
        params: Promise.resolve({ path: validPath })
      });

      // Then: Should return video content
      expect(response.status).toBe(200);

      const buffer = await response.arrayBuffer();
      expect(Buffer.from(buffer)).toEqual(testVideoContent);
    });

    test('should handle nested project paths correctly', async () => {
      // Given: Nested project structure
      const nestedPath = path.join(testVideoDir, 'org-123', 'proj-456');
      await fs.mkdir(nestedPath, { recursive: true });
      await fs.writeFile(path.join(nestedPath, 'scene-02.mp4'), testVideoContent);

      // When: Requesting nested video
      const request = new NextRequest(
        'http://localhost:3000/api/videos/videos/org-123/proj-456/scene-02.mp4',
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', 'org-123', 'proj-456', 'scene-02.mp4'] })
      });

      // Then: Should serve file
      expect(response.status).toBe(200);

      // Cleanup
      await fs.rm(path.join(testVideoDir, 'org-123'), { recursive: true, force: true });
    });
  });

  /**
   * [4.3-API-002] Content-Type Headers
   */
  describe('[4.3-API-002] Response Headers', () => {
    test('should set correct Content-Type for MP4 files', async () => {
      // Given: MP4 file request
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        { method: 'GET' }
      );

      // When: Serving MP4 file
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should have video/mp4 Content-Type
      expect(response.headers.get('Content-Type')).toBe('video/mp4');
    });

    test('should set Content-Length header', async () => {
      // Given: Video file request
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        { method: 'GET' }
      );

      // When: Serving file
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should have Content-Length
      expect(response.headers.get('Content-Length')).toBe(String(testVideoContent.length));
    });

    test('should set Accept-Ranges header for seeking support', async () => {
      // Given: Video file request
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        { method: 'GET' }
      );

      // When: Serving file
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should support byte ranges
      expect(response.headers.get('Accept-Ranges')).toBe('bytes');
    });

    test('should set Cache-Control headers', async () => {
      // Given: Video file request
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        { method: 'GET' }
      );

      // When: Serving file
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should have cache headers
      expect(response.headers.get('Cache-Control')).toMatch(/max-age=\d+/);
    });
  });

  /**
   * [4.3-API-003] Range Request Support (HTTP 206)
   */
  describe('[4.3-API-003] Range Requests for Video Seeking', () => {
    test('should handle Range request with start only', async () => {
      // Given: Range request starting at byte 10
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        {
          method: 'GET',
          headers: { 'Range': 'bytes=10-' }
        }
      );

      // When: Processing range request
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should return 206 Partial Content
      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toMatch(/^bytes 10-\d+\/\d+$/);

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBe(testVideoContent.length - 10);
    });

    test('should handle Range request with start and end', async () => {
      // Given: Range request for bytes 5-15
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        {
          method: 'GET',
          headers: { 'Range': 'bytes=5-15' }
        }
      );

      // When: Processing range request
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should return requested bytes
      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe(`bytes 5-15/${testVideoContent.length}`);
      expect(response.headers.get('Content-Length')).toBe('11'); // 15-5+1

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBe(11);
    });

    test('should handle Range request for last N bytes', async () => {
      // Given: Request for last 10 bytes
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        {
          method: 'GET',
          headers: { 'Range': 'bytes=-10' }
        }
      );

      // When: Processing suffix range
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should return last 10 bytes
      expect(response.status).toBe(206);

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBe(10);
    });

    test('should return 416 for invalid range', async () => {
      // Given: Invalid range beyond file size
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        {
          method: 'GET',
          headers: { 'Range': 'bytes=1000-2000' }
        }
      );

      // When: Processing invalid range
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should return 416 Range Not Satisfiable
      expect(response.status).toBe(416);
      expect(response.headers.get('Content-Range')).toMatch(/^bytes \*\/\d+$/);
    });
  });

  /**
   * [4.3-API-004] Error Handling
   */
  describe('[4.3-API-004] Error Response Handling', () => {
    test('should return 404 for non-existent files', async () => {
      // Given: Non-existent file path
      const request = new NextRequest(
        'http://localhost:3000/api/videos/videos/test/non-existent.mp4',
        { method: 'GET' }
      );

      // When: Requesting non-existent file
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', 'test', 'non-existent.mp4'] })
      });

      // Then: Should return 404
      expect(response.status).toBe(404);

      const text = await response.text();
      expect(text).toContain('File not found');
    });

    test('should handle file read errors gracefully', async () => {
      // Given: File that exists but can't be read
      const videoPath = path.join(testVideoDir, testProjectId, 'corrupted.mp4');

      // Mock file operations
      vi.spyOn(fs, 'stat').mockResolvedValueOnce({
        size: 1024,
        isFile: () => true,
      } as any);

      vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('Read error'));

      // When: Attempting to serve corrupted file
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/corrupted.mp4`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'corrupted.mp4'] })
      });

      // Then: Should return 500 error
      expect(response.status).toBe(500);
    });

    test('should handle directory requests', async () => {
      // Given: Request for directory instead of file
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/`,
        { method: 'GET' }
      );

      // When: Requesting directory
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId] })
      });

      // Then: Should return 404
      expect(response.status).toBe(404);
    });
  });

  /**
   * [4.3-API-005] CORS Headers
   */
  describe('[4.3-API-005] CORS Support', () => {
    test('should include CORS headers for cross-origin requests', async () => {
      // Given: Cross-origin request
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        {
          method: 'GET',
          headers: { 'Origin': 'http://example.com' }
        }
      );

      // When: Serving video
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should include CORS headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  /**
   * [4.3-API-006] Performance Headers
   */
  describe('[4.3-API-006] Performance Optimization', () => {
    test('should support conditional requests (ETag)', async () => {
      // Given: Request with If-None-Match
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        {
          method: 'GET',
          headers: { 'If-None-Match': '"abc123"' }
        }
      );

      // When: Serving video
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should have ETag header
      expect(response.headers.get('ETag')).toBeDefined();
    });

    test('should set appropriate cache headers for video files', async () => {
      // Given: Video request
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        { method: 'GET' }
      );

      // When: Serving video
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should have cache headers for performance
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toMatch(/public/);
      expect(cacheControl).toMatch(/max-age=\d+/);
      expect(parseInt(cacheControl?.match(/max-age=(\d+)/)?.[1] || '0')).toBeGreaterThan(0);
    });
  });

  /**
   * [4.3-API-007] WebM Support
   */
  describe('[4.3-API-007] Multiple Video Format Support', () => {
    test('should serve WebM files with correct Content-Type', async () => {
      // Given: WebM file
      const webmPath = path.join(testVideoDir, testProjectId, 'scene-01.webm');
      await fs.writeFile(webmPath, Buffer.from([0x1A, 0x45, 0xDF, 0xA3])); // WebM header

      // When: Requesting WebM file
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01.webm`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01.webm'] })
      });

      // Then: Should serve with correct type
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('video/webm');
    });
  });

  /**
   * [4.3-API-008] HEAD Request Support
   */
  describe('[4.3-API-008] HEAD Method Support', () => {
    test('should handle HEAD requests for metadata', async () => {
      // Given: HEAD request
      const request = new NextRequest(
        `http://localhost:3000/api/videos/videos/${testProjectId}/scene-01-default.mp4`,
        { method: 'HEAD' }
      );

      // When: Processing HEAD request
      const response = await GET(request, {
        params: Promise.resolve({ path: ['videos', testProjectId, 'scene-01-default.mp4'] })
      });

      // Then: Should return headers without body
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Length')).toBe(String(testVideoContent.length));
      expect(response.headers.get('Content-Type')).toBe('video/mp4');
    });
  });
});