/**
 * MessageList Component
 *
 * Displays conversation history with role-based styling and auto-scroll.
 * Shows loading indicator during API calls.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Message } from '@/lib/stores/conversation-store';
import { User, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messageEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Detect if user has manually scrolled up
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Consider "at bottom" if within 100px threshold
    setShouldAutoScroll(distanceFromBottom < 100);
  };

  // Auto-scroll to bottom only if user is near bottom (UX improvement)
  useEffect(() => {
    if (shouldAutoScroll) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, shouldAutoScroll]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full text-muted-foreground"
        data-testid="empty-state"
        data-test-ac="AC-1.5.2"
      >
        <p>Start a conversation to discover your video topic...</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto p-4 space-y-4"
      data-testid="message-list"
      data-test-ac="AC-1.5.2"
      data-test-auto-scroll={shouldAutoScroll}
    >
      {messages.map((message) => (
        <div
          key={message.id}
          data-testid={`message-${message.id}`}
          data-test-role={message.role}
          data-test-ac="AC-1.5.2"
          className={cn(
            'flex gap-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
          role="article"
          aria-label={`${message.role} message`}
        >
          {message.role === 'assistant' && (
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
              aria-label="Assistant avatar"
            >
              <Bot className="w-5 h-5 text-primary" />
            </div>
          )}

          <div
            className={cn(
              'max-w-[70%] rounded-lg px-4 py-2',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            )}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <p
              className={cn(
                'text-xs mt-1',
                message.role === 'user'
                  ? 'text-primary-foreground/70'
                  : 'text-muted-foreground'
              )}
            >
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </p>
          </div>

          {message.role === 'user' && (
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              aria-label="User avatar"
            >
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div
          className="flex gap-3 justify-start"
          data-testid="loading-indicator"
          data-test-ac="AC-1.5.4"
          role="status"
          aria-live="polite"
          aria-label="Loading assistant response"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Assistant is thinking...</span>
          </div>
        </div>
      )}

      <div ref={messageEndRef} />
    </div>
  );
}
