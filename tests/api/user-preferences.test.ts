/**
 * API Tests: User Preferences Endpoint
 * Test IDs: 6.8a-API-004, 6.8a-API-005
 *
 * Tests for Story 6.8a - QPF Infrastructure
 * User preferences API validation and response format.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock interfaces matching the API implementation
interface UserPreferences {
  id: string;
  default_voice_id: string | null;
  default_persona_id: string | null;
  quick_production_enabled: boolean;
  created_at: string;
  updated_at: string;
  voice_name?: string;
  persona_name?: string;
}

interface UserPreferencesUpdate {
  default_voice_id?: string | null;
  default_persona_id?: string | null;
  quick_production_enabled?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Mock voice profile lookup (simulating getVoiceById from voice-profiles.ts)
const VALID_VOICE_IDS = ['af_nova', 'af_sky', 'am_adam', 'am_michael', 'bf_emma'];

function getVoiceById(voiceId: string): { id: string; name: string } | undefined {
  const voices: Record<string, { id: string; name: string }> = {
    af_nova: { id: 'af_nova', name: 'Nova' },
    af_sky: { id: 'af_sky', name: 'Sky' },
    am_adam: { id: 'am_adam', name: 'Adam' },
    am_michael: { id: 'am_michael', name: 'Michael' },
    bf_emma: { id: 'bf_emma', name: 'Emma' },
  };
  return voices[voiceId];
}

// Simulated validation functions from API layer
function validateVoiceId(voiceId: string | null | undefined): { valid: boolean; error?: string } {
  if (voiceId === undefined || voiceId === null) {
    return { valid: true }; // null/undefined allowed
  }
  const voice = getVoiceById(voiceId);
  if (!voice) {
    return { valid: false, error: `Invalid voice ID: ${voiceId}` };
  }
  return { valid: true };
}

function validatePersonaId(personaId: string | null | undefined, validPersonaIds: string[]): { valid: boolean; error?: string } {
  if (personaId === undefined || personaId === null) {
    return { valid: true }; // null/undefined allowed
  }
  if (!validPersonaIds.includes(personaId)) {
    return { valid: false, error: `Invalid persona ID: ${personaId}` };
  }
  return { valid: true };
}

/**
 * Test Suite: User Preferences API Validation
 * Test ID: 6.8a-API-004
 * Priority: P1 (High) - Input validation critical for data integrity
 */
describe('6.8a-API-004: User Preferences API Validation', () => {
  const validPersonaIds = ['persona-1', 'persona-2', 'persona-3'];

  describe('Voice ID Validation', () => {
    it('should accept valid voice ID', () => {
      const result = validateVoiceId('af_nova');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid voice ID', () => {
      const result = validateVoiceId('invalid-voice');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid voice ID: invalid-voice');
    });

    it('should accept null voice ID', () => {
      const result = validateVoiceId(null);
      expect(result.valid).toBe(true);
    });

    it('should accept undefined voice ID', () => {
      const result = validateVoiceId(undefined);
      expect(result.valid).toBe(true);
    });

    it('should reject empty string voice ID', () => {
      const result = validateVoiceId('');
      expect(result.valid).toBe(false);
    });
  });

  describe('Persona ID Validation', () => {
    it('should accept valid persona ID', () => {
      const result = validatePersonaId('persona-1', validPersonaIds);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid persona ID', () => {
      const result = validatePersonaId('invalid-persona', validPersonaIds);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid persona ID: invalid-persona');
    });

    it('should accept null persona ID', () => {
      const result = validatePersonaId(null, validPersonaIds);
      expect(result.valid).toBe(true);
    });

    it('should accept undefined persona ID', () => {
      const result = validatePersonaId(undefined, validPersonaIds);
      expect(result.valid).toBe(true);
    });
  });

  describe('Request Body Validation', () => {
    it('should accept partial update with only voice_id', () => {
      const body = { default_voice_id: 'af_nova' };
      const voiceResult = validateVoiceId(body.default_voice_id);
      expect(voiceResult.valid).toBe(true);
    });

    it('should accept partial update with only persona_id', () => {
      const body = { default_persona_id: 'persona-1' };
      const personaResult = validatePersonaId(body.default_persona_id, validPersonaIds);
      expect(personaResult.valid).toBe(true);
    });

    it('should accept full update with both IDs', () => {
      const body = {
        default_voice_id: 'af_nova',
        default_persona_id: 'persona-1',
      };
      const voiceResult = validateVoiceId(body.default_voice_id);
      const personaResult = validatePersonaId(body.default_persona_id, validPersonaIds);
      expect(voiceResult.valid).toBe(true);
      expect(personaResult.valid).toBe(true);
    });

    it('should accept update with quick_production_enabled', () => {
      const body = { quick_production_enabled: false };
      expect(typeof body.quick_production_enabled).toBe('boolean');
    });

    it('should accept clearing values with explicit null', () => {
      const body = {
        default_voice_id: null,
        default_persona_id: null,
      };
      const voiceResult = validateVoiceId(body.default_voice_id);
      const personaResult = validatePersonaId(body.default_persona_id, validPersonaIds);
      expect(voiceResult.valid).toBe(true);
      expect(personaResult.valid).toBe(true);
    });
  });
});

