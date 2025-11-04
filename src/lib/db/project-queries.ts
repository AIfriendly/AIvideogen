/**
 * Project Database Queries
 *
 * All database operations for project CRUD and messages retrieval.
 * Uses parameterized queries for security and better-sqlite3 for SQLite access.
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

import db from '@/lib/db/client';
import { randomUUID } from 'crypto';

/**
 * Project interface (camelCase for TypeScript)
 */
export interface Project {
  id: string;
  name: string;
  topic: string | null;
  currentStep: string;
  lastActive: string; // ISO 8601 timestamp
  createdAt: string; // ISO 8601 timestamp
}

/**
 * Message interface (camelCase for TypeScript)
 */
export interface Message {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO 8601 timestamp
}

/**
 * Get all projects ordered by last_active descending
 *
 * @returns Array of all projects, most recently active first
 *
 * @example
 * ```typescript
 * const projects = getAllProjects();
 * // Returns: [{ id: '...', name: 'My Project', ... }, ...]
 * ```
 */
export function getAllProjects(): Project[] {
  try {
    const stmt = db.prepare(`
      SELECT
        id,
        name,
        topic,
        current_step as currentStep,
        last_active as lastActive,
        created_at as createdAt
      FROM projects
      ORDER BY last_active DESC
    `);

    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      topic: row.topic,
      currentStep: row.currentStep,
      lastActive: row.lastActive,
      createdAt: row.createdAt,
    }));
  } catch (error) {
    console.error('[DB Error] getAllProjects:', error);
    throw new Error('Failed to fetch projects from database');
  }
}

/**
 * Get a single project by ID
 *
 * @param id - Project UUID
 * @returns Project object or null if not found
 *
 * @example
 * ```typescript
 * const project = getProjectById('uuid-here');
 * if (project) {
 *   console.log(project.name);
 * }
 * ```
 */
export function getProjectById(id: string): Project | null {
  try {
    const stmt = db.prepare(`
      SELECT
        id,
        name,
        topic,
        current_step as currentStep,
        last_active as lastActive,
        created_at as createdAt
      FROM projects
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      topic: row.topic,
      currentStep: row.currentStep,
      lastActive: row.lastActive,
      createdAt: row.createdAt,
    };
  } catch (error) {
    console.error('[DB Error] getProjectById:', error);
    throw new Error('Failed to fetch project from database');
  }
}

/**
 * Create a new project with default values
 *
 * @param name - Optional project name (defaults to "New Project")
 * @returns Newly created project object
 *
 * @example
 * ```typescript
 * const project = createProject('My Video Project');
 * console.log(project.id); // Generated UUID
 * ```
 */
export function createProject(name: string = 'New Project'): Project {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO projects (id, name, current_step, created_at, last_active)
      VALUES (?, ?, 'topic', ?, ?)
    `);

    stmt.run(id, name, now, now);

    // Fetch and return the created project
    const project = getProjectById(id);

    if (!project) {
      throw new Error('Failed to retrieve created project');
    }

    return project;
  } catch (error) {
    console.error('[DB Error] createProject:', error);
    throw new Error('Failed to create project in database');
  }
}

/**
 * Update project's last_active timestamp to current time
 *
 * @param id - Project UUID
 *
 * @example
 * ```typescript
 * updateProjectLastActive('project-uuid');
 * ```
 */
export function updateProjectLastActive(id: string): void {
  try {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE projects
      SET last_active = ?
      WHERE id = ?
    `);

    stmt.run(now, id);
  } catch (error) {
    console.error('[DB Error] updateProjectLastActive:', error);
    throw new Error('Failed to update project last_active timestamp');
  }
}

/**
 * Update project fields (name, topic, currentStep)
 * Automatically updates last_active to current timestamp
 *
 * @param id - Project UUID
 * @param updates - Object with fields to update
 *
 * @example
 * ```typescript
 * updateProject('project-uuid', {
 *   name: 'Updated Project Name',
 *   topic: 'Space exploration'
 * });
 * ```
 */
export function updateProject(
  id: string,
  updates: {
    name?: string;
    topic?: string;
    currentStep?: string;
  }
): void {
  try {
    const now = new Date().toISOString();

    // Build dynamic UPDATE query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.topic !== undefined) {
      fields.push('topic = ?');
      values.push(updates.topic);
    }

    if (updates.currentStep !== undefined) {
      fields.push('current_step = ?');
      values.push(updates.currentStep);
    }

    // Always update last_active
    fields.push('last_active = ?');
    values.push(now);

    // Add id for WHERE clause
    values.push(id);

    if (fields.length === 1) {
      // Only last_active would be updated, which is fine
      const stmt = db.prepare(`
        UPDATE projects
        SET last_active = ?
        WHERE id = ?
      `);
      stmt.run(now, id);
      return;
    }

    const stmt = db.prepare(`
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  } catch (error) {
    console.error('[DB Error] updateProject:', error);
    throw new Error('Failed to update project in database');
  }
}

/**
 * Delete a project by ID
 * Automatically cascades to delete all associated messages (foreign key constraint)
 *
 * @param id - Project UUID
 *
 * @example
 * ```typescript
 * deleteProject('project-uuid');
 * ```
 */
export function deleteProject(id: string): void {
  try {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
  } catch (error) {
    console.error('[DB Error] deleteProject:', error);
    throw new Error('Failed to delete project from database');
  }
}

/**
 * Get all messages for a specific project
 * Ordered chronologically (oldest first)
 *
 * @param projectId - Project UUID
 * @returns Array of messages for the project
 *
 * @example
 * ```typescript
 * const messages = getProjectMessages('project-uuid');
 * messages.forEach(msg => console.log(msg.content));
 * ```
 */
export function getProjectMessages(projectId: string): Message[] {
  try {
    const stmt = db.prepare(`
      SELECT
        id,
        project_id as projectId,
        role,
        content,
        timestamp
      FROM messages
      WHERE project_id = ?
      ORDER BY timestamp ASC, id ASC
    `);

    const rows = stmt.all(projectId) as any[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      timestamp: row.timestamp,
    }));
  } catch (error) {
    console.error('[DB Error] getProjectMessages:', error);
    throw new Error('Failed to fetch messages from database');
  }
}

// TODO: Add unit tests for all query functions
// TODO: Add integration tests with in-memory SQLite database
