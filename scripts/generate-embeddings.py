#!/usr/bin/env python3
"""
Local Embeddings Service using sentence-transformers

Generates 384-dimensional embeddings using the all-MiniLM-L6-v2 model.
Communicates via JSON protocol over stdin/stdout.

Model: all-MiniLM-L6-v2
- Dimensions: 384
- Speed: ~14,000 sentences/sec on V100 GPU
- Size: ~80MB
- License: Apache 2.0

Communication Protocol:
- Requests: JSON via stdin (one per line)
- Responses: JSON via stdout (one per line)
- Logs: Text via stderr

Request Format:
{
  "action": "embed",
  "texts": ["Hello world", "Another text"]
}

Response Format:
{
  "success": true,
  "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  "dimensions": 384,
  "model": "all-MiniLM-L6-v2"
}

Story 6.1 - RAG Infrastructure Setup
"""

import json
import sys
import os
import signal
from typing import List, Dict, Any

# Fix Windows encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

# Logging helper
def log(level: str, message: str):
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}", file=sys.stderr, flush=True)

# Signal handler for graceful shutdown
def signal_handler(signum, frame):
    log("INFO", f"Received signal {signum}, shutting down...")
    sys.exit(0)

if hasattr(signal, 'SIGTERM'):
    signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# Model name
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
DIMENSIONS = 384

# Cache directory for model
CACHE_DIR = os.path.join(os.getcwd(), '.cache', 'models')

def send_response(response: Dict[str, Any]):
    """Send JSON response to stdout"""
    print(json.dumps(response), flush=True)

def send_error(code: str, message: str):
    """Send error response"""
    send_response({
        "success": False,
        "error": {
            "code": code,
            "message": message
        }
    })

def main():
    """Main service loop"""
    log("INFO", "Embeddings Service starting up...")
    log("INFO", f"Loading model: {MODEL_NAME}")

    try:
        # Import sentence-transformers
        from sentence_transformers import SentenceTransformer

        # Ensure cache directory exists
        os.makedirs(CACHE_DIR, exist_ok=True)

        # Load model (downloads on first run)
        model = SentenceTransformer(MODEL_NAME, cache_folder=CACHE_DIR)

        log("INFO", "Model loaded successfully")

        # Notify parent process that we're ready
        send_response({
            "status": "ready",
            "model": MODEL_NAME,
            "dimensions": DIMENSIONS
        })

    except ImportError as e:
        log("ERROR", f"Failed to import sentence-transformers: {e}")
        send_error("IMPORT_ERROR", f"sentence-transformers not installed: {e}")
        sys.exit(1)
    except Exception as e:
        log("ERROR", f"Failed to load model: {e}")
        send_error("MODEL_LOAD_ERROR", f"Failed to load model: {e}")
        sys.exit(1)

    # Process requests
    log("INFO", "Waiting for embedding requests...")

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
            action = request.get("action")

            if action == "embed":
                texts = request.get("texts", [])

                if not texts:
                    send_error("INVALID_REQUEST", "No texts provided")
                    continue

                if not isinstance(texts, list):
                    texts = [texts]

                log("INFO", f"Generating embeddings for {len(texts)} text(s)")

                # Generate embeddings
                embeddings = model.encode(texts, convert_to_numpy=True)

                # Convert to list for JSON serialization
                embeddings_list = embeddings.tolist()

                send_response({
                    "success": True,
                    "embeddings": embeddings_list,
                    "dimensions": DIMENSIONS,
                    "model": MODEL_NAME,
                    "count": len(embeddings_list)
                })

            elif action == "health":
                send_response({
                    "success": True,
                    "status": "healthy",
                    "model": MODEL_NAME,
                    "dimensions": DIMENSIONS
                })

            elif action == "shutdown":
                log("INFO", "Shutdown requested, exiting...")
                send_response({"success": True, "status": "shutdown"})
                break

            else:
                send_error("UNKNOWN_ACTION", f"Unknown action: {action}")

        except json.JSONDecodeError as e:
            send_error("JSON_PARSE_ERROR", f"Invalid JSON: {e}")
        except Exception as e:
            log("ERROR", f"Error processing request: {e}")
            send_error("PROCESSING_ERROR", f"Error processing request: {e}")

    log("INFO", "Embeddings Service shutting down")

if __name__ == "__main__":
    main()
