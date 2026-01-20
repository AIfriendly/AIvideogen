/**
 * Migration 017: Fix Duplicate User Channels Bug
 *
 * BUG: When users changed their user channel, the old channel's is_user_channel flag
 * was not cleared, resulting in multiple channels with is_user_channel=1.
 *
 * IMPACT: getUserChannel() returned arbitrary results, breaking RAG context retrieval
 * and causing the UI to display stale/incorrect channel information.
 *
 * FIX: This migration ensures only ONE channel has is_user_channel=1 by:
 * 1. Detecting if multiple user channels exist
 * 2. Keeping the most recently updated one
 * 3. Clearing the flag from all others
 * 4. Logging the cleanup action
 *
 * Related fix: queries-channels.ts updateChannel() now automatically clears
 * other user channels when setting isUserChannel=true (defense in depth).
 */

import type Database from 'better-sqlite3';

export const id = 17;
export const name = 'fix_duplicate_user_channels';

export function up(db: Database.Database): void {
  // Check for duplicate user channels
  const userChannels = db.prepare(`
    SELECT id, channel_id, name, updated_at
    FROM channels
    WHERE is_user_channel = 1
    ORDER BY updated_at DESC
  `).all() as Array<{ id: string; channel_id: string; name: string; updated_at: string }>;

  if (userChannels.length === 0) {
    console.log('Migration 017: No user channels found (clean state)');
    console.log('Migration 017 (Fix Duplicate User Channels) completed successfully');
    return;
  }

  if (userChannels.length === 1) {
    console.log('Migration 017: Only one user channel found (clean state)');
    console.log(`  - User channel: ${userChannels[0].name} (${userChannels[0].channel_id})`);
    console.log('Migration 017 (Fix Duplicate User Channels) completed successfully');
    return;
  }

  // DUPLICATES FOUND - Clean up
  console.log(`Migration 017: Found ${userChannels.length} user channels (BUG DETECTED)`);
  console.log('Cleaning up duplicate user channels...');

  // Keep the most recently updated one (first in list due to ORDER BY updated_at DESC)
  const keepChannel = userChannels[0];
  const clearChannels = userChannels.slice(1);

  console.log(`  - Keeping: ${keepChannel.name} (${keepChannel.channel_id})`);
  console.log(`  - Clearing flag from ${clearChannels.length} other channels:`);

  // Clear is_user_channel flag from all but the most recent
  const clearStmt = db.prepare(`
    UPDATE channels
    SET is_user_channel = 0,
        updated_at = datetime('now')
    WHERE id = ?
  `);

  let clearedCount = 0;
  for (const channel of clearChannels) {
    clearStmt.run(channel.id);
    console.log(`    - Cleared: ${channel.name} (${channel.channel_id})`);
    clearedCount++;
  }

  console.log(`Migration 017: Cleaned up ${clearedCount} duplicate user channel(s)`);
  console.log(`  - Active user channel: ${keepChannel.name} (${keepChannel.channel_id})`);
  console.log('Migration 017 (Fix Duplicate User Channels) completed successfully');
}

export function down(db: Database.Database): void {
  // Cannot rollback - we don't know which channels were previously set as user channels
  // The migration is idempotent and safe to re-run
  console.log('Migration 017 rollback: Not reversible (data cleanup migration)');
}
