"""
TEST-AC-6.10.5: VideoCache Edge Case and Error Handling Tests

These tests validate edge cases and error paths NOT covered in the original test suite.
As a Test Coverage Analyst, I analyzed the implementation code to find gaps.

Priority Tags:
- [P0]: Critical paths that must never fail
- [P1]: Important error scenarios
- [P2]: Edge cases
- [P3]: Nice-to-have validations
"""

import pytest
import tempfile
import json
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import threading
import time


class TestCacheErrorHandling:
    """Test error handling paths in VideoCache."""

    @pytest.mark.P1
    def test_cache_handles_corrupted_metadata_json(self):
        """[P1] VideoCache should recover gracefully from corrupted metadata.json.

        GIVEN: A VideoCache instance with corrupted metadata.json
        WHEN: Loading the cache
        THEN: Should create new metadata structure and log warning
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            cache_dir = Path(temp_dir) / "cache"
            cache_dir.mkdir(parents=True, exist_ok=True)

            # Create corrupted metadata.json
            metadata_file = cache_dir / "metadata.json"
            metadata_file.write_text("{invalid json content {{{")

            from mcp_servers.cache import VideoCache

            # Should not raise exception, should recover
            cache = VideoCache(
                provider_name="dvids",
                cache_dir=str(cache_dir),
                default_ttl_days=30
            )

            # Should have fresh metadata structure
            assert cache._metadata == {"videos": {}}
            assert metadata_file.exists()

    @pytest.mark.P1
    def test_cache_handles_missing_cached_date(self):
        """[P1] VideoCache should handle entries missing cached_date field.

        GIVEN: A cache entry with missing cached_date
        WHEN: Checking is_cached()
        THEN: Should return False (treat as invalid)
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            video_id = "test_no_date"
            cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text("content")

            # Create metadata without cached_date
            metadata = {
                "videos": {
                    video_id: {
                        "provider": "dvids",
                        "ttl": 30,
                        "file_path": str(cache_file)
                        # Missing cached_date
                    }
                }
            }
            metadata_file = Path(temp_dir) / "metadata.json"
            metadata_file.write_text(json.dumps(metadata))

            # Should return False when cached_date is missing
            assert cache.is_cached(video_id) is False

    @pytest.mark.P1
    def test_cache_handles_invalid_cached_date_format(self):
        """[P1] VideoCache should handle invalid cached_date format gracefully.

        GIVEN: A cache entry with invalid cached_date format
        WHEN: Checking is_cached() or get_cache_age()
        THEN: Should return False/None and log error
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            video_id = "test_bad_date"
            cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text("content")

            # Invalid date format
            metadata = {
                "videos": {
                    video_id: {
                        "provider": "dvids",
                        "cached_date": "not-a-valid-date",
                        "ttl": 30,
                        "file_path": str(cache_file)
                    }
                }
            }
            metadata_file = Path(temp_dir) / "metadata.json"
            metadata_file.write_text(json.dumps(metadata))

            assert cache.is_cached(video_id) is False
            assert cache.get_cache_age(video_id) is None

    @pytest.mark.P1
    def test_cache_handles_missing_file_on_disk(self):
        """[P1] VideoCache should handle metadata pointing to non-existent file.

        GIVEN: Metadata entry exists but file is missing from disk
        WHEN: Checking is_cached()
        THEN: Should return False and log warning
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            video_id = "test_missing_file"
            missing_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"

            # Metadata points to file that doesn't exist
            metadata = {
                "videos": {
                    video_id: {
                        "provider": "dvids",
                        "cached_date": datetime.now().isoformat(),
                        "ttl": 30,
                        "file_path": str(missing_file)
                    }
                }
            }
            metadata_file = Path(temp_dir) / "metadata.json"
            metadata_file.write_text(json.dumps(metadata))

            # Should return False since file doesn't exist
            assert cache.is_cached(video_id) is False

    @pytest.mark.P2
    def test_cache_handles_file_permission_errors(self):
        """[P2] VideoCache should handle file read/write permission errors.

        GIVEN: Cache file with restricted permissions
        WHEN: Attempting to read or write
        THEN: Should handle gracefully (not crash)
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            video_id = "test_perm"
            cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_bytes(b"test content")

            # Add to metadata
            metadata = {
                "videos": {
                    video_id: {
                        "provider": "dvids",
                        "cached_date": datetime.now().isoformat(),
                        "ttl": 30,
                        "file_path": str(cache_file)
                    }
                }
            }
            metadata_file = Path(temp_dir) / "metadata.json"
            metadata_file.write_text(json.dumps(metadata))

            # Mock a read error
            with patch.object(Path, 'read_bytes', side_effect=PermissionError("Access denied")):
                # get() should fall through to fetch on read error
                fetch_called = False
                def mock_fetch(v):
                    nonlocal fetch_called
                    fetch_called = True
                    return b"fetched_content"

                result = cache.get(video_id, mock_fetch)
                assert fetch_called  # Should have fallen back to fetch


class TestCacheEdgeCases:
    """Test edge cases in VideoCache."""

    @pytest.mark.P2
    def test_cache_with_zero_ttl(self):
        """[P2] VideoCache should handle TTL of 0 (always expired).

        GIVEN: A cache entry with TTL=0
        WHEN: Checking is_cached()
        THEN: Should always return False (immediately expired)
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=0  # Zero TTL
            )

            video_id = "test_zero_ttl"
            cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text("content")

            metadata = {
                "videos": {
                    video_id: {
                        "provider": "dvids",
                        "cached_date": datetime.now().isoformat(),
                        "ttl": 0,  # Override default with zero
                        "file_path": str(cache_file)
                    }
                }
            }
            metadata_file = Path(temp_dir) / "metadata.json"
            metadata_file.write_text(json.dumps(metadata))

            # Zero TTL means always expired
            assert cache.is_cached(video_id) is False

    @pytest.mark.P2
    def test_cache_with_very_large_ttl(self):
        """[P2] VideoCache should handle very large TTL values.

        GIVEN: A cache entry with TTL=36500 (100 years)
        WHEN: Checking is_cached()
        THEN: Should return True (effectively never expires)
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            video_id = "test_large_ttl"
            cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text("content")

            metadata = {
                "videos": {
                    video_id: {
                        "provider": "dvids",
                        "cached_date": datetime.now().isoformat(),
                        "ttl": 36500,  # 100 years
                        "file_path": str(cache_file)
                    }
                }
            }
            metadata_file = Path(temp_dir) / "metadata.json"
            metadata_file.write_text(json.dumps(metadata))

            assert cache.is_cached(video_id) is True

    @pytest.mark.P2
    def test_cache_with_unicode_video_ids(self):
        """[P2] VideoCache should handle unicode characters in video_id.

        GIVEN: Video IDs with unicode characters
        WHEN: Caching and retrieving videos
        THEN: Should handle correctly
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            # Test various unicode video IDs
            unicode_ids = [
                "test_中文",
                "test_日本語",
                "test_한국어",
                "test_العربية",
                "test_emoji_😀"
            ]

            for video_id in unicode_ids:
                def mock_fetch(v):
                    return f"content_{v}".encode('utf-8')

                result = cache.get(video_id, mock_fetch)
                assert result == f"content_{video_id}".encode('utf-8')
                assert cache.is_cached(video_id) is True

    @pytest.mark.P3
    def test_cache_get_cache_size_with_missing_files(self):
        """[P3] get_cache_size should handle missing files gracefully.

        GIVEN: Metadata with entries pointing to missing files
        WHEN: Calling get_cache_size()
        THEN: Should skip missing files and return size of existing files
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            # Create one real file
            real_video = "real_video"
            real_file = Path(temp_dir) / "dvids" / f"{real_video}.mp4"
            real_file.parent.mkdir(parents=True, exist_ok=True)
            real_file.write_text("x" * 1000)  # 1000 bytes

            # Create metadata with real and missing files
            metadata = {
                "videos": {
                    real_video: {
                        "provider": "dvids",
                        "cached_date": datetime.now().isoformat(),
                        "ttl": 30,
                        "file_path": str(real_file)
                    },
                    "missing_video": {
                        "provider": "dvids",
                        "cached_date": datetime.now().isoformat(),
                        "ttl": 30,
                        "file_path": str(Path(temp_dir) / "dvids" / "missing.mp4")
                    }
                }
            }
            metadata_file = Path(temp_dir) / "metadata.json"
            metadata_file.write_text(json.dumps(metadata))

            # Should only count real file
            size = cache.get_cache_size()
            assert size == 1000

    @pytest.mark.P2
    def test_cache_invalidate_nonexistent_video(self):
        """[P2] invalidate should return False for non-existent video.

        GIVEN: A cache without the specified video
        WHEN: Calling invalidate(video_id)
        THEN: Should return False and not crash
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            result = cache.invalidate("nonexistent_video")
            assert result is False

    @pytest.mark.P2
    def test_cache_get_cache_age_nonexistent_video(self):
        """[P2] get_cache_age should return None for non-existent video.

        GIVEN: A cache without the specified video
        WHEN: Calling get_cache_age(video_id)
        THEN: Should return None
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            age = cache.get_cache_age("nonexistent_video")
            assert age is None


class TestCacheConcurrentAccess:
    """Test concurrent access to VideoCache (edge case)."""

    @pytest.mark.P2
    def test_cache_concurrent_get_same_video(self):
        """[P2] VideoCache should handle concurrent get() for same video.

        GIVEN: Multiple threads calling get() for same uncached video
        WHEN: Fetching simultaneously
        THEN: Should handle race condition gracefully (may call fetch multiple times)
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            video_id = "test_concurrent"
            fetch_count = 0

            def mock_fetch(v):
                nonlocal fetch_count
                fetch_count += 1
                time.sleep(0.01)  # Simulate slow fetch
                return f"content_{v}".encode('utf-8')

            # Simulate concurrent access
            results = []
            threads = []

            def fetch_in_thread():
                result = cache.get(video_id, mock_fetch)
                results.append(result)

            for _ in range(5):
                thread = threading.Thread(target=fetch_in_thread)
                threads.append(thread)
                thread.start()

            for thread in threads:
                thread.join()

            # All should get results (fetch may be called multiple times)
            assert len(results) == 5
            assert all(r == b"content_test_concurrent" for r in results)
            # Note: Without locking, fetch might be called multiple times


