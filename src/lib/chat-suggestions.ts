import { DYNAMIC_CHAT_SUGGESTIONS } from './knowledge-generated';

export interface ChatSuggestion {
  icon: string;
  title: string;
  prompt: string;
}

/**
 * Returns dynamically generated chat suggestions from compiled content.
 * Fully content-driven — no static JSON config required.
 */
export function getChatSuggestions(): ChatSuggestion[] {
  return DYNAMIC_CHAT_SUGGESTIONS;
}
