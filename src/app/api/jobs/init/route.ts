/**
 * Jobs System Init API
 *
 * GET /api/jobs/init - Initialize or check status of job processor
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeJobs, getJobsStatus, isJobsInitialized } from '@/lib/jobs/init';

let initInProgress = false;

export async function GET(request: NextRequest) {
  try {
    // If already initialized, return status
    if (isJobsInitialized()) {
      const status = getJobsStatus();
      return NextResponse.json({
        success: true,
        alreadyInitialized: true,
        status
      });
    }

    // If initialization is in progress, wait a bit
    if (initInProgress) {
      return NextResponse.json({
        success: true,
        initInProgress: true,
        message: 'Job processor initialization in progress...'
      });
    }

    // Start initialization
    initInProgress = true;
    console.log('[Jobs Init] Starting job processor initialization...');

    const result = await initializeJobs();

    initInProgress = false;

    const status = getJobsStatus();

    console.log('[Jobs Init] Initialization result:', result);
    console.log('[Jobs Init] Current status:', status);

    return NextResponse.json({
      success: true,
      initialized: true,
      result,
      status
    });

  } catch (error) {
    initInProgress = false;
    console.error('[Jobs Init] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
