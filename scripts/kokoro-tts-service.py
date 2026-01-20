#!/usr/bin/env python3
"""
Persistent TTS Service for KokoroTTS

This service keeps the KokoroTTS model loaded in memory for fast synthesis.
Communicates via JSON protocol over stdin/stdout.

Architecture:
- Long-running process (like Ollama on port 11434)
- Model loaded ONCE on startup and cached in memory
- Processes requests via JSON protocol (stdin/stdout)
- Fast subsequent requests (<2s) after cold start (~5s)

Performance:
- Cold start (first request): ~3-5 seconds (includes model loading)
- Warm requests (subsequent): <2 seconds (model already loaded)
- Memory usage: ~400MB (82M parameter model in RAM)

Communication Protocol:
- Requests: JSON via stdin (one per line)
- Responses: JSON via stdout (one per line)
- Logs: Text via stderr (separate from JSON responses)

Request Format:
{
  "action": "synthesize",
  "text": "Hello, I'm your AI video narrator.",
  "voiceId": "af_sky",
  "outputPath": ".cache/audio/projects/abc123/scene-1.mp3"
}

Response Format:
{
  "success": true,
  "duration": 5.23,
  "filePath": ".cache/audio/projects/abc123/scene-1.mp3",
  "fileSize": 123456
}

Error Response:
{
  "success": false,
  "error": {
    "code": "TTS_INVALID_VOICE",
    "message": "Voice 'xyz' not found"
  }
}

Author: DEV Agent
Date: 2025-11-06
Story: 2.1 - TTS Engine Integration & Voice Profile Setup
"""

import json
import sys
import os
import signal
import warnings
from pathlib import Path
from typing import Dict, Any

# Suppress ALL Python warnings to prevent them from polluting stdout
# Some libraries (kokoro_tts) emit FutureWarning/DeprecationWarning that break JSON parsing
warnings.filterwarnings("ignore")
# Set PYTHONWARNINGS environment variable for subprocesses
os.environ['PYTHONWARNINGS'] = 'ignore'

# Fix Windows encoding issue: Force UTF-8 for stdout
# This prevents UnicodeEncodeError when kokoro_tts spinner uses Braille characters
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

# Logging helper (stderr only, separate from JSON stdout)
def log(level: str, message: str):
    """Log to stderr with timestamp"""
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}", file=sys.stderr, flush=True)

