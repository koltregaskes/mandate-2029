// Check that the review shortcut (?review=1&state=result) only works on a
// local build or with the dev flag, and that normal play is unaffected (KOL-6996).
//
// Files are served through Playwright request routing, so no port is opened.
// The same files are loaded under a "hosted" origin and a localhost origin.
//
// Usage: node scripts/test-review-gate.mjs
// Env:   PLAYWRIGHT_PREFIX  folder that holds node_modules/playwright, when
//                           Playwright is not a dependency of this repo.
//        SMOKE_CHROMIUM_PATH  optional Chromium executable (same as ci-smoke.mjs).
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFrom = createRequire(
  process.env.PLAYWRIGHT_PREFIX
    ? path.join(path.resolve(process.env.PLAYWRIGHT_PREFIX), "noop.js")
    : import.meta.url,
);
const { chromium } = requireFrom("playwright");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".ico": "image/x-icon",
};

const HOSTED = "https://koltregaskes.github.io/mandate-2029/";
const LOCAL = "http://localhost:8011/";
// The Long Campaign opens in August 2027; the run-in and result presets jump to 2029.
const OPENING = "August 2027";

async function serve(route) {
  const url = new URL(route.request().url());
  const base = url.origin === new URL(HOSTED).origin ? "/mandate-2029/" : "/";
  let rel = decodeURIComponent(url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname.slice(1));
  if (!rel || rel.endsWith("/")) rel += "index.html";
  const file = path.join(root, rel);
  if (!file.startsWith(root)) return route.fulfill({ status: 403, body: "" });
  try {
    const body = await readFile(file);
    return route.fulfill({ status: 200, body, contentType: types[path.extname(file).toLowerCase()] ?? "application/octet-stream" });
  } catch {
    return route.fulfill({ status: 404, body: "" });
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SMOKE_CHROMIUM_PATH || undefined,
});
const results = [];

async function check(name, base, query, { devFlag = false, expectResult, expectDate }) {
  const context = await browser.newContext();
  await context.route(`${new URL(HOSTED).origin}/**`, serve);
  await context.route(`${new URL(LOCAL).origin}/**`, serve);
  // Anything else (fonts, CDNs) is blocked so the test stays offline.
  await context.route(/^(?!https:\/\/koltregaskes\.github\.io|http:\/\/localhost:8011).*/, (r) => r.abort());
  if (devFlag) {
    await context.addInitScript(() => window.localStorage.setItem("mandate-2029-dev-review", "1"));
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + query, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => ({
    modalVisible: !document.getElementById("electionModal")?.classList.contains("hidden"),
    title: document.getElementById("electionResultTitle")?.textContent?.trim(),
    date: document.getElementById("currentDate")?.textContent?.trim(),
  }));
  const pass = state.modalVisible === expectResult
    && (expectDate === undefined || state.date === expectDate)
    && errors.length === 0;
  results.push({ name, pass, ...state, errors: errors.length });
  await context.close();
}

await check("hosted: ?state=result does not skip to the result", HOSTED, "?autostart=1&review=1&state=result", { expectResult: false, expectDate: OPENING });
await check("hosted: ?state=run-in does not apply the late preset", HOSTED, "?autostart=1&review=1&state=run-in", { expectResult: false, expectDate: OPENING });
await check("hosted + dev flag: review result still works", HOSTED, "?autostart=1&review=1&state=result", { devFlag: true, expectResult: true });
await check("localhost: review result still works", LOCAL, "?autostart=1&review=1&state=result", { expectResult: true });
await check("hosted: normal play boots with no result", HOSTED, "?autostart=1", { expectResult: false, expectDate: OPENING });

await browser.close();
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}  (result modal ${r.modalVisible ? "shown" : "hidden"}, date "${r.date}", page errors ${r.errors})`);
}
const failed = results.filter((r) => !r.pass).length;
console.log(`${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
