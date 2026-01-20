/**
 * ProviderSelectionModal Component - Story 6.11
 *
 * Modal dialog for selecting MCP video providers.
 * Allows users to choose between DVIDS, NASA, and YouTube providers
 * with status indicators and priority information.
 *
 * Features:
 * - Uses shadcn/ui Dialog component
 * - Displays available providers with status (online/offline)
 * - Shows provider priority and description
 * - Saves user preference to database
 *
 * (MEDIUM PRIORITY M1: Provider registry UI components)
 */

'use client';

import * as React from 'react';
import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Loader2, AlertCircle, Rocket, Shield, Video } from 'lucide-react';

/**
 * Video provider configuration
 */
export interface VideoProvider {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  status: 'online' | 'offline' | 'checking';
}

/**
 * API response format for providers
 */
interface ApiProvider {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  command?: string;
  args?: string[];
  description?: string;
}

/**
 * Valid provider status values
 */
const VALID_STATUSES = ['online', 'offline', 'checking'] as const;
type ProviderStatus = typeof VALID_STATUSES[number];

/**
 * Runtime type guard for provider status validation
 */
function isValidStatus(status: string): status is ProviderStatus {
  return VALID_STATUSES.includes(status as ProviderStatus);
}

/**
 * Props for ProviderSelectionModal component
 */
export interface ProviderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (providerId: string) => void;
  isLoading?: boolean;
  providers?: VideoProvider[];
  currentProvider?: string;
}

/**
 * ProviderSelectionModal Component
 *
 * Displays a modal dialog for selecting MCP video providers.
 * Shows provider status, priority, and allows users to choose
 * their preferred video source.
 *
 * @param isOpen - Whether the modal is visible
 * @param onClose - Callback to close the modal
 * @param onSelectProvider - Callback when provider is selected
 * @param isLoading - Whether provider check is in progress
 * @param providers - List of available providers
 * @param currentProvider - Currently selected provider ID
 * @returns Provider selection modal dialog
 */
export function ProviderSelectionModal({
  isOpen,
  onClose,
  onSelectProvider,
  isLoading = false,
  providers: externalProviders,
  currentProvider,
}: ProviderSelectionModalProps) {
  const [selectedProvider, setSelectedProvider] = React.useState<string>(currentProvider || 'youtube');
  const [providers, setProviders] = React.useState<VideoProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = React.useState(true);

  // Fetch providers from API when modal opens
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    if (isOpen && !externalProviders) {
      setLoadingProviders(true);

      fetch('/api/providers', { signal: abortController.signal })
        .then((res) => {
          if (!isMounted) return;
          return res.json();
        })
        .then((data) => {
          if (!isMounted) return;

          // Map API response to VideoProvider format with proper typing
          const mappedProviders: VideoProvider[] = data.providers.map((p: ApiProvider) => {
            const status: ProviderStatus = p.enabled ? 'online' : 'offline';
            return {
              id: p.id,
              name: p.name,
              description: p.description || `${p.name} video content`,
              priority: p.priority,
              enabled: p.enabled,
              status,
            };
          });
          setProviders(mappedProviders);
        })
        .catch((err) => {
          // Ignore abort errors from cancellation
          if (err.name === 'AbortError') return;
          if (!isMounted) return;

          console.error('Failed to load providers:', err);
          // Use hardcoded defaults as fallback
          setProviders([
            {
              id: 'youtube',
              name: 'YouTube',
              description: 'Largest video library with extensive content across all niches',
              priority: 3,
              enabled: true,
              status: 'online',
            },
            {
              id: 'nasa',
              name: 'NASA Space Videos',
              description: 'Authentic space footage from NASA Image and Video Library',
              priority: 2,
              enabled: true,
              status: 'online',
            },
            {
              id: 'dvids',
              name: 'DVIDS Military Videos',
              description: 'Military and defense footage from DVIDS',
              priority: 1,
              enabled: true,
              status: 'online',
            },
          ]);
        })
        .finally(() => {
          if (isMounted) {
            setLoadingProviders(false);
          }
        });
    } else if (externalProviders && isMounted) {
      setProviders(externalProviders);
      setLoadingProviders(false);
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [isOpen, externalProviders]);

  // Use providers from API, or external providers prop, or empty array
  const displayProviders: VideoProvider[] = providers;

  const handleSelect = () => {
    onSelectProvider(selectedProvider);
    onClose();
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'nasa':
        return <Rocket className="h-5 w-5" />;
      case 'dvids':
        return <Shield className="h-5 w-5" />;
      case 'youtube':
      default:
        return <Video className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: VideoProvider['status']) => {
    switch (status) {
      case 'online':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = (status: VideoProvider['status']) => {
    switch (status) {
      case 'online':
        return 'Available';
      case 'offline':
        return 'Unavailable';
      case 'checking':
        return 'Checking...';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Select Video Provider</DialogTitle>
          <DialogDescription className="text-slate-400">
            Choose your preferred video source. The system will try providers in priority order.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {loadingProviders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-400">Loading providers...</span>
            </div>
          ) : (
            displayProviders
              .filter((p) => p.enabled)
              .sort((a, b) => a.priority - b.priority)
              .map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  disabled={provider.status === 'offline'}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${
                      selectedProvider === provider.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                    }
                    ${provider.status === 'offline' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-slate-300">
                      {getProviderIcon(provider.id)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-100">{provider.name}</h3>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(provider.status)}
                          <span className="text-xs text-slate-400">{getStatusText(provider.status)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{provider.description}</p>
                      <p className="text-xs text-slate-500 mt-1">Priority: {provider.priority}</p>
                    </div>

                    {selectedProvider === provider.id && (
                      <Check className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
          )}
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">Provider Priority:</strong> The system will try
            providers in order (1 = highest priority). If a provider fails or returns no results,
            the next provider will be tried automatically.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={isLoading || !selectedProvider}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Select Provider
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
