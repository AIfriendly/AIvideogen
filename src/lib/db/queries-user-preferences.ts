/**
 * User Preferences Query Functions
 *
 * Story 6.8a - QPF Infrastructure
 *
 * Database operations for user preferences (Quick Production Flow defaults).
 */

import db from './client';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * User Preferences entity (raw database row)
 */
export interface UserPreferencesRow {
  id: string;
  default_voice_id: string | null;
  default_persona_id: string | null;
  quick_production_enabled: number; // SQLite stores boolean as 0/1
  created_at: string;
  updated_at: string;
}

/**
 * User Preferences with joined voice and persona names
 */
export interface UserPreferences {
  id: string;
  default_voice_id: string | null;
  default_persona_id: string | null;
  quick_production_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  voice_name?: string;
  persona_name?: string;
}

/**
 * Data for updating user preferences
 */
export interface UserPreferencesUpdate {
  default_voice_id?: string | null;
  default_persona_id?: string | null;
  quick_production_enabled?: boolean;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get user preferences with joined voice and persona names
 *
 * Note: voice_name is resolved from TypeScript voice-profiles.ts,
 * while persona_name is joined from system_prompts table.
 *
 * @returns UserPreferences with joined names, or null if not found
 */
export function getUserPreferences(): UserPreferences | null {
  try {
    const stmt = db.prepare(`
      SELECT
        up.id,
        up.default_voice_id,
        up.default_persona_id,
        up.quick_production_enabled,
        up.created_at,
        up.updated_at,
        sp.name as persona_name
      FROM user_preferences up
      LEFT JOIN system_prompts sp ON up.default_persona_id = sp.id
      WHERE up.id = 'default'
    `);

    const row = stmt.get() as (UserPreferencesRow & { persona_name: string | null }) | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      default_voice_id: row.default_voice_id,
      default_persona_id: row.default_persona_id,
      quick_production_enabled: row.quick_production_enabled === 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
      persona_name: row.persona_name || undefined,
      // voice_name will be resolved by the API layer using voice-profiles.ts
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    throw new Error(
      `Failed to fetch user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update user preferences (partial update supported)
 *
 * @param data - Fields to update
 * @returns Updated preferences
 */
export function updateUserPreferences(data: UserPreferencesUpdate): UserPreferences | null {
  try {
    // Build dynamic UPDATE statement
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.default_voice_id !== undefined) {
      updates.push('default_voice_id = ?');
      values.push(data.default_voice_id);
    }

    if (data.default_persona_id !== undefined) {
      updates.push('default_persona_id = ?');
      values.push(data.default_persona_id);
    }

    if (data.quick_production_enabled !== undefined) {
      updates.push('quick_production_enabled = ?');
      values.push(data.quick_production_enabled ? 1 : 0);
    }

    // Always update updated_at
    updates.push("updated_at = datetime('now')");

    if (updates.length === 1) {
      // Only updated_at, no actual changes
      return getUserPreferences();
    }

    const sql = `UPDATE user_preferences SET ${updates.join(', ')} WHERE id = 'default'`;

    const stmt = db.prepare(sql);
    stmt.run(...values);

    return getUserPreferences();
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw new Error(
      `Failed to update user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if user has configured defaults (both voice and persona)
 *
 * @returns true if both default_voice_id and default_persona_id are set
 */
export function hasConfiguredDefaults(): boolean {
  try {
    const prefs = getUserPreferences();
    return !!(prefs?.default_voice_id && prefs?.default_persona_id);
  } catch {
    return false;
  }
}

/**
 * Ensure the default row exists (called during initialization)
 */
export function ensureDefaultPreferences(): void {
  try {
    db.exec(`INSERT OR IGNORE INTO user_preferences (id) VALUES ('default')`);
  } catch (error) {
    console.error('Error ensuring default preferences:', error);
  }
}
