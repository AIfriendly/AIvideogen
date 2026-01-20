/**
 * TTS Service Test Fixture
 *
 * Provides helper functions for TTS service testing in regression tests.
 * Manages service lifecycle (start/stop/crash) for isolated test environments.
 *
 * Usage:
 *   const fixture = new TTSServiceFixture();
 *   await fixture.start();
 *   // Run tests...
 *   await fixture.stop();
 *
 * @module tests/fixtures/tts-service.fixture
 */

import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

/**
 * TTS Service Fixture
 *
 * Manages the Python TTS service lifecycle for testing.
 * Provides methods to start, stop, crash, and health-check the service.
 */
export class TTSServiceFixture {
  private service: ChildProcess | null = null;
  private readonly pythonPath: string;
  private readonly servicePath: string;
  private readonly testId: string;
  private isReady: boolean = false;

  constructor() {
    this.testId = randomUUID();

    // Determine Python path based on platform
    if (process.platform === 'win32') {
      this.pythonPath = path.join(
        process.cwd(),
        '..',
        '.venv',
        'Scripts',
        'python.exe'
      );
    } else {
      this.pythonPath = path.join(
        process.cwd(),
        '..',
        '.venv',
        'bin',
        'python'
      );
    }

    this.servicePath = path.join(process.cwd(), 'scripts', 'kokoro-tts-service.py');
  }

  /**
   * Start TTS service for testing
   *
   * Spawns the Python TTS service and waits for the "ready" signal.
   * Throws an error if the service fails to start within the timeout.
   *
   * @param timeout - Maximum time to wait for service to be ready (default: 10s)
   * @throws Error if Python or service script not found
   * @throws Error if service fails to start within timeout
   */
  async start(timeout = 10000): Promise<void> {
    // Check if Python exists
    if (!fs.existsSync(this.pythonPath)) {
      throw new Error(
        `Python not found at ${this.pythonPath}. ` +
        'Ensure virtual environment is set up with: uv venv'
      );
    }

    // Check if service script exists
    if (!fs.existsSync(this.servicePath)) {
      throw new Error(
        `TTS service script not found at ${this.servicePath}. ` +
        'Ensure the project structure is correct.'
      );
    }

    // Spawn the service
    this.service = spawn(this.pythonPath, [this.servicePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(process.cwd(), 'models'),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1', // Ensure unbuffered output
      },
    });

    // Set up error handlers
    this.service.on('error', (error) => {
      console.error(`[TTS Fixture] Service error: ${error.message}`);
    });

    this.service.on('exit', (code, signal) => {
      console.log(`[TTS Fixture] Service exited: code=${code}, signal=${signal}`);
      this.isReady = false;
    });

