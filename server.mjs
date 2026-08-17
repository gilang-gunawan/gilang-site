import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleChatRequest } from './src/lib/chat-handler.ts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.xml': 'application/xml',
    '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

async function serveStatic(pathname, res) {
    let filePath = join(DIST_DIR, decodeURIComponent(pathname));

    // Directory or extensionless request -> try index.html
    if (pathname.endsWith('/') || !extname(filePath)) {
        filePath = join(filePath, pathname.endsWith('/') ? 'index.html' : '', pathname.endsWith('/') ? '' : '.html');
    }

    try {
        const data = await readFile(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
        return true;
    } catch {
        return false;
    }
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Route: /api/chat
    if (url.pathname === '/api/chat') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }

        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
            try {
                const request = new Request(url, {
                    method: 'POST',
                    headers: req.headers,
                    body: body || undefined,
                });

                const response = await handleChatRequest(request, process.env);

                res.writeHead(response.status, Object.fromEntries(response.headers));

                if (response.body) {
                    const reader = response.body.getReader();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        res.write(Buffer.from(value));
                    }
                }
                res.end();
            } catch (err) {
                console.error('Chat handler error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // Static assets
    const servedIndex = await serveStatic(url.pathname, res);
    if (servedIndex) return;

    // SPA-style fallback -> try index.html at that path, else root index.html
    const servedFallback = await serveStatic('/index.html', res);
    if (!servedFallback) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});