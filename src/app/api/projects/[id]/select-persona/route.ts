/**
 * Select Persona API Endpoint - Story 1.8
 *
 * Sets the selected persona for a project by updating system_prompt_id.
 *
 * @endpoint POST /api/projects/[id]/select-persona
 *
 * @request_body
 * {
 *   "personaId": "scientific-analyst"
 * }
 *
 * @success_response (200 OK)
 * {
 *   "project": { ...project data... }
 * }
 *
 * @error_response (400 Bad Request)
 * {
 *   "error": "personaId is required"
 * }
 *
 * @error_response (404 Not Found)
 * {
 *   "error": "Project not found"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateProject, getProject } from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';
import db from '@/lib/db/client';

// Initialize database on first import
initializeDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Parse request body
    let body: { personaId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { personaId } = body;

    if (!personaId || typeof personaId !== 'string') {
      return NextResponse.json(
        { error: 'personaId is required' },
        { status: 400 }
      );
    }

    // Check if project exists, auto-create if not (handles frontend UUID generation)
    let project = getProject(projectId);
    if (!project) {
      console.log(`[select-persona] Project ${projectId} not found. Auto-creating...`);

      // Create project with specified ID and persona
      const createStmt = db.prepare(`
        INSERT INTO projects (id, name, current_step, status, system_prompt_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      createStmt.run(projectId, 'New Project', 'topic', 'draft', personaId);

      project = getProject(projectId);
      if (!project) {
        return NextResponse.json(
          { error: 'Failed to create project' },
          { status: 500 }
        );
      }

      console.log(`[select-persona] Project ${projectId} created with persona: ${personaId}`);
      return NextResponse.json({ project });
    }

    // Update existing project with selected persona
    updateProject(projectId, { system_prompt_id: personaId });

    // Retrieve updated project
    project = getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found after update' },
        { status: 500 }
      );
    }

    console.log(`[select-persona] Project ${projectId} updated with persona: ${personaId}`);
    return NextResponse.json({ project });
  } catch (error) {
    console.error('[select-persona] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update persona' },
      { status: 500 }
    );
  }
}
