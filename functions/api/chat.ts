/**
 * Cloudflare Pages / Workers Function: /api/chat
 * Handles streaming AI chat responses at the Edge.
 */

import { SYSTEM_PROMPT } from '../../src/lib/knowledge';

interface MessagePayload {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface EventContext {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequestPost(context: EventContext): Promise<Response> {
  const { request, env } = context;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as MessagePayload;
    let userMessage = typeof body.message === 'string' ? body.message.trim() : '';

    // Sanitize message from harmful control characters
    userMessage = userMessage.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'Message cannot be empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (userMessage.length > 1000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 1000 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aiProvider = (env.AI_PROVIDER || 'gemini').toLowerCase();
    const geminiKey = env.GEMINI_API_KEY;
    const geminiModel = env.GEMINI_MODEL || 'gemini-2.5-flash';

    const openaiKey = env.OPENAI_API_KEY;
    const openaiBaseUrl = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const openaiModel = env.OPENAI_MODEL || 'gpt-4o-mini';

    const encoder = new TextEncoder();

    // Check if API key is provided
    if (aiProvider === 'gemini' && !geminiKey) {
      const fallbackStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                text: 'Hello! The AI assistant feature is active, but the API Key (`GEMINI_API_KEY`) is not yet set on the server environment. In the meantime, you can explore the portfolio on the [Resume](/resume) and [Projects](/projects) pages.',
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(fallbackStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    if (aiProvider === 'openai_compatible' && !openaiKey) {
      const fallbackStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                text: 'Hello! The `openai_compatible` provider is selected, but `OPENAI_API_KEY` is not yet configured in the server environment.',
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(fallbackStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // ── Gemini Provider ─────────────────────────────────────────────────────
    if (aiProvider === 'gemini') {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${geminiKey}`;

      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(body.history)) {
        for (const item of body.history.slice(-4)) {
          if (item && typeof item.content === 'string' && item.content.trim()) {
            contents.push({
              role: item.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: item.content.slice(0, 1000) }],
            });
          }
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 650,
          },
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', errorText);

        const errorStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  text: 'Sorry, an error occurred while contacting the AI service. Please try again in a moment.',
                })}\n\n`
              )
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });

        return new Response(errorStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      }

      const stream = new ReadableStream({
        async start(controller) {
          const reader = geminiResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  const jsonStr = trimmed.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const candidateText =
                      parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (candidateText) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ text: candidateText })}\n\n`)
                      );
                    }
                  } catch {
                    // Ignore parse error
                  }
                }
              }
            }

            if (buffer.trim().startsWith('data: ')) {
              try {
                const parsed = JSON.parse(buffer.trim().slice(6));
                const candidateText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (candidateText) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: candidateText })}\n\n`)
                  );
                }
              } catch {
                // Ignore
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (err) {
            console.error('Stream processing error:', err);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // ── OpenAI Compatible Provider ──────────────────────────────────────────
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...((body.history || []).slice(-6).map((h) => ({
        role: h.role,
        content: h.content,
      }))),
      { role: 'user', content: userMessage },
    ];

    const openaiResponse = await fetch(`${openaiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        stream: true,
        temperature: 0.4,
        max_tokens: 800,
        messages,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI Compatible API error:', errorText);

      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                text: 'Sorry, an error occurred while contacting the AI service. Please try again in a moment.',
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(errorStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  const content = parsed?.choices?.[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`)
                    );
                  }
                } catch {
                  // Ignore
                }
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('Stream processing error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Unexpected error in /api/chat:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
