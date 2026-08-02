/**
 * Cloudflare Pages Function: /api/chat
 */

import { handleChatRequest } from '../../src/lib/chat-handler';

interface EventContext {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequestPost(context: EventContext): Promise<Response> {
  return handleChatRequest(context.request, context.env);
}
