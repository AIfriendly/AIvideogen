/**
 * Test Data Factory for Projects
 *
 * Provides factory functions to generate test project data with unique values
 * using faker. Supports overrides for specific test scenarios.
 *
 * Usage:
 *   const project = createTestProject({ topic: 'Custom topic' });
 *   const scriptResult = createMockScriptResult({ scenes: 5 });
 *
 * @module tests/factories/project.factory
 */

import { faker } from '@faker-js/faker';

export interface TestProject {
  id: string;
  name: string;
  topic: string | null;
  current_step: 'topic' | 'script' | 'voiceover' | 'rendering' | 'complete';
  status: 'draft' | 'processing' | 'completed' | 'failed';
  script_generated: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TestScene {
  sceneNumber: number;
  text: string;
  estimatedDuration?: number;
}

export interface MockScriptResult {
  scenes: TestScene[];
  attempts: number;
  validationScore: number;
}

/**
 * Creates a test project with unique, realistic data
 *
 * @param overrides - Partial project properties to override defaults
 * @returns Test project object with unique ID and data
 *
 * @example
 * // Create project with custom topic
 * const project = createTestProject({ topic: 'Why octopuses are intelligent' });
 *
 * // Create project in specific state
 * const project = createTestProject({
 *   current_step: 'script',
 *   script_generated: true
 * });
 */
export function createTestProject(overrides?: Partial<TestProject>): TestProject {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    name: faker.company.catchPhrase(),
    topic: faker.lorem.sentence({ min: 5, max: 10 }),
    current_step: 'topic',
    status: 'draft',
    script_generated: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a mock script generation result for testing
 *
 * @param options - Configuration for mock result
 * @param options.sceneCount - Number of scenes to generate (default: 3)
 * @param options.attempts - Number of generation attempts (default: 1)
 * @param options.validationScore - Quality validation score 0-100 (default: 95)
 * @param options.scenesOverride - Custom scenes array to use instead of generated ones
 * @returns Mock script result with scenes
 *
 * @example
 * // Generate mock result with 5 scenes
 * const result = createMockScriptResult({ sceneCount: 5 });
 *
 * // Use custom scenes
 * const result = createMockScriptResult({
 *   scenesOverride: [
 *     { sceneNumber: 1, text: 'Custom scene text...', estimatedDuration: 45 }
 *   ]
 * });
 */
export function createMockScriptResult(options?: {
  sceneCount?: number;
  attempts?: number;
  validationScore?: number;
  scenesOverride?: TestScene[];
}): MockScriptResult {
  const {
    sceneCount = 3,
    attempts = 1,
    validationScore = 95,
    scenesOverride,
  } = options || {};

  const scenes: TestScene[] = scenesOverride || Array.from({ length: sceneCount }, (_, i) => ({
    sceneNumber: i + 1,
    text: generateProfessionalSceneText(),
    estimatedDuration: faker.number.int({ min: 40, max: 60 }),
  }));

  return {
    scenes,
    attempts,
    validationScore,
  };
}

/**
 * Generates professional-quality scene text without AI markers
 *
 * Creates narration text that:
 * - Avoids generic AI phrases ("in today's video", "let's dive in", etc.)
 * - Uses strong narrative hooks
 * - Maintains 50-200 word length
 * - Sounds human-written and professional
 *
 * @returns Professional scene narration text
 */
function generateProfessionalSceneText(): string {
  const templates = [
    `An octopus can unscrew a jar from the inside. Not because someone taught it - because it figured it out. These eight-armed creatures solve puzzles that stump most animals, and scientists are only beginning to understand why. Their intelligence is not just remarkable, it is alien.`,

    `Unlike humans, who centralize thinking in one brain, octopuses distribute their neurons. Two-thirds of their brain cells live in their arms. Each arm can taste, touch, and make decisions independently. It is like having eight mini-brains working together, each one capable of problem-solving on its own.`,

    `This distributed intelligence lets them do extraordinary things. They can camouflage in milliseconds, mimicking not just colors but textures. They escape from locked tanks. They use tools. One species collects coconut shells and assembles them into portable shelters. That is not instinct, that is planning.`,

    `The quantum realm operates on principles that defy our everyday experience. Particles exist in multiple states simultaneously until observed. This superposition is not theoretical anymore, it is the foundation of emerging quantum technologies. The computers of tomorrow will harness this strange physics.`,

    `Photosynthesis converts sunlight into chemical energy with remarkable efficiency. Plants capture photons and use their energy to split water molecules, releasing oxygen as a byproduct. This ancient process, refined over billions of years, still outperforms our best solar panels in energy conversion.`,
  ];

  return templates[faker.number.int({ min: 0, max: templates.length - 1 })];
}

/**
 * Creates test data for database seeding
 *
 * Generates a complete project with optional scenes for integration testing.
 *
 * @param options - Configuration for test data
 * @param options.projectOverrides - Custom project properties
 * @param options.includeScenes - Whether to include scenes (default: false)
 * @param options.sceneCount - Number of scenes if includeScenes is true (default: 3)
 * @returns Object with project and optional scenes
 *
 * @example
 * // Create project with scenes for full integration test
 * const { project, scenes } = createTestData({
 *   projectOverrides: { topic: 'Quantum computing' },
 *   includeScenes: true,
 *   sceneCount: 4
 * });
 */
export function createTestData(options?: {
  projectOverrides?: Partial<TestProject>;
  includeScenes?: boolean;
  sceneCount?: number;
}): { project: TestProject; scenes?: TestScene[] } {
  const { projectOverrides, includeScenes, sceneCount = 3 } = options || {};

  const project = createTestProject(projectOverrides);

  if (includeScenes) {
    const mockResult = createMockScriptResult({ sceneCount });
    return { project, scenes: mockResult.scenes };
  }

  return { project };
}

/**
 * Helper to generate unique email addresses for user tests
 */
export function generateUniqueEmail(): string {
  return faker.internet.email();
}

/**
 * Helper to generate unique project names
 */
export function generateProjectName(): string {
  return faker.company.catchPhrase();
}
