/**
 * Regression Test Data Factories
 *
 * Provides specific test scenarios for regression testing.
 * These factories create test data for edge cases, failure scenarios,
 * and partial state recovery testing.
 *
 * Usage:
 *   const scenario = createPartialProject(2, 5); // 2 of 5 scenes completed
 *   const corrupted = createCorruptedAudioScenario(projectId, 3);
 *
 * @module tests/factories/regression.factory
 */

import { faker } from '@faker-js/faker';
import { createTestProject } from './project.factory';
import { createProjectWithScenes } from './scene.factory';

/**
 * TTS Failure Scenario
 *
 * Configures how TTS should fail in tests.
 */
export interface TTSFailureScenario {
  /** Whether the kokoro-tts module is not installed */
  missingModule: boolean;
  /** Whether the TTS service process has crashed */
  serviceCrashed: boolean;
  /** Whether requests should timeout */
  timeout: boolean;
  /** Optional custom error message */
  customError?: string;
}

/**
 * Pipeline Failure Scenario
 *
 * Configures how and when the pipeline should fail.
 */
export interface PipelineFailureScenario {
  /** Which pipeline stage should fail */
  failAtStage: 'script' | 'voiceover' | 'visuals' | 'assembly';
  /** Type of failure to simulate */
  failureType: 'service_down' | 'timeout' | 'quota_exceeded' | 'corruption' | 'network_error';
  /** Optional custom error message */
  customError?: string;
  /** Whether to fail immediately or mid-operation */
  failImmediately: boolean;
}

/**
 * Partial Project State
 *
 * Represents a project with some work already completed.
 */
export interface PartialProjectState {
  /** Project ID */
  projectId: string;
  /** All scenes in the project */
  scenes: any[];
  /** IDs of scenes that have been completed */
  completedSceneIds: string[];
  /** IDs of scenes that are still pending */
  pendingSceneIds: string[];
  /** Number of completed scenes */
  completedCount: number;
  /** Total number of scenes */
  totalCount: number;
}

/**
 * Corrupted Audio Scenario
 *
 * Represents a scene with corrupted audio file.
 */
export interface CorruptedAudioScenario {
  /** Scene object with audio path */
  scene: any;
  /** Path to the corrupted audio file */
  filePath: string;
  /** Whether the file exists on disk */
  exists: boolean;
  /** Size of the file (0 for corrupted) */
  fileSize: number;
  /** Expected duration (0 for corrupted) */
  duration: number;
}

/**
 * Concurrent Request Scenario
 *
 * Represents multiple simultaneous requests to the same project.
 */
export interface ConcurrentRequest {
  /** Unique request ID */
  requestId: string;
  /** Timestamp when request was made */
  timestamp: number;
  /** Project ID being targeted */
  projectId: string;
  /** Request stage */
  stage: 'quick-create' | 'script' | 'voiceover' | 'visuals' | 'assembly';
}

/**
 * Creates a project in partial state for recovery testing
 *
 * Creates a project with some scenes completed and others pending.
 * Useful for testing resume/retry logic and partial recovery.
 *
 * @param completedScenes - Number of scenes that have been completed
 * @param totalScenes - Total number of scenes (default: 5)
 * @returns Partial project state with completed and pending scene IDs
 *
 * @example
 * // Create project with 2 of 5 scenes completed
 * const state = createPartialProject(2, 5);
 * console.log(state.completedCount); // 2
 * console.log(state.pendingSceneIds.length); // 3
 */
export function createPartialProject(
  completedScenes: number,
  totalScenes: number = 5
): PartialProjectState {
  if (completedScenes > totalScenes) {
    throw new Error('completedScenes cannot be greater than totalScenes');
  }

  if (completedScenes < 0) {
    throw new Error('completedScenes cannot be negative');
  }

  // Create project with scenes
  const { projectId, scenes } = createProjectWithScenes(totalScenes);

  // Mark first N scenes as completed
  const completedSceneIds = scenes.slice(0, completedScenes).map(s => s.id);
  const pendingSceneIds = scenes.slice(completedScenes).map(s => s.id);

  return {
    projectId,
    scenes,
    completedSceneIds,
    pendingSceneIds,
    completedCount: completedScenes,
    totalCount: totalScenes,
  };
}

