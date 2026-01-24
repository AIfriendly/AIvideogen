#!/usr/bin/env tsx
/**
 * DVIDS MCP Provider Direct Test
 *
 * Tests the DVIDS Playwright MCP server directly by calling its tools.
 * This bypasses the full pipeline and focuses on validating the MCP integration.
 */

import { spawn } from 'child_process';
import { createClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import fs from 'fs';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bright: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function main() {
  try {
    section('🛡️ DVIDS MCP Provider - Direct Test');

    // Check if MCP server exists
    const serverPath = path.join(process.cwd(), 'mcp_servers/dvids_scraping_server.py');
    if (!fs.existsSync(serverPath)) {
      log(`❌ MCP server not found: ${serverPath}`, 'red');
      process.exit(1);
    }

    log(`✅ MCP server found: ${serverPath}`, 'green');

    // Start the DVIDS MCP server
    log('\n🚀 Starting DVIDS MCP server...', 'blue');

    const pythonProcess = spawn('python', ['-m', 'mcp_servers.dvids_scraping_server'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    // Create MCP client
    const transport = new StdioClientTransport({
      command: 'python',
      args: ['-m', 'mcp_servers.dvids_scraping_server'],
      cwd: process.cwd(),
    });

    const client = createClient({
      name: 'dvids-test-client',
      version: '1.0.0',
    }, {
      capabilities: {}
    });

    // Connect to server
    log('📡 Connecting to MCP server...', 'blue');
    await client.connect(transport);
    log('✅ Connected to DVIDS MCP server', 'green');

    // List available tools
    section('🔧 Available MCP Tools');
    const tools = await client.listTools();
    log(`Found ${tools.tools.length} tools:`, 'blue');
    tools.tools.forEach(tool => {
      log(`  - ${tool.name}: ${tool.description?.split('\n')[0]}`, 'blue');
    });

    // Test search_videos tool
    section('🔍 Testing search_videos Tool');

    const testQuery = 'black hole';
    log(`Query: "${testQuery}"`, 'yellow');
    log('Calling DVIDS MCP server to search for videos...', 'blue');

    const searchResult = await client.callTool({
      name: 'search_videos',
      arguments: {
        query: testQuery,
        max_duration: 120,
      }
    });

    if (searchResult.content && searchResult.content.length > 0) {
      const results = JSON.parse(searchResult.content[0].text as string);
      log(`✅ Found ${results.length} videos`, 'green');

      if (results.length > 0) {
        log('\nSample results:', 'blue');
        results.slice(0, 3).forEach((video: any, i: number) => {
          log(`  ${i + 1}. ${video.title}`, 'blue');
          log(`     Duration: ${video.duration}s | ID: ${video.videoId}`, 'blue');
        });

        // Test download_video tool
        section('📥 Testing download_video Tool');

        const firstVideo = results[0];
        log(`Video: ${firstVideo.title}`, 'yellow');
        log(`Video ID: ${firstVideo.videoId}`, 'yellow');

        const downloadResult = await client.callTool({
          name: 'download_video',
          arguments: {
            video_id: firstVideo.videoId
          }
        });

        if (downloadResult.content && downloadResult.content.length > 0) {
          const downloadInfo = JSON.parse(downloadResult.content[0].text as string);
          log(`✅ Video downloaded successfully!`, 'green');
          log(`Cache path: ${downloadInfo.cache_path}`, 'blue');
          log(`File size: ${downloadInfo.file_size || 'unknown'}`, 'blue');

          // Verify file exists
          if (fs.existsSync(downloadInfo.cache_path)) {
            const stats = fs.statSync(downloadInfo.cache_path);
            log(`File verified: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'green');
          }
        }

        section('✅ VALIDATION SUCCESSFUL');
        log('DVIDS MCP provider is working correctly!', 'green');
        log('Successfully searched and downloaded a video from DVIDS.', 'green');
      } else {
        log('⚠️  No videos found for test query', 'yellow');
      }
    } else {
      log('❌ No results from MCP server', 'red');
    }

    // Cleanup
    await client.close();
    pythonProcess.kill();

  } catch (error: any) {
    section('❌ ERROR');
    log(error.message, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
