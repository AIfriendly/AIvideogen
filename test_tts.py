#!/usr/bin/env python3
"""
Direct TTS Test Script
Tests the KokoroTTS installation by generating a sample audio file
"""

import os
from pathlib import Path

def test_kokoro_tts():
    """Test KokoroTTS with a simple example"""

    print("="*60)
    print("Testing KokoroTTS Direct Generation")
    print("="*60)

    try:
        from kokoro_tts import convert_text_to_audio
        print("[OK] KokoroTTS imported successfully")

        # Create test directory
        test_dir = Path(".cache/audio/test")
        test_dir.mkdir(parents=True, exist_ok=True)
        print(f"[OK] Test directory created: {test_dir}")

        # Test text
        test_text = """
        Hello! This is a test of the AI Video Generator text to speech system.
        We are using KokoroTTS to generate high-quality voice narration.
        This will be used for creating video content with AI-generated voiceovers.
        """

        # Create input text file
        input_file = test_dir / "test_input.txt"
        input_file.write_text(test_text.strip())
        print(f"[OK] Input text file created: {input_file}")

        # Generate audio with different voices
        voices_to_test = [
            ("af_sky", "American Female - Sky"),
            ("af_bella", "American Female - Bella"),
            ("am_adam", "American Male - Adam"),
        ]

        for voice_id, voice_name in voices_to_test:
            output_file = test_dir / f"test_{voice_id}.mp3"

            print(f"\n[...] Generating audio with voice: {voice_name} ({voice_id})...")
            print(f"   Output: {output_file}")

            try:
                # Generate audio
                result = convert_text_to_audio(
                    input_file=str(input_file),
                    output_file=str(output_file),
                    voice=voice_id,
                    speed=1.0,
                    format='mp3'
                )

                # Check if file was created
                if output_file.exists():
                    file_size = output_file.stat().st_size
                    print(f"   [OK] Success! File size: {file_size:,} bytes")

                    # Validate MP3 format
                    with open(output_file, 'rb') as f:
                        header = f.read(3)
                        if header == b'ID3' or header[:2] == b'\xff\xfb':
                            print(f"   [OK] Valid MP3 format confirmed")
                        else:
                            print(f"   [WARN]  File may not be valid MP3")
                else:
                    print(f"   [ERROR] File not created")

            except Exception as e:
                print(f"   [ERROR] Error: {str(e)}")

        # List all generated files
        print("\n" + "="*60)
        print("Generated Audio Files:")
        print("="*60)

        audio_files = list(test_dir.glob("*.mp3"))
        if audio_files:
            for audio_file in audio_files:
                size_kb = audio_file.stat().st_size / 1024
                print(f"- {audio_file.name} - {size_kb:.1f} KB")
        else:
            print("No audio files generated")

        print("\n[OK] TTS test completed!")
        print(f"Files saved in: {test_dir.absolute()}")

    except ImportError as e:
        print(f"[ERROR] Import error: {str(e)}")
        print("Make sure KokoroTTS is installed: pip install kokoro-tts")
    except Exception as e:
        print(f"[ERROR] Unexpected error: {str(e)}")

if __name__ == "__main__":
    test_kokoro_tts()