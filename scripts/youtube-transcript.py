#!/usr/bin/env python3
"""
YouTube Transcript Scraper using youtube-transcript-api

Scrapes video transcripts from YouTube videos for RAG indexing.
Supports single video and batch processing with rate limiting.

Usage:
    # Single video
    python youtube-transcript.py --video-id <video_id>

    # Multiple videos (batch)
    python youtube-transcript.py --video-ids <id1>,<id2>,<id3>

Output Format (JSON):
{
  "success": true,
  "transcripts": [
    {
      "videoId": "abc123",
      "text": "Full transcript text...",
      "segments": [{"text": "...", "start": 0.0, "duration": 2.5}],
      "language": "en"
    }
  ],
  "errors": [
    {"videoId": "xyz789", "error": "NO_CAPTIONS", "message": "..."}
  ]
}

Error Codes:
- NO_CAPTIONS: Video has no auto-generated or manual captions
- VIDEO_UNAVAILABLE: Video does not exist or is private
- AGE_RESTRICTED: Video requires age verification
- TRANSCRIPT_DISABLED: Transcript explicitly disabled by uploader
- RATE_LIMITED: Too many requests (includes retry delay)
- UNKNOWN_ERROR: Unexpected error occurred

Story 6.3 - YouTube Channel Sync & Caption Scraping
"""

import json
import sys
import argparse
import time
from typing import List, Dict, Any, Optional

# Fix Windows encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)


def log(level: str, message: str):
    """Log message to stderr"""
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}", file=sys.stderr, flush=True)


def get_transcript(video_id: str, languages: List[str] = None) -> Dict[str, Any]:
    """
    Get transcript for a single video.

    Args:
        video_id: YouTube video ID
        languages: Preferred language codes (default: ['en'])

    Returns:
        Dict with videoId, text, segments, and language

    Raises:
        Exception with error code if transcript unavailable
    """
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled,
        NoTranscriptFound,
        VideoUnavailable,
        NoTranscriptAvailable
    )

    if languages is None:
        languages = ['en', 'en-US', 'en-GB']

    try:
        # Try to get transcript in preferred languages
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Try manually created transcripts first, then auto-generated
        transcript = None
        selected_language = None

        # Try manual transcripts
        for lang in languages:
            try:
                transcript = transcript_list.find_manually_created_transcript([lang])
                selected_language = lang
                break
            except NoTranscriptFound:
                continue

        # Fall back to auto-generated
        if transcript is None:
            for lang in languages:
                try:
                    transcript = transcript_list.find_generated_transcript([lang])
                    selected_language = lang
                    break
                except NoTranscriptFound:
                    continue

        # If still no transcript, try any available
        if transcript is None:
            try:
                # Get first available transcript
                available = list(transcript_list)
                if available:
                    transcript = available[0]
                    selected_language = transcript.language_code
            except Exception:
                pass

        if transcript is None:
            raise NoTranscriptAvailable(video_id)

        # Fetch the actual transcript data
        segments = transcript.fetch()

        # Combine segments into full text
        full_text = ' '.join([seg['text'] for seg in segments])

        return {
            'videoId': video_id,
            'text': full_text,
            'segments': [
                {
                    'text': seg['text'],
                    'start': seg['start'],
                    'duration': seg['duration']
                }
                for seg in segments
            ],
            'language': selected_language or 'unknown'
        }

    except TranscriptsDisabled:
        raise Exception(json.dumps({
            'code': 'TRANSCRIPT_DISABLED',
            'message': f'Transcripts are disabled for video {video_id}'
        }))
    except NoTranscriptFound:
        raise Exception(json.dumps({
            'code': 'NO_CAPTIONS',
            'message': f'No captions found for video {video_id}'
        }))
    except NoTranscriptAvailable:
        raise Exception(json.dumps({
            'code': 'NO_CAPTIONS',
            'message': f'No captions available for video {video_id}'
        }))
    except VideoUnavailable:
        raise Exception(json.dumps({
            'code': 'VIDEO_UNAVAILABLE',
            'message': f'Video {video_id} is unavailable (private, deleted, or does not exist)'
        }))


