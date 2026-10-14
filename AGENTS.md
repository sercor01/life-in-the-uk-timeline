# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

A static, client-side web app that plots every date to memorise for the
*Life in the UK* test on a zoomable timeline. There is no backend; the app
bundles `data/exams.json` and renders it.

## Commands

```bash
npm install
npm run dev        # dev server (Vite)
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm test           # build, then run the smoke + contrast + axe + Lighthouse suites
npm run lighthouse # just the Lighthouse suite (writes reports/ for inspection)
```

Always run `npm run typecheck` (or `npm run build`) after changes. The repo is
strict TypeScript (`noUnusedLocals`, `noUnusedParameters`), so unused imports or
variables fail the build.

## Layout

```
data/exams.json          # source quiz data (do not edit unless asked)
public/robots.txt        # needed for the Lighthouse SEO audit to pass
reports/                 # Lighthouse HTML/JSON output (gitignored)
src/
  App.tsx                # top-level state: tab, view, selection, filters, query
  types.ts               # TimelineEvent, AnnualEvent, Category, Selection, ExamRef
  data/
    events.ts            # curated historical events (the main content)
    annual.ts            # dates that repeat every year
    population.ts        # handbook population table (+ chart/milestone scale)
    eras.ts              # historical eras: shared by the bands and the list
    categories.ts        # categories + colours
    exams.ts             # loads exams.json and resolves ExamRef -> question
  lib/
    scale.ts             # piecewise time scale (year <-> normalised 0..1)
    lanes.ts             # label layout into non-overlapping lanes + date fmt
    ticks.ts             # axis tick years for a view and width
    dates.ts             # month names + annual-date formatting
    useTimelineGestures.ts # wheel / pointer / keyboard zoom + pan hook
  components/
    Timeline.tsx         # SVG timeline, ticks, markers + label clamping
    TimelineControls.tsx # zoom in / out / reset buttons
    Overview.tsx         # draggable minimap
    DetailPanel.tsx      # side panel / mobile bottom sheet
    EventListView.tsx    # accessible list fallback, grouped by era
    CalendarView.tsx     # annual dates tab
    PopulationView.tsx   # population tab (chart, figures, nations)
    PopulationChart.tsx  # decorative area chart for the population tab
    Legend.tsx           # category filter
    SearchBar.tsx        # search + jump
  index.css              # all styles (single stylesheet, CSS variables)
tests/
  helpers.mjs            # Chrome detection, browser launch, preview + click helpers
  smoke.test.mjs         # node:test + puppeteer-core smoke suite
  contrast.test.mjs      # WCAG AA contrast audit of the design tokens
  axe.test.mjs           # axe-core WCAG A/AA audit of rendered screens
  lighthouse.test.mjs    # Lighthouse budgets (a11y/perf/bp/seo) that gate CI
```

## Data model

- `TimelineEvent.year` is the start year; negative is BC. Optional `endYear`
  makes a range bar. `displayDate` overrides the printed date (e.g. `"1930s"`).
- `importance`: `3` always visible, `2` medium zoom, `1` only when zoomed in.
- `examRefs: [{ set, id }]` point at `data/exams.json`; the detail panel hydrates
  the reference text from them. Keep these valid — a mismatch silently shows no
  reference. Validate with a quick script if you add many.
- `source: "exam"` (from the quizzes) or `"handbook"` (gap-fillers). Handbook
  events render with a dashed border and an `hb` badge.
- `AnnualEvent` has `month`/`day` and an optional `movable` for feasts without a
  fixed date.
- The population figures live in `data/population.ts` (one table) and are mapped
  into `handbook` timeline events in `events.ts`, so the numbers are not
  duplicated. `POPULATION_MAX_MILLIONS` is the shared chart/bar scale.
- Categories live in one place (`categories.ts`); the colour *values* are CSS
  custom properties (`--c-<id>`, `--c-<id>-tint`, `--c-<id>-ink`) defined per
  theme in `index.css`. Add a category there and it flows through the legend,
  search and both views.

## How the timeline works

- `lib/scale.ts` maps a year to a normalised `0..1` position through weighted
  segments, so prehistory is compressed and recent centuries get room. Zoom/pan
  operate on a `ViewWindow { n0, n1 }` in normalised space, never on pixels.
- `lib/lanes.ts` greedily assigns visible events to horizontal lanes by
  importance, dropping the least important when lanes run out. `lib/ticks.ts`
  picks the axis years for a given view and width.
- `data/eras.ts` is the single source of era boundaries and labels, used by the
  timeline bands *and* the list view's headings. Membership is half-open
  (`from` inclusive, `to` exclusive), and the outer eras use `-Infinity` /
  `Infinity` so every year lands in exactly one era.
- `Timeline.tsx` measures its container with a `ResizeObserver`, derives
  `axisY` and `laneCount` from the height, and renders the axis/ticks/range
  bars/stems in SVG plus HTML labels on top. A `useLayoutEffect` re-clamps
  labels to the viewport using their real measured width.
