/**
 * Home Page - AI Video Generator
 *
 * Main entry point that renders the chat interface for topic discovery.
 * Creates a default project for the conversation.
 * Story 1.8: Added persona selection flow for new projects.
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChatInterface } from '@/components/features/conversation';
import { PersonaSelector } from '@/components/features/persona';

type ViewState = 'loading' | 'persona-selection' | 'chat';

export default function Home() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [selectedPersonaName, setSelectedPersonaName] = useState<string | null>(null);

  // Check if project has a persona selected
  const checkProjectPersona = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Try to fetch project data to see if persona is already selected
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.project?.system_prompt_id) {
          // Persona already selected
          return true;
        }
      }
      return false;
    } catch {
      // If project doesn't exist yet, no persona selected
      return false;
    }
  }, []);

  useEffect(() => {
    async function initializeProject() {
      // Get or create project ID from localStorage
      const storedProjectId = localStorage.getItem('current-project-id');
      const isNewProject = localStorage.getItem('is-new-project');

      if (storedProjectId) {
        setProjectId(storedProjectId);

        // Check if this is a new project that needs persona selection
        if (isNewProject === 'true') {
          localStorage.removeItem('is-new-project');
          setViewState('persona-selection');
        } else {
          // Check if project already has persona
          const hasPersona = await checkProjectPersona(storedProjectId);
          if (hasPersona) {
            setViewState('chat');
          } else {
            // Existing project without persona - show selection
            setViewState('persona-selection');
          }
        }
      } else {
        // Generate new project ID
        const newProjectId = crypto.randomUUID();
        localStorage.setItem('current-project-id', newProjectId);
        localStorage.setItem('is-new-project', 'true');
        setProjectId(newProjectId);
        setViewState('persona-selection');
      }
    }

    initializeProject();
  }, [checkProjectPersona]);

  const handlePersonaSelect = async (personaId: string) => {
    // Fetch persona name for display
    try {
      const res = await fetch('/api/system-prompts');
      if (res.ok) {
        const data = await res.json();
        const persona = data.prompts.find((p: { id: string; name: string }) => p.id === personaId);
        if (persona) {
          setSelectedPersonaName(persona.name);
        }
      }
    } catch {
      // Ignore - persona name is optional
    }

    setViewState('chat');
  };

  const handleNewChat = () => {
    // Clear current project and start fresh
    const newProjectId = crypto.randomUUID();
    localStorage.setItem('current-project-id', newProjectId);
    localStorage.setItem('is-new-project', 'true');
    setProjectId(newProjectId);
    setSelectedPersonaName(null);
    setViewState('persona-selection');
  };

  if (viewState === 'loading' || !projectId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">AI Video Generator</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (viewState === 'persona-selection') {
    return (
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="border-b p-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold">AI Video Generator</h1>
            <p className="text-sm text-muted-foreground">
              Choose how your AI assistant should communicate
            </p>
          </div>
        </header>

        {/* Persona Selection */}
        <main className="flex-1 overflow-auto">
          <PersonaSelector
            projectId={projectId}
            onSelect={handlePersonaSelect}
          />
        </main>

        {/* Footer */}
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
          Powered by Artificial Intelligence
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Video Generator</h1>
            <p className="text-sm text-muted-foreground">
              Describe your video idea and let's create something amazing
              {selectedPersonaName && (
                <span className="ml-2 px-2 py-0.5 bg-secondary rounded text-xs">
                  {selectedPersonaName}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleNewChat}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            + New Chat
          </button>
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
