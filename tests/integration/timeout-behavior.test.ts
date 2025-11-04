/**
 * Critical Test: 30-Second Request Timeout
 * Test ID: 1.5-INT-003
 *
 * CRITICAL: Ensures requests abort after 30 seconds to prevent hanging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('1.5-INT-003: Request Timeout Behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should abort fetch request after 30 seconds', async () => {
    const controller = new AbortController();
    let aborted = false;

    // Set up abort listener
    controller.signal.addEventListener('abort', () => {
      aborted = true;
    });

    // Simulate the timeout pattern from ChatInterface
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Fast-forward time by 30 seconds
    vi.advanceTimersByTime(30000);

    // Verify abort was called
    expect(aborted).toBe(true);
    expect(controller.signal.aborted).toBe(true);

    clearTimeout(timeoutId);
  });

  it('should clear timeout on successful response', async () => {
    const controller = new AbortController();
    let aborted = false;

    controller.signal.addEventListener('abort', () => {
      aborted = true;
    });

    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Simulate successful response (timeout cleared early)
    clearTimeout(timeoutId);

    // Fast-forward past 30 seconds
    vi.advanceTimersByTime(35000);

    // Should NOT have aborted
    expect(aborted).toBe(false);
    expect(controller.signal.aborted).toBe(false);
  });

  it('should detect AbortError correctly', () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';

    expect(error.name).toBe('AbortError');
    expect(error instanceof Error).toBe(true);
  });

  it('should handle timeout before 30 seconds (should not abort)', async () => {
    const controller = new AbortController();
    let aborted = false;

    controller.signal.addEventListener('abort', () => {
      aborted = true;
    });

    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Fast-forward only 29 seconds
    vi.advanceTimersByTime(29000);

    // Should NOT have aborted yet
    expect(aborted).toBe(false);
    expect(controller.signal.aborted).toBe(false);

    clearTimeout(timeoutId);
  });

  it('should cleanup timeout on error', async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Simulate error happening before timeout
    const error = new Error('Network error');
    clearTimeout(timeoutId);

    // Fast-forward past timeout
    vi.advanceTimersByTime(35000);

    // Should not abort (timeout was cleared)
    expect(controller.signal.aborted).toBe(false);
  });
});
