/**
 * Local Embeddings Service
 *
 * Generates embeddings using sentence-transformers via Python subprocess.
 * Uses all-MiniLM-L6-v2 model (384 dimensions, Apache 2.0 license).
 * Story 6.1 - RAG Infrastructure Setup
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { EmbeddingResult } from '../types';

// Model constants
const MODEL_NAME = 'all-MiniLM-L6-v2';
const DIMENSIONS = 384;

// Python script path
const EMBEDDINGS_SCRIPT = path.join(process.cwd(), 'scripts', 'generate-embeddings.py');

// Singleton service instance
let embeddingsService: LocalEmbeddingsService | null = null;

/**
 * Request structure for embeddings service
 */
interface EmbeddingsRequest {
  action: 'embed' | 'health' | 'shutdown';
  texts?: string[];
}

/**
 * Response structure from embeddings service
 */
interface EmbeddingsResponse {
  success: boolean;
  embeddings?: number[][];
  dimensions?: number;
  model?: string;
  count?: number;
  status?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Local embeddings service using Python subprocess
 */
export class LocalEmbeddingsService {
  private process: ChildProcess | null = null;
  private ready = false;
  private initializing = false;
  private initPromise: Promise<void> | null = null;
  private responseCallbacks: Map<number, (response: EmbeddingsResponse) => void> = new Map();
  private requestId = 0;
  private buffer = '';
  private lastError: Error | null = null;

  /**
   * Initialize the embeddings service
   */
  async initialize(): Promise<void> {
    if (this.ready) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initializing = true;

    this.initPromise = new Promise<void>((resolve, reject) => {
      console.log('Starting embeddings service...');

      // Find Python executable
      const pythonPath = process.platform === 'win32'
        ? path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
        : path.join(process.cwd(), '.venv', 'bin', 'python');

      // Spawn Python process
      this.process = spawn(pythonPath, [EMBEDDINGS_SCRIPT], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle stdout (JSON responses)
      this.process.stdout?.on('data', (data: Buffer) => {
        this.buffer += data.toString();

        // Process complete lines
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const response = JSON.parse(line) as EmbeddingsResponse;

            // Check for ready status
            if (response.status === 'ready') {
              console.log(`Embeddings service ready: ${response.model} (${response.dimensions}d)`);
              this.ready = true;
              this.initializing = false;
              resolve();
              continue;
            }

            // Handle error during initialization
            if (!this.ready && response.error) {
              this.lastError = new Error(response.error.message);
              reject(this.lastError);
              continue;
            }

            // Route response to waiting callback
            const callback = this.responseCallbacks.get(this.requestId - 1);
            if (callback) {
              callback(response);
              this.responseCallbacks.delete(this.requestId - 1);
            }
          } catch {
            console.error('Failed to parse embeddings response:', line);
          }
        }
      });

      // Handle stderr (logs)
      this.process.stderr?.on('data', (data: Buffer) => {
        const message = data.toString().trim();
        if (message) {
          console.log(`[Embeddings] ${message}`);
        }
      });

      // Handle process exit
      this.process.on('exit', (code) => {
        console.log(`Embeddings service exited with code ${code}`);
        this.ready = false;
        this.process = null;

        if (this.initializing) {
          reject(new Error(`Embeddings service failed to start (code ${code})`));
        }
      });

      // Handle errors
      this.process.on('error', (error) => {
        console.error('Embeddings service error:', error);
        this.lastError = error;

        if (this.initializing) {
          reject(error);
        }
      });

      // Timeout for initialization (120s to allow for first-time model download)
      setTimeout(() => {
        if (this.initializing && !this.ready) {
          reject(new Error('Embeddings service initialization timeout'));
        }
      }, 120000); // 120 second timeout for model download
    });

    return this.initPromise;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Get last error
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Send request to embeddings service
   */
  private async sendRequest(request: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    if (!this.ready || !this.process?.stdin) {
      throw new Error('Embeddings service not ready');
    }

    return new Promise((resolve, reject) => {
      const currentRequestId = this.requestId++;

      // Set up response callback
      this.responseCallbacks.set(currentRequestId, resolve);

      // Send request
      const requestStr = JSON.stringify(request) + '\n';
      this.process?.stdin?.write(requestStr, (error) => {
        if (error) {
          this.responseCallbacks.delete(currentRequestId);
          reject(error);
        }
      });

      // Timeout
      setTimeout(() => {
        if (this.responseCallbacks.has(currentRequestId)) {
          this.responseCallbacks.delete(currentRequestId);
          reject(new Error('Embeddings request timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Generate embeddings for texts
   */
  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.ready) {
      await this.initialize();
    }

    const response = await this.sendRequest({
      action: 'embed',
      texts
    });

    if (!response.success || !response.embeddings) {
      throw new Error(response.error?.message || 'Failed to generate embeddings');
    }

    return response.embeddings.map((embedding) => ({
      embedding,
      dimensions: DIMENSIONS,
      model: MODEL_NAME
    }));
  }

  /**
   * Generate single embedding
   */
  async embedSingle(text: string): Promise<EmbeddingResult> {
    const results = await this.embed([text]);
    return results[0];
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{
    available: boolean;
    model: string;
    dimensions: number;
    error?: string;
  }> {
    if (!this.ready) {
      return {
        available: false,
        model: MODEL_NAME,
        dimensions: DIMENSIONS,
        error: this.lastError?.message || 'Service not initialized'
      };
    }

    try {
      const response = await this.sendRequest({ action: 'health' });

      if (response.success) {
        return {
          available: true,
          model: response.model || MODEL_NAME,
          dimensions: response.dimensions || DIMENSIONS
        };
      } else {
        return {
          available: false,
          model: MODEL_NAME,
          dimensions: DIMENSIONS,
          error: response.error?.message
        };
      }
    } catch (error) {
      return {
        available: false,
        model: MODEL_NAME,
        dimensions: DIMENSIONS,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.process && this.ready) {
      try {
        await this.sendRequest({ action: 'shutdown' });
      } catch {
        // Ignore errors during shutdown
      }
    }

    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    this.ready = false;
    this.initPromise = null;
    console.log('Embeddings service shutdown complete');
  }
}

/**
 * Get the singleton embeddings service instance
 */
export async function getEmbeddingsService(): Promise<LocalEmbeddingsService> {
  if (!embeddingsService) {
    embeddingsService = new LocalEmbeddingsService();
    await embeddingsService.initialize();
  }
  return embeddingsService;
}

/**
 * Generate embeddings for texts (convenience function)
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const service = await getEmbeddingsService();
  return service.embed(texts);
}

/**
 * Generate single embedding (convenience function)
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const service = await getEmbeddingsService();
  return service.embedSingle(text);
}

/**
 * Get embeddings service health
 */
export async function getEmbeddingsHealth(): Promise<{
  available: boolean;
  model: string;
  dimensions: number;
  error?: string;
}> {
  if (!embeddingsService) {
    return {
      available: false,
      model: MODEL_NAME,
      dimensions: DIMENSIONS,
      error: 'Service not started'
    };
  }
  return embeddingsService.getHealth();
}
