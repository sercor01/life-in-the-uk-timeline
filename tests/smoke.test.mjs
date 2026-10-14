import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { SKIP_CHROME, clickByText, launchBrowser, startPreview, wait } from "./helpers.mjs";

const PORT = 4317;
let server;
let browser;

// ---------------------------------------------------------------- lifecycle
before(async () => {
  server = await startPreview(PORT);
  try {
    browser = await launchBrowser();
  } catch {
    browser = null; // tests will skip with a clear message
  }
});

after(async () => {
  await browser?.close();
  await server?.close();
});

// ---------------------------------------------------------------- utilities
async function open(width = 1280, height = 860) {
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 1,
    isMobile: width < 700,
    hasTouch: width < 700,
  });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle0" });
  await wait(300);
  return page;
}

/** Run a test body with a fresh page, or skip it if there is no browser. */
async function withPage(t, fn, width, height) {
  if (!browser) return t.skip(SKIP_CHROME);
  const page = await open(width, height);
  try {
    await fn(page);
  } finally {
    await page.close();
  }
}

const overviewWindow = (page) =>
  page.$eval(".overview__window", (el) => ({
    left: parseFloat(el.style.left),
    width: parseFloat(el.style.width),
  }));

// -------------------------------------------------------------------- tests
test("renders the timeline with events and an overview", (t) =>
  withPage(t, async (page) => {
    const stats = await page.evaluate(() => ({
      brand: document.querySelector(".brand")?.textContent ?? "",
      markers: document.querySelectorAll(".marker").length,
      ticks: document.querySelectorAll(".overview__tick").length,
      legends: document.querySelectorAll(".legend__item").length,
    }));
    assert.match(stats.brand, /Life in the UK/);
    assert.ok(stats.markers > 0, "expected visible event markers");
    assert.ok(stats.ticks > 40, "expected an overview tick per event");
    assert.equal(stats.legends, 9, "expected 9 category filters");
  }));

test("axis tick labels are fully visible at the edges", (t) =>
  withPage(t, async (page) => {
    const clipped = await page.evaluate(() => {
      const tl = document.querySelector(".timeline").getBoundingClientRect();
      return [...document.querySelectorAll(".tick-label")]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            text: el.textContent,
            left: +(r.left - tl.left).toFixed(1),
            right: +(r.right - tl.left).toFixed(1),
            width: Math.round(tl.width),
          };
        })
        .filter((t) => t.left < -0.5 || t.right > t.width + 0.5);
    });
    assert.equal(clipped.length, 0, `clipped tick labels: ${JSON.stringify(clipped)}`);
  }));

test("zooming in narrows the view window", (t) =>
  withPage(t, async (page) => {
    const before = await overviewWindow(page);
    const box = await (await page.$(".timeline")).boundingBox();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel({ deltaY: -120 });
      await wait(40);
    }
    await wait(200);
    const after = await overviewWindow(page);
    assert.ok(
      after.width < before.width - 0.1,
      `expected a narrower window (${before.width} -> ${after.width})`,
    );
  }));

test("panning moves the view window", (t) =>
  withPage(t, async (page) => {
    const box = await (await page.$(".timeline")).boundingBox();
    const cx = box.x + box.width * 0.5;
    const cy = box.y + box.height * 0.5;
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 5; i++) await page.mouse.wheel({ deltaY: -120 });
    await wait(150);
    const before = await overviewWindow(page);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 250, cy, { steps: 10 });
    await page.mouse.up();
    await wait(150);
    const after = await overviewWindow(page);
    assert.ok(
      Math.abs(after.left - before.left) > 1,
      `expected the window to move (${before.left} -> ${after.left})`,
    );
  }));

test("search finds an event and opens its exam reference", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "magna");
    await wait(250);
    const results = await page.$$eval(".search__item b", (els) =>
      els.map((e) => e.textContent),
    );
    assert.deepEqual(results, ["Magna Carta"]);

    await page.click(".search__item");
    await wait(300);
    const detail = await page.evaluate(() => ({
      title: document.querySelector(".detail h2")?.textContent,
      hasRef: !!document.querySelector(".ref-card"),
    }));
    assert.equal(detail.title, "Magna Carta");
    assert.ok(detail.hasRef, "expected an exam reference card");
  }));

test("hiding a category removes its events", (t) =>
  withPage(t, async (page) => {
    const before = await page.$$eval(".overview__tick", (e) => e.length);
    await clickByText(page, ".legend__item", "Sport");
    await wait(200);
    const after = await page.$$eval(".overview__tick", (e) => e.length);
    assert.ok(after < before, `expected fewer ticks (${before} -> ${after})`);
  }));

