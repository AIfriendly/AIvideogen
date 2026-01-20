from kokoro_tts import convert_text_to_audio

# Create test text file
with open("test.txt", "w") as f:
    f.write("Hello! This is a test of the AI video generator text to speech system.")

# Generate audio
convert_text_to_audio(
    input_file="test.txt",
    output_file="test.mp3",
    format="mp3",
    voice="af_sky"
)

print("Audio generated: test.mp3")
