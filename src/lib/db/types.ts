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
