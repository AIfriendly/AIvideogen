/**
 * Job Detail API Endpoint - Story 6.2
 *
 * GET /api/jobs/[id] - Get job details
 * DELETE /api/jobs/[id] - Cancel a pending job
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/jobs/queue';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/jobs/[id]
 *
 * Get details for a specific job.
 */
export async function GET(
  request: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const job = jobQueue.getJob(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: `Job ${id} not found`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        job,
      },
    });
  } catch (error) {
    console.error('Failed to get job:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GET_JOB_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/[id]
 *
 * Cancel a pending job. Only pending jobs can be cancelled.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    // Check if job exists
    const job = jobQueue.getJob(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: `Job ${id} not found`,
          },
        },
        { status: 404 }
      );
    }

    // Only pending jobs can be cancelled
    if (job.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANNOT_CANCEL',
            message: `Cannot cancel job with status: ${job.status}. Only pending jobs can be cancelled.`,
          },
        },
        { status: 400 }
      );
    }

    // Cancel the job
    const cancelled = jobQueue.cancel(id);

    if (!cancelled) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANCEL_FAILED',
            message: 'Failed to cancel job',
          },
        },
        { status: 500 }
      );
    }

    // Get updated job
    const updatedJob = jobQueue.getJob(id);

    return NextResponse.json({
      success: true,
      data: {
        job: updatedJob,
        message: 'Job cancelled successfully',
      },
    });
  } catch (error) {
    console.error('Failed to cancel job:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CANCEL_JOB_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
