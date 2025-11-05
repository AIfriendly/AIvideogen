/**
 * Topic Extraction Utility - Story 1.7
 *
 * Extracts video topic from conversation context using pattern matching.
 * Analyzes user messages for video creation commands and extracts the topic.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { Message } from '@/types/api';

/**
 * Pattern matching rules for video creation commands
 *
 * Each pattern captures the topic text in a capture group.
 */
const VIDEO_CREATION_PATTERNS = [
  // "make a video about [topic]"
  /\bmake\s+(?:a\s+)?video\s+(?:about|on)\s+(.+?)(?:\.|$|,|\?|!)/i,

  // "create a video about [topic]"
  /\bcreate\s+(?:a\s+)?video\s+(?:about|on)\s+(.+?)(?:\.|$|,|\?|!)/i,

  // "let's make [topic] video" or "let's make a [topic] video"
  /\blet'?s\s+make\s+(?:a\s+)?(.+?)\s+video/i,

  // "I want to create [topic]" or "I'd like to create [topic]"
  /\b(?:I\s+want|I'd\s+like)\s+to\s+create\s+(?:a\s+)?(?:video\s+(?:about|on)\s+)?(.+?)(?:\.|$|,|\?|!)/i,

  // "video about [topic]"
  /\bvideo\s+(?:about|on)\s+(.+?)(?:\.|$|,|\?|!)/i,

  // "do a video on [topic]" or "make one about [topic]"
  /\b(?:do|make)\s+(?:a|one)\s+(?:video\s+)?(?:about|on)\s+(.+?)(?:\.|$|,|\?|!)/i,

  // "build/produce/film a video about [topic]"
  /\b(?:build|produce|film|shoot)\s+(?:a\s+)?video\s+(?:about|on)\s+(.+?)(?:\.|$|,|\?|!)/i,

  // "[topic] video" - but only if topic is meaningful (multiple words or longer than 5 chars)
  /\b([a-zA-Z0-9\s-]{6,})\s+video\b(?!\s+(?:about|on|now))/i,
];

/**
 * Generic video creation commands (without explicit topic)
 *
 * These trigger context analysis from previous messages.
 * Must not match patterns that would extract a topic.
 */
const GENERIC_COMMANDS = [
  /\bmake\s+(?:the|a)?\s*video\s*(?:now|please)?$/i,
  /\bcreate\s+(?:the|a)?\s*video\s*(?:now|please)?$/i,
  /\b(?:do|build|produce)\s+(?:the|a)?\s*video\s*(?:now|please)?$/i,
  /\blet'?s\s+(?:do|make|create)\s+(?:it|this|that|the\s+video)$/i,
  /\b(?:go\s+ahead|proceed|start|begin)(?:\s+with\s+(?:it|this|that))?$/i,
  /\b(?:yes|okay|ok),?\s+(?:make|create|do)\s+(?:it|the\s+video)$/i,
];

/**
 * Extract topic from conversation messages
 *
 * Analyzes messages for video creation intent and extracts the topic.
 * Uses pattern matching for explicit commands, and context analysis
 * for generic commands.
 *
 * @param messages - Array of conversation messages (user and assistant)
 * @returns Extracted topic string or null if no clear topic detected
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: 'user', content: 'I want to make a video about Mars colonization' }
 * ];
 * const topic = extractTopicFromConversation(messages);
 * // Returns: "Mars colonization"
 * ```
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: 'user', content: 'Tell me about renewable energy' },
 *   { role: 'assistant', content: 'Renewable energy is...' },
 *   { role: 'user', content: 'Great! Make the video now.' }
 * ];
 * const topic = extractTopicFromConversation(messages);
 * // Returns: "renewable energy" (extracted from context)
 * ```
 */
export function extractTopicFromConversation(messages: Message[]): string | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  // Get last 10 messages or entire conversation if shorter
  const recentMessages = messages.slice(-10);

  // Filter to user messages only
  const userMessages = recentMessages.filter(msg => msg.role === 'user');

  if (userMessages.length === 0) {
    return null;
  }

  // Check last user message first (most likely to contain command)
  const lastUserMessage = userMessages[userMessages.length - 1];

  // Try explicit pattern matching on last message
  const explicitTopic = extractTopicFromMessage(lastUserMessage.content);
  if (explicitTopic) {
    return explicitTopic;
  }

  // Check if last message is a generic command OR contains a pronoun reference
  const isGenericCommand = GENERIC_COMMANDS.some(pattern =>
    pattern.test(lastUserMessage.content)
  );

  // NEW: Check if message contains a pronoun reference (e.g., "create a video about it/this/that")
  const hasPronounReference = /\b(?:make|create|do|build|produce)\s+(?:a|one|the)?\s*video\s+(?:about|on)?\s*(?:it|this|that)\b/i.test(lastUserMessage.content);

  if (isGenericCommand || hasPronounReference) {
    // Analyze last 5 user messages for context
    const contextMessages = userMessages.slice(-5, -1); // Exclude the command itself

    // Try to extract topic from previous messages
    for (let i = contextMessages.length - 1; i >= 0; i--) {
      const contextTopic = extractTopicFromMessage(contextMessages[i].content);
      if (contextTopic) {
        return contextTopic;
      }
    }

    // NEW: If no explicit topic found, try to extract subject from conversation
    // Look for patterns like "Tell me about X" or "I'm interested in X"
    for (let i = contextMessages.length - 1; i >= 0; i--) {
      const content = contextMessages[i].content;
      const subjectPatterns = [
        // "about/on/regarding [topic]"
        /\b(?:about|on|regarding)\s+(.+?)(?:\.|$|,|\?|!)/i,

        // "topic on/about [topic]"
        /\btopic\s+(?:on|about|for)\s+(.+?)(?:\.|$|,|\?|!)/i,

        // "brainstorm [topic]" or "brainstorm a topic on [topic]"
        /\bbrainstorm(?:\s+a\s+topic)?\s+(?:on|about|for)?\s*(.+?)(?:\.|$|,|\?|!)/i,

        // "discuss/talk about [topic]"
        /\b(?:discuss|talk\s+about)\s+(.+?)(?:\.|$|,|\?|!)/i,

        // "interested in/looking at/exploring [topic]"
        /\b(?:interested in|looking at|exploring|focused on)\s+(.+?)(?:\.|$|,|\?|!)/i,

        // "tell me about [topic]"
        /\btell me (?:about|on)\s+(.+?)(?:\.|$|,|\?|!)/i,

        // "help with/learn about [topic]"
        /\b(?:help with|learn about|research)\s+(.+?)(?:\.|$|,|\?|!)/i,
      ];

      for (const pattern of subjectPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const topic = cleanTopicText(match[1]);
          if (topic && topic.length >= 3 && !isStopWord(topic)) {
            return topic;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Extract topic from a single message using pattern matching
 *
 * @param message - Message content to analyze
 * @returns Extracted topic or null if no match
 */
function extractTopicFromMessage(message: string): string | null {
  if (!message || typeof message !== 'string') {
    return null;
  }

  // Try each pattern
  for (const pattern of VIDEO_CREATION_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const topic = cleanTopicText(match[1]);

      // Validate topic is meaningful (more than just articles/prepositions)
      if (topic && topic.length >= 3 && !isStopWord(topic)) {
        return topic;
      }
    }
  }

  return null;
}

/**
 * Clean and normalize extracted topic text
 *
 * Removes extra whitespace, trims, and limits length.
 *
 * @param topic - Raw extracted topic text
 * @returns Cleaned topic string
 */
function cleanTopicText(topic: string): string {
  // Remove extra whitespace
  let cleaned = topic.replace(/\s+/g, ' ').trim();

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:!?]+$/, '');

  // Limit length (max 200 chars)
  if (cleaned.length > 200) {
    // Truncate to last complete word
    const truncated = cleaned.substring(0, 200);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 100) {
      cleaned = truncated.substring(0, lastSpace);
    } else {
      cleaned = truncated;
    }
  }

  return cleaned;
}

/**
 * Check if text is a stop word (too generic to be a topic)
 *
 * @param text - Text to check
 * @returns True if text is a stop word
 */
function isStopWord(text: string): boolean {
  const stopWords = [
    // Pronouns
    'it', 'this', 'that', 'these', 'those', 'them', 'they',
    // Articles
    'the', 'a', 'an',
    // Conjunctions
    'and', 'or', 'but', 'nor', 'yet', 'so',
    // Prepositions
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
    // Numbers/digits only
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
    // Common non-topics
    'now', 'please', 'yes', 'no', 'ok', 'okay',
  ];

  const normalized = text.toLowerCase().trim();

  // Check if it's exactly a stop word
  if (stopWords.includes(normalized)) {
    return true;
  }

  // Check if it's only a number
  if (/^\d+$/.test(normalized)) {
    return true;
  }

  return false;
}
