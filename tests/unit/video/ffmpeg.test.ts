/**
 * FFmpegClient Unit Tests - Story 5.1
 *
 * Tests for the FFmpegClient class functionality.
 */

// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// Use vi.hoisted() to ensure mock functions are available during module hoisting
const mocks = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
  mockAccess: vi.fn(),
}));

// Mock child_process with importOriginal to preserve other exports
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawn: mocks.mockSpawn,
  };
});

// Mock fs with importOriginal to preserve other exports
// Note: access is callback-style, and ffmpeg.ts uses promisify(access)
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    access: mocks.mockAccess,
    constants: actual.constants,
  };
});

import { FFmpegClient } from '@/lib/video/ffmpeg';

describe('FFmpegClient', () => {
  let client: FFmpegClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new FFmpegClient();

    // Default mock: file exists (callback style - call cb with no error)
    mocks.mockAccess.mockImplementation((_path: string, _mode: number, cb: Function) => {
      cb(null);
    });
  });

  describe('constructor', () => {
    it('should create instance with default paths', () => {
      expect(client).toBeDefined();
    });

    it('should allow custom FFmpeg paths', () => {
      const customClient = new FFmpegClient('/custom/ffmpeg', '/custom/ffprobe');
      expect(customClient).toBeDefined();
    });
  });

  describe('getVersion', () => {
    it('should return version string on success', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();

      mocks.mockSpawn.mockReturnValue(mockProcess);

      const versionPromise = client.getVersion();

      mockProcess.stdout.emit('data', Buffer.from('ffmpeg version 7.0.1 Copyright'));
      mockProcess.emit('close', 0);

      const version = await versionPromise;
      expect(version).toBe('7.0.1');
    });

    it('should reject when FFmpeg not installed', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();

      mocks.mockSpawn.mockReturnValue(mockProcess);

      const versionPromise = client.getVersion();

      mockProcess.emit('error', new Error('ENOENT'));

      await expect(versionPromise).rejects.toThrow('FFmpeg not found');
    });

    it('should reject when FFmpeg exits with error', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();

      mocks.mockSpawn.mockReturnValue(mockProcess);

      const versionPromise = client.getVersion();

      mockProcess.emit('close', 1);

      await expect(versionPromise).rejects.toThrow('FFmpeg not installed');
    });
  });

  describe('verifyInstallation', () => {
    it('should return true when FFmpeg is available', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();

      mocks.mockSpawn.mockReturnValue(mockProcess);

      const verifyPromise = client.verifyInstallation();

      // Simulate successful version output
      setImmediate(() => {
        mockProcess.stdout.emit('data', Buffer.from('ffmpeg version 7.0.1'));
        mockProcess.emit('close', 0);
      });

      const result = await verifyPromise;
      expect(result).toBe(true);
    });

    it('should return false when FFmpeg is not available', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();

      mocks.mockSpawn.mockReturnValue(mockProcess);

      const verifyPromise = client.verifyInstallation();

      // Simulate error
      setImmediate(() => {
        mockProcess.emit('error', new Error('ENOENT'));
      });

      const result = await verifyPromise;
      expect(result).toBe(false);
    });
  });

  describe('probe', () => {
    it('should return probe result for valid file', async () => {
      // Mock file exists (callback style)
      mocks.mockAccess.mockImplementation((_path: string, _mode: number, cb: Function) => {
        cb(null);
      });

      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      mocks.mockSpawn.mockReturnValue(mockProcess);

      const probePromise = client.probe('/test/video.mp4');

      const mockResult = {
        format: {
          filename: '/test/video.mp4',
          duration: '120.5',
          size: '1000000',
          bit_rate: '500000',
          format_name: 'mp4',
        },
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
          },
          {
            codec_type: 'audio',
            codec_name: 'aac',
            channels: 2,
            sample_rate: '44100',
          },
        ],
      };

      // Emit probe response
      setImmediate(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockResult)));
        mockProcess.emit('close', 0);
      });

      const result = await probePromise;
      expect(result.format.duration).toBe(120.5);
      expect(result.format.size).toBe(1000000);
      expect(result.streams).toHaveLength(2);
    });

    it('should reject for non-existent file', async () => {
      // Mock file does not exist
      mocks.mockAccess.mockImplementation((_path: string, _mode: number, cb: Function) => {
        cb(new Error('ENOENT'));
      });

      await expect(client.probe('/nonexistent/file.mp4')).rejects.toThrow(
        'File not found or not readable'
      );
    });
  });

  describe('getVideoDuration', () => {
    it('should return duration from format', async () => {
      // Mock file exists
      mocks.mockAccess.mockImplementation((_path: string, _mode: number, cb: Function) => {
        cb(null);
      });

      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      mocks.mockSpawn.mockReturnValue(mockProcess);

      const durationPromise = client.getVideoDuration('/test/video.mp4');

      const mockResult = {
        format: {
          filename: '/test/video.mp4',
          duration: '60.0',
          size: '1000000',
          bit_rate: '500000',
          format_name: 'mp4',
        },
        streams: [],
      };

      setImmediate(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockResult)));
        mockProcess.emit('close', 0);
      });

      const duration = await durationPromise;
      expect(duration).toBe(60);
    });
  });

  describe('getAudioDuration', () => {
    it('should return duration from format', async () => {
      // Mock file exists
      mocks.mockAccess.mockImplementation((_path: string, _mode: number, cb: Function) => {
        cb(null);
      });

      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      mocks.mockSpawn.mockReturnValue(mockProcess);

      const durationPromise = client.getAudioDuration('/test/audio.mp3');

      const mockResult = {
        format: {
          filename: '/test/audio.mp3',
          duration: '30.5',
          size: '500000',
          bit_rate: '128000',
          format_name: 'mp3',
        },
        streams: [],
      };

      setImmediate(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockResult)));
        mockProcess.emit('close', 0);
      });

      const duration = await durationPromise;
      expect(duration).toBe(30.5);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      mocks.mockAccess.mockImplementation((_path: string, _mode: number, cb: Function) => {
        cb(null);
      });

      const result = await client.fileExists('/test/file.mp4');
      expect(result).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      mocks.mockAccess.mockImplementation((_path: string, _mode: number, cb: Function) => {
        cb(new Error('ENOENT'));
      });

      const result = await client.fileExists('/nonexistent/file.mp4');
      expect(result).toBe(false);
    });
  });

  describe('getExtension', () => {
    it('should return lowercase extension', () => {
      expect(client.getExtension('/path/to/file.MP4')).toBe('.mp4');
      expect(client.getExtension('/path/to/file.webm')).toBe('.webm');
      expect(client.getExtension('/path/to/file')).toBe('');
    });
  });
});
