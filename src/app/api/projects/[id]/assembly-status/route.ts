/**
 * Assembly Status API Endpoint - Epic 5, Story 5.1
 *
 * GET /api/projects/[id]/assembly-status - Get assembly job status
 *
 * Returns the current status of the most recent assembly job for a project.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  getAssemblyJobByProjectId,
} from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';
import { transformAssemblyJob } from '@/types/assembly';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * GET /api/projects/[id]/assembly-status
 *
 * Returns the assembly job status for a project.
 *
 * Responses:
 * - 200: Success with AssemblyJobResponse
 * - 404: Project or job not found
 * - 500: Database error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Validate project ID is provided
    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Get the most recent assembly job for this project
    const job = getAssemblyJobByProjectId(projectId);
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: 'No assembly job found for this project',
          code: 'JOB_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Transform to camelCase response format
    const response = transformAssemblyJob(job);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API Error] GET /api/projects/[id]/assembly-status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get assembly status',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }
}
