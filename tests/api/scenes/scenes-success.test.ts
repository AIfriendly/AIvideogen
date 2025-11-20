/**
 * API Tests: GET /api/projects/[id]/scenes - Success Cases
 * Test IDs: 4.1-API-001, 4.1-API-002
 * Priority: P0 (Critical)
 *
 * Tests for successful scene retrieval and ordering.
 *
 * Risk Mitigation:
 * - R-001 (Score 9): Data integrity - ensures correct scenes returned
 * - R-002 (Score 6): Scene ordering - validates sequential display
 */

import { test, expect, describe } from '../../fixtures/scenes.fixture';
import { createTestScene, createTestScenes } from '../../factories/scene.factory';
import { createScene, createProject, deleteProject } from '@/lib/db/queries';
import { GET as getScenesHandler } from '@/app/api/projects/[id]/scenes/route';
import { faker } from '@faker-js/faker';

describe('[4.1-API-001] [P0] Success Cases - Data Correctness', () => {
  test('should return all scenes for a project (not other projects)', async ({ testProject, seedScenes, createIsolatedProject }) => {
    // Given: Two projects, each with 3 scenes
    const project1Scenes = seedScenes(3, { withAudioCount: 3 });

    const otherProject = createIsolatedProject('Other Project');
    const project2Scenes = createTestScenes(otherProject.id, 3, { withAudioCount: 3 });
    project2Scenes.forEach((scene) => {
      createScene({
        id: scene.id,
        project_id: scene.project_id,
        scene_number: scene.scene_number,
        text: scene.text,
        audio_file_path: scene.audio_file_path,
        duration: scene.duration,
      });
    });

    // When: Fetch scenes for project 1
    const request = new Request(`http://localhost:3000/api/projects/${testProject.id}/scenes`);
    const response = await getScenesHandler(request, {
      params: Promise.resolve({ id: testProject.id })
    });
    const data = await response.json();

    // Then: Only project 1 scenes returned
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.scenes).toHaveLength(3);
    expect(data.data.scenes.every((s: any) => s.project_id === testProject.id)).toBe(true);
    expect(data.data.scenes.every((s: any) => s.project_id !== otherProject.id)).toBe(true);
  });

  test('should include all scene fields (id, project_id, scene_number, text, audio_file_path, duration)', async ({ testProject }) => {
    // Given: Project with 1 scene including all fields
    const testScene = createTestScene({
      id: faker.string.uuid(),
      project_id: testProject.id,
      scene_number: 1,
      text: 'Test scene with all fields populated.',
      audio_file_path: `.cache/audio/projects/${testProject.id}/scene-1.mp3`,
      duration: 5.5,
    });

    createScene({
      id: testScene.id,
      project_id: testScene.project_id,
      scene_number: testScene.scene_number,
      text: testScene.text,
      audio_file_path: testScene.audio_file_path,
      duration: testScene.duration,
    });

    // When: Fetch scenes
    const request = new Request(`http://localhost:3000/api/projects/${testProject.id}/scenes`);
    const response = await getScenesHandler(request, {
      params: Promise.resolve({ id: testProject.id })
    });
    const data = await response.json();

    // Then: All fields present
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.scenes).toHaveLength(1);

    const scene = data.data.scenes[0];
    expect(scene).toHaveProperty('id');
    expect(scene).toHaveProperty('project_id', testProject.id);
    expect(scene).toHaveProperty('scene_number', 1);
    expect(scene).toHaveProperty('text', testScene.text);
    expect(scene).toHaveProperty('audio_file_path', testScene.audio_file_path);
    expect(scene).toHaveProperty('duration', testScene.duration);
    expect(scene).toHaveProperty('created_at');
    expect(scene).toHaveProperty('updated_at');
  });
});

describe('[4.1-API-002] [P0] Scene Ordering - Sequential Display', () => {
  test('should return scenes ordered by scene_number ASC (not creation order)', async ({ testProject }) => {
    // Given: Scenes created in reverse order (3, 2, 1)
    const scenes = [
      createTestScene({ project_id: testProject.id, scene_number: 3, text: 'Scene 3' }),
      createTestScene({ project_id: testProject.id, scene_number: 2, text: 'Scene 2' }),
      createTestScene({ project_id: testProject.id, scene_number: 1, text: 'Scene 1' }),
    ];

    // Seed in reverse order
    scenes.forEach((scene) => {
      createScene({
        id: scene.id,
        project_id: scene.project_id,
        scene_number: scene.scene_number,
        text: scene.text,
      });
    });

    // When: Fetch scenes
    const request = new Request(`http://localhost:3000/api/projects/${testProject.id}/scenes`);
    const response = await getScenesHandler(request, {
      params: Promise.resolve({ id: testProject.id })
    });
    const data = await response.json();

    // Then: Scenes returned in sequential order (1, 2, 3)
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.scenes).toHaveLength(3);
    expect(data.data.scenes[0].scene_number).toBe(1);
    expect(data.data.scenes[1].scene_number).toBe(2);
    expect(data.data.scenes[2].scene_number).toBe(3);
  });

  test('should maintain ordering with many scenes (10+)', async ({ testProject }) => {
    // Given: 12 scenes in random order
    const shuffledNumbers = [7, 3, 10, 1, 12, 5, 8, 2, 11, 4, 6, 9];
    const scenes = shuffledNumbers.map((num) =>
      createTestScene({
        project_id: testProject.id,
        scene_number: num,
        text: `Scene ${num}`,
      })
    );

    scenes.forEach((scene) => {
      createScene({
        id: scene.id,
        project_id: scene.project_id,
        scene_number: scene.scene_number,
        text: scene.text,
      });
    });

    // When: Fetch scenes
    const request = new Request(`http://localhost:3000/api/projects/${testProject.id}/scenes`);
    const response = await getScenesHandler(request, {
      params: Promise.resolve({ id: testProject.id })
    });
    const data = await response.json();

    // Then: All scenes returned in sequential order (1-12)
    expect(response.status).toBe(200);
    expect(data.data.scenes).toHaveLength(12);

    for (let i = 0; i < 12; i++) {
      expect(data.data.scenes[i].scene_number).toBe(i + 1);
    }
  });
});
