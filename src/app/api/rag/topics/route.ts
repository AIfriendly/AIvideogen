/**
 * RAG Topic Suggestions API Endpoint
 *
 * Generate AI-powered topic suggestions based on RAG context.
 *
 * POST /api/rag/topics
 *
 * Story 6.7 - Channel Intelligence UI & Setup Wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserChannel, getCompetitorChannels, getChannelVideos, getAllChannels } from '@/lib/db/queries-channels';
import { getNewsArticlesByNiche } from '@/lib/db/queries-news';
import { isRAGInitialized, initializeRAG } from '@/lib/rag/init';
import { isRAGEnabled } from '@/lib/rag/vector-db/chroma-client';
import { createLLMProvider } from '@/lib/llm/factory';

/**
 * POST /api/rag/topics
 *
 * Generate topic suggestions based on RAG analysis.
 *
 * Body:
 * - niche?: string (optional niche filter)
 * - count?: number (number of suggestions, default: 5)
 * - projectId?: string (optional project for context)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche, count = 5, projectId } = body;

    // Check if RAG is available
    if (!isRAGEnabled()) {
      // Fallback: generate generic suggestions based on niche
      return await generateFallbackTopics(niche, count);
    }

    // Initialize RAG if needed
    if (!isRAGInitialized()) {
      try {
        await initializeRAG();
      } catch (error) {
        console.error('[RAG Topics] Failed to initialize RAG:', error);
        return await generateFallbackTopics(niche, count);
      }
    }

    // Get channels for context
    const userChannel = getUserChannel();
    const competitorChannels = getCompetitorChannels();
    const allChannels = getAllChannels();

    // Determine niche from channels if not provided
    const effectiveNiche = niche || userChannel?.niche || competitorChannels[0]?.niche || 'general';

    // Gather context from RAG
    let ragContext = {
      channelContent: [] as Array<{ title: string; summary: string }>,
      competitorContent: [] as Array<{ title: string; summary: string }>,
      newsArticles: [] as Array<{ headline: string; summary: string }>,
    };

    try {
      // Get recent videos from channels
      const userVideos = userChannel
        ? getChannelVideos(userChannel.id, { limit: 10 })
        : [];

      ragContext.channelContent = userVideos.map(v => ({
        title: v.title,
        summary: v.transcript?.substring(0, 200) || v.description?.substring(0, 200) || '',
      }));

      // Get competitor videos
      for (const comp of competitorChannels.slice(0, 3)) {
        const compVideos = getChannelVideos(comp.id, { limit: 5 });
        ragContext.competitorContent.push(...compVideos.map(v => ({
          title: v.title,
          summary: v.transcript?.substring(0, 200) || v.description?.substring(0, 200) || '',
        })));
      }

      // Get recent news
      const newsArticles = getNewsArticlesByNiche(effectiveNiche, 10);
      ragContext.newsArticles = newsArticles.map(a => ({
        headline: a.headline,
        summary: a.summary || '',
      }));
    } catch (error) {
      console.error('[RAG Topics] Error gathering RAG context:', error);
    }

    // Build prompt for topic generation
    const prompt = buildTopicPrompt(effectiveNiche, count, ragContext);

    // Generate topics using LLM
    try {
      const provider = createLLMProvider();
      const response = await provider.chat(
        [{ role: 'user', content: prompt }],
        'You are a content strategist for YouTube creators. Generate topic suggestions in JSON format.'
      );

      const topics = parseTopicsResponse(response);

      return NextResponse.json({
        success: true,
        topics,
        niche: effectiveNiche,
        source: 'rag',
        context: {
          channelVideosUsed: ragContext.channelContent.length,
          competitorVideosUsed: ragContext.competitorContent.length,
          newsArticlesUsed: ragContext.newsArticles.length,
        },
      });
    } catch (error) {
      console.error('[RAG Topics] LLM generation failed:', error);
      return await generateFallbackTopics(effectiveNiche, count);
    }
  } catch (error) {
    console.error('[RAG Topics API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Build prompt for topic generation
 */
function buildTopicPrompt(
  niche: string,
  count: number,
  context: {
    channelContent: Array<{ title: string; summary: string }>;
    competitorContent: Array<{ title: string; summary: string }>;
    newsArticles: Array<{ headline: string; summary: string }>;
  }
): string {
  let prompt = `You are a content strategist helping a YouTube creator in the "${niche}" niche generate video topic ideas.

Generate ${count} unique, engaging video topic ideas based on the following context:

`;

  if (context.channelContent.length > 0) {
    prompt += `## Your Channel's Recent Videos (for style reference)
${context.channelContent.map(v => `- ${v.title}`).join('\n')}

`;
  }

  if (context.competitorContent.length > 0) {
    prompt += `## Competitor Content (trending in the niche)
${context.competitorContent.map(v => `- ${v.title}`).join('\n')}

`;
  }

  if (context.newsArticles.length > 0) {
    prompt += `## Recent News (current events to reference)
${context.newsArticles.map(a => `- ${a.headline}`).join('\n')}

`;
  }

  prompt += `## Requirements
- Each topic should be specific and actionable (not generic)
- Topics should be timely if news is available
- Topics should fill gaps not covered by recent channel content
- Topics should capitalize on what's trending with competitors

## Output Format
Return exactly ${count} topics as a JSON array with this structure:
[
  {
    "title": "Short, catchy video title",
    "description": "2-3 sentence description of what the video would cover",
    "angle": "What makes this topic unique or timely"
  }
]

Only return the JSON array, no other text.`;

  return prompt;
}

/**
 * Parse topics from LLM response
 */
function parseTopicsResponse(response: string): Array<{
  title: string;
  description: string;
  angle: string;
}> {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map(topic => ({
          title: topic.title || 'Untitled Topic',
          description: topic.description || '',
          angle: topic.angle || '',
        }));
      }
    }
  } catch (error) {
    console.error('[RAG Topics] Failed to parse response:', error);
  }

  // Fallback: try to extract topics from text
  const lines = response.split('\n').filter(line => line.trim());
  const topics: Array<{ title: string; description: string; angle: string }> = [];

  for (const line of lines) {
    if (line.match(/^\d+\.|^-|^\*/)) {
      const title = line.replace(/^\d+\.|^-|^\*/, '').trim();
      if (title) {
        topics.push({
          title,
          description: '',
          angle: '',
        });
      }
    }
  }

  return topics.slice(0, 5);
}

/**
 * Get niche-specific context for topic generation
 * This helps the LLM understand what kind of content to generate even without RAG data
 */
function getNicheContext(niche: string): string {
  const nicheLower = niche.toLowerCase();

  // Blackpill / Doomer / Red Pill dating content
  if (nicheLower.includes('blackpill') || nicheLower.includes('black pill') ||
      nicheLower.includes('doomer') || nicheLower.includes('red pill')) {
    return `## Context for ${niche} Content

This niche focuses on:
- Dating dynamics from a pessimistic/realist perspective
- Male-female relationship dynamics and modern dating market realities
- Self-improvement for men in the dating market
- Analyzing modern dating trends, statistics, and harsh truths
- "Blackpill" awareness: understanding dating market value, hypergamy, and lookism
- Content should be analytical, data-driven, and unapologetically honest
- Target audience: Men seeking honest dating advice and market awareness

Common themes:
- Dating app statistics and success rates
- Physical appearance and its impact on dating
- Online vs offline dating dynamics
- Income and status in dating markets
- Age gaps and dating market value over time
- Personality vs looks debates`;
  }

  // Gaming niche
  if (nicheLower.includes('gaming') || nicheLower.includes('games')) {
    return `## Context for Gaming Content

This niche focuses on:
- Game reviews, gameplay analysis, and industry commentary
- Gaming news, updates, and trending topics
- Esports, competitive gaming, and streaming culture
- Game guides, tips, and strategies`;
  }

  // Tech niche
  if (nicheLower.includes('tech') || nicheLower.includes('technology')) {
    return `## Context for Tech Content

This niche focuses on:
- Tech news, product reviews, and industry analysis
- Programming, software development, and tutorials
- Gadgets, hardware, and consumer tech`;
  }

  // Default generic context
  return `## Context for this Channel

Focus on creating content that:
- Provides value to your target audience
- Addresses current trends or timeless problems
- Showcases your unique perspective and expertise`;
}

/**
 * Get system prompt tailored to the niche
 */
function getSystemPromptForNiche(niche: string): string {
  const nicheLower = niche.toLowerCase();

  if (nicheLower.includes('blackpill') || nicheLower.includes('black pill') ||
      nicheLower.includes('doomer') || nicheLower.includes('red pill')) {
    return `You are a content strategist for a YouTube channel creating content about dating dynamics from a realist/pessimist perspective (often called "blackpill" or "doomer" content).

Your role is to generate video topics that:
- Analyze dating market dynamics honestly and directly
- Use statistics, data, and observable reality
- Address men's dating challenges without sugarcoating
- Cover topics like online dating, appearance, status, and relationship dynamics
- Are engaging and click-worthy while remaining truthful to the niche's perspective

Generate topics that would resonate with men seeking honest dating advice and market awareness.`;
  }

  return 'You are a content strategist for YouTube creators. Generate topic suggestions in JSON format.';
}

/**
 * Generate fallback topics without RAG
 */
async function generateFallbackTopics(niche: string | undefined, count: number) {
  const effectiveNiche = niche || 'general';

  // Enhanced prompt with niche-specific context
  const nicheContext = getNicheContext(effectiveNiche);

  const prompt = `Generate ${count} creative video topic ideas for a YouTube channel in the "${effectiveNiche}" niche.

${nicheContext}

Each topic should be:
- Specific and actionable
- Engaging and click-worthy
- Different from each other
- Aligned with the niche's tone and audience expectations

Return as a JSON array:
[
  {
    "title": "Video title",
    "description": "Brief description",
    "angle": "What makes this interesting"
  }
]

Only return the JSON array.`;

  const systemPrompt = getSystemPromptForNiche(effectiveNiche);

  try {
    const provider = createLLMProvider();
    const response = await provider.chat(
      [{ role: 'user', content: prompt }],
      systemPrompt
    );

    const topics = parseTopicsResponse(response);

    return NextResponse.json({
      success: true,
      topics,
      niche: effectiveNiche,
      source: 'fallback',
      context: {
        channelVideosUsed: 0,
        competitorVideosUsed: 0,
        newsArticlesUsed: 0,
      },
    });
  } catch (error) {
    console.error('[RAG Topics] Fallback generation failed:', error);

    // Return hardcoded placeholder topics
    return NextResponse.json({
      success: true,
      topics: [
        {
          title: `Top 10 ${effectiveNiche} Trends You Need to Know`,
          description: 'An overview of the latest trends and developments',
          angle: 'Comprehensive trend analysis',
        },
        {
          title: `${effectiveNiche} Beginner's Guide`,
          description: 'Everything beginners need to get started',
          angle: 'Educational foundation content',
        },
        {
          title: `The Truth About ${effectiveNiche}`,
          description: 'Debunking common myths and misconceptions',
          angle: 'Myth-busting angle for engagement',
        },
      ],
      niche: effectiveNiche,
      source: 'placeholder',
      context: {
        channelVideosUsed: 0,
        competitorVideosUsed: 0,
        newsArticlesUsed: 0,
      },
    });
  }
}
