// Image -> 3D GLB via Magnific (images_generate -> models3d_generate). node model-gen.mjs <out.glb>
import fs from 'node:fs';
import path from 'node:path';
const access = JSON.parse(fs.readFileSync('W:/.magnific-token.json', 'utf8')).access_token;
const ENDPOINT = 'https://mcp.magnific.com/';
let sessionId = null;
async function rpc(method, params, { notify = false } = {}) {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${access}` };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  const body = notify ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id: Math.floor(Math.random() * 1e6), method, params };
  const res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body) });
  const sid = res.headers.get('mcp-session-id'); if (sid) sessionId = sid;
  if (notify) return null;
  const ct = res.headers.get('content-type') || ''; const text = await res.text();
  if (!res.ok) { console.error('HTTP', res.status, text.slice(0, 300)); process.exit(1); }
  if (ct.includes('text/event-stream')) { const out = []; for (const l of text.split('\n')) if (l.startsWith('data:')) { try { out.push(JSON.parse(l.slice(5).trim())); } catch {} } return out.find((m) => m.id !== undefined) || out[out.length - 1]; }
  return JSON.parse(text);
}
function structured(msg) { const r = msg.result || msg; if (r.structuredContent) return r.structuredContent; const t = r.content?.find((c) => c.type === 'text' && c.text.trim().startsWith('{'))?.text; if (t) { try { return JSON.parse(t); } catch {} } return r; }
async function call(tool, args) { return structured(await rpc('tools/call', { name: tool, arguments: args })); }
function firstId(sc) { const cr = sc.creations || (sc.creation ? [sc.creation] : []); return cr[0]?.identifier || null; }
async function waitFor(id, label) { for (let i = 0; i < 40; i++) { const sc = await call('creations_wait', { identifiers: [id], timeoutSeconds: 25 }); const r = (sc.results || []).find((x) => x.identifier === id); if (r && r.status === 'completed') return r.results?.url || null; if (r && (r.status === 'failed' || r.status === 'error')) { console.log(label, 'FAILED'); return null; } console.log(label, 'still', r?.status || '...', i); } return null; }
async function download(url, out) { const res = await fetch(url); if (!res.ok) throw new Error('dl ' + res.status); const buf = Buffer.from(await res.arrayBuffer()); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf); return buf.length; }

const out = process.argv[2] || 'W:/repos/_My Games/_REFERENCE/3d-proof/car.glb';
const prompt = 'A sleek modern concept sports car, the entire vehicle fully visible, three-quarter front view, glossy deep red metallic paint, clean studio product photograph, plain seamless light grey background, soft even studio lighting, centred, sharp detail, no text, no watermark, no people';
await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'model-gen', version: '1.0.0' } });
await rpc('notifications/initialized', {}, { notify: true });
const g = await call('images_generate', { prompt, aspectRatio: '1:1', count: 1 });
const imgId = firstId(g); console.log('image queued', imgId);
const imgUrl = await waitFor(imgId, 'image');
if (imgUrl) await download(imgUrl, out.replace(/\.glb$/, '-source.jpg'));
console.log('image done', imgUrl ? 'ok' : 'NO URL');
const m = await call('models3d_generate', { creationIdentifier: imgId, model: 'tripo-v31', textureQuality: 'detailed' });
const mId = firstId(m); console.log('model queued', mId, mId ? '' : JSON.stringify(m).slice(0, 250));
if (mId) { const mUrl = await waitFor(mId, 'model'); if (mUrl) console.log('GLB saved', (await download(mUrl, out) / 1024).toFixed(0) + 'KB ->', out); else console.log('model NO URL'); }
console.log('DONE');
