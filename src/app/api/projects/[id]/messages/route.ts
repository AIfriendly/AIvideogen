/**
 * Project Messages API Endpoint
 *
 * GET /api/projects/[id]/messages - Get all messages for a project
 *
 * Used when switching between projects to load conversation history.
 *
 * Standard response format:
 * Success: { success: true, data: [...] }
 * Error: { success: false, error: { message: string, code: string } }
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProjectMessages, getProjectById } from '@/lib/db/project-queries';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * GET /api/projects/[id]/messages
 *
 * Retrieve all messages for a specific project ordered chronologically
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response with messages array or error
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "message-uuid",
 *       "projectId": "project-uuid",
 *       "role": "user",
 *       "content": "Message text",
 *       "timestamp": "2025-11-04T12:34:56.789Z"
 *     },
 *     {
 *       "id": "message-uuid-2",
 *       "projectId": "project-uuid",
 *       "role": "assistant",
 *       "content": "Response text",
 *       "timestamp": "2025-11-04T12:35:00.000Z"
 *     }
 *   ]
 * }
 *
 * Error Response (404):
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Project not found",
 *     "code": "NOT_FOUND"
 *   }
 * }
 *
 * Error Response (500):
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Failed to fetch messages",
 *     "code": "DATABASE_ERROR"
 *   }
 * }
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
          error: {
            message: 'Project ID is required',
            code: 'INVALID_REQUEST',
          },
        },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Project not found',
            code: 'NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    // Fetch all messages for the project
    const messages = getProjectMessages(projectId);

    return NextResponse.json(
      {
        success: true,
        data: messages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] GET /api/projects/[id]/messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch messages',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

// TODO: Add pagination for projects with many messages (query params: limit, offset)
// TODO: Add authentication/authorization when implemented
// TODO: Add filtering by role (query param: role=user|assistant)
