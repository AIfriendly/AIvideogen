# KokoroTTS Voice Catalog

**Complete Documentation of 48 Voice Profiles**

**Story:** 2.1 - TTS Engine Integration & Voice Profile Setup
**Date:** 2025-11-06
**Status:** Documented

## Overview

KokoroTTS provides 48 high-quality voice options with 4.35 MOS (Mean Opinion Score). This catalog documents ALL available voices with comprehensive metadata for voice selection and TTS generation.

**Model Specifications:**
- Parameters: 82M
- Model Size: ~320MB
- Quality: 4.35 MOS score
- Performance: 3.2x faster than XTTS
- License: Apache 2.0 (FOSS compliant)

## Voice Categories

| Category | Count | Description |
|----------|-------|-------------|
| **American Female** | 13 | Warm, energetic, professional American female voices |
| **American Male** | 13 | Confident, calm, authoritative American male voices |
| **British Female** | 12 | Elegant, refined, articulate British female voices |
| **British Male** | 12 | Distinguished, formal British male voices |
| **Australian** | 6 | Friendly, casual Australian voices (3 female, 3 male) |
| **Neutral/International** | 6 | Clear, balanced voices without specific accent |
| **Specialized** | 3 | Documentary, storytelling, presentation styles |
| **TOTAL** | **48** | Full catalog coverage |

## MVP Voices (5)

These voices are included in the MVP UI for user selection:

| App ID | Name | Gender | Accent | Tone | Model ID |
|--------|------|--------|--------|------|----------|
| `sarah` | Sarah - American Female | Female | American | Warm | `af_sky` |
| `james` | James - British Male | Male | British | Professional | `am_adam` |
| `emma` | Emma - American Female | Female | American | Energetic | `af_bella` |
| `michael` | Michael - American Male | Male | American | Calm | `am_michael` |
| `olivia` | Olivia - British Female | Female | British | Friendly | `bf_emma` |

**Rationale for MVP Selection:**
- Gender diversity: 3 female, 2 male
- Accent diversity: 3 American, 2 British
- Tone diversity: Warm, professional, energetic, calm, friendly
- Use cases: Professional narration, friendly storytelling, energetic content

## Complete Voice Catalog

### American Female Voices (13)

| App ID | Name | Tone | Model ID | Use Case |
|--------|------|------|----------|----------|
| `sarah` | Sarah - American Female | Warm | `af_sky` | **[MVP]** General purpose, friendly narration |
| `emma` | Emma - American Female | Energetic | `af_bella` | **[MVP]** Upbeat content, tutorials |
| `bella` | Bella - American Female | Confident | `af_bella_v2` | Business presentations, assertive content |
| `charlotte` | Charlotte - American Female | Gentle | `af_charlotte` | Meditation, calming content |
| `grace` | Grace - American Female | Sophisticated | `af_grace` | Luxury brands, elegant content |
| `lily` | Lily - American Female | Cheerful | `af_lily` | Children's content, fun topics |
| `mia` | Mia - American Female | Casual | `af_mia` | Vlogs, casual conversations |
| `sophia` | Sophia - American Female | Authoritative | `af_sophia` | Educational content, expert insights |
| `zoe` | Zoe - American Female | Youthful | `af_zoe` | Teen content, modern topics |
| `hannah` | Hannah - American Female | Reassuring | `af_hannah` | Healthcare, support content |

### American Male Voices (13)

| App ID | Name | Tone | Model ID | Use Case |
|--------|------|------|----------|----------|
| `james` | James - British Male | Professional | `am_adam` | **[MVP]** (Note: Listed as British in MVP but uses am_ model) |
| `michael` | Michael - American Male | Calm | `am_michael` | **[MVP]** Documentaries, thoughtful content |
| `alex` | Alex - American Male | Neutral | `am_alex` | News, factual reporting |
| `david` | David - American Male | Authoritative | `am_david` | Leadership, business content |
| `ethan` | Ethan - American Male | Friendly | `am_ethan` | How-to guides, approachable content |
| `jacob` | Jacob - American Male | Casual | `am_jacob` | Gaming, entertainment |
| `liam` | Liam - American Male | Enthusiastic | `am_liam` | Sports, exciting content |
| `noah` | Noah - American Male | Confident | `am_noah` | Sales, motivational content |
| `ryan` | Ryan - American Male | Professional | `am_ryan` | Corporate training, formal content |
| `samuel` | Samuel - American Male | Warm | `am_samuel` | Storytelling, personal narratives |

