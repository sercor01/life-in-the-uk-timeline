import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import puppeteer from "puppeteer-core";
import { SKIP_CHROME, findChrome, startPreview } from "./helpers.mjs";

const PORT = 4319;
const APP_URL = `http://127.0.0.1:${PORT}/`;
const REPORTS = new URL("../reports/", import.meta.url).pathname;

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
const THEMES = ["light", "dark"];
const REPEATS = 3;
const BASE_FLAGS = ["--headless=new", "--no-sandbox", "--disable-gpu"];

let server;
let chromePath;
/** @type {Record<string, import("chrome-launcher").LaunchedChrome | undefined>} */
const chromes = {};

/**
 * Launch Chrome and force the requested colour scheme. The Blink flag's value
 * has been observed inverted in some Chrome builds, so we verify the effective
 * scheme via matchMedia and pick the value that actually works.
 */
async function launchForScheme(scheme) {
  for (const value of ["0", "1"]) {
    const chrome = await chromeLauncher.launch({
      chromePath,
      chromeFlags: [...BASE_FLAGS, `--blink-settings=preferredColorScheme=${value}`],
    });
    const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
    const page = await browser.newPage();
    const dark = await page.evaluate(() =>
      matchMedia("(prefers-color-scheme: dark)").matches,
    );
    await browser.disconnect();
    if (dark === (scheme === "dark")) return chrome;
    await chrome.kill();
  }
  throw new Error(`Could not force the "${scheme}" colour scheme in headless Chrome`);
}

before(async () => {
  chromePath = findChrome();
  if (!chromePath) return;
  server = await startPreview(PORT);
  for (const theme of THEMES) chromes[theme] = await launchForScheme(theme);
  mkdirSync(REPORTS, { recursive: true });
});

after(async () => {
  for (const chrome of Object.values(chromes)) await chrome?.kill();
  await server?.close();
});

async function audit(theme, label, options, index) {
  const { lhr, report } = await lighthouse(APP_URL, {
    port: chromes[theme].port,
    output: ["html", "json"],
    logLevel: "error",
    onlyCategories: CATEGORIES,
    ...options,
  });
  const [html, json] = report;
  writeFileSync(`${REPORTS}lighthouse-${theme}-${label}-${index}.html`, html);
  writeFileSync(`${REPORTS}lighthouse-${theme}-${label}-${index}.json`, json);
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

async function medianResult(theme, label, options) {
  const runs = [];
  for (let i = 1; i <= REPEATS; i++) {
    runs.push(await audit(theme, label, options, i));
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
  const representative = runs
    .map((lhr) => ({
      lhr,
      sum: Object.values(summarise(lhr).scores).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.sum - b.sum)[0].lhr;
  return { scores, metrics, representative };
}

function assertBudgets(scores, metrics, representative, label) {
  for (const [key, min] of Object.entries(BUDGETS)) {
    if (scores[key] < min) {
      const detail = failingAudits(representative, key).join("\n    ");
      assert.fail(
        `${label} ${key} score ${scores[key]} < ${min}\n  failing audits:\n    ${detail || "(none listed)"}`,
      );
    }
  }
  for (const [key, max] of Object.entries(METRIC_BUDGETS)) {
    assert.ok(
      metrics[key] <= max,
      `${label} ${key} ${Math.round(metrics[key])} exceeds ${max}`,
    );
  }
}

for (const theme of THEMES) {
  test(`Lighthouse: ${theme} theme, mobile passes all budgets`, async (t) => {
    if (!chromes[theme]) return t.skip(SKIP_CHROME);
    const { scores, metrics, representative } = await medianResult(theme, "mobile", {});
    t.diagnostic(
      `${theme} mobile median: ${JSON.stringify(scores)} LCP=${Math.round(metrics["largest-contentful-paint"])}ms CLS=${metrics["cumulative-layout-shift"].toFixed(3)} TBT=${Math.round(metrics["total-blocking-time"])}ms`,
    );
    assertBudgets(scores, metrics, representative, `${theme} mobile`);
  });

  test(`Lighthouse: ${theme} theme, desktop passes all budgets`, async (t) => {
    if (!chromes[theme]) return t.skip(SKIP_CHROME);
    const { scores, metrics, representative } = await medianResult(theme, "desktop", {
      preset: "desktop",
    });
    t.diagnostic(
      `${theme} desktop median: ${JSON.stringify(scores)} LCP=${Math.round(metrics["largest-contentful-paint"])}ms CLS=${metrics["cumulative-layout-shift"].toFixed(3)} TBT=${Math.round(metrics["total-blocking-time"])}ms`,
    );
    assertBudgets(scores, metrics, representative, `${theme} desktop`);
  });
}
