/**
 * Message structure for LLM conversations
 *
 * @property role - The role of the message sender (system, user, or assistant)
 * @property content - The text content of the message
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * LLMProvider interface defines the contract for all LLM provider implementations
 *
 * This abstraction enables the application to interact with different LLM services
 * (Ollama, OpenAI, Anthropic, etc.) through a unified interface, following the
 * Strategy Pattern for runtime provider selection.
 *
 * @example
 * ```typescript
 * const provider = createLLMProvider();
 * const response = await provider.chat(
 *   [{ role: 'user', content: 'Hello!' }],
 *   'You are a helpful assistant.'
 * );
 * ```
 */
export interface LLMProvider {
  /**
   * Send a chat message to the LLM and receive a response
   *
   * @param messages - Array of conversation messages including user and assistant turns
   * @param systemPrompt - Optional system prompt to prepend to the conversation
   * @returns Promise resolving to the assistant's response as a string
   * @throws Error if the LLM service is unavailable or returns an error
   */
  chat(messages: Message[], systemPrompt?: string): Promise<string>;
}