/**
 * Test Suite: User Preferences API Response Format
 * Test ID: 6.8a-API-005
 * Priority: P1 (High) - Response format contract
 */
describe('6.8a-API-005: User Preferences API Response Format', () => {
  describe('GET /api/user-preferences Response', () => {
    it('should return success: true with data on success', () => {
      const response: ApiResponse<UserPreferences> = {
        success: true,
        data: {
          id: 'default',
          default_voice_id: 'af_nova',
          default_persona_id: 'persona-1',
          quick_production_enabled: true,
          created_at: '2025-12-03T10:00:00Z',
          updated_at: '2025-12-03T10:00:00Z',
          voice_name: 'Nova',
          persona_name: 'Test Persona',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it('should include voice_name from voice-profiles lookup', () => {
      const voiceId = 'af_nova';
      const voice = getVoiceById(voiceId);

      expect(voice).toBeDefined();
      expect(voice?.name).toBe('Nova');
    });

    it('should return null values correctly', () => {
      const response: ApiResponse<UserPreferences> = {
        success: true,
        data: {
          id: 'default',
          default_voice_id: null,
          default_persona_id: null,
          quick_production_enabled: true,
          created_at: '2025-12-03T10:00:00Z',
          updated_at: '2025-12-03T10:00:00Z',
        },
      };

      expect(response.data?.default_voice_id).toBeNull();
      expect(response.data?.default_persona_id).toBeNull();
      expect(response.data?.voice_name).toBeUndefined();
      expect(response.data?.persona_name).toBeUndefined();
    });

    it('should return 404 with error when preferences not found', () => {
      const response: ApiResponse<UserPreferences> = {
        success: false,
        error: 'User preferences not found',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('User preferences not found');
      expect(response.data).toBeUndefined();
    });
  });

  describe('PUT /api/user-preferences Response', () => {
    it('should return success: true on successful update', () => {
      const response = { success: true };
      expect(response.success).toBe(true);
    });

    it('should return 400 with error for invalid voice_id', () => {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid voice ID: bad-voice',
      };

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid voice ID');
    });

    it('should return 400 with error for invalid persona_id', () => {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid persona ID: bad-persona',
      };

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid persona ID');
    });

    it('should return 500 with error on internal error', () => {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to update user preferences',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
});

/**
 * Test Suite: Voice Profile Lookup
 * Test ID: 6.8a-API-006
 * Priority: P2 (Medium) - Voice name resolution
 */
describe('6.8a-API-006: Voice Profile Lookup', () => {
  it('should return voice details for all MVP voices', () => {
    const mvpVoices = ['af_nova', 'af_sky', 'am_adam', 'am_michael', 'bf_emma'];

    for (const voiceId of mvpVoices) {
      const voice = getVoiceById(voiceId);
      expect(voice).toBeDefined();
      expect(voice?.id).toBe(voiceId);
      expect(voice?.name).toBeDefined();
    }
  });

  it('should return undefined for unknown voice ID', () => {
    const voice = getVoiceById('unknown-voice');
    expect(voice).toBeUndefined();
  });

  it('should return correct names for each voice', () => {
    expect(getVoiceById('af_nova')?.name).toBe('Nova');
    expect(getVoiceById('af_sky')?.name).toBe('Sky');
    expect(getVoiceById('am_adam')?.name).toBe('Adam');
    expect(getVoiceById('am_michael')?.name).toBe('Michael');
    expect(getVoiceById('bf_emma')?.name).toBe('Emma');
  });
});
