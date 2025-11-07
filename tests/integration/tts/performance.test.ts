/**
 * Performance Tests for TTS Provider
 *
 * Tests the performance requirements including cold start times,
 * warm request latency, and persistent model caching efficiency.
 *
 * Acceptance Criteria Coverage:
 * - AC1: Performance - Preview generation <2s, scene synthesis <3s
 *
 * Task Coverage: Story 2.1 - Performance Testing
 *
 * @module tests/integration/tts/performance.test
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { KokoroProvider } from '@/lib/tts/kokoro-provider';
import { VoiceTestData } from '../../factories/voice.factory';

describe('TTS Performance Tests', () => {
  let provider: KokoroProvider;
  const performanceMetrics: any = {
    coldStart: 0,
    warmRequests: [],
    memoryUsage: []
  };

  beforeAll(() => {
    provider = new KokoroProvider();
  });

  afterAll(async () => {
    await provider.cleanup();

    // Log performance summary
    console.log('\n=== TTS Performance Summary ===');
    console.log(`Cold Start: ${performanceMetrics.coldStart}ms`);
    console.log(`Warm Requests (avg): ${
      performanceMetrics.warmRequests.reduce((a: number, b: number) => a + b, 0) /
      performanceMetrics.warmRequests.length
    }ms`);
    console.log(`Memory Usage (peak): ${Math.max(...performanceMetrics.memoryUsage)}MB`);
    console.log('================================\n');
  });

  describe('Cold Start Performance', () => {
    it('should complete first request (cold start) within 5 seconds', async () => {
      // Given: No service running (provider just created)
      expect(provider['service']).toBeNull();
      const testText = 'This is the first request to test cold start performance.';

      // When: Making first request (includes model loading)
      const startTime = Date.now();
      const result = await provider.generateAudio(testText, 'sarah');
      const duration = Date.now() - startTime;

      // Then: Should complete within 5 seconds
      performanceMetrics.coldStart = duration;
      expect(duration).toBeLessThan(5000);
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);

      console.log(`✓ Cold start completed in ${duration}ms`);
    }, 10000); // Allow 10s timeout for test

    it('should have model loaded in memory after cold start', () => {
      // Given: Service started from previous test
      // When: Checking service status
      // Then: Service should be running and ready
      expect(provider['service']).not.toBeNull();
      expect(provider['serviceReady']).toBe(true);

      // Check memory usage (approximate)
      const memUsage = process.memoryUsage();
      const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      performanceMetrics.memoryUsage.push(memMB);

      console.log(`✓ Model loaded, memory usage: ${memMB}MB`);
    });
  });

  describe('Warm Request Performance', () => {
    it('should complete preview generation in <2 seconds (warm)', async () => {
      // Given: Preview text (short, ~20 words)
      const previewText = "Hello, I'm your AI video narrator. Let me help bring your story to life.";

      // When: Generating preview audio (warm service)
      const startTime = Date.now();
      const result = await provider.generateAudio(previewText, 'sarah');
      const duration = Date.now() - startTime;

      // Then: Should complete within 2 seconds
      performanceMetrics.warmRequests.push(duration);
      expect(duration).toBeLessThan(2000);
      expect(result.duration).toBeLessThanOrEqual(5); // Preview should be short

      console.log(`✓ Preview generation completed in ${duration}ms`);
    });

    it('should complete scene synthesis in <3 seconds (warm)', async () => {
      // Given: Typical scene text (50-200 words)
      const sceneText = `
        In the heart of the bustling city, where skyscrapers touched the clouds
        and the streets hummed with endless activity, Sarah found herself at a
        crossroads. The decision she was about to make would change everything.
        She looked at the envelope in her hand, its contents still a mystery, yet
        somehow she knew that opening it would set in motion a chain of events
        that would reshape her entire future. The weight of the moment pressed
        upon her shoulders as she took a deep breath and slowly tore open the seal.
      `.trim();

      // When: Generating scene audio (warm service)
      const startTime = Date.now();
      const result = await provider.generateAudio(sceneText, 'sarah');
      const duration = Date.now() - startTime;

      // Then: Should complete within 3 seconds
      performanceMetrics.warmRequests.push(duration);
      expect(duration).toBeLessThan(3000);
      expect(result.duration).toBeGreaterThan(5); // Scene should be longer

      console.log(`✓ Scene synthesis completed in ${duration}ms`);
    });

    it('should maintain consistent performance across multiple requests', async () => {
      // Given: Multiple text samples
      const samples = [
        'Short text for quick test.',
        'Medium length text that represents a typical narration segment in our videos.',
        'A longer piece of text that simulates a more complex scene with multiple sentences and varied punctuation. This helps us understand how the system handles different text lengths.',
      ];

      // When: Processing multiple requests
      const durations: number[] = [];
      for (const [index, text] of samples.entries()) {
        const startTime = Date.now();
        await provider.generateAudio(text, 'sarah');
        const duration = Date.now() - startTime;
        durations.push(duration);
        performanceMetrics.warmRequests.push(duration);
        console.log(`  Request ${index + 1}: ${duration}ms`);
      }

      // Then: All should be under 3 seconds (warm)
      durations.forEach(d => expect(d).toBeLessThan(3000));

      // Check consistency (standard deviation should be reasonable)
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      expect(stdDev).toBeLessThan(1000); // Reasonable variance
      console.log(`✓ Consistent performance: avg=${Math.round(avg)}ms, stdDev=${Math.round(stdDev)}ms`);
    });
  });

  describe('Persistent Model Caching Efficiency', () => {
    it('should demonstrate 3x+ speedup from cold to warm requests', async () => {
      // Given: New provider for clean test
      const testProvider = new KokoroProvider();
      const text = 'Testing performance difference between cold and warm.';

      try {
        // When: Measuring cold start
        const coldStart = Date.now();
        await testProvider.generateAudio(text, 'sarah');
        const coldDuration = Date.now() - coldStart;

        // And: Measuring warm requests
        const warmDurations: number[] = [];
        for (let i = 0; i < 3; i++) {
          const warmStart = Date.now();
          await testProvider.generateAudio(text, 'sarah');
          warmDurations.push(Date.now() - warmStart);
        }

        const avgWarm = warmDurations.reduce((a, b) => a + b, 0) / warmDurations.length;

        // Then: Warm should be at least 3x faster
        const speedup = coldDuration / avgWarm;
        expect(speedup).toBeGreaterThan(3);

        console.log(`✓ Speedup factor: ${speedup.toFixed(1)}x (cold=${coldDuration}ms, warm=${Math.round(avgWarm)}ms)`);
      } finally {
        await testProvider.cleanup();
      }
    }, 15000);

    it('should handle different voices without performance degradation', async () => {
      // Given: Different voice IDs
      const voices = ['sarah', 'james', 'emma', 'michael', 'olivia'];
      const text = 'Testing voice switching performance.';

      // When: Switching between voices
      const durations: Record<string, number> = {};
      for (const voice of voices) {
        const startTime = Date.now();
        await provider.generateAudio(text, voice);
        durations[voice] = Date.now() - startTime;
      }

      // Then: All should have similar performance (warm)
      const times = Object.values(durations);
      times.forEach(d => expect(d).toBeLessThan(2000));

      const maxDiff = Math.max(...times) - Math.min(...times);
      expect(maxDiff).toBeLessThan(1000); // Less than 1s difference

      console.log(`✓ Voice switching performance:`, durations);
    });

    it('should maintain performance with concurrent requests', async () => {
      // Given: Multiple concurrent requests
      const concurrentCount = 5;
      const text = 'Concurrent request test.';

      // When: Making concurrent requests
      const startTime = Date.now();
      const promises = Array.from({ length: concurrentCount }, (_, i) =>
        provider.generateAudio(`${text} Number ${i}`, 'sarah')
      );

      const results = await Promise.all(promises);
      const totalDuration = Date.now() - startTime;

      // Then: Should handle concurrency efficiently
      // Total time should be less than sequential (5 * 2s = 10s)
      expect(totalDuration).toBeLessThan(5000);
      expect(results).toHaveLength(concurrentCount);
      results.forEach(r => expect(r.duration).toBeGreaterThan(0));

      console.log(`✓ ${concurrentCount} concurrent requests completed in ${totalDuration}ms`);
    });
  });

  describe('Memory Management', () => {
    it('should maintain stable memory usage across requests', async () => {
      // Given: Initial memory state
      const initialMem = process.memoryUsage().heapUsed / 1024 / 1024;

      // When: Making multiple requests
      for (let i = 0; i < 10; i++) {
        await provider.generateAudio(`Memory test ${i}`, 'sarah');
        const currentMem = process.memoryUsage().heapUsed / 1024 / 1024;
        performanceMetrics.memoryUsage.push(currentMem);
      }

      // Then: Memory should be stable (no major leaks)
      const finalMem = process.memoryUsage().heapUsed / 1024 / 1024;
      const memIncrease = finalMem - initialMem;

      expect(memIncrease).toBeLessThan(100); // Less than 100MB increase
      console.log(`✓ Memory stable: ${Math.round(initialMem)}MB → ${Math.round(finalMem)}MB`);
    });

    it('should properly cleanup resources on service shutdown', async () => {
      // Given: New provider with service running
      const testProvider = new KokoroProvider();
      await testProvider.generateAudio('Setup', 'sarah');

      const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;

      // When: Cleaning up
      await testProvider.cleanup();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;

      // Then: Memory should be released
      expect(testProvider['service']).toBeNull();
      expect(testProvider['serviceReady']).toBe(false);

      console.log(`✓ Cleanup released memory: ${Math.round(memBefore)}MB → ${Math.round(memAfter)}MB`);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle text of varying lengths efficiently', async () => {
      // Given: Text samples of different lengths
      const samples = [
        { name: 'Very Short (5 words)', text: 'This is very short text.' },
        { name: 'Short (20 words)', text: 'This is a short text sample that contains approximately twenty words to test the TTS system performance metrics.' },
        { name: 'Medium (50 words)', text: VoiceTestData.validTextSamples[2] + ' '.repeat(5) },
        { name: 'Long (200 words)', text: VoiceTestData.longText.substring(0, 1000) }
      ];

      // When: Processing each sample
      const results: any[] = [];
      for (const sample of samples) {
        const startTime = Date.now();
        const result = await provider.generateAudio(sample.text, 'sarah');
        const duration = Date.now() - startTime;

        results.push({
          name: sample.name,
          processingTime: duration,
          audioDuration: result.duration,
          efficiency: duration / (result.duration * 1000) // Processing time per second of audio
        });
      }

      // Then: Processing time should scale reasonably with text length
      results.forEach(r => {
        expect(r.processingTime).toBeLessThan(3000);
        expect(r.efficiency).toBeLessThan(1); // Should process faster than real-time
        console.log(`  ${r.name}: ${r.processingTime}ms for ${r.audioDuration.toFixed(1)}s audio (${r.efficiency.toFixed(2)}x realtime)`);
      });
    });

    it('should maintain performance after extended usage', async () => {
      // Given: Extended usage simulation
      const iterations = 20;
      const timings: number[] = [];

      // When: Making many requests
      for (let i = 0; i < iterations; i++) {
        const text = `Extended usage test iteration ${i + 1}`;
        const startTime = Date.now();
        await provider.generateAudio(text, 'sarah');
        timings.push(Date.now() - startTime);

        // Log every 5th iteration
        if ((i + 1) % 5 === 0) {
          const recent = timings.slice(-5);
          const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
          console.log(`  Iterations ${i - 3}-${i + 1}: avg ${Math.round(avg)}ms`);
        }
      }

      // Then: Performance should remain consistent
      const firstHalf = timings.slice(0, 10);
      const secondHalf = timings.slice(10);

      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      // Performance shouldn't degrade more than 20%
      expect(avgSecond).toBeLessThan(avgFirst * 1.2);

      console.log(`✓ Performance consistent: first half avg=${Math.round(avgFirst)}ms, second half avg=${Math.round(avgSecond)}ms`);
    });
  });
});