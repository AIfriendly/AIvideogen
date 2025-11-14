/**
 * Test Data Factory for Scenes
 *
 * Provides factory functions for creating mock scene data with audio file paths,
 * durations, and other properties needed for voiceover integration testing.
 *
 * @module tests/factories/scene.factory
 */

import { faker } from '@faker-js/faker';

export interface TestScene {
  id: string;
  project_id: string;
  scene_number: number;
  text: string;
  audio_file_path: string | null;
  duration: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface SceneWithAudio extends TestScene {
  audio_file_path: string;
  duration: number;
}

/**
 * Creates a test scene with realistic data
 *
 * @param overrides - Partial scene properties to override defaults
 * @returns Test scene object with unique ID and data
 *
 * @example
 * // Create scene without audio
 * const scene = createTestScene({ project_id: 'uuid-123', scene_number: 1 });
 *
 * // Create scene with audio
 * const scene = createTestScene({
 *   project_id: 'uuid-123',
 *   scene_number: 2,
 *   audio_file_path: '.cache/audio/projects/uuid-123/scene-2.mp3',
 *   duration: 15.5
 * });
 */
export function createTestScene(overrides?: Partial<TestScene>): TestScene {
  const now = new Date().toISOString();
  const projectId = overrides?.project_id || faker.string.uuid();
  const sceneNumber = overrides?.scene_number || 1;

  return {
    id: faker.string.uuid(),
    project_id: projectId,
    scene_number: sceneNumber,
    text: generateSceneText(),
    audio_file_path: null, // Default: no audio
    duration: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a scene with audio (for testing completed voiceover generation)
 *
 * @param projectId - Project UUID
 * @param sceneNumber - Scene number (1-based)
 * @param overrides - Additional overrides
 * @returns Scene with audio file path and duration
 */
export function createSceneWithAudio(
  projectId: string,
  sceneNumber: number,
  overrides?: Partial<TestScene>
): SceneWithAudio {
  const text = generateSceneText();
  const duration = estimateDuration(text);
  const audioFilePath = `.cache/audio/projects/${projectId}/scene-${sceneNumber}.mp3`;

  return createTestScene({
    project_id: projectId,
    scene_number: sceneNumber,
    text,
    audio_file_path: audioFilePath,
    duration,
    ...overrides,
  }) as SceneWithAudio;
}

/**
 * Creates multiple scenes for a project
 *
 * @param projectId - Project UUID
 * @param count - Number of scenes to create
 * @param options - Configuration options
 * @returns Array of test scenes
 *
 * @example
 * // Create 3 scenes with no audio
 * const scenes = createTestScenes('project-uuid', 3);
 *
 * // Create 3 scenes, first 2 with audio, last without
 * const scenes = createTestScenes('project-uuid', 3, { withAudioCount: 2 });
 *
 * // Create all scenes with audio
 * const scenes = createTestScenes('project-uuid', 3, { withAudioCount: 3 });
 */
export function createTestScenes(
  projectId: string,
  count: number,
  options?: {
    withAudioCount?: number;
    textOverrides?: string[];
  }
): TestScene[] {
  const { withAudioCount = 0, textOverrides } = options || {};

  return Array.from({ length: count }, (_, index) => {
    const sceneNumber = index + 1;
    const hasAudio = index < withAudioCount;
    const text = textOverrides?.[index] || generateSceneText();

    if (hasAudio) {
      return createSceneWithAudio(projectId, sceneNumber, {
        text,
      });
    }

    return createTestScene({
      project_id: projectId,
      scene_number: sceneNumber,
      text,
    });
  });
}

/**
 * Generates realistic professional scene narration text
 */
function generateSceneText(): string {
  const templates = [
    `An octopus can unscrew a jar from the inside. Not because someone taught it - because it figured it out. These eight-armed creatures solve puzzles that stump most animals, and scientists are only beginning to understand why. Their intelligence is not just remarkable, it is alien.`,

    `Unlike humans, who centralize thinking in one brain, octopuses distribute their neurons. Two-thirds of their brain cells live in their arms. Each arm can taste, touch, and make decisions independently. It is like having eight mini-brains working together.`,

    `This distributed intelligence lets them do extraordinary things. They can camouflage in milliseconds, mimicking not just colors but textures. They escape from locked tanks. They use tools. One species collects coconut shells and assembles them into portable shelters.`,

    `The quantum realm operates on principles that defy our everyday experience. Particles exist in multiple states simultaneously until observed. This superposition is not theoretical anymore, it is the foundation of emerging quantum technologies.`,

    `Photosynthesis converts sunlight into chemical energy with remarkable efficiency. Plants capture photons and use their energy to split water molecules, releasing oxygen as a byproduct. This ancient process still outperforms our best solar panels.`,

    `Black holes bend space and time so severely that nothing can escape once past the event horizon. Not even light. This makes them invisible, except for the distortion they cause in surrounding matter and radiation.`,

    `The human brain contains roughly 86 billion neurons, each connected to thousands of others through synapses. This creates a network more complex than the entire internet, capable of consciousness, creativity, and abstract thought.`,

    `Deep sea creatures have evolved bioluminescence to survive in total darkness. They generate their own light through chemical reactions, using it to attract prey, communicate with mates, and evade predators in the abyss.`,
  ];

  return templates[faker.number.int({ min: 0, max: templates.length - 1 })];
}

/**
 * Estimates audio duration based on text length
 * Assumes ~150 words per minute speaking rate
 */
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 150;
  const durationInMinutes = words / wordsPerMinute;
  const durationInSeconds = durationInMinutes * 60;

  // Add some variance for realism
  const variance = faker.number.float({ min: -1, max: 1 });
  return Math.max(1, durationInSeconds + variance);
}

/**
 * Test data for scene-related scenarios
 */
export const SceneTestData = {
  /** Valid audio file path patterns */
  validAudioPaths: [
    '.cache/audio/projects/abc-123/scene-1.mp3',
    '.cache/audio/projects/def-456/scene-2.mp3',
    '.cache/audio/projects/ghi-789/scene-10.mp3',
  ],

  /** Invalid audio file paths for security testing */
  invalidAudioPaths: [
    '../../../etc/passwd', // Path traversal
    '..\\..\\windows\\system32\\config', // Windows path traversal
    '.cache/audio/../../secrets.txt', // Relative path escape
    '/etc/passwd', // Absolute path
    'C:\\Windows\\System32\\config', // Windows absolute path
    '.cache/audio/projects/../../../etc/passwd', // Multiple traversals
    '.cache/audio/projects/test/scene-1.txt', // Wrong extension
    '.cache/audio/projects/test/scene-1.exe', // Executable
    'audio/projects/test/scene-1.mp3', // Missing .cache prefix
  ],

  /** URL-encoded attack payloads */
  urlEncodedAttacks: [
    '.cache/audio/projects/%2E%2E%2F%2E%2E%2Fetc/passwd', // ../.. URL-encoded
    '.cache/audio/projects/..%2F..%2Fsecrets.txt',
    '.cache/audio/projects/%2e%2e%5c%2e%2e%5cwindows',
  ],

  /** Scene text edge cases */
  textEdgeCases: {
    empty: '',
    whitespace: '   \n\t  ',
    veryShort: 'Hi.',
    veryLong: 'Lorem ipsum dolor sit amet. '.repeat(200), // ~1000 words
    specialCharacters: 'Testing with symbols: $100, 50%, @user, #hashtag, & more!',
    unicode: '你好世界 مرحبا Здравствуй שלום',
    markdown: '**Bold** and _italic_ text with [links](http://example.com)',
  },

  /** Duration edge cases */
  durationEdgeCases: {
    tooShort: 0.1,
    reasonable: 15.5,
    long: 120.0,
    veryLong: 600.0, // 10 minutes
  },
};

/**
 * Creates a project with scenes for integration testing
 *
 * @param sceneCount - Total number of scenes
 * @param withAudioCount - Number of scenes that should have audio
 * @returns Object with project ID and scenes
 *
 * @example
 * // Create project with 3 scenes, all without audio
 * const { projectId, scenes } = createProjectWithScenes(3);
 *
 * // Create project with 3 scenes, first 2 with audio
 * const { projectId, scenes } = createProjectWithScenes(3, 2);
 */
export function createProjectWithScenes(
  sceneCount: number,
  withAudioCount: number = 0
): { projectId: string; scenes: TestScene[] } {
  const projectId = faker.string.uuid();
  const scenes = createTestScenes(projectId, sceneCount, { withAudioCount });

  return { projectId, scenes };
}
