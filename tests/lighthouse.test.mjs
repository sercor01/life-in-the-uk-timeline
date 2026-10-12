import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { preview } from "vite";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { findChrome } from "./helpers.mjs";

const PORT = 4319;
const APP_URL = `http://127.0.0.1:${PORT}/`;
const REPORTS = new URL("../reports/", import.meta.url).pathname;

const SKIP_CHROME =
  "No Chrome/Chromium found. Install one or set CHROME_PATH to its executable.";

/** Budgets. See AGENTS.md before loosening any of these. */
const BUDGETS = {
  performance: 0.9,
  accessibility: 1,
  "best-practices": 0.95,
  seo: 0.95,
};
const METRIC_BUDGETS = {
  "largest-contentful-paint": 2500, // ms
  "cumulative-layout-shift": 0.1,
  "total-blocking-time": 200, // ms
};

const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const REPEATS = 3;

let server;
let chrome;
let chromePath;

before(async () => {
  chromePath = findChrome();
  if (!chromePath) return;
  server = await preview({
    preview: { port: PORT, strictPort: true, host: "127.0.0.1" },
    logLevel: "silent",
  });
  chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });
  mkdirSync(REPORTS, { recursive: true });
});

after(async () => {
  await chrome?.kill();
  await server?.close();
});

async function audit(label, options, index) {
  const { lhr, report } = await lighthouse(APP_URL, {
    port: chrome.port,
    output: ["html", "json"],
    logLevel: "error",
    onlyCategories: CATEGORIES,
    ...options,
  });
  const [html, json] = report;
  writeFileSync(`${REPORTS}lighthouse-${label}-${index}.html`, html);
  writeFileSync(`${REPORTS}lighthouse-${label}-${index}.json`, json);
  return lhr;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

function summarise(lhr) {
  const scores = {};
  for (const key of CATEGORIES) scores[key] = lhr.categories[key]?.score ?? 0;
  const metrics = {};
  for (const key of Object.keys(METRIC_BUDGETS)) {
    metrics[key] = lhr.audits[key]?.numericValue ?? Number.POSITIVE_INFINITY;
  }
  return { scores, metrics };
}

function failingAudits(lhr, category) {
  return lhr.categories[category].auditRefs
    .map((r) => lhr.audits[r.id])
    .filter(
      (a) =>
        a.score !== null &&
        a.score < 1 &&
        !["notApplicable", "informative", "manual"].includes(a.scoreDisplayMode),
    )
    .map((a) => `${a.id} (${a.title})`);
}

async function medianResult(label, options) {
  const runs = [];
  for (let i = 1; i <= REPEATS; i++) {
    runs.push(await audit(label, options, i));
  }
  const summaries = runs.map(summarise);
  const scores = Object.fromEntries(
    CATEGORIES.map((k) => [k, median(summaries.map((s) => s.scores[k]))]),
  );
  const metrics = Object.fromEntries(
    Object.keys(METRIC_BUDGETS).map((k) => [
      k,
      median(summaries.map((s) => s.metrics[k])),
    ]),
  );
  // Keep the best-scoring run for the failing-audit detail.
  const representative = runs
    .map((lhr) => ({ lhr, sum: Object.values(summarise(lhr).scores).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => a.sum - b.sum)[0].lhr;
  return { scores, metrics, representative };
}

test("Lighthouse: mobile passes all budgets", async (t) => {
  if (!chrome) return t.skip(SKIP_CHROME);
  const { scores, metrics, representative } = await medianResult("mobile", {});
  t.diagnostic(
    `mobile median: ${JSON.stringify(scores)} LCP=${Math.round(metrics["largest-contentful-paint"])}ms CLS=${metrics["cumulative-layout-shift"].toFixed(3)} TBT=${Math.round(metrics["total-blocking-time"])}ms`,
  );

  for (const [key, min] of Object.entries(BUDGETS)) {
    if (scores[key] < min) {
      const detail = failingAudits(representative, key).join("\n    ");
      assert.fail(
        `Lighthouse ${key} score ${scores[key]} < ${min}\n  failing audits:\n    ${detail || "(none listed)"}`,
      );
    }
  }
  for (const [key, max] of Object.entries(METRIC_BUDGETS)) {
    assert.ok(
      metrics[key] <= max,
      `Lighthouse ${key} ${Math.round(metrics[key])} exceeds ${max}`,
    );
  }
});

test("Lighthouse: desktop passes all budgets", async (t) => {
  if (!chrome) return t.skip(SKIP_CHROME);
  const { scores, metrics } = await medianResult("desktop", { preset: "desktop" });
  t.diagnostic(
    `desktop median: ${JSON.stringify(scores)} LCP=${Math.round(metrics["largest-contentful-paint"])}ms CLS=${metrics["cumulative-layout-shift"].toFixed(3)} TBT=${Math.round(metrics["total-blocking-time"])}ms`,
  );
  for (const [key, min] of Object.entries(BUDGETS)) {
    assert.ok(scores[key] >= min, `desktop ${key} score ${scores[key]} < ${min}`);
  }
});