- `TimelineControls.tsx` renders the − / + / Reset buttons. They sit *inside*
  the timeline container, whose `onPointerDown` captures the pointer for panning;
  that capture retargets the button's `click` to the container, so the wrapper
  stops pointer-down propagation. Any new interactive overlay inside the
  container (like the markers, which also `stopPropagation`) needs the same
  treatment or its `onClick` will never fire on a single click. `zoomCentre`
  anchors on the centre of the current view (not the axis midpoint) so button
  zoom stays where the user is looking after panning.
- `lib/useTimelineGestures.ts` owns every way of moving the view: wheel and
  trackpad (a non-passive listener so it can `preventDefault`), one-finger drag,
  two-finger pinch, double-click and the arrow/plus/minus keys. It mirrors the
  current view and width into refs, because the handlers run outside React's
  render. Pointer capture is set on the container (not a child) so it survives
  re-renders mid-drag.

## Conventions

- Plain CSS in `src/index.css` using the variables in `:root`. No CSS framework.
- No hardcoded colours in components: use CSS custom properties
  (`var(--c-<id>)` for category graphics, `var(--c-<id>-tint)` / `var(--c-<id>-ink)`
  for chips). This is what makes light/dark work.
- **Theming**: the app follows the system setting via
  `@media (prefers-color-scheme: dark)`, which redefines the tokens on `:root`.
  Both palettes are audited for WCAG AA — keep any new colour pair compliant:
  >= 4.5:1 for text, >= 3:1 for the axis, focus ring and category graphics.
  Solve colours with the contrast helper rather than guessing (see Testing).
- No state library; `App.tsx` holds state and passes props down.
- Keep components presentational and the data/logic in `data/` and `lib/`.
- Mobile is first-class: the detail panel becomes an overlay bottom sheet below
  `880px`, and interactions must work with touch.

## Testing

`npm test` builds the app and runs four headless-browser suites with
`node:test`, against the production build served by `vite preview`:

- `tests/smoke.test.mjs` (port `4317`) — rendering, zoom, pan, search, category
  filtering, list mode, the annual and population tabs and a phone viewport (no
  horizontal overflow, bottom sheet opens). Uses `puppeteer-core`.
- `tests/contrast.test.mjs` (port `4318`) — reads the real CSS custom properties
  in both the light and dark themes and asserts every text pair is >= 4.5:1 and
  every graphic/axis/focus pair is >= 3:1 (WCAG AA). Checks the *tokens*;
  includes text over the era bands, which axe cannot measure.
- `tests/axe.test.mjs` (port `4320`) — runs axe-core against 8 rendered states
  (timeline, list, annual, population and a hidden category, several with a
  detail panel open) across both themes and desktop/phone, for WCAG 2.0/2.1/2.2
  A + AA. Checks the *rendered screens*; catches things the token test cannot,
  e.g. text dimmed with opacity. Contrast results axe leaves undecided (gradient
  backgrounds) are only logged, since `contrast.test.mjs` covers them.
- `tests/lighthouse.test.mjs` (port `4319`) — runs Lighthouse on the production
  build for mobile and desktop, **in both light and dark themes** (the colour
  scheme is forced via Blink and verified with `matchMedia`), 3 runs each, and
  asserts the median against budgets: performance >= 0.9, accessibility = 1,
  best-practices and SEO >= 0.95, LCP <= 2500ms, CLS <= 0.1, TBT <= 200ms. Writes
  full HTML/JSON reports to `reports/` (gitignored). On failure the message names
  the failing audits.

The contrast and axe suites overlap deliberately: the token test guarantees the
palette is sound, axe guarantees the rendered screens are. Keep both.

The Lighthouse gates are deliberately strict. If one fails, fix the underlying
issue rather than lowering the budget. Keep a single `<main>` landmark (a11y) and
`public/robots.txt` (SEO) — both were required to reach 1.0. Because a Lighthouse
run does not interact with the page, INP is proxied by TBT; interaction jank
(pan/zoom) would need Lighthouse user-flow mode.

Do not signal state by dimming text with `opacity` — it lowers contrast below AA
and only the axe suite catches it. Use a different weight or a solid colour.

To extend the smoke suite, add a `test(...)` using the
`withPage(t, async (page) => { ... })` helper, which opens a fresh page (or
skips cleanly if no browser is found). Each suite starts its own preview server
via `startPreview(port)` from `tests/helpers.mjs`, so give a new suite a
distinct port.

When picking colours, iterate with a small contrast function (the one in
`tests/contrast.test.mjs`) until it passes, then paste the values into
`index.css` for both themes.

Because `puppeteer-core` ships no browser, the suites detect Chrome from common
install paths. Override with `CHROME_PATH=/path/to/chrome`, or they fall back to
Puppeteer's installed-Chrome channel. If none is found the tests skip rather
than fail.

`ResizeObserver` drives the timeline layout, so assert on the rendered DOM or a
screenshot rather than assuming.

## Gotchas

- Chrome headless clamps the viewport to a minimum 500px wide; set a mobile
  viewport through the DevTools protocol (e.g. `page.setViewport`) instead of
  `--window-size` when testing phone layouts.
- `vite preview` defaults to binding `localhost`, which can resolve to IPv6
  (`::1`). The suites set `host: "127.0.0.1"` so the URL is reliable.
- `data/exams.json` contains some internal contradictions (small-claims limit,
  NI Assembly size). The app reproduces the reference text; do not "fix" the
  data silently.
