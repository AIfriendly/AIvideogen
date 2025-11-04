/**
 * Project Store - Zustand State Management
 *
 * Manages project list and active project state with localStorage persistence.
 * Provides actions for CRUD operations on projects.
 *
 * Only activeProjectId is persisted to localStorage.
 * Full project list is fetched from database on app load.
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Project interface
 */
export interface Project {
  id: string;
  name: string;
  topic: string | null;
  currentStep: string;
  lastActive: string; // ISO 8601 timestamp
  createdAt: string; // ISO 8601 timestamp
}

/**
 * Project state interface
 */
interface ProjectState {
  // State
  activeProjectId: string | null;
  projects: Project[];

  // Actions
  setActiveProject: (id: string) => void;
  loadProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
}

/**
 * Project store with localStorage persistence
 *
 * Usage:
 * ```typescript
 * const { activeProjectId, projects, setActiveProject } = useProjectStore();
 * ```
 */
export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      // Initial state
      activeProjectId: null,
      projects: [],

      /**
       * Set active project and update last_active timestamp via API
       *
       * @param id - Project UUID to set as active
       */
      setActiveProject: (id) => {
        set({ activeProjectId: id });

        // Update last_active timestamp in database
        // Fire-and-forget API call (no await needed)
        fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Only updating last_active, backend auto-updates it
          }),
        }).catch((error) => {
          console.error('[Project Store] Failed to update last_active:', error);
        });
      },

      /**
       * Load projects into store (typically from API on app initialization)
       *
       * @param projects - Array of projects to load
       */
      loadProjects: (projects) => {
        set({ projects });
      },

      /**
       * Add a new project to the beginning of the list and set as active
       *
       * @param project - Project object to add
       */
      addProject: (project) => {
        set((state) => ({
          projects: [project, ...state.projects],
          activeProjectId: project.id,
        }));
      },

      /**
       * Update an existing project in the list
       *
       * @param id - Project UUID to update
       * @param updates - Partial project object with fields to update
       */
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      /**
       * Remove a project from the list
       * If the removed project was active, clear activeProjectId
       *
       * @param id - Project UUID to remove
       */
      removeProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }));
      },
    }),
    {
      name: 'bmad-project-storage', // localStorage key
      version: 1,
      // Only persist activeProjectId (not full projects array)
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
      }),
    }
  )
);

// TODO: Add unit tests for all store actions
// TODO: Test localStorage persistence behavior
// TODO: Test partialize only persists activeProjectId
