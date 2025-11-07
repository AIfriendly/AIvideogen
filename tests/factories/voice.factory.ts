/**
 * Test Data Factory for Voice Profiles
 *
 * Provides factory functions for creating mock voice profiles
 * and related test data, following best practices from data-factories.md
 *
 * @module tests/factories/voice.factory
 */

import { VoiceProfile } from '@/lib/tts/provider';

/**
 * Creates a mock voice profile with optional overrides
 *
 * @param overrides - Partial voice profile to override defaults
 * @returns Complete VoiceProfile object for testing
 */
export function createMockVoiceProfile(overrides?: Partial<VoiceProfile>): VoiceProfile {
  const id = overrides?.id || `voice-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    name: `Test Voice - ${id}`,
    gender: 'female' as const,
    accent: 'american',
    tone: 'professional',
    previewUrl: `/audio/previews/${id}.mp3`,
    modelId: `model_${id}`,
    mvpVoice: false,
    ...overrides
  };
}

/**
 * Creates an array of mock voice profiles
 *
 * @param count - Number of profiles to create
 * @param overrides - Partial overrides to apply to all profiles
 * @returns Array of VoiceProfile objects
 */
export function createMockVoiceProfiles(
  count: number,
  overrides?: Partial<VoiceProfile>
): VoiceProfile[] {
  return Array.from({ length: count }, (_, i) =>
    createMockVoiceProfile({
      id: `voice-${i}`,
      name: `Voice ${i} - Test`,
      gender: i % 2 === 0 ? 'male' : 'female',
      accent: ['american', 'british', 'neutral'][i % 3],
      tone: ['warm', 'professional', 'energetic', 'calm', 'friendly'][i % 5],
      mvpVoice: i < 5,
      ...overrides
    })
  );
}

/**
 * Creates the standard MVP voice profiles for testing
 */
export function createMVPVoiceProfiles(): VoiceProfile[] {
  return [
    {
      id: 'sarah',
      name: 'Sarah - American Female',
      gender: 'female',
      accent: 'american',
      tone: 'warm',
      previewUrl: '/audio/previews/sarah.mp3',
      modelId: 'af_sky',
      mvpVoice: true
    },
    {
      id: 'james',
      name: 'James - British Male',
      gender: 'male',
      accent: 'british',
      tone: 'professional',
      previewUrl: '/audio/previews/james.mp3',
      modelId: 'am_adam',
      mvpVoice: true
    },
    {
      id: 'emma',
      name: 'Emma - American Female',
      gender: 'female',
      accent: 'american',
      tone: 'energetic',
      previewUrl: '/audio/previews/emma.mp3',
      modelId: 'af_bella',
      mvpVoice: true
    },
    {
      id: 'michael',
      name: 'Michael - American Male',
      gender: 'male',
      accent: 'american',
      tone: 'calm',
      previewUrl: '/audio/previews/michael.mp3',
      modelId: 'am_michael',
      mvpVoice: true
    },
    {
      id: 'olivia',
      name: 'Olivia - British Female',
      gender: 'female',
      accent: 'british',
      tone: 'friendly',
      previewUrl: '/audio/previews/olivia.mp3',
      modelId: 'bf_emma',
      mvpVoice: true
    }
  ];
}

/**
 * Creates test data for audio generation results
 */
export function createMockAudioResult(overrides?: any) {
  return {
    audioBuffer: new Uint8Array([0x00, 0x01, 0x02, 0x03]),
    duration: 5.23,
    filePath: '.cache/audio/test/scene-1.mp3',
    fileSize: 123456,
    ...overrides
  };
}

/**
 * Creates test data for various voice-related scenarios
 */
export const VoiceTestData = {
  // Invalid voice IDs for error testing
  invalidVoiceIds: ['', 'nonexistent', '123', 'voice_that_does_not_exist'],

  // Valid test text samples
  validTextSamples: [
    'Hello, this is a test.',
    'The quick brown fox jumps over the lazy dog.',
    'Testing voice synthesis with multiple sentences. This should work well!'
  ],

  // Text samples that need sanitization
  unsanitizedText: [
    '**Bold text** needs sanitization',
    'Scene 1: The beginning',
    '[Stage direction] should be removed',
    '# Markdown header\n\nWith some _italic_ text'
  ],

  // Expected sanitized versions
  sanitizedText: [
    'Bold text needs sanitization',
    'The beginning',
    'should be removed',
    'Markdown header With some italic text'
  ],

  // Long text for performance testing
  longText: 'Lorem ipsum dolor sit amet, '.repeat(100),

  // Edge cases
  edgeCases: {
    emptyText: '',
    whitespaceOnly: '   \n\t  ',
    specialCharacters: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    unicode: '你好世界 مرحبا بالعالم שלום עולם',
    veryLongText: 'a'.repeat(5001) // Over 5000 char limit
  }
};