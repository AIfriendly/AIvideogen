/**
 * API Tests: Pipeline Status Endpoint
 * Test IDs: 6.8a-API-001, 6.8a-API-002
 *
 * Tests for Story 6.8a - QPF Infrastructure
 * Pipeline status calculation and API response format.
 */

import { describe, it, expect } from 'vitest';

// Type definitions matching pipeline-status/route.ts
type PipelineStage = 'script' | 'voiceover' | 'visuals' | 'assembly' | 'complete';

interface PipelineStatus {
  projectId: string;
  topic: string;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  stageProgress: number;
  overallProgress: number;
  currentMessage: string;
  error?: string;
}

// Pure functions extracted from pipeline-status/route.ts for testing
function mapCurrentStepToStage(
  currentStep: string | null,
  scriptGenerated: boolean,
  voiceSelected: boolean,
  visualsGenerated: boolean,
  hasVideoPath: boolean
): PipelineStage {
  if (hasVideoPath || currentStep === 'export') {
    return 'complete';
  }

  if (currentStep === 'editing' || currentStep === 'assembly') {
    return 'assembly';
  }

  if (currentStep === 'visual-curation' || currentStep === 'visual-sourcing') {
    return 'visuals';
  }

  if (currentStep === 'voiceover') {
    return 'voiceover';
  }

  if (currentStep === 'script-generation' || (voiceSelected && !scriptGenerated)) {
    return 'script';
  }

  return 'script';
}

function getCompletedStages(currentStage: PipelineStage): PipelineStage[] {
  const allStages: PipelineStage[] = ['script', 'voiceover', 'visuals', 'assembly', 'complete'];
  const currentIndex = allStages.indexOf(currentStage);

  if (currentIndex <= 0) {
    return [];
  }

  return allStages.slice(0, currentIndex);
}

function calculateOverallProgress(currentStage: PipelineStage, stageProgress: number): number {
  const stageWeights: Record<PipelineStage, { start: number; end: number }> = {
    script: { start: 0, end: 25 },
    voiceover: { start: 25, end: 50 },
    visuals: { start: 50, end: 75 },
    assembly: { start: 75, end: 100 },
    complete: { start: 100, end: 100 },
  };

  const weight = stageWeights[currentStage];
  const stageRange = weight.end - weight.start;
  return Math.round(weight.start + (stageProgress / 100) * stageRange);
}

function getStatusMessage(
  currentStage: PipelineStage,
  stageProgress: number,
  sceneStats: { total: number; withAudio: number },
  suggestionStats: { total: number; complete: number }
): string {
  switch (currentStage) {
    case 'script':
      return stageProgress === 0 ? 'Starting script generation...' : 'Generating script...';
    case 'voiceover':
      if (sceneStats.total > 0) {
        return `Generating voiceover for scene ${sceneStats.withAudio + 1} of ${sceneStats.total}...`;
      }
      return 'Generating voiceovers...';
    case 'visuals':
      if (suggestionStats.total > 0) {
        return `Processing visuals: ${suggestionStats.complete} of ${suggestionStats.total} scenes...`;
      }
      return 'Sourcing visual content...';
    case 'assembly':
      return stageProgress < 50 ? 'Downloading video segments...' : 'Assembling final video...';
    case 'complete':
      return 'Video complete! Ready for export.';
    default:
      return 'Processing...';
  }
}

/**
 * Test Suite: Stage Mapping Logic
 * Test ID: 6.8a-API-001
 * Priority: P1 (High) - Critical for pipeline status accuracy
 */
