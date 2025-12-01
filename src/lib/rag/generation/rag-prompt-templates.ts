/**
 * RAG Prompt Templates
 *
 * Templates for building RAG-augmented prompts that inject channel content,
 * competitor analysis, and news context into script generation.
 *
 * Story 6.6 - RAG-Augmented Script Generation
 */

/**
 * Template for the RAG context section header
 */
export const RAG_CONTEXT_HEADER = `
=== CONTEXT FROM YOUR CONTENT LIBRARY ===
Use the following context to inform your script. Reference these sources naturally,
adopt similar patterns where appropriate, and incorporate current news angles.
Do NOT copy verbatim - use as inspiration for style, topics, and angles.
`;

/**
 * Template for channel content section
 * This shows the user's own channel style for consistency
 */
export const CHANNEL_STYLE_SECTION = `
## YOUR CHANNEL STYLE EXAMPLES
The following are examples from your channel. Match this tone, vocabulary, and approach:
`;

/**
 * Template for competitor content section
 * Shows what competitors are doing for differentiation
 */
export const COMPETITOR_SECTION = `
## COMPETITOR APPROACHES
Here's what others in your space are covering. Use this for differentiation - cover similar
topics from a unique angle or identify gaps they haven't addressed:
`;

/**
 * Template for news section
 * Provides current events for timely content
 */
export const NEWS_SECTION = `
## CURRENT NEWS & TRENDS
Recent developments in your niche. Incorporate relevant news angles to make content timely:
`;

/**
 * Template for trending topics section
 */
export const TRENDS_SECTION = `
## TRENDING TOPICS
Currently trending topics in your niche that may resonate with audiences:
`;

/**
 * Template for the RAG context footer
 */
export const RAG_CONTEXT_FOOTER = `
=== END CONTEXT ===

Now generate a script that leverages this context while maintaining your unique voice.
`;

/**
 * Instruction for established channel mode
 * Emphasizes style consistency with user's existing content
 */
export const ESTABLISHED_CHANNEL_INSTRUCTION = `
IMPORTANT: You are creating content for an established channel. Match the style,
tone, and vocabulary shown in "YOUR CHANNEL STYLE EXAMPLES" above. Maintain consistency
with the creator's established brand while incorporating fresh angles and current events.
`;

/**
 * Instruction for cold start mode
 * Emphasizes learning from successful competitors
 */
export const COLD_START_INSTRUCTION = `
IMPORTANT: This channel is just starting out. Use the "COMPETITOR APPROACHES" section
to understand what works in this niche, but differentiate by bringing unique perspectives.
Focus on underserved topics or fresh angles that competitors haven't covered.
`;

/**
 * Instruction for news integration
 * Guides how to weave news into narrative
 */
export const NEWS_INTEGRATION_INSTRUCTION = `
NEWS INTEGRATION: If relevant news appears in the context, weave it naturally into
your narrative. Don't force it - only include if it genuinely adds value to the topic.
Timely content performs better, but relevance is key.
`;

/**
 * Empty context message when no RAG data is available
 */
export const EMPTY_CONTEXT_MESSAGE = `
Note: No additional context is available from your content library.
Generating script based on the topic alone.
`;
