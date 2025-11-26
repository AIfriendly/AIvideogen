/**
 * Vision API Client - Story 3.7
 *
 * Client for Google Cloud Vision API integration with quota management.
 * Handles face detection, OCR, and label detection for B-roll filtering.
 */

import vision, { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  VisionAnalysisResult,
  ThumbnailAnalysis,
  FaceDetectionResult,
  TextDetectionResult,
  LabelDetectionResult,
  VisionErrorCode,
  VisionAPIError,
  QuotaUsage,
  FrameDimensions
} from './types';

// ============================================================================
// CV Thresholds Constants (Story 3.7b)
// ============================================================================

/**
 * CV Detection and Scoring Thresholds
 *
 * Story 3.7b: Stricter thresholds for better B-roll filtering
 *
 * Detection Thresholds:
 * - TALKING_HEAD_AREA: 10% face area (was 15%) - AC60
 * - SMALL_FACE_AREA: 3% face area for minor penalty (was 5%)
 * - CAPTION_COVERAGE: 3% text coverage (was 5%) - AC61
 * - CAPTION_BLOCKS: 2 text blocks (was 3) - AC61
 *
 * Scoring Penalties:
 * - FACE_PENALTY_MAJOR: -0.6 for talking heads (was -0.5) - AC62
 * - FACE_PENALTY_MINOR: -0.3 for small faces (was -0.2) - AC62
 * - CAPTION_PENALTY: -0.4 for captions (was -0.3) - AC63
 * - LABEL_MATCH_BONUS: +0.3 (unchanged)
 */
export const CV_THRESHOLDS = {
  // Detection thresholds
  TALKING_HEAD_AREA: 0.10,    // 10% face area triggers major penalty (was 0.15)
  SMALL_FACE_AREA: 0.03,      // 3% face area triggers minor penalty (was 0.05)
  CAPTION_COVERAGE: 0.03,     // 3% text coverage (was 0.05)
  CAPTION_BLOCKS: 2,          // 2 text blocks triggers caption detection (was 3)

  // Scoring penalties
  FACE_PENALTY_MAJOR: -0.6,   // Heavy penalty for talking heads (was -0.5)
  FACE_PENALTY_MINOR: -0.3,   // Small penalty for small faces (was -0.2)
  CAPTION_PENALTY: -0.4,      // Penalty for captions (was -0.3)
  LABEL_MATCH_BONUS: 0.3,     // Bonus for matching expected labels (unchanged)
} as const;

// ============================================================================
// QuotaTracker Class
// ============================================================================

/**
 * Tracks Vision API quota usage with monthly reset
 */
export class QuotaTracker {
  private used: number = 0;
  private limit: number;
  private resetDate: Date;
  private storageFile: string;

  constructor(limit: number = 1000) {
    this.limit = limit;
    this.resetDate = this.getNextMonthStart();
    this.storageFile = path.join(os.tmpdir(), 'vision-api-quota.json');
    this.loadFromStorage();
  }

  /**
   * Increment quota usage
   */
  increment(units: number): void {
    this.checkReset();
    this.used += units;
    this.saveToStorage();
    console.log(`[VisionAPI] Quota used: ${this.used}/${this.limit} units`);
  }

  /**
   * Check if quota is exceeded
   */
  isExceeded(): boolean {
    this.checkReset();
    return this.used >= this.limit;
  }

  /**
   * Get current quota usage
   */
  getUsage(): QuotaUsage {
    this.checkReset();
    return {
      used: this.used,
      limit: this.limit,
      remaining: Math.max(0, this.limit - this.used),
      resetDate: this.resetDate
    };
  }

  /**
   * Check if quota should reset (new month)
   */
  private checkReset(): void {
    const now = new Date();
    if (now >= this.resetDate) {
      console.log('[VisionAPI] Resetting monthly quota');
      this.used = 0;
      this.resetDate = this.getNextMonthStart();
      this.saveToStorage();
    }
  }

  /**
   * Get the start of next month
   */
  private getNextMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Load quota state from storage
   */
  private loadFromStorage(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = JSON.parse(fs.readFileSync(this.storageFile, 'utf-8'));
        this.used = data.used || 0;
        this.resetDate = new Date(data.resetDate);

        // Check if we need to reset
        if (new Date() >= this.resetDate) {
          this.used = 0;
          this.resetDate = this.getNextMonthStart();
        }
      }
    } catch (error) {
      console.warn('[VisionAPI] Failed to load quota from storage:', error);
    }
  }

  /**
   * Save quota state to storage
   */
  private saveToStorage(): void {
    try {
      const data = {
        used: this.used,
        resetDate: this.resetDate.toISOString()
      };
      fs.writeFileSync(this.storageFile, JSON.stringify(data));
    } catch (error) {
      console.warn('[VisionAPI] Failed to save quota to storage:', error);
    }
  }
}

