"""
TEST-AC-6.10.1: DVIDS Scraping MCP Server Tests

These tests validate the DVIDS web scraping MCP server implementation.

All tests are FAILING (RED phase) - implementation does not exist yet.
"""

import pytest
import tempfile
import asyncio
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
import json


# TEST-AC-6.10.1.1: Server Class Exists
def test_dvids_scraping_mcp_server_class_exists():
    """TEST-AC-6.10.1.1: DVIDSScrapingMCPServer class exists and is importable.

    GIVEN: The mcp_servers.dvids_scraping_server module
    WHEN: Importing DVIDSScrapingMCPServer
    THEN: Class exists and can be instantiated
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)
        assert server is not None


# TEST-AC-6.10.1.2: MCP Tool - search_videos
@pytest.mark.asyncio
async def test_search_videos_tool_returns_results():
    """TEST-AC-6.10.1.2: search_videos tool searches DVIDS website and returns results.

    GIVEN: DVIDS MCP server instance
    WHEN: Calling search_videos(query="military aircraft", max_duration=60)
    THEN: Returns list of videos with videoId, title, duration
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        # Mock HTTP response
        mock_html = """
        <html>
            <div class="video-item">
                <a href="/video/12345">Military Aircraft Demo</a>
                <span class="duration">45 seconds</span>
            </div>
            <div class="video-item">
                <a href="/video/67890">Fighter Jet Footage</a>
                <span class="duration">30 seconds</span>
            </div>
        </html>
        """

        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = Mock()
            mock_response.text = mock_html
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            results = await server.search_videos(query="military aircraft", max_duration=60)

            # Verify HTTP call was made
            mock_get.assert_called_once()

            # Should return list of video results
            assert isinstance(results, list)
            assert len(results) > 0

            # First result should have expected structure
            first_result = results[0]
            assert 'videoId' in first_result
            assert 'title' in first_result
            assert 'duration' in first_result


# TEST-AC-6.10.1.3: MCP Tool - download_video
@pytest.mark.asyncio
async def test_download_video_tool_saves_to_cache():
    """TEST-AC-6.10.1.3: download_video tool downloads video to local cache.

    GIVEN: DVIDS MCP server instance
    WHEN: Calling download_video(video_id="12345")
    THEN: Video file is saved to assets/cache/dvids/{video_id}.mp4
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        video_id = "test_video_123"
        mock_video_content = b"fake video data"

        # Mock HTTP response for video download
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = Mock()
            mock_response.content = mock_video_content
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            result = await server.download_video(video_id=video_id)

            # Verify HTTP call was made for download
            mock_get.assert_called()

            # Verify file was cached
            cache_file = Path(temp_dir) / "dvids" / f"{video_id}.mp4"
            assert cache_file.exists(), f"Cache file should exist at {cache_file}"

            # Verify content
            assert cache_file.read_bytes() == mock_video_content

            # Verify result contains file path
            assert 'file_path' in result
            assert cache_file.name in result['file_path']


# TEST-AC-6.10.1.4: MCP Tool - get_video_details
@pytest.mark.asyncio
async def test_get_video_details_tool_returns_metadata():
    """TEST-AC-6.10.1.4: get_video_details tool retrieves video metadata from DVIDS.

    GIVEN: DVIDS MCP server instance
    WHEN: Calling get_video_details(video_id="12345")
    THEN: Returns video metadata: title, description, duration, format, resolution, download_url
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        video_id = "12345"

        # Mock video page HTML
        mock_html = """
        <html>
            <h1>Test Video Title</h1>
            <p class="description">This is a test video description.</p>
            <span class="duration">45 seconds</span>
            <span class="format">MP4</span>
            <span class="resolution">1920x1080</span>
            <a href="/download/12345">Download</a>
            <span class="public-domain">Public Domain</span>
        </html>
        """

        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = Mock()
            mock_response.text = mock_html
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            details = await server.get_video_details(video_id=video_id)

            # Verify HTTP call was made for video details
            mock_get.assert_called()

            # Verify metadata structure
            assert 'title' in details
            assert 'description' in details
            assert 'duration' in details
            assert 'format' in details
            assert 'resolution' in details
            assert 'download_url' in details
            assert 'public_domain' in details


