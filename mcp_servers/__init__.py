"""
MCP Servers Package

This package contains Model Context Protocol (MCP) servers for video content providers.
Each server implements web scraping for a specific video provider (DVIDS, NASA, etc.)
and shares a common caching infrastructure.

Modules:
    cache: Shared VideoCache class for caching downloaded videos
    dvids_scraping_server: DVIDS web scraping MCP server
"""

__version__ = "1.0.0"
