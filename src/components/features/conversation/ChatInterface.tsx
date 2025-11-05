/**
 * ChatInterface Component
 *
 * Main chat UI component with message input, validation, and API integration.
 * Implements all 5 critical requirements for Story 1.5.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createConversationStore } from '@/lib/stores/conversation-store';
import { generateMessageId, ERROR_MESSAGES } from '@/lib/utils/message-helpers';
import { MessageList } from './MessageList';
import { TopicConfirmation } from './TopicConfirmation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface ChatInterfaceProps {
  projectId: string;
}

// Maximum message length (Critical Requirement #4)
const MAX_MESSAGE_LENGTH = 5000;

export function ChatInterface({ projectId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [charCount, setCharCount] = useState(0);

  // Topic Confirmation Dialog State (Story 1.7)
  const [showTopicConfirmation, setShowTopicConfirmation] = useState(false);
  const [extractedTopic, setExtractedTopic] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const router = useRouter();
  const { toast } = useToast();

  // Create store instance for this project (Critical Requirement #1: Per-Project State Isolation)
  // FIX: Use useMemo to prevent recreation on every render
  const useConversationStore = useMemo(
    () => createConversationStore(projectId),
    [projectId]
  );
  const { messages, isLoading, error, addMessage, setLoading, setError, clearError } =
    useConversationStore();

  const handleSendMessage = async () => {
    const trimmedMessage = input.trim();

    if (!trimmedMessage) {
      setError('Message cannot be empty');
      return;
    }

    // Input length validation (Critical Requirement #4: 5000 Character Validation)
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setError(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
      return;
    }

    // Clear input and errors
    setInput('');
    setCharCount(0);
    clearError();

    // Optimistic UI: Add user message immediately
    const userMessage = {
      id: generateMessageId(), // Critical Requirement #2: Browser-Safe UUID Generation
      role: 'user' as const,
      content: trimmedMessage,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);

    // AbortController with 30s timeout (Critical Requirement #3: 30s Timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      setLoading(true);

      // Call API endpoint with timeout
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message: trimmedMessage }),
        signal: controller.signal, // Attach abort signal
      });

      clearTimeout(timeoutId); // Clear timeout on success

      if (!response.ok) {
        const errorData = await response.json();

        // Extract error code and map to user-friendly message (Critical Requirement #5: Error Code Mapping)
        const errorCode = errorData?.error?.code;
        const errorMessage = ERROR_MESSAGES[errorCode] || errorData.error?.message || 'An unexpected error occurred';

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage = {
        id: data.data.messageId,
        role: 'assistant' as const,
        content: data.data.response,
        timestamp: data.data.timestamp,
      };
      addMessage(assistantMessage);

      // Check for topic detection (Story 1.7)
      if (data.data.topicDetected && data.data.extractedTopic) {
        setExtractedTopic(data.data.extractedTopic);
        setShowTopicConfirmation(true);
      }

    } catch (err) {
      clearTimeout(timeoutId); // Clear timeout on error

      // Handle timeout errors specifically (Critical Requirement #3: Timeout Error Handling)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out after 30 seconds. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setCharCount(value.length);
    // Clear error when user starts typing
    if (error) clearError();
  };

  /**
   * Handle topic confirmation
   * Updates project with topic, name, and advances to voice step
   * Story 1.7 - AC3
   */
  const handleConfirm = async () => {
    if (!extractedTopic) return;

    setIsConfirming(true);

    try {
      // Truncate topic to 50 chars for project name
      const projectName = extractedTopic.length > 50
        ? extractedTopic.substring(0, 50).replace(/\s+\S*$/, '') // Truncate to last complete word
        : extractedTopic;

      // Update project via API
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: extractedTopic,
          name: projectName,
          currentStep: 'voice'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save topic');
      }

      // Success - close dialog and navigate to voice selection
      setShowTopicConfirmation(false);
      setExtractedTopic(null);

      // Show success toast
      toast({
        title: 'Topic Confirmed',
        description: `Ready to select voice for: ${projectName}`,
      });

      // Navigate to voice selection page
      router.push(`/projects/${projectId}/voice`);
    } catch (err) {
      console.error('Error confirming topic:', err);

      // Show error toast
      toast({
        title: 'Failed to Save Topic',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });

      // Keep dialog open so user can retry
    } finally {
      setIsConfirming(false);
    }
  };

  /**
   * Handle topic edit
   * Closes dialog and focuses input for continued conversation
   * Story 1.7 - AC4
   */
  const handleEdit = () => {
    setShowTopicConfirmation(false);
    setExtractedTopic(null);

    // Focus input field after a brief delay (allow dialog to close)
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Character count display (Critical Requirement #4: Character Count with Visual Feedback)
  const showCharCount = charCount > 4500;
  const charCountColor = charCount > 4900 ? 'text-red-500' : charCount > 4500 ? 'text-yellow-500' : 'text-muted-foreground';

  return (
    <div className="flex flex-col h-full" data-testid="chat-interface" data-test-ac="AC-1.5.1">
      {/* Message Display Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Error Display */}
      {error && (
        <Alert
          variant="destructive"
          className="mx-4 mb-2"
          role="alert"
          data-testid="error-alert"
          data-test-ac="AC-1.5.6"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Input Area */}
      <div className="border-t p-4" data-testid="input-area">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              ref={inputRef}
              data-testid="chat-message-input"
              data-test-ac="AC-1.5.1"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe your video idea..."
              disabled={isLoading}
              className="flex-1"
              aria-label="Message input"
              maxLength={MAX_MESSAGE_LENGTH}
            />
            {showCharCount && (
              <p
                className={`text-xs mt-1 ${charCountColor}`}
                data-testid="character-count"
                data-test-ac="AC-1.5.5"
              >
                {charCount} / {MAX_MESSAGE_LENGTH} characters
              </p>
            )}
          </div>
          <Button
            data-testid="chat-send-button"
            data-test-ac="AC-1.5.1"
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Topic Confirmation Dialog (Story 1.7) */}
      <TopicConfirmation
        isOpen={showTopicConfirmation}
        topic={extractedTopic}
        onConfirm={handleConfirm}
        onEdit={handleEdit}
        isLoading={isConfirming}
      />
    </div>
  );
}
