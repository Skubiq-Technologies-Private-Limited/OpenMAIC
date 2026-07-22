#!/usr/bin/env node
/**
 * Serve the kiosk static export and emulate Flutter folder interception locally.
 *
 * Usage:
 *   node scripts/serve-kiosk-static.mjs [--port 8080] [--content-root ./data/classrooms]
 *
 * Requires: pnpm build:kiosk-static (packages/kiosk-playback/out)
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const args = process.argv.slice(2);
function readArg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const port = Number(readArg('--port', process.env.KIOSK_STATIC_PORT || '8080'));
const contentRoot = path.resolve(
  readArg('--content-root', process.env.KIOSK_CONTENT_ROOT || path.join(repoRoot, 'data', 'classrooms')),
);
const generationCacheRoot = path.resolve(
  readArg(
    '--generation-cache-root',
    process.env.GENERATION_CACHE_JSON_DIR || path.join(repoRoot, 'data', 'generation-cache'),
  ),
);
const staticRoot = path.resolve(
  readArg(
    '--static-root',
    process.env.KIOSK_STATIC_ROOT || path.join(repoRoot, 'packages', 'kiosk-playback', 'out'),
  ),
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function handleClassroomApi(url, res) {
  const courseId = url.searchParams.get('id');
  if (!courseId) {
    sendJson(res, 400, { success: false, error: 'Missing id' });
    return;
  }

  const filePath = path.join(contentRoot, `${courseId}.json`);
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { success: false, error: `Course not found: ${courseId}` });
    return;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const classroom = raw.classroom ?? raw;
  sendJson(res, 200, { success: true, classroom });
}

function resolveMediaFile(courseId, subPath) {
  const primary = path.join(contentRoot, courseId, ...subPath);
  const cacheFallback =
    subPath[0] === 'tts'
      ? path.join(generationCacheRoot, courseId, ...subPath)
      : null;

  for (const candidate of [primary, cacheFallback].filter(Boolean)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function handleClassroomMedia(pathname, res) {
  const match = pathname.match(/^\/api\/classroom-media\/([^/]+)\/(.+)$/);
  if (!match) {
    sendJson(res, 404, { success: false, error: 'Not found' });
    return;
  }

  const courseId = decodeURIComponent(match[1]);
  const subPath = match[2].split('/').map(decodeURIComponent);
  const subDir = subPath[0];

  if (!['media', 'audio', 'tts'].includes(subDir)) {
    sendJson(res, 404, { success: false, error: 'Invalid path' });
    return;
  }

  if (subPath.some((s) => s.includes('..'))) {
    sendJson(res, 400, { success: false, error: 'Invalid path' });
    return;
  }

  const filePath = resolveMediaFile(courseId, subPath);
  if (!filePath) {
    sendJson(res, 404, { success: false, error: 'File not found' });
    return;
  }

  streamFile(res, filePath);
}

function streamFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': String(stat.size),
    'Cache-Control': ext === '.json' ? 'private, max-age=60' : 'public, max-age=86400',
  });
  createReadStream(filePath).pipe(res);
}

function resolveStaticPath(pathname) {
  if (pathname === '/') return path.join(staticRoot, 'play.html');

  let rel = pathname;
  if (rel.endsWith('/')) rel += 'index.html';

  const candidate = path.join(staticRoot, rel);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;

  if (!path.extname(rel)) {
    const htmlPath = path.join(staticRoot, `${rel}.html`);
    if (fs.existsSync(htmlPath)) return htmlPath;
  }

  return null;
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const { pathname } = url;

    if (req.method === 'GET' && pathname === '/play') {
      const target = `/play.html${url.search}`;
      res.writeHead(302, { Location: target });
      res.end();
      return;
    }

    if (req.method === 'GET' && pathname === '/api/classroom') {
      handleClassroomApi(url, res);
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/api/classroom-media/')) {
      handleClassroomMedia(pathname, res);
      return;
    }

    const filePath = resolveStaticPath(pathname);
    if (filePath) {
      streamFile(res, filePath);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch (err) {
    console.error('[serve-kiosk-static]', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal error');
  }
});

if (!fs.existsSync(staticRoot)) {
  console.error(`Static root not found: ${staticRoot}`);
  console.error('Run: pnpm build:kiosk-static');
  process.exit(1);
}

server.listen(port, '127.0.0.1', () => {
  console.log(`Kiosk static server: http://127.0.0.1:${port}/play.html?courseId=YOUR_COURSE_ID`);
  console.log(`  static:  ${staticRoot}`);
  console.log(`  content: ${contentRoot}`);
  console.log(`  tts cache fallback: ${generationCacheRoot}`);
});
