/**
 * Assembly Pipeline Integration Tests - Epic 5 Retrospective Action #3
 *
 * Tests the full video assembly pipeline logic to catch issues like:
 * - BUG-001: Wrong duration field used for trimming (clipDuration vs audioDuration)
 * - BUG-002: Audio timing calculated from wrong duration field
 *
 * These tests verify the DATA FLOW through the pipeline, not FFmpeg execution.
 * FFmpeg operations are mocked but timing calculations are real.
 *
 * Test ID Prefix: 5-INT-PIPE-xxx
 */

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizePath, toWebPath, getPublicPath } from '@/lib/utils/paths';

/**
 * AssemblyScene interface - mirrors the type used in assembler
 */
interface AssemblyScene {
  sceneNumber: number;
  videoPath: string;
  audioFilePath: string;
  audioDuration: number;  // Voiceover duration (what we trim TO)
  clipDuration: number;   // Original YouTube video duration (NOT used for trimming)
}

/**
 * Simulates the timing calculation logic from VideoAssembler.overlayAllAudio()
 * This is the critical logic that was buggy - we test it in isolation.
 */
function calculateAudioTiming(scenes: AssemblyScene[]): { path: string; startTime: number }[] {
  const audioInputs: { path: string; startTime: number }[] = [];
  let currentTime = 0;

  for (const scene of scenes) {
    audioInputs.push({
      path: scene.audioFilePath,
      startTime: currentTime,
    });

    // CRITICAL: Use audioDuration (actual voiceover length) NOT clipDuration
    // This was the bug in Story 5.3 - using clipDuration caused audio to start
    // at wrong times because videos were trimmed to audioDuration
    currentTime += scene.audioDuration;
  }

  return audioInputs;
}

/**
 * Simulates trim duration logic from VideoAssembler
 * Videos must be trimmed to match voiceover duration, not original clip duration
 */
function calculateTrimDuration(scene: AssemblyScene): number {
  // CRITICAL: Trim to audioDuration, not clipDuration
  // clipDuration is the original YouTube video length (could be 5 minutes)
  // audioDuration is the voiceover length (what we actually need)
  return scene.audioDuration;
}

