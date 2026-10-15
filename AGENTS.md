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

# one-off maintenance tools, deliberately outside the build
node scripts/build-outline.mjs    # regenerate src/data/ukOutline.ts from Natural Earth
node scripts/validate-places.mjs  # assert every place's examRefs and event links resolve
```

Always run `npm run typecheck` (or `npm run build`) after changes. The repo is
strict TypeScript (`noUnusedLocals`, `noUnusedParameters`), so unused imports or
variables fail the build.

## Layout

```
data/exams.json          # source quiz data (do not edit unless asked)
public/robots.txt        # needed for the Lighthouse SEO audit to pass
reports/                 # Lighthouse HTML/JSON output (gitignored)
scripts/
  build-outline.mjs      # one-off: Natural Earth -> src/data/ukOutline.ts
  validate-places.mjs    # one-off: check places.ts refs/links/coords
src/
  App.tsx                # the shell: wires the state to the views and the legend
  types.ts               # TimelineEvent, AnnualEvent, Place, Category, Selection, ExamRef
  data/
    events.ts            # curated historical events (the main content)
    annual.ts            # dates that repeat every year
    places.ts            # curated map places (lat/lon, nation, exam refs)
    ukOutline.ts         # GENERATED coastline; do not hand-edit
    population.ts        # handbook population table (+ chart/milestone scale)
    eras.ts              # historical eras: shared by the bands and the list
    categories.ts        # categories + colours
    exams.ts             # loads exams.json and resolves ExamRef -> question
  lib/
    scale.ts             # piecewise time scale (year <-> normalised 0..1)
    appState.ts          # the whole app state as one value, and its reducer
    urlState.ts          # state <-> query string: what a shared link means
    useUrlState.ts       # keeps the URL and the state equal (push vs replace)
    lanes.ts             # label layout into non-overlapping lanes + date fmt
    ticks.ts             # axis tick years for a view and width
    dates.ts             # month names + annual-date formatting
    geo.ts               # lat/lon -> map space, plus the projected coastline paths
    mapScale.ts          # map view rectangle (zoom/pan maths), clustering, label layout
    useTimelineGestures.ts # wheel / pointer / keyboard zoom + pan hook
    useMapGestures.ts    # the same, in two dimensions, for the map
  components/
    Timeline.tsx         # SVG timeline, ticks, markers + label clamping
    TimelineControls.tsx # zoom in / out / reset buttons (shared by the map)
    Overview.tsx         # draggable minimap
    DetailPanel.tsx      # side panel / mobile bottom sheet (events, dates, places)
    EventListView.tsx    # accessible list fallback, grouped by era
    MapView.tsx          # SVG coastline + HTML pins, clusters, spread-out groups
    MapMinimap.tsx       # corner inset: country, place specks, visible rectangle
    PlaceList.tsx        # accessible list of every place, grouped by nation
    CalendarView.tsx     # annual dates tab
    PopulationView.tsx   # population tab (chart, figures, nations)
    PopulationChart.tsx  # decorative area chart for the population tab
    Legend.tsx           # category filter: toggle / isolate / hover highlight
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
- `Place` is the map's unit: `lat`/`lon` (real coordinates), `nation`
  (`england`/`scotland`/`wales`/`ni`, the same ids as `NATION_SHARES`), a
  `category`, `importance` (3 = always labelled), `examRefs`, and an optional
  `linkedEventId` pointing at the `TimelineEvent` at that place. Places are the
  one thing you cannot spot by looking: a bad `examRefs` or `linkedEventId`
  fails *silently*, so `scripts/validate-places.mjs` checks all of them, and the
  smoke suite asserts a place shows either a reference or the handbook note.
  Coordinates are only picked by hand — `scripts/validate-places.mjs` also
  rejects any that fall outside `MAP_BOUNDS` and would be cropped off the map.
- The population figures live in `src/data/population.ts` (one table) and are
  mapped into `handbook` timeline events in `events.ts`, so the numbers are not
  duplicated. `POPULATION_MAX_MILLIONS` is the shared chart/bar scale.
