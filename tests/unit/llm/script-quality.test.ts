/**
 * Unit Tests for Script Quality Validation
 *
 * Tests the quality validation logic that detects AI markers, validates TTS readiness,
 * checks narrative flow, and identifies robotic patterns.
 *
 * Acceptance Criteria Coverage:
 * - AC4: Scene text contains ONLY spoken narration (no markdown, no meta-text)
 * - AC5: Scripts sound professional and human-written, NOT AI-generated
 * - AC6: Scripts avoid generic AI phrases
 * - AC8: Scripts have strong narrative hooks
 * - AC9: Scripts use natural, varied language
 * - AC10: Quality validation rejects robotic or bland scripts
 * - AC14: Validation rejects scenes containing markdown or formatting characters
 *
 * Task Coverage: Story 2.4, Task 2 - Implement Quality Validation Function
 * Task Coverage: Story 2.4, Task 9 - Unit Testing
 *
 * @module tests/unit/llm/script-quality.test
 */

import { describe, it, expect } from 'vitest';
import {
  validateScriptQuality,
  getWordCount,
  hasQualityMarkers,
  type Scene,
  type ValidationResult
} from '@/lib/llm/validate-script-quality';

describe('Script Quality Validation - Unit Tests', () => {
  describe('AC6 & AC10: AI Detection Marker Validation', () => {
    it('should detect banned phrase "in today\'s video"', () => {
      // Given: Script with banned phrase
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "In today's video, we're going to explore quantum physics. It's fascinating."
        }
      ];
      // When: Validating quality
      const result = validateScriptQuality(scenes);
      // Then: Should fail with AI marker detected
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('AI detection markers'))).toBe(true);
      expect(result.issues.some(issue => issue.includes('today\'s video'))).toBe(true);
    });

    it('should detect banned phrase "let\'s dive in"', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "Let's dive in and explore this amazing topic together."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('dive in'))).toBe(true);
    });

    it('should detect banned phrase "stay tuned"', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "This is incredible. Stay tuned for more exciting content."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('stay tuned'))).toBe(true);
    });

    it('should detect multiple banned phrases', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "Have you ever wondered about this? Let's dive in and explore."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('AI detection markers'))).toBe(true);
    });

    it('should pass validation when no banned phrases present', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "An octopus can unscrew a jar from the inside. Not because someone taught it - because it figured it out. These eight-armed creatures solve puzzles that stump most animals."
        },
        {
          sceneNumber: 2,
          text: "Unlike humans, who centralize thinking in one brain, octopuses distribute their neurons. Two-thirds of their brain cells live in their arms."
        },
        {
          sceneNumber: 3,
          text: "This distributed intelligence lets them do extraordinary things. They can camouflage in milliseconds, mimicking not just colors but textures."
        }
      ];
      const result = validateScriptQuality(scenes);
      // Should not have AI marker issues
      expect(result.issues.some(issue => issue.includes('AI detection markers'))).toBe(false);
    });
  });

  describe('AC8: Generic Opening Detection', () => {
    it('should detect "Have you ever wondered" opening', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "Have you ever wondered why the sky is blue? Let me explain."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('Generic opening detected'))).toBe(true);
    });

    it('should detect "Imagine a world where" opening', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "Imagine a world where robots do all the work for us."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('Generic opening'))).toBe(true);
    });

    it('should accept strong narrative hooks', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "An octopus can unscrew a jar from the inside. These eight-armed creatures solve puzzles that stump most animals, and scientists are only beginning to understand why."
        },
        {
          sceneNumber: 2,
          text: "Unlike humans, octopuses distribute their neurons across their body."
        },
        {
          sceneNumber: 3,
          text: "This unique intelligence allows them to perform remarkable feats."
        }
      ];
      const result = validateScriptQuality(scenes);
      // Should not have generic opening issue
      expect(result.issues.some(issue => issue.includes('Generic opening'))).toBe(false);
    });
  });

  describe('AC4 & AC14: TTS Readiness Validation', () => {
    it('should reject markdown bold formatting', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "This is **bold text** and this is normal text."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('markdown character'))).toBe(true);
    });

    it('should reject markdown italic formatting', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "This is *italic text* and this is normal text."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('markdown character'))).toBe(true);
    });

    it('should reject markdown headers', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "# This is a header\nThis is the content."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('markdown character'))).toBe(true);
    });

    it('should reject scene labels', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "Scene 1: The octopus opens the jar."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('meta-label'))).toBe(true);
    });

    it('should reject narrator labels', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "Narrator: This is what happens next."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('meta-label'))).toBe(true);
    });

    it('should reject bracketed instructions', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "This is the narration [pause] and it continues here."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('meta-label'))).toBe(true);
    });

    it('should reject URLs', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "Check out https://example.com for more information."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('URL'))).toBe(true);
    });

    it('should accept clean narration text', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "The octopus is one of the most intelligent invertebrates on Earth. It can solve complex puzzles and escape from locked containers."
        },
        {
          sceneNumber: 2,
          text: "Scientists have discovered that octopuses can use tools and plan ahead."
        },
        {
          sceneNumber: 3,
          text: "This remarkable creature continues to surprise researchers with its abilities."
        }
      ];
      const result = validateScriptQuality(scenes);
      // Should not have TTS readiness issues
      expect(result.issues.some(issue => issue.includes('markdown'))).toBe(false);
      expect(result.issues.some(issue => issue.includes('meta-label'))).toBe(false);
      expect(result.issues.some(issue => issue.includes('URL'))).toBe(false);
    });
  });

  describe('AC9: Robotic Pattern Detection', () => {
    it('should detect excessive passive voice', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "The jar was opened by the octopus. The puzzle was solved by the creature. The tank was escaped from by it."
        },
        {
          sceneNumber: 2,
          text: "Research is being conducted by scientists. Intelligence is demonstrated by the animal."
        },
        {
          sceneNumber: 3,
          text: "Tools are used by octopuses. Planning is done by them ahead of time."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.issues.some(issue => issue.includes('passive voice'))).toBe(true);
    });

    it('should detect repetitive sentence structure', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "The octopus is smart. The octopus is clever. The octopus is intelligent. The octopus is bright."
        },
        {
          sceneNumber: 2,
          text: "It solves puzzles. It opens jars. It escapes tanks. It uses tools."
        },
        {
          sceneNumber: 3,
          text: "Scientists study it. Researchers test it. Biologists observe it."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.issues.some(issue => issue.includes('sentence length'))).toBe(true);
    });
  });

  describe('AC2 & AC3: Scene Count and Length Validation', () => {
    it('should reject scripts with too few scenes', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "This is a scene with enough words to meet the minimum requirement of fifty words that are needed for proper validation."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('Too few scenes'))).toBe(true);
    });

    it('should warn about too many scenes', () => {
      const scenes: Scene[] = Array.from({ length: 8 }, (_, i) => ({
        sceneNumber: i + 1,
        text: "This is a scene with enough words to meet the minimum requirement of fifty words that are needed for proper validation and testing purposes."
      }));
      const result = validateScriptQuality(scenes);
      expect(result.issues.some(issue => issue.includes('Too many scenes'))).toBe(true);
    });

    it('should accept 3-5 scenes', () => {
      const scenes: Scene[] = Array.from({ length: 4 }, (_, i) => ({
        sceneNumber: i + 1,
        text: "This is a professional scene with varied sentence structure and enough content. The narration flows naturally. It includes specific details and maintains engagement throughout the entire scene."
      }));
      const result = validateScriptQuality(scenes);
      // Should not have scene count issues
      expect(result.issues.some(issue => issue.includes('few scenes'))).toBe(false);
      expect(result.issues.some(issue => issue.includes('many scenes'))).toBe(false);
    });

    it('should reject scenes that are too short', () => {
      const scenes: Scene[] = [
        { sceneNumber: 1, text: "Short scene." },
        { sceneNumber: 2, text: "Another short one." },
        { sceneNumber: 3, text: "Very brief." }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('Too short'))).toBe(true);
    });

    it('should reject scenes that are too long', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "This is an extremely long scene that goes on and on with way too many words. ".repeat(20)
        },
        { sceneNumber: 2, text: "Normal length scene with appropriate content." },
        { sceneNumber: 3, text: "Another normal scene." }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.issues.some(issue => issue.includes('Too long'))).toBe(true);
    });

    it('should accept scenes with 50-200 words', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "An octopus can unscrew a jar from the inside. Not because someone taught it, but because it figured it out on its own. These eight-armed creatures solve puzzles that stump most animals, and scientists are only beginning to understand why their intelligence is so remarkable. Their cognitive abilities are not just impressive, they are fundamentally different from anything we see in other animals."
        },
        {
          sceneNumber: 2,
          text: "Unlike humans, who centralize thinking in one brain, octopuses distribute their neurons throughout their entire body. Two-thirds of their brain cells actually live in their arms, not their head. Each arm can taste, touch, and make independent decisions without waiting for commands from the central brain. It is like having eight mini-brains working together in perfect coordination."
        },
        {
          sceneNumber: 3,
          text: "This distributed intelligence lets them do extraordinary things that seem impossible. They can camouflage in milliseconds, mimicking not just colors but also textures of their surroundings. They escape from locked tanks by unscrewing lids and squeezing through tiny openings. They even use tools, with one species collecting coconut shells and assembling them into portable shelters for protection."
        }
      ];
      const result = validateScriptQuality(scenes);
      // Should not have length issues
      expect(result.issues.some(issue => issue.includes('Too short'))).toBe(false);
      expect(result.issues.some(issue => issue.includes('Too long'))).toBe(false);
    });
  });

  describe('Quality Score Calculation', () => {
    it('should return high score for professional script', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "An octopus can unscrew a jar from the inside. Not because someone taught it - because it figured it out. These creatures solve puzzles that stump most animals."
        },
        {
          sceneNumber: 2,
          text: "Unlike humans, octopuses distribute their neurons across their body. Two-thirds of their brain cells live in their arms, letting each arm think independently."
        },
        {
          sceneNumber: 3,
          text: "This unique intelligence enables extraordinary feats. They camouflage instantly, mimicking textures and colors. They escape locked tanks and use tools."
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.score).toBeGreaterThanOrEqual(70); // Pass threshold
      expect(result.passed).toBe(false); // Too short scenes
    });

    it('should deduct points for each issue type', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "In today's video we're going to explore **something amazing**!"
        },
        {
          sceneNumber: 2,
          text: "Short."
        },
        {
          sceneNumber: 3,
          text: "Let's dive in and check this out at https://example.com"
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.score).toBeLessThan(100);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should never return negative scores', () => {
      const scenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "**Bad** *scene* #1: [action]"
        }
      ];
      const result = validateScriptQuality(scenes);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Helper Functions', () => {
    it('getWordCount should count words correctly', () => {
      expect(getWordCount("One two three four five")).toBe(5);
      expect(getWordCount("  Spaces   everywhere  ")).toBe(2);
      expect(getWordCount("")).toBe(0);
    });

    it('hasQualityMarkers should detect quality indicators', () => {
      const goodScenes: Scene[] = [
        {
          sceneNumber: 1,
          text: "The octopus scored 100% on the puzzle test. This specific example shows intelligence. Short sentence. Here's a much longer sentence that demonstrates variety."
        }
      ];
      expect(hasQualityMarkers(goodScenes)).toBe(true);
    });
  });
});
