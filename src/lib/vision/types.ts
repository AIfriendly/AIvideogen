/**
 * Vision API Types - Story 3.7
 *
 * Type definitions for Google Cloud Vision API integration.
 * Used for face detection, OCR, and label verification.
 */

/**
 * Face annotation from Vision API
 */
export interface FaceAnnotation {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

/**
 * Text annotation from Vision API
 */
export interface TextAnnotation {
  text: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Label annotation from Vision API
 */
export interface LabelAnnotation {
  description: string;
  score: number;
}

/**
 * Face detection result
 */
export interface FaceDetectionResult {
  faces: FaceAnnotation[];
  totalFaceArea: number;
  hasTalkingHead: boolean;
}

/**
 * Text detection result
 */
export interface TextDetectionResult {
  texts: TextAnnotation[];
  hasCaption: boolean;
  textCoverage: number;
}

/**
 * Label detection result
 */
export interface LabelDetectionResult {
  labels: LabelAnnotation[];
  matchedLabels: string[];
  matchScore: number;
}

/**
 * Complete Vision API analysis result
 */
export interface VisionAnalysisResult {
  faceDetection: FaceDetectionResult;
  textDetection: TextDetectionResult;
  labelDetection: LabelDetectionResult;
  cvScore: number;
}

/**
 * Thumbnail analysis result (for pre-filtering)
 */
export interface ThumbnailAnalysis {
  hasFace: boolean;
  hasText: boolean;
  shouldFilter: boolean;
  reason?: string;
}

/**
 * Vision API error codes
 */
export enum VisionErrorCode {
  MISSING_CREDENTIALS = 'VISION_CREDENTIALS_NOT_CONFIGURED',
  INVALID_CREDENTIALS = 'VISION_CREDENTIALS_INVALID',
  QUOTA_EXCEEDED = 'VISION_QUOTA_EXCEEDED',
  RATE_LIMITED = 'VISION_RATE_LIMITED',
  NETWORK_ERROR = 'VISION_NETWORK_ERROR',
  FRAME_EXTRACTION_FAILED = 'FRAME_EXTRACTION_FAILED',
  ANALYSIS_FAILED = 'VISION_ANALYSIS_FAILED',
  FFMPEG_NOT_FOUND = 'FFMPEG_NOT_FOUND'
}

/**
 * Vision API error class
 */
export class VisionAPIError extends Error {
  public readonly code: VisionErrorCode;

  constructor(code: VisionErrorCode, message?: string) {
    super(message || code);
    this.code = code;
    this.name = 'VisionAPIError';
  }
}

/**
 * Quota usage information
 */
export interface QuotaUsage {
  used: number;
  limit: number;
  remaining: number;
  resetDate: Date;
}

/**
 * Frame dimensions
 */
export interface FrameDimensions {
  width: number;
  height: number;
}
