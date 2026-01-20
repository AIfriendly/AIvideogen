import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 60000, // 60 seconds for TTS cold start (30s) + generation time
    // Separate test pools for different priorities
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    // Test coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/components/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/app/api/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.config.{ts,tsx}',
        'src/**/types.{ts,tsx}',
      ],
    },
    // Test name pattern matching for regression tests
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.cache/**',
    ],
    // Benchmark configuration for regression performance tracking
    benchmark: {
      include: ['tests/benchmark/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['**/node_modules/**'],
    },
    // Reporter configuration for better CI/CD integration
    reporters: ['default', 'html'],
    outputFile: {
      html: './test-results/index.html',
    },
    // Retry configuration for flaky tests
    retry: process.env.CI ? 2 : 0,
    // Sequence configuration for test ordering
    sequence: {
      shuffle: false,
      concurrent: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
