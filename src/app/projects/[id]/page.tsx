/**
 * Project Page - Individual Project/Chat View
 *
 * Dynamic route for viewing a specific project's conversation.
 * Route: /projects/[id]
 *
 * Features:
 * - Loads project by ID from route params
 * - Displays chat interface for that project
 * - Handles 404 if project doesn't exist
 * - Sets active project in project store
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/features/conversation';
import { useProjectStore } from '@/lib/stores/project-store';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { setActiveProject } = useProjectStore();

  const [isLoading, setIsLoading] = useState(true);
  const [projectExists, setProjectExists] = useState(false);

  useEffect(() => {
    const loadProject = async () => {
      try {
        // Verify project exists in database
        const response = await fetch(`/api/projects/${projectId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setProjectExists(false);
            setIsLoading(false);
            return;
          }
          throw new Error('Failed to load project');
        }

        const data = await response.json();

        if (data.success && data.data?.project) {
          setProjectExists(true);
          // Set as active project in store
          setActiveProject(projectId);
        } else {
          setProjectExists(false);
        }
      } catch (error) {
        console.error('[ProjectPage] Failed to load project:', error);
        setProjectExists(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId, setActiveProject]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading project...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  // 404 state
  if (!projectExists) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The project you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Main project view
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Video Generator</h1>
            <p className="text-sm text-muted-foreground">
              Describe your video idea and let's create something amazing
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}/settings`)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </header>

      {/* Chat Interface */}
      <main className="flex-1 max-w-5xl w-full mx-auto overflow-hidden">
        <ChatInterface projectId={projectId} />
      </main>

      {/* Footer */}
      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        Powered by Ollama + Llama 3.2
      </footer>
    </div>
  );
}