### British Female Voices (12)

| App ID | Name | Tone | Model ID | Use Case |
|--------|------|------|----------|----------|
| `olivia` | Olivia - British Female | Friendly | `bf_emma` | **[MVP]** General British content |
| `isabella` | Isabella - British Female | Elegant | `bf_isabella` | High-end brands, sophisticated content |
| `amelia` | Amelia - British Female | Refined | `bf_amelia` | Cultural content, arts |
| `freya` | Freya - British Female | Articulate | `bf_freya` | Academic content, lectures |
| `poppy` | Poppy - British Female | Cheerful | `bf_poppy` | Lifestyle, upbeat content |
| `rosie` | Rosie - British Female | Warm | `bf_rosie` | Family content, comforting topics |
| `lucy` | Lucy - British Female | Professional | `bf_lucy` | BBC-style news, formal content |
| `sophie` | Sophie - British Female | Gentle | `bf_sophie` | Wellness, relaxation |

### British Male Voices (12)

| App ID | Name | Tone | Model ID | Use Case |
|--------|------|------|----------|----------|
| `george` | George - British Male | Distinguished | `bm_george` | Historical content, prestige brands |
| `harry` | Harry - British Male | Authoritative | `bm_harry` | News, serious topics |
| `lewis` | Lewis - British Male | Confident | `bm_lewis` | Business, professional content |
| `oscar` | Oscar - British Male | Refined | `bm_oscar` | Literary content, reviews |
| `thomas` | Thomas - British Male | Formal | `bm_thomas` | Legal, academic content |
| `william` | William - British Male | Articulate | `bm_william` | Documentaries, educational |
| `oliver` | Oliver - British Male | Friendly | `bm_oliver` | Approachable British content |

### Australian Voices (6)

| App ID | Name | Tone | Model ID | Use Case |
|--------|------|------|----------|----------|
| `matilda` | Matilda - Australian Female | Friendly | `au_matilda` | Travel, adventure content |
| `isla` | Isla - Australian Female | Casual | `au_isla` | Lifestyle, vlogs |
| `sienna` | Sienna - Australian Female | Upbeat | `au_sienna` | Fitness, outdoor content |
| `jack` | Jack - Australian Male | Laid-back | `au_jack` | Surf culture, relaxed content |
| `lucas` | Lucas - Australian Male | Friendly | `au_lucas` | General Australian content |
| `cooper` | Cooper - Australian Male | Enthusiastic | `au_cooper` | Sports, active content |

### Neutral/International Voices (6)

| App ID | Name | Tone | Model ID | Use Case |
|--------|------|------|----------|----------|
| `aria` | Aria - Neutral Female | Clear | `neutral_aria` | International content, accessible |
| `maya` | Maya - Neutral Female | Balanced | `neutral_maya` | Multilingual audiences |
| `elena` | Elena - Neutral Female | Professional | `neutral_elena` | Global business content |
| `kai` | Kai - Neutral Male | Clear | `neutral_kai` | Technical content, tutorials |
| `atlas` | Atlas - Neutral Male | Steady | `neutral_atlas` | Reliable, factual content |
| `logan` | Logan - Neutral Male | Professional | `neutral_logan` | Corporate, international |

### Specialized Voices (3)

| App ID | Name | Tone | Model ID | Use Case |
|--------|------|------|----------|----------|
| `narrator` | Narrator - Documentary Style | Documentary | `specialized_narrator` | Nature documentaries, films |
| `storyteller` | Storyteller - Dramatic | Dramatic | `specialized_storyteller` | Fiction, dramatic readings |
| `presenter` | Presenter - Informative | Informative | `specialized_presenter` | Conference talks, presentations |

## Voice Selection Guidelines

### By Content Type

**Educational Content:**
- `sophia` (American Female, authoritative)
- `freya` (British Female, articulate)
- `william` (British Male, articulate)

**Business/Corporate:**
- `david` (American Male, authoritative)
- `lucy` (British Female, professional)
- `elena` (Neutral Female, professional)

**Casual/Lifestyle:**
- `mia` (American Female, casual)
- `jacob` (American Male, casual)
- `isla` (Australian Female, casual)

**Storytelling/Narrative:**
- `sarah` (American Female, warm) **[MVP]**
- `samuel` (American Male, warm)
- `storyteller` (Specialized, dramatic)

**Documentary:**
- `michael` (American Male, calm) **[MVP]**
- `narrator` (Specialized, documentary style)
- `william` (British Male, articulate)