def get_transcripts_batch(
    video_ids: List[str],
    rate_limit_delay: float = 0.5,
    languages: List[str] = None
) -> Dict[str, Any]:
    """
    Get transcripts for multiple videos with rate limiting.

    Args:
        video_ids: List of YouTube video IDs
        rate_limit_delay: Delay between requests in seconds (default: 0.5s = 2 req/s)
        languages: Preferred language codes

    Returns:
        Dict with transcripts list and errors list
    """
    results = {
        'success': True,
        'transcripts': [],
        'errors': []
    }

    total = len(video_ids)
    log("INFO", f"Processing {total} videos with {rate_limit_delay}s delay between requests")

    for i, video_id in enumerate(video_ids):
        # Progress logging
        if (i + 1) % 10 == 0 or i == 0:
            log("INFO", f"Progress: {i + 1}/{total} videos processed")

        try:
            transcript = get_transcript(video_id, languages)
            results['transcripts'].append(transcript)
            log("INFO", f"[{i + 1}/{total}] Successfully scraped: {video_id}")

        except Exception as e:
            error_str = str(e)
            try:
                error_data = json.loads(error_str)
                results['errors'].append({
                    'videoId': video_id,
                    'error': error_data.get('code', 'UNKNOWN_ERROR'),
                    'message': error_data.get('message', error_str)
                })
            except json.JSONDecodeError:
                results['errors'].append({
                    'videoId': video_id,
                    'error': 'UNKNOWN_ERROR',
                    'message': error_str
                })
            log("WARN", f"[{i + 1}/{total}] Failed: {video_id} - {error_str[:100]}")

        # Rate limiting (skip delay on last item)
        if i < total - 1:
            time.sleep(rate_limit_delay)

    # Mark as partial success if some failed
    if results['errors'] and results['transcripts']:
        results['partial'] = True
    elif results['errors'] and not results['transcripts']:
        results['success'] = False

    log("INFO", f"Completed: {len(results['transcripts'])} succeeded, {len(results['errors'])} failed")

    return results


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Scrape YouTube video transcripts',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        '--video-id',
        help='Single YouTube video ID'
    )
    group.add_argument(
        '--video-ids',
        help='Comma-separated list of YouTube video IDs'
    )

    parser.add_argument(
        '--languages',
        default='en,en-US,en-GB',
        help='Comma-separated list of preferred language codes (default: en,en-US,en-GB)'
    )

    parser.add_argument(
        '--rate-limit',
        type=float,
        default=0.5,
        help='Delay between requests in seconds (default: 0.5 = 2 req/s)'
    )

    args = parser.parse_args()

    # Parse languages
    languages = [lang.strip() for lang in args.languages.split(',')]

    try:
        if args.video_id:
            # Single video mode
            log("INFO", f"Scraping single video: {args.video_id}")
            try:
                transcript = get_transcript(args.video_id, languages)
                result = {
                    'success': True,
                    'transcripts': [transcript],
                    'errors': []
                }
            except Exception as e:
                error_str = str(e)
                try:
                    error_data = json.loads(error_str)
                    result = {
                        'success': False,
                        'transcripts': [],
                        'errors': [{
                            'videoId': args.video_id,
                            'error': error_data.get('code', 'UNKNOWN_ERROR'),
                            'message': error_data.get('message', error_str)
                        }]
                    }
                except json.JSONDecodeError:
                    result = {
                        'success': False,
                        'transcripts': [],
                        'errors': [{
                            'videoId': args.video_id,
                            'error': 'UNKNOWN_ERROR',
                            'message': error_str
                        }]
                    }
        else:
            # Batch mode
            video_ids = [vid.strip() for vid in args.video_ids.split(',') if vid.strip()]
            if not video_ids:
                result = {
                    'success': False,
                    'transcripts': [],
                    'errors': [{
                        'videoId': None,
                        'error': 'INVALID_INPUT',
                        'message': 'No valid video IDs provided'
                    }]
                }
            else:
                result = get_transcripts_batch(video_ids, args.rate_limit, languages)

        # Output JSON to stdout
        print(json.dumps(result, ensure_ascii=False))

    except ImportError as e:
        error_result = {
            'success': False,
            'transcripts': [],
            'errors': [{
                'videoId': None,
                'error': 'IMPORT_ERROR',
                'message': f'youtube-transcript-api not installed: {e}'
            }]
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

    except Exception as e:
        log("ERROR", f"Unexpected error: {e}")
        error_result = {
            'success': False,
            'transcripts': [],
            'errors': [{
                'videoId': None,
                'error': 'FATAL_ERROR',
                'message': str(e)
            }]
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
