#!/usr/bin/env python3
"""
Generate a single voice preview file
Usage: python generate-voice-preview.py <voice_id> <model_id> <text> <output_path>
"""

import sys
import os
from kokoro_tts import convert_text_to_audio

def main():
    if len(sys.argv) != 5:
        print("Usage: python generate-voice-preview.py <voice_id> <model_id> <text> <output_path>")
        sys.exit(1)

    voice_id = sys.argv[1]
    model_id = sys.argv[2]
    text = sys.argv[3]
    output_path = sys.argv[4]

    print(f"Generating preview for {voice_id} (model: {model_id})...")

    # Create temp text file
    temp_file = f"{output_path}.txt"
    with open(temp_file, 'w', encoding='utf-8') as f:
        f.write(text)

    try:
        # Generate audio
        convert_text_to_audio(
            input_file=temp_file,
            output_file=output_path,
            format="mp3",
            voice=model_id
        )

        # Check if file was created
        if os.path.exists(output_path):
            size = os.path.getsize(output_path)
            print(f"Success: {output_path} ({size} bytes)")
        else:
            print(f"Error: File not created")
            sys.exit(1)

    finally:
        # Clean up temp file
        if os.path.exists(temp_file):
            os.remove(temp_file)

if __name__ == "__main__":
    main()