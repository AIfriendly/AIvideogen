/**
 * Chat API Endpoint - Story 1.4
 *
 * Handles conversational interactions between user and AI assistant.
 *
 * @endpoint POST /api/chat
 *
 * @request_body
 * {
 *   "projectId": "uuid-string",
 *   "message": "User message text"
 * }
 *
 * @success_response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "messageId": "uuid-of-assistant-message",
 *     "response": "AI generated response text",
 *     "timestamp": "2025-11-03T10:30:00.000Z"
 *   }
 * }
 *
 * @error_response (4xx/5xx)
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Human-readable error description",
 *     "code": "ERROR_CODE"
 *   }
 * }
 *
 * @error_codes
 * - INVALID_PROJECT_ID (404): Project not found in database
 * - EMPTY_MESSAGE (400): User message is empty or whitespace-only
 * - OLLAMA_CONNECTION_ERROR (503): Unable to connect to Ollama service
 * - DATABASE_ERROR (500): Database operation failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from '@/lib/db/client';
import { initializeDatabase } from '@/lib/db/init';
import { createLLMProvider } from '@/lib/llm/factory';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/llm/prompts/default-system-prompt';
import { generateProjectName } from '@/lib/utils/generate-project-name';

// Initialize database on first import (idempotent - safe to call multiple times)
initializeDatabase();

/**
 * Request body structure for chat endpoint
 */
interface ChatRequest {
  projectId: string;
  message: string;
}

/**
 * Database message structure (snake_case from SQLite)
 */
interface DBMessage {
  id: string;
  project_id: string;
  role: string;
  content: string;
  timestamp: string;
}

/**
 * Success response structure
 */
interface ChatSuccessResponse {
  success: true;
  data: {
    messageId: string;
    response: string;
    timestamp: string;
  };
}

/**
 * Error response structure
 */
interface ChatErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
  };
}

type ChatResponse = ChatSuccessResponse | ChatErrorResponse;

