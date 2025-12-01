/**
 * Token Counter & Context Truncation
 *
 * Manages token counting and context truncation for RAG.
 * Story 6.5 - RAG Retrieval & Context Building
 */

import type { RAGContext, RetrievedDocument } from '../types';

/**
 * Default maximum tokens for RAG context
 */
export const DEFAULT_MAX_TOKENS = 4000;

/**
 * Approximate token count for a text string
 * Simple approximation: 1 token ≈ 4 characters
 * For production accuracy, consider tiktoken library
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens for a single document
 */
export function countDocumentTokens(doc: RetrievedDocument): number {
  let total = countTokens(doc.content);

  // Add metadata tokens (approximate)
  const metadataStr = JSON.stringify(doc.metadata);
  total += countTokens(metadataStr);

  return total;
}

/**
 * Count tokens for an array of documents
 */
export function countDocumentsTokens(docs: RetrievedDocument[]): number {
  return docs.reduce((total, doc) => total + countDocumentTokens(doc), 0);
}

/**
 * Count total tokens in a RAGContext
 */
export function countRAGContextTokens(context: RAGContext): number {
  let total = 0;

  total += countDocumentsTokens(context.channelContent);
  total += countDocumentsTokens(context.competitorContent);
  total += countDocumentsTokens(context.newsArticles);
  total += countDocumentsTokens(context.trendingTopics);

  return total;
}

/**
 * Truncation priority weights
 * Higher weight = lower priority for removal (keeps more of this content)
 */
interface TruncationPriority {
  channelContent: number;
  competitorContent: number;
  newsArticles: number;
  trendingTopics: number;
}

const DEFAULT_PRIORITY: TruncationPriority = {
  channelContent: 4,      // Highest priority - user's own content
  competitorContent: 3,   // Second priority - competitive insights
  newsArticles: 2,        // Third priority - current events
  trendingTopics: 1       // Lowest priority - general trends
};

/**
 * Truncate documents array to fit within token budget
 * Removes lowest-scored documents first
 */
function truncateDocuments(
  docs: RetrievedDocument[],
  maxTokens: number
): RetrievedDocument[] {
  if (docs.length === 0) return [];

  // Sort by score descending (keep highest scores)
  const sorted = [...docs].sort((a, b) => b.score - a.score);

  const result: RetrievedDocument[] = [];
  let currentTokens = 0;

  for (const doc of sorted) {
    const docTokens = countDocumentTokens(doc);

    if (currentTokens + docTokens <= maxTokens) {
      result.push(doc);
      currentTokens += docTokens;
    } else {
      // No room for more documents
      break;
    }
  }

  return result;
}

/**
 * Allocate token budget across context categories
 */
function allocateBudget(
  context: RAGContext,
  maxTokens: number,
  priority: TruncationPriority
): { channelContent: number; competitorContent: number; newsArticles: number; trendingTopics: number } {
  // Calculate total priority weight
  const totalWeight = priority.channelContent + priority.competitorContent +
    priority.newsArticles + priority.trendingTopics;

  // Count current tokens per category
  const currentTokens = {
    channelContent: countDocumentsTokens(context.channelContent),
    competitorContent: countDocumentsTokens(context.competitorContent),
    newsArticles: countDocumentsTokens(context.newsArticles),
    trendingTopics: countDocumentsTokens(context.trendingTopics)
  };

  // Calculate proportional budget based on priority
  const budget = {
    channelContent: Math.floor((priority.channelContent / totalWeight) * maxTokens),
    competitorContent: Math.floor((priority.competitorContent / totalWeight) * maxTokens),
    newsArticles: Math.floor((priority.newsArticles / totalWeight) * maxTokens),
    trendingTopics: Math.floor((priority.trendingTopics / totalWeight) * maxTokens)
  };

  // Redistribute unused budget to categories that need more
  let unusedBudget = 0;
  for (const key of Object.keys(budget) as (keyof typeof budget)[]) {
    if (currentTokens[key] < budget[key]) {
      unusedBudget += budget[key] - currentTokens[key];
      budget[key] = currentTokens[key];
    }
  }

  // Redistribute unused to categories over budget, proportionally
  if (unusedBudget > 0) {
    const overBudget: (keyof typeof budget)[] = [];
    for (const key of Object.keys(budget) as (keyof typeof budget)[]) {
      if (currentTokens[key] > budget[key]) {
        overBudget.push(key);
      }
    }

    if (overBudget.length > 0) {
      const extraPerCategory = Math.floor(unusedBudget / overBudget.length);
      for (const key of overBudget) {
        budget[key] += extraPerCategory;
      }
    }
  }

  return budget;
}

/**
 * Truncate RAGContext to fit within token limit
 *
 * Strategy:
 * 1. Allocate token budget across categories based on priority
 * 2. Within each category, keep highest-scored documents
 * 3. Never cut documents mid-content (remove whole entries)
 *
 * @param context - The RAGContext to truncate
 * @param maxTokens - Maximum total tokens (default: 4000)
 * @param priority - Optional custom priority weights
 * @returns Truncated RAGContext
 */
export function truncateRAGContext(
  context: RAGContext,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  priority: TruncationPriority = DEFAULT_PRIORITY
): RAGContext {
  const currentTotal = countRAGContextTokens(context);

  // If already under budget, return as-is
  if (currentTotal <= maxTokens) {
    return context;
  }

  // Allocate budget
  const budget = allocateBudget(context, maxTokens, priority);

  // Truncate each category
  return {
    channelContent: truncateDocuments(context.channelContent, budget.channelContent),
    competitorContent: truncateDocuments(context.competitorContent, budget.competitorContent),
    newsArticles: truncateDocuments(context.newsArticles, budget.newsArticles),
    trendingTopics: truncateDocuments(context.trendingTopics, budget.trendingTopics)
  };
}

/**
 * Format RAGContext as a string for LLM prompt injection
 */
export function formatRAGContextForPrompt(context: RAGContext): string {
  const sections: string[] = [];

  if (context.channelContent.length > 0) {
    sections.push('## Your Channel Content\n' +
      context.channelContent.map(d => d.content).join('\n\n'));
  }

  if (context.competitorContent.length > 0) {
    sections.push('## Competitor Content\n' +
      context.competitorContent.map(d => d.content).join('\n\n'));
  }

  if (context.newsArticles.length > 0) {
    sections.push('## Recent News\n' +
      context.newsArticles.map(d => {
        const headline = d.metadata['headline'] || 'News Article';
        return `**${headline}**\n${d.content}`;
      }).join('\n\n'));
  }

  if (context.trendingTopics.length > 0) {
    sections.push('## Trending Topics\n' +
      context.trendingTopics.map(d => d.content).join('\n\n'));
  }

  return sections.join('\n\n---\n\n');
}
