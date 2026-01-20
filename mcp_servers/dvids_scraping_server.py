"""
DVIDS Web Scraping MCP Server

This module implements a Model Context Protocol (MCP) server that scrapes the
DVIDS (Defense Visual Information Distribution Service) website for military videos.

AC-6.10.1: DVIDS Scraping MCP Server Implementation
"""

import asyncio
import logging
import re
from datetime import datetime
from typing import Dict, List, Any, Optional
from urllib.robotparser import RobotFileParser
from urllib.parse import urlparse

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
server = Server("dvids-scraping-server")

# Rate limiting configuration
RATE_LIMIT_SECONDS = 30  # 1 request per 30 seconds
BASE_BACKOFF_SECONDS = 2  # Base backoff for retries
MAX_BACKOFF_SECONDS = 60  # Maximum backoff cap
MAX_RETRIES = 5  # Maximum retry attempts

# DVIDS website URLs
DVIDS_BASE_URL = "https://www.dvidshub.net"
DVIDS_SEARCH_URL = f"{DVIDS_BASE_URL}/search/"
DVIDS_VIDEO_URL = f"{DVIDS_BASE_URL}/video/"


async def check_robots_txt(url: str) -> bool:
    """
    Check robots.txt compliance before scraping.

    (MEDIUM PRIORITY M3: robots.txt compliance check)

    Args:
        url: URL to check against robots.txt

    Returns:
        True if allowed to scrape, False if disallowed
    """
    try:
        parsed_url = urlparse(url)
        robots_url = f"{parsed_url.scheme}://{parsed_url.netloc}/robots.txt"

        rp = RobotFileParser()
        rp.set_url(robots_url)

        async with httpx.AsyncClient() as client:
            response = await client.get(robots_url, timeout=10)
            if response.status_code == 200:
                rp.parse(response.text.splitlines())
                return rp.can_fetch('*', url)

        # If no robots.txt, assume allowed
        logger.info(f"No robots.txt found at {robots_url}, allowing scrape")
        return True

    except Exception as e:
        logger.warning(f"Failed to check robots.txt: {e}, allowing scrape")
        return True


