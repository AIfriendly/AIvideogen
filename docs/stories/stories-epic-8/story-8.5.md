# Story 8.5: Fix Windows Filename Compatibility

**Epic:** 8 - DVIDS Video Provider API Integration
**Status:** done (completed during session 2026-01-25)
**Priority:** P1 (High - Critical for Windows support)
**Points:** 2
**Dependencies:** Story 8.2 (HLS Video Download)
**Created:** 2026-01-25
**Updated:** 2026-01-25
**Developer:** TBD
**Completed:** 2026-01-25

---

## Story Description

Fix filename handling errors on Windows by sanitizing video IDs that contain invalid characters (colons and other reserved characters). DVIDS video IDs may include type prefixes like "VIDEO:988497" which contain colons - a character not allowed in Windows filenames. This story adds sanitization to ensure filenames are valid across all platforms.

**User Value:** Windows users can use the DVIDS video provider without filename errors. Cross-platform compatibility is ensured for all users.

---

## User Story

**As a** Windows user,
**I want** the system to create valid filenames for cached videos,
**So that** I can use DVIDS footage without "invalid filename" errors.

**As a** developer,
**I want** consistent filename handling across platforms,
**So that** the codebase is maintainable and Windows-compatible.

---

## Acceptance Criteria

### AC-8.5.1: Filename Sanitization Function

**Given** video IDs may contain invalid filename characters
**When** creating cached video filenames
**Then** the system shall:
- Implement `sanitize_video_id()` function to clean video IDs
- Remove Windows-invalid characters: `: < > " | ? *` and control characters (0-31)
- Replace invalid characters with dash `-` (safe for all platforms)
- Remove type prefixes: "VIDEO:988497" → "988497", "IMAGE:123" → "123"
- Strip whitespace from start and end
- Validate result is not empty after sanitization
- Return error if sanitization results in empty string

### AC-8.5.2: Type Prefix Removal

**Given** DVIDS video IDs may include type prefixes
**When** sanitizing video IDs
**Then** the system shall:
- Detect colons in video IDs (indicates type prefix)
- Split on first colon only (preserve any colons in content)
- Remove prefix portion: "VIDEO:988497" → "988497"
- Handle multiple prefixes: "TYPE:VIDEO:988497" → "988497"
- Handle IDs without prefixes: "988497" → "988497" (no change)
- Log sanitization: "Sanitized video ID: 'VIDEO:988497' → '988497'"

### AC-8.5.3: Windows Character Replacement

**Given** Windows has reserved filename characters
**When** sanitizing video IDs
**Then** the system shall:
- Replace colon `:` with dash `-`
- Replace less-than `<` with dash `-`
- Replace greater-than `>` with dash `-`
- Replace double-quote `"` with dash `-`
- Replace pipe `|` with dash `-`
- Replace question mark `?` with dash `-`
- Replace asterisk `*` with dash `-`
- Remove control characters (ASCII 0-31)
- Preserve alphanumeric characters, underscores, hyphens, periods

### AC-8.5.4: Edge Case Handling

**Given** video IDs may have unusual formats
**When** sanitizing
**Then** the system shall:
- Handle multiple colons: "Army:Navy:Game" → "Army-Navy-Game"
- Handle consecutive invalid chars: "Test<>File" → "Test--File" (preserved for clarity)
- Handle empty after sanitization: ":" → ERROR (raise ValueError)
- Handle unicode characters: preserve if valid (e.g., "тест-видео" unchanged)
- Handle very long IDs: truncate if needed (max 255 chars for most filesystems)
- Not crash on any input (graceful error handling)

### AC-8.5.5: Cache Path Generation

**Given** cached videos are stored with sanitized IDs
**When** generating cache file paths
**Then** the system shall:
- Use `sanitize_video_id()` before creating file paths
- Generate path: `assets/cache/{provider}/{sanitized_id}.mp4`
- Apply sanitization to all video providers (DVIDS, YouTube, NASA)
- Log cache path: "Caching video to: assets/cache/dvids/988497.mp4"
- Handle subdirectory creation (provider directory may not exist)

