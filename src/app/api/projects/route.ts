/**
 * Projects API Endpoints
 *
 * GET /api/projects - List all projects ordered by last_active
 * POST /api/projects - Create a new project
 *
 * Standard response format:
 * Success: { success: true, data: { ... } }
 * Error: { success: false, error: { message: string, code: string } }
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects, createProject } from '@/lib/db/project-queries';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * GET /api/projects
 *
 * Retrieve all projects ordered by last_active descending (most recent first)
 *
 * @returns JSON response with projects array
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "projects": [
 *       {
 *         "id": "uuid-string",
 *         "name": "Project name",
 *         "topic": "Optional topic or null",
 *         "currentStep": "topic",
 *         "lastActive": "2025-11-04T12:34:56.789Z",
 *         "createdAt": "2025-11-04T10:00:00.000Z"
 *       }
 *     ]
 *   }
 * }
 *
 * Error Response (500):
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Failed to fetch projects",
 *     "code": "DATABASE_ERROR"
 *   }
 * }
 */
export async function GET() {
  try {
    const projects = getAllProjects();

    return NextResponse.json(
      {
        success: true,
        data: { projects },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] GET /api/projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch projects',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 *
 * Create a new project with optional name (defaults to "New Project")
 *
 * Request Body:
 * {
 *   "name": "Optional project name"
 * }
 *
 * @returns JSON response with created project
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "project": {
 *       "id": "newly-generated-uuid",
 *       "name": "New Project",
 *       "topic": null,
 *       "currentStep": "topic",
 *       "lastActive": "2025-11-04T12:34:56.789Z",
 *       "createdAt": "2025-11-04T12:34:56.789Z"
 *     }
 *   }
 * }
 *
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Invalid request body",
 *     "code": "INVALID_REQUEST"
 *   }
 * }
 *
 * Error Response (500):
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Failed to create project",
 *     "code": "DATABASE_ERROR"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body (optional name field)
    let body: { name?: string } = {};

    try {
      body = await request.json();
    } catch (parseError) {
      // If no body or invalid JSON, use defaults
      console.log('[API] No body provided, using defaults');
    }

    // Extract name from body or use default
    const projectName = body.name?.trim() || 'New Project';

    // Create project in database
    const project = createProject(projectName);

    return NextResponse.json(
      {
        success: true,
        data: { project },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] POST /api/projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to create project',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

// TODO: Add request validation middleware
// TODO: Add rate limiting for project creation
// TODO: Add authentication/authorization when implemented
