/**
 * Skeleton Component
 *
 * Shadcn/ui skeleton component for loading states
 * Used to show placeholder content while data is loading
 */

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Skeleton component for loading placeholders
 *
 * @param className - Additional CSS classes
 * @param props - Standard HTML div props
 * @returns Animated skeleton placeholder
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)}
      {...props}
    />
  );
}

export { Skeleton };
