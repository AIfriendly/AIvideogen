"""
TEST-AC-6.10.5: Shared VideoCache Module Tests

These tests validate the shared caching infrastructure that will be used
by both DVIDS and NASA scraping servers.

All tests are FAILING (RED phase) - implementation does not exist yet.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta
import json




# TEST-AC-6.10.5.1: VideoCache Initialization
def test_cache_initialization_creates_directory_structure(temp_cache_dir):
    """TEST-AC-6.10.5.1: VideoCache creates provider-specific cache directory on initialization.

    GIVEN: A provider name and cache directory
    WHEN: VideoCache is initialized with provider_name="dvids"
    THEN: Cache creates provider subdirectory (assets/cache/dvids/) and metadata.json
    """
    cache_dir = Path(temp_cache_dir) / "cache"
    provider_name = "dvids"

    from mcp_servers.cache import VideoCache

    cache = VideoCache(
        provider_name=provider_name,
        cache_dir=str(cache_dir),
        default_ttl_days=30
    )

    # Verify provider directory was created
    provider_dir = cache_dir / provider_name
    assert provider_dir.exists(), f"Provider directory {provider_dir} should be created"

    # Verify metadata.json was created
    metadata_file = cache_dir / "metadata.json"
    assert metadata_file.exists(), "metadata.json should be created"


# TEST-AC-6.10.5.2: Cache Miss - is_cached returns False
def test_is_cached_returns_false_when_video_not_in_cache(temp_cache_dir):
    """TEST-AC-6.10.5.2: is_cached returns False for uncached videos.

    GIVEN: A VideoCache instance
    WHEN: Checking if a non-existent video_id is cached
    THEN: is_cached returns False
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        assert cache.is_cached("nonexistent_video_id") is False


# TEST-AC-6.10.5.3: Cache Hit - is_cached returns True
def test_is_cached_returns_true_when_video_in_cache(temp_cache_dir):
    """TEST-AC-6.10.5.3: is_cached returns True for cached videos within TTL.

    GIVEN: A VideoCache instance with a cached video
    WHEN: Checking if the cached video_id is in cache
    THEN: is_cached returns True
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        # Manually create a cached entry (simulating previous cache)
        video_id = "test_video_123"
        cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text("fake video content")

        # Update metadata - use fixed date for deterministic test
        test_date = datetime(2026, 1, 1, 12, 0, 0)  # Fixed date
        metadata = {
            "videos": {
                video_id: {
                    "provider": "dvids",
                    "cached_date": test_date.isoformat(),
                    "ttl": 30,
                    "file_path": str(cache_file)
                }
            }
        }
        metadata_file = Path(temp_dir) / "metadata.json"
        metadata_file.write_text(json.dumps(metadata))

        assert cache.is_cached(video_id) is True


# TEST-AC-6.10.5.4: Cache Expired - is_cached returns False
def test_is_cached_returns_false_when_cache_expired(temp_cache_dir):
    """TEST-AC-6.10.5.4: is_cached returns False for videos past TTL.

    GIVEN: A VideoCache instance with an expired cached video
    WHEN: Checking if an expired video_id is in cache
    THEN: is_cached returns False (TTL validation)
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        # Create an expired cache entry (31 days old)
        video_id = "expired_video_123"
        cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text("old video content")

        # Set cached_date to 31 days ago (expired) - use fixed date for deterministic test
        test_date = datetime(2026, 1, 1, 12, 0, 0)  # Fixed date
        expired_date = test_date - timedelta(days=31)
        metadata = {
            "videos": {
                video_id: {
                    "provider": "dvids",
                    "cached_date": expired_date.isoformat(),
                    "ttl": 30,
                    "file_path": str(cache_file)
                }
            }
        }
        metadata_file = Path(temp_dir) / "metadata.json"
        metadata_file.write_text(json.dumps(metadata))

        assert cache.is_cached(video_id) is False, "Expired cache should return False"