- Categories live in one place (`categories.ts`); the colour *values* are CSS
  custom properties (`--c-<id>`, `--c-<id>-tint`, `--c-<id>-ink`) defined per
  theme in `index.css`. Add a category there and it flows through the legend,
  search and every view.

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
  the timeline container, whose `onPointerDown` calls `setPointerCapture` on
  itself so a drag that wanders outside still pans. Do **not** add
  `stopPropagation` to a wrapper to "protect" them: pointer capture re-targets
  `pointermove`/`pointerup`, but Chrome still dispatches `click` at the
  hit-tested pointerup target, so the buttons fire normally without it.
  (Verified with both a mouse and a real touch tap.) The markers' `onPointerDown`
  `stopPropagation` is there for a different reason: it stops a drag that
  *starts on a marker* from panning the timeline. `zoomCentre` anchors on the
  centre of the current view (not the axis midpoint) so button zoom stays
  where the user is looking after panning.
- `lib/useTimelineGestures.ts` owns every way of moving the view: wheel and
  trackpad (a non-passive listener so it can `preventDefault`), one-finger drag,
  two-finger pinch, double-click and the arrow/plus/minus keys. It mirrors the
  current view and width into refs, because the handlers run outside React's
  render. Pointer capture is set on the container (not a child) so it survives
  re-renders mid-drag.

## How the map works

- **There is no map library, on purpose.** The app is offline and its CSP allows
  no remote images, so a tile server would mean loosening the policy, a new
  dependency and a network round-trip. Instead `scripts/build-outline.mjs`
  downloads the public-domain Natural Earth 1:50m "map subunits" set once,
  simplifies each nation's rings (Ramer–Douglas–Peucker) and writes
  `src/data/ukOutline.ts` — ~17 kB of lon/lat. Commit that file; the build never
  touches the network.
- `lib/geo.ts` holds one projection, `project(lon, lat)`, plus the coastline
  already projected into SVG path strings. The pins go through the *same*
  function, which is the only reason they stay glued to the coast. Everything
  outside `MAP_BOUNDS` is cropped, exactly as a printed UK map would be.
- Map space is lon/lat degrees scaled by cos(latitude) and multiplied by 100, so
  the viewBox numbers are convenient and the aspect ratio is right.
- `lib/mapScale.ts` is the map's equivalent of `scale.ts`: a view is a rectangle
  (centre + width) in map space, and the height follows the container's aspect
  ratio, so the SVG `viewBox` and the HTML pins always agree. Zoom/pan never
  touch pixels.
- `MapView.tsx` renders one `<path>` per nation (a handful of DOM nodes) and, on
  top, real `<button>` pins positioned in percentages — the same SVG-plus-HTML
  composition as `Timeline.tsx`, which is what gives the pins native focus,
  click and ARIA. The SVG is `aria-hidden`: `PlaceList` and the pins carry all
  the meaning.
- **Clustering** is single-linkage (connected components) over the "closer than
  `CLUSTER_PX`" graph, not greedy nearest-first. That is a correctness
  requirement, not a preference: single-linkage guarantees any two markers in
  different clusters are further apart than the threshold, so markers never
  overlap. A greedy pass can leave two near neighbours in different clusters,
  the markers then overlap, and the WCAG 2.2 `target-size` rule fails. Keep
  `CLUSTER_PX` (30) above the marker size (28px) for the same reason.
- **A cluster click must always reveal its members.** Some places are closer
  together than the deepest zoom can separate — Big Ben and Westminster Abbey
  are 300m apart, under a pixel of the whole UK — so zooming can never split
  them, and a click that only zooms would do nothing at all. In that case the
  group is *spread out* around its true position, with a leader line
  (`.map__link`) back to it. `spread` is a list of **place ids**, not cluster
  keys: which places share a cluster depends on the frame width, and the width
  changes the moment the detail panel opens, so a key captured before that
  would go stale and close the fan. A list also lets two tight groups stay open
  at once. The fan radius grows with the label width so the labels stay
  legible, and is capped so it never becomes a starburst.
- **A fan is tied to the zoom it was opened at.** Zooming *in* far enough to
  tell a group apart collapses it on its own, because there is no longer a
  cluster to fan; zooming back *out* closes it in `changeView` (`next.w >
  current.w`), because a wider view means groups again — otherwise opening a
  cluster and zooming out left a starburst of pins floating where the marker
  used to be. The marker is still there to click, so nothing is lost. Note the
  order in the two places that zoom *and* fan: `onClusterClick` and the focus
  effect call `changeView` first and set `spread` after, so the fan they are
  asking for is not undone by their own zoom.