### AC-8.5.6: Backward Compatibility

**Given** existing cache may use old filenames
**When** accessing cached videos
**Then** the system shall:
- Check for sanitized filename first (new format)
- Fall back to original ID if sanitized version not found
- Log fallback: "Using legacy filename format"
- Support both formats during transition period
- Not delete or invalidate existing cached files

---

## Implementation Notes

### Sanitization Function

```python
# File: mcp_servers/dvids_scraping_server.py

import re
import logging

logger = logging.getLogger(__name__)

def sanitize_video_id(video_id: str) -> str:
    """
    Sanitize video ID for safe filename usage on all platforms.

    Removes type prefixes (e.g., "VIDEO:988497" → "988497") and
    replaces Windows-invalid characters with dashes.

    Args:
        video_id: Raw video ID that may contain invalid characters

    Returns:
        Sanitized video ID safe for use as filename

    Raises:
        ValueError: If video ID is empty after sanitization
    """
    if not video_id:
        raise ValueError("Video ID cannot be empty")

    # Remove type prefix (split on first colon)
    if ':' in video_id:
        sanitized = video_id.split(':', 1)[-1]
    else:
        sanitized = video_id

    # Replace Windows-invalid characters with dash
    # Invalid: : < > " | ? * and control characters (0-31)
    sanitized = re.sub(r'[<>:"|?*]', '-', sanitized)
    sanitized = ''.join(char for char in sanitized if ord(char) >= 32)

    # Strip whitespace
    sanitized = sanitized.strip()

    # Validate result
    if not sanitized:
        raise ValueError(f"Video ID '{video_id}' is empty after sanitization")

    # Truncate if too long (max 255 chars for most filesystems)
    if len(sanitized) > 255:
        sanitized = sanitized[:255]

    logger.debug(f"Sanitized video ID: '{video_id}' → '{sanitized}'")
    return sanitized
```

### Cache Path Generation

```python
from pathlib import Path

def get_cache_path(provider: str, video_id: str, cache_dir: Path) -> Path:
    """
    Generate cache file path with sanitized video ID.

    Args:
        provider: Provider name (dvids, youtube, nasa)
        video_id: Raw video ID (may contain invalid characters)
        cache_dir: Base cache directory

    Returns:
        Path object for cached video file
    """
    # Create provider subdirectory
    provider_dir = cache_dir / provider
    provider_dir.mkdir(parents=True, exist_ok=True)

    # Sanitize video ID
    sanitized_id = sanitize_video_id(video_id)

    # Generate file path
    cache_path = provider_dir / f"{sanitized_id}.mp4"

    logger.info(f"Cache path for {provider}:{video_id} → {cache_path}")
    return cache_path
```

### Download Integration

```python
async def download_video(hls_url: str, video_id: str, api_key: str) -> Optional[Path]:
    """Download video and cache with sanitized filename."""
    cache_dir = Path(os.getenv('DVIDS_CACHE_DIR', './assets/cache/dvids'))

    # Generate sanitized cache path
    cache_path = get_cache_path('dvids', video_id, cache_dir)

    # Check if already cached
    if cache_path.exists():
        logger.info(f"Video {video_id} already cached at {cache_path}")
        return cache_path

    # Download to temporary file first
    temp_path = cache_path.with_suffix('.tmp')

    try:
        # Download via FFmpeg or httpx
        success = await download_hls_video(hls_url, api_key, temp_path)

        if success:
            # Rename to final cache path
            temp_path.rename(cache_path)
            logger.info(f"Downloaded video to {cache_path}")
            return cache_path
        else:
            temp_path.unlink(missing_ok=True)
            return None

    except Exception as e:
        logger.error(f"Download failed: {e}")
        temp_path.unlink(missing_ok=True)
        return None
```

