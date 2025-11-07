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
 * Project entity (Epic 1 + Epic 2 fields)
 * Includes Epic 2 fields: voice_id, script_generated, voice_selected, total_duration
 */
export interface Project {
  id: string;
  name: string;
  topic: string | null;
  current_step: string;
  status: string;
  config_json: string | null;
  system_prompt_id: string | null;
  voice_id: string | null;           // Epic 2: Selected TTS voice identifier
  script_generated: boolean;         // Epic 2: Script generation completion status
  voice_selected: boolean;           // Epic 2: Voice selection completion status
  total_duration: number | null;     // Epic 2: Aggregated duration of all scenes
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
    if (updates.voice_id !== undefined) {
      fields.push('voice_id = ?');
      values.push(updates.voice_id);
    }
    if (updates.script_generated !== undefined) {
      fields.push('script_generated = ?');
      values.push(updates.script_generated ? 1 : 0);
    }
    if (updates.voice_selected !== undefined) {
      fields.push('voice_selected = ?');
      values.push(updates.voice_selected ? 1 : 0);
    }
    if (updates.total_duration !== undefined) {
      fields.push('total_duration = ?');
      values.push(updates.total_duration);
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

// ============================================================================
// Scene Query Functions (Epic 2)
// ============================================================================

/**
 * Scene entity
 */
export interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  text: string;
  sanitized_text: string | null;
  audio_file_path: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new scene
 * @param data Scene data
 * @returns Created scene
 */
export function createScene(data: {
  id?: string;
  project_id: string;
  scene_number: number;
  text: string;
  sanitized_text?: string | null;
  audio_file_path?: string | null;
  duration?: number | null;
}): Scene {
  try {
    const id = data.id || randomUUID();
    const stmt = db.prepare(`
      INSERT INTO scenes (id, project_id, scene_number, text, sanitized_text, audio_file_path, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.scene_number,
      data.text,
      data.sanitized_text || null,
      data.audio_file_path || null,
      data.duration || null
    );

    // Retrieve and return the created scene
    const getStmt = db.prepare('SELECT * FROM scenes WHERE id = ?');
    return getStmt.get(id) as Scene;
  } catch (error) {
    console.error('Error creating scene:', error);

    // Check for foreign key violation
    if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
      throw new Error('Invalid project_id: The specified project does not exist');
    }

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new Error(
        `Duplicate scene number: Scene ${data.scene_number} already exists for project ${data.project_id}`
      );
    }

    throw new Error(
      `Failed to create scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create multiple scenes in a transaction
 * @param scenes Array of scene data
 * @returns Array of created scenes
 */
export function createScenes(scenes: Array<{
  id?: string;
  project_id: string;
  scene_number: number;
  text: string;
  sanitized_text?: string | null;
  audio_file_path?: string | null;
  duration?: number | null;
}>): Scene[] {
  try {
    const insertStmt = db.prepare(`
      INSERT INTO scenes (id, project_id, scene_number, text, sanitized_text, audio_file_path, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((scenesToInsert: typeof scenes) => {
      for (const scene of scenesToInsert) {
        const id = scene.id || randomUUID();
        insertStmt.run(
          id,
          scene.project_id,
          scene.scene_number,
          scene.text,
          scene.sanitized_text || null,
          scene.audio_file_path || null,
          scene.duration || null
        );
      }
    });

    insertMany(scenes);

    // Retrieve and return all created scenes
    if (scenes.length > 0) {
      const projectId = scenes[0].project_id;
      return getScenesByProjectId(projectId);
    }

    return [];
  } catch (error) {
    console.error('Error creating scenes:', error);

    // Check for foreign key violation
    if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
      throw new Error('Invalid project_id: The specified project does not exist');
    }

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Duplicate scene number detected in bulk insert');
    }

    throw new Error(
      `Failed to create scenes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieve a scene by ID
 * @param id Scene ID
 * @returns Scene or null if not found
 */
export function getSceneById(id: string): Scene | null {
  try {
    const stmt = db.prepare('SELECT * FROM scenes WHERE id = ?');
    return (stmt.get(id) as Scene) || null;
  } catch (error) {
    console.error('Error fetching scene by ID:', error);
    throw new Error(
      `Failed to fetch scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieve all scenes for a project ordered by scene number
 * @param projectId Project ID
 * @returns Array of scenes ordered by scene_number ASC
 */
export function getScenesByProjectId(projectId: string): Scene[] {
  try {
    const stmt = db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC');
    return stmt.all(projectId) as Scene[];
  } catch (error) {
    console.error('Error fetching scenes by project:', error);
    throw new Error(
      `Failed to fetch scenes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieve a scene by project ID and scene number
 * @param projectId Project ID
 * @param sceneNumber Scene number
 * @returns Scene or null if not found
 */
export function getSceneByNumber(projectId: string, sceneNumber: number): Scene | null {
  try {
    const stmt = db.prepare('SELECT * FROM scenes WHERE project_id = ? AND scene_number = ?');
    return (stmt.get(projectId, sceneNumber) as Scene) || null;
  } catch (error) {
    console.error('Error fetching scene by number:', error);
    throw new Error(
      `Failed to fetch scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Count scenes for a project
 * @param projectId Project ID
 * @returns Number of scenes
 */
export function countScenes(projectId: string): number {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM scenes WHERE project_id = ?');
    const result = stmt.get(projectId) as { count: number };
    return result.count;
  } catch (error) {
    console.error('Error counting scenes:', error);
    throw new Error(
      `Failed to count scenes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update scene fields
 * @param id Scene ID
 * @param updates Partial scene data to update
 * @returns Updated scene
 */
export function updateScene(
  id: string,
  updates: {
    text?: string;
    sanitized_text?: string | null;
    audio_file_path?: string | null;
    duration?: number | null;
  }
): Scene {
  try {
    // Build dynamic UPDATE query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.text !== undefined) {
      fields.push('text = ?');
      values.push(updates.text);
    }
    if (updates.sanitized_text !== undefined) {
      fields.push('sanitized_text = ?');
      values.push(updates.sanitized_text);
    }
    if (updates.audio_file_path !== undefined) {
      fields.push('audio_file_path = ?');
      values.push(updates.audio_file_path);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }

    // Always update updated_at timestamp
    fields.push('updated_at = datetime(\'now\')');

    if (fields.length === 1) {
      // Only updated_at would be updated, just return the scene
      const scene = getSceneById(id);
      if (!scene) {
        throw new Error(`Scene not found: ${id}`);
      }
      return scene;
    }

    values.push(id); // Add id for WHERE clause

    const stmt = db.prepare(`
      UPDATE scenes
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    // Retrieve and return the updated scene
    const scene = getSceneById(id);
    if (!scene) {
      throw new Error(`Scene not found after update: ${id}`);
    }
    return scene;
  } catch (error) {
    console.error('Error updating scene:', error);
    throw new Error(
      `Failed to update scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update scene audio metadata
 * @param id Scene ID
 * @param audioPath Path to audio file
 * @param duration Duration in seconds
 * @returns Updated scene
 */
export function updateSceneAudio(id: string, audioPath: string, duration: number): Scene {
  return updateScene(id, {
    audio_file_path: audioPath,
    duration: duration,
  });
}

/**
 * Update scene sanitized text
 * @param id Scene ID
 * @param sanitizedText Sanitized text for TTS
 * @returns Updated scene
 */
export function updateSceneSanitizedText(id: string, sanitizedText: string): Scene {
  return updateScene(id, {
    sanitized_text: sanitizedText,
  });
}

/**
 * Delete a scene
 * @param id Scene ID
 */
export function deleteScene(id: string): void {
  try {
    const stmt = db.prepare('DELETE FROM scenes WHERE id = ?');
    stmt.run(id);
  } catch (error) {
    console.error('Error deleting scene:', error);
    throw new Error(
      `Failed to delete scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete all scenes for a project
 * @param projectId Project ID
 */
export function deleteScenesByProjectId(projectId: string): void {
  try {
    const stmt = db.prepare('DELETE FROM scenes WHERE project_id = ?');
    stmt.run(projectId);
  } catch (error) {
    console.error('Error deleting scenes by project:', error);
    throw new Error(
      `Failed to delete scenes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// Project Query Functions (Epic 2 Extensions)
// ============================================================================

/**
 * Update project voice selection
 * @param id Project ID
 * @param voiceId Voice identifier
 * @returns Updated project
 */
export function updateProjectVoice(id: string, voiceId: string): Project {
  try {
    updateProject(id, { voice_id: voiceId });
    const project = getProject(id);
    if (!project) {
      throw new Error(`Project not found after update: ${id}`);
    }
    return project;
  } catch (error) {
    console.error('Error updating project voice:', error);
    throw new Error(
      `Failed to update project voice: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Mark script as generated for a project
 * @param id Project ID
 * @returns Updated project
 */
export function markScriptGenerated(id: string): Project {
  try {
    updateProject(id, { script_generated: true });
    const project = getProject(id);
    if (!project) {
      throw new Error(`Project not found after update: ${id}`);
    }
    return project;
  } catch (error) {
    console.error('Error marking script as generated:', error);
    throw new Error(
      `Failed to mark script as generated: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Mark voice as selected for a project
 * @param id Project ID
 * @param voiceId Voice identifier
 * @returns Updated project
 */
export function markVoiceSelected(id: string, voiceId: string): Project {
  try {
    updateProject(id, {
      voice_selected: true,
      voice_id: voiceId,
    });
    const project = getProject(id);
    if (!project) {
      throw new Error(`Project not found after update: ${id}`);
    }
    return project;
  } catch (error) {
    console.error('Error marking voice as selected:', error);
    throw new Error(
      `Failed to mark voice as selected: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update project total duration
 * @param id Project ID
 * @param totalDuration Total duration in seconds
 * @returns Updated project
 */
export function updateProjectDuration(id: string, totalDuration: number): Project {
  try {
    updateProject(id, { total_duration: totalDuration });
    const project = getProject(id);
    if (!project) {
      throw new Error(`Project not found after update: ${id}`);
    }
    return project;
  } catch (error) {
    console.error('Error updating project duration:', error);
    throw new Error(
      `Failed to update project duration: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