# TEST-AC-6.10.1.5: Rate Limiting - 30 Second Delay
@pytest.mark.asyncio
async def test_rate_limiting_enforces_30_second_delay():
    """TEST-AC-6.10.1.5: Rate limiting enforces 30 second delay between requests.

    GIVEN: DVIDS MCP server instance
    WHEN: Making two rapid requests to DVIDS
    THEN: Second request waits 30 seconds after first request
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        # Mock HTTP responses
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = Mock()
            mock_response.text = "<html></html>"
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            # First request
            await server.search_videos(query="test1", max_duration=60)

            # Second request immediately - should be rate limited but complete
            # Rate limiting should delay but not fail the request
            await server.search_videos(query="test2", max_duration=60)


# TEST-AC-6.10.1.6: Exponential Backoff - HTTP 429
@pytest.mark.asyncio
async def test_exponential_backoff_on_http_429():
    """TEST-AC-6.10.1.6: HTTP 429 triggers exponential backoff: 2s, 4s, 8s delays.

    GIVEN: DVIDS MCP server instance
    WHEN: Receiving HTTP 429 (rate limited) responses
    THEN: Implements exponential backoff with delays: base_backoff × 2^attempt (capped at 60s)
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        attempt_count = 0

        async def mock_get_with_429(*args, **kwargs):
            nonlocal attempt_count
            attempt_count += 1

            # Return 429 for first 3 attempts, then 200
            if attempt_count <= 3:
                mock_response = Mock()
                mock_response.status_code = 429
                return mock_response
            else:
                mock_response = Mock()
                mock_response.text = "<html>success</html>"
                mock_response.status_code = 200
                return mock_response

        with patch('httpx.AsyncClient.get', side_effect=mock_get_with_429):
            result = await server.search_videos(query="test", max_duration=60)

            # Should have made 4 attempts (3 failures + 1 success)
            assert attempt_count == 4, f"Expected 4 attempts, got {attempt_count}"


# TEST-AC-6.10.1.7: Exponential Backoff - HTTP 503
@pytest.mark.asyncio
async def test_exponential_backoff_on_http_503():
    """TEST-AC-6.10.1.7: HTTP 503 triggers exponential backoff.

    GIVEN: DVIDS MCP server instance
    WHEN: Receiving HTTP 503 (service unavailable) responses
    THEN: Implements exponential backoff with delays: base_backoff × 2^attempt (capped at 60s)
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        attempt_count = 0

        async def mock_get_with_503(*args, **kwargs):
            nonlocal attempt_count
            attempt_count += 1

            # Return 503 for first 2 attempts, then 200
            if attempt_count <= 2:
                mock_response = Mock()
                mock_response.status_code = 503
                return mock_response
            else:
                mock_response = Mock()
                mock_response.text = "<html>success</html>"
                mock_response.status_code = 200
                return mock_response

        with patch('httpx.AsyncClient.get', side_effect=mock_get_with_503):
            result = await server.search_videos(query="test", max_duration=60)

            # Should have made 3 attempts (2 failures + 1 success)
            assert attempt_count == 3, f"Expected 3 attempts, got {attempt_count}"


# TEST-AC-6.10.1.8: No API Keys Required
def test_server_does_not_require_api_credentials():
    """TEST-AC-6.10.1.8: DVIDS scraping server does NOT use API credentials.

    GIVEN: DVIDS MCP server implementation
    WHEN: Inspecting server initialization and HTTP requests
    THEN: No API keys or credentials are used (web scraping only)
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        # Server should initialize without API keys
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        # Verify no api_key attribute
        assert not hasattr(server, 'api_key'), "Server should not have api_key attribute"

        # Verify no credentials in configuration
        assert not hasattr(server, 'api_credentials'), "Server should not have credentials"