test("a modifier click on a legend chip isolates one category", (t) =>
  withPage(t, async (page) => {
    const isolate = (category) =>
      page.evaluate((id) => {
        const el = document.querySelector(`.legend__item[data-category="${id}"]`);
        if (!el) throw new Error(`no chip for ${id}`);
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true }));
      }, category);

    await isolate("sport");
    await wait(200);

    const pressed = await page.$$eval(".legend__item", (els) =>
      els
        .filter((e) => e.getAttribute("aria-pressed") === "true")
        .map((e) => e.getAttribute("data-category")),
    );
    assert.deepEqual(pressed, ["sport"], "expected only the isolated category on");

    // The timeline is filtered too, not just the chips.
    const tickColours = await page.$$eval(".overview__tick", (els) => [
      ...new Set(els.map((e) => e.style.background)),
    ]);
    assert.deepEqual(tickColours, ["var(--c-sport)"]);

    // Isolating again restores every category.
    await isolate("sport");
    await wait(200);
    const restored = await page.$$eval(
      ".legend__item",
      (els) => els.filter((e) => e.getAttribute("aria-pressed") === "true").length,
    );
    assert.equal(restored, 9, "expected every category back on");
  }));

test("hovering a legend chip dims the other categories", (t) =>
  withPage(t, async (page) => {
    await page.hover('.legend__item[data-category="war"]');
    await wait(150);

    const lit = await page.evaluate(() => ({
      markers: document.querySelectorAll(".marker").length,
      muted: document.querySelectorAll(".marker--muted").length,
      mutedTicks: [...document.querySelectorAll(".overview__tick")].filter(
        (e) => e.style.background === "var(--faint)",
      ).length,
    }));
    assert.ok(lit.markers > 0, "expected markers on the timeline");
    assert.ok(lit.muted > 0, "expected the other categories dimmed");
    assert.ok(lit.muted < lit.markers, "expected the hovered category left lit");
    assert.ok(lit.mutedTicks > 0, "expected dimmed ticks in the overview");

    await page.mouse.move(4, 4);
    await wait(150);
    const after = await page.evaluate(
      () => document.querySelectorAll(".marker--muted").length,
    );
    assert.equal(after, 0, "expected the dimming to clear when the pointer leaves");
  }));

test("list mode groups events by era", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".mode-toggle button", "List");
    await wait(200);
    const groups = await page.$$eval(".list__year", (els) =>
      els.map((e) => e.textContent),
    );
    const cards = await page.$$eval(".card", (els) => els.length);
    assert.equal(groups.length, 8, "expected one group per era");
    assert.equal(groups[0], "Prehistory");
    assert.ok(cards > 0, "expected event cards");
  }));

test("annual tab lists the year and opens a detail sheet", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".tabs button", "Annual dates");
    await wait(200);
    const months = await page.$$eval(".month", (els) => els.length);
    assert.equal(months, 13, "12 months plus the movable-dates card");

    await page.click(".annual");
    await wait(200);
    const detail = await page.evaluate(() => ({
      title: document.querySelector(".detail h2")?.textContent ?? "",
      date: document.querySelector(".detail__date")?.textContent ?? "",
      hasRef: !!document.querySelector(".ref-card"),
    }));
    assert.ok(detail.title.length > 0, "expected an annual event title");
    assert.match(detail.date, /every year|Movable/);
    assert.ok(detail.hasRef, "expected an exam reference");
  }));

test("population figures search, open and link to the tab", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "67 million");
    await wait(250);
    const results = await page.$$eval(".search__item b", (els) =>
      els.map((e) => e.textContent),
    );
    assert.deepEqual(results, ["Population: just over 67 million"]);

    // Picking a result focuses it on the timeline and opens the detail panel.
    await page.click(".search__item");
    await wait(300);
    const panel = await page.evaluate(() => ({
      title: document.querySelector(".detail h2")?.textContent ?? "",
      date: document.querySelector(".detail__date")?.textContent ?? "",
      cta: document.querySelector(".detail__cta")?.textContent ?? "",
    }));
    assert.match(panel.title, /Population/);
    assert.equal(panel.date, "2021");
    assert.match(panel.cta, /population chart/i);

    const onTimeline = await page.$$eval(".marker", (els) =>
      els.some((e) => e.textContent.includes("67 million")),
    );
    assert.ok(onTimeline, "expected the focused figure on the timeline");

    await page.click(".detail__cta");
    await wait(250);
    const activeTab = await page.$eval(
      '.tabs button[aria-current="true"]',
      (el) => el.textContent,
    );
    assert.equal(activeTab, "Population");
  }));

test("population tab shows the handbook population table", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".tabs button", "Population");
    await wait(200);
    const values = await page.$$eval(".milestone__value", (els) =>
      els.map((e) => e.textContent),
    );
    assert.equal(values.length, 11, "expected every handbook year");
    assert.equal(values[0], "Just over 4 million");
    assert.equal(values.at(-1), "Just over 67 million");
    const nations = await page.$$eval(".nations__item", (els) => els.length);
    assert.equal(nations, 4, "expected the four nations");
    const chartW = await page.$eval(".pop-chart svg", (el) =>
      el.getBoundingClientRect().width,
    );
    assert.ok(chartW > 0, "expected the chart to render");
  }));

test("population tab fits a phone without overflow", (t) =>
  withPage(
    t,
    async (page) => {
      await clickByText(page, ".tabs button", "Population");
      await wait(200);
      const layout = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        milestones: document.querySelectorAll(".milestone").length,
        chart: !!document.querySelector(".pop-chart svg"),
      }));
      assert.ok(layout.scrollW <= layout.clientW + 1, "no horizontal overflow");
      assert.equal(layout.milestones, 11);
      assert.ok(layout.chart, "expected the chart on a phone");
    },
    390,
    844,
  ));

/**
 * Type into the search box the way React sees it. `page.type` appends, so this
 * is how a test replaces the query instead of adding to it.
 */
async function search(page, text) {
  await page.evaluate((value) => {
    const input = document.querySelector(".search input");
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);
  await wait(250);
}

test("phone layout does not overflow and the sheet opens", (t) =>
  withPage(
    t,
    async (page) => {
      const layout = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        markers: document.querySelectorAll(".marker").length,
      }));
      assert.ok(layout.scrollW <= layout.clientW + 1, "no horizontal overflow");
      assert.ok(layout.markers > 0, "expected markers on a phone");

      await page.click(".marker");
      await wait(250);
      const title = await page.evaluate(
        () => document.querySelector(".detail h2")?.textContent ?? "",
      );
      assert.ok(title.length > 0, "expected the bottom sheet to open");
    },
    390,
    844,
  ));

// ------------------------------------------------------- bugs that once shipped
// Each of these pins a regression; keep them with the fix.

test("the page ships a strict Content-Security-Policy", (t) =>
  withPage(t, async (page) => {
    const policy = await page.$eval(
      'meta[http-equiv="Content-Security-Policy"]',
      (el) => el.content,
    );
    // No inline scripts and no eval exist, so 'self' alone has to be enough.
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "object-src 'none'",
      "base-uri 'none'",
    ]) {
      assert.ok(
        policy.includes(directive),
        `missing ${directive} in: ${policy}`,
      );
    }
    // Ignored in a meta tag, and it logs a console error, so it must not be there.
    assert.ok(!policy.includes("frame-ancestors"), "frame-ancestors is ignored in a meta CSP");

    // Record violations inside the page: the browser fires
    // securitypolicyviolation on the document, it is not a CDP page event.
    await page.evaluate(() => {
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        window.__csp.push(`${e.effectiveDirective}: ${e.blockedURI}`);
      });
    });

    // Exercise the screens that a policy could break: React sets inline styles
    // on the detail panel, and the favicon is a data: URI.
    await page.click(".marker");
    await wait(250);
    await clickByText(page, ".tabs button", "Population");
    await wait(250);
    await clickByText(page, ".tabs button", "Timeline");
    await wait(250);

    assert.deepEqual(
      await page.evaluate(() => window.__csp),
      [],
      "the policy must not block anything the app does",
    );
  }));

test("a hidden category is not searchable", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".legend__item", "Sport");
    await wait(200);

    // Every event whose title mentions the Olympics is a sport event, so with
    // Sport hidden there should be nothing to pick and no ghost selection.
    await search(page, "Olympics");
    assert.equal(
      await page.$$eval(".search__item", (e) => e.length),
      0,
      "expected no results while the category is hidden",
    );
    assert.match(
      await page.$eval(".search__empty", (el) => el.textContent),
      /No dates match/,
    );

    // A category that is still on keeps searching normally.
    await search(page, "Magna");
    assert.deepEqual(
      await page.$$eval(".search__item b", (els) => els.map((e) => e.textContent)),
      ["Magna Carta"],
    );
  }));

test("the detail panel can be dismissed on desktop", (t) =>
  withPage(t, async (page) => {
    await page.click(".marker");
    await wait(250);
    assert.ok(
      await page.$eval(".detail__close", (el) => getComputedStyle(el).display !== "none"),
      "expected a visible close button on desktop",
    );
    assert.equal(
      await page.$eval(".detail", (el) => getComputedStyle(el).position),
      "relative",
      "expected the panel to be a positioning context",
    );
    // Read the rects as plain values: a DOMRect does not survive serialisation.
    const geom = await page.evaluate(() => {
      const btn = document.querySelector(".detail__close").getBoundingClientRect();
      const panel = document.querySelector(".detail").getBoundingClientRect();
      const title = document.querySelector(".detail h2").getBoundingClientRect();
      return {
        btn: { top: btn.top, right: btn.right, bottom: btn.bottom },
        panel: { top: panel.top, right: panel.right },
        title: { top: title.top, right: title.right },
      };
    });
    assert.ok(
      geom.btn.top >= geom.panel.top - 1 && geom.btn.right <= geom.panel.right + 1,
      "expected the close button inside the panel",
    );
    assert.ok(
      !(geom.title.top < geom.btn.bottom && geom.title.right > geom.btn.right - 32),
      "expected the close button not to cover the heading",
    );

    await page.click(".detail__close");
    await wait(250);
    assert.ok(await page.$(".detail--empty"), "expected the empty state back");
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Pick a date",
    );
  }));

test("Tabbing out of the search box does not drop focus", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "magna");
    await wait(250);
    assert.equal(await page.$$eval(".search__item", (e) => e.length), 1);

    await page.keyboard.press("Tab");
    await wait(400); // longer than the old 150ms close delay

    const focus = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        isBody: el === document.body,
        tag: el?.tagName ?? "",
        focusable: el?.tabIndex >= 0 || ["BUTTON", "INPUT", "A"].includes(el?.tagName),
        listStillOpen: document.querySelector(".search__pop")?.hasAttribute("hidden") === false,
      };
    });
    assert.equal(focus.isBody, false, "focus must not fall back to the document body");
    assert.ok(focus.focusable, `expected a focusable element, got "${focus.tag}"`);
  }));

test("arrow keys move the search cursor and Enter picks it", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "London");
    await wait(250);
    // Expect the results from the data, not a hardcoded count: the query also
    // matches "Great Fire of London".
    const options = await page.$$eval('[role="option"]', (els) =>
      els.map((el) => ({ id: el.id, label: el.querySelector("b").textContent })),
    );
    assert.ok(options.length >= 2, "expected at least two results");
    assert.deepEqual(
      await page.$$eval('[role="option"]', (els) =>
        els.map((el) => el.getAttribute("role")),
      ),
      options.map(() => "option"),
    );

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await wait(150);

    const cursor = await page.evaluate(() => {
      const input = document.querySelector(".search input");
      const marked = [...document.querySelectorAll('[role="option"]')].filter(
        (o) => o.getAttribute("aria-selected") === "true",
      );
      return {
        expanded: input.getAttribute("aria-expanded"),
        activedescendant: input.getAttribute("aria-activedescendant"),
        selected: marked.map((o) => o.querySelector("b").textContent),
      };
    });
    assert.equal(cursor.expanded, "true");
    assert.deepEqual(cursor.selected, [options[1].label]);
    assert.equal(cursor.activedescendant, options[1].id);

    await page.keyboard.press("Enter");
    await wait(300);
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      options[1].label,
    );
  }));

test("the view switcher uses aria-current rather than a tablist", (t) =>
  withPage(t, async (page) => {
    // Halving the ARIA tabs pattern makes it wrong, not accessible: the panels
    // are not tabpanels and there is no roving tabindex.
    assert.equal(await page.$('[role="tablist"]'), null, "expected no tablist");
    assert.equal(await page.$('[role="tab"]'), null, "expected no tab roles");

    await clickByText(page, ".tabs button", "Population");
    await wait(250);
    const state = await page.evaluate(() => {
      const current = document.querySelector('.tabs button[aria-current="true"]');
      const others = [...document.querySelectorAll(".tabs button")].filter(
        (b) => b !== current,
      );
      return {
        current: current?.textContent,
        othersMarked: others.some((b) => b.hasAttribute("aria-current")),
        othersStyled: others.some(
          (b) => getComputedStyle(b).boxShadow !== "none",
        ),
      };
    });
    assert.equal(state.current, "Population");
    assert.equal(state.othersMarked, false, "only the active tab may be marked");
    assert.equal(state.othersStyled, false, "inactive tabs must not look selected");
  }));