// ============================================================================
// VisionAPIClient Class
// ============================================================================

/**
 * Google Cloud Vision API Client
 *
 * Provides face detection, OCR, and label detection for B-roll filtering.
 * Includes quota management and graceful fallback when quota exceeded.
 */
export class VisionAPIClient {
  private client: ImageAnnotatorClient | null = null;
  private quotaTracker: QuotaTracker;
  private isConfigured: boolean = false;

  constructor() {
    this.quotaTracker = new QuotaTracker(1000);
    this.initializeClient();
  }

  /**
   * Initialize the Vision API client with service account credentials
   */
  private initializeClient(): void {
    const credentialsPath = process.env.GOOGLE_CLOUD_VISION_CREDENTIALS_PATH;
    const appCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!credentialsPath && !appCredentials) {
      console.warn(
        '[VisionAPI] Credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_VISION_CREDENTIALS_PATH. CV filtering will be disabled.'
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.client = credentialsPath
        ? new ImageAnnotatorClient({ keyFilename: credentialsPath })
        : new ImageAnnotatorClient();
      this.isConfigured = true;
      console.log('[VisionAPI] Client initialized successfully');
    } catch (error) {
      console.error('[VisionAPI] Failed to initialize client:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if Vision API is available
   */
  isAvailable(): boolean {
    return this.isConfigured && this.client !== null && !this.quotaTracker.isExceeded();
  }

  /**
   * Check if quota is exceeded
   */
  isQuotaExceeded(): boolean {
    return this.quotaTracker.isExceeded();
  }

  /**
   * Get quota usage information
   */
  getQuotaUsage(): QuotaUsage {
    return this.quotaTracker.getUsage();
  }

  /**
   * Analyze a YouTube thumbnail for pre-filtering
   *
   * Uses 2 API units (FACE_DETECTION + TEXT_DETECTION)
   *
   * @param thumbnailUrl - URL of the thumbnail image
   * @returns Analysis result indicating if video should be filtered
   */
  async analyzeThumbnail(thumbnailUrl: string): Promise<ThumbnailAnalysis> {
    if (!this.isAvailable()) {
      if (this.quotaTracker.isExceeded()) {
        throw new VisionAPIError(VisionErrorCode.QUOTA_EXCEEDED, 'Vision API quota exceeded');
      }
      throw new VisionAPIError(VisionErrorCode.MISSING_CREDENTIALS, 'Vision API not configured');
    }

    try {
      const [result] = await this.client!.annotateImage({
        image: { source: { imageUri: thumbnailUrl } },
        features: [
          { type: 'FACE_DETECTION', maxResults: 10 },
          { type: 'TEXT_DETECTION' }
        ]
      });

      this.quotaTracker.increment(2); // 2 features = 2 units

      const hasFace = (result.faceAnnotations || []).length > 0;
      const hasText = (result.textAnnotations || []).length > 1; // >1 because first is full text

      return {
        hasFace,
        hasText,
        shouldFilter: hasFace || hasText,
        reason: hasFace ? 'Face detected in thumbnail' : hasText ? 'Text detected in thumbnail' : undefined
      };
    } catch (error: any) {
      if (error.code === 8 || error.message?.includes('quota')) {
        throw new VisionAPIError(VisionErrorCode.QUOTA_EXCEEDED, 'Vision API quota exceeded');
      }
      if (error.code === 14 || error.message?.includes('network')) {
        throw new VisionAPIError(VisionErrorCode.NETWORK_ERROR, 'Network error during API call');
      }
      throw new VisionAPIError(VisionErrorCode.ANALYSIS_FAILED, `Thumbnail analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze video frames for content filtering
   *
   * Uses 3 API units per frame (FACE_DETECTION + TEXT_DETECTION + LABEL_DETECTION)
   *
   * @param frames - Array of frame image buffers
   * @param frameDimensions - Dimensions of the frames
   * @param expectedLabels - Expected labels from scene analysis
   * @returns Vision analysis result with CV score
   */
  async analyzeFrames(
    frames: Buffer[],
    frameDimensions: FrameDimensions,
    expectedLabels: string[] = []
  ): Promise<VisionAnalysisResult> {
    if (!this.isAvailable()) {
      if (this.quotaTracker.isExceeded()) {
        throw new VisionAPIError(VisionErrorCode.QUOTA_EXCEEDED, 'Vision API quota exceeded');
      }
      throw new VisionAPIError(VisionErrorCode.MISSING_CREDENTIALS, 'Vision API not configured');
    }

    const faceResults: FaceDetectionResult[] = [];
    const textResults: TextDetectionResult[] = [];
    const labelResults: LabelDetectionResult[] = [];

    for (const frame of frames) {
      try {
        const [result] = await this.client!.annotateImage({
          image: { content: frame.toString('base64') },
          features: [
            { type: 'FACE_DETECTION', maxResults: 10 },
            { type: 'TEXT_DETECTION' },
            { type: 'LABEL_DETECTION', maxResults: 10 }
          ]
        });

        this.quotaTracker.increment(3); // 3 features = 3 units

        // Process face detection
        const faceDetection = this.processFaceDetection(
          result.faceAnnotations || [],
          frameDimensions
        );
        faceResults.push(faceDetection);

        // Process text detection
        const textDetection = this.processTextDetection(
          result.textAnnotations || [],
          frameDimensions
        );
        textResults.push(textDetection);

        // Process label detection
        const labelDetection = this.processLabelDetection(
          result.labelAnnotations || [],
          expectedLabels
        );
        labelResults.push(labelDetection);
      } catch (error: any) {
        if (error.code === 8 || error.message?.includes('quota')) {
          throw new VisionAPIError(VisionErrorCode.QUOTA_EXCEEDED, 'Vision API quota exceeded');
        }
        throw new VisionAPIError(VisionErrorCode.ANALYSIS_FAILED, `Frame analysis failed: ${error.message}`);
      }
    }

    // Aggregate results from all frames
    const aggregatedResult = this.aggregateResults(faceResults, textResults, labelResults);

    // Calculate CV score
    aggregatedResult.cvScore = this.calculateCVScore(aggregatedResult);

    return aggregatedResult;
  }

  /**
   * Process face detection results
   */
  private processFaceDetection(
    annotations: any[],
    dimensions: FrameDimensions
  ): FaceDetectionResult {
    const totalArea = dimensions.width * dimensions.height;
    let faceArea = 0;

    const faces = annotations.map(face => {
      const vertices = face.boundingPoly?.vertices || [];
      if (vertices.length < 4) {
        return { boundingBox: { x: 0, y: 0, width: 0, height: 0 }, confidence: 0 };
      }

      const x = Math.min(...vertices.map((v: any) => v.x || 0));
      const y = Math.min(...vertices.map((v: any) => v.y || 0));
      const width = Math.max(...vertices.map((v: any) => v.x || 0)) - x;
      const height = Math.max(...vertices.map((v: any) => v.y || 0)) - y;

      faceArea += width * height;

      return {
        boundingBox: { x, y, width, height },
        confidence: face.detectionConfidence || 0
      };
    });

    const totalFaceArea = totalArea > 0 ? faceArea / totalArea : 0;

    return {
      faces,
      totalFaceArea,
      hasTalkingHead: totalFaceArea > CV_THRESHOLDS.TALKING_HEAD_AREA // Story 3.7b: 10% threshold (was 15%)
    };
  }

  /**
   * Process text detection results
   */
  private processTextDetection(
    annotations: any[],
    dimensions: FrameDimensions
  ): TextDetectionResult {
    // Skip first annotation (full text) and process individual text blocks
    const textBlocks = annotations.slice(1);
    const totalArea = dimensions.width * dimensions.height;
    let textArea = 0;

    const texts = textBlocks.map(text => {
      const vertices = text.boundingPoly?.vertices || [];
      if (vertices.length < 4) {
        return { text: text.description || '', boundingBox: { x: 0, y: 0, width: 0, height: 0 } };
      }

      const x = Math.min(...vertices.map((v: any) => v.x || 0));
      const y = Math.min(...vertices.map((v: any) => v.y || 0));
      const width = Math.max(...vertices.map((v: any) => v.x || 0)) - x;
      const height = Math.max(...vertices.map((v: any) => v.y || 0)) - y;

      textArea += width * height;

      return {
        text: text.description || '',
        boundingBox: { x, y, width, height }
      };
    });

    const textCoverage = totalArea > 0 ? textArea / totalArea : 0;

    return {
      texts,
      // Story 3.7b: Stricter thresholds - 3% coverage or >2 text blocks (was 5% or >3)
      hasCaption: textCoverage > CV_THRESHOLDS.CAPTION_COVERAGE || textBlocks.length > CV_THRESHOLDS.CAPTION_BLOCKS,
      textCoverage
    };
  }

  /**
   * Process label detection results
   */
  private processLabelDetection(
    annotations: any[],
    expectedLabels: string[]
  ): LabelDetectionResult {
    const labels = annotations.map(label => ({
      description: label.description || '',
      score: label.score || 0
    }));

    // Find matching labels
    const matchedLabels: string[] = [];
    for (const label of labels) {
      for (const expected of expectedLabels) {
        if (
          label.description.toLowerCase().includes(expected.toLowerCase()) ||
          expected.toLowerCase().includes(label.description.toLowerCase())
        ) {
          if (!matchedLabels.includes(label.description)) {
            matchedLabels.push(label.description);
          }
        }
      }
    }

    // Calculate match score (0-1)
    const matchScore = expectedLabels.length > 0
      ? Math.min(1, matchedLabels.length / Math.min(3, expectedLabels.length))
      : 0;

    return {
      labels,
      matchedLabels,
      matchScore
    };
  }

  /**
   * Aggregate results from multiple frames
   * Uses worst-case for faces/text, best for labels
   */
  private aggregateResults(
    faceResults: FaceDetectionResult[],
    textResults: TextDetectionResult[],
    labelResults: LabelDetectionResult[]
  ): VisionAnalysisResult {
    // Worst case for face detection
    const faceDetection: FaceDetectionResult = {
      faces: faceResults.flatMap(r => r.faces),
      totalFaceArea: Math.max(...faceResults.map(r => r.totalFaceArea)),
      hasTalkingHead: faceResults.some(r => r.hasTalkingHead)
    };

    // Worst case for text detection
    const textDetection: TextDetectionResult = {
      texts: textResults.flatMap(r => r.texts),
      hasCaption: textResults.some(r => r.hasCaption),
      textCoverage: Math.max(...textResults.map(r => r.textCoverage))
    };

    // Best case for label detection
    const allLabels = labelResults.flatMap(r => r.labels);
    const allMatched = [...new Set(labelResults.flatMap(r => r.matchedLabels))];
    const labelDetection: LabelDetectionResult = {
      labels: allLabels,
      matchedLabels: allMatched,
      matchScore: Math.max(...labelResults.map(r => r.matchScore))
    };

    return {
      faceDetection,
      textDetection,
      labelDetection,
      cvScore: 0 // Will be calculated separately
    };
  }

  /**
   * Calculate CV score based on analysis results
   *
   * Story 3.7b: Updated scoring formula with stricter penalties
   *
   * Formula:
   * - Base score: 1.0
   * - Talking head (face >10%): -0.6 (was -0.5 at 15%) - AC62
   * - Small faces (face 3-10%): -0.3 (was -0.2 at 5-15%) - AC62
   * - Captions detected: -0.4 (was -0.3) - AC63
   * - Label match bonus: +0.3 * matchScore (unchanged)
   */
  private calculateCVScore(result: VisionAnalysisResult): number {
    let score = 1.0;

    // Penalize face area (talking heads) - Story 3.7b: Stricter penalties
    if (result.faceDetection.hasTalkingHead) {
      score += CV_THRESHOLDS.FACE_PENALTY_MAJOR; // -0.6 for >10% face area (was -0.5)
    } else if (result.faceDetection.totalFaceArea > CV_THRESHOLDS.SMALL_FACE_AREA) {
      score += CV_THRESHOLDS.FACE_PENALTY_MINOR; // -0.3 for 3-10% face area (was -0.2)
    }

    // Penalize text/captions - Story 3.7b: Stricter penalty
    if (result.textDetection.hasCaption) {
      score += CV_THRESHOLDS.CAPTION_PENALTY; // -0.4 (was -0.3)
    }

    // Bonus for matching labels
    score += result.labelDetection.matchScore * CV_THRESHOLDS.LABEL_MATCH_BONUS;

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, score));
  }
}

// Export singleton instance
export const visionClient = new VisionAPIClient();
