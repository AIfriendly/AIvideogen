/**
 * New Chat Button Component
 *
 * Button to create a new project/conversation.
 * Located at the top of the ProjectSidebar.
 *
 * Features:
 * - Creates new project via POST /api/projects
 * - Sets new project as active in project-store
 * - Clears conversation history
 * - Navigates to new project
 * - Shows loading state during creation
 * - Handles errors with console logging
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/lib/stores/project-store';
import { useRouter } from 'next/navigation';

/**
 * NewChatButton component
 *
 * @example
 * ```tsx
 * <NewChatButton />
 * ```
 */
export function NewChatButton() {
  const [isCreating, setIsCreating] = useState(false);
  const { addProject } = useProjectStore();
  const router = useRouter();

  /**
   * Handle new chat button click
   *
   * Flow:
   * 1. Show loading state
   * 2. Create new project via API
   * 3. Add project to store (sets as active)
   * 4. Navigate to new project
   * 5. Focus chat input (handled by navigation)
   */
  const handleNewChat = async () => {
    if (isCreating) return;

    setIsCreating(true);

    try {
      // Create new project via API
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Project' }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.data?.project) {
        throw new Error('Invalid response from API');
      }

      const newProject = data.data.project;

      // Add to project store (sets as active and adds to list)
      addProject(newProject);

      // Navigate to new project page
      // Note: Conversation will be empty for new project
      router.push(`/projects/${newProject.id}`);
    } catch (error) {
      console.error('[NewChatButton] Failed to create project:', error);
      // TODO: Show toast notification for error
      alert('Failed to create new project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleNewChat}
      disabled={isCreating}
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
      aria-label="Create new chat"
    >
      {isCreating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          New Chat
        </>
      )}
    </Button>
  );
}

// TODO: Add unit tests for NewChatButton
// TODO: Add error toast notifications using shadcn/ui Toast component
// TODO: Add keyboard shortcut (Ctrl/Cmd + N) for new chat
