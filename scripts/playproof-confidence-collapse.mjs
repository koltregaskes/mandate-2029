// Headless play-proof of the third ending: a vote of no confidence (KOL-6997).
//
// Plays the real UI as a careless prime minister: pick a scenario and
// difficulty, push unpopular policy (tax up, services cut), always take the
// cheapest crisis response, and keep pressing Next Turn. The run passes when
// the term ends early on "Vote of No Confidence", and "Choose New Government"
// then starts a fresh, playable government.
//
// Math.random is seeded so every run is reproducible. Files are served through
// Playwright request routing, so no port is opened.
//
// Usage: node scripts/playproof-confidence-collapse.mjs [--difficulty=nightmare]
//        [--seeds=1,7,10] [--scenario=long-campaign] [--policy=austerity|squeeze|none]
//        [--choices=worst|cheapest]
// Env:   PLAYWRIGHT_PREFIX    folder that holds node_modules/playwright.
//        SMOKE_CHROMIUM_PATH  optional Chromium executable.
//        PLAYPROOF_OUT        folder for an end-of-run screenshot per seed (optional).
//        PLAYPROOF_VERBOSE    set to print the month-by-month log.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const difficulty = flag("difficulty", "nightmare");
const scenario = flag("scenario", "long-campaign");
// Seeds 1, 7 and 10 collapse on Nightmare; on Normal no seed tried has (see KOL-6997).
const seeds = flag("seeds", "1,7,10").split(",").map(Number);
const maxTurns = 60;

const requireFrom = createRequire(
  process.env.PLAYWRIGHT_PREFIX
    ? path.join(path.resolve(process.env.PLAYWRIGHT_PREFIX), "noop.js")
    : import.meta.url,
);
const { chromium } = requireFrom("playwright");