# TEST-AC-6.10.5.5: Cache Get - Fetch on Miss
def test_get_fetches_video_when_not_cached(temp_cache_dir):
    """TEST-AC-6.10.5.5: get fetches video using fetch_fn when cache miss.

    GIVEN: A VideoCache instance and uncached video_id
    WHEN: Calling cache.get(video_id, fetch_fn) with a fetch function
    THEN: Fetch function is called and result is cached
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        video_id = "new_video_456"

        # Mock fetch function that simulates downloading
        def mock_fetch(video_id):
            return f"downloaded_content_{video_id}"

        result = cache.get(video_id, mock_fetch)

        # Verify fetch was called
        assert result == f"downloaded_content_{video_id}"

        # Verify it's now cached
        assert cache.is_cached(video_id) is True


# TEST-AC-6.10.5.6: Cache Get - Return Cached on Hit
def test_get_returns_cached_video_when_exists(temp_cache_dir):
    """TEST-AC-6.10.5.6: get returns cached video without fetching when cache hit.

    GIVEN: A VideoCache instance with cached video
    WHEN: Calling cache.get(video_id, fetch_fn) for cached video
    THEN: Cached content is returned, fetch_fn is NOT called
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        video_id = "cached_video_789"
        cached_content = b"already_cached_content"

        # Pre-cache the video (binary video files use write_bytes/read_bytes)
        cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_bytes(cached_content)

        metadata = {
            "videos": {
                video_id: {
                    "provider": "dvids",
                    "cached_date": datetime(2026, 1, 1, 12, 0, 0).isoformat(),
                    "ttl": 30,
                    "file_path": str(cache_file)
                }
            }
        }
        metadata_file = Path(temp_dir) / "metadata.json"
        metadata_file.write_text(json.dumps(metadata))

        # Track if fetch was called
        fetch_called = False

        def mock_fetch(video_id):
            nonlocal fetch_called
            fetch_called = True
            return f"fresh_content_{video_id}"

        result = cache.get(video_id, mock_fetch)

        # Verify cached content was returned (bytes for binary video files)
        assert result == cached_content

        # Verify fetch was NOT called
        assert fetch_called is False, "Fetch should not be called for cached videos"


# TEST-AC-6.10.5.7: Cache Invalidation
def test_invalidate_removes_cached_video_and_metadata(temp_cache_dir):
    """TEST-AC-6.10.5.7: invalidate removes video file and metadata.

    GIVEN: A VideoCache instance with cached video
    WHEN: Calling cache.invalidate(video_id)
    THEN: Video file is deleted and metadata is removed
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        video_id = "to_be_invalidated"
        cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text("content to delete")

        metadata = {
            "videos": {
                video_id: {
                    "provider": "dvids",
                    "cached_date": datetime(2026, 1, 1, 12, 0, 0).isoformat(),
                    "ttl": 30,
                    "file_path": str(cache_file)
                }
            }
        }
        metadata_file = Path(temp_dir) / "metadata.json"
        metadata_file.write_text(json.dumps(metadata))

        # Verify it exists before invalidation
        assert cache.is_cached(video_id) is True
        assert cache_file.exists()

        # Invalidate
        cache.invalidate(video_id)

        # Verify file is deleted
        assert cache_file.exists() is False, "Cache file should be deleted"

        # Verify metadata is removed
        assert cache.is_cached(video_id) is False, "Metadata should be removed"


# TEST-AC-6.10.5.8: Cache Statistics - get_cache_size
def test_get_cache_size_returns_total_cache_size(temp_cache_dir):
    """TEST-AC-6.10.5.8: get_cache_size returns total size of all cached files.

    GIVEN: A VideoCache instance with multiple cached videos
    WHEN: Calling cache.get_cache_size()
    THEN: Returns total bytes of all cached files
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        # Create multiple cached files with known sizes
        videos = {
            "video1": "content" * 100,  # 700 bytes
            "video2": "content" * 200,  # 1400 bytes
            "video3": "content" * 50,   # 350 bytes
        }

        for video_id, content in videos.items():
            cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(content)

        metadata = {
            "videos": {
                vid: {
                    "provider": "dvids",
                    "cached_date": datetime(2026, 1, 1, 12, 0, 0).isoformat(),
                    "ttl": 30,
                    "file_path": str(Path(temp_dir) / "dvids" / f"{vid}.mp4")
                }
                for vid in videos.keys()
            }
        }
        metadata_file = Path(temp_dir) / "metadata.json"
        metadata_file.write_text(json.dumps(metadata))

        total_size = cache.get_cache_size()

        # Should be approximately 2450 bytes (700 + 1400 + 350)
        assert total_size > 0, "Cache size should be positive"
        assert total_size == 2450, f"Expected 2450 bytes, got {total_size}"