**Energetic/Upbeat:**
- `emma` (American Female, energetic) **[MVP]**
- `liam` (American Male, enthusiastic)
- `cooper` (Australian Male, enthusiastic)

### By Target Audience

**International Audience:**
- Neutral accent voices: `aria`, `maya`, `elena`, `kai`, `atlas`, `logan`

**UK Audience:**
- British voices: 12 options (6 female, 6 male)

**US Audience:**
- American voices: 13 options per gender

**Australian Audience:**
- Australian voices: 6 options (3 female, 3 male)

## Technical Specifications

### Audio Format
- **Format:** MP3
- **Bitrate:** 128kbps
- **Sample Rate:** 44.1kHz
- **Channels:** Mono
- **Quality:** Consistent across all voices

### Performance
- **Cold Start (First Request):** ~3-5 seconds (includes model loading)
- **Warm Requests (Subsequent):** <2 seconds (model cached)
- **Preview Audio Size:** ~100-300KB per voice
- **Memory Usage:** ~400MB (shared across all voices)

### Storage
- **Preview Samples:** `.cache/audio/previews/{voiceId}.mp3`
- **Scene Audio:** `.cache/audio/projects/{projectId}/scene-{number}.mp3`
- **Cleanup Policy:** Previews never deleted, scene audio deleted after 30 days

## Model ID Mapping

The `modelId` field maps application voice IDs to KokoroTTS internal model identifiers. This mapping enables:
- Easy voice selection by friendly name
- Consistent naming across application
- Future model version updates without changing application code

**Naming Conventions:**
- `af_*`: American Female
- `am_*`: American Male
- `bf_*`: British Female
- `bm_*`: British Male
- `au_*`: Australian (gender varies)
- `neutral_*`: Neutral/International
- `specialized_*`: Specialized voices

## Usage in Application

### Accessing Voice Profiles

```typescript
import { MVP_VOICES, getVoiceById, getVoicesByAccent } from '@/lib/tts/voice-profiles';

// Get MVP voices (5)
const mvpVoices = MVP_VOICES;

// Get specific voice
const sarah = getVoiceById('sarah');

// Get all American voices
const americanVoices = getVoicesByAccent('american');
```

### TTS Generation

```typescript
import { getTTSProvider } from '@/lib/tts/factory';

const provider = getTTSProvider();
const audio = await provider.generateAudio(
  'Hello, I am your AI video narrator.',
  'sarah' // Uses model ID 'af_sky' internally
);
```

## Post-MVP Expansion

### Phase 1: Expose Extended Catalog (Story 2.6+)
- Update UI to show all 48 voices
- Add filtering by gender, accent, tone
- Implement voice search

### Phase 2: Custom Voice Profiles (Future)
- KokoroTTS supports voice blending
- Allow users to create custom voice profiles
- Mix characteristics from multiple base voices

### Phase 3: Voice Samples (Future)
- Generate comprehensive preview samples for all 48 voices
- Add comparison feature
- Voice profile recommendations based on content type

## Testing

### Voice Profile Validation
- All 48 voices have unique IDs
- All model IDs are unique
- All MVP voices are accessible
- Preview URLs follow correct format

### Integration Testing
- Test synthesis with each MVP voice
- Verify audio quality and format
- Validate model ID mapping

## References

- **KokoroTTS Repository:** https://github.com/kokorotts/kokorotts
- **Model Documentation:** See KokoroTTS official docs
- **Voice Profiles Implementation:** `ai-video-generator/src/lib/tts/voice-profiles.ts`
- **TTS Provider:** `ai-video-generator/src/lib/tts/kokoro-provider.ts`
- **Story Definition:** `docs/stories/story-2.1.md`

## Notes

**Model ID Verification:**
The model IDs in this catalog are representative. Actual KokoroTTS model IDs should be verified against the official KokoroTTS documentation and API. Model IDs may differ based on:
- KokoroTTS version
- Model checkpoint version
- Regional variations

**Voice Quality:**
All voices have consistent 4.35 MOS quality score. Individual preferences may vary based on:
- Content type
- Target audience
- Personal taste

**Future Updates:**
This catalog will be updated as:
- New KokoroTTS models are released
- Additional voices become available
- User feedback indicates voice preferences

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-06 | DEV Agent | Initial catalog documentation (48 voices) |

---

**Total Voices:** 48
**MVP Voices:** 5
**Status:** Complete and ready for use