const ORIGIN = "https://koltregaskes.github.io";
const BASE = `${ORIGIN}/mandate-2029/`;
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg", ".wav": "audio/wav", ".ico": "image/x-icon",
};
async function serve(route) {
  const url = new URL(route.request().url());
  let rel = decodeURIComponent(url.pathname.replace(/^\/mandate-2029\//, ""));
  if (!rel || rel.endsWith("/")) rel += "index.html";
  const file = path.join(root, rel);
  if (!file.startsWith(root)) return route.fulfill({ status: 403, body: "" });
  try {
    return route.fulfill({ status: 200, body: await readFile(file), contentType: types[path.extname(file).toLowerCase()] ?? "application/octet-stream" });
  } catch {
    return route.fulfill({ status: 404, body: "" });
  }
}

// Unpopular policy presets (slider ids from index.html).
const policies = {
  austerity: { nhsFunding: 0, socialCare: 0, schoolFunding: 0, higherEd: 0, policeFunding: 0, incomeTax: 27, corporationTax: 21 },
  squeeze: { incomeTax: 100, corporationTax: 100, nhsFunding: 0, socialCare: 0, schoolFunding: 0, policeFunding: 0 },
  none: {},
};
const policy = policies[flag("policy", "austerity")];
const choiceRule = flag("choices", "worst");

const visible = (page, id) => page.evaluate((i) => {
  const el = document.getElementById(i);
  return Boolean(el) && !el.classList.contains("hidden");
}, id);
const read = (page) => page.evaluate(() => ({
  date: document.getElementById("currentDate")?.textContent?.trim(),
  approval: document.getElementById("approvalRating")?.textContent?.trim(),
  capital: document.getElementById("politicalCapital")?.textContent?.trim(),
  stability: document.getElementById("governmentStability")?.textContent?.trim(),
  emergency: document.getElementById("emergencyStatus")?.textContent?.trim().replace(/\s+/g, " "),
}));

const browser = await chromium.launch({ headless: true, executablePath: process.env.SMOKE_CHROMIUM_PATH || undefined });
const runs = [];

for (const seed of seeds) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route(`${ORIGIN}/**`, serve);
  // Anything off-site (web fonts) gets an empty reply, so the run stays offline.
  await context.route((u) => !u.href.startsWith(ORIGIN), (r) => r.fulfill({ status: 200, body: "" }));
  await context.addInitScript((s) => {
    // mulberry32: a tiny seeded PRNG so the run is reproducible.
    let a = s >>> 0;
    Math.random = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    localStorage.setItem("mandate-2029-help-seen", "true");
  }, seed);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(500);
  // Title screen -> Scenarios -> pick scenario and difficulty -> confirm.
  await page.click("#titleScenariosBtn");
  await page.click(`.scenario-option[data-scenario="${scenario}"]`);
  await page.click(`.difficulty-option[data-difficulty="${difficulty}"]`);
  await page.click("#scenarioConfirmBtn");
  if (await visible(page, "helpModal")) await page.click("#closeHelpBtn");
  const start = await read(page);

  const log = [];
  let ending = null;
  let turns = 0;
  let eventsAnswered = 0;
  for (; turns < maxTurns; turns += 1) {
    // Drag each unpopular slider to its extreme (input events, as a player would).
    for (const [id, value] of Object.entries(policy)) {
      await page.$eval(`#${id}`, (el, v) => {
        el.value = String(v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, value);
    }
    // Answer any pending crisis with the cheapest enabled choice.
    for (let guard = 0; guard < 4 && (await visible(page, "eventModal")); guard += 1) {
      // Read each choice's cost and its visible effect chips, as a player would.
      const choices = await page.$$eval("#eventChoices .event-choice", (bs) => bs.map((b, i) => {
        const chips = [...b.querySelectorAll(".effect-chip")].map((c) => c.textContent.trim());
        const score = chips.reduce((sum, chip) => {
          const m = chip.match(/^(Approval|Stability|Labour|Conservative|LibDem|Reform|Green|Floating Voters)\s*([+-]\d+)/);
          return m ? sum + Number(m[2]) : sum;
        }, 0);
        return { i, disabled: b.disabled, cost: Number((b.textContent.match(/Cost:\s*(\d+)/) || [])[1] ?? 0), score };
      }));
      const enabled = choices.filter((c) => !c.disabled);
      const pick = choiceRule === "worst"
        ? enabled.sort((x, y) => x.score - y.score || x.cost - y.cost)[0]
        : enabled.sort((x, y) => x.cost - y.cost)[0];
      if (!pick) break;
      await page.click(`#eventChoices .event-choice >> nth=${pick.i}`);
      eventsAnswered += 1;
      await page.waitForTimeout(100);
    }
    if (await visible(page, "electionModal")) break;
    const disabled = await page.$eval("#nextTurnBtn", (b) => b.disabled);
    if (disabled) {
      if (await visible(page, "electionModal")) break;
      log.push({ turn: turns, note: "Next Turn disabled with no modal" });
      break;
    }
    await page.click("#nextTurnBtn");
    await page.waitForTimeout(150);
    const s = await read(page);
    log.push({ turn: turns + 1, ...s });
    if (await visible(page, "electionModal")) { turns += 1; break; }
  }

  if (await visible(page, "electionModal")) {
    ending = await page.evaluate(() => ({
      outcome: document.getElementById("electionResultTitle")?.textContent?.trim(),
      seats: document.getElementById("electionResultSeats")?.textContent?.trim(),
      legacy: document.getElementById("electionResultLegacy")?.textContent?.trim(),
      approval: document.getElementById("electionResultApproval")?.textContent?.trim(),
      summary: document.getElementById("electionResultSummary")?.textContent?.trim(),
    }));
  }
  const endState = await read(page);
  if (process.env.PLAYPROOF_OUT) {
    await page.screenshot({ path: path.join(process.env.PLAYPROOF_OUT, `playproof-collapse-seed${seed}.png`) }).catch(() => {});
  }

  // Restart from the ending: "Choose New Government" -> confirm -> fresh term.
  let restart = null;
  if (ending) {
    await page.click("#restartGameBtn");
    const pickerOpen = await visible(page, "scenarioModal");
    await page.click("#scenarioConfirmBtn");
    await page.waitForTimeout(300);
    const fresh = await read(page);
    const modalGone = !(await visible(page, "electionModal"));
    const nextEnabled = await page.$eval("#nextTurnBtn", (b) => !b.disabled);
    if (await visible(page, "eventModal")) {
      await page.click("#eventChoices .event-choice >> nth=0").catch(() => {});
    }
    await page.click("#nextTurnBtn").catch(() => {});
    await page.waitForTimeout(200);
    const afterTurn = await read(page);
    restart = { pickerOpen, modalGone, nextEnabled, fresh, afterTurn };
  }

  runs.push({ seed, start, turns, eventsAnswered, ending, endState, restart, errors, log });
  await context.close();
}
await browser.close();

let passed = 0;
for (const r of runs) {
  const collapsed = r.ending?.outcome === "Vote of No Confidence";
  const early = r.turns < 24;
  const restarted = Boolean(r.restart?.pickerOpen && r.restart?.modalGone && r.restart?.nextEnabled
    && r.restart?.fresh?.date === r.start.date && r.restart?.afterTurn?.date !== r.restart?.fresh?.date);
  const ok = collapsed && early && restarted && r.errors.length === 0;
  if (ok) passed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} seed ${r.seed} (${scenario}, ${difficulty}): ${r.start.date} -> ${r.endState.date} after ${r.turns} turns, ${r.eventsAnswered} crises answered, lowest approval ${Math.min(...r.log.map((l) => parseInt(l.approval, 10)).filter(Number.isFinite))}%; ending "${r.ending?.outcome ?? "none"}" (seats ${r.ending?.seats ?? "-"}, approval ${r.ending?.approval ?? "-"}, legacy ${r.ending?.legacy ?? "-"}); restart: picker ${r.restart?.pickerOpen}, modal cleared ${r.restart?.modalGone}, fresh date ${r.restart?.fresh?.date}, next turn -> ${r.restart?.afterTurn?.date}; page errors ${r.errors.length}`);
  if (process.env.PLAYPROOF_VERBOSE) for (const l of r.log) console.log("   ", JSON.stringify(l));
  if (r.errors.length) console.log("    errors:", r.errors.slice(0, 3).join(" | "));
}
console.log(`${passed} of ${runs.length} seeded runs ended in a vote of no confidence and restarted cleanly`);
process.exit(passed === runs.length ? 0 : 1);
