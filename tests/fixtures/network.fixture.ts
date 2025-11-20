/**
 * Network Mock Fixtures for Integration Tests
 * Following TEA network-first.md best practices
 *
 * Pattern: Register mock → Trigger action → Assert response
 * Provides better fetch mocking patterns than global.fetch override
 */

import { test as base, vi } from 'vitest';

/**
 * Type definitions for network mocking
 */
export interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
  text?: () => Promise<string>;
}

export interface NetworkMock {
  /**
   * Mock a successful API response
   * Register BEFORE triggering the fetch
   */
  mockSuccess: (data: any, status?: number) => void;

  /**
   * Mock an error API response
   */
  mockError: (message: string, code: string, status?: number) => void;

  /**
   * Mock a network failure (fetch throws)
   */
  mockNetworkFailure: (errorMessage?: string) => void;

  /**
   * Mock a delayed response (for loading state tests)
   */
  mockDelayed: (data: any, delayMs: number) => Promise<void>;

  /**
   * Get call count for assertions
   */
  getCallCount: () => number;

  /**
   * Get last call arguments
   */
  getLastCall: () => [string, RequestInit?] | undefined;

  /**
   * Clear all mocks
   */
  clear: () => void;
}

/**
 * Create network mock helpers
 */
function createNetworkMock(): NetworkMock {
  const fetchMock = vi.fn();
  global.fetch = fetchMock as any;

  return {
    mockSuccess: (data: any, status = 200) => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status,
        json: async () => ({ success: true, data }),
      });
    },

    mockError: (message: string, code: string, status = 500) => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => ({
          success: false,
          error: { message, code },
        }),
      });
    },

    mockNetworkFailure: (errorMessage = 'Network request failed') => {
      fetchMock.mockRejectedValueOnce(new Error(errorMessage));
    },

    mockDelayed: async (data: any, delayMs: number) => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise);

      // Return a function to resolve after delay
      setTimeout(() => {
        resolvePromise!({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data }),
        });
      }, delayMs);
    },

    getCallCount: () => fetchMock.mock.calls.length,

    getLastCall: () => {
      const calls = fetchMock.mock.calls;
      return calls[calls.length - 1] as [string, RequestInit?] | undefined;
    },

    clear: () => {
      fetchMock.mockClear();
    },
  };
}

/**
 * Fixture: Network mock with auto-cleanup
 */
export const test = base.extend<{
  network: NetworkMock;
}>({
  network: async ({}, use) => {
    const network = createNetworkMock();

    await use(network);

    // Auto-cleanup
    network.clear();
    vi.restoreAllMocks();
  },
});

/**
 * Export utilities
 */
export { expect, vi, describe } from 'vitest';

/**
 * Helper: Create mock scenes response
 */
export function createScenesResponse(scenes: any[]) {
  return { scenes };
}

/**
 * Helper: Create mock project response
 */
export function createProjectResponse(project: any) {
  return { project };
}
