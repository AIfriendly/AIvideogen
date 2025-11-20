/**
 * Scenes Test Fixtures for Story 4.1
 * Following TEA fixture-architecture.md best practices
 *
 * Pattern: Pure function → Fixture → auto-cleanup
 * Provides isolated database state with scene-specific helpers
 */

import { test as base } from 'vitest';
import { createProject, createScene, deleteProject } from '@/lib/db/queries';
import { createTestScene, createTestScenes, TestScene } from '../factories/scene.factory';
import { faker } from '@faker-js/faker';

/**
 * Type definitions for fixture data
 */
export interface ProjectFixture {
  id: string;
  name: string;
  cleanup: () => void;
}

export interface ScenesFixture {
  projectId: string;
  scenes: TestScene[];
  cleanup: () => void;
}

/**
 * Pure function: Create and seed a test project
 */
export function seedTestProject(name?: string): ProjectFixture {
  const project = createProject(name || `Test Project ${faker.string.nanoid(6)}`);

  return {
    id: project.id,
    name: project.name,
    cleanup: () => {
      try {
        deleteProject(project.id);
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

/**
 * Pure function: Seed scenes for a project
 */
export function seedTestScenes(
  projectId: string,
  count: number,
  options?: { withAudioCount?: number }
): TestScene[] {
  const scenes = createTestScenes(projectId, count, options);

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

  return scenes;
}

/**
 * Fixture: Test project with auto-cleanup
 * Use this as the base fixture for scenes tests
 */
export const test = base.extend<{
  testProject: ProjectFixture;
  seedScenes: (count: number, options?: { withAudioCount?: number }) => TestScene[];
  createIsolatedProject: (name?: string) => ProjectFixture;
}>({
  // Fixture 1: Base test project
  testProject: async ({}, use) => {
    const project = seedTestProject();

    await use(project);

    // Auto-cleanup
    project.cleanup();
  },

  // Fixture 2: Scene seeding helper (uses testProject)
  seedScenes: async ({ testProject }, use) => {
    const seededScenes: TestScene[] = [];

    const seedScenes = (count: number, options?: { withAudioCount?: number }) => {
      const scenes = seedTestScenes(testProject.id, count, options);
      seededScenes.push(...scenes);
      return scenes;
    };

    await use(seedScenes);

    // Cleanup handled by project deletion (cascade)
  },

  // Fixture 3: Create additional isolated projects
  createIsolatedProject: async ({}, use) => {
    const projects: ProjectFixture[] = [];

    const createIsolatedProject = (name?: string) => {
      const project = seedTestProject(name);
      projects.push(project);
      return project;
    };

    await use(createIsolatedProject);

    // Auto-cleanup all created projects
    projects.forEach((p) => p.cleanup());
  },
});

/**
 * Export expect and describe for convenience
 */
export { expect, describe } from 'vitest';

/**
 * Helper: Create scenes in random order for ordering tests
 */
export function createScenesInRandomOrder(projectId: string, numbers: number[]): TestScene[] {
  return numbers.map((num) => {
    const scene = createTestScene({
      project_id: projectId,
      scene_number: num,
      text: `Scene ${num} content`,
    });

    createScene({
      id: scene.id,
      project_id: scene.project_id,
      scene_number: scene.scene_number,
      text: scene.text,
    });

    return scene;
  });
}