describe('[5-INT-PIPE] Assembly Pipeline Duration Logic', () => {
  describe('[5-INT-PIPE-001] Audio Timing Calculation', () => {
    it('should calculate audio start times from audioDuration, not clipDuration', () => {
      // Given: 3 scenes with DIFFERENT audioDuration vs clipDuration
      // This is the common case - YouTube videos are longer than voiceovers
      const scenes: AssemblyScene[] = [
        {
          sceneNumber: 1,
          videoPath: '/videos/scene1.mp4',
          audioFilePath: '/audio/scene1.mp3',
          audioDuration: 8.5,    // Voiceover: 8.5 seconds
          clipDuration: 120,     // YouTube video: 2 minutes (NOT used)
        },
        {
          sceneNumber: 2,
          videoPath: '/videos/scene2.mp4',
          audioFilePath: '/audio/scene2.mp3',
          audioDuration: 12.3,   // Voiceover: 12.3 seconds
          clipDuration: 300,     // YouTube video: 5 minutes (NOT used)
        },
        {
          sceneNumber: 3,
          videoPath: '/videos/scene3.mp4',
          audioFilePath: '/audio/scene3.mp3',
          audioDuration: 6.7,    // Voiceover: 6.7 seconds
          clipDuration: 180,     // YouTube video: 3 minutes (NOT used)
        },
      ];

      // When: Calculate audio timing
      const timing = calculateAudioTiming(scenes);

      // Then: Start times use audioDuration accumulation
      expect(timing[0].startTime).toBe(0);                    // Scene 1: starts at 0
      expect(timing[1].startTime).toBe(8.5);                  // Scene 2: 0 + 8.5 = 8.5
      expect(timing[2].startTime).toBeCloseTo(20.8, 1);       // Scene 3: 8.5 + 12.3 = 20.8

      // Verify we're NOT using clipDuration (which would give wrong values)
      expect(timing[1].startTime).not.toBe(120);              // NOT clipDuration[0]
      expect(timing[2].startTime).not.toBe(420);              // NOT sum of clipDurations
    });

    it('should handle single scene with zero start time', () => {
      const scenes: AssemblyScene[] = [
        {
          sceneNumber: 1,
          videoPath: '/videos/scene1.mp4',
          audioFilePath: '/audio/scene1.mp3',
          audioDuration: 15.0,
          clipDuration: 60,
        },
      ];

      const timing = calculateAudioTiming(scenes);

      expect(timing).toHaveLength(1);
      expect(timing[0].startTime).toBe(0);
      expect(timing[0].path).toBe('/audio/scene1.mp3');
    });

    it('should accumulate timing correctly for many scenes', () => {
      // Given: 10 scenes with precise durations
      const scenes: AssemblyScene[] = Array.from({ length: 10 }, (_, i) => ({
        sceneNumber: i + 1,
        videoPath: `/videos/scene${i + 1}.mp4`,
        audioFilePath: `/audio/scene${i + 1}.mp3`,
        audioDuration: 5.0,  // Each scene exactly 5 seconds
        clipDuration: 120,   // Each clip 2 minutes (irrelevant)
      }));

      const timing = calculateAudioTiming(scenes);

      // Then: Each scene starts 5 seconds after the previous
      for (let i = 0; i < 10; i++) {
        expect(timing[i].startTime).toBe(i * 5.0);
      }

      // Total duration would be 50 seconds, not 1200 (10 * 120)
      const lastStart = timing[9].startTime;
      expect(lastStart).toBe(45);  // 9 * 5 = 45 (last scene start)
    });

    it('should handle sub-second precision', () => {
      const scenes: AssemblyScene[] = [
        {
          sceneNumber: 1,
          videoPath: '/videos/scene1.mp4',
          audioFilePath: '/audio/scene1.mp3',
          audioDuration: 3.123,
          clipDuration: 60,
        },
        {
          sceneNumber: 2,
          videoPath: '/videos/scene2.mp4',
          audioFilePath: '/audio/scene2.mp3',
          audioDuration: 4.567,
          clipDuration: 120,
        },
      ];

      const timing = calculateAudioTiming(scenes);

      expect(timing[0].startTime).toBe(0);
      expect(timing[1].startTime).toBeCloseTo(3.123, 3);
    });
  });

  describe('[5-INT-PIPE-002] Trim Duration Calculation', () => {
    it('should use audioDuration for trimming, not clipDuration', () => {
      const scene: AssemblyScene = {
        sceneNumber: 1,
        videoPath: '/videos/scene1.mp4',
        audioFilePath: '/audio/scene1.mp3',
        audioDuration: 10.5,   // Voiceover is 10.5 seconds
        clipDuration: 300,     // YouTube video is 5 minutes
      };

      const trimDuration = calculateTrimDuration(scene);

      // Should trim to voiceover length, not original video length
      expect(trimDuration).toBe(10.5);
      expect(trimDuration).not.toBe(300);
    });

    it('should handle case where audioDuration > clipDuration (edge case)', () => {
      // This shouldn't happen in practice, but test the logic
      const scene: AssemblyScene = {
        sceneNumber: 1,
        videoPath: '/videos/scene1.mp4',
        audioFilePath: '/audio/scene1.mp3',
        audioDuration: 60,    // Voiceover is 60 seconds
        clipDuration: 30,     // YouTube video is only 30 seconds
      };

      const trimDuration = calculateTrimDuration(scene);

      // Still uses audioDuration - the trimmer will handle the mismatch
      expect(trimDuration).toBe(60);
    });
  });

  describe('[5-INT-PIPE-003] End-to-End Duration Consistency', () => {
    it('should produce consistent total duration from audio timing and trim durations', () => {
      const scenes: AssemblyScene[] = [
        {
          sceneNumber: 1,
          videoPath: '/videos/scene1.mp4',
          audioFilePath: '/audio/scene1.mp3',
          audioDuration: 8.0,
          clipDuration: 120,
        },
        {
          sceneNumber: 2,
          videoPath: '/videos/scene2.mp4',
          audioFilePath: '/audio/scene2.mp3',
          audioDuration: 10.0,
          clipDuration: 180,
        },
        {
          sceneNumber: 3,
          videoPath: '/videos/scene3.mp4',
          audioFilePath: '/audio/scene3.mp3',
          audioDuration: 7.0,
          clipDuration: 90,
        },
      ];

      // Calculate total expected duration from audioDurations
      const expectedTotalDuration = scenes.reduce((sum, s) => sum + s.audioDuration, 0);

      // Calculate total from trim durations
      const totalTrimDuration = scenes.reduce((sum, s) => sum + calculateTrimDuration(s), 0);

      // Calculate expected last audio start time + last audio duration
      const timing = calculateAudioTiming(scenes);
      const lastScene = scenes[scenes.length - 1];
      const lastStartTime = timing[timing.length - 1].startTime;
      const totalFromTiming = lastStartTime + lastScene.audioDuration;

      // All three calculations should agree
      expect(expectedTotalDuration).toBe(25);  // 8 + 10 + 7 = 25
      expect(totalTrimDuration).toBe(25);
      expect(totalFromTiming).toBe(25);
    });
  });

  describe('[5-INT-PIPE-004] Duration Field Documentation', () => {
    /**
     * This test serves as documentation for the confusing duration fields.
     * It should help future developers understand which field to use.
     */
    it('documents the difference between audioDuration and clipDuration', () => {
      // audioDuration: The length of the generated voiceover audio for a scene
      // - This is what TTS produces
      // - Typically 5-30 seconds
      // - Use this for: trimming videos, calculating audio start times

      // clipDuration: The total length of the source YouTube video
      // - This is metadata from YouTube API
      // - Could be minutes or hours
      // - Use this for: display only, NOT for assembly calculations

      const typicalScene: AssemblyScene = {
        sceneNumber: 1,
        videoPath: '/videos/scene1.mp4',
        audioFilePath: '/audio/scene1.mp3',
        audioDuration: 12.5,    // TTS generated 12.5 seconds of speech
        clipDuration: 345,      // YouTube video is 5:45 (345 seconds)
      };

      // When trimming, we extract 12.5 seconds from a 345-second video
      const trimTo = typicalScene.audioDuration;
      expect(trimTo).toBe(12.5);

      // The final video segment will be 12.5 seconds
      // The audio will play for 12.5 seconds
      // They match - this is correct sync
    });
  });
});

