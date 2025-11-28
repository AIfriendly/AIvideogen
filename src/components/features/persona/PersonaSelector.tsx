/**
 * PersonaSelector Component - Story 1.8
 *
 * Displays preset AI personas as selectable cards for project-level persona selection.
 * Users can choose a persona that shapes the AI's personality and delivery style.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}

interface PersonaSelectorProps {
  projectId: string;
  onSelect: (personaId: string) => void;
  initialPersonaId?: string;
}

export function PersonaSelector({ projectId, onSelect, initialPersonaId }: PersonaSelectorProps) {
  const [personas, setPersonas] = useState<SystemPrompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialPersonaId || null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPersonas() {
      try {
        const res = await fetch('/api/system-prompts');
        if (!res.ok) {
          throw new Error('Failed to fetch personas');
        }
        const data = await res.json();
        setPersonas(data.prompts);

        // Auto-select default if no initial selection
        if (!initialPersonaId && data.prompts.length > 0) {
          const defaultPersona = data.prompts.find((p: SystemPrompt) => p.is_default);
          if (defaultPersona) {
            setSelectedId(defaultPersona.id);
          } else {
            // Fallback to first persona if no default
            setSelectedId(data.prompts[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching personas:', err);
        setError('Failed to load personas');
      } finally {
        setLoading(false);
      }
    }

    fetchPersonas();
  }, [initialPersonaId]);

  const handleSelect = (personaId: string) => {
    setSelectedId(personaId);
  };

  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/select-persona`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: selectedId }),
      });

      if (!res.ok) {
        throw new Error('Failed to save persona selection');
      }

      onSelect(selectedId);
    } catch (err) {
      console.error('Error saving persona:', err);
      setError('Failed to save selection. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading personas...</p>
      </div>
    );
  }

  if (error && personas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const selectedPersona = personas.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Your AI Persona</h2>
        <p className="text-muted-foreground mt-2">
          Select a persona to shape your AI assistant&apos;s personality and delivery style
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map((persona) => (
          <Card
            key={persona.id}
            className={`cursor-pointer transition-all ${
              selectedId === persona.id
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleSelect(persona.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{persona.name}</CardTitle>
                {selectedId === persona.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
              {persona.is_default && (
                <span className="text-xs bg-secondary px-2 py-0.5 rounded w-fit">
                  Default
                </span>
              )}
            </CardHeader>
            <CardContent>
              <CardDescription>{persona.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="text-center text-destructive text-sm">{error}</p>
      )}

      <div className="flex justify-center">
        <Button
          onClick={handleConfirm}
          disabled={!selectedId || submitting}
          size="lg"
        >
          {submitting
            ? 'Saving...'
            : `Continue with ${selectedPersona?.name || 'Selected Persona'}`}
        </Button>
      </div>
    </div>
  );
}
