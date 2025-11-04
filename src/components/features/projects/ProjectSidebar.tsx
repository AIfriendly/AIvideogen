/**
 * Project Sidebar Component
 *
 * Fixed 280px width sidebar displaying:
 * - New Chat button at top
 * - Scrollable list of all projects
 * - Active project highlighting
 * - Empty state when no projects
 *
 * Features:
 * - Fetches all projects on mount via GET /api/projects
 * - Stores projects in project-store
 * - Renders ProjectListItem for each project
 * - Responsive: hidden on mobile (<768px)
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import { NewChatButton } from './NewChatButton';
import { ProjectListItem } from './ProjectListItem';

/**
 * ProjectSidebar component
 *
 * @example
 * ```tsx
 * <ProjectSidebar />
 * ```
 */
export function ProjectSidebar() {
  const { projects, activeProjectId, loadProjects } = useProjectStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all projects on component mount
   */
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/projects');

        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !data.data?.projects) {
          throw new Error('Invalid response from API');
        }

        // Load projects into store
        loadProjects(data.data.projects);
      } catch (err) {
        console.error('[ProjectSidebar] Failed to fetch projects:', err);
        setError('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [loadProjects]);

  return (
    <aside
      className="
        hidden md:flex md:flex-col
        w-[280px] h-screen
        bg-slate-900 border-r border-slate-700
      "
      aria-label="Project sidebar"
    >
      {/* New Chat button - fixed at top */}
      <div className="p-4 border-b border-slate-700">
        <NewChatButton />
      </div>

      {/* Project list - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            Loading projects...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-400 text-sm">{error}</div>
        ) : projects.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            No projects yet.
            <br />
            Click &quot;New Chat&quot; to start.
          </div>
        ) : (
          <div className="py-2">
            {projects.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                isActive={activeProjectId === project.id}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

// TODO: Add unit tests for ProjectSidebar
// TODO: Add mobile drawer/sheet for project list on small screens
// TODO: Add project search/filter functionality
// TODO: Add virtualization for large project lists (react-window)
// TODO: Add loading skeleton instead of text
