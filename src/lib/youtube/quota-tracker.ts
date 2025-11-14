/**
 * YouTube API Quota Tracker
 *
 * Manages YouTube Data API v3 quota consumption with:
 * - Daily quota tracking (default 10,000 units)
 * - Persistent cache across app restarts
 * - Automatic quota reset at midnight Pacific Time
 * - Warning at 80% usage threshold
 */

import * as fs from 'fs';
import * as path from 'path';
import { QuotaUsage, YouTubeError, YouTubeErrorCode } from './types';
import type { YouTubeLogger } from './logger';

/**
 * Quota cache data structure
 */
interface QuotaCacheData {
  used: number;
  limit: number;
  resetTime: string; // ISO 8601 timestamp
}

/**
 * YouTube API Quota Tracker
 *
 * Tracks API quota usage with persistence to survive app restarts.
 * Quota resets automatically at midnight Pacific Time daily.
 */
export class QuotaTracker {
  private used: number = 0;
  private limit: number;
  private resetTime: Date = new Date();
  private cacheFile: string;
  private logger?: YouTubeLogger;
  private warningThreshold: number = 0.8; // Warn at 80% usage

  /**
   * Create quota tracker
   *
   * @param limit - Daily quota limit in units (default: 10000)
   * @param logger - Optional logger instance
   */
  constructor(limit: number = 10000, logger?: YouTubeLogger) {
    this.limit = limit;
    this.logger = logger;
    this.cacheFile = path.join(process.cwd(), '.cache', 'youtube-quota.json');

    // Ensure cache directory exists
    this.ensureCacheDirectory();

    // Load quota state from cache
    this.loadFromCache();

    // Check if quota needs reset
    this.checkReset();

    this.logger?.debug('QuotaTracker initialized', {
      limit: this.limit,
      used: this.used,
      remaining: this.getRemainingQuota(),
      resetTime: this.resetTime.toISOString()
    });
  }

  /**
   * Increment quota usage
   *
   * @param cost - Quota units consumed by operation
   */
  incrementUsage(cost: number): void {
    // Check for reset before incrementing
    this.checkReset();

    const previousUsed = this.used;
    this.used += cost;

    // Save updated quota to cache
    this.saveToCache();

    // Log quota update
    this.logger?.debug('Quota incremented', {
      cost,
      previousUsed,
      currentUsed: this.used,
      remaining: this.getRemainingQuota(),
      percentUsed: Math.round((this.used / this.limit) * 100)
    });

    // Check if we've crossed the warning threshold
    const previousPercent = previousUsed / this.limit;
    const currentPercent = this.used / this.limit;

    if (previousPercent < this.warningThreshold && currentPercent >= this.warningThreshold) {
      const warning = `YouTube API quota at ${Math.round(currentPercent * 100)}% (${this.used}/${this.limit} units). Remaining: ${this.getRemainingQuota()} units.`;
      this.logger?.warn(warning, {
        used: this.used,
        limit: this.limit,
        remaining: this.getRemainingQuota(),
        resetTime: this.resetTime.toISOString()
      });
    }

    // Check if quota exceeded
    if (this.isExceeded()) {
      this.logger?.error('YouTube API quota exceeded', undefined, {
        used: this.used,
        limit: this.limit,
        resetTime: this.resetTime.toISOString()
      });
    }
  }

  /**
   * Get current quota usage
   *
   * @returns Quota usage information
   */
  getUsage(): QuotaUsage {
    // Check for reset before returning
    this.checkReset();

    return {
      used: this.used,
      limit: this.limit,
      remaining: this.getRemainingQuota(),
      resetTime: this.resetTime
    };
  }

  /**
   * Check if quota is exceeded
   *
   * @returns True if quota limit reached or exceeded
   */
  isExceeded(): boolean {
    this.checkReset();
    return this.used >= this.limit;
  }

  /**
   * Get remaining quota units
   *
   * @returns Remaining quota units (0 if exceeded)
   */
  getRemainingQuota(): number {
    return Math.max(0, this.limit - this.used);
  }

