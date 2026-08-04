// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { buildKnowledgeFile } from './scripts/generate-knowledge.js';

/**
 * Vite plugin to provide site.json from LOCAL_CONTENT_PATH or a fallback if the content submodule is not checked out
 * @returns {import('vite').Plugin}
 */
function fallbackSiteJsonPlugin() {
  const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
  const localContentPath = env.LOCAL_CONTENT_PATH;
  return {
    name: 'fallback-site-json',
    resolveId(id, importer) {
      if (id.includes('content/config') && id.endsWith('site.json')) {
        if (localContentPath) {
          const overridePath = path.join(localContentPath, 'config', 'site.json');
          if (fs.existsSync(overridePath)) {
            return overridePath;
          }
        }
        if (importer) {
          const resolvedPath = path.resolve(path.dirname(importer), id);
          if (!fs.existsSync(resolvedPath)) {
            return '\\0virtual:site.json';
          }
        }
      }
      if (id.includes('content/assets') && id.endsWith('.pdf')) {
        if (localContentPath) {
          const overridePath = path.join(localContentPath, 'assets', path.basename(id));
          if (fs.existsSync(overridePath)) {
            return overridePath;
          }
        }
        if (importer) {
          const resolvedPath = path.resolve(path.dirname(importer), id);
          if (!fs.existsSync(resolvedPath)) {
            return '\\0virtual:missing-pdf';
          }
        }
      }
      return null;
    },
    load(id) {
      if (id === '\\0virtual:site.json') {
        return JSON.stringify({ 
          name: "Fallback Site", 
          tagline: "Fallback Tagline", 
          url: "https://example.com", 
          contact: {} 
        });
      }
      if (id === '\\0virtual:missing-pdf') {
        return 'export default "/missing-asset.pdf";';
      }
      return null;
    },
  };
}

/**
 * Astro integration to automatically compile AI knowledge from src/content on build and dev
 * @returns {import('astro').AstroIntegration}
 */
function knowledgeAutoSyncIntegration() {
  const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
  const localContentPath = env.LOCAL_CONTENT_PATH;

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
          const isContentFile = filePath && (
            filePath.includes('/src/content/') || 
            (localContentPath && filePath.startsWith(localContentPath))
          );
          if (isContentFile) {
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
                  const chatModule = await server.ssrLoadModule('/src/lib/chat-handler.ts');
                  const response = await chatModule.handleChatRequest(request, env);

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
    plugins: [tailwindcss(), devApiChatPlugin(), fallbackSiteJsonPlugin()],
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