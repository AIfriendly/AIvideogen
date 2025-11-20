import type { SceneAnalysis } from './types';
import { ContentType } from './types';

/**
 * Keyword Extraction Fallback Module
 *
 * This module provides simple keyword extraction as a fallback mechanism when
 * the LLM provider is unavailable, times out, or returns invalid responses.
 * It uses frequency-based analysis without external NLP libraries to maintain
 * lightweight dependencies and ensure robust operation.
 *
 * Trade-offs:
 * - Lower quality than LLM-based analysis (no semantic understanding)
 * - Fast performance (<100ms typical)
 * - 100% availability (no network dependencies)
 * - Acceptable for basic visual sourcing needs
 *
 * @module keyword-extractor
 */

/**
 * Common English stop words to filter out during keyword extraction
 *
 * These words are too common to be useful in search queries and should be
 * removed before frequency analysis. This list covers the most frequent
 * English stop words (articles, prepositions, conjunctions, etc.).
 */
const STOP_WORDS = new Set([
  // Articles
  'the', 'a', 'an',
  // Conjunctions
  'and', 'or', 'but', 'nor', 'so', 'yet',
  // Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
  'into', 'about', 'after', 'before', 'between', 'through', 'during',
  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their',
  'this', 'that', 'these', 'those', 'what', 'which', 'where', 'when',
  'why', 'how', 'who', 'whom', 'whose',
  // Verbs (common auxiliaries and to-be)
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'didn', 'doesn', 'don',
  'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can',
  // Common non-visual verbs
  'imagine', 'think', 'know', 'want', 'need', 'like', 'feel', 'seem',
  'become', 'make', 'take', 'come', 'give', 'find', 'tell', 'ask',
  'work', 'call', 'try', 'leave', 'put', 'mean', 'keep', 'let', 'begin',
  'help', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe',
  'suggest', 'push', 'pull', 'turn', 'start', 'stop', 'bring', 'hold',
  'write', 'read', 'learn', 'change', 'follow', 'create', 'speak',
  // Abstract/filler words
  'then', 'than', 'such', 'some', 'any', 'all', 'each', 'every',
  'very', 'more', 'most', 'much', 'many', 'few', 'less', 'least',
  'just', 'also', 'even', 'still', 'already', 'always', 'never', 'ever',
  'only', 'really', 'actually', 'certainly', 'probably', 'perhaps',
  'however', 'therefore', 'because', 'since', 'while', 'although',
  'often', 'quite', 'simple', 'whether', 'ultimately', 'finally',
  'maybe', 'sometimes', 'usually', 'especially', 'particularly',
  'basically', 'generally', 'simply', 'clearly', 'obviously',
  'course', 'fact', 'thing', 'case', 'week', 'company', 'system',
  'program', 'question', 'government', 'number', 'point',
  'area', 'money', 'story', 'month', 'lot', 'right', 'study',
  'word', 'business', 'issue', 'side', 'kind', 'service',
  'member', 'law', 'end', 'people', 'person', 'group', 'state',
  // Narrative words (common in scripts but not visual)
  'happen', 'incredible', 'amazing', 'immense', 'vast', 'huge', 'great',
  'good', 'bad', 'new', 'old', 'long', 'little', 'own', 'other',
  'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young',
  'important', 'public', 'same', 'able', 'global', 'true', 'false',
  'real', 'certain', 'possible', 'likely', 'unlikely', 'necessary'
]);

/**
 * Extract top keywords from scene text using frequency analysis
 *
 * This function performs simple NLP-style keyword extraction without external
 * libraries. It tokenizes the text, removes stop words, counts word frequency,
 * and returns the top 5 most frequent words as keywords.
 *
 * Algorithm:
 * 1. Tokenize: Split on whitespace and punctuation
 * 2. Normalize: Convert to lowercase
 * 3. Filter: Remove words shorter than 4 characters
 * 4. Remove stop words: Filter common words
 * 5. Count frequency: Track word occurrences
 * 6. Sort: Order by frequency descending
 * 7. Return top 5 keywords
 *
 * @param sceneText - The scene narration text to extract keywords from
 * @returns Array of top 5 keywords (or fewer if text is short)
 *
 * @example
 * ```typescript
 * const keywords = extractKeywords(
 *   "A majestic lion roams the savanna at sunset"
 * );
 * // Returns: ["majestic", "lion", "roams", "savanna", "sunset"]
 * ```
 */
export function extractKeywords(sceneText: string): string[] {
  // 1. Tokenize: Replace punctuation with spaces, split on whitespace
  const words = sceneText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3); // Filter short words

  // 2. Remove stop words
  const keywords = words.filter(word => !STOP_WORDS.has(word));

  // 3. Count frequency
  const frequency = new Map<string, number>();
  keywords.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });

  // 4. Sort by frequency descending, return top 5
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by frequency (higher first)
    .slice(0, 5) // Take top 5
    .map(([word]) => word); // Extract just the words
}

/**
 * Create a fallback SceneAnalysis using simple keyword extraction
 *
 * This function generates a minimal but functional SceneAnalysis object when
 * the LLM provider is unavailable. It uses keyword extraction to populate
 * basic fields and constructs a simple primary query from top keywords.
 *
 * Limitations:
 * - No semantic understanding (cannot distinguish subject from setting)
 * - No alternative queries (requires LLM creativity)
 * - No mood/action extraction (requires context understanding)
 * - Generic content type (defaults to B_ROLL)
 *
 * Field Mapping:
 * - mainSubject: First keyword (most frequent word)
 * - setting: Second keyword (if available)
 * - mood: Empty (cannot infer without LLM)
 * - action: Empty (cannot infer without LLM)
 * - keywords: Top 5 keywords from frequency analysis
 * - primaryQuery: Top 4 keywords joined with spaces
 * - alternativeQueries: Empty (requires LLM creativity)
 * - contentType: B_ROLL (safe default for generic footage)
 *
 * @param sceneText - The scene narration text to analyze
 * @returns Minimal SceneAnalysis object with keyword-based fields
 *
 * @example
 * ```typescript
 * const analysis = createFallbackAnalysis(
 *   "A majestic lion roams the savanna at sunset"
 * );
 * // Returns:
 * // {
 * //   mainSubject: "majestic",
 * //   setting: "lion",
 * //   mood: "",
 * //   action: "",
 * //   keywords: ["majestic", "lion", "roams", "savanna", "sunset"],
 * //   primaryQuery: "majestic lion roams savanna",
 * //   alternativeQueries: [],
 * //   contentType: ContentType.B_ROLL
 * // }
 * ```
 */
export function createFallbackAnalysis(sceneText: string): SceneAnalysis {
  const keywords = extractKeywords(sceneText);
  const primaryQuery = keywords.slice(0, 4).join(' ');

  return {
    mainSubject: keywords[0] || '',
    setting: keywords[1] || '',
    mood: '',
    action: '',
    keywords: keywords,
    primaryQuery: primaryQuery,
    alternativeQueries: [],
    contentType: ContentType.B_ROLL
  };
}
