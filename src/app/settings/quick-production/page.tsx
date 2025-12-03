'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, Settings, Zap, Mic, User } from 'lucide-react';

interface VoiceProfile {
  id: string;
  name: string;
  gender: string;
  accent: string;
  tone: string;
}

interface SystemPrompt {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
}

interface UserPreferences {
  id: string;
  default_voice_id: string | null;
  default_persona_id: string | null;
  quick_production_enabled: boolean;
  voice_name?: string;
  persona_name?: string;
}

function QuickProductionSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptMessage = searchParams.get('prompt');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data state
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [personas, setPersonas] = useState<SystemPrompt[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Form state
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedPersona, setSelectedPersona] = useState<string>('');

  // Fetch all required data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch in parallel
      const [voicesRes, personasRes, prefsRes] = await Promise.all([
        fetch('/api/voice/list'),
        fetch('/api/system-prompts'),
        fetch('/api/user-preferences'),
      ]);

      // Parse responses
      const voicesData = await voicesRes.json();
      const personasData = await personasRes.json();
      const prefsData = await prefsRes.json();

      // Handle voices
      if (voicesData.success && voicesData.data?.voices) {
        setVoices(voicesData.data.voices);
      } else {
        console.error('Failed to load voices:', voicesData);
      }

      // Handle personas
      if (personasData.prompts) {
        setPersonas(personasData.prompts);
      } else {
        console.error('Failed to load personas:', personasData);
      }

      // Handle preferences
      if (prefsData.success && prefsData.data) {
        setPreferences(prefsData.data);
        setSelectedVoice(prefsData.data.default_voice_id || '');
        setSelectedPersona(prefsData.data.default_persona_id || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save preferences
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: selectedVoice || null,
          default_persona_id: selectedPersona || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save preferences');
      }

      setSuccess('Settings saved successfully!');

      // Refresh preferences to get updated voice/persona names
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Check if form has changes
  const hasChanges =
    selectedVoice !== (preferences?.default_voice_id || '') ||
    selectedPersona !== (preferences?.default_persona_id || '');

  // Check if defaults are complete
  const hasCompleteDefaults = selectedVoice && selectedPersona;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Quick Production Settings</h1>
          </div>
        </div>

        {/* Prompt message from redirect */}
        {promptMessage && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <Settings className="h-4 w-4" />
            <AlertDescription>
              {promptMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success message */}
        {success && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/10">
            <AlertDescription className="text-green-700 dark:text-green-400">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Default Settings
            </CardTitle>
            <CardDescription>
              Configure your default voice and persona for one-click video creation.
              These settings will be applied automatically when using Quick Production.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Mic className="h-4 w-4" />
                Default Voice
              </label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice..." />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex flex-col">
                        <span>{voice.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {voice.accent} / {voice.tone}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This voice will be used for all voiceovers in Quick Production videos.
              </p>
            </div>

            {/* Persona Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Default Persona
              </label>
              <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a persona..." />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      <div className="flex flex-col">
                        <span>{persona.name}</span>
                        {persona.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {persona.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This persona will guide the script generation style for Quick Production videos.
              </p>
            </div>

            {/* Current Settings Summary */}
            {preferences && (preferences.voice_name || preferences.persona_name) && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="text-sm font-medium">Current Defaults</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Voice:</span>{' '}
                    {preferences.voice_name || 'Not set'}
                  </p>
                  <p>
                    <span className="font-medium">Persona:</span>{' '}
                    {preferences.persona_name || 'Not set'}
                  </p>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges || !hasCompleteDefaults}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>

            {/* Validation Message */}
            {!hasCompleteDefaults && (
              <p className="text-sm text-muted-foreground text-center">
                Please select both a voice and persona to enable Quick Production.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              About Quick Production
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Quick Production allows you to create videos with a single click from
              topic suggestions in Channel Intelligence.
            </p>
            <p>
              When you click &quot;Create Video&quot; on a topic suggestion, the system will:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Generate a script using your default persona</li>
              <li>Create voiceovers using your default voice</li>
              <li>Source visuals automatically</li>
              <li>Assemble the final video</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function QuickProductionSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <QuickProductionSettingsContent />
    </Suspense>
  );
}
