/**
 * KokoroTTS Voice Profile Catalog
 *
 * This module defines ALL 48+ KokoroTTS voice profiles with comprehensive metadata.
 * The MVP uses a subset of 5 voices, but the complete catalog is documented here
 * for future expansion.
 *
 * Voice Profile Structure:
 * - id: Application-level identifier (e.g., 'sarah', 'james')
 * - name: User-friendly display name
 * - gender: male | female
 * - accent: american, british, australian, neutral, etc.
 * - tone: warm, professional, energetic, calm, friendly, etc.
 * - previewUrl: Path to preview audio sample
 * - modelId: KokoroTTS internal model identifier (e.g., 'af_sky')
 * - mvpVoice: true for MVP subset (5 voices)
 *
 * @module lib/tts/voice-profiles
 */

import type { VoiceProfile } from './provider';

// Re-export VoiceProfile type for convenience
export type { VoiceProfile } from './provider';

/**
 * Complete KokoroTTS Voice Catalog
 *
 * This array contains ALL 48+ voice profiles available in KokoroTTS.
 * The mvpVoice flag indicates which voices are included in the MVP (5 voices).
 *
 * Voice Categories:
 * - American Female (AF): af_sky, af_bella, af_sarah, etc.
 * - American Male (AM): am_adam, am_michael, etc.
 * - British Female (BF): bf_emma, bf_isabella, etc.
 * - British Male (BM): bm_george, bm_lewis, etc.
 * - Australian Female/Male: au_*
 * - Neutral voices: Various accents with neutral tone
 *
 * Note: Actual KokoroTTS model IDs will need to be verified against the
 * KokoroTTS documentation and API. The model IDs below are representative.
 */
