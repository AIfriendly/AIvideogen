"""
TEST-AC-6.10.1: DVIDS Server Edge Case and Error Handling Tests

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
import asyncio
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime


class TestDVIDSServerErrorHandling:
    """Test error handling paths in DVIDSScrapingMCPServer."""

    @pytest.mark.P1
    @pytest.mark.asyncio
    async def test_search_videos_with_empty_query(self):
        """[P1] search_videos should handle empty query string.

        GIVEN: DVIDS MCP server instance
        WHEN: Calling search_videos with empty query
        THEN: Should handle gracefully (return empty results or raise error)
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            with patch('httpx.AsyncClient.get') as mock_get:
                mock_response = Mock()
                mock_response.text = "<html></html>"
                mock_response.status_code = 200
                mock_get.return_value = mock_response

                # Empty query - should still attempt search
                results = await server.search_videos(query="", max_duration=60)
                assert isinstance(results, list)

    @pytest.mark.P1
    @pytest.mark.asyncio
    async def test_search_videos_with_network_timeout(self):
        """[P1] search_videos should handle network timeouts.

        GIVEN: DVIDS MCP server instance
        WHEN: HTTP request times out
        THEN: Should raise appropriate error or handle gracefully
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer
        import httpx

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            async def mock_get_with_timeout(*args, **kwargs):
                await asyncio.sleep(0.1)
                raise httpx.TimeoutException("Request timed out")

            with patch('httpx.AsyncClient.get', side_effect=mock_get_with_timeout):
                with pytest.raises((httpx.TimeoutException, Exception)):
                    await server.search_videos(query="test", max_duration=60)

    @pytest.mark.P1
    @pytest.mark.asyncio
    async def test_search_videos_with_robots_txt_disallowed(self):
        """[P1] search_videos should respect robots.txt disallow rules.

        GIVEN: DVIDS MCP server instance and robots.txt disallows scraping
        WHEN: Calling search_videos
        THEN: Should raise PermissionError
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            # Mock robots.txt check to return False (disallowed)
            with patch('mcp_servers.dvids_scraping_server.check_robots_txt', return_value=False):
                with pytest.raises(PermissionError, match="Robots.txt"):
                    await server.search_videos(query="test", max_duration=60)

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_search_videos_with_malformed_html(self):
        """[P2] search_videos should handle malformed HTML responses.

        GIVEN: DVIDS MCP server instance
        WHEN: HTML response is malformed
        THEN: Should handle gracefully and return empty results
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            # Malformed HTML
            malformed_html = "<html><div><unclosed><broken</html>"

            with patch('httpx.AsyncClient.get') as mock_get:
                mock_response = Mock()
                mock_response.text = malformed_html
                mock_response.status_code = 200
                mock_get.return_value = mock_response

                # Should handle gracefully, return empty list
                results = await server.search_videos(query="test", max_duration=60)
                assert isinstance(results, list)

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_search_videos_with_empty_results(self):
        """[P2] search_videos should handle empty search results.

        GIVEN: DVIDS MCP server instance
        WHEN: Search returns no video results
        THEN: Should return empty list (not None)
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            # HTML with no video items
            empty_html = """
            <html>
                <div class="search-results">
                    <p>No results found</p>
                </div>
            </html>
            """

            with patch('httpx.AsyncClient.get') as mock_get:
                mock_response = Mock()
                mock_response.text = empty_html
                mock_response.status_code = 200
                mock_get.return_value = mock_response

                results = await server.search_videos(query="nonexistent", max_duration=60)
                assert results == []

    @pytest.mark.P1
    @pytest.mark.asyncio
    async def test_download_video_with_invalid_video_id(self):
        """[P1] download_video should handle invalid/non-existent video_id.

        GIVEN: DVIDS MCP server instance
        WHEN: Downloading with invalid video_id
        THEN: Should raise appropriate error
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer
        import httpx

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            with patch('httpx.AsyncClient.get') as mock_get:
                # 404 Not Found
                mock_response = Mock()
                mock_response.status_code = 404
                mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                    "Not found", request=None, response=mock_response
                )
                mock_get.return_value = mock_response

                with pytest.raises((httpx.HTTPStatusError, Exception)):
                    await server.download_video(video_id="invalid_id_99999")

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_download_video_with_unicode_title(self):
        """[P2] download_video should handle unicode characters in metadata.

        GIVEN: DVIDS MCP server instance
        WHEN: Video metadata contains unicode characters
        THEN: Should handle correctly
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            video_id = "test_unicode"

            # HTML with unicode title
            unicode_html = f"""
            <html>
                <h1>Test Title 中文 日本語 한국어 العربية 😀</h1>
                <a href="/download/{video_id}" class="download-link">Download</a>
            </html>
            """

            with patch('httpx.AsyncClient.get') as mock_get:
                # First call returns HTML page, second returns video content
                mock_html_response = Mock()
                mock_html_response.text = unicode_html
                mock_html_response.status_code = 200
                mock_html_response.content = unicode_html.encode('utf-8')

                mock_video_response = Mock()
                mock_video_response.content = b"fake video data"
                mock_video_response.status_code = 200

                mock_get.side_effect = [mock_html_response, mock_video_response]

                result = await server.download_video(video_id=video_id)

                # Should complete without error
                assert 'video_id' in result
                assert 'file_path' in result

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_get_video_details_with_missing_fields(self):
        """[P2] get_video_details should handle missing metadata fields.

        GIVEN: DVIDS MCP server instance
        WHEN: Video page is missing some metadata fields
        THEN: Should return details with default values for missing fields
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            video_id = "12345"

            # HTML with minimal fields
            minimal_html = f"""
            <html>
                <body>
                    <h1 class="title">Basic Title</h1>
                    <!-- Missing description, duration, format, etc. -->
                </body>
            </html>
            """

            with patch('httpx.AsyncClient.get') as mock_get:
                mock_response = Mock()
                mock_response.text = minimal_html
                mock_response.status_code = 200
                mock_get.return_value = mock_response

                details = await server.get_video_details(video_id=video_id)

                # Should have all fields with defaults
                assert 'title' in details
                assert 'description' in details
                assert 'duration' in details
                assert 'format' in details
                assert 'resolution' in details
                assert 'download_url' in details
                assert 'public_domain' in details

    @pytest.mark.P1
    @pytest.mark.asyncio
    async def test_exponential_backoff_max_retries_exceeded(self):
        """[P1] Should raise error after max retries on persistent 429.

        GIVEN: DVIDS MCP server instance
        WHEN: All retries return HTTP 429
        THEN: Should raise HTTPStatusError after MAX_RETRIES
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer
        import httpx

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            async def mock_get_always_429(*args, **kwargs):
                mock_response = Mock()
                mock_response.status_code = 429
                return mock_response

            with patch('httpx.AsyncClient.get', side_effect=mock_get_always_429):
                with pytest.raises(httpx.HTTPStatusError):
                    await server.search_videos(query="test", max_duration=60)


