/**
 * P0 Regression Test - TTS Service Crash Prevention
 *
 * Critical regression test to prevent TTS service crash on Windows platform.
 * Verifies fix for R-001 (Score: 9) - TTS service exit code 1 crash.
 *
 * Test ID from test-design-story-2.6.md:
 * - P0-001: TTS Service Crash Prevention (R-001, Score: 9)
 *
 * Priority: P0 (Run on every commit)
 * Risk: R-001 (TTS Service Crash - Score: 9 - CRITICAL BLOCKER)
 *
 * Root Cause:
 * - SIGTERM signal handling incompatibility on Windows
 * - Python service crashes with exit code 1 immediately after synthesis
 *
 * Fix Verification:
 * - Service should handle signals gracefully on all platforms
 * - No exit code 1 crashes during synthesis
 * - Audio files generated successfully
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

describe('[P0-001] TTS Service Crash Regression Test', () => {
  let ttsService: ChildProcess | null = null;
  const serviceReady = { value: false };
  const testOutputDir = path.join(process.cwd(), '.cache/audio/test-regression');

  beforeAll(async () => {
    // Ensure test output directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup: Stop TTS service if still running
    if (ttsService && !ttsService.killed) {
      ttsService.kill('SIGINT');
    }

    // Cleanup: Remove test audio files
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  /**
   * CRITICAL: Verify TTS service doesn't crash on Windows with exit code 1
   *
   * GIVEN: TTS service running on Windows platform
   * WHEN: Service receives synthesis request
   * THEN: Service should NOT crash (exit code 1)
   * AND: Audio file should be generated successfully
   */
  it('[CRITICAL] TTS service should not crash with exit code 1 during synthesis', async () => {
    // GIVEN: Start TTS service
    const pythonPath = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
    const servicePath = path.join(process.cwd(), 'scripts', 'kokoro-tts-service.py');

    // Verify Python and service script exist
    if (!fs.existsSync(pythonPath)) {
      console.warn('Python interpreter not found, skipping TTS crash test');
      return;
    }

    if (!fs.existsSync(servicePath)) {
      console.warn('TTS service script not found, skipping test');
      return;
    }

    // Start service
    ttsService = spawn(pythonPath, [servicePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let serviceExitCode: number | null = null;
    let serviceCrashed = false;

    // Monitor service exit
    ttsService.on('exit', (code, signal) => {
      serviceExitCode = code;
      serviceCrashed = code === 1; // Exit code 1 = crash

      console.error(`[TEST] TTS service exited: code=${code}, signal=${signal}`);
    });

    // Capture stderr for logs
    let stderrLogs = '';
    ttsService.stderr?.on('data', (data) => {
      stderrLogs += data.toString();
      console.log('[TTS STDERR]', data.toString());

      // Detect service ready
      if (data.toString().includes('TTS Service ready')) {
        serviceReady.value = true;
      }
    });

    // Capture stdout for responses
    let stdoutData = '';
    ttsService.stdout?.on('data', (data) => {
      stdoutData += data.toString();
      console.log('[TTS STDOUT]', data.toString());
    });

    // WAIT: For service to load model (up to 10 seconds)
    await waitForServiceReady(serviceReady, 10000);

    // THEN: Service should be ready
    expect(serviceReady.value).toBe(true);
    expect(serviceCrashed).toBe(false); // Should not have crashed during startup

    // WHEN: Send synthesis request
    const testRequest = {
      action: 'synthesize',
      text: 'This is a regression test for TTS service crash prevention.',
      voiceId: 'am_michael',
      outputPath: path.join(testOutputDir, 'regression-test.mp3'),
    };

    ttsService.stdin?.write(JSON.stringify(testRequest) + '\n');

    // WAIT: For synthesis to complete (up to 15 seconds)
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // THEN: Service should NOT have crashed
    expect(serviceCrashed).toBe(false);

    // AND: Service should NOT have exited with code 1
    if (serviceExitCode !== null) {
      expect(serviceExitCode).not.toBe(1);
    }

    // AND: Audio file should be generated
    const audioFileExists = fs.existsSync(testRequest.outputPath);
    expect(audioFileExists).toBe(true);

    // AND: Audio file should have valid MP3 content
    if (audioFileExists) {
      const audioBuffer = fs.readFileSync(testRequest.outputPath);
      expect(audioBuffer.length).toBeGreaterThan(0);

      // Verify MP3 header (starts with 0xFF 0xFB or ID3)
      const header = audioBuffer.slice(0, 3).toString('hex');
      const isValidMP3 = header.startsWith('fffb') || header.startsWith('494433'); // MP3 or ID3
      expect(isValidMP3).toBe(true);
    }

    // CLEANUP: Send shutdown request
    ttsService.stdin?.write(JSON.stringify({ action: 'shutdown' }) + '\n');

    // Wait for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify graceful shutdown (exit code 0)
    if (serviceExitCode !== null && !serviceCrashed) {
      expect(serviceExitCode).toBe(0); // Clean exit
    }
  }, 30000); // 30 second timeout for full test

  /**
   * Windows Platform Signal Handling Verification
   *
   * GIVEN: Windows platform
   * WHEN: TTS service starts
   * THEN: Service should handle signals without SIGTERM errors
   */
  it('[WINDOWS] Service should start without SIGTERM errors on Windows', async () => {
    // Only run on Windows
    if (process.platform !== 'win32') {
      console.log('Skipping Windows-specific test on non-Windows platform');
      return;
    }

    const pythonPath = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
    const servicePath = path.join(process.cwd(), 'scripts', 'kokoro-tts-service.py');

    if (!fs.existsSync(pythonPath) || !fs.existsSync(servicePath)) {
      console.warn('Skipping test: Python or service script not found');
      return;
    }

    // Start service
    const testService = spawn(pythonPath, [servicePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderrOutput = '';
    testService.stderr?.on('data', (data) => {
      stderrOutput += data.toString();
    });

    // Wait for service startup
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // THEN: No SIGTERM-related errors in stderr
    expect(stderrOutput).not.toContain('SIGTERM');
    expect(stderrOutput).not.toContain('AttributeError');
    expect(stderrOutput).not.toContain('has no attribute');

    // VERIFY: Service loaded successfully
    expect(stderrOutput).toContain('TTS Service ready');

    // Cleanup
    testService.stdin?.write(JSON.stringify({ action: 'shutdown' }) + '\n');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    testService.kill('SIGINT');
  }, 15000);

  /**
   * Health Check Verification
   *
   * GIVEN: TTS service running
   * WHEN: Sending ping request
   * THEN: Service should respond with health status
   * AND: Service should not crash
   */
  it('[HEALTH CHECK] Service should respond to ping without crashing', async () => {
    const pythonPath = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
    const servicePath = path.join(process.cwd(), 'scripts', 'kokoro-tts-service.py');

    if (!fs.existsSync(pythonPath) || !fs.existsSync(servicePath)) {
      console.warn('Skipping health check test');
      return;
    }

    // Start service
    const testService = spawn(pythonPath, [servicePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const serviceReady = { value: false };
    let healthResponse = '';

    testService.stderr?.on('data', (data) => {
      if (data.toString().includes('TTS Service ready')) {
        serviceReady.value = true;
      }
    });

    testService.stdout?.on('data', (data) => {
      healthResponse += data.toString();
    });

    // Wait for service ready
    await waitForServiceReady(serviceReady, 10000);

    // WHEN: Send ping request
    testService.stdin?.write(JSON.stringify({ action: 'ping' }) + '\n');

    // Wait for response
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // THEN: Should receive health response
    expect(healthResponse).toContain('success');
    expect(healthResponse).toContain('healthy');

    // Cleanup
    testService.stdin?.write(JSON.stringify({ action: 'shutdown' }) + '\n');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    testService.kill('SIGINT');
  }, 15000);
});

/**
 * Helper: Wait for service ready signal
 */
async function waitForServiceReady(
  serviceReady: { value: boolean },
  timeoutMs: number
): Promise<void> {
  const startTime = Date.now();

  while (!serviceReady.value) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('TTS service failed to start within timeout');
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
