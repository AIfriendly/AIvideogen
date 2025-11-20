/**
 * API Tests: GET /api/projects/[id]/scenes - Validation & Edge Cases
 * Test IDs: 4.1-API-004, 4.1-API-007
 * Priority: P0/P2
 *
 * Tests for empty states and response format validation.
 *
 * Risk Mitigation:
 * - R-004 (Score 6): Empty state handling
 */

import { test, expect, describe } from '../../fixtures/scenes.fixture';
import { createTestScene, createTestScenes } from '../../factories/scene.factory';
import { createScene, createProject, deleteProject } from '@/lib/db/queries';
import { GET as getScenesHandler } from '@/app/api/projects/[id]/scenes/route';

describe('[4.1-API-004] [P0] Empty State - No Scenes', () => {
  test('should return empty array for project with no scenes', async ({ testProject }) => {
    // Given: Project exists but has no scenes

    // When: Fetch scenes
    const request = new Request(`http://localhost:3000/api/projects/${testProject.id}/scenes`);
    const response = await getScenesHandler(request, {
      params: Promise.resolve({ id: testProject.id })
    });
    const data = await response.json();

    // Then: Success with empty array
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.scenes).toEqual([]);
    expect(data.data.scenes).toHaveLength(0);
  });

  test('should return empty array for newly created project', async ({ createIsolatedProject }) => {
    // Given: Fresh project just created (no scenes added yet)
    const newProject = createIsolatedProject('Fresh Project');

    // When: Fetch scenes immediately
    const request = new Request(`http://localhost:3000/api/projects/${newProject.id}/scenes`);
    const response = await getScenesHandler(request, {
      params: Promise.resolve({ id: newProject.id })
    });
    const data = await response.json();

    // Then: Empty array returned
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.scenes).toEqual([]);
  });
});

describe('[4.1-API-007] [P2] Response Format - Fields Verification', () => {
  test('should return scenes with correct TypeScript types', async ({ testProject }) => {
    // Given: Project with 2 scenes
    const scenes = createTestScenes(testProject.id, 2, { withAudioCount: 2 });
    scenes.forEach((scene) => {
      createScene({
        id: scene.id,
        project_id: scene.project_id,
        scene_number: scene.scene_number,
        text: scene.text,
        audio_file_path: scene.audio_file_path,
        duration: scene.duration,
      });
    });

    // When: Fetch scenes
    const request = new Request(`http://localhost:3000/api/projects/${testProject.id}/scenes`);
    const response = await getScenesHandler(request, {
      params: Promise.resolve({ id: testProject.id })
    });
    const data = await response.json();

    // Then: All fields have correct types
    expect(data.data.scenes).toHaveLength(2);

    data.data.scenes.forEach((scene: any) => {
      expect(typeof scene.id).toBe('string');
      expect(typeof scene.project_id).toBe('string');
      expect(typeof scene.scene_number).toBe('number');
      expect(typeof scene.text).toBe('string');

      // audio_file_path and duration can be null
      if (scene.audio_file_path !== null) {
        expect(typeof scene.audio_file_path).toBe('string');
      }
      if (scene.duration !== null) {
        expect(typeof scene.duration).toBe('number');
      }

      // Timestamps
      expect(typeof scene.created_at).toBe('string');
      expect(typeof scene.updated_at).toBe('string');
    });
  });

  test('should handle scenes with null audio_file_path and duration', async ({ testProject }) => {
    // Given: Scene without audio (null audio_file_path and duration)
    const scene = createTestScene({
      project_id: testProject.id,
      scene_number: 1,
      text: 'Scene without audio',
      audio_file_path: null,
      duration: null,
    });

    createScene({
      id: scene.id,
      project_id: scene.project_id,
      scene_number: scene.scene_number,
      text: scene.text,
      audio_file_path: scene.audio_file_path,
      duration: scene.duration,
    });

    // When: Fetch scenes
    const request = new Request(`http://localhost:3000/api/projects/${testProject.id}/scenes`);
    const response = await getScenesHandler(request, {
      params: Promise.resolve({ id: testProject.id })
    });
    const data = await response.json();

    // Then: Null values handled correctly
    expect(response.status).toBe(200);
    expect(data.data.scenes).toHaveLength(1);
    expect(data.data.scenes[0].audio_file_path).toBeNull();
    expect(data.data.scenes[0].duration).toBeNull();
  });
});