class TestDVIDSServerEdgeCases:
    """Test edge cases in DVIDSScrapingMCPServer."""

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_parse_duration_with_various_formats(self):
        """[P2] _parse_duration should handle various duration formats.

        GIVEN: DVIDS MCP server instance
        WHEN: Parsing different duration string formats
        THEN: Should correctly parse to seconds
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            # Test various formats
            test_cases = [
                ("45 seconds", 45),
                ("30 second", 30),
                ("1:30", 90),  # 1 min 30 sec
                ("2:15", 135),  # 2 min 15 sec
                ("0:45", 45),
                ("10m 30s", 630),  # 10 minutes 30 seconds
                ("1m", 60),
                ("90s", 90),
                ("invalid", 0),  # Should default to 0
            ]

            for duration_text, expected_seconds in test_cases:
                result = server._parse_duration(duration_text)
                assert result == expected_seconds, f"Failed for '{duration_text}': got {result}, expected {expected_seconds}"

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_search_videos_with_zero_max_duration(self):
        """[P2] search_videos should handle max_duration=0 filter.

        GIVEN: DVIDS MCP server instance
        WHEN: Searching with max_duration=0
        THEN: Should return only 0-duration videos (likely empty)
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            # HTML with videos of various durations
            html = """
            <html>
                <div class="video-item" data-video-id="123">
                    <span class="duration">30 seconds</span>
                </div>
                <div class="video-item" data-video-id="456">
                    <span class="duration">60 seconds</span>
                </div>
            </html>
            """

            with patch('httpx.AsyncClient.get') as mock_get:
                mock_response = Mock()
                mock_response.text = html
                mock_response.status_code = 200
                mock_get.return_value = mock_response

                results = await server.search_videos(query="test", max_duration=0)

                # Should filter out all videos (none have 0 duration)
                assert results == []

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_search_videos_with_very_large_max_duration(self):
        """[P2] search_videos should handle very large max_duration value.

        GIVEN: DVIDS MCP server instance
        WHEN: Searching with max_duration=999999
        THEN: Should return all videos (none filtered)
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            html = """
            <html>
                <div class="video-item" data-video-id="123">
                    <h3 class="title">Video 1</h3>
                    <span class="duration">30 seconds</span>
                </div>
            </html>
            """

            with patch('httpx.AsyncClient.get') as mock_get:
                mock_response = Mock()
                mock_response.text = html
                mock_response.status_code = 200
                mock_get.return_value = mock_response

                results = await server.search_videos(query="test", max_duration=999999)

                # Should return all videos
                assert len(results) > 0

    @pytest.mark.P3
    @pytest.mark.asyncio
    async def test_search_videos_with_special_characters_in_query(self):
        """[P3] search_videos should handle special characters in query.

        GIVEN: DVIDS MCP server instance
        WHEN: Searching with special characters in query
        THEN: Should handle correctly (URL encoding)
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            with patch('httpx.AsyncClient.get') as mock_get:
                mock_response = Mock()
                mock_response.text = "<html></html>"
                mock_response.status_code = 200
                mock_get.return_value = mock_response

                # Various special characters
                queries = [
                    "test & query",
                    "test + plus",
                    "test (parentheses)",
                    "test [brackets]",
                    "test \"quotes\"",
                ]

                for query in queries:
                    results = await server.search_videos(query=query, max_duration=60)
                    assert isinstance(results, list)

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_download_video_uses_cache_on_second_call(self):
        """[P2] download_video should use cache on subsequent calls.

        GIVEN: DVIDS MCP server instance
        WHEN: Downloading same video twice
        THEN: Second call should return cached version
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            video_id = "test_cache_hit"
            mock_content = b"video content"

            call_count = 0

            async def mock_get(*args, **kwargs):
                nonlocal call_count
                call_count += 1
                mock_response = Mock()
                mock_response.text = "<html></html>"
                mock_response.content = mock_content
                mock_response.status_code = 200
                return mock_response

            with patch('httpx.AsyncClient.get', side_effect=mock_get):
                # First download
                result1 = await server.download_video(video_id=video_id)
                first_call_count = call_count

                # Second download - should use cache
                result2 = await server.download_video(video_id=video_id)
                second_call_count = call_count

                # Second call should not make HTTP request (use cache)
                assert second_call_count == first_call_count
                assert result1['video_id'] == result2['video_id']

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_multiple_alternative_html_selectors(self):
        """[P2] search_videos should try alternative selectors when primary fails.

        GIVEN: DVIDS MCP server instance
        WHEN: Primary selector finds no results
        THEN: Should try alternative data-video-id selector
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            # HTML with data-video-id attribute (alternative selector)
            html = """
            <html>
                <div data-video-id="12345">
                    <h3>Video Title</h3>
                    <span class="duration">45 seconds</span>
                </div>
            </html>
            """

            with patch('httpx.AsyncClient.get') as mock_get:
                mock_response = Mock()
                mock_response.text = html
                mock_response.status_code = 200
                mock_get.return_value = mock_response

                results = await server.search_videos(query="test", max_duration=60)

                # Should find video using alternative selector
                assert len(results) > 0
                assert results[0]['videoId'] == '12345'


