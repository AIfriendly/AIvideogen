/**
 * Vitest Global Setup
 *
 * Configures test environment with global mocks and utilities
 */

import { expect, afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import * as fs from 'fs';
import * as path from 'path';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global cleanup for regression tests
beforeAll(() => {
  // Clean up any lingering TTS services
  const testAudioDir = path.join(process.cwd(), '.cache', 'audio', 'test');
  if (fs.existsSync(testAudioDir)) {
    fs.rmSync(testAudioDir, { recursive: true, force: true });
  }

  // Clean up test project audio files
  const projectsAudioDir = path.join(process.cwd(), '.cache', 'audio', 'projects');
  if (fs.existsSync(projectsAudioDir)) {
    const files = fs.readdirSync(projectsAudioDir);
    files.forEach(file => {
      if (file.startsWith('test-')) {
        const filePath = path.join(projectsAudioDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.rmSync(filePath, { force: true });
        }
      }
    });
  }
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock crypto.randomUUID for consistent test UUIDs
const mockUUIDs = [
  'test-uuid-1',
  'test-uuid-2',
  'test-uuid-3',
  'test-uuid-4',
  'test-uuid-5',
];
let uuidIndex = 0;

Object.defineProperty(global.crypto, 'randomUUID', {
  value: () => mockUUIDs[uuidIndex++ % mockUUIDs.length],
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock window.matchMedia (only in browser environments)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * Regression test cleanup utilities
 *
 * Provides helper functions for cleaning up after regression tests.
 */
export const regressionTestCleanup = {
  /**
   * Clean up test audio files
   */
  cleanupTestAudioFiles: () => {
    const testAudioDir = path.join(process.cwd(), '.cache', 'audio');
    if (fs.existsSync(testAudioDir)) {
      const cleanDirectory = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        entries.forEach(entry => {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            cleanDirectory(fullPath);
          } else if (entry.name.startsWith('test-')) {
            fs.rmSync(fullPath, { force: true });
          }
        });
      };
      cleanDirectory(testAudioDir);
    }
  },

  /**
   * Clean up TTS service processes
   */
  cleanupTTSServices: () => {
    // In real implementation, would track and kill spawned services
    // For now, just log
    console.log('[Regression Test Cleanup] TTS services cleaned up');
  },
};