/**
 * POST handler for chat endpoint
 *
 * Flow:
 * 1. Validate request body (projectId, message)
 * 2. Verify project exists in database
 * 3. Retrieve last 20 messages for conversation context
 * 4. Send messages to LLM provider with system prompt
 * 5. Persist both user and assistant messages in transaction
 * 6. Return assistant response with metadata
 *
 * @param request Next.js request object
 * @returns JSON response with chat result or error
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // STEP 1: Parse and Validate Request Body
    // ==========================================

    let body: ChatRequest;

    try {
      body = await request.json() as ChatRequest;
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid JSON in request body',
            code: 'INVALID_REQUEST'
          }
        } as ChatErrorResponse,
        { status: 400 }
      );
    }

    // Validate projectId exists and is non-empty
    if (!body.projectId || typeof body.projectId !== 'string' || body.projectId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid or missing project ID',
            code: 'INVALID_PROJECT_ID'
          }
        } as ChatErrorResponse,
        { status: 404 }
      );
    }

    const projectId = body.projectId.trim();

    // Validate message exists and is non-empty (trim whitespace)
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Message cannot be empty',
            code: 'EMPTY_MESSAGE'
          }
        } as ChatErrorResponse,
        { status: 400 }
      );
    }

    // ==========================================
    // STEP 2: Verify Project Exists (Auto-Create if Missing)
    // ==========================================

    let project: any;
    try {
      project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);

      // FIX: Auto-create project if it doesn't exist
      // This handles cases where frontend generates UUID but doesn't create project
      if (!project) {
        console.log(`Project ${projectId} not found. Auto-creating...`);

        // Create project with default name
        const createStmt = db.prepare(`
          INSERT INTO projects (id, name, current_step, status)
          VALUES (?, ?, ?, ?)
        `);

        createStmt.run(
          projectId,
          'New Project', // Default name
          'topic',       // Start at topic discovery step
          'draft'        // Initial status
        );

        // Verify creation
        project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);

        if (!project) {
          throw new Error('Failed to auto-create project');
        }

        console.log(`Project ${projectId} auto-created successfully`);
      }
    } catch (error) {
      console.error('Database error while verifying/creating project:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Database operation failed',
            code: 'DATABASE_ERROR'
          }
        } as ChatErrorResponse,
        { status: 500 }
      );
    }

    // ==========================================
    // STEP 3: Retrieve Conversation History
    // ==========================================

    let conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    try {
      // Get last 20 messages, ordered chronologically (oldest first)
      // Secondary sort by id to ensure consistent ordering for messages with same timestamp
      const dbMessages = db.prepare(`
        SELECT * FROM messages
        WHERE project_id = ?
        ORDER BY timestamp ASC, id ASC
        LIMIT 20
      `).all(projectId) as DBMessage[];

      // Transform database messages to LLM format
      conversationHistory = dbMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
    } catch (error) {
      console.error('Database error while retrieving conversation history:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Database operation failed',
            code: 'DATABASE_ERROR'
          }
        } as ChatErrorResponse,
        { status: 500 }
      );
    }

    // ==========================================
    // STEP 4: Get LLM Response
    // ==========================================

    let aiResponse: string;

    try {
      // Create LLM provider instance using factory
      const llmProvider = createLLMProvider();

      // Construct message array:
      // 1. System prompt (first)
      // 2. Conversation history (context)
      // 3. Current user message (last)
      const messages = [
        { role: 'system' as const, content: DEFAULT_SYSTEM_PROMPT },
        ...conversationHistory,
        { role: 'user' as const, content: message }
      ];

      // Call LLM provider's chat method
      aiResponse = await llmProvider.chat(messages);
    } catch (error) {
      console.error('LLM error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Unable to connect to Ollama service. Please ensure Ollama is running and accessible.',
            code: 'OLLAMA_CONNECTION_ERROR'
          }
        } as ChatErrorResponse,
        { status: 503 }
      );
    }

    // ==========================================
    // STEP 5: Persist Messages in Transaction
    // ==========================================

    // Generate UUIDs for both messages
    const userMessageId = randomUUID();
    const assistantMessageId = randomUUID();

    // Timestamp for user message (when received)
    const userTimestamp = new Date().toISOString();

    try {
      // Begin database transaction for atomic message persistence
      db.prepare('BEGIN').run();

      // Insert user message
      db.prepare(`
        INSERT INTO messages (id, project_id, role, content, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(userMessageId, projectId, 'user', message, userTimestamp);

      // Check if this is the first message for this project
      // If so, auto-generate project name from the message
      const messageCount = db.prepare(`
        SELECT COUNT(*) as count FROM messages WHERE project_id = ?
      `).get(projectId) as { count: number };

      if (messageCount.count === 1) {
        // This is the first message - generate project name
        const projectName = generateProjectName(message);

        // Update project name in database
        db.prepare(`
          UPDATE projects
          SET name = ?, last_active = ?
          WHERE id = ?
        `).run(projectName, userTimestamp, projectId);

        console.log(`[Chat API] Auto-generated project name: "${projectName}" for project ${projectId}`);
      }

      // Timestamp for assistant message (when generated)
      const assistantTimestamp = new Date().toISOString();

      // Insert assistant message
      db.prepare(`
        INSERT INTO messages (id, project_id, role, content, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(assistantMessageId, projectId, 'assistant', aiResponse, assistantTimestamp);

      // Commit transaction - both messages saved successfully
      db.prepare('COMMIT').run();

      // ==========================================
      // STEP 6: Return Success Response
      // ==========================================

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: assistantMessageId,
            response: aiResponse,
            timestamp: assistantTimestamp
          }
        } as ChatSuccessResponse,
        { status: 200 }
      );

    } catch (error) {
      // Rollback transaction on any database error
      try {
        db.prepare('ROLLBACK').run();
      } catch (rollbackError) {
        console.error('Error during transaction rollback:', rollbackError);
      }

      console.error('Database error while persisting messages:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Database operation failed',
            code: 'DATABASE_ERROR'
          }
        } as ChatErrorResponse,
        { status: 500 }
      );
    }

  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error in chat endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR'
        }
      } as ChatErrorResponse,
      { status: 500 }
    );
  }
}