    // Wait for service ready signal
    await this.waitForReady(timeout);
  }

  /**
   * Stop TTS service gracefully
   *
   * Sends a shutdown command to the service and waits for it to exit.
   * Falls back to killing the process if graceful shutdown fails.
   */
  async stop(): Promise<void> {
    if (!this.service || this.service.killed) {
      return;
    }

    this.isReady = false;

    try {
      // Send shutdown command
      if (this.service.stdin && !this.service.stdin.destroyed) {
        this.service.stdin.write(JSON.stringify({ action: 'shutdown' }) + '\n');
      }

      // Wait for graceful shutdown (max 2 seconds)
      await Promise.race([
        this.waitForExit(),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);
    } catch (error) {
      console.warn('[TTS Fixture] Graceful shutdown failed, killing process');
    } finally {
      // Force kill if still running
      if (this.service && !this.service.killed) {
        this.service.kill('SIGTERM');
      }

      this.service = null;
    }
  }

  /**
   * Simulate service crash
   *
   * Immediately kills the service process without graceful shutdown.
   * Useful for testing crash recovery and fast-fail scenarios.
   */
  crash(): void {
    if (this.service && !this.service.killed) {
      this.isReady = false;
      this.service.kill('SIGKILL');
      this.service = null;
    }
  }

  /**
   * Check if service is currently running
   *
   * @returns true if service is running and ready, false otherwise
   */
  isRunning(): boolean {
    return this.service !== null && !this.service.killed && this.isReady;
  }

  /**
   * Get service PID for debugging
   *
   * @returns Process ID or null if service not running
   */
  getPid(): number | null {
    return this.service?.pid ?? null;
  }

  /**
   * Send a ping command to the service
   *
   * Used for health checking in tests.
   *
   * @returns Promise that resolves when pong is received
   */
  async ping(): Promise<void> {
    if (!this.service || !this.service.stdin || !this.service.stdout) {
      throw new Error('Service not running');
    }

    // Capture service reference to avoid null check issues in callback
    const service = this.service;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      const onData = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.status === 'healthy') {
            clearTimeout(timeout);
            service.stdout?.off('data', onData);
            resolve();
          }
        } catch (error) {
          // Not valid JSON, ignore
        }
      };

      service.stdout?.once('data', onData);

      // Send ping
      service.stdin!.write(JSON.stringify({ action: 'ping' }) + '\n');
    });
  }

  /**
   * Send a synthesize request to the service
   *
   * @param text - Text to synthesize
   * @param voiceId - Voice ID to use
   * @param outputPath - Output file path
   * @returns Promise that resolves with synthesize result
   */
  async synthesize(
    text: string,
    voiceId: string,
    outputPath: string
  ): Promise<{ success: boolean; duration?: number; error?: string }> {
    if (!this.service || !this.service.stdin || !this.service.stdout) {
      throw new Error('Service not running');
    }

    // Capture service reference to avoid null check issues in callback
    const service = this.service;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Synthesize timeout'));
      }, 30000);

      const onData = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          clearTimeout(timeout);
          service.stdout?.off('data', onData);
          resolve(response);
        } catch (error) {
          // Not valid JSON, ignore
        }
      };

      service.stdout?.once('data', onData);

      // Send synthesize request
      const request = {
        action: 'synthesize',
        text,
        voiceId,
        outputPath,
      };
      service.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Wait for service to send "ready" signal
   *
   * @private
   */
  private async waitForReady(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `TTS service failed to start within ${timeout}ms. ` +
            'Check stderr logs for details.'
          )
        );
      }, timeout);

      if (!this.service?.stderr) {
        clearTimeout(timer);
        reject(new Error('Service stderr not available'));
        return;
      }

      let buffer = '';

      const onError = (data: Buffer) => {
        buffer += data.toString();

        // Check for error status
        if (buffer.includes('"status": "error"')) {
          clearTimeout(timer);
          this.service!.stderr?.off('data', onError);

          try {
            // Extract JSON error message
            const match = buffer.match(/\{[^}]*"status":\s*"error"[^}]*\}/);
            if (match) {
              const errorData = JSON.parse(match[0]);
              reject(new Error(`${errorData.code}: ${errorData.message}`));
            } else {
              reject(new Error('Service failed to start (unknown error)'));
            }
          } catch (parseError) {
            reject(new Error(`Service failed to start: ${buffer}`));
          }
        }

        // Check for ready status
        if (buffer.includes('TTS Service ready') || buffer.includes('"status": "ready"')) {
          clearTimeout(timer);
          this.service!.stderr?.off('data', onError);
          this.isReady = true;
          resolve();
        }
      };

      this.service.stderr.on('data', onError);
    });
  }

  /**
   * Wait for service process to exit
   *
   * @private
   */
  private async waitForExit(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.service) {
        resolve();
        return;
      }

      if (this.service.killed) {
        resolve();
        return;
      }

      this.service.once('exit', () => {
        resolve();
      });
    });
  }

  /**
   * Cleanup method called by test teardown
   *
   * Ensures service is stopped and resources are freed.
   */
  async cleanup(): Promise<void> {
    await this.stop();
  }
}

/**
 * Create a TTS service fixture with automatic cleanup
 *
 * Usage in beforeEach/afterEach:
 *   let fixture: TTSServiceFixture;
 *   beforeEach(async () => {
 *     fixture = new TTSServiceFixture();
 *     await fixture.start();
 *   });
 *   afterEach(async () => {
 *     await fixture.cleanup();
 *   });
 *
 * @returns New TTSServiceFixture instance
 */
export function createTTSServiceFixture(): TTSServiceFixture {
  return new TTSServiceFixture();
}
