/**
 * Migration 012: Seed Preset Personas - Story 1.8
 *
 * Seeds the 4 preset AI personas into the system_prompts table.
 * Uses INSERT OR REPLACE to be idempotent (safe to run multiple times).
 */

import type Database from 'better-sqlite3';
import { PRESET_PERSONAS } from '../../llm/prompts/preset-personas';

export const id = 12;
export const name = 'seed_preset_personas';

export function up(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO system_prompts (id, name, prompt, description, category, is_preset, is_default)
    VALUES (?, ?, ?, ?, 'preset', ?, ?)
  `);

  for (const persona of PRESET_PERSONAS) {
    insert.run(
      persona.id,
      persona.name,
      persona.prompt,
      persona.description,
      persona.is_preset ? 1 : 0,
      persona.is_default ? 1 : 0
    );
  }

  console.log(`Seeded ${PRESET_PERSONAS.length} preset personas into system_prompts table`);
}

export function down(db: Database.Database): void {
  db.prepare(`DELETE FROM system_prompts WHERE is_preset = 1`).run();
  console.log('Removed all preset personas from system_prompts table');
}
