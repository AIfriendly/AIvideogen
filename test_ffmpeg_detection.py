#!/usr/bin/env python3
"""
Test script to verify FFmpeg detection functionality.
This script tests the FFmpeg availability check and version detection.
"""

import shutil
import subprocess
from typing import Optional


def check_ffmpeg_available() -> bool:
    """Check if FFmpeg is available on the system.

    Returns:
        True if FFmpeg is available, False otherwise
    """
    return shutil.which('ffmpeg') is not None


def get_ffmpeg_version() -> Optional[str]:
    """Get the FFmpeg version string.

    Returns:
        FFmpeg version string if available, None otherwise
    """
    if not check_ffmpeg_available():
        return None

    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            # Extract version from first line
            first_line = result.stdout.split('\n')[0]
            return first_line.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        print(f"Failed to get FFmpeg version: {e}")

    return None


def main():
    """Run FFmpeg detection tests."""
    print("=" * 70)
    print("FFmpeg Detection Test")
    print("=" * 70)

    # Test 1: Check if FFmpeg is available
    is_available = check_ffmpeg_available()
    print(f"\n1. FFmpeg Available: {is_available}")

    # Test 2: Get FFmpeg path
    ffmpeg_path = shutil.which('ffmpeg')
    print(f"2. FFmpeg Path: {ffmpeg_path}")

    # Test 3: Get FFmpeg version
    ffmpeg_version = get_ffmpeg_version()
    print(f"3. FFmpeg Version: {ffmpeg_version}")

    # Summary
    print("\n" + "=" * 70)
    if is_available:
        print("SUCCESS: FFmpeg is installed and accessible")
        print(f"Path: {ffmpeg_path}")
        print(f"Version: {ffmpeg_version}")
    else:
        print("WARNING: FFmpeg is NOT available on this system")
        print("Please install FFmpeg from: https://ffmpeg.org/download.html")
        print("FFmpeg is required for HLS (.m3u8) video stream processing")
    print("=" * 70)


if __name__ == "__main__":
    main()
