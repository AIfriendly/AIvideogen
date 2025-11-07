/**
 * Database Type Definitions
 *
 * TypeScript interfaces for database entities matching the SQLite schema.
 */

/**
 * Project entity from projects table
 */
export interface Project {
  id: string;
  name: string;
  topic: string | null;
  currentStep: string;  // Maps to current_step column (camelCase for TypeScript)
  lastActive: string;    // Maps to last_active column (ISO 8601 timestamp)
  createdAt: string;     // Maps to created_at column (ISO 8601 timestamp)
}

/**
 * Message entity from messages table
 */
export interface Message {
  id: string;
  projectId: string;     // Maps to project_id column
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;     // ISO 8601 timestamp
}

/**
 * Raw database row types (snake_case as they come from SQLite)
 */
export interface ProjectRow {
  id: string;
  name: string;
  topic: string | null;
  current_step: string;
  last_active: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * Helper function to convert ProjectRow (snake_case) to Project (camelCase)
 */
export function projectRowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    topic: row.topic,
    currentStep: row.current_step,
    lastActive: row.last_active,
    createdAt: row.created_at,
  };
}

/**
 * Helper function to convert MessageRow (snake_case) to Message (camelCase)
 */
export function messageRowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    projectId: row.project_id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
  };
}

/**
 * Scene entity from scenes table
 * Stores individual script segments with their associated audio files
 */
export interface Scene {
  id: string;
  projectId: string;        // Maps to project_id column
  sceneNumber: number;      // Maps to scene_number column
  text: string;
  sanitizedText: string | null;  // Maps to sanitized_text column
  audioFilePath: string | null;  // Maps to audio_file_path column
  duration: number | null;
  createdAt: string;        // Maps to created_at column (ISO 8601 timestamp)
  updatedAt: string;        // Maps to updated_at column (ISO 8601 timestamp)
}

/**
 * Raw database row for scenes table (snake_case)
 */
export interface SceneRow {
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
 * Data for inserting a new scene
 */
export interface SceneInsert {
  id?: string;  // Auto-generated if not provided
  projectId: string;
  sceneNumber: number;
  text: string;
  sanitizedText?: string | null;
  audioFilePath?: string | null;
  duration?: number | null;
}

/**
 * Data for updating an existing scene
 */
export interface SceneUpdate {
  text?: string;
  sanitizedText?: string | null;
  audioFilePath?: string | null;
  duration?: number | null;
  updatedAt?: string;
}

/**
 * Helper function to convert SceneRow (snake_case) to Scene (camelCase)
 */
export function sceneRowToScene(row: SceneRow): Scene {
  return {
    id: row.id,
    projectId: row.project_id,
    sceneNumber: row.scene_number,
    text: row.text,
    sanitizedText: row.sanitized_text,
    audioFilePath: row.audio_file_path,
    duration: row.duration,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
