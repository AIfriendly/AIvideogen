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
  FrameDimensions,
  TextOverlaySeverity
} from './types';

// ============================================================================
// CV Thresholds Constants (Story 3.7b)
// ============================================================================

/**
 * CV Detection and Scoring Thresholds
 *
 * Story 3.7b: Stricter thresholds for better B-roll filtering
 * Updated: Tiered text overlay detection to eliminate videos with text
 *
 * Detection Thresholds:
 * - TALKING_HEAD_AREA: 10% face area (was 15%) - AC60
 * - SMALL_FACE_AREA: 3% face area for minor penalty (was 5%)
 * - CAPTION_COVERAGE_HEAVY: 5% text coverage for heavy penalty
 * - CAPTION_COVERAGE_MODERATE: 2% text coverage for moderate penalty
 * - CAPTION_BLOCKS_HEAVY: 4+ text blocks for heavy penalty
 * - CAPTION_BLOCKS_MODERATE: 2+ text blocks for moderate penalty
 *
 * Scoring Penalties:
 * - FACE_PENALTY_MAJOR: -0.6 for talking heads (was -0.5) - AC62
 * - FACE_PENALTY_MINOR: -0.3 for small faces (was -0.2) - AC62
 * - CAPTION_PENALTY_HEAVY: -0.6 for heavy text (watermarks, subscribe buttons)
 * - CAPTION_PENALTY_MODERATE: -0.5 for moderate text (titles, channel names)
 * - CAPTION_PENALTY_LIGHT: -0.3 for any text detected
 * - LABEL_MATCH_BONUS: +0.3 (unchanged)
 */
