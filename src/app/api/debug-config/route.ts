/**
 * Debug endpoint to check project config
 * GET /api/debug-config?projectId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({
      error: 'Missing projectId parameter',
    }, { status: 400 });
  }

  const project = getProject(projectId);

  if (!project) {
    return NextResponse.json({
      error: 'Project not found',
    }, { status: 404 });
  }

  let parsedConfig = null;
  if (project.config_json) {
    try {
      parsedConfig = JSON.parse(project.config_json);
    } catch (e) {
      parsedConfig = { error: 'Invalid JSON', raw: project.config_json };
    }
  }

  return NextResponse.json({
    projectId: project.id,
    projectName: project.name,
    config_json_raw: project.config_json,
    config_json_parsed: parsedConfig,
    script_generated: project.script_generated,
    current_step: project.current_step,
  });
}