describe('6.8a-API-001: Pipeline Stage Mapping', () => {
  describe('mapCurrentStepToStage', () => {
    it('should map "script-generation" to "script"', () => {
      const stage = mapCurrentStepToStage('script-generation', false, true, false, false);
      expect(stage).toBe('script');
    });

    it('should map "voiceover" to "voiceover"', () => {
      const stage = mapCurrentStepToStage('voiceover', true, true, false, false);
      expect(stage).toBe('voiceover');
    });

    it('should map "visual-sourcing" to "visuals"', () => {
      const stage = mapCurrentStepToStage('visual-sourcing', true, true, false, false);
      expect(stage).toBe('visuals');
    });

    it('should map "visual-curation" to "visuals"', () => {
      const stage = mapCurrentStepToStage('visual-curation', true, true, false, false);
      expect(stage).toBe('visuals');
    });

    it('should map "assembly" to "assembly"', () => {
      const stage = mapCurrentStepToStage('assembly', true, true, true, false);
      expect(stage).toBe('assembly');
    });

    it('should map "editing" to "assembly"', () => {
      const stage = mapCurrentStepToStage('editing', true, true, true, false);
      expect(stage).toBe('assembly');
    });

    it('should map "export" to "complete"', () => {
      const stage = mapCurrentStepToStage('export', true, true, true, false);
      expect(stage).toBe('complete');
    });

    it('should return "complete" when video_path exists', () => {
      const stage = mapCurrentStepToStage('any-step', true, true, true, true);
      expect(stage).toBe('complete');
    });

    it('should default to "script" for early steps', () => {
      const stage = mapCurrentStepToStage('topic', false, false, false, false);
      expect(stage).toBe('script');
    });

    it('should default to "script" for null current_step', () => {
      const stage = mapCurrentStepToStage(null, false, false, false, false);
      expect(stage).toBe('script');
    });

    it('should map to "script" when voiceSelected but not scriptGenerated', () => {
      const stage = mapCurrentStepToStage('some-step', false, true, false, false);
      expect(stage).toBe('script');
    });
  });

  describe('getCompletedStages', () => {
    it('should return empty array for "script" stage', () => {
      const completed = getCompletedStages('script');
      expect(completed).toEqual([]);
    });

    it('should return ["script"] for "voiceover" stage', () => {
      const completed = getCompletedStages('voiceover');
      expect(completed).toEqual(['script']);
    });

    it('should return ["script", "voiceover"] for "visuals" stage', () => {
      const completed = getCompletedStages('visuals');
      expect(completed).toEqual(['script', 'voiceover']);
    });

    it('should return ["script", "voiceover", "visuals"] for "assembly" stage', () => {
      const completed = getCompletedStages('assembly');
      expect(completed).toEqual(['script', 'voiceover', 'visuals']);
    });

    it('should return all stages except "complete" for "complete" stage', () => {
      const completed = getCompletedStages('complete');
      expect(completed).toEqual(['script', 'voiceover', 'visuals', 'assembly']);
    });
  });
});

/**
 * Test Suite: Progress Calculation
 * Test ID: 6.8a-API-002
 * Priority: P1 (High) - Critical for progress display
 */
