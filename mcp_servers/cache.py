"""
Shared VideoCache Module for MCP Video Provider Servers

This module provides a shared caching infrastructure for all video provider MCP servers
(DVIDS, NASA, etc.). It manages video file storage, metadata tracking, and TTL validation.

AC-6.10.5: Shared Caching Module
"""

import json
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Callable, Optional, Dict, Any

logger = logging.getLogger(__name__)


class VideoCache:
    """
    Shared video cache for MCP video provider servers.

    Manages local caching of video files with TTL validation, metadata tracking,
    and automatic cache directory management.

    Attributes:
        provider_name: Name of the video provider (e.g., "dvids", "nasa")
        cache_dir: Root cache directory path
        default_ttl_days: Default time-to-live for cached items in days
        provider_dir: Provider-specific cache subdirectory
    """

    def __init__(self, provider_name: str, cache_dir: str, default_ttl_days: int = 30):
        """
        Initialize VideoCache with provider-specific directory.

        Args:
            provider_name: Name of the video provider (e.g., "dvids", "nasa")
            cache_dir: Root cache directory path
            default_ttl_days: Default TTL for cached items in days (default: 30)
        """
        self.provider_name = provider_name
        self.cache_dir = Path(cache_dir)
        self.default_ttl_days = default_ttl_days
        self.provider_dir = self.cache_dir / provider_name
        self.metadata_file = self.cache_dir / "metadata.json"
        self._metadata: Dict[str, Any] = {}

        # Create directory structure
        self.provider_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Load or create metadata
        self._load_metadata()

        logger.info(
            f"Initialized VideoCache for provider '{provider_name}' "
            f"at {self.provider_dir} with TTL={default_ttl_days} days"
        )

    def _load_metadata(self) -> None:
        """Load cache metadata from metadata.json file."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self._metadata = json.load(f)
                logger.debug(f"Loaded metadata from {self.metadata_file}")
            except json.JSONDecodeError as e:
                logger.warning(f"Invalid metadata.json, creating new: {e}")
                self._metadata = {"videos": {}}
                self._save_metadata()
        else:
            # Create empty metadata file
            self._metadata = {"videos": {}}
            self._save_metadata()

    def _save_metadata(self) -> None:
        """Save cache metadata to metadata.json file."""
        try:
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self._metadata, f, indent=2)
            logger.debug(f"Saved metadata to {self.metadata_file}")
        except IOError as e:
            logger.error(f"Failed to save metadata: {e}")

    def is_cached(self, video_id: str) -> bool:
        """
        Check if video exists in cache and is within TTL.

        Args:
            video_id: Unique video identifier

        Returns:
            True if video is cached and within TTL, False otherwise
        """
        # Reload metadata to get latest state
        self._load_metadata()

        if video_id not in self._metadata.get("videos", {}):
            return False

        video_meta = self._metadata["videos"][video_id]

        # Check if file exists
        file_path = Path(video_meta.get("file_path", ""))
        if not file_path.exists():
            logger.warning(f"Metadata exists but file missing: {file_path}")
            return False

        # Check TTL
        cached_date_str = video_meta.get("cached_date")
        if not cached_date_str:
            return False

        try:
            cached_date = datetime.fromisoformat(cached_date_str)
            ttl_days = video_meta.get("ttl", self.default_ttl_days)
            age_days = (datetime.now() - cached_date).days

            is_valid = age_days < ttl_days
            logger.debug(f"Cache check for {video_id}: age={age_days}d, ttl={ttl_days}d, valid={is_valid}")
            return is_valid
        except ValueError as e:
            logger.error(f"Invalid cached_date format: {e}")
            return False

    def get(self, video_id: str, fetch_fn: Callable[[str], Any]) -> Any:
        """
        Get video content from cache or fetch using provided function.

        If video is cached and within TTL, returns cached content.
        Otherwise, calls fetch_fn to download and caches the result.

        Args:
            video_id: Unique video identifier
            fetch_fn: Function to fetch video content (takes video_id, returns content)

        Returns:
            Video content (same type as fetch_fn returns)
        """
        # Reload metadata first
        self._load_metadata()

        # Check cache first
        if self.is_cached(video_id):
            logger.info(f"Cache HIT for {video_id}")
            video_meta = self._metadata["videos"][video_id]
            file_path = Path(video_meta["file_path"])

            # HIGH PRIORITY H2: Read binary video files using read_bytes()
            try:
                content = file_path.read_bytes()
                return content
            except Exception as e:
                logger.warning(f"Failed to read cached file {file_path}: {e}")
                # Fall through to fetch

        # Cache miss - fetch and cache
        logger.info(f"Cache MISS for {video_id}, fetching...")
        content = fetch_fn(video_id)

        # Save to cache
        file_ext = self._get_file_extension(content)
        cache_file = self.provider_dir / f"{video_id}.{file_ext}"

        try:
            # Handle both bytes and string content
            if isinstance(content, bytes):
                cache_file.write_bytes(content)
            else:
                cache_file.write_text(str(content))

            # Update metadata
            self._metadata["videos"][video_id] = {
                "provider": self.provider_name,
                "cached_date": datetime.now().isoformat(),
                "ttl": self.default_ttl_days,
                "file_path": str(cache_file)
            }
            self._save_metadata()

            logger.info(f"Cached {video_id} to {cache_file}")

        except IOError as e:
            logger.error(f"Failed to cache {video_id}: {e}")

        return content

    def _get_file_extension(self, content: Any) -> str:
        """
        Determine file extension from content.

        Args:
            content: Video content (bytes or string)

        Returns:
            File extension (default: "mp4")
        """
        # Default to mp4 for videos
        return "mp4"

    def invalidate(self, video_id: str) -> bool:
        """
        Remove video from cache (delete file and metadata).

        Args:
            video_id: Unique video identifier

        Returns:
            True if video was removed, False if not found
        """
        # Reload metadata first
        self._load_metadata()

        if video_id not in self._metadata.get("videos", {}):
            logger.warning(f"Cannot invalidate {video_id}: not in cache")
            return False

        video_meta = self._metadata["videos"][video_id]
        file_path = Path(video_meta.get("file_path", ""))

        # Delete file
        if file_path.exists():
            try:
                file_path.unlink()
                logger.info(f"Deleted cache file: {file_path}")
            except IOError as e:
                logger.error(f"Failed to delete {file_path}: {e}")

        # Remove metadata
        del self._metadata["videos"][video_id]
        self._save_metadata()

        logger.info(f"Invalidated cache entry for {video_id}")
        return True

    def get_cache_size(self) -> int:
        """
        Get total size of all cached files in bytes.

        Returns:
            Total cache size in bytes
        """
        # Reload metadata first
        self._load_metadata()

        total_size = 0
        for video_id, video_meta in self._metadata.get("videos", {}).items():
            file_path = Path(video_meta.get("file_path", ""))
            if file_path.exists():
                try:
                    total_size += file_path.stat().st_size
                except OSError as e:
                    logger.warning(f"Cannot get size for {file_path}: {e}")

        return total_size

    def get_cache_count(self) -> int:
        """
        Get number of cached videos.

        Returns:
            Number of videos in cache
        """
        # Reload metadata first
        self._load_metadata()
        return len(self._metadata.get("videos", {}))

    def get_cache_age(self, video_id: str) -> Optional[int]:
        """
        Get age of cached video in days.

        Args:
            video_id: Unique video identifier

        Returns:
            Age in days, or None if video not cached
        """
        # Reload metadata first
        self._load_metadata()

        if video_id not in self._metadata.get("videos", {}):
            return None

        cached_date_str = self._metadata["videos"][video_id].get("cached_date")
        if not cached_date_str:
            return None

        try:
            cached_date = datetime.fromisoformat(cached_date_str)
            age = (datetime.now() - cached_date).days
            return age
        except ValueError:
            return None