- **Selecting a place brings it into view** (`useEffect` on `selectedId`):
  centre it, and zoom so its nearest neighbour clears the cluster radius, so it
  is drawn as its own pin rather than folded into a group — spreading the group
  if that is impossible. Capped by `FOCUS_MAX_W` so an isolated place (Belfast,
  whose nearest neighbour is 80km away) is not "focused" by zooming all the way
  out. A place already on screen and drawn on its own is left alone, so clicking
  a pin never yanks the map about. Never mind the zoom level: this is the one
  place a view change is allowed to zoom *out*, because the user asked for that
  place.
- **Off-screen pins are not rendered at all**, clusters included. Keeping them
  in the DOM would leave invisible-but-focusable buttons (a keyboard user would
  tab into nothing) and their labels would be clamped back inside the frame,
  floating with no marker under them.
- `MapMinimap.tsx` is the corner inset: the country, a speck per place, and the
  visible rectangle. The rectangle is drawn no smaller than `MIN_INDICATOR_PX`,
  because at a deep zoom the true rectangle is a couple of pixels and simply
  cannot be seen — the *centre* stays exact, only the drawn size is floored. It
  has no outline, unlike the main map: at 132px the coastline's 1,200 vertices
  plus twenty Scottish islands would cover the landmass and read as a black
  blob. Like `Overview`, it is a pointer-only convenience with no ARIA.
- **Labels** are dropped, never the pins: `layoutMapLabels` greedily places
  labels by importance and skips any that would overlap an accepted one — the
  same idea as `lanes.ts`. `importance` controls when a label appears at all
  (`LABEL_PX` is pixels per map unit), and a `useLayoutEffect` then clamps the
  survivors inside the frame by their measured width.
- `lib/useMapGestures.ts` mirrors `useTimelineGestures`, but its `onViewChange`
  takes an **updater** (`(view) => view`) rather than a value. Several wheel or
  pinch events can land in one frame, and with a plain value each would be
  computed from the same stale view, so all but the last would be lost.
- The map is code-split (`React.lazy`) so the whole UK coastline stays off the
  timeline's initial bundle; the smoke suite's CSP test loads it to prove
  `script-src 'self'` still allows the chunk.
- **The two views point at each other.** A place's panel links to its
  `linkedEventId` on the timeline; an event's panel links to every place that
  names it (`placesLinkedTo`), because one event can be the site of several —
  the Norman Conquest is both the Tower of London and Hastings. Those links clear
  the search box (`setQuery("")`) as they navigate. The box doubles as a live
  filter, so leaving "Hadrian" in it made the destination show a single item
  with nothing on screen to explain why, and Reset only resets the zoom, so it
  looked stuck.
- **Selecting a place also selects the event at it** (`eventAtPlace`), so the
  timeline follows the point you are looking at: pick St Paul's Cathedral and the
  timeline is on the Great Fire. It is deliberately one-way — a place names at
  most one event, while an event can be several places, and those stay a list of
  links in the panel rather than an automatic jump. A place with no event of its
  own leaves the timeline alone rather than clearing it. The timeline's *window*
  is not moved either: the selection follows the point, your zoom stays where you
  left it.
- Layout: on wide screens the map and the place list sit side by side, because
  fitting a tall country into a short wide box would leave it tiny with sea
  either side. Below 880px the stage stacks and scrolls, and the map keeps the
  country's own aspect ratio at full width. `.app--<tab>` is on the root for
  this and for hiding the empty detail panel where it has no business: on the
  map (dead space the map wants), on the annual tab (which is already a list of
  dates, so "pick a date" is advice about another tab) and on the population tab
  (where nothing can be selected at all). The timeline, the one tab that invites
  a pick from what is on screen, keeps it.

## Links, history and the URL

The URL is the app's shareable half, and the address bar is the only store:
`src/lib/useUrlState.ts` reads the query once at boot, writes it back as the
visitor moves and re-reads it on `popstate`. The state itself still lives in
React (one `useReducer` in `src/lib/appState.ts`), so no render depends on the
URL parsing — the two are just kept equal. Nothing server-side is involved: the
path never changes, so GitHub Pages, the CSP and a pasted link all behave alike.

