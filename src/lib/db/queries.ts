/**
 * Database Query Functions
 *
 * Provides a clean TypeScript API for CRUD operations on all database entities.
 * All functions use parameterized queries to prevent SQL injection.
 */

import db from './client';
import { randomUUID } from 'crypto';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * System Prompt entity
 * Stores customizable and preset system prompts for AI interactions
 */
export interface SystemPrompt {
  id: string;
  name: string;
  prompt: string;
  description: string | null;
  category: string | null;
  is_preset: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Project entity (Epic 1 scope only)
 * Excludes: selected_voice (Epic 2), script_json (Epic 2/3)
 */
export interface Project {
  id: string;
  name: string;
  topic: string | null;
  current_step: string;
  status: string;
  config_json: string | null;
  system_prompt_id: string | null;
  created_at: string;
  last_active: string;
}

/**
 * Message entity
 * Conversation history linked to projects
 */
export interface Message {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// ============================================================================
// System Prompt Query Functions
// ============================================================================

/**
 * Retrieve all system prompts
 * @returns Array of all system prompts
 */
export function getSystemPrompts(): SystemPrompt[] {
  try {
    const stmt = db.prepare('SELECT * FROM system_prompts ORDER BY created_at DESC');
    return stmt.all() as SystemPrompt[];
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    throw new Error(
      `Failed to fetch system prompts: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieve the default system prompt
 * @returns Default system prompt or null if not found
 */
export function getDefaultSystemPrompt(): SystemPrompt | null {
  try {
    const stmt = db.prepare('SELECT * FROM system_prompts WHERE is_default = 1 LIMIT 1');
    return (stmt.get() as SystemPrompt) || null;
  } catch (error) {
    console.error('Error fetching default system prompt:', error);
    throw new Error(
      `Failed to fetch default system prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create a new system prompt
 * @param data System prompt data (without id and timestamps)
 * @returns Created system prompt
 */
export function createSystemPrompt(
  data: Omit<SystemPrompt, 'id' | 'created_at' | 'updated_at'>
): SystemPrompt {
  try {
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO system_prompts (id, name, prompt, description, category, is_preset, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.prompt,
      data.description,
      data.category,
      data.is_preset ? 1 : 0,
      data.is_default ? 1 : 0
    );

    // Retrieve and return the created prompt
    const getStmt = db.prepare('SELECT * FROM system_prompts WHERE id = ?');
    return getStmt.get(id) as SystemPrompt;
  } catch (error) {
    console.error('Error creating system prompt:', error);
    throw new Error(
      `Failed to create system prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// Project Query Functions
// ============================================================================

/**
 * Create a new project
 * @param name Project name
 * @param systemPromptId Optional system prompt ID override
 * @returns Created project
 */
export function createProject(name: string, systemPromptId?: string): Project {
  try {
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO projects (id, name, system_prompt_id)
      VALUES (?, ?, ?)
    `);

    stmt.run(id, name, systemPromptId || null);

    // Retrieve and return the created project
    const getStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return getStmt.get(id) as Project;
  } catch (error) {
    console.error('Error creating project:', error);

    // Check for foreign key violation
    if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
      throw new Error('Invalid system_prompt_id: The specified system prompt does not exist');
    }

    throw new Error(
      `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieve a project by ID
 * @param id Project ID
 * @returns Project or null if not found
 */
export function getProject(id: string): Project | null {
  try {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return (stmt.get(id) as Project) || null;
  } catch (error) {
    console.error('Error fetching project:', error);
    throw new Error(
      `Failed to fetch project: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update project fields
 * @param id Project ID
 * @param updates Partial project data to update
 */
export function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>): void {
  try {
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
    if (updates.current_step !== undefined) {
      fields.push('current_step = ?');
      values.push(updates.current_step);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.config_json !== undefined) {
      fields.push('config_json = ?');
      values.push(updates.config_json);
    }
    if (updates.system_prompt_id !== undefined) {
      fields.push('system_prompt_id = ?');
      values.push(updates.system_prompt_id);
    }

    // Always update last_active timestamp
    fields.push('last_active = datetime(\'now\')');

    if (fields.length === 1) {
      // Only last_active would be updated, skip
      return;
    }

    values.push(id); // Add id for WHERE clause

    const stmt = db.prepare(`
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  } catch (error) {
    console.error('Error updating project:', error);

    // Check for foreign key violation
    if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
      throw new Error('Invalid system_prompt_id: The specified system prompt does not exist');
    }

    throw new Error(
      `Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a project (cascades to messages)
 * @param id Project ID
 */
export function deleteProject(id: string): void {
  try {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error(
      `Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieve all projects ordered by most recently active
 * @returns Array of all projects
 */
export function getAllProjects(): Project[] {
  try {
    const stmt = db.prepare('SELECT * FROM projects ORDER BY last_active DESC');
    return stmt.all() as Project[];
  } catch (error) {
    console.error('Error fetching all projects:', error);
    throw new Error(
      `Failed to fetch all projects: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// Message Query Functions
// ============================================================================

/**
 * Create a new message
 * @param projectId Project ID
 * @param role Message role (user, assistant, or system)
 * @param content Message content
 * @returns Created message
 */
export function createMessage(
  projectId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Message {
  try {
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO messages (id, project_id, role, content)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, projectId, role, content);

    // Retrieve and return the created message
    const getStmt = db.prepare('SELECT * FROM messages WHERE id = ?');
    return getStmt.get(id) as Message;
  } catch (error) {
    console.error('Error creating message:', error);

    // Check for foreign key violation
    if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
      throw new Error('Invalid project_id: The specified project does not exist');
    }

    // Check for CHECK constraint violation
    if (error instanceof Error && error.message.includes('CHECK constraint failed')) {
      throw new Error("Invalid role: must be 'user', 'assistant', or 'system'");
    }

    throw new Error(
      `Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieve all messages for a project in chronological order
 * @param projectId Project ID
 * @returns Array of messages ordered by timestamp ASC
 */
export function getMessagesByProject(projectId: string): Message[] {
  try {
    const stmt = db.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY timestamp ASC');
    return stmt.all(projectId) as Message[];
  } catch (error) {
    console.error('Error fetching messages by project:', error);
    throw new Error(
      `Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete all messages for a project
 * @param projectId Project ID
 */
export function deleteMessagesByProject(projectId: string): void {
  try {
    const stmt = db.prepare('DELETE FROM messages WHERE project_id = ?');
    stmt.run(projectId);
  } catch (error) {
    console.error('Error deleting messages by project:', error);
    throw new Error(
      `Failed to delete messages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
