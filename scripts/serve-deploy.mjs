/**
 * Serves deploy/ the way Xserver's static hosting does: index.html for directories, a redirect to the
 * trailing slash, 404.html for unknown paths, gzip for text and byte ranges for audio. Nothing else in the repo is reachable.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(fileURLToPath(new URL('../deploy/', import.meta.url)));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
};
const TEXT = new Set(['.html', '.css', '.js', '.svg', '.xml', '.txt']);

async function isDirectory(path) {
  return (await stat(path).catch(() => null))?.isDirectory() ?? false;
}

async function send(request, response, path, status = 200) {
  const extension = extname(path);
  let body = await readFile(path);
  const headers = {
    'Content-Type': TYPES[extension] ?? 'application/octet-stream',
    'Cache-Control': path.includes('/_astro/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
  headers['Accept-Ranges'] = 'bytes';
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');
  if (range && (range[1] || range[2])) {
    const size = body.length;
    const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    response.writeHead(206, headers);
    response.end(body.subarray(start, end + 1));
    return;
  }
  if (TEXT.has(extension) && /gzip/.test(request.headers['accept-encoding'] ?? '')) {
    body = gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
  }
  response.writeHead(status, headers);
  response.end(body);
}

export function startServer(port = 4322) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    const target = join(ROOT, relative);
    try {
      if (!target.startsWith(ROOT) || relative.split('/').some((part) => part.startsWith('.') && part.length > 1)) {
        throw new Error('hidden');
      }
      if (await isDirectory(target)) {
        if (!url.pathname.endsWith('/')) {
          response.writeHead(301, { Location: `${url.pathname}/${url.search}` });
          response.end();
          return;
        }
        await send(request, response, join(target, 'index.html'));
        return;
      }
      await send(request, response, target);
    } catch {
      await send(request, response, join(ROOT, '404.html'), 404);
    }
  });
  return new Promise((done) => server.listen(port, '127.0.0.1', () => done(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4322);
  await startServer(port);
  console.log(`deploy/ -> http://127.0.0.1:${port}/`);
}
