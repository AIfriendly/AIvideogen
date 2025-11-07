/**
 * Utility function for merging Tailwind CSS classes
 *
 * Combines clsx for conditional classes with tailwind-merge for
 * handling Tailwind class conflicts (e.g., px-2 and px-4)
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper conflict resolution
 *
 * @param inputs - Class names to merge
 * @returns Merged class string
 *
 * @example
 * ```typescript
 * cn('px-2 py-1', 'px-4')  // => 'py-1 px-4'
 * cn('text-red-500', condition && 'text-blue-500')  // conditional classes
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
