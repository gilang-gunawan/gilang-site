// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import { buildKnowledgeFile } from './scripts/generate-knowledge.js';

/**
 * Astro integration to automatically compile AI knowledge from src/content on build and dev
 * @returns {import('astro').AstroIntegration}
 */
function knowledgeAutoSyncIntegration() {
  return {
    name: 'knowledge-auto-sync',
    hooks: {
      'astro:config:setup': () => {
        try {
          buildKnowledgeFile();
        } catch (err) {
          console.error('[knowledge-sync] Failed to build knowledge file:', err);
        }
      },
      'astro:server:setup': ({ server }) => {
        server.watcher.on('all', (event, filePath) => {
          if (filePath && filePath.includes('/src/content/')) {
            try {
              buildKnowledgeFile();
            } catch (err) {
              console.error('[knowledge-sync] Failed to update knowledge file:', err);
            }
          }
        });
      },
    },
  };
}

/**
 * Vite dev plugin to handle /api/chat during local `astro dev`
 * @returns {import('vite').Plugin}
 */
function devApiChatPlugin() {
  return {
    name: 'dev-api-chat-plugin',
    configureServer(server) {
      server.middlewares.use(
        /**
         * @param {import('http').IncomingMessage} req
         * @param {import('http').ServerResponse} res
         * @param {() => void} next
         */
        async (req, res, next) => {
          if (req.url === '/api/chat' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', (/** @type {Buffer | string} */ chunk) => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const request = new Request(`http://${req.headers.host}${req.url}`, {
                    method: 'POST',
                    // @ts-ignore
                    headers: req.headers,
                    body: body || undefined,
                  });
                  const loadedEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
                  const env = { ...process.env, ...loadedEnv };
                  
                  // Dynamically load the TypeScript edge handler via Vite SSR
                  const chatModule = await server.ssrLoadModule('/functions/api/chat.ts');
                  const response = await chatModule.onRequestPost({ request, env });

                  res.statusCode = response.status;
                  response.headers.forEach((/** @type {string} */ value, /** @type {string} */ key) => {
                    res.setHeader(key, value);
                  });
                  if (response.body) {
                    const reader = response.body.getReader();
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      res.write(Buffer.from(value));
                    }
                  }
                  res.end();
                } catch (innerErr) {
                  console.error('Chat processing error:', innerErr);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Chat processing error' }));
                }
              });
            } catch (err) {
              console.error('Dev API Error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Dev Server API Error' }));
            }
            return;
          }
          next();
        }
      );
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://gilang.web.id',

  vite: {
    plugins: [tailwindcss(), devApiChatPlugin()],
  },

  integrations: [mdx(), sitemap(), knowledgeAutoSyncIntegration()],

  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
});