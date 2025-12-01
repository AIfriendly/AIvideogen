/**
 * RAG Script Generator
 *
 * Builds RAG-augmented prompts by formatting and injecting context from
 * the user's channel, competitor channels, and news sources into script generation.
 *
 * Story 6.6 - RAG-Augmented Script Generation
 */

import type { RAGContext, RetrievedDocument } from '../types';
import {
  RAG_CONTEXT_HEADER,
  CHANNEL_STYLE_SECTION,
  COMPETITOR_SECTION,
  NEWS_SECTION,
  TRENDS_SECTION,
  RAG_CONTEXT_FOOTER,
  ESTABLISHED_CHANNEL_INSTRUCTION,
  COLD_START_INSTRUCTION,
  NEWS_INTEGRATION_INSTRUCTION,
  EMPTY_CONTEXT_MESSAGE
} from './rag-prompt-templates';

/**
 * RAG context usage statistics returned with generation
 */
export interface RAGContextUsage {
  channelVideos: number;
  competitorVideos: number;
  newsArticles: number;
  trendingTopics: number;
  totalDocuments: number;
  retrievalTimeMs: number;
}

/**
 * Format channel content documents for prompt injection
 *
 * Extracts video title, key points from content, and date
 */
export function formatChannelContent(docs: RetrievedDocument[]): string {
  if (!docs || docs.length === 0) {
    return '';
  }

  const formatted = docs.map((doc, index) => {
    const title = doc.metadata?.title || `Video ${index + 1}`;
    const publishedAt = doc.metadata?.published_at || doc.metadata?.publishedAt;
    const dateStr = publishedAt ? formatRelativeDate(publishedAt as string) : 'Unknown date';

    // Extract first 500 chars as key points (content is already truncated in retrieval)
    const keyPoints = truncateText(doc.content, 500);

    return `Video: "${title}" (${dateStr})
Key points: ${keyPoints}`;
  });

  return formatted.join('\n\n');
}

/**
 * Format competitor content documents for prompt injection
 *
 * Similar to channel content but emphasizes competitive analysis
 */
export function formatCompetitorContent(docs: RetrievedDocument[]): string {
  if (!docs || docs.length === 0) {
    return '';
  }

  const formatted = docs.map((doc, index) => {
    const title = doc.metadata?.title || `Competitor Video ${index + 1}`;
    const channelName = doc.metadata?.channel_name || doc.metadata?.channelName || 'Unknown Channel';
    const publishedAt = doc.metadata?.published_at || doc.metadata?.publishedAt;
    const dateStr = publishedAt ? formatRelativeDate(publishedAt as string) : 'Unknown date';

    // Extract first 400 chars (slightly less than own channel to prioritize user's style)
    const keyPoints = truncateText(doc.content, 400);

    return `[${channelName}] "${title}" (${dateStr})
Approach: ${keyPoints}`;
  });

  return formatted.join('\n\n');
}

/**
 * Format news articles for prompt injection
 *
 * Emphasizes headline, date, and summary for timeliness
 */
export function formatNewsContent(docs: RetrievedDocument[]): string {
  if (!docs || docs.length === 0) {
    return '';
  }

  const formatted = docs.map(doc => {
    const headline = doc.metadata?.headline || doc.content.slice(0, 100);
    const source = doc.metadata?.source_name || doc.metadata?.sourceName || 'News';
    const publishedAt = doc.metadata?.published_at || doc.metadata?.publishedAt;
    const dateStr = publishedAt ? formatShortDate(publishedAt as string) : '';
    const summary = doc.metadata?.summary || truncateText(doc.content, 300);

    return `[${dateStr}] "${headline}" - ${source}
Summary: ${summary}`;
  });

  return formatted.join('\n\n');
}

/**
 * Format trending topics for prompt injection
 */
export function formatTrendingTopics(docs: RetrievedDocument[]): string {
  if (!docs || docs.length === 0) {
    return '';
  }

  const formatted = docs.map(doc => {
    const topic = doc.metadata?.topic || truncateText(doc.content, 100);
    const trendScore = doc.metadata?.trend_score || '';
    const scoreStr = trendScore ? ` (trending: ${trendScore})` : '';

    return `- ${topic}${scoreStr}`;
  });

  return formatted.join('\n');
}

