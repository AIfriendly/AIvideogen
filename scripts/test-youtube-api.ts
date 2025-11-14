#!/usr/bin/env tsx

/**
 * YouTube API Testing CLI Tool
 *
 * Command-line tool for testing and debugging YouTube API integration.
 *
 * Usage:
 *   npm run test:youtube -- --test-auth
 *   npm run test:youtube -- --search "gaming clips"
 *   npm run test:youtube -- --quota
 *   npm run test:youtube -- --stress-test
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { getYouTubeClient, resetYouTubeClient } from '../src/lib/youtube/factory';
import { YouTubeError } from '../src/lib/youtube/types';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const value = args[1];

/**
 * Test API authentication
 */
async function testAuth() {
  console.log('\n🔑 Testing YouTube API Authentication...\n');

  try {
    const client = getYouTubeClient();
    console.log('✅ Client initialized successfully');

    // Test search
    const results = await client.searchVideos('test', { maxResults: 1 });
    console.log('✅ Test search successful');
    console.log(`   Found ${results.length} result(s)`);

    if (results.length > 0) {
      console.log(`   Sample video: "${results[0].title}"`);
    }

    // Display quota
    const quota = client.getQuotaUsage();
    console.log(`\n📊 Quota Status:`);
    console.log(`   Used: ${quota.used}/${quota.limit} units`);
    console.log(`   Remaining: ${quota.remaining} units`);
    console.log(`   Resets: ${quota.resetTime.toLocaleString()}`);

    process.exit(0);
  } catch (error) {
    if (error instanceof YouTubeError) {
      console.error(`\n❌ ${error.code}`);
      console.error(`   ${error.message}`);
      if (error.context?.guidance) {
        console.error(`\n💡 ${error.context.guidance}`);
      }
    } else {
      console.error(`\n❌ Error:`, error);
    }
    process.exit(1);
  }
}

/**
 * Test search with query
 */
async function testSearch(query: string) {
  if (!query) {
    console.error('❌ Search query required');
    console.error('Usage: npm run test:youtube -- --search "your query"');
    process.exit(1);
  }

  console.log(`\n🔍 Searching YouTube for: "${query}"\n`);

  try {
    const client = getYouTubeClient();
    const startTime = Date.now();

    const results = await client.searchVideos(query, { maxResults: 10 });

    const duration = Date.now() - startTime;

    console.log(`✅ Search completed in ${duration}ms`);
    console.log(`   Found ${results.length} results\n`);

    results.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(`   Video ID: ${video.videoId}`);
      console.log(`   Channel: ${video.channelTitle}`);
      console.log(`   URL: https://youtube.com/watch?v=${video.videoId}\n`);
    });

    const quota = client.getQuotaUsage();
    console.log(`📊 Quota: ${quota.used}/${quota.limit} (${quota.remaining} remaining)`);

    process.exit(0);
  } catch (error) {
    if (error instanceof YouTubeError) {
      console.error(`\n❌ ${error.code}: ${error.message}`);
    } else {
      console.error(`\n❌ Error:`, error);
    }
    process.exit(1);
  }
}

/**
 * Display quota usage
 */
async function displayQuota() {
  console.log('\n📊 YouTube API Quota Status\n');

  try {
    const client = getYouTubeClient();
    const quota = client.getQuotaUsage();

    const percentUsed = Math.round((quota.used / quota.limit) * 100);
    const hoursUntilReset = Math.round((quota.resetTime.getTime() - Date.now()) / (1000 * 60 * 60));

    console.log(`Used:      ${quota.used} / ${quota.limit} units (${percentUsed}%)`);
    console.log(`Remaining: ${quota.remaining} units`);
    console.log(`Resets:    ${quota.resetTime.toLocaleString()}`);
    console.log(`           (~${hoursUntilReset} hours from now)`);

    if (percentUsed >= 80) {
      console.log(`\n⚠️  Warning: Quota at ${percentUsed}% - approaching limit`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

/**
 * Stress test rate limiting
 */
async function stressTest() {
  console.log('\n⚡ Running stress test (20 concurrent requests)\n');

  try {
    const client = getYouTubeClient();
    const requests = [];

    console.log('Starting requests...');
    const startTime = Date.now();

    for (let i = 0; i < 20; i++) {
      requests.push(
        client.searchVideos(`test ${i}`, { maxResults: 1 })
          .then(() => console.log(`✓ Request ${i + 1} completed`))
      );
    }

    await Promise.all(requests);

    const duration = Date.now() - startTime;
    console.log(`\n✅ All requests completed in ${duration}ms`);
    console.log(`   Average: ${Math.round(duration / 20)}ms per request`);

    const quota = client.getQuotaUsage();
    console.log(`\n📊 Quota used: ${quota.used}/${quota.limit}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Stress test failed:', error);
    process.exit(1);
  }
}

/**
 * Main CLI handler
 */
async function main() {
  if (!command) {
    console.log(`
YouTube API Testing Tool

Usage:
  npm run test:youtube -- --test-auth              Test authentication
  npm run test:youtube -- --search "query"         Search YouTube
  npm run test:youtube -- --quota                  Show quota usage
  npm run test:youtube -- --stress-test            Test rate limiting

Examples:
  npm run test:youtube -- --test-auth
  npm run test:youtube -- --search "gaming highlights"
  npm run test:youtube -- --quota
    `);
    process.exit(0);
  }

  switch (command) {
    case '--test-auth':
      await testAuth();
      break;

    case '--search':
      await testSearch(value);
      break;

    case '--quota':
      await displayQuota();
      break;

    case '--stress-test':
      await stressTest();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run without arguments to see usage');
      process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
