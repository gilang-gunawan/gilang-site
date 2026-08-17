/**
 * Cloudflare Worker Entrypoint
 * Handles API routes (e.g. /api/chat) and serves static assets from ./dist
 */

import { handleChatRequest } from './lib/chat-handler';

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route /health
    if (url.pathname === '/health') {
      if (request.method === 'GET' || request.method === 'HEAD') {
        return new Response(
          request.method === 'HEAD' ? null : JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Route /api/chat
    if (url.pathname === '/api/chat') {
      if (request.method === 'POST') {
        return handleChatRequest(request, env);
      }
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Serve static assets via Cloudflare Assets binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
