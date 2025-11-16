/**
 * Unit tests for QuotaTracker
 * Tests AC3: Quota tracking against daily limit
 * Following TEA test-quality.md best practices
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuotaTracker } from '@/lib/youtube/quota-tracker';
import type { QuotaUsage } from '@/lib/youtube/types';
import { createQuotaCache } from '../factories/youtube.factory';
import * as fs from 'fs';
import * as path from 'path';

// Mock file system
vi.mock('fs');
vi.mock('path');

describe('QuotaTracker', () => {
  const mockCacheFile = '.cache/youtube-quota.json';
  let originalEnv: NodeJS.ProcessEnv;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear all mocks
    vi.clearAllMocks();
    // Mock console.warn
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Mock path.join
    vi.mocked(path.join).mockReturnValue(mockCacheFile);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Restore console
    consoleWarnSpy.mockRestore();
  });

  describe('Initialization', () => {
    test('should initialize with default limit of 10000', () => {
      // Given: No cache file exists
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

      // When: Creating tracker
      const tracker = new QuotaTracker(10000);

      // Then: Should initialize with limit
      const usage = tracker.getUsage();
      expect(usage.limit).toBe(10000);
      expect(usage.used).toBe(0);
      expect(usage.remaining).toBe(10000);
    });

    test('should load quota state from cache file', () => {
      // Given: Cache file exists with previous usage
      const cacheData = createQuotaCache(5000);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cacheData));

      // When: Creating tracker
      const tracker = new QuotaTracker(10000);

      // Then: Should load from cache
      const usage = tracker.getUsage();
      expect(usage.used).toBe(5000);
      expect(usage.limit).toBe(10000);
      expect(usage.remaining).toBe(5000);
    });

    test('should handle corrupted cache gracefully', () => {
      // Given: Corrupted cache file
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json{');

      // When: Creating tracker
      const tracker = new QuotaTracker(10000);

      // Then: Should reset to defaults
      const usage = tracker.getUsage();
      expect(usage.used).toBe(0);
      expect(usage.limit).toBe(10000);
    });

    test('should create cache directory if not exists', () => {
      // Given: Cache directory doesn't exist
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // Directory doesn't exist
        .mockReturnValueOnce(false); // Cache file doesn't exist

      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

      // When: Creating tracker
      new QuotaTracker(10000);

      // Then: Should create directory
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.cache'),
        expect.objectContaining({ recursive: true })
      );
    });

    test('should calculate next reset time at midnight Pacific Time', () => {
      // Given: Current time
      const now = new Date('2025-11-15T15:30:00Z'); // 7:30 AM PT
      vi.setSystemTime(now);

      vi.mocked(fs.existsSync).mockReturnValue(false);

      // When: Creating tracker
      const tracker = new QuotaTracker(10000);

      // Then: Reset time should be next midnight PT
      const usage = tracker.getUsage();
      const resetTime = new Date(usage.resetTime);

      // Verify it's set to midnight PT (8 AM UTC next day)
      expect(resetTime.getUTCHours()).toBe(8); // Midnight PT = 8 AM UTC
      expect(resetTime.getUTCMinutes()).toBe(0);
      expect(resetTime.getUTCSeconds()).toBe(0);
      expect(resetTime.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Quota Tracking', () => {
    test('should increment usage by specified cost', () => {
      // Given: Tracker with no prior usage
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Incrementing usage by 100 (search cost)
      tracker.incrementUsage(100);

      // Then: Usage should increase
      const usage = tracker.getUsage();
      expect(usage.used).toBe(100);
      expect(usage.remaining).toBe(9900);
    });

    test('should track multiple requests cumulatively', () => {
      // Given: Tracker
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Multiple requests
      tracker.incrementUsage(100); // Search
      tracker.incrementUsage(100); // Search
      tracker.incrementUsage(1);   // Video details (future)

      // Then: Should accumulate
      const usage = tracker.getUsage();
      expect(usage.used).toBe(201);
      expect(usage.remaining).toBe(9799);
    });

    test('should persist quota state to cache after each increment', () => {
      // Given: Tracker
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Incrementing usage
      tracker.incrementUsage(100);

      // Then: Should save to cache
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockCacheFile,
        expect.stringContaining('"used":100')
      );

      // When: Incrementing again
      tracker.incrementUsage(200);

      // Then: Should save updated state
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockCacheFile,
        expect.stringContaining('"used":300')
      );
    });

    test('should warn at 80% quota usage', () => {
      // Given: Tracker near 80% usage
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Reaching exactly 80%
      tracker.incrementUsage(7900); // Just under 80%
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      tracker.incrementUsage(100); // Now at 80%

      // Then: Should log warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('80%')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('8000/10000')
      );
    });

    test('should only warn once when crossing 80% threshold', () => {
      // Given: Tracker near 80%
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Crossing 80% multiple times
      tracker.incrementUsage(8000);
      const warnCount = consoleWarnSpy.mock.calls.length;

      tracker.incrementUsage(100);
      tracker.incrementUsage(100);

      // Then: Should only warn once
      expect(consoleWarnSpy).toHaveBeenCalledTimes(warnCount); // No additional warnings
    });
  });

  describe('Quota Reset', () => {
    test('should reset usage at midnight Pacific Time', () => {
      // Given: Quota used yesterday
      const yesterday = new Date('2025-11-14T07:00:00Z'); // 11 PM PT yesterday
      const cacheData = {
        used: 9500,
        limit: 10000,
        resetTime: yesterday.toISOString()
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cacheData));
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Set current time to after reset
      const now = new Date('2025-11-15T09:00:00Z'); // 1 AM PT today
      vi.setSystemTime(now);

      // When: Creating tracker (checks reset)
      const tracker = new QuotaTracker(10000);

      // Then: Should reset usage
      const usage = tracker.getUsage();
      expect(usage.used).toBe(0);
      expect(usage.remaining).toBe(10000);
    });

    test('should not reset if before reset time', () => {
      // Given: Reset time in future
      const futureReset = new Date('2025-11-16T08:00:00Z'); // Midnight PT tomorrow
      const cacheData = {
        used: 5000,
        limit: 10000,
        resetTime: futureReset.toISOString()
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cacheData));

      // Set current time to before reset
      const now = new Date('2025-11-15T15:00:00Z');
      vi.setSystemTime(now);

      // When: Creating tracker
      const tracker = new QuotaTracker(10000);

      // Then: Should not reset
      const usage = tracker.getUsage();
      expect(usage.used).toBe(5000);
    });

    test('should calculate next reset time after resetting', () => {
      // Given: Past reset time
      const yesterday = new Date('2025-11-14T08:00:00Z');
      const cacheData = {
        used: 9000,
        limit: 10000,
        resetTime: yesterday.toISOString()
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cacheData));
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Set current time
      const now = new Date('2025-11-15T15:00:00Z');
      vi.setSystemTime(now);

      // When: Creating tracker (triggers reset)
      const tracker = new QuotaTracker(10000);

      // Then: Next reset should be tomorrow midnight PT
      const usage = tracker.getUsage();
      const nextReset = new Date(usage.resetTime);
      expect(nextReset.getTime()).toBeGreaterThan(now.getTime());
      expect(nextReset.getUTCHours()).toBe(8); // Midnight PT
    });

    test('should save reset state to cache', () => {
      // Given: Expired quota
      const yesterday = new Date('2025-11-14T08:00:00Z');
      const cacheData = {
        used: 10000,
        limit: 10000,
        resetTime: yesterday.toISOString()
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cacheData));
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const now = new Date('2025-11-15T15:00:00Z');
      vi.setSystemTime(now);

      // When: Creating tracker (triggers reset)
      new QuotaTracker(10000);

      // Then: Should save reset state
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockCacheFile,
        expect.stringContaining('"used":0')
      );
    });
  });

  describe('Quota Checking', () => {
    test('should correctly identify when quota is exceeded', () => {
      // Given: Tracker at limit
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Under limit
      tracker.incrementUsage(9999);
      expect(tracker.isExceeded()).toBe(false);

      // When: At limit
      tracker.incrementUsage(1);
      expect(tracker.isExceeded()).toBe(true);

      // When: Over limit
      tracker.incrementUsage(100);
      expect(tracker.isExceeded()).toBe(true);
    });

    test('should return correct remaining quota', () => {
      // Given: Tracker with some usage
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Tracking usage
      expect(tracker.getRemainingQuota()).toBe(10000);

      tracker.incrementUsage(2500);
      expect(tracker.getRemainingQuota()).toBe(7500);

      tracker.incrementUsage(5000);
      expect(tracker.getRemainingQuota()).toBe(2500);

      tracker.incrementUsage(2500);
      expect(tracker.getRemainingQuota()).toBe(0);
    });

    test('should return usage information', () => {
      // Given: Tracker with usage
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);
      tracker.incrementUsage(3000);

      // When: Getting usage
      const usage = tracker.getUsage();

      // Then: Should return complete usage info
      expect(usage.used).toBe(3000);
      expect(usage.limit).toBe(10000);
      expect(usage.remaining).toBe(7000);
      expect(usage.resetTime).toBeInstanceOf(Date);
    });

    test('should return reset time', () => {
      // Given: Tracker
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const tracker = new QuotaTracker(10000);

      // When: Getting reset time
      const resetTime = tracker.getResetTime();

      // Then: Should be future date
      expect(resetTime).toBeInstanceOf(Date);
      expect(resetTime.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors when reading cache', () => {
      // Given: File system error
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // When: Creating tracker
      const tracker = new QuotaTracker(10000);

      // Then: Should initialize with defaults
      const usage = tracker.getUsage();
      expect(usage.used).toBe(0);
      expect(usage.limit).toBe(10000);
    });

    test('should handle file system errors when writing cache', () => {
      // Given: Write error
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Disk full');
      });

      const tracker = new QuotaTracker(10000);

      // When: Incrementing (triggers save)
      // Then: Should not throw, but continue tracking in memory
      expect(() => tracker.incrementUsage(100)).not.toThrow();
      expect(tracker.getUsage().used).toBe(100);
    });

    test('should handle invalid cache data gracefully', () => {
      // Given: Invalid cache structure
      const invalidCache = {
        wrongField: 'value',
        // Missing: used, limit, resetTime
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidCache));

      // When: Creating tracker
      const tracker = new QuotaTracker(10000);

      // Then: Should use defaults
      const usage = tracker.getUsage();
      expect(usage.used).toBe(0);
      expect(usage.limit).toBe(10000);
    });
  });

  describe('Cache Persistence', () => {
    test('should save cache in correct format', () => {
      // Given: Tracker
      vi.mocked(fs.existsSync).mockReturnValue(false);
      let savedData: string = '';
      vi.mocked(fs.writeFileSync).mockImplementation((_, data) => {
        savedData = data as string;
      });

      const tracker = new QuotaTracker(10000);

      // When: Incrementing usage
      tracker.incrementUsage(500);

      // Then: Should save correct JSON structure
      const parsed = JSON.parse(savedData);
      expect(parsed).toHaveProperty('used', 500);
      expect(parsed).toHaveProperty('limit', 10000);
      expect(parsed).toHaveProperty('resetTime');
      expect(new Date(parsed.resetTime)).toBeInstanceOf(Date);
    });

    test('should create cache file with proper formatting', () => {
      // Given: Tracker
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Saving
      tracker.incrementUsage(100);

      // Then: Should format JSON nicely
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockCacheFile,
        expect.any(String)
      );

      const call = vi.mocked(fs.writeFileSync).mock.calls[0];
      const json = call[1] as string;
      expect(json).toContain('\n'); // Should be formatted
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero quota limit', () => {
      // Given: Zero limit (special case)
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const tracker = new QuotaTracker(0);

      // Then: Should always be exceeded
      expect(tracker.isExceeded()).toBe(true);
      expect(tracker.getRemainingQuota()).toBe(0);
    });

    test('should handle negative increment gracefully', () => {
      // Given: Tracker
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Negative increment (should not happen but handle gracefully)
      tracker.incrementUsage(-100);

      // Then: Should treat as 0
      expect(tracker.getUsage().used).toBe(0);
    });

    test('should handle usage exceeding limit', () => {
      // Given: Tracker near limit
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const tracker = new QuotaTracker(10000);

      // When: Incrementing beyond limit
      tracker.incrementUsage(9500);
      tracker.incrementUsage(1000); // Would be 10500

      // Then: Should track actual usage
      const usage = tracker.getUsage();
      expect(usage.used).toBe(10500);
      expect(usage.remaining).toBe(0); // Can't be negative
      expect(tracker.isExceeded()).toBe(true);
    });

    test('should handle very large quota values', () => {
      // Given: Large quota (enterprise tier)
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const largeLimit = 1000000000; // 1 billion
      const tracker = new QuotaTracker(largeLimit);

      // When: Tracking usage
      tracker.incrementUsage(100);

      // Then: Should handle correctly
      expect(tracker.getUsage().limit).toBe(largeLimit);
      expect(tracker.getRemainingQuota()).toBe(largeLimit - 100);
    });
  });
});