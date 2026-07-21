// Magnific batch generator for Mandate 2029.
// Queues a list of jobs, long-polls until terminal, downloads each asset, writes a manifest.
//
//   node mag-gen.mjs <jobs.json> [manifest.json]
//
// jobs.json = [{ id, tool, args, out }] or { id, identifier, out } to download an already-queued creation.
//   tool   = magnific tool name (images_generate | audio_tts | audio_music_generate | images_upscale | ...)
//   args   = arguments object for that tool
//   out    = absolute path to write the downloaded asset to
//
// Token is the harness bearer saved by W:\magnific-auth.mjs (audience mcp.magnific.com).

import fs from 'node:fs';
import path from 'node:path';

const TOKEN_FILE = 'W:/.magnific-token.json';
const ENDPOINT = 'https://mcp.magnific.com/';
const access = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')).access_token;
if (!access) { console.error('no access_token'); process.exit(1); }

let sessionId = null;

async function rpc(method, params, { notify = false } = {}) {
  const headers = {
    'content-type': 'application/json',
    'accept': 'application/json, text/event-stream',
    'authorization': `Bearer ${access}`,
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  const body = notify
    ? { jsonrpc: '2.0', method, params }
    : { jsonrpc: '2.0', id: Math.floor(Math.random() * 1e6), method, params };
  const res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body) });
  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;
  if (notify) return null;
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!res.ok) { console.error(`HTTP ${res.status}:`, text.slice(0, 600)); process.exit(1); }
  if (ct.includes('text/event-stream')) {
    const out = [];
    for (const line of text.split('\n')) {
      if (line.startsWith('data:')) { try { out.push(JSON.parse(line.slice(5).trim())); } catch {} }
    }
    return out.find((m) => m.id !== undefined) || out[out.length - 1];
  }
  return JSON.parse(text);
}

function structured(msg) {
  const r = msg.result || msg;
  if (r.structuredContent) return r.structuredContent;
  const txt = r.content?.find((c) => c.type === 'text' && c.text.trim().startsWith('{'))?.text;
  if (txt) { try { return JSON.parse(txt); } catch {} }
  return r;
}

async function call(tool, args) {
  const r = await rpc('tools/call', { name: tool, arguments: args });
  return structured(r);
}

async function download(url, out) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} for ${out}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return buf.length;
}

const jobsPath = process.argv[2];
const manifestPath = process.argv[3] || jobsPath.replace(/\.json$/, '-manifest.json');
const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));

await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'mandate-mag-gen', version: '1.0.0' } });
await rpc('notifications/initialized', {}, { notify: true });

// 1. queue
const byId = new Map(); // identifier -> { job, url, status, bytes }
for (const job of jobs) {
  if (job.identifier) {
    byId.set(job.identifier, { job, status: 'queued' });
    console.error(`[queue] ${job.id} -> existing ${job.identifier}`);
    continue;
  }
  const sc = await call(job.tool, job.args);
  const cr = sc.creations || (sc.creation ? [sc.creation] : []);
  if (!cr.length) { console.error(`[queue] ${job.id} -> NO creation`, JSON.stringify(sc).slice(0, 300)); continue; }
  byId.set(cr[0].identifier, { job, status: cr[0].status || 'queued' });
  console.error(`[queue] ${job.id} -> ${cr[0].identifier} (${cr[0].tool || job.tool}, eta ${cr[0].expectTime || '?'}s)`);
}

// 2. poll until terminal
const unresolved = () => [...byId.entries()].filter(([, v]) => !v.url && v.status !== 'failed').map(([k]) => k);
for (let round = 0; round < 30 && unresolved().length; round++) {
  const batch = unresolved().slice(0, 8);
  const sc = await call('creations_wait', { identifiers: batch, timeoutSeconds: 25 });
  for (const r of (sc.results || [])) {
    const rec = byId.get(r.identifier);
    if (!rec) continue;
    rec.status = r.status;
    if (r.status === 'completed') {
      rec.url = r.results?.url || r.results?.audioUrl || null;
      if (!rec.url) { // fallback to creations_get TOON parse
        const g = await rpc('tools/call', { name: 'creations_get', arguments: { creationIdentifier: r.identifier } });
        const txt = (g.result || g).content?.map((c) => c.text).join('\n') || '';
        rec.url = (txt.match(/^url:\s*"([^"]+)"/m) || [])[1] || null;
      }
      console.error(`[done] ${rec.job.id} ${r.status}${rec.url ? '' : ' (no url!)'}`);
    } else if (r.status === 'failed' || r.status === 'error') {
      console.error(`[fail] ${rec.job.id} ${r.status}`);
    }
  }
}

// 3. download
const manifest = [];
for (const [identifier, rec] of byId) {
  let bytes = 0;
  try { if (rec.url) bytes = await download(rec.url, rec.job.out); } catch (e) { console.error(`[dl-err] ${rec.job.id}`, e.message); }
  manifest.push({ id: rec.job.id, identifier, status: rec.status, out: rec.job.out, bytes, url: rec.url || null });
  console.error(`[save] ${rec.job.id} ${bytes ? (bytes / 1024).toFixed(0) + 'KB -> ' + rec.job.out : 'NOT SAVED'}`);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.error(`\nmanifest -> ${manifestPath}`);
console.log(JSON.stringify(manifest, null, 2));
