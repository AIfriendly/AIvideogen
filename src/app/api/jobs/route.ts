/**
 * Jobs API Endpoint - Story 6.2
 *
 * GET /api/jobs - List jobs with optional filters
 * POST /api/jobs - Create a new job
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/jobs/queue';
import { isJobsEnabled } from '@/lib/jobs/init';
import type { JobType, JobStatus } from '@/lib/jobs/types';

/**
 * GET /api/jobs
 *
 * Query parameters:
 * - status: Filter by status (comma-separated for multiple)
 * - type: Filter by job type (comma-separated for multiple)
 * - projectId: Filter by project ID
 * - limit: Max results (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const statusParam = searchParams.get('status');
    const typeParam = searchParams.get('type');
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const status = statusParam
      ? (statusParam.split(',') as JobStatus[])
      : undefined;

    const type = typeParam
      ? (typeParam.split(',') as JobType[])
      : undefined;

    // Get jobs
    const jobs = jobQueue.getJobs({
      status,
      type,
      projectId: projectId || undefined,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    });

    // Get status counts
    const counts = jobQueue.getStatusCounts();

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        pagination: {
          limit,
          offset,
          returned: jobs.length,
        },
        counts,
      },
    });
  } catch (error) {
    console.error('Failed to list jobs:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LIST_JOBS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs
 *
 * Create a new job in the queue.
 *
 * Request body:
 * {
 *   type: JobType,
 *   payload: object,
 *   priority?: 1-10,
 *   projectId?: string,
 *   scheduledFor?: string (ISO date),
 *   maxAttempts?: number
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if jobs are enabled
    if (!isJobsEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'JOBS_DISABLED',
            message: 'Jobs system is disabled. Set JOBS_ENABLED=true to enable.',
          },
        },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.type) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'type is required',
          },
        },
        { status: 400 }
      );
    }

    // Validate job type
    const validTypes: JobType[] = [
      'rag_sync_channel',
      'rag_sync_news',
      'rag_sync_trends',
      'embedding_generation',
      'video_assembly',
      'cv_batch_analysis',
      'cache_cleanup',
    ];

    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JOB_TYPE',
            message: `Invalid job type: ${body.type}. Valid types: ${validTypes.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (body.priority !== undefined) {
      const priority = parseInt(body.priority, 10);
      if (isNaN(priority) || priority < 1 || priority > 10) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PRIORITY',
              message: 'Priority must be between 1 and 10',
            },
          },
          { status: 400 }
        );
      }
    }

    // Create job
    const jobId = jobQueue.enqueue({
      type: body.type as JobType,
      payload: body.payload || {},
      priority: body.priority,
      projectId: body.projectId,
      scheduledFor: body.scheduledFor,
      maxAttempts: body.maxAttempts,
    });

    // Get the created job
    const job = jobQueue.getJob(jobId);

    return NextResponse.json(
      {
        success: true,
        data: {
          job,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create job:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_JOB_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