/**
 * Build the complete RAG-augmented prompt
 *
 * Combines all context sources into a structured prompt section that can be
 * prepended to the standard script generation prompt.
 *
 * @param ragContext - Retrieved RAG context from context-builder
 * @param mode - 'established' or 'cold_start' - determines emphasis
 * @returns Formatted RAG context string to inject into prompt
 */
export function buildRAGPrompt(
  ragContext: RAGContext,
  mode: 'established' | 'cold_start' = 'established'
): string {
  const sections: string[] = [];

  // Check if we have any context at all
  const totalDocs =
    ragContext.channelContent.length +
    ragContext.competitorContent.length +
    ragContext.newsArticles.length +
    ragContext.trendingTopics.length;

  if (totalDocs === 0) {
    return EMPTY_CONTEXT_MESSAGE;
  }

  // Start with header
  sections.push(RAG_CONTEXT_HEADER);

  // Add channel content (established mode)
  if (ragContext.channelContent.length > 0) {
    sections.push(CHANNEL_STYLE_SECTION);
    sections.push(formatChannelContent(ragContext.channelContent));
    sections.push('');
  }

  // Add competitor content
  if (ragContext.competitorContent.length > 0) {
    sections.push(COMPETITOR_SECTION);
    sections.push(formatCompetitorContent(ragContext.competitorContent));
    sections.push('');
  }

  // Add news
  if (ragContext.newsArticles.length > 0) {
    sections.push(NEWS_SECTION);
    sections.push(formatNewsContent(ragContext.newsArticles));
    sections.push('');
    sections.push(NEWS_INTEGRATION_INSTRUCTION);
    sections.push('');
  }

  // Add trending topics
  if (ragContext.trendingTopics.length > 0) {
    sections.push(TRENDS_SECTION);
    sections.push(formatTrendingTopics(ragContext.trendingTopics));
    sections.push('');
  }

  // Add mode-specific instruction
  if (mode === 'established' && ragContext.channelContent.length > 0) {
    sections.push(ESTABLISHED_CHANNEL_INSTRUCTION);
  } else if (mode === 'cold_start' || ragContext.competitorContent.length > 0) {
    sections.push(COLD_START_INSTRUCTION);
  }

  // Add footer
  sections.push(RAG_CONTEXT_FOOTER);

  return sections.join('\n');
}

/**
 * Calculate RAG context usage statistics
 */
export function getRAGContextUsage(ragContext: RAGContext, retrievalTimeMs: number): RAGContextUsage {
  return {
    channelVideos: ragContext.channelContent.length,
    competitorVideos: ragContext.competitorContent.length,
    newsArticles: ragContext.newsArticles.length,
    trendingTopics: ragContext.trendingTopics.length,
    totalDocuments:
      ragContext.channelContent.length +
      ragContext.competitorContent.length +
      ragContext.newsArticles.length +
      ragContext.trendingTopics.length,
    retrievalTimeMs
  };
}

/**
 * Generate a human-readable RAG context message for the UI
 *
 * @returns Message like "Using context from 5 videos, 3 news articles..."
 */
export function getRAGContextMessage(usage: RAGContextUsage): string {
  if (usage.totalDocuments === 0) {
    return 'No additional context available';
  }

  const parts: string[] = [];

  const videoCount = usage.channelVideos + usage.competitorVideos;
  if (videoCount > 0) {
    parts.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
  }

  if (usage.newsArticles > 0) {
    parts.push(`${usage.newsArticles} news article${usage.newsArticles > 1 ? 's' : ''}`);
  }

  if (usage.trendingTopics > 0) {
    parts.push(`${usage.trendingTopics} trending topic${usage.trendingTopics > 1 ? 's' : ''}`);
  }

  return `Using context from ${parts.join(', ')}`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncate text to a maximum length, ending at word boundary
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Format a date as relative time (e.g., "2 weeks ago")
 */
function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return '1 month ago';
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
  } catch {
    return 'Unknown date';
  }
}

/**
 * Format a date as short format (e.g., "Nov 28, 2025")
 */
function formatShortDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}