class TestCacheWithDifferentContentTypes:
    """Test cache with different content types."""

    @pytest.mark.P2
    def test_cache_with_string_content(self):
        """[P2] VideoCache should handle string content (not just bytes).

        GIVEN: Fetch function returning string
        WHEN: Calling get()
        THEN: Should cache string content correctly
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            video_id = "test_string_content"

            def mock_fetch(v):
                return "string_content_not_bytes"

            result = cache.get(video_id, mock_fetch)
            assert isinstance(result, str)
            assert result == "string_content_not_bytes"
            assert cache.is_cached(video_id) is True

    @pytest.mark.P2
    def test_cache_with_empty_content(self):
        """[P2] VideoCache should handle empty content.

        GIVEN: Fetch function returning empty bytes/string
        WHEN: Calling get()
        THEN: Should cache empty content correctly
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            # Empty bytes
            video_id1 = "test_empty_bytes"
            result1 = cache.get(video_id1, lambda v: b"")
            assert result1 == b""
            assert cache.is_cached(video_id1) is True

            # Empty string
            video_id2 = "test_empty_string"
            result2 = cache.get(video_id2, lambda v: "")
            assert result2 == ""
            assert cache.is_cached(video_id2) is True

    @pytest.mark.P2
    def test_cache_with_large_binary_content(self):
        """[P2] VideoCache should handle large binary files.

        GIVEN: Fetch function returning large binary content (10MB)
        WHEN: Calling get()
        THEN: Should cache large file correctly
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            from mcp_servers.cache import VideoCache

            cache = VideoCache(
                provider_name="dvids",
                cache_dir=temp_dir,
                default_ttl_days=30
            )

            video_id = "test_large_binary"
            large_content = b"x" * (10 * 1024 * 1024)  # 10MB

            def mock_fetch(v):
                return large_content

            result = cache.get(video_id, mock_fetch)
            assert result == large_content
            assert cache.is_cached(video_id) is True

            # Check cache size
            size = cache.get_cache_size()
            assert size == 10 * 1024 * 1024
