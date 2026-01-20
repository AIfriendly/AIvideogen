/**
 * Quick Production Data Factories
 *
 * Story 6.8b - Test data factories for Quick Production Flow
 *
 * Uses faker for random data generation with override support.
 * Each factory produces valid, complete objects suitable for testing.
 */

// Note: faker-js not yet installed - add to devDependencies
// import { faker } from '@faker-js/faker';

// Temporary implementation without faker
const generateId = () => `test-${Math.random().toString(36).substring(2, 11)}`;
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * User Preferences Factory
 */
export interface UserPreferencesData {
  id: string;
  default_voice_id: string | null;
  default_persona_id: string | null;
  quick_production_enabled: boolean;
}

export const createUserPreferences = (
  overrides: Partial<UserPreferencesData> = {}
): UserPreferencesData => ({
  id: 'default',
  default_voice_id: 'af_nova',
  default_persona_id: 'scientific-analyst',
  quick_production_enabled: true,
  ...overrides,
});

export const createUserPreferencesWithoutDefaults = (): UserPreferencesData =>
  createUserPreferences({
    default_voice_id: null,
    default_persona_id: null,
  });

/**
 * Topic Suggestion Factory
 */
export interface TopicSuggestionData {
  id: string;
  title: string;
  description: string;
  source: 'news' | 'trend' | 'competitor' | 'channel_gap';
  relevanceScore: number;
  ragContext: RAGContextData;
}

export interface RAGContextData {
  channelContent: RetrievedDocumentData[];
  competitorContent: RetrievedDocumentData[];
  newsArticles: RetrievedDocumentData[];
  trendingTopics: RetrievedDocumentData[];
}

export interface RetrievedDocumentData {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

export const createRetrievedDocument = (
  overrides: Partial<RetrievedDocumentData> = {}
): RetrievedDocumentData => ({
  id: generateId(),
  content: `Sample content about military technology and defense systems. This represents retrieved context from the RAG system.`,
  metadata: {
    source: 'channel_video',
    videoId: generateId(),
    title: 'Sample Video Title',
  },
  score: Math.random() * 0.3 + 0.7, // 0.7 - 1.0 range
  ...overrides,
});

export const createRAGContext = (overrides: Partial<RAGContextData> = {}): RAGContextData => ({
  channelContent: [createRetrievedDocument({ metadata: { source: 'channel_video' } })],
  competitorContent: [createRetrievedDocument({ metadata: { source: 'competitor_video' } })],
  newsArticles: [createRetrievedDocument({ metadata: { source: 'news_article' } })],
  trendingTopics: [],
  ...overrides,
});

export const createEmptyRAGContext = (): RAGContextData => ({
  channelContent: [],
  competitorContent: [],
  newsArticles: [],
  trendingTopics: [],
});

export const createTopicSuggestion = (
  overrides: Partial<TopicSuggestionData> = {}
): TopicSuggestionData => {
  const sources: TopicSuggestionData['source'][] = ['news', 'trend', 'competitor', 'channel_gap'];

  return {
    id: generateId(),
    title: 'F-35 Lightning II: Latest Combat Capabilities',
    description:
      'Explore the advanced stealth features and combat systems of the F-35 Lightning II fighter jet.',
    source: randomElement(sources),
    relevanceScore: Math.floor(Math.random() * 30) + 70, // 70-100 range
    ragContext: createRAGContext(),
    ...overrides,
  };
};

export const createTopicSuggestions = (count: number): TopicSuggestionData[] =>
  Array.from({ length: count }, () => createTopicSuggestion());

/**
 * Quick Create Request Factory
 */
export interface QuickCreateRequestData {
  topic: string;
  ragContext?: RAGContextData;
}

export const createQuickCreateRequest = (
  overrides: Partial<QuickCreateRequestData> = {}
): QuickCreateRequestData => ({
  topic: 'Test Topic for Quick Production',
  ragContext: createRAGContext(),
  ...overrides,
});

export const createQuickCreateRequestMinimal = (): QuickCreateRequestData => ({
  topic: 'Minimal Test Topic',
});

/**
 * Pipeline Status Factory
 */
export type PipelineStage = 'script' | 'voiceover' | 'visuals' | 'assembly' | 'complete';

export interface PipelineStatusData {
  projectId: string;
  topic: string;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  stageProgress: number;
  overallProgress: number;
  currentMessage: string;
  error?: string;
}

const stageMessages: Record<PipelineStage, string> = {
  script: 'Generating script...',
  voiceover: 'Creating voiceover...',
  visuals: 'Sourcing visuals...',
  assembly: 'Assembling video...',
  complete: 'Video complete!',
};

const stageProgressMap: Record<PipelineStage, number> = {
  script: 20,
  voiceover: 40,
  visuals: 60,
  assembly: 80,
  complete: 100,
};

export const createPipelineStatus = (
  overrides: Partial<PipelineStatusData> = {}
): PipelineStatusData => {
  const currentStage = overrides.currentStage || 'script';
  const stages: PipelineStage[] = ['script', 'voiceover', 'visuals', 'assembly', 'complete'];
  const currentIndex = stages.indexOf(currentStage);
  const completedStages = stages.slice(0, currentIndex) as PipelineStage[];

  return {
    projectId: generateId(),
    topic: 'Test Topic',
    currentStage,
    completedStages,
    stageProgress: Math.floor(Math.random() * 100),
    overallProgress: stageProgressMap[currentStage],
    currentMessage: stageMessages[currentStage],
    ...overrides,
  };
};

export const createPipelineStatusComplete = (): PipelineStatusData =>
  createPipelineStatus({
    currentStage: 'complete',
    completedStages: ['script', 'voiceover', 'visuals', 'assembly'],
    stageProgress: 100,
    overallProgress: 100,
    currentMessage: 'Video complete!',
  });

export const createPipelineStatusWithError = (error: string): PipelineStatusData =>
  createPipelineStatus({
    error,
    currentMessage: `Error: ${error}`,
  });

/**
 * Project Factory (for existing project scenarios)
 */
export interface ProjectData {
  id: string;
  topic: string;
  topic_confirmed: boolean;
  voice_id: string | null;
  system_prompt_id: string | null;
  current_step: string;
  rag_enabled: boolean;
  rag_config: string | null;
  created_at: string;
  updated_at: string;
}

export const createProject = (overrides: Partial<ProjectData> = {}): ProjectData => ({
  id: generateId(),
  topic: 'Test Project Topic',
  topic_confirmed: true,
  voice_id: 'af_nova',
  system_prompt_id: 'scientific-analyst',
  current_step: 'script-generation',
  rag_enabled: true,
  rag_config: JSON.stringify({ ragContext: createRAGContext() }),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createProjectForQuickProduction = (): ProjectData =>
  createProject({
    topic_confirmed: true,
    current_step: 'script-generation',
    rag_enabled: true,
  });