/**
 * Creates corrupted audio file scenario for testing
 *
 * Creates a scene object that appears to have audio, but the file
 * is corrupted (0 bytes or invalid). Tests regeneration logic.
 *
 * @param projectId - Project ID
 * @param sceneNumber - Scene number (1-indexed)
 * @param corruptionType - Type of corruption (default: 'empty')
 * @returns Corrupted audio scenario
 *
 * @example
 * const scenario = createCorruptedAudioScenario('proj-123', 3);
 * console.log(scenario.fileSize); // 0
 * console.log(scenario.duration); // 0
 */
export function createCorruptedAudioScenario(
  projectId: string,
  sceneNumber: number,
  corruptionType: 'empty' | 'invalid' | 'missing' = 'empty'
): CorruptedAudioScenario {
  const filePath = `.cache/audio/projects/${projectId}/scene-${sceneNumber}.mp3`;

  const scene = {
    id: faker.string.uuid(),
    project_id: projectId,
    scene_number: sceneNumber,
    text: faker.lorem.paragraph(),
    audio_file_path: filePath,
    duration: 0,
    created_at: new Date().toISOString(),
  };

  switch (corruptionType) {
    case 'empty':
      return {
        scene,
        filePath,
        exists: true,
        fileSize: 0,
        duration: 0,
      };

    case 'invalid':
      return {
        scene,
        filePath,
        exists: true,
        fileSize: 100, // Has data but invalid MP3
        duration: 0,
      };

    case 'missing':
      return {
        scene,
        filePath,
        exists: false,
        fileSize: 0,
        duration: 0,
      };

    default:
      throw new Error(`Unknown corruption type: ${corruptionType}`);
  }
}

/**
 * Creates TTS service crash scenario for testing
 *
 * Configures a scenario where the TTS service crashes.
 * Tests crash detection and recovery logic.
 *
 * @param options - Crash scenario options
 * @returns TTS crash scenario configuration
 *
 * @example
 * const scenario = createTTSCrashScenario({ recoveryAttempts: 5 });
 * console.log(scenario.recoveryAttempts); // 5
 */
export function createTTSCrashScenario(options?: {
  exitCode?: number;
  errorMessage?: string;
  recoveryAttempts?: number;
  crashDuringGeneration?: boolean;
}): {
  exitCode: number;
  errorMessage: string;
  recoveryAttempts: number;
  crashDuringGeneration: boolean;
} {
  return {
    exitCode: options?.exitCode ?? 1,
    errorMessage: options?.errorMessage ?? "ModuleNotFoundError: No module named 'kokoro_tts'",
    recoveryAttempts: options?.recoveryAttempts ?? 3,
    crashDuringGeneration: options?.crashDuringGeneration ?? true,
  };
}

/**
 * Creates concurrent request scenario for testing
 *
 * Creates multiple simultaneous requests to test locking,
 * queuing, and race condition handling.
 *
 * @param count - Number of concurrent requests (default: 5)
 * @param projectId - Shared project ID (default: random)
 * @param stage - Pipeline stage (default: random)
 * @returns Array of concurrent request objects
 *
 * @example
 * const requests = createConcurrentRequests(3, 'proj-123', 'voiceover');
 * console.log(requests.length); // 3
 * console.log(requests[0].stage); // 'voiceover'
 */
export function createConcurrentRequests(
  count: number = 5,
  projectId?: string,
  stage?: ConcurrentRequest['stage']
): ConcurrentRequest[] {
  const stages: Array<ConcurrentRequest['stage']> = [
    'quick-create',
    'script',
    'voiceover',
    'visuals',
    'assembly',
  ];

  const targetProjectId = projectId ?? faker.string.uuid();
  const targetStage = stage ?? stages[faker.number.int({ min: 0, max: stages.length - 1 })];

  return Array.from({ length: count }, (_, i) => ({
    requestId: `req-${faker.string.uuid()}`,
    timestamp: Date.now() + i * 100, // Staggered by 100ms
    projectId: targetProjectId,
    stage: targetStage,
  }));
}

/**
 * Creates TTS failure scenario for testing
 *
 * Configures different types of TTS failures for comprehensive testing.
 *
 * @param options - Failure scenario options
 * @returns TTS failure scenario configuration
 *
 * @example
 * const scenario = createTTSFailureScenario({
 *   missingModule: true,
 *   customError: 'ImportError: No module named kokoro'
 * });
 */
