/**
 * Test for Migration 004: current_step CHECK Constraint
 * Story 3.5 - Subtask 8.2
 *
 * Verifies that the CHECK constraint on projects.current_step properly
 * validates workflow state values at the database level.
 */

import { describe, test, expect } from 'vitest';
import { createCleanDatabase, insertTestProject } from '../fixtures/database.fixture';
import { randomUUID } from 'crypto';

describe('Migration 004: current_step CHECK Constraint', () => {
  test('should accept valid current_step values', () => {
    const db = createCleanDatabase();

    try {
      const validSteps = [
        'topic',
        'script',
        'voice',
        'voiceover',
        'visual-sourcing',
        'visual-curation',
        'editing',
        'export'
      ];

      for (const step of validSteps) {
        const projectId = randomUUID();
        const stmt = db.prepare(`
          INSERT INTO projects (id, name, current_step, created_at, last_active)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `);

        // Should NOT throw for valid values
        expect(() => {
          stmt.run(projectId, `Test Project ${step}`, step);
        }).not.toThrow();
      }

      // Verify all projects were inserted
      const count = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
      expect(count.count).toBe(validSteps.length);
    } finally {
      db.close();
    }
  });

  test('should reject invalid current_step values', () => {
    const db = createCleanDatabase();

    try {
      const invalidSteps = [
        'invalid-step',
        'Visual-Sourcing', // Wrong case
        'visual_sourcing', // Wrong separator
        'done',
        'in-progress',
        '',
        'null'
      ];

      for (const step of invalidSteps) {
        const projectId = randomUUID();
        const stmt = db.prepare(`
          INSERT INTO projects (id, name, current_step, created_at, last_active)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `);

        // Should throw CHECK constraint error
        expect(() => {
          stmt.run(projectId, `Test Project ${step}`, step);
        }).toThrow(/CHECK constraint failed/);
      }

      // Verify NO projects were inserted
      const count = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
      expect(count.count).toBe(0);
    } finally {
      db.close();
    }
  });

  test('should allow UPDATE to valid current_step values', () => {
    const db = createCleanDatabase();

    try {
      const projectId = randomUUID();

      // Insert with default 'topic'
      db.prepare(`
        INSERT INTO projects (id, name, created_at, last_active)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `).run(projectId, 'Test Project');

      // Update through workflow states
      const workflow = ['script', 'voice', 'voiceover', 'visual-sourcing', 'visual-curation'];

      for (const step of workflow) {
        const updateStmt = db.prepare('UPDATE projects SET current_step = ? WHERE id = ?');

        // Should NOT throw
        expect(() => {
          updateStmt.run(step, projectId);
        }).not.toThrow();

        // Verify update succeeded
        const result = db.prepare('SELECT current_step FROM projects WHERE id = ?').get(projectId) as { current_step: string };
        expect(result.current_step).toBe(step);
      }
    } finally {
      db.close();
    }
  });

  test('should reject UPDATE to invalid current_step values', () => {
    const db = createCleanDatabase();

    try {
      const projectId = randomUUID();

      // Insert with default 'topic'
      db.prepare(`
        INSERT INTO projects (id, name, created_at, last_active)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `).run(projectId, 'Test Project');

      // Attempt to update to invalid value
      const updateStmt = db.prepare('UPDATE projects SET current_step = ? WHERE id = ?');

      expect(() => {
        updateStmt.run('visual-soucring', projectId); // TYPO!
      }).toThrow(/CHECK constraint failed/);

      // Verify value did NOT change
      const result = db.prepare('SELECT current_step FROM projects WHERE id = ?').get(projectId) as { current_step: string };
      expect(result.current_step).toBe('topic'); // Still default value
    } finally {
      db.close();
    }
  });

  test('should preserve CHECK constraint after migration', () => {
    const db = createCleanDatabase();

    try {
      // Verify the constraint exists by checking table schema
      const tableInfo = db.prepare(`
        SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'
      `).get() as { sql: string };

      // Should contain CHECK constraint definition
      expect(tableInfo.sql).toContain('CHECK');
      expect(tableInfo.sql).toContain('current_step');
      expect(tableInfo.sql).toContain('visual-sourcing');
      expect(tableInfo.sql).toContain('visual-curation');
    } finally {
      db.close();
    }
  });
});
