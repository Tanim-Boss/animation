#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || 4173);
const video = path.join(ROOT, 'out', 'Python-Interpreter-Works-Bangla-1080p.mp4');
const subtitles = path.join(ROOT, 'data', 'subtitles-bn.srt');
const html = path.join(ROOT, 'preview.html');

function serveRange(req, res, file, type) {
  if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Build the video first with npm run build.'); return; }
  const size = fs.statSync(file).size;
  const range = req.headers.range;
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) { res.writeHead(416); res.end(); return; }
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
    res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}` });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...headers, 'Content-Length': size });
    fs.createReadStream(file).pipe(res);
  }
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    fs.createReadStream(html).pipe(res);
  } else if (pathname === '/video.mp4') {
    serveRange(req, res, video, 'video/mp4');
  } else if (pathname === '/subtitles.srt') {
    serveRange(req, res, subtitles, 'application/x-subrip; charset=utf-8');
  } else if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, video: fs.existsSync(video) }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found');
  }
});
server.listen(port, '0.0.0.0', () => console.log(`Video preview ready on 0.0.0.0:${port}`));
