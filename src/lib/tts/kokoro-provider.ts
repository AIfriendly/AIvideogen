/**
 * KokoroTTS Provider Implementation
 *
 * This module implements the TTSProvider interface for KokoroTTS, a high-quality
 * FOSS text-to-speech engine with 82M parameters and 48+ voice options.
 *
 * Architecture:
 * - Persistent Python service (similar to Ollama on port 11434)
 * - Model cached in memory for fast subsequent requests
 * - JSON protocol via stdin/stdout for communication
 * - Automatic service lifecycle management
 *
 * Performance:
 * - Cold start: ~3-5 seconds (includes model loading)
 * - Warm requests: <2 seconds (model already cached)
 * - Memory: ~400MB (82M parameter model in RAM)
 *
 * @module lib/tts/kokoro-provider
 */

import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import type { TTSProvider, AudioResult, VoiceProfile } from './provider';
import { TTSError, TTSErrorCode } from './provider';
import { MVP_VOICES } from './voice-profiles';

/**
 * JSON request format for TTS service
 */
interface TTSRequest {
  action: 'synthesize' | 'ping' | 'shutdown';
  text?: string;
  voiceId?: string;
  outputPath?: string;
}

/**
 * JSON response format from TTS service
 */
interface TTSResponse {
  success: boolean;
  duration?: number;
  filePath?: string;
  fileSize?: number;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Service status message (via stderr)
 */
interface TTSStatusMessage {
  status: 'loading' | 'ready' | 'error';
  message?: string;
  code?: string;
}

/**
 * KokoroProvider implements TTSProvider interface using persistent Python service
 *
 * Service Lifecycle:
 * 1. First request triggers service spawn
 * 2. Service loads model into memory (one-time ~3s)
 * 3. Service processes requests via stdin/stdout JSON
 * 4. Service kept alive for all subsequent requests
 * 5. Graceful shutdown on application exit
 *
 * Error Recovery:
 * - Service crash: Automatic restart with exponential backoff
 * - Timeout: Configurable timeouts (cold vs warm)
 * - Model not found: User-friendly error with setup instructions
 *
 * @example
 * ```typescript
 * const provider = new KokoroProvider();
 * const audio = await provider.generateAudio(
 *   'Hello, I am your AI video narrator.',
 *   'sarah'
 * );
 * console.log(`Generated: ${audio.duration}s, ${audio.fileSize} bytes`);
 * await provider.cleanup(); // Graceful shutdown
 * ```
 */
export class KokoroProvider implements TTSProvider {
  private service: ChildProcess | null = null;
  private serviceReady: boolean = false;
  private restartAttempts: number = 0;
  private maxRestartAttempts: number = 3;

  // Timeouts (ms)
  private readonly COLD_START_TIMEOUT = parseInt(
    process.env.TTS_TIMEOUT_MS_COLD || '30000'
  );
  private readonly WARM_TIMEOUT = parseInt(
    process.env.TTS_TIMEOUT_MS_WARM || '10000'
  );

  // Service script path (relative to project root)
  private readonly servicePath = resolve(
    process.cwd(),
    '..',
    'scripts',
    'kokoro-tts-service.py'
  );

  /**
   * Ensure the TTS service is running and ready
   *
   * This method:
   * 1. Checks if service is already running
   * 2. If not, spawns new Python process
   * 3. Waits for "ready" status message
   * 4. Sets up error handlers and restart logic
   *
   * @throws TTSError if service fails to start after max retries
   */
  private async ensureServiceRunning(): Promise<void> {
    // Service already running and ready
    if (this.service && this.serviceReady) {
      return;
    }

    // Check if service script exists
    if (!existsSync(this.servicePath)) {
      throw new TTSError(
        TTSErrorCode.TTS_SERVICE_ERROR,
        `TTS service script not found at: ${this.servicePath}`
      );
    }

    // Check restart attempts (exponential backoff)
    if (this.restartAttempts >= this.maxRestartAttempts) {
      throw new TTSError(
        TTSErrorCode.TTS_SERVICE_ERROR,
        'TTS service failed to start after multiple attempts. Please restart the application.'
      );
    }

    this.restartAttempts++;

    try {
      // Spawn Python service
      console.log('[TTS] Starting KokoroTTS service...');
      this.service = spawn('python', [this.servicePath], {
        stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
      });

      // Setup error handlers
      this.setupErrorHandlers();

      // Wait for service to be ready
      await this.waitForServiceReady();

      // Reset restart counter on success
      this.restartAttempts = 0;
      console.log('[TTS] Service ready');
    } catch (error) {
      this.service = null;
      this.serviceReady = false;

      if (error instanceof TTSError) {
        throw error;
      }

      // Exponential backoff before retry
      const backoffMs = Math.pow(2, this.restartAttempts) * 1000;
      console.error(
        `[TTS] Service start failed, retrying in ${backoffMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));

      throw new TTSError(
        TTSErrorCode.TTS_SERVICE_ERROR,
        `Failed to start TTS service: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Wait for service to send "ready" status message
   *
   * The service communicates status via stderr (separate from JSON stdout).
   * We wait for {"status": "ready"} message to confirm model is loaded.
   */
  private async waitForServiceReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new TTSError(
            TTSErrorCode.TTS_TIMEOUT,
            'TTS service startup timed out. Model may be downloading (320MB). Please wait and try again.'
          )
        );
      }, this.COLD_START_TIMEOUT);

