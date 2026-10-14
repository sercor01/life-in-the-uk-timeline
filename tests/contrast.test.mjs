import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { SKIP_CHROME, launchBrowser, startPreview, wait } from "./helpers.mjs";

const PORT = 4318;

const CATEGORY_IDS = [
  "prehistory",
  "monarchy",
  "war",
  "rights",
  "religion",
  "science",
  "arts",
  "sport",
  "population",
];
const ERAS = [
  "prehistory",
  "roman",
  "anglo",
  "medieval",
  "tudor",
  "georgian",
  "victorian",
  "modern",
];

// ------------------------------------------------------------- WCAG helpers
const parse = (hex) => {
  const h = hex.replace("#", "").trim();
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
};
const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = parse(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

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

async function readTokens(page, scheme) {
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: scheme },
  ]);
  await page.reload({ waitUntil: "networkidle0" });
  await wait(150);
  return page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const names = ["bg", "panel", "ink", "muted", "faint", "ref-text", "accent", "accent-soft", "focus", "axis"];
    const out = {};
    for (const n of names) out[n] = style.getPropertyValue(`--${n}`).trim();
    for (const id of [
      "prehistory",
      "monarchy",
      "war",
      "rights",
      "religion",
      "science",
      "arts",
      "sport",
      "population",
    ]) {
      out[`c-${id}`] = style.getPropertyValue(`--c-${id}`).trim();
      out[`c-${id}-tint`] = style.getPropertyValue(`--c-${id}-tint`).trim();
      out[`c-${id}-ink`] = style.getPropertyValue(`--c-${id}-ink`).trim();
    }
    for (const era of [
      "prehistory",
      "roman",
      "anglo",
      "medieval",
      "tudor",
      "georgian",
      "victorian",
      "modern",
    ]) {
      out[`era-${era}`] = style.getPropertyValue(`--era-${era}`).trim();
    }
    for (const n of ["pop-line", "pop-england", "pop-scotland", "pop-wales", "pop-ni"]) {
      out[n] = style.getPropertyValue(`--${n}`).trim();
    }
    return out;
  });
}

function auditTheme(scheme, tokens) {
  const failures = [];
  const check = (label, fg, bg, min) => {
    if (!fg || !bg) {
      failures.push(`${label}: missing token (fg="${fg}" bg="${bg}")`);
      return;
    }
    const r = contrast(fg, bg);
    if (r < min) failures.push(`${label}: ${r.toFixed(2)} < ${min} (${fg} on ${bg})`);
  };

  for (const surface of ["panel", "bg"]) {
    for (const text of ["ink", "muted", "faint", "ref-text", "accent"]) {
      check(`${text} on ${surface}`, tokens[text], tokens[surface], 4.5);
    }
  }

  check("focus ring on panel", tokens.focus, tokens.panel, 3);
  check("accent text on accent-soft", tokens.accent, tokens["accent-soft"], 4.5);

  // The highlighted search result: text sits on the accent-soft background.
  check("ink on accent-soft", tokens.ink, tokens["accent-soft"], 4.5);
  check("muted on accent-soft", tokens.muted, tokens["accent-soft"], 4.5);

  // The axis and tick/era labels sit on the timeline, over the era bands.
  for (const era of ERAS) {
    const band = tokens[`era-${era}`];
    check(`axis on era ${era}`, tokens.axis, band, 3);
    check(`muted on era ${era}`, tokens.muted, band, 4.5);
    check(`faint on era ${era}`, tokens.faint, band, 4.5);
  }

  for (const id of CATEGORY_IDS) {
    check(`category ${id} graphic on panel`, tokens[`c-${id}`], tokens.panel, 3);
    check(`category ${id} graphic on bg`, tokens[`c-${id}`], tokens.bg, 3);
    check(`category ${id} ink on tint`, tokens[`c-${id}-ink`], tokens[`c-${id}-tint`], 4.5);
    check(`category ${id} ink on panel`, tokens[`c-${id}-ink`], tokens.panel, 4.5);
  }

  // Population tab: chart line and the four-nation bar are graphics.
  for (const n of ["pop-line", "pop-england", "pop-scotland", "pop-wales", "pop-ni"]) {
    check(`${n} on panel`, tokens[n], tokens.panel, 3);
    check(`${n} on bg`, tokens[n], tokens.bg, 3);
  }

  assert.equal(
    failures.length,
    0,
    `WCAG failures in ${scheme} theme:\n  ${failures.join("\n  ")}`,
  );
}

test("light theme meets WCAG AA contrast", async (t) => {
  if (!browser) return t.skip(SKIP_CHROME);
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle0" });
  const tokens = await readTokens(page, "light");
  auditTheme("light", tokens);
  t.diagnostic(`light: ${Object.keys(tokens).length} tokens checked, all pass`);
  await page.close();
});

test("dark theme meets WCAG AA contrast", async (t) => {
  if (!browser) return t.skip(SKIP_CHROME);
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle0" });
  const tokens = await readTokens(page, "dark");
  auditTheme("dark", tokens);
  t.diagnostic(`dark: --bg=${tokens.bg} --panel=${tokens.panel}, all pass`);
  await page.close();
});
