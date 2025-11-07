/**
 * Database Fixture Module for Story 2.3 Tests
 *
 * Provides reusable, composable database setup functions following the
 * Fixture Architecture pattern from TEA knowledge base.
 *
 * Pattern: Pure function → Fixture → test consumption
 *
 * Benefits:
 * - DRY: Eliminate repeated beforeEach setup code
 * - Composability: Combine fixtures for complex test scenarios
 * - Clarity: Explicit setup in test body, not hidden in beforeEach
 * - Flexibility: Override default values per test
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import db from '@/lib/db/client';

/**
 * Project Factory - Pure function to create test project data
 *
 * @param overrides - Partial project data to override defaults
 * @returns Complete project data object
 */
export const createTestProject = (overrides: Partial<{
  id: string;
  name: string;
  topic: string;
  current_step: string;
  status: string;
  voice_id: string | null;
  voice_selected: boolean;
}> = {}) => {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test Project',
    topic: 'Mars colonization',
    current_step: 'voice',
    status: 'draft',
    voice_id: null,
    voice_selected: false,
    ...overrides,
  };
};

/**
 * Database Cleanup Fixture - Removes all test data
 *
 * Use at the beginning of tests to ensure clean state
 */
export const cleanDatabase = () => {
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM projects');
};

/**
 * Project Setup Fixture - Creates a test project in database
 *
 * Combines cleanDatabase() with project creation.
 * Use this as the primary fixture for most tests.
 *
 * @param projectData - Partial project data to override defaults
 * @returns The created project data
 *
 * @example
 * ```typescript
 * it('should save voice selection', async () => {
 *   const project = setupProjectFixture({ topic: 'Space exploration' });
 *   // Test implementation uses project.id
 * });
 * ```
 */
export const setupProjectFixture = (projectData: Partial<ReturnType<typeof createTestProject>> = {}) => {
  // Clean database first
  cleanDatabase();

  // Create project with defaults + overrides
  const project = createTestProject(projectData);

  // Insert into database
  db.prepare(`
    INSERT INTO projects (id, name, topic, current_step, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(project.id, project.name, project.topic, project.current_step, project.status);

  return project;
};

/**
 * Project with Voice Fixture - Creates a project with voice already selected
 *
 * Use for tests that need to start from voice-selected state
 *
 * @param projectData - Partial project data to override defaults
 * @param voiceId - The voice ID to set (default: 'sarah')
 * @returns The created project data with voice_id set
 *
 * @example
 * ```typescript
 * it('should navigate to script generation', async () => {
 *   const project = setupProjectWithVoiceFixture({}, 'james');
 *   // Test starts with voice already selected
 * });
 * ```
 */
export const setupProjectWithVoiceFixture = (
  projectData: Partial<ReturnType<typeof createTestProject>> = {},
  voiceId: string = 'sarah'
) => {
  const project = setupProjectFixture({
    ...projectData,
    voice_id: voiceId,
    voice_selected: true,
    current_step: 'script-generation',
  });

  // Update database to include voice data
  db.prepare(`
    UPDATE projects
    SET voice_id = ?,
        voice_selected = 1,
        current_step = 'script-generation'
    WHERE id = ?
  `).run(voiceId, project.id);

  return { ...project, voice_id: voiceId, voice_selected: true };
};

/**
 * Multiple Projects Fixture - Creates multiple test projects
 *
 * Use for tests that need to verify multi-project scenarios
 *
 * @param count - Number of projects to create
 * @returns Array of created project data
 *
 * @example
 * ```typescript
 * it('should handle multiple projects', async () => {
 *   const projects = setupMultipleProjectsFixture(3);
 *   // Test with projects[0], projects[1], projects[2]
 * });
 * ```
 */
export const setupMultipleProjectsFixture = (count: number = 2) => {
  cleanDatabase();

  const projects = [];
  for (let i = 0; i < count; i++) {
    const project = createTestProject({
      id: `00000000-0000-0000-0000-00000000000${i + 1}`,
      name: `Test Project ${i + 1}`,
      topic: `Topic ${i + 1}`,
    });

    db.prepare(`
      INSERT INTO projects (id, name, topic, current_step, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(project.id, project.name, project.topic, project.current_step, project.status);

    projects.push(project);
  }

  return projects;
};
