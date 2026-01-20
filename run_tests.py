#!/usr/bin/env python
"""Test runner for ai-video-generator that sets up PYTHONPATH correctly."""
import os
import sys
from pathlib import Path

# Add ai-video-generator to Python path
project_root = Path(__file__).parent
os.environ['PYTHONPATH'] = str(project_root)
sys.path.insert(0, str(project_root))

# Run pytest with the same arguments
import pytest
sys.exit(pytest.main())
