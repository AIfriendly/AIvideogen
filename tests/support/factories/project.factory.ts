/**
 * Project Factory
 *
 * Data factory for creating test project data.
 * Uses deterministic data generation for consistent tests.
 *
 * @example
 * ```typescript
 * const project = createProject({ name: "Custom Project" });
 * ```
 */

import { Project } from '@/lib/db/types';

/**
 * Generate a unique project ID for testing
 */
export function generateProjectId(): string {
  return crypto.randomUUID();
}

/**
 * Create a test project with default or overridden values
 */
export function createProject(overrides: Partial<Project> = {}): Project {
  const now = new Date().toISOString();

  return {
    id: generateProjectId(),
    name: `Test Project ${Date.now()}`,
    topic: null,
    currentStep: 'topic',
    lastActive: now,
    createdAt: now,
    ...overrides,
  };
}

/**
 * Create multiple test projects
 */
export function createProjects(count: number, overrides: Partial<Project> = {}): Project[] {
  return Array.from({ length: count }, (_, index) =>
    createProject({
      name: `Test Project ${index + 1}`,
      ...overrides,
    })
  );
}

/**
 * Create a project with a specific name pattern (useful for sorting tests)
 */
export function createProjectWithName(name: string): Project {
  return createProject({ name });
}