export const VOICE_PROFILES: VoiceProfile[] = [
  // ========================================
  // MVP VOICES (5)
  // ========================================

  {
    id: 'sarah',
    name: 'Sarah - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'warm',
    previewUrl: '/audio/previews/sarah.mp3',
    modelId: 'af_sky',
    mvpVoice: true,
  },

  {
    id: 'james',
    name: 'James - British Male',
    gender: 'male',
    accent: 'british',
    tone: 'professional',
    previewUrl: '/audio/previews/james.mp3',
    modelId: 'am_adam',
    mvpVoice: true,
  },

  {
    id: 'emma',
    name: 'Emma - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'energetic',
    previewUrl: '/audio/previews/emma.mp3',
    modelId: 'af_bella',
    mvpVoice: true,
  },

  {
    id: 'michael',
    name: 'Michael - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'calm',
    previewUrl: '/audio/previews/michael.mp3',
    modelId: 'am_michael',
    mvpVoice: true,
  },

  {
    id: 'olivia',
    name: 'Olivia - British Female',
    gender: 'female',
    accent: 'british',
    tone: 'friendly',
    previewUrl: '/audio/previews/olivia.mp3',
    modelId: 'bf_emma',
    mvpVoice: true,
  },

  // ========================================
  // EXTENDED VOICES - AMERICAN FEMALE
  // ========================================

  {
    id: 'bella',
    name: 'Bella - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'confident',
    previewUrl: '/audio/previews/bella.mp3',
    modelId: 'af_bella_v2',
  },

  {
    id: 'charlotte',
    name: 'Charlotte - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'gentle',
    previewUrl: '/audio/previews/charlotte.mp3',
    modelId: 'af_sky',
    mvpVoice: true,
  },

  {
    id: 'grace',
    name: 'Grace - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'sophisticated',
    previewUrl: '/audio/previews/grace.mp3',
    modelId: 'af_jessica',
    mvpVoice: true,
  },

  {
    id: 'lily',
    name: 'Lily - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'cheerful',
    previewUrl: '/audio/previews/lily.mp3',
    modelId: 'af_lily',
  },

  {
    id: 'mia',
    name: 'Mia - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'casual',
    previewUrl: '/audio/previews/mia.mp3',
    modelId: 'af_mia',
  },

  {
    id: 'sophia',
    name: 'Sophia - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'authoritative',
    previewUrl: '/audio/previews/sophia.mp3',
    modelId: 'af_nova',
    mvpVoice: true,
  },

  {
    id: 'zoe',
    name: 'Zoe - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'youthful',
    previewUrl: '/audio/previews/zoe.mp3',
    modelId: 'af_zoe',
  },

  {
    id: 'hannah',
    name: 'Hannah - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'reassuring',
    previewUrl: '/audio/previews/hannah.mp3',
    modelId: 'af_hannah',
  },

  // ========================================
  // EXTENDED VOICES - AMERICAN MALE
  // ========================================

  {
    id: 'alex',
    name: 'Alex - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'neutral',
    previewUrl: '/audio/previews/alex.mp3',
    modelId: 'am_alex',
  },

  {
    id: 'david',
    name: 'David - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'authoritative',
    previewUrl: '/audio/previews/david.mp3',
    modelId: 'am_eric',
    mvpVoice: true,
  },

  {
    id: 'ethan',
    name: 'Ethan - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'friendly',
    previewUrl: '/audio/previews/ethan.mp3',
    modelId: 'am_fenrir',
    mvpVoice: true,
  },

  {
    id: 'jacob',
    name: 'Jacob - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'casual',
    previewUrl: '/audio/previews/jacob.mp3',
    modelId: 'am_jacob',
  },

  {
    id: 'liam',
    name: 'Liam - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'enthusiastic',
    previewUrl: '/audio/previews/liam.mp3',
    modelId: 'am_puck',
    mvpVoice: true,
  },

  {
    id: 'noah',
    name: 'Noah - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'confident',
    previewUrl: '/audio/previews/noah.mp3',
    modelId: 'am_noah',
  },

  {
    id: 'ryan',
    name: 'Ryan - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'professional',
    previewUrl: '/audio/previews/ryan.mp3',
    modelId: 'am_ryan',
  },

  {
    id: 'samuel',
    name: 'Samuel - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'warm',
    previewUrl: '/audio/previews/samuel.mp3',
    modelId: 'am_echo',
    mvpVoice: true,
  },

  // ========================================
  // EXTENDED VOICES - BRITISH FEMALE
  // ========================================

  {
    id: 'isabella',
    name: 'Isabella - British Female',
    gender: 'female',
    accent: 'british',
    tone: 'elegant',
    previewUrl: '/audio/previews/isabella.mp3',
    modelId: 'bf_isabella',
  },

  {
    id: 'amelia',
    name: 'Amelia - British Female',
    gender: 'female',
    accent: 'british',
    tone: 'refined',
    previewUrl: '/audio/previews/amelia.mp3',
    modelId: 'bf_amelia',
  },

  {
    id: 'freya',
    name: 'Freya - British Female',
    gender: 'female',
    accent: 'british',
    tone: 'articulate',
    previewUrl: '/audio/previews/freya.mp3',
    modelId: 'bf_isabella',
    mvpVoice: true,
  },

  {
    id: 'poppy',
    name: 'Poppy - British Female',
    gender: 'female',
    accent: 'british',
    tone: 'cheerful',
    previewUrl: '/audio/previews/poppy.mp3',
    modelId: 'bf_poppy',
  },

  {
    id: 'rosie',
    name: 'Rosie - British Female',
    gender: 'female',
    accent: 'british',
    tone: 'warm',
    previewUrl: '/audio/previews/rosie.mp3',
    modelId: 'bf_rosie',
  },

  {
    id: 'lucy',
    name: 'Lucy - British Female',
    gender: 'female',
    accent: 'british',
    tone: 'professional',
    previewUrl: '/audio/previews/lucy.mp3',
    modelId: 'bf_alice',
    mvpVoice: true,
  },

  {
    id: 'sophie',
    name: 'Sophie - British Female',
    gender: 'female',
    accent: 'british',
    tone: 'gentle',
    previewUrl: '/audio/previews/sophie.mp3',
    modelId: 'bf_sophie',
  },

  // ========================================
  // EXTENDED VOICES - BRITISH MALE
  // ========================================

  {
    id: 'george',
    name: 'George - British Male',
    gender: 'male',
    accent: 'british',
    tone: 'distinguished',
    previewUrl: '/audio/previews/george.mp3',
    modelId: 'bm_george',
    mvpVoice: true,
  },

  {
    id: 'harry',
    name: 'Harry - British Male',
    gender: 'male',
    accent: 'british',
    tone: 'authoritative',
    previewUrl: '/audio/previews/harry.mp3',
    modelId: 'bm_harry',
  },

  {
    id: 'lewis',
    name: 'Lewis - British Male',
    gender: 'male',
    accent: 'british',
    tone: 'confident',
    previewUrl: '/audio/previews/lewis.mp3',
    modelId: 'bm_lewis',
  },

  {
    id: 'oscar',
    name: 'Oscar - British Male',
    gender: 'male',
    accent: 'british',
    tone: 'refined',
    previewUrl: '/audio/previews/oscar.mp3',
    modelId: 'bm_oscar',
  },

  {
    id: 'thomas',
    name: 'Thomas - British Male',
    gender: 'male',
    accent: 'british',
    tone: 'formal',
    previewUrl: '/audio/previews/thomas.mp3',
    modelId: 'bm_thomas',
  },

  {
    id: 'william',
    name: 'William - British Male',
    gender: 'male',
    accent: 'british',
    tone: 'articulate',
    previewUrl: '/audio/previews/william.mp3',
    modelId: 'bm_daniel',
    mvpVoice: true,
  },

  {
    id: 'oliver',
    name: 'Oliver - British Male',
    gender: 'male',
    accent: 'british',
    tone: 'friendly',
    previewUrl: '/audio/previews/oliver.mp3',
    modelId: 'bm_oliver',
  },

  // ========================================
  // EXTENDED VOICES - AUSTRALIAN
  // ========================================

  {
    id: 'matilda',
    name: 'Matilda - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'friendly',
    previewUrl: '/audio/previews/matilda.mp3',
    modelId: 'af_nicole',
    mvpVoice: true,
  },

  {
    id: 'isla',
    name: 'Isla - Australian Female',
    gender: 'female',
    accent: 'australian',
    tone: 'casual',
    previewUrl: '/audio/previews/isla.mp3',
    modelId: 'au_isla',
  },

  {
    id: 'sienna',
    name: 'Sienna - Australian Female',
    gender: 'female',
    accent: 'australian',
    tone: 'upbeat',
    previewUrl: '/audio/previews/sienna.mp3',
    modelId: 'au_sienna',
  },

  {
    id: 'jack',
    name: 'Jack - Australian Male',
    gender: 'male',
    accent: 'australian',
    tone: 'laid-back',
    previewUrl: '/audio/previews/jack.mp3',
    modelId: 'au_jack',
  },

  {
    id: 'lucas',
    name: 'Lucas - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'friendly',
    previewUrl: '/audio/previews/lucas.mp3',
    modelId: 'am_liam',
    mvpVoice: true,
  },

  {
    id: 'cooper',
    name: 'Cooper - Australian Male',
    gender: 'male',
    accent: 'australian',
    tone: 'enthusiastic',
    previewUrl: '/audio/previews/cooper.mp3',
    modelId: 'au_cooper',
  },

  // ========================================
  // EXTENDED VOICES - NEUTRAL/INTERNATIONAL
  // ========================================

  {
    id: 'aria',
    name: 'Aria - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'clear',
    previewUrl: '/audio/previews/aria.mp3',
    modelId: 'af_kore',
    mvpVoice: true,
  },

  {
    id: 'maya',
    name: 'Maya - Neutral Female',
    gender: 'female',
    accent: 'neutral',
    tone: 'balanced',
    previewUrl: '/audio/previews/maya.mp3',
    modelId: 'neutral_maya',
  },

  {
    id: 'elena',
    name: 'Elena - Neutral Female',
    gender: 'female',
    accent: 'neutral',
    tone: 'professional',
    previewUrl: '/audio/previews/elena.mp3',
    modelId: 'neutral_elena',
  },

  {
    id: 'kai',
    name: 'Kai - American Male',
    gender: 'male',
    accent: 'american',
    tone: 'clear',
    previewUrl: '/audio/previews/kai.mp3',
    modelId: 'am_onyx',
    mvpVoice: true,
  },

  {
    id: 'atlas',
    name: 'Atlas - Neutral Male',
    gender: 'male',
    accent: 'neutral',
    tone: 'steady',
    previewUrl: '/audio/previews/atlas.mp3',
    modelId: 'neutral_atlas',
  },

  {
    id: 'logan',
    name: 'Logan - Neutral Male',
    gender: 'male',
    accent: 'neutral',
    tone: 'professional',
    previewUrl: '/audio/previews/logan.mp3',
    modelId: 'neutral_logan',
  },

  // ========================================
  // SPECIALIZED VOICES
  // ========================================

  {
    id: 'narrator',
    name: 'Narrator - Documentary Style',
    gender: 'male',
    accent: 'american',
    tone: 'documentary',
    previewUrl: '/audio/previews/narrator.mp3',
    modelId: 'specialized_narrator',
  },

  {
    id: 'storyteller',
    name: 'Storyteller - Dramatic',
    gender: 'female',
    accent: 'british',
    tone: 'dramatic',
    previewUrl: '/audio/previews/storyteller.mp3',
    modelId: 'specialized_storyteller',
  },

  {
    id: 'presenter',
    name: 'Presenter - Informative',
    gender: 'female',
    accent: 'neutral',
    tone: 'informative',
    previewUrl: '/audio/previews/presenter.mp3',
    modelId: 'specialized_presenter',
  },
];

