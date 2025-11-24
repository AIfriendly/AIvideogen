// Unit tests for Video Concatenator
// Story 5.3: Video Concatenation & Audio Overlay

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available during hoisting
const mocks = vi.hoisted(() => {
  return {
    existsSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

// Mock fs module - explicit property assignment after spread
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: mocks.existsSync,
    writeFileSync: mocks.writeFileSync,
    unlinkSync: mocks.unlinkSync,
  };
});

import { Concatenator } from '@/lib/video/concatenator';
import { FFmpegClient } from '@/lib/video/ffmpeg';

describe('Concatenator [5.3-UNIT]', () => {
  let concatenator: Concatenator;
  let mockFfmpeg: {
    concat: ReturnType<typeof vi.fn>;
    getVideoDuration: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFfmpeg = {
      concat: vi.fn(),
      getVideoDuration: vi.fn(),
    };

    concatenator = new Concatenator(mockFfmpeg as unknown as FFmpegClient);
    mocks.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('concatenateVideos', () => {
    it('[5.3-UNIT-001] should concatenate multiple videos successfully', async () => {
      const inputPaths = [
        '/temp/scene-1-trimmed.mp4',
        '/temp/scene-2-trimmed.mp4',
        '/temp/scene-3-trimmed.mp4',
      ];
      const outputPath = '/output/concatenated.mp4';

      const result = await concatenator.concatenateVideos(inputPaths, outputPath);

      expect(mocks.writeFileSync).toHaveBeenCalled();
      expect(mockFfmpeg.concat).toHaveBeenCalled();
      expect(result).toBe(outputPath);
    });

    it('[5.3-UNIT-002] should throw error for empty input array', async () => {
      await expect(concatenator.concatenateVideos([], '/output.mp4'))
        .rejects.toThrow('No input videos to concatenate');
    });

    it('[5.3-UNIT-003] should throw error for missing input file', async () => {
      mocks.existsSync.mockReturnValueOnce(false);

      await expect(
        concatenator.concatenateVideos(['/missing.mp4'], '/output.mp4')
      ).rejects.toThrow('Input video not found');
    });

    it('[5.3-UNIT-004] should clean up list file after concatenation', async () => {
      const inputPaths = ['/temp/scene-1.mp4'];
      const outputPath = '/output/result.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      expect(mocks.unlinkSync).toHaveBeenCalled();
    });

    it('[5.3-UNIT-005] should handle Windows paths correctly', async () => {
      const inputPaths = ['D:\\temp\\scene-1.mp4'];
      const outputPath = 'D:\\output\\result.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain("file 'D:/temp/scene-1.mp4'");
    });

    it('[5.3-UNIT-006] should throw error when output not created', async () => {
      mocks.existsSync
        .mockReturnValueOnce(true)  // Input check
        .mockReturnValueOnce(true)  // List file cleanup check
        .mockReturnValueOnce(false); // Output check

      await expect(
        concatenator.concatenateVideos(['/input.mp4'], '/output.mp4')
      ).rejects.toThrow('output not created');
    });
  });

  describe('getTotalDuration', () => {
    it('[5.3-UNIT-007] should return duration from FFmpeg', async () => {
      mockFfmpeg.getVideoDuration.mockResolvedValue(45.5);

      const duration = await concatenator.getTotalDuration('/video.mp4');

      expect(duration).toBe(45.5);
      expect(mockFfmpeg.getVideoDuration).toHaveBeenCalledWith('/video.mp4');
    });
  });
});