export const CV_THRESHOLDS = {
  // Detection thresholds
  TALKING_HEAD_AREA: 0.10,    // 10% face area triggers major penalty (was 0.15)
  SMALL_FACE_AREA: 0.03,      // 3% face area triggers minor penalty (was 0.05)

  // Tiered text detection thresholds
  CAPTION_COVERAGE_HEAVY: 0.05,    // 5% text coverage = heavy overlay
  CAPTION_COVERAGE_MODERATE: 0.02, // 2% text coverage = moderate overlay
  CAPTION_BLOCKS_HEAVY: 4,         // 4+ text blocks = heavy overlay (watermarks, titles)
  CAPTION_BLOCKS_MODERATE: 2,      // 2+ text blocks = moderate overlay

  // Legacy threshold (for backwards compatibility)
  CAPTION_COVERAGE: 0.02,     // Used for hasCaption boolean
  CAPTION_BLOCKS: 2,          // Used for hasCaption boolean

  // Scoring penalties
  FACE_PENALTY_MAJOR: -0.6,   // Heavy penalty for talking heads (was -0.5)
  FACE_PENALTY_MINOR: -0.3,   // Small penalty for small faces (was -0.2)

  // Tiered text penalties - more aggressive to filter out overlays
  CAPTION_PENALTY_HEAVY: -0.6,    // Heavy text overlay (watermarks, subscribe buttons)
  CAPTION_PENALTY_MODERATE: -0.5, // Moderate text (titles, channel names)
  CAPTION_PENALTY_LIGHT: -0.3,    // Any text detected (minor text)

  // Legacy penalty (for backwards compatibility)
  CAPTION_PENALTY: -0.4,      // Deprecated, use tiered penalties

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
    // 10,000 units/month - allows ~3,300 video analyses
    // Adjust based on your Google Cloud billing/credits
    this.quotaTracker = new QuotaTracker(10000);
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
   *
   * Tiered severity detection for text overlays:
   * - heavy: >5% coverage OR 4+ text blocks (watermarks, subscribe buttons, titles)
   * - moderate: >2% coverage OR 2+ text blocks (channel names, minor overlays)
   * - light: any text detected (single words, small labels)
   * - none: no text detected
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
    const textBlockCount = textBlocks.length;

    // Calculate severity based on tiered thresholds
    const severity = this.calculateTextSeverity(textCoverage, textBlockCount);

    return {
      texts,
      // hasCaption is true for any detected text (backwards compatibility)
      hasCaption: textCoverage > CV_THRESHOLDS.CAPTION_COVERAGE || textBlockCount > CV_THRESHOLDS.CAPTION_BLOCKS,
      textCoverage,
      textBlockCount,
      severity
    };
  }

  /**
   * Calculate text overlay severity for tiered penalty scoring
   *
   * Thresholds:
   * - heavy: >5% coverage OR 4+ text blocks
   * - moderate: >2% coverage OR 2+ text blocks
   * - light: any text detected (1+ blocks)
   * - none: no text
   */
  private calculateTextSeverity(textCoverage: number, textBlockCount: number): TextOverlaySeverity {
    // Heavy: watermarks, subscribe buttons, full titles
    if (textCoverage > CV_THRESHOLDS.CAPTION_COVERAGE_HEAVY ||
        textBlockCount >= CV_THRESHOLDS.CAPTION_BLOCKS_HEAVY) {
      return 'heavy';
    }

    // Moderate: channel names, partial overlays
    if (textCoverage > CV_THRESHOLDS.CAPTION_COVERAGE_MODERATE ||
        textBlockCount >= CV_THRESHOLDS.CAPTION_BLOCKS_MODERATE) {
      return 'moderate';
    }

    // Light: any text detected
    if (textBlockCount > 0) {
      return 'light';
    }

    // No text
    return 'none';
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

    // Worst case for text detection - use worst severity across all frames
    const worstSeverity = this.getWorstTextSeverity(textResults.map(r => r.severity));
    const textDetection: TextDetectionResult = {
      texts: textResults.flatMap(r => r.texts),
      hasCaption: textResults.some(r => r.hasCaption),
      textCoverage: Math.max(...textResults.map(r => r.textCoverage)),
      textBlockCount: Math.max(...textResults.map(r => r.textBlockCount)),
      severity: worstSeverity
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
   * Get the worst (most severe) text overlay severity from an array
   */
  private getWorstTextSeverity(severities: TextOverlaySeverity[]): TextOverlaySeverity {
    const severityOrder: TextOverlaySeverity[] = ['none', 'light', 'moderate', 'heavy'];
    let worstIndex = 0;

    for (const severity of severities) {
      const index = severityOrder.indexOf(severity);
      if (index > worstIndex) {
        worstIndex = index;
      }
    }

    return severityOrder[worstIndex];
  }

  /**
   * Calculate CV score based on analysis results
   *
   * Story 3.7b: Updated scoring formula with tiered text penalties
   *
   * Formula:
   * - Base score: 1.0
   * - Talking head (face >10%): -0.6 (was -0.5 at 15%) - AC62
   * - Small faces (face 3-10%): -0.3 (was -0.2 at 5-15%) - AC62
   * - Text overlay penalties (tiered):
   *   - Heavy (watermarks, subscribe): -0.6
   *   - Moderate (titles, channel names): -0.5
   *   - Light (any text): -0.3
   * - Label match bonus: +0.3 * matchScore (unchanged)
   *
   * Example scores with text overlays:
   * - No text, no face, good labels: 1.0 + 0.3 = 1.0 (clamped)
   * - Heavy text, no face, good labels: 1.0 - 0.6 + 0.3 = 0.7 (FAIL if threshold 0.8)
   * - Moderate text, no face, good labels: 1.0 - 0.5 + 0.3 = 0.8
   * - Light text, no face, good labels: 1.0 - 0.3 + 0.3 = 1.0
   * - Heavy text, no face, no labels: 1.0 - 0.6 = 0.4 (FAIL)
   * - Moderate text, no face, no labels: 1.0 - 0.5 = 0.5 (BORDERLINE)
   */
  private calculateCVScore(result: VisionAnalysisResult): number {
    let score = 1.0;

    // Penalize face area (talking heads) - Story 3.7b: Stricter penalties
    if (result.faceDetection.hasTalkingHead) {
      score += CV_THRESHOLDS.FACE_PENALTY_MAJOR; // -0.6 for >10% face area (was -0.5)
    } else if (result.faceDetection.totalFaceArea > CV_THRESHOLDS.SMALL_FACE_AREA) {
      score += CV_THRESHOLDS.FACE_PENALTY_MINOR; // -0.3 for 3-10% face area (was -0.2)
    }

    // Penalize text/captions - Tiered penalties based on severity
    switch (result.textDetection.severity) {
      case 'heavy':
        score += CV_THRESHOLDS.CAPTION_PENALTY_HEAVY; // -0.6 for watermarks, subscribe buttons
        break;
      case 'moderate':
        score += CV_THRESHOLDS.CAPTION_PENALTY_MODERATE; // -0.5 for titles, channel names
        break;
      case 'light':
        score += CV_THRESHOLDS.CAPTION_PENALTY_LIGHT; // -0.3 for minor text
        break;
      // 'none' - no penalty
    }

    // Bonus for matching labels
    score += result.labelDetection.matchScore * CV_THRESHOLDS.LABEL_MATCH_BONUS;

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, score));
  }
}

// Export singleton instance
export const visionClient = new VisionAPIClient();