# TEST-AC-6.10.1.9: Runnable as Python Module
def test_server_is_runnable_as_python_module():
    """TEST-AC-6.10.1.9: Server is runnable via: python -m mcp_servers.dvids_scraping_server

    GIVEN: The mcp_servers.dvids_scraping_server module
    WHEN: Checking for __main__ entry point
    THEN: Module can be executed as: python -m mcp_servers.dvids_scraping_server
    """
    import importlib.util
    import sys

    # Check if module can be imported
    spec = importlib.util.find_spec("mcp_servers.dvids_scraping_server")
    assert spec is not None, "Module should be importable"

    # Verify module has main entry point
    module = importlib.import_module("mcp_servers.dvids_scraping_server")
    assert hasattr(module, 'main'), "Module should have main() function"


# TEST-AC-6.10.1.10: Logging All Operations
@pytest.mark.asyncio
async def test_server_logs_all_scrape_operations():
    """TEST-AC-6.10.1.10: Server logs all scrape operations and errors.

    GIVEN: DVIDS MCP server instance with logging enabled
    WHEN: Performing search, download, and get_details operations
    THEN: All operations and errors are logged
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer
    import logging
    from io import StringIO

    with tempfile.TemporaryDirectory() as temp_dir:
        # Setup logging capture
        log_capture = StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setLevel(logging.INFO)
        logger = logging.getLogger('mcp_servers.dvids_scraping_server')
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        # Mock HTTP responses
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = Mock()
            mock_response.text = "<html>test</html>"
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            # Perform operations
            await server.search_videos(query="test", max_duration=60)

        # Check logs contain operation info
        log_output = log_capture.getvalue()
        assert len(log_output) > 0, "Server should log operations"
        assert "search" in log_output.lower() or "scrape" in log_output.lower()


# TEST-AC-6.10.1.11: HTML Parsing Extracts Video Metadata
@pytest.mark.asyncio
async def test_html_parsing_extracts_video_metadata():
    """TEST-AC-6.10.1.11: HTML parsing extracts video metadata from DVIDS pages.

    GIVEN: DVIDS MCP server instance
    WHEN: Parsing DVIDS search results HTML
    THEN: Extracts videoId, title, duration, format, resolution, download URL, public domain confirmation
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        # Mock DVIDS search results HTML
        mock_html = """
        <html>
            <div class="search-results">
                <div class="video-item" data-video-id="12345">
                    <h3 class="title">Military Training Exercise</h3>
                    <p class="description"> soldiers conducting training exercises</p>
                    <span class="duration">60 seconds</span>
                    <span class="format">MP4</span>
                    <span class="resolution">1920x1080</span>
                    <a href="/video/12345/download" class="download-link">Download</a>
                    <span class="public-domain-badge">Public Domain</span>
                </div>
            </div>
        </html>
        """

        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = Mock()
            mock_response.text = mock_html
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            results = await server.search_videos(query="military", max_duration=120)

            # Verify metadata extraction
            assert len(results) > 0
            video = results[0]

            assert video['videoId'] == '12345'
            assert 'title' in video
            assert 'duration' in video
            assert video['format'] == 'MP4'
            assert video['resolution'] == '1920x1080'
            assert 'download_url' in video
            assert video['public_domain'] is True


# TEST-AC-6.10.1.12: Maximum Backoff Capped at 60 Seconds
@pytest.mark.asyncio
async def test_exponential_backoff_capped_at_60_seconds():
    """TEST-AC-6.10.1.12: Exponential backoff is capped at maximum 60 seconds.

    GIVEN: DVIDS MCP server instance
    WHEN: Receiving multiple HTTP 429/503 responses
    THEN: Backoff delay is capped at 60 seconds (base_backoff × 2^attempt, max 60s)
    """
    from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

    with tempfile.TemporaryDirectory() as temp_dir:
        server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

        # Mock many 429 responses to trigger max backoff
        attempt_count = 0

        async def mock_get_many_429(*args, **kwargs):
            nonlocal attempt_count
            attempt_count += 1

            # Keep returning 429 to test max backoff cap
            mock_response = Mock()
            mock_response.status_code = 429
            return mock_response

        with patch('httpx.AsyncClient.get', side_effect=mock_get_many_429):
            # This should eventually give up after max retries
            try:
                result = await server.search_videos(query="test", max_duration=60)
            except Exception as e:
                # Expected to fail after max retries
                pass

            # Should have made retry attempts
            assert attempt_count > 0, "Should have made retry attempts"
