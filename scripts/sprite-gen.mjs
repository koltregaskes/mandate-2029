// Generate game sprites with transparent backgrounds: images_generate -> images_remove_background -> download PNG.
//   node sprite-gen.mjs <jobs.json>
// jobs.json = [{ id, prompt, aspectRatio?, removeBackground?, out }]
import fs from 'node:fs';
import path from 'node:path';

const access = JSON.parse(fs.readFileSync('W:/.magnific-token.json', 'utf8')).access_token;
const ENDPOINT = 'https://mcp.magnific.com/';
let sessionId = null;

async function rpc(method, params, { notify = false } = {}) {
  const headers = { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream', 'authorization': `Bearer ${access}` };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  const body = notify ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id: Math.floor(Math.random() * 1e6), method, params };
  const res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body) });
  const sid = res.headers.get('mcp-session-id'); if (sid) sessionId = sid;
  if (notify) return null;
  const ct = res.headers.get('content-type') || ''; const text = await res.text();
  if (!res.ok) { console.error(`HTTP ${res.status}:`, text.slice(0, 300)); process.exit(1); }
  if (ct.includes('text/event-stream')) {
    const out = [];
    for (const line of text.split('\n')) if (line.startsWith('data:')) { try { out.push(JSON.parse(line.slice(5).trim())); } catch {} }
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
async function call(tool, args) { return structured(await rpc('tools/call', { name: tool, arguments: args })); }
function firstId(sc) { const cr = sc.creations || (sc.creation ? [sc.creation] : []); return cr[0]?.identifier || null; }
async function waitFor(id) {
  for (let i = 0; i < 30; i++) {
    const sc = await call('creations_wait', { identifiers: [id], timeoutSeconds: 25 });
    const r = (sc.results || []).find((x) => x.identifier === id);
    if (r && r.status === 'completed') return r.results?.url || null;
    if (r && (r.status === 'failed' || r.status === 'error')) return null;
  }
  return null;
}
async function download(url, out) {
  const res = await fetch(url); if (!res.ok) throw new Error('dl ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf); return buf.length;
}

const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'sprite-gen', version: '1.0.0' } });
await rpc('notifications/initialized', {}, { notify: true });

for (const job of jobs) {
  const g = await call('images_generate', { prompt: job.prompt, aspectRatio: job.aspectRatio || '4:3', count: 1 });
  const genId = firstId(g);
  if (!genId) { console.log(job.id, 'GEN FAILED', JSON.stringify(g).slice(0, 200)); continue; }
  const genUrl = await waitFor(genId);
  console.log(job.id, 'generated', genId, genUrl ? 'ok' : 'no-url');
  if (job.removeBackground === false) { if (genUrl) console.log(job.id, 'saved', (await download(genUrl, job.out) / 1024).toFixed(0) + 'KB'); continue; }
  const rb = await call('images_remove_background', { creationIdentifier: genId });
  const rbId = firstId(rb);
  if (!rbId) { console.log(job.id, 'REMOVE-BG FAILED', JSON.stringify(rb).slice(0, 200)); if (genUrl) await download(genUrl, job.out); continue; }
  const rbUrl = await waitFor(rbId);
  if (rbUrl) console.log(job.id, 'saved cutout', (await download(rbUrl, job.out) / 1024).toFixed(0) + 'KB ->', job.out);
  else console.log(job.id, 'remove-bg no url');
}
console.log('DONE');
