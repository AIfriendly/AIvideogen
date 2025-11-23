/**
 * Frame Extractor - Story 3.7
 *
 * FFmpeg-based frame extraction for Vision API analysis.
 * Extracts sample frames from video files for face/text/label detection.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VisionAPIError, VisionErrorCode, FrameDimensions } from './types';

/**
 * Check if FFmpeg is available in the system PATH
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('ffmpeg', ['-version'], {
      shell: true,
      stdio: 'pipe'
    });

    process.on('close', (code) => {
      resolve(code === 0);
    });

    process.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get video duration in seconds
 *
 * @param videoPath - Path to video file
 * @returns Duration in seconds
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  if (!fs.existsSync(videoPath)) {
    throw new VisionAPIError(
      VisionErrorCode.FRAME_EXTRACTION_FAILED,
      `Video file not found: ${videoPath}`
    );
  }

  return new Promise((resolve, reject) => {
    const process = spawn(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath
      ],
      { shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(
          new VisionAPIError(
            VisionErrorCode.FRAME_EXTRACTION_FAILED,
            `Failed to get video duration: ${stderr}`
          )
        );
        return;
      }

      const duration = parseFloat(stdout.trim());
      if (isNaN(duration)) {
        reject(
          new VisionAPIError(
            VisionErrorCode.FRAME_EXTRACTION_FAILED,
            'Failed to parse video duration'
          )
        );
        return;
      }

      resolve(duration);
    });

    process.on('error', (err) => {
      reject(
        new VisionAPIError(
          VisionErrorCode.FFMPEG_NOT_FOUND,
          `FFmpeg/FFprobe not found. Please install FFmpeg: ${err.message}`
        )
      );
    });
  });
}

/**
 * Get video frame dimensions
 *
 * @param videoPath - Path to video file
 * @returns Frame width and height
 */
export async function getFrameDimensions(videoPath: string): Promise<FrameDimensions> {
  if (!fs.existsSync(videoPath)) {
    throw new VisionAPIError(
      VisionErrorCode.FRAME_EXTRACTION_FAILED,
      `Video file not found: ${videoPath}`
    );
  }

  return new Promise((resolve, reject) => {
    const process = spawn(
      'ffprobe',
      [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=s=x:p=0',
        videoPath
      ],
      { shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(
          new VisionAPIError(
            VisionErrorCode.FRAME_EXTRACTION_FAILED,
            `Failed to get frame dimensions: ${stderr}`
          )
        );
        return;
      }

      const [widthStr, heightStr] = stdout.trim().split('x');
      const width = parseInt(widthStr, 10);
      const height = parseInt(heightStr, 10);

      if (isNaN(width) || isNaN(height)) {
        reject(
          new VisionAPIError(
            VisionErrorCode.FRAME_EXTRACTION_FAILED,
            `Failed to parse frame dimensions: ${stdout}`
          )
        );
        return;
      }

      resolve({ width, height });
    });

    process.on('error', (err) => {
      reject(
        new VisionAPIError(
          VisionErrorCode.FFMPEG_NOT_FOUND,
          `FFmpeg/FFprobe not found. Please install FFmpeg: ${err.message}`
        )
      );
    });
  });
}

/**
 * Extract sample frames from a video file
 *
 * @param videoPath - Path to video file
 * @param frameCount - Number of frames to extract (default: 3)
 * @returns Array of frame image buffers (JPEG format)
 */
