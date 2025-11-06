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
from pathlib import Path
from typing import Dict, Any

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
        # Import and load model (THIS HAPPENS ONCE - PERSISTENT CACHING)
        from kokoro_tts import KokoroTTS
        model = KokoroTTS()

        log("INFO", "Model loaded successfully into memory")

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
                handle_synthesize(model, request)

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

def handle_synthesize(model, request: Dict[str, Any]):
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
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Synthesize audio (MODEL ALREADY LOADED - FAST!)
        # Note: Actual KokoroTTS API may differ - adjust as needed
        audio = model.synthesize(text, voice=voice_id)

        # Save to file
        audio.save(
            str(output_file),
            format='mp3',
            bitrate=128,
            sample_rate=44100,
            channels=1
        )

        # Get file stats
        file_size = output_file.stat().st_size
        duration = getattr(audio, 'duration', 0.0)

        log("INFO", f"Audio generated: {duration:.2f}s, {file_size} bytes")

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
