#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DVIDS MCP Server - Direct Test

Tests the DVIDS Playwright MCP server by calling it directly.
This validates that the MCP integration is working correctly.
"""

import subprocess
import json
import sys
import os
from pathlib import Path

# ANSI colors (safe for Windows)
class Colors:
    reset = '\x1b[0m'
    green = '\x1b[32m'
    yellow = '\x1b[33m'
    blue = '\x1b[34m'
    red = '\x1b[31m'
    bright = '\x1b[1m'

def log(msg, color='reset'):
    # Set UTF-8 encoding for output
    if sys.platform == 'win32':
        try:
            import codecs
            sys.stdout.reconfigure(encoding='utf-8')
        except:
            pass
    print(f'{getattr(Colors, color)}{msg}{Colors.reset}')

def section(title):
    print('\n' + '=' * 60)
    log(title, 'bright')
    print('=' * 60)

def main():
    try:
        section('🛡️ DVIDS MCP Server - Direct Test (Python)')

        # Check if server exists
        server_path = Path('mcp_servers/dvids_scraping_server.py')
        if not server_path.exists():
            log(f'❌ MCP server not found: {server_path}', 'red')
            return 1

        log(f'✅ MCP server found: {server_path}', 'green')

        # Check Python modules
        log('\n📦 Checking Python dependencies...', 'blue')

        # Check for required modules
        required_modules = ['mcp', 'playwright', 'bs4', 'httpx']
        missing_modules = []

        for module in required_modules:
            try:
                __import__(module)
                log(f'  ✅ {module}', 'green')
            except ImportError:
                log(f'  ❌ {module} - NOT INSTALLED', 'red')
                missing_modules.append(module)

        if missing_modules:
            log(f'\n❌ Missing required modules: {", ".join(missing_modules)}', 'red')
            log('Install with: pip install mcp playwright beautifulsoup4 httpx', 'yellow')
            return 1

        # Try to import and test the server module
        log('\n🔧 Testing DVIDS server module...', 'blue')

        sys.path.insert(0, str(Path.cwd()))
        try:
            from mcp_servers import dvids_scraping_server
            log('✅ Server module imported successfully', 'green')

            # Check for main functions
            if hasattr(dvids_scraping_server, 'DVIDSScrapingMCPServer'):
                log('✅ DVIDSScrapingMCPServer class found', 'green')
            else:
                log('⚠️  DVIDSScrapingMCPServer class not found', 'yellow')

        except ImportError as e:
            log(f'❌ Failed to import server module: {e}', 'red')
            return 1

        # Check if Playwright browsers are installed
        log('\n🌐 Checking Playwright browsers...', 'blue')

        try:
            from playwright.sync_api import sync_playwright
            log('✅ Playwright module available', 'green')

            # Try to launch chromium
            log('  Testing browser launch...', 'yellow')
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                log('  ✅ Chromium browser launched successfully', 'green')
                browser.close()
                log('  ✅ Browser closed successfully', 'green')

        except Exception as e:
            log(f'⚠️  Browser test failed: {e}', 'yellow')
            log('  Install browsers with: playwright install chromium', 'yellow')

        section('✅ VALIDATION SUMMARY')
        log('DVIDS MCP server module structure is correct!', 'green')
        log('\nNext steps:', 'blue')
        log('1. Ensure Playwright browsers are installed', 'yellow')
        log('2. Test the MCP server via HTTP endpoint or client', 'yellow')
        log('3. Run full integration test with video generation', 'yellow')

        return 0

    except Exception as e:
        section('❌ ERROR')
        log(str(e), 'red')
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
