'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Lightbulb,
  Zap,
  Settings,
} from 'lucide-react';

interface Topic {
  title: string;
  description: string;
  angle: string;
  source?: 'news' | 'trend' | 'competitor' | 'channel_gap';
  relevanceScore?: number;
}

interface RAGContext {
  channelContent?: any[];
  competitorContent?: any[];
  newsArticles?: any[];
  trendingTopics?: any[];
}

interface TopicSuggestionsProps {
  niche?: string;
  onCreateProject?: (topic: string) => void;
}

export function TopicSuggestions({ niche, onCreateProject }: TopicSuggestionsProps) {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'rag' | 'fallback' | 'placeholder' | null>(null);
  const [context, setContext] = useState<{
    channelVideosUsed: number;
    competitorVideosUsed: number;
    newsArticlesUsed: number;
  } | null>(null);
  const [ragContext, setRagContext] = useState<RAGContext | null>(null);

  // Track if user has configured defaults for Quick Production
  const [hasDefaults, setHasDefaults] = useState<boolean | null>(null);
  const [creatingVideo, setCreatingVideo] = useState<string | null>(null);

  // Check if user has Quick Production defaults configured
  const checkDefaults = useCallback(async () => {
    try {
      const response = await fetch('/api/user-preferences');
      const data = await response.json();

      if (data.success && data.data) {
        const hasConfigured = !!(data.data.default_voice_id && data.data.default_persona_id);
        setHasDefaults(hasConfigured);
      } else {
        setHasDefaults(false);
      }
    } catch {
      setHasDefaults(false);
    }
  }, []);

  useEffect(() => {
    checkDefaults();
  }, [checkDefaults]);

  const generateTopics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, count: 5 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate topics');
      }

      setTopics(data.topics || []);
      setSource(data.source);
      setContext(data.context);

      // Store RAG context for use in Quick Production
      if (data.ragContext) {
        setRagContext(data.ragContext);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate topics');
    } finally {
      setLoading(false);
    }
  };

  // Handle Quick Production "Create Video" click
  const handleCreateVideo = async (topic: Topic) => {
    // If no defaults, redirect to settings
    if (!hasDefaults) {
      router.push('/settings/quick-production?prompt=Please configure your default voice and persona to use Quick Production');
      return;
    }

    setCreatingVideo(topic.title);
    setError(null);

    try {
      const response = await fetch('/api/projects/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.title,
          ragContext: ragContext,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.error === 'DEFAULTS_NOT_CONFIGURED') {
          router.push('/settings/quick-production?prompt=Please configure your default voice and persona to use Quick Production');
          return;
        }
        throw new Error(data.message || 'Failed to create video');
      }

      // Redirect to progress page
      router.push(data.data.redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create video');
      setCreatingVideo(null);
    }
  };

  const getSourceBadge = () => {
    switch (source) {
      case 'rag':
        return <Badge variant="default" className="bg-green-500">RAG-Powered</Badge>;
      case 'fallback':
        return <Badge variant="secondary">AI-Generated</Badge>;
      case 'placeholder':
        return <Badge variant="outline">Template</Badge>;
      default:
        return null;
    }
  };

  const getTopicSourceBadge = (topicSource?: string) => {
    switch (topicSource) {
      case 'news':
        return <Badge variant="outline" className="text-xs">News</Badge>;
      case 'trend':
        return <Badge variant="outline" className="text-xs">Trending</Badge>;
      case 'competitor':
        return <Badge variant="outline" className="text-xs">Competitor</Badge>;
      case 'channel_gap':
        return <Badge variant="outline" className="text-xs">Gap</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Topic Suggestions
          </CardTitle>
          <CardDescription>
            AI-generated video ideas based on your channel and niche
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/settings/quick-production')}
            className="text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            {hasDefaults === false ? 'Setup Quick Production' : 'QPF Settings'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateTopics}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : topics.length > 0 ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-1" />
                Get Ideas
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && topics.length === 0 && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click &quot;Get Ideas&quot; to generate topic suggestions</p>
            <p className="text-sm mt-1">
              Topics are generated based on your indexed content and current trends
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-3" />
            <p className="text-muted-foreground">Analyzing your content and trends...</p>
          </div>
        )}

        {topics.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              {getSourceBadge()}
              {context && source === 'rag' && (
                <p className="text-xs text-muted-foreground">
                  Using {context.channelVideosUsed} videos, {context.newsArticlesUsed} news articles
                </p>
              )}
            </div>

            <div className="space-y-3">
              {topics.map((topic, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{topic.title}</h4>
                        {getTopicSourceBadge(topic.source)}
                        {topic.relevanceScore !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {topic.relevanceScore}% match
                          </span>
                        )}
                      </div>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {topic.description}
                        </p>
                      )}
                      {topic.angle && (
                        <p className="text-xs text-primary mt-2">
                          {topic.angle}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Quick Production Create Video button */}
                      <Button
                        size="sm"
                        onClick={() => handleCreateVideo(topic)}
                        disabled={creatingVideo !== null}
                        className="gap-1"
                        title={
                          hasDefaults === false
                            ? 'Configure Quick Production defaults first'
                            : 'Create video with one click'
                        }
                      >
                        {creatingVideo === topic.title ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        Create Video
                      </Button>
                      {/* Standard create project button */}
                      {onCreateProject && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCreateProject(topic.title)}
                          title="Create project (manual setup)"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Production info */}
            {hasDefaults && (
              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                <Zap className="h-3 w-3 inline mr-1" />
                Click &quot;Create Video&quot; for one-click video creation using your default settings
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