# Signal handler for graceful shutdown
def signal_handler(signum, frame):
    log("INFO", f"Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

# SIGTERM is not supported on Windows, only set it on Unix systems
if hasattr(signal, 'SIGTERM'):
    signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

def main():
    """Main service loop"""

    # Notify parent process that we're loading
    status_loading = {"status": "loading", "message": "Loading KokoroTTS model..."}
    print(json.dumps(status_loading), file=sys.stderr, flush=True)
    log("INFO", "TTS Service starting up...")
    log("INFO", "Loading KokoroTTS model (82M parameters, ~320MB)...")

    try:
        # Import KokoroTTS functions
        from kokoro_tts import convert_text_to_audio

        log("INFO", "KokoroTTS functions loaded successfully")

        # Notify parent process that we're ready
        status_ready = {"status": "ready", "model": "kokoro-82m"}
        print(json.dumps(status_ready), file=sys.stderr, flush=True)
        log("INFO", "TTS Service ready to process requests")

    except ImportError as e:
        error = {
            "status": "error",
            "code": "TTS_NOT_INSTALLED",
            "message": "KokoroTTS not installed. Run: uv pip install -r requirements.txt"
        }
        print(json.dumps(error), file=sys.stderr, flush=True)
        log("ERROR", f"Import failed: {str(e)}")
        sys.exit(1)

    except Exception as e:
        error = {
            "status": "error",
            "code": "TTS_MODEL_NOT_FOUND",
            "message": f"Model loading failed: {str(e)}"
        }
        print(json.dumps(error), file=sys.stderr, flush=True)
        log("ERROR", f"Model loading failed: {str(e)}")
        sys.exit(1)

    # Process requests in loop (PERSISTENT SERVICE)
    request_count = 0
    while True:
        try:
            # Read request from stdin (blocking)
            line = sys.stdin.readline()
            if not line:
                log("INFO", "stdin closed, exiting")
                break

            request_count += 1
            log("DEBUG", f"Processing request #{request_count}")

            # Parse JSON request
            try:
                request = json.loads(line.strip())
            except json.JSONDecodeError as e:
                error_response = {
                    "success": False,
                    "error": {
                        "code": "INVALID_JSON",
                        "message": f"Invalid JSON: {str(e)}"
                    }
                }
                print(json.dumps(error_response), flush=True)
                log("ERROR", f"Invalid JSON in request #{request_count}: {str(e)}")
                continue

            # Handle different actions
            action = request.get("action")

            if action == "synthesize":
                handle_synthesize(request)

            elif action == "ping":
                # Health check
                response = {
                    "success": True,
                    "status": "healthy",
                    "model": "kokoro-82m",
                    "requests_processed": request_count
                }
                print(json.dumps(response), flush=True)
                log("DEBUG", f"Health check: OK (processed {request_count} requests)")

            elif action == "shutdown":
                log("INFO", f"Shutdown requested after {request_count} requests")
                break

            else:
                error_response = {
                    "success": False,
                    "error": {
                        "code": "UNKNOWN_ACTION",
                        "message": f"Unknown action: {action}"
                    }
                }
                print(json.dumps(error_response), flush=True)
                log("WARN", f"Unknown action in request #{request_count}: {action}")

        except KeyboardInterrupt:
            log("INFO", "Keyboard interrupt received, shutting down...")
            break

        except Exception as e:
            error_response = {
                "success": False,
                "error": {
                    "code": "TTS_SERVICE_ERROR",
                    "message": f"Internal error: {str(e)}"
                }
            }
            print(json.dumps(error_response), flush=True)
            log("ERROR", f"Unexpected error in request #{request_count}: {str(e)}")

    log("INFO", f"TTS Service shutting down after processing {request_count} requests")

def handle_synthesize(request: Dict[str, Any]):
    """
    Handle synthesize request

    Request format:
    {
      "action": "synthesize",
      "text": "Hello, world",
      "voiceId": "af_sky",
      "outputPath": ".cache/audio/test.mp3"
    }
    """
    import tempfile
    from mutagen.mp3 import MP3
    from kokoro_tts import convert_text_to_audio

    try:
        # Extract parameters
        text = request.get("text", "")
        voice_id = request.get("voiceId", "af_sky")
        output_path = request.get("outputPath", "")

        # Validate parameters
        if not text:
            raise ValueError("Text is required")
        if not output_path:
            raise ValueError("Output path is required")
        if len(text) > 5000:
            raise ValueError("Text too long (max 5000 characters)")

        log("INFO", f"Synthesizing: {len(text)} chars, voice={voice_id}")

        # Ensure output directory exists
        # Use resolve() to ensure absolute path regardless of current working directory
        output_file = Path(output_path).resolve()
        log("DEBUG", f"Original path: {output_path}")
        log("DEBUG", f"Resolved path: {output_file}")
        log("DEBUG", f"CWD: {Path.cwd()}")
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Write text to temporary file (required by convert_text_to_audio API)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as temp_text:
            temp_text.write(text)
            temp_text_path = temp_text.name

        try:
            # Suppress stdout during TTS generation to prevent kokoro_tts spinner
            # from writing to stdout (which is reserved for JSON responses only)
            old_stdout = sys.stdout
            devnull_file = None

            try:
                # Open devnull with explicit encoding for Windows compatibility
                if sys.platform == 'win32':
                    devnull_file = open(os.devnull, 'w', encoding='utf-8')
                else:
                    devnull_file = open(os.devnull, 'w')
                sys.stdout = devnull_file

                # Synthesize audio using convert_text_to_audio
                # Wrap in additional try-except to catch kokoro_tts internal errors
                try:
                    convert_text_to_audio(
                        input_file=temp_text_path,
                        output_file=str(output_file),
                        voice=voice_id,
                        speed=1.0,
                        format='mp3'
                    )
                except SystemExit as e:
                    # Catch sys.exit() calls from kokoro_tts library
                    log("ERROR", f"KokoroTTS called sys.exit({e.code}). This is a library bug.")
                    raise RuntimeError(f"KokoroTTS synthesis failed with exit code {e.code}")
                except Exception as e:
                    log("ERROR", f"KokoroTTS synthesis error: {type(e).__name__}: {str(e)}")
                    raise

            finally:
                # Restore stdout before closing devnull
                sys.stdout = old_stdout
                # Close devnull file if it was opened
                if devnull_file is not None:
                    try:
                        devnull_file.close()
                    except Exception as e:
                        log("WARN", f"Error closing devnull: {str(e)}")
        finally:
            # Clean up temp file
            if os.path.exists(temp_text_path):
                os.unlink(temp_text_path)

        # Get file stats and duration
        file_size = output_file.stat().st_size

        # Calculate duration from MP3 file
        try:
            audio_info = MP3(str(output_file))
            duration = audio_info.info.length
        except:
            # Fallback: estimate duration from file size (128kbps MP3)
            duration = (file_size * 8) / (128 * 1024)

        log("INFO", f"Audio generated: {duration:.2f}s, {file_size} bytes")
        log("DEBUG", f"File written to: {output_file}")
        log("DEBUG", f"File exists: {output_file.exists()}")

        # Return success response
        response = {
            "success": True,
            "duration": duration,
            "filePath": str(output_path),
            "fileSize": file_size
        }
        print(json.dumps(response), flush=True)

    except ValueError as e:
        # Validation error
        error_response = {
            "success": False,
            "error": {
                "code": "INVALID_PARAMETERS",
                "message": str(e)
            }
        }
        print(json.dumps(error_response), flush=True)
        log("ERROR", f"Validation error: {str(e)}")

    except AttributeError as e:
        # API mismatch (KokoroTTS API might differ)
        error_response = {
            "success": False,
            "error": {
                "code": "TTS_API_ERROR",
                "message": f"API mismatch: {str(e)}. Check KokoroTTS version."
            }
        }
        print(json.dumps(error_response), flush=True)
        log("ERROR", f"API error: {str(e)}")

    except FileNotFoundError as e:
        # Voice not found
        error_response = {
            "success": False,
            "error": {
                "code": "TTS_INVALID_VOICE",
                "message": f"Voice '{voice_id}' not found"
            }
        }
        print(json.dumps(error_response), flush=True)
        log("ERROR", f"Voice not found: {voice_id}")

    except Exception as e:
        # General synthesis error
        error_response = {
            "success": False,
            "error": {
                "code": "TTS_SYNTHESIS_ERROR",
                "message": f"Synthesis failed: {str(e)}"
            }
        }
        print(json.dumps(error_response), flush=True)
        log("ERROR", f"Synthesis error: {str(e)}")

if __name__ == "__main__":
    main()