      if (!this.service || !this.service.stderr) {
        clearTimeout(timeout);
        reject(
          new TTSError(
            TTSErrorCode.TTS_SERVICE_ERROR,
            'Service stderr stream not available'
          )
        );
        return;
      }

      // Listen for status messages on stderr
      const onStderr = (data: Buffer) => {
        const message = data.toString().trim();

        // Try to parse as JSON status message
        try {
          const status: TTSStatusMessage = JSON.parse(message);

          if (status.status === 'ready') {
            clearTimeout(timeout);
            this.serviceReady = true;
            this.service!.stderr!.off('data', onStderr);
            resolve();
          } else if (status.status === 'error') {
            clearTimeout(timeout);
            this.service!.stderr!.off('data', onStderr);

            // Map error codes
            const errorCode =
              status.code === 'TTS_NOT_INSTALLED'
                ? TTSErrorCode.TTS_NOT_INSTALLED
                : status.code === 'TTS_MODEL_NOT_FOUND'
                  ? TTSErrorCode.TTS_MODEL_NOT_FOUND
                  : TTSErrorCode.TTS_SERVICE_ERROR;

            reject(new TTSError(errorCode, status.message || 'Service error'));
          } else if (status.status === 'loading') {
            console.log('[TTS]', status.message || 'Loading model...');
          }
        } catch {
          // Not JSON, just log as regular stderr output
          console.log('[TTS]', message);
        }
      };

