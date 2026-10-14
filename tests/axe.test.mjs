import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { SKIP_CHROME, clickByText, launchBrowser, startPreview, wait } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const PORT = 4320;

/** WCAG 2.0 / 2.1 / 2.2 A + AA rules. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const THEMES = ["light", "dark"];
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 860 },
  { name: "phone", width: 390, height: 844 },
];


/** Every screen / state worth auditing. */
const STATES = [
  { name: "timeline", go: async () => {} },
  {
    name: "timeline with detail open",
    go: (page) => clickByText(page, ".marker"),
  },
  {
    name: "list view",
    go: (page) => clickByText(page, ".mode-toggle button", "List"),
  },
  {
    name: "list view with detail open",
    go: async (page) => {
      await clickByText(page, ".mode-toggle button", "List");
      await wait(150);
      await clickByText(page, ".card");
    },
  },
  {
    name: "annual dates",
    go: (page) => clickByText(page, ".tabs button", "Annual dates"),
  },
  {
    name: "annual dates with detail open",
    go: async (page) => {
      await clickByText(page, ".tabs button", "Annual dates");
      await wait(150);
      await clickByText(page, ".annual");
    },
  },
  {
    name: "population",
    go: (page) => clickByText(page, ".tabs button", "Population"),
  },
  // The combobox markup only exists while the popover is open, so it needs its
  // own state — this is what guards the search results' ARIA.
  {
    name: "search results open",
    go: async (page) => {
      await page.type(".search input", "magn");
      await wait(300);
    },
  },
  {
    name: "a category hidden",
    go: (page) => clickByText(page, ".legend__item", "Sport"),
  },
];

let server;
let browser;

before(async () => {
  server = await startPreview(PORT);
  try {
    browser = await launchBrowser();
  } catch {
    browser = null;
  }
});

after(async () => {
  await browser?.close();
  await server?.close();
});

async function audit(theme, viewport, state) {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      isMobile: viewport.width < 700,
      hasTouch: viewport.width < 700,
    });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle0" });
    await wait(300);
    await state.go(page);
    await wait(300);
    await page.addScriptTag({ path: AXE_PATH });
    return await page.evaluate(
      (tags) => globalThis.axe.run(document, { runOnly: { type: "tag", values: tags } }),
      TAGS,
    );
  } finally {
    await page.close();
  }
}

function describeViolation(v) {
  const nodes = v.nodes
    .slice(0, 4)
    .map(
      (n) =>
        `      ${n.target.join(" ")}\n        ${(n.failureSummary ?? "").split("\n").slice(0, 3).join(" | ")}`,
    )
    .join("\n");
  return `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})\n${nodes}`;
}

for (const theme of THEMES) {
  for (const viewport of VIEWPORTS) {
    test(`axe: ${theme} theme, ${viewport.name} has no WCAG A/AA violations`, async (t) => {
      if (!browser) return t.skip(SKIP_CHROME);

      const problems = [];
      let incompleteContrast = 0;
      for (const state of STATES) {
        const results = await audit(theme, viewport, state);
        incompleteContrast += results.incomplete
          .filter((r) => r.id === "color-contrast")
          .reduce((n, r) => n + r.nodes.length, 0);
        for (const v of results.violations) {
          problems.push(`${state.name}\n${describeViolation(v)}`);
        }
      }

      t.diagnostic(
        `${STATES.length} states audited; ${incompleteContrast} contrast nodes needed manual review (covered by contrast.test.mjs)`,
      );
      assert.equal(
        problems.length,
        0,
        `axe found WCAG violations (${theme}, ${viewport.name}):\n${problems.join("\n")}`,
      );
    });
  }
}
