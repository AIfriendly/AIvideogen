#!/usr/bin/env python3
"""Generate voice preview audio files for all 15 new MVP voices"""
import os
import sys

# Suppress spinner to avoid Unicode errors
os.environ['PYTHONIOENCODING'] = 'utf-8'

from kokoro_tts import convert_text_to_audio

# Voice mappings: (voice_id, model_id)
VOICES = [
    ('sophia', 'af_nova'),
    ('grace', 'af_jessica'),
    ('charlotte', 'af_sky'),
    ('lucy', 'bf_alice'),
    ('freya', 'bf_isabella'),
    ('matilda', 'af_nicole'),
    ('aria', 'af_kore'),
    ('david', 'am_eric'),
    ('ethan', 'am_fenrir'),
    ('liam', 'am_puck'),
    ('samuel', 'am_echo'),
    ('william', 'bm_daniel'),
    ('lucas', 'am_liam'),
    ('kai', 'am_onyx'),
    ('george', 'bm_george'),
]

PREVIEW_TEXT = "Welcome to the BMAD AI video generator. This is a sample of the voice you have selected."
OUTPUT_DIR = "ai-video-generator/.cache/audio/previews"

# Create temp input file
with open('temp_preview_input.txt', 'w', encoding='utf-8') as f:
    f.write(PREVIEW_TEXT)

print(f"Generating {len(VOICES)} preview audio files...")
print(f"Output directory: {OUTPUT_DIR}\n")

success_count = 0
for voice_id, model_id in VOICES:
    output_path = f"{OUTPUT_DIR}/{voice_id}.mp3"

    try:
        print(f"[{success_count + 1}/{len(VOICES)}] Generating {voice_id}.mp3 (model: {model_id})...", end=' ')
        sys.stdout.flush()

        convert_text_to_audio(
            'temp_preview_input.txt',
            output_path,
            voice=model_id,
            format='mp3',
            debug=False
        )

        # Check file was created
        if os.path.exists(output_path):
            size_kb = os.path.getsize(output_path) / 1024
            print(f"OK ({size_kb:.1f}KB)")
            success_count += 1
        else:
            print("FAILED (file not created)")

    except Exception as e:
        print(f"ERROR: {e}")

# Cleanup
os.remove('temp_preview_input.txt')

print(f"\n{'='*60}")
print(f"Generation Complete: {success_count}/{len(VOICES)} files created")
print(f"Output directory: {OUTPUT_DIR}")
print(f"{'='*60}")
