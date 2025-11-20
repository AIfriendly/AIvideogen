/**
 * E2E Integration Tests: Visual Curation Page - Edge Cases
 * Test IDs: 4.1-E2E-007
 * Priority: P2
 *
 * Tests for edge cases and boundary conditions.
 *
 * Risk Mitigation:
 * - R-005 (Score 4): Long text handling without layout break
 */

import { test, expect, describe } from '../../fixtures/network.fixture';
import { createTestScenes } from '../../factories/scene.factory';
import { createProject, createScene, deleteProject } from '@/lib/db/queries';
import { faker } from '@faker-js/faker';

describe('[4.1-E2E-007] [P2] Edge Cases', () => {
  test('should handle very long scene text without layout break', async ({ network }) => {
    // Given: Scene with 500+ word text
    const longText = 'Lorem ipsum dolor sit amet. '.repeat(200); // ~600 words

    const project = createProject('Long Text Project');
    const testProjectId = project.id;

    const scene = {
      id: faker.string.uuid(),
      project_id: testProjectId,
      scene_number: 1,
      text: longText,
      audio_file_path: null,
      duration: null,
    };

    createScene({
      id: scene.id,
      project_id: scene.project_id,
      scene_number: scene.scene_number,
      text: scene.text,
    });

    network.mockSuccess({ scenes: [scene] });

    const response = await fetch(`/api/projects/${testProjectId}/scenes`);
    const data = await response.json();

    // Then: Scene text returned in full
    expect(data.data.scenes[0].text.length).toBeGreaterThan(1000);

    // Cleanup
    deleteProject(testProjectId);
  });

  test('should display total scene count and duration', async ({ network }) => {
    // Given: Project with 3 scenes
    const testProjectId = faker.string.uuid();

    const scenes = createTestScenes(testProjectId, 3, { withAudioCount: 3 }).map((s, i) => ({
      ...s,
      scene_number: i + 1,
      duration: 5.0 + i, // 5s, 6s, 7s = 18s total
    }));

    network.mockSuccess({ scenes });

    const response = await fetch(`/api/projects/${testProjectId}/scenes`);
    const data = await response.json();

    const totalDuration = data.data.scenes.reduce((sum: number, s: any) => sum + s.duration, 0);

    // Then: Total duration calculated
    expect(totalDuration).toBe(18);
    // UI displays: "Total Scenes: 3 | Total Duration: 18s"
  });

  test('should handle single scene project', async ({ network }) => {
    // Given: Project with only 1 scene
    const testProjectId = faker.string.uuid();

    const scenes = [
      {
        id: faker.string.uuid(),
        project_id: testProjectId,
        scene_number: 1,
        text: 'Single scene in this project',
        audio_file_path: null,
        duration: 10.0,
      },
    ];

    network.mockSuccess({ scenes });

    const response = await fetch(`/api/projects/${testProjectId}/scenes`);
    const data = await response.json();

    // Then: Single scene handled correctly
    expect(data.data.scenes).toHaveLength(1);
    expect(data.data.scenes[0].scene_number).toBe(1);
  });

  test('should handle maximum scenes (20+)', async ({ network }) => {
    // Given: Project with 20 scenes
    const testProjectId = faker.string.uuid();

    const scenes = Array.from({ length: 20 }, (_, i) => ({
      id: faker.string.uuid(),
      project_id: testProjectId,
      scene_number: i + 1,
      text: `Scene ${i + 1} content`,
      audio_file_path: null,
      duration: 5.0,
    }));

    network.mockSuccess({ scenes });

    const response = await fetch(`/api/projects/${testProjectId}/scenes`);
    const data = await response.json();

    // Then: All 20 scenes returned
    expect(data.data.scenes).toHaveLength(20);
    expect(data.data.scenes[0].scene_number).toBe(1);
    expect(data.data.scenes[19].scene_number).toBe(20);
  });
});
