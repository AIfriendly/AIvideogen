/**
 * Audio Sync Integration Tests - Gap #1 Coverage
 * Epic 5: Video Assembly & Output
 *
 * Tests to validate audio synchronization timing accuracy.
 * Risk: R-5.01 (Critical) - Audio/video sync drift >0.1s
 */

// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted() for mock functions
const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

// Mock the FFmpegClient to capture command arguments
vi.mock('@/lib/video/ffmpeg', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/video/ffmpeg')>();

  // Create a mock class that extends the real one
  class MockFFmpegClient extends actual.FFmpegClient {
    protected execute(args: string[]): Promise<void> {
      mocks.mockExecute(args);
      return Promise.resolve();
    }
  }

  return {
    ...actual,
    FFmpegClient: MockFFmpegClient,
  };
});

import { FFmpegClient } from '@/lib/video/ffmpeg';

describe('Audio Sync Regression Tests [5.3-INT-AUDIO]', () => {
  let ffmpeg: FFmpegClient;

  beforeEach(() => {
    vi.clearAllMocks();
    ffmpeg = new FFmpegClient();
  });

  describe('muxAudioVideo adelay timing [P0]', () => {
    it('[5.3-INT-001] should generate correct adelay values for scene timings', async () => {
      const audioInputs = [
        { path: '/audio/scene1.mp3', startTime: 0 },
        { path: '/audio/scene2.mp3', startTime: 5.5 },
        { path: '/audio/scene3.mp3', startTime: 12.75 },
      ];

      await ffmpeg.muxAudioVideo(
        '/video/concat.mp4',
        audioInputs,
        '/output/final.mp4'
      );

      expect(mocks.mockExecute).toHaveBeenCalled();
      const args = mocks.mockExecute.mock.calls[0][0] as string[];

      // Find the filter_complex argument
      const filterIndex = args.indexOf('-filter_complex');
      expect(filterIndex).toBeGreaterThan(-1);
      const filterComplex = args[filterIndex + 1];

      // Verify adelay values match expected timing (in milliseconds)
      expect(filterComplex).toContain('adelay=0|0');      // Scene 1: 0ms
      expect(filterComplex).toContain('adelay=5500|5500'); // Scene 2: 5500ms
      expect(filterComplex).toContain('adelay=12750|12750'); // Scene 3: 12750ms
    });

    it('[5.3-INT-002] should handle sub-millisecond timing precision', async () => {
      const audioInputs = [
        { path: '/audio/scene1.mp3', startTime: 0.001 },  // 1ms
        { path: '/audio/scene2.mp3', startTime: 0.0005 }, // 0.5ms -> rounds to 1ms
      ];

      await ffmpeg.muxAudioVideo(
        '/video/concat.mp4',
        audioInputs,
        '/output/final.mp4'
      );

      const args = mocks.mockExecute.mock.calls[0][0] as string[];
      const filterIndex = args.indexOf('-filter_complex');
      const filterComplex = args[filterIndex + 1];

      // Verify millisecond rounding is applied correctly
      expect(filterComplex).toContain('adelay=1|1');
      // 0.0005 * 1000 = 0.5, Math.round(0.5) = 1
      expect(filterComplex).toContain('adelay=1|1');
    });

    it('[5.3-INT-003] should include normalize=0 to prevent volume reduction', async () => {
      const audioInputs = [
        { path: '/audio/scene1.mp3', startTime: 0 },
        { path: '/audio/scene2.mp3', startTime: 5 },
      ];

      await ffmpeg.muxAudioVideo(
        '/video/concat.mp4',
        audioInputs,
        '/output/final.mp4'
      );

      const args = mocks.mockExecute.mock.calls[0][0] as string[];
      const filterIndex = args.indexOf('-filter_complex');
      const filterComplex = args[filterIndex + 1];

      // Verify normalize=0 is present (Risk R-5.06)
      expect(filterComplex).toContain('normalize=0');
    });

    it('[5.3-INT-004] should use stereo adelay format (left|right)', async () => {
      const audioInputs = [
        { path: '/audio/scene1.mp3', startTime: 2.5 },
      ];

      await ffmpeg.muxAudioVideo(
        '/video/concat.mp4',
        audioInputs,
        '/output/final.mp4'
      );

      const args = mocks.mockExecute.mock.calls[0][0] as string[];
      const filterIndex = args.indexOf('-filter_complex');
      const filterComplex = args[filterIndex + 1];

      // Verify stereo format: adelay=<left>|<right>
      expect(filterComplex).toMatch(/adelay=2500\|2500/);
    });

    it('[5.3-INT-005] should configure amix for correct number of inputs', async () => {
      const audioInputs = [
        { path: '/audio/scene1.mp3', startTime: 0 },
        { path: '/audio/scene2.mp3', startTime: 5 },
        { path: '/audio/scene3.mp3', startTime: 10 },
        { path: '/audio/scene4.mp3', startTime: 15 },
      ];

      await ffmpeg.muxAudioVideo(
        '/video/concat.mp4',
        audioInputs,
        '/output/final.mp4'
      );

      const args = mocks.mockExecute.mock.calls[0][0] as string[];
      const filterIndex = args.indexOf('-filter_complex');
      const filterComplex = args[filterIndex + 1];

      // Verify amix has correct input count
      expect(filterComplex).toContain('amix=inputs=4');
      expect(filterComplex).toContain('duration=longest');
    });

    it('[5.3-INT-006] should handle zero start time correctly', async () => {
      const audioInputs = [
        { path: '/audio/scene1.mp3', startTime: 0 },
      ];

      await ffmpeg.muxAudioVideo(
        '/video/concat.mp4',
        audioInputs,
        '/output/final.mp4'
      );

      const args = mocks.mockExecute.mock.calls[0][0] as string[];
      const filterIndex = args.indexOf('-filter_complex');
      const filterComplex = args[filterIndex + 1];

      // Zero delay should still be explicit
      expect(filterComplex).toContain('adelay=0|0');
    });
  });

  describe('overlayAudio stream mapping [P1]', () => {
    it('[5.3-INT-007] should correctly map video and audio streams', async () => {
      await ffmpeg.overlayAudio(
        '/video/input.mp4',
        '/audio/voiceover.mp3',
        '/output/final.mp4'
      );

      const args = mocks.mockExecute.mock.calls[0][0] as string[];

      // Verify stream mapping
      expect(args).toContain('-map');
      expect(args).toContain('0:v:0'); // Video from first input
      expect(args).toContain('1:a:0'); // Audio from second input
    });

    it('[5.3-INT-008] should preserve video quality with copy codec', async () => {
      await ffmpeg.overlayAudio(
        '/video/input.mp4',
        '/audio/voiceover.mp3',
        '/output/final.mp4'
      );

      const args = mocks.mockExecute.mock.calls[0][0] as string[];

      // Video should use copy codec for quality preservation
      const cvIndex = args.indexOf('-c:v');
      expect(cvIndex).toBeGreaterThan(-1);
      expect(args[cvIndex + 1]).toBe('copy');
    });
  });
});
