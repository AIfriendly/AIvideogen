/**
 * Audio Serving API Endpoint
 *
 * GET /api/projects/[id]/scenes/[sceneNumber]/audio
 * Streams audio files for scenes with proper security validation
 */

import { NextResponse } from 'next/server';
import { getSceneByNumber } from '@/lib/db/queries';
import fs from 'fs';
import path from 'path';

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate scene number (positive integer)
 */
function isValidSceneNumber(sceneNumber: string): boolean {
  const num = parseInt(sceneNumber, 10);
  return !isNaN(num) && num > 0 && num.toString() === sceneNumber;
}

/**
 * Validate audio file path security
 */
function isValidAudioPath(audioPath: string): boolean {
  // Normalize path separators to forward slashes for validation (Windows compatibility)
  const normalizedPath = audioPath.replace(/\\/g, '/');

  // Must start with .cache/audio/projects/
  if (!normalizedPath.startsWith('.cache/audio/projects/')) {
    return false;
  }

  // Must end with .mp3
  if (!normalizedPath.endsWith('.mp3')) {
    return false;
  }

  // Must not contain directory traversal attempts
  if (normalizedPath.includes('..')) {
    return false;
  }

  return true;
}

/**
 * GET endpoint to serve audio files
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; sceneNumber: string }> }
): Promise<Response> {
  try {
    // Await params (Next.js App Router requirement)
    const { id, sceneNumber } = await params;

    // Validate projectId (UUID format)
    if (!isValidUUID(id)) {
      console.error(`Invalid project ID format: ${id}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid project ID format',
          code: 'INVALID_PARAMETERS',
        },
        { status: 400 }
      );
    }

    // Validate sceneNumber (positive integer)
    if (!isValidSceneNumber(sceneNumber)) {
      console.error(`Invalid scene number: ${sceneNumber}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid scene number',
          code: 'INVALID_PARAMETERS',
        },
        { status: 400 }
      );
    }

    const projectId = id;
    const sceneNumberInt = parseInt(sceneNumber, 10);

    // Load scene from database
    const scene = getSceneByNumber(projectId, sceneNumberInt);

    if (!scene) {
      console.error(`Scene not found: project=${projectId}, scene=${sceneNumberInt}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Scene not found',
          code: 'SCENE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if scene has audio
    if (!scene.audio_file_path) {
      console.error(
        `Audio requested for scene without audio_file_path: project=${projectId}, scene=${sceneNumberInt}`
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Scene does not have audio',
          code: 'AUDIO_FILE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate audio file path security
    if (!isValidAudioPath(scene.audio_file_path)) {
      console.error(`Invalid audio path detected: ${scene.audio_file_path}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid audio path',
          code: 'INVALID_AUDIO_PATH',
        },
        { status: 400 }
      );
    }

    // Construct absolute file path
    const absolutePath = path.join(process.cwd(), scene.audio_file_path);
    const resolvedPath = path.resolve(absolutePath);

    // Verify resolved path is within project root (additional security check)
    const projectRoot = path.resolve(process.cwd());
    if (!resolvedPath.startsWith(projectRoot)) {
      console.error(`Path traversal attempt detected: ${resolvedPath}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid audio path',
          code: 'INVALID_AUDIO_PATH',
        },
        { status: 400 }
      );
    }

    // Verify file exists on disk
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Audio file not found at path: ${resolvedPath}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Audio file not found on disk',
          code: 'AUDIO_FILE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Read audio file
    const audioBuffer = fs.readFileSync(resolvedPath);

    // Return audio file with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to serve audio file',
        code: 'FILE_READ_ERROR',
      },
      { status: 500 }
    );
  }
}
