/**
 * API Type Definitions
 *
 * Shared TypeScript interfaces for API requests and responses.
 * Used across frontend and backend for type safety.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

/**
 * Standard API Success Response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
  };
}

/**
 * Chat API Response - Story 1.4 + Story 1.7
 *
 * Success response from POST /api/chat endpoint.
 * Extended in Story 1.7 to include topic detection fields.
 */
export interface ChatResponse {
  messageId: string;
  response: string;
  timestamp: string;
  /**
   * NEW (Story 1.7): Indicates video creation intent detected
   * When true, extractedTopic will be present
   */
  topicDetected?: boolean;
  /**
   * NEW (Story 1.7): Extracted topic string from conversation
   * Only present when topicDetected is true
   */
  extractedTopic?: string;
}

/**
 * Chat API Request Body
 *
 * Request body for POST /api/chat endpoint.
 */
export interface ChatRequest {
  projectId: string;
  message: string;
}

/**
 * Project Update Request - Story 1.6 + Story 1.7
 *
 * Request body for PUT /api/projects/[id] endpoint.
 * All fields are optional - only provided fields will be updated.
 */
export interface ProjectUpdateRequest {
  /**
   * Updated project name
   * In Story 1.7, set to topic truncated to 50 chars on confirmation
   */
  name?: string;
  /**
   * Confirmed topic string
   * Set when user confirms topic in TopicConfirmation dialog
   */
  topic?: string;
  /**
   * Current workflow step
   * Advanced from 'topic' to 'voice' on topic confirmation
   */
  currentStep?: string;
}

/**
 * Project Data Model
 *
 * Project record structure from database.
 */
export interface Project {
  id: string;
  name: string;
  topic: string | null;
  currentStep: string;
  selectedVoice: string | null;
  scriptJson: string | null;
  systemPromptId: string | null;
  createdAt: string;
  lastActive: string;
  status?: string;
}

/**
 * Message Data Model
 *
 * Message record structure from conversation history.
 */
export interface Message {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}
