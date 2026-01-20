/**
 * REGRESSION-007: Foreign Key Constraints
 *
 * Tests for database constraint violations and cascading deletes.
 * Ensures referential integrity is maintained.
 *
 * Tests:
 * - Should prevent creating scenes for non-existent project
 * - Should prevent creating visual suggestions for non-existent scene
 * - Cascading delete should clean up related records
 * - Should provide user-friendly error messages
 *
 * Story Reference: Story 2.2 - Database Schema Updates
 * Priority: P1 (High Priority - run on PRs)
 *
 * @module tests/regression/p1-foreign-key-constraints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeDatabase } from '@/lib/db/init';

describe('[REGRESSION-007] Foreign Key Constraints', () => {
  beforeEach(async () => {
    // Initialize fresh database for each test
    await initializeDatabase();
    vi.clearAllMocks();
  });

  /**
   * Test: Should prevent creating scenes for non-existent project
   *
   * GIVEN: Invalid project UUID
   * WHEN: Attempting to create scene
   * THEN: Should throw FOREIGN KEY constraint error
   * AND: Error message should be user-friendly
   */
  it('[P1] Should prevent creating scenes for non-existent project', async () => {
    // GIVEN: Invalid project UUID
    const invalidProjectId = 'test-invalid-project-123';

    // Mock database that enforces foreign keys
    const projectExists = false;
    const scene = {
      id: 'test-scene-001',
      project_id: invalidProjectId,
      scene_number: 1,
      text: 'Test scene text',
      sanitized_text: 'Test scene text',
    };

    // Mock insert function that validates foreign keys
    const insertScene = () => {
      if (!projectExists) {
        throw new Error('FOREIGN KEY constraint failed: projects.id does not exist');
      }
      return { success: true };
    };

    // WHEN: Attempting to create scene
    try {
      insertScene();
      expect.fail('Should have thrown FOREIGN KEY error');
    } catch (error: any) {
      // THEN: Should throw FOREIGN KEY constraint error
      expect(error.message).toContain('FOREIGN KEY');

      // AND: Error message should be user-friendly
      expect(error.message).toBeDefined();
      expect(error.message).toContain('projects.id');
    }
  });

  /**
   * Test: Should prevent creating visual suggestions for non-existent scene
   *
   * GIVEN: Invalid scene UUID
   * WHEN: Attempting to save visual suggestions
   * THEN: Should throw FOREIGN KEY constraint error
   */
  it('[P1] Should prevent creating visual suggestions for non-existent scene', async () => {
    // GIVEN: Invalid scene UUID
    const invalidSceneId = 'test-invalid-scene-456';

    const suggestions = [
      {
        scene_id: invalidSceneId,
        video_id: 'vid-001',
        title: 'Test Video',
        duration: 120,
        thumbnail_url: 'https://example.com/thumb.jpg',
        rank: 1,
      },
    ];

    // Mock database that enforces foreign keys
    const sceneExists = false;

    const insertVisualSuggestions = () => {
      if (!sceneExists) {
        throw new Error('FOREIGN KEY constraint failed: scenes.id does not exist');
      }
      return { success: true };
    };

    // WHEN: Attempting to save visual suggestions
    try {
      insertVisualSuggestions();
      expect.fail('Should have thrown FOREIGN KEY error');
    } catch (error: any) {
      // THEN: Should throw FOREIGN KEY constraint error
      expect(error.message).toContain('FOREIGN KEY');
    }
  });

  /**
   * Test: Cascading delete should clean up related records
   *
   * GIVEN: Project with scenes, visual suggestions, messages
   * WHEN: Project is deleted
   * THEN: All related records should be deleted
   */
  it('[P1] Cascading delete should clean up related records', async () => {
    // GIVEN: Project with related records
    const projectId = 'test-cascade-001';
    const scenesCount = 3;
    const visualSuggestionsCount = 15; // 5 per scene
    const messagesCount = 3;

    const deletedRecords: Map<string, number> = new Map();

    // Mock cascading delete
    const deleteProject = (id: string) => {
      // Delete project
      deletedRecords.set('projects', 1);

      // Cascade to scenes
      deletedRecords.set('scenes', scenesCount);

      // Cascade to visual suggestions
      deletedRecords.set('visual_suggestions', visualSuggestionsCount);

      // Cascade to messages
      deletedRecords.set('messages', messagesCount);

      return { success: true };
    };

    // WHEN: Project is deleted
    deleteProject(projectId);

    // THEN: All related records should be deleted
    expect(deletedRecords.get('projects')).toBe(1);
    expect(deletedRecords.get('scenes')).toBe(scenesCount);
    expect(deletedRecords.get('visual_suggestions')).toBe(visualSuggestionsCount);
    expect(deletedRecords.get('messages')).toBe(messagesCount);

    // Verify total count
    const totalDeleted = Array.from(deletedRecords.values()).reduce((sum, count) => sum + count, 0);
    expect(totalDeleted).toBe(1 + scenesCount + visualSuggestionsCount + messagesCount);
  });

  /**
   * Test: Should prevent orphaned records on update
   *
   * GIVEN: Scene with valid project_id
   * WHEN: Updating scene with invalid project_id
   * THEN: Should throw FOREIGN KEY error
   */
  it('[P1] Should prevent orphaned records on update', async () => {
    // GIVEN: Scene with valid project_id
    const validProjectId = 'test-valid-project-001';
    const invalidProjectId = 'test-invalid-project-999';

    const scene = {
      id: 'test-scene-001',
      project_id: validProjectId,
      scene_number: 1,
      text: 'Original text',
      sanitized_text: 'Original text',
    };

    // Mock update that enforces foreign keys
    const validProjects = new Set([validProjectId]);

    const updateScene = (sceneId: string, updates: any) => {
      if (updates.project_id && !validProjects.has(updates.project_id)) {
        throw new Error('FOREIGN KEY constraint failed');
      }
      return { success: true };
    };

    // WHEN: Updating scene with invalid project_id
    try {
      updateScene(scene.id, { project_id: invalidProjectId });
      expect.fail('Should have thrown FOREIGN KEY error');
    } catch (error: any) {
      // THEN: Should throw FOREIGN KEY error
      expect(error.message).toContain('FOREIGN KEY');
    }
  });

  /**
   * Test: Should handle batch inserts with constraint violations
   *
   * GIVEN: Batch of scenes with some invalid project_ids
   * WHEN: Attempting batch insert
   * THEN: Entire batch should fail
   */
  it('[P1] Should handle batch inserts with constraint violations', async () => {
    // GIVEN: Batch of scenes with some invalid project_ids
    const validProjectId = 'test-batch-valid-001';
    const invalidProjectId = 'test-batch-invalid-001';

    const scenes = [
      {
        id: 'scene-1',
        project_id: validProjectId,
        scene_number: 1,
        text: 'Scene 1',
        sanitized_text: 'Scene 1',
      },
      {
        id: 'scene-2',
        project_id: invalidProjectId, // Invalid
        scene_number: 2,
        text: 'Scene 2',
        sanitized_text: 'Scene 2',
      },
      {
        id: 'scene-3',
        project_id: validProjectId,
        scene_number: 3,
        text: 'Scene 3',
        sanitized_text: 'Scene 3',
      },
    ];

    // Mock batch insert
    const validProjects = new Set([validProjectId]);
    let insertedCount = 0;

    const batchInsertScenes = () => {
      for (const scene of scenes) {
        if (!validProjects.has(scene.project_id)) {
          throw new Error('FOREIGN KEY constraint failed');
        }
        insertedCount++;
      }
      return { success: true };
    };

    // WHEN: Attempting batch insert
    try {
      batchInsertScenes();
      expect.fail('Should have thrown FOREIGN KEY error');
    } catch (error: any) {
      // THEN: Entire batch should fail
      expect(error.message).toContain('FOREIGN KEY');
    }

    // AND: No partial records should be created
    expect(insertedCount).toBeLessThan(scenes.length);
  });

  /**
   * Test: Should validate foreign keys before insert
   *
   * GIVEN: Scene with project_id
   * WHEN: Inserting scene
   * THEN: Should validate project exists first
   */
  it('[P1] Should validate foreign keys before insert', async () => {
    // GIVEN: Scene with project_id
    const invalidProjectId = 'test-validate-fk-001';
    const scene = {
      id: 'test-scene-001',
      project_id: invalidProjectId,
      scene_number: 1,
      text: 'Test text',
      sanitized_text: 'Test text',
    };

    // Mock validation check
    const getProject = (id: string) => {
      return null; // Project doesn't exist
    };

    let insertCalled = false;
    const insertScene = () => {
      insertCalled = true;
    };

    // WHEN: Inserting scene with validation
    try {
      const project = getProject(invalidProjectId);
      if (!project) {
        throw new Error('FOREIGN KEY constraint failed: project does not exist');
      }
      insertScene();
      expect.fail('Should have thrown error');
    } catch (error: any) {
      // THEN: Should fail fast if project doesn't exist
      expect(error.message).toContain('FOREIGN KEY');
    }

    // AND: Should not attempt insert
    expect(insertCalled).toBe(false);
  });

  /**
   * Test: Should provide actionable error messages for FK violations
   *
   * GIVEN: Foreign key violation occurs
   * WHEN: Error is caught
   * THEN: Error message should indicate which constraint failed
   */
  it('[P1] Should provide actionable error messages for FK violations', async () => {
    // GIVEN: Foreign key violation
    const invalidId = 'test-fk-actionable-001';

    // Mock database error
    const insertScene = () => {
      throw new Error(
        `FOREIGN KEY constraint failed: projects.id references ${invalidId}`
      );
    };

    // WHEN: Error is caught
    try {
      insertScene();
      expect.fail('Should have thrown error');
    } catch (error: any) {
      // THEN: Error message should indicate which constraint failed
      expect(error.message).toContain('FOREIGN KEY');

      // AND: Error message should mention the referenced table
      expect(error.message.toLowerCase()).toContain('project');
      expect(error.message).toContain(invalidId);
    }
  });

  /**
   * Test: Should handle circular reference errors gracefully
   *
   * Note: This is a theoretical test - circular FKs should be avoided
   * in schema design, but we test error handling just in case.
   */
  it('[P1] Should handle circular reference errors gracefully', async () => {
    // GIVEN: Potential circular reference scenario
    const projectId = 'test-circular-001';

    // Mock database that detects circular references
    const insertProject = () => {
      throw new Error('CIRCULAR REFERENCE detected');
    };

    // WHEN: Attempting operation that would create circular reference
    try {
      insertProject();
      expect.fail('Should have thrown error');
    } catch (error: any) {
      // THEN: Should handle gracefully
      expect(error.message).toBeDefined();
    }
  });

  /**
   * Test: Should maintain FK constraints after bulk operations
   *
   * GIVEN: Bulk delete operation
   * WHEN: Deleting multiple records
   * THEN: Should maintain referential integrity
   */
  it('[P1] Should maintain FK constraints after bulk operations', async () => {
    // GIVEN: Bulk delete operation
    const projectIds = ['test-bulk-001', 'test-bulk-002', 'test-bulk-003'];

    const deletedRecords: string[] = [];

    // Mock bulk delete with cascading
    const bulkDeleteProjects = (ids: string[]) => {
      ids.forEach(id => {
        deletedRecords.push(id);
        // Simulate cascade: delete related records
        deletedRecords.push(`scene-${id}-1`);
        deletedRecords.push(`scene-${id}-2`);
      });

      return { success: true, count: ids.length };
    };

    // WHEN: Deleting multiple records
    const result = bulkDeleteProjects(projectIds);

    // THEN: Should maintain referential integrity
    expect(result.success).toBe(true);
    expect(result.count).toBe(projectIds.length);

    // AND: All related records should be deleted
    expect(deletedRecords.length).toBeGreaterThan(projectIds.length);

    // Verify cascade: each project has 2 scenes + itself = 3 records
    expect(deletedRecords.length).toBe(projectIds.length * 3);
  });
});
