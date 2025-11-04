/**
 * Critical Tests: State Persistence & Project Isolation
 * Test IDs: 1.5-INT-002, 1.5-E2E-003
 *
 * CRITICAL: Ensures different projects maintain separate conversation state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createConversationStore } from '@/lib/stores/conversation-store';

describe('1.5-INT-002: State Persistence with Per-Project Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create separate stores for different projectIds', () => {
    const store1 = createConversationStore('project-1');
    const store2 = createConversationStore('project-2');

    const { result: hook1 } = renderHook(() => store1());
    const { result: hook2 } = renderHook(() => store2());

    // Add message to store1
    act(() => {
      hook1.current.addMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Message in project 1',
        timestamp: new Date().toISOString(),
      });
    });

    // Store1 should have 1 message
    expect(hook1.current.messages).toHaveLength(1);
    expect(hook1.current.messages[0].content).toBe('Message in project 1');

    // Store2 should still be empty (isolation)
    expect(hook2.current.messages).toHaveLength(0);
  });

  it('should persist messages to localStorage with projectId key', () => {
    const projectId = 'project-123';
    const store = createConversationStore(projectId);
    const { result } = renderHook(() => store());

    // Add message
    act(() => {
      result.current.addMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date().toISOString(),
      });
    });

    // Check localStorage has correct key
    const storageKey = `bmad-conversation-state-${projectId}`;
    const stored = localStorage.getItem(storageKey);

    expect(stored).not.toBeNull();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.messages).toHaveLength(1);
      expect(parsed.state.messages[0].content).toBe('Test message');
    }
  });

  it('should rehydrate messages from localStorage on store creation', () => {
    const projectId = 'project-456';
    const storageKey = `bmad-conversation-state-${projectId}`;

    // Pre-populate localStorage
    const initialState = {
      state: {
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Persisted message',
            timestamp: '2025-01-01T00:00:00.000Z',
          },
        ],
        isLoading: false,
        error: null,
      },
      version: 1,
    };

    localStorage.setItem(storageKey, JSON.stringify(initialState));

    // Create store (should rehydrate)
    const store = createConversationStore(projectId);
    const { result } = renderHook(() => store());

    // Should have rehydrated message
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Persisted message');
  });
});

describe('1.5-E2E-003: Multiple Projects Don\'t Mix Conversations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should maintain separate conversation histories for different projects', () => {
    // Create two stores for different projects
    const cookingStore = createConversationStore('cooking-video-project');
    const gamingStore = createConversationStore('gaming-video-project');

    const { result: cookingHook } = renderHook(() => cookingStore());
    const { result: gamingHook } = renderHook(() => gamingStore());

    // Add messages to cooking project
    act(() => {
      cookingHook.current.addMessage({
        id: 'cook-msg-1',
        role: 'user',
        content: 'I want to make a pasta recipe video',
        timestamp: new Date().toISOString(),
      });
      cookingHook.current.addMessage({
        id: 'cook-msg-2',
        role: 'assistant',
        content: 'Great! What type of pasta?',
        timestamp: new Date().toISOString(),
      });
    });

    // Add messages to gaming project
    act(() => {
      gamingHook.current.addMessage({
        id: 'game-msg-1',
        role: 'user',
        content: 'I want to make a Minecraft tutorial',
        timestamp: new Date().toISOString(),
      });
      gamingHook.current.addMessage({
        id: 'game-msg-2',
        role: 'assistant',
        content: 'Cool! What will you teach?',
        timestamp: new Date().toISOString(),
      });
    });

    // Verify cooking project has ONLY cooking messages
    expect(cookingHook.current.messages).toHaveLength(2);
    expect(cookingHook.current.messages[0].content).toContain('pasta');
    expect(cookingHook.current.messages[1].content).toContain('pasta');

    // Verify gaming project has ONLY gaming messages
    expect(gamingHook.current.messages).toHaveLength(2);
    expect(gamingHook.current.messages[0].content).toContain('Minecraft');
    expect(gamingHook.current.messages[1].content).toContain('teach');

    // Verify no cross-contamination
    const cookingContent = cookingHook.current.messages
      .map((m) => m.content)
      .join(' ');
    const gamingContent = gamingHook.current.messages
      .map((m) => m.content)
      .join(' ');

    expect(cookingContent).not.toContain('Minecraft');
    expect(cookingContent).not.toContain('tutorial');
    expect(gamingContent).not.toContain('pasta');
    expect(gamingContent).not.toContain('recipe');
  });

  it('should persist multiple projects separately in localStorage', () => {
    const project1 = createConversationStore('project-1');
    const project2 = createConversationStore('project-2');

    const { result: hook1 } = renderHook(() => project1());
    const { result: hook2 } = renderHook(() => project2());

    // Add different messages to each
    act(() => {
      hook1.current.addMessage({
        id: 'p1-msg',
        role: 'user',
        content: 'Project 1 message',
        timestamp: new Date().toISOString(),
      });

      hook2.current.addMessage({
        id: 'p2-msg',
        role: 'user',
        content: 'Project 2 message',
        timestamp: new Date().toISOString(),
      });
    });

    // Check localStorage has separate keys
    const key1 = 'bmad-conversation-state-project-1';
    const key2 = 'bmad-conversation-state-project-2';

    const stored1 = localStorage.getItem(key1);
    const stored2 = localStorage.getItem(key2);

    expect(stored1).not.toBeNull();
    expect(stored2).not.toBeNull();

    if (stored1 && stored2) {
      const data1 = JSON.parse(stored1);
      const data2 = JSON.parse(stored2);

      expect(data1.state.messages[0].content).toBe('Project 1 message');
      expect(data2.state.messages[0].content).toBe('Project 2 message');

      // Ensure they're different
      expect(data1.state.messages[0].content).not.toBe(
        data2.state.messages[0].content
      );
    }
  });

  it('should load correct project when switching between projects', () => {
    // Simulate user working on project 1
    const store1 = createConversationStore('project-1');
    const { result: hook1 } = renderHook(() => store1());

    act(() => {
      hook1.current.addMessage({
        id: 'msg-1',
        role: 'user',
        content: 'First project content',
        timestamp: new Date().toISOString(),
      });
    });

    // User switches to project 2
    const store2 = createConversationStore('project-2');
    const { result: hook2 } = renderHook(() => store2());

    act(() => {
      hook2.current.addMessage({
        id: 'msg-2',
        role: 'user',
        content: 'Second project content',
        timestamp: new Date().toISOString(),
      });
    });

    // User switches BACK to project 1
    const store1Again = createConversationStore('project-1');
    const { result: hook1Again } = renderHook(() => store1Again());

    // Should load project 1's messages (not project 2's)
    expect(hook1Again.current.messages).toHaveLength(1);
    expect(hook1Again.current.messages[0].content).toBe('First project content');

    // Verify project 2 still has its own messages
    expect(hook2.current.messages).toHaveLength(1);
    expect(hook2.current.messages[0].content).toBe('Second project content');
  });
});
