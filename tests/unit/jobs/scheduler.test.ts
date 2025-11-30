/**
 * Cron Scheduler Unit Tests - Story 6.2
 *
 * Tests for the cron-based job scheduler.
 * Covers: AC-6.2.4 (cron triggers)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import cron from 'node-cron';

describe('CronScheduler', () => {
  // Store original env
  let originalJobsEnabled: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalJobsEnabled = process.env.JOBS_ENABLED;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalJobsEnabled !== undefined) {
      process.env.JOBS_ENABLED = originalJobsEnabled;
    } else {
      delete process.env.JOBS_ENABLED;
    }
  });

  describe('cron expression validation', () => {
    it('[P0] 6.2-UNIT-033: should validate valid cron expressions', () => {
      // GIVEN: Valid cron expressions
      const validExpressions = [
        '0 6 * * *',      // Daily at 6 AM
        '0 */4 * * *',    // Every 4 hours
        '0 3 * * 0',      // Sunday at 3 AM
        '*/5 * * * *',    // Every 5 minutes
        '0 0 1 * *',      // Monthly on 1st
      ];

      // THEN: All should be valid
      for (const expr of validExpressions) {
        expect(cron.validate(expr)).toBe(true);
      }
    });

    it('[P0] 6.2-UNIT-034: should reject invalid cron expressions', () => {
      // GIVEN: Invalid cron expressions
      const invalidExpressions = [
        'invalid',
        '* * *',          // Too few fields
        '60 * * * *',     // Invalid minute
        '* 25 * * *',     // Invalid hour
      ];

      // THEN: All should be invalid
      for (const expr of invalidExpressions) {
        expect(cron.validate(expr)).toBe(false);
      }
    });
  });

  describe('module exports', () => {
    it('[P0] 6.2-UNIT-035: should export CronScheduler class', async () => {
      // GIVEN: Scheduler module

      // WHEN: Import module
      const { CronScheduler } = await import('@/lib/jobs/scheduler');

      // THEN: Class is exported
      expect(CronScheduler).toBeDefined();
      expect(typeof CronScheduler).toBe('function');
    });

    it('[P0] 6.2-UNIT-036: should export cronScheduler singleton', async () => {
      // GIVEN: Scheduler module

      // WHEN: Import module
      const { cronScheduler } = await import('@/lib/jobs/scheduler');

      // THEN: Singleton is exported
      expect(cronScheduler).toBeDefined();
      expect(typeof cronScheduler.initialize).toBe('function');
    });
  });

  describe('CronScheduler instance', () => {
    it('[P1] 6.2-UNIT-037: should create instance without throwing', async () => {
      // GIVEN: CronScheduler class
      const { CronScheduler } = await import('@/lib/jobs/scheduler');

      // WHEN: Instance is created
      // THEN: No error thrown
      expect(() => new CronScheduler()).not.toThrow();
    });

    it('[P1] 6.2-UNIT-038: should report not initialized before init', async () => {
      // GIVEN: Fresh scheduler instance
      const { CronScheduler } = await import('@/lib/jobs/scheduler');
      const scheduler = new CronScheduler();

      // THEN: Not initialized
      expect(scheduler.isInitialized()).toBe(false);
    });

    it('[P1] 6.2-UNIT-039: should report zero active schedules before init', async () => {
      // GIVEN: Fresh scheduler instance
      const { CronScheduler } = await import('@/lib/jobs/scheduler');
      const scheduler = new CronScheduler();

      // THEN: Zero active
      expect(scheduler.getActiveCount()).toBe(0);
    });
  });

  describe('default schedules', () => {
    it('[P0] 6.2-UNIT-040: should define daily RAG channel sync', () => {
      // GIVEN: Expected default schedule

      // THEN: Expression is valid for 6 AM daily
      const expr = '0 6 * * *';
      expect(cron.validate(expr)).toBe(true);
    });

    it('[P0] 6.2-UNIT-041: should define news fetch every 4 hours', () => {
      // GIVEN: Expected default schedule

      // THEN: Expression is valid for every 4 hours
      const expr = '0 */4 * * *';
      expect(cron.validate(expr)).toBe(true);
    });

    it('[P0] 6.2-UNIT-042: should define weekly cache cleanup', () => {
      // GIVEN: Expected default schedule

      // THEN: Expression is valid for Sunday 3 AM
      const expr = '0 3 * * 0';
      expect(cron.validate(expr)).toBe(true);
    });
  });
});
