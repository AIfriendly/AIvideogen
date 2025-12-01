/**
 * Job Processor Unit Tests - Story 6.2
 *
 * Tests for the background job processor.
 * Covers: AC-6.2.3 (concurrency), AC-6.2.6 (progress)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JobProcessor } from '@/lib/jobs/processor';
import { createMockJobHandler, createFailingJobHandler, createDelayedJobHandler } from '../../fixtures/job-fixtures';

describe('JobProcessor', () => {
  let processor: JobProcessor;

  beforeEach(() => {
    vi.resetModules();
    processor = new JobProcessor({ maxConcurrency: 2, pollIntervalMs: 100 });
  });

  afterEach(async () => {
    if (processor.isRunning()) {
      await processor.stop();
    }
    vi.clearAllMocks();
  });

  describe('registerHandler', () => {
    it('[P0] 6.2-UNIT-023: should register handler for job type', () => {
      // GIVEN: Mock handler
      const handler = createMockJobHandler();

      // WHEN: Handler is registered
      processor.registerHandler('cache_cleanup', handler);

      // THEN: Handler is registered
      expect(processor.getRegisteredTypes()).toContain('cache_cleanup');
    });

    it('[P1] 6.2-UNIT-024: should allow multiple handlers for different types', () => {
      // GIVEN: Multiple handlers
      const handler1 = createMockJobHandler();
      const handler2 = createMockJobHandler();

      // WHEN: Handlers are registered
      processor.registerHandler('cache_cleanup', handler1);
      processor.registerHandler('rag_sync_channel', handler2);

      // THEN: Both are registered
      expect(processor.getRegisteredTypes()).toContain('cache_cleanup');
      expect(processor.getRegisteredTypes()).toContain('rag_sync_channel');
    });
  });

  describe('unregisterHandler', () => {
    it('[P1] 6.2-UNIT-025: should unregister handler', () => {
      // GIVEN: Registered handler
      processor.registerHandler('cache_cleanup', createMockJobHandler());

      // WHEN: Handler is unregistered
      processor.unregisterHandler('cache_cleanup');

      // THEN: Handler is removed
      expect(processor.getRegisteredTypes()).not.toContain('cache_cleanup');
    });
  });

  describe('isRunning', () => {
    it('[P0] 6.2-UNIT-026: should return false before start', () => {
      // GIVEN: Fresh processor

      // WHEN: Check running status
      const running = processor.isRunning();

      // THEN: Not running
      expect(running).toBe(false);
    });
  });

  describe('getActiveJobCount', () => {
    it('[P0] 6.2-UNIT-027: should return 0 when no jobs processing', () => {
      // GIVEN: Fresh processor

      // WHEN: Get active count
      const count = processor.getActiveJobCount();

      // THEN: Zero active jobs
      expect(count).toBe(0);
    });
  });

  describe('configuration', () => {
    it('[P1] 6.2-UNIT-028: should accept custom concurrency', () => {
      // GIVEN: Custom concurrency config
      const customProcessor = new JobProcessor({ maxConcurrency: 5 });

      // THEN: Config is applied and accessible
      expect(customProcessor).toBeDefined();
      expect(customProcessor.getMaxConcurrency()).toBe(5);
    });

    it('[P1] 6.2-UNIT-029: should accept custom poll interval', () => {
      // GIVEN: Custom poll interval
      const customProcessor = new JobProcessor({ pollIntervalMs: 500 });

      // THEN: Config is applied and accessible
      expect(customProcessor).toBeDefined();
      expect(customProcessor.getPollIntervalMs()).toBe(500);
    });

    it('[P1] 6.2-UNIT-043: should use default concurrency when not specified', () => {
      // GIVEN: No custom config
      const defaultProcessor = new JobProcessor();

      // THEN: Default concurrency is 2
      expect(defaultProcessor.getMaxConcurrency()).toBe(2);
    });

    it('[P1] 6.2-UNIT-044: should use default poll interval when not specified', () => {
      // GIVEN: No custom config
      const defaultProcessor = new JobProcessor();

      // THEN: Default poll interval is 1000ms
      expect(defaultProcessor.getPollIntervalMs()).toBe(1000);
    });
  });

  describe('handler types', () => {
    it('[P0] 6.2-UNIT-030: should accept handler returning result', () => {
      // GIVEN: Handler that returns result
      const handler = createMockJobHandler({ success: true, count: 42 });

      // WHEN: Registered
      processor.registerHandler('cache_cleanup', handler);

      // THEN: Registered successfully
      expect(processor.getRegisteredTypes()).toContain('cache_cleanup');
    });

    it('[P0] 6.2-UNIT-031: should accept handler returning void', () => {
      // GIVEN: Handler that returns void
      const handler = vi.fn().mockResolvedValue(undefined);

      // WHEN: Registered
      processor.registerHandler('cache_cleanup', handler);

      // THEN: Registered successfully
      expect(processor.getRegisteredTypes()).toContain('cache_cleanup');
    });

    it('[P1] 6.2-UNIT-032: should accept async handler', async () => {
      // GIVEN: Async handler with delay
      const handler = createDelayedJobHandler(50);

      // WHEN: Registered
      processor.registerHandler('cache_cleanup', handler);

      // THEN: Registered successfully
      expect(processor.getRegisteredTypes()).toContain('cache_cleanup');
    });
  });
});
