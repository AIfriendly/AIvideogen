/**
 * In-Memory Progress Cache for Voiceover Generation
 *
 * Stores generation progress state for polling endpoint.
 * Uses Map for fast lookups and automatic cleanup.
 */

export interface VoiceoverProgress {
  projectId: string;
  status: 'idle' | 'generating' | 'complete' | 'error';
  currentScene: number;
  totalScenes: number;
  progress: number; // 0-100
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

// In-memory cache of progress states
const progressCache = new Map<string, VoiceoverProgress>();

// Auto-cleanup interval (1 hour)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Get progress state for a project
 */
export function getProgress(projectId: string): VoiceoverProgress | null {
  return progressCache.get(projectId) || null;
}

/**
 * Set progress state for a project
 */
export function setProgress(projectId: string, progress: VoiceoverProgress): void {
  progressCache.set(projectId, progress);
}

/**
 * Update progress during generation
 */
export function updateProgress(projectId: string, currentScene: number, totalScenes: number): void {
  const existing = progressCache.get(projectId);
  if (!existing) {
    return;
  }

  const progress = Math.round((currentScene / totalScenes) * 100);
  progressCache.set(projectId, {
    ...existing,
    currentScene,
    totalScenes,
    progress,
    status: 'generating'
  });
}

/**
 * Mark generation as complete
 */
export function completeProgress(projectId: string): void {
  const existing = progressCache.get(projectId);
  if (!existing) {
    return;
  }

  progressCache.set(projectId, {
    ...existing,
    status: 'complete',
    progress: 100,
    completedAt: new Date()
  });
}

/**
 * Mark generation as failed
 */
export function failProgress(projectId: string, errorMessage: string): void {
  const existing = progressCache.get(projectId);
  if (!existing) {
    return;
  }

  progressCache.set(projectId, {
    ...existing,
    status: 'error',
    errorMessage,
    completedAt: new Date()
  });
}

/**
 * Delete progress state for a project
 */
export function deleteProgress(projectId: string): void {
  progressCache.delete(projectId);
}

/**
 * Clean up old progress states
 */
export function cleanupOldProgress(): void {
  const now = Date.now();
  for (const [projectId, progress] of progressCache.entries()) {
    const age = now - progress.startedAt.getTime();
    if (age > MAX_AGE_MS) {
      progressCache.delete(projectId);
    }
  }
}

// Set up automatic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldProgress, CLEANUP_INTERVAL_MS);
}