export function createTTSFailureScenario(
  options?: Partial<TTSFailureScenario>
): TTSFailureScenario {
  return {
    missingModule: options?.missingModule ?? false,
    serviceCrashed: options?.serviceCrashed ?? false,
    timeout: options?.timeout ?? false,
    customError: options?.customError,
  };
}

/**
 * Creates pipeline failure scenario for testing
 *
 * Configures pipeline failures at specific stages for testing
 * rollback, recovery, and error handling.
 *
 * @param options - Failure scenario options
 * @returns Pipeline failure scenario configuration
 *
 * @example
 * const scenario = createPipelineFailureScenario({
 *   failAtStage: 'voiceover',
 *   failureType: 'service_down',
 *   failImmediately: false
 * });
 */
export function createPipelineFailureScenario(
  options?: Partial<PipelineFailureScenario>
): PipelineFailureScenario {
  return {
    failAtStage: options?.failAtStage ?? 'voiceover',
    failureType: options?.failureType ?? 'service_down',
    customError: options?.customError,
    failImmediately: options?.failImmediately ?? true,
  };
}

/**
 * Creates a project with inconsistent database state
 *
 * Creates a project where the database state doesn't match reality.
 * Tests for data validation and cleanup.
 *
 * @returns Project with inconsistent state
 *
 * @example
 * const inconsistent = createInconsistentProjectState();
 * console.log(inconsistent.databaseHasAudio); // true
 * console.log(inconsistent.fileExists); // false
 */
export function createInconsistentProjectState(): {
  projectId: string;
  sceneNumber: number;
  audioFilePath: string;
  databaseHasAudio: boolean;
  fileExists: boolean;
  durationInDatabase: number | null;
  fileSize: number | null;
} {
  const projectId = faker.string.uuid();
  const sceneNumber = faker.number.int({ min: 1, max: 10 });
  const audioFilePath = `.cache/audio/projects/${projectId}/scene-${sceneNumber}.mp3`;

  return {
    projectId,
    sceneNumber,
    audioFilePath,
    databaseHasAudio: true, // Database says audio exists
    fileExists: false, // But file doesn't exist
    durationInDatabase: 45.5, // Database has duration
    fileSize: null, // But no actual file
  };
}

/**
 * Creates a progress cache inconsistency scenario
 *
 * Creates a scenario where the progress cache doesn't match
 * the actual database state. Tests cache validation logic.
 *
 * @returns Progress cache inconsistency scenario
 *
 * @example
 * const scenario = createProgressCacheInconsistency();
 * console.log(scenario.progressStatus); // 'generating'
 * console.log(scenario.actualStatus); // 'error'
 */
export function createProgressCacheInconsistency(): {
  projectId: string;
  progressStatus: 'generating' | 'complete' | 'error';
  progressCurrentScene: number;
  progressTotalScenes: number;
  actualStatus: 'generating' | 'complete' | 'error';
  actualCompletedScenes: number;
} {
  return {
    projectId: faker.string.uuid(),
    progressStatus: 'generating', // Cache says still generating
    progressCurrentScene: 3,
    progressTotalScenes: 5,
    actualStatus: 'error', // But actually failed
    actualCompletedScenes: 2,
  };
}

/**
 * Creates a foreign key violation scenario
 *
 * Creates test data for testing foreign key constraint validation.
 *
 * @param violationType - Type of FK violation
 * @returns Foreign key violation test data
 *
 * @example
 * const scenario = createForeignKeyViolation('scene_without_project');
 * console.log(scenario.invalidProjectId); // 'non-existent-project'
 */
export function createForeignKeyViolation(violationType: 'scene_without_project' | 'visual_without_scene' | 'message_without_project'): {
  violationType: string;
  invalidId: string;
  validId: string;
  referencedTable: string;
  description: string;
} {
  return {
    violationType,
    invalidId: faker.string.uuid(), // Random UUID that doesn't exist
    validId: faker.string.uuid(),
    referencedTable:
      violationType === 'scene_without_project'
        ? 'projects'
        : violationType === 'visual_without_scene'
          ? 'scenes'
          : 'projects',
    description: `Attempt to create ${violationType} with non-existent foreign key`,
  };
}