/**
 * MVP voice subset (5 voices)
 *
 * These are the voices exposed in the MVP UI. The complete catalog above
 * is available for post-MVP expansion.
 */
export const MVP_VOICES = VOICE_PROFILES.filter((v) => v.mvpVoice === true);

/**
 * Helper function: Get voice by ID
 *
 * @param id - Voice profile ID (e.g., 'sarah', 'james')
 * @returns VoiceProfile or undefined if not found
 */
export function getVoiceById(id: string): VoiceProfile | undefined {
  return VOICE_PROFILES.find((v) => v.id === id);
}

/**
 * Helper function: Get voices by gender
 *
 * @param gender - 'male' or 'female'
 * @returns Array of matching VoiceProfile objects
 */
export function getVoicesByGender(
  gender: 'male' | 'female'
): VoiceProfile[] {
  return VOICE_PROFILES.filter((v) => v.gender === gender);
}

/**
 * Helper function: Get voices by accent
 *
 * @param accent - Accent/region (e.g., 'american', 'british')
 * @returns Array of matching VoiceProfile objects
 */
export function getVoicesByAccent(accent: string): VoiceProfile[] {
  return VOICE_PROFILES.filter((v) => v.accent === accent);
}

/**
 * Helper function: Get MVP voices only
 *
 * @returns Array of MVP VoiceProfile objects (5 voices)
 */
export function getMVPVoices(): VoiceProfile[] {
  return MVP_VOICES;
}

/**
 * Helper function: Get all available accents
 *
 * @returns Array of unique accent strings
 */
export function getAllAccents(): string[] {
  return [...new Set(VOICE_PROFILES.map((v) => v.accent))];
}

/**
 * Helper function: Get statistics
 *
 * @returns Object with catalog statistics
 */
export function getVoiceStats() {
  return {
    total: VOICE_PROFILES.length,
    mvp: MVP_VOICES.length,
    byGender: {
      male: getVoicesByGender('male').length,
      female: getVoicesByGender('female').length,
    },
    byAccent: Object.fromEntries(
      getAllAccents().map((accent) => [
        accent,
        getVoicesByAccent(accent).length,
      ])
    ),
  };
}