# TEST-AC-6.10.5.9: Cache Statistics - get_cache_count
def test_get_cache_count_returns_number_of_cached_videos(temp_cache_dir):
    """TEST-AC-6.10.5.9: get_cache_count returns number of cached videos.

    GIVEN: A VideoCache instance with multiple cached videos
    WHEN: Calling cache.get_cache_count()
    THEN: Returns count of cached videos
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        # Create 3 cached videos
        for i in range(3):
            video_id = f"video_{i}"
            cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(f"content_{i}")

        metadata = {
            "videos": {
                f"video_{i}": {
                    "provider": "dvids",
                    "cached_date": datetime(2026, 1, 1, 12, 0, 0).isoformat(),
                    "ttl": 30,
                    "file_path": str(Path(temp_dir) / "dvids" / f"video_{i}.mp4")
                }
                for i in range(3)
            }
        }
        metadata_file = Path(temp_dir) / "metadata.json"
        metadata_file.write_text(json.dumps(metadata))

        count = cache.get_cache_count()
        assert count == 3, f"Expected 3 cached videos, got {count}"


# TEST-AC-6.10.5.10: Cache Statistics - get_cache_age
def test_get_cache_age_returns_age_of_cached_video(temp_cache_dir):
    """TEST-AC-6.10.5.10: get_cache_age returns age of cached video in days.

    GIVEN: A VideoCache instance with a cached video
    WHEN: Calling cache.get_cache_age(video_id)
    THEN: Returns age of video in days since cached_date
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        video_id = "aged_video"
        cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text("content")

        # Cache from 5 days ago - use fixed date for deterministic test
        test_date = datetime(2026, 1, 1, 12, 0, 0)  # Fixed date
        cached_date = test_date - timedelta(days=5)
        metadata = {
            "videos": {
                video_id: {
                    "provider": "dvids",
                    "cached_date": cached_date.isoformat(),
                    "ttl": 30,
                    "file_path": str(cache_file)
                }
            }
        }
        metadata_file = Path(temp_dir) / "metadata.json"
        metadata_file.write_text(json.dumps(metadata))

        age_days = cache.get_cache_age(video_id)

        # Should be approximately 5 days (allow for minor timing differences)
        assert 4 <= age_days <= 6, f"Expected age ~5 days, got {age_days}"


# TEST-AC-6.10.5.11: Cache Shared Between Providers
def test_cache_module_is_shared_between_dvids_and_nasa(temp_cache_dir):
    """TEST-AC-6.10.5.11: Same VideoCache class can be used by DVIDS and NASA servers.

    GIVEN: VideoCache module
    WHEN: Creating instances for different providers (dvids, nasa)
    THEN: Both use same interface but maintain separate caches
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Import from mcp_servers package (pytest.ini adds ai-video-generator to path)
        from mcp_servers.cache import VideoCache

        # Create DVIDS cache
        dvids_cache = VideoCache(
            provider_name="dvids",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        # Create NASA cache
        nasa_cache = VideoCache(
            provider_name="nasa",
            cache_dir=str(temp_cache_dir),
            default_ttl_days=30
        )

        # Both should have same methods
        assert hasattr(dvids_cache, 'is_cached')
        assert hasattr(dvids_cache, 'get')
        assert hasattr(dvids_cache, 'invalidate')
        assert hasattr(dvids_cache, 'get_cache_size')

        assert hasattr(nasa_cache, 'is_cached')
        assert hasattr(nasa_cache, 'get')
        assert hasattr(nasa_cache, 'invalidate')
        assert hasattr(nasa_cache, 'get_cache_size')

        # Should create separate provider directories
        dvids_dir = Path(temp_dir) / "dvids"
        nasa_dir = Path(temp_dir) / "nasa"

        assert dvids_dir.exists()
        assert nasa_dir.exists()