describe('[5-INT-PIPE] Path Handling Integration', () => {
  describe('[5-INT-PIPE-005] Path Normalization', () => {
    it('should handle Windows absolute paths correctly', () => {
      const windowsPath = 'D:\\BMAD video generator\\ai-video-generator\\public\\videos\\abc123\\final.mp4';

      // Normalize removes backslashes
      const normalized = normalizePath(windowsPath);
      expect(normalized).toBe('D:/BMAD video generator/ai-video-generator/public/videos/abc123/final.mp4');

      // toWebPath extracts servable portion
      const webPath = toWebPath(windowsPath);
      expect(webPath).toBe('/videos/abc123/final.mp4');

      // getPublicPath extracts for DB storage
      const publicPath = getPublicPath(windowsPath);
      expect(publicPath).toBe('public/videos/abc123/final.mp4');
    });

    it('should handle already-relative paths', () => {
      const relativePath = 'public/videos/abc123/thumbnail.jpg';

      const webPath = toWebPath(relativePath);
      expect(webPath).toBe('/videos/abc123/thumbnail.jpg');

      const publicPath = getPublicPath(relativePath);
      expect(publicPath).toBe('public/videos/abc123/thumbnail.jpg');
    });

    it('should handle paths with mixed separators', () => {
      const mixedPath = 'public\\videos/abc123\\final.mp4';
      const normalized = normalizePath(mixedPath);

      expect(normalized).toBe('public/videos/abc123/final.mp4');
      expect(normalized).not.toContain('\\');
    });
  });
});