class TestDVIDSServerMCPProtocol:
    """Test MCP protocol handling."""

    @pytest.mark.P1
    @pytest.mark.asyncio
    async def test_call_tool_with_unknown_tool_name(self):
        """[P1] call_tool should raise error for unknown tool.

        GIVEN: MCP tool call handler
        WHEN: Calling unknown tool
        THEN: Should raise ValueError
        """
        from mcp_servers.dvids_scraping_server import call_tool

        with pytest.raises(ValueError, match="Unknown tool"):
            await call_tool("unknown_tool", {})

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_call_tool_with_missing_arguments(self):
        """[P2] call_tool should handle missing required arguments.

        GIVEN: MCP tool call handler
        WHEN: Calling tool with missing required args
        THEN: Should handle gracefully (may use defaults or raise error)
        """
        from mcp_servers.dvids_scraping_server import call_tool

        # search_videos requires "query" argument
        with patch('mcp_servers.dvids_scraping_server.DVIDSScrapingMCPServer') as mock_server:
            mock_instance = AsyncMock()
            mock_server.return_value = mock_instance
            mock_instance.search_videos.return_value = []

            # Call with empty arguments
            result = await call_tool("search_videos", {})

            # Should handle (may use None or default)
            assert isinstance(result, list)


class TestDVIDSServerIntegration:
    """Test integration scenarios."""

    @pytest.mark.P2
    @pytest.mark.asyncio
    async def test_full_workflow_search_to_download(self):
        """[P2] Test full workflow from search to download.

        GIVEN: DVIDS MCP server instance
        WHEN: Searching then downloading a video
        THEN: Should complete workflow successfully
        """
        from mcp_servers.dvids_scraping_server import DVIDSScrapingMCPServer

        with tempfile.TemporaryDirectory() as temp_dir:
            server = DVIDSScrapingMCPServer(cache_dir=temp_dir)

            # Mock search response
            search_html = """
            <html>
                <div class="video-item" data-video-id="test123">
                    <h3 class="title">Test Video</h3>
                    <span class="duration">30 seconds</span>
                    <span class="format">MP4</span>
                    <span class="resolution">1920x1080</span>
                    <a href="/video/test123" class="download-link">Download</a>
                </div>
            </html>
            """

            with patch('httpx.AsyncClient.get') as mock_get:
                # Search returns results
                mock_search_response = Mock()
                mock_search_response.text = search_html
                mock_search_response.status_code = 200

                # Download returns content
                mock_download_response = Mock()
                mock_download_response.text = "<html>video page</html>"
                mock_download_response.content = b"video data"
                mock_download_response.status_code = 200

                mock_get.side_effect = [mock_search_response, mock_download_response, mock_download_response]

                # Search
                search_results = await server.search_videos(query="test", max_duration=60)
                assert len(search_results) > 0
                video_id = search_results[0]['videoId']

                # Download
                download_result = await server.download_video(video_id=video_id)
                assert download_result['video_id'] == video_id
                assert 'file_path' in download_result
