"""
Pytest configuration and fixtures for ai-video-generator tests.
"""

import pytest
import sys
from pathlib import Path

# pytest_configure hook runs after pytest has set up sys.path
def pytest_configure():
    """Configure Python path for mcp_servers imports."""
    project_root = Path(__file__).parent.parent
    tests_dir = Path(__file__).parent

    # Add project root to sys.path if not already there
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    # Remove tests directory from sys.path to avoid import conflicts
    sys.path = [p for p in sys.path if str(tests_dir) not in p]


@pytest.fixture
def temp_cache_dir(tmp_path):
    """Fixture providing a temporary cache directory."""
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir(exist_ok=True)
    return str(cache_dir)
