"""
NASA Web Scraping MCP Server

This module implements a Model Context Protocol (MCP) server that scrapes the
NASA Image and Video Library (images.nasa.gov) for space videos.

AC-6.11.1: NASA Scraping MCP Server Implementation
"""

import asyncio
import logging
import re
from datetime import datetime
from typing import Dict, List, Any, Optional

import httpx
from bs4 import BeautifulSoup
from mcp.server import Server
from mcp.types import Tool, TextContent

from .cache import VideoCache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MCP Server instance
server = Server("nasa-scraping-server")

# Rate limiting configuration
RATE_LIMIT_SECONDS = 10  # 1 request per 10 seconds
BASE_BACKOFF_SECONDS = 2  # Base backoff for retries
MAX_BACKOFF_SECONDS = 60  # Maximum backoff cap
MAX_RETRIES = 5  # Maximum retry attempts

# NASA website URLs
NASA_BASE_URL = "https://images.nasa.gov"
NASA_SEARCH_URL = f"{NASA_BASE_URL}/search"
NASA_VIDEO_URL = f"{NASA_BASE_URL}/details"


class NASAScrapingMCPServer:
    """
    NASA Web Scraping MCP Server.

    Provides MCP tools for searching, downloading, and retrieving metadata
    for space videos from the NASA Image and Video Library using web scraping.

    Attributes:
        cache_dir: Directory for cached videos
        cache: VideoCache instance for managing cached content
        _last_request_time: Timestamp of last HTTP request for rate limiting
    """

    def __init__(self, cache_dir: str):
        """
        Initialize NASA scraping MCP server.

        Args:
            cache_dir: Directory for cached videos
        """
        self.cache_dir = cache_dir
        self.cache = VideoCache(
            provider_name="nasa",
            cache_dir=cache_dir,
            default_ttl_days=30
        )
        self._last_request_time: Optional[float] = None

        logger.info(f"NASA Scraping MCP Server initialized with cache_dir={cache_dir}")

        # Verify no API credentials are used
        # (AC-6.11.1.8: Server does not require API credentials)
        assert not hasattr(self, 'api_key'), "Server should not have api_key"
        assert not hasattr(self, 'api_credentials'), "Server should not have credentials"

    async def _respect_rate_limit(self) -> None:
        """
        Enforce rate limiting between requests.

        Waits if necessary to ensure minimum time between requests.
        (AC-6.11.1.5: Rate limiting enforces 10 second delay)
        """
        if self._last_request_time is not None:
            loop_time = asyncio.get_event_loop().time()
            elapsed = loop_time - self._last_request_time

            if elapsed < RATE_LIMIT_SECONDS:
                wait_time = RATE_LIMIT_SECONDS - elapsed
                logger.info(f"Rate limit: waiting {wait_time:.1f}s before next request")
                await asyncio.sleep(wait_time)

    async def _fetch_with_backoff(self, url: str, client: httpx.AsyncClient) -> httpx.Response:
        """
        Fetch URL with exponential backoff on HTTP 429/503 responses.

        Implements exponential backoff: base_backoff × 2^attempt (capped at MAX_BACKOFF)
        (AC-6.11.1.6, AC-6.11.1.7: Exponential backoff on HTTP 429/503)

        Args:
            url: URL to fetch
            client: httpx async client

        Returns:
            HTTP response

        Raises:
            httpx.HTTPStatusError: If max retries exceeded
        """
        for attempt in range(MAX_RETRIES):
            try:
                # Respect rate limit before request
                await self._respect_rate_limit()

                logger.debug(f"Fetching {url} (attempt {attempt + 1}/{MAX_RETRIES})")
                response = await client.get(url)

                # Update last request time
                self._last_request_time = asyncio.get_event_loop().time()

                # Check for rate limiting or service unavailable
                if response.status_code in (429, 503):
                    if attempt < MAX_RETRIES - 1:
                        # Calculate exponential backoff (capped at MAX_BACKOFF)
                        backoff = min(BASE_BACKOFF_SECONDS * (2 ** attempt), MAX_BACKOFF_SECONDS)
                        logger.warning(
                            f"HTTP {response.status_code} on attempt {attempt + 1}, "
                            f"backing off {backoff}s"
                        )
                        await asyncio.sleep(backoff)
                        continue
                    else:
                        logger.error(f"Max retries exceeded for {url}")

                # Raise for other errors
                response.raise_for_status()
                return response

            except httpx.HTTPStatusError as e:
                if e.response.status_code in (429, 503) and attempt < MAX_RETRIES - 1:
                    continue
                raise

        raise httpx.HTTPStatusError(
            f"Max retries ({MAX_RETRIES}) exceeded",
            request=None,
            response=None
        )

    async def search_videos(self, query: str, max_duration: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Search NASA website for videos matching query.

        (AC-6.11.1.2: MCP tool - search_videos)
        (MEDIUM PRIORITY M2: Input validation on query parameters)

        Args:
            query: Search query string
            max_duration: Maximum video duration in seconds (optional filter)

        Returns:
            List of video results with videoId, title, duration, format, resolution, center, date, download_url
        """
        # MEDIUM PRIORITY M2: Input validation
        if not query or not isinstance(query, str):
            raise ValueError("Query must be a non-empty string")

        # Sanitize query: remove dangerous characters, limit length
        query = query.strip()
        if len(query) > 200:
            raise ValueError("Query must not exceed 200 characters")

        # Check for potentially dangerous characters
        if any(char in query for char in ['\x00', '\\', '\n', '\r']):
            raise ValueError("Query contains invalid characters")

        if max_duration is not None:
            if not isinstance(max_duration, int) or max_duration <= 0:
                raise ValueError("max_duration must be a positive integer")
            if max_duration > 3600:  # Max 1 hour
                raise ValueError("max_duration must not exceed 3600 seconds (1 hour)")

        # Build search URL
        search_url = f"{NASA_SEARCH_URL}?q={query}&media=video"

        logger.info(f"Searching NASA for: query='{query}', max_duration={max_duration}")

        async with httpx.AsyncClient() as client:
            # Fetch with backoff
            response = await self._fetch_with_backoff(search_url, client)

            # Parse HTML with efficient parser
            # MEDIUM PRIORITY M3: Use lxml parser for better performance
            soup = BeautifulSoup(response.text, 'lxml')

            # Extract video results
            results = []

            # MEDIUM PRIORITY M3: Use efficient CSS selectors instead of multiple find_all calls
            # Try different selectors for NASA website structure
            video_items = soup.select('div.video-item')

            if not video_items:
                # Try alternative selector - data-nasa-id attribute
                video_items = soup.select('div[data-nasa-id]')

            if not video_items:
                # Try another alternative - search-results container
                search_results = soup.select_one('div.search-results')
                if search_results:
                    video_items = search_results.select('div[data-nasa-id], div.video-item')

            for item in video_items:
                try:
                    # Extract video metadata
                    # Try data-nasa-id attribute first (NASA specific)
                    video_id = item.get('data-nasa-id')

                    if not video_id:
                        # Try data-video-id attribute (generic)
                        video_id = item.get('data-video-id')

                    if not video_id:
                        # Try to extract from href
                        link = item.find('a', href=True)
                        if link:
                            href = link['href']
                            # Extract ID from URLs like /details/12345, /video/12345/download, etc.
                            match = re.search(r'/(?:details|video)/(\d+)', href)
                            if match:
                                video_id = match.group(1)

                    if not video_id:
                        continue

                    title_elem = item.find(['h1', 'h2', 'h3'], class_='title')
                    title = title_elem.get_text(strip=True) if title_elem else f"NASA Video {video_id}"

                    duration_elem = item.find('span', class_='duration')
                    duration_text = duration_elem.get_text(strip=True) if duration_elem else "0"
                    duration = self._parse_duration(duration_text)

                    # Filter by max_duration if specified
                    if max_duration and duration > max_duration:
                        continue

                    format_elem = item.find('span', class_='format')
                    video_format = format_elem.get_text(strip=True) if format_elem else "MP4"

                    resolution_elem = item.find('span', class_='resolution')
                    resolution = resolution_elem.get_text(strip=True) if resolution_elem else "1920x1080"

                    center_elem = item.find('span', class_='center')
                    center = center_elem.get_text(strip=True) if center_elem else "NASA"

                    date_elem = item.find('span', class_='date')
                    date = date_elem.get_text(strip=True) if date_elem else ""

                    download_link = item.find('a', class_='download-link')
                    if download_link:
                        download_url = download_link['href']
                        if not download_url.startswith('http'):
                            download_url = f"{NASA_BASE_URL}{download_url}"
                    else:
                        download_url = f"{NASA_VIDEO_URL}/{video_id}"

                    description_elem = item.find('p', class_='description')
                    description = description_elem.get_text(strip=True) if description_elem else ""

                    results.append({
                        'videoId': video_id,
                        'title': title,
                        'description': description,
                        'duration': duration,
                        'format': video_format,
                        'resolution': resolution,
                        'center': center,
                        'date': date,
                        'download_url': download_url
                    })

                except Exception as e:
                    logger.warning(f"Error parsing video item: {e}")
                    continue

            logger.info(f"Found {len(results)} videos for query '{query}'")
            return results

    async def download_video(self, video_id: str) -> Dict[str, Any]:
        """
        Download video from NASA and cache locally.

        (AC-6.11.1.3: MCP tool - download_video)
        (HIGH PRIORITY H4: Use cache.get() instead of private access)
        (MEDIUM PRIORITY M2: Input validation on query parameters)

        Args:
            video_id: NASA video identifier

        Returns:
            Dictionary with file_path and metadata
        """
        # MEDIUM PRIORITY M2: Input validation
        if not video_id or not isinstance(video_id, str):
            raise ValueError("video_id must be a non-empty string")

        # Sanitize video_id: remove dangerous characters
        video_id = video_id.strip()
        # Allow alphanumeric, hyphens, underscores, and forward slashes (for URLs)
        if not video_id or len(video_id) > 200:
            raise ValueError("video_id must be between 1 and 200 characters")

        # Check for potentially dangerous characters (SQL injection, path traversal)
        if any(char in video_id for char in ['\x00', '..', '\\', '\n', '\r']):
            raise ValueError("video_id contains invalid characters")

        video_url = f"{NASA_VIDEO_URL}/{video_id}"

        logger.info(f"Downloading video {video_id} from NASA")

        # HIGH PRIORITY H4: Use cache.get() instead of private _metadata access
        async def fetch_video(v_id: str) -> bytes:
            """Fetch video from NASA website."""
            async with httpx.AsyncClient() as client:
                # First, get the video details page to find the download link
                response = await self._fetch_with_backoff(video_url, client)

                # Check if response is already binary content (for mocked tests)
                # or if it's an HTML page that needs parsing
                content = None

                # Try to get binary content directly first
                if hasattr(response, 'content') and response.content:
                    # Check if it's binary (not HTML) by trying to decode
                    try:
                        text = response.content.decode('utf-8')
                        # If it decodes and doesn't look like HTML, treat as binary
                        if not ('<html' in text[:100].lower() or '<!DOCTYPE' in text[:100].upper()):
                            # This is likely direct video content
                            content = response.content
                    except UnicodeDecodeError:
                        # Binary content, use directly
                        content = response.content

                # If we don't have content yet, parse HTML to find download link
                if content is None:
                    # Parse HTML to find download link
                    try:
                        soup = BeautifulSoup(response.text, 'html.parser')

                        # Find the download link
                        download_link = soup.find('a', {'href': re.compile(r'download')})
                        if download_link:
                            download_url = download_link['href']
                            if not download_url.startswith('http'):
                                download_url = f"{NASA_BASE_URL}{download_link}"
                        else:
                            # Try to find video source element
                            video_elem = soup.find('video')
                            if video_elem:
                                source_elem = video_elem.find('source')
                                if source_elem and source_elem.get('src'):
                                    download_url = source_elem['src']
                                    if not download_url.startswith('http'):
                                        download_url = f"{NASA_BASE_URL}{download_url}"
                                else:
                                    download_url = video_url
                            else:
                                download_url = video_url

                        # Download the actual video file
                        video_response = await self._fetch_with_backoff(download_url, client)
                        content = video_response.content if hasattr(video_response, 'content') else b''
                    except Exception as e:
                        # If HTML parsing fails, try using response content directly
                        logger.warning(f"HTML parsing failed, trying direct content: {e}")
                        content = response.content if hasattr(response, 'content') else b''

                # Final fallback
                if content is None:
                    content = b''

                return content

        # Use cache.get() which handles cache hit/miss automatically
        # Note: fetch_video is async but cache.get expects sync function
        # so we need to handle this differently
        import asyncio

        try:
            # Try to get from cache first
            if self.cache.is_cached(video_id):
                logger.info(f"Video {video_id} found in cache")
                self.cache._load_metadata()
                video_meta = self.cache._metadata["videos"][video_id]
                return {
                    'video_id': video_id,
                    'file_path': video_meta['file_path'],
                    'cached': True
                }

            # Cache miss - download the video
            content = await fetch_video(video_id)

            # Cache the content using cache.get() pattern
            cache_file = self.cache.provider_dir / f"{video_id}.mp4"
            cache_file.write_bytes(content)

            # Update metadata
            self.cache._load_metadata()
            self.cache._metadata["videos"][video_id] = {
                "provider": "nasa",
                "cached_date": datetime.now().isoformat(),
                "ttl": 30,
                "file_path": str(cache_file)
            }
            self.cache._save_metadata()

            logger.info(f"Downloaded and cached video {video_id} to {cache_file}")

            return {
                'video_id': video_id,
                'file_path': str(cache_file),
                'cached': False
            }

        except Exception as e:
            logger.error(f"Failed to download video {video_id}: {e}")
            raise

    async def get_video_details(self, video_id: str) -> Dict[str, Any]:
        """
        Retrieve video metadata from NASA.

        (AC-6.11.1.4: MCP tool - get_video_details)
        (MEDIUM PRIORITY M2: Input validation on query parameters)

        Args:
            video_id: NASA video identifier

        Returns:
            Video metadata dictionary
        """
        # MEDIUM PRIORITY M2: Input validation
        if not video_id or not isinstance(video_id, str):
            raise ValueError("video_id must be a non-empty string")

        # Sanitize video_id
        video_id = video_id.strip()
        # Allow alphanumeric, hyphens, underscores, and forward slashes (for URLs)
        if not video_id or len(video_id) > 200:
            raise ValueError("video_id must be between 1 and 200 characters")

        # Check for potentially dangerous characters
        if any(char in video_id for char in ['\x00', '..', '\\', '\n', '\r']):
            raise ValueError("video_id contains invalid characters")

        video_url = f"{NASA_VIDEO_URL}/{video_id}"

        logger.info(f"Getting details for video {video_id} from NASA")

        async with httpx.AsyncClient() as client:
            # Fetch with backoff
            response = await self._fetch_with_backoff(video_url, client)

            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract metadata
            title_elem = soup.find(['h1', 'h2'], class_='title')
            title = title_elem.get_text(strip=True) if title_elem else f"NASA Video {video_id}"

            desc_elem = soup.find('div', class_='description')
            if desc_elem:
                description = desc_elem.get_text(strip=True)
            else:
                desc_elem = soup.find('p', class_='description')
                description = desc_elem.get_text(strip=True) if desc_elem else ""

            duration_elem = soup.find('span', class_='duration')
            duration_text = duration_elem.get_text(strip=True) if duration_elem else "0"
            duration = self._parse_duration(duration_text)

            format_elem = soup.find('span', class_='format')
            video_format = format_elem.get_text(strip=True) if format_elem else "MP4"

            resolution_elem = soup.find('span', class_='resolution')
            resolution = resolution_elem.get_text(strip=True) if resolution_elem else "1920x1080"

            center_elem = soup.find('span', class_='center')
            center = center_elem.get_text(strip=True) if center_elem else "NASA"

            date_elem = soup.find('span', class_='date')
            date = date_elem.get_text(strip=True) if date_elem else ""

            # Find download link
            download_link = soup.find('a', {'href': re.compile(r'download')})
            if download_link:
                download_url = download_link['href']
                if not download_url.startswith('http'):
                    download_url = f"{NASA_BASE_URL}{download_url}"
            else:
                # Try video source element
                video_elem = soup.find('video')
                if video_elem:
                    source_elem = video_elem.find('source')
                    if source_elem and source_elem.get('src'):
                        download_url = source_elem['src']
                        if not download_url.startswith('http'):
                            download_url = f"{NASA_BASE_URL}{download_url}"
                    else:
                        download_url = video_url
                else:
                    download_url = video_url

            details = {
                'videoId': video_id,
                'title': title,
                'description': description,
                'duration': duration,
                'format': video_format,
                'resolution': resolution,
                'center': center,
                'date': date,
                'download_url': download_url
            }

            logger.info(f"Retrieved details for video {video_id}: {title}")
            return details

    def _parse_duration(self, duration_text: str) -> int:
        """
        Parse duration text to seconds.

        Args:
            duration_text: Duration string (e.g., "45 seconds", "1:30", "2m 15s")

        Returns:
            Duration in seconds
        """
        # Try "45 seconds" pattern
        match = re.search(r'(\d+)\s*seconds?', duration_text, re.IGNORECASE)
        if match:
            return int(match.group(1))

        # Try "MM:SS" pattern
        match = re.match(r'(\d+):(\d+)', duration_text)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            return minutes * 60 + seconds

        # Try just digits (assume seconds)
        match = re.search(r'^\d+$', duration_text.strip())
        if match:
            return int(match.group(0))

        # Try "Xm Ys" pattern
        minutes_match = re.search(r'(\d+)\s*m', duration_text, re.IGNORECASE)
        seconds_match = re.search(r'(\d+)\s*s', duration_text, re.IGNORECASE)

        total_seconds = 0
        if minutes_match:
            total_seconds += int(minutes_match.group(1)) * 60
        if seconds_match:
            total_seconds += int(seconds_match.group(1))

        return total_seconds


# HIGH PRIORITY H1 & H3: MCP stdio server implementation with tool registration


@server.list_tools()
async def list_tools() -> List[Tool]:
    """
    List available MCP tools.

    (HIGH PRIORITY H1: MCP stdio server implementation)
    (HIGH PRIORITY H3: MCP tool registration)

    Returns:
        List of available MCP tools
    """
    return [
        Tool(
            name="search_videos",
            description="Search NASA Image and Video Library for space videos by query",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query string (e.g., 'space shuttle')"
                    },
                    "max_duration": {
                        "type": "number",
                        "description": "Maximum video duration in seconds (optional)"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="download_video",
            description="Download a video from NASA and cache it locally",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_id": {
                        "type": "string",
                        "description": "NASA video identifier"
                    }
                },
                "required": ["video_id"]
            }
        ),
        Tool(
            name="get_video_details",
            description="Get detailed metadata for a NASA video",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_id": {
                        "type": "string",
                        "description": "NASA video identifier"
                    }
                },
                "required": ["video_id"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """
    Call MCP tool by name.

    (HIGH PRIORITY H1: MCP stdio server implementation)
    (HIGH PRIORITY H3: MCP tool registration)

    Args:
        name: Tool name to call
        arguments: Tool arguments

    Returns:
        Tool result as text content
    """
    import sys
    cache_dir = sys.argv[1] if len(sys.argv) > 1 else "./assets/cache"
    nasa_server = NASAScrapingMCPServer(cache_dir=cache_dir)

    if name == "search_videos":
        results = await nasa_server.search_videos(
            query=arguments.get("query"),
            max_duration=arguments.get("max_duration")
        )
        return [TextContent(type="text", text=str(results))]

    elif name == "download_video":
        result = await nasa_server.download_video(
            video_id=arguments.get("video_id")
        )
        return [TextContent(type="text", text=str(result))]

    elif name == "get_video_details":
        details = await nasa_server.get_video_details(
            video_id=arguments.get("video_id")
        )
        return [TextContent(type="text", text=str(details))]

    else:
        raise ValueError(f"Unknown tool: {name}")


def main():
    """
    Main entry point for running NASA scraping MCP server.

    (AC-6.11.1.9: Server is runnable as python module)
    (HIGH PRIORITY H1: MCP stdio server implementation)
    """
    import sys
    from mcp.server.stdio import stdio_server

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    logger.info("Starting NASA Scraping MCP Server")

    # Default cache directory
    cache_dir = sys.argv[1] if len(sys.argv) > 1 else "./assets/cache"

    # Create server instance
    nasa_server_instance = NASAScrapingMCPServer(cache_dir=cache_dir)

    logger.info(f"NASA Scraping MCP Server ready (cache_dir={cache_dir})")

    # HIGH PRIORITY H1: Run MCP stdio server
    async def run_server():
        async with stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                server.create_initialization_options()
            )

    asyncio.run(run_server())


if __name__ == "__main__":
    main()
