/**
 * VideoAssembler Unit Tests - Story 5.1
 *
 * Tests for the VideoAssembler class job management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoAssembler } from '@/lib/video/assembler';
import db from '@/lib/db/client';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database for tests
beforeEach(async () => {
  await initializeDatabase();
});

describe('VideoAssembler', () => {
  let assembler: VideoAssembler;

  beforeEach(() => {
    assembler = new VideoAssembler();
  });

  afterEach(() => {
    // Cleanup test data
    try {
      db.exec('DELETE FROM assembly_jobs WHERE project_id LIKE "test-%"');
      db.exec('DELETE FROM projects WHERE id LIKE "test-%"');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createJob', () => {
    it('should create a new assembly job', async () => {
      // Create test project first
      const projectId = `test-${Date.now()}`;
      db.prepare(`
        INSERT INTO projects (id, name, current_step)
        VALUES (?, 'Test Project', 'editing')
      `).run(projectId);

      const jobId = await assembler.createJob(projectId, 3);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      // Verify job was created
      const job = assembler.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job?.project_id).toBe(projectId);
      expect(job?.total_scenes).toBe(3);
      expect(job?.status).toBe('pending');
      expect(job?.progress).toBe(0);
    });
  });

  describe('getJobStatus', () => {
    it('should return null for non-existent job', () => {
      const job = assembler.getJobStatus('non-existent-id');
      expect(job).toBeNull();
    });

    it('should return job data for existing job', async () => {
      const projectId = `test-${Date.now()}`;
      db.prepare(`
        INSERT INTO projects (id, name, current_step)
        VALUES (?, 'Test Project', 'editing')
      `).run(projectId);

      const jobId = await assembler.createJob(projectId, 5);
      const job = assembler.getJobStatus(jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.total_scenes).toBe(5);
    });
  });

  describe('getJobByProject', () => {
    it('should return null for project with no jobs', () => {
      const job = assembler.getJobByProject('non-existent-project');
      expect(job).toBeNull();
    });

    it('should return most recent job for project', async () => {
      const projectId = `test-${Date.now()}`;
      db.prepare(`
        INSERT INTO projects (id, name, current_step)
        VALUES (?, 'Test Project', 'editing')
      `).run(projectId);

      // Create multiple jobs
      await assembler.createJob(projectId, 2);
      const latestJobId = await assembler.createJob(projectId, 4);

      const job = assembler.getJobByProject(projectId);
      expect(job).toBeDefined();
      expect(job?.id).toBe(latestJobId);
      expect(job?.total_scenes).toBe(4);
    });
  });

  describe('hasActiveJob', () => {
    it('should return false for project with no jobs', () => {
      const result = assembler.hasActiveJob('non-existent-project');
      expect(result).toBe(false);
    });

    it('should return true for project with pending job', async () => {
      const projectId = `test-${Date.now()}`;
      db.prepare(`
        INSERT INTO projects (id, name, current_step)
        VALUES (?, 'Test Project', 'editing')
      `).run(projectId);

      await assembler.createJob(projectId, 3);
      const result = assembler.hasActiveJob(projectId);
      expect(result).toBe(true);
    });

    it('should return false for project with completed job', async () => {
      const projectId = `test-${Date.now()}`;
      db.prepare(`
        INSERT INTO projects (id, name, current_step)
        VALUES (?, 'Test Project', 'editing')
      `).run(projectId);

      const jobId = await assembler.createJob(projectId, 3);
      await assembler.completeJob(jobId);

      const result = assembler.hasActiveJob(projectId);
      expect(result).toBe(false);
    });
  });

  describe('updateJobProgress', () => {
    it('should update job progress and stage', async () => {
      const projectId = `test-${Date.now()}`;
      db.prepare(`
        INSERT INTO projects (id, name, current_step)
        VALUES (?, 'Test Project', 'editing')
      `).run(projectId);

      const jobId = await assembler.createJob(projectId, 5);
      assembler.updateJobProgress(jobId, 40, 'trimming', 2);

      const job = assembler.getJobStatus(jobId);
      expect(job?.progress).toBe(40);
      expect(job?.current_stage).toBe('trimming');
      expect(job?.current_scene).toBe(2);
      expect(job?.status).toBe('processing');
      expect(job?.started_at).toBeDefined();
    });

    it('should clamp progress between 0 and 100', async () => {
      const projectId = `test-${Date.now()}`;
      db.prepare(`
        INSERT INTO projects (id, name, current_step)
        VALUES (?, 'Test Project', 'editing')
      `).run(projectId);

      const jobId = await assembler.createJob(projectId, 3);

      assembler.updateJobProgress(jobId, 150, 'trimming');
      let job = assembler.getJobStatus(jobId);
      expect(job?.progress).toBe(100);

      assembler.updateJobProgress(jobId, -10, 'trimming');
      job = assembler.getJobStatus(jobId);
      expect(job?.progress).toBe(0);
    });
  });

  describe('completeJob', () => {
    it('should mark job as complete', async () => {
      const projectId = `test-${Date.now()}`;
      db.prepare(`
        INSERT INTO projects (id, name, current_step)
        VALUES (?, 'Test Project', 'editing')
      `).run(projectId);

      const jobId = await assembler.createJob(projectId, 3);
      await assembler.completeJob(jobId);

      const job = assembler.getJobStatus(jobId);
      expect(job?.status).toBe('complete');
      expect(job?.progress).toBe(100);
      expect(job?.completed_at).toBeDefined();
    });
  });

  describe('failJob', () => {
    it('should mark job as failed with error message', async () => {
      const projectId = `test-${Date.now()}`;
      db.prepare(`
        INSERT INTO projects (id, name, current_step)
        VALUES (?, 'Test Project', 'editing')
      `).run(projectId);

      const jobId = await assembler.createJob(projectId, 3);
      await assembler.failJob(jobId, 'Test error message');

      const job = assembler.getJobStatus(jobId);
      expect(job?.status).toBe('error');
      expect(job?.error_message).toBe('Test error message');
      expect(job?.completed_at).toBeDefined();
    });
  });

  describe('getTempDir', () => {
    it('should return temp directory path for job', () => {
      const tempDir = assembler.getTempDir('test-job-id');
      // Check for path parts regardless of separator
      expect(tempDir).toMatch(/[/\\]\.cache[/\\]assembly[/\\]/);
      expect(tempDir).toContain('test-job-id');
    });
  });

  describe('getOutputDir', () => {
    it('should return output directory path', () => {
      const outputDir = assembler.getOutputDir();
      // Check for path parts regardless of separator
      expect(outputDir).toMatch(/[/\\]public[/\\]videos$/);
    });
  });
});
