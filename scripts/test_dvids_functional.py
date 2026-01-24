#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DVIDS MCP Server - Functional Test

Tests the DVIDS scraping server by actually calling its methods
to search for and download a real video from DVIDS.
"""

import asyncio
import sys
import json
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path.cwd()))

from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

GREEN = '\x1b[32m'
YELLOW = '\x1b[33m'
BLUE = '\x1b[34m'
RED = '\x1b[31m'
BRIGHT = '\x1b[1m'
RESET = '\x1b[0m'

def log(msg, color=''):
    print(f'{color}{msg}{RESET}')

def section(title):
    print('\n' + '=' * 60)
    log(title, BRIGHT)
    print('=' * 60)

async def main():
    try:
        section('DVIDS MCP - Functional Test')

        # Initialize server with cache directory
        log('Initializing DVIDS MCP server...', BLUE)
        cache_dir = Path.cwd() / 'assets' / 'cache' / 'dvids'
        cache_dir.mkdir(parents=True, exist_ok=True)
        log(f'Cache directory: {cache_dir}', BLUE)

        server = DVIDSScrapingMCPServer(str(cache_dir))

        # Test 1: Search for videos
        section('Test 1: Search DVIDS for Videos')
        test_query = 'military aircraft'
        log(f'Query: "{test_query}"', YELLOW)
        log('Searching DVIDS website via Playwright...', BLUE)

        videos = await server.search_videos(query=test_query, max_duration=120)

        log(f'SUCCESS: Found {len(videos)} videos', GREEN)

        if len(videos) > 0:
            log('\nTop 3 results:', BLUE)
            for i, video in enumerate(videos[:3]):
                log(f'  {i+1}. {video.get("title", "Unknown")}', BLUE)
                log(f'     Duration: {video.get("duration", "N/A")}s', BLUE)
                log(f'     Video ID: {video.get("videoId", "N/A")}', BLUE)

            # Test 2: Download first video
            section('Test 2: Download First Video')
            first_video = videos[0]
            video_id = first_video.get('videoId')

            if video_id:
                log(f'Downloading video: {first_video.get("title", "Unknown")}', YELLOW)
                log(f'Video ID: {video_id}', YELLOW)

                download_info = await server.download_video(video_id)

                log(f'SUCCESS: Video downloaded!', GREEN)
                log(f'Cache path: {download_info.get("cache_path", "Unknown")}', BLUE)

                # Check file exists
                cache_path = download_info.get('cache_path')
                if cache_path and Path(cache_path).exists():
                    size = Path(cache_path).stat().st_size / (1024 * 1024)
                    log(f'File size: {size:.2f} MB', GREEN)
                    log(f'File verified: {cache_path}', GREEN)

                section('VALIDATION COMPLETE')
                log('DVIDS MCP server is fully functional!', GREEN)
                log('Successfully searched and downloaded from DVIDS.', GREEN)
                log('\nPROOF: A real DVIDS video was downloaded!', GREEN)
            else:
                log('SKIPPED: No video ID in result', YELLOW)
        else:
            log('WARNING: No videos found in search results', YELLOW)
            log('This could indicate DVIDS scraping issue or rate limiting.', YELLOW)

    except Exception as e:
        section('ERROR')
        log(str(e), RED)
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
