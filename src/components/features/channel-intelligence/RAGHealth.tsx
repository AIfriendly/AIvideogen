'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Database, Brain, Layers } from 'lucide-react';
import type { RAGHealthStatus } from '@/lib/rag/types';

interface RAGHealthProps {
  health: RAGHealthStatus | null;
  enabled: boolean;
  initialized: boolean;
}

export function RAGHealth({ health, enabled, initialized }: RAGHealthProps) {
  const getOverallBadge = () => {
    if (!enabled) {
      return <Badge variant="outline">Disabled</Badge>;
    }
    if (!health) {
      return <Badge variant="outline">Loading...</Badge>;
    }
    switch (health.overall) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary" className="bg-yellow-500">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const StatusIcon = ({ connected }: { connected: boolean }) =>
    connected ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">RAG System Health</CardTitle>
          <CardDescription>
            Vector database and embedding service status
          </CardDescription>
        </div>
        {getOverallBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              RAG is disabled. Set RAG_ENABLED=true in your environment to enable Channel Intelligence.
            </AlertDescription>
          </Alert>
        )}

        {enabled && !initialized && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              RAG system is initializing. This may take a moment...
            </AlertDescription>
          </Alert>
        )}

        {health && (
          <div className="space-y-3">
            {/* ChromaDB Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">ChromaDB</p>
                  <p className="text-xs text-muted-foreground">Vector Database</p>
                </div>
              </div>
              <StatusIcon connected={health.chromadb.connected} />
            </div>

            {health.chromadb.error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  {health.chromadb.error}
                </AlertDescription>
              </Alert>
            )}

            {/* Embeddings Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Embeddings</p>
                  <p className="text-xs text-muted-foreground">
                    {health.embeddings.model} ({health.embeddings.dimensions}d)
                  </p>
                </div>
              </div>
              <StatusIcon connected={health.embeddings.available} />
            </div>

            {health.embeddings.error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  {health.embeddings.error}
                </AlertDescription>
              </Alert>
            )}

            {/* Collection Sizes */}
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-3 mb-3">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium">Collections</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{health.collections.channel_content}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{health.collections.news_articles}</p>
                  <p className="text-xs text-muted-foreground">News</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{health.collections.trending_topics}</p>
                  <p className="text-xs text-muted-foreground">Trends</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
