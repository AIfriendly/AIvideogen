/**
 * Single Project API Endpoints
 *
 * GET /api/projects/[id] - Get single project by ID
 * PUT /api/projects/[id] - Update project (name, topic, currentStep)
 * DELETE /api/projects/[id] - Delete project (cascades to messages)
 *
 * Standard response format:
 * Success: { success: true, data: { ... } }
 * Error: { success: false, error: { message: string, code: string } }
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProjectById,
  updateProject,
  deleteProject,
} from '@/lib/db/project-queries';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * GET /api/projects/[id]
 *
 * Retrieve a single project by its ID
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response with project data or error
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "project": {
 *       "id": "uuid-string",
 *       "name": "Project name",
 *       "topic": "Optional topic or null",
 *       "currentStep": "topic",
 *       "lastActive": "2025-11-04T12:34:56.789Z",
 *       "createdAt": "2025-11-04T10:00:00.000Z"
 *     }
 *   }
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

    // Fetch project from database
    const project = getProjectById(projectId);

    // Return 404 if project not found
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

    return NextResponse.json(
      {
        success: true,
        data: { project },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] GET /api/projects/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch project',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 *
 * Update project fields (name, topic, currentStep)
 * Automatically updates last_active timestamp
 *
 * Request Body:
 * {
 *   "name": "Optional updated name",
 *   "topic": "Optional updated topic",
 *   "currentStep": "Optional updated step"
 * }
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response with updated project data or error
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "project": {
 *       "id": "uuid-string",
 *       "name": "Updated name",
 *       "topic": "Updated topic",
 *       "currentStep": "topic",
 *       "lastActive": "2025-11-04T12:40:00.000Z",
 *       "createdAt": "2025-11-04T10:00:00.000Z"
 *     }
 *   }
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
 */
export async function PUT(
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
    const existingProject = getProjectById(projectId);
    if (!existingProject) {
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

    // Parse request body
    let body: {
      name?: string;
      topic?: string;
      currentStep?: string;
    } = {};

    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid JSON in request body',
            code: 'INVALID_REQUEST',
          },
        },
        { status: 400 }
      );
    }

    // Build updates object (filter out undefined values)
    const updates: {
      name?: string;
      topic?: string;
      currentStep?: string;
    } = {};

    if (body.name !== undefined) {
      updates.name = body.name;
    }

    if (body.topic !== undefined) {
      updates.topic = body.topic;
    }

    if (body.currentStep !== undefined) {
      updates.currentStep = body.currentStep;
    }

    // Update project in database (also updates last_active)
    updateProject(projectId, updates);

    // Fetch updated project
    const updatedProject = getProjectById(projectId);

    if (!updatedProject) {
      throw new Error('Failed to retrieve updated project');
    }

    return NextResponse.json(
      {
        success: true,
        data: { project: updatedProject },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] PUT /api/projects/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to update project',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 *
 * Delete a project and all associated messages (CASCADE)
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response confirming deletion or error
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "deletedProjectId": "uuid-string"
 *   }
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
 */
export async function DELETE(
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

    // Verify project exists before deleting
    const existingProject = getProjectById(projectId);
    if (!existingProject) {
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

    // Delete project (CASCADE deletes messages automatically)
    deleteProject(projectId);

    return NextResponse.json(
      {
        success: true,
        data: { deletedProjectId: projectId },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] DELETE /api/projects/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to delete project',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

// TODO: Add request validation middleware
// TODO: Add authentication/authorization when implemented
// TODO: Add soft delete option (archive instead of hard delete)
