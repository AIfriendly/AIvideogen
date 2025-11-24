/**
 * Windows Path Integration Tests - Gap #2 Coverage
 * Epic 5: Video Assembly & Output
 *
 * Tests to validate Windows path handling in FFmpeg operations.
 * Risk: R-5.04 (P1) - Windows path handling failures (backslashes, spaces)
 */

// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted() for mock functions
const mocks = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockUnlinkSync: vi.fn(),
  mockExecute: vi.fn(),
}));

// Mock fs module
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: mocks.mockExistsSync,
    writeFileSync: mocks.mockWriteFileSync,
    unlinkSync: mocks.mockUnlinkSync,
  };
});

// Mock FFmpegClient to capture concat commands
vi.mock('@/lib/video/ffmpeg', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/video/ffmpeg')>();

  class MockFFmpegClient extends actual.FFmpegClient {
    async concat(listFilePath: string, outputPath: string): Promise<void> {
      mocks.mockExecute(['concat', listFilePath, outputPath]);
      return Promise.resolve();
    }

    async getVideoDuration(_path: string): Promise<number> {
      return 10;
    }
  }

  return {
    ...actual,
    FFmpegClient: MockFFmpegClient,
  };
});

import { Concatenator } from '@/lib/video/concatenator';
import { FFmpegClient } from '@/lib/video/ffmpeg';

describe('Windows Path Integration Tests [5.3-INT-WINPATH]', () => {
  let concatenator: Concatenator;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockExistsSync.mockReturnValue(true);
    const ffmpeg = new FFmpegClient();
    concatenator = new Concatenator(ffmpeg);
  });

  describe('Backslash to forward slash conversion [P1]', () => {
    it('[5.3-INT-WIN001] should convert Windows backslashes to forward slashes in concat list', async () => {
      const inputPaths = [
        'D:\\Videos\\Project\\scene-1.mp4',
        'D:\\Videos\\Project\\scene-2.mp4',
      ];
      const outputPath = 'D:\\Output\\final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      expect(mocks.mockWriteFileSync).toHaveBeenCalled();
      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      // Verify backslashes are converted to forward slashes
      expect(listContent).toContain("file 'D:/Videos/Project/scene-1.mp4'");
      expect(listContent).toContain("file 'D:/Videos/Project/scene-2.mp4'");
      expect(listContent).not.toContain('\\');
    });

    it('[5.3-INT-WIN002] should handle mixed path separators', async () => {
      const inputPaths = [
        'D:/Videos/Project\\scene-1.mp4',
        'D:\\Videos/Project/scene-2.mp4',
      ];
      const outputPath = 'D:/Output/final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      // All backslashes should be converted
      expect(listContent).not.toContain('\\');
      expect(listContent).toContain("file 'D:/Videos/Project/scene-1.mp4'");
    });

    it('[5.3-INT-WIN003] should handle UNC paths', async () => {
      const inputPaths = [
        '\\\\server\\share\\videos\\scene-1.mp4',
      ];
      const outputPath = '\\\\server\\share\\output\\final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      // UNC paths should also have backslashes converted
      expect(listContent).toContain("file '//server/share/videos/scene-1.mp4'");
    });
  });

  describe('Paths with spaces [P1]', () => {
    it('[5.3-INT-WIN004] should properly quote paths with spaces', async () => {
      const inputPaths = [
        'D:\\My Videos\\Project Files\\scene 1.mp4',
        'D:\\My Videos\\Project Files\\scene 2.mp4',
      ];
      const outputPath = 'D:\\Output Files\\final video.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      // Paths should be single-quoted to handle spaces
      expect(listContent).toContain("file 'D:/My Videos/Project Files/scene 1.mp4'");
      expect(listContent).toContain("file 'D:/My Videos/Project Files/scene 2.mp4'");
    });

    it('[5.3-INT-WIN005] should handle multiple consecutive spaces', async () => {
      const inputPaths = [
        'D:\\Videos\\Test  Files\\scene   1.mp4',
      ];
      const outputPath = 'D:\\Output\\final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      // Multiple spaces should be preserved
      expect(listContent).toContain("file 'D:/Videos/Test  Files/scene   1.mp4'");
    });
  });

  describe('Special characters in paths [P1]', () => {
    it('[5.3-INT-WIN006] should escape single quotes in paths', async () => {
      const inputPaths = [
        "D:\\Videos\\John's Project\\scene-1.mp4",
      ];
      const outputPath = 'D:\\Output\\final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      // Single quotes should be escaped with shell escaping
      // The pattern '\\'' closes the quote, adds escaped quote, reopens quote
      expect(listContent).toContain("'\\''");
    });

    it('[5.3-INT-WIN007] should handle parentheses in paths', async () => {
      const inputPaths = [
        'D:\\Videos\\Project (2024)\\scene-1.mp4',
      ];
      const outputPath = 'D:\\Output\\final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      // Parentheses should be preserved (handled by quoting)
      expect(listContent).toContain("file 'D:/Videos/Project (2024)/scene-1.mp4'");
    });

    it('[5.3-INT-WIN008] should handle brackets and other special chars', async () => {
      const inputPaths = [
        'D:\\Videos\\[Project]\\scene_1.mp4',
        'D:\\Videos\\{Archive}\\scene_2.mp4',
      ];
      const outputPath = 'D:\\Output\\final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      expect(listContent).toContain("file 'D:/Videos/[Project]/scene_1.mp4'");
      expect(listContent).toContain("file 'D:/Videos/{Archive}/scene_2.mp4'");
    });
  });

  describe('Drive letter handling [P2]', () => {
    it('[5.3-INT-WIN009] should preserve drive letters', async () => {
      const inputPaths = [
        'C:\\Videos\\scene-1.mp4',
        'D:\\Videos\\scene-2.mp4',
        'E:\\Videos\\scene-3.mp4',
      ];
      const outputPath = 'D:\\Output\\final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      expect(listContent).toContain("file 'C:/Videos/scene-1.mp4'");
      expect(listContent).toContain("file 'D:/Videos/scene-2.mp4'");
      expect(listContent).toContain("file 'E:/Videos/scene-3.mp4'");
    });

    it('[5.3-INT-WIN010] should handle lowercase and uppercase drive letters', async () => {
      const inputPaths = [
        'd:\\videos\\scene-1.mp4',
        'D:\\VIDEOS\\scene-2.mp4',
      ];
      const outputPath = 'D:\\Output\\final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      // Drive letters should be preserved as-is
      expect(listContent).toContain("file 'd:/videos/scene-1.mp4'");
      expect(listContent).toContain("file 'D:/VIDEOS/scene-2.mp4'");
    });
  });

  describe('List file generation format [P1]', () => {
    it('[5.3-INT-WIN011] should generate proper concat demuxer format', async () => {
      const inputPaths = [
        'D:\\Videos\\scene-1.mp4',
        'D:\\Videos\\scene-2.mp4',
        'D:\\Videos\\scene-3.mp4',
      ];
      const outputPath = 'D:\\Output\\final.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const listContent = writeCall[1] as string;

      // Each line should be: file 'path'
      const lines = listContent.trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("file 'D:/Videos/scene-1.mp4'");
      expect(lines[1]).toBe("file 'D:/Videos/scene-2.mp4'");
      expect(lines[2]).toBe("file 'D:/Videos/scene-3.mp4'");
    });
  });
});