| param | example | meaning |
| --- | --- | --- |
| `tab` | `tab=map` | `timeline` (default), `calendar`, `map`, `population` |
| `mode` | `mode=list` | Graph (default) or list, on the timeline |
| `y` | `y=1600,1650` | The timeline's visible years, BC negative. Years rather than the normalised window, because a link is meant to be read; four decimal places because at the deepest zoom the whole window is under two years wide |
| `m` | `m=290,410,120` | The map's rectangle (centre x, centre y, width) in map units |
| `sel` | `sel=place:stonehenge` | The panel the named tab is showing: `event:<id>`, `place:<id>` or `annual:<id>`. Each tab keeps its own panel (see below), but a link describes only the one on screen |
| `q` | `q=war` | The search box, which doubles as the live filter — so a link reproduces exactly the view the sharer had |
| `off` | `off=arts,sport` | Categories switched *off*. The default is every category on, so the everyday link carries nothing |

`encodeState` writes only what differs from the default, so a bare `/` is the
whole timeline with everything on. It builds the string by hand rather than with
`URLSearchParams`, which percent-encodes the `,` and `:` that keep
`y=1600,1650` and `sel=place:stonehenge` readable at a glance; only `q` is
escaped. Reading is deliberately forgiving: an unknown id, `y=abc`, a bad `tab`
— each falls back to the default it would have had, and the first write tidies
the address bar back to its canonical form. That is what stops a link shared
before an event was renamed from breaking anything; it simply opens without the
panel.

**Push vs replace.** `isNavigating(action, state)` decides from both — the rule
being "what would a visitor expect Back to undo?".

*Pushed*, one step each: changing tab, the graph/list toggle, a category filter,
and the **first** panel a tab opens, so Back still dismisses a panel, which is
the whole reason to push one. A push wins when several actions land in one
commit, so following a link that lands on another tab *and* focuses a place
costs one Back, not two.

*Replaced*, the entry staying current: zoom, pan, typing, closing a panel, and
any *further* panel on the same tab. That last pair is why the state is
consulted and not just the action: wandering from pin to pin on the map is
looking around rather than a series of journeys, so Back leaves the map instead
of walking back through every point that was looked at on the way. The same goes
for a search result picked while already on that tab.

Two more things keep the history honest. `send` runs the reducer once itself, to
recognise a no-op — re-picking the active tab, or the open marker — and drop it
before it can re-render or arm a push. And a write whose URL we are already on is
skipped, with the verb consumed either way, so a change that does not alter the
URL cannot leave a push lying in wait for the next zoom. React's batching means a
whole gesture costs one `history` call.

**Each tab keeps its own panel** (`AppState.panels`), because one selection does
not survive a journey: following an event's place to the map selects that place,
and coming back to the timeline must not have forgotten the event. Panels are
keyed by kind — event on the timeline, annual on the calendar, place on the map —
`visiblePanel` hands the current tab its own, and the URL writes only that one,
so a shared link stays short and says exactly what the sharer was looking at. A
tab switch therefore keeps every tab's state instead of restarting it. The
corollary: a URL cannot express two panels at once, so a Back restores the entry's
own panel and the other tabs come back empty for that visit.

The two halves of that are stitched together by `followPlace`: selecting a place
also selects the event at it (`eventAtPlace`), so the timeline's panel tracks the
point being looked at rather than staying on whatever was open when the map was
entered. That is what makes "Norman Conquest → Tower of London → St Paul's → back
to the timeline" land on the Great Fire rather than the event you started from.

**The panel's Copy link button** (`CopyLink` in `DetailPanel.tsx`) does no more
than copy `location.href`, because the address bar already *is* the deep link.
It reports through a `role="status"` region rather than renaming itself — a
button whose label changes is not reliably announced — and its `aria-label`
keeps the visible "Copy link" inside the accessible name (WCAG 2.5.3). It sits
under the summary rather than in `.detail__top`, which on a phone is a
full-width sheet where a third item would squeeze the category chip.