      this.service.stderr.on('data', onStderr);
    });
  }

  /**
   * Setup error handlers for service process
   *
   * Handles:
   * - Service exit/crash
   * - Spawn errors (Python not found, etc.)
   * - Unexpected termination
   */
  private setupErrorHandlers(): void {
    if (!this.service) return;

    this.service.on('error', (error) => {
      console.error('[TTS] Service spawn error:', error);
      this.serviceReady = false;

      // Check if Python is not installed
      if (
        error.message.includes('ENOENT') ||
        error.message.includes('not found')
      ) {
        throw new TTSError(
          TTSErrorCode.TTS_NOT_INSTALLED,
          'Python not found. Please ensure Python 3.10+ is installed and in PATH.'
        );
      }
    });

    this.service.on('exit', (code, signal) => {
      console.log(`[TTS] Service exited: code=${code}, signal=${signal}`);
      this.serviceReady = false;
      this.service = null;

      // If unexpected exit (not our shutdown), log it
      if (code !== 0 && code !== null) {
        console.error('[TTS] Service crashed unexpectedly');
      }
    });
  }

  /**
   * Generate audio from text using specified voice
   *
   * @param text - Text to synthesize (max 5000 characters)
   * @param voiceId - Voice profile ID (e.g., 'sarah', 'james')
   * @returns Promise resolving to AudioResult
   */
  async generateAudio(text: string, voiceId: string): Promise<AudioResult> {
    // Validate inputs
    if (!text || text.trim().length === 0) {
      throw new TTSError(
        TTSErrorCode.INVALID_TEXT_INPUT,
        'Text cannot be empty'
      );
    }

    if (text.length > 5000) {
      throw new TTSError(
        TTSErrorCode.INVALID_TEXT_INPUT,
        'Text too long (max 5000 characters)'
      );
    }

    // Validate voice ID
    const voice = MVP_VOICES.find((v) => v.id === voiceId);
    if (!voice) {
      throw new TTSError(
        TTSErrorCode.TTS_INVALID_VOICE,
        `Voice '${voiceId}' not found. Available voices: ${MVP_VOICES.map((v) => v.id).join(', ')}`
      );
    }

    // Ensure service is running
    await this.ensureServiceRunning();

    // Generate output path (will be passed to service)
    // Note: Actual path generation should use audio-storage utility
    // For now, using temporary path
    const outputPath = join('.cache', 'audio', 'temp', `${Date.now()}.mp3`);

    // Send synthesis request
    const request: TTSRequest = {
      action: 'synthesize',
      text,
      voiceId: voice.modelId, // Use KokoroTTS model ID
      outputPath,
    };

    return this.sendRequest(request, outputPath);
  }

  /**
   * Send request to service and await response
   *
   * @param request - JSON request object
   * @param outputPath - Expected output file path
   * @returns Promise resolving to AudioResult
   */
  private async sendRequest(
    request: TTSRequest,
    outputPath: string
  ): Promise<AudioResult> {
    if (!this.service || !this.serviceReady) {
      throw new TTSError(
        TTSErrorCode.TTS_SERVICE_ERROR,
        'TTS service not ready'
      );
    }

    return new Promise((resolve, reject) => {
      const isWarmRequest = this.restartAttempts === 0;
      const timeout = setTimeout(() => {
        reject(
          new TTSError(
            TTSErrorCode.TTS_TIMEOUT,
            'Voice generation timed out. Please try again.'
          )
        );
      }, isWarmRequest ? this.WARM_TIMEOUT : this.COLD_START_TIMEOUT);

      // Listen for response on stdout (one-time)
      const onStdout = (data: Buffer) => {
        try {
          clearTimeout(timeout);
          this.service!.stdout!.off('data', onStdout);

          const response: TTSResponse = JSON.parse(data.toString());

          if (response.success) {
            // Read audio file
            const audioBuffer = new Uint8Array(readFileSync(outputPath));

            resolve({
              audioBuffer,
              duration: response.duration || 0,
              filePath: response.filePath || outputPath,
              fileSize: response.fileSize || audioBuffer.length,
            });
          } else {
            // Service returned error
            const errorCode =
              (response.error?.code as TTSErrorCode) ||
              TTSErrorCode.TTS_SERVICE_ERROR;
            reject(
              new TTSError(
                errorCode,
                response.error?.message || 'Unknown error'
              )
            );
          }
        } catch (error) {
          reject(
            new TTSError(
              TTSErrorCode.TTS_SERVICE_ERROR,
              `Failed to parse service response: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      };

      this.service!.stdout!.on('data', onStdout);

      // Send request via stdin
      try {
        this.service!.stdin!.write(JSON.stringify(request) + '\n');
      } catch (error) {
        clearTimeout(timeout);
        this.service!.stdout!.off('data', onStdout);
        reject(
          new TTSError(
            TTSErrorCode.TTS_SERVICE_ERROR,
            `Failed to send request to service: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  }

  /**
   * Get list of available voice profiles
   *
   * Returns MVP voices (5 voices for MVP scope).
   * Full catalog (48+ voices) is documented in voice-profiles.ts.
   *
   * @returns Promise resolving to array of VoiceProfile objects
   */
  async getAvailableVoices(): Promise<VoiceProfile[]> {
    return MVP_VOICES;
  }

  /**
   * Cleanup resources and shutdown service gracefully
   *
   * This sends shutdown signal to service and waits for graceful exit.
   * Does not throw errors (best-effort cleanup).
   */
  async cleanup(): Promise<void> {
    if (!this.service || !this.serviceReady) {
      return;
    }

    try {
      console.log('[TTS] Shutting down service...');

      // Send shutdown request
      const shutdownRequest: TTSRequest = { action: 'shutdown' };
      this.service.stdin!.write(JSON.stringify(shutdownRequest) + '\n');

      // Wait for service to exit (with timeout)
      await Promise.race([
        new Promise<void>((resolve) => {
          this.service!.on('exit', () => resolve());
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);

      console.log('[TTS] Service shutdown complete');
    } catch (error) {
      console.error('[TTS] Error during cleanup:', error);
      // Force kill if graceful shutdown failed
      this.service?.kill();
    } finally {
      this.service = null;
      this.serviceReady = false;
    }
  }
}