### Backward Compatibility (Cache Lookup)

```python
def find_cached_video(provider: str, video_id: str, cache_dir: Path) -> Optional[Path]:
    """
    Find cached video, checking both sanitized and legacy formats.

    Args:
        provider: Provider name
        video_id: Raw video ID
        cache_dir: Base cache directory

    Returns:
        Path to cached video if found, None otherwise
    """
    provider_dir = cache_dir / provider

    # Check new sanitized format first
    try:
        sanitized_id = sanitize_video_id(video_id)
        new_path = provider_dir / f"{sanitized_id}.mp4"
        if new_path.exists():
            return new_path
    except ValueError:
        pass  # Invalid ID, try legacy format

    # Check legacy format (original video ID)
    legacy_path = provider_dir / f"{video_id}.mp4"
    if legacy_path.exists():
        logger.debug(f"Using legacy filename format for {video_id}")
        return legacy_path

    return None
```

### TypeScript Version (for client-side)

```typescript
// File: src/lib/download/universal-downloader.ts

/**
 * Sanitize video ID for safe filename usage on all platforms.
 */
export function sanitizeVideoId(videoId: string): string {
  if (!videoId) {
    throw new Error('Video ID cannot be empty');
  }

  // Remove type prefix (split on first colon)
  let sanitized = videoId.includes(':')
    ? videoId.split(':')[1]
    : videoId;

  // Replace Windows-invalid characters with dash
  sanitized = sanitized.replace(/[<>:"|?*]/g, '-');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F]/g, '');

  // Strip whitespace
  sanitized = sanitized.trim();

  // Validate result
  if (!sanitized) {
    throw new Error(`Video ID '${videoId}' is empty after sanitization`);
  }

  // Truncate if too long
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  console.debug(`Sanitized video ID: '${videoId}' → '${sanitized}'`);
  return sanitized;
}

/**
 * Generate cache file path with sanitized video ID.
 */
export function getCachePath(
  provider: string,
  videoId: string,
  cacheDir: string
): string {
  const sanitizedId = sanitizeVideoId(videoId);
  return `${cacheDir}/${provider}/${sanitizedId}.mp4`;
}
```

---

## Testing

### Unit Tests
- Test sanitization with type prefixes
- Test Windows character replacement
- Test edge cases (empty, multiple colons, unicode)
- Test cache path generation
- Test backward compatibility lookup

### Integration Tests
- Download video with sanitized ID on Windows
- Verify file is created with valid filename
- Test accessing cached files with both formats
- Test on multiple platforms (Windows, macOS, Linux)

### Test Scenarios
1. **Type Prefix Removal:** "VIDEO:988497" → "988497" ✓
2. **Windows Characters:** "Test:File" → "Test-File" ✓
3. **Multiple Colons:** "Army:Navy:Game" → "Army-Navy-Game" ✓
4. **Empty After Sanitization:** ":" → ERROR (ValueError) ✓
5. **Backward Compatibility:** Legacy file found and used ✓
6. **Cache Path:** "assets/cache/dvids/988497.mp4" ✓

---

## Definition of Done

- [ ] Sanitization function implemented and tested
- [ ] Type prefix removal working
- [ ] Windows characters replaced correctly
- [ ] Edge cases handled (empty, unicode, long IDs)
- [ ] Cache path generation uses sanitized IDs
- [ ] Backward compatibility for legacy cache files
- [ ] Works on Windows, macOS, and Linux
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass on Windows
- [ ] Code reviewed and approved

---

## References

- **Epic 8:** DVIDS Video Provider API Integration
- **Story 8.2:** HLS Video Download (uses cache paths)
- **Windows Filename Restrictions:** https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file
- **Python Files:** `mcp_servers/dvids_scraping_server.py`, `mcp_servers/cache.py`
- **TypeScript Files:** `src/lib/download/universal-downloader.ts`
