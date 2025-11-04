/**
 * Home Page - AI Video Generator
 *
 * Main entry point that renders the chat interface for topic discovery.
 * Creates a default project for the conversation.
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/features/conversation';

export default function Home() {
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Get or create project ID from localStorage
    const storedProjectId = localStorage.getItem('current-project-id');

    if (storedProjectId) {
      setProjectId(storedProjectId);
    } else {
      // Generate new project ID
      const newProjectId = crypto.randomUUID();
      localStorage.setItem('current-project-id', newProjectId);
      setProjectId(newProjectId);
    }
  }, []);

  if (!projectId) {
    // Loading state while getting project ID
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">AI Video Generator</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b p-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold">AI Video Generator</h1>
          <p className="text-sm text-muted-foreground">
            Describe your video idea and let's create something amazing
          </p>
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