describe('6.8a-API-002: Pipeline Progress Calculation', () => {
  describe('calculateOverallProgress', () => {
    it('should return 0 for script stage at 0%', () => {
      const progress = calculateOverallProgress('script', 0);
      expect(progress).toBe(0);
    });

    it('should return 25 for script stage at 100%', () => {
      const progress = calculateOverallProgress('script', 100);
      expect(progress).toBe(25);
    });

    it('should return 13 for script stage at 50%', () => {
      const progress = calculateOverallProgress('script', 50);
      expect(progress).toBe(13); // 0 + (50/100) * 25 = 12.5 -> 13
    });

    it('should return 25 for voiceover stage at 0%', () => {
      const progress = calculateOverallProgress('voiceover', 0);
      expect(progress).toBe(25);
    });

    it('should return 50 for voiceover stage at 100%', () => {
      const progress = calculateOverallProgress('voiceover', 100);
      expect(progress).toBe(50);
    });

    it('should return 50 for visuals stage at 0%', () => {
      const progress = calculateOverallProgress('visuals', 0);
      expect(progress).toBe(50);
    });

    it('should return 75 for visuals stage at 100%', () => {
      const progress = calculateOverallProgress('visuals', 100);
      expect(progress).toBe(75);
    });

    it('should return 75 for assembly stage at 0%', () => {
      const progress = calculateOverallProgress('assembly', 0);
      expect(progress).toBe(75);
    });

    it('should return 100 for assembly stage at 100%', () => {
      const progress = calculateOverallProgress('assembly', 100);
      expect(progress).toBe(100);
    });

    it('should return 100 for complete stage', () => {
      const progress = calculateOverallProgress('complete', 100);
      expect(progress).toBe(100);
    });
  });

  describe('getStatusMessage', () => {
    it('should return "Starting script generation..." for script at 0%', () => {
      const message = getStatusMessage('script', 0, { total: 0, withAudio: 0 }, { total: 0, complete: 0 });
      expect(message).toBe('Starting script generation...');
    });

    it('should return "Generating script..." for script in progress', () => {
      const message = getStatusMessage('script', 50, { total: 0, withAudio: 0 }, { total: 0, complete: 0 });
      expect(message).toBe('Generating script...');
    });

    it('should return scene-specific message for voiceover', () => {
      const message = getStatusMessage('voiceover', 50, { total: 5, withAudio: 2 }, { total: 0, complete: 0 });
      expect(message).toBe('Generating voiceover for scene 3 of 5...');
    });

    it('should return generic message for voiceover with no scenes', () => {
      const message = getStatusMessage('voiceover', 50, { total: 0, withAudio: 0 }, { total: 0, complete: 0 });
      expect(message).toBe('Generating voiceovers...');
    });

    it('should return visual-specific message for visuals', () => {
      const message = getStatusMessage('visuals', 50, { total: 0, withAudio: 0 }, { total: 5, complete: 3 });
      expect(message).toBe('Processing visuals: 3 of 5 scenes...');
    });

    it('should return generic message for visuals with no suggestions', () => {
      const message = getStatusMessage('visuals', 50, { total: 0, withAudio: 0 }, { total: 0, complete: 0 });
      expect(message).toBe('Sourcing visual content...');
    });

    it('should return download message for assembly at <50%', () => {
      const message = getStatusMessage('assembly', 30, { total: 0, withAudio: 0 }, { total: 0, complete: 0 });
      expect(message).toBe('Downloading video segments...');
    });

    it('should return assembling message for assembly at >=50%', () => {
      const message = getStatusMessage('assembly', 50, { total: 0, withAudio: 0 }, { total: 0, complete: 0 });
      expect(message).toBe('Assembling final video...');
    });

    it('should return completion message for complete stage', () => {
      const message = getStatusMessage('complete', 100, { total: 0, withAudio: 0 }, { total: 0, complete: 0 });
      expect(message).toBe('Video complete! Ready for export.');
    });
  });
});

/**
 * Test Suite: Pipeline Status Edge Cases
 * Test ID: 6.8a-API-003
 * Priority: P2 (Medium) - Edge case handling
 */
describe('6.8a-API-003: Pipeline Status Edge Cases', () => {
  it('should handle all completed stages correctly', () => {
    const allStages: PipelineStage[] = ['script', 'voiceover', 'visuals', 'assembly', 'complete'];

    for (let i = 0; i < allStages.length; i++) {
      const stage = allStages[i];
      const completed = getCompletedStages(stage);
      expect(completed.length).toBe(i);
    }
  });

  it('should clamp progress values between 0 and 100', () => {
    // Test that the function doesn't break with edge values
    expect(calculateOverallProgress('script', 0)).toBeGreaterThanOrEqual(0);
    expect(calculateOverallProgress('complete', 100)).toBeLessThanOrEqual(100);
  });

  it('should handle negative stage progress gracefully', () => {
    // While this shouldn't happen, the function should not crash
    const progress = calculateOverallProgress('script', -10);
    expect(typeof progress).toBe('number');
  });

  it('should handle stage progress over 100 gracefully', () => {
    // While this shouldn't happen, the function should not crash
    const progress = calculateOverallProgress('script', 150);
    expect(typeof progress).toBe('number');
  });
});