**The map's rectangle had to be lifted out of `MapView`** for any of it to be
shareable, so `App` owns `mapView` and `MapView` takes `view`/`onViewChange`.
`null` means "fit the container", not "the fitted rectangle": a fit depends on
the frame's aspect ratio, so storing one would go stale on the first resize (and
would put a pointless `m=` in every link). `changeView` still takes an *updater*
and nudges its own `viewRef` forward as it applies it, so several wheel or pinch
events in one frame still compose instead of all starting from the same stale
value.

**Not in the URL, on purpose:** the legend's hover highlight (a mouse affordance
that means nothing once the pointer is gone), the map's fan-out `spread` (whose
ids depend on the current frame width) and anything to do with the container's
size.

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
- **The map's tokens** (`--map-sea`, `--map-land`, `--map-<nation>`,
  `--map-coast`, `--map-context`) follow the same rule. The land tints are
  deliberately almost white: each pin is a category-coloured dot ringed in
  `--panel`, and the *lightest* category graphic (the religion green) has to
  clear 3:1 against the *darkest* land fill. Darkening the land for looks is
  what breaks that — pick a lighter tint instead. Nations are told apart by
  their outline and a subtle tint, not by luminance steps. `--map-context` is
  the softer line for the Republic of Ireland, drawn as context land.
- No state library; `App.tsx` holds state and passes props down.
- Keep components presentational and the data/logic in `data/` and `lib/`.
- Mobile is first-class: the detail panel becomes an overlay bottom sheet below
  `880px`, and interactions must work with touch. Map pins are 28px (WCAG 2.2
  asks for 24px) and clustering keeps them apart rather than letting targets
  overlap.
- **Legend / category filtering**: a chip click toggles one category; a
  Cmd/Ctrl-click — or Shift-click, and Shift+Enter from the keyboard, so the
  gesture has a keyboard route — isolates it, showing only that one, and
  repeating it restores everything. Hovering a chip sets `highlight` in
  `App.tsx`, which `Timeline` and `MapView` use to dim every *other* category:
  HTML markers and pins, SVG stems, range bars and the minimap ticks. The dim
  uses a solid grey (`--faint` / `--muted`), never `opacity`, so contrast stays
  at AA. Hovering a *hidden* chip does nothing, and the hover cue is mouse-only
  (checked with `pointerType`) so a touch tap cannot leave the view stuck dimmed.
  The same `active` set also filters the map's pins *and* its place list, so the
  two can never disagree.

**Accessibility patterns — keep these whole, do not half-build one:**

- The header view switcher is a plain `role="group"` of buttons marked with
  `aria-current="true"`. It is deliberately *not* a `role="tablist"`: the swap
  targets are not tabpanels and there is no roving tabindex, so a tablist would
  be half a pattern and mislead screen readers.
- The search box is a full ARIA combobox. The popover is **always mounted** and
  shown/hidden with the `hidden` attribute, so `aria-controls` always resolves
  and blur can never unmount a focused element (closing on an unmount used to
  drop focus onto `<body>`). Options are `<li role="option">` and are
  deliberately not tabbable — keyboard users drive them with ArrowUp/ArrowDown
  and Enter, and Escape closes. The index is filtered by the active legend
  categories, so a result can never point at an event the timeline is not
  showing.
- The detail panel's close button lives in `.detail__top`, a flex row it shares
  with the category chip, so it can never cover the heading. `.detail` is
  `position: relative` so any future absolutely-positioned child stays inside it.
  `Selection` has three kinds (`event`, `annual`, `place`) and the panel renders
  all three from the same frame, so a place gets the same eyebrow, summary and
  reference cards as an event.
