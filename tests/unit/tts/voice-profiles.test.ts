/**
 * Unit Tests for Voice Profiles
 *
 * Tests the voice profile catalog to ensure all 48+ voices are properly
 * documented with correct metadata, unique IDs, and MVP subset marking.
 *
 * Acceptance Criteria Coverage:
 * - AC2: All 48+ KokoroTTS voices documented with comprehensive metadata
 *
 * Task Coverage: Story 2.1, Task 13 - Unit Tests
 *
 * @module tests/unit/tts/voice-profiles.test
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  VOICE_PROFILES,
  MVP_VOICES,
  getVoiceById,
  getVoicesByGender,
  getVoicesByAccent,
  getMVPVoices
} from '@/lib/tts/voice-profiles';
import { VoiceProfile } from '@/lib/tts/provider';

describe('Voice Profiles - Unit Tests', () => {
  describe('AC2: Voice Profile Documentation', () => {
    describe('Complete Voice Catalog (48+ voices)', () => {
      it('should contain at least 48 voice profiles', () => {
        // Given: The requirement for 48+ KokoroTTS voices
        // When: Loading the voice profiles catalog
        // Then: Should have at least 48 profiles
        expect(VOICE_PROFILES.length).toBeGreaterThanOrEqual(48);
      });

      it('should have exactly 5 MVP voices marked', () => {
        // Given: MVP requirement for 5 initial voices
        // When: Filtering for MVP voices
        const mvpVoices = VOICE_PROFILES.filter(v => v.mvpVoice === true);
        // Then: Should have exactly 5 MVP voices
        expect(mvpVoices).toHaveLength(5);
        expect(MVP_VOICES).toHaveLength(5);
      });

      it('should have all unique voice IDs', () => {
        // Given: Voice profiles array
        // When: Extracting all IDs
        const ids = VOICE_PROFILES.map(v => v.id);
        const uniqueIds = new Set(ids);
        // Then: All IDs should be unique
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('should have all unique model IDs', () => {
        // Given: Voice profiles with KokoroTTS model mappings
        // When: Extracting model IDs
        const modelIds = VOICE_PROFILES.map(v => v.modelId);
        const uniqueModelIds = new Set(modelIds);
        // Then: All model IDs should be unique
        expect(uniqueModelIds.size).toBe(modelIds.length);
      });

      it('should have required fields for each voice profile', () => {
        // Given: VoiceProfile interface requirements
        // When: Checking each profile
        // Then: All required fields should be present and valid
        VOICE_PROFILES.forEach(profile => {
          expect(profile.id).toBeTruthy();
          expect(profile.id).toMatch(/^[a-z0-9-_]+$/); // Valid ID format

          expect(profile.name).toBeTruthy();
          expect(profile.name.length).toBeGreaterThan(0);

          expect(['male', 'female']).toContain(profile.gender);

          expect(profile.accent).toBeTruthy();
          expect(['american', 'british', 'neutral', 'australian', 'canadian'])
            .toContain(profile.accent);

          expect(profile.tone).toBeTruthy();
          expect(['warm', 'professional', 'energetic', 'calm', 'friendly', 'authoritative', 'casual'])
            .toContain(profile.tone);

          expect(profile.previewUrl).toBeTruthy();
          expect(profile.previewUrl).toMatch(/^\/audio\/previews\/.*\.mp3$/);

          expect(profile.modelId).toBeTruthy();
          expect(profile.modelId).toMatch(/^[a-z]+_[a-z]+$/); // KokoroTTS format
        });
      });
    });

    describe('Voice Profile Metadata Quality', () => {
      it('should have diverse gender representation', () => {
        // Given: Voice profiles
        // When: Grouping by gender
        const maleVoices = VOICE_PROFILES.filter(v => v.gender === 'male');
        const femaleVoices = VOICE_PROFILES.filter(v => v.gender === 'female');
        // Then: Should have reasonable distribution
        expect(maleVoices.length).toBeGreaterThan(15);
        expect(femaleVoices.length).toBeGreaterThan(15);
      });

      it('should have diverse accent representation', () => {
        // Given: Voice profiles
        // When: Grouping by accent
        const accentGroups = VOICE_PROFILES.reduce((acc, voice) => {
          acc[voice.accent] = (acc[voice.accent] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        // Then: Should have at least 3 accent types
        expect(Object.keys(accentGroups).length).toBeGreaterThanOrEqual(3);
      });

      it('should have diverse tone representation', () => {
        // Given: Voice profiles
        // When: Grouping by tone
        const toneGroups = VOICE_PROFILES.reduce((acc, voice) => {
          acc[voice.tone] = (acc[voice.tone] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        // Then: Should have at least 5 tone types
        expect(Object.keys(toneGroups).length).toBeGreaterThanOrEqual(5);
      });

      it('should have descriptive names following convention', () => {
        // Given: Naming convention "Name - Description"
        // When: Checking each voice name
        // Then: Should follow the pattern
        VOICE_PROFILES.forEach(profile => {
          expect(profile.name).toMatch(/^[A-Z][a-z]+ - .+$/);
          // Should contain gender indicator in name
          const nameIncludesGender =
            (profile.gender === 'male' && profile.name.includes('Male')) ||
            (profile.gender === 'female' && profile.name.includes('Female'));
          expect(nameIncludesGender).toBe(true);
        });
      });

      it('should have consistent preview URL format', () => {
        // Given: Preview URL requirements
        // When: Checking each preview URL
        // Then: Should match expected format
        VOICE_PROFILES.forEach(profile => {
          expect(profile.previewUrl).toBe(`/audio/previews/${profile.id}.mp3`);
        });
      });
    });

    describe('MVP Voice Subset', () => {
      it('should have MVP voices properly marked', () => {
        // Given: MVP_VOICES constant
        // When: Checking MVP flag
        // Then: All should have mvpVoice: true
        MVP_VOICES.forEach(voice => {
          expect(voice.mvpVoice).toBe(true);
        });
      });

      it('should have diverse MVP voice selection', () => {
        // Given: MVP voices for initial UI
        // When: Analyzing MVP subset
        // Then: Should have variety
        const mvpGenders = MVP_VOICES.map(v => v.gender);
        const mvpAccents = MVP_VOICES.map(v => v.accent);
        const mvpTones = MVP_VOICES.map(v => v.tone);

        expect(new Set(mvpGenders).size).toBeGreaterThanOrEqual(2);
        expect(new Set(mvpAccents).size).toBeGreaterThanOrEqual(2);
        expect(new Set(mvpTones).size).toBeGreaterThanOrEqual(3);
      });

      it('should include expected MVP voices', () => {
        // Given: Expected MVP voice IDs from story
        const expectedMVPIds = ['sarah', 'james', 'emma', 'michael', 'olivia'];
        // When: Getting MVP voice IDs
        const actualMVPIds = MVP_VOICES.map(v => v.id);
        // Then: Should include expected voices
        expectedMVPIds.forEach(id => {
          expect(actualMVPIds).toContain(id);
        });
      });
    });

    describe('Helper Functions', () => {
      it('should get voice by ID correctly', () => {
        // Given: A known voice ID
        // When: Getting voice by ID
        const sarah = getVoiceById('sarah');
        // Then: Should return correct profile
        expect(sarah).toBeDefined();
        expect(sarah?.name).toContain('Sarah');
        expect(sarah?.gender).toBe('female');
      });

      it('should return undefined for invalid voice ID', () => {
        // Given: An invalid voice ID
        // When: Attempting to get voice
        const result = getVoiceById('nonexistent-voice');
        // Then: Should return undefined
        expect(result).toBeUndefined();
      });

      it('should filter voices by gender correctly', () => {
        // Given: Gender filter requirement
        // When: Getting voices by gender
        const maleVoices = getVoicesByGender('male');
        const femaleVoices = getVoicesByGender('female');
        // Then: Should return only matching gender
        maleVoices.forEach(v => expect(v.gender).toBe('male'));
        femaleVoices.forEach(v => expect(v.gender).toBe('female'));
        expect(maleVoices.length + femaleVoices.length).toBe(VOICE_PROFILES.length);
      });

      it('should filter voices by accent correctly', () => {
        // Given: Accent filter requirement
        // When: Getting voices by accent
        const americanVoices = getVoicesByAccent('american');
        const britishVoices = getVoicesByAccent('british');
        // Then: Should return only matching accent
        americanVoices.forEach(v => expect(v.accent).toBe('american'));
        britishVoices.forEach(v => expect(v.accent).toBe('british'));
        expect(americanVoices.length).toBeGreaterThan(0);
        expect(britishVoices.length).toBeGreaterThan(0);
      });

      it('should get MVP voices correctly', () => {
        // Given: MVP voice helper function
        // When: Getting MVP voices
        const mvpVoices = getMVPVoices();
        // Then: Should return exactly 5 MVP voices
        expect(mvpVoices).toHaveLength(5);
        expect(mvpVoices).toEqual(MVP_VOICES);
        mvpVoices.forEach(v => expect(v.mvpVoice).toBe(true));
      });
    });

    describe('Voice ID to Model ID Mapping', () => {
      it('should have valid KokoroTTS model ID format', () => {
        // Given: KokoroTTS model ID convention
        // When: Checking each model ID
        // Then: Should follow format (e.g., af_sky, am_adam)
        VOICE_PROFILES.forEach(profile => {
          // Format: {gender}{accent}_{name}
          // First char: a/b (american/british) or gender indicator
          // Second char: m/f (male/female)
          expect(profile.modelId).toMatch(/^[a-z]{2}_[a-z]+$/);
        });
      });

      it('should have model IDs that correspond to gender', () => {
        // Given: Model ID gender encoding
        // When: Checking model IDs
        // Then: Should match profile gender
        VOICE_PROFILES.forEach(profile => {
          const modelIdParts = profile.modelId.split('_');
          const genderCode = modelIdParts[0][1]; // Second character
          if (profile.gender === 'male') {
            expect(['m']).toContain(genderCode);
          } else {
            expect(['f']).toContain(genderCode);
          }
        });
      });
    });
  });

  describe('Data Integrity Checks', () => {
    it('should not have null or undefined values', () => {
      // Given: Voice profiles data
      // When: Checking for null/undefined
      // Then: Should have no null or undefined values
      VOICE_PROFILES.forEach(profile => {
        Object.values(profile).forEach(value => {
          expect(value).not.toBeNull();
          expect(value).not.toBeUndefined();
        });
      });
    });

    it('should have consistent data types', () => {
      // Given: Expected data types
      // When: Checking each field type
      // Then: Should match expected types
      VOICE_PROFILES.forEach(profile => {
        expect(typeof profile.id).toBe('string');
        expect(typeof profile.name).toBe('string');
        expect(typeof profile.gender).toBe('string');
        expect(typeof profile.accent).toBe('string');
        expect(typeof profile.tone).toBe('string');
        expect(typeof profile.previewUrl).toBe('string');
        expect(typeof profile.modelId).toBe('string');
        if (profile.mvpVoice !== undefined) {
          expect(typeof profile.mvpVoice).toBe('boolean');
        }
      });
    });

    it('should export constants correctly', () => {
      // Given: Module exports
      // When: Checking exports
      // Then: All expected exports should be available
      expect(VOICE_PROFILES).toBeDefined();
      expect(Array.isArray(VOICE_PROFILES)).toBe(true);
      expect(MVP_VOICES).toBeDefined();
      expect(Array.isArray(MVP_VOICES)).toBe(true);
      expect(typeof getVoiceById).toBe('function');
      expect(typeof getVoicesByGender).toBe('function');
      expect(typeof getVoicesByAccent).toBe('function');
      expect(typeof getMVPVoices).toBe('function');
    });
  });
});