# Life in the UK · date timeline

An interactive web app that shows every date worth memorising for the *Life in
the UK* test on a zoomable timeline, with the exam references one tap away.

## Run it

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build to dist/
npm run preview  # preview the production build
npm test             # build, then run the smoke + contrast + axe + Lighthouse suites
npm run lighthouse   # just the Lighthouse budgets (writes reports/)
```

## What it does

- **Historical timeline** of dated events from the Stone Age to the 2020s.
- **Zoom & pan** with the scroll wheel, trackpad, pinch, drag, double-click, the
  `+` / `−` buttons, or the arrow keys. A minimap at the bottom lets you jump
  anywhere.
- **Readable without clicking**: every marker shows its year and a short title,
  hovering reveals the event's summary, and labels stack into lanes so they
  never overlap.
- **A piecewise time scale** so that the huge stretch of prehistory is
  compressed and the busy last thousand years get room to breathe.
- **Range bars** for things that lasted a while (wars, reigns, booms).
- **Annual dates tab** for the dates that repeat every year (saint days,
  Christmas, Hogmanay, Halloween…) plus movable feasts like Easter and Lent.
- **Population tab** for the handbook's population table: a growth chart, the
  figures in words, and how the total is spread across the four nations.
- **Detail panel** with the summary, the original exam reference text and the
  correct answers.
- **Colour per category** with a legend that doubles as a filter, and a search
  box that jumps straight to a date.
- **Works on phones, tablets and desktops**: the detail panel becomes a bottom
  sheet, and a list view is available for small screens.
- **Light and dark themes** that follow your system setting. Both palettes are
  audited for WCAG AA contrast (4.5:1 for text, 3:1 for graphics).
- **Accessible**: visible keyboard focus, no colour-only state, and reduced
  motion is respected.

## Where the data lives

- `data/exams.json` — your quiz questions (the source of the references).
- `src/data/events.ts` — the curated historical events. Each entry has a year
  (negative for BC), an optional end year, a title, a summary, a category, an
  importance (3 = always shown, 1 = only when zoomed in), and links back to the
  quiz questions it came from.
- `src/data/annual.ts` — the dates that repeat every year.
- `src/data/population.ts` — the handbook's population table, the growth steps
  and the four-nation shares. Each figure also becomes a `handbook` event on the
  timeline so the numbers live in one place.
- `src/data/categories.ts` — the categories (colours live in `src/index.css` as
  CSS variables so light and dark themes can each be accessible).

To add an event, append to `src/data/events.ts`. To point at a question, use
`examRefs: [{ set: 3, id: 19 }]`.

## Quality checks

`npm test` gates the build on four headless-browser suites:

- **Smoke** (`tests/smoke.test.mjs`) — timeline renders, zoom, pan, search,
  filters, list mode, the annual tab, the population tab, and a phone viewport.
- **Contrast** (`tests/contrast.test.mjs`) — the design tokens meet WCAG AA in
  both themes (text ≥ 4.5:1, graphics ≥ 3:1), including text over the era bands.
- **axe** (`tests/axe.test.mjs`) — axe-core audits every rendered screen/state in
  both themes and at desktop and phone sizes for WCAG A/AA violations.
- **Lighthouse** (`tests/lighthouse.test.mjs`) — mobile and desktop budgets,
  **in both light and dark themes**: performance ≥ 0.9, accessibility = 1,
  best-practices and SEO ≥ 0.95, plus LCP, CLS and TBT limits. Reports land in
  `reports/`.

## Security posture

`index.html` carries a strict `<meta http-equiv="Content-Security-Policy">` and
a `Referrer-Policy` meta, because GitHub Pages cannot set response headers. The
build has no inline scripts and no `eval`, so `script-src 'self'` is enough;
`img-src` allows `data:` only for the inline SVG favicon. `frame-ancestors` is
deliberately omitted — it is ignored in a meta CSP and only logs a console
error. A smoke test asserts the policy is present and that nothing it would
block actually happens.

Note that the test harness loads axe-core by evaluating its source through CDP
rather than `addScriptTag`: an injected `<script>` tag is an inline script,
which this CSP blocks, and `addScriptTag` fails silently when that happens.

## Data notes

Most events are drawn from your `exams.json`. A handful are filled in from the
official handbook where the quizzes skip a date (these carry a dashed border and
an `hb` badge, and are marked `source: "handbook"`).

A few places in the source data disagree with themselves. The timeline states
the value the reference text gives and does not try to hide the conflict:

- **Small claims limit (Scotland & Northern Ireland)** — the reference says
  £3,000 in one place and the marked answer is £5,000 in another.
- **Northern Ireland Assembly size** — one set says 108 members, another says 90.
