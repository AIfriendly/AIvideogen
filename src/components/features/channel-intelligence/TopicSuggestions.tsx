'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, RefreshCw, ArrowRight, Lightbulb } from 'lucide-react';

interface Topic {
  title: string;
  description: string;
  angle: string;
}

interface TopicSuggestionsProps {
  niche?: string;
  onCreateProject?: (topic: string) => void;
}

export function TopicSuggestions({ niche, onCreateProject }: TopicSuggestionsProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'rag' | 'fallback' | 'placeholder' | null>(null);
  const [context, setContext] = useState<{
    channelVideosUsed: number;
    competitorVideosUsed: number;
    newsArticlesUsed: number;
  } | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate topics');
    } finally {
      setLoading(false);
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
            <p>Click "Get Ideas" to generate topic suggestions</p>
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{topic.title}</h4>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {topic.description}
                        </p>
                      )}
                      {topic.angle && (
                        <p className="text-xs text-primary mt-2">
                          {topic.angle}
                        </p>
                      )}
                    </div>
                    {onCreateProject && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCreateProject(topic.title)}
                        className="ml-2"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
