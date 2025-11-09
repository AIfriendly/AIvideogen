/**
 * Unit Tests for Text Sanitization Module
 *
 * Tests all sanitization patterns to ensure clean TTS audio:
 * - Markdown removal (*, #, _, `, **)
 * - Scene label removal ("Scene 1:", "Title:", "Narrator:")
 * - Stage direction removal [in brackets]
 * - Whitespace normalization
 * - Complex combinations
 * - Edge cases
 *
 * Story 2.5: Voiceover Generation for Scenes
 */

import { describe, it, expect } from 'vitest';
import { sanitizeForTTS, validateSanitized } from '../../../lib/tts/sanitize-text';

describe('sanitizeForTTS', () => {
  describe('Markdown Removal', () => {
    it('should remove bold markdown (**text**)', () => {
      const result = sanitizeForTTS('**Bold** text');
      expect(result.sanitized).toBe('Bold text');
    });

    it('should remove italic markdown (*text*)', () => {
      const result = sanitizeForTTS('*Italic* text');
      expect(result.sanitized).toBe('Italic text');
    });

    it('should remove underline markdown (__text__)', () => {
      const result = sanitizeForTTS('__Underlined__ text');
      expect(result.sanitized).toBe('Underlined text');
    });

    it('should remove strikethrough markdown (~~text~~)', () => {
      const result = sanitizeForTTS('~~Strikethrough~~ text');
      expect(result.sanitized).toBe('Strikethrough text');
    });

    it('should remove inline code backticks (`code`)', () => {
      const result = sanitizeForTTS('The `code` example');
      expect(result.sanitized).toBe('The code example');
    });

    it('should remove heading markers (### Heading)', () => {
      const result = sanitizeForTTS('### Heading');
      expect(result.sanitized).toBe('Heading');
    });

    it('should handle multiple markdown formats', () => {
      const result = sanitizeForTTS('**Bold** and *italic* and `code`');
      expect(result.sanitized).toBe('Bold and italic and code');
    });
  });

  describe('Scene Label Removal', () => {
    it('should remove "Scene N:" labels', () => {
      const result = sanitizeForTTS('Scene 1: The opening');
      expect(result.sanitized).toBe('The opening');
    });

    it('should remove "Title:" labels', () => {
      const result = sanitizeForTTS('Title: Introduction');
      expect(result.sanitized).toBe('Introduction');
    });

    it('should remove "Narrator:" labels', () => {
      const result = sanitizeForTTS('Narrator: Once upon a time');
      expect(result.sanitized).toBe('Once upon a time');
    });

    it('should remove "[VO]:" labels', () => {
      const result = sanitizeForTTS('[VO]: Welcome');
      expect(result.sanitized).toBe('Welcome');
    });

    it('should remove "[Audio]:" labels', () => {
      const result = sanitizeForTTS('[Audio]: The story begins');
      expect(result.sanitized).toBe('The story begins');
    });

    it('should handle case-insensitive labels', () => {
      const result = sanitizeForTTS('SCENE 1: The opening');
      expect(result.sanitized).toBe('The opening');
    });
  });

  describe('Stage Direction Removal', () => {
    it('should remove stage directions [pause]', () => {
      const result = sanitizeForTTS('Hello [pause] world');
      expect(result.sanitized).toBe('Hello world');
    });

    it('should remove stage directions [music fades]', () => {
      const result = sanitizeForTTS('[music fades] The story begins');
      expect(result.sanitized).toBe('The story begins');
    });

    it('should remove stage directions [laughs]', () => {
      const result = sanitizeForTTS('Welcome [laughs] everyone');
      expect(result.sanitized).toBe('Welcome everyone');
    });

    it('should remove multiple stage directions', () => {
      const result = sanitizeForTTS('[music] Welcome [pause] to the show [fade out]');
      expect(result.sanitized).toBe('Welcome to the show');
    });
  });

  describe('Whitespace Normalization', () => {
    it('should collapse multiple newlines to single space', () => {
      const result = sanitizeForTTS('Text\n\n\nMore text');
      expect(result.sanitized).toBe('Text More text');
    });

    it('should collapse single newlines to space', () => {
      const result = sanitizeForTTS('Line one\nLine two');
      expect(result.sanitized).toBe('Line one Line two');
    });

    it('should collapse multiple spaces to single space', () => {
      const result = sanitizeForTTS('Text   with   spaces');
      expect(result.sanitized).toBe('Text with spaces');
    });

    it('should trim leading whitespace', () => {
      const result = sanitizeForTTS('  Trimmed');
      expect(result.sanitized).toBe('Trimmed');
    });

    it('should trim trailing whitespace', () => {
      const result = sanitizeForTTS('Trimmed  ');
      expect(result.sanitized).toBe('Trimmed');
    });

    it('should trim leading and trailing whitespace', () => {
      const result = sanitizeForTTS('  Trimmed  ');
      expect(result.sanitized).toBe('Trimmed');
    });
  });

  describe('Complex Combinations', () => {
    it('should handle markdown + scene labels + stage directions', () => {
      const result = sanitizeForTTS('**Scene 1:** [music] Welcome\n\nto the *show*');
      expect(result.sanitized).toBe('Welcome to the show');
    });

    it('should handle multiple patterns in single string', () => {
      const result = sanitizeForTTS(
        'Title: The **Big** Story [pause] with *special* effects\n\nContinues here'
      );
      expect(result.sanitized).toBe('The Big Story with special effects Continues here');
    });

    it('should preserve punctuation', () => {
      const result = sanitizeForTTS('**Hello!** How are you? I\'m fine. Thanks; goodbye:');
      expect(result.sanitized).toBe('Hello! How are you? I\'m fine. Thanks; goodbye:');
    });

    it('should handle nested markdown patterns', () => {
      const result = sanitizeForTTS('**Bold and *italic* text**');
      expect(result.sanitized).toBe('Bold and italic text');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = sanitizeForTTS('');
      expect(result.sanitized).toBe('');
      expect(result.originalLength).toBe(0);
      expect(result.sanitizedLength).toBe(0);
    });

    it('should handle string with only formatting (no content)', () => {
      const result = sanitizeForTTS('** ** [pause] ### \n\n');
      expect(result.sanitized).toBe('');
    });

    it('should handle already clean text (no changes)', () => {
      const clean = 'This is already clean text.';
      const result = sanitizeForTTS(clean);
      expect(result.sanitized).toBe(clean);
    });

    it('should handle text with numbers', () => {
      const result = sanitizeForTTS('Scene 123: The year is 2024');
      expect(result.sanitized).toBe('The year is 2024');
    });

    it('should handle special characters in text', () => {
      const result = sanitizeForTTS('Email: test@example.com, Cost: $100');
      expect(result.sanitized).toBe('Email: test@example.com, Cost: $100');
    });

    it('should track removed elements', () => {
      const result = sanitizeForTTS('**Scene 1:** [music] Welcome');
      expect(result.removedElements.length).toBeGreaterThan(0);
    });

    it('should report original and sanitized lengths', () => {
      const text = '**Bold** text';
      const result = sanitizeForTTS(text);
      expect(result.originalLength).toBe(text.length);
      expect(result.sanitizedLength).toBe('Bold text'.length);
    });
  });
});

describe('validateSanitized', () => {
  it('should validate clean text as true', () => {
    expect(validateSanitized('Clean text.')).toBe(true);
  });

  it('should reject text with markdown characters', () => {
    expect(validateSanitized('Text with *asterisk*')).toBe(false);
  });

  it('should reject text with scene labels', () => {
    expect(validateSanitized('Scene 1: text')).toBe(false);
  });

  it('should reject text with stage directions', () => {
    expect(validateSanitized('Text [pause] here')).toBe(false);
  });

  it('should reject text with multiple spaces', () => {
    expect(validateSanitized('Text  with  spaces')).toBe(false);
  });

  it('should accept text with punctuation', () => {
    expect(validateSanitized('Text with punctuation! And more? Yes.')).toBe(true);
  });

  it('should accept text with numbers', () => {
    expect(validateSanitized('The year 2024')).toBe(true);
  });
});