- **Each tab keeps its own panel** (`AppState.panels`, keyed by the kind of thing
  it shows, with `visiblePanel` picking the current tab's). Switching tabs does
  not discard anything, so a round trip — event in the list, follow it to the map,
  come back — returns you to the event you were reading. The panel of the tab you
  left is simply not on screen while you are away, which is what keeps it from
  covering another tab's content (on a phone it is a full-width sheet).
- **The map is never the only way to reach a place.** The SVG is `aria-hidden`
  and the pins are real buttons with names like "Stonehenge, Wiltshire —
  Prehistory & early Britain"; a cluster announces its members ("5 places close
  together: …") so its count is not a bare number. `PlaceList` repeats every
  place as a list grouped by nation, which is both the screen-reader path and
  the practical way to use the tab on a phone. Keep both halves: dropping the
  list would leave the map as a colour-and-position puzzle. A group that has to
  be spread out is still a set of ordinary buttons — the leader lines are
  `aria-hidden`, so a screen reader hears the same names wherever the pin is
  drawn.
- **Security**: `index.html` carries a strict
  `<meta http-equiv="Content-Security-Policy">` (there are no inline scripts and
  no `eval`, so `script-src 'self'` is enough) and a `Referrer-Policy` meta —
  GitHub Pages cannot set response headers, so a meta tag is the only lever
  available. `frame-ancestors` is *ignored* in a meta CSP, so do not add it; it
  only logs a console error. A smoke test asserts the meta is present.
  `addScriptTag` cannot be used to load test scripts into the page (an injected
  tag is an inline script, which this policy blocks, and it fails *silently*) —
  evaluate the source through `page.evaluate` instead.

## Testing

`npm test` builds the app and runs four headless-browser suites with
`node:test`, against the production build served by `vite preview`:

- `tests/smoke.test.mjs` (port `4317`) — rendering, zoom, pan, search, category
  filtering (including the isolate gesture and the hover highlight), list mode,
  the annual and population tabs, the map (pins, clustering and spreading out,
  zooming back out closing a group, the place list, the minimap, both
  cross-links), links and history (a shared
  URL restoring the tab, the timeline window, the filters and the panel; junk
  falling back to the defaults; Back/Forward between tabs; a round trip that
  keeps each tab's panel; browsing pins leaving one step back; zoom and typing
  leaving the history alone; the copy-link button; the empty panel appearing
  only where a panel can be opened) and a phone viewport (no horizontal
  overflow, bottom sheet opens). Uses `puppeteer-core`.
- `tests/contrast.test.mjs` (port `4318`) — reads the real CSS custom properties
  in both the light and dark themes and asserts every text pair is >= 4.5:1 and
  every graphic/axis/focus pair is >= 3:1 (WCAG AA). Checks the *tokens*;
  includes text over the era bands, which axe cannot measure, and every category
  graphic against every map land fill.
- `tests/axe.test.mjs` (port `4320`) — runs axe-core against 12 rendered states
  (timeline, list, annual, population, the map, the map with a place open, the
  map with a cluster expanded, a hidden category, several with a detail panel
  open, and one with the search popover open) across both themes and
  desktop/phone, for WCAG 2.0/2.1/2.2 A + AA. Checks the *rendered screens*;
  catches things the token test cannot, e.g. text dimmed with opacity, or map
  markers whose targets overlap (`target-size`).
  Contrast results axe leaves undecided (gradient backgrounds) are only logged,
  since `contrast.test.mjs` covers them.
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

`npm test` runs `node --test` with `--test-force-exit`. Each test file runs in
its own child process and the runner only finishes once that process exits, but
Vite loads `vite.config.ts` through esbuild, which leaves a long-lived
`esbuild --service` subprocess behind that `server.close()` does not stop. That
leaked subprocess keeps the child's event loop alive, so the runner used to wait
minutes for a child whose tests had already passed (a full run took 4–10 minutes
instead of ~65s). `--test-force-exit` lets the runner finish once the tests are
done rather than waiting on the stray handle. Keep it — a run without it is the
slow one.

To extend the smoke suite, add a `test(...)` using the
`withPage(t, async (page) => { ... })` helper, which opens a fresh page (or
skips cleanly if no browser is found). Each suite starts its own preview server
via `startPreview(port)` from `tests/helpers.mjs`, so give a new suite a
distinct port. The map is a lazily-imported chunk, so a test that touches it
must `await page.waitForSelector(".map__region")` (or `.pin`) first — otherwise
it races the network and reads an empty screen. A synchronous loop of
`dispatchEvent(new WheelEvent(...))` collapses into a single frame's worth of
zoom; use `page.mouse.wheel` with a small delay to exercise real zooming.

`scripts/validate-places.mjs` is not part of `npm test` (it reads the sources
textually), so run it whenever `places.ts` changes. The suites cover what it
cannot: that a rendered place shows a reference or the handbook note, and that
the legend filter reaches the pins *and* the list.

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
