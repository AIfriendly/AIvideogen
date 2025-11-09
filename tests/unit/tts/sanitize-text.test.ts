/**
 * Unit Tests for Text Sanitization
 *
 * Tests the text sanitization functions to ensure markdown, scene labels,
 * and other non-speakable content is properly removed before TTS generation.
 *
 * Acceptance Criteria Coverage:
 * - AC3: Preview audio samples generated with sanitized text
 *
 * Task Coverage: Story 2.1, Task 13 - Unit Tests
 *
 * @module tests/unit/tts/sanitize-text.test
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeForTTS,
  validateSanitization,
  PREVIEW_TEXT
} from '@/lib/tts/sanitize-text';

describe('2.5-UNIT Text Sanitization - Unit Tests', () => {
  describe('AC2-AC3: Text Sanitization for TTS [P0]', () => {
    describe('Markdown Formatting Removal [P1]', () => {
      it('[2.5-UNIT-001] [P1] should remove bold markdown formatting', () => {
        // Given: Text with bold markdown
        const input = '**Bold text** and normal text **more bold**';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Bold markers should be removed
        expect(result).toBe('Bold text and normal text more bold');
        expect(result).not.toContain('**');
      });

      it('[2.5-UNIT-002] [P1] should remove italic markdown formatting', () => {
        // Given: Text with italic markdown (both * and _)
        const input1 = '*Italic text* and normal text *more italic*';
        const input2 = '_Italic text_ and normal text _more italic_';
        // When: Sanitizing for TTS
        const result1 = sanitizeForTTS(input1);
        const result2 = sanitizeForTTS(input2);
        // Then: Italic markers should be removed
        expect(result1).toBe('Italic text and normal text more italic');
        expect(result2).toBe('Italic text and normal text more italic');
        expect(result1).not.toContain('*');
        expect(result2).not.toContain('_');
      });

      it('[2.5-UNIT-003] [P1] should remove underline markdown formatting', () => {
        // Given: Text with underline markdown
        const input = '__Underlined text__ and normal';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Underline markers should be removed
        expect(result).toBe('Underlined text and normal');
        expect(result).not.toContain('__');
      });

      it('[2.5-UNIT-004] [P1] should remove code markdown formatting', () => {
        // Given: Text with code backticks
        const input = 'Here is `inline code` in the text';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Backticks should be removed
        expect(result).toBe('Here is inline code in the text');
        expect(result).not.toContain('`');
      });

      it('[2.5-UNIT-005] [P1] should remove strikethrough markdown formatting', () => {
        // Given: Text with strikethrough
        const input = '~~Strikethrough text~~ and normal';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Strikethrough markers should be removed
        expect(result).toBe('Strikethrough text and normal');
        expect(result).not.toContain('~~');
      });

      it('[2.5-UNIT-006] [P1] should remove markdown headers', () => {
        // Given: Text with various header levels
        const input = '# Header 1\n## Header 2\n### Header 3\nNormal text';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Hash symbols should be removed
        expect(result).toBe('Header 1 Header 2 Header 3 Normal text');
        expect(result).not.toContain('#');
      });

      it('[2.5-UNIT-007] [P1] should handle nested markdown formatting', () => {
        // Given: Text with nested markdown
        const input = '**Bold with *italic* inside** and __underline with `code`__';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: All markdown should be removed
        expect(result).toBe('Bold with italic inside and underline with code');
        expect(result).not.toMatch(/[*_`]/);
      });
    });

    describe('Scene Label Removal [P1]', () => {
      it('[2.5-UNIT-008] [P1] should remove "Scene X:" labels', () => {
        // Given: Text with scene labels
        const inputs = [
          'Scene 1: The beginning of the story',
          'Scene 2: The middle part',
          'SCENE 3: The climax',
          'scene 10: The ending'
        ];
        // When: Sanitizing each input
        const results = inputs.map(sanitizeForTTS);
        // Then: Scene labels should be removed
        expect(results[0]).toBe('The beginning of the story');
        expect(results[1]).toBe('The middle part');
        expect(results[2]).toBe('The climax');
        expect(results[3]).toBe('The ending');
        results.forEach(r => expect(r).not.toMatch(/scene\s+\d+/i));
      });

      it('[2.5-UNIT-009] [P1] should remove "Title:" labels', () => {
        // Given: Text with title labels
        const inputs = [
          'Title: My Great Story',
          'TITLE: Another Story',
          'title: lowercase title'
        ];
        // When: Sanitizing each input
        const results = inputs.map(sanitizeForTTS);
        // Then: Title labels should be removed
        expect(results[0]).toBe('My Great Story');
        expect(results[1]).toBe('Another Story');
        expect(results[2]).toBe('lowercase title');
        results.forEach(r => expect(r).not.toMatch(/title:/i));
      });

      it('[2.5-UNIT-010] [P1] should handle multiple scene labels in text', () => {
        // Given: Text with multiple scene labels
        const input = 'Scene 1: First part\nScene 2: Second part\nScene 3: Third part';
        // When: Sanitizing
        const result = sanitizeForTTS(input);
        // Then: All scene labels should be removed
        expect(result).toBe('First part Second part Third part');
        expect(result).not.toMatch(/scene\s+\d+/i);
      });
    });

    describe('Stage Direction Removal [P1]', () => {
      it('[2.5-UNIT-011] [P1] should remove stage directions in square brackets', () => {
        // Given: Text with stage directions
        const input = 'He walked [slowly] to the door [opens door] and left.';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Stage directions should be removed
        expect(result).toBe('He walked to the door and left.');
        expect(result).not.toContain('[');
        expect(result).not.toContain(']');
      });

      it('[2.5-UNIT-012] [P2] should handle nested brackets', () => {
        // Given: Text with nested brackets
        const input = 'The actor [turns to audience [smiling]] speaks.';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: All bracketed content should be removed
        expect(result).toBe('The actor speaks.');
      });

      it('[2.5-UNIT-013] [P1] should handle multiple stage directions', () => {
        // Given: Text with multiple stage directions
        const input = '[Enter stage left] Hello [waves] there [exits]';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: All stage directions should be removed
        expect(result).toBe('Hello there');
      });
    });

    describe('Whitespace Handling [P1]', () => {
      it('[2.5-UNIT-014] [P1] should collapse multiple spaces to single space', () => {
        // Given: Text with multiple spaces
        const input = 'Text  with   multiple    spaces';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Should have single spaces
        expect(result).toBe('Text with multiple spaces');
      });

      it('[2.5-UNIT-015] [P1] should collapse multiple newlines to single space', () => {
        // Given: Text with multiple newlines
        const input = 'First line\n\n\nSecond line\n\nThird line';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Should be single line with spaces
        expect(result).toBe('First line Second line Third line');
      });

      it('[2.5-UNIT-016] [P2] should handle tabs and mixed whitespace', () => {
        // Given: Text with tabs and mixed whitespace
        const input = 'Text\twith\t\ttabs\n\nand  spaces';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Should normalize to single spaces
        expect(result).toBe('Text with tabs and spaces');
      });

      it('[2.5-UNIT-017] [P1] should trim leading and trailing whitespace', () => {
        // Given: Text with leading/trailing whitespace
        const input = '  \n\t  Trimmed text  \n\t  ';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Should be trimmed
        expect(result).toBe('Trimmed text');
      });
    });

    describe('Complex Sanitization Scenarios [P0]', () => {
      it('[2.5-UNIT-018] [P0] should handle realistic script text', () => {
        // Given: Realistic script with mixed formatting
        const input = `
          # Scene 1: The Introduction

          **Narrator:** [clears throat] Welcome to our story.

          This is a tale about *adventure* and __discovery__.

          [Dramatic pause]

          Let's begin our \`journey\` together.
        `;
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Should be clean narration text
        expect(result).toBe('The Introduction Narrator: Welcome to our story. This is a tale about adventure and discovery. Let\'s begin our journey together.');
      });

      it('[2.5-UNIT-019] [P2] should handle empty or whitespace-only input', () => {
        // Given: Various empty inputs
        const inputs = ['', '   ', '\n\n\n', '\t\t'];
        // When: Sanitizing each
        const results = inputs.map(sanitizeForTTS);
        // Then: Should return empty string
        results.forEach(r => expect(r).toBe(''));
      });

      it('[2.5-UNIT-020] [P1] should preserve punctuation and special characters', () => {
        // Given: Text with punctuation
        const input = 'Hello! How are you? I\'m fine, thanks. Cost: $19.99 (on sale!)';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Punctuation should be preserved
        expect(result).toBe('Hello! How are you? I\'m fine, thanks. Cost: $19.99 (on sale!)');
      });

      it('[2.5-UNIT-021] [P2] should handle unicode and international characters', () => {
        // Given: Text with unicode
        const input = 'Hello 你好 مرحبا שלום здравствуйте';
        // When: Sanitizing for TTS
        const result = sanitizeForTTS(input);
        // Then: Unicode should be preserved
        expect(result).toBe('Hello 你好 مرحبا שלום здравствуйте');
      });
    });
  });

  describe('Sanitization Validation [P1]', () => {
    describe('validateSanitization function [P1]', () => {
      it('[2.5-UNIT-022] [P1] should validate clean text as valid', () => {
        // Given: Clean text
        const input = 'This is perfectly clean text for TTS.';
        // When: Validating sanitization
        const result = validateSanitization(input);
        // Then: Should be valid
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('[2.5-UNIT-023] [P1] should detect asterisk markdown', () => {
        // Given: Text with asterisks
        const input = 'Text with *asterisk* markdown';
        // When: Validating sanitization
        const result = validateSanitization(input);
        // Then: Should be invalid
        expect(result.valid).toBe(false);
        expect(result.issues).toContain('Contains asterisk');
      });

      it('[2.5-UNIT-024] [P1] should detect hash symbols', () => {
        // Given: Text with hash
        const input = '# Header text';
        // When: Validating sanitization
        const result = validateSanitization(input);
        // Then: Should be invalid
        expect(result.valid).toBe(false);
        expect(result.issues).toContain('Contains hash symbol');
      });

      it('[2.5-UNIT-025] [P1] should detect underscore markdown', () => {
        // Given: Text with underscores
        const input = 'Text with _underscore_ markdown';
        // When: Validating sanitization
        const result = validateSanitization(input);
        // Then: Should be invalid
        expect(result.valid).toBe(false);
        expect(result.issues).toContain('Contains underscore');
      });

      it('[2.5-UNIT-026] [P1] should detect scene labels', () => {
        // Given: Text with scene label
        const input = 'Scene 1: Beginning';
        // When: Validating sanitization
        const result = validateSanitization(input);
        // Then: Should be invalid
        expect(result.valid).toBe(false);
        expect(result.issues).toContain('Contains scene label');
      });

      it('[2.5-UNIT-027] [P1] should detect multiple issues', () => {
        // Given: Text with multiple issues
        const input = '# Scene 1: **Bold** text with _italic_';
        // When: Validating sanitization
        const result = validateSanitization(input);
        // Then: Should detect all issues
        expect(result.valid).toBe(false);
        expect(result.issues.length).toBeGreaterThanOrEqual(4);
        expect(result.issues).toContain('Contains asterisk');
        expect(result.issues).toContain('Contains hash symbol');
        expect(result.issues).toContain('Contains underscore');
        expect(result.issues).toContain('Contains scene label');
      });
    });

    describe('Preview Text Validation [P1]', () => {
      it('[2.5-UNIT-028] [P1] should have pre-sanitized preview text constant', () => {
        // Given: PREVIEW_TEXT constant
        // When: Checking if it exists and is clean
        // Then: Should be defined and valid
        expect(PREVIEW_TEXT).toBeDefined();
        expect(typeof PREVIEW_TEXT).toBe('string');
        expect(PREVIEW_TEXT.length).toBeGreaterThan(0);
      });

      it('[2.5-UNIT-029] [P1] should have valid preview text that passes sanitization', () => {
        // Given: The preview text constant
        // When: Validating it
        const validation = validateSanitization(PREVIEW_TEXT);
        // Then: Should be completely valid
        expect(validation.valid).toBe(true);
        expect(validation.issues).toHaveLength(0);
      });

      it('[2.5-UNIT-030] [P1] should not change preview text when sanitized', () => {
        // Given: Pre-sanitized preview text
        // When: Running through sanitization
        const sanitized = sanitizeForTTS(PREVIEW_TEXT);
        // Then: Should be unchanged
        expect(sanitized).toBe(PREVIEW_TEXT);
      });
    });
  });

  describe('Edge Cases and Error Handling [P2]', () => {
    it('[2.5-UNIT-031] [P2] should handle very long text', () => {
      // Given: Very long text (over 5000 chars)
      const longText = 'Lorem ipsum '.repeat(500);
      // When: Sanitizing
      const result = sanitizeForTTS(longText);
      // Then: Should handle without error
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('[2.5-UNIT-032] [P2] should handle text with only markdown', () => {
      // Given: Text that is only markdown
      const input = '**********';
      // When: Sanitizing
      const result = sanitizeForTTS(input);
      // Then: Should return empty
      expect(result).toBe('');
    });

    it('[2.5-UNIT-033] [P2] should handle text with only stage directions', () => {
      // Given: Text that is only stage directions
      const input = '[Enter] [Exit] [Pause]';
      // When: Sanitizing
      const result = sanitizeForTTS(input);
      // Then: Should return empty after trimming
      expect(result).toBe('');
    });

    it('[2.5-UNIT-034] [P2] should be idempotent (same result when applied twice)', () => {
      // Given: Text with markdown
      const input = '**Bold** and *italic* Scene 1: Test [stage]';
      // When: Sanitizing twice
      const once = sanitizeForTTS(input);
      const twice = sanitizeForTTS(once);
      // Then: Should be the same
      expect(twice).toBe(once);
    });

    it('[2.5-UNIT-035] [P2] should handle null or undefined gracefully', () => {
      // Given: Invalid inputs
      // When/Then: Should handle gracefully
      expect(() => sanitizeForTTS(null as any)).not.toThrow();
      expect(() => sanitizeForTTS(undefined as any)).not.toThrow();
      expect(sanitizeForTTS(null as any)).toBe('');
      expect(sanitizeForTTS(undefined as any)).toBe('');
    });
  });
});