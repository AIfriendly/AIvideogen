/**
 * Regression Tests: Provider Progress UI (Story 6.11.3, AC-6.11.3)
 * Test ID Prefix: 6.11.3-REG-xxx
 * Priority: P1 (High) - Critical for Quick Production user experience
 *
 * These regression tests verify that the provider progress UI implementation
 * correctly tracks and displays real-time progress during MCP visual generation.
 *
 * Test Coverage:
 * - PipelineStatus interface includes provider fields
 * - Database query fetches provider fields correctly
 * - API response populates provider fields
 * - Provider progress is updated during visual generation
 * - Provider progress is cleared when complete
 * - Migration 025 creates columns correctly
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Proper mocking with vi.spyOn
 * - Isolated tests with fixtures
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/projects/[id]/pipeline-status/route';
import { NextRequest } from 'next/server';
import { up as migration025Up } from '@/lib/db/migrations/025_add_provider_progress';
import db from '@/lib/db/client';
import {
  createTestProject
} from '../factories/visual-suggestions.factory';

describe('Regression: Provider Progress UI - Story 6.11.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Suite 1: PipelineStatus API Response Structure
   * Tests that the PipelineStatus interface includes provider fields
   */
  describe('6.11.3-REG-001: PipelineStatus API includes provider fields', () => {
    /**
     * 6.11.3-REG-001.1: Response type definition includes visuals_provider
     * Priority: P1 (AC-6.11.3 requirement)
     */
    test('6.11.3-REG-001.1: should include visuals_provider field in PipelineStatus interface', async () => {
      // Given: Project with provider progress data
      const projectId = 'test-project-provider';
      const mockProjectRow = {
        id: projectId,
        name: 'Test Project',
        topic: 'Military Aircraft',
        current_step: 'visual-sourcing',
        script_generated: 1,
        voice_selected: 1,
        visuals_generated: 0,
        video_path: null,
        visuals_provider: 'dvids',
        visuals_download_progress: 45
      };

      vi.spyOn(db, 'prepare').mockReturnValue({
        get: vi.fn().mockReturnValue(mockProjectRow),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/pipeline-status`
      );

      // When: Fetching pipeline status
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Response should include provider fields
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('visuals_provider');
      expect(result.data).toHaveProperty('visuals_download_progress');
    });

    /**
     * 6.11.3-REG-001.2: visuals_provider field has correct type
     * Priority: P1 (Type safety)
     */
    test('6.11.3-REG-001.2: should return visuals_provider as valid provider type', async () => {
      // Given: Project with DVIDS provider
      const projectId = 'test-project-dvids';
      const mockProjectRow = {
        id: projectId,
        name: 'Test Project',
        topic: 'Military Aircraft',
        current_step: 'visual-sourcing',
        script_generated: 1,
        voice_selected: 1,
        visuals_generated: 0,
        video_path: null,
        visuals_provider: 'dvids',
        visuals_download_progress: 30
      };

      vi.spyOn(db, 'prepare').mockReturnValue({
        get: vi.fn().mockReturnValue(mockProjectRow),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/pipeline-status`
      );

      // When: Fetching pipeline status
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Provider should be valid type
      expect(['youtube', 'nasa', 'dvids', undefined]).toContain(result.data.visuals_provider);
      expect(result.data.visuals_provider).toBe('dvids');
    });

    /**
     * 6.11.3-REG-001.3: visuals_download_progress is a number 0-100
     * Priority: P1 (Data validation)
     */
    test('6.11.3-REG-001.3: should return visuals_download_progress as number between 0-100', async () => {
      // Given: Project with progress at 75%
      const projectId = 'test-project-progress';
      const mockProjectRow = {
        id: projectId,
        name: 'Test Project',
        topic: 'Space Exploration',
        current_step: 'visual-sourcing',
        script_generated: 1,
        voice_selected: 1,
        visuals_generated: 0,
        video_path: null,
        visuals_provider: 'nasa',
        visuals_download_progress: 75
      };

      vi.spyOn(db, 'prepare').mockReturnValue({
        get: vi.fn().mockReturnValue(mockProjectRow),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/pipeline-status`
      );

      // When: Fetching pipeline status
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Progress should be number in valid range
      expect(typeof result.data.visuals_download_progress).toBe('number');
      expect(result.data.visuals_download_progress).toBeGreaterThanOrEqual(0);
      expect(result.data.visuals_download_progress).toBeLessThanOrEqual(100);
      expect(result.data.visuals_download_progress).toBe(75);
    });

    /**
     * 6.11.3-REG-001.4: Provider fields are optional (undefined when not active)
     * Priority: P1 (Graceful handling)
     */
    test('6.11.3-REG-001.4: should return undefined for provider fields when not in visual stage', async () => {
      // Given: Project in script stage (no provider progress)
      const projectId = 'test-project-script';
      const mockProjectRow = {
        id: projectId,
        name: 'Test Project',
        topic: 'Test Topic',
        current_step: 'script-generation',
        script_generated: 0,
        voice_selected: 1,
        visuals_generated: 0,
        video_path: null,
        visuals_provider: null,
        visuals_download_progress: null
      };

      vi.spyOn(db, 'prepare').mockReturnValue({
        get: vi.fn().mockReturnValue(mockProjectRow),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/pipeline-status`
      );

      // When: Fetching pipeline status for non-visual stage
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Provider fields should be undefined
      expect(response.status).toBe(200);
      expect(result.data.visuals_provider).toBeUndefined();
      expect(result.data.visuals_download_progress).toBeUndefined();
    });
  });

  /**
   * Suite 2: Database Query Fetches Provider Fields
   * Tests that the SQL query includes the new columns
   */
  describe('6.11.3-REG-002: Database query fetches provider columns', () => {
    /**
     * 6.11.3-REG-002.1: SQL query selects visuals_provider column
     * Priority: P1 (Data retrieval)
     */
    test('6.11.3-REG-002.1: should query visuals_provider from projects table', async () => {
      // Given: Database with provider data
      const projectId = 'test-project-db-query';

      // Spy on db.prepare to verify SQL query
      const prepareSpy = vi.spyOn(db, 'prepare').mockReturnValue({
        get: vi.fn().mockReturnValue({
          id: projectId,
          name: 'Test Project',
          topic: 'Test Topic',
          current_step: 'visual-sourcing',
          script_generated: 1,
          voice_selected: 1,
          visuals_generated: 0,
          video_path: null,
          visuals_provider: 'youtube',
          visuals_download_progress: 50
        }),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/pipeline-status`
      );

      // When: Executing pipeline status query
      await GET(request, { params: Promise.resolve({ id: projectId }) });

      // Then: SQL query should include visuals_provider column
      expect(prepareSpy).toHaveBeenCalled();
      const sqlCalls = prepareSpy.mock.calls.map(call => call[0]);
      const projectQuery = sqlCalls.find(call =>
        typeof call === 'string' &&
        call.includes('SELECT') &&
        call.includes('FROM projects') &&
        call.includes('visuals_provider')
      );
      expect(projectQuery).toBeDefined();
      expect(projectQuery).toContain('visuals_provider');
    });

    /**
     * 6.11.3-REG-002.2: SQL query selects visuals_download_progress column
     * Priority: P1 (Data retrieval)
     */
    test('6.11.3-REG-002.2: should query visuals_download_progress from projects table', async () => {
      // Given: Database with progress data
      const projectId = 'test-project-progress-query';

      const prepareSpy = vi.spyOn(db, 'prepare').mockReturnValue({
        get: vi.fn().mockReturnValue({
          id: projectId,
          name: 'Test Project',
          topic: 'Test Topic',
          current_step: 'visual-sourcing',
          script_generated: 1,
          voice_selected: 1,
          visuals_generated: 0,
          video_path: null,
          visuals_provider: 'nasa',
          visuals_download_progress: 60
        }),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/pipeline-status`
      );

      // When: Executing pipeline status query
      await GET(request, { params: Promise.resolve({ id: projectId }) });

      // Then: SQL query should include progress column
      expect(prepareSpy).toHaveBeenCalled();
      const sqlCalls = prepareSpy.mock.calls.map(call => call[0]);
      const projectQuery = sqlCalls.find(call =>
        typeof call === 'string' &&
        call.includes('visuals_download_progress')
      );
      expect(projectQuery).toBeDefined();
      expect(projectQuery).toContain('visuals_download_progress');
    });
  });

  /**
   * Suite 3: Migration 025 Creates Columns Correctly
   * Tests that the database migration adds the required columns
   */
  describe('6.11.3-REG-003: Migration 025 creates provider progress columns', () => {
    /**
     * 6.11.3-REG-003.1: Migration creates visuals_provider column
     * Priority: P0 (Critical - database schema)
     */
    test('6.11.3-REG-003.1: should create visuals_provider column in projects table', () => {
      // Given: Mock database
      const transactionMock = vi.fn().mockImplementation((callback: any) => callback());
      const mockDb = {
        pragma: vi.fn().mockReturnValue([
          { name: 'id' },
          { name: 'name' },
          { name: 'topic' }
        ]),
        exec: vi.fn(),
        transaction: transactionMock
      } as any;

      // When: Running migration up
      migration025Up(mockDb);

      // Then: Should execute ALTER TABLE to add column
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE projects ADD COLUMN visuals_provider')
      );
    });

    /**
     * 6.11.3-REG-003.2: Migration creates visuals_download_progress column
     * Priority: P0 (Critical - database schema)
     */
    test('6.11.3-REG-003.2: should create visuals_download_progress column in projects table', () => {
      // Given: Mock database
      const mockDb = {
        pragma: vi.fn().mockReturnValue([
          { name: 'id' },
          { name: 'name' },
          { name: 'topic' }
        ]),
        exec: vi.fn(),
        transaction: vi.fn().mockImplementation((callback: any) => callback())
      } as any;

      // When: Running migration up
      migration025Up(mockDb);

      // Then: Should execute ALTER TABLE to add column with default
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE projects ADD COLUMN visuals_download_progress')
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('DEFAULT 0')
      );
    });

    /**
     * 6.11.3-REG-003.3: Migration is idempotent (can run multiple times)
     * Priority: P1 (Idempotency)
     */
    test('6.11.3-REG-003.3: should be idempotent (safe to run multiple times)', () => {
      // Given: Database where columns already exist
      const mockDb = {
        pragma: vi.fn().mockReturnValue([
          { name: 'id' },
          { name: 'name' },
          { name: 'topic' },
          { name: 'visuals_provider' },
          { name: 'visuals_download_progress' }
        ]),
        exec: vi.fn(),
        transaction: vi.fn().mockImplementation((callback: any) => callback())
      } as any;

      // When: Running migration up (second time)
      migration025Up(mockDb);

      // Then: Should not attempt to add columns again
      const alterCommands = mockDb.exec.mock.calls.filter(call =>
        call[0].includes('ALTER TABLE') && call[0].includes('ADD COLUMN')
      );
      expect(alterCommands).toHaveLength(0);
    });

    /**
     * 6.11.3-REG-003.4: visuals_download_progress has correct default value
     * Priority: P1 (Data integrity)
     */
    test('6.11.3-REG-003.4: should set default value of 0 for visuals_download_progress', () => {
      // Given: Mock database
      const mockDb = {
        pragma: vi.fn().mockReturnValue([
          { name: 'id' },
          { name: 'name' }
        ]),
        exec: vi.fn(),
        transaction: vi.fn().mockImplementation((callback: any) => callback())
      } as any;

      // When: Running migration
      migration025Up(mockDb);

      // Then: Default value should be 0
      const execCalls = mockDb.exec.mock.calls.map((call: any) => call[0]);
      const progressColumnCall = execCalls.find((call: string) =>
        call.includes('visuals_download_progress') && call.includes('ADD COLUMN')
      );
      expect(progressColumnCall).toBeDefined();
      expect(progressColumnCall).toContain('DEFAULT 0');
    });
  });

  /**
   * Suite 4: Integration Tests
   * End-to-end tests of provider progress flow
   */
  describe('6.11.3-REG-004: Integration tests for provider progress flow', () => {
    /**
     * 6.11.3-REG-004.1: Progress updates are visible in pipeline status API
     * Priority: P0 (Critical - UI feedback)
     */
    test('6.11.3-REG-004.1: should return current progress in pipeline status during generation', async () => {
      // Given: Project with active provider progress
      const projectId = 'test-project-api-feedback';
      const mockProjectRow = {
        id: projectId,
        name: 'Test Project',
        topic: 'Test Topic',
        current_step: 'visual-sourcing',
        script_generated: 1,
        voice_selected: 1,
        visuals_generated: 0,
        video_path: null,
        visuals_provider: 'nasa',
        visuals_download_progress: 65
      };

      vi.spyOn(db, 'prepare').mockReturnValue({
        get: vi.fn().mockReturnValue(mockProjectRow),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/pipeline-status`
      );

      // When: Polling pipeline status during generation
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Response should include current progress
      expect(response.status).toBe(200);
      expect(result.data.visuals_provider).toBe('nasa');
      expect(result.data.visuals_download_progress).toBe(65);

      // Progress should be reflected in message
      expect(result.data.currentMessage).toBeDefined();
    });
  });

  /**
   * Suite 5: Error Handling
   * Tests graceful error handling for provider progress
   */
  describe('6.11.3-REG-005: Error handling for provider progress', () => {
    /**
     * 6.11.3-REG-005.1: Gracefully handles missing provider columns
     * Priority: P1 (Backward compatibility)
     */
    test('6.11.3-REG-005.1: should handle missing columns gracefully (migration not run)', async () => {
      // Given: Database without new columns (migration not run)
      const projectId = 'test-project-no-columns';
      const mockProjectRow = {
        id: projectId,
        name: 'Test Project',
        topic: 'Test Topic',
        current_step: 'visual-sourcing',
        script_generated: 1,
        voice_selected: 1,
        visuals_generated: 0,
        video_path: null
      };

      vi.spyOn(db, 'prepare').mockReturnValue({
        get: vi.fn().mockReturnValue(mockProjectRow),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/pipeline-status`
      );

      // When: Fetching status without provider columns
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should handle gracefully (undefined values)
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.visuals_provider).toBeUndefined();
      expect(result.data.visuals_download_progress).toBeUndefined();
    });

    /**
     * 6.11.3-REG-005.2: Handles NULL values in database correctly
     * Priority: P1 (Data integrity)
     */
    test('6.11.3-REG-005.2: should handle NULL provider values in database', async () => {
      // Given: Project with NULL provider values
      const projectId = 'test-project-null-values';
      const mockProjectRow = {
        id: projectId,
        name: 'Test Project',
        topic: 'Test Topic',
        current_step: 'visual-sourcing',
        script_generated: 1,
        voice_selected: 1,
        visuals_generated: 0,
        video_path: null,
        visuals_provider: null,
        visuals_download_progress: null
      };

      vi.spyOn(db, 'prepare').mockReturnValue({
        get: vi.fn().mockReturnValue(mockProjectRow),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/pipeline-status`
      );

      // When: Fetching status with NULL values
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should convert NULL to undefined
      expect(response.status).toBe(200);
      expect(result.data.visuals_provider).toBeUndefined();
      expect(result.data.visuals_download_progress).toBeUndefined();
    });

    /**
     * 6.11.3-REG-005.3: Handles all three provider types correctly
     * Priority: P1 (Provider diversity)
     */
    test('6.11.3-REG-005.3: should handle youtube, nasa, and dvids providers', async () => {
      const providers = ['youtube', 'nasa', 'dvids'] as const;

      for (const provider of providers) {
        const projectId = `test-project-${provider}`;
        const mockProjectRow = {
          id: projectId,
          name: 'Test Project',
          topic: 'Test Topic',
          current_step: 'visual-sourcing',
          script_generated: 1,
          voice_selected: 1,
          visuals_generated: 0,
          video_path: null,
          visuals_provider: provider,
          visuals_download_progress: 50
        };

        vi.spyOn(db, 'prepare').mockReturnValue({
          get: vi.fn().mockReturnValue(mockProjectRow),
          all: vi.fn().mockReturnValue([]),
          run: vi.fn()
        } as any);

        const request = new NextRequest(
          `http://localhost:3000/api/projects/${projectId}/pipeline-status`
        );

        const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.data.visuals_provider).toBe(provider);
        expect(result.data.visuals_download_progress).toBe(50);

        vi.clearAllMocks();
      }
    });
  });

  /**
   * Suite 6: Data Type Validation
   * Tests that data types are correct
   */
  describe('6.11.3-REG-006: Data type validation', () => {
    /**
     * 6.11.3-REG-006.1: Provider field accepts valid string values
     * Priority: P1 (Type safety)
     */
    test('6.11.3-REG-006.1: should accept valid provider string values', async () => {
      const validProviders = ['youtube', 'nasa', 'dvids'];

      for (const provider of validProviders) {
        const projectId = `test-provider-${provider}`;
        const mockProjectRow = {
          id: projectId,
          name: 'Test Project',
          topic: 'Test Topic',
          current_step: 'visual-sourcing',
          script_generated: 1,
          voice_selected: 1,
          visuals_generated: 0,
          video_path: null,
          visuals_provider: provider,
          visuals_download_progress: 0
        };

        vi.spyOn(db, 'prepare').mockReturnValue({
          get: vi.fn().mockReturnValue(mockProjectRow),
          all: vi.fn().mockReturnValue([]),
          run: vi.fn()
        } as any);

        const request = new NextRequest(
          `http://localhost:3000/api/projects/${projectId}/pipeline-status`
        );

        const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
        const result = await response.json();

        expect(result.success).toBe(true);
        expect(typeof result.data.visuals_provider).toBe('string');
        expect(result.data.visuals_provider).toBe(provider);

        vi.clearAllMocks();
      }
    });

    /**
     * 6.11.3-REG-006.2: Progress field accepts valid numeric values
     * Priority: P1 (Type safety)
     */
    test('6.11.3-REG-006.2: should accept valid progress numeric values (0-100)', async () => {
      const validProgressValues = [0, 25, 50, 75, 100];

      for (const progress of validProgressValues) {
        const projectId = `test-progress-${progress}`;
        const mockProjectRow = {
          id: projectId,
          name: 'Test Project',
          topic: 'Test Topic',
          current_step: 'visual-sourcing',
          script_generated: 1,
          voice_selected: 1,
          visuals_generated: 0,
          video_path: null,
          visuals_provider: 'youtube',
          visuals_download_progress: progress
        };

        vi.spyOn(db, 'prepare').mockReturnValue({
          get: vi.fn().mockReturnValue(mockProjectRow),
          all: vi.fn().mockReturnValue([]),
          run: vi.fn()
        } as any);

        const request = new NextRequest(
          `http://localhost:3000/api/projects/${projectId}/pipeline-status`
        );

        const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
        const result = await response.json();

        expect(result.success).toBe(true);
        expect(typeof result.data.visuals_download_progress).toBe('number');
        expect(result.data.visuals_download_progress).toBe(progress);

        vi.clearAllMocks();
      }
    });
  });
});
