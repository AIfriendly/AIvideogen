/**
 * Unit Tests for Topic Extraction - Story 1.7
 *
 * Tests for extractTopicFromConversation utility function.
 * Covers pattern matching, edge cases, and context analysis.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { describe, it, expect } from 'vitest';
import { extractTopicFromConversation } from '@/lib/conversation/topic-extraction';
import { Message } from '@/types/api';

/**
 * Helper function to create test messages
 */
function createMessage(content: string, role: 'user' | 'assistant' = 'user'): Message {
  return {
    id: `msg-${Math.random()}`,
    projectId: 'test-project',
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

describe('1.7-UNIT: extractTopicFromConversation', () => {
  describe('[P0] Explicit topic patterns', () => {
    it('1.7-UNIT-001 [P0]: should extract topic from "make a video about [topic]"', () => {
      const messages = [createMessage('I want to make a video about Mars colonization')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('Mars colonization');
    });

    it('1.7-UNIT-002 [P0]: should extract topic from "create a video about [topic]"', () => {
      const messages = [createMessage('Please create a video about renewable energy')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('renewable energy');
    });

    it('1.7-UNIT-003 [P0]: should extract topic from "create a video on [topic]"', () => {
      const messages = [createMessage('Create a video on quantum computing')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('quantum computing');
    });

    it('1.7-UNIT-004 [P0]: should extract topic from "let\'s make [topic] video"', () => {
      const messages = [createMessage("Let's make a cooking tutorial video")];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('cooking tutorial');
    });

    it('1.7-UNIT-005 [P0]: should extract topic from "I want to create [topic]"', () => {
      const messages = [
        createMessage('I want to create a video about climate change solutions'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('climate change solutions');
    });

    it('1.7-UNIT-006 [P0]: should extract topic from "video about [topic]"', () => {
      const messages = [createMessage('Make a video about space exploration')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('space exploration');
    });

    it('1.7-UNIT-007 [P0]: should handle case-insensitive matching', () => {
      const messages = [createMessage('MAKE A VIDEO ABOUT artificial intelligence')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('artificial intelligence');
    });

    it('1.7-UNIT-008 [P0]: should extract topic with punctuation at end', () => {
      const messages = [createMessage('Can you make a video about ocean conservation?')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('ocean conservation');
    });
  });

  describe('[P1] Generic commands with context', () => {
    it('1.7-UNIT-009 [P1]: should not extract topic from non-video messages', () => {
      const messages = [
        createMessage('Tell me about renewable energy'),
        createMessage('That sounds great. Make the video now.'),
      ];
      const result = extractTopicFromConversation(messages);
      // "Make the video now" after "That sounds great." doesn't match generic pattern
      // because of the period - the pattern requires end of string
      expect(result).toBeNull();
    });

    it('1.7-UNIT-010 [P1]: should extract topic from recent context when saying "create the video"', () => {
      const messages = [
        createMessage('I want to make a video about Mars colonization'),
        createMessage('Actually, let me think about it'),
        createMessage('create the video now'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('Mars colonization');
    });

    it('1.7-UNIT-011 [P1]: should use most recent explicit topic when multiple topics mentioned', () => {
      const messages = [
        createMessage('I want to make a video about dogs'),
        createMessage('Actually, make a video about cats instead'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('cats instead');
    });

    it('1.7-UNIT-012 [P1]: should extract topic from "brainstorm a topic on [topic]" followed by "Make a video about it"', () => {
      const messages = [
        createMessage('brainstorm a topic on ww2'),
        createMessage('1'),
        createMessage('Make a video about it'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('ww2');
    });

    it('1.7-UNIT-013 [P1]: should extract topic from "topic on [topic]" in context', () => {
      const messages = [
        createMessage('I need a topic on artificial intelligence'),
        createMessage('make the video now'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('artificial intelligence');
    });

    it('1.7-UNIT-014 [P1]: should extract topic from "discuss [topic]" in context', () => {
      const messages = [
        createMessage('Let\'s discuss climate change.'),
        createMessage('create the video now'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('climate change');
    });
  });

  describe('[P2] Edge cases', () => {
    it('1.7-UNIT-015 [P2]: should return null for empty conversation', () => {
      const result = extractTopicFromConversation([]);
      expect(result).toBeNull();
    });

    it('1.7-UNIT-016 [P2]: should return null when no clear topic detected', () => {
      const messages = [
        createMessage('Hello'),
        createMessage('How are you?'),
        createMessage('Tell me about yourself'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBeNull();
    });

    it('1.7-UNIT-017 [P2]: should return null for generic command without context', () => {
      const messages = [createMessage('make the video now')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBeNull();
    });

    it('1.7-UNIT-018 [P2]: should handle very long topic strings by truncating', () => {
      const longTopic =
        'a'.repeat(250) +
        ' very long topic that exceeds the maximum character limit and should be truncated properly';
      const messages = [createMessage(`Make a video about ${longTopic}`)];
      const result = extractTopicFromConversation(messages);
      expect(result).not.toBeNull();
      expect(result!.length).toBeLessThanOrEqual(200);
    });

    it('1.7-UNIT-019 [P2]: should handle special characters in topic', () => {
      const messages = [createMessage('Make a video about "AI & Machine Learning"')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('"AI & Machine Learning"');
    });

    it('1.7-UNIT-020 [P2]: should clean extra whitespace from extracted topic', () => {
      const messages = [createMessage('Make a video about   space    exploration')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('space exploration');
    });

    it('1.7-UNIT-021 [P2]: should filter out stop words as topics', () => {
      const messages = [createMessage('Make a video about it')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBeNull();
    });

    it('1.7-UNIT-022 [P2]: should only consider user messages, not assistant messages', () => {
      const messages = [
        createMessage('Hello', 'user'),
        createMessage('Make a video about AI', 'assistant'),
        createMessage('make the video now', 'user'),
      ];
      const result = extractTopicFromConversation(messages);
      // Should not extract "AI" from assistant message
      expect(result).toBeNull();
    });

    it('1.7-UNIT-023 [P2]: should handle conversation with multiple assistant messages', () => {
      const messages = [
        createMessage('I need help with a video', 'user'),
        createMessage('What topic would you like?', 'assistant'),
        createMessage('Mars colonization', 'user'),
        createMessage('Great topic!', 'assistant'),
        createMessage('Make a video about Mars colonization', 'user'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('Mars colonization');
    });
  });

  describe('[P2] Topic validation', () => {
    it('1.7-UNIT-024 [P2]: should extract topics with 2-3 chars if meaningful', () => {
      const messages = [createMessage('Make a video about AI technology')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('AI technology');
    });

    it('1.7-UNIT-025 [P2]: should reject very short topics', () => {
      const messages = [createMessage('Make a video about it')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBeNull();
    });

    it('1.7-UNIT-026 [P2]: should handle topics with numbers', () => {
      const messages = [createMessage('Make a video about Web3 and blockchain')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('Web3 and blockchain');
    });

    it('1.7-UNIT-027 [P2]: should handle topics with hyphens', () => {
      const messages = [createMessage('Make a video about self-driving cars')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('self-driving cars');
    });
  });

  describe('[P3] Last 10 messages window', () => {
    it('1.7-UNIT-028 [P3]: should only analyze last 10 messages', () => {
      const messages = [
        createMessage('Make a video about topic 1'),
        createMessage('Message 2'),
        createMessage('Message 3'),
        createMessage('Message 4'),
        createMessage('Message 5'),
        createMessage('Message 6'),
        createMessage('Message 7'),
        createMessage('Message 8'),
        createMessage('Message 9'),
        createMessage('Message 10'),
        createMessage('Message 11'),
        createMessage('Make a video about topic 2'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('topic 2');
    });

    it('1.7-UNIT-029 [P3]: should work with conversations shorter than 10 messages', () => {
      const messages = [
        createMessage('Hello'),
        createMessage('Make a video about AI ethics'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('AI ethics');
    });
  });

  describe('[P3] Multiple pattern variations', () => {
    it('1.7-UNIT-030 [P3]: should extract from "make video about" without "a"', () => {
      const messages = [createMessage('Make video about photography tips')];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('photography tips');
    });

    it('1.7-UNIT-031 [P3]: should extract from "I\'d like to create"', () => {
      const messages = [createMessage("I'd like to create a video about gardening")];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('gardening');
    });

    it('1.7-UNIT-032 [P3]: should handle topic with commas', () => {
      const messages = [
        createMessage('Make a video about healthy eating, exercise, and wellness'),
      ];
      const result = extractTopicFromConversation(messages);
      expect(result).toBe('healthy eating');
    });
  });
});