class DVIDSScrapingMCPServer:
    """
    DVIDS Web Scraping MCP Server.

    Provides MCP tools for searching, downloading, and retrieving metadata
    for military videos from the DVIDS website using web scraping.

    Attributes:
        cache_dir: Directory for cached videos
        cache: VideoCache instance for managing cached content
        _last_request_time: Timestamp of last HTTP request for rate limiting
    """

    def __init__(self, cache_dir: str):
        """
        Initialize DVIDS scraping MCP server.

        Args:
            cache_dir: Directory for cached videos
        """
        self.cache_dir = cache_dir
        self.cache = VideoCache(
            provider_name="dvids",
            cache_dir=cache_dir,
            default_ttl_days=30
        )
        self._last_request_time: Optional[float] = None

        logger.info(f"DVIDS Scraping MCP Server initialized with cache_dir={cache_dir}")

        # Verify no API credentials are used
        # (AC-6.10.1.8: Server does not require API credentials)
        assert not hasattr(self, 'api_key'), "Server should not have api_key"
        assert not hasattr(self, 'api_credentials'), "Server should not have credentials"

    async def _respect_rate_limit(self) -> None:
        """
        Enforce rate limiting between requests.

        Waits if necessary to ensure minimum time between requests.
        (AC-6.10.1.5: Rate limiting enforces 30 second delay)
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
        (AC-6.10.1.6, AC-6.10.1.7: Exponential backoff on HTTP 429/503)

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
                        # Calculate exponential backoff
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
        Search DVIDS website for videos matching query.

        (AC-6.10.1.2: MCP tool - search_videos)
        (HIGH PRIORITY H3: MCP tool registration)

        Args:
            query: Search query string
            max_duration: Maximum video duration in seconds (optional filter)

        Returns:
            List of video results with videoId, title, duration, format, resolution, download_url, public_domain
        """
        search_url = f"{DVIDS_SEARCH_URL}?query={query}"

        # MEDIUM PRIORITY M3: Check robots.txt compliance
        if not await check_robots_txt(search_url):
            logger.warning(f"Robots.txt disallows scraping: {search_url}")
            raise PermissionError(f"Robots.txt disallows scraping: {search_url}")

        logger.info(f"Searching DVIDS for: query='{query}', max_duration={max_duration}")

        async with httpx.AsyncClient() as client:
            # Construct search URL
            search_url = f"{DVIDS_SEARCH_URL}?query={query}"

            # Fetch with backoff
            response = await self._fetch_with_backoff(search_url, client)

            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract video results
            results = []
            video_items = soup.find_all('div', class_='video-item')

            if not video_items:
                # Try alternative selectors
                video_items = soup.find_all('div', {'data-video-id': True})

            for item in video_items:
                try:
                    # Extract video metadata
                    video_id = item.get('data-video-id')
                    if not video_id:
                        # Try to extract from href
                        link = item.find('a', href=True)
                        if link:
                            href = link['href']
                            match = re.search(r'/video/(\w+)', href)
                            if match:
                                video_id = match.group(1)

                    if not video_id:
                        continue

                    title_elem = item.find(['h3', 'h4', 'span'], class_=['title', 'video-title'])
                    title = title_elem.get_text(strip=True) if title_elem else f"Video {video_id}"

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

                    download_link = item.find('a', class_='download-link')
                    download_url = download_link['href'] if download_link else f"{DVIDS_VIDEO_URL}{video_id}"

                    # Check for public domain badge
                    public_domain_badge = item.find('span', class_='public-domain-badge')
                    public_domain = public_domain_badge is not None

                    results.append({
                        'videoId': video_id,
                        'title': title,
                        'duration': duration,
                        'format': video_format,
                        'resolution': resolution,
                        'download_url': download_url,
                        'public_domain': public_domain
                    })

                except Exception as e:
                    logger.warning(f"Error parsing video item: {e}")
                    continue

            logger.info(f"Found {len(results)} videos for query '{query}'")
            return results

    async def download_video(self, video_id: str) -> Dict[str, Any]:
        """
        Download video from DVIDS and cache locally.

        (AC-6.10.1.3: MCP tool - download_video)
        (HIGH PRIORITY H3: MCP tool registration)

        Args:
            video_id: DVIDS video identifier

        Returns:
            Dictionary with file_path and metadata
        """
        video_url = f"{DVIDS_VIDEO_URL}{video_id}"

        # MEDIUM PRIORITY M3: Check robots.txt compliance
        if not await check_robots_txt(video_url):
            logger.warning(f"Robots.txt disallows scraping: {video_url}")
            raise PermissionError(f"Robots.txt disallows scraping: {video_url}")

        logger.info(f"Downloading video {video_id} from DVIDS")

        # Check cache first
        if self.cache.is_cached(video_id):
            logger.info(f"Video {video_id} found in cache")
            self.cache._load_metadata()
            video_meta = self.cache._metadata["videos"][video_id]
            return {
                'video_id': video_id,
                'file_path': video_meta['file_path'],
                'cached': True
            }

        # Download video
        try:
            video_url = f"{DVIDS_VIDEO_URL}{video_id}"
            async with httpx.AsyncClient() as client:
                response = await self._fetch_with_backoff(video_url, client)

                # Get content (handle both binary and HTML responses)
                if hasattr(response, 'content') and response.content:
                    content = response.content

                    # Check if response has text attribute and it's a string
                    has_text = hasattr(response, 'text') and isinstance(response.text, str)

                    # Check if it's binary data (not HTML)
                    try:
                        content.decode('utf-8')
                        # It's text, might be HTML - parse for download link
                        if has_text:
                            soup = BeautifulSoup(response.text, 'html.parser')
                            download_link = soup.find('a', {'href': re.compile(r'\.mp4$')})

                            if download_link:
                                download_url = download_link['href']
                                if not download_url.startswith('http'):
                                    download_url = f"{DVIDS_BASE_URL}{download_url}"

                                # Download actual video file
                                video_response = await self._fetch_with_backoff(download_url, client)
                                content = video_response.content
                    except UnicodeDecodeError:
                        # Binary data, use as-is
                        pass
                else:
                    content = b''

            # Cache the content
            cache_file = self.cache.provider_dir / f"{video_id}.mp4"
            cache_file.write_bytes(content)

            # Update metadata
            self.cache._load_metadata()
            self.cache._metadata["videos"][video_id] = {
                "provider": "dvids",
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
        Retrieve video metadata from DVIDS.

        (AC-6.10.1.4: MCP tool - get_video_details)
        (HIGH PRIORITY H3: MCP tool registration)

        Args:
            video_id: DVIDS video identifier

        Returns:
            Video metadata dictionary
        """
        video_url = f"{DVIDS_VIDEO_URL}{video_id}"

        # MEDIUM PRIORITY M3: Check robots.txt compliance
        if not await check_robots_txt(video_url):
            logger.warning(f"Robots.txt disallows scraping: {video_url}")
            raise PermissionError(f"Robots.txt disallows scraping: {video_url}")

        logger.info(f"Getting details for video {video_id} from DVIDS")

        async with httpx.AsyncClient() as client:
            video_url = f"{DVIDS_VIDEO_URL}{video_id}"

            # Fetch with backoff
            response = await self._fetch_with_backoff(video_url, client)

            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract metadata
            title_elem = soup.find(['h1', 'h2'], class_=['title', 'video-title'])
            title = title_elem.get_text(strip=True) if title_elem else f"Video {video_id}"

            desc_elem = soup.find('p', class_='description')
            description = desc_elem.get_text(strip=True) if desc_elem else ""

            duration_elem = soup.find('span', class_='duration')
            duration_text = duration_elem.get_text(strip=True) if duration_elem else "0"
            duration = self._parse_duration(duration_text)

            format_elem = soup.find('span', class_='format')
            video_format = format_elem.get_text(strip=True) if format_elem else "MP4"

            resolution_elem = soup.find('span', class_='resolution')
            resolution = resolution_elem.get_text(strip=True) if resolution_elem else "1920x1080"

            download_link = soup.find('a', {'href': re.compile(r'(\.mp4$|download)' )})
            download_url = download_link['href'] if download_link else f"{DVIDS_VIDEO_URL}{video_id}"
            if not download_url.startswith('http'):
                download_url = f"{DVIDS_BASE_URL}{download_url}"

            public_domain_badge = soup.find('span', class_='public-domain-badge')
            public_domain = public_domain_badge is not None

            details = {
                'videoId': video_id,
                'title': title,
                'description': description,
                'duration': duration,
                'format': video_format,
                'resolution': resolution,
                'download_url': download_url,
                'public_domain': public_domain
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
            description="Search DVIDS website for military videos by query",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query string (e.g., 'military aircraft')"
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
            description="Download a video from DVIDS and cache it locally",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_id": {
                        "type": "string",
                        "description": "DVIDS video identifier"
                    }
                },
                "required": ["video_id"]
            }
        ),
        Tool(
            name="get_video_details",
            description="Get detailed metadata for a DVIDS video",
            inputSchema={
                "type": "object",
                "properties": {
                    "video_id": {
                        "type": "string",
                        "description": "DVIDS video identifier"
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
    dvids_server = DVIDSScrapingMCPServer(cache_dir=cache_dir)

    if name == "search_videos":
        results = await dvids_server.search_videos(
            query=arguments.get("query"),
            max_duration=arguments.get("max_duration")
        )
        return [TextContent(type="text", text=str(results))]

    elif name == "download_video":
        result = await dvids_server.download_video(
            video_id=arguments.get("video_id")
        )
        return [TextContent(type="text", text=str(result))]

    elif name == "get_video_details":
        details = await dvids_server.get_video_details(
            video_id=arguments.get("video_id")
        )
        return [TextContent(type="text", text=str(details))]

    else:
        raise ValueError(f"Unknown tool: {name}")


def main():
    """
    Main entry point for running DVIDS scraping MCP server.

    (AC-6.10.1.9: Server is runnable as python module)
    (HIGH PRIORITY H1: MCP stdio server implementation)
    """
    import sys
    from mcp.server.stdio import stdio_server

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    logger.info("Starting DVIDS Scraping MCP Server")

    # Default cache directory
    cache_dir = sys.argv[1] if len(sys.argv) > 1 else "./assets/cache"

    # Create server instance
    dvids_server_instance = DVIDSScrapingMCPServer(cache_dir=cache_dir)

    logger.info(f"DVIDS Scraping MCP Server ready (cache_dir={cache_dir})")

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