  /**
   * Get next quota reset time
   *
   * @returns Date when quota will reset
   */
  getResetTime(): Date {
    return this.resetTime;
  }

  /**
   * Check if quota needs to be reset
   *
   * Resets quota if current time has passed the reset time.
   * Calculates the next reset time after resetting.
   *
   * @private
   */
  private checkReset(): void {
    const now = new Date();

    if (now >= this.resetTime) {
      const previousUsed = this.used;
      this.used = 0;
      this.resetTime = this.calculateNextResetTime();
      this.saveToCache();

      this.logger?.info('YouTube API quota reset', {
        previousUsed,
        newLimit: this.limit,
        nextReset: this.resetTime.toISOString()
      });
    }
  }

  /**
   * Calculate next quota reset time
   *
   * YouTube quotas reset at midnight Pacific Time (PT).
   * This calculates the next midnight PT from the current time.
   *
   * @returns Next quota reset time
   * @private
   */
  private calculateNextResetTime(): Date {
    // Get current time in Pacific timezone
    const now = new Date();
    const pacificTimeString = now.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles'
    });
    const pacificTime = new Date(pacificTimeString);

    // Set to next midnight Pacific Time
    const nextMidnight = new Date(pacificTime);
    nextMidnight.setDate(pacificTime.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);

    // Convert back to UTC
    const utcOffset = pacificTime.getTimezoneOffset() * 60 * 1000;
    const nextResetUTC = new Date(nextMidnight.getTime() + utcOffset);

    return nextResetUTC;
  }

  /**
   * Save quota state to cache file
   *
   * @private
   */
  private saveToCache(): void {
    try {
      const data: QuotaCacheData = {
        used: this.used,
        limit: this.limit,
        resetTime: this.resetTime.toISOString()
      };

      fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2), 'utf-8');

      this.logger?.debug('Quota cache saved', {
        cacheFile: this.cacheFile,
        used: this.used,
        limit: this.limit
      });
    } catch (error) {
      this.logger?.warn('Failed to save quota cache', {
        error: error instanceof Error ? error.message : String(error),
        cacheFile: this.cacheFile
      });
    }
  }

  /**
   * Load quota state from cache file
   *
   * If cache doesn't exist or is corrupted, initializes with defaults.
   *
   * @private
   */
  private loadFromCache(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const fileContent = fs.readFileSync(this.cacheFile, 'utf-8');
        const data: QuotaCacheData = JSON.parse(fileContent);

        this.used = data.used || 0;
        this.resetTime = new Date(data.resetTime);

        this.logger?.debug('Quota cache loaded', {
          cacheFile: this.cacheFile,
          used: this.used,
          limit: this.limit,
          resetTime: this.resetTime.toISOString()
        });
      } else {
        // No cache exists, initialize with defaults
        this.used = 0;
        this.resetTime = this.calculateNextResetTime();

        this.logger?.debug('No quota cache found, initialized with defaults', {
          used: this.used,
          limit: this.limit,
          resetTime: this.resetTime.toISOString()
        });
      }
    } catch (error) {
      // Corrupted cache or parsing error, reset to defaults
      this.logger?.warn('Failed to load quota cache, resetting to defaults', {
        error: error instanceof Error ? error.message : String(error),
        cacheFile: this.cacheFile
      });

      this.used = 0;
      this.resetTime = this.calculateNextResetTime();
    }
  }

  /**
   * Ensure cache directory exists
   *
   * Creates .cache directory if it doesn't exist.
   *
   * @private
   */
  private ensureCacheDirectory(): void {
    const cacheDir = path.dirname(this.cacheFile);

    if (!fs.existsSync(cacheDir)) {
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
        this.logger?.debug('Cache directory created', { cacheDir });
      } catch (error) {
        this.logger?.warn('Failed to create cache directory', {
          error: error instanceof Error ? error.message : String(error),
          cacheDir
        });
      }
    }
  }
}
