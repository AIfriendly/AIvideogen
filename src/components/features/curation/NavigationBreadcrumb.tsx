'use client';

import { ChevronRight, Home, FileText, Mic, Film } from 'lucide-react';

interface NavigationBreadcrumbProps {
  projectId: string;
  projectName: string;
  currentStep: 'script' | 'voiceover' | 'visual-curation';
  onNavigate?: (href: string) => void;
}

export function NavigationBreadcrumb({
  projectId,
  projectName,
  currentStep,
  onNavigate
}: NavigationBreadcrumbProps) {
  const steps = [
    { id: 'project', label: 'Project', href: `/projects/${projectId}`, icon: Home },
    { id: 'script', label: 'Script', href: `/projects/${projectId}/script`, icon: FileText },
    { id: 'voiceover', label: 'Voiceover', href: `/projects/${projectId}/voiceover-preview`, icon: Mic },
    { id: 'visual-curation', label: 'Visual Curation', href: `/projects/${projectId}/visual-curation`, icon: Film },
  ];

  const handleClick = (e: React.MouseEvent, href: string) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(href);
    }
  };

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-500 dark:text-slate-400">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-1 text-slate-400" />
            )}
            {isCurrent ? (
              <span className="flex items-center gap-1 font-medium text-slate-900 dark:text-slate-100">
                <Icon className="w-4 h-4" />
                {step.label}
              </span>
            ) : (
              <a
                href={step.href}
                onClick={(e) => handleClick(e, step.href)}
                className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <Icon className="w-4 h-4" />
                {step.label}
              </a>
            )}
          </div>
        );
      })}
    </nav>
  );
}