export async function extractFrames(
  videoPath: string,
  frameCount: number = 3
): Promise<Buffer[]> {
  // Check FFmpeg availability
  const ffmpegAvailable = await checkFFmpegAvailable();
  if (!ffmpegAvailable) {
    throw new VisionAPIError(
      VisionErrorCode.FFMPEG_NOT_FOUND,
      'FFmpeg not found. Please install FFmpeg and ensure it is in your PATH. ' +
        'Download from https://ffmpeg.org/download.html'
    );
  }

  // Verify video file exists
  if (!fs.existsSync(videoPath)) {
    throw new VisionAPIError(
      VisionErrorCode.FRAME_EXTRACTION_FAILED,
      `Video file not found: ${videoPath}`
    );
  }

  // Get video duration to calculate frame timestamps
  const duration = await getVideoDuration(videoPath);
  if (duration <= 0) {
    throw new VisionAPIError(
      VisionErrorCode.FRAME_EXTRACTION_FAILED,
      'Video has zero or negative duration'
    );
  }

  // Create temp directory for frames
  const tempDir = path.join(os.tmpdir(), `vision-frames-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const frames: Buffer[] = [];

  try {
    // Calculate timestamps for frame extraction (evenly distributed)
    // Avoid very start and very end (10% margins)
    const startTime = duration * 0.1;
    const endTime = duration * 0.9;
    const interval = (endTime - startTime) / Math.max(1, frameCount - 1);

    for (let i = 0; i < frameCount; i++) {
      const timestamp = frameCount === 1
        ? duration / 2
        : startTime + interval * i;

      const outputPath = path.join(tempDir, `frame-${i}.jpg`);

      await extractSingleFrame(videoPath, timestamp, outputPath);

      // Read frame into buffer
      if (fs.existsSync(outputPath)) {
        const frameBuffer = fs.readFileSync(outputPath);
        frames.push(frameBuffer);
      }
    }

    if (frames.length === 0) {
      throw new VisionAPIError(
        VisionErrorCode.FRAME_EXTRACTION_FAILED,
        'No frames were extracted from the video'
      );
    }

    return frames;
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('[FrameExtractor] Failed to cleanup temp directory:', err);
    }
  }
}

/**
 * Extract a single frame at a specific timestamp
 *
 * @param videoPath - Path to video file
 * @param timestamp - Timestamp in seconds
 * @param outputPath - Output path for the frame image
 */
async function extractSingleFrame(
  videoPath: string,
  timestamp: number,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(
      'ffmpeg',
      [
        '-ss', timestamp.toFixed(2),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2', // High quality JPEG
        '-y', // Overwrite output
        outputPath
      ],
      { shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stderr = '';

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        // Check if output file was created despite error code
        if (fs.existsSync(outputPath)) {
          resolve();
          return;
        }
        reject(
          new VisionAPIError(
            VisionErrorCode.FRAME_EXTRACTION_FAILED,
            `Failed to extract frame at ${timestamp}s: ${stderr.slice(-200)}`
          )
        );
        return;
      }
      resolve();
    });

    process.on('error', (err) => {
      reject(
        new VisionAPIError(
          VisionErrorCode.FFMPEG_NOT_FOUND,
          `FFmpeg not found: ${err.message}`
        )
      );
    });
  });
}

/**
 * Strip audio from a video file
 *
 * @param inputPath - Path to input video file
 * @param outputPath - Path for output video (without audio)
 */
export async function stripAudio(
  inputPath: string,
  outputPath: string
): Promise<void> {
  // Check FFmpeg availability
  const ffmpegAvailable = await checkFFmpegAvailable();
  if (!ffmpegAvailable) {
    throw new VisionAPIError(
      VisionErrorCode.FFMPEG_NOT_FOUND,
      'FFmpeg not found. Please install FFmpeg and ensure it is in your PATH.'
    );
  }

  if (!fs.existsSync(inputPath)) {
    throw new VisionAPIError(
      VisionErrorCode.FRAME_EXTRACTION_FAILED,
      `Input video file not found: ${inputPath}`
    );
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const process = spawn(
      'ffmpeg',
      [
        '-i', inputPath,
        '-c:v', 'copy', // Copy video stream without re-encoding
        '-an', // Remove audio
        '-y', // Overwrite output
        outputPath
      ],
      { shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stderr = '';

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(
          new VisionAPIError(
            VisionErrorCode.FRAME_EXTRACTION_FAILED,
            `Failed to strip audio: ${stderr.slice(-200)}`
          )
        );
        return;
      }

      if (!fs.existsSync(outputPath)) {
        reject(
          new VisionAPIError(
            VisionErrorCode.FRAME_EXTRACTION_FAILED,
            'Output file was not created'
          )
        );
        return;
      }

      console.log(`[FrameExtractor] Audio stripped: ${inputPath} -> ${outputPath}`);
      resolve();
    });

    process.on('error', (err) => {
      reject(
        new VisionAPIError(
          VisionErrorCode.FFMPEG_NOT_FOUND,
          `FFmpeg not found: ${err.message}`
        )
      );
    });
  });
}
