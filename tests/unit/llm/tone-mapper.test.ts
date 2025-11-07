/**
 * Unit Tests for Topic-Based Tone Mapping
 *
 * Tests the tone determination logic to ensure topics are correctly
 * mapped to appropriate script tones (educational, entertaining, dramatic, etc.)
 *
 * Acceptance Criteria Coverage:
 * - AC7: Scripts use topic-appropriate tone
 * - AC12: Script generation handles various topic types
 *
 * Task Coverage: Story 2.4, Task 3 - Implement Topic-Based Tone Mapping
 * Task Coverage: Story 2.4, Task 9 - Unit Testing
 *
 * @module tests/unit/llm/tone-mapper.test
 */

import { describe, it, expect } from 'vitest';
import {
  determineTone,
  getToneInstructions,
  type ScriptTone,
  TONE_INSTRUCTIONS
} from '@/lib/llm/tone-mapper';

describe('Tone Mapper - Unit Tests', () => {
  describe('AC7: Topic-Appropriate Tone Determination', () => {
    describe('Educational Topics', () => {
      it('should detect educational tone for "How quantum computing works"', () => {
        // Given: Educational topic
        const topic = 'How quantum computing works';
        // When: Determining tone
        const result = determineTone(topic);
        // Then: Should be educational
        expect(result.tone).toBe('educational');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should detect educational tone for science topics', () => {
        const topics = [
          'The science behind photosynthesis',
          'Understanding machine learning',
          'History of the Roman Empire',
          'Learn Python programming basics'
        ];
        topics.forEach(topic => {
          const result = determineTone(topic);
          expect(result.tone).toBe('educational');
        });
      });

      it('should detect educational tone for tutorial topics', () => {
        const topic = 'Tutorial: How to build a website';
        const result = determineTone(topic);
        expect(result.tone).toBe('educational');
        expect(result.reasoning).toContain('educational');
      });
    });

    describe('Entertaining Topics', () => {
      it('should detect entertaining tone for funny content', () => {
        const topic = 'Funniest cat videos compilation';
        const result = determineTone(topic);
        expect(result.tone).toBe('entertaining');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should detect entertaining tone for entertainment topics', () => {
        const topics = [
          'Top 10 movie plot twists',
          'Celebrity pranks caught on camera',
          'Gaming fails compilation',
          'Viral TikTok challenges'
        ];
        topics.forEach(topic => {
          const result = determineTone(topic);
          expect(result.tone).toBe('entertaining');
        });
      });
    });

    describe('Dramatic Topics', () => {
      it('should detect dramatic tone for mystery content', () => {
        const topic = 'The unsolved mystery of flight MH370';
        const result = determineTone(topic);
        expect(result.tone).toBe('dramatic');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should detect dramatic tone for crime topics', () => {
        const topics = [
          'Investigation into serial killer patterns',
          'War crimes tribunal evidence',
          'Disaster survival stories',
          'Horror stories from the deep web'
        ];
        topics.forEach(topic => {
          const result = determineTone(topic);
          expect(result.tone).toBe('dramatic');
        });
      });
    });

    describe('Casual Topics', () => {
      it('should detect casual tone for lifestyle content', () => {
        const topic = 'My daily morning routine';
        const result = determineTone(topic);
        expect(result.tone).toBe('casual');
        expect(result.confidence).toBeGreaterThan(0);
      });

      it('should detect casual tone for everyday topics', () => {
        const topics = [
          'Simple cooking tips for beginners',
          'Lifestyle hacks for busy people',
          'My thoughts on remote work'
        ];
        topics.forEach(topic => {
          const result = determineTone(topic);
          expect(result.tone).toBe('casual');
        });
      });
    });

    describe('Formal Topics', () => {
      it('should detect formal tone for business content', () => {
        const topic = 'Corporate finance strategies for Q4';
        const result = determineTone(topic);
        expect(result.tone).toBe('formal');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should detect formal tone for professional topics', () => {
        const topics = [
          'Legal implications of AI regulation',
          'Economic policy analysis',
          'Medical research breakthrough',
          'Government policy updates'
        ];
        topics.forEach(topic => {
          const result = determineTone(topic);
          expect(result.tone).toBe('formal');
        });
      });
    });

    describe('Inspirational Topics', () => {
      it('should detect inspirational tone for motivational content', () => {
        const topic = 'How I overcame adversity to achieve my dreams';
        const result = determineTone(topic);
        expect(result.tone).toBe('inspirational');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should detect inspirational tone for success stories', () => {
        const topics = [
          'Journey from failure to success',
          'Motivational speech about perseverance',
          'Transform your mindset for growth',
          'Champion athlete triumph story'
        ];
        topics.forEach(topic => {
          const result = determineTone(topic);
          expect(result.tone).toBe('inspirational');
        });
      });
    });
  });

  describe('AC12: Handle Various Topic Types', () => {
    it('should handle ambiguous topics with default tone', () => {
      // Given: Generic topic with no strong indicators
      const topic = 'Something interesting';
      // When: Determining tone
      const result = determineTone(topic);
      // Then: Should return a tone (likely casual as default)
      expect(['educational', 'entertaining', 'dramatic', 'casual', 'formal', 'inspirational']).toContain(result.tone);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed-tone topics', () => {
      // Given: Topic with multiple tone indicators
      const topic = 'Educational documentary about mysterious crimes';
      // When: Determining tone
      const result = determineTone(topic);
      // Then: Should pick the strongest tone
      expect(result.tone).toBeDefined();
      expect(result.reasoning).toContain('keywords');
    });

    it('should handle case-insensitive matching', () => {
      // Given: Topics with different casing
      const topic1 = 'How to LEARN Science';
      const topic2 = 'how to learn science';
      // When: Determining tone
      const result1 = determineTone(topic1);
      const result2 = determineTone(topic2);
      // Then: Should produce same result
      expect(result1.tone).toBe(result2.tone);
    });

    it('should provide confidence scores', () => {
      // Given: Topic with clear tone
      const topic = 'Learn machine learning fundamentals';
      // When: Determining tone
      const result = determineTone(topic);
      // Then: Confidence should be between 0 and 1
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should provide reasoning for tone selection', () => {
      // Given: Any topic
      const topic = 'Science tutorial';
      // When: Determining tone
      const result = determineTone(topic);
      // Then: Reasoning should be provided
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Tone Instructions', () => {
    it('should provide instructions for all tone types', () => {
      // Given: All supported tones
      const tones: ScriptTone[] = [
        'educational',
        'entertaining',
        'dramatic',
        'casual',
        'formal',
        'inspirational'
      ];
      // When: Getting instructions for each
      tones.forEach(tone => {
        // Then: Instructions should be defined and non-empty
        const instructions = getToneInstructions(tone);
        expect(instructions).toBeDefined();
        expect(instructions.length).toBeGreaterThan(0);
        expect(instructions).toContain('Tone:');
      });
    });

    it('should include specific guidance in educational instructions', () => {
      const instructions = getToneInstructions('educational');
      expect(instructions).toContain('Clear');
      expect(instructions).toContain('examples');
    });

    it('should include specific guidance in entertaining instructions', () => {
      const instructions = getToneInstructions('entertaining');
      expect(instructions).toContain('humor');
      expect(instructions).toContain('Engaging');
    });

    it('should include specific guidance in dramatic instructions', () => {
      const instructions = getToneInstructions('dramatic');
      expect(instructions).toContain('tension');
      expect(instructions).toContain('Suspenseful');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty topic string', () => {
      // Given: Empty topic
      const topic = '';
      // When: Determining tone
      const result = determineTone(topic);
      // Then: Should return default tone
      expect(result.tone).toBe('casual');
      expect(result.reasoning).toContain('No strong tone indicators');
    });

    it('should handle very long topics', () => {
      // Given: Very long topic string
      const topic = 'This is a very long educational topic about how to learn science and understand complex concepts with tutorial examples and teaching methods'.repeat(5);
      // When: Determining tone
      const result = determineTone(topic);
      // Then: Should still detect tone correctly
      expect(result.tone).toBe('educational');
    });

    it('should handle topics with special characters', () => {
      // Given: Topic with special characters
      const topic = 'How to learn #science & #technology (2025)';
      // When: Determining tone
      const result = determineTone(topic);
      // Then: Should still work
      expect(result.tone).toBe('educational');
    });
  });
});
