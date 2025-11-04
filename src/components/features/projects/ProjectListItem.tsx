/**
 * Project List Item Component
 *
 * Individual project item in the sidebar with:
 * - Project name display
 * - Relative timestamp (e.g., "2 hours ago")
 * - Click handler to switch projects
 * - Active state highlighting (indigo left border)
 * - Three-dot menu with delete option
 * - Delete confirmation dialog
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProjectStore, type Project } from '@/lib/stores/project-store';

interface ProjectListItemProps {
  project: Project;
  isActive: boolean;
}

/**
 * ProjectListItem component
 *
 * @param project - Project object to display
 * @param isActive - Whether this project is currently active
 *
 * @example
 * ```tsx
 * <ProjectListItem
 *   project={project}
 *   isActive={activeProjectId === project.id}
 * />
 * ```
 */
export function ProjectListItem({ project, isActive }: ProjectListItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { setActiveProject, removeProject, projects } = useProjectStore();
  const router = useRouter();

  /**
   * Handle project click - switch to this project
   */
  const handleClick = () => {
    if (isActive) return; // Already active, no action needed

    // Set as active project (updates store and last_active in DB)
    setActiveProject(project.id);

    // Navigate to project page
    router.push(`/projects/${project.id}`);
  };

  /**
   * Handle project deletion
   *
   * Flow:
   * 1. Delete project via API
   * 2. Remove from project store
   * 3. If deleted project was active, switch to most recent remaining project
   * 4. Close dialog
   */
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Delete project via API
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to delete project');
      }

      // Remove from project store
      removeProject(project.id);

      // If this was the active project, switch to most recent remaining project
      if (isActive && projects.length > 1) {
        // Find most recent project that isn't the one we just deleted
        const remainingProjects = projects.filter((p) => p.id !== project.id);
        if (remainingProjects.length > 0) {
          const mostRecent = remainingProjects[0]; // Already sorted by lastActive DESC
          setActiveProject(mostRecent.id);
          router.push(`/projects/${mostRecent.id}`);
        } else {
          // No projects left, navigate to home
          router.push('/');
        }
      }

      // Close dialog
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('[ProjectListItem] Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Format relative timestamp
   */
  const relativeTime = formatDistanceToNow(new Date(project.lastActive), {
    addSuffix: true,
  });

  return (
    <>
      <div
        className={`
          group relative flex items-center justify-between px-3 py-2.5
          cursor-pointer transition-colors
          hover:bg-slate-800
          ${isActive ? 'bg-slate-800 border-l-4 border-indigo-600' : ''}
        `}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`Project: ${project.name}`}
        aria-current={isActive ? 'page' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Project info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-100 line-clamp-2">
            {project.name}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{relativeTime}</div>
        </div>

        {/* Three-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 hover:bg-slate-700"
              onClick={(e) => e.stopPropagation()}
              aria-label="Project menu"
            >
              <MoreVertical className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteDialogOpen(true);
              }}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{project.name}&quot;? This
              will permanently delete all conversation history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// TODO: Add unit tests for ProjectListItem
// TODO: Add keyboard navigation (arrow keys to move between projects)
// TODO: Add project rename functionality (double-click or menu option)
// TODO: Add React.memo for performance optimization
