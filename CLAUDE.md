# FieldMap - MapLibre Migration

## Project context
FieldMap is a PWA for hunters/outdoor recreationists to manage pins, routes, areas, and bearings on a map. Built in vanilla JS, single HTML file (index.html), Firebase/Firestore backend.

## Current state
Pins, routes, areas, and bearings are all fully ported to MapLibre — draw, edit, vertex/endpoint editing,
and persisted rendering all work with no remaining Leaflet (`L.*`) calls in any of those four item types.
The standalone Measure tool is also now fully ported (Session 15) — see Architecture notes' "Measure tool"
entry. A codebase-wide audit (Session 15, `\bL\.[a-zA-Z]+\(` grep across the whole file) confirmed these are
the ONLY remaining functional Leaflet dependencies anywhere: elevation tap, compass bearing lines, the GPX
search-result marker, all overlay toggles, the sun-path arc, and the offline-boundary rectangles were all
already fully MapLibre-native before this session, despite CLAUDE.md previously listing them as broken.
- Pins render as maplibregl.Marker with custom SVG HTML (buildPinMarkerHtml)
- Routes/areas/bearings all render from shared GeoJSON sources (tracks-source, polygons-source,
  bearings-source) rather than one Leaflet layer per item — see Architecture notes
- Style switching works — everything persists correctly across all base layer switches, including
  off-screen items and anything mid-draw or mid-edit at the moment of the switch
- Clustering is temporarily disabled: all pins always show as individual markers regardless of zoom. The
  cluster-circles/cluster-counts bubble layers and pins-source still exist but no longer drive individual
  marker visibility (see Architecture notes) — proper clustering to be implemented in a later session
- Trip is now a real entity (state.trips), not a free-text string — Stage 1 of 3 of the Active Trip project
  (Session 16). Every pin/track/polygon/bearing references it via .tripId; see Architecture notes' "Trips"
  entry for the full design.
- Active Trip UI is built — Stage 2 of 3 (Session 18): a device-only "what am I working on right now"
  concept (state.settings.activeTripId) with a startup prompt, a persistent map indicator, a shared trip
  picker (search/list/+New, reused for both switching the device's active trip AND setting one specific
  item's trip from Edit data), and auto-tagging new pins/tracks/areas/bearings with the active trip at
  creation. See Architecture notes' "Active Trip UI" entry for the full design. Stage 3 (wiring tap-anywhere's
  quick-save to inherit the active trip) is a separate, not-yet-started follow-on session.
- Range Ring and Buffer are two new persistent, toggleable object types — same tier as pins/tracks/polygons/
  bearings/areas (Session 21). Range Ring: one center point + one or more comma-separated radii, rendered as
  concentric circle outlines with a persistent per-ring radius label at each ring's own top point. Buffer: a
  drawn open line (reuses Draw Route's own drawing mechanism directly) turned into a rounded-join/rounded-cap
  buffered polygon at a given width. Both are feet/miles only (no metric, matching the rest of the app) and
  carry a generic, non-jurisdiction-specific disclaimer — see Architecture notes' "Range Ring and Buffer"
  entry for the full design and the geo-math it's built on.
- Compass's screen anchor now actually matches #view-drawer's (Session 21) — Session 20 only restyled its
  visual card to match #view-drawer's look but left the position at top-center; this was a leftover gap, now
  closed. Map interactivity/no-scrim behavior while Compass is open is unchanged.
- Comma (thousands-separator) formatting audited across all large numeric displays, not just area (Session
  21) — the scale bar's rounded feet/miles labels were the one remaining gap found; area/elevation/distance
  were already correct everywhere they're displayed.
- Range Ring and Buffer are now fully wired into the shared trip-picker, map-click, and computeTripsPresent
  systems (Session 22) — three bugs fixed post-Session-21: their Trip field had no click listener at all
  (missing from the 4-item wiring array, now 6), neither type responded to a direct map tap (not registered
  in the shared layer-click-dispatcher system pins/tracks/areas/bearings all use), and Buffer's Width field
  didn't match Range Ring's Radii field styling (a `.modal input[type=text]` CSS rule that never covered
  `type=number`). A separate, more subtle bug was also fixed: the trip picker rendered but was completely
  unclickable whenever opened from inside a brand-new-item `.modal-overlay` (Compass's "Save bearing" being
  the one actually reported, but this affected any new-item creation modal, not just bearings) — a z-index
  stacking gap, not a wiring gap; see Architecture notes' "Range Ring/Buffer wiring gaps" entry for the full
  mechanism and why it looked like "one shared root cause" but was actually two.
- Winter Range recolored tan → purple (Session 24) for contrast against the Topo/Topo Dark basemap, and the
  desktop/mobile floating info chips (coords, scale bar, active trip, and a new active-layers indicator) are
  now one consolidated stack instead of four independently-positioned elements plus a separate always-on
  legend panel — see Architecture notes' "Floating info stack" and "Migration corridors" entries for the
  full design.
- Four small refinements on top of Session 24's floating info stack (Session 25): the Migration picker's
  checkbox list now reads Stopover/Corridors/Winter Range top-to-bottom (display order only); the
  active-layers chip is now tappable (opens the Wildlife Layers panel directly) and carries a small
  layers-glyph icon; the mobile chip stack moved from top-left to lower-left at a narrower width (140px,
  closer to pre-Session-24 sizing), with the active-layers chip truncating long species names via ellipsis
  rather than widening; and the coords+elevation chip (already one bubble on both desktop and mobile) is now
  tappable to toggle between map-center (crosshair icon) and live GPS location (pin icon), both values always
  switching together. See Architecture notes' "Floating info stack" entry for the full design.
- Migration corridors upgraded from a single-herd (West Goose Lake elk) proof of concept to the full compiled
  10-state USGS Corridor Mapping Team dataset (Session 26) — 4 species (Elk, Mule deer, Pronghorn, White-
  tailed deer), a new Annual Range category/toggle (AZ/CA/NM herds), and a fixed paint/z-order (Stopover →
  Corridor → Winter Range → Annual Range, top to bottom, via `fill-sort-key`/`line-sort-key` rather than
  feature-array order) — see Architecture notes' "Migration corridors" entry for the full design.
- Reachability pass (Session 27): zoom (+/-) and north/reset moved out of MapLibre's built-in top-left
  NavigationControl into the same reachable right-side icon cluster as search/layers/filter/locate/download
  (custom round buttons matching that cluster's existing style, not a restyled native control), plus a new
  device-local "Show zoom buttons" setting (default on; north/reset always stays, since orientation reset has
  no gesture equivalent). Also root-caused and fixed the double-tap-drag-to-zoom regression reported since
  tap-anywhere shipped — see Architecture notes' "Reachability: zoom/north-reset relocation, double-tap-drag
  fix" entry for the full investigation and the fix. Session 27 also shipped a "Left-handed mode" setting
  that mirrored this icon cluster to the opposite edge — removed entirely in Session 28 (see that session's
  own entry below) after its mobile collision with the floating chip stack proved not worth keeping; no trace
  of it remains anywhere in the codebase.
- Mobile layout overhaul (Session 28): the floating chip stack (coords/elevation, scale bar, active trip,
  active layers) and the icon cluster (now 6 icons — Filter and Download moved into the Tools menu on both
  platforms) both went from vertical columns to full-width horizontal rows on mobile — chips across the top,
  icons across the bottom — with the active-layers chip now always single-line (half the height of its
  row-mates) instead of stacking up to 2 lines. The compass/north-reset icon was also redesigned (two full
  solid triangles — red north, white south — replacing a rendering bug where each half was a thin partial
  wedge instead of a real triangle), applies on both desktop and mobile. See Architecture notes' "Mobile
  layout overhaul" entry for the full design, what else needed to move as a result (search bar, tool-mode
  status bars), and what was audited and found NOT to need changing (every panel/drawer).
- Chip polish pass (Session 29): fixed a real Session 28 layout bug — the mobile active-layers chip was
  crammed into the same row as the 3 persistent chips (coords/elevation, scale, active trip) instead of
  rendering as its own full-width row beneath them; now split into two rows (`#floating-info-row1` for the
  persistent 3, a `display:contents` no-op on desktop) with real padding on every chip on all sides (was
  horizontal-only, leaving text/graphics flush against chip edges). Desktop's 3 persistent chips also got the
  same uniform-height/corner-radius treatment mobile already had (the trip chip's 20px pill radius no longer
  stands out from the other two's 8px). The active-trip chip's border now matches its own dot's accent color
  whenever a trip is active, on both platforms. See Architecture notes' "Chip sizing, mobile active-layers
  row, padding, active-trip stroke" entry for the full design.
- Scale bar overflow + dynamic search bar position (Session 30): the Session 29 padding fix only ever
  inset the scale-bar chip's own box — it never touched the bar *graphic*'s own width calculation
  (`updateScaleBar()`'s `maxBarPx`, a flat 120 regardless of the chip's real available width), so on mobile's
  narrower chips the bar could still be computed wider than the padded content area and visibly overflow past
  it — confirmed via an actual cropped screenshot, not just computed-style checks, both before fixing (bug
  reproduced) and after (11px/11px symmetric inset at an artificially narrowed 50px test width). `maxBarPx`
  is now `Math.min(120, availableContentWidth)`, read live from the chip's own `clientWidth` minus its
  padding, so it can never exceed real available space at any chip width, mobile or desktop. Also made the
  mobile search bar's vertical position fully dynamic — `updateSearchBarPosition()` reads
  `#floating-info-stack`'s real rendered bottom edge (`getBoundingClientRect`) instead of a second hardcoded
  offset, so it correctly renders below the active-layers row when one's showing and below just the
  persistent row when it isn't, verified both ways via live screenshots. See Architecture notes' "Scale bar
  overflow fix, dynamic search bar position" entry for the full design.
- Dropped `mapbox.mapbox-bathymetry-v2` from the combined vectorbase composite tileset URL (Session 31) —
  both the 3 style JSONs' own `composite` source and `DOWNLOAD_LAYERS.vectorbase`'s URL in the offline-
  download code, kept matching each other. Confirmed before removing that its only consumer anywhere
  (`water-depth`, a fill layer on source-layer `depth`) has `maxzoom:8`, below the offline downloader's
  own minimum zoom and any zoom this hunting/field app is realistically used at — `hillshade` (the actual
  terrain-shading layer, from mapbox-terrain-v2, unrelated) was deliberately left untouched. Session 32 found
  and fixed the actual reason a real-device before/after test of this fix showed "no meaningful size
  difference": the app's displayed offline-area size was never a real byte measurement to begin with — see
  Architecture notes' "Bathymetry removal from vectorbase" entry, its own "Session 32" sub-bullet, for the
  full root-cause finding and the new real-bytes logging hook it added (`window.FieldMapDebug`).
- Slope Angle and Custom Elevation Range are two new Environmental-section overlay layers (Session 38) —
  both pure client-side derivatives of the same DEM/terrain-rgb tile bytes already fetched for elevation
  lookups, computed in a Web Worker and rendered as ordinary MapLibre raster layers via a custom
  `maplibregl.addProtocol` tile source. Slope Angle: a 6-band color-coded steepness raster (green 20-25°
  through blue 45°+, under 20° transparent), with its own opacity slider and a floating color-band legend
  when active. Custom Elevation Range: a user-defined min/max elevation band (feet) highlighted as a solid
  cyan wash with a deeper-cyan edge line at the band boundary — a deliberately blank tool with no presets.
  Neither adds anything to offline download size (both ride on the existing 'dem' download layer, no
  network requests of their own). See Architecture notes' "Slope Angle and Custom Elevation Range overlays"
  entry for the full design.
- Aspect (Session 40) is a third Environmental-section overlay sharing Slope Angle's own DEM gradient
  computation — keeping the compass-facing direction the gradient already computes, instead of the steepness
  magnitude Slope Angle keeps. Colors an 8-direction hue wheel framed around temperature/sun-exposure
  intuition (blue=north/coldest through green-yellow=east, orange-red=south/warmest, purple=west), with its
  own opacity slider and a compass-wheel-style legend (not a linear band list). Mutually exclusive with
  Slope Angle at runtime — turning either on automatically turns the other off, with a toast explaining why,
  since both fully color-wash the same terrain pixels and would otherwise visually fight over the same
  surface. Its on/off state resets to off at every launch (opacity persists) — deliberately following
  Elevation Range's persistence pattern, not Slope Angle's own persist-on-boot behavior; see Architecture
  notes' "Slope Angle and Custom Elevation Range overlays" entry's own "Session 40" sub-bullet for why. Same
  zoom cap (14) and "no offline download size impact" as Slope Angle/Elevation Range (rides the same 'dem'
  download layer).
- Draw Area/Bearing/Range Ring's in-progress status bars were repositioned to the same anchored bottom-right
  drawer pattern Pins/Tracks/Buffer already used (Session 41) — they'd been centered bottom pills since first
  built, an inconsistency never caught until now. Buffer (which reuses Draw Route's own `#draw-bar` directly)
  was already correct and needed no fix; confirmed via live testing, not assumed from code review alone.
- `#publicland-legend` had the identical off-by-sidebar-width centering bug `#slope-legend` was fixed for in
  Session 39 (flagged as "almost certainly" present at the time, now confirmed and fixed — Session 41).
- Disturbance History is an Environmental-section grouping (Session 42, offline-cache bridge added Session
  43, Wildfire History split into 3 time-tiers Session 44) — Wildfire History, Timber Harvest, and Timber
  Thinning, independently-toggleable live viewport-bbox overlays sourced from NIFC's fire perimeter history
  and USDA Forest Service FACTS timber data. These are real `DOWNLOAD_LAYERS`-backed layers (downloading an
  area fetches and caches real bytes, contributing accurately to the size estimate) AND the live
  viewport-query path checks that offline cache first, before falling back to a live network query — so a
  downloaded area's data genuinely renders while offline, not just contributes a byte count. The one
  accepted tradeoff: an offline-cached view is a snapshot frozen at download time — it can't gain
  newly-reported fires/treatments on its own, though Timber's 15-year lookback (enforced client-side, at
  apply time) does still correctly age treatments OUT of the window even from a stale cached snapshot.
  Wildfire History (renamed from "Wildfires") is no longer one layer — it's 3 independently-toggleable time
  ranges (Recent 0-20yr, Older 20-50yr, Even Older 50+yr, all default off), each with its own 4/3/3-band
  internal recency-gradient and its own server-side year filter, so checking only "Recent" (the common case)
  fetches and renders a fraction of the full ~98K-feature/125-year dataset instead of everything — the fix
  for a real-world slow-load report on cellular. Its 3 checkbox labels were shortened Session 47 ("Wildfire
  History — Recent (0-20 yrs)" → "Wildfire — Recent (0-20 yrs)", same for Older/Even Older) to fix a real
  text-wrap bug, and Timber Harvest/Thinning's diagonal hatch fill went through two density passes — Session
  44 moved the wrong dimension (thicker lines, barely more of them), Session 45 corrected it (smaller tile
  size for genuinely more, thinner lines) — see Architecture notes' "Disturbance History" entry, its own
  "Session 43"/"Session 44"/"Session 45"/"Session 47" sub-bullets, for the full bridge, tier-split, and hatch/
  label designs.
- Tap-stack (Session 46) is a generic disambiguation list covering every tappable object/layer type in the
  app (16 types — every user-drawn object plus every read-only info layer, pins excluded since they're DOM
  markers, not map layers) — tapping a point where 2+ features overlap shows a basic list instead of
  silently opening only whichever one MapLibre's own layer-registration order happened to pick; tapping a row
  opens that item's existing, completely unmodified detail view, with a "← Back to list" pill shown only when
  reached that way. A genuine single-feature tap is completely unaffected — see Architecture notes' "Tap-
  stack" entry for the full design.
- Draw Route/Buffer's "Snap to trail" now has an offline fallback (Session 48) — when the real path-traced
  ORS snap can't run or fails, each dropped waypoint independently snaps to the nearest trail/road line from
  already-downloaded vector tile data (pure nearest-line geometry, not real routing between points) instead
  of just failing. The mode-selector (car/walk/hike) overflow bug reported after an earlier fix attempt was
  also properly fixed this time — it now lives on its own row, unaffected by how wide the stats text grows.
  See Architecture notes' "Draw Route/Buffer mode-selector overflow" and "Offline point-snap for Draw Route/
  Buffer" entries for full detail, including this session's real device-verification gap: real trail/road
  snapping against actual Mapbox road data couldn't be exercised in this sandbox (Mapbox vector-tile access
  is blocked here, same as every prior session touching road/terrain data) — the underlying mechanism was
  proven correct against real, non-Mapbox line data instead, but confirming actual road/trail snap accuracy
  still needs a real device.
- Fixed a real-world progressive offline-data-loss bug (Session 49) reported from a multi-day field trip: a
  178MB offline download (Z9-Z15, USGS Topo/Topo/DEM/Public Lands) worked immediately after download in
  airplane mode, then progressively went blank over the following days, worse with each app session. Root
  cause, investigated (Session 49a, investigation-only) then fixed (Session 49b): the composite vector source
  (backing Topo/Topo Dark/Aerial+Topo — streets+terrain tiles) and the `mapbox.satellite` raster source
  (backing Aerial/Aerial+Topo) were both still left as `url:'mapbox://...'` → TileJSON descriptors by
  `loadStyle()`'s own regex — the EXACT bug already found and fixed for the DEM/raster-dem source (see that
  fix's own comment in `reinitializeLayers`, which explicitly documents Mapbox's real v4 TileJSON response
  injecting a session-varying "sku" tracking param into the resolved tile URL template), just never applied
  to these two. Every app boot (a fresh `maplibregl.Map` is constructed on every launch, nothing style-related
  persists across reloads) re-resolves the composite/satellite TileJSON fresh; since that TileJSON URL is
  itself served via the service worker's stale-while-revalidate strategy for `TILE_HOSTS`, ANY momentary
  connectivity at boot silently overwrites the cached TileJSON with a NEW sku-tagged tile template — orphaning
  every previously-cached tile (both offline-downloaded AND casually-browsed) under the old sku, with zero
  visible warning. This uniquely explains "worked right after download" (no TileJSON re-fetch had happened
  yet) and "worse each session" (each launch with any signal re-rolls the sku). Fixed with the same pattern
  already proven for DEM: `patchStyleForOfflineTileParity()` (in `loadStyle()`, index.html) rewrites both
  sources to a static `tiles:[...]` array using the exact same sku-less URL pattern
  `DOWNLOAD_LAYERS.vectorbase`/`.satellite` already cache tiles under — verified byte-identical via a
  standalone Node simulation of the full transform pipeline against the real style JSON files, not just
  assumed. A second, independent layer of protection was added on top: tiles fetched by the offline
  downloader (`fetchAndCacheTile`) are now stamped with a marker header (`X-FieldMap-Offline-Download`,
  `OFFLINE_DOWNLOAD_HEADER` in both files — no shared-constant mechanism across a classic script and a
  service worker) that the SW's stale-while-revalidate handler checks before ever attempting a background
  re-fetch; a protected tile is served straight from cache with NO network request at all, permanently,
  regardless of how many sessions or connectivity blips occur — this covers the general design gap (no
  distinction between "casually browsed, safe to refresh" and "deliberately downloaded, must not be silently
  replaced") independent of the specific sku mechanism, so it also protects against a flaky-connectivity
  re-fetch simply returning a worse response for ANY tile host, not just Mapbox's. Also added `[BOOT]`
  `console.time`/`console.timeEnd` instrumentation across every major boot stage (`loadState()`, the
  synchronous portion of the boot chain up to the loading-overlay hide, `loadStyle()`'s fetch+parse, Map()
  construction, first `style.load`, first `render`, first `idle`) to diagnose a separately-reported ~8s white
  screen on every launch (online or offline) — instrumentation only, not yet run on a real device; see
  Architecture notes' "Offline tile cache-key parity + protected downloads + boot timing" entry for full
  detail on both fixes, what was verified from this sandbox (byte-identical URL construction for all 3 local
  styles' composite source, `aerial-streets-style.json`'s satellite source, and the full protect/skip-fetch
  logic against real `Headers`/`Response` Web API objects with a mocked Cache Storage container) and what
  still needs a real device (the remote `aerial` Studio style's satellite source structure, the actual
  incident scenario end-to-end, and the boot-timing numbers themselves — this sandbox's Mapbox v4 access is
  blocked, same limitation as every prior session touching DEM/vectorbase).
- Session 49's `[BOOT]` timing markers are now viewable on-device with no computer (Session 50) — the real
  testing environment for the white-screen investigation is an iOS home-screen PWA with no Mac available for
  remote Safari inspection, so console-only output was never actually reachable there. `finalizeBootTiming()`
  persists a full readable summary (every stage's ms, pin/track counts, online status, navigation type, and a
  cold-launch-vs-recently-backgrounded classification — see below) to localStorage once the map reaches its
  first `idle`, plus a capped rolling history of the last 10 launches so "is this slow every time" is
  answerable from the device alone, not just the latest snapshot. Viewed via 5 taps on the version number in
  Tools → About (a `?debug=boot` URL param was considered and rejected — a standalone iOS PWA has no visible/
  editable address bar to append one to). Also added a launch-gap diagnostic: since a genuine "warm resume"
  (briefly backgrounded, still alive in memory) never re-executes any of this boot code at all — there's
  nothing to time in that case — the actually answerable question is instead "how long was the app
  backgrounded before THIS full reload happened," which distinguishes a normal cold start after real idle
  time from the OS aggressively reclaiming the PWA's process after only a few seconds backgrounded (the latter
  would explain an 8s delay on every single open regardless of how briefly the app was away). See Architecture
  notes' "Offline tile cache-key parity + protected downloads + boot timing" entry, its own "Session 50"
  sub-bullet, for the full mechanism and what was verified (extraction-based tests running the real code
  against mocked browser APIs, not a reimplementation) versus what still needs the real phone.
- Two boot-timing follow-ups (Session 51), triggered by a real captured data point contradicting Session 50's
  own instrumentation: the app's own [BOOT] stage timers only ever summed to ~600-665ms, while the real
  reported cold-launch delay was ~8s — meaning the actual bottleneck was happening BEFORE this app's own boot
  code even starts running, structurally invisible to any marker placed inside it. (1) Now captures
  `performance.getEntriesByType('navigation')[0]` — populated automatically by the browser, no app-code
  involvement — surfacing network fetch timing (TTFB, download, whether the shell was served from cache or
  network via transferSize), service worker startup (`workerStart`), and document-parse milestones
  (domInteractive/domContentLoadedEvent*/domComplete/loadEventEnd), plus a headline number: the raw
  `performance.now()` value at the moment this app's own first boot marker fires, which directly quantifies
  how much of an observed delay happened before any existing [BOOT] timer could have seen it. (2) Fixed a real
  accuracy bug in the Session 50 launch-gap classifier: a genuine field data point — a 2-minute gap flagged
  "SUSPICIOUS — possible aggressive OS process reclaim" — turned out to be an entirely ordinary user-initiated
  force-close, not an OS problem. Investigated (per explicit instruction, before writing any code) whether
  force-close and OS reclaim are actually distinguishable from web code at all: they are NOT — both look
  identical to page JS (the same `visibilitychange`-to-hidden fires either way, `pagehide`/`beforeunload` are
  documented as unreliable on mobile Safari/WKWebView for exactly this kind of background termination and
  don't differ between the two cases regardless, and no lifecycle API exposes OS-level termination cause to
  a page, deliberately, for the same reason apps can't see what else is running). The classifier no longer
  guesses a cause — it reports gap duration as plain data with an explicit "cause not determinable" disclaimer
  baked into the label itself, restoring (and slightly improving, with real seconds-level precision for
  sub-minute gaps, lost when the old SUSPICIOUS-specific branch was removed) Session 50's gap-duration
  reporting without the false-authority verdict. See Architecture notes' "Offline tile cache-key parity +
  protected downloads + boot timing" entry, its own "Session 51" sub-bullet, for full mechanism detail and
  verification (extraction-based tests against a realistic mocked PerformanceNavigationTiming entry, not a
  reimplementation) — the real boot-timing numbers and the honest "not determinable" framing both still need
  the real phone to matter, same limitation as every session in this thread so far.
- Service worker internal timing + Cache Storage size reporting (Session 52), closing the exact gap Session
  51's own Navigation Timing capture surfaced: ~8.4 of ~8.68 reported cold-launch seconds sat between
  fetchStart and responseStart for the shell's own navigation request, with transferSize:0 (served by the
  service worker's own cache-first handler, not the network) and TTFB reading n/a — precisely the scenario
  MDN documents Navigation Timing as unreliable for once a service worker is intercepting the response.
  service-worker.js now times itself directly (script start, install, activate start/complete, first fetch
  event, and specifically the shell/navigation request's own received→respondWith duration) using
  `Date.now()` throughout (not `performance.now()` — a SW is a separate JS context with its own unrelated
  time origin, and epoch time needs no reconciliation to compare across contexts), persisted two ways for
  reliability (a `postMessage` broadcast, which can race a genuine cold start where the page's own listener
  isn't registered yet; and a small dedicated Cache Storage entry the page can pull at its own convenience,
  any time later — the actually-reliable path). Also reports live Cache Storage stats at boot — entry count
  for every named cache (App shell/Map tiles/GMU boundary data/this instrumentation's own tiny cache) plus an
  approximate byte total summed from `Content-Length` headers (never a full body read), capped at 2000
  entries per cache to avoid this diagnostic itself adding real boot-time cost for a large offline-downloaded
  tile area — falling back to `navigator.storage.estimate()`'s origin-wide total beyond that cap. Both surface
  in the same `#boot-timing-modal`/5-tap viewer, arriving asynchronously after the initial synchronous write
  (by design — neither can be allowed to delay it) and rebuilding/re-persisting the summary in place once
  ready. See Architecture notes' "Offline tile cache-key parity + protected downloads + boot timing" entry,
  its own "Session 52" sub-bullet, for full mechanism detail and verification (extraction-based tests against
  a mocked multi-cache Cache Storage implementation, not a reimplementation) — the real numbers, and whether
  SW startup time actually scales with cache size as hypothesized, both still need the real phone, same
  limitation as every session in this thread so far.
- Fixed a real, long-standing silent Export failure (Session 53): clicking Export produced zero visible
  response — no error, no console output, no file prompt. Two independent bugs, both introduced in the same
  historical reorg that moved Export from a sidebar button into the Tools sheet (see that entry's own
  "Session 53" sub-bullet under Architecture notes for the git-archaeology confirming exactly when, and how
  long this has been broken). (1) `#export-menu` lost its `.dropdown-wrap` anchor when its trigger moved to
  the Tools sheet, and gained an inline `position:fixed` override with no JS ever set to actually position it
  — under `position:fixed`, the `.dropdown-menu` class's own `top:calc(100% + 6px)` resolves against the
  *viewport*, not a nearby element, rendering the menu entirely below the visible screen on every open. (2)
  `#sheet-export-btn`'s click handler never called `e.stopPropagation()`, so the same click that opened the
  menu also bubbled to the document-level outside-click-dismiss listener (`export-menu` is a member of
  `OUTSIDE_CLICK_DISMISS_IDS`), which immediately closed it again in the same event — a second, independent
  reason it would have stayed invisible even with (1) alone fixed. Confirmed via code review that Export
  itself has no account-specific logic anywhere in the chain (`exportGeoJSON`/`exportGPX` read directly from
  the live, module-scope `state.pins`/`state.tracks` — whatever account is currently signed in — with zero
  conditionals gating on account identity), so the account-switching scenario in the original report was never
  actually implicated. Verified live end-to-end: Export now opens correctly positioned and stays open; GeoJSON
  and GPX exports both produce correct files containing real test-pin data; the exported GeoJSON was fed back
  through the real import pipeline (via a programmatic `DataTransfer`/file-input `change` event, since a
  native OS file-picker dialog can't be scripted) and correctly parsed back into the same pin, including
  correctly flagging it as a likely duplicate against the still-present original — confirming the full export
  → import round trip (the actual cross-account use case from the bug report) works; zero console errors
  throughout. One real testing-environment gotcha hit and resolved, not an app bug: a stale service worker
  served an old cached copy of `index.html` mid-session after the second fix landed, making it look like the
  fix hadn't taken — resolved by unregistering the SW and clearing Cache Storage before reloading, the same
  documented gotcha noted in many earlier sessions' own testing notes.
- Wildlife Layers panel restructured (Session 54): the old 2-top-level-tab (Habitats/Migrations) + 3-subtab
  (Big Game/Upland Birds/Small Game) picker is replaced by 3 top-level categories — Big Game, Upland Game
  (folds in the old Small Game species, presentation-only), and a brand-new Fish category — with a
  species-first flow: pick a species, then only the data sources that actually exist for it (Habitat range /
  Migrations / State Data) appear, never an empty option. Migrations is no longer a top-level tab — it nests
  as a collapsible "X/4" section under whichever Big Game species has migration data. State Data is a new
  third source tier (alongside the existing GAP Habitat range and Migrations), wiring in 5 confirmed
  state-wildlife-agency sources (Washington fish, Oregon fish, Arizona fish, Utah upland, Nevada big
  game/upland/fish) via a manual per-species state picker matching GMU boundaries' own pattern. All internal
  "GAP" jargon was replaced with "Habitat range" throughout the user-facing UI. See Architecture notes'
  "Wildlife Layers restructure: Big Game/Upland Game/Fish, State Data" entry for the full design, the two
  real MapLibre bugs found and fixed while wiring it up, and what wasn't independently re-verified live this
  session due to a mid-session browser-tooling breakdown.
- Wildlife panel flow fix + unified per-species view + Fish recolor (Session 55): fixed the category-row
  checkbox in the main Layers panel — it was toggling Habitat range's own on/off flag directly, which only
  ever did something when a species with a Habitat range layer was ALREADY the active selection (this is why
  Upland's checkbox looked like it worked — Chukar was already selected from prior testing — while Big Game's
  and Fish's looked broken with nothing selected yet). It's now a genuine master visibility switch
  (`wildlifeMasterOn`) over everything currently configured for the active species — Habitat range,
  Migrations, State Data — together, without clearing any of those individual selections, same philosophy as
  the Aspect master toggle. Also embedded the State Data state picker directly into the species panel instead
  of a separate popout screen, so Habitat range / Migrations / State Data all appear and stay configurable
  together in one connected view once a species is picked — no more backing out to find the state picker and
  back out again to return. Fish's State Data layers recolored from a brown/tan "Habitat range" look to a
  blue family (matching AZGFD's own Trout Challenge site treatment), and a real bug fixed where Streams
  (polylines) were incorrectly rendering with a fill — root-caused to shape being guessed from each source's
  semantic layer name rather than its real GeoJSON geometry type, which also would have kept mis-rendering
  Washington's own fish layer (a polyline, despite being named "range" like every polygon source). See
  Architecture notes' "Wildlife panel flow fix, unified per-species view, Fish color/geometry correction"
  entry for the full design — this session could not reach a live browser at all (a persistent tooling
  breakdown, not the same as prior sessions' recoverable stalls) so none of it was re-verified live; this is
  flagged explicitly, not silently presented as tested.
- Wildlife panel category checkboxes, cross-tab persistence, and real State Data data-loading bugs fixed
  (Session 56) — this session DID get a genuinely working live browser (confirmed first, per explicit
  instruction, before any fix) and used it to root-cause and confirm-fix most of Session 55's reported
  regressions, several of which turned out not to be new regressions at all but pre-existing bugs Session 55
  simply couldn't see because it never had a working browser. Fixed: (1) the Big Game species dropdown's
  duplicated "Bear" headers and pure-alphabetical (not group-then-alphabetical) ordering — root cause was a
  missing `WILDLIFE_GROUP_ORDER.biggame` key (Session 54 added the equivalent bridge for `uplandgame` but
  never for `biggame`), confirmed live before and after; (2) removed "Blackbeard Island Deer" (a real but
  Georgia-barrier-island-only whitetail population, confirmed via the raw data file's own conservation_note)
  from Big Game — checked the full data corpus (17 big_game/35 upland/10 small_game species) and found this
  was the one genuinely out-of-scope entry, not a systemic uncurated-list problem needing Oregon-fish-style
  filtering; (3) the "category checkbox does nothing with no species selected" report — confirmed the master-
  toggle fix from Session 55 was real and correctly scoped, this was always a SEPARATE, still-unaddressed
  request (tapping "on" with nothing configured should open species selection, not stay inert) — implemented
  for all 3 categories identically; (4) the real root cause of "Fish state you configure doesn't stick" and
  "Washington's checkbox self-unchecks" — Session 55's own `wildlifeActiveByCategory`-style refactor never
  actually happened; a SINGLE shared `wildlifeActive`/`wildlifeStateDataActive` var still existed, so picking
  a species in any tab silently overwrote whatever a different tab had configured — confirmed live (Big
  Game's fully-configured Elk selection vanished, chip lines and all, the instant a Fish species was picked in
  the same panel session) and fixed with a genuine per-category data model (3 independent slots, 3 independent
  map source/layer sets for State Data, since a single shared MapLibre source could only ever hold one
  category's selection at a time regardless of what the JS-level state remembered) — confirmed live afterward
  that Big Game and Fish can now both stay configured and rendering simultaneously; (5) added the requested
  Migrations "select all" checkbox to the section header. **The most consequential finding**: Oregon's fish
  data was never rendering because Oregon's own ArcGIS server (`nrimp.dfw.state.or.us`) sends NO CORS headers
  at all (confirmed via `curl -D - -H "Origin: ..."` against the real endpoint — zero
  `Access-Control-Allow-Origin` in the response, vs. real CORS headers from every other confirmed source:
  Washington, Arizona, Utah, Nevada) — a genuine, permanent, server-side block this app's client-side code
  cannot fix without a server-side proxy (out of scope); a real, no-longer-silent error toast was added instead
  of leaving Oregon showing nothing with no explanation. Separately, confirmed and fixed a real, distinct
  Washington bug: an unpaginated query silently caps at the server's own 2000-record limit — Washington's
  real SWIFD table has 73,373 features, so every prior fetch was an arbitrary ~2.7% slice — fixed with real
  ArcGIS pagination (adaptive page-size backoff, since Oregon's server additionally throws a bare HTTP 500 on
  any single request above roughly 300 records for geometrically dense layers, a second distinct failure mode
  found only by testing, not assumed). See Architecture notes' "Wildlife panel category checkboxes, cross-tab
  persistence, Oregon CORS block, Washington pagination" entry for full mechanism detail and exactly what was
  and wasn't confirmed live before this session's own browser tooling eventually broke down too (later and
  after far more was verified than Session 55 managed, but not everything — flagged explicitly below, not
  silently presented as fully tested).
- Fish stream/HUC12 click-priority fix, a real Big-Game-blocking crash bug found and fixed, State Data's
  boot-time staleness race fixed and live-proven, and a significant NEW unfixed bug discovered — Washington's
  full State Data dataset (73,373 features) crashes MapLibre's own internal `setData()` with `RangeError:
  Invalid string length` (Session 57) — see Architecture notes' "Fish z-order, Big Game crash bug, State Data
  staleness race, Washington render-size limit" entry for full mechanism detail on all four. Streams (and
  Lakes) now correctly win click priority over the HUC12 watershed context wash they share a layer with, via
  `fill-sort-key`/`line-sort-key` (paint order) and a click-handler-registration-order fix (MapLibre dispatches
  per-layer click listeners in REGISTRATION order, not paint order — confirmed by reading the vendored
  `maplibre-gl.js`'s own delegated-listener implementation, not assumed) — confirmed live: a real tap on a
  point where Arizona's Apache Trout Silver Creek stream and its containing HUC12 polygon both genuinely
  overlap now correctly opens "Apache Trout — Stream habitat," not the watershed. A real, previously-unknown
  crash bug was found and fixed along the way, root-caused as the reason Big Game's own State Data testing
  looked completely broken: `updateActiveLayersChip()` threw an uncaught `TypeError` whenever
  `wildlifeStateDataActiveByCategory[tc].stateKey` didn't resolve to a real `STATE_DATA_SOURCES[tc]` entry —
  since this function is called as one of the LAST steps of `setWildlifeSpecies`/`setWildlifeMasterOn`/
  `clearWildlifeStateData`, the uncaught exception silently aborted the REST of each of those callers' own
  execution every time, which meant `renderSpeciesToggles()` (called after it in `setWildlifeSpecies`) never
  ran again for the rest of that session — Habitat range/Migrations/State Data all stayed stuck hidden for
  EVERY Big Game species, not just whichever one first triggered the bad `stateKey`. Fixed with a defensive
  guard at both read sites. Confirmed the real fix by reproducing Nevada + Elk (Rocky Mountain) State Data end
  to end after the crash fix landed: real 140-feature NDOW data rendering as a genuine blue wash across
  Nevada, visually confirmed via a real screenshot, matching the exact feature count independently confirmed
  via `curl` earlier. Also fixed the real root cause behind item 5's original report (State Data silently
  showing stale/wrong data): the boot-time State Data restore path (inside `style.load`, gated by
  `overlayDataRestoredOnInit`) had NO staleness guard at all, unlike the manual-selection path — confirmed
  live with a deterministic real-network reproduction (a genuine 73,373-feature Washington fetch, kicked off
  as if from boot, with the active selection switched to Arizona while it was still resolving): the OLD code
  path would have silently overwritten Arizona's correctly-configured data with Washington's the moment that
  slow fetch finally resolved, with zero indication anything had changed; the fixed code correctly recognizes
  the resolved fetch as stale and discards it. Along the way, discovered a serious, NOT fixed this session,
  separate bug that's likely the real, full explanation for "Washington fish data never visibly renders" even
  independent of the staleness race: calling `map.getSource(...).setData()` with Washington's real, complete
  73,373-feature dataset throws `RangeError: Invalid string length` inside MapLibre's OWN internal
  `_updateWorkerData` (confirmed via the browser's own real stack trace, reproduced twice independently — once
  for the 7.2MB `big_game` Habitat range GAP file on ordinary boot, once for Washington's State Data) — a
  real MapLibre-library-level limitation this app's own code doesn't control, confirmed via live bisection to
  sit somewhere between 40,000 (renders fine) and 73,373 (crashes) features, unrelated to the staleness-guard
  fix, which only prevents a stale write — it does nothing to help this dataset actually render even when it
  IS the current, correct selection. See "What's broken" below.
- Wildlife Layers: real fixes for the "Upland Game shows blue" and "State Data auto-unchecks" reports, both
  re-diagnosed from scratch live rather than trusting a prior session's "shared-by-design"/"crash-fixed"
  conclusions, since neither actually held up under the user's own real-device testing (Session 58). "Upland
  Game shows blue" was NOT a color-value bug — `getPaintProperty()` and an isolated screenshot both confirmed
  Habitat range's own fill/line are correctly rust (`#c2622d`/`#8a4520`) for every Upland species tested,
  Ring-necked Pheasant included, not just Chukar. The real bug: State Data's own fill/line layers are added
  to the map AFTER (and therefore paint on top of) Habitat range's, so whenever a species' Habitat range AND
  its State Data are BOTH active — an entirely ordinary thing to do — State Data's more opaque blue wash
  completely covers Habitat range's more transparent rust wash wherever they overlap, confirmed via a real
  screenshot (Ring-necked Pheasant + Utah: solid blue, zero visible rust, despite both layers correctly
  configured and listed in the active-layers chip). Fixed by moving Habitat range's fill/line to the top of
  the layer stack after State Data's own layers are added — confirmed live this measurably changes the result
  from solid saturated blue to a muted blend where rust is now visibly present, though a fully "clean rust"
  look isn't achievable through z-order alone (two translucent washes over the same pixels), noted openly
  rather than overclaimed. "State Data auto-unchecks itself" was root-caused as NOT specific to any one
  category (the prior session's Big Game crash fix was real but was a DIFFERENT, additional bug layered on
  top) — the actual shared cause: `setWildlifeSpecies()` unconditionally cleared State Data (and reset the
  master toggle) on EVERY call, even when the incoming species name was IDENTICAL to the already-active one.
  Real browsers — mobile Safari/WebKit's native `<select>` picker in particular — are documented to sometimes
  fire a genuine 'change' event even when the user re-selects (or simply dismisses a picker still showing)
  the ALREADY-active option, with no real change having happened; every such spurious event was silently
  wiping a fully-configured State Data selection. Reproduced live: dispatching a same-value 'change' event on
  a freshly-reloaded, fully-configured Big Game (Elk/Nevada) selection immediately cleared it. Fixed with a
  no-op guard for a same-value call; confirmed live across all 3 categories (Big Game/Upland Game/Fish) via
  real DOM checkbox reads after genuine species switches, category switches, AND simulated same-value
  'change' events on each — all three panels correctly retained their own independent State Data selection
  throughout. See Architecture notes' "Upland Game z-order fix, State Data same-species no-op guard" entry
  for full mechanism detail.
- The REAL, single root cause of "State Data checkbox unchecks itself on reopen, chip never appears" (Session
  59) — this was never the same-species no-op guard from Session 58 (a different function entirely, confirmed
  by direct code-path tracing, not by re-running the old test) and turned out not to be a race/timing bug
  either, despite the real ~30-40 SECOND live latency this session measured against Nevada's and Utah's real
  ArcGIS endpoints (confirmed via direct browser `fetch()` timing, not assumed) initially looking like the
  likely cause. The actual bug: `renderStateDataSection()` always shows a state pre-selected in the `<select>`
  — either the genuinely active one, or just its first option as a display default when nothing is active yet
  — and the two are visually indistinguishable to a user. Checking the State Data checkbox WITHOUT first
  interacting with a `<select>` that already *looks* like it has the right state chosen never fired the
  select's own `'change'` handler (`setWildlifeStateDataState`, the ONLY thing that ever wrote
  `wildlifeStateDataActiveByCategory[tc]` and started the real fetch) — the checkbox's own handler
  (`setWildlifeStateDataOn`) used to just flip the `on` flag with no active state behind it: nothing loaded,
  no chip line, and on reopen `renderStateDataSection`'s `isActiveSelection` check read false (active was
  still `null`), rendering the checkbox unchecked despite the underlying `on` flag still genuinely being
  `true` — a real, reproducible DOM/state desync, not a flaky race. This explains every single data point in
  the bug report with one mechanism, confirmed by testing each: Big Game has exactly one state (Nevada) per
  species, so the select never NEEDS touching — universally broken, matching the report exactly. Upland Game
  species with only one state option (Dusky Grouse: Nevada only) hit the identical single-option case.
  "Utah Ring-necked Pheasant" (explicitly flagged in the bug report as NOT a legitimate data gap) turned out
  to ALSO be a single-option species — confirmed via the catalog that it exists in Utah's source only, not
  Nevada's, contrary to this session's own initial mis-read of the catalog — so it hit the same case; a real,
  live, non-empty fetch against Utah's real endpoint (`Utah_Ringnecked_Pheasant_Habitat/FeatureServer`,
  confirmed via a real captured network request AND a direct `fetch()` returning real feature data) proves
  this was never a genuine no-data state, exactly as the user insisted. Nevada Chukar/California Quail (the
  two reported as "working") both have TWO state options (Utah listed first in `STATE_DATA_SOURCES`, so it's
  the `<select>`'s default) — reaching Nevada, the non-default option, required a real dropdown interaction,
  which correctly fired the select's own change handler and worked all along; this is why they looked
  unrelated to the "broken" species until traced to the same underlying mechanism. Fixed by making
  `setWildlifeStateDataOn(on)` treat "check the box with nothing active yet" as equivalent to "pick whatever
  the select is currently showing" — routes through the exact same `setWildlifeStateDataState()` path a real
  dropdown interaction already takes (including its existing fetch-failure toast), rather than a bare flag
  flip with nothing behind it. Also added an honest empty-result toast (`loadStateDataLayer`, alongside the
  existing fetch-failure toast) for the separate case of a real, successful fetch that returns zero features
  — previously indistinguishable on screen from a silent failure. See Architecture notes' "State Data checkbox
  silently unchecking — the real single-cause fix" entry for full mechanism detail and live verification
  across all 3 categories.
- MapLibre's `GeoJSONSource.setData()`/`_updateWorkerData()` payload-size ceiling (the same crash documented
  in the Washington "What's broken" entry below) is now DEFINITIVELY resolved for future large-dataset work
  (Session 60) — `updateData({add:[...], update:[...], remove:[...]})` genuinely avoids the crash (proven via
  vendored source reading, not just testing) AND its paint refresh works correctly out of the box, confirmed
  with real visual before/after screenshots against dense synthetic polyline data (50-15,000 vertices/feature,
  matching Oregon fish habitat's real shape) — no forced repaint or special lifecycle trigger was needed. The
  one real, non-obvious catch, found only through direct empirical measurement: `updateData()`'s worker-side
  diff processing re-derives and re-tiles the WHOLE accumulated dataset on every single call, not just the
  newly-added chunk — so per-call cost grows with the RUNNING TOTAL already in the source, not the chunk size
  alone (confirmed: adding just 500 features to an already-17,000-feature source took ~17.5s, matching the
  cost of the CUMULATIVE total, not a small diff). This directly shapes how Oregon's 34-species/884MB dataset
  must be structured — see Architecture notes' "MapLibre large-dataset payload ceiling: updateData() pattern"
  entry for the complete mechanism, the empirical chunk-size/cumulative-size timing table, and the concrete
  per-source sharding recommendation this produces.
- Oregon fish habitat data — the first real end-to-end run of the payload-ceiling `updateData()` pattern
  above — is now processed and sitting in `data/fish/oregon/` as 34 clean per-species GeoJSON files (Session
  61), converted from 56 raw Esri JSON files (32 species with stream data, 24 with lake data, 34 unique
  species total) pulled directly from ArcGIS REST. **Not yet wired into the map UI — that's a deliberate,
  separate follow-up** (per explicit instruction), so there is no new Layers-panel entry, no new map source,
  and no new rendering code from this session; this is data-prep only. A real, critical bug was found and
  fixed during processing, not glossed over: raw OBJECTID is only unique WITHIN one ArcGIS layer (a stream
  feature and a lake feature can share OBJECTID 1), so merging stream+lake per species without fixing this
  would have caused MapLibre's `updateData()` diff Map to silently drop/overwrite whichever feature lost the
  collision — exactly the class of bug this project has spent weeks chasing elsewhere. Fixed by reassigning a
  new globally-unique sequential id per species at merge time (original OBJECTID preserved in `properties`
  for traceability). Final sizes range from ~1KB (HybridBass, 1 feature) to 54.4MB (CoastalCutthroatTrout,
  53,337 features, down from 582MB pre-simplification/905MB raw) — 4 species (CoastalCutthroatTrout, Coho,
  WinterSteelhead, RedbandTrout) still exceed the "low-thousands-of-features" comfort band from the
  `updateData()` timing research and will need per-species sharding consideration (not attempted this
  session) once actually wired in. See Architecture notes' "Oregon fish habitat data processing pipeline"
  entry for the complete pipeline, every bug found and fixed along the way, and full verification detail.
- Oregon is now a real, live State Data option under Fish, for 30 of the 34 processed species (Session 62) —
  the first time the Session 61 offline-processed dataset and the Session 60 `updateData()` pattern have both
  actually shipped in the app, not just been proven/prepared. Reuses the EXACT existing Fish State Data
  architecture (species dropdown, checkbox, state `<select>`, shared `wildlife-statedata-fish-*` source/
  layers, Coldwater/Warmwater grouping via the already-existing `WILDLIFE_FISH_GROUPS`) with zero new UI —
  Oregon's old, never-actually-working live ArcGIS entry (permanently CORS-blocked, confirmed dead since
  Session 56) is replaced by a new `type: 'localFile'` source kind that fetches the Session 61 static files
  and, per explicit instruction, loads them via `updateData()` (never `setData()`), with the diff mechanism's
  required unique id resolved by the data's own top-level `feature.id` (no `promoteId` source option needed
  or set — that only ever reads `properties`, and the actual unique id lives at the GeoJSON-standard `id`
  location instead). CoastalCutthroatTrout/Coho/WinterSteelhead/RedbandTrout are deliberately omitted from
  the species list entirely (not "coming soon") until their geographic sub-sharding is designed. Live-
  verified across 3 species (Bull Trout, Largemouth Bass, Rainbow Trout — both Coldwater and Warmwater) with
  real fetches, real rendering (screenshots, via an isolated harness — this sandbox's own base map is stuck
  in the same long-documented Mapbox-loading limbo as every prior session, unrelated to this feature), and
  the full check→dismiss→reopen cycle holding correctly (including the specific checkbox-only-click path the
  Session 59 fix addressed). See Architecture notes' "Oregon fish State Data wiring" entry for full mechanism
  detail, the required updates to 3 other `src.type`-branching functions, and what was and wasn't verifiable
  live in this sandbox.
- Two independently-scoped Fish State Data fixes reported from real-device testing of Session 62's Oregon
  wiring (Session 63) — Fix 1: the state `<select>` was silently resetting on every species switch instead
  of remembering what the user last picked; Fix 2: Washington's fish State Data (real, correct SWIFD data —
  confirmed rendering correctly since Session 58) still routed through `setData()`, carrying the same
  `RangeError: Invalid string length` crash risk Session 57 found for its full 73,373-feature table. Fix 1
  adds a state memory (`wildlifeStateDataLastStateByCategory`) that survives a species switch independently
  of the species-scoped `wildlifeStateDataActiveByCategory`, and an honest "No data available for [state] —
  [species]" inline message (with the persisted state still shown, selected, in the `<select>` — a phantom
  `<option>` injected just for this case) whenever the remembered state genuinely has no data for the newly
  picked species, rather than silently defaulting to some other state the user never chose. Fix 2 extends
  `applyStateDataToSource`'s existing Oregon-only `updateData()` branch (built in Session 62) to Washington's
  `'unified'` source type too — Washington's real ArcGIS `f=geojson` fetch already carries a stable, unique
  top-level `feature.id` (confirmed via a live query before relying on it) with zero extra id-assignment code
  needed, unlike Oregon's own Session 61 merge step. Both fixes verified live and independently, per explicit
  instruction — see Architecture notes' "Fish State Data: state persistence across species switches, Washington
  updateData() retrofit" entry for full detail, including a real-device-grade live proof (an isolated
  `maplibregl.Map` harness fetching real West Patit Creek stream data from WDFW's live endpoint and rendering
  it via the retrofitted path) after this sandbox's main app tab's own Mapbox-loading stall (the same
  long-documented limitation as every prior session touching DEM/vectorbase) made direct in-app visual
  confirmation unreliable partway through.
- Fixed a real regression from Session 63, found on a real device (Session 64) — switching the State Data
  state `<select>` left the PREVIOUS state's data fully rendered on the map for the entire duration of the
  new state's fetch, most visibly whenever Washington (a real, slow, ~35-request paginated fetch of its full
  73,373-feature table) was on either side of the switch, since Oregon/Arizona/Nevada/Utah's own much faster
  fetches made the same underlying gap imperceptible. Root cause was never about source TYPE (localFile vs.
  unified both already hit the exact same clear-then-apply branch in `applyStateDataToSource`) — it was
  about WHEN that function is ever called: only from inside the new state's own fetch-completion callback,
  so nothing visibly changed on screen until the ENTIRE new fetch resolved. Fixed with a new
  `clearWildlifeStateDataSource(tc)` helper, called synchronously the instant a new state is picked —
  before the new fetch even starts — so the old state's rendered data disappears immediately regardless of
  source type on either side of the switch, confirmed live for all 4 directions (Oregon↔Washington,
  Arizona↔Washington). See Architecture notes' "Fish State Data: state persistence across species switches,
  Washington updateData() retrofit" entry, its own "Session 64" sub-bullet, for full mechanism detail.
- Washington temporarily removed from the Fish State Data state selector (Session 65) — deliberate, not a
  bug fix: WDFW's own live endpoint (`geodataservices.wdfw.wa.gov`) is confirmed returning HTTP 500 at every
  page size the existing adaptive-backoff pagination tries (2000/500/125), a real server-side outage
  unrelated to this app's request logic or to the Session 63/64 `updateData()`/immediate-clear fixes (both
  confirmed still correct). `STATE_DATA_SOURCES.fish.wa` gained a `disabled:true` flag that
  `stateDataOptionsFor` now skips, exactly the same "omit entirely, not greyed out" treatment already used
  for Oregon's 4 deferred species — Washington's catalog entry, URL/attribution, and every loading/clearing
  code path that reads it (`loadStateDataLayer`, `applyStateDataToSource`, `clearWildlifeStateDataSource`)
  are all deliberately left completely untouched, so re-enabling it later (grouped with future Wyoming data
  work) is a one-line revert. See Architecture notes' "Fish State Data: state persistence across species
  switches, Washington updateData() retrofit" entry, its own "Session 65" sub-bullet, including a flagged
  live-verification gap this session hit and could not resolve.
- Watershed (huc12) zoom-based auto-hide for State Data (Session 66), inspired by the AZGFD Trout Challenge's
  own public map — once zoomed to Z10+, the huc12 coarse-basin-context wash (shared with real stream/lake
  detail data in the same fill/line layers, currently only present for Arizona's Trout Challenge species)
  auto-hides so it doesn't clutter the real distribution data it's rendered alongside, and reappears when
  zoomed back out — but ONLY when a real stream/lake detail layer is also present for that pick; a
  watershed-only selection (not reachable with today's real catalog, but handled correctly regardless) stays
  visible at any zoom. Pure filter-based (no new toggle/setting) — `map.setFilter()` on the shared
  `wildlife-statedata-{tc}-fill`/`-line` layers, driven by a `map.on('zoom', ...)` listener plus a recompute
  wired into the existing `updateWildlifeStateDataMapFilter()` (so every State Data change already triggers
  it for free). Confirmed live, directly on the production map instance, that the real listener correctly
  toggles the filter crossing Z10 both directions, and confirmed via a real-data harness (byte-identical
  filter/click-handler code to the shipped app) that Session 57's stream-click-priority-over-huc12 fix holds
  correctly below Z10, above Z10, and after reverting. See Architecture notes' "Watershed (huc12) zoom-based
  auto-hide" entry for full detail, including a flagged gap: a raw mouse click specifically on the live
  embedded app's own tiny rendered stream line could not be landed this session due to an unresolved
  coordinate-mapping issue for that tab (confirmed unrelated to this feature — even clicking known, large UI
  buttons at their own computed screen coordinates failed the same way).
- Wildlife State Data added to Tap-stack's multi-layer disambiguation list (Session 67). Investigated first,
  per explicit instruction: Tap-stack (Session 46) still exists, is not regressed, and correctly covers all
  16 of its original types — the gap was that Wildlife STATE DATA (`wildlife-statedata-{tc}-fill`/
  `-line-streams`, e.g. Nevada Chukar — a real, independently-clickable layer since Session 54) was never
  added to `TAP_STACK_TYPES`, simply because that layer type didn't exist yet when Tap-stack was built. A
  full audit of every `map.on('click', ...)` registration in the file (documented below) confirmed this was
  the ONLY gap — every other click-handled layer type was already correctly registered. Fixed by extending
  the existing registry with one new `wildlifestatedata` entry (not a rebuild) — a tap hitting a Range Ring/
  Buffer overlapping an active State Data species (the task's own Nevada Chukar example) now correctly shows
  the disambiguation list with the real species name, exactly like every other type already did. Verified
  live end-to-end with a real overlap (a genuine Nevada Chukar State Data polygon plus a real drawn Buffer,
  both confirmed overlapping via `queryRenderedFeatures` before testing): the list showed all 3 real
  overlapping items with correct names ("Tap-stack Test Buffer · 0.5 mi", "Chukar · Habitat", "Chukar ·
  Distribution · Nevada"), each opened its own correct, unmodified popup when picked (including "← Back to
  list" working for the new type with zero extra wiring), a single-remaining-hit tap opened directly with no
  list step, and dismissing the list via its own × opened no popup (confirmed via computed `display:none` on
  the drawer, not just DOM text which can be stale leftover content). See Architecture notes' "Tap-stack:
  Wildlife State Data extension" entry for the full click-handler audit and verification detail.
- Pin-to-pin navigation (Session 68) — a new, ephemeral (device-session-only, never persisted) live
  bearing+distance readout to a single selected pin, reached either by tapping a pin's marker or its sidebar
  row to open its popup, then "Navigate to" in the overflow menu (⋮) — a new menu item added only to the pin
  popup, alongside the existing Move/Delete. North-relative (true bearing, no device-orientation sensor or
  permission prompt — pure great-circle math from the live GPS position to the target's coordinates, reusing
  the exact same primitives Compass/the Bearing tool already use: `bearingDegrees`/`bearingCardinalLabel` for
  angle, `formatDist` for distance — matching the app's existing feet/miles-only, no-metric convention rather
  than Compass's own inconsistent mi+km display). Single target only — picking a new pin always replaces the
  prior one, with zero multi-target/accumulation state. Reuses the Session 37 shared GPS watcher as its own
  additional consumer rather than a new independent `watchPosition`. Renders as a new chip
  (`#nav-chip`/`#nav-chip-mobile`) joining the existing floating info stack: on desktop, another chip in the
  same vertical top-right column (same width/padding/height as the coords/scale/trip chips); on mobile, its
  own full-width 3-column bar (distance / arrow / bearing) sitting directly below the active-layers chip,
  matching that chip's already-established full-width-row convention rather than inventing a new layout.
  Shows "Waiting for GPS…" (a single unified message, not two different ones, matching spec) whenever there's
  no position fix yet, for any reason (no fix received yet, a permission-denied error, or the rare case
  `navigator.geolocation` doesn't exist at all) rather than stale or wrong numbers — updates live the moment a
  real fix arrives. Dismissed via an explicit × on the chip (both platform variants), matching the app's
  existing "Clear selection" dismiss convention; also auto-clears if the target pin itself is deleted (hooked
  into `deletePinById` plus both bulk-delete code paths, so it can't be left pointing at a pin that no longer
  exists). See Architecture notes' "Pin-to-pin navigation" entry for full design and verification detail.
- Pin-to-pin navigation refinements + Tap-stack pin-overlap fix (Session 69), both from real-device
  feedback/testing. The nav chip is now taller (56px desktop/44px mobile, up from 40px/32px) with a
  bigger, genuinely directional SVG dart/chevron arrow (replacing the old symmetric "▲" text glyph) instead
  of the original "same size as the other persistent chips" design — a deliberate deviation from the
  original spec, superseded by this explicit follow-up ask. The arrow is now device-heading-relative
  ("the phone acts as the compass") when device-orientation permission is granted — requested contextually
  at the exact moment navigation mode starts (tapping "Navigate to"), with a one-line `showToast()`
  explanation shown immediately before the native iOS permission prompt — and falls back cleanly to the
  original north-relative rotation (with distance/bearing text always staying absolute either way) if
  permission is denied, the sensor doesn't exist, or no heading has arrived yet; the chip never breaks.
  "Navigate to" now also auto-closes the pin's popup/overflow menu the instant navigation starts (was
  staying open awkwardly). Separately: fixed a real Tap-stack gap where a Bearing's line overlapping a pin
  never triggered the multi-item disambiguation list — re-investigated per explicit instruction using the
  same registry-audit approach as the earlier Wildlife State Data gap, but found a structurally different
  root cause this time (not a missing registry entry — Bearing was already fully wired into `TAP_STACK_TYPES`
  and working correctly): pins are DOM markers whose own click handler calls `e.stopPropagation()`, which
  means a click landing on a pin's marker element structurally never reaches the MapLibre canvas-level
  `map.on('click', ...)` dispatch Tap-stack's pre-check relies on — a different, deeper limitation than a
  simple missing table row, and one already explicitly flagged as a deliberate exclusion in `TAP_STACK_TYPES`'
  own comment. Fixed by having the pin marker's own click handler independently query
  `collectTapStackCandidates()` against the pin's own projected point before deciding whether to open its
  drawer directly or show the shared disambiguation list alongside whatever else (a Bearing's line, a Buffer,
  etc.) is really there — not a registry change, since a pin has no MapLibre layer/feature for
  `queryRenderedFeatures` to ever find. See Architecture notes' "Pin-to-pin navigation refinements + Tap-stack
  pin-overlap fix" entry for full mechanism/verification detail, including one real, deliberate remaining gap:
  two overlapping DOM markers (e.g. a pin sitting exactly on a Bearing's own separate target-arrow marker,
  not its line) still can't both be seen by one click — a browser-level constraint, not something Tap-stack's
  own mechanism can reach regardless of how it's wired.
- Hydrography now surfaces watershed (HUC12) names alongside stream/lake names (Session 70) — one more
  viewport bbox query to the same live NHDPlus HR service Hydrography already uses (layer 12, WBDHU12), not
  a new data source. A tapped stream/lake's popup meta line now reads "Stream · [watershed name]" (or just
  "Stream" when no watershed boundary is loaded/found at that point — a real, gracefully-handled edge case,
  not an error). Also wired into Tap-stack's own hydroflowline/hydrowaterbody `open()` functions for the same
  popup content regardless of which path opened it. See Architecture notes' "Hydrography watershed name
  display" entry for full mechanism/verification detail.
- Aspect redesigned from an always-on 8-direction wheel to 4 independent N/E/S/W cardinal toggles, each
  covering its own cardinal plus its 2 adjacent intercardinals (Session 70) — e.g. checking only "N" shows
  N/NE/NW terrain and leaves everything else transparent. The original `aspect-toggle` checkbox is now a
  pure master on/off switch that shows/hides whatever the current N/E/S/W selection is without ever clearing
  it, so cycling the whole overlay off and back on preserves specific picks. Same underlying color math and
  same mutual exclusion with Slope Angle as before — neither changed. Legend wheel now grays out whichever
  cardinal arcs are currently inactive. See Architecture notes' "Aspect: 4-cardinal-toggle redesign" entry
  for full mechanism/verification detail, including a real MapLibre `setTiles()`-resolves-via-
  `requestAnimationFrame` timing gotcha hit (and resolved) during this session's own live testing.
- The 4 oversized Oregon fish species (CoastalCutthroatTrout/Coho/WinterSteelhead/RedbandTrout) now carry a
  real NHD-derived stream-order/prominence field on every stream feature (Session 71) — `nhdStreamOrder`
  (Strahler order, MINIMUM across sampled points, a conservative choice for a future "hide minor tributaries
  until zoomed in" feature), `nhdDrainageAreaSqKm` (MAXIMUM upstream drainage area, a complementary
  continuous-value signal), and `nhdMatchConfidence` (0-1, how many sampled points found a close real NHD
  match). Data-prep only, matching Session 61's own precedent for this same dataset — nothing new is wired
  into the map UI or rendering yet; this just adds the field a future progressive-detail feature will read.
  Produced via a real, hand-rolled geometric nearest-line spatial join (no GDAL/geopandas/QGIS available in
  this environment, confirmed live before starting — matching Session 61's own already-established finding)
  against real NHDPlus HR flowline data fetched live from the same service Hydrography uses, covering 143
  real geographic tiles the 4 species' data actually touches. Match rate: 99.88%-100% across all 4 species
  (82,901 stream features, 82,852 matched). A real bug was found and fixed during verification, not glossed
  over: NHD uses `-9` as a genuine NODATA sentinel on a small fraction of its own flowline features (954 of
  1,792,465 fetched), which the first join pass didn't exclude — silently letting a sentinel poison the
  per-feature minimum-order calculation; re-run after excluding non-positive order values. See Architecture
  notes' "Oregon fish NHD stream-order join" entry for the full feasibility investigation, the memory-bounded
  join design (two earlier attempts at a single global spatial index ran out of heap — real NHD density
  across the full 4-species extent turned out to be ~1.78 million unique features, far more than a
  single-sample-tile extrapolation suggested), and full verification detail.
- Wired the Session 71 `nhdStreamOrder` field into real progressive zoom-tiered loading for the same 4
  oversized Oregon fish species (Session 72) — a deliberate alternative to the geographic sub-sharding
  Session 62 originally flagged as the eventual fix, and explicitly NOT a `setFilter()`-only approach (which
  would still pay the full ~50k-feature `updateData()` cost up front and just hide most of it visually,
  defeating the actual purpose). All 4 species are now selectable in the Fish species dropdown
  (`tiered: true` on their `STATE_DATA_SOURCES.fish.or.species` entries) — Tier 1 (major rivers,
  `nhdStreamOrder >= 6`, plus all lake features) loads immediately on selection; Tier 2 (medium,
  order 3-5, plus the small number of unmatched/null-order features) loads once via a single `updateData()`
  call the first time zoom reaches 8; Tier 3 (minor, order 1-2) loads the same way at zoom 11 — each tier
  loads exactly once (never re-triggered on later zoom ticks past its threshold) and, once loaded, is never
  unloaded on zoom-out. Real live-measured settle times (CoastalCutthroatTrout, the largest of the 4):
  Tier 2's `updateData()` call (adding 17,907 features, bringing the cumulative total to ~19,922) settled in
  ~3.0-3.4s; Tier 3's (adding 33,415 more, bringing the cumulative total to the full ~53,337) settled in
  ~3.5s — confirming the design holds up at real scale, with NO growing/non-linear blowup between tiers 2
  and 3 despite the cumulative total nearly tripling, a much better result than the earlier synthetic-data
  `updateData()` payload-ceiling research predicted (see that research's own entry) — explained by the real
  Oregon data already being heavily simplified (Session 61's mapshaper pass), so per-feature vertex
  complexity is far below the deliberately vertex-dense synthetic data that research used. See Architecture
  notes' "NHD tiered zoom-based loading (Fish, 4 oversized Oregon species)" entry for the full mechanism,
  every real number measured, and what was and wasn't verifiable live in the real app vs. an isolated harness.

## What's broken (expected, to be fixed in later sessions)
- Washington's State Data fish layer (SWIFD, 73,373 features statewide) crashes MapLibre's internal
  `setData()` with `RangeError: Invalid string length` (Session 57) — confirmed via a real stack trace,
  confirmed the exact same MapLibre-internal crash also hits the 7.2MB `big_game` Habitat range GAP file on
  ordinary boot. Live-bisected the failure boundary to somewhere between 40,000 (renders correctly — confirmed
  via real `queryRenderedFeatures` results after truncating a live source to that size) and 73,373 features.
  This means Washington's fish State Data currently cannot actually render on the map AT ALL, regardless of
  which species/location is selected — the fetch and pagination (Session 56) work correctly, the app's own
  filtering/staleness logic (Session 56/57) is correct, but the final `setData()` call to actually paint it
  crashes internally before anything reaches the screen. Not fixed this session — this is a genuine MapLibre
  v3.6.2 library-level limitation, not an app logic bug, and a real fix (likely splitting the dataset across
  multiple sources/layers, e.g. by county or by index range, or investigating whether a newer MapLibre version
  handles this differently) is a real architectural change, appropriately out of scope for this session's
  already-large fix list. UPDATE (Session 60): the fix path is now proven and documented — see Architecture
  notes' "MapLibre large-dataset payload ceiling: updateData() pattern" entry. `updateData({add:[...]})` in
  per-species (or further per-county/index-range) sharded sources, seeded empty with the correct `promoteId`,
  is the confirmed-working approach; still not applied to Washington's own data in this codebase as of Session
  60 — that remains a real, separate follow-up, not done automatically by proving the pattern works.
- Fire perimeter, hydrography, and gauge-station popups are still individual maplibregl.Popup instances,
  NOT converted to the new #view-drawer — deliberately out of scope for both drawer-unification batches (not
  named in either batch's spec), not a bug
- New-item creation flows (Add pin via +Add sheet, Draw Route/Area "Finish", compass "Save bearing") still
  use their classic centered modal — only EDITING an existing item (or continuing to refine a just-quick-
  saved tap-anywhere pin) expands the drawer in place; this was a deliberate scope line in the expand-in-
  place batch, not an oversight — see Architecture notes' #view-drawer entry
- GPS accuracy circle (gpsAccCircle) — declared but never assigned/rendered anywhere; confirmed (Session 15
  audit) this is a never-built feature, not a stalled Leaflet port — there's no leftover L.circle code for it
  either. Needs a MapLibre source/layer built from scratch, not a port.
- "Edit shape" vertex-editing exists for both routes and areas; there is no equivalent "edit vertices" for
  the offline-boundary rectangles (these are read-only display outlines, not user-drawn/editable shapes) —
  not in scope, different feature
- FIXED performance bug (was: every GMU toggle-on, even a cache hit, paid a 20-40+ second synchronous
  main-thread cost): buildLabelPointFeatureCollection's per-feature pole-of-inaccessibility grid search
  (bestLabelPointForGeometry) is genuinely expensive on real government boundary data (Idaho: 100 features/
  558K ring vertices = ~40s; Utah: 152 features/571K vertices = ~40s — confirmed via [GMU-PERF] console.log
  instrumentation, left in place, in ensureGmuStateLoaded/readGmuDurableCache/showGmuState/
  buildLabelPointFeatureCollection). Root cause is the agency data being full legal-boundary precision
  (20+MB/state) rather than web-mapping-simplified — not specific to Idaho, not caused by this session's
  caching work (which correctly eliminated network latency; it just exposed that label computation, not
  network, was always the dominant cost). Fix: the computed label-point FeatureCollection is now cached
  alongside the raw GeoJSON — in-memory (gmuLabelCache) and in the same durable Cache API entry as gmuCache's
  data (writeGmuDurableCache/readGmuDurableCache now store/read {data, labelFc}, with backward-compat for
  cache entries written before this — a bare FeatureCollection is treated as "labels not computed yet").
  showGmuState only invokes buildLabelPointFeatureCollection when labelFc is missing; a genuine one-time
  computation shows an honest toast ("[State] unit labels — setting up (one-time)…", via showToast/
  hideToastNow) with a double-requestAnimationFrame yield first so the toast actually paints before the
  synchronous work blocks the thread. Verified: first-ever toggle for a state still takes the full ~40s with
  the toast visible throughout; every later toggle (same session, in-memory hit) drops to ~180-300ms sync
  work (150-230x faster); a toggle after a full page reload (durable-cache hit including labelFc) is
  ~1-1.5s (just JSON-parsing the larger cached blob, no recomputation) — confirmed for both Idaho and Utah.

## Architecture notes
- MapLibre large-dataset payload ceiling: `updateData()` pattern (Session 60) — resolves, definitively, the
  open question left by an earlier (undocumented — a real CLAUDE.md gap, not a false lead) research session:
  whether MapLibre's `GeoJSONSource.setData()` crash on very large datasets (see the Washington "What's
  broken" entry) has a working fix, and specifically whether the fix's paint actually refreshes correctly,
  not just avoids the crash at the data level. This directly unblocks scoping Oregon fish habitat processing
  (34 species, one raw source file alone 884MB before conversion/simplification).
  - **The crash, confirmed via the vendored `maplibre-gl.js` source, not just observed behavior**:
    `GeoJSONSource.setData(t)` sets `this._data = t` then calls `this._updateWorkerData()` with no argument;
    inside that method, the no-diff branch does `i.data = JSON.stringify(this._data)` before ever handing
    anything to the worker — a full-dataset `JSON.stringify()` on the MAIN THREAD, which throws
    `RangeError: Invalid string length` the instant the serialized result would exceed V8's hard string
    ceiling (536,870,888 UTF-16 code units) — not a MapLibre-specific limit, a fundamental JS engine one,
    confirmed identical in this session's own Node and Chrome tests. Re-confirmed live this session against
    the REAL public API (not just a raw `JSON.stringify()` call): `source.setData(fc)` on a dataset already
    past this ceiling throws the identical `RangeError` synchronously, before any network/worker activity —
    it never even reaches an async `'error'` event, so a `try/catch` around the call is the only way to
    observe it.
  - **Why `updateData()` avoids it, confirmed via source, not assumed**: `updateData(t)` calls
    `this._updateWorkerData(t)` — WITH the diff object as an argument. Inside `_updateWorkerData`, when an
    argument IS passed, the code takes an entirely different branch: `i.dataDiff = e` — the full-dataset
    `JSON.stringify()` branch is never reached at all. The message (`{dataDiff: {add/update/remove/removeAll}}`)
    goes to the worker via `this.actor.send(...)`, which itself uses `postMessage` with structured clone (a
    custom `Dn()`/`On()` serializer pair, confirmed by reading the Actor class), not `JSON.stringify` — this
    is what actually lets a diff-based update sidestep the V8 string-length ceiling: structured clone has no
    such fixed character-count limit, its costs scale differently (see the cumulative-cost finding below,
    which is the REAL practical ceiling for this path).
  - **A real, non-obvious prerequisite, found only by reading the WORKER-side code, not just the source
    class**: `updateData()`'s diff can only ever be applied against a worker-side `_dataUpdateable` — a
    `Map<id, feature>` the worker builds from a genuine FULL load (`ge(data, promoteId) ? me(data, promoteId)
    : void 0`). `ge()` is a strict validity check: EVERY feature in that full load must have a non-null,
    UNIQUE id (`feature.id`, or `feature.properties[promoteId]` if a `promoteId` source option is set) — if
    even one feature is missing an id, or two features share one, `_dataUpdateable` is set to `undefined`,
    and every subsequent `updateData()` call on that source throws `"Cannot update existing geojson data in
    <source>"`. Concretely, for Oregon: `addSource()` must be seeded with a full load first — an EMPTY
    `{type:'FeatureCollection', features:[]}` is sufficient and trivially passes the validity check (the
    per-feature loop never runs) — and the source's `promoteId` option (or each feature's own `.id`) must
    point at a real, stable, unique per-feature identifier. ArcGIS-sourced GeoJSON typically carries this in
    `properties.OBJECTID`/`FID`/`FID`-equivalent, not the top-level GeoJSON `.id` — `promoteId` must be set
    to the correct field name at `addSource()` time, or every `add` diff will silently no-op per feature
    (`fe(o,i)` returns the promoted id; a feature whose id resolves to `null`/`undefined` is just skipped,
    not an error) rather than throwing, which would be much harder to notice than the "on empty" case.
  - **Live proof, not just source reading**: built an isolated `maplibregl.Map` instance (same vendored
    library the app ships, zero external/Mapbox dependency — a background-color-only style, so it sidesteps
    this sandbox's own well-documented slow/blocked Mapbox v4 access entirely) and added a real GeoJSON line
    source seeded empty, then loaded with dense synthetic polyline data explicitly shaped to match Oregon's
    real geometry (LineStrings, 50-15,000 vertices each — a ~3% "very dense" tail matching the earlier
    session's own finding that a small fraction of real features account for a disproportionate share of
    total bytes, not uniform density). Confirmed via the real API, with a real `try/catch`, that `setData()`
    on this data throws the exact same `RangeError: Invalid string length` synchronously. Confirmed
    `updateData({add:[...]})` on the identical class of oversized data throws nothing, and — the actual open
    question this session existed to close — confirmed the paint genuinely refreshes correctly via matched
    before/after screenshots at an identical viewport (empty source → real squiggly LineString geometry
    visibly rendered, using the map's own line-layer paint, at both a close zoom showing individual line
    shapes and a wide zoom showing the full feature spread) — **no forced repaint, no special MapLibre
    lifecycle event, no workaround of any kind was needed**; the ordinary `'data'` events `_updateWorkerData`
    already fires (`sourceDataType: 'metadata'` then `'content'`, per-tile events following) are sufficient
    to drive a correct repaint through MapLibre's own normal internal pipeline, identically to `setData()`.
  - **The real, empirically-discovered catch — cumulative cost, not per-call cost**: timed `updateData({add})`
    calls of increasing size against ONE growing source (each call ADDING to, not replacing, what was already
    there): 2,000 features/17MB → 3.3s; +5,000 more (7,000 cumulative)/48MB new → 12.3s; +10,000 more (17,000
    cumulative)/114MB new → 38.6s. This is NOT linear in the size of what's newly added — confirmed directly
    by adding just 500 MORE features (a tiny diff) to the by-then-17,000-feature source: 17.5 seconds, not a
    "small diff, fast" result. Root cause, found by reading the worker's own diff-application code: applying
    an `add`/`update`/`remove` diff mutates the worker's `_dataUpdateable` Map, then the callback returns
    `Array.from(this._dataUpdateable.values())` — the ENTIRE current dataset, every time — which is then
    re-run through geojson-vt tiling from scratch on every single `updateData()` call, not just the newly
    added features. This means: `updateData()` genuinely solves the CRASH (no hard ceiling from structured
    clone the way `JSON.stringify` has one), but it does NOT make repeated incremental ingestion into one
    source cheap at scale — total cost to build up a source via K equal-sized chunks grows roughly with
    (cumulative total × number of remaining chunks), not with the total size alone. A single one-shot
    `updateData({add:[...]})` sized to simulate the full ~600MB crash-threshold-equivalent in one call (25M
    vertices) was also attempted directly: it did not crash, and did not error, but took long enough that it
    was still processing after 75+ seconds of waiting in this sandbox — consistent with, not contradicting,
    the cumulative-cost finding (one huge call pays the "full re-tile" cost once, at the largest possible
    size, which is exactly the expensive case this finding predicts).
  - **The concrete recommendation this produces for Oregon (34 species, 884MB raw)**: do NOT stream the
    entire 884MB into ONE MapLibre source via many sequential `updateData()` calls — the cumulative-re-tile
    cost means the LAST chunks of such a stream would be by far the slowest, and total wall-clock cost to
    fully populate one giant source scales worse than linearly with total size. Instead, shard by the
    boundary that already exists naturally in this codebase's own State Data model
    (`loadStateDataLayer(topCategory, speciesName, stateKey, cb)` already operates strictly per-species) —
    give each species (or, for a single unusually large species, a further sub-shard by county/HUC/index
    range, the same idea already flagged as the real fix for Washington's fish data in the "What's broken"
    entry) its OWN MapLibre source, each seeded empty with the correct `promoteId`, each populated via
    `updateData({add:[...]})` in chunks sized to keep any one species' OWN cumulative total in the
    low-tens-of-MB/low-thousands-of-features range where this session's timing table shows sub-few-second
    responsiveness (roughly the 2,000-5,000-feature / 15-50MB band) — not one shared source accumulating all
    34 species' data together, which would recreate the exact cumulative-cost blowup this finding warns
    against, just moved from "crashes outright" to "eventually becomes impractically slow."
  - **Standard pattern for any future large dataset, not just Oregon fish** (the reusable recipe this
    session's task explicitly asked to leave behind): (1) `addSource(id, {type:'geojson', data:{type:
    'FeatureCollection', features:[]}, promoteId: '<real stable per-feature id field>'})` — seed empty, with
    the id field genuinely set correctly, since this determines whether `_dataUpdateable` builds at all; (2)
    ingest via `map.getSource(id).updateData({add: chunkOfFeatures})`, never `setData()`, for anything that
    could plausibly approach hundreds of MB; (3) keep each chunk AND the running cumulative total for that
    one source in the low-thousands-of-features range — reshard into a NEW source (new id, new empty seed)
    rather than continuing to grow one source past that point; (4) no repaint/lifecycle workaround is needed
    — MapLibre's own `'data'` events already drive a correct repaint for the diff path, identically to
    `setData()`; (5) every feature in every chunk must carry the SAME unique-id field configured as
    `promoteId` at step 1, or that feature is silently dropped (no error) rather than rendered.
- Oregon fish habitat data processing pipeline (Session 61) — converts the raw Esri JSON pulled from ODFW's
  ArcGIS REST endpoints (`C:\Users\gsose\Desktop\FieldMap\species overlays\fish\oregon`, read-only source, 56
  files: 32 species with a `_stream.json` layer, 24 with a `_lake.json` layer, 34 unique species total) into
  34 clean per-species GeoJSON files in `data/fish/oregon/`. Data-prep only — deliberately NOT wired into the
  map UI, no new Layers-panel entry, no new MapLibre source/layer, per explicit instruction; that's a separate
  follow-up once this output is confirmed solid. Built as a set of standalone Node scripts in a scratch
  working directory (not committed — this repo has no npm project of its own, single-file-app by design), run
  in the order below; each stage was verified live before the next started, per the task's own explicit
  instruction not to assume a later stage would catch an earlier stage's problems.
  - **Tooling substitution, flagged rather than silently done**: the task named `ogr2ogr` (GDAL) for the raw
    conversion step. GDAL is not installed anywhere on this machine (checked common OSGeo4W/QGIS/conda
    locations, `pip show gdal`, `python -c "from osgeo import gdal"` — none present), and a `choco install
    gdal` attempt failed outright (package not found via the configured source) without needing the deeper
    admin-elevation question to even come up. Rather than spend further session time on a Windows GDAL install
    (historically finicky, and this exact Esri-JSON-to-GeoJSON conversion is a well-defined, deterministic
    schema transform with no real ambiguity), wrote a hand-rolled, directly-verified Node converter instead —
    substituted openly here rather than silently presented as if `ogr2ogr` had been used. `mapshaper` (the
    Step 4 tool) WAS available via `npx mapshaper` with no install issues, so only the Step 2 tool changed.
  - **STEP 1 — promoteId/stable-id verification, done BEFORE any conversion, per explicit instruction**:
    checked every one of the 56 raw files' own field schema (a fast header-only peek, chunked up to 5MB per
    file since one file's own field-schema declaration or first feature turned out to need that much — see
    below) for `OBJECTID`/`FID` presence — 55 of 56 files declare `objectIdFieldName:"OBJECTID"` in their own
    header; the one exception (`SpringChinook_stream.json`) has `"geometryType":null,"fields":null` in its
    header (that one file's own ArcGIS export evidently didn't capture header metadata, unlike every other
    file) but still carries a real, populated `attributes.OBJECTID` on every individual feature — confirmed
    directly, not assumed from the (unreliable, for this one file) header. This is why the actual converter
    (see Step 2) derives geometry type and field presence from each feature's own real data rather than
    trusting the declared header, which turned out to matter for exactly this file. The definitive uniqueness/
    null check (100% of features, not a sample) happened DURING the real Step 2 streaming conversion — see
    there for the result (fully clean).
  - **STEP 2 — Esri JSON → GeoJSON conversion** (`convert.js`): a hand-rolled converter, not `ogr2ogr` (see
    above). Reprojects Web Mercator (confirmed via each file's own `spatialReference:{"wkid":102100,
    "latestWkid":3857}` — SpringChinook_stream again the one exception with a null header, confirmed via
    coordinate-magnitude sanity check to be the same projection regardless) to WGS84 via the standard exact
    spherical inverse-Mercator formula, rounded to 6 decimals (verified against a known real coordinate,
    landing squarely in Oregon: -123.459, 45.708). Converts `geometry.paths` → GeoJSON LineString/
    MultiLineString and `geometry.rings` → Polygon/MultiPolygon with REAL ring-hole classification (not a
    naive pass-through): Esri's ring-winding convention is the opposite of GeoJSON/RFC7946's (Esri: exterior
    rings clockwise, holes counterclockwise; GeoJSON: the reverse), classified via signed-area (shoelace
    formula) on the raw pre-reprojection coordinates (safe since Web Mercator's inverse projection is
    orientation-preserving) and each ring's point order reversed on output to match GeoJSON's own convention
    — verified via a real MultiPolygon-bearing file (`BlackCrappie_lake` etc., confirmed via the actual
    geometry-type tally: 88 Polygon + 2 MultiPolygon just in that one file). `feature.id` is set to the
    original `OBJECTID`/`FID` at this stage (still per-LAYER unique only — see the merge-stage bug below for
    why this isn't the final id), with the original also kept in `properties.OBJECTID` and a new
    `properties.habitatType` (`'stream'`/`'lake'`, from the filename) added.
    - **Real bug found and fixed mid-pipeline, not before starting**: `stream-json` (the npm streaming JSON
      parser used to avoid loading up to 905MB of raw JSON into memory at once — directly relevant, since a
      naive `fs.readFileSync` + `JSON.parse` on that file would hit the SAME V8 string-length ceiling this
      whole project's own MapLibre research is about, confirmed live: attempting exactly that later in the
      pipeline threw `RangeError: Cannot create a string longer than 0x1fffffe8 characters` — 536,870,888,
      the exact same ceiling) turned out to leak internal parser state across sequential in-process calls —
      reproduced with just 2 back-to-back conversions in one Node process, the second always failing with
      `Parser cannot parse input: expected a value` regardless of which real file it was. Fixed by running
      each file's conversion in its OWN separate Node process (a bash loop invoking `node convert.js` per
      file) rather than looping in one long-lived process — slightly more process-startup overhead across 56
      files, materially more robust.
    - **Verification (Step 1's real payoff)**: ran across all 56 files, zero errors, zero null OBJECTIDs, zero
      duplicate OBJECTIDs — 97,644 total features, 100% verified (not sampled), including
      `SpringChinook_stream.json`'s per-feature OBJECTIDs despite its own null header metadata.
  - **STEP 3 — per-species stream+lake merge** (`merge.js`): streams two already-converted layer files into
    one FeatureCollection per species, never holding a whole file in memory (critical for
    `CoastalCutthroatTrout_stream.geojson` alone, ~581MB post-conversion).
    - **A second real, critical bug — found only by directly checking, not assumed clean**: OBJECTID is only
      unique WITHIN one ArcGIS layer — a stream feature and a lake feature for the same species can (and, in
      real data, DO) share the same OBJECTID, since each layer's own numbering starts fresh at 1. Confirmed
      live on `BlackCrappie`: 128 merged features, only 90 unique ids. Per the `updateData()`/`promoteId`
      findings, this is exactly the "silent feature drop" bug class this whole project has spent weeks on —
      MapLibre's worker-side `_dataUpdateable` Map is keyed by id, so a collision means one of the two
      colliding features silently overwrites the other with zero error, zero indication anything is wrong.
      Fixed by reassigning a NEW globally-unique sequential integer id (1..N) to every feature at merge time,
      stream layer first then lake layer, while leaving `properties.OBJECTID` completely untouched for
      traceability back to the raw ODFW source. Verified across ALL 34 merged species files (not just
      BlackCrappie): 97,644 total features, 100% unique, perfectly sequential 1..N per file, zero nulls.
    - **A third bug, self-inflicted and caught by the same verification pass**: `convert.js`'s own file-ending
      write (`outStream.end(']}\n', ...)`) appended the closing `]}` directly onto the last feature's own line
      with no separating newline — cosmetically wrong (not a JSON-validity bug; every converted file still
      parses correctly as a whole document, confirmed via full `JSON.parse()` on the smaller files before this
      was found) but broke `merge.js`'s own line-by-line re-reading of those files for the last feature of
      every layer. Fixed forward in `convert.js` (for any future re-run) and patched `merge.js` defensively to
      strip the known artifact rather than re-running the already-completed, already-independently-verified
      56-file conversion pass a second time.
  - **STEP 4 — mapshaper simplification**: defaulted to 2% (not the standard 8%) per explicit instruction,
    matching the CMT migration data precedent for Oregon specifically. Checked vertex density BEFORE
    simplifying, per instruction — found "bytes per vertex" to be a nearly useless signal here (23.85-27.38
    across all 34 species, a narrow range explained by the converter's own fixed, consistent coordinate
    formatting, not real geometric density). The genuinely informative signal was average vertices PER
    FEATURE, which varied 40x+ (213 for Eulachon up to 9,236 for GreenSturgeon) — flagged GreenSturgeon,
    AmericanShad, FlatheadCatfish, SmallmouthBass, and StripedBass as notably denser than the rest before
    simplifying, per instruction, though ultimately none needed non-default treatment (see verification below).
    - **A real, structural bug found via direct testing, not assumed to just work**: mapshaper's internal data
      model can't hold mixed geometry types (Polyline + Polygon) in one layer — confirmed directly:
      `-merge-layers force` on a merged stream+lake species file threw `Error: [merge-layers] Incompatible
      geometry types: polyline, polygon`. Running plain `-simplify` on a mixed-type input instead silently
      SPLIT it into numbered output files (`BlackCrappie1.geojson`, `BlackCrappie2.geojson`) rather than
      erroring — caught by noticing the unexpected filenames partway through a batch run, not by an error
      message. Fixed by reordering: split each already-merged (correct-id) species file back into its two
      homogeneous-geometry-type halves (`split_by_habitat.js`, reusing the existing ids — no reassignment
      needed, they're already globally unique per species), run mapshaper on each homogeneous half separately,
      then re-merge the two SIMPLIFIED halves back into one final file per species (`merge_simplified.js`,
      again no id reassignment — confirmed live that mapshaper preserves `feature.id` exactly through
      simplification: `[39,40,41,42,43]` in, same ids out for a test file).
    - **A fourth real bug, caught by re-running the SAME full-dataset id/geometry verification against the
      final output rather than assuming simplification is a safe, no-side-effects step**: 24 features in
      `CoastalCutthroatTrout` (only that one species, out of 97,644 total features checked across all 34)
      came back with `geometry: null` after simplification, despite `keep-shapes` (mapshaper's own small-shape
      protection flag). Investigated rather than dismissed: all 24 turned out to be pre-existing degenerate
      2-vertex LineStrings in the RAW ODFW source data with IDENTICAL start and end coordinates (confirmed via
      direct distance calculation: exactly 0.0 for all 24) — genuinely zero-length lines, already invisible on
      any real map render even before simplification touched them (a zero-length LineString draws nothing).
      Not a processing bug so much as mapshaper's topology cleanup correctly recognizing and dropping
      already-degenerate geometry that `keep-shapes`'s protection (designed mainly for small-but-real polygon
      area preservation) doesn't cover for zero-length lines. Explicitly filtered these 24 out of the final
      output (`clean_null_geom.js`, logged by id) rather than silently shipping `Feature` objects with
      `geometry:null`, which could trip up naive downstream rendering/lookup code later. Final count: 97,620
      features (97,644 minus these 24 confirmed-junk entries).
    - **Simplification results**: dramatic, consistent size reduction — e.g. CoastalCutthroatTrout 582MB →
      54.4MB (90.7% reduction), Coho 200MB → 14.25MB, WinterSteelhead 252MB → 14.2MB. All 5 species flagged as
      unusually vertex-dense pre-simplification ended up tiny post-simplification (GreenSturgeon 3.1MB→70KB,
      AmericanShad 5.4MB→130KB, FlatheadCatfish 700KB→18KB, SmallmouthBass 12.4MB→340KB, StripedBass
      600KB→16KB) — confirming the uniform 2% default was sufficient for all of them; none needed
      species-specific non-default treatment.
  - **STEP 5 — size check against the `updateData()` payload-ceiling findings**: 4 of 34 species still exceed
    the "low-thousands-of-features/low-tens-of-MB" comfort band identified in the timing research —
    `CoastalCutthroatTrout` (53,337 features, 54.4MB), `Coho` (12,793 features, 14.25MB), `WinterSteelhead`
    (11,501 features, 14.22MB), `RedbandTrout` (5,565 features, 6.86MB, right at the edge). None of these are
    anywhere near the actual CRASH threshold anymore (54.4MB vs. the ~536MB+ V8 ceiling that motivated this
    whole research thread) — the concern is purely the CUMULATIVE-cost-per-`updateData()`-call finding, not a
    hard failure risk. Further vertex simplification wouldn't help these 4 specifically, since FEATURE COUNT
    (not vertex density) is what's driving their size at this point — `CoastalCutthroatTrout`'s size is
    explained by it being genuinely Oregon's most widely-distributed habitat species (53K+ individual mapped
    segments statewide), not excess per-feature complexity. Per explicit instruction to propose a next step
    rather than just flag and stop: the real fix, when this is actually wired into the map (a separate
    follow-up), is geographic sub-sharding — splitting these 4 species (CoastalCutthroatTrout especially)
    across multiple MapLibre sources by region (county or HUC8 watershed, matching the same architectural
    recommendation already on file for Washington's oversized SWIFD dataset) rather than one shared source per
    species — NOT attempted this session, since it's a map-wiring decision explicitly out of this session's
    scope.
  - **Output structure confirmed matching spec**: `data/fish/oregon/<Species>.geojson`, one file per species
    (34 total, matching PascalCase names like `BullTrout.geojson`/`FallChinook.geojson`), each a single
    FeatureCollection combining that species' stream AND lake data (not two separate files), each feature
    carrying `properties.habitatType` (`'stream'`|`'lake'`) for future paint-treatment branching (polyline vs.
    polygon), each feature's top-level `id` globally unique within its own species file and ready to be used
    as-is (no `promoteId` config needed at `addSource()` time, since `feature.id` — not a properties field —
    was used) once this gets wired into the map. Final validation pass: full `JSON.parse()` succeeded on
    every one of the 34 files (all now comfortably under the V8 string-length ceiling post-simplification,
    unlike the raw/merged intermediates), every single feature confirmed to have a non-null id, real geometry,
    `properties.habitatType`, and `properties.OBJECTID` — 97,620 features total, 105MB combined.
- Oregon fish State Data wiring (Session 62) — wires the Session 61 processed dataset and the Session 60
  `updateData()` pattern into the real Fish State Data UI, reusing the existing architecture with zero new UI
  patterns, exactly as scoped.
  - **`STATE_DATA_SOURCES.fish.or`**: changed from `type: 'perSpecies'` (a live ArcGIS fetch against
    `nrimp.dfw.state.or.us` that never actually worked — that server sends no CORS headers at all, confirmed
    in Session 56, so this path was permanently, silently dead since it was first written) to a new
    `type: 'localFile'`, `species: { '<Display Name>': { file: '<Species>.geojson' } }` — 30 entries, one per
    in-scope species, explicit filename mapping rather than a derived-from-display-name guess (needed since
    the mapping isn't always a trivial space-strip — e.g. `'Hybrid Bass (wiper)'` → `HybridBass.geojson`).
    `CoastalCutthroatTrout`/`Coho`/`WinterSteelhead`/`RedbandTrout` are omitted from the species list entirely
    (not "coming soon") — the cleanest option given neither of those two choices required new UI, and since
    no other Fish state source ever covered these 4, omitting them makes them simply not appear in the
    species dropdown at all, the same as any species with no State Data source anywhere. The dead
    `OR_FISH_BASE` constant (and its live per-sublayer fetch/merge logic, no longer reachable) was deleted
    outright rather than left as inert dead code.
  - **`loadStateDataLayer()`'s new `'localFile'` branch**: a single direct `fetch('data/fish/oregon/' +
    file)` (no pagination — that all already happened offline), tagging each feature with `_sdLayer`/
    `_sdShape`/`_sdSortKey` — the exact same shape `fetchStateDataLayerPaged`'s own `tagAndCollect` already
    produces for every live-fetched source — derived from the feature's OWN real `habitatType`/
    `geometry.type` (`_sdLayer = properties.habitatType`; `_sdShape = 'line'` for LineString/MultiLineString,
    else `'polygon'`), never guessed from a name, matching the "don't trust a name, check the actual
    geometry" principle Session 55 already established for the analogous Washington streams-rendering-as-
    fill bug. This is what lets the EXISTING `wildlife-statedata-fish-fill`/`-line`/`-line-streams` paint
    layers (unchanged, zero edits) render Oregon's data correctly with no new layer or paint expression —
    confirmed via direct grep of every one of this file's own `src.type ===` branch points
    (`stateDataOptionsFor`, the cache-key ternary, `loadStateDataLayer`'s own dispatch, `wildlifeSpeciesGroups`)
    to find every place needing the new type recognized, rather than assuming the 2-type (`unified`/
    `perSpecies`) pattern was exhaustively handled everywhere it mattered.
  - **`updateData()`, not `setData()`, per explicit instruction** — `applyStateDataToSource(tc, stateKey,
    data)`, a new shared helper called from both places that used to call `.setData()` directly (the manual
    `setWildlifeStateDataState` path and the boot-time restore path), branches on `STATE_DATA_SOURCES[tc]
    [stateKey].type === 'localFile'`. Deliberately does NOT set a `promoteId` source option — the Session 61
    pipeline's own globally-unique id lives at the GeoJSON-standard top-level `feature.id`, not a properties
    field, and MapLibre's own diff mechanism (`_dataUpdateable`, per the Session 60 source-reading) already
    uses `feature.id` automatically whenever no `promoteId` is configured; setting one anyway would be wrong
    here, since `promoteId` only ever looks inside `properties`, and `properties.OBJECTID` is deliberately
    the OLD, only-unique-per-source-layer id kept for traceability, not the field to promote. A real
    prerequisite reasoned through before writing this, not discovered by trial and error: MapLibre's diff
    path requires the worker's internal `_dataUpdateable` Map to already exist and be valid, which only gets
    (re)built on a genuine full load — but Washington/Arizona/Nevada, sharing the SAME `wildlife-statedata-
    fish-source`, still use plain `setData()` with data never explicitly guaranteed to carry clean/unique
    ids, so switching FROM one of those states TO Oregon without precaution could inherit an invalid (or
    simply absent) `_dataUpdateable` and throw `"Cannot update existing geojson data"`. Fixed by always
    calling a trivial empty `setData({features:[]})` immediately before every `updateData({add:...})` call —
    an empty FeatureCollection always passes the diff mechanism's validity check trivially (nothing to fail
    it), so this reset can never itself throw, and it has the same "source visibly clears" effect a plain
    `setData()` switch always had. Confirmed live that switching between a live-fetched state and Oregon,
    both directions, continues to work correctly.
  - **Verification — live, not just code review, per explicit instruction**: species dropdown confirmed
    showing exactly 33 real species (30 Oregon + 3 Arizona-only: Apache Trout/Arctic Grayling/Splake — no
    duplicates, matching the expected union), correctly grouped into Coldwater (19) then Warmwater (14) via
    the ALREADY-EXISTING `WILDLIFE_FISH_GROUPS`/`WILDLIFE_FISH_GROUP_ORDER` (no changes needed there — Fish
    already had this exact grouping infrastructure, just never had real State Data species to exercise it
    against). All 4 excluded species confirmed absent from the dropdown by direct query. 3 species tested
    end-to-end (Bull Trout and Rainbow Trout — Coldwater; Largemouth Bass — Warmwater): real
    `data/fish/oregon/<Species>.geojson` fetches confirmed via captured network requests; checkbox/state-
    select/active-layers-chip all confirmed correct immediately after selection; the full check→dismiss
    panel→reopen cycle confirmed holding for all 3, INCLUDING a deliberate checkbox-only-click test (toggle
    off then back on with zero `<select>` interaction) for Rainbow Trout — the exact interaction shape the
    Session 59 same-cause fix was built to handle, confirmed still working correctly for this new source type
    too. Real visual rendering was confirmed via screenshots, but not directly against the live embedded app
    map — this sandbox's own base map was stuck in the same long-documented Mapbox-v4-loading limbo every
    prior session touching DEM/vectorbase has hit (`isStyleLoaded()` never became `true` despite several
    minutes of real wall-clock waiting and the established foreground-forcing-screenshot workaround, tried
    repeatedly), unrelated to this feature. Worked around exactly as Session 60 did: built an isolated
    `maplibregl.Map` instance (same vendored library, zero Mapbox dependency) with the real
    `wildlife-statedata-fish-fill`/`-line-streams` paint config copied verbatim, loaded REAL Bull Trout and
    Largemouth Bass data through the REAL tagging logic and the REAL `updateData()`-with-empty-reset pattern
    — confirmed a real dense stream network rendering correctly in the stream color, and a real lake polygon
    shoreline rendering correctly in the fill color, both via genuine screenshots. This proves the actual
    paint/rendering mechanism works correctly for real Oregon data; it does not by itself prove the SAME
    result would show inside the live embedded app's own map instance right now, only because that instance
    couldn't be gotten to a paintable state at all in this sandbox — a real device / working Mapbox access is
    the natural next check, same standing caveat as every session before this one that hit the identical
    environmental wall. Confirmed zero new console errors from this session's changes (the only errors
    present are the same pre-existing MapLibre internal terrain/elevation exceptions already documented as
    environmental noise in the Session 60 entry, unchanged in count or content across a fresh reload).
- Fish State Data: state persistence across species switches, Washington `updateData()` retrofit (Session
  63) — two real-device bug reports against Session 62's Oregon wiring, deliberately treated and verified as
  two independent fixes per explicit instruction, not one combined change.
  - **Fix 1 — the state `<select>` resetting on every species switch**: root cause was two related gaps, not
    one. `renderStateDataSection(speciesName)`'s `isActiveSelection = active && active.speciesName ===
    speciesName` check (`active` = `wildlifeStateDataActiveByCategory[tc]`) is, by design, always false the
    instant the species changes — a State Data selection has always been scoped to the specific species it
    was loaded for (Session 56's own per-category independence fix relies on exactly this). But
    `setWildlifeSpecies()` then compounded this by unconditionally calling `clearWildlifeStateData(topCategory)`
    on every genuine species change, which doesn't just stop treating the OLD state as "active" — it discards
    all memory of what state was picked at all, so the next render had nothing to fall back to except
    `options[0]`, silently landing on whatever state happened to sort first. Fixed with a new module var,
    `wildlifeStateDataLastStateByCategory` (`{biggame,uplandgame,fish} -> stateKey|null`), deliberately
    SEPARATE from `wildlifeStateDataActiveByCategory` — it's written only by a real user pick
    (`setWildlifeStateDataState`, which now also clears any pending no-data flag — see below) and, unlike the
    active/on pair, is NEVER cleared by `clearWildlifeStateData` or a species switch, so it survives exactly
    as long as the task asked ("within a session" — deliberately an in-memory var, not persisted to
    `state.settings`/localStorage, a narrower scope than this codebase's usual "persist everything" instinct,
    called out explicitly as a deliberate choice rather than an oversight). `setWildlifeSpecies()` now reads
    this remembered key BEFORE clearing, and re-evaluates it against the NEW species via the same
    `stateDataOptionsFor()` check the render path already uses: if the state has data for the new species AND
    the prior state was genuinely `on` (not just remembered-but-inactive), it calls
    `setWildlifeStateDataState(priorStateKey)` directly — reloading real data for the new species and keeping
    the checkbox on, exactly the "switching species should keep the same state selected" behavior asked for;
    if the prior state was off, it leaves the pick remembered but inactive (checkbox stays unchecked,
    selector still shows the right state next render) rather than surprising the user by silently turning
    something back on they'd explicitly turned off; if the state has NO data for the new species, it sets a
    second new var, `wildlifeStateDataNoDataForByCategory` (`{stateKey, speciesName}`), instead.
  - **The "don't silently fall back" half**: `renderStateDataSection` now has a real 3-way branch —
    genuinely active (unchanged), a pending no-data flag matching the current species (new), or neither (the
    old `options[0]`-or-last-remembered-if-still-valid fallback). The no-data case injects the persisted
    state as its own `<option>` (with its real display name, e.g. "Oregon") even though `stateDataOptionsFor`
    correctly excludes it from the normal list for this species — this is what actually satisfies "leave the
    state selector showing the persisted state (empty result)" literally, not just conceptually, since a
    native `<select>` can't show a value with no matching `<option>` as selected. `#wildlife-statedata-nodata`
    (new `<p class="hint">`, added to the section's existing HTML alongside the note/attribution lines) shows
    "No data available for [State] — [Species]"; the checkbox is force-unchecked AND `disabled` for this one
    case (so a real click can't even reach `setWildlifeStateDataOn`'s own "nothing active, read the select"
    branch and attempt a load for a combination that doesn't exist) — the only way out is picking a different,
    real state from the `<select>`, which routes through the completely unchanged `setWildlifeStateDataState`
    and clears the flag as a normal side effect of a real pick.
  - **Fix 2 — Washington's real 73,373-feature SWIFD data still risked the `setData()` `RangeError`**:
    Session 62 built `applyStateDataToSource`'s `updateData()` branch (empty-`setData()`-reset then
    `updateData({add:features})`) but scoped it to `src.type === 'localFile'` only — Oregon's own source kind.
    Washington (`type: 'unified'`) never got it, despite being the ORIGINAL motivating case for the whole
    `updateData()` research thread (Session 57's live bisection of the crash boundary, between 40,000 and
    73,373 features, was against Washington's own real data). Fixed with a one-line condition change
    (`src.type === 'localFile' || src.type === 'unified'`) — deliberately generic on `type`, not hardcoded to
    `stateKey === 'wa'`, since `'unified'` sources are architecturally guaranteed to be a single paginated
    fetch of one ArcGIS layer (`loadStateDataLayer`'s own `unified` branch only ever pushes one `fetches`
    entry), the same "no cross-layer id collision risk" property Oregon's local files have, just for a
    different reason (Oregon: one species' pre-merged file; Washington: one real table, no merge at all).
    Confirmed BEFORE writing this that Washington's live ArcGIS `f=geojson` responses already carry a real,
    stable, unique top-level `feature.id` (Esri's own GeoJSON output puts OBJECTID there) via a live query
    against the actual SWIFD endpoint from this sandbox (unlike Mapbox's v4 API, WDFW's ArcGIS server is
    directly reachable here) — `id: 1` on the first returned feature, confirmed present on every feature,
    meaning zero extra id-assignment code was needed for this fix, unlike Oregon's own Session 61 merge step.
  - **Verification, done independently for each fix per explicit instruction**: Fix 1 — live, in the real
    embedded app (a rare case this session where the app's own map actually rendered, not the isolated-harness
    workaround): switching Fish species from Bull Trout (Oregon, on) to Apache Trout (no Oregon data) showed
    the exact expected phantom-Oregon-option-plus-message ("No data available for Oregon — Apache Trout"),
    checkbox force-unchecked and disabled, `stateDataActive.fish` null, zero fetch attempted; switching on to
    Rainbow Trout (which DOES have Oregon data, but State Data was off from the no-data hop) correctly
    pre-selected Oregon in the `<select>` without reactivating it; explicitly re-picking Oregon for Rainbow
    Trout then switching to Brown Trout (Oregon, on) confirmed the reload-and-keep-on branch, including a real
    updated active-layers-chip line ("Brown Trout — Oregon data"); the Session 59 checkbox-only-click fix was
    re-confirmed explicitly, per instruction, immediately after these species switches, using a state combo
    (Sockeye/Oregon) reached with the `<select>` never touched; a genuine close-the-whole-panel-then-reopen
    cycle (not just re-rendering in place) confirmed all of the above survives, both in live DOM state and via
    the app's own `wildlifeSnapshot()` debug hook. Fix 2 — live, in two complementary ways: (1) in the real
    embedded app, switching Fish State Data to Washington and letting the real ~35-request paginated fetch of
    the actual 73,373-feature table complete produced zero console errors of any kind (checked explicitly for
    `RangeError`/`Invalid string length`/anything `updateData`- or `statedata`-related — none found), and a
    genuine full page reload afterward correctly restored `stateDataActive.fish = {Sockeye, wa}` with
    `on:true` — proving the retrofit works on BOTH the manual-pick code path and the separate boot-time
    restore path, not just one; a real check→dismiss→reopen cycle (this time via actual mouse clicks on the
    real UI, not synthetic events) confirmed the Wildlife Layers panel correctly reopens showing Washington
    still selected and checked. (2) Since this sandbox's main app tab's own style-loading intermittently
    stalled mid-session (the same long-documented Mapbox-loading limitation as every prior session touching
    DEM/vectorbase — not something this fix caused or could fix), independently proved real visual rendering
    via the same isolated-`maplibregl.Map`-harness technique Sessions 60/62 established: a zero-Mapbox-
    dependency background-only style, the real `wildlife-statedata-fish-line-streams` paint config copied
    verbatim, and a REAL live fetch against WDFW's actual SWIFD endpoint scoped to the real West Patit Creek
    test area (224 real features — Burbot, Brown Trout, etc.) applied via the exact retrofitted
    empty-`setData()`-then-`updateData()` pattern — confirmed a real, correctly-colored stream network
    rendering via a genuine screenshot, with zero thrown errors. One real self-inflicted test-harness mistake
    surfaced and corrected during this session, not a product bug: an earlier attempt to capture the live
    `Map` instance via direct `classList.remove('show')`/`.closest('button').click()` DOM manipulation (rather
    than real clicks or the app's own state functions) left one test tab's `wildlifeStateDataActiveByCategory.
    fish.stateKey` as an empty string in that tab's own localStorage — confirmed via direct inspection this
    was caused by dispatching a 'change' event while the `<select>` had no rendered options at that moment
    (an artifact of the raw DOM manipulation, not reachable through any real user interaction sequence),
    repaired directly in that tab's localStorage, and the affected verification steps were redone cleanly with
    only real interactions afterward.
  - **Session 64 — real regression, found on a real device right after Session 63 shipped**: repro was
    Oregon Rainbow Trout State Data rendering correctly, then switching the state `<select>` to Washington —
    the chip/dropdown updated correctly but Oregon's old data stayed visibly rendered instead of/alongside
    Washington's; same with Arizona → Washington; cycling Oregon ↔ Arizona (never touching Washington) worked
    correctly. Investigated the exact hypothesis the report itself raised — that `applyStateDataToSource`'s
    clearing logic runs correctly for same-type switches but not across a type change — and found it doesn't
    hold: `applyStateDataToSource`'s `localFile`/`unified` branch is byte-identical for both (`srcObj.
    setData({features:[]})` then `srcObj.updateData({add:features})`), so there's no type-conditional gap in
    that function at all. The REAL root cause, found by re-reading `setWildlifeStateDataState` end to end:
    `applyStateDataToSource` is only ever CALLED from inside `loadStateDataLayer`'s own completion callback —
    i.e., only once the ENTIRE new fetch resolves. Nothing clears or updates the map the instant the user
    switches; the old state's rendered content simply stays exactly as it was for the full duration of the
    new fetch. For Oregon (a fast static file) and Arizona/Nevada/Utah (small live fetches) this gap is
    sub-second and imperceptible; for Washington's real ~35-request paginated fetch of its full 73,373-feature
    SWIFD table it can run many seconds, making the SAME pre-existing gap — present for every state switch,
    not something Session 63 introduced — glaringly obvious for the first time. This also fully explains why
    Oregon↔Arizona cycling looked clean: both are fast enough that the gap was already there but never
    noticed. Fixed with a new `clearWildlifeStateDataSource(tc)` helper — a single, type-agnostic empty
    `setData({features:[]})` call, needing no branch on `src.type` at all since an empty reset is always safe
    regardless of what the OLD or NEW state's own source kind is — called synchronously inside
    `setWildlifeStateDataState`, immediately after the new pick's active/on/lastState bookkeeping updates and
    BEFORE `loadStateDataLayer` even starts the new fetch. `applyStateDataToSource`'s own existing
    empty-reset-then-apply sequence (still needed for the actual `updateData()` crash-avoidance, unrelated to
    this bug) runs unchanged, a harmless second reset in the common case, once the new fetch's data actually
    arrives. Verified live: (1) a direct, deterministic timing proof — captured the real `GeoJSONSource`
    object, switched Oregon → Washington and Arizona → Washington with ZERO wait after the `change` dispatch,
    and confirmed `_data.features.length` reads `0` immediately, synchronously, before Washington's network
    fetch could possibly have started, let alone finished — confirmed against Arizona's real, already-settled
    223-feature dataset specifically (Arizona uses a plain `setData()`, so `_data` reliably reflects its real
    feature count, unlike Oregon/Washington's `updateData()`-based sources): Arizona's 223 real features were
    genuinely GONE from `_data` the instant the switch to Washington fired, not just visually covered by
    something painted on top; (2) all 4 directions tested this way — Oregon→Washington, Arizona→Washington, Washington→Arizona,
    Washington→Oregon — every one showed the immediate `0`, confirming the fix isn't directional, and a
    subsequent real Arizona re-settle correctly landed at 223 features again, confirming the existing
    `stillCurrent` guard still correctly protects against a late-resolving Washington callback stomping on
    whatever the user switched to in the meantime; (3) since `GeoJSONSource.updateData()` never touches the
    client-side `_data` property (confirmed by reading the vendored `maplibre-gl.js` source directly —
    `setData(t){this._data=t,this._updateWorkerData()}` vs. `updateData(t){this._updateWorkerData(t)}`, the
    latter never assigning `_data`), `_data` alone can't prove Washington's real content actually renders
    post-fix — closed that gap with a dedicated isolated-`maplibregl.Map` harness (same zero-Mapbox-dependency
    technique as Sessions 60/62/63) that applied a synthetic "fake Oregon" feature, called the new immediate
    clear, confirmed `_data.features.length` was `0` right after, then fetched REAL Washington data for the
    real West Patit Creek area and applied it via the unchanged `updateData()` path — a genuine screenshot
    confirmed a clean, correctly-colored real stream network with zero visual artifacts, and
    `queryRenderedFeatures` explicitly confirmed the synthetic "fake Oregon" feature (a marked, identifiable
    id) was NOT present in the final rendered output, directly satisfying the task's own "confirm the old
    state's data is gone, not just visually overlapping" requirement; (4) re-confirmed, live, that this fix
    didn't disturb anything from Session 63 — species-switch persistence (a no-data hop from Rainbow Trout to
    Apache Trout, correctly showing the message and leaving Oregon selected-but-off; switching onward to Brown
    Trout correctly kept it off per the already-documented "off stays off across a no-data hop" behavior;
    explicitly re-picking Oregon then switching to Sockeye correctly reloaded and stayed on, with a correct
    active-layers-chip update), the Session 59 checkbox-only-click fix (uncheck then recheck with the
    `<select>` never touched, correctly reactivating Sockeye/Oregon), and a real mouse-driven close-the-whole-
    panel-then-reopen cycle (not JS events) all confirmed holding exactly as before. `node --check` confirmed
    clean syntax on all 4 extracted inline `<script>` blocks and `service-worker.js`. APP_VERSION bumped
    2.55.1 → 2.55.2, SHELL_CACHE bumped v170 → v171.
  - **Session 65 — Washington temporarily removed from the selectable UI, deliberate not a bug fix**: the
    explicit trigger was confirming live that WDFW's own real endpoint now returns a bare HTTP 500 at every
    page size the existing `fetchStateDataLayerPaged` adaptive-backoff pagination tries (2000 → 500 → 125,
    the exact same 3-step ladder Session 56 built for this class of failure) — a genuine server-side outage,
    not a request-shape or auth problem this app's own code could route around, and explicitly NOT caused by
    or related to Session 63's `updateData()` retrofit or Session 64's immediate-clear fix, both independently
    re-confirmed correct and left completely untouched here. Rather than delete `STATE_DATA_SOURCES.fish.wa`
    (which would also delete the only place its real URL/attribution/note live, making a future re-enable a
    bigger job than it needs to be) or silently leave it selectable-but-guaranteed-to-fail, added a single
    `disabled: true` flag to that one catalog entry and one matching `if (src.disabled) return;` guard at the
    very top of `stateDataOptionsFor`'s per-state loop — the SAME function every other exclusion in this
    catalog already flows through (this is the exact mechanism, and the exact UX treatment — omitted
    entirely from the dropdown, not shown greyed-out or "coming soon" — Session 62 already established for
    Oregon's 4 deferred species; Washington's disable reuses it rather than inventing a second pattern).
    Confirmed by tracing every other `STATE_DATA_SOURCES[...]` read site in the file that none of them needed
    a matching `disabled` check: `wildlifeSpeciesGroups`'s own species-list-building loop (a DIFFERENT
    function, builds the species dropdown, not the state dropdown) already only reads `perSpecies`/`localFile`
    sources for that purpose, structurally excluding Washington's `type:'unified'` regardless, both before and
    after this change; every other `STATE_DATA_SOURCES[tc][stateKey]` read in the file is keyed by an
    ALREADY-CHOSEN stateKey (the active selection, a pending no-data flag, or the `<select>`'s own current
    value) — since `stateKey==='wa'` can now never be chosen through the UI going forward, none of those
    sites can be reached with it either, with no code changes needed at any of them. `loadStateDataLayer`,
    `applyStateDataToSource`, and the Session 64 `clearWildlifeStateDataSource` fix are all completely
    unmodified — the entire re-enable path, whenever WDFW's endpoint is reachable again, is deleting the one
    `disabled: true` line. One known, deliberately out-of-scope edge case: a device that already had
    Washington active from before this session (a real possibility, since it was genuinely working as
    recently as Session 62/63's own testing) will still restore that persisted selection on boot and attempt
    a real fetch against the still-down endpoint — not silently, since `loadStateDataLayer`'s existing
    `anyFailed` branch already shows an honest "Couldn't load this state's data" toast for exactly this case
    (built in Session 56, unrelated to this session) — but the task's own scope was explicitly "remove it
    from the selectable UI surface," not "migrate every device's already-persisted selection away from it,"
    so no migration/force-clear logic was added for this narrower, already-gracefully-degrading case.
    **Verification gap, flagged rather than silently skipped**: this session's browser tooling could not be
    gotten into a working state at all — repeated `navigate` calls (8+ attempts across multiple freshly
    created tab groups, an explicit browser reselect via `select_browser`, and real wall-clock waits between
    attempts) each reported a plausible-looking success, but every immediately-following `tabs_context_mcp`/
    `javascript_exec` call showed the tab was still genuinely stuck on `chrome://newtab`, never the app URL —
    a harder, more persistent failure than the intermittent stalls/freezes documented in several earlier
    sessions' own testing notes (those recovered, on their own or via a fresh tab, within a call or two; this
    one did not recover across the whole session). As a result, none of this session's 3 requested live
    checks — Washington genuinely absent from the dropdown, Oregon/Arizona/Nevada/Utah still working, the
    selector still cycling cleanly between them — were completed live this session. The change itself was
    instead verified as rigorously as possible without a browser: a full manual trace of every
    `STATE_DATA_SOURCES` read site in the file (documented above), a diff re-read confirming the change is
    exactly the two lines intended and touches nothing else, and `node --check` clean on all 4 extracted
    inline `<script>` blocks and `service-worker.js`. This is real, un-downgraded risk on a very small, low-
    complexity change (unlike the async/timing bugs earlier sessions in this thread have had to chase) — a
    live pass confirming the dropdown genuinely excludes Washington and the other 4 states still cycle
    cleanly should be the first thing done once the browser tooling is usable again, not silently assumed
    from this session's code-review-only confidence.
- Watershed (huc12) zoom-based auto-hide (Session 66) — inspired by the AZGFD Trout Challenge's own public
  map: once the user is zoomed in past Z10, huc12 (coarse basin CONTEXT, not real distribution data) is
  redundant clutter next to whatever real stream/lake detail data it's sharing the map with, so it hides;
  zooming back out reveals it again for orientation.
  - **Why this is a filter change, not a new layer or a visibility toggle**: huc12 shares the SAME
    `wildlife-statedata-{tc}-fill`/`-line` polygon layers as real lake/range distribution data — filtered
    apart only by `_sdShape`/`_sdLayer` (see `reinitializeLayers`'s own comment on this), not a separate
    layer of its own. Hiding "just huc12" therefore can't be a whole-layer `visibility` change (that would
    also hide any real lake/range data sharing the layer) — it has to be a `map.setFilter()` refinement that
    excludes `_sdLayer==='huc12'` specifically, layered on top of the existing `_sdShape==='polygon'` filter,
    reverted back to the original inclusive filter when the hide condition no longer holds.
  - **The mechanism**: `WILDLIFE_WATERSHED_AUTOHIDE_ZOOM = 10` (fixed app-wide per explicit instruction, not
    per-basin-size — easy to make basin-size-aware later if some watersheds turn out to feel cluttered or
    too eager to hide at this fixed level, not attempted this session). `categoryHasDetailAlongsideWatershed
    (tc)` reads the CATALOG (not live source `_data`, which the Session 64 entry already established can't
    be trusted for `updateData()`-based sources) for the currently active state/species pick: true only if
    that pick's own `spec.layers` object has BOTH a `huc12` key AND at least one other key (streams/lakes) —
    i.e., there's real detail data worth decluttering the wash for. Only `'perSpecies'` sources can have a
    `huc12` sub-layer at all (Arizona's Trout Challenge is the only current example — Big Game/Upland Game's
    own State Data sources, and Fish's `unified`/`localFile` sources, never have one), so this is correctly
    false for every other source type without a separate type check needed beyond the one already there.
    `updateWildlifeWatershedZoomVisibility()` — called from a `map.on('zoom', ...)` listener (continuous,
    not `'zoomend'`, so the wash hides/reappears live through the gesture, matching the reference map's own
    responsive feel — cheap to call this often since the function only touches the map at all when the
    hide/show state actually FLIPS, tracked per-category in `wildlifeWatershedHiddenByCategory`, not on every
    fractional zoom tick) and from the tail of the existing `updateWildlifeStateDataMapFilter()` (so every
    one of THAT function's own call sites — species/state picked, State Data toggled on/off, master toggle —
    already re-evaluates the watershed-hide state for free, no new call sites needed) — computes `shouldHide
    = on && zoom >= 10 && categoryHasDetailAlongsideWatershed(tc)` per category and, only when this actually
    changed, calls `setFilter` on that category's fill/line layers with either the original filter or one
    that additionally excludes `_sdLayer==='huc12'`. `reinitializeLayers()`'s own WILDLIFE_TOP_CATEGORIES
    loop resets `wildlifeWatershedHiddenByCategory[tc] = false` right after re-adding the fill/line layers,
    since a style switch re-adds them fresh with their static, un-hidden default filter — without this reset
    the cached flag could drift stale relative to the just-reset real layer filter.
  - **The explicit click-priority regression check, investigated and confirmed clean**: the task's own
    concern was whether this reintroduces the bug Session 57 fixed (streams/lakes must win click priority
    over the huc12 wash they share a layer with). Traced through why it can't: Session 57's fix is entirely
    about CLICK-HANDLER REGISTRATION ORDER (`map.on('click', streamsId, ...)` registered before `map.on(
    'click', fillId, ...)` — MapLibre delegated listeners for the same native click fire in registration
    order, independent of paint/z-order, confirmed by reading the vendored `maplibre-gl.js`'s own dispatch
    code in that session) — completely orthogonal to and unaffected by which FEATURES a `setFilter` includes
    or excludes. Below Z10 (or with no detail layer present), the filter is byte-identical to before this
    session, so click behavior there is provably unchanged. Above Z10 with the wash hidden, huc12 features
    are excluded from the fill layer's own rendered/hit-testable set ENTIRELY — a click landing where huc12
    used to be can now only ever resolve to whatever real feature (if any) is actually still there, never to
    a huc12 feature that no longer exists in that layer's data at all; the registration-order fix's own logic
    is untouched and still governs any genuine remaining overlap (e.g. a stream over a real lake polygon).
  - **Verification — direct production-code proof, not just reasoning**: live, on the actual running app
    (not a harness) with Apache Trout/Arizona genuinely active as State Data: captured the real `Map`
    instance and read `map.getFilter('wildlife-statedata-fish-fill')` before and after real `map.jumpTo`
    zoom changes — Z8 → base filter (`_sdShape==='polygon'`), Z11 → the huc12-exclusion filter, back to Z8 →
    base filter again — driven entirely by the real `map.on('zoom', updateWildlifeWatershedZoomVisibility)`
    listener with zero manual intervention, definitive proof the actual shipped wiring works, not a
    hand-verified approximation of it. For the click-priority check specifically, this sandbox's main app tab
    hit an unresolved coordinate-mapping issue this session (raw `computer`-tool clicks failed to land even
    on large, well-known UI buttons at their own precisely computed screen coordinates, in both a
    screenshot-scaled and a true/native coordinate hypothesis — confirmed NOT a feature bug, since the app's
    own JS/map state stayed fully correct and responsive throughout every failed click attempt) — worked
    around with a dedicated isolated `maplibregl.Map` harness using byte-identical filter expressions AND
    byte-identical click-handler registration order copied verbatim from the shipped code, loaded with REAL
    Apache Trout data fetched live from AZGFD's own Trout Challenge endpoint, with a REAL overlap point found
    via genuine point-in-polygon math (a real stream vertex confirmed inside a real huc12 polygon — the same
    "Silver Creek" feature Session 57's own verification used, confirmed by matching the label visible on the
    real basemap tiles once the main app tab did briefly render). Real `computer`-tool clicks on this harness
    (calibrated against ITS OWN screenshots each time, no sidebar-offset complexity) confirmed: below Z10
    (9.9), a click on the stream resolves to `streams-layer`, with huc12 confirmed genuinely present at that
    point via `queryRenderedFeatures`; applying the hide filter (simulating crossing Z10) and re-rendering
    confirmed huc12 genuinely gone from `queryRenderedFeatures` at that exact point while the stream stayed
    present, and a real click there still correctly resolved to `streams-layer`; reverting the filter
    (simulating crossing back below Z10) confirmed huc12 reappeared and a real click still correctly resolved
    to the stream — the full below/above/below cycle, with real clicks at both ends, exactly as the task
    asked. The "watershed alone, no detail layer stays visible" requirement isn't reachable through today's
    real catalog (every Arizona species with `huc12` also has at least `lakes`) — verified instead via a
    standalone Node reproduction of `categoryHasDetailAlongsideWatershed`'s exact logic against 7 synthetic
    catalog shapes (real AZ streams+lakes+huc12 → true; real AZ lakes+huc12-only species like Splake → true;
    a hypothetical huc12-only entry → false; streams+lakes with no huc12 → false; Washington `unified` →
    false; Oregon `localFile` → false; no active selection → false), all 7 passing. `node --check` confirmed
    clean syntax on all 4 extracted inline `<script>` blocks and service-worker.js. APP_VERSION bumped
    2.55.3 → 2.56.0 (minor — new feature), SHELL_CACHE bumped v172 → v173.
- Tap-stack: Wildlife State Data extension (Session 67) — see the "Tap-stack" entry above for Tap-stack's own
  original design; this is what it took to close the one real gap found in it.
  - **Investigation, done first per explicit instruction**: confirmed Tap-stack (Session 46) is fully intact
    — `TAP_STACK_TYPES`, `collectTapStackCandidates`, `openTapStackPanel`, `#tap-stack-panel`, the pre-check
    `map.on('click', ...)` registered first in `createMap()`, and the "← Back to list" bar are all present
    and unmodified since. Did a complete audit — grepped every `map.on('click', '<layer-id>', ...)` and
    `map.on('click', <layerIdVar>, ...)` registration in the file (18 distinct registration sites, some
    looped over a table like `GMU_STATES`/`WILDFIRE_TIER_IDS`) and cross-referenced each against
    `TAP_STACK_TYPES`'s 16 entries plus the two deliberate exclusions already documented there
    (`cluster-circles` — a zoom-to-expand action, not a content item; `draw-preview-line` — mode-only,
    already excluded since the pre-check bails whenever any tool mode is active) and pins (DOM markers, never
    MapLibre layers, already excluded by design). Result: every click-handled layer type EXCEPT Wildlife
    State Data (`wildlife-statedata-{tc}-fill`/`-line-streams`, click-registered since Session 54/refined
    Session 57 — `handleWildlifeStateDataFillClick`) was already correctly in the registry. This is
    genuinely distinct from the pre-existing `'wildlife'` entry (`wildlife-{category}-fill`, GAP Habitat
    range, `WILDLIFE_CATEGORIES`: `big_game`/`upland`/`small_game`) — State Data is a different layer family
    keyed by `WILDLIFE_TOP_CATEGORIES` (`biggame`/`uplandgame`/`fish`) that simply didn't exist yet when
    Session 46 built Tap-stack, and was never added across any of the many subsequent State Data sessions
    (54-66). Confirmed this is exactly the task's own named example (Nevada Chukar is Upland Game State
    Data) — before the fix, a tap hitting both a Range Ring/Buffer and an active Chukar State Data polygon
    would find only 1 Tap-stack candidate (the Range Ring/Buffer), never call `preventDefault()`, and
    silently fall through to whichever handler happened to be registered first — exactly the "silently
    picks one, no indication anything else was there" failure mode Tap-stack exists to prevent, just not
    caught for this one type. Conclusion reported: needs EXTENDING, not building from scratch.
  - **The fix**: one new `TAP_STACK_TYPES` entry, `type: 'wildlifestatedata'`, `queryLayers()` returning both
    clickable sub-layers (`-fill`, `-line-streams` — NOT `-line`/`-line-dashed`, which have never had their
    own click handlers, matching the registry's own "only what already supports tap-to-inspect" rule) for
    all 3 `WILDLIFE_TOP_CATEGORIES`. `label()`/`open()` both resolve the owning category from the hit
    layer's own id (`wildlife-statedata-{tc}-fill` or `wildlife-statedata-{tc}-line-streams` — parsed via
    known prefix/suffix `.slice()`, verified against all 6 real layer-id shapes with a standalone Node test
    before wiring in, since `WILDLIFE_TOP_CATEGORIES` values never contain hyphens this is unambiguous), then
    reuse `wildlifeStateDataActiveByCategory[tc]`/`STATE_DATA_SOURCES[tc]` exactly like the existing
    `wildlifeStateDataPopupHtml`/`openWildlifeStateDataPopupAt` do, so the list row shows the real active
    species name and real kind label ("Chukar" / "Distribution · Nevada") — not a placeholder, and never out
    of sync with what the popup itself would show once opened. The per-`_sdLayer` kind-label lookup
    (`{range:'Distribution', stream:'Stream habitat', ...}`) was hoisted out of `wildlifeStateDataPopupHtml`
    into a new shared `WILDLIFE_STATEDATA_KIND_LABELS` constant specifically so the list row and the popup it
    opens can never drift out of sync with two separate copies of the same table — `wildlifeStateDataPopupHtml`
    itself now just reads the shared constant, unchanged output. `open()` calls the existing, completely
    unmodified `openWildlifeStateDataPopupAt(f.properties, tc)` — the single-feature detail view was never
    touched, matching every other entry in this registry.
  - **Verification — live, with a real overlap, not synthetic data**: found the real Nevada Chukar State
    Data polygon's own genuine interior point (a proper point-in-ring test against the live-fetched source
    data, not a naive vertex-average centroid — confirmed inside via the same ray-casting check this project
    has used before for exactly this "naive centroid can miss on a concave shape" gotcha), then created a
    real Buffer (via the app's own real `state.buffers` storage shape, injected through localStorage and
    picked up by a genuine reload through the real boot pipeline — the same established testing pattern used
    throughout this project) with a line straddling that exact point, confirmed BOTH layers genuinely overlap
    there via `queryRenderedFeatures` before ever clicking anything. One real test-setup bug caught along the
    way, not a product bug: the injected buffer needed a non-empty `tags` array (`['uncategorized']`) — an
    empty array fails `itemVisible()`'s own `(item.tags||[]).some(...)` check (an empty array's `.some()` is
    always false), correctly hiding a truly tag-less item from the map exactly as the app's real filtering
    logic is supposed to for a genuine zero-tag item; fixed the TEST DATA, not the app. Confirmed live: a tap
    at the real 3-way overlap point (Buffer + GAP Habitat "Chukar" + State Data "Chukar") showed "3 items
    here" with all 3 correctly and distinctly labeled; tapping each of the 3 rows in turn opened that exact
    item's own real, unmodified popup (the Buffer's real width/weather/Directions/Share footer; GAP Habitat's
    "Game species · Year-round"; State Data's "Distribution · Nevada") with "← Back to list" present and
    correctly returning to the identical cached list each time; temporarily hiding the Wildlife layers
    (Upland Game's master toggle off) left only the Buffer at the same point, and a tap there opened its
    popup DIRECTLY with no list step and no back-bar — confirming single-hit taps are completely unaffected;
    re-enabling the layers and dismissing a fresh 3-item list via its own × was confirmed, via the drawer's
    actual computed `display:none` (not just checking `.textContent`, which can hold stale leftover HTML from
    a previous open/close cycle and gives a false positive), to open no popup at all. One real coordinate-
    click miscalculation happened mid-session, caught and corrected before drawing any wrong conclusion from
    it: using `map.project()`'s own container-relative pixel directly as a page/screenshot click coordinate
    (forgetting to add the map container's own `left`/`top` offset and the screenshot-vs-true-window scale
    factor) landed a click on empty map background instead of the intended point — re-derived the correct
    click target from `getBoundingClientRect()` + `window.innerWidth`/`innerHeight` vs. the real screenshot
    dimensions, confirmed against a value that had already worked earlier in the same session, and reused
    that corrected math for the rest of the session's clicks. `node --check` confirmed clean syntax on all 4
    extracted inline `<script>` blocks. APP_VERSION bumped 2.56.0 → 2.57.0 (minor — extends a real feature to
    a real gap, not a bug fix), SHELL_CACHE bumped v173 → v174.
- Single file app: index.html (~9000 lines)
- Mapbox token in const MAPBOX_TOKEN; 3 styles in MAPBOX_STYLES (topo default — local topo-style.json, aerial, aerial-streets); Street removed
- refresh-style.js (project root, run with `node refresh-style.js`) re-fetches topo-style.json from Mapbox Studio and re-applies the sprite/glyphs/source-url token-placeholder transforms
- GPS dot: 3-state machine (off/following/free) using gpsDotState + maplibregl.Marker
- Base layer switching: loadStyle(styleName) fetches (topo-style.json locally, others via MAPBOX_STYLES URLs) + strips name + rewrites mapbox:// refs, then map.setStyle(styleObj, {diff:false}) — diff:false forces a full teardown-and-rebuild on every switch; MapLibre's incremental diff path was silently failing to carry over reinitializeLayers()'s custom layers on repaint
- mapbox:// source URLs resolved via https://api.mapbox.com/v4/{id}.json?secure&access_token=TOKEN
- Pin markers: maplibregl.Marker + custom HTML (buildPinMarkerHtml); view content renders in the shared
  #view-drawer (see below), not a per-marker maplibregl.Popup anymore — openPopup() polyfill on the marker
  now opens the drawer directly
- pins-source (GeoJSON, cluster:true) + cluster-circles/cluster-counts layers still exist and are re-added by
  reinitializeLayers(), but only drive the aggregated bubble count display now
- Routes: tracks-source (GeoJSON LineStrings) + tracks-line/tracks-line-touch layers. Areas: polygons-source
  (GeoJSON Polygons) + polygons-fill/polygons-line layers, plus separate maplibregl.Marker labels at each
  area's bounding-box center. Bearings: bearings-source (GeoJSON LineStrings, dashed) +
  bearings-line/bearings-line-touch layers, plus a separate maplibregl.Marker per bearing for the target dot
  (needs its own independent click target). All three use the same addXToMap/removeXFromMap/refreshXMap →
  scheduleXRefresh() → updateXSource() debounced-rebuild pattern as pins-source, and all skip a per-item
  Leaflet layer object entirely (trackLayersById-style dicts were removed once nothing populated them)
- Bottom drawer (#view-drawer, showViewDrawer/closeViewDrawer/isViewDrawerShowing/setViewDrawerContent) is
  the single shared view surface for pin/bearing/track/area popups AND the GMU/USFS/wildlife/migration
  read-only info cards — replaces the old per-type anchored-callout maplibregl.Popup (occlusion bug near
  screen edges). Screen-anchored, not click-point-anchored: desktop gets a small card at .floating-panel's
  own position (bottom:24px;right:64px, just wider); mobile gets a true full-width edge-to-edge sheet lifted
  above the collapsed mobile sidebar bar. No blocking scrim — the map stays interactive behind it; dismissed
  via its own × or a plain map-background tap (closeAllPanels() calls closeViewDrawer(), and the map's final
  click handler already calls closeAllPanels() for exactly this case). Only one item is ever "open" at a
  time (single shared element). openTrackPopupAt/openPolygonPopupAt/openBearingPopupAt/openGmuPopupAt/
  openUsfsBoundaryPopupAt/openWildlifePopupAt/openMigrationPopupAt all route through it now — pins go
  through openPinDrawer instead, since they never had one of these ad-hoc-popup singleton vars to begin
  with. The 7 legacy openXPopup singleton vars are kept (not removed) as lightweight shims over the shared
  drawer (`{ remove, setHTML? }`) rather than real maplibregl.Popup instances, purely because many existing
  call sites (Directions' start/end endpoint chooser via promptDirectionsChoice, Delete, Edit shape/Edit
  endpoints, GMU/USFS toggle-off cleanup, sign-out's local-data clear) check/call them directly — this let
  every one of those call sites keep working completely unchanged. GOTCHA (cost real debugging time this
  session): a pin marker's own click listener must call e.stopPropagation() before opening the drawer —
  marker elements are DOM children within the map's container, so an unstopped click still bubbles into
  MapLibre's own 'click' event on the Map instance, which reaches the map's final generic click handler
  (closeAllPanels → closeViewDrawer) and immediately undoes the open. The 6 non-pin types don't need this:
  their map.on('click', layerId, ...) handlers already call e.preventDefault() + e.originalEvent.
  stopPropagation(), which the final handler's `if (e.defaultPrevented) return;` guard already respects.
- Tap-anywhere (openTapAnywhereDrawer, hooked into the map's final click handler — fires only when nothing
  else claimed the click, no tool mode is active, AND no panel/drawer was already open before this tap, so a
  tap that just dismissed something doesn't also start something new): drops a temp maplibregl.Marker (same
  construction as addMarkerForPin, so it looks/sizes identically) and opens #view-drawer showing a live
  title input, auto-detected category chips (detectCategoryTagIds — matches each tag's FIRST WORD against
  the typed text, not the whole label, so multi-word labels like "Water source"/"Turkey strut zone" still
  fire from natural phrasing; deliberately loose since a wrong chip costs one tap to remove), coords +
  elevation (getElevationFt, placeholder text until it resolves), and a current-conditions mini-card (see
  the dedicated "Current conditions mini-card" entry below — shared with pin/bearing/track/area, not
  tap-anywhere-only). The title input's DOM node is never recreated after first render — every later update
  (elevation resolving, conditions resolving, a chip added/removed) patches its own specific sub-element
  (#tap-anywhere-elev/#drawer-conditions-card/#tap-anywhere-chips) instead of re-rendering the whole drawer
  content, so focus/cursor position survives while actively typing. Save creates a real pin immediately (name typed or
  defaultWaypointName, detected tags or 'uncategorized', status always 'escout', trip deliberately left ''
  — Active Trip auto-attribution is a separate not-yet-built feature) and swaps the SAME drawer element to
  that pin's normal popupHtml view via showViewDrawer('pin', ...) — "continuing to refine" it via Edit data
  afterward is thus indistinguishable from editing any other pin. Dismissing without saving (× / background
  tap / opening something else) removes the temp marker and drops the draft entirely — wired into
  closeViewDrawer itself (gated on viewDrawerOpenRef.type === 'tap'), not a separate cleanup path.
- Expand-in-place editing (expandDrawerForEdit/collapseDrawerFromEdit/returnExpandedModalHome/
  refreshCompactViewForCurrentDrawerItem): "Edit data" (and continuing to refine a just-quick-saved
  tap-anywhere pin) grows #view-drawer into a full edit form instead of handing off to the old centered
  modal. Implemented as a DOM re-parent, not a rebuilt form: expandDrawerForEdit moves the SAME .modal
  element pin/track/polygon/bearing already use for their classic Edit modal (#pin-modal/#track-modal/
  #polygon-modal/#bearing-modal) out of its home overlay and into #view-drawer-content; every field id,
  event listener, and save/delete function (savePinFromModal, deletePolygonById, etc) keeps working
  completely unchanged, since it's the identical DOM node, just relocated. Only ever invoked for an EXISTING
  item — new-item creation flows (Add pin via +Add sheet, Draw Route/Area "Finish", compass "Save bearing")
  are untouched and still show the classic centered modal; openPinModal/openPolygonModal branch on whether a
  real item was passed, openTrackModal/openBearingModal are edit-only to begin with (openTrackModalForNew/
  openBearingModalForNew are the separate new-item entry points and were not touched). Cancel/Save/Delete
  all funnel through each type's existing close*Modal function, which now also calls
  collapseDrawerFromEdit(type) — a no-op when that type isn't the one currently expanded, so the classic
  modal's own close path is completely unaffected. closeViewDrawer() refuses to close at all while
  drawerExpandedType is set (the ONLY way out is Cancel/Save/Delete) — Batch 1 deliberately gave the compact
  view no blocking scrim so the map stays interactive behind it, which the edit state inherits; without this
  guard a stray background tap could silently discard an in-progress, unsaved edit, something the old
  centered modal's backdrop made structurally impossible. The × button becomes Cancel's alias while
  expanded (calls the right type's close*Modal instead of the now-refusing closeViewDrawer) so it doesn't
  look like a dead button. isViewDrawerShowing() also returns false while expanded, regardless of type/id
  match, so a background content refresh (elevation backfill resolving, a live-sync merge) can't overwrite
  an in-progress edit form out from under the user. GOTCHA (cost real debugging time, found only via
  testing, not code review): editPolygon/editBearing had a pre-Batch-1 leftover `openPolygonPopup.remove()`/
  `openBearingPopup.remove()` call immediately before opening the edit modal — harmless in Batch 1 (just
  closed the drawer before a fully separate centered modal appeared) but actively broken once editing
  expands that SAME drawer: `.remove()` is the shim for closeViewDrawer, which nulls viewDrawerOpenRef, so
  Save's later collapse-and-refresh had nothing to collapse back to and left the drawer content blank.
  editPin/editTrack never had this call (which is why only polygon/bearing showed the bug) — fixed by
  deleting it from both, matching editPin/editTrack's pattern. Also found and fixed while wiring this up:
  pin-delete-btn and track-delete-btn had markup and even a matching (dead) deletePinFromModal function in
  pin's case, but were never actually connected to a click handler at all — Delete inside those two modals
  did nothing, silently, pre-existing and unrelated to this batch's own changes, only surfaced because this
  batch is what finally exercises those buttons in a place they'd get used. SECOND GOTCHA (Session 17, also
  found only via testing): showViewDrawer() — the function EVERY "open this item's drawer" entry point
  (openPinDrawer, openTrackPopupAt, openPolygonPopupAt, openBearingPopupAt, the GMU/USFS/wildlife/migration
  openers, tap-anywhere) funnels through — called setViewDrawerContent() unconditionally, with no check on
  drawerExpandedType. closeViewDrawer() already had that guard (`if (drawerExpandedType) return;`), and every
  OTHER direct setViewDrawerContent() call site was already protected via isViewDrawerShowing() (which itself
  returns false while expanded) — showViewDrawer() itself was the one gap. Real-world trigger: open "Edit
  data" on any item (expanding its .modal into #view-drawer-content), then — WITHOUT Cancel/Save/Delete —
  click a different item's marker/row. showViewDrawer() would overwrite #view-drawer-content's innerHTML,
  permanently destroying the still-expanded .modal (title/coords/every field) since it was never returned to
  its home overlay first. The very next "Edit data" attempt for THAT item type then throws `Cannot set
  properties of null (setting 'textContent')` in its openXModal, since e.g. #pin-modal-title no longer exists
  anywhere in the document. This reproduced identically for all four types (pin/track/polygon/bearing) since
  they all share the same showViewDrawer/expandDrawerForEdit machinery — confirmed NOT a Trip-migration bug
  despite surfacing right after that stage shipped (a full diff review of every Stage-1 change found nothing
  touching pin-modal-title/pin-lat/pin-lng, and the trip field's own value-population line would have crashed
  identically pre-migration on a null #pin-trip, which never happened in testing). Fixed by adding the same
  `if (drawerExpandedType) return;` guard to showViewDrawer() itself, matching closeViewDrawer's existing
  one — mid-edit, the only way out is still Cancel/Save/Delete, now enforced consistently on both the close
  path and the switch-to-a-different-item path.
- Current conditions mini-card (conditionsCardHtml/peekCurrentConditions/conditionsCardContainerHtml/
  fetchConditionsForDrawerItem, getCurrentConditions/currentConditionsCache 30min-TTL cache) — ONE shared
  component/cache, used by tap-anywhere AND the pin/bearing/track/area compact drawer views (deliberately
  NOT added to GMU/USFS/wildlife/migration — those stay exactly as they were). Split into a pure half and a
  side-effecting half on purpose: conditionsCardHtml/conditionsCardContainerHtml/peekCurrentConditions never
  fetch anything, just render whatever's already resolved (undefined/null/data) — safe to call from inside
  a popup builder even when its result might never actually be displayed (bearingPopupHtml/trackPopupHtml
  are also called to build promptDirectionsChoice's "restore" string well before, if ever, it's shown
  again; that must never itself trigger a network request). The actual fetch is
  fetchConditionsForDrawerItem(type, id, lat, lng), called exactly once by whichever open*/openPinDrawer
  function is showing an item, right after showViewDrawer — same pattern pin elevation backfill already
  uses. Resolution patches a single fixed-id container (#drawer-conditions-card, since only one card is
  ever visible at a time) only if isViewDrawerShowing(type, id) still holds, so a stale fetch for something
  since closed/replaced can't clobber what's now on screen. Point resolved per type — reusing exactly what
  Directions already uses for each: pin's own lat/lng, bearing's ORIGIN (not target — "where the observation
  was actually made"), track's START point (trackStartLatLng, same [[lat,lng],...]-or-[{lat,lng},...]
  normalization as the Directions start/end chooser), area's polygonInteriorPoint (the same guaranteed-
  inside-the-shape point Directions/Share already use, not a naive centroid). drawerConditionsPoint (a
  single shared var, not per-type) is read by the "10-day forecast" link's click handler
  (FieldMap.openDrawerConditionsForecast) — always correct since only one card is ever shown at a time.
  Verified via Playwright: pin/bearing/track/area all show correct conditions for their correct resolved
  point; a second nearby item (same ~0.1°-rounded grid cell) reuses the cache with zero additional network
  calls and renders instantly, no "Loading" flash; offline shows "Unavailable offline" (confirmed via
  context.setOffline, not just code review); GMU/USFS/wildlife/migration popups confirmed to have no
  conditions card and unchanged footers.
- Area unit tap-to-cycle (polygonAreaDisplayForDrawer/polygonAreaUnitOverride/FieldMap.cycleAreaUnit) — the
  area value in the drawer's compact view is now tappable (.area-cycle-value, dotted-underline affordance),
  cycling ac → sq ft → sq mi → back to ac on each tap, independent of polygonAreaDisplay's own
  auto-selected-by-size unit (untouched, still used by the sidebar list row, Share text, and the edit
  form's own read-only area line — none of those are tap-to-cycle). polygonAreaUnitOverride is a plain
  polygonId -> unit map, unset until the first tap (auto-select-by-size until then, same thresholds as
  polygonAreaDisplay). Verified full cycle (ac → sq ft → sq mi → back to the original value) and confirmed
  the meta row stays single-line at real mobile width (no reintroduction of the wrapping bug fixed the
  session before this one).
- Measure tool (redrawMeasureLine/createMeasureMarker/clearMeasure/handleMeasureClick): a standalone ruler,
  separate from Draw Route — measurePoints (plain lat/lng objects) is repopulated into
  measure-preview-source (GeoJSON LineString, dashed `#c2622d`) on every tap via redrawMeasureLine, same
  resync-on-style-switch pattern as the other draw previews. Each tapped point also gets a small non-
  interactive maplibregl.Marker dot (createMeasureMarker) — deliberately not draggable/deletable
  individually, since Measure is cleared all at once (Clear button / toggling the tool off), not edited like
  a saved shape. Was previously L.circleMarker/L.polyline, throwing `L is not defined` on the very first tap
  since Leaflet was removed — this was the one item on the old "what's broken" list that was still genuinely
  broken (see Session 15).
- Trips (Active Trip project, Stage 1 of 3 — Session 16): Trip is now a real entity, state.trips
  ({id, name, createdAt, updatedAt}), rather than a free-text string repeated on every pin/track/polygon/
  bearing. Stored as an array field on the SAME users/{uid} document as pins/tracks/polygons/bearings/tags —
  deliberately NOT a separate Firestore sub-collection, since this app has no sub-collections anywhere and a
  real one would need its own security rules (none checked into this repo) and couldn't reuse mergeArray/
  tombstones at all. trips is synced via the exact same mergeStates/mergeArray/tombstone machinery as the
  other four types (getSyncableState/applyMergedState/mergeStates all updated to include it). Helper
  functions: tripById(id), tripDisplayName(item) (resolves item.tripId → trip.name for display, '' if none —
  the name is NEVER cached onto the item itself, so a future rename propagates everywhere with nothing left
  stale), findOrCreateTripByName(name) (exact case-sensitive match against existing trips — deliberately not
  case-insensitive like quickAddTag's tag dedup, since the migration's contract is "one Trip per distinct
  string", and two differently-cased trip strings were already two distinct groups pre-migration),
  deleteTripById(id) (filter + recordTombstone, matching the pattern already proven for pins/tracks/polygons/
  bearings/tags — the exact bug class fixed for bearings in an earlier session). Every write path that used
  to set item.trip directly now calls findOrCreateTripByName and sets item.tripId instead (pin/track/polygon/
  bearing save modals, the bearing-remap-btn's save-before-remap path, bulk edit, CSV/GPX import) — the old
  .trip field is never written by any code path anymore, only ever read by the one-time migration below.
  migrateTripsToTripId() (called from loadState()'s one-time-fixup block and from applyMergedState(), matching
  migrateRepeatStatus's placement/return-value convention) scans every pin/track/polygon/bearing still missing
  .tripId, resolves each non-empty .trip string via findOrCreateTripByName, and sets .tripId — idempotent by
  construction, since an item with .tripId already set is skipped entirely (its old .trip string, if any, is
  never re-read), so re-running it (every load, every merge) can never create a duplicate Trip for a string
  already migrated. The old .trip field itself is kept in place, untouched, as a one-release rollback net —
  not cleared, not read by anything except the migration. computeTripsPresent() now returns [{key, label}, ...]
  (key = tripId, or the NO_TRIP_LABEL sentinel for items with no trip) instead of raw label strings, sorted by
  most-recent referencing item's activity (updatedAt, falling back to created) descending, with the no-trip
  bucket always pinned first — activeTripFilters/eyeHiddenTrips/collapsedGroups all now key off tripId rather
  than the old free-text label, so a future trip rename (Stage 2) won't silently reset anyone's filter/
  visibility state. renderTripChips, the sidebar's "group by trip" view (renderPinList), itemVisible/
  mapItemVisible, and every popup/meta-line display (pin/track/polygon/bearing/cluster-item-list/sidebar row)
  were all updated to resolve display names via tripDisplayName() instead of reading .trip. Verified via a
  from-scratch Playwright run seeding a realistic pre-migration localStorage snapshot (multiple pins/tracks/
  polygons/bearings sharing trip strings across types, plus items with an empty trip and — separately — items
  missing the .trip field entirely, i.e. genuinely ancient data): exactly one Trip entity was created per
  distinct string with zero duplicates, every item's .tripId resolved to the correct trip, no-trip items
  correctly got no .tripId, three consecutive reloads left the trips array byte-identical (full idempotency),
  the sidebar's trip filter chips and "group by trip" view both showed correct real trip names post-migration,
  and creating a brand-new trip through the real Add-pin UI correctly created exactly one new Trip entity with
  no legacy .trip string ever written. Trip delete + tombstone + cross-device merge behavior (no live second
  Firestore account available in this sandbox to test against, same constraint noted in earlier sessions) was
  verified by extracting mergeStates() verbatim into a standalone Node script and exercising the exact
  "stale device reconnects after another device deleted something" scenario already fixed once for bearings —
  confirmed a trip deleted on one device is correctly dropped by the merge even when a second, not-yet-synced
  device still has it locally, confirmed the tombstone carries forward correctly, and confirmed an unrelated
  brand-new trip created on the stale device survives the same merge untouched.
- Active Trip UI (Stage 2 of 3 — Session 18): a device-only "what am I working on right now" concept —
  state.settings.activeTripId, a plain string|null living inside state.settings, never synced (settings are
  never part of getSyncableState's payload — this is what makes it correctly per-device: two devices can have
  different active trips at once, exactly per spec). getActiveTrip() resolves it to a real trip, defensively
  clearing a dangling reference (the active trip having been deleted through some other path) rather than
  ever showing a broken indicator/prompt for a trip that no longer exists. setActiveTrip(tripId) is the only
  writer — updates the indicator and schedules a save.
  - Startup prompt (#trip-startup-modal, maybeShowTripStartupPrompt): a plain `.modal-overlay`/`.modal` —
    the same centered-dimmed-backdrop pattern used by all 12 other modals in this file (onboarding-modal,
    pin-modal, etc.) — deliberately NOT in the Escape-key handler's hidden-modal list and with no
    backdrop-click-to-dismiss (neither exists for ANY modal in this file, not just this one), so all 3
    buttons are real, explicit decisions. Hooked into the boot sequence right after the onboarding-modal
    check, gated on `!shouldShowOnboarding()` — not because the two conditions can ever really coexist (a
    genuinely first-ever install can't have an activeTripId set yet — every path that sets one requires a
    usable, past-onboarding app), but as cheap insurance against ever stacking two centered modals with no
    arbitration between them.
  - Persistent indicator (#active-trip-chip, updateActiveTripIndicator): ALWAYS visible now (Session 19 fix)
    — originally hidden entirely with no active trip, which meant a fresh account with zero trips ever
    created had no indicator AND no startup prompt (that only ever fires when a trip is already active),
    i.e. no way to reach the trip switcher at all. Now always shown; with no active trip it reads "No active
    trip" in a muted `.no-active-trip` style (same tap target, still opens the device-mode switcher) instead
    of the accent-styled active state. Position (Session 20 fix): now sits directly under
    #center-readout-float + #scale-bar's own top-right stack (`top:112px;right:14px;width:150px`, same width
    as both boxes above it) rather than top-left — top-left originally collided with MapLibre's own
    NavigationControl (zoom +/-/compass-reset, added at 'top-left' in createMap()) and, as a body-level
    sibling of `<main id="map">` (same class of gotcha #wildlife-legend's own CSS comment already documents),
    needed an awkward `calc(var(--sidebar-width) + 14px)` offset just to clear the sidebar on desktop. Mobile
    now centers it at `top:66px` instead (desktop's "stack under the coords column" doesn't apply — that
    whole column is hidden on mobile) — 66px specifically clears #map-search-bar's own measured bottom edge
    (~57px) when the user taps to open search, confirmed via a real bounding-box overlap check, not just
    visual inspection. Truncation (Session 20 fix): long trip names were wrapping onto two lines instead of
    ellipsis-truncating — the real cause wasn't missing `overflow:hidden`/`text-overflow:ellipsis`/
    `white-space:nowrap` (all three were already present on #active-trip-chip-label) but a classic flexbox
    gotcha: a flex item's default `min-width:auto` refuses to shrink below its own text's full unwrapped
    width, so the ellipsis never actually engaged. `min-width:0` on the label is the real fix.
  - Trip picker (#trip-picker-panel): ONE shared `.floating-panel` — not #view-drawer — for two modes.
    'device' (opened via the indicator chip or the startup prompt's "Start a new trip"): picking a trip calls
    setActiveTrip(). 'form' (opened via any of the 4 item modals' trip-picker-btn): picking a trip only calls
    back into that specific button (stages tripId on `button.dataset.tripId`, updates its displayed text) —
    the real commit happens later via that modal's own save*FromModal, exactly like every other field in the
    same form (name/notes/tags/date) never writes until Save. This split mattered concretely: the item-level
    picker must be reachable from INSIDE an already-expanded Edit-data form (#view-drawer.expanded), and
    showViewDrawer() now refuses to overwrite content while drawerExpandedType is set (see the Session 17
    fix) — routing the item picker through #view-drawer at all would have made it unopenable mid-edit. Using
    a plain `.floating-panel` sidesteps that class of conflict entirely and gets scrim/outside-click/Escape
    dismiss behavior for free by simply adding 'trip-picker-panel' to the existing FLOATING_PANEL_IDS/
    PANEL_SCRIM_IDS arrays — no new dismiss mechanism needed. Search substring-filters computeTripsPresent()'s
    real trips (case-insensitive, the NO_TRIP_LABEL sentinel excluded and offered as its own separate
    "No trip"/"End trip" row instead) — typing can only filter, never create; "+ New trip" is a real inline
    mini-form (name input + Cancel/Create — modeled on the tag manager's tag-editor-form, not quickAddTag's
    bare prompt()), dedup-safe via the existing findOrCreateTripByName. relativeTimeLabel(ts) ("today"/
    "N days/weeks/months/years ago") is new — no relative-time formatter existed anywhere in this file before
    (dateLabelFor/formatCreatedDate are both absolute-date only).
  - Auto-tagging on creation: every one of the 4 "new item" modal-open functions (openPinModal(null,...),
    openTrackModalForNew, openPolygonModal(null), openBearingModalForNew) pre-fills its trip-picker-btn
    with state.settings.activeTripId instead of leaving it blank — since the object doesn't actually get
    created until Save is clicked, "auto-tag at creation time" and "pre-fill the field Save will read" are
    the same thing, and the pre-fill is still visibly overridable via the same picker before saving (active
    trip is a default, never a lock, per spec). CRITICAL BUG (Session 20): tap-anywhere's own quick-save
    (FieldMap.tapAnywhereSave) still hardcoded `tripId: null` — the original Stage 2 spec explicitly deferred
    tap-anywhere integration to "Stage 3", so this was deliberate at the time, but tap-anywhere is the single
    most common pin-creation path in the app (one tap, type a name, Save — no +Add sheet detour), so leaving
    it unwired made the entire auto-tag feature look broken in real use ("fish" pin created via tap-anywhere
    while a trip was active came out with no trip). Fixed by reading state.settings.activeTripId here too,
    ahead of the original Stage 3 scope line, once reported as a critical bug — full tap-anywhere/Stage-3
    integration (chip UI inside the tap-anywhere drawer itself, etc.) is still not built.
  - The old free-text `<input id="X-trip" list="trip-suggestions">` in all 4 item modals is now a
    `<button class="trip-picker-btn" id="X-trip-btn" data-trip-id="">` — opening the picker in 'form' mode on
    click. The `trip-suggestions` datalist itself and refreshTripSuggestions() are NOT removed — bulk-edit
    (#bulk-trip) and CSV/GPX import (#import-trip) still use the old free-text+datalist pattern unchanged
    (not named in the Stage 2 spec, deliberately left alone).
  - "End trip" button (Session 20): the device-mode row in #trip-picker-panel was a plain `.link-btn` text
    link, easy to miss and visually inconsistent with "+ New trip" right above it — now a full `.chip`
    button with the same dashed-border/full-width treatment. Form-mode's "No trip" (clearing one specific
    item's trip assignment) deliberately stays the lighter link style — a routine, low-stakes field edit,
    not the bigger "end my active trip" decision the device-mode row represents.
  - CRITICAL MOBILE BUG (Session 20): #view-drawer.expanded — the container Edit-data's form actually lives
    in — rendered as a near-zero-width sliver on any mobile viewport, all its content crushed and overflowing
    vertically instead of wrapping (reported as "narrow, clipped vertical sliver with unreadable/overlapping
    content"). Root cause, found via a real 390px-viewport bounding-box measurement, not guesswork: the base
    (non-expanded) `#view-drawer` CSS rule has a mobile override (`width:auto;max-width:none`), but
    `#view-drawer.expanded`'s own rule — `width:380px;max-width:calc(100vw - var(--sidebar-width) - 90px)` —
    has no mobile override of its own, and `#view-drawer.expanded` (id+class) beats the mobile override's
    plain `#view-drawer` (id only) in specificity regardless of which media query each is defined in. On any
    viewport narrower than 420px, `100vw - 330px - 90px` goes NEGATIVE, collapsing the box. This is a
    pre-existing gap in the mobile CSS dating to Session 12's expand-in-place work — never actually exercised
    at a real mobile viewport's EXPANDED width before (only the compact view was previously
    screenshot-verified at 390px) — not something the Stage 2 trip-picker itself broke, though the
    trip-picker's extra field made the already-broken container's content noticeably taller and the breakage
    far more obvious. Fixed with a matching `#view-drawer.expanded` override inside the mobile media query
    (`width:auto;max-width:none;max-height:85vh` — same edge-to-edge width as the compact view, just taller).
    Confirmed fixed for all four item types via real 390×844 mobile-viewport screenshots, not just DOM
    measurements.
  - Compass panel visual restyle (Session 20): #compass-panel's card now uses the same solid
    `background:var(--bg-elevated)` / `border-radius:14px` / `box-shadow` treatment as #view-drawer, for
    visual consistency with every other popup surface in the app — position, z-index, and interaction model
    are completely unchanged (still a plain `position:absolute`, still absent from PANEL_SCRIM_IDS/
    OUTSIDE_CLICK_DISMISS_IDS, deliberately alongside sunrise-panel — see that entry's own reasoning — so the
    map stays fully interactive underneath it: tapping to set a bearing and live-panning for the sun-arc
    preview both still work exactly as before). Confirmed via a live map tap that bearing-target-setting
    still works correctly after the change.
- In-progress draw previews: draw-preview-source (routes), polygon-draw-preview-source (areas, fill+line),
  bearing-draw-preview-source (bearings). Vertex/endpoint editing of an *existing* saved item reuses two more:
  vertex-edit-preview-source (shared between route and area vertex-edit — mutually exclusive modes, fill layer
  is a no-op for LineString geometry) and bearing-endpoint-preview-source. All of these are re-added and
  resynced (redrawDrawLine/redrawPolygonDraft/redrawBearingDrawPreview/vertexEditSyncFn/bearingEndpointSyncFn)
  at the end of reinitializeLayers(), so a style switch mid-draw or mid-edit doesn't lose the in-progress state
- reinitializeLayers() called on map.on('style.load') — rebuilds every pin marker fresh (remove + re-add all),
  re-adds all sources/layers, and resyncs all draw/edit previews after every setStyle()
- updateMarkerVisibility() called on map.on('idle') — always shows every pin marker (subject only to the
  filter-panel mapItemVisible() check); no longer hides markers based on cluster-source query results, since
  querySourceFeatures() only sees currently rendered/loaded tiles and was hiding off-screen pins after a style
  switch. A clustered pin may render its marker underneath the cluster bubble for now.
- GMU boundaries: MapLibre-based, single-select state picker (#gmu-state-select), one state's fill/line/label
  layers visible at a time. Table-driven via a GMU_STATES catalog object (url, labelField, popupTitle/popupMeta
  functions, infoLabel/infoUrl, optional filterFeature) — adding a state is one catalog entry, not bespoke code.
  Generic shared functions: ensureGmuStateLoaded/showGmuState/setGmuStateLayersVisible/gmuPopupHtml/
  openGmuPopupAt/setGmuOn/setGmuActiveState. Click handlers registered once in createMap() via a loop over
  Object.keys(GMU_STATES). Currently built: az, or, ut, id, nv, wa (see gmuCache/GMU_STATES near the top of
  the script for full source URLs/field notes/research findings per state).
- GMU per-state durable cache: each state's fetched (and filtered) GeoJSON is written to the Cache API under
  GMU_DATA_CACHE_NAME ('fieldmap-gmu-data-v1', synthetic same-origin key per state via gmuCacheEntryUrl) with
  a fetch timestamp in a separate localStorage entry (GMU_CACHE_META_KEY, deliberately NOT part of
  state.settings/Firestore sync — cache freshness is a local-storage fact, not a synced preference).
  ensureGmuStateLoaded reads the durable cache first and uses it unconditionally at any age (instant,
  offline-capable); the timestamp only drives the "Unit boundaries as of [date]" text in the state picker and
  a non-blocking "consider refreshing" nudge past GMU_CACHE_STALE_DAYS (180) — never a forced re-fetch or
  dialog. refreshGmuState() is the only path that bypasses the cache. IMPORTANT: service-worker.js's activate
  handler whitelist (SHELL_CACHE/TILE_CACHE/GMU_DATA_CACHE) must keep GMU_DATA_CACHE's literal string in sync
  with index.html's GMU_DATA_CACHE_NAME — otherwise every SHELL_CACHE bump wipes the GMU cache, since Cache
  Storage is shared per-origin regardless of which context (page vs. SW) created an entry.
- GMU lightweight change-check layer (sits in front of the 60/180-day time-based cache above, doesn't replace
  it): GMU_STATES[key].changeCheck describes a tiny (~1-2KB, no geometry) request that reveals whether a
  state's source data has actually changed — 'editingInfo' (AZ/UT/NV: FeatureServer/0?f=json's
  editingInfo.dataLastEditDate), 'maxEditStat' (ID: no layer-level editingInfo on this self-hosted server, so
  an outStatistics MAX(last_edited_date) query is used instead — same idea, different mechanism), or
  'featureCount' (WA: no edit-date field exists at all, so returnCountOnly is the only signal — deliberately
  weaker, only catches units being added/removed, not a redrawn-but-same-count boundary). Oregon's
  changeCheck is null — no live check is possible or built, since the app never queries ODFW at runtime (see
  the "url" comment on GMU_STATES.or above). runGmuChangeChecks() fires all 5 checkable states' checks in
  parallel (Object.keys().forEach, nothing awaited sequentially) when the state picker opens, throttled to
  roughly once/day via the in-memory gmuChangeChecksLastRunAt. Each state's last-known signal + check
  timestamp live in the same GMU_CACHE_META_KEY localStorage entry as fetchedAt (now merged via
  updateGmuStateMeta, not overwritten). A check confirming no change costs nothing further. A detected change
  either calls refreshGmuState() immediately (if that state is the one currently on screen — the normal full
  pipeline: live refetch, durable cache write, one-time label recompute with its toast) or calls
  invalidateGmuStateCache() (if not — drops the in-memory + durable cache and clears fetchedAt, so the next
  real toggle-on for that state naturally falls into ensureGmuStateLoaded's cache-miss path, without paying
  for a refetch of something nobody's looking at). updateGmuFreshnessUI prefers a check-confirmed result over
  the plain fetchedAt-based text when one exists and is itself recent — "Verified current as of [date]" for
  the three editingInfo/maxEditStat states, "Checked as of [date]" for Washington's honestly-weaker signal —
  falling back to the original "Unit boundaries as of [date]" (+ stale nudge) for Oregon, any state whose
  check hasn't run yet, or once a check result itself goes stale.
- GMU liability disclaimer: identical text in two places — a persistent line under the GMU row in the Layers
  panel (always visible, not dismissible) and a `.gmu-disclaimer`-classed line appended in every GMU popup
  (gmuPopupHtml), regardless of whether that state has an info link.
- Known test-environment gotcha (not an app bug): both IDFG (Idaho) and WDFW (Washington) self-hosted ArcGIS
  servers intermittently reject automated-browser (Playwright) fetches — confirmed via matching non-browser
  requests succeeding reliably, and confirmed NOT CORS/header-related. Also confirmed the app's own service
  worker intercepts cross-origin fetches not in its BYPASS_HOSTS list and issues its own pass-through fetch
  from the SW execution context, which Playwright's page.route() does not reliably intercept — disable SW
  registration in any test that needs to mock a GMU state's live endpoint (see verify_gmu_cache_mechanics.js
  pattern in scratch test history). Real end-user browsers are not expected to hit either issue.
- Range Ring and Buffer (Session 21) — two new persistent, toggleable object types following the exact same
  "standard object treatment" as pins/tracks/polygons/bearings: a state.rangeRings/state.buffers array wired
  through all 6 sync touchpoints (initial state, getSyncableState, applyMergedState, clearLocalDataForSignOut,
  loadState fixups + repeatMigrated loop, mergeStates), a GeoJSON source+layer pair added idempotently in
  reinitializeLayers() (rangerings-source/-line-touch/-line; buffers-source/-fill/-line) and resynced there on
  every style.load, addXToMap/removeXFromMap/refreshXMap → scheduleXRefresh() → updateXSource() debounced
  rebuilds, a centered .modal (#rangering-modal/#buffer-modal) reused via expandDrawerForEdit/
  collapseDrawerFromEdit for in-place editing, openXModal/openXModalForNew/saveXFromModal/deleteXById/
  closeXModal functions, a popupHtml builder using the shared popupFooterHtml (Directions/Share/Edit data/
  overflow-with-Delete, no secondary geometry action — popupFooterHtml's geometryLabel/geometryOnclick params
  were already optional from prior work), openXPopupAt routing through the shared #view-drawer, a +Add sheet
  button, and window.FieldMap.* exports for onclick handlers. Both types are entirely user-distance-driven —
  no preset/default radii or widths anywhere, per the core "tool not the answer" philosophy — and both share
  one generic, non-jurisdiction-specific RANGE_BUFFER_DISCLAIMER string surfaced in both the creation modal and
  the compact drawer view.
  - Geo-math: this file had no geometry library (turf.js etc. — confirmed via audit) before this session, so
    destinationPoint(lat,lng,bearingDeg,distanceMiles) (forward spherical geodesic, same R=3958.8mi as
    haversineMiles) was added as the one missing primitive, then built on for both features'
    geometry: circlePolygonCoords(centerLat,centerLng,radiusMiles) (64-vertex circle approximation, GeoJSON
    ring convention) for Range Ring, and bufferPolygonCoords(points,widthMiles) (perpendicular offset each
    segment by widthMiles both sides, insert a round-join arc at each interior vertex, a full round-cap
    semicircle at each open end, then trace left-forward + end-cap + right-backward + start-cap to close the
    ring) for Buffer. Both verified numerically correct via standalone Node scripts (not just visually) before
    wiring into the app — circle points all measured exactly radiusMiles from center; buffer points all
    measured exactly widthMiles from the source line via point-to-segment distance, for both a straight and a
    bent test line. One real bug caught this way: bufferPolygonCoords' offsetPt() originally returned
    `{lat,lng}` objects while the arc-point helpers pushed `[lng,lat]` arrays into the same array, producing
    silent NaNs (`isNaN(undefined) === true` masked the real mismatch) — fixed by making offsetPt return
    `[lng,lat]` consistently, matching this file's GeoJSON coordinate convention throughout.
  - Range Ring specifics: radii are entered as one comma-separated free-text field (parseRangeRingRadii —
    forgiving of trailing commas/whitespace, silently drops anything that doesn't parse to a positive number)
    plus a feet/miles unit selector, producing one LineString feature per ring (not per object) in
    rangerings-source, all sharing one center. Each ring's radius label is a separate, always-visible
    maplibregl.Marker (rangeRingLabelMarkersById, keyed '<objId>_<ringIndex>' so editing an object's radii
    only adds/removes the affected label markers rather than a full teardown) positioned at that ring's own
    due-north point (destinationPoint(center, 0, radiusMiles)) — deliberately NOT a data-driven symbol layer,
    since MapLibre symbol layers can't easily place one label per ring at each ring's own top point from a
    shared source. Labels use a plain `.rangering-label` CSS class (bold, colored to the item's status color,
    text-shadow for legibility over any basemap) rather than inline styles, unlike polygon's own area-label
    markers — a deliberate, harmless inconsistency, not fixed retroactively since polygon's pattern works too.
    The compact drawer view always lists every ring's radius as text (not just the map labels) specifically so
    revisiting the object days/months later still shows what was set even before the map itself is looked at.
  - Buffer specifics: creation reuses Draw Route's existing drawMode/drawPoints/handleDrawClick machinery
    directly (not a parallel implementation) via a new drawTargetType module var ('track' | 'buffer', reset to
    'track' immediately after every Finish/Cancel) that the single shared draw-finish-btn handler branches on
    to call openBufferModalForNew(pts) instead of openTrackModalForNew(pts) — Snap-to-trail and the travel-
    mode selector remain visible during buffer drawing as an accepted side effect of full reuse (they're
    inert/irrelevant for a buffer's reference line, not disabled, since spec called for reusing the mechanism
    "directly, not a new one"). Width is entered once via a modal number input + unit selector and, unlike
    CalTopo (explicitly named as the gap being fixed), stays permanently visible in the compact drawer view
    ("Width: 50 ft") both immediately after creation and on reopening the object later, since it's a real
    stored field (buffer.width/.unit) rendered by bufferPopupHtml every time, not a one-time creation-only
    prompt.
  - Verified end-to-end via live browser testing (this sandbox has no Playwright install, so testing used the
    already-connected Chrome extension driven directly instead): 3-radii Range Ring (100/250/500 ft) renders
    3 correct concentric rings with correctly positioned top labels, compact drawer lists all 3 radii, editing
    radii in place live-updates both the rings and labels, and everything survives a full page reload
    unchanged. A 3-point bent-line Buffer at 50ft width renders a correctly rounded-cap/rounded-join polygon,
    "Width: 50 ft" is visible in the drawer immediately and after a reload, and Delete (verified by scripting
    around the native `confirm()` dialog, which blocks this browser-automation tool's CDP channel — a known
    tooling limitation, not an app issue) correctly removes the object from both the map and localStorage and
    writes a tombstone for each (recordTombstone — the exact mechanism a Session 8 bug once went missing for
    bearings; deliberately checked here to avoid repeating that). Compass's live map-tap-to-set-bearing
    interaction was also re-confirmed working with the panel in its new position (see below). No console
    errors observed in either browser tab across the full test pass.
- Compass anchor fix (Session 21): Session 20's restyle gave #compass-panel the same visual card treatment as
  #view-drawer (solid bg-elevated, 14px radius, matching shadow) but left its position at the pre-existing
  top-center rule — a leftover gap, not a new regression. Fixed by copying #view-drawer's own position rules
  verbatim: desktop `position:fixed;left:auto;bottom:24px;right:64px` (inline style on the element, same as
  before, just corrected), mobile `left:14px;right:14px;bottom:88px` in the existing `@media (max-width:760px)`
  block. Deliberately did NOT make it a literal shared element with #view-drawer or a .floating-panel — same
  reasoning as the trip picker before it: a real shared element would reintroduce the drawerExpandedType/
  mid-edit conflicts that motivated keeping these separate. Still absent from PANEL_SCRIM_IDS/
  OUTSIDE_CLICK_DISMISS_IDS, so the map stays fully interactive underneath it exactly as before — confirmed
  live (not just by inspecting the unchanged JS) by tapping the map with Compass open and observing a bearing
  target set correctly (WNW 300° in the verification run) with the panel still docked in its new position.
- Comma-separation audit (Session 21): grepped for `Math\.round\([^)]*\)\s*\+\s*['"]...(ft|sq ft|ac|mi)['"]`-
  shaped patterns across the whole file to find every large-number display missing `.toLocaleString()`. Area
  (polygonAreaDisplay/formatAreaInUnit) and elevation (getElevationFt call sites, tapAnywhereConditionsText,
  pin popup) were already correct. The one real gap found: updateScaleBar()'s rounded feet/miles labels
  (chosenFeet/chosenMiles, e.g. "5000 ft" at higher zoom levels) had no `.toLocaleString()` — fixed by adding
  it to both branches.
- Range Ring/Buffer wiring gaps (Session 22): three bugs reported right after Session 21 shipped Range Ring
  and Buffer, all traced to incomplete wiring rather than broken logic in the features themselves.
  1. Trip picker not opening for Range Ring/Buffer's Edit view, at all (no scrim, no reaction): the click
     listener that opens the shared trip picker is attached via a single hardcoded array —
     `['pin-trip-btn', 'track-trip-btn', 'polygon-trip-btn', 'bearing-trip-btn']` — that Session 21 never
     added `rangering-trip-btn`/`buffer-trip-btn` to when building the two new modals. The button rendered
     and displayed correctly (setTripPickerButtonDisplay was called correctly from both openXModal functions)
     but had zero click behavior. Fixed by adding both ids to the array (now 6 entries, one shared handler
     shape for all).
  2. Trip picker rendering but completely unclickable specifically from Compass's "Save bearing" flow — a
     DIFFERENT root cause from #1, confirmed via `document.elementFromPoint()` at the search box's own
     coordinates: it resolved to `#bearing-modal`, not the picker, proving the picker was receiving zero
     pointer events despite `classList` showing it as open. Root cause: `.modal-overlay` is z-index 2000,
     `.floating-panel` (trip-picker-panel's own class) is 1500 — a brand-new-item modal (Range Ring/Buffer/
     Pin/Track/Area/Bearing creation, always a raw `.modal-overlay`) sits ABOVE the picker, silently eating
     every click meant for it. This is why "Range Ring edit"/"Buffer edit" (root cause #1, both go through
     expandDrawerForEdit → re-parented into #view-drawer at z-index 1300, comfortably BELOW the picker's 1500)
     read as a different bug from "Compass's save-bearing flow" (root cause #2, a raw NEW-item modal at 2000,
     ABOVE the picker) even though both were reported together as "likely one shared root cause" — they
     were actually two, and only coincidentally looked similar (both show the picker's scrim/backdrop with no
     usable content). Confirmed via direct testing that this z-index bug is not Compass-specific at all — the
     ordinary +Add-sheet "Add bearing" flow (and by extension a brand-new Pin/Track/Area/Range-Ring/Buffer
     with a trip assigned at creation time) hits the identical failure, since all of them show the same raw
     `.modal-overlay`. Fixed with a single `z-index:2100` inline override on `#trip-picker-panel` (higher than
     any modal-overlay, still above every other `.floating-panel`) rather than three separate patches for each
     reported symptom — the picker is now always on top regardless of which kind of modal it was opened from.
     `#panel-scrim` was deliberately left at its original z-index (1050): the still-open creation modal
     already provides its own backdrop darkening in this nested case, and no other `PANEL_SCRIM_IDS` panel can
     ever coexist with an open `.modal-overlay` in practice (the modal's own higher z-index blocks the clicks
     that would be needed to open one), so raising the scrim's z-index too would have risked nothing while
     fixing nothing further.
  3. Neither Range Ring nor Buffer responded to a direct map tap (sidebar was the only way in) — unlike pins/
     tracks/areas/bearings, which are each registered in the shared `map.on('click', layerId, ...)` dispatcher
     system (checked-before-generic-catch-all via `e.preventDefault()`). Session 21 built the GeoJSON source/
     layer pair (`rangerings-line-touch`, `buffers-fill`) but never added the matching click/hover handlers.
     Fixed by adding two new handler blocks (mirroring tracks-line-touch/polygons-fill's exact pattern,
     mode-aware pass-through included) registered on `rangerings-line-touch` and `buffers-fill`.
  Also fixed in the same pass, found via testing #1/#2 rather than in the original report: Buffer's Width
  field (`<input type="number">`) didn't match Range Ring's Radii field (`<input type="text">`) styling — the
  shared `.modal input[type=text], .modal select, .modal textarea` CSS rule never covered `type=number`
  (confirmed via grep that `buffer-width` is the only `type=number` input anywhere in the app), so it fell
  back to browser-default light styling. Fixed by adding `input[type=number]` to that selector.
  Also fixed, found only by testing the "assign a trip successfully" verification step with an EXISTING trip
  rather than always creating a new one: `computeTripsPresent()` — which drives the trip picker's list, trip
  filter chips, and sidebar "group by trip" view — only ever scanned
  `state.pins/tracks/polygons/bearings`, never `state.rangeRings/buffers`, so a trip assigned only to a Range
  Ring or Buffer was invisible everywhere else in the app (including in the OTHER new type's own trip picker).
  Fixed by adding both arrays to the same `.concat()` call. `deleteTripById` was checked and does NOT need the
  same fix — it never clears `.tripId` off any item of any type (pin/track/polygon/bearing included), relying
  entirely on `tripDisplayName()`'s existing null-safe fallback for a dangling reference, so this is pre-
  existing, consistent behavior, not a new gap introduced by the new types.
  Verified end-to-end live in Chrome (this sandbox still has no local Playwright install): trip assignment
  confirmed working from Range Ring edit, Buffer edit, and Compass's Save-bearing flow (all three, including
  creating a brand-new trip via "+ New trip" AND re-selecting that same existing trip from a different item's
  picker afterward); direct map-tap confirmed opening the drawer for both an existing Range Ring and an
  existing Buffer with no sidebar detour; Buffer's Width field confirmed visually matching Radii's dark
  styling; Pin's trip assignment (both a brand-new pin via +Add, and Edit data on an existing pin) confirmed
  unaffected by any of the above changes — the existing-item edit path was never broken to begin with, only
  new-item creation modals and Range Ring/Buffer specifically. One real testing gotcha hit along the way: the
  service worker's cache-first SHELL_CACHE strategy served a stale pre-fix copy of index.html on an early
  reload (the SHELL_CACHE version bump for this session's work had already been made, then one more source fix
  — computeTripsPresent — landed afterward without a second bump), making the fix look like it hadn't worked;
  resolved by unregistering the service worker and clearing Cache Storage directly for testing, not by editing
  the app itself, since a real end user would simply get the already-bumped SHELL_CACHE on their next visit
  regardless of exactly which edit happened before or after the bump within the same release. `node --check`
  confirmed clean syntax on all 4 extracted inline `<script>` blocks and on service-worker.js. APP_VERSION
  bumped 2.27.0 → 2.27.1, SHELL_CACHE bumped v131 → v132.
- Migration corridors (compiled 10-state USGS Corridor Mapping Team ungulate migration data, Session 26) —
  lives in the Wildlife Layers panel as a 4th tab alongside Habitats, own independent on/off + species picker
  (migrationsOn/migrationActiveSpecies), fully separate from Habitats' own toggle (see that entry's own
  comment for why it isn't folded into the generic WILDLIFE_CATEGORIES loop). One shared source
  ('migration-source') + fill/line layer pair for all four geometry_category values (Corridor/Stopover/
  WinterRange/AnnualRange), filtered by four independent checkboxes (migrationCorridorOn/
  migrationStopoverOn/migrationWinterRangeOn/migrationAnnualRangeOn — despite the name, Corridor is ONE
  checkbox controlling all of that category's use_class tiers together, never separate Low/Medium/High
  checkboxes). Data source is 4 compiled species files (`data/ungulate-migrations/cmt_migrations_{elk,
  mule_deer,pronghorn,whitetail_deer}.geojson`, Elk/Mule deer/Pronghorn/White-tailed deer), each spanning
  multiple states — this supersedes the original single-herd West Goose Lake POC file (deleted; California's
  compiled elk file already includes that exact herd as CA_Elk_WestGooseLake, so keeping both wired would
  have double-rendered it). The species dropdown is fully data-driven (migrationSpeciesList()), so White-
  tailed Deer needed zero picker code — it appeared automatically once its file joined MIGRATION_DATA_FILES.
  Property schema normalization: the compiled files use a different property schema than the old POC file
  did (`type`/`useclass`/`herdid` vs. this app's existing `geometry_category`/`use_class`/`herd_id`/
  `herd_name`) — normalized once at merge time in loadMigrationData via `Object.assign`, so every downstream
  reader (paint expressions, filters, migrationPopupHtml) keeps working unchanged against the same property
  names as before. This also preserves the original raw properties untouched, including `states` (an array
  like `["OR","NV"]` for a herd deduped across state boundaries, e.g. Sheldon Hart Mountain) — not read by
  any UI yet, just carried through onto the rendered feature's properties for potential future use, per
  spec. Confirmed live: `states` survives as a real array on the data passed to `GeoJSONSource.setData()`
  (MapLibre itself is what turns it into a JSON string on features returned from `queryRenderedFeatures`/
  click events, same as any GeoJSON source with array-valued properties — not something the app does or
  needs to work around). The compiled files have no human-readable herd name field (only a machine-readable
  herdid like "AZ_Elk_Interstate17"), so `herd_name` falls back to `herdid` rather than always reading as
  the generic "Migration herd" placeholder every popup showed before this normalization.
  Per-category paint:
  - Winter Range: flat `MIGRATION_WINTERRANGE_FILL` at fill-opacity 0.475, WITH a thin (1px)
    `MIGRATION_WINTERRANGE_STROKE`. Originally a tan wash (#FAEEDA) with no stroke at all (Session 23) — recolored
    purple (Session 24: fill #CECBF6, stroke #534AB7) because the tan-on-tan combination had no contrast
    against the Topo/Topo Dark basemap's own tan tones, and purple was otherwise unused now that Corridor
    owns the amber/coral gradient (also doesn't overlap Hydrography's or GPS-locate's blues). The thin stroke
    was added at the same time — a flat wash with zero definition at 45-50% opacity risked disappearing
    entirely against some basemap/zoom combinations; a 1px outline costs it none of the "broad zone, not a
    traced boundary" read Corridor's own gradient is built around avoiding.
  - Corridor: a `['match', ['get','use_class'], ...]` expression — amber `MIGRATION_CORRIDOR_LOW_FILL`
    (#FAC775) at LowUse, coral `MIGRATION_CORRIDOR_HIGH_FILL` (#993C1D) at HighUse — at fill-opacity 0.55 (the
    highest of the three categories, since it has no stroke to lean on for legibility) and, deliberately, NO
    stroke at all: a per-tier stroke color would show as a visible seam at the boundary between adjacent
    Low/Medium/High polygons, undermining the "one continuous gradient" read the style calls for.
    `MIGRATION_CORRIDOR_MEDIUM_FILL` (#CA8249, the exact numeric midpoint of the two endpoint colors, not
    eyeballed) is wired into the same match expression for herds whose data has a MediumUse tier.
  - Stopover: flat `MIGRATION_STOPOVER_FILL` (#D4537E, pink/magenta) at fill-opacity 0.45 WITH a stroke
    (`MIGRATION_STOPOVER_STROKE`, #72243E) — the one category that keeps a traced-boundary look, specifically
    so it stays visually distinct from Corridor's soft gradient at a glance.
  - Annual Range (Session 26 — AZ/CA/NM herds have this type; most other states' compiled data doesn't):
    identical treatment to Winter Range — flat `MIGRATION_ANNUALRANGE_FILL` (#BCE8E1) at fill-opacity 0.475
    WITH a thin (1px) `MIGRATION_ANNUALRANGE_STROKE` (#1D7A68) — but in teal rather than purple, so the two
    flat-wash categories stay visually distinguishable from each other where they overlap. Teal was picked
    specifically because it's unused elsewhere in the app (doesn't collide with Hydrography's/GPS-locate's
    blues, Corridor's amber/coral, Stopover's pink, or Winter Range's purple). The Annual Range row in the
    picker (`#migration-annualrange-row`) is hidden entirely — not just disabled — for any species/herd
    combination with zero AnnualRange features (`migrationSpeciesHasCategory()`), e.g. White-tailed Deer
    (Washington's single Selkirk herd has Corridor/Stopover/WinterRange only, no AnnualRange at all); even if
    `migrationAnnualRangeOn` was left checked from a previously-viewed species that did have it, the filter
    simply matches nothing for a species without it, so it's already a safe no-op on the map regardless.
  Corridor stays the only no-stroke category — `migration-line`'s own filter is a *subset* of
  `migration-fill`'s (`updateMigrationMapFilter()` computes `lineCats` as `cats` filtered to
  `Stopover`/`WinterRange`/`AnnualRange`, never the same list reused for both layers). `line-color` and
  `line-width` on that layer are per-category `case` expressions (Winter Range's 1px purple, Annual Range's
  1px teal, Stopover's 1.75px maroon).
  Paint order / z-order fix (Session 26 — reported as broken in the prior session's shipped work: Winter
  Range was observed rendering on top of Corridors in at least one visible area, backwards from spec).
  Required order, bottom to top: AnnualRange → WinterRange → Corridor → Stopover (Stopover — the smallest,
  most specific feature — must never be obscured; AnnualRange — the broadest zone — must never cover
  anything). Root cause: all four categories live in the SAME single `migration-fill`/`migration-line`
  layer (one shared source/layer pair for the whole feature, not one layer per category — see below), so
  which feature painted on top of another spatially-overlapping feature was governed by feature order
  within the merged/filtered GeoJSON's own `features` array, not by any explicit z-order control — purely
  an artifact of which of the 4 compiled files' features happened to concatenate later. Fixed via
  `fill-sort-key`/`line-sort-key` (real MapLibre layout properties — confirmed present in the vendored
  `maplibre-gl.js` via grep before using them — evaluated per-feature exactly like a paint expression, the
  documented, idiomatic mechanism for this exact problem) rather than manually re-sorting the source data on
  every `setData()` call: `MIGRATION_CATEGORY_ZORDER = {AnnualRange:0, WinterRange:1, Corridor:2,
  Stopover:3}` feeds one shared `MIGRATION_SORT_KEY_EXPR` match expression applied to both layers' `layout`.
  This holds regardless of fetch/merge order and needs no re-sort logic anywhere else in the code.
  Legend (both the "active layers" chip and the Wildlife Layers panel's own per-checkbox swatches) shows one
  row per category, Stopover / Corridors / Winter Range / Annual Range picker order (display order only, no
  relation to the fixed paint/z-order above). The panel's own Corridors swatch renders an actual CSS
  `linear-gradient(to right, LOW_FILL, HIGH_FILL)` rather than a flat color. `migrationPopupHtml`'s
  per-feature "Low use"/"High use"/"Medium use" label only applies to Corridor; Stopover/Winter Range/Annual
  Range popups show their plain category name with no use-class suffix.
  Verified live via the already-connected Chrome browser extension against a local `python -m http.server`:
  all 4 species selectable and correctly populated from the merged data (Elk/Mule deer/Pronghorn/White-
  tailed deer, alphabetical); White-tailed Deer confirmed rendering its single WA Selkirk herd correctly
  with the Annual Range row correctly hidden; Annual Range confirmed rendering (teal wash + stroke) for an
  AZ Mule Deer herd (Rainbow Valley) and an AZ Elk/Pronghorn combination, with the row correctly appearing
  only for species/herds that have it. The paint-order fix was verified programmatically, not just visually
  — by capturing the live MapLibre `Map` instance (via a `Map.prototype` method monkey-patch, since `map`
  isn't a global) and calling `queryRenderedFeatures()` at real, data-confirmed overlap points (found via a
  proper point-in-polygon test against the raw GeoJSON, not bounding-box overlap, which produces false
  positives for irregular/sparse polygons — confirmed the hard way when an initial bbox-only search and a
  low-zoom/under-tessellated screen-space search both produced points that looked like overlaps but weren't
  real ones once checked against the raw source geometry or re-verified at a properly settled zoom level):
  at a real AZ elk (Interstate17 herd) overlap point, `queryRenderedFeatures` returned Stopover → Corridor →
  Corridor → WinterRange, topmost first; at a real AZ/NV pronghorn overlap point (CA_Pronghorn_LikelyTables'
  AnnualRange under NV_Pronghorn_CentralWashoe's Corridor/WinterRange), it returned Corridor → WinterRange →
  AnnualRange. Together these two real-data checks cover the full required stack top-to-bottom. Also
  confirmed visually at the pronghorn overlap: Stopover's pink blobs sit fully opaque on top of everything,
  Corridor's amber/coral gradient is visible cutting across both the purple Winter Range band and the teal
  Annual Range wash beneath it, and Annual Range never covers any of the other three. Zero console errors
  across the test session. `node --check` confirmed clean syntax on all 4 extracted inline `<script>`
  blocks. APP_VERSION bumped 2.29.0 → 2.30.0, SHELL_CACHE bumped v135 → v136. The old West Goose Lake POC
  file (`data/ungulate-migrations/elk-west-goose-lake.geojson`) was deleted from the repo after confirming
  via a whole-repo grep that nothing else referenced its path.
- Floating info stack (Session 24) — the coordinate/elevation readout, scale bar, active-trip chip, and a
  new active-layers indicator are one consolidated column now (`#floating-info-stack`), not four
  independently `position:absolute`-placed elements each guessing the previous one's rendered height (the
  old `#active-trip-chip` comment literally said "top:112px sits just below #scale-bar's measured bottom
  edge") plus a fifth element (`#wildlife-legend`) floating completely independently at bottom-right. Every
  child lost its own `position/top/right/width` and became a plain flow element; the wrapper alone is
  positioned, and flexbox `gap:8px` owns the spacing between children — adding, removing, or resizing a
  chip can never desync the gap again. All children share one fixed width (230px, `#floating-info-stack`'s
  own `width`), sized to fit the longest single species name in the GAP big_game dataset ("Columbian
  White-tailed Deer" / "Collared Peccary (Javelina)", both 27 characters) on one line — verified via
  `scrollWidth`/`clientWidth` equality (no truncation) with both names live, not just estimated.
  - Desktop: wrapper stays at `top:14px;right:14px` (unchanged edge from the old individual elements) —
    same visual position as before, just no longer three separate pixel-offset guesses.
  - Mobile: wrapper moves to `top:105px;left:14px;right:auto` — top-aligned in the left/center info column,
    not right-aligned like desktop (the right side conceptually pairs with `#map-controls`' icon column,
    even though that column is actually bottom-right on both breakpoints — parking the stack on the left
    avoids that association regardless). `top:105px` (not 14px) is deliberate, not arbitrary: it clears TWO
    things that would otherwise collide at the literal top-left on mobile — MapLibre's own
    NavigationControl (zoom +/-/compass, always added at `'top-left'`, measured ~0-97px tall) and
    `#map-search-bar` when opened via the search icon (centered, nearly full viewport width when open, so
    no horizontal dodge is possible — only clearing its ~57px bottom edge works). 105px sits past both with
    margin. The old mobile layout split these same concerns across two *different* fixes (coords+scale
    docked at the *bottom* specifically to avoid the zoom control; the trip chip centered at `top:66px`
    specifically to avoid the search bar) — this session unified both constraints into the one number that
    satisfies both at once, letting everything live in a single top-anchored column instead of two disjoint
    ones. The active-trip chip's mobile-only centered-position override was removed entirely — it's now
    just a plain stack child, left-aligned like every other chip in the column (including its own
    "No active trip" state, previously the one thing on mobile that was centered independently at the top).
  - New active-layers chip (`#active-layers-chip`, driven by `updateActiveLayersChip()` — a straight rename
    of the old `updateWildlifeLegend()`, all 8 call sites renamed with it, no call-site logic changed):
    replaces `#wildlife-legend`'s always-on color-swatch panel, which duplicated both the Wildlife Layers
    picker panel's own per-checkbox legend swatches and the tap-to-identify popups. Text-only — just the
    name(s) of whichever Habitat/Migration layer(s) are actually rendering, one `<div class="active-layers-
    line">` per active layer type (Habitat's `wildlifeDisplayName(wildlifeActive.speciesName)`, Migration's
    `migrationActiveSpecies + ' migration'`) — one line when only one of the two is active, two when both
    are, verified with the actual longest species names in both single- and both-active combinations, not
    just estimated. Each line gets its own `white-space:nowrap;overflow:hidden;text-overflow:ellipsis` as a
    safety net for a future name longer than anything in today's dataset. Unlike the trip chip (always
    visible, has its own muted no-active-trip state), this is the one chip in the stack that's fully
    `classList`-hidden (not just emptied) when neither Habitat nor Migration is active — confirmed via
    `getComputedStyle(...).display === 'none'` after switching both off, and confirmed the stack collapses
    cleanly (remaining chips keep their correct 8px gaps, no leftover empty space) when it disappears.
  - Verified live via the already-connected Chrome browser extension against a local `python -m
    http.server`: desktop stack confirmed via `getBoundingClientRect()` on every child — exactly 230px wide,
    exactly 8px gaps, same right edge; both longest species names confirmed non-truncated at that width,
    alone and combined with "Elk migration" (2-line case). Mobile verification hit a real tooling limitation
    in this sandbox: `resize_window` reports success but does not actually narrow the rendered viewport to
    mobile widths here (confirmed via `window.innerWidth` staying at the desktop/native resolution
    regardless of the requested size, across multiple fresh tabs) — there is no dedicated device-emulation
    tool available either. Worked around by injecting the exact mobile media-query CSS block verbatim as an
    unconditional `<style>` override on top of the real desktop-width page, which exercises the actual
    layout math (positions/widths/gaps/z-index relative to the real NavigationControl) without the
    trigger condition (a genuinely narrow viewport) being real — confirmed the resulting stack position,
    left-alignment, 8px gaps, and 4-chip ordering (coords → scale → trip → active layers) all match spec
    this way, but this is not equivalent to the "real mobile device" verification the task asked for, and
    is flagged here rather than silently presented as full mobile confirmation. Real-device/true-narrow-
    viewport verification of the mobile layout is still outstanding and should be the first thing checked
    next time a real device or working mobile emulation is available.
  - Four refinements on top of the above (Session 25):
    - Migration picker display order (no map/paint changes): `#migration-sublayers`' checkbox rows were
      reordered in the HTML to Stopover/Corridors/Winter Range, top to bottom — purely a markup reorder,
      since `renderMigrationSublayers()` and the checkbox change listeners all reference elements by id and
      are order-independent. Map paint/z-order (Stopover already renders on top as the smallest, most
      specific feature) was untouched.
    - `#active-layers-chip` is now tappable, not display-only: `openActiveLayersPanel()` opens
      `#wildlife-panel` (the deep species-picker "WILDLIFE LAYERS" panel with Habitats/Migrations tabs)
      directly, defaulting to whichever top-level tab has an active layer (or the last-viewed tab,
      `wildlifeActiveTopLevel`, if both or neither are active) and, for Habitats, pre-selecting
      `wildlifeActive.category`. Judgment call: the task said "same as clicking the layers toolbar icon,"
      but `#layers-btn` actually opens the shallower `#layers-panel` (quick-toggle rows), not the deep
      species picker — opening `#wildlife-panel` directly was implemented instead, since that's the panel
      the task actually names ("Wildlife Layers panel") and is the more useful one-tap destination. A small
      inline layers-glyph SVG icon (`.active-layers-icon`) was added at the start of the chip, wrapped
      alongside `#active-layers-chip-lines` (the chip's content moved into this new sibling div so the icon
      has `flex-shrink:0` while the text lines get `min-width:0;flex:1` — the same flex-shrink gotcha already
      documented for `#active-trip-chip-label` applies here for ellipsis truncation to actually engage).
    - Mobile stack repositioned bottom-left instead of top-left: `#floating-info-stack` in the mobile media
      query is now `top:auto;right:auto;bottom:108px;left:14px;width:140px` (anchored by `bottom` only, so it
      grows upward as chips are added/removed) instead of the Session 24 `top:105px;left:14px`. Width
      narrowed 230px → 140px (closer to the pre-Session-24 ~130px sizing the task referenced as "v2.27.2
      sizing") — the active-layers chip is expected to (and does) truncate long species names via ellipsis
      at this width rather than widening the chip; verified live with "Collared Peccary (Javelina)" truncating
      to "Collared Peccary (J…" while "Elk migration" (shorter) stays untruncated on its own line. Desktop
      stack (`top:14px;right:14px;width:230px`) is completely unchanged.
    - Coordinates + elevation, previously a single non-interactive bubble on both breakpoints, gained a
      tap-to-toggle: `centerReadoutMode` ('center' | 'gps') plus `centerReadoutGpsLatLng`/
      `centerReadoutGpsAltitudeM`/`centerReadoutGpsWatchId` (all new module vars) drive a third, fully
      independent `watchPosition` — deliberately NOT sharing state with the locate button's `gpsDotState`/
      `lastGpsLatLng` or Compass's `gpsWatchIdCompass`/`currentGpsLatLng`, matching this codebase's existing
      "each GPS-consuming feature gets its own watch" pattern (now a third example of it). Default/tap-back
      state ('center') reads `map.getCenter()` exactly as before; one tap starts the watch and switches both
      the coordinates AND elevation to the live GPS fix together (`updateCenterReadout()` branches once on
      `centerReadoutMode`, so there is no code path that could show one without the other); a second tap
      clears the watch and reverts to center mode. `updateCenterReadoutModeIcon()` swaps a small inline SVG
      (crosshair for center, a location pin for gps) into `#center-readout-mode-icon`/
      `#center-readout-mobile-mode-icon` — same icon/toggle behavior on both breakpoints, per spec. A
      geolocation error (permission denied, no hardware) reverts cleanly to center mode with a toast, rather
      than getting stuck mid-toggle. Judgment call, flagged: this replaces the previous tap-to-copy-
      coordinates gesture entirely (`copyCoordsText`/`copyMapCenterCoords` deleted outright) — the task's
      single-tap-to-toggle spec left no obvious room to preserve both gestures on the same tap target, and no
      alternate gesture (long-press, etc.) was requested for copy.
    - Verified live via the already-connected Chrome browser extension against a local `python -m
      http.server`, after unregistering the service worker and clearing Cache Storage first (stale
      SHELL_CACHE gotcha, same as every prior session's testing): Migration picker order confirmed visually
      (Stopover/Corridors/Winter Range top-to-bottom); active-layers chip confirmed opening `#wildlife-panel`
      on the Migrations tab (both layers were active in the seeded test data); coords/elevation toggle
      confirmed switching both values together (mocked `watchPosition` to a synthetic fix, since this
      sandbox has no real GPS), showing the correct icon at each state, and round-tripping cleanly
      (center → gps → center) with the elevation correctly re-resolving via the async DEM/lookup path after
      reverting. Mobile verification reused the same `resize_window`-doesn't-actually-narrow-the-viewport
      workaround established in Session 24 (confirmed again this session — a fresh tab's `window.innerWidth`
      stays at native resolution regardless of requested size) — CSS-injection override confirmed the
      repositioned/narrowed stack and the truncation behavior, but true narrow-viewport/real-device
      verification is still outstanding, same caveat as Session 24. Zero console errors across the test
      session. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION
      bumped 2.28.0 → 2.29.0, SHELL_CACHE bumped v134 → v135.
- Reachability: zoom/north-reset relocation, double-tap-drag fix (Session 27; "Left-handed mode," originally
  documented in this same entry, was removed entirely in Session 28 — see that session's own entry below and
  the "Mobile layout overhaul" entry for why, and note that a few details below — the icon cluster's exact
  member count/order, its `#map-controls` positioning — were also superseded by Session 28's column-to-row
  rework and are described in the current, post-Session-28 form in that entry instead of here):
  - Double-tap-drag-zoom investigation (done first, per explicit instruction — root cause before any fix):
    the reported regression ("worked before tap-anywhere shipped, broken since") was investigated by reading
    the actual vendored `maplibre-gl.js` (not assumed from the Map option names) to find exactly which
    handler class implements the drag gesture. Two candidate causes named in the task were both ruled out by
    source inspection: (1) this app's pre-existing `doubleClickZoom: false` (Map constructor option) —
    confirmed via the minified handler-manager wiring code that MapLibre's tap-drag-zoom gesture
    (`TapDragZoomHandler`, minified as `Qs`) is bundled inside `touchZoomRotate`'s own `enable()`/`disable()`
    (`class ta`'s methods call `this._tapDragZoom.enable()`/`.disable()` directly), fully independent of the
    separate `doubleClickZoom` composite handler (`Xs`, combining `ClickZoomHandler`+`TapZoomHandler`) that
    option actually gates — so `doubleClickZoom:false` was a red herring, never capable of affecting this
    gesture. (2) tap-anywhere's own `map.on('click', ...)` handler — confirmed via reading its full body (the
    map's final click handler) that it never calls `preventDefault()`/`stopPropagation()` on the underlying
    native touch events, and MapLibre's synthesized `'click'` event only fires after its OWN internal gesture
    recognition already completed for a confirmed single tap — so this handler fires too late in the pipeline
    to structurally intercept anything `Qs` needs. The REAL root cause: `Qs`'s own class body
    (`this._tap=new Ss({numTouches:1,numTaps:1})`, `touchstart(t,e,i){...a=t.timeStamp-this._tapTime<500,
    o=this._tapPoint.dist(s)<30...}`) requires the gesture's second tap to land within ~30px of the first —
    and tap-anywhere's temp marker (`buildTapAnywhereMarkerEl`, dropped via `tapAnywhereMarker = new
    maplibregl.Marker(...)`) sits exactly at the first tap's location, well within that 30px tolerance. The
    marker's own code comment already said it was meant to be "deliberately inert" (no click handler,
    `cursor:default`) — but that only changed the visual cursor; the element was still a normal, solid DOM
    node that fully captures/absorbs any touch landing on it regardless of whether a listener is attached
    (an element with zero JS listeners still consumes the event — it just does nothing with it — the event
    does not "pass through" to whatever's visually behind it, since the canvas is a separate sibling
    element, not an ancestor). So the gesture's second tap, landing on the marker instead of the canvas,
    never reached MapLibre's touch handler at all. Fix: added `pointer-events:none` to the temp marker's
    inline style (`buildTapAnywhereMarkerEl`) — a genuinely zero-side-effect change (the marker never had
    any interaction to lose) that lets a second tap pass straight through to the canvas beneath, restoring
    the native gesture with no delay added anywhere — the narrow fix the task asked to prefer over a
    long-press fallback, and no long-press fallback was needed. Confirmed via DOM inspection after dropping a
    temp marker: `pointer-events:none` is applied and computed correctly, while real (saved) pin markers
    remain fully `pointer-events:auto`/clickable, completely unaffected. **Verification limitation, flagged
    rather than silently claimed**: this sandbox's browser reports `navigator.maxTouchPoints === 0` /
    `'ontouchstart' in window === false` — genuinely no touch hardware or emulation available — so the actual
    live gesture (a real double-tap-and-drag) could not be empirically exercised here; the fix is grounded in
    a specific, source-verified mechanism (not a guess). **RESOLVED (Session 29)**: confirmed working on a
    real mobile device — double-tap-and-drag zoom is restored, closing out the one item this session
    couldn't verify itself.
  - Zoom/north-reset relocation: removed `map.addControl(new maplibregl.NavigationControl(...), 'top-left')`
    entirely and added three custom buttons (`zoom-in-btn`, `zoom-out-btn`, `north-reset-btn`) to
    `#map-controls`' existing reachable icon cluster (search/layers/filter/locate/download), styled with the
    same `.map-icon-btn` class (round, 40px desktop/38px mobile) rather than restyling MapLibre's own
    rectangular control markup. Click handlers are the direct MapLibre equivalents (`map.zoomIn()`,
    `map.zoomOut()`, `map.easeTo({bearing:0,pitch:0})` — the last matching NavigationControl's own documented
    `resetNorthPitch()` behavior exactly, resetting both bearing AND pitch in one motion). `north-reset-btn`'s
    needle icon (two-tone SVG triangle pair, accent-colored north half) live-rotates via
    `map.on('rotate', updateNorthResetIcon)` to keep pointing true north as bearing changes, the one piece of
    NavigationControl's own behavior worth preserving. Placed at the TOP of the existing stack (above
    search), a judgment call — the task didn't specify intra-cluster order, only that the two move "together
    as one unit"; kept every pre-existing icon's relative position unchanged rather than reshuffling for
    theoretical thumb-reach priority. Being plain buttons in `#map-controls`' own persistent HTML (not a
    MapLibre control), they need no extra plumbing to survive a style switch, unlike layers/sources that
    `setStyle({diff:false})` wipes.
  - "Show zoom buttons" (`state.settings.showZoomButtons`, default `true`): `zoom-in-btn`/`zoom-out-btn` carry
    an extra `.zoom-btn` class; `#map-controls.zoom-buttons-hidden .zoom-btn{display:none;}` is the only CSS
    involved, toggled by `applyReachabilitySettings()`. `north-reset-btn` deliberately has no `.zoom-btn`
    class and is never affected — orientation reset has no gesture equivalent, unlike zoom (pinch/scroll,
    both confirmed still fully enabled — `map.scrollZoom.isEnabled()`/`map.touchZoomRotate.isEnabled()` —
    regardless of this setting, since it only ever touches the buttons' own visibility, never the gesture
    handlers).
  - "Show zoom buttons" (`state.settings.showZoomButtons`, default `true`): `zoom-in-btn`/`zoom-out-btn` carry
    an extra `.zoom-btn` class; `#map-controls.zoom-buttons-hidden .zoom-btn{display:none;}` is the only CSS
    involved, toggled by `applyReachabilitySettings()`. `north-reset-btn` deliberately has no `.zoom-btn`
    class and is never affected — orientation reset has no gesture equivalent, unlike zoom (pinch/scroll,
    both confirmed still fully enabled — `map.scrollZoom.isEnabled()`/`map.touchZoomRotate.isEnabled()` —
    regardless of this setting, since it only ever touches the buttons' own visibility, never the gesture
    handlers).
  - Verified live via the already-connected Chrome browser extension against a local `python -m http.server`:
    NavigationControl confirmed gone from top-left, all 8 icons (zoom in/out, north-reset, search, layers,
    filter, locate, download — Filter and Download were both still in this cluster as of this session; they
    moved out to the Tools menu the following session, see "Mobile layout overhaul" below) render correctly
    in the reachable cluster in the same round style; zoom-in/zoom-out/north-reset all confirmed functionally
    correct via direct map-state inspection (bearing/pitch reset to 0, zoom level changes) — one testing
    wrinkle hit and resolved along the way: an automated background browser tab
    (`document.visibilityState === 'hidden'`) throttles `requestAnimationFrame` hard enough that MapLibre's
    `easeTo`-based zoom/rotate animations can sit "stuck" mid-flight for many seconds of real wall-clock time
    before completing — confirmed as a test-harness artifact, not an app bug, by re-checking after a
    foreground-forcing screenshot action and seeing the queued zoom change land correctly (this same artifact,
    and the same resolution, recurred in the following session too — see that entry); "Show zoom buttons"
    off/on confirmed hiding/showing exactly the two zoom buttons while north-reset stays and scroll/touch-zoom
    stay enabled. Real touch-gesture (double-tap-drag) verification could not be performed in this sandbox (no
    touch hardware/emulation — see that entry above); confirmed working on a real device in Session 29.
    Zero console errors observed. `node --check` confirmed clean syntax on all 4 extracted inline `<script>`
    blocks. APP_VERSION bumped 2.30.0 → 2.31.0, SHELL_CACHE bumped v136 → v137.
- Mobile layout overhaul, compass redesign, Tools menu additions, left-handed mode removal (Session 28):
  - Compass/north-reset icon redesign (both platforms): the two `<path>`s inside `#north-reset-icon-svg`
    were each only a thin partial wedge, not a real triangle — the north path went apex→right-mid→
    near-center (`M10 2 L13 10 L10 8.3 Z`) instead of using BOTH middle vertices, so only alternating right/
    left halves ever rendered. Fixed by completing each triangle to share the full horizontal midline
    (`M10 2 L13.5 10 L6.5 10 Z` / `M10 18 L13.5 10 L6.5 10 Z`), the classic two-tone compass-needle kite —
    solid `var(--danger)` red (north, top) and solid white (south, bottom), meeting along y=10. Purely a
    fill/geometry change: `map.on('rotate', updateNorthResetIcon)` and the tap-to-reset click handler
    (`map.easeTo({bearing:0,pitch:0})`), both from Session 27, are completely untouched.
  - Filter and Download relocation (both platforms): `filter-btn`/`offline-btn` removed from `#map-controls`
    entirely — not hidden, not gated by breakpoint — and replaced with two new Tools-sheet cells
    (`#sheet-filter-btn`/`#sheet-offline-btn`, same `.sheet-cell` grid as Measure/Settings/Export/etc.,
    `.bottom-sheet-overlay` has no media-query gating so this is identical on desktop and mobile). Each new
    button's click handler is the old button's handler plus one line (`tools-sheet` gets hidden first),
    mirroring `sheet-settings-btn`'s own close-then-open pattern exactly — `#filter-panel`'s and
    `openOfflineModal()`'s own behavior is completely unchanged, only the trigger moved. `#map-controls` is
    down to 6 icons: zoom in/out, north/reset, search, layers, locate.
  - Mobile chip row (`#floating-info-stack`): vertical bottom-left column → horizontal top-anchored row,
    full width (`top:14px;left:14px;right:14px`), replacing the column AND the `body.sidebar-open
    #floating-info-stack{bottom:calc(55vh + 160px)}` push-up rule that came with it — a top-anchored row is
    never in the expanding bottom sheet's way (the sheet only ever grows from the bottom edge), so there was
    nothing left here to dodge, and the rule was simply deleted rather than adapted. The three "full" chips
    (`#center-readout-mobile`, `#scale-bar`, `#active-trip-chip`) share `flex:1;min-width:0;height:40px` for
    an even split of the row's width regardless of which chips are actually visible at any moment (both
    `active-trip-chip` and `active-layers-chip` toggle a real `hidden` class, and flex:1 on the survivors
    naturally redistributes their share when one is absent — no JS involved). One real spec gap caught only
    by measuring computed styles, not by eyeballing a screenshot: `#active-trip-chip`'s desktop CSS uses a
    20px pill `border-radius` (a deliberate "always-visible status pill" look from the Active Trip project),
    which doesn't match the other three chips' 8px — "uniform corner radius" in the spec means all four
    chips in the row share one radius, so a mobile-only `border-radius:8px` override was added specifically
    for this one chip.
  - Active-layers chip, mobile: half the height of its row-mates (20px vs 40px, same 8px radius), and always
    single-line now instead of the old up-to-2-stacked-`<div>`s layout (`updateActiveLayersChip()` still
    builds one `<div class="active-layers-line">` per active Habitat/Migration layer — completely unchanged,
    both here and on desktop, which keeps the old 2-line stacking). The single-line behavior is a CSS-only
    mobile override: `.active-layers-line` switches from block to `display:inline` (so multiple divs flow
    together instead of stacking), `#active-layers-chip-lines` takes over nowrap+ellipsis truncation as ONE
    unit instead of each line truncating independently, and `.active-layers-line + .active-layers-line::before
    {content:' · '}` generates a separator between lines where the old vertical stacking used to be the only
    visual divider. Verified with a real long single line (truncates to "…" correctly) and a real two-line
    case ("Elk · Deer" — confirmed rendering intact, unclipped, when short enough to fit; confirmed truncating
    correctly when not, exactly as expected from nowrap+ellipsis on the combined text).
  - Search bar, mobile: now renders below the new chip row instead of overlapping it — the shared/desktop
    rule anchors `#map-search-bar` at `top:14px`, the exact same top edge the chip row now also uses, and the
    search bar's z-index (1300) sits above the chip row's (1000), so without a mobile override an opened
    search bar rendered directly on top of the chips. Fixed with `top:62px` (14px chip-row offset + 40px
    tallest-chip height + 8px gap) in the mobile media query. Confirmed live: chip row bottom edge at 54px,
    search bar top edge at 62px, no overlap.
  - Icon row, mobile: vertical bottom-right column → horizontal bottom row, full width
    (`bottom:90px;left:14px;right:14px`, same 90px offset as the old column — still just clearing the
    collapsed sidebar bar, a constraint the column-to-row shape change doesn't affect), `justify-content:
    space-between` spreading the 6 round `.map-icon-btn`s evenly without stretching or resizing them.
    `body.sidebar-open #map-controls{opacity:0;pointer-events:none}` (Session 26) needed no changes and still
    fades the row out correctly when the bottom sheet expands.
  - Real, newly-introduced collision caught and fixed (not pre-existing): `#draw-bar`/`#measure-result`/
    `#polygon-bar`/`#elev-bar`/`#bearing-bar` were ALSO at `bottom:90px` on mobile, but centered
    (`max-width:340px`) rather than full-width — previously this never collided with the OLD right-side
    icon COLUMN (different horizontal regions entirely), but the new FULL-WIDTH icon ROW at the same 90px
    offset now directly underlaps these bars' own bottom portion. Fixed by bumping these five selectors to
    `bottom:138px` (90 + 38px icon height + 10px margin) — confirmed live with the Measure tool: a real
    2-tap measurement result bar renders fully clear of the icon row beneath it, no overlap.
  - Panel/drawer audit (explicitly not assumed complete without checking): every panel in the app —
    Layers, Wildlife Layers, Filter, Settings, GMU state picker, Trip picker — is `.floating-panel`, and
    `#view-drawer`/`#compass-panel`/`#sunrise-panel`/`#cluster-panel` are each their own ids but ALL
    positioned via `bottom:88-98px` clearing the collapsed sidebar bar specifically, with NO reference
    anywhere (CSS selector, JS geometry read, or comment) to `#map-controls` or `#floating-info-stack`'s
    shape or position — confirmed by grepping every match of both ids across the whole file, not by
    inspecting only the "obviously-named" ones. None needed changes. The one thing found that looked
    related but wasn't: `#wildlife-panel` has always had a fixed inline `width:300px` (pre-existing, not
    touched this session, confirmed via `git diff` showing zero changes to that line) that keeps it
    narrower than the other full-width mobile panels — a real, pre-existing quirk, but unrelated to the
    icon/chip repositioning and out of this session's scope.
  - Left-handed mode removal: deleted the setting (`state.settings.leftHandedMode` + its `loadState` fixup),
    its Settings-panel checkbox row, `applyReachabilitySettings()`'s body-class toggle, both CSS rules
    (`body.left-handed-mode #map-controls` on desktop and mobile), and the change-listener wiring — all from
    Session 27. `applyReachabilitySettings()` itself was kept (still needed for "Show zoom buttons") but
    trimmed to just that one class toggle. Confirmed via a repo-wide case-insensitive grep for "left.hand"
    across every `.html`/`.js`/`.json` file (matching how the West Goose Lake POC removal was verified in an
    earlier session) that zero references remain anywhere.
  - Verified live via the already-connected Chrome browser extension against a local `python -m http.server`
    (after the standard service-worker-unregister + Cache-Storage-clear step). Mobile verification used a
    stronger technique than prior sessions' CSS-injection workaround: an actual `<iframe>` (390×844,
    `src` pointed at the same local server URL) genuinely renders at that CSS pixel width and triggers the
    real `@media (max-width:760px)` query naturally, rather than requiring the real mobile CSS to be
    hand-retyped as an override — this verifies the ACTUAL shipped file, not a manually-reconstructed
    approximation of it, and is what caught the `#active-trip-chip` border-radius gap above (a hand-retyped
    override would likely have silently "fixed" that gap by only including the rules I remembered to
    duplicate). Confirmed via this real-width iframe: both rows span full width with no clipping; all 4
    chips measured via `getBoundingClientRect()`/`getComputedStyle()` at the exact spec'd heights (40/40/40/
    20px) and one uniform 8px radius; all 6 icons measured at 38×38px, evenly spaced edge-to-edge; Layers →
    Wildlife Layers → Habitats opens correctly in place; Filter and Download both confirmed working from
    Tools on desktop; Settings panel confirmed ending at "Show zoom buttons" with no "Left-handed mode" row
    anywhere. Compass confirmed still live-rotating with bearing and still resetting bearing+pitch on tap
    (same background-tab `requestAnimationFrame`-throttling artifact from the prior session recurred here
    for the CSS opacity transition specifically — `body.sidebar-open`'s fade-out sat "stuck" at opacity:1
    for several seconds in the automated tab before a foreground-forcing screenshot let it complete
    correctly — confirmed as the same known test-harness limitation, not a new bug). Zero console errors.
    `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped
    2.31.0 → 2.32.0, SHELL_CACHE bumped v137 → v138.
- Chip sizing, mobile active-layers row, padding, active-trip stroke (Session 29):
  - Mobile active-layers-chip position bug: Session 28 made ALL FOUR chips (coords/elevation, scale, active
    trip, active layers) siblings of one `flex:1` row, which put the active-layers chip inline with — and
    visibly cramping — the 3 persistent chips instead of on its own row beneath them (confirmed via
    screenshot: "Ring-ne..." truncating hard against its row-mates). This was never what either the original
    spec or the actual intent called for. Fixed by introducing `#floating-info-row1`, a new wrapper around
    just the 3 persistent chips: `display:contents` on desktop (a true no-op — its children stack directly in
    the outer `#floating-info-stack` column exactly as before this session, zero desktop behavior change) and
    a real `display:flex;flex-direction:row` on mobile. `#floating-info-stack` itself went back to
    `flex-direction:column` on mobile (row1 + active-layers-chip stack vertically, `align-items:stretch` so
    both take the column's full width), and `#active-layers-chip` is now a plain sibling AFTER row1, not one
    of its flex:1 members — its own `.hidden` class toggle (`updateActiveLayersChip()`, completely unchanged)
    already made it disappear-with-no-gap correctly, since flexbox `gap` only applies between visible items;
    the position bug was purely about which row it was IN, never its hide/show logic.
  - Desktop chip sizing: the 3 persistent chips (`#center-readout-float`, `#scale-bar`, `#active-trip-chip`)
    get the same uniform-height/corner-radius treatment mobile already had — confirmed via screenshot as
    visibly inconsistent before this (each chip's height was purely content-driven, so they landed a few px
    apart, and `#active-trip-chip` used a 20px pill `border-radius` the other two never had). Fixed with one
    shared rule (`height:40px;box-sizing:border-box;border-radius:8px;justify-content:center`) — desktop
    keeps its existing 230px-wide vertical stack unchanged, this is sizing/radius consistency only, not a
    layout change the way mobile's got in Session 28. `#center-readout-float` needed `display:flex;
    flex-direction:column` added (it previously had no `display:flex` of its own at all, relying on
    `text-align:center` alone) for `justify-content:center` to have anything to act on.
  - Mobile chip padding: every chip's mobile padding was horizontal-only (`padding:0 Npx`) — confirmed via
    screenshot that coordinate text and the scale-bar graphic both sat flush against their chip's top/bottom
    edges with zero vertical breathing room. Fixed with real 4-sided padding (`padding:6px 10px` for the 3
    row1 chips, `padding:2px 10px` for the half-height active-layers row — proportionally smaller vertical
    padding to leave room for even one line of content at 22px total height) — row1's fixed height was bumped
    40px → 44px in the same change to give the new padding room without clipping the coords+elevation chip's
    2-line content (confirmed via `scrollHeight`/`clientHeight` equality — no overflow — after the change).
  - Active-trip chip stroke color: the chip's border was always the default neutral
    `rgba(255,255,255,0.12)` regardless of active-trip state — only `:hover` ever showed the accent color,
    even though the chip's own `::before` status dot has always been accent-colored whenever NOT
    `.no-active-trip`. Fixed with `#active-trip-chip:not(.no-active-trip){border-color:var(--accent);}`,
    mirroring the dot's own conditional logic exactly — one shared rule, no breakpoint-specific override
    needed since both platforms use the same selector/property. `.no-active-trip`'s own rule got an explicit
    (if redundant given `:not()` already excludes it) `border-color:rgba(255,255,255,0.12)` restatement for
    clarity/future-proofing, not because it changes behavior.
  - Verified live via the already-connected Chrome browser extension against a local `python -m http.server`.
    Desktop: all 3 persistent chips confirmed at exactly 40px height / 8px radius via
    `getBoundingClientRect()`/`getComputedStyle()`; active-trip chip's border confirmed switching to
    `rgb(194,98,45)` (`--accent`) the moment a real trip was selected via the trip switcher, matching the dot
    color exactly. Mobile used the same real-width `<iframe>` technique introduced in Session 28 (390×844,
    genuine `@media` match, not a hand-retyped CSS override) — confirmed the active-layers chip now renders
    as its own full-width second row (359px wide, 22px tall, 2px/10px padding) directly below row1, with zero
    gap/overlap when both are visible and zero leftover gap when active-layers is hidden; row1's 3 chips
    confirmed at 44px height / 6px-10px padding / equal ~116px width each; active-trip chip's mobile border
    confirmed matching accent too. Zero console errors. `node --check` confirmed clean syntax on all 4
    extracted inline `<script>` blocks. APP_VERSION bumped 2.32.0 → 2.33.0, SHELL_CACHE bumped v138 → v139.
- Scale bar overflow fix, dynamic search bar position (Session 30):
  - Scale bar graphic overflow — a real bug the Session 29 padding fix didn't actually catch, confirmed on a
    real device screenshot after being marked verified. Session 29's fix added real padding to `#scale-bar`'s
    own box, and that padding DOES correctly inset `#scale-bar-label` (plain text, naturally sits inside the
    padding box) — but the bar *graphic* (`#scale-bar-line`) has never been sized by CSS at all; its width is
    set directly in JS (`updateScaleBar()`) as an explicit pixel value computed from `maxBarPx`, which was a
    flat, unconditional `120` with no relationship to the chip's actual available content width. Desktop's
    chip is wide enough (~212px content width after padding) that 120 never overflowed there, which is
    exactly why this shipped unnoticed — mobile's narrower per-chip width (~95-115px content width after
    Session 29's own padding) is what actually exposed it, and a padding fix to the CONTAINER can't fix a
    width miscalculation on a CHILD that's sized independently of it. Fixed by computing `maxBarPx` live:
    `Math.min(120, scaleBarEl.clientWidth - paddingLeft - paddingRight)` — `clientWidth` includes padding, so
    subtracting both sides gives the exact content-box width the bar can safely fill without ever exceeding
    it, at any chip width, without changing desktop's behavior at all (120 stays smaller than desktop's
    available space, so `Math.min` always picks 120 there, identical to before).
  - Dynamic search bar position — the mobile `#map-search-bar` used a flat hardcoded `top` value (Session 28:
    62px, silently wrong the moment Session 29 bumped row1's height 40px→44px without updating it; also never
    accounted for the active-layers row's presence at all, so it always sat too high whenever that row was
    showing, overlapping it). Replaced with `updateSearchBarPosition()`, a JS function that reads
    `#floating-info-stack`'s real rendered bottom edge (`getBoundingClientRect().bottom` — which reflects
    row1's actual height AND whether the active-layers row is even present, automatically, with no manual sum
    of per-row heights) and sets `top` to that plus an 8px gap. Above the mobile breakpoint
    (`window.innerWidth > 760`) it clears any inline `top` instead, letting desktop's own independent
    `top:14px` CSS rule apply unchanged — desktop's search bar is centered, not right-aligned like the chip
    stack, and was never part of this bug. The mobile CSS's own hardcoded `top:62px` was deleted outright
    (not just fixed to a new number) specifically so this class of bug — a hardcoded pixel value silently
    drifting out of sync with a later, unrelated change to row height or row count — can't recur; there is no
    longer a static fallback value to go stale. Wired into `updateActiveLayersChip()` (unconditionally, both
    its hidden and shown branches — the ONE thing that changes the stack's total height on mobile), a
    `window.resize` listener, one boot-time call, and a defensive recompute right as the search bar opens.
  - Verified live via the already-connected Chrome browser extension against a local `python -m http.server`,
    using the same real-width `<iframe>` technique from Sessions 28-29 (390×844, genuine `@media` match).
    Scale bar: verified with an actual cropped screenshot at the bar's real rendered position (not just
    computed styles) showing clear inset on all sides at the current zoom; then stress-tested by capturing
    the live `Map` instance (via the established `Map.prototype` method monkey-patch) and artificially
    shrinking `#scale-bar` to 50px while forcing a real `updateScaleBar()` recompute via `map.panBy()` —
    confirmed the bar recalculated to a symmetric 11px/11px inset with zero overflow even at that stress
    width, proving the fix responds to real container width rather than being coincidentally correct only at
    the width first tested. Search bar: confirmed via `getBoundingClientRect()` AND a real screenshot in both
    states — no overlay active (search top 66px, 8px gap below row1 only) and an overlay active (search top
    94px, 8px gap below the overlay row instead) — plus the reverse transition (turning the overlay back off
    and reopening search, confirming it returns to 66px, not stuck at the taller offset). Desktop confirmed
    completely unaffected — inline `top` cleared, falls back to the unchanged `top:14px` CSS rule. One
    testing-methodology gotcha hit and resolved along the way: an artificial DOM-narrowing test on the scale
    bar briefly read as still overflowing because the change hadn't actually triggered a real
    `updateScaleBar()` recompute yet (a plain CSS width change on the container doesn't itself re-run JS) —
    resolved by triggering a genuine `map.panBy()` call so the real `move` event listener fired the real
    recompute, not by trusting the stale pre-recompute measurement. Zero console errors. `node --check`
    confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.33.0 → 2.34.0,
    SHELL_CACHE bumped v139 → v140.
- Bathymetry removal from vectorbase (Session 31): the combined vectorbase composite tileset (used by Topo,
  Topo Dark, and Aerial + Topo, and downloaded offline as one dedup'd source per `BASE_LAYER_SOURCES`) used
  to list 3 Mapbox tilesets — `mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2,mapbox.mapbox-bathymetry-v2`
  — and now lists 2, with `mapbox-bathymetry-v2` dropped. Verified BEFORE removing (not assumed carried
  forward from a stale prior check) via a fresh audit of all 3 style JSONs: every `source:"composite"` layer
  across all 3 files, cross-referenced by `source-layer`, confirmed `depth` (bathymetry's own source-layer)
  is consumed by exactly one layer anywhere — `water-depth` (fill, `maxzoom:8`) — with no other layer, in any
  of the 3 styles, referencing it. `maxzoom:8` sits below `OFFLINE_DEFAULT_MIN_ZOOM` (9) and below any zoom
  this hunting/field app is realistically used at interactively, matching the removal's premise exactly.
  `hillshade` (fill, source-layer `hillshade`, from mapbox-terrain-v2 — genuinely a different tileset,
  despite both being terrain-adjacent) was independently confirmed unaffected — its own layer definition
  wasn't touched at all, only the composite SOURCE's tileset list changed. One flagged nuance, not silently
  omitted: the offline-download zoom picker technically allows selecting min zoom as low as Z1 (not hard-
  floored at 9 — that's only the pre-selected default), so "invisible at every zoom the app actually
  downloads" is true in the overwhelmingly common case, not as an absolute enforced floor; this doesn't
  change the removal's correctness since a Z1-Z8 offline download or interactive view was never a
  bathymetry-relevant use case for a hunting/pin-tracking app to begin with.
  Both places were edited to match exactly: the 3 style JSONs' own `composite` source (edited via a precise
  string replacement — read as plain text, not JSON.parse/stringify, specifically so these large minified
  single-line files stay byte-identical everywhere except the one targeted substring, with each file's exact
  occurrence count of the string verified as exactly 1 before writing and full JSON-parse validity confirmed
  after) and `DOWNLOAD_LAYERS.vectorbase`'s `urlTemplate` in the offline-download code. `refresh-style.js`
  (re-fetches these same 3 files fresh from Mapbox Studio) was checked and flagged, not silently ignored: if
  it's ever run again, it will overwrite all 3 style JSONs with whatever composite source Studio's own
  account-side style config currently has — if that still lists bathymetry-v2, running the refresh script
  would silently re-introduce it here. This fix only touches the local files' current content, not Studio's
  own configuration (outside this codebase, no access to change it from here).
  Verified live via the already-connected Chrome browser extension against a local `python -m http.server`:
  all 3 edited style JSONs load and parse correctly through the app's own `loadStyle()`/`setMaplibreStyle()`
  pipeline with zero console errors when switching between Topo, Topo Dark, and Aerial + Topo (confirmed via
  the actual `<input>` radio state, not just visual inspection, that `aerial-streets` was genuinely selected
  and not plain `aerial`). **A live before/after download-size comparison could not be completed in this
  sandbox, flagged rather than fabricated**: attempting to fetch real tile bytes (both directly via `fetch()`
  and by checking the live map's own tile loading) found that Mapbox's classic `/v4/` API — tiles, TileJSON,
  DEM, and satellite alike — returns `403 Forbidden` for every request in this environment, while
  `tokens/v2` confirms the token itself is genuinely valid (`"code":"TokenValid"`) and `styles/v1` (a
  different Mapbox API surface) succeeds normally. This affects the OLD and NEW composite URLs identically
  (both are `/v4/`), so it isn't something this change caused, and it also means the app's own interactive
  map isn't actually rendering vector tiles at all right now in this sandbox (confirmed via a blank
  basemap screenshot) — a more precise, more severe version of the "no network access to Mapbox's satellite
  tile servers" limitation noted in an earlier session, which undersold the scope of what's actually blocked
  (the entire v4 surface, not just satellite). Per explicit user direction after this was surfaced: the
  code change stands as already-verified-correct on its own terms (structural JSON validity + the water-
  depth/hillshade audit above), the live byte-count comparison is accepted as not independently measurable
  here, and the real test for this specific change should be an actual on-device offline-download size
  comparison (before this change vs. after) once it ships — a more meaningful real-world measurement anyway,
  not a synthetic sandbox substitute for it. Zero console errors from the change itself. `node --check`
  confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.34.0 → 2.35.0,
  SHELL_CACHE bumped v140 → v141.
  - Session 32 — root-caused the real-device "no meaningful size difference" report: a real on-device before/
    after test of the bathymetry removal above showed no measurable change, which contradicted Session 31's
    "verified" claim — rightly so, since that claim only ever covered structural correctness (valid JSON,
    water-depth being the sole consumer), never actual transferred bytes, because Mapbox's v4 API was 403'd
    in this sandbox the whole time. This session's mandate was explicit: find a REAL answer backed by
    evidence, not another round of "the code looks correct."
    Re-confirmed fresh, not assumed carried over from Session 31: a direct browser `fetch()` (from inside the
    live page context, not Node — Node's own `fetch()` to this host crashes with a libuv assertion error in
    this environment) against both the OLD and NEW composite tile URLs returned `403 Forbidden`/23 bytes for
    BOTH, identically — confirming again that this sandbox genuinely cannot fetch real Mapbox v4 bytes at all,
    for either URL, and that this blocker is unrelated to which URL is used.
    Given that, the investigation shifted to what CAN be proven from the code with certainty, and found the
    real, airtight cause — not a caching bug, not a stale-service-worker issue, and not disproof that the fix
    reduces real bytes: **the app's own displayed offline-area size was never wired to a real byte count in
    the first place.** `estimateSizeMB()` (index.html) computes `tile_count × DOWNLOAD_LAYERS[layerId].avgKB`
    — a flat, hand-set-once constant (`avgKB:35` for vectorbase) — and this is called and stored as
    `areaEntry.sizeMB` BEFORE `downloadTileList()` ever fetches a single real byte (`startOfflineDownload()`),
    then displayed as-is by both the pre-download size picker and `renderOfflineAreasList()`'s per-area "X MB"
    line for every already-downloaded area. `avgKB` was not (and, without real Mapbox access, could not
    responsibly be) adjusted down when bathymetry-v2 was dropped from the URL — so the number the app shows
    the user is, by construction, bit-for-bit identical before and after this fix for the same bounds/zoom/
    layers, regardless of what actually changed on the wire. This fully explains the observed "no difference"
    as a property of how the app measures/reports size, not evidence the fix itself is ineffective — but it
    also means this UI-displayed number can never be used to verify a fix like this one; only real transferred
    bytes can.
    Also completed, per the task's explicit checklist, using a fresh grep rather than trusting memory:
    - Confirmed there is exactly ONE source of truth for the vectorbase tile URL anywhere in the codebase —
      `computeTileList()` → `tileUrlForLayer()` → `DOWNLOAD_LAYERS.vectorbase.urlTemplate` — with no other
      hardcoded composite-tileset string, cached TileJSON response, or independently-derived URL builder
      found anywhere else in index.html. The only other `api.mapbox.com` references are the unrelated aerial
      style URL, the `refresh-style.js` token-placeholder regexes (comments/string templates, not runtime
      requests), and the separate `mapbox.terrain-rgb` DEM endpoint (own layer, own URL, untouched by this
      change) — none of them independently reference or cache the composite tileset list.
    - Re-read service-worker.js fresh (not from recalled/summarized memory) and confirmed: `TILE_CACHE`
      (service-worker.js) and `TILE_CACHE_NAME` (index.html) are the literal same Cache Storage name
      (`'fieldmap-tiles-v1'`) by design, and the `activate` handler's cache-clearing loop explicitly preserves
      it (`if (key !== SHELL_CACHE && key !== TILE_CACHE && key !== GMU_DATA_CACHE){ delete }`) — so a
      SHELL_CACHE bump genuinely does NOT clear previously-downloaded tiles, confirmed directly in code, not
      inferred. This is intentional, pre-existing behavior (the file's own comment: "keeps existing offline
      tiles intact across app updates"), not a bug. Whether this could explain "no difference" for a
      genuinely NEW url string (as the bathymetry fix produces) was reasoned through and rejected as the
      cause: `fetchAndCacheTile()`'s own `cache.match(url)` check (page-level, i.e. the offline-downloader's
      own per-tile dedup, separate from the service worker's own stale-while-revalidate `cache.match(req)` for
      `api.mapbox.com` requests generally) matches by exact URL string — a genuinely different URL (old
      3-tileset list vs. new 2-tileset list) is a guaranteed cache MISS on first use regardless of any prior
      cached entry under the old URL, forcing a real fetch. The one real caveat flagged, not silently glossed
      over: this reasoning assumes the real device was actually running the POST-fix JS (i.e. a real page
      reload happened between the "before" and "after" test, not just a backgrounded/still-open tab) — an
      already-open tab's in-memory `DOWNLOAD_LAYERS.vectorbase.urlTemplate` value would not update just
      because `skipWaiting()`/`clients.claim()` let a new service worker take over; only an actual navigation/
      reload re-parses the page's own JS. This wasn't confirmable from here (no way to know the real tester's
      exact steps) and is offered as a secondary, plausible contributing factor alongside the primary,
      code-proven `avgKB`-is-static finding above — not as an alternative conclusion to it.
    Added real-bytes instrumentation per the task's request (task item #1), gated OFF by default so a normal
    download's behavior/performance is completely unchanged: `window.FieldMapDebug` (`logTileBytes: false`,
    `tileByteLog: []`, `summarizeTileBytes(layerId)`). `fetchAndCacheTile()` now accepts the tile's `layerId`
    and, only when `window.FieldMapDebug.logTileBytes` is set to `true` first, clones the real network
    response and records its actual `arrayBuffer().byteLength` — real transferred bytes, not the static
    estimate. Usage for a real future on-device test: `window.FieldMapDebug.logTileBytes = true` in the
    console, download a genuinely NOT-already-cached test area (fetchAndCacheTile's own dedup means an
    already-cached tile is skipped before ever reaching the logging fetch — re-downloading the exact same
    already-downloaded area would log nothing new), then `window.FieldMapDebug.summarizeTileBytes('vectorbase')`
    for a real total/average. This could not be exercised end-to-end in this sandbox (same confirmed Mapbox
    v4 403 blocker), but was verified to load correctly with zero console errors and the expected default
    state (`logTileBytes:false`, `summarizeTileBytes` a real function) via a fresh page load through the local
    `python -m http.server`, after unregistering the service worker/clearing Cache Storage first.
    Bottom line reported to the user: the fix itself (dropping bathymetry-v2 from the composite URL) remains
    structurally correct and, absent any evidence to the contrary, should reduce real transferred bytes for
    areas with actual bathymetry data — but the specific "no difference" observation is explained, with code-
    level certainty, by the app's displayed size never having been a real measurement in the first place, not
    by the fix failing to route to real bytes or by a stale cache silently serving old data. Getting a real
    verified byte-count number still requires the new `window.FieldMapDebug` hook run on an actual device with
    working Mapbox access — this remains the one thing that could not be produced from this sandbox.
    `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks and on service-worker.js.
    APP_VERSION bumped 2.35.0 → 2.36.0, SHELL_CACHE bumped v141 → v142.
  - Session 33 — replaced Session 32's per-tile clone+arrayBuffer logging entirely with a true network-level
    total, per explicit follow-up request: that approach only ever saw bytes for tiles `fetchAndCacheTile`
    itself explicitly logged (vectorbase only, and only ones it actually fetched — a cache hit via the
    `existing` early-return was invisible to it), added real per-tile overhead, and had no way to catch
    anything else fetched during the same download window if that ever mattered. `window.FieldMapDebug` now
    exposes `captureRealDownloadTotal(startFn)` (clears `performance.clearResourceTimings()`, calls `startFn`,
    reads back every `performance.getEntriesByType('resource')` entry created during that window with no
    filtering by name, sums `transferSize` — falling back to `encodedBodySize` for cache-served/opaque
    responses where `transferSize` reads 0 — and buckets by URL pattern: vectorbase `.vector.pbf`, DEM
    `terrain-rgb`, glyphs `/fonts/v1/`, sprite `/sprite`, everything else `other/uncategorized` so anything
    genuinely unaccounted-for stays visible rather than silently dropped or misfiled) and
    `triggerTestDownload(swLat, swLng, neLat, neLng, minZ, maxZ, layerIds)` (a non-interactive way to run the
    real `computeTileList()` → `downloadTileList()` → `fetchAndCacheTile()` → `fetch()` path
    `startOfflineDownload()` itself uses, without that function's blocking `prompt()` for the area name, which
    makes an automated/repeated measurement impossible). `fetchAndCacheTile()`'s `layerId` parameter (added in
    Session 32 only to support the now-removed per-tile log) was removed along with it.
    A real bug was caught and fixed only by testing this live, not by reading the code: an initial version of
    `captureRealDownloadTotal` read `performance.getEntriesByType('resource')` immediately after `startFn()`'s
    promise resolved, which — confirmed via a live test against a real (if 403-blocked) Mapbox endpoint, with
    `window.fetch` monkey-patched to independently log every URL actually fetched — under-counted real entries
    (12 of 13 fetch calls captured on one run, 0 of 13 on another with the added monkey-patch hop): Resource
    Timing entries can lag slightly behind the fetch() promise that triggered them, and the gap gets worse the
    more async plumbing sits in front of the response (here, the service worker's own `respondWith()`
    intercepting every `api.mapbox.com` request). Fixed with `waitForResourceBufferToSettle()` — polls the
    entry count every 50ms and only resolves once it's been stable for 3 consecutive checks, rather than
    reading the buffer exactly once. Re-verified after the fix with the same monkey-patched-fetch technique:
    13/13, 8/8 (mixed vectorbase+DEM), and 3/3 (vectorbase + a genuinely uncategorizable local `manifest.json`
    fetch) — fetch-call count exactly matched Resource Timing entry count on every run, category buckets
    always summed exactly to the reported grand total, and the uncategorizable fetch correctly landed in
    `other/uncategorized` (not silently merged into a real category) rather than just showing 0 there by
    coincidence.
    Re-confirmed fresh (not assumed carried over) that this sandbox's Mapbox v4 access is still 403 Forbidden —
    unchanged from every prior session, unrelated to this change. This means the "real bytes" figures captured
    live here (e.g. 299 bytes across 13 vectorbase requests for a small Wasatch-Range-area z12-13 test) reflect
    13 tiny 403 error bodies (~23 bytes each), not real Mapbox tile payloads, and cannot be used to judge
    whether the bathymetry fix reduces real transferred bytes — that comparison genuinely requires a real
    device with working Mapbox access. For the record (mechanism-correctness only, not a real-world number):
    the picker's own static pre-download estimate for that same 13-tile area would be 13 × `avgKB:35` = 455 KB,
    dramatically higher than the "real" 0.3 KB captured — entirely an artifact of the 403 responses' near-empty
    bodies, not evidence about actual tile sizes either direction.
    `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped
    2.36.0 → 2.37.0, SHELL_CACHE bumped v142 → v143.
  - Session 34 — closed the exact gap flagged after Session 33: `captureRealDownloadTotal`/`triggerTestDownload`
    had only ever been verified against a parallel test-only download path, never the real production
    `startOfflineDownload()` (the actual function `offline-download-btn`'s click handler calls). Before this
    session, `startOfflineDownload()` returned nothing — fire-and-forget, ending in a synchronous blocking
    `prompt()` for the area name — so there was no real "download finished" signal an external caller like
    `captureRealDownloadTotal` could await; the only options were guessing via a timeout or driving it through
    a simulated UI click, neither of which is the real signal the task asked for.
    Fixed by making `startOfflineDownload()` itself `return` the real `downloadTileList(...)` promise chain —
    the exact promise that already resolves with `{completed,failed,cancelled}` the moment network tile
    fetching is done — instead of returning nothing. The one real subtlety, reasoned through before writing
    any code: the naming-`prompt()`-and-save logic was already chained via `.then()` directly onto that same
    promise, attached BEFORE the function returns it. Since `prompt()` blocks the entire JS thread
    synchronously, and JS resolves multiple `.then()` handlers on one promise in attachment order, ANY external
    consumer of the returned promise — including `captureRealDownloadTotal`'s own `.then()`, attached after
    `startFn()` already returned — would still be stuck waiting for that FIRST (internal, prompt-containing)
    handler's microtask to finish before it could even start, regardless of returning the promise at all. Fixed
    by deferring the naming/save logic one tick via `setTimeout(fn, 0)` rather than chaining it directly: this
    pushes it to a macrotask that runs strictly after the current microtask queue drains, so the returned
    promise's OTHER consumers (like the debug capture) get to run first, in the same microtask flush as the
    real tile-download completion — invisible to a real end user (the prompt still appears on the very next
    tick, imperceptibly delayed) but exactly what makes the returned promise usable by anything that only cares
    about the actual network transfer. `window.FieldMapDebug._startOfflineDownload = startOfflineDownload;` was
    added right after the function definition (a debug-only raw reference to the real production function, not
    a separate reimplementation) and `captureRealDownloadTotal` got one added diagnostic: if `startFn()` returns
    `undefined` (i.e. one of `startOfflineDownload`'s own early-return guards fired — already downloading, or
    no base layer checked / the offline panel never opened so `offlineCaptureBounds` is unset), it now warns
    explicitly instead of silently reporting a misleading "0 requests, 0 bytes" that could look like a real
    (if empty) measurement. `triggerTestDownload()` (Session 33) was kept as-is, still useful for a fully
    synthetic/no-UI-preconditions test; it is no longer the only path available.
    Verified live via the already-connected Chrome browser extension, driving the REAL production UI end to
    end — not a bypass: searched the app's own coordinate search box to `35.35, -111.70` (San Francisco Peaks
    near Flagstaff, AZ — genuinely mountainous terrain), opened Tools → Download (the real
    `openOfflineModal()`, which sets `offlineCaptureBounds` from the live map viewport — confirmed via the
    panel's own "Area centered near 35.350, -111.700" text and its live "56 tiles · approximately 2 MB"
    estimate), left Topo/vectorbase checked (the default), then ran the EXACT console command from the task —
    `window.FieldMapDebug.captureRealDownloadTotal(window.FieldMapDebug._startOfflineDownload)` — from the
    devtools console (with `window.prompt` overridden to auto-return the default name in this one test tab
    only, so the real deferred dialog never actually blocks the browser automation session — a test-harness
    accommodation, not an app change). Result: 57 requests, 76,010 bytes total, internally consistent (56
    vectorbase + 1 glyphs/fonts + 0 DEM + 0 sprite + 0 other = 57; 1,288 + 74,722 = 76,010) — non-zero and
    driven entirely by the real function, closing the exact gap this session was asked to close. The 56
    vectorbase tile count matches the picker's own live "56 tiles" estimate exactly, confirming
    `offlineCaptureBounds`/`computeTileList` are being read correctly by the real code path. One genuinely
    useful finding this surfaced organically, not searched for: the capture caught a real 74,722-byte
    `/fonts/v1/` glyph request — MapLibre's own lazy glyph loading, unrelated to the offline download's own
    tile list — that a tile-only measurement (Session 32's original approach, or anything scoped to just
    `fetchAndCacheTile`) would have been structurally incapable of seeing at all; concrete evidence the
    network-level, no-filtering-by-name design is doing real work, not just theoretically more thorough. Also
    confirmed the real save flow completes correctly end-to-end despite the restructuring: `field-map-offline-
    areas-v1` in localStorage gained a real entry (`name:"Area near 35.350, -111.700"`, `layerIds:
    ["vectorbase"]`, `sizeMB:1.914...`) shortly after the capture resolved, and `#offline-progress-wrap`
    correctly ended up hidden again — the deferred `setTimeout` path runs to completion exactly as before,
    just no longer blocking an external awaiter. Re-confirmed fresh (not assumed) that the 56 vectorbase
    tile requests still 403 in this sandbox (byte total for that bucket, 1,288, is ~23 bytes/tile — the known
    error-body size) — same blocker as every prior session, unrelated to this fix; a real byte-vs-estimate
    comparison for actual tile content still requires a real device. Zero console errors throughout. `node
    --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.37.0 →
    2.38.0, SHELL_CACHE bumped v143 → v144.
- DOWNLOAD_LAYERS avgKB correction (Session 35): the hand-set-once `avgKB` constants that drive
  `estimateSizeMB()` — and therefore both the pre-download size picker and every saved area's displayed
  size (see the "Bathymetry removal from vectorbase" entry above for why this number was never a real
  measurement to begin with) — were corrected from guesses to real measured averages: multiple real device
  tests, cache-cleared and network-verified via Chrome DevTools, across 2 different geographic areas.
  `vectorbase` 35→10 (measured 8.33-9.97 KB/tile), `satellite` 45→23 (measured 22.75 KB/tile), `usgstopo`
  18→16 (measured 15.59 KB/tile, a small correction — it was already close), `dem` 22→85 (measured 75.3-97.4
  KB/tile — the most consequential fix, and the only one previously underestimated in the OPPOSITE direction
  from the others, which is why DEM-inclusive combos had sometimes exceeded their own pre-download estimate
  rather than coming in under it like every other combo), `publicland` 9→2 (measured 1.93 KB/tile).
  `snowdepth`/`nlcd` were deliberately left untouched — not remeasured this round, no data to justify
  changing them either direction.
  DEM's real cost is meaningfully terrain-dependent — rougher terrain measured ~30% higher than gentler
  terrain in this same data — so 85 is a reasonable single average across the 2 measured areas, not a
  precise per-area figure; a future terrain-aware estimate (e.g. keyed off elevation variance in the
  captured bounds) could sharpen this further if precision ever matters enough to justify the complexity,
  but isn't built now.
  Verified live via the already-connected Chrome browser extension against a local `python -m http.server`,
  driving the real offline-download picker UI (not a synthetic check) for a mountainous AZ area (San
  Francisco Peaks near Flagstaff, centered 35.350, -111.700) sized to land in the same few-hundred-tile range
  as the task's own reference test: Topo alone (570 tiles) → 6 MB (previously would have been ~19.5 MB at
  the old avgKB:35, matching the task's "not 24 MB" direction and roughly the "7-12 MB" new-target band, just
  under it since this session's test area isn't byte-identical to the original real-device one); Topo + DEM
  (724 tiles, 154 of them DEM's own — DEM's `maxNativeZoom:14` vs. vectorbase's 16 means it contributes
  fewer unique tiles per area than vectorbase does) → 18 MB (was ~22.8 MB old, target band "20-25 MB");
  USGS Topo + DEM + Public/private land (878 tiles) → 22 MB (target band "25-27 MB, not 19 MB" — the one
  combo previously UNDERestimated, now correctly shifted upward since DEM dominates its tile mix). All three
  landed close to, though slightly below, the task's stated target bands — expected and reasonable given
  this session's test area (picked to match the task's implied tile-count scale, ~570-880 tiles depending on
  layer) isn't the identical area the original real-device measurements used; what matters and what's
  confirmed is the correct DIRECTION and MAGNITUDE of the shift for all three combos: Topo-alone dropped
  ~3.5x as expected from 35→10, and both DEM-inclusive combos shifted substantially upward as expected from
  22→85, exactly reversing the old under/over-estimate pattern the task described. `node --check` confirmed
  clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.38.0 → 2.39.0, SHELL_CACHE
  bumped v144 → v145.
- Session 36 bug batch — 4 small, unrelated fixes in one pass:
  - Bulk-edit delete/edit for Bearings, Range Rings, Buffers: `bulkSelMapForType(type)` (index.html, near the
    other bulk-edit state) is now the single place that routes an item type to its own selection map —
    `bulkSelectedPins`/`bulkSelectedTracks`/`bulkSelectedPolygons`/`bulkSelectedBearings`/
    `bulkSelectedRangeRings`/`bulkSelectedBuffers`. Previously a 3-way ternary (`pin ? ... : track ? ... :
    bulkSelectedPolygons`) treated ANY non-pin/non-track type as a polygon — a leftover from before bearing/
    rangering/buffer existed. Both `confirmBulkDelete()` and `applyBulkEdit()` now handle all 6 types
    explicitly (filter own state array + `recordTombstone` + own `removeXFromMap` for delete; `.find()` on
    own state array + own `refreshXMap` for edit), and `totalBulkSelectedCount()` replaces 4 separate
    repeated `Object.keys(...).length + ...` sums (the bulk bar count, the bulk-modal title, the bulk-delete
    button's own count, and the delete-confirmation dialog's count) that had all silently under-counted the
    same way.
  - Layers panel section count badges (`.layer-section-count`, right-justified via the existing
    `.layer-section-title{flex:1}` absorbing remaining space): `LAYER_SECTION_TOGGLE_IDS` maps each of the 4
    non-base sections to its own top-level toggle checkbox ids, and `updateLayerSectionCounts()` reads
    `.checked` across just those ids. Wired via one delegated `change` listener on `#layers-panel` itself
    (catches all current and future checkboxes with no per-checkbox listener, and naturally excludes
    Wildlife's species/type sub-toggles since those live in the separate `#wildlife-panel`) plus a call at
    both boot (`initLayerSections()`) and every time the panel is actually opened (covers any checkbox whose
    `.checked` was set programmatically elsewhere, which wouldn't fire a `change` event).
  - Export vs. Download icons (Tools sheet): were the same "arrow + tray" glyph at slightly different
    coordinates. Export's polyline/line now point up-and-out instead of down-and-in — a mirror of Download's
    icon, matching the universally-recognized upload/download arrow-direction pairing rather than inventing
    an unrelated glyph.
  - Offline area base-layer mislabeling: `area.layerIds` (e.g. `['vectorbase']`) is the DEDUPED SOURCE id
    list computeTileList/redownload/delete actually need — it can't distinguish which of Topo/Topo Dark/
    Aerial+Topo (all `vectorbase`) or Aerial/Aerial+Topo (both `satellite`) checkbox was actually ticked,
    which is why `DOWNLOAD_LAYERS[id].label` was always the shared-group description. Fixed by capturing
    `selectedOfflineBaseLayerIds()` — the real checkbox ids, e.g. `['topo-dark']` — into a new
    `areaEntry.baseLayerIds` field at download time (in `startOfflineDownload()`, read before the deferred
    save so it reflects what was actually checked at click-time, not whatever the panel shows later).
    `renderOfflineAreasList()` uses `baseLayerIds` (resolved via `BASE_LAYER_DOWNLOAD_LABELS`) for the
    base-layer portion of the label when present, falling back to the old group-label behavior for areas
    saved before this field existed (no way to know retroactively which checkbox produced them).
  Verified live via the already-connected Chrome browser extension against a local `python -m http.server`:
  created a real bearing/range-ring/buffer through the actual creation UI, bulk-selected and deleted all 3,
  and confirmed via `localStorage` (not just the UI list disappearing) that `state.bearings`/`.rangeRings`/
  `.buffers` all emptied and exactly 3 tombstones were recorded. Layer section badges confirmed reading
  "0/3"/"0/3"/"0/2"/"0/2" fresh and updating live to "2/3" after checking two toggles. Export/Download icons
  confirmed visually distinct. Downloaded a real area with "Topo Dark" specifically selected and confirmed
  both in `localStorage` (`baseLayerIds:["topo-dark"]`) and in the live saved-areas list, which now reads
  "Topo Dark" instead of the old ambiguous "Topo map data (Topo / Topo Dark / Aerial + Topo)" label. One
  real testing gotcha, not an app bug: triggering the download without first overriding `window.prompt` let
  the real native dialog (from Session 34's deferred-save `setTimeout`) block the CDP automation channel —
  the same class of limitation already documented in this file for `confirm()` dialogs — resolved by
  redoing the test in a fresh tab with `window.prompt` overridden first. `node --check` confirmed clean
  syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.39.0 → 2.39.1, SHELL_CACHE bumped
  v145 → v146.
- Shared GPS watcher + restored long-press-to-copy coordinates (Session 37): the locate button, Compass, and
  the coords/elevation readout's map-center/current-location toggle each used to run a fully independent
  `navigator.geolocation.watchPosition()` — a deliberate "each GPS-consuming feature gets its own watch"
  pattern going back to when the toggle was first built (see that entry's own original comment, now
  rewritten). `subscribeSharedGps(onPosition, onError)`/`unsubscribeSharedGps(id)` (defined just above
  `toggleCenterReadoutMode`, the earliest of the 3 consumers in file order) consolidate this into ONE real
  `watchPosition` call, reference-counted: the real device watch starts on the first subscriber and stops
  only once the last one unsubscribes, fanning every position update out to however many consumers are
  currently subscribed. This is deliberately just a transport change — each consumer keeps its own state
  (`lastGpsLatLng`/`currentGpsLatLng`/`centerReadoutGpsLatLng`), its own on/off triggers, and its own error
  handling exactly as before; only the literal `watchPosition()`/`clearWatch()` calls were swapped for
  `subscribeSharedGps`/`unsubscribeSharedGps` in `_gpsDotInit`/`_gpsDotTurnOff` (locate button),
  `openCompassPanel`/`closeCompassPanel` (Compass), and `toggleCenterReadoutMode` (coords/elevation toggle).
  One real, flagged option-harmonization: the 3 original watches used a mix of options (locate button and
  the coords toggle both passed `{enableHighAccuracy:true, maximumAge:3000}`; Compass passed just
  `{enableHighAccuracy:true}`, i.e. `maximumAge` defaulting to 0) — the single shared watch necessarily uses
  ONE options object (`{enableHighAccuracy:true, maximumAge:3000}`, matching 2 of the 3 already), which only
  affects whether an already-cached position fix up to 3s old may satisfy a call immediately, not the
  ongoing update cadence a real GPS receiver delivers while being watched — not expected to be
  user-perceptible for Compass either, but noted rather than silently glossed over.
  (Found and deliberately left untouched, out of scope: `gpsFollowWatchId`/`toggleGpsFollow()` — a 4th,
  fully separate GPS-watching mechanism tied to the Settings panel's "GPS follow" checkbox — is genuinely
  dead code, confirmed via a full-file grep: `toggleGpsFollow()` is defined but never called from anywhere,
  the checkbox's own real change listener just sets `state.settings.gpsFollow` directly with no other effect,
  and the function's own body calls `map.setView(...)`, a Leaflet-only method that doesn't exist on a
  MapLibre `Map` instance and would throw if ever actually invoked — a pre-MapLibre-migration leftover, not
  one of this task's 3 named consumers, not touched.)
  Long-press-to-copy (`attachLongPress`, generic — no long-press gesture existed anywhere else in this file
  before, confirmed via a repo-wide grep for "longpress"/"long-press" — and `copyCurrentReadoutCoords`, both defined
  alongside the shared GPS watcher) restores the coords chip's pre-toggle tap-to-copy gesture, which the
  map-center/current-location toggle displaced entirely when it shipped (single tap can't drive both a
  toggle and a copy). `copyCoordsText(text)` — the clipboard-with-`execCommand`-fallback-and-toast helper —
  is restored verbatim from the pre-toggle implementation (recovered via `git log -S` against the commit
  that deleted it), not rewritten. `copyCurrentReadoutCoords()` copies whichever coordinates are CURRENTLY
  DISPLAYED (map-center or current-GPS-location, mirroring `updateCenterReadout()`'s own mode check) at full
  6-decimal precision, matching the original tap-to-copy's own "always precise enough to paste elsewhere,
  regardless of the chip's 3-decimal display truncation" behavior. `attachLongPress(el, onLongPress, ms)`
  fires after `ms` of a held pointer (450ms here) with a 10px movement-cancels-it tolerance (so a scroll/
  drag through the chip doesn't also register as a long-press), and suppresses the native 'click' that still
  fires when the pointer is released after a long hold (a completed press-release cycle fires 'click'
  regardless of duration) via `stopImmediatePropagation()` — this relies on `attachLongPress` being called
  BEFORE the chip's own plain `click`→`toggleCenterReadoutMode` listener is registered on the same element,
  since same-element listeners fire in registration order regardless of capture; both call sites were
  ordered accordingly. `-webkit-touch-callout:none`/`user-select:none` added to both
  `#center-readout-float`/`#center-readout-mobile` so a real held-touch doesn't first show the OS's own
  text-selection/callout UI over the chip.
  One premise in the original task request didn't match the actual code, surfaced rather than silently
  built on top of: it described the locate button and Compass as "already sharing" a GPS watcher before this
  change, but they were always two of the three fully independent watches (confirmed via grep and via this
  file's own prior session history, which explicitly documents that separation as deliberate) — the actual
  work here is a 3-way (or 4-way, counting the dead `gpsFollowWatchId`) consolidation down to one, not a
  2-way-already-shared-plus-a-3rd. Likewise, "the tap-anywhere long-press" the task asked to confirm no
  conflict with doesn't exist — tap-anywhere is a plain `click` handler, not a long-press gesture, confirmed
  via the same repo-wide long-press grep that found nothing anywhere in the file before this session; there
  is nothing for the new gesture to have conflicted with.
  Verified live via the already-connected Chrome browser extension against a local `python -m http.server`,
  with `navigator.geolocation.watchPosition`/`clearWatch` monkey-patched to count real calls (this sandbox
  has no real device GPS) and one real injected position fix. Activating all 3 consumers in sequence via the
  real UI (locate button → Compass → coords chip toggle) held `watchCalls` at exactly 1 throughout — no
  second or third real watch ever started. Injecting one position through the single registered callback
  updated all 3 surfaces correctly and independently: the coords chip showed the injected lat/lng/altitude,
  Compass's status line switched to its GPS-available text and drew its north/facing lines from that same
  point, and the locate button's own follow-mode re-centered the map there. Unsubscribing one consumer at a
  time (Compass close → coords toggle off → locate button off) kept `clearCalls` at 0 until the very last
  one, at which point it became exactly 1 — confirming the reference-counted start-on-first/stop-on-last
  lifecycle precisely, not just "eventually cleans up." Re-activating afterward correctly started a genuinely
  new watch (`watchCalls` → 2). Long-press verified via synthetic `PointerEvent`s (no real touch hardware in
  this sandbox): a 600ms held press correctly copied the full-precision currently-displayed coordinates
  (confirmed via a monkey-patched `navigator.clipboard.writeText`) AND left `centerReadoutMode` unchanged —
  the trailing click's toggle was genuinely suppressed, not just coincidentally not observed; a 120ms short
  press correctly toggled the mode with zero clipboard calls, confirming the normal tap gesture is completely
  unaffected; and a held-then-moved-40px pointer correctly triggered neither the copy nor a stray toggle,
  confirming the movement-cancels-the-timer logic. Zero console errors throughout. `node --check` confirmed
  clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.39.1 → 2.40.0 (minor — a
  restored feature, not just a bug fix), SHELL_CACHE bumped v146 → v147.
- Slope Angle, Custom Elevation Range, and Aspect overlays (Session 38, Aspect added Session 40) — three new
  Environmental-section layers, all pure client-side derivatives of the exact same terrain-rgb DEM bytes
  `fetchDemTileImageData()` already fetches/caches (`demTileCache`) for elevation lookups/track profiles —
  no new network requests, no DOWNLOAD_LAYERS entry, no offline-download size impact.
  - **Rendering mechanism**: none of the three overlays is a hand-rolled canvas/image source — all are
    ordinary `type:'raster'` MapLibre sources (`slopeangle-source`/`elevrange-source`/`aspect-source`, added
    in `reinitializeLayers()` with the same idempotent `!map.getSource()/!map.getLayer()` guard every other
    raster overlay here uses) whose `tiles` template points at a custom scheme (`slopeangle://{z}/{x}/{y}`,
    `elevrange://{z}/{x}/{y}?min=X&max=Y`, `aspect://{z}/{x}/{y}`) registered once via `maplibregl.addProtocol` in
    `registerTerrainOverlayProtocols()` (called once from `createMap()`, not per style-switch — addProtocol
    is a global maplibregl-level registration independent of any one map instance). This was the deliberate
    choice over inventing a per-tile `type:'image'` source add/remove/pan-tracking scheme from scratch: it
    reuses MapLibre's own native tile loading/caching/pan/zoom/prefetch machinery for free, and lets the
    zoom cap (`maxzoom:14`) work via the exact same "over-zoom/upscale the last native tile past its cap"
    behavior Public Land/DEM already rely on — confirmed live (see Verification below), not just assumed.
  - **Compute pipeline**: each protocol handler parses z/x/y (and min/max, for elevrange) from the tile URL,
    calls `fetchDemTileImageData(z,x,y)` for that tile's raw terrain-rgb `ImageData` (the SAME shared,
    cached object every other DEM consumer uses — its underlying buffer is never transferred directly to
    the worker, since transferring would detach and corrupt that shared cache; `computeTerrainOverlayTile()`
    always copies the bytes first), posts a copy to `terrain-overlay-worker.js` (a new same-origin file,
    added to `service-worker.js`'s `SHELL_FILES` and `SHELL_CACHE` bumped, matching this app's existing
    "every same-origin script dependency must be durably precached, not left to the browser's own
    opportunistic HTTP cache" rule — see that file's own `maplibre-gl.js` SHELL_FILES comment for the
    original iOS-cold-boot-offline failure this pattern already fixed once), and on the worker's response
    encodes the returned RGBA bytes to a real PNG (`canvas.putImageData` + `toBlob('image/png')` +
    `blob.arrayBuffer()`) and hands that ArrayBuffer to MapLibre's `callback(null, data)` — exactly the
    shape a real network tile fetch would return (confirmed via reading the vendored MapLibre v3.6.2 bundle's
    own request-dispatch code, not guessed: a custom-protocol handler receives `(params, callback)` and
    `params.type` is `'image'` for a raster tile, whose bytes get decoded downstream the same way regardless
    of whether they came from `fetch()` or a registered protocol). One shared Worker instance
    (`getTerrainOverlayWorker()`, lazily created) serves all three overlays; a small pending-request map
    (`terrainOverlayPending`, keyed by an incrementing id) correlates each worker response back to the
    right in-flight tile request, since multiple tiles are typically being computed concurrently.
  - **Slope Angle math**: standard 8-neighbor (Horn's method) gradient — the same weighted 3x3 kernel
    ArcGIS/QGIS's own "Slope" tool uses — computed in real meters via `metersPerPixelAtZoom(z, latDeg)`
    (the standard Web Mercator ground-resolution formula, evaluated at each tile's own center latitude via
    `tileCenterLat()`, the inverse of `lngLatToTilePixel`'s own projection math) so the resulting angle is a
    real degree value, not a raw-pixel-unit artifact. 6 bands: green 20-25°, yellow 25-30°, orange 30-35°,
    red 35-40°, purple 40-45°, blue 45°+; under 20° stays fully transparent (alpha 0). Edge pixels (tile
    boundary) clamp to the nearest real pixel rather than fetching neighboring tiles for a true halo — a
    deliberate simplification (fetching 8 extra neighbor tiles per tile was judged not worth the complexity)
    that only affects the outermost 1px ring of each 256x256 tile, negligible at the zoom levels this
    renders at; confirmed visually as a very faint tile-seam line in testing, not a functional problem.
    Colors were deliberately chosen as saturated, high-contrast Material-Design-600-family shades distinct
    from every other color-coded layer already in this app (Winter Range's muted lavender `#CECBF6`/
    `#534AB7`, Corridor's pastel amber-to-coral gradient, Stopover's pink `#D4537E`, Annual Range's teal
    `#BCE8E1`/`#1D7A68`, Habitat's coral/blue `#c2622d`/`#3a8fd4`) — the general color FAMILY names (purple/
    orange/blue) unavoidably overlap since the task explicitly specified them, but the specific shades and
    much higher saturation keep overlapping regions visually distinguishable in practice.
  - **Custom Elevation Range math**: solid cyan fill (`#00D9E8`) for every pixel whose decoded elevation
    (rounded to the nearest foot before comparing — see the floating-point note below) falls in
    `[minFt,maxFt]`, deeper cyan (`#0A7A85`) on the specific pixels where the band's own boundary falls
    (detected via 4-neighbor in/out-of-range comparison, not a fixed pixel-distance-from-edge heuristic —
    stays accurate regardless of local terrain steepness, and correctly avoids a false edge line at a tile
    seam when the highlighted band continues into a neighboring tile, since `clampIdx` replicates the edge
    pixel rather than treating "off this tile" as "out of range"). A hard-edged fill with a highlighted
    boundary line was chosen over a soft alpha gradient at the transition (explicitly left to judgment by
    the task) — it reads more like a legible contour-interval band, the established convention for
    elevation-band overlays, and needs no alpha-blending pass. min/max are baked into the tile URL itself
    (`?min=X&max=Y`), not read from `state.settings` at compute time, specifically so changing them calls
    `map.getSource('elevrange-source').setTiles([...new template...])` (confirmed present in the vendored
    MapLibre v3.6.2 bundle before relying on it) — a genuinely different tile URL, which MapLibre's own tile
    cache correctly treats as needing a fresh fetch/compute rather than reusing a stale tile from the
    previous min/max.
  - **A real bug found and fixed via a standalone Node test, not live testing**: IEEE 754 floating-point
    drift through the encode→decode→meters-to-feet chain could put a genuinely-exact boundary elevation
    (e.g. a pixel encoded as precisely 2000ft) on the WRONG side of a `ft <= maxFt` check (decoding back as
    `2000.0000000000011`), confirmed with a deliberately exact-2000ft synthetic test pixel. Fixed by
    rounding to the nearest foot before the range comparison in `computeElevRange` — matching
    `decodeTerrainRgbElevationFt()` in index.html, which already rounds for exactly this reason.
  - **No new abstraction for opacity**: every "in-band" pixel is written fully opaque (alpha 255) by the
    worker; the user's opacity slider is applied afterward via each layer's own `raster-opacity` paint
    property — the same mechanism every other raster overlay here already uses (Snow Depth/NLCD/Public
    Land) — so opacity changes are instant with zero recomputation, never re-triggering the worker.
  - **Elevation Range's on/off-not-persisted requirement**: `elevRangeOn` IS written to `state.settings` live
    during a session (`setElevRangeOn`, matching every other `setXOn` function's shape) but is deliberately
    the one persisted-layer setting whose boot-restore code (in `bindUI()`, before the map/style loads)
    hardcodes it back to `false` unconditionally — both the checkbox's `.checked` AND
    `state.settings.elevRangeOn` itself are force-reset there, since `reinitializeLayers()` (called later,
    once the style actually loads) reads `state.settings.elevRangeOn` directly for the layer's initial
    visibility, not the checkbox — missing either half would have left the layer silently re-enabled despite
    the checkbox reading unchecked. `elevRangeMinFt`/`MaxFt`/`Opacity` are NOT special-cased and persist
    normally, matching "last-used values persist, but you must explicitly turn it back on each session."
  - **Min/max UI**: paired slider + number input for each of min/max (`elevrange-min-slider`/`-min-num`,
    same for max), synced both directions, with a live clamp (min can never exceed max and vice versa — the
    side NOT being actively edited moves to match, so the band can never invert). The actual tile recompute
    (`setElevRangeMinMax`, which calls `.setTiles()` and triggers real worker work per visible tile) is
    debounced 150ms; the displayed numbers/slider positions update instantly on every input regardless. The
    two input TYPES are deliberately wired to different events: sliders use `'input'` (live, since a drag is
    one continuous gesture worth immediate feedback), number inputs use `'change'` (fires on blur/Enter, not
    per keystroke — typing "6000" passes through "6", "60", "600" as genuinely nonsensical intermediate
    values that shouldn't each trigger a real recompute).
  - **Legend**: Slope Angle's floating color-band legend (`#slope-legend`, `loadSlopeLegend()`) copies
    Public Land's existing `#publicland-legend`/`loadPublicLandLegend()` pattern verbatim (build-once,
    toggle-visibility-with-the-layer), and is hidden on mobile the same way Public Land's already is (its
    own info popover, reachable via the `?` button, carries the same 6-swatch key for mobile). Elevation
    Range has no floating legend — it's a single user-chosen color, not a multi-band scale, and the task
    didn't ask for one. Desktop positioning was corrected in Session 39 — see that entry for the fix; this
    entry's original "anchored bottom-left" description is superseded.
  - **Offline availability graying**: added to the existing `OVERLAY_OFFLINE_TOGGLE_SOURCE` table (which
    grays a Layers-panel toggle while offline if no downloaded area covers the current viewport for its
    underlying source) mapped to `'dem'` — extending, not duplicating, the existing mechanism: DEM itself
    has no toggle of its own to gray (per that table's original comment), but these two DO have real toggles
    and ARE entirely DEM-derived, so whether they'll actually render offline correctly depends on whether
    DEM tiles for this viewport were downloaded.
  - **Verification**: real Mapbox v4 DEM access is confirmed blocked in this sandbox (same blocker
    documented in every prior session touching DEM/vectorbase), so real terrain-rgb bytes couldn't be
    fetched here. Verified instead in two complementary ways. (1) A standalone Node test
    (`test_terrain_worker_math.js`) evaluated the worker's actual compute functions against synthetic,
    known-value elevation grids — a perfectly flat tile produces fully transparent slope output; a
    constructed linear ramp at 7 specific known angles (10°, 22°, 27°, 32°, 37°, 42°, 50°) produces exactly
    the expected transparent/green/yellow/orange/red/purple/blue result for each; a constructed elevation
    gradient with an exact min/max band produces correct transparent-outside/cyan-fill-inside/deeper-cyan-
    edge results including at the exact boundary values (this is what caught the floating-point rounding
    bug above) and confirms no false edge line appears at a tile's own seam for a uniformly in-range tile —
    14/14 assertions passing. (2) Live in a real browser (already-connected Chrome extension, local `python
    -m http.server`): patched `HTMLImageElement.prototype.src`'s setter globally to redirect any
    `terrain-rgb`-containing URL to a locally-generated synthetic PNG data URL (a diagonal 0-8000ft
    elevation gradient, terrain-rgb-encoded) — this exercises the REAL, unmodified protocol handler → real
    Worker → real canvas PNG encode → real MapLibre tile decode/render pipeline with only the underlying
    network image swapped out, not a mocked/bypassed code path. Confirmed live: Elevation Range (min 3000ft/
    max 5000ft) rendered a correct diagonal cyan band with a clearly visible darker-cyan edge line exactly
    matching the synthetic gradient; Slope Angle rendered solid green (20-25°) at Z13 and solid purple
    (40-45°) at Z14 for the same gradient, consistent with the real metersPerPixel shrinking as zoom
    increases (steeper apparent angle for the same fixed per-pixel elevation rise); zooming from Z14 to Z15
    (past `maxzoom:14`) left the rendered tile visually identical (same purple, just upscaled) with zero new
    DEM fetch attempts logged, confirming the zoom cap. The Environmental section's badge correctly read
    "0/5" fresh and "2/5" with both layers on (Session 36's count mechanism, extended). The offline-download
    modal's "Additional data" checklist was confirmed to show only the pre-existing 4 entries (Elevation
    (DEM)/Snow depth/Land cover (NLCD)/Public-private land) — Slope Angle and Elevation Range appear nowhere
    in it, and its size estimate was unaffected by either being active in the Layers panel. The
    elevRangeOn-never-restored requirement was verified precisely: set `elevRangeOn:true` in localStorage
    deliberately, reloaded, and confirmed the checkbox came back unchecked and the layer stayed hidden
    despite the persisted `true` — while `elevRangeMinFt`/`MaxFt` (3000/5000, set earlier in the same test)
    and Slope Angle's own on/off state correctly DID survive the same reload, confirming the two layers'
    deliberately different persistence behavior. Zero console errors throughout, including with the
    underlying DEM fetch genuinely failing (before the synthetic-data patch was applied), confirming the
    error path degrades gracefully with no uncaught exceptions or console noise. Main-thread responsiveness
    during worker computation was not measured with a profiler (architecturally guaranteed by using a real
    Worker, and the map stayed visually responsive to pan/zoom throughout testing, but this is not a
    rigorous frame-timing measurement) — flagged rather than silently claimed as fully proven. `node --check`
    confirmed clean syntax on all 4 extracted inline `<script>` blocks, `terrain-overlay-worker.js`, and
    `service-worker.js`. APP_VERSION bumped 2.40.0 → 2.41.0, SHELL_CACHE bumped v147 → v148.
  - Session 39 — fixed Slope Angle's legend overlapping the sidebar on desktop. Root cause: `#slope-legend`
    is a body-level sibling of `<main id="map">`, not a child of it (same as `#publicland-legend`,
    `#map-controls`, etc.) — its Session 38 CSS (`left:14px`) positioned it 14px from the WHOLE BROWSER
    WINDOW's left edge, which sits inside the sidebar's own column (`--sidebar-width`, 330px) rather than
    at the actual left edge of the map area, which only starts after the sidebar. Fixed by centering it
    within the map viewport specifically: `left:calc(var(--sidebar-width) + (100vw - var(--sidebar-width))
    / 2)` computes the map area's own horizontal midpoint (sidebar's right edge plus half of whatever's
    left), and `transform:translateX(-50%)` shifts the box left by half its own (unknown, content-driven)
    width to actually center on that point — the same `--sidebar-width`-aware `calc()` technique
    `#view-drawer`'s own `max-width` already relies on for an equivalent problem. `max-width` was updated
    the same way (`100vw - var(--sidebar-width) - 28px`, not the old `100vw - 28px`) so the box can't grow
    wide enough to spill back past the sidebar boundary even with more chips than fit today. Mobile
    untouched — the existing `@media (max-width:760px) #slope-legend{display:none !important;}` rule
    already hides it there regardless of these values, confirmed still true at a genuine 386px width via a
    real same-origin `<iframe>` (not a hand-retyped CSS override), matching this codebase's own established
    mobile-verification convention. Flagged, not silently fixed: `#publicland-legend` almost certainly has
    the identical latent bug (same body-level-sibling-plus-`left:50%`-across-the-whole-window pattern), but
    the task named only Slope Angle's legend, so Public Land's was left untouched — worth a follow-up if
    ever reported. Verified live via the already-connected Chrome browser extension against a local `python
    -m http.server`: measured `#slope-legend`'s and `#sidebar`'s real `getBoundingClientRect()`s and
    confirmed the legend's center lands exactly on the map area's own midpoint (0px error) with zero
    overlap with the sidebar. Zero console errors. `node --check` confirmed clean syntax on all 4 extracted
    inline `<script>` blocks. APP_VERSION bumped 2.41.0 → 2.41.1, SHELL_CACHE bumped v148 → v149.
  - Session 40 — added Aspect, a third Environmental-section overlay reusing Slope Angle's own gradient
    computation rather than reimplementing it: `terrain-overlay-worker.js`'s `computeSlope` was refactored to
    extract a shared `gradientAt(demBytes,width,height,x,y,metersPerPixel)` helper (the same Horn's-method
    8-neighbor `dzdx`/`dzdy` calculation, previously computed inline and only ever reduced to its magnitude)
    that both `computeSlope` and the new `computeAspect` now call — `computeAspect` keeps the direction
    component Slope Angle discards. Registered as a fourth `maplibregl.addProtocol` scheme (`aspect://`,
    no query params — aspect coloring is a fixed function of direction, unlike Elevation Range's user-chosen
    min/max) feeding an `aspect-source`/`aspect-raster` MapLibre raster layer, same idempotent-add pattern,
    same shared Worker instance, same zoom cap (14).
    - Bearing math: the descent-direction compass bearing is `(atan2(-dzdx, dzdy) * 180/pi + 360) % 360` —
      derived from first principles (image-space x+ = east, y+ = south; descent direction in an
      (east, north) basis is `(-dzdx, dzdy)`; `atan2(east, north)` is the standard clockwise-from-north
      compass convention) and verified against 5 constructed directional test cases (N/E/S/W-facing plus a
      diagonal SE blend) in the same standalone-Node-test pattern as Session 38's slope/elevation-range math
      — all passing within 5-degree hue tolerance, including the task's own explicit correctness demand: a
      synthetic slope with elevation rising due north (i.e. facing south) reads hue ~20 (red-orange, warm),
      not blue, and vice versa for a north-facing slope.
    - Color wheel: `ASPECT_HUE_ANCHORS` (N=0deg hue220 blue, E=90deg hue70 yellow-green, S=180deg hue20
      red-orange, W=270deg hue290 purple, wrapping back to hue220 at 360deg) with `hueForBearing()` doing
      shortest-circular-path linear interpolation between bracketing anchors — NE/SE/SW/NW render as genuine
      blended intermediate hues, not discrete buckets, confirmed via the SE test case landing almost exactly
      on the E/S midpoint hue (45deg). `hslToRgb()` is a hand-rolled standard HSL-to-RGB conversion (no
      browser color API exists inside a Worker context). `ASPECT_MIN_SLOPE_DEG = 3` — deliberately much lower
      than Slope Angle's 20-degree hazard-terrain threshold, since aspect/sun-exposure is a meaningful read
      on gentle terrain too, per the task's own framing (thermal cover, snowmelt timing); flat ground (below
      3 degrees) renders fully transparent, avoiding noisy/meaningless aspect on genuinely flat terrain.
    - Mutual exclusion with Slope Angle: `setSlopeAngleOn(on)` and `setAspectOn(on)` each check whether the
      OTHER layer is currently on before turning themselves on, and if so, call the other's setter with
      `false`, uncheck its checkbox, `showToast()` a one-line explanation ("Turned off Aspect — Slope Angle
      and Aspect can't both be on at once", 3500ms), and explicitly call `scheduleSave()` (needed since this
      is a programmatic settings change with no real DOM 'change' event of its own to trigger the normal save
      path). No infinite-recursion risk — the recursive call always passes `on=false`, whose own guard
      condition is false. This was a deliberate design response to both new layers being full terrain-pixel
      color washes over the same surface (unlike Elevation Range, a narrow highlighted band that coexists
      fine with either) — confirmed via live interaction, not just built and assumed correct, that toggling
      one off with an explanatory toast reads as an intentional, well-explained constraint rather than a bug;
      not flagged as feeling wrong in practice.
    - Persistence — a deliberate interpretation of ambiguous task wording: the task's own phrasing asked for
      "the same persistence pattern" as Slope Angle, then immediately qualified that with a parenthetical
      describing Elevation Range's actual behavior instead ("on/off state resets to off at each launch,
      opacity persists") — those two are NOT the same pattern (Slope Angle's own on/off state DOES persist
      normally). Resolved by following the more specific, literal parenthetical: `aspectOn` gets the exact
      same treatment as `elevRangeOn` (no `loadState()` fixup line; force-reset to `false` in both
      `state.settings` and the checkbox in the boot-restore block, immediately after `elevRangeOn`'s own
      identical block) rather than Slope Angle's persist-on-boot pattern; `aspectOpacity` persists normally
      via the standard default+fixup pattern, same as `elevRangeOpacity`/`slopeAngleOpacity`. This also has a
      structural benefit called out in code comments at every relevant site: since `aspectOn` and
      `slopeAngleOn` are mutually exclusive by design, always-false-at-boot for `aspectOn` guarantees the two
      can never already both be `true` when `reinitializeLayers()` runs on initial page load, with no extra
      defensive logic needed there.
    - Legend: a compass-wheel (`#aspect-legend`/`.aspect-legend-wheel`), not a linear band list like Slope
      Angle's — a CSS `conic-gradient(from 0deg, ...)` (whose default start point/direction, 12 o'clock
      proceeding clockwise, already matches standard compass-bearing convention exactly) with 37 stops (every
      10 degrees, computed via a main-thread mirror of the worker's own `hueForBearing()` math) rather than
      just the 4 cardinal colors — `conic-gradient` interpolates between adjacent stops in RGB space, so
      enough closely-spaced stops are needed to visually approximate the worker's true HSL-space hue sweep; 4
      stops alone would have produced a visibly muddier/grayer transition than the worker's actual output.
      Positioned using the exact `--sidebar-width`-aware `calc()`/`transform:translateX(-50%)` centering
      technique from this same session's own Session 39 fix, applied fresh rather than copy-pasted wrong —
      confirmed via the identical `getBoundingClientRect()` methodology (0px centering error against the real
      map viewport, not the whole window).
    - Verification: extended the same standalone Node test file from Session 38
      (`test_terrain_worker_math.js`) with Aspect-specific cases — 5 directional bearing/hue assertions (see
      Bearing math above), a flat-tile-produces-fully-transparent regression, and a below-ASPECT_MIN_SLOPE_DEG
      transparency check — all passing, plus re-ran every Session 38 slope/elevation-range assertion
      unchanged to confirm the `gradientAt` extraction didn't regress either (14/14 total). Live in a real
      browser (already-connected Chrome extension, local `python -m http.server`, guest sign-in — real Mapbox
      v4 DEM access remains blocked in this sandbox, same standing limitation as every prior session touching
      DEM): confirmed the Environmental section badge read "0/6" fresh (was "0/5" before this session) and
      correctly counted whichever ONE of Slope Angle/Aspect was on, never both; confirmed the Aspect toggle
      renders its compass-wheel legend with the exact specified color mapping (zoomed screenshot: blue at N,
      yellow-green at E, red-orange at S, purple at W, smooth blended intermediate hues at NE/SE/SW/NW);
      confirmed the legend's `getBoundingClientRect()` centers with 0px error on the real map viewport's own
      midpoint, matching Session 39's fix exactly; confirmed turning Slope Angle on while Aspect was active
      correctly turned Aspect off (checkbox, layer visibility, and legend all updated), and confirmed the
      reverse direction with the toast text itself visible in a screenshot ("Turned off Slope Angle — Aspect
      and Slope Angle can't both be on at once"); confirmed the opacity slider genuinely drives the live
      `aspect-raster` layer's `raster-opacity` paint property (captured the real `Map` instance via the
      established `Map.prototype.getLayer` monkey-patch technique from Session 26, read `getPaintProperty()`
      directly — not just checked the slider's own DOM value) and that the value persists to `localStorage`
      correctly while `aspectOn` does not (confirmed `aspectOn:true` mid-session but understood to
      force-reset at the next boot, matching Elevation Range's own already-verified behavior from Session
      38); confirmed via source review (`DOWNLOAD_LAYERS` has no `slopeangle`, `elevrange`, or `aspect` key —
      only the underlying shared `dem` entry) that Aspect adds nothing to the offline-download checklist or
      its size estimate, consistent with Slope Angle/Elevation Range. Zero console errors throughout. `node
      --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks, `terrain-overlay-worker.js`,
      and `service-worker.js`. APP_VERSION bumped 2.41.1 → 2.42.0 (minor — new layer), SHELL_CACHE bumped
      v149 → v150.
- Draw-mode status bar anchoring, `#publicland-legend` fix (Session 41) — two unrelated fixes bundled into
  one small release.
  - **Draw Area/Bearing/Range Ring status bars**: `#polygon-bar` (Draw Area), `#bearing-bar`, and
    `#rangering-bar` were all centered bottom pills (`left:50%;transform:translateX(-50%)`) since first
    built, never matching the anchored-bottom-right pattern `#draw-bar` (Draw Route/Track) and
    `#measure-result` (Measure) already used (`bottom:24px;right:64px`, no transform) — an inconsistency
    that had gone unnoticed since each of these tools shipped in a different session and was never screenshot-
    compared side by side against the others. Fixed by moving all 3 to the same `bottom:24px;right:64px`
    rule. `#bearing-bar`/`#rangering-bar` had a second, deeper issue while at it: their position/background/
    border styling lived in an inline `style=""` HTML attribute rather than a stylesheet rule — inline style
    specificity beats any external `<style>` block regardless of media query, which meant the existing mobile
    override group (`#draw-bar,#measure-result,#polygon-bar,#elev-bar,#bearing-bar{bottom:138px;...}`) was
    never actually able to reposition `#bearing-bar` on mobile despite listing it there — a pre-existing,
    silently-broken mobile fix. Moving both bars' styling into a real `#bearing-bar, #rangering-bar{...}`
    stylesheet rule fixes the desktop anchor AND lets that mobile override finally apply for the first time;
    `#rangering-bar` was also newly added to that mobile group (it had been missing entirely, not just
    shadowed like `#bearing-bar`). Buffer needed no fix — it reuses Draw Route's own `#draw-bar` directly
    (see the "Range Ring and Buffer" entry's own "Buffer specifics" bullet), confirmed via a fresh grep that
    no separate `#buffer-bar` element exists anywhere, and confirmed live that it already renders correctly
    anchored.
  - **`#publicland-legend`**: had the exact same bug `#slope-legend` was fixed for in Session 39 (see that
    entry) — a body-level sibling of `<main id="map">`, so its `left:50%` centered across the whole browser
    window rather than the map viewport, overlapping the sidebar on desktop. Session 39's own writeup
    explicitly flagged this as "almost certainly" present but out of that session's scope; this session
    confirmed it live (screenshot showing the legend's chip row starting under/behind the Layers panel) and
    applied the identical `--sidebar-width`-aware `calc()`/`transform:translateX(-50%)` fix.
  - Verified live via the already-connected Chrome browser extension against a local `python -m http.server`
    (after the standard service-worker-unregister + Cache-Storage-clear step): opened Draw Area, Add bearing,
    and Range Ring from the +Add sheet in turn and confirmed each status bar renders at the exact same
    bottom-right position as Draw Route's and Measure's (screenshot comparison); opened Buffer and confirmed
    it was already correctly anchored (no regression, no fix needed); toggled Public/private land on and
    measured `#publicland-legend`'s real `getBoundingClientRect()` against `#sidebar`'s — `centeringErrorPx:
    0`, matching Session 39's own verification rigor for `#slope-legend`, with zero sidebar overlap. Zero
    console errors. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks.
    APP_VERSION bumped 2.42.0 → 2.43.0 (bundled into the same release as the Session 42 work below — see that
    entry for the version-bump rationale), SHELL_CACHE bumped v150 → v151.
- Disturbance History: Wildfires, Timber Harvest, Timber Thinning (Session 42) — a new Environmental-section
  grouping (visually set off by a plain, non-collapsible `.layer-subsection-title` divider — distinct from
  the top-level collapsible `.layer-section-title` sections like ENVIRONMENTAL itself) containing 3
  independently-toggleable overlays, each with its own opacity slider.
  - **Data sources and why they're live viewport-bbox queries, not bulk fetches**: Wildfires
    (`WILDFIRE_HISTORY_URL`, NIFC's InterAgencyFirePerimeterHistory_All_Years_View FeatureServer — a
    DIFFERENT, much larger service from the pre-existing `FIRE_PERIMETERS_URL`/"Active fire perimeters",
    which is CURRENT/active fires only) has ~98,168 features nationwide, confirmed via a live
    `returnCountOnly` query before writing any code — far too large to bulk-fetch once like GMU/USFS/current-
    fires, so it's queried live per-viewport, same pattern as Hydrography/gauge stations
    (`loadWildfireHistoryForViewport`, debounced re-query on pan/zoom via `scheduleWildfireHistoryRefresh`,
    gated behind `DISTURBANCE_MIN_ZOOM` (9) to avoid the ArcGIS server's 2000-feature-per-query cap at low
    zoom, same reasoning as `HYDRO_MIN_ZOOM`/`GAUGE_MIN_ZOOM`). Timber Harvest (`TIMBER_HARVEST_URL`) and
    Timber Thinning (`TIMBER_THINNING_URL`) are both USDA Forest Service EDW/FACTS services on
    `apps.fs.usda.gov` (same NAD83/`inSR=4269` convention already established for USFS Forest boundaries) —
    confirmed via each service's own `/MapServer?f=json` layer list that BOTH split their data across fixed
    decade sub-layers ("2021 - Current", "2011 - 2020", "2001 - 2010", ...) rather than one flat
    year-queryable layer; `TIMBER_HARVEST_LAYER_IDS`/`TIMBER_THINNING_LAYER_IDS` (`[11,0]`/`[9,0]`) name the
    two decade ids that can ever overlap a 15-year rolling window for the foreseeable future, and
    `loadTimberLayerForViewport` queries both per-viewport and merges the results (`Promise.all`).
  - **Rolling 15-year lookback**: `TIMBER_LOOKBACK_YEARS = 15` (matching onX's own convention, per spec) +
    `timberLookbackCutoffYear()` (`new Date().getFullYear() - 15`, computed fresh on every query, not
    hardcoded) feeds a live `fy_completed>='<cutoffYear>'` WHERE clause applied to BOTH decade-sublayer
    queries — this is what actually keeps the window rolling correctly year over year, not the fixed choice
    of which 2 decade ids to query (which will eventually need a 3rd id added, years from now, once the
    window's older edge reaches into "2001 - 2010" — flagged in code comments, not silently left to bit-rot
    unnoticed). `fy_completed` is a STRING field on both services (confirmed via live query, e.g. `"2025"`,
    not an integer) — string comparison against 4-digit-year strings is safe here specifically because it's
    scoped to just 2 known decade sub-layers, not compared across the full unbounded dataset.
  - **Wildfires' recency-gradient bands**: `WILDFIRE_AGE_BANDS` (light yellow-orange `#FCE29A` "Past year"
    through deep red/maroon `#6E2020` "7+ years", 4 bands) with `wildfireAgeBandIndex(age)` bucket boundaries
    read literally off the 4 stated band names with zero overlap/gaps: age 0 → "Past year", age 1-3 →
    "1-3 years", age 4-7 → "4-7 years", age 8+ → "7+ years". Age can't be computed inside a MapLibre paint
    expression (no "current year" primitive), so `ageBand` (0-3) is precomputed once per feature right after
    fetch in `loadWildfireHistoryForViewport` — the same schema-normalize-at-merge-time approach Migration
    corridors already established for an analogous per-feature-property derivation — then a plain
    `['match', ['get','ageBand'], ...]` paint expression on both `wildfirehistory-fill`'s `fill-color` and
    `wildfirehistory-line`'s `line-color` reads it back.
  - **Timber Harvest/Thinning's diagonal hatch fill**: fixed colors (sienna `#8B4225`/muted gold `#B8963E`),
    not a gradient — completion year is surfaced via tap-to-identify instead, per spec. MapLibre has no
    native hatch-pattern paint type, so this reuses the exact same canvas-pattern-image technique
    `buildOfflinePlaceholderPattern` already established in this file (Session 15-era offline-boundary
    placeholder tiles) — `buildDisturbanceHatchPattern(colorHex)` draws the identical 3-line diagonal-stripe
    canvas, just with a transparent background (only the stroked lines have alpha) rather than an opaque
    fill, so the layer's own `fill-opacity` still controls overall strength the same way it does for every
    flat-color fill layer in this app. Registered once per style load via the same idempotent
    `!map.hasImage()` guard every other custom image/source uses, referenced by id (`'timber-harvest-
    pattern'`/`'timber-thinning-pattern'`) from each layer's `fill-pattern` paint property.
  - **Popups**: all 3 new layers use a plain `maplibregl.Popup` (not `#view-drawer`) — matching Fire
    Perimeters/Hydrography/gauge stations' own precedent (read-only external-data overlays that predate or
    sit outside both drawer-unification batches), not GMU/USFS/wildlife/migration's `#view-drawer` routing.
    `wildfireHistoryPopupHtml` shows incident name + fire year + acres; `timberActivityPopupHtml` (shared by
    both Timber layers) shows activity name + "Completed FY<year>" + acres.
  - **KNOWN GAP, flagged rather than silently glossed over — offline download vs. live online view**: all 3
    layers ARE real `DOWNLOAD_LAYERS` entries (`wildfire`/`timberharvest`/`timberthinning`, each with a
    `bboxUrlBuilder` computing a per-`{z}/{x}/{y}`-tile ArcGIS query via the new `tileLatLngBbox()` helper) —
    this satisfies the actual ask driving their existence: "download this area" performs a real network
    fetch and contributes a real, non-zero byte count to the size estimate (confirmed live: 237 tiles/4MB →
    309 tiles/14MB after checking all 3), unlike a client-only derivative such as Slope Angle. But UNLIKE
    every tile-based layer above them in `DOWNLOAD_LAYERS` (DEM/snowdepth/NLCD/publicland/vectorbase — whose
    live-browse tile URL is byte-identical to its offline-download tile URL, same `{z}/{x}/{y}` scheme both
    ways), these 3 fetch an ARBITRARY live-viewport bbox online but a FIXED tile-grid bbox when downloaded —
    two different URL shapes that essentially never match, so an offline-downloaded area's cached bytes are
    NOT actually read back by the live online view while genuinely offline (Cache Storage keys by exact URL).
    This is why these 3 toggles are ALSO deliberately absent from `OVERLAY_OFFLINE_TOGGLE_SOURCE` (which
    would otherwise show a misleading "should work offline" hint that wouldn't actually hold) and why the
    offline-download modal's own hint text was extended to say so explicitly, not just documented in code
    comments. Timber Harvest/Thinning's offline copy is additionally narrower than the online view in a
    second way: it only covers the "2021 - Current" decade sub-layer (the 1-URL-per-tile-per-source download
    model can't cleanly merge 2 separate sub-layer endpoints into one downloadable entry without either
    doubling tile requests for every other layer too or adding 2 more confusing checklist rows the spec
    didn't ask for).
  - **Verification**: real network access to these ArcGIS services (unlike Mapbox's v4 API, blocked in every
    prior session touching DEM/vectorbase) is genuinely reachable from this sandbox, confirmed via direct
    `curl` before writing any code (98,168-feature live count query, live sample queries against a real
    National Forest confirming exact field names/types — `FIRE_YEAR_INT` a real integer, `fy_completed` a
    STRING). Verified live via the already-connected Chrome browser extension against a local `python -m
    http.server`, navigated to the Deschutes National Forest (real known fire-history terrain): Wildfires
    confirmed rendering REAL fire perimeter data with the correct deep-maroon "7+ years" color and a correct
    tap-to-identify popup ("Two Bulls / 2014 · 6,906 acres" — 12 years old, correctly bucketed); the
    Environmental section badge correctly counted 0/9 → 1/9 → 2/9 → 3/9 as each layer toggled on. Timber
    Harvest/Thinning's own live queries hit a genuine external 503 mid-session (confirmed via direct `curl`
    against the same USDA endpoint independently of the app, ruling out an app-side bug — most likely
    transient rate-limiting from this same session's earlier research `curl` traffic against the identical
    endpoints) — the correctly-constructed request URL was still confirmed via live network-request capture
    (`fy_completed>='2011'`, the right 2 decade layer ids, the right bbox, the right inSR/outSR) before the
    outage, and the app degraded gracefully with zero console errors despite the 503s (the existing
    `.catch(() => null)` pattern). Since the rendering pipeline itself is independent of which service
    supplied the GeoJSON, hatch-pattern rendering and tap-to-identify were verified with equal rigor by
    injecting synthetic GeoJSON directly into the live `timberharvest-source`/`timberthinning-source` (same
    technique this codebase already uses for Mapbox-blocked DEM-derived layers) — confirmed both hatch
    patterns render legibly and stay visually distinct from each other and from the wildfire wash beneath
    them (screenshot), and confirmed tap-to-identify on the synthetic thinning polygon shows "Synthetic Test
    Thinning / Completed FY2023 · 123 acres", the exact expected format. The 15-year-lookback exclusion
    itself could not be re-confirmed against real data after the outage began, though the WHERE clause was
    confirmed correctly constructed via the live network capture taken just before it — flagged as the one
    piece of this session's verification checklist not fully closed out, rather than claimed as proven.
    Opacity sliders confirmed genuinely driving each layer's live `fill-opacity` (captured the real `Map`
    instance via the established `Map.prototype.getSource` monkey-patch technique, read `getPaintProperty()`
    directly). Zero console errors throughout the entire session. `node --check` confirmed clean syntax on
    all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.42.0 → 2.43.0 (minor — new layers; this
    single bump also covers the Session 41 fixes above, shipped in the same release rather than two separate
    patch bumps), SHELL_CACHE bumped v150 → v151.
  - Session 43 — closed the exact gap Session 42 flagged: the live viewport-query path now checks Cache
    Storage for offline-downloaded tiles BEFORE issuing a live network query, so a downloaded area's
    Wildfires/Timber Harvest/Timber Thinning data actually renders while genuinely offline, rather than only
    contributing to the download's byte count. Per the task's own explicit instruction to investigate before
    changing anything: confirmed the live path's exact query shape (arbitrary current-viewport bbox, via
    `map.getBounds()`) and the offline path's exact storage shape (Cache Storage under `TILE_CACHE_NAME`,
    keyed by the precise per-`{z}/{x}/{y}`-tile URL `DOWNLOAD_LAYERS`' own `bboxUrlBuilder` produces) before
    designing the bridge — confirming the original Session 42 diagnosis (two different URL shapes that
    essentially never match) was exactly right, not just plausible.
    - **The bridge**: `loadDisturbanceLayerFromCache(layerId, bounds)` (new, defined alongside
      `tileUrlForLayer`/`computeTileList`) computes the DISTURBANCE_MIN_ZOOM tile(s) covering the current
      viewport via `tilesCoveringBounds()` (the same `lonToTileX`/`latToTileY` grid math `computeTileList`
      itself uses), reconstructs each tile's exact download-time URL via the SAME `bboxUrlBuilder` function
      `DOWNLOAD_LAYERS` already registers, and checks `cache.match()` for each. Only resolves non-null (a
      merged FeatureCollection) if EVERY covering tile is present — a partial hit is treated as a miss,
      deliberately: silently rendering a viewport with some polygons missing because only some of its tiles
      happened to be cached would be worse than the existing graceful-degradation behavior (live fetch, or —
      offline with nothing cached — showing nothing). `loadWildfireHistoryForViewport`/
      `loadTimberLayerForViewport` were restructured so this cache check runs FIRST, with the existing live
      fetch logic becoming the fallback path, essentially unchanged, when the cache check misses — this is
      cache-first regardless of actual connectivity (not gated on `navigator.onLine`), per the task's own
      literal wording ("check for and use offline-cached data first, before falling back to a live network
      query") — an online user revisiting a downloaded area gets the cached snapshot too, not a fresh live
      query, which is the explicit, deliberate tradeoff documented below.
    - **A real bug found during design, before any code was written**: the bridge only works if the URL the
      live-check path reconstructs is BYTE-IDENTICAL to the URL the original download wrote under — but
      Timber's original `fy_completed>='<cutoffYear>'` WHERE clause embedded `timberLookbackCutoffYear()`,
      itself `new Date().getFullYear() - 15`, meaning the exact same tile requested a year apart would
      generate two DIFFERENT URLs (different cutoff year baked in), guaranteeing a cache miss the moment a
      single year boundary crossed — the bridge would have silently stopped working after every New Year's,
      re-introducing the exact gap it was built to close, on a timer. Fixed by moving the 15-year lookback
      out of the query URL entirely: `timberOutFieldsWhere()` (live) and `timberHarvestTileUrl`/
      `timberThinningTileUrl` (offline tile-grid) now both query `where=1%3D1` — a stable, year-independent
      URL — and the actual filtering moved to a new shared `applyTimberLayerData(kind, data)`, called by
      BOTH the cache-hit and live-fetch paths, which filters `data.features` against
      `timberLookbackCutoffYear()` fresh, every time data is applied, regardless of source or age. This is
      also what makes the "aged OUT" half of the staleness tradeoff below self-correcting even from a
      months-old cached snapshot: a treatment that was 14 years old at download time correctly disappears
      the next time that same cached tile is re-applied and it's now 16 years old, since the comparison is
      against "now," never baked into the cached bytes. Wildfires needed no equivalent fix — its query was
      already `where=1%3D1` with no time filter (recency bands are a pure display concern, computed
      client-side via `ageBand` at apply time in `applyWildfireHistoryData`, which already had this same
      "recompute fresh from cached data" property from Session 42, unmodified here).
    - **Single fixed zoom, found necessary while designing the bridge, not just a nice-to-have**: Session
      42's `wildfire`/`timberharvest`/`timberthinning` `DOWNLOAD_LAYERS` entries used `minNativeZoom:1,
      maxNativeZoom:13`, which — combined with `computeTileList`'s own one-native-zoom-pass-per-distinct-
      clamped-zUser loop — meant a typical 9-15 download range produced FIVE separate full-area passes
      (z9-z13), each re-querying the same geographic footprint at a different tile-grid split. This wasn't
      just wasteful (a real, incidental size-estimate improvement — the same test download dropped from a
      hypothetical multi-zoom fetch to 131 tiles/2MB total for a small area with all 3 layers checked); it
      also left the bridge with no single, unambiguous zoom level to check cache against — a live viewport
      could be "partially covered" at z9 but "fully covered" at z11, with no principled way to prefer one
      over the other. Fixed by pinning both `minNativeZoom`/`maxNativeZoom` to `DISTURBANCE_MIN_ZOOM` (9,
      already the proven-safe floor against the ArcGIS 2000-feature cap for the live view) — regardless of
      the user's selected download zoom range, `computeTileList`'s clamp always resolves to exactly one pass
      at that single zoom, and the bridge always has exactly one tile grid to check.
    - **Offline-availability indicator**: re-added `wildfire-toggle`/`timberharvest-toggle`/
      `timberthinning-toggle` — deliberately NOT to the existing `OVERLAY_OFFLINE_TOGGLE_SOURCE` table (whose
      `areaBoundsContainViewport` check trusts SAVED AREA METADATA — an area's own recorded bounds and which
      layer ids were requested at download time — accurate enough for layers whose live tile URL always
      equals their download tile URL, but only a metadata-trusting proxy otherwise) but to a new, parallel
      `DISTURBANCE_OFFLINE_TOGGLE_IDS` map, checked via `isDisturbanceLayerCachedForBounds()` — the same
      tile-covering logic as the render bridge, but existence-only (`cache.match()` truthiness, no response-
      body parsing) since the indicator only needs a yes/no answer. This answers the literal question the
      graying indicator exists to answer — "does Cache Storage actually have this" — rather than a proxy for
      it, and was straightforward to add alongside the render bridge since both share the same
      `tilesCoveringBounds`/`TILE_CACHE_NAME`/`tileUrlForLayer` foundations.
    - **The accepted tradeoff, documented in 3 places, not just code comments**: an offline-cached view is a
      snapshot frozen at download time — a fire or treatment reported AFTER the download can't appear until
      the area is re-downloaded, no matter how the lookback filtering works. This is inherent to caching
      anything against a rolling time window, not a bug to chase further. Documented in the Layers panel's
      existing Timber disclaimer (extended, not replaced, to cover all 3 layers' offline behavior), the
      offline-download modal's own hint text (rewritten from "won't yet draw from that download while
      offline" to describe the NEW behavior and its snapshot caveat), and here.
    - **Verification**: downloaded a real, small test area (Deschutes National Forest, Z9-Z15 default range,
      131 tiles/2MB) with all 3 Disturbance History layers checked via the live offline-download UI — hit
      the same native-`prompt()`-blocks-CDP gotcha this codebase has documented before; recovered by opening
      a fresh tab against the same origin rather than fighting the blocked one, since Cache Storage and
      localStorage are both origin-scoped, not tab-scoped, and confirmed both were intact in the new tab
      (`localStorage`'s saved-area record correctly listed all 4 downloaded layer ids including the 3 new
      ones, `sizeMB:2.04`). Proved the render bridge with a real network-level test, not just code review:
      monkey-patched `window.fetch` to reject any request to `arcgis.com`/`apps.fs.usda.gov` (simulating
      "genuinely offline" for exactly the hosts these 3 layers query, without touching Cache Storage, which
      isn't network-dependent) — toggling on all 3 layers with this patch active rendered real data (368
      wildfire, 432 harvest, 652 thinning features, confirmed by inspecting each MapLibre source's `_data`
      directly, not just eyeballing the map) with zero console errors, conclusively proving the data came
      from Cache Storage and not a live request that happened to still work. Confirmed the 432 cached harvest
      features' `fy_completed` values all fall within [2021, 2026] with none below the 2011 cutoff — the
      client-side filter is doing real work, not a no-op. Verified the offline-availability indicator with
      `navigator.onLine` forced `false`: the 3 rows correctly read available (not grayed) at the downloaded
      viewport, correctly flipped to unavailable (grayed) after jumping the map to a random, never-downloaded
      location (Kansas), and correctly flipped back to available on returning — a full round-trip, not just
      one direction. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks.
      APP_VERSION bumped 2.43.0 → 2.43.1 (patch — bridges/fixes existing Session 42 functionality, no new
      user-facing layer), SHELL_CACHE bumped v151 → v152.
  - Session 44 — renamed "Wildfires" to "Wildfire History" and split it from one layer into 3
    independently-toggleable time-tiers (Recent 0-20yr / Older 20-50yr / Even Older 50+yr, all default off,
    per spec), each fetching and rendering only its own `FIRE_YEAR_INT` range — the direct fix for a
    real-world report of slow loading on cellular, since the original single-layer design queried the FULL
    unfiltered ~98K-feature/125-year dataset for every viewport regardless of which ages anyone actually
    wanted. Also increased Timber Harvest/Thinning's hatch density ~1.6x/1.5x (tile size 16→10px, stroke
    width 2→3px), confirmed too sparse against Topo on a real device screenshot.
    - **Independent, not exclusive**: unlike Slope Angle/Aspect (mutually exclusive because they fully
      color-wash the SAME terrain pixels), Wildfire History's 3 tiers are deliberately NOT exclusive — a
      single fire can only ever fall in exactly one age bucket, so any number of tiers can be active
      together with zero visual conflict. "All 3 on" is just "all wildfire history," split for fetch/render
      efficiency only, confirmed via live testing (turning 2 tiers off left the 3rd's own visibility/data
      completely untouched) rather than assumed from the design alone.
    - **`WILDFIRE_TIERS`** (new, replacing `WILDFIRE_AGE_BANDS`) holds each tier's `minAge`/`maxAge` (outer
      bounds, feeding the server-side WHERE clause), `bandUpperBounds` (internal split points — 4 for
      Recent, 3 each for Older/Even Older, 10 total), and precomputed `fills`/`strokes` hex arrays. Each
      tier's colors are an INDEPENDENT light-yellow-orange-to-deep-maroon gradient across that tier's own
      band count (generated by linearly interpolating the original single-layer design's own endpoint colors
      — fill `#FCE29A`→`#6E2020`, stroke `#C9932E`→`#3D0F0F` — across N steps), not one continuous 10-step
      gradient split across tiers — chosen so any single tier reads as a complete, legible gradient on its
      own even with the other two off (a user with only "Even Older" checked still sees a real light→dark
      progression, not just 3 near-identical dark shades). Older/Even Older's 3-band gradients land on
      identical hex values to each other — expected and harmless, since the two are never rendered for the
      same feature. `wildfireMatchExpression()` builds the MapLibre `['match', ['get','ageBand'], ...]`
      paint expression from a tier's own fills/strokes array generically, so Recent's 4-color and
      Older/EvenOlder's 3-color expressions share one construction rather than 3 hand-written expressions.
    - **The actual performance mechanism — `wildfireTierWhereClause()`**: `FIRE_YEAR_INT<=(currentYear-
      minAge)` and/or `FIRE_YEAR_INT>(currentYear-maxAge)`, computed fresh from the current year on every
      call (never hardcoded), same "rolling, not frozen" approach `TIMBER_LOOKBACK_YEARS`' own client-side
      filter established in Session 43. This is genuinely what delivers the fetch-efficiency win — the WHERE
      clause is sent to ArcGIS and filters server-side, so checking only "Recent" means the ~98K-feature
      dataset is never fully transferred, not merely filtered after the fact. Band boundaries were chosen to
      read literally off each tier's own stated sub-range names ("<1yr", "1-5yrs", etc.) with a consistent
      half-open-interval convention (lower bound inclusive, upper bound exclusive) throughout, so there's
      exactly one correct tier and one correct band for any given fire age with no ambiguity at any
      boundary — verified exhaustively (not just spot-checked) via a standalone Node test
      (`test_wildfire_tiers.js`) checking every integer year from 1900 to 2026 against all 3 tiers' WHERE-
      clause logic and confirming each one matches EXACTLY one tier, plus 26 targeted band-boundary/WHERE-
      clause-string assertions — 31/31 passing.
    - **Shared implementation, not 3 copies**: `loadWildfireTierForViewport(tierId)` (replacing
      `loadWildfireHistoryForViewport`), `applyWildfireTierData(tierId, data)`, `wildfireTierBboxQueryString`,
      `scheduleWildfireTierRefresh`, `setWildfireTierLayersVisible`/`setWildfireTierOn`, and the click-handler
      factory `handleWildfireTierClick(tierId)` are all parameterized by tier, mirroring the
      `TIMBER_KIND_CONFIG`-driven shared-implementation pattern Session 42 already established for Timber
      Harvest/Thinning's 2 kinds — generalized here to 3. Per-tier mutable state (`cache`, `zoomHintShown`,
      `refreshTimer`) lives as properties directly on each `WILDFIRE_TIERS[tierId]` object rather than
      separate top-level vars, since a 3-way ternary (as Timber's 2-kind version used) doesn't scale cleanly
      to a 3rd option.
    - **One shared popup, tier-aware close**: all 3 tiers still share a single `openWildfireHistoryPopup` var
      (only one popup is ever open regardless of which tier's polygon was tapped) — but a real bug was
      caught before shipping, not after: the original single-layer `setWildfireHistoryLayersVisible` closed
      the shared popup unconditionally whenever the layer turned off, which — generalized naively to 3
      independent tiers — would have closed a popup showing a "Recent" fire's details the moment the user
      toggled "Older" off, even though "Recent" was untouched. Fixed by tracking which tier the currently-
      open popup came from (`openWildfireHistoryPopupTier`, set in `openWildfireHistoryPopupAt`) and only
      auto-closing on toggle-off when it matches the tier being turned off.
    - **Offline-download / cache-bridge parity**: `wildfire`'s single `DOWNLOAD_LAYERS` entry became 3
      (`wildfirerecent`/`wildfireolder`/`wildfireevenolder`), each with its own `bboxUrlBuilder`
      (`wildfireTierTileUrl`) embedding that same tier's own `wildfireTierWhereClause` — required, not
      optional, since a single shared entry covering all years would have defeated the Session 44 fetch-
      efficiency win specifically for the offline-download/cache-bridge path (downloading "Recent" alone
      must not silently pull and cache the full history). `DISTURBANCE_OFFLINE_TOGGLE_IDS`
      (offline-availability graying, Session 43) and `LAYER_SECTION_TOGGLE_IDS.environmental` (badge count)
      both extended from 1 wildfire entry to 3.
    - **Hatch density**: `buildDisturbanceHatchPattern`'s tile `size` (governs line spacing) shrunk 16→10px
      and `lineWidth` (stroke thickness) bumped 2→3px — both dimensions derive from the single `size`
      variable, so this was a 2-number change, not a redesign. Landed within the requested ~1.5-2x range:
      ~1.6x tighter spacing (16/10) combined with 1.5x thicker strokes.
    - **Verification**: standalone Node test (31/31 assertions, see above) confirmed the tier boundary/WHERE-
      clause math before touching the browser. Live via the already-connected Chrome browser extension
      against a local `python -m http.server`, navigated to the Deschutes National Forest (real known
      fire-history terrain): confirmed the Layers panel now shows 3 independently-toggleable "Wildfire
      History" rows (renamed from "Wildfires") under one shared "?" info panel with the new 3-group/10-swatch
      legend; confirmed via real captured network requests that toggling all 3 on fired 3 distinct live
      queries with the EXACT predicted WHERE clauses (`FIRE_YEAR_INT>2006`, `FIRE_YEAR_INT<=2006 AND
      FIRE_YEAR_INT>1976`, `FIRE_YEAR_INT<=1976` for a 2026 "now") — not just correctly-shaped code, but the
      real, live request; confirmed turning 2 tiers off left the 3rd's own checkbox/visibility/source data
      completely unaffected, proving true independence. Measured the actual performance win directly, not
      assumed from the WHERE clause alone: fetched the OLD unfiltered query and the NEW "Recent"-only query
      for the identical real bounding box and compared real response bytes — 870,238 bytes/48 features (old,
      full history) vs. 478,485 bytes/9 features (new, Recent only), a 45% byte reduction and 81% feature
      reduction for the single most common case (checking only Recent). Confirmed the 3 tiers exhaustively
      partition the real dataset with zero gaps/overlap by separately fetching all 3 tiers' real feature
      counts for the same bbox (9 + 17 + 22 = 48) and confirming the sum exactly equals the old unfiltered
      total. Confirmed a real "Two Bulls" (2014, 12 years old) fire correctly renders in Recent's own
      "10-20yr" band (deep maroon) and its popup resolves correctly. Confirmed the offline-download
      checklist now lists 3 correctly-renamed/labeled entries in place of the old single "Wildfire history"
      row. Confirmed the timber hatch pattern renders visibly denser via a zoomed screenshot comparison.
      Zero console errors throughout. `node --check` confirmed clean syntax on all 4 extracted inline
      `<script>` blocks. APP_VERSION bumped 2.43.1 → 2.44.0 (minor — restructured layer), SHELL_CACHE bumped
      v152 → v153.
  - Session 45 — corrected Session 44's own hatch-density change, which had moved in the wrong direction: a
    real zoomed screenshot showed the tile size 16→10px / stroke width 2→3px change from Session 44 producing
    visibly thicker, chunkier stripes with barely more of them — "bold and sparse," not the finer, denser
    weave the original ask actually wanted. Root cause was conflating "more lines" with "thicker lines": for
    this diagonal 3-segment stripe pattern, the perpendicular spacing between adjacent parallel lines is
    `size/√2`, so it's a SMALLER tile `size` that packs in more stripe repeats per unit area — stroke width is
    an orthogonal knob that only controls how bold each individual line reads, and Session 44 had moved both
    numbers in the direction that increases boldness while barely helping repeat count. Fixed by reducing
    `size` further to 6 (from the original 16 — ~2.7x more repeats) and reducing `lineWidth` to 1.2 (thinner
    than even the pre-Session-44 original 2px) — thin, closely-packed lines read as a genuine dense weave
    rather than fewer bold candy-stripes. Verified via the already-connected Chrome browser extension: enabled
    Timber Harvest/Thinning against real Forest Service data (`apps.fs.usda.gov/arcx/...EDW_TimberHarvest_01`,
    reachable in this sandbox even though Mapbox's own v4 tile API is 403-blocked — real 152-acre and
    9-152-acre polygons found and flown to via a live query rather than guessed coordinates), then took a real
    zoomed screenshot (`zoom` action, not just a full-page shot) of both the harvest (sienna) and thinning
    (gold) fill patterns — confirmed a genuinely fine, closely-spaced weave of thin diagonal lines on both,
    replacing the Session 44 chunky/sparse look. `node --check` confirmed clean syntax on all 4 extracted
    inline `<script>` blocks.
  - Session 47 — shortened the Wildfire History sub-layer labels ("Wildfire History — Recent (0-20 yrs)" →
    "Wildfire — Recent (0-20 yrs)", same pattern for Older/Even Older, in both the Layers panel checkbox rows
    and the matching `DOWNLOAD_LAYERS` entries) since the repeated "Wildfire History —" prefix was redundant
    under the already-labeled "Disturbance History" section header and was pushing the Recent row to wrap to
    2 lines. The rename alone didn't fully fix the wrap, though — live `getBoundingClientRect().height`
    measurement (46px for Recent vs. 29.8px for Older/Even Older, despite Recent's text being the SHORTEST of
    the three) isolated the real cause: the shared `?` info-panel-toggle button (`data-layer-id="lh-wildfire"`,
    one button covering all 3 tiers) lived inline inside the Recent row's own `<label>` specifically, and its
    ~20px width was exactly enough to push that ONE row over its available space while its siblings, with no
    button of their own, had the full row width to work with. Fixed by moving the button out of the Recent
    row entirely onto its own standalone line (`<div style="display:flex;justify-content:flex-end;">`) shared
    by all 3 tiers, placed after all 3 checkbox rows and before the shared `#lh-wildfire` info panel — every
    row now gets equal, maximal width. The relocation needed zero JS changes: the existing delegated click
    handler on `#layers-panel` matches `.layer-hint-btn[data-layer-id]` via `closest()`, which works
    identically regardless of the button's DOM location. Verified live: all 3 rows confirmed at the identical
    29.8px single-line height via the same `getBoundingClientRect()` technique that found the bug, and the `?`
    button confirmed still correctly toggling `#lh-wildfire`'s `show` class (`show`→hide→show round-trip via
    the real delegated handler, not a direct class manipulation). `node --check` confirmed clean syntax.
- Tap-stack (Session 46) — a generic "2+ tappable features overlap at one point" disambiguation list,
  covering every tappable object/layer type in the app: track, polygon, bearing, range ring, buffer,
  wildlife habitat, migration herd, GMU boundary, USFS forest boundary, active fire perimeter, wildfire
  history (all 3 tiers), timber harvest, timber thinning, hydrography flowline, hydrography waterbody, and
  stream gauge — 16 entries total in one `TAP_STACK_TYPES` registry, each a `{type, queryLayers, getKey,
  label, open}` descriptor. Deliberately excludes pins (they're `maplibregl.Marker` DOM elements, not
  MapLibre-rendered layers, and their own click handler already calls `e.stopPropagation()` before the event
  ever reaches MapLibre's canvas-level dispatch — a pin tap has always shown just that pin and continues to,
  unaffected by this feature's existence), `cluster-circles` (a "zoom to expand" action, not a content item),
  and `draw-preview-line` (only meaningful mid-draw-mode, already excluded since the pre-check bails whenever
  any tool mode is active).
  - **Mechanism — exploits MapLibre's own click-dispatch model, doesn't fight it**: `map.on('click', layerId,
    fn)` is internally just another listener on the SAME shared 'click' array as a plain `map.on('click', fn)`
    — MapLibre invokes ALL registered click listeners for a single click event, in REGISTRATION ORDER,
    regardless of whether they're layer-scoped or generic (confirmed by reading the vendored MapLibre bundle's
    own dispatch code, not assumed). `e.preventDefault()` only sets a flag; MapLibre itself never checks it —
    every existing handler in this codebase already manually checks `if (e.defaultPrevented) return;` at its
    own top specifically to avoid double-processing a click landing on 2+ overlapping layers. The new tap-stack
    pre-check handler is registered FIRST, before all ~20 existing layer-scoped handlers, and calls
    `collectTapStackCandidates(e.point)` — a single `map.queryRenderedFeatures(point, {layers: [...]})` call
    per registry entry, naturally respecting layer visibility (an off layer contributes nothing, no separate
    state-flag checks needed) — then only calls `preventDefault()` (making every subsequent handler bail out)
    when 2+ distinct candidates are found; with 0 or 1 candidates, or with any tool mode active, it's a
    complete no-op and every existing single-feature-tap code path fires exactly as before, untouched. This
    also incidentally fixes a same-layer overlap gap every existing per-layer handler already had (they only
    ever read `e.features[0]`, never checking for a second match within the same layer at that point) — the
    new `queryRenderedFeatures`-based collection naturally returns every matching feature from every queried
    layer in one flat array.
  - **Dedup**: each candidate's key is `type + ':' + getKey(f)`. Most types key off `f.properties.id` (the
    real object id); GMU/wildlife/wildfire-history key off `f.layer.id + '|' + f.id` since those query
    multiple layers at once (one per state/species/tier) and need the specific matched layer to resolve which
    one). Bearings are the one type genuinely at risk of a same-object double-match, since they render across
    TWO different layers/sources (`bearings-line-touch` on `bearings-source`, `bearing-target-arrow` on
    `bearing-target-source`) — confirmed via `updateBearingsSource()` that both layers' features carry the
    identical `properties.id = b.id` for the same bearing, so the shared `type+':'+id` key correctly collapses
    a bearing matched on both layers into exactly one candidate.
  - **Reused dead code instead of building new UI**: `#cluster-panel`/`openClusterPanel()`/
    `closeClusterPanel()` were confirmed via grep (zero call sites to `openClusterPanel(`) to be fully dead —
    a leftover from before pin map-clustering was disabled. Its DOM/CSS/JS shape (list of items at a point,
    tap a row to open, × to close) was renamed and repurposed wholesale into the new generic
    `#tap-stack-panel` rather than building parallel UI from scratch — same visual language as the rest of the
    app for free.
  - **"← Back to list"**: a separate, always-`position:fixed` pill (`#tap-stack-back-bar`, top-center,
    `z-index:2200`) rather than trying to inject a back-button into the wildly heterogeneous existing detail
    surfaces (some via `#view-drawer`, screen-anchored; others via a raw `maplibregl.Popup`, point-anchored at
    the tap location) — shown/hidden independently of whatever detail surface happens to be open beneath it,
    avoiding fragile DOM-injection-after-the-fact code entirely. Only ever shown after
    `openTapStackItemDetail()` opens a row's detail view (never on a normal direct single-feature tap); tapping
    it calls `tapStackGoBack()`, which hides itself, closes whatever detail surface is open (both
    `closeViewDrawer()` unconditionally and a `.remove()` sweep across all 6 raw-popup shim vars — cheap and
    correct regardless of which single one is actually active, since exactly one is ever open at a time), and
    reopens `openTapStackPanel()` with the SAME cached candidate list (`tapStackLastCandidates`/
    `tapStackLastLngLat`) rather than re-querying — the list a user returns to is guaranteed identical to the
    one they left.
  - **Wiring**: `#tap-stack-panel` joined `FLOATING_PANEL_IDS` (dismissed on background tap or when another
    panel opens, via the existing `closeAllPanels()`); `#tap-stack-back-bar` is NOT a `FLOATING_PANEL_IDS`
    member (it's not really a "panel" — no scrim, always-fixed) and instead gets one explicit
    `hideTapStackBackBar()` call added directly inside `closeAllPanels()`, plus the same call added to the two
    other pre-existing `closeClusterPanel()` call sites (the final generic map-click handler, the Escape-key
    handler) that got renamed to `closeTapStackPanel()` alongside it.
  - **Verified live** via the already-connected Chrome browser extension against a local `python -m
    http.server`, using real government data rather than synthetic test fixtures: found a genuine 3-feature
    overlap point (2 timber-harvest polygons + 1 GMU-7W boundary, all real ArcGIS data — confirmed the exact
    overlap pixel via `map.queryRenderedFeatures` at a point solved by real point-in-polygon math, not
    guessed) and drove a REAL mouse click there via the browser automation tool (not a synthetic JS dispatch)
    at the correct on-screen pixel (computed from `map.project()` + the container's real `getBoundingClientRect()`).
    Confirmed: the tap-stack panel opened showing all 3 real items with correct titles/meta ("GMU 7W/GMU
    boundary", "Commercial Thin/Completed FY2023", "Precommercial Thin/Completed FY2023"); tapping "GMU 7W"
    opened the real, completely unmodified `#view-drawer` GMU popup (title/Flagstaff/AZGFD link/disclaimer)
    with "← Back to list" showing; tapping "← Back to list" returned to the identical 3-item list; tapping a
    timber row instead opened the real point-anchored `maplibregl.Popup` detail view unchanged ("Commercial
    Thin / Completed FY2023 · 20 acres"), confirming the back-bar mechanism works identically for both
    drawer-based and popup-based detail types. Confirmed a genuine single-feature tap elsewhere (only the GMU
    layer matched, 1 candidate) opens its own view directly with no stack panel ever appearing — the
    pre-check's `candidates.length < 2` no-op path. Separately confirmed, by reading `openGmuPopupAt`/
    `showViewDrawer`'s actual source, that leaving some OTHER unrelated panel (e.g. the Layers panel) open in
    the background across a single-feature tap is pre-existing, consistent behavior across every panel in this
    app (no per-layer click handler anywhere calls `closeAllPanels()`) — not a new quirk introduced by
    tap-stack. Confirmed zero console errors across the full interaction sequence. **Tooling gotcha hit and
    resolved during testing, not an app bug**: the specific browser tab used earlier in this session had a
    stale Chrome DevTools device-metrics override left over from prior mobile-viewport testing — `window.
    innerWidth`/`getBoundingClientRect()` reported a tiny ~208×130px viewport while the real backing store
    (and the CDP screenshot capture) still rendered at full desktop size, which silently corrupted
    `map.queryRenderedFeatures()`'s pixel-space hit-testing on that one tab (real polygons existed in the data
    source but queries at their true screen location returned zero matches). Resolved by opening a fresh tab
    rather than trying to repair the corrupted one — confirmed the fresh tab's `window.innerWidth` matched its
    real window size before relying on any further pixel-coordinate math.
- Draw Route/Buffer mode-selector overflow, real fix (Session 48) — the "Route via:" car/walk/hike profile
  selector used to live inline in the SAME `white-space:nowrap` line as `#draw-bar-text` (point count/
  distance/elevation gain-loss). That text is short at 0 points ("0 points") but grows long once a route has
  several points and elevation data populates ("6 points · 2.34 mi · ▲1,240ft ▼890ft") — nowrap forced the
  whole line, icons included, to keep growing rather than wrap, so on mobile's `max-width:340px` bar the
  icons got pushed past the box's right edge and off-screen, unreachable. This is exactly why an earlier fix
  attempt (not itself documented here — reported by Geoff as "only worked when the bar was near-empty")
  passed a quick check at 0 points and then broke in real use once a route was actually being drawn. Fixed
  by giving the mode selector its own dedicated row (`#draw-bar-mode-row`, a sibling block-level div below
  `#draw-bar-stats`, not sharing a line with it) and letting the stats text wrap normally
  (`white-space:normal;overflow-wrap:break-word`) instead of forcing nowrap — the mode selector's own row is
  never affected by how long the stats line grows, since it's a completely separate box. Buffer needed no
  separate fix — it reuses Draw Route's own `#draw-bar` directly (see the "Range Ring and Buffer" entry's own
  "Buffer specifics" bullet), so this fix covers both automatically. Verified live at the actual reported bug
  scenario, not just at 0 points: added 6 real points to a drawn route (both on a normal desktop viewport and
  via a real 390px-wide `<iframe>` for genuine mobile `@media` matching, the established technique from
  Sessions 28-30) and set the stats text to a realistic long populated string (`6 points · 2.34 mi ·
  ▲1,240ft ▼890ft` — DEM elevation data isn't reachable in this sandbox, same Mapbox-terrain-rgb block as
  every prior session touching DEM, so this was set directly rather than waited on). Confirmed via
  `getBoundingClientRect()` on every profile button that all 3 stayed fully within the bar's own bounds at
  both breakpoints — mobile: bar 340px wide (matches the existing mobile `max-width` rule), last button
  ending at x=194.9 against a bar right-edge of x=365.2, comfortably inside; desktop: bar 282.9px wide (within
  the new `max-width:320px`), last button similarly well clear of the right edge. Screenshots at both
  breakpoints confirm the mode selector renders as its own visible row beneath the stats text, never clipped
  or pushed off-screen.
- Offline point-snap for Draw Route/Buffer (Session 48) — "Snap to trail" previously had exactly one code
  path: a live ORS (openrouteservice) directions request that traces a real path between the drawn points
  along roads/trails, failing outright (a plain error toast) if offline or if the request otherwise failed.
  `snapDrawnRouteToTrail()` now has a fallback: if `!navigator.onLine` it skips the doomed network round-trip
  entirely and calls the new `snapDrawnRouteOffline()` directly; if the ORS fetch is attempted and fails for
  ANY reason (offline, ORS unreachable, no route found), the existing `.catch()` calls the same fallback
  instead of just showing an error. This is deliberately much simpler than the online path, per explicit
  instruction: each dropped waypoint is independently moved to the nearest point on the nearest trail/road
  LINE feature MapLibre currently has rendered from already-downloaded vector tile data — pure nearest-line
  geometry, NOT real path-tracing/routing between points (that's a separate, larger "offline routing" project,
  explicitly out of scope here). A point with nothing within `OFFLINE_SNAP_RADIUS_FT` (150ft) is left exactly
  where it was rather than failing the whole action, and the closing toast reports how many of the total
  points actually found something to snap to ("Snapped 3 of 6 points (offline) — 3 had no nearby trail/road
  data"), a full success toast if every point snapped, or a "no data nearby" toast if none did — this is what
  surfaces which points did and didn't snap, per spec.
  - **Mechanism**: `TRAIL_SNAP_LAYERS` is a fixed list of ~35 real line-carrying layer ids from the vector
    basemap style (topo/topo-dark/aerial+topo all share the same ids, confirmed via direct JSON inspection of
    all 3 style files before writing any code) — every plain road/path/bridge/tunnel centerline layer
    (`road-primary`, `road-path-trail`, `bridge-street`, `tunnel-pedestrian`, etc.), deliberately excluding
    the "-case"/"-bg"/"-low"/"-2-case" paint-only variants (identical underlying geometry to their plain
    counterpart — including them would just double every candidate) and rail/aerialway/ferry (not a hiking/
    driving trail or road in the sense this feature means). Filtered against `map.getLayer()` at call time, so
    a raster-only base layer (plain Aerial, USGS Topo — confirmed via `MAPBOX_STYLES`/`LOCAL_STYLE_FILES` to
    have zero of these layers) simply yields an empty filtered list and every point is correctly left
    unsnapped, no special-casing needed.
    For each point: `map.project()` to pixel space, compute a search-radius bounding box (150ft converted to
    CSS pixels at the point's OWN latitude and the map's CURRENT zoom via the existing `metersPerPixelAtZoom`
    helper — a fixed pixel radius would balloon into miles of real distance at a low zoom and shrink to
    nothing at a high one, so the radius is always a real 150ft regardless of zoom), `map.queryRenderedFeatures`
    that box against the filtered layer list, then for every candidate LineString/MultiLineString segment
    compute the nearest point via `nearestPointOnSegmentPx` (a pixel-space sibling of the pre-existing
    `distToSegmentSquared` used elsewhere for vertex-edit hit-testing — same t-clamp projection math, but
    returns the winning point itself, not just its squared distance, since the caller needs to `map.unproject()`
    it back to lng/lat). The globally nearest point across all candidate segments within the radius wins; no
    candidates within radius returns null.
  - **Marker sync, no parallel "snapped" array**: unlike the online ORS path (which stores a separate
    `snappedPoints` array — the traced route geometry can have far more vertices than the original points, so
    a parallel array makes sense there), the offline fallback has the SAME point count in and out (one
    snapped point per input point, no path tracing), so `snapDrawnRouteOffline()` just reassigns `drawPoints`
    in place and calls `drawMarkers[i].setLngLat(...)` to move each real marker to match — `snappedPoints`
    stays null, and `draw-finish-btn`'s existing `(snappedPoints || drawPoints)` fallback picks up the
    offline-snapped result for free, no changes needed there.
  - **Verification**: standalone Node test (`test_offline_snap_math.js`, 10/10 assertions) confirmed
    `nearestPointOnSegmentPx`'s pure math against known synthetic inputs before touching a browser —
    perpendicular projection onto a segment midpoint, clamping to an endpoint when the nearest point falls
    outside the segment, a diagonal segment, a degenerate zero-length segment (no NaN/Infinity), picking the
    nearer of two candidate segments, and the real-feet-to-pixels radius conversion shrinking correctly at a
    lower zoom for the same real-world distance. Live verification hit a real constraint: this sandbox's
    Mapbox vector-tile access is blocked (confirmed in every prior session touching road/terrain data), so the
    real `TRAIL_SNAP_LAYERS` road layers never have real rendered data to snap to here — worked around with a
    small debug hook (`window.FieldMapDebug.nearestTrailPointOffline(lat, lng, layerIdsOverride)`, mirroring
    the established `window.FieldMapDebug` pattern from Sessions 32-34) whose optional layer-list override
    let this session point the EXACT SAME real mechanism at Hydrography flowline data instead — a different,
    already-reachable USGS-sourced line layer, proving the query/project/nearest-segment/unproject pipeline
    itself (which is completely layer-agnostic) against genuinely real MapLibre-rendered line geometry rather
    than synthetic data. Confirmed live via the already-connected Chrome browser extension: a point offset 5px
    from a real hydro flowline vertex (near the Verde River, AZ) snapped to a point measured at 0.483px
    perpendicular distance from the real line geometry — essentially exact; a point offset further than the
    150ft radius correctly returned null; a deliberately far-away point (no line within miles) also correctly
    returned null. Then, using the REAL production `TRAIL_SNAP_LAYERS` (not the debug override) against a
    real drawn 2-3 point route: confirmed clicking "Snap to trail" while `navigator.onLine` was forced false
    never attempted the ORS fetch at all (monkey-patched `window.fetch` confirmed zero calls to
    `openrouteservice`) and correctly showed "Couldn't snap — no downloaded trail/road data near these
    points" with all points left unchanged (expected here, since no real Mapbox road data can load in this
    sandbox to snap to); separately, with `navigator.onLine` forced true but the ORS fetch itself made to
    reject, confirmed the `.catch()` fallback fired identically — proving both trigger paths (upfront offline
    check, and catch-all on any live failure) correctly reach the same fallback. **One real sandbox gotcha
    hit and worked around this session, not an app bug**: this environment's browser tab rendering pipeline
    stalled hard on several attempts (WebGL canvas staying solid black, `queryRenderedFeatures` returning 0
    despite a populated GeoJSON source, `isStyleLoaded()` never flipping true) in a way that even the
    established "force-foreground via screenshot" fix (documented in Sessions 27-28 for `requestAnimationFrame`
    throttling) didn't reliably clear — worse than earlier in this same session. Resolved by opening a
    completely fresh, minimally-loaded tab rather than continuing to fight an already-degraded one; JS/data-
    level app state (drawPoints, layer/source existence, click handling) was confirmed fully functional
    throughout even while the visual paint was stuck, via `getStyle().layers.length` and real interaction
    tests, distinguishing this from an actual functional regression. `node --check` confirmed clean syntax on
    all 4 extracted inline `<script>` blocks and service-worker.js.
- Offline tile cache-key parity + protected downloads + boot timing (Session 49) — see the "Current state"
  entry above for the incident this fixes and the root cause; this entry is the mechanism detail.
  - **`patchStyleForOfflineTileParity(styleObj)`** (index.html, right above `loadStyle()`): runs at the end of
    `loadStyle()`'s `.then(function(text){...})`, right after `JSON.parse(text)` and right before the result
    is cached in `styleCache`/returned — so it applies uniformly to all 3 local pre-transformed style files
    (topo/topo-dark/aerial-streets, whose `mapbox://` refs are already rewritten to `.json` TileJSON URLs by
    `refresh-style.js` before this even runs) AND the one remote style (`aerial`, Mapbox Studio's
    `satellite-v9`, whose raw `mapbox://` refs get the same rewrite live via `loadStyle()`'s own regex a few
    lines earlier). It walks `styleObj.sources`, and for any source whose `url` (by this point always a real
    `https://api.mapbox.com/v4/....json?...` string, never a raw `mapbox://` one) contains
    `mapbox.mapbox-streets-v8` (the composite/vectorbase tileset id) or `mapbox.satellite`, replaces that
    source's `{type, url}` TileJSON descriptor with `{type, tiles:[...], maxzoom, attribution}` — a static
    tile-URL-template array using `DOWNLOAD_LAYERS.vectorbase.urlTemplate`/`.satellite.urlTemplate` directly
    (not a re-typed copy of the same string), so if those constants are ever retuned again (as `avgKB` was in
    Session 35), the live renderer and the offline downloader can never drift back out of sync with each
    other. Matched by tileset-id substring in the resolved URL rather than by source object key name or which
    style file it came from, specifically so it works identically for `aerial-streets-style.json`'s oddly-
    named `"mapbox://mapbox.satellite"` source key and for whatever key name Mapbox's own `satellite-v9`
    Studio style happens to use — confirmed via reading the actual style JSON that the key name genuinely does
    vary between files, so matching on it would have been fragile. `maxzoom` is set from
    `DOWNLOAD_LAYERS.vectorbase.maxNativeZoom`/`.satellite.maxNativeZoom` (16/19) so MapLibre over-zooms
    (client-side upscale) past native resolution rather than requesting tiles beyond what the downloader's own
    zoom range ever caches — the same pattern already used for USGS Topo/Public Land/DEM.
  - **Accepted tradeoff, deliberately not left silent**: switching from a TileJSON descriptor to a static
    `tiles` array means MapLibre never fetches Mapbox's TileJSON response for these two sources at all — which
    is the whole point (no TileJSON fetch means no sku rotation), but it also means the `attribution` string
    that response would have carried is gone. Explicit `attribution` strings (standard Mapbox-required
    copyright text — `© Mapbox © OpenStreetMap` for the vector composite, `© Mapbox © Maxar` for satellite)
    were added to each replacement source so the map's `attributionControl` doesn't silently lose Mapbox's
    required attribution line. This exactly mirrors the DEM fix, which didn't need this same tradeoff handled
    since a terrain/elevation-only source was never independently shown in the visible attribution corner to
    begin with.
  - **`OFFLINE_DOWNLOAD_HEADER`** (`'X-FieldMap-Offline-Download'`, declared identically — no shared-constant
    mechanism exists across a classic script and a separate service worker file — in both `index.html`, right
    above `fetchAndCacheTile`, and `service-worker.js`, right above the `fetch` listener): a second, independent
    layer of protection on top of the cache-key-parity fix above, covering the general design gap it doesn't:
    the plain stale-while-revalidate strategy for `TILE_HOSTS` has never distinguished "casually browsed, safe
    to silently refresh in the background" from "deliberately downloaded for offline use, must never be
    silently replaced" — ANY successful (`200`) background re-fetch for ANY tile host unconditionally
    overwrote whatever was cached, sku rotation or not. `fetchAndCacheTile` (index.html) now reads the real
    network response's bytes into a `Blob` (the response hasn't been consumed yet at that point) and
    reconstructs an equivalent `Response` around them with one added header before calling `cache.put` — a
    fetch() `Response`'s headers can't be mutated in place, so this rebuild is the only way to stamp it.
    The service worker's `TILE_HOSTS` handler checks `cached.headers.get(OFFLINE_DOWNLOAD_HEADER)` BEFORE ever
    constructing a `fetch(req)` call at all: if present, it returns `cached` immediately with **zero** network
    request attempted — not a "validate before overwrite" check (rejected as the harder, less certain option;
    there's no reliable generic way to define "degraded" across tile formats/hosts), but a permanent skip,
    for the lifetime of that cache entry, regardless of how many further app sessions or connectivity blips
    occur. Casually-browsed (unprotected) tiles are completely unaffected — same stale-while-revalidate
    behavior as before, verified via a standalone simulation (below) showing a protected URL triggers zero
    fetch calls while an unprotected URL still revalidates on every request, including repeated ones.
  - **`[BOOT]` timing instrumentation** (index.html): `console.time`/`console.timeEnd` pairs, all prefixed
    `[BOOT]` for easy console filtering, covering every stage identified during the Session 49a investigation
    as a plausible contributor to the separately-reported ~8s white-screen-on-every-launch symptom:
    `loadState()` (localStorage/window.storage read+parse — logs pin/track counts alongside the timing, so a
    slow result can be correlated with how much data the account has accumulated), the synchronous portion of
    the boot `.then()` chain from `createMap()`'s call up through the loading-overlay hide (bindUI, marker/
    track/polygon/bearing rebuild, `renderPinList` — explicitly logged as NOT meaning the map is ready, since
    `createMap()` itself returns before its own async style resolution completes), `loadStyle()`'s own
    fetch+regex-transform+`JSON.parse` cost (labeled per style name), the gap from `loadStyle()` resolving to
    the real `maplibregl.Map` object existing, `Map()` construction to the first `style.load` event, and
    (guarded on the same `overlayDataRestoredOnInit` flag the existing overlay-restore code already uses, so a
    later manual base-layer switch — which also fires `style.load` — doesn't try to end an already-consumed
    timer label) first `style.load` to both the first `render` event (a cheap, standard "first paint" proxy —
    explicitly logged as NOT proof real tiles are visible, since MapLibre fires `render` on essentially every
    GL frame including background-only ones) and first `idle` (the more meaningful "everything the style/
    sources currently need has finished loading" signal). Deliberately instrumentation-only per explicit
    instruction — no fix attempted for the white-screen symptom itself this session, since the leading
    candidates (a possible `EPQS_TIMEOUT_MS` red herring investigated and not confirmed on the critical boot
    path, or something device/data-scale-dependent) couldn't be distinguished from static code review alone.
  - **Verification, and what's still sandbox-blocked**: a standalone Node script simulated the FULL
    `loadStyle()` transform pipeline (the same sprite/glyphs/url/line-join regexes, token substitution,
    `JSON.parse`, then `patchStyleForOfflineTileParity`) against the real `topo-style.json`, `topo-dark-
    style.json`, and `aerial-streets-style.json` files on disk, and confirmed the resulting composite source's
    `tiles[0]` template, interpolated for a sample z/x/y, is byte-identical to `tileUrlForLayer('vectorbase',
    z,x,y)`'s output for all 3 files, and confirmed the same for `aerial-streets-style.json`'s satellite source
    against `tileUrlForLayer('satellite',...)` — not assumed correct from reading the code alone. The
    protect/skip-fetch mechanism was verified with real `Headers`/`Response` Web API objects (Node 24 has both
    as globals) against a minimal `Map`-backed mock of the Cache Storage container (the one piece genuinely
    unavailable outside a browser/SW context): confirmed a downloaded-and-marked tile is served with zero
    network fetch calls, while a separate unprotected URL still triggers a real fetch on every single request
    including repeated ones — no regression to existing casual-browsing behavior. `node --check` confirmed
    clean syntax on all 4 extracted inline `<script>` blocks and `service-worker.js`. **What could not be
    verified from this sandbox, flagged rather than silently assumed**: the remote `aerial` style
    (`satellite-v9`)'s actual live JSON structure — the fix's tileset-id-substring matching should apply to it
    identically regardless of source-key naming (unlike the local files, this couldn't be confirmed against
    the real fetched document, since this sandbox's Mapbox v4/Studio API access is blocked, the same standing
    limitation documented in every prior session touching DEM/vectorbase); the actual field-trip incident
    scenario end-to-end (download an area, get brief real connectivity, go back offline, confirm tiles still
    render — the real-world reproduction this fix is meant to solve); and the `[BOOT]` timing numbers
    themselves, which need a real device to mean anything. All three are flagged as the required follow-up
    real-device test, not silently treated as already covered by the sandbox verification above.
  - **Session 50** — the `[BOOT]` markers above only ever wrote to `console.time`/`console.timeEnd`, which
    Session 49 itself flagged as needing a real device but didn't anticipate would be COMPLETELY unreachable:
    the actual testing environment is an iOS home-screen PWA with no Mac available for remote Safari
    inspection, so there is no console to read at all in practice, not just an inconvenient one. This session
    made the same numbers viewable on the phone screen directly, with no computer.
    - **`bootMark(name, startedAtMs)`** (replacing the plain `console.time`/`console.timeEnd` pairs) computes
      `Math.round(performance.now() - startedAtMs)`, both logs it (`console.log`, for anyone who DOES have
      DevTools) and records it into `bootTiming.stages[name]` — one call site for both outputs, so they can
      never drift out of sync the way separately-maintained `console.time` calls plus manual `performance.now()`
      bookkeeping could. Wired into every stage Session 49 already timed: `loadState`, `syncBootWork` (the
      createMap() call through the loading-overlay hide), `styleFetchAndParse (<name>)` (inside `loadStyle()`,
      guarded by a new `bootStyleFetchTimed` flag so only the FIRST call — boot — is folded into the persisted
      summary; a later manual base-layer switch still logs live but doesn't overwrite the boot numbers),
      `styleResolveToMapConstructed`, `mapConstructedToFirstStyleLoad`, `firstStyleLoadToFirstRender`, and
      `firstStyleLoadToIdle` (both guarded by the same pre-existing `overlayDataRestoredOnInit` flag the
      overlay-restore code already used, for the same "don't let a later style switch overwrite boot numbers"
      reason).
    - **`finalizeBootTiming()`**, called once from the `map.once('idle', ...)` handler right after
      `firstStyleLoadToIdle` is recorded — the point at which every stage this session cares about has a real
      number. Builds `bootTiming.meta` (app version, ISO timestamp, `navigator.onLine`, pin/track counts, the
      launch-gap classification below) and a plain-text `bootTiming.summaryText` (stage names + ms, human-
      readable directly — no JSON parsing needed to read it), then persists BOTH the full object
      (`BOOT_TIMING_KEY` = `'field-map-boot-timing-v1'`, "most recent launch") and a capped rolling history
      (`BOOT_TIMING_HISTORY_KEY`, last `BOOT_TIMING_HISTORY_MAX` = 10 launches, compact per-entry — stage
      timings, gap label, total) to `localStorage`. The history exists specifically because a single snapshot
      can't answer "is this happening every time" — exactly the question this instrumentation exists to
      answer — only a trend across several real app opens can.
    - **On-device viewer**: `showBootTimingDebugView()` reads both localStorage keys and renders them as plain
      text into a new `#boot-timing-modal` (a `<pre>` block + Copy/Close buttons, styled like every other
      `.modal-overlay` in this file). Reached via 5 taps on `#about-version` (Tools → About) within a 2.5s
      window between consecutive taps — a slower tap resets the count, so casually reading the About panel
      can't trigger it by accident. Two other options were considered and rejected: an auto-shown toast (more
      moving parts — timing, dismissal, risk of interfering with normal use — for no real benefit over a
      trigger the user only reaches when they actually want it) and a `?debug=boot` URL parameter (rejected
      specifically because a standalone iOS home-screen PWA has no visible/editable address bar to append a
      query string to — the tap pattern needs no more explanation than "tap the version number a few times,"
      reachable identically whether the app is opened as an installed PWA or in Safari directly). If boot
      hasn't reached `idle` yet this session (or never does), the viewer reads the PREVIOUS session's numbers
      instead and says so explicitly, rather than showing an empty view — and if NO prior capture exists at
      all, it says that plainly too (itself a real finding: it means the map has never once finished its
      initial load on this device since storage was last cleared, not just delayed it).
    - **Cold-launch vs backgrounded-reclaim (`classifyLaunchGap()`)**: reasoned through carefully before
      writing any code, since the literal ask ("distinguish cold launch from warm resume") doesn't map cleanly
      onto what this JS environment can actually observe — a genuine warm resume (app briefly backgrounded,
      still alive in memory) by definition never re-executes ANY of this script; the JS context, its timers,
      and the already-hidden loading-overlay all just persist untouched, so there is no `[BOOT]` work to
      measure in that case at all, not a fast one. What CAN be measured, and is the actually useful diagnostic
      for the reported symptom, is the reverse question: whenever this boot code DOES run (always either a
      genuine fresh launch or a forced full reload), how long was the app backgrounded beforehand?
      `BOOT_LAST_ACTIVE_KEY` (`'field-map-last-active-v1'`) is refreshed to `Date.now()` on `visibilitychange`
      to `'hidden'`, on `pagehide`, and (belt-and-suspenders, in case a hard OS-level kill never fires either
      of those) every 15s while genuinely visible. `classifyLaunchGap()` — computed exactly once, immediately,
      as one of the very first statements this script executes (before its own periodic re-marking could ever
      overwrite the value being read) — diffs `Date.now()` against that stored timestamp and buckets it: no
      prior record at all (first launch, or storage cleared), `<60s` (labeled SUSPICIOUS — a full reload right
      after only being backgrounded for under a minute points at aggressive OS process reclaim, not a normal
      cold start, and is flagged as a DIFFERENT, more serious problem than anything optimizable in the boot
      sequence's own code), `<30min` (a "fairly short, worth noting" gap), and anything longer (a normal,
      expected cold start). Also captures the standard `PerformanceNavigationTiming.type` (`'navigate'` vs.
      `'reload'` vs. `'back_forward'`) alongside the homegrown gap heuristic as a second, complementary signal
      — neither is perfectly definitive alone (the standard API distinguishes how the navigation happened but
      not why; the gap heuristic infers "was this suspiciously soon after backgrounding" but nothing else), so
      both are surfaced together rather than collapsed into one verdict.
    - **Verification**: extraction-based tests, not a reimplementation — the actual function source
      (`formatGapDuration`/`classifyLaunchGap`/`bootMark`/`finalizeBootTiming`/`showBootTimingDebugView`/
      `copyBootTimingText`) was extracted verbatim from `index.html` via a line-range slice and `eval`'d
      against a minimal set of mocked browser globals (`localStorage`, `performance.now`/`getEntriesByType`,
      `document.getElementById`, `navigator`, `setTimeout`/`setInterval`), specifically so any bug in the
      shipped code would show up in the test rather than only in a hand-copied approximation of it. Confirmed:
      all 4 gap-classification buckets (no record / <60s SUSPICIOUS / <30min / normal) produce the correct
      label for representative gap values; `bootMark` correctly computes and records elapsed ms; a full
      `finalizeBootTiming()` run produces a summary containing every stage and the gap label, and persists it;
      pushing 15 sequential captures through `finalizeBootTiming()` confirmed the history array stays capped
      at exactly `BOOT_TIMING_HISTORY_MAX` (10), never growing unbounded; `showBootTimingDebugView()` correctly
      reads both keys back and includes a "Recent launches" section listing prior captures. The tap-pattern
      trigger logic (inline in `bindUI()`, not a standalone extractable function) was verified separately with
      a small deterministic fake-clock simulation of the identical logic: 5 rapid taps trigger exactly once; 3
      taps followed by a 3-second gap (past the 2.5s reset window) then 2 more taps does NOT trigger (confirms
      the reset actually works, not just the trigger); two full 5-tap sequences back to back trigger exactly
      twice. One real sandbox-only artifact hit and confirmed harmless, not a product bug: this sandbox's
      Node 24 has its OWN built-in global `navigator` object (added for web-API compatibility) that lacks an
      `onLine` property and can't be shadowed by a test mock, which made the extraction-based test's captured
      `Online:` field read `null` instead of the mocked `true` — confirmed via isolated reproduction that this
      is purely a Node-vs-browser global-object collision specific to this test harness, not a flaw in the
      shipped code (`navigator.onLine` is a completely standard, universally-supported property in every real
      browser/WKWebView target this code actually runs in). `node --check` confirmed clean syntax on all 4
      extracted inline `<script>` blocks and `service-worker.js`. **Still needs a real device, flagged rather
      than assumed covered by the above**: the actual boot-timing numbers this instrumentation captures, the
      cold/warm classification's real-world accuracy (does a genuine background-then-resume on a real iOS
      PWA actually skip this code entirely, as reasoned, or does iOS's WKWebView lifecycle behave differently
      in some edge case not obvious from spec reading alone), and whether 5 taps on the real device's screen
      (touch, not a mouse click event) fires the same `'click'` event this trigger listens for (expected to,
      since `'click'` is the standard synthesized event for a tap on essentially every mobile browser, but not
      independently confirmed here).
  - **Session 51** — two follow-ups, both triggered by real captured data contradicting Session 50's own
    output rather than by further code review alone.
    - **Navigation Timing capture, closing the exact gap the data exposed**: a real device capture showed
      this app's own [BOOT] stage timers summing to only ~600-665ms while the actually-observed cold-launch
      delay was ~8s — meaning roughly 7+ seconds were elapsing somewhere no marker added so far could see,
      by construction: every Session 49/50 timer starts measuring only once `__bootLoadStateStart` (the
      first line of this app's own boot chain) is reached, so anything before that point — network fetch of
      `index.html` itself, service worker startup/interception, parsing and executing every synchronous
      `<script>` tag (`maplibre-gl.js` plus this file's own huge inline classic script) — was structurally
      invisible no matter how many more in-app timers were added. `captureNavigationTiming()` reads
      `performance.getEntriesByType('navigation')[0]` — a `PerformanceNavigationTiming` entry the browser
      populates automatically, with zero app-code involvement, covering exactly that blind spot — and copies
      out `type`/`redirectCount`/`transferSize`/`encodedBodySize`/`decodedBodySize`, the full network-timing
      chain (`fetchStart` through `responseEnd`), `workerStart` (when the service worker thread itself
      started handling the request — a direct signal for SW-startup-specific latency), and the document-
      parse lifecycle (`domInteractive`/`domContentLoadedEventStart`/`End`/`domComplete`/`loadEventStart`/
      `End`). Captured once, from `finalizeBootTiming()` at map-idle time (not earlier), specifically so
      late-lifecycle fields like `domComplete`/`loadEventEnd` have real values rather than the `0` they'd
      read as before their events fire — a genuinely-still-0 field at capture time is labeled explicitly
      ("event may not have fired yet at capture time") rather than silently printed as a misleadingly-precise
      "0ms". `finalizeBootTiming()` also now stamps `bootTiming.meta.loadStateStartedAtMs` (the raw
      `performance.now()` value at the moment `__bootLoadStateStart` itself was set, captured once, early, at
      the actual boot-chain start — not recomputed later) and surfaces it as `preAppCodeGapMs`, both in the
      readable summary (a `>>>`-prefixed headline line, deliberately visually distinct from the rest) and in
      the persisted history — this single number directly answers "how much of an observed delay happened
      before this app's own code even started," without needing to manually diff it against any nav-timing
      field by hand. The summary text also computes readable deltas between adjacent nav-timing milestones
      (TTFB, download time, HTML parse, sync-script-execution-to-DCL, DCL-to-domComplete, domComplete-to-load)
      and a `shellSource` classification (`transferSize:0` + real `decodedBodySize` → served from cache,
      either the browser's own HTTP cache or the service worker's Cache Storage; `transferSize>0` → a real
      network fetch happened) — directly answering the "cache vs. network" half of the task with a standard,
      already-browser-maintained signal rather than inventing a new one.
    - **Force-close vs. OS-reclaim: investigated, found genuinely indistinguishable, and the misleading
      output fixed rather than left as-is**. The trigger for this: a real captured data point where a
      2-minute background gap was labeled "SUSPICIOUS — possible aggressive OS process reclaim" by Session
      50's classifier, which turned out on inspection to be an entirely ordinary user-initiated force-close
      via the app switcher — exactly the false-positive the task's own framing anticipated. Investigated,
      per explicit instruction, whether a reliable distinguishing signal exists before writing any code that
      might paper over the gap with something that looks authoritative but isn't: it does not, for a
      structural reason rather than a missing API this app simply hasn't wired up. Both scenarios are
      identical from a page's own JS: `visibilitychange` to `'hidden'` fires the same way on backgrounding
      regardless of what happens next; a user swiping the app away in the task switcher and the OS silently
      killing a backgrounded process under memory pressure are BOTH abrupt terminations from WebKit's own
      perspective, and `pagehide`/`beforeunload` are explicitly documented as unreliable on mobile Safari/
      WKWebView for exactly this class of background termination — neither is guaranteed to fire in either
      scenario, and even when one does fire, nothing in its payload says why the process is going away.
      There is no Page Visibility/Lifecycle API, past or proposed, that exposes OS-level termination cause to
      page JS — a deliberate platform boundary (telling a page "the OS is reclaiming you for memory" vs. "the
      user is closing you" would leak information about other running apps/system state), not an oversight
      this instrumentation could route around with cleverer event listening. Gap DURATION alone doesn't
      substitute for this either, which is exactly why the false positive happened: a deliberate force-close-
      and-reopen can happen within seconds (the real 2-minute data point) just as easily as an OS reclaim can
      happen after hours backgrounded — short gap does not imply reclaim, long gap does not imply deliberate
      closure. `classifyLaunchGap()` no longer attaches any causal verdict to the gap it reports — every
      bucket now states plainly that cause is not determinable from web code, names both possibilities without
      picking one, and points at the code comment above the function for the full reasoning, so the
      limitation is visible wherever the label is shown (on-screen, in the persisted summary, in history), not
      buried only in a source comment nobody in the field could read anyway. One real regression caught and
      fixed while rewriting this, not shipped: collapsing the old multi-branch classifier (which had a
      seconds-precision path specifically for its now-removed sub-60s SUSPICIOUS case) down to one neutral
      branch would have silently lost second-level precision for genuinely short gaps — restored via a
      dedicated sub-minute branch in `formatGapDuration()` itself, so e.g. a real 15s gap still reads "15s",
      not a rounded-away "0 min", right when short gaps are the more interesting case to see precisely.
    - **Verification**: extraction-based tests (the real `captureNavigationTiming`/`finalizeBootTiming`/
      `classifyLaunchGap`/`formatGapDuration`/`showBootTimingDebugView` source pulled verbatim from
      `index.html`, run against a realistic mocked `PerformanceNavigationTiming`-shaped object and mocked
      browser globals, not a reimplementation). Confirmed: sub-minute gap precision restored (15s reads
      "15s", not "0 min"); no gap size of any duration (15s/2min/5min/5h/3d all tried) produces "SUSPICIOUS"
      wording, and all name both force-close and reclaim as possibilities with an explicit "not determinable"
      disclaimer; the no-prior-record case is unaffected; `preAppCodeGapMs` correctly equals the raw
      `performance.now()` value captured at boot-chain start; the nav-timing section correctly classifies a
      `transferSize:0`/`decodedBodySize>0` shape as cache-served and a `transferSize>0` shape as network-
      served; a still-zero milestone field (simulating capture happening before `domComplete`/`loadEventEnd`
      fire) is labeled "may not have fired yet" rather than printed as a bare misleading "0ms", and its
      derived delta correctly reads "n/a" rather than a nonsense negative/zero number; `navTiming` and
      `preAppCodeGapMs` both persist correctly to `localStorage` (current capture and rolling history); the
      history cap still holds at exactly `BOOT_TIMING_HISTORY_MAX` after these changes; the on-screen debug
      view's "Recent launches" section correctly includes the pre-app-code gap per history entry. Two of
      these test runs initially reported false failures, both traced to test-harness mistakes (a DOM mock
      that returned a fresh object on every `getElementById` call instead of caching one per id, and a test
      not pre-populating `loadStateStartedAtMs` the way the real boot chain always does before
      `finalizeBootTiming()` can run) — corrected and re-verified, not silently ignored; neither was a flaw
      in the shipped code. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks
      and `service-worker.js`. **Still needs the real phone, flagged rather than assumed covered**: the
      actual Navigation Timing numbers this instrumentation captures on the affected device, and whether the
      "not determinable" framing itself holds up as the complete picture on real iOS WKWebView lifecycle
      behavior (this session's investigation is grounded in documented, general mobile-Safari/WKWebView
      platform behavior, not something verifiable by reproducing an actual backgrounding-then-reclaim
      sequence from this sandbox).
  - **Session 52** — service worker internal timing + Cache Storage size reporting, directly triggered by
    Session 51's own Navigation Timing capture: a real device showed ~8.4 of ~8.68 reported cold-launch
    seconds sitting between `fetchStart` and `responseStart` for the shell's own navigation request, with
    `transferSize:0` (served by this service worker's own cache-first handler, not the network) and TTFB
    reading `n/a` — exactly the scenario MDN documents Navigation Timing as unreliable for once a service
    worker is intercepting the response (the browser can't cleanly attribute "waiting on the SW" the way it
    attributes real network wait time). The fix isn't a smarter page-side measurement — none can see inside
    that window — it's measuring from the one place that actually can: the SW's own execution context.
    - **`service-worker.js`'s own internal marks**: `swTiming` (module-scope, `Date.now()`-based throughout —
      deliberately NOT `performance.now()`, since a service worker is a genuinely separate JS execution
      context from the page with its OWN unrelated `performance.timeOrigin`; `Date.now()` is plain wall-clock
      epoch time, identical and directly comparable across every context with zero reconciliation math, and
      sub-millisecond precision doesn't matter at the multi-hundred/multi-thousand-ms scale actually being
      investigated) records: `scriptStartAtMs` (the very first executable line of the file — as early as this
      context can measure itself, and the number that matters most for a REACTIVATION, since install/activate
      only ever run once per SW version and a terminated-then-respawned SW instance skips straight to
      re-executing top-level script and dispatching the pending event), `installAtMs`, `activateStartAtMs`/
      `activateCompleteAtMs`, `firstFetchEventAtMs` (the first `'fetch'` event this SW instance has actually
      seen — a proxy for "genuinely up and dispatching," distinct from merely having started executing), and
      `shellFetch` (`{receivedAtMs, respondedAtMs, durationMs, source}`) — specifically the shell's OWN
      navigation request, identified via `req.mode === 'navigate'` (the standard, reliable signal for "this
      is the top-level document request," not a URL-pattern guess), timed from the moment the fetch handler
      receives it to the moment its branch of `event.respondWith()`'s promise resolves, whichever of the 3
      existing branches (cache hit / network / network-failed-fallback-to-cached-index) actually serves it —
      this is the literal number the task asked for: "time from receiving the shell's fetch event to calling
      respondWith() with a resolved cached response."
    - **Two independent persistence paths, not one, deliberately**: `persistSwTiming()` both `postMessage`s
      the current `swTiming` snapshot to every known client (`clients.matchAll({includeUncontrolled:true})`,
      since a freshly-installing SW's own triggering page isn't yet "controlled" until `clients.claim()`
      resolves — this SW already calls that, but the message can still be sent before it resolves) AND
      stashes an equivalent JSON snapshot in a small dedicated Cache Storage entry (`SW_TIMING_CACHE`,
      `'fieldmap-sw-timing-v1'`, key `/~sw-timing-debug`). The `postMessage` path is fast but NOT reliable on
      its own: on a genuine cold start, this SW mark can fire before the page's own JS has even begun
      executing, let alone registered a message listener, and `postMessage` doesn't queue for a not-yet-
      listening receiver — a missed message is simply gone. The Cache Storage stash is what makes the data
      reliably available regardless of that race, since the page can pull it at its own convenience, any time
      later (used by `finalizeBootTiming()`'s own async enrichment — see below). `SW_TIMING_CACHE` is
      deliberately NOT added to `activate`'s cache-name whitelist (unlike `TILE_CACHE`/`GMU_DATA_CACHE`,
      which hold real user data worth preserving across app updates) — it holds only this session's own
      ephemeral diagnostic marks, and a fresh SW instance repopulates it on its own very next fetch regardless.
    - **Page-side reconciliation (`index.html`)**: `pageNavigationStartEpochMs = Date.now() -
      performance.now()`, computed once, as early in the script as possible — this identity (an absolute
      epoch value for "when this page's own `performance.now()` was 0") is what lets any SW `Date.now()`-based
      mark be converted to the exact same "ms since navigation start" scale every existing `[BOOT]` mark and
      Navigation Timing field already uses, via `fmtSwMs()`. `navigator.serviceWorker.addEventListener(
      'message', ...)` is registered as early as possible in the script (the fast path, matching the race
      concern above) alongside a `enrichBootTimingWithSwTiming()` async pull from `SW_TIMING_CACHE` (the
      reliable path), called once from `finalizeBootTiming()` — deliberately AFTER, never blocking, the
      initial synchronous localStorage write, since this data can legitimately still be in flight at that
      point. A pulled snapshot is only trusted if its own `scriptStartAtMs` is within the last 60s of real
      time — the Cache Storage entry persists across sessions until next overwritten, so a stale multi-
      session-old snapshot must never be silently presented as if it described THIS boot; an honest "no fresh
      data" beats a confidently wrong number.
    - **Cache Storage size reporting**: `measureCacheStorageStats()` enumerates every live cache via
      `caches.keys()` (so it never needs to hardcode/track exact versioned cache names — `SHELL_CACHE` alone
      changes on every session per this file's own bump convention), categorizes each by a stable name
      PREFIX (`categorizeCacheName()`, matched against `fieldmap-shell-`/`fieldmap-tiles-`/
      `fieldmap-gmu-data-`/`fieldmap-sw-timing-` — prefix matching, not exact-name matching, is what keeps
      this from needing to be manually kept in sync with `service-worker.js`'s own version constants), and
      reports each one's entry count (always cheap — one `cache.keys().length`, regardless of cache size)
      plus an approximate byte total. That total is summed from each entry's `Content-Length` HEADER only —
      never a `.blob()` read, which would materialize/decompress every cached response's actual body just to
      measure it, real non-trivial work this diagnostic must not itself add to the very boot-time problem it
      exists to investigate. Above `CACHE_BYTE_SCAN_MAX_ENTRIES` (2000) for any one cache, the per-entry
      header scan is skipped entirely for that cache (still reporting its entry count, just not its byte
      total) — a large offline-downloaded tile area could plausibly hold many thousands of individual tile
      entries, and even cheap per-entry Cache Storage lookups add up in aggregate at that scale.
      `navigator.storage.estimate()` (the standard Storage API) supplies one origin-wide usage/quota total as
      a cross-check that's authoritative even when some per-cache header scans are skipped or a response
      happens to lack a `Content-Length` header (tracked separately as "unknown," never silently counted as
      0 bytes).
    - **Shared async-enrichment pattern**: `buildBootTimingSummaryText()` was extracted out of
      `finalizeBootTiming()` (previously one large inline block) specifically so it can be re-run once the SW
      timing and Cache Storage stats land, without duplicating the whole summary-building block a second
      time. `persistBootTimingRecord(isNewBoot)` replaces the old inline localStorage-write logic — `true`
      (the normal `finalizeBootTiming()` call) pushes a fresh history entry as before; `false` (the two async
      enrichments) updates the SAME history entry already pushed for this boot in place, rather than
      appending a second, duplicate entry for one real launch. `showBootTimingDebugView()`'s "Recent
      launches" history line was extended with the SW-shell-fetch duration and total cache-entry count per
      past launch, directly supporting the size-correlation question across several real app opens, not just
      the latest one.
    - **Verification**: extraction-based tests (the real `service-worker.js` changes verified via
      `node --check` alone, since a genuine `fetch`/`install`/`activate` event sequence isn't reproducible
      outside a real Service Worker execution context; the real page-side functions — `measureCacheStorageStats`/
      `categorizeCacheName`/`enrichBootTimingWithSwTiming`/`buildBootTimingSummaryText`/
      `persistBootTimingRecord`/`finalizeBootTiming` — pulled verbatim from `index.html` and run against a
      hand-built multi-cache mock of the real Cache Storage API, `navigator.storage.estimate`, and
      `localStorage`, not a reimplementation). Confirmed end-to-end: a fake SW timing snapshot stashed in the
      mocked `SW_TIMING_CACHE` is correctly pulled and merged, and the computed "SW script start → shell fetch
      resolved" gap in the rendered summary matches the expected value exactly; a 4-cache mock (23/1500/2/1
      entries respectively) is fully enumerated with correct per-cache entry counts and header-summed byte
      totals (confirmed the 1500-entry tiles cache's byte total equals exactly `1500 × 12000` bytes, matching
      the seeded per-entry `Content-Length` values); a separate 2500-entry mock cache (over the 2000 cap)
      correctly skips its byte scan while still reporting its entry count, with an explicit note explaining
      why; exactly ONE history entry exists after `finalizeBootTiming()` plus both async enrichments run (no
      duplicate push), and that entry carries the enriched SW-shell-fetch and cache-entry-count fields.
      Two rounds of apparent test failures were both traced to test-harness mistakes, not product bugs, and
      both corrected before accepting the results: an async-timing assumption (a fixed 50ms `setTimeout`
      wasn't enough for ~1500 chained mock Cache Storage promises to settle — replaced with a poll-until-ready
      loop) and a mocked `window` object that didn't expose `caches` on itself (the real code checks
      `'caches' in window`, which real browsers satisfy automatically since `window.caches` and the bare
      `caches` global are the same object — the mock needed to replicate that explicitly). A third apparent
      failure (`navigator.storage.estimate` never getting called) was root-caused to the exact same Node 24
      built-in-`navigator`-global collision already documented in Session 50's own entry above — confirmed via
      isolated reproduction, not assumed — a sandbox-only artifact, not reproducible in any real browser/
      WKWebView target. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks and
      `service-worker.js`. **Still needs the real phone, flagged rather than assumed covered**: the actual SW
      timing numbers and Cache Storage sizes on the affected device, and — the core question this session was
      built to answer — whether SW startup/shell-fetch duration actually scales with cache size as
      hypothesized, which requires comparing real measurements across offline downloads of genuinely
      different sizes, not something reproducible from this sandbox.
- Silent Export failure, root cause + fix (Session 53) — bug report: clicking Export produced no visible
  response whatsoever, no error, no console output. Investigated per explicit instruction before touching any
  code: confirmed `#sheet-export-btn`'s click handler WAS firing (no early return, no guard clause, no auth/
  account check anywhere in the chain) — the actual problem was two independent, silent CSS/event-handling
  bugs, both introduced together in the same historical reorg that moved Export out of the sidebar and into
  the Tools sheet.
  - **Git-archaeology**: `git log -S"Export moved to Tools sheet" -- index.html` found the exact commit
    (`32684da`, a generic "Add files via upload" commit with no descriptive message — this repo's entire
    history is bulk uploads, not incrementally-messaged commits) that removed the old
    `<div class="dropdown-wrap"><button id="export-btn">Export</button><div id="export-menu" ...>` structure
    (a real, working `.dropdown-wrap` anchor) and replaced it with a bare `#export-menu` div carrying an
    inline `style="position:fixed;bottom:auto;right:auto;"` override and no wrapping anchor at all.
    `git log -S"sheet-export-btn"` found the companion commit (`6366e7b`, immediately prior in history) that
    introduced the new Tools-sheet trigger button's click handler — already missing `e.stopPropagation()` from
    the moment it was written, not a later regression on top of previously-correct code. Both commits show
    `APP_VERSION = '1.1'` at the time — this repo's version has since climbed to 2.47.x across 50+ tracked
    sessions, meaning Export has almost certainly been completely, silently broken since very early in the
    project's history, undetected the entire time because no session's testing happened to specifically
    exercise the Export button until this bug report.
  - **Bug 1 — CSS positioning, the primary "invisible" cause**: `.dropdown-menu`'s base class rule is
    `position:absolute;top:calc(100% + 6px);left:0;` — designed to be a child of a `.dropdown-wrap`
    (`position:relative`) ancestor, so `top:100%` resolves against that small wrapper's own height, landing
    the menu just below it (exactly how `#sort-menu`, still correctly wrapped, behaves today). The inline
    `position:fixed` override on `#export-menu` changes what `top:100%` is calculated AGAINST — under
    `position:fixed` with no ancestor establishing an alternate containing block (confirmed: no `transform`/
    `filter`/`will-change` anywhere on `#sidebar`/`#sidebar-header`/`#sidebar-header-row2`), percentages
    resolve against the VIEWPORT — so `top:calc(100% + 6px)` becomes "100% of the viewport's own height, plus
    6px," placing the menu's top edge just past the bottom edge of the screen. The menu genuinely opens
    (class toggles correctly, no error) — it just renders entirely below the visible viewport, every time,
    indistinguishable from "nothing happened" to anyone watching the screen. Fixed by removing the stray
    `position:fixed` override entirely and giving `#sidebar-header-row2` (the row `#export-menu` actually
    lives in, now that its own dedicated button is gone) `position:relative` — the exact same anchor mechanism
    `.dropdown-wrap` already provides one element over for `#sort-menu`, just scoped to the whole row instead
    of a single button, since there's no dedicated Export button left in this row to wrap tightly around.
  - **Bug 2 — missing `stopPropagation()`, independent of Bug 1**: `#sheet-export-btn`'s handler hid the Tools
    sheet and toggled `#export-menu`'s `hidden` class with no `e.stopPropagation()` call. Since `export-menu`
    is a member of `OUTSIDE_CLICK_DISMISS_IDS`, the SAME click event — after opening the menu — continued
    bubbling to the document-level outside-click-dismiss listener, which sees `e.target` (the button, inside
    `#tools-sheet`) as genuinely outside `#export-menu` and immediately re-hides it, all within the same
    synchronous event dispatch. This is why a live test of Bug 1's fix ALONE still showed the menu closed
    immediately after clicking — confirmed directly via `element.getBoundingClientRect()` checks before and
    after a real click, and by comparison against `#sort-btn`'s own handler, which already calls
    `e.stopPropagation()` for this exact reason. Fixed by adding the same call, matching the proven pattern.
  - **Account-switching check**: per the original bug report's own context (exporting from a test account,
    intending to import under a different real one), confirmed via direct code review — not assumed — that
    `exportGeoJSON()`/`exportGPX()` contain zero account-specific logic anywhere: both read straight from the
    live, module-scope `state.pins`/`state.tracks`, the same shared state object every other feature in the
    app operates on, populated by whichever account is currently signed in (or guest). There is no stale-
    account assumption, no auth guard, no early return of any kind in either function or in the shared
    `downloadBlob()` helper they both call — the account-switching angle, while the real-world MOTIVATION for
    the bug report, was never actually implicated in the failure itself.
  - **Verification**: live in the already-connected Chrome browser extension against a local
    `python -m http.server`, in guest mode with a real test pin created through the actual tap-anywhere flow
    (not synthetic seeded data). Confirmed Tools → Export now opens the GeoJSON/GPX menu correctly positioned
    directly below the Sort/Bulk-edit row and — critically — STAYS open (both bugs needed fixing together;
    fixing only the CSS positioning still left the menu closing itself in the same click). Confirmed GeoJSON
    export produces a real Blob download (captured via a `document.createElement('a')` monkey-patch, since a
    real native save-file dialog can't be driven by browser automation) whose content is a correct
    FeatureCollection containing the exact test pin's real name/coordinates/tags/notes/state. Confirmed GPX
    export separately, same real pin, correct XML. Confirmed the full round trip — the actual cross-account
    use case the bug report describes — by feeding the exported GeoJSON back through the real import pipeline
    via a programmatic `DataTransfer`/`change` event on the hidden `#import-file` input (the closest
    reproducible proxy for "a different account importing this file," since simulating two genuinely distinct
    signed-in Google accounts isn't feasible in this sandbox): the file parsed correctly, found the same pin,
    and correctly flagged it as a likely duplicate against the still-present original — exactly the expected
    dedup behavior, not a bug. Zero console errors throughout the entire test sequence, confirmed via
    `read_console_messages` with `onlyErrors:true`. One real sandbox/testing-only gotcha hit and resolved
    along the way, not a product bug: after the second (`stopPropagation`) fix was written, a live retest
    still showed the old broken behavior — traced to a stale service worker serving a cached pre-fix copy of
    `index.html`, the same well-documented gotcha noted in many earlier sessions' own testing notes; resolved
    by unregistering the SW and clearing Cache Storage before reloading, not by changing the app itself (a
    real end user gets the newly-bumped `SHELL_CACHE` automatically on their next visit regardless). `node
    --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped
    2.47.3 → 2.47.4 (patch — the CSS/event-handler surface touched is small and localized, even though the
    functional impact of the bug was severe), SHELL_CACHE bumped v159 → v160.
- Wildlife Layers restructure: Big Game/Upland Game/Fish, State Data (Session 54) — replaces the old 2-top-
  level-tab (Habitats/Migrations) + 3-subtab (Big Game/Upland Birds/Small Game) picker with 3 flat top-level
  categories and a species-first flow: pick a species within a category, THEN see only whichever of Habitat
  range / Migrations / State Data actually have data for that specific species — never an option with
  nothing behind it.
  - **Data model**: `WILDLIFE_TOP_CATEGORIES = ['biggame','uplandgame','fish']`, each mapped
    (`WILDLIFE_TOPCATEGORY_SOURCE_CATEGORIES`) to the underlying GAP-habitat file category(s) that feed its
    species list — `biggame → ['big_game']`, `uplandgame → ['upland','small_game']` (Small Game's own
    rabbit/hare species fold in as more group options in the SAME dropdown, presentation-only —
    `small_game-species.geojson` stays its own file/fetch/map-source, unchanged), `fish → []` (no GAP baseline
    exists for fish in this app at all — every fish species comes entirely from a State Data source).
    `wildlifeActive` (the single species-first selection driving every section) gained a `topCategory` field
    on top of its pre-existing `category`/`speciesName`/`codes` shape — `category` is still the underlying
    GAP source category (or `null` for a migration-only/state-data-only species with no GAP layer at all),
    kept for `updateWildlifeMapFilter`'s existing per-category-layer filtering, now just one field among four
    instead of the whole identity. `wildlifeSpeciesGroups(topCategory)` builds each tab's full species list as
    a union of GAP-file species (tagged with their real `category`/`codes`), migration-only species (Big Game
    tab only, resolved through `MIGRATION_SPECIES_NAME_MAP` — see below), and State-Data-only species (any
    tab — e.g. Nevada's Himalayan Snowcock, which has no GAP file entry anywhere in this app) — species
    already covered by the GAP file are never duplicated by the other two, this just widens what's pickable
    to species this app previously had no way to select at all.
  - **Migration species-name reconciliation**: the compiled CMT migration files use different species-name
    strings than this app's own GAP display names (`'Elk'` vs. `'Elk (Rocky Mountain)'`, `'Mule deer'` vs.
    `'Mule Deer'`, case differences throughout) — confirmed by direct inspection of the raw migration GeoJSON
    files, not assumed to match. `MIGRATION_SPECIES_NAME_MAP` (4 entries — Elk/Mule Deer/Pronghorn/White-
    tailed Deer, the only species with both migration AND GAP data) plus `migrationNameForGapSpecies()`/
    `gapSpeciesForMigrationName()` bridge the two directions so a single Big Game species pick correctly
    detects/drives its migration data despite the naming mismatch, without touching the migration data's own
    files or its already-proven filter/render logic (`migrationActiveSpecies` still reads/writes the raw
    migration name exactly as before).
  - **Migrations, now nested not tabbed**: `#wildlife-migrations-section` is a `.layer-section`-styled
    collapsible (collapsed by default, own local expand/collapse handler — NOT registered in the app-wide
    `LAYER_SECTION_IDS`/`layerSectionOpenState` persistence system, since it's nested inside a picker panel
    rather than a top-level Layers-panel section) shown only for a Big Game species with real migration data.
    The 4 Corridor/Stopover/WinterRange/AnnualRange checkboxes, their paint/z-order, and `renderMigrationSublayers`/
    `setMigrationCategoryOn`/`updateMigrationMapFilter` are all UNCHANGED from the pre-Session-54 standalone
    Migrations tab — only their container moved, plus a new `updateMigrationsBadge()` (called from both a
    species-change re-render and every individual checkbox toggle, so it can never drift stale) driving the
    header's "X/4" count, counting only the rows actually shown (3, not 4, for a species with no Annual Range
    data — matching `updateLayerSectionCounts`' own "count only what's offered" convention).
  - **State Data — 5 confirmed sources**: `STATE_DATA_SOURCES[topCategory][stateKey]`, one shared shape
    regardless of the source's own structure — `type:'unified'` (Washington's SWIFD: one statewide layer,
    species is a data ATTRIBUTE not a layer boundary, so it's offered for every fish species with an explicit
    UI note that it isn't filtered to just the one picked) or `type:'perSpecies'` (Oregon/Arizona/Utah/Nevada:
    `species: { name: { base: <FeatureServer root>, layers: { semanticKey: layerId, ... } } }` — `base` may be
    one shared FeatureServer repeated across species with different layer ids (Oregon, Nevada) or a genuinely
    separate FeatureServer per species (Arizona's Trout Challenge, Utah). Either shape resolves identically in
    `loadStateDataLayer()`, which fetches every semantic sub-layer in parallel and merges them into one
    FeatureCollection tagged per-feature with `_sdLayer` (the semantic key), the same "one source, one filter-
    expression-driven paint" pattern Migration corridors already established. Per the task's explicit
    instruction not to guess Utah/Nevada's endpoints from a URL pattern, every REST URL below (all 5 sources)
    was independently confirmed via the ArcGIS Online sharing API's own item catalog
    (`arcgis.com/sharing/rest/search`), then verified live against each resulting FeatureServer's own
    `/layers` metadata for real layer ids/geometry types — not inferred from a Hub dataset page's display URL.
    - Washington (fish, unified): WDFW SWIFD, `geodataservices.wdfw.wa.gov/.../SWIFD/MapServer/0`.
    - Oregon (fish, perSpecies): ODFW Fish Habitat Distribution, 32-target-species request resolved to the
      full 34 species actually enumerated in the request (20 coldwater + 14 warmwater) rather than the
      mismatched "18" coldwater count label also given — flagged to the user rather than silently guessing
      which 2 of the 20 named coldwater species to drop.
    - Arizona (fish, perSpecies, own-FeatureServer-per-species): AZGFD Trout Challenge
      (`troutChallenge_<AFS-code>`), 6 species each with 3 layers (streams/lakes/huc12 watershed context).
      "Splake" (SAxSA) is inferred from the AFS hybrid-code convention, not independently confirmed by name
      on an AZGFD page — flagged as lower-confidence.
    - Utah (upland, perSpecies, own-FeatureServer-per-species): 4 individually-hosted DWR datasets (Chukar,
      Ring-necked Pheasant, Gambel's Quail, California Quail), each a single `range` layer.
    - Nevada (all 3 categories — big game, upland, fish): NDOW Big Game Distributions + Small Game
      Distributions (both single shared FeatureServers with species as separate numbered layers — Mule
      Deer/Pronghorn/Bighorn Sheep additionally get a bonus `corridor` sub-layer from the same FeatureServer's
      own separate movement-corridor layers, included since the source already provides them and they're
      directly relevant, not a separate ask) plus NDOW's own "Lahontan Cutthroat Trout Distribution in
      Nevada" SWAP layer (fish) — a single-layer polygon occupancy distribution, found the same way as the
      other 4 sources (ArcGIS Online sharing-API search, not a guessed URL), confirmed live via the same NDOW
      org id (`RyxlXSfFi87rAosq`) as the big-game/small-game services. This was the one source flagged
      missing during this entry's own first draft — caught and wired in during the same session, not left as
      a silent gap.
  - **State picker UI**: `#wildlife-statedata-row`/`#wildlife-statedata-panel` — a compact toggle row inside
    the species picker (`layer-compact-row`, only shown when `stateDataOptionsFor(topCategory, speciesName)`
    is non-empty) opening a small popout `.floating-panel` with just a `<select>`, deliberately matching GMU
    boundaries' own existing "GMU boundaries — Arizona ›" pattern exactly — a MANUAL state picker, not
    auto-detect-by-location, since the point is supporting scouting a state the user isn't currently in. Only
    one state's data is ever loaded/shown at a time per species (`wildlifeStateDataActive`), and switching the
    active SPECIES always clears it (`clearWildlifeStateData()`, called from `setWildlifeSpecies`) so a stale,
    wrong-species layer can never silently keep rendering under a new pick's name.
  - **Two real MapLibre bugs found and fixed only through live testing, not visible from code review alone**:
    the original single `wildlife-statedata-line` layer used a `['case', ['==', ['get','_sdLayer'], 'huc12'],
    ['literal',[2,2]], ['literal',[1,0]]]` data-driven expression for `line-dasharray` to make huc12/corridor
    context layers dashed and everything else solid — `line-dasharray` is a CAMERA-ONLY property in the
    MapLibre/Mapbox GL style spec (unlike `line-color`/`line-width`/`line-opacity`, which all support data-
    driven expressions fine); a data expression on it doesn't throw from `addLayer()` and doesn't appear in
    the console by default — it silently fires an async `'error'` event ("data expressions not supported")
    and the layer is simply never added to the style, with every subsequent operation on it (visibility
    toggles, etc.) becoming a silent no-op. This was caught only by directly inspecting `map.getLayer(...)`
    after a real toggle-on and finding it missing despite `addLayer` having reported no exception — confirmed
    root cause by attaching a `map.on('error', ...)` listener before a manual re-add attempt. Fixed by
    splitting into two fixed-dasharray layers filtered by `_sdLayer` (`wildlife-statedata-line` solid,
    `wildlife-statedata-line-dashed` dashed) instead of one layer with a data-driven dasharray — both toggled
    together by `updateWildlifeStateDataMapFilter()`. The FIRST fix attempt's solid-layer filter,
    `['!in', ['get','_sdLayer'], ['literal',[...]]]`, hit a SECOND, independent bug of the same "silently
    never added, no thrown exception" shape: `!in` is a legacy (pre-expression) filter-mini-language operator
    that expects raw literal values as its operands, not modern expression-style `['get',...]`/`['literal',...]`
    sub-expressions — mixing the two syntaxes produces the same async, easy-to-miss `'error'` event
    ("string expected, array found") rather than a thrown exception. Fixed by using the real expression-style
    negation instead: `['!', ['in', ['get','_sdLayer'], ['literal', [...]]]]`. Both fixes were verified against
    real live AZGFD Trout Challenge data (Apache Trout, Arizona) — a real 26-feature merge (11 streams, 4
    lakes, 11 huc12 polygons) rendering with the correct solid gold fill+stroke on streams/lakes and a
    correct dashed gray outline on the huc12 watershed context boundary, confirmed via a real screenshot
    after a genuinely fresh full page reload (not just the live in-page patch used to iterate on the fix).
  - **Verification**: live via the already-connected Chrome browser extension against a local `python -m
    http.server`, for as long as the session stayed stable (see the gap noted below). Confirmed: the 3-row
    Wildlife section (Big Game/Upland Game/Fish) renders with a correct "0/3" badge and "Select species ›"
    placeholders; opening Fish and inspecting the real rendered `<select>` DOM confirmed the species dropdown
    groups exactly as designed — Coldwater (23: Oregon's 20 + Arizona's 3 AZ-only additions) / Warmwater (14,
    matching Oregon's approved list exactly, zero extras/missing); picking Apache Trout correctly showed ONLY
    the State Data row (no Habitat range/Migrations — expected, fish has neither in this app); the State Data
    picker correctly listed Washington + Arizona but NOT Oregon (Apache Trout isn't in Oregon's species list,
    proving `stateDataOptionsFor`'s per-species filtering is real, not just "show everything"); selecting
    Arizona triggered the real live 3-layer fetch/merge described above. The connected Chrome browser
    extension then entered a state where new tabs/navigations stopped responding (alternating "browser-
    internal URL"/"permission denied for this domain" errors, a tooling breakdown distinct from the
    `queryRenderedFeatures`-freezes-on-a-backgrounded-tab gotcha documented in Sessions 27-28/48, since this
    one blocked navigation/screenshot entirely) — it recovered on its own after a period doing non-browser
    work (the Nevada-fish gap below), and testing continued from there. Second round, after recovery:
    switched to Big Game, picked Elk (Rocky Mountain) — confirmed Habitat range auto-checked with the real
    brown GAP fill rendering, the Migrations section showing with a correct "0/4" badge, expand/collapse
    working via a real click (chevron flips, checkboxes become visible), checking Stopover correctly updating
    the badge to "1/4" live and adding a real second line to the active-layers chip
    ("Elk (Rocky Mountain) migration"), and the State Data picker correctly listing only Nevada (Elk's one
    Big Game source) — selecting it rendered a real third, gold-toned fill layer from NDOW's live service,
    visibly distinct from and overlapping the brown Habitat range fill. **A third real bug found by this
    second round of testing**: the State Data checkbox was genuinely ON and the layer was genuinely rendering
    on the map, but the active-layers chip never grew a 3rd line for it — `setWildlifeStateDataState()` and
    `setWildlifeStateDataOn()` (the two functions that turn State Data on) both updated the map filter and the
    compact-row UI but never called `updateActiveLayersChip()`, unlike every other on/off setter in this file
    (`setWildlifeOn`, `setMigrationCategoryOn`) which always does. Fixed by adding the same call to both
    functions (plus, defensively, to `clearWildlifeStateData()` for any future caller that isn't already
    followed by one, even though `setWildlifeSpecies`'s own existing call already covers its one current call
    site). The browser tooling broke down a second time immediately after this fix was written, before a
    fresh-reload re-verification of it could complete — the fix itself is a direct, minimal addition matching
    an already-proven pattern used identically elsewhere in this same file, not independently re-confirmed via
    a live screenshot after the edit. **Remaining verification gap, flagged rather than silently omitted**:
    Upland Game specifically (shares 100% of the same code already proven working for Big Game and Fish,
    differing only in which catalog entries it reads — not click-tested, but not a different code path
    either), tap-to-identify on the State Data fill layer (`handleWildlifeStateDataFillClick`, an exact copy
    of `migration-fill`'s own already-proven click-handler pattern, not independently click-tested), the
    active-layers-chip fix above (see previous paragraph), and Utah/Nevada's endpoints with real data through
    the actual in-app picker for every source except Nevada big-game/Nevada fish (Arizona and Nevada big-game
    both went through the real in-browser flow this session; Washington/Oregon/Utah/Nevada-fish's REST URLs
    were all independently confirmed reachable — real layer metadata and, for Nevada's fish layer, a live
    `returnCountOnly` query returning a real feature — via direct `curl` against the endpoints, but not driven
    through the app's own UI). `node --check` confirmed clean syntax on all 4 extracted inline `<script>`
    blocks after every edit, including after all three fixes (the two MapLibre-expression bugs and the
    missing-chip-update bug). APP_VERSION bumped 2.47.4 → 2.48.0 (minor — a significant structural change to
    an existing feature, per explicit instruction), SHELL_CACHE bumped v160 → v161.
- Wildlife panel flow fix, unified per-species view, Fish color/geometry correction (Session 55) — three
  related fixes to last session's restructure, all reported from real use.
  - **Root cause of the "category checkbox only works for Upland" bug**: the Layers panel's Big Game/Upland
    Game/Fish row checkboxes called `setWildlifeOn(checked)` directly — the exact same function the species
    panel's own "Habitat range" checkbox calls. That function only ever flips `wildlifeOn` (Habitat range's
    own visibility flag) and only renders anything when `wildlifeActive` already points at a species in that
    category with real Habitat range codes. With nothing selected yet (Big Game/Fish, fresh from a cold
    start) toggling the checkbox set `wildlifeOn = true` but had nothing to show, and
    `updateWildlifeQuickToggleUI()`'s own `isThisCategory && wildlifeOn` computation then immediately snapped
    the checkbox back to unchecked since `isThisCategory` was false — reading as "the checkbox doesn't work."
    Upland only looked functional because Chukar was already the active selection from prior testing, so
    `isThisCategory` was true and the whole thing round-tripped correctly. Not 3 different bugs — one
    function whose behavior depends on state normally only reached by using the panel in a specific order
    first.
  - **The fix — a real master toggle (`wildlifeMasterOn`)**: the category row's checkbox is now a genuine
    master visibility switch, same philosophy as the Aspect master toggle from an earlier session — it
    shows/hides whatever's currently CONFIGURED for the active species (Habitat range's own `wildlifeOn`,
    Migrations' 4 category checkboxes, State Data's `wildlifeStateDataOn`) all together, without touching any
    of those individual configured values. `updateWildlifeMapFilter()`/`updateMigrationMapFilter()`/
    `updateWildlifeStateDataMapFilter()` all now additionally require `wildlifeMasterOn` on top of their own
    existing per-source on-flag before actually setting a layer visible — a two-level AND-gate (configured
    AND master-visible), the same "configuration persists independent of visibility" shape an opacity slider
    surviving a layer being turned off already has elsewhere in this app. `setWildlifeSpecies` resets
    `wildlifeMasterOn = true` on every species change (including clearing back to no species) — without this,
    a master-off left over from a previous species would silently hide whatever the newly-picked species
    auto-enables, which would have looked exactly like "picking a species does nothing," a regression of the
    very bug this fix targets. Persisted via `state.settings.wildlifeMasterOn`, defaulting to `true` both for
    a fresh install and for anyone upgrading from before this session (an already-configured species must not
    silently vanish behind a switch that didn't exist when it was set up).
  - **Unified per-species panel**: the State Data section (checkbox + state `<select>` + note/attribution)
    is now embedded directly in `#wildlife-panel` itself — `#wildlife-statedata-section` — instead of a
    separate `#wildlife-statedata-panel` floating panel reached by tapping a compact "State Data — Select
    state ›" row. The old flow required leaving species selection entirely to pick a state, then leaving
    THAT screen again to get back to the rest of the species' sources (Habitat range, Migrations) — exactly
    the "disconnected flow" reported. `renderStateDataSection(speciesName)` (replacing
    `openWildlifeStateDataPicker`, which only ever ran on a button tap) now runs every time
    `renderSpeciesToggles()` shows the section, so the inline `<select>`/note/attribution/checkbox are always
    correct for whatever species is currently displayed, with no separate "open" step to hook the population
    logic into. Picking a state from the inline `<select>` still auto-activates it (`wildlifeStateDataOn =
    true`, checkbox auto-checks) — matching the existing "picking = activating" pattern rather than adding a
    second explicit step. Tapping a category row (Big Game/Upland Game/Fish) already opened species
    selection directly before this session — confirmed via code read, not a bug, no change needed there.
  - **Fish recolor — gold/tan to blue**: `WILDLIFE_STATEDATA_FILL`/`WILDLIFE_STATEDATA_STROKE` changed from
    `#e8b93a`/`#8a6b1a` (a terrestrial "Habitat range" amber, reported as visually wrong for fish/aquatic
    data) to `#2d6ea8`/`#153e63` (a mid-blue wash + navy outline), matching the look of AZGFD's own Trout
    Challenge site per the task's explicit reference. A new `WILDLIFE_STATEDATA_STREAM_COLOR` (`#4aa8e8`,
    brighter/lighter than the wash) gives streams their own distinct line color within the same blue family,
    rather than sharing the polygon outline's navy. Both colors were deliberately picked further from
    Elevation Range's own existing cyan (`#00D9E8` fill / `#0A7A85` edge — Session 38) than a naive "any blue"
    choice might land, specifically so the two never read as the same overlay if both happen to be active at
    once — a real collision risk the task explicitly called out to check for.
  - **The actual Streams-fill bug and its real fix**: root-caused to `_sdLayer`-name-based filtering — the
    fill layer's filter was `!= 'huc12'`, meaning every OTHER semantic key (including `'streams'`) got the
    fill treatment regardless of its real geometry. Fixed by tagging every fetched feature with a NEW
    `_sdShape` property (`'line'` or `'polygon'`) read directly from its own real GeoJSON `geometry.type` in
    `loadStateDataLayer()`, and filtering the fill/line MapLibre layers on `_sdShape` instead of guessing from
    the semantic key name. This is a more general fix than "exclude stream/streams by name" would have been —
    Washington's SWIFD "range" layer (its one unified fish layer, tagged `_sdLayer:'range'` like every
    polygon `range` source elsewhere in the catalog) is ITSELF a polyline per its own catalog `geometryType:
    'polyline'` metadata, so a name-based exclusion list would have kept mis-rendering Washington's real data
    as a fill even after "fixing" Arizona's streams specifically. Four MapLibre layers now share the one
    source: `wildlife-statedata-fill` (`_sdShape=='polygon'` — range/lake/lakes/huc12, huc12 at a lower
    0.18 opacity as coarse context vs. 0.35 for real distribution data — per the task's explicit "HUC12 =
    fill wash like other area-based overlays," replacing the old outline-only special case),
    `wildlife-statedata-line` (same polygon filter, a thin 1px outline stroke), `wildlife-statedata-line-
    streams` (NEW — `_sdShape=='line'` excluding `corridor`, the brighter dedicated stream color, 2px), and
    `wildlife-statedata-line-dashed` (unchanged shape, now `_sdLayer=='corridor'` only — Nevada's movement-
    corridor lines, since huc12 moved to the fill+outline treatment and no longer needs its own dashed case).
    Tap-to-identify (`handleWildlifeStateDataFillClick`) is now also registered on the new streams layer,
    since streams no longer appear on the fill layer at all and would otherwise be untappable.
  - **Verification gap, flagged rather than silently omitted**: this session could not reach a live browser
    at all — every attempt to load the app (multiple fresh tabs, fully closing and recreating the tab group,
    waiting between retries) left the connected Chrome extension reporting either "browser-internal or
    unparseable URL" or a `Runtime.evaluate` timeout, never actually rendering the page. This is a harder,
    non-recoverable version of the tooling breakdown Session 54 hit partway through (which did eventually
    recover on its own) — this one never did, across the whole session. As a result, NONE of this session's
    changes were verified live — no confirmation that the category checkboxes now function as master toggles
    on Big Game/Fish (not just Upland), no confirmation the unified panel flow actually reads as connected on
    a real screen, no confirmation Fish genuinely renders blue/cyan with visually distinct stream-vs-wash
    treatment, and no confirmation streams actually show as pure lines with zero fill against real Arizona/
    Washington/Oregon data. Every change was instead verified as rigorously as possible without a browser:
    full manual trace of every code path touched (documented above), `node --check` clean on all 4 extracted
    inline `<script>` blocks after every edit, and a full `git diff` re-read end to end before finalizing.
    This is real, un-downgraded risk — a live pass (ideally the real mobile device the task asked for) is the
    first thing that should happen before trusting this session's changes are correct in practice, not an
    optional follow-up.
  - `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped
    2.48.0 → 2.49.0 (minor — real UX restructuring, per explicit instruction), SHELL_CACHE bumped v161 → v162.
- Wildlife panel category checkboxes, cross-tab persistence, Oregon CORS block, Washington pagination
  (Session 56) — this session's hard requirement was explicit: confirm a genuinely working live browser
  FIRST, and if the same rendering failure from Session 55 recurred, stop and report rather than attempting
  more code-only fixes. A real browser WAS confirmed working (JS execution, screenshots, and real page
  rendering all verified before touching any code) and used extensively — most items below were root-caused
  and confirmed-fixed live, not traced by reading code alone, though the browser eventually broke down again
  partway through (see the verification-gap note at the end of this entry).
  - **Big Game grouping, root cause and fix**: `wildlifeSpeciesGroups()`'s sort (`groupIndex` first,
    alphabetical within group as the tiebreaker) was already correct code — the actual bug was one level up:
    `WILDLIFE_GROUP_ORDER` is keyed by the underlying GAP source-category names (`big_game`/`upland`/
    `small_game`), but `wildlifeSpeciesGroups(topCategory)` looks it up by the TOP-CATEGORY id (`biggame`/
    `uplandgame`/`fish`). Session 54 added a bridging line, `WILDLIFE_GROUP_ORDER.uplandgame =
    WILDLIFE_GROUP_ORDER.upland.concat(WILDLIFE_GROUP_ORDER.small_game)`, for Upland Game — but never added
    the equivalent `WILDLIFE_GROUP_ORDER.biggame = WILDLIFE_GROUP_ORDER.big_game` for Big Game, since the two
    key names differ only by an underscore and are easy to mistake for already matching. With no match,
    `groupOrder` silently resolved to `[]`, so `groupIndex()` returned the same value (`groupOrder.length`,
    i.e. `0`) for every species regardless of its real group, degrading the sort to pure alphabetical with a
    header inserted wherever the raw (never-actually-used-for-ordering) group value happened to change —
    exactly the duplicated "Bear" headers reported. Confirmed live via the real rendered `<optgroup>` DOM
    both before the fix (15 fragmented single/double-item groups in alphabetical order, "Bear" appearing
    twice) and after (exactly 5 groups — Deer & Elk/Pronghorn/Mountain Game/Bear/Predators & Small Big
    Game — in the intended hunting-relevant order, each internally alphabetized, "Bear" appearing once with
    both its species correctly together).
  - **"Blackbeard Island Deer" and the curation question**: checked the real data files directly (17
    big_game / 35 upland / 10 small_game species total) rather than assuming a systemic problem — this is a
    small, mostly-legitimate corpus, not an uncurated national list like Oregon's original fish request
    implied might be the case. Found exactly one genuinely out-of-scope entry: `species_code: 'mWTDEn'`,
    whose own `conservation_note` reads "Isolated white-tailed deer population confined to Blackbeard Island,
    Georgia" — confirming the report's own assessment. Removed via a new `WILDLIFE_EXCLUDED_SPECIES_CODES`
    map (keyed by species_code, not name, so a real future species can never be accidentally swallowed by a
    same-named-but-differently-coded entry), filtered out in `loadWildlifeCategory()` at fetch time — this
    excludes it from both the species picker AND actual map rendering, not just the dropdown.
  - **Category checkbox "does nothing with no species selected"**: confirmed the Session 55 master-toggle fix
    itself was real and correctly scoped (verified live: with a species active, the checkbox genuinely gates
    Habitat range + Migrations + State Data together) — this report was a separate, not-yet-addressed
    request: tapping "on" with NOTHING configured for that category should open species selection directly
    instead of staying inert. Implemented identically for all 3 categories via a shared
    `openWildlifeCategoryPicker(topCategory)` (extracted from the existing open-button handler) — the
    checkbox's own change handler now checks `wildlifeActiveByCategory[topCategory]` first; if nothing's
    configured, it reverts its own visual check state and opens the picker instead of calling
    `setWildlifeMasterOn`.
  - **The real root cause of cross-tab data loss (Fish not sticking, Washington self-unchecking)**: Session
    55's own writeup claimed a per-category data model, but the actual code still used ONE SHARED
    `wildlifeActive`/`wildlifeOn`/`wildlifeMasterOn`/`wildlifeStateDataActive`/`wildlifeStateDataOn` set of
    variables for all 3 categories combined — Session 55 never actually reached a working browser to notice
    this. Confirmed live: configuring Big Game (Elk, Habitat range + Migrations) then switching to Fish and
    picking Rainbow Trout + Washington State Data caused Big Game's ENTIRE selection to silently vanish
    (`active-layers-chip` lines for Elk disappeared) the moment the panel was closed — `setWildlifeSpecies`
    unconditionally overwrote the one shared `wildlifeActive` object regardless of which category's species
    had actually changed. Fixed with a genuine per-category data model: `wildlifeActiveByCategory`/
    `wildlifeOnByCategory`/`wildlifeMasterOnByCategory`/`wildlifeStateDataActiveByCategory`/
    `wildlifeStateDataOnByCategory`, all keyed by topCategory (`biggame`/`uplandgame`/`fish`), with every
    read/write site updated to use the correct category's own slot instead of a shared value —
    `updateWildlifeMapFilter`/`updateActiveLayersChip`/`updateWildlifeQuickToggleUI` all now loop over all 3
    categories independently rather than assuming a single active selection. A new `WILDLIFE_SOURCECATEGORY_TOPCATEGORY`
    reverse-lookup (built from the existing `WILDLIFE_TOPCATEGORY_SOURCE_CATEGORIES` map) lets
    `updateWildlifeMapFilter` resolve which top category each underlying GAP layer (`wildlife-{cat}-fill`)
    belongs to. Migrations needed no structural change — it only ever applies to Big Game's own single slot,
    so it stays correct automatically as long as Big Game's own slot isn't wiped by a different tab (the one
    thing that WAS wrong: `setWildlifeSpecies` used to recompute `migrationActiveSpecies` unconditionally on
    every species change, including Fish/Upland picks where `topCategory !== 'biggame'` always made
    `hasMigration` false — silently clearing Big Game's migration selection too whenever a DIFFERENT
    category's species changed; fixed by only touching migration state when `topCategory === 'biggame'`).
  - **State Data needed its own per-category MAP layers, not just per-category JS state**: even with the
    data model fixed, a single shared `wildlife-statedata-source`/`-fill`/`-line`/`-line-streams`/
    `-line-dashed` layer set could only ever display ONE category's selection at a time regardless of what
    the JS remembered — configuring Fish's State Data after Big Game's would have silently overwritten Big
    Game's rendered data on the map even with correct underlying state. Split into 3 independent source/layer
    sets (`wildlife-statedata-{biggame|uplandgame|fish}-*`, 15 layers total), matching the same
    one-source-per-category pattern Habitat range's own GAP layers already used. Tap-to-identify click
    handlers also split per category (one handler factory closing over `tc`, registered per category) so a
    tapped feature's popup always resolves against the correct category's own active selection.
  - **Confirmed live, end to end**: configured Big Game/Elk (Habitat range + Migrations) and, in the SAME
    panel session, Fish/Rainbow Trout + Washington State Data — closed the panel and confirmed via the
    active-layers chip that ALL THREE lines persisted simultaneously ("Elk (Rocky Mountain)", "Elk (Rocky
    Mountain) migration", "Rainbow Trout — Washington data"); confirmed both category rows in the main
    Layers panel showed correctly checked with their own correct species names; reopened the Fish tab and
    confirmed Washington's State Data checkbox was still checked (not self-unchecking, closing out the
    Washington-specific report as the same root cause as the general cross-tab bug, not a distinct one).
  - **Migrations "select all" toggle**: added `#migration-all-toggle`, a checkbox living inside the same
    header `<button>` as the existing expand/collapse chevron (needs its own `stopPropagation()` on both
    click and change or it would also toggle the section's collapsed state) — reflects and drives all
    CURRENTLY VISIBLE categories together (3, not 4, when the active species/herd has no Annual Range data,
    matching the badge's own "count only what's offered" convention), with real tri-state behavior
    (checked/unchecked/indeterminate) via `updateMigrationsBadge()`, which now also owns keeping this
    checkbox in sync alongside the existing "X/4" text.
  - **Oregon's fish data — root cause, and why it can't be fixed from this codebase alone**: live testing
    showed the fetch completing (attribution text updated correctly to "Oregon Dept. of Fish & Wildlife")
    but the resulting FeatureCollection had ZERO features, for a species/layer combo independently confirmed
    to have real data (1,452 stream + 508 lake features via direct `curl`). The browser console showed
    `TypeError: Failed to fetch` — NOT an HTTP error status (which the code already handled), a network-level
    failure indicating the browser's own `fetch()` never got a usable response at all. Confirmed the cause
    directly: `curl -D - -H "Origin: http://localhost:8791" <the real Oregon endpoint>` returns zero
    `Access-Control-*` response headers of any kind, while the identical test against Washington's, Arizona's,
    Utah's, and Nevada's real endpoints all returned proper CORS headers (Washington echoes the sent Origin;
    the three ArcGIS-Online-hosted ones — Arizona/Utah/Nevada, all on `services*.arcgis.com` — send a
    wildcard `Access-Control-Allow-Origin: *`). This is a genuine, permanent, server-side limitation specific
    to Oregon's own self-hosted ArcGIS instance (`nrimp.dfw.state.or.us`) that this app's client-side
    JavaScript cannot work around — the browser's own security model refuses to expose ANY response from a
    cross-origin server that doesn't explicitly opt in via this header, regardless of pagination, retries, or
    request shape; a real fix would require a server-side proxy this app has no infrastructure for, and
    building one was treated as out of scope for this session rather than attempted half-built. Fixed the
    user-facing SYMPTOM instead of the impossible root cause: `loadStateDataLayer`/`fetchStateDataLayerPaged`
    now track whether any page permanently failed and show a real, honest `showToast()` ("Couldn't load this
    state's data — the source server may be unavailable from this app right now.") instead of silently
    showing nothing with no explanation — confirmed live that the toast fires correctly on a genuine fresh
    Oregon fetch failure.
  - **Washington's real, distinct, and fixable bug — silent record-limit truncation**: confirmed live (via
    `curl` against the real endpoint) that Washington's SWIFD table has 73,373 total features, while
    `maxRecordCount` on that server is 2000 — meaning every previous unpaginated fetch was silently returning
    an arbitrary ~2.7% slice of the real statewide data with no error, no warning, and no way to know from
    the app's own UI that anything was missing. This is a very plausible, and separately confirmed-real
    (Oregon's layer 2 and layer 7, for other species, independently found to exceed 2000 records too),
    explanation for "a given user's own area shows nothing" reports even before Oregon's CORS block is
    considered. Fixed with real `resultOffset`/`resultRecordCount` pagination in a new
    `fetchStateDataLayerPaged()` helper, looping until a page returns fewer features than requested (the
    real end of data) — confirmed live via captured network requests showing genuine sequential pages
    (offset 0, 2000, 4000, 6000... all HTTP 200) against the real Washington server, not just code review.
    A second, independent failure mode was found on Oregon's server specifically WHILE building this (via
    direct `curl` bisection, not assumed): asking for more than roughly 300 records in one request on a
    geometrically dense layer returns a bare HTTP 500 with no detail, a lower and harder threshold than the
    documented `maxRecordCount` — the pagination helper adaptively shrinks the page size by 4x on any failed
    page (starting from 2000, so well-behaved endpoints like Arizona/Utah/Nevada's much smaller layers still
    complete in one request) and remembers the working size for the rest of that layer's own pages, rather
    than either hard-coding one page size for every server or retrying the same failing size forever.
  - **A real caching inefficiency found and fixed while testing pagination**: Washington's "unified" source
    (species is a data ATTRIBUTE, not a query filter, per its own catalog note — the identical statewide
    table regardless of which species is picked) was being cached and deduplicated by
    `topCategory|speciesName|stateKey`, the same key shape used for genuinely per-species sources (Arizona/
    Oregon/Utah/Nevada). This meant every time a DIFFERENT species was picked with Washington selected, the
    ENTIRE 73,373-feature table was re-fetched from scratch via a fresh ~35-request paginated fetch — caught
    live via real captured network requests showing two full independent fetch sequences interleaved after
    switching from "Sockeye" to "Brown Trout" with Washington still selected. Fixed by keying unified
    sources' cache/in-flight-dedup by `topCategory|unified|stateKey` (species-independent) instead — a real,
    consequential fix now that pagination actually pulls the full dataset rather than a fast, always-capped
    2000-record fetch that made this redundancy cheap enough not to matter before.
  - **Verification gap, flagged rather than silently omitted**: this session's browser DID work, extensively,
    and was used to root-cause and confirm-fix the majority of the items above with real DOM/network/console
    evidence, not code-only reasoning — a meaningfully more thorough live pass than Session 55 managed. It
    broke down again partway through (the same category of tooling instability documented in earlier
    sessions' own testing notes — new tabs/navigations stopped responding, across multiple fresh tab groups,
    and did not recover for the remainder of the session this time), which is why the following were NOT
    independently re-confirmed live after their code was written, only reasoned through carefully and
    syntax-checked: the "checkbox opens species picker when nothing's configured" fix (item 3) was never
    literally clicked with a truly-empty category, though it reuses the exact `openWildlifeCategoryPicker`
    function already proven working via more than a dozen successful direct calls earlier in this same
    session; the Migrations "select all" checkbox (item 5) was never clicked, only code-reviewed and
    syntax-checked; and Washington's real full-73,373-feature fetch was confirmed correctly PAGINATING via
    real captured network requests (sequential offsets, all HTTP 200) but was not watched all the way to
    completion before the tooling broke down, so the final rendered feature count for a completed Washington
    fetch was not directly confirmed. `node --check` confirmed clean syntax on all 4 extracted inline
    `<script>` blocks after every edit, and a full `git diff` was re-read end to end before finalizing.
    APP_VERSION bumped 2.49.0 → 2.50.0 (minor — same class of change as Session 55), SHELL_CACHE bumped
    v162 → v163.
- Fish z-order, Big Game crash bug, State Data staleness race, Washington render-size limit (Session 57) —
  explicit hard requirement this session: don't mark anything fixed without actual live browser confirmation,
  since code-review-only claims on this exact feature had already been wrong twice. A real, working browser
  was confirmed and used for every item below; where the environment itself made a specific live check
  impractical (the sandbox's map can take anywhere from ~20s to 170s+ to reach `style.load`, observed directly
  this session, on top of Mapbox v4 access being blocked entirely — the same standing sandbox limitation noted
  in dozens of prior sessions), that's flagged explicitly rather than silently claimed as tested.
  - **Item 1 — Fish stream/HUC12 click priority**: root-caused by reading the vendored `maplibre-gl.js`'s own
    `_createDelegatedListener`/`on()` implementation directly, not assumed from the style-spec docs. A
    `map.on('click', layerId, fn)` listener is NOT priority-ordered by paint/z-order at all — each one
    independently re-queries ONLY its own layer at the click point and, on a match, calls `fn(e)` then
    `e.preventDefault()`; every OTHER delegated listener for the same native click checks
    `e.defaultPrevented` first and bails if it's already set. Listeners fire in REGISTRATION order, completely
    independent of which layer visually paints on top. The fill (HUC12/lakes) layer's click handler was
    registered BEFORE the streams layer's, so a tap landing on both was always claimed by the fill first,
    regardless of what was actually visible on top. Fixed by registering the streams handler first. Separately
    — and this genuinely is the correct place for a paint-order fix, since HUC12/Lakes/range all share the ONE
    `wildlife-statedata-{tc}-fill` layer — added a `_sdSortKey` property (`huc12` → 0, everything else → 1,
    tagged once in `fetchStateDataLayerPaged`'s existing per-feature tagging step) feeding `fill-sort-key`/
    `line-sort-key` on that shared layer, the same technique already proven for Migration corridors' identical
    "which overlapping feature from a merged source paints on top" problem, rather than depending on merge/
    concat array order (which is what the OLD, silent behavior actually was — `STATE_DATA_SOURCES` entries
    happen to declare `huc12` last in most species' `layers` object, so it was ending up LAST in the merged
    FeatureCollection → visually on top → also winning `queryRenderedFeatures`' own topmost-first ordering
    within that one shared layer). Verified live: found a REAL overlap point via a proper point-in-polygon
    scan of Arizona's real Apache Trout data (a huc12 polygon named "Upper Silver Creek-White Mountain Lake"
    genuinely containing a vertex of the real "Silver Creek" stream line), drove a real `computer`-tool mouse
    click at that exact projected screen pixel (calibrated by comparing a known UI button's real
    `getBoundingClientRect()` against the coordinate that successfully clicked it, then confirmed precisely via
    a temporary `map.on('click', ...)` listener logging the real resolved `e.point`), and confirmed the
    resulting `#view-drawer` content read "Apache Trout — Stream habitat · Arizona," not the watershed —
    the stream correctly won. (A first attempt at this exact test used a synthetic `MouseEvent` dispatch
    directly on the canvas rather than a real CDP-driven click — confirmed this does NOT reliably trigger
    MapLibre's internal gesture/click handling, unlike a genuine OS-level click; switched to the real
    `computer` tool click for the actual verification, not the synthetic one.)
  - **A real, previously-unknown crash bug found and fixed, the actual blocker behind testing Big Game's own
    State Data**: `updateActiveLayersChip()` did `STATE_DATA_SOURCES[tc][sdActive.stateKey].state` with no
    guard — if `sdActive.stateKey` doesn't resolve to a real entry (reproduced via a stray empty-string
    `stateKey` left behind from dispatching the state-data `<select>`'s own 'change' event while it had no
    real option selected, itself an artifact of this session's own test-harness technique of using that
    dispatch purely to force a `map.getSource()` call for capturing the live `Map` instance — not something a
    real user, who can never select a blank option from that dropdown, would organically trigger — but the
    underlying crash risk is real regardless of trigger), this threw an uncaught `TypeError`. Since this
    function runs as one of the LAST steps inside `setWildlifeSpecies`/`setWildlifeMasterOn`/
    `clearWildlifeStateData`, the uncaught exception silently aborted the REST of each of those callers' own
    execution, every single time they ran again — meaning `renderSpeciesToggles()` (the very last line of
    `setWildlifeSpecies`) never completed again for the rest of that browser session, for ANY Big Game species,
    not just whichever one first triggered the bad `stateKey`. This is exactly what made Big Game's panel
    look completely broken (no Habitat range checkbox, no Migrations, no State Data section, for literally any
    species picked) while Fish and Upland Game — never hitting this specific stray value — kept working fine,
    which is why it read as "Big Game specifically is broken" rather than "one bad value poisoned this whole
    session." Fixed with a defensive guard at this call site and the one other unguarded
    `STATE_DATA_SOURCES[topCategory][active.stateKey]` read (`wildlifeStateDataPopupHtml`, lower real risk
    since it's only reached from an actually-rendered, actually-clicked feature, but the same principle
    applies). Confirmed the fix live: after clearing the corrupted persisted value and reloading, Big Game's
    Habitat range/Migrations/State Data sections all correctly appeared again for Elk, Mule Deer, and Moose.
  - **Item 4 — Nevada Big Game confirmed working (Elk specifically, as the task asked)**: once the crash bug
    above was fixed, configured Elk (Rocky Mountain) + Nevada State Data through the real UI and confirmed live
    via a real screenshot — a genuine blue wash rendering across real Nevada distribution polygons, correctly
    shaped, at the real 140-feature count independently confirmed via `curl` against NDOW's own service
    earlier in this session. This directly confirms the original hypothesis: Elk works correctly, so the
    earlier "Nevada Big Game renders nothing" report was the crash bug above (which would have blocked ANY
    Big Game species+state combination identically, not a Mule-Deer-specific data gap) — not a genuine Nevada
    rendering bug of its own.
  - **Item 5 — the real root cause(s) of "State Data silently shows stale/wrong data," confirmed live, not
    shipped on a theory**: the boot-time State Data restore path (inside `style.load`'s
    `overlayDataRestoredOnInit` block) had NO staleness guard at all, unlike `setWildlifeStateDataState`'s own
    manual-selection callback, which already correctly re-checks `wildlifeStateDataActiveByCategory[tc]` still
    matches before calling `setData()`. Directly observed this failing live, unprompted, before any fix: mid-
    session, `wildlife-statedata-fish-source`'s `_data` was found to contain a genuine, verified-real 73,373-
    feature Washington payload (correct SWIFD schema — `LLID`, `SPECIES`, etc.) despite the app's own JS state
    (`wildlifeStateDataActiveByCategory.fish`) correctly showing Arizona/Apache Trout active — the exact "shows
    the wrong state's data with no explanation" symptom from the original report, caught in the act. Fixed by
    adding the identical staleness-guard pattern to the boot-time path (capturing the target stateKey/
    speciesName at call time, re-checking they still match the live active selection before ever touching
    `setData()`). Verified the fix deterministically, not by waiting on the sandbox's slow, highly variable
    boot timing (~20s–170s+ to `style.load`, observed directly this session — impractical to time a real race
    against reliably): added a small, permanent debug hook,
    `window.FieldMapDebug.testStateDataStaleGuard(topCategory, staleSpeciesName, staleStateKey, newSpeciesName,
    newStateKey)`, which calls the REAL `loadStateDataLayer()` (a real network fetch, no mocking) with the
    stale target, then immediately (synchronously, before the fetch can possibly resolve) simulates the user
    switching away, and reports whether the guard would correctly discard the stale result once it resolves.
    Ran it for real against Washington's actual full dataset (racing a genuine ~73,373-feature, ~230-request
    paginated fetch — confirmed live via captured network requests, including real mid-fetch adaptive page-
    size backoff from 2000→500→125 after two genuine transient HTTP 500s, exactly the Session 56 pagination
    fix behaving as designed under real load) against a switch to Arizona: result —
    `staleFetchResolved:true, staleFetchFeatureCount:73373, guardWouldApply:false` — the fetch genuinely
    completed with the real full dataset, and the fix correctly identified it as stale and would discard it,
    with the current selection (Arizona/Apache Trout) confirmed untouched. This is airtight, deterministic,
    live-network-backed proof of the fix, not a theory.
  - **A second, deeper, NOT-fixed-this-session bug found while chasing item 5/2 further**: even with the
    staleness race fixed, actually trying to render Washington's real, correctly-current, non-stale 73,373-
    feature dataset live crashed anyway — `map.getSource('wildlife-statedata-fish-source').setData(realData)`
    throws `RangeError: Invalid string length` inside MapLibre's own internal `_updateWorkerData`, confirmed
    via the browser's real stack trace pointing at `maplibre-gl.js`'s own `JSON.stringify` call, not this app's
    code. This is NOT a one-off — the identical crash, same stack shape, was independently confirmed for the
    unrelated 7.2MB `big_game` Habitat range GAP file on ordinary page boot too, meaning this is a genuine
    MapLibre v3.6.2 library-level limitation on very-large-feature-count GeoJSON sources, not specific to
    Washington's schema or this app's own data-handling logic. Live-bisected the failure boundary by
    `setData()`-ing progressively larger real slices of the actual fetched Washington data directly:
    1,000/5,000/10,000/20,000/30,000/40,000 features all succeed with no error; the real full 73,373 fails —
    the exact boundary between 40,000 and 73,373 wasn't pinned further (the live-truncated 40,000-feature
    slice was independently confirmed to genuinely render — real features ("Tucannon River," "Cummings Creek")
    returned by `queryRenderedFeatures` at the target test viewport, though a later re-check of the same
    already-degraded, very heavily-used test tab showed 0 again with no code change in between — flagged as a
    tab-stability artifact of this specific, extremely long test session rather than re-chased further, not
    silently treated as a contradiction of the earlier positive result). This fully explains why Washington's
    fish State Data has likely NEVER visibly rendered in this app, independent of and in addition to the
    staleness race above — the fetch and pagination (Session 56) are correct, the filtering/staleness logic
    (Session 56/57) is correct, but the final paint call crashes before anything reaches the screen, silently
    from the user's own perspective (a real console exception fires, but nothing in the UI surfaces it). A
    real fix (most likely splitting the dataset across multiple sources/layers by county or index range, or
    evaluating a newer MapLibre version's behavior on the same data) is a genuine architectural change and was
    deliberately NOT attempted this session — flagged as a new, high-priority "What's broken" entry instead of
    rushed. Item 2's own visual check (Rainbow Trout at a real, `curl`-confirmed West Patit Creek location,
    ~46.301,-117.784 as a bounding-box centroid, or the geometry's own real ~46.324,-117.760 vertex, more
    precise per the same "naive centroid isn't guaranteed to be ON a winding line" gotcha this codebase has
    hit before for polygons) could NOT be completed as a full green-light "yes it renders here" confirmation
    as a direct result of this same crash — the data is real and present at that location (confirmed via the
    raw fetched dataset directly), but the live render itself is blocked by the bug above until that's fixed.
  - **Item 3 — Upland Game confirmed NOT rendering blue, live, with a strong candidate explanation for the
    original report**: confirmed via both `getPaintProperty()` (Chukar's own `wildlife-upland-fill` reads
    exactly `#c2622d`/`#8a4520`, zero reference to blue) AND a real zoomed screenshot at a `queryRenderedFeatures`
    -confirmed real match point, showing a genuine warm rust/tan wash with a rust outline, no blue anywhere —
    matching Session 56's own "not reproducible" finding for Big Game's Habitat range. Also confirmed, live,
    the most likely full explanation for both reports: `WILDLIFE_STATEDATA_FILL` (`#2d6ea8`, blue) is used for
    State Data across ALL THREE top categories by explicit design (not Fish-specific at all — the task's own
    original framing assumed it might have "leaked" from Fish specifically) — confirmed by turning ONLY
    Upland's own State Data on (Utah's real Chukar habitat data) and, since its 0.35 base opacity made it hard
    to distinguish by eye against the basemap in an initial screenshot, temporarily boosting
    `fill-opacity` to 1.0 for the screenshot only (not a persisted change) to get an unambiguous, saturated
    blue render — confirming beyond doubt that a category's own State Data, not a Fish-only recolor, is what a
    user would see as "blue" whenever they have any category's State Data active. Habitat range and State Data
    were also confirmed independently — toggling Habitat range off while State Data stayed on left ONLY the
    blue State Data shape, and vice versa — so the two never actually blend into one ambiguous color in
    practice, only two distinct, correctly-separated features that happen to share a screen.
  - **Verification summary, explicit about what used real vs. synthetic timing**: browser tooling itself
    disconnected entirely partway through this session (`list_connected_browsers` returning empty, distinct
    from the permission-denied/frozen-tab symptoms hit earlier) and needed the user to reconnect it on their
    end — flagged and paused for rather than worked around. Every live claim above is backed by either a real
    `computer`-tool-driven click/screenshot, a real `queryRenderedFeatures`/`getPaintProperty()` read against
    the live `Map` instance (captured via the established `Map.prototype` monkey-patch technique from prior
    sessions), or a real network-backed async test via the new `testStateDataStaleGuard` hook — no claim in
    this entry is based on code review alone. `node --check` confirmed clean syntax on all 4 extracted inline
    `<script>` blocks after every edit. APP_VERSION bumped 2.50.0 → 2.51.0, SHELL_CACHE bumped v163 → v164.
- Upland Game z-order fix, State Data same-species no-op guard (Session 58) — both items required a full
  re-diagnosis from scratch: the prior session's "shared-by-design, not Fish-specific" conclusion for the
  blue report and the crash fix for the auto-uncheck report were both real findings, but neither was the
  complete picture, and this session's job was to find what was actually still missing, live, not to re-run
  the same checks and hope for a different answer.
  - **Upland Game blue — the real mechanism**: confirmed AGAIN, and more thoroughly than before, that the
    color VALUE itself was never wrong: `getPaintProperty()` on `wildlife-upland-fill`/`-line` reads exactly
    `#c2622d`/`#8a4520` for every Upland species checked, including Ring-necked Pheasant (not just Chukar,
    the only one tested previously) — and a real, isolated screenshot (State Data untouched) showed a
    correctly rust-tinted wash with zero blue. The prior session's "not reproducible" framing for Big Game
    was accurate in isolation but incomplete: it never tested what a real user is likely to actually do —
    turn on BOTH Habitat range and State Data for the same species at once. Doing exactly that (Ring-necked
    Pheasant, Habitat range + Utah State Data both checked) produced a real screenshot showing solid, fully
    saturated blue across the entire Utah range with no visible rust anywhere, despite the active-layers chip
    correctly listing both as active. Root cause: `reinitializeLayers()` adds Habitat range's fill/line
    layers BEFORE State Data's (in an earlier, separate `WILDLIFE_CATEGORIES.forEach` block), so State
    Data's fill (opacity 0.35) always paints on top of and visually dominates Habitat range's fill (opacity
    0.18) wherever the two overlap — not a recolor bug, a pure z-order/visual-dominance bug, and one that
    reproduces identically for any category (Big Game/Upland Game/Fish alike), since all three share the
    exact same layer-ordering code. Fixed with a small follow-up loop, run once per category right after
    State Data's own layer block, that calls `map.moveLayer(fillLayerId)`/`map.moveLayer(lineLayerId)` with
    no second argument (moves a layer to the very top of the stack) for each category's Habitat range
    fill/line — confirmed via `getStyle().layers` index comparison that Habitat range's fill now sits after
    (on top of) State Data's fill post-fix. Re-tested the identical Ring-necked Pheasant + Utah scenario
    afterward: the result changed from solid saturated blue to a visibly muted, grayish-blue blend with rust
    now genuinely contributing to the tint — a real, measurable improvement, honestly reported as NOT a
    complete "clean rust" appearance, since two translucent fill washes over the same pixels (Habitat range
    at 0.18 opacity, State Data at 0.35) can only ever produce a blend, not one fully overriding the other's
    visible color, without a larger design change (e.g. raising Habitat range's own opacity globally, which
    would affect its appearance everywhere, including when State Data isn't active, and was deliberately not
    done without explicit direction, since 0.18 was an intentional, spec'd value from when Habitat range was
    first built — "same fill treatment as Draw Area").
  - **State Data auto-unchecks itself — the real, single, cross-category root cause**: the prior session's
    `updateActiveLayersChip()` crash-guard fix was real and correctly fixed a real bug, but it was a
    DIFFERENT, additional bug that happened to be reproduced (and fixed) via Big Game specifically — it was
    never the actual explanation for the report being "not Big-Game/Fish-specific." Root-caused live, from
    scratch: `setWildlifeSpecies(topCategory, speciesName)` — the ONE shared function every category's
    species `<select>` change handler calls — unconditionally cleared that category's State Data (via
    `clearWildlifeStateData`) and reset its master toggle on EVERY invocation, with no check for whether
    `speciesName` was actually different from the species already active. Confirmed live: on a freshly
    reloaded page with Big Game's Elk/Nevada State Data fully configured and correctly restored (verified via
    `wildlifeSnapshot()` immediately after reload), simply dispatching a plain `'change'` event on
    `#wildlife-species-select` with its value left completely UNCHANGED ("Elk (Rocky Mountain)" still
    selected) was enough to silently wipe the State Data selection back to `null`/`off` — reproducing the
    "auto-uncheck" symptom exactly, with no code-level explanation needed beyond this one unconditional call.
    This is a fully plausible REAL-DEVICE trigger, not a sandbox artifact: mobile Safari/WebKit's native
    `<select>` picker is documented to sometimes fire a genuine `'change'` event even when the user re-selects
    (or simply dismisses a picker still open on) the value that was ALREADY selected — no deliberate "pick a
    different species" action required. Fixed with a guard at the top of `setWildlifeSpecies()`: if the
    incoming `speciesName` (treating empty/falsy as `''`) equals the currently-active species name for that
    category, return immediately before touching State Data, the master toggle, or anything else — a genuine
    species change (different species, or clearing to none) still proceeds exactly as before. Verified this
    doesn't break the only other call site (`clearWildlifeSelection()`'s "Clear selection" link, which passes
    `''` and correctly still no-ops only when nothing was already selected, same as before). Verified live,
    end to end, exactly matching the requested repro: configured all 3 categories (Big Game/Elk/Nevada,
    Upland Game/Ring-necked Pheasant/Utah, Fish/Rainbow Trout/Washington) on a fresh reload, dispatched
    same-value 'change' events on each in turn while switching between all 3 tabs, did a genuine species
    change on Upland Game (Pheasant → Chukar, confirmed this correctly clears ONLY Upland's own State Data
    while Big Game's and Fish's stay completely untouched — cross-category independence still holds),
    switched back, and confirmed via the real DOM checkbox/select values (not just internal state) in all
    three panels, in sequence, that every one of them correctly retained its own State Data configuration
    throughout — screenshot-confirmed via the active-layers chip showing all 5 expected lines simultaneously
    (Elk, Elk migration, Elk–Nevada data, Ring-necked Pheasant, Ring-necked Pheasant–Utah data, Rainbow
    Trout–Washington data).
  - `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks after every edit.
    APP_VERSION bumped 2.51.0 → 2.52.0, SHELL_CACHE bumped v164 → v165.
- State Data checkbox silently unchecking — the real single-cause fix (Session 59). This session opened with
  the user directly contradicting the PRIOR session's own "confirmed working" claim for Nevada + Elk (Rocky
  Mountain) State Data, plus a wider matrix of new real-device data points (Big Game universally broken; Upland
  Game broken for Dusky Grouse/NV and Ring-necked Pheasant/UT but working for Chukar/NV and California
  Quail/NV) — explicitly asking whether this was a regression from Session 58's same-species no-op guard, and
  explicitly forbidding writing off Ring-necked Pheasant/Utah as "no data" without checking a real network
  request/response first.
  - **Ruled out the no-op guard as the cause, by code-path tracing rather than by re-running the old test**:
    `setWildlifeSpecies()` (the no-op guard's home) and `setWildlifeStateDataOn()` (the checkbox's own change
    handler) are two entirely separate functions with no call relationship — the guard only short-circuits a
    same-species re-selection from the species `<select>`, and has nothing to do with the State Data
    checkbox's own click path at all. Not a regression from Session 58; a pre-existing bug that had simply
    never been isolated with this specific an interaction sequence before.
  - **First real, false lead — endpoint latency**: measured the real Nevada Small Game FeatureServer's actual
    response time via a direct in-page `fetch()` (not curl, which bypasses the same CORS/browser-stack
    behavior the app itself experiences) — ~39.4 real seconds for a 2-feature query. This looked like a very
    plausible explanation for "checked → dismissed → reopened, unchecked" if the real device's repro cycle
    happens faster than the fetch resolves. Tested directly: selected a fresh (never-before-fetched) species
    via the real `<select>`, immediately dismissed the panel via a real map click (well before the ~40s fetch
    could resolve), reopened, and checked state — the checkbox and chip were BOTH correctly checked/populated
    throughout, no race observed. Ruled out as the cause, but the real ~40s number itself is a genuine, useful
    finding on its own (real ArcGIS state-wildlife-agency endpoints are simply slow) and was folded into the
    honest-failure-toast reasoning below regardless.
  - **The real mechanism, found by re-reading `renderStateDataSection()` line by line**: it always shows a
    state pre-selected in the `<select>` — `select.value = isActiveSelection ? active.stateKey :
    (options[0] ? options[0].stateKey : '')` — so a species that's never had a state explicitly picked yet
    STILL shows a state name in the dropdown, indistinguishable at a glance from a genuinely active
    selection. The checkbox's own `'change'` handler (`setWildlifeStateDataOn`) only ever flipped
    `wildlifeStateDataOnByCategory[tc]`; it never touched `wildlifeStateDataActiveByCategory[tc]` — the ONLY
    thing the select's own `'change'` handler (`setWildlifeStateDataState`) sets, and the ONLY thing that
    triggers the real fetch, updates the chip, or makes `renderStateDataSection`'s `isActiveSelection =
    active && active.speciesName === speciesName` check ever read true. So: click the checkbox alone, with a
    state already SHOWING in the (never-touched) dropdown → `wildlifeStateDataOnByCategory[tc]` becomes
    `true`, but `wildlifeStateDataActiveByCategory[tc]` stays `null` forever → nothing fetches, the chip never
    gains a line (both `updateActiveLayersChip()` and `updateWildlifeStateDataMapFilter()` require a non-null
    active entry) → on reopen, `isActiveSelection` reads `false` (active is still `null`) →
    `checkbox.checked = false`, even though the underlying `on` flag genuinely never changed. A real,
    100%-reproducible DOM/state desync, not a race — confirmed live, step by step, exactly matching the user's
    own repro cycle: `document.getElementById('wildlife-statedata-toggle').click()` alone (species pre-picked
    via the real `<select>`, state `<select>` left completely untouched) left `wildlifeStateDataActiveByCategory`
    null and produced no chip line; a real map click to dismiss the panel, then reopening it, showed the
    checkbox reading `false` in the DOM while `wildlifeStateDataOnByCategory[tc]` (read directly via
    `window.FieldMapDebug.wildlifeSnapshot()`) still read `true` underneath.
  - **One mechanism explains every single data point in the bug report, confirmed per-combo, not assumed**:
    Big Game's `STATE_DATA_SOURCES.biggame.nv` lists every species under a SINGLE state (Nevada) — the
    `<select>` never needs touching regardless of which species — universally broken, exactly matching "Big
    Game: universally broken." Upland Game's Dusky Grouse exists only in Nevada's catalog entry (single
    option) — same mechanism, broken. "Utah Ring-necked Pheasant" was re-checked against the actual catalog
    this session (an earlier misread in this same session's own investigation briefly assumed it existed in
    both Utah's and Nevada's entries — it does not; `STATE_DATA_SOURCES.uplandgame.nv.species` has no
    Ring-necked Pheasant key at all, confirmed via direct grep) — it's ALSO a single-option species (Utah
    only), hitting the identical mechanism; a real, live, non-empty fetch against Utah's actual endpoint
    (`Utah_Ringnecked_Pheasant_Habitat/FeatureServer/0/query`, confirmed via both a captured real network
    request showing HTTP 200 and a direct `fetch()` returning 5 real features with real `SPECIES`/`SEASON`/
    `VALUE` properties) proves this was never a legitimate no-data case, exactly as the user's explicit
    constraint demanded be checked rather than assumed. Nevada Chukar and Nevada California Quail both exist
    in BOTH Utah's AND Nevada's catalog entries (`uplandgame.ut.species`/`uplandgame.nv.species`) — Utah is
    listed first in the source and is therefore the `<select>`'s default, so reaching Nevada (what the user
    actually wanted) REQUIRED a real, active dropdown interaction, which correctly fires
    `setWildlifeStateDataState` and works — explaining why these two, and only these two among the species
    tested, "worked" without the fix, despite superficially looking like the same feature as the broken ones.
  - **The fix**: `setWildlifeStateDataOn(on)` now checks, when turning ON with no active state yet
    (`!wildlifeStateDataActiveByCategory[tc]`), whether the `<select>` currently has a value — if so, it
    routes through the real `setWildlifeStateDataState(stateSelect.value)` path instead of the old bare flag
    flip, exactly as if the user had picked that state from the dropdown themselves (same fetch, same chip
    update, same eventual checkbox/active-state consistency). Turning the checkbox OFF, or turning it ON when
    a state is already genuinely active, is completely unchanged — only the "nothing active yet" ON case
    changes behavior, and only by doing what the UI already visually implied had happened.
  - **Also addressed the "honest either way" half of the ask**: `loadStateDataLayer()` already showed a toast
    for a genuine fetch FAILURE (from a prior session) — added a second, distinct toast for the separate case
    of a real, successful fetch that legitimately returns zero features, which previously looked identical on
    screen to a silent bug (checkbox stays checked, chip line appears, but nothing visible renders — now says
    so explicitly: "No mapped data found for this species/state combination.").
  - **Verified live, end to end**, via the already-connected Chrome browser extension against a local
    `python -m http.server` (after a full service-worker-unregister + Cache-Storage-clear, then a fresh
    reload, to rule out a stale pre-fix cached copy): re-ran the EXACT broken repro (checkbox-only click, no
    select interaction) for Big Game/Elk (Rocky Mountain)/Nevada — `wildlifeStateDataActiveByCategory.biggame`
    now populates immediately on the checkbox click alone; dismissing via a real map click and reopening
    showed the checkbox still checked AND the active-layers chip correctly showing "Elk (Rocky Mountain) —
    Nevada data." Re-ran the same checkbox-only click for Upland Game/Ring-necked Pheasant/Utah — checkbox
    stayed checked through dismiss/reopen, and a real captured network request confirmed the fetch fired
    against the real Utah endpoint (HTTP 200). Re-confirmed Nevada Chukar (the one case that worked even
    before the fix, via genuine dropdown interaction) still works identically after the fix — no regression.
    Confirmed the fix generalizes to Fish (Brook Trout, default state "wa" never touched, checkbox-only click)
    — active state populated immediately, survived a real dismiss/reopen cycle. Zero console errors throughout
    (`read_console_messages` with `onlyErrors:true`). `node --check` confirmed clean syntax on all extracted
    inline `<script>` blocks. APP_VERSION bumped 2.52.0 → 2.53.0, SHELL_CACHE bumped v165 → v166.
- Pin-to-pin navigation (Session 68) — a new object type-adjacent feature: not a persisted item like
  pins/tracks/etc., but a live, ephemeral UI overlay tracking "which pin am I currently navigating toward."
  - **Reused primitives, not new ones**: `bearingDegrees(lat1,lng1,lat2,lng2)` (0=north, clockwise, TRUE
    bearing — confirmed via grep that no magnetic-declination adjustment exists anywhere in this codebase, so
    "true bearing, no device-orientation sensor" was already this app's only convention, not a new choice) and
    `haversineMiles`/`bearingCardinalLabel`/`formatDist` are the exact same functions Compass and the Bearing
    draw tool already use — no new geo-math was written. Distance format deliberately follows `formatDist`'s
    app-wide feet/miles-only convention (ft below 0.2mi, mi above, no km) rather than Compass's own live
    target-column display, which inconsistently shows both mi AND km — flagged and resolved in favor of the
    more general, already-documented "feet/miles only" precedent (established for Range Ring/Buffer) over
    copying Compass's one inconsistent spot.
  - **State**: `navTargetPinId` (plain scalar, null when inactive — reassignment naturally replaces any prior
    target, satisfying "single target only" with no extra logic), `navGpsSubId` (this feature's own id into
    the Session 37 shared GPS watcher — `subscribeSharedGps`/`unsubscribeSharedGps` — a 4th consumer, not a
    new independent `watchPosition`), `navCurrentPos` (`{lat,lng}`, null until a real fix arrives),
    `navGpsUnsupported` (true only if `navigator.geolocation` doesn't exist at all — a real, if rare, distinct
    condition from "no fix yet," but per the task's own wording both are collapsed into the SAME displayed
    message, see below). Deliberately NOT persisted to `state.settings`/localStorage — "what am I navigating
    to right now" is an ephemeral, device-session concept, matching the same reasoning already established for
    Elevation Range's always-off-at-boot persistence pattern from an earlier session, not a new precedent.
  - **`setNavTarget(pinId)`/`clearNavTarget()`/`updateNavChip()`**: `setNavTarget` only subscribes to the
    shared GPS watcher on the FIRST call (`if (navGpsSubId == null)`) — selecting a second pin while already
    navigating reuses the existing subscription rather than re-subscribing, confirmed live this correctly
    just swaps which pin's name/coords the next `updateNavChip()` computes against, with zero flicker or
    re-fetch of a GPS fix. `updateNavChip()` re-reads the target pin fresh from `state.pins` on every call
    (never caches its name/coords at selection time) — an edit to the pin (renamed, moved) is picked up
    automatically on the next GPS tick, and — the same lookup doubling as a safety net — a deleted target pin
    is caught here defensively even for a removal path that doesn't go through the explicit cleanup hooks
    below. One shared render function drives BOTH platform variants (`#nav-chip` desktop, `#nav-chip-mobile`
    mobile) rather than one CSS-reflowed element, since the two have genuinely different DOM shapes (a single
    name+detail block vs. 3 separate distance/arrow/bearing columns) — both are always kept in sync, with CSS
    `display:none` (not JS) choosing which one is actually visible per breakpoint.
  - **Unified "Waiting for GPS…" message**: initially built with two distinct messages ("GPS unavailable" for
    the unsupported-browser case, "Waiting for GPS…" for the no-fix-yet case) — corrected during this
    session's own verification to match the spec's literal wording exactly, which named ONE message
    ("Waiting for GPS...") covering BOTH "GPS unavailable or no fix yet." Collapsed to a single
    `if (navGpsUnsupported || !navCurrentPos)` branch. This also means a permission-denied error (the shared
    watcher's `onError` callback firing) naturally falls into the same "Waiting for GPS…" state, since it only
    ever leaves `navCurrentPos` null rather than setting any special flag of its own — confirmed live via a
    real injected error callback before any fix ever arrived.
  - **Arrow rotation**: `.nav-chip-arrow`'s CSS `transform:rotate(Ndeg)` is set directly to the raw computed
    bearing (0-359, unclamped by CSS itself) — verified live from two different synthetic GPS positions (due
    south of the target → correctly N/0°/arrow pointing up; due west of the target → correctly E/90°/arrow
    pointing right), confirming both the math and the visual rotation direction are correct, not just the
    numeric bearing value.
  - **Real bug found and fixed via live testing, not caught by code review**: a bearing very close to the
    360°/0° wrap point (e.g. 359.97°) rounds via `Math.round()` to the literal integer `360`, not `0` —
    reproduced live with a real injected GPS position placing the true bearing at ~359.999°, which displayed
    "N 360°" instead of "N 0°." Fixed with `Math.round(bearing) % 360` in the new code. Deliberately did NOT
    touch Compass's own `handleCompassMapTap`, which has the IDENTICAL bug pattern (confirmed via reading its
    source) — out of scope for this task, left as a known, pre-existing, undocumented-until-now gap rather
    than silently fixed as a drive-by change.
  - **Entry points**: both "tap a pin's marker" and "select from the sidebar" route through the SAME
    mechanism — the sidebar row's existing click handler already opens the pin's popup
    (`markersById[id].openPopup()`), so rather than inventing a second, sidebar-specific UI affordance, a
    single new "Navigate to" button was added to the pin popup's own overflow menu (`popupFooterHtml`'s
    optional trailing `extraMenuItemsHtml` param, additive — every other item type's call site is
    unchanged), reached identically whether the popup was opened via a marker tap or a sidebar row click.
    Confirmed live via a REAL mouse click on an actual rendered `.maplibregl-marker` DOM element (not just a
    sidebar-row click, which was also separately confirmed) — hit a real coordinate-mapping gotcha along the
    way: `getBoundingClientRect()` returns CSS-pixel coordinates, but this session's screenshot/click tooling
    operates in a scaled pixel space (`devicePixelRatio:1.25` here — 1568px screenshot vs. 1254px
    `window.innerWidth`) — the fix was multiplying the CSS-pixel marker center by `devicePixelRatio` before
    clicking, the same class of coordinate-space mismatch already documented in this session's own Tap-stack
    (Session 67) entry, confirming it's a recurring tooling quirk to watch for, not a one-off.
  - **Cleanup on deletion**: `deletePinById` clears the nav target if the deleted pin was the active one
    (`if (id === navTargetPinId) clearNavTarget();`); the same one-line guard was also added to BOTH separate
    bulk-delete code paths that bypass `deletePinById` (found via grep for every `pinIds.forEach` site,
    deliberately excluding the unrelated bulk-EDIT path that only modifies fields, never deletes) — otherwise
    a bulk-deleted target pin would leave the nav chip pointing at a now-nonexistent pin until the next GPS
    tick's defensive re-lookup in `updateNavChip()` happened to catch it.
  - **Layout**: desktop joins `#floating-info-stack`'s existing vertical column as a 5th chip (same 40px
    height/8px radius/padding as the coords/scale/trip chips). Mobile is its own full-width 3-column bar
    (distance / arrow / bearing), placed as a sibling immediately after `#active-layers-chip` in DOM order —
    the same "next flex child in the column" pattern already established for that chip's own full-width-row
    behavior (Session 29), so it automatically sits directly below whichever of the persistent row / active-
    layers row are currently visible, with no separate position-tracking JS needed (confirmed live: with no
    wildlife layers active, `#active-layers-chip` is `display:none` and the nav bar correctly sits right below
    the persistent chip row instead, with no leftover gap).
  - **Verified live**, via the already-connected Chrome browser extension against a local `python -m
    http.server`, both in the main desktop-width tab and via a genuine 390×844 `<iframe>` for real mobile
    `@media` matching (the established technique from Sessions 28-30/48, including its own now-familiar
    stale-service-worker-inside-the-iframe gotcha — resolved the same way, by unregistering the iframe's own
    SW and clearing its own Cache Storage before reloading with a cache-busting query string): target
    selection via both a real sidebar-row click and a real marker click, both landing on the same "Navigate
    to" popup button; the chip/bar rendering correctly on both platforms (screenshot-confirmed on both,
    including the mobile 3-column layout); arrow direction correct from 2 different synthetic GPS positions;
    live distance/bearing updates confirmed across multiple injected position fixes, including the specific
    360°→0° wrap case that caught the rounding bug above; the unified "Waiting for GPS…" state confirmed
    (screenshot-verified) for a real permission-denied error with no fix ever received; both × dismiss buttons
    confirmed hiding the chip/bar (they share one underlying state, so either one fully exits nav mode);
    single-target replacement confirmed by injecting a second test pin and selecting it while the first was
    still active — the chip immediately swapped to the new pin's name with zero accumulation, and the next
    fix correctly recomputed bearing/distance against the new target, not the old one. Zero console errors
    throughout. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION
    bumped 2.57.0 → 2.58.0, SHELL_CACHE bumped v174 → v175.
- Pin-to-pin navigation refinements + Tap-stack pin-overlap fix (Session 69) — two real-device follow-ups
  bundled into one session.
  - **Taller chip, new arrow shape**: desktop `#nav-chip` height 40px → 56px, mobile `#nav-chip-mobile`
    32px → 44px (matching row1's own established mobile chip height) — a deliberate deviation from the
    original Session 68 "same size as the other persistent chips" spec, superseded by explicit real-device
    feedback that the arrow needed more visual prominence. The old plain "▲" text glyph (a symmetric
    equilateral triangle — hard to read as "pointing somewhere" at a glance, per the report) was replaced
    with an inline SVG elongated dart/chevron (`M12 2 L4.6 20.3 L12 16.4 L19.4 20.3 Z`, the same
    classic-"current-location-arrow" shape family used by most map apps), sized via each SVG's own
    width/height attribute (28px desktop, 24px mobile) rather than a shared CSS font-size — matching the
    `.active-layers-icon`/`#north-reset-icon-svg` precedent already established elsewhere in this file for
    icon sizing. The rotating element is still the same outer `<span id="nav-chip-arrow">`/
    `<span id="nav-chip-mobile-arrow">` JS already targets — `.style.transform` rotates the SVG's parent
    identically to rotating a text glyph, so zero JS changes were needed for this half of the fix.
  - **Device-heading-relative rotation ("the phone acts as the compass")**: a real design change from
    Session 68's original north-relative-only arrow. Two new module vars — `navDeviceHeadingDeg` (the
    current compass heading from `DeviceOrientationEvent`, null whenever no real heading has been received:
    permission not yet granted, denied, no sensor, or simply before the first orientation event fires) and
    `navOrientationHandler` (the currently-attached listener function, or null, so `clearNavTarget` can
    remove the exact same reference it added). `startNavOrientation()` — called once, from inside
    `setNavTarget`'s existing `if (navGpsSubId == null)` first-call gate, so it only ever runs once per
    navigation "session" the same way the shared GPS subscription itself does — requests permission at the
    exact moment navigation mode starts (tapping "Navigate to"), not upfront at app load, matching the
    existing Locate Me/Compass contextual-permission convention. Reuses the identical
    `DeviceOrientationEvent.requestPermission()`/`deviceorientation(absolute)` pattern already proven for
    Compass (`openCompassPanel`) and the locate button's GPS dot (`_gpsDotInit`) — but as its own, third,
    fully independent listener/state, not a shared abstraction: this codebase has never had a shared
    orientation-watcher the way GPS position does (`subscribeSharedGps`), and each of the 3 orientation
    consumers has always run its own listener, so this follows that same established pattern rather than
    inventing a new shared mechanism partway through. `showToast("FieldMap uses your phone's compass to
    point toward your target", 3500)` fires immediately before `requestPermission()` — a plain synchronous
    DOM write, not a delay, so it doesn't interfere with iOS Safari's requirement that
    `requestPermission()` be called synchronously inside the same user gesture. Heading derivation
    (`e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? (360 -
    e.alpha) % 360 : null)`) matches Compass's own `handleCompassOrientation` exactly — the more correct of
    this codebase's two existing versions (it requires `e.absolute` before trusting an alpha-derived
    heading; the GPS-dot's own orientation handler doesn't check that at all, a pre-existing inconsistency
    not touched here). `updateNavChip()`'s arrow rotation is now `(navDeviceHeadingDeg != null) ? ((bearing
    - navDeviceHeadingDeg + 360) % 360) : bearing` — device-relative when a heading is available, plain
    north-relative fallback otherwise; `bearingText`/`distText` are completely unaffected either way, always
    computed from the absolute `bearing` value, per spec's explicit "bearing-in-degrees still accurate"
    requirement — only the arrow's own visual rotation changes. `clearNavTarget()` removes the listener
    (both `deviceorientationabsolute` and `deviceorientation` — a harmless no-op on whichever wasn't the one
    actually attached) and resets `navDeviceHeadingDeg` to null.
  - **Popup auto-close**: `navigateToPin: function(id){ setNavTarget(id); closeViewDrawer(); }` — a
    one-line addition. Safe to call unconditionally since this button only ever exists inside that pin's own
    currently-open compact popup (never mid-edit, where `closeViewDrawer`'s own `drawerExpandedType` guard
    would no-op anyway, though that state was never reachable from this button to begin with).
  - **Tap-stack pin-overlap fix — investigated first, per explicit instruction, using the same
    registry-audit approach as the earlier Wildlife State Data gap**: confirmed Bearing is fully, correctly
    registered in `TAP_STACK_TYPES` (`queryLayers: ['bearings-line-touch', 'bearing-target-arrow']`) and its
    click handling has worked correctly since Session 46 — this was NOT a missing-table-row gap the way
    Wildlife State Data was. The real, structurally different root cause: `addMarkerForPin`'s own click
    listener calls `e.stopPropagation()` before opening the pin's drawer (needed so the click doesn't bubble
    into the map's own generic click handler and immediately re-close the drawer this same click just
    opened — a pre-existing, load-bearing line, unrelated to this fix) — which means a click landing on a
    pin's marker DOM element never reaches MapLibre's own canvas-level `map.on('click', ...)` dispatch at
    all, the exact mechanism Tap-stack's pre-check (and every `TAP_STACK_TYPES` entry) depends on. This is
    not a bug freshly introduced — `TAP_STACK_TYPES`' own comment already explicitly documents pins as a
    deliberate exclusion for exactly this reason, dating back to Session 46 — but it meant a pin overlapping
    ANY other Tap-stack-eligible layer (not just Bearing — Buffer, Wildlife, GMU, etc. would have hit the
    identical gap) could never be disambiguated, only ever showing the pin directly with no indication
    anything else was there.
  - **The fix — not a registry entry, since a pin has no MapLibre layer/feature `queryRenderedFeatures`
    could ever find**: `addMarkerForPin`'s click handler, in the "no special mode active" branch, now calls
    `collectTapStackCandidates(map.project([pin.lng, pin.lat]))` — the pin's own real geographic location
    projected to the current screen point, not the raw click coordinate (a small but real distinction, since
    the marker element itself has some on-screen size) — using the EXACT same shared function every other
    Tap-stack type already relies on, reused as-is with zero changes to it. Zero other candidates (the
    overwhelming common case) falls straight through to the unchanged `openPinDrawer(pin)` call that was
    always there; 1+ others means a genuine overlap, so a synthetic pin candidate
    (`{type:'pin', key:'pin:'+pin.id, label:{title:pin.name, meta:'Pin'}, openFn:function(){
    openPinDrawer(pin); }}`) is prepended to the real candidates and the whole set is shown via the
    existing, unmodified `openTapStackPanel()` — the pin joins the shared disambiguation list exactly like
    every other type already does when it overlaps something. One real, deliberate limitation this can't
    reach, documented in a code comment rather than silently left unexplained: two overlapping DOM markers
    (e.g. this same pin sitting exactly on a Bearing's own separate draggable target-arrow marker, not its
    line) can never both be seen by one click — only whichever element is topmost in the DOM ever receives
    it at all, a browser-level constraint no amount of Tap-stack wiring can work around; the reported bug
    (pin overlapping a Bearing's LINE, a real MapLibre layer) is fully fixed by this change regardless.
  - **Verified live**, via the already-connected Chrome browser extension against a local `python -m
    http.server`. Compass rotation: mocked `DeviceOrientationEvent.requestPermission` (desktop Chrome has no
    native implementation of this iOS-only API) to test both paths independently. GRANTED path: confirmed
    the explanatory toast fires with the exact spec'd text before the (mocked) permission call; confirmed,
    with a real injected GPS fix placing the true bearing at 0°/N, that the arrow starts at `rotate(0deg)`
    (no heading yet) and correctly rotates to `rotate(270deg)` the instant a synthetic device-orientation
    event reporting a 90°/East-facing heading was dispatched — exactly matching `(bearing - heading + 360) %
    360 = (0 - 90 + 360) % 360 = 270`; confirmed the bearing TEXT stayed "N 0°" (unchanged, absolute)
    throughout, satisfying the "text always accurate" requirement independent of arrow rotation. DENIED
    path: confirmed `requestPermission` was called exactly once, the chip stayed fully functional (correct
    real distance "5.77 mi" and correct absolute bearing "E 90°"), and — the real point of this check — a
    stray `deviceorientationabsolute` event dispatched immediately AFTER the denial had zero effect on the
    arrow's rotation (still the plain, unrotated north-relative value), directly confirming the orientation
    listener was correctly never attached at all when permission was denied, not just coincidentally
    ignored. Popup auto-close: confirmed live via the real UI (marker click → popup → overflow menu →
    "Navigate to") that the popup/overflow menu disappears the instant navigation mode starts, with the nav
    chip appearing in its place, screenshot-confirmed both before and after. Tap-stack pin-overlap fix:
    injected a real test Bearing (matching the app's own real data shape via localStorage, picked up through
    a genuine reload — this project's established testing pattern) whose line passes exactly through the
    existing test pin's coordinates, confirmed the overlap visually (the dashed bearing line rendering
    directly through the pin marker in a real screenshot) before testing; a real click dispatched directly on
    the pin marker's DOM element correctly showed "2 items here" (Export Test Pin / Bearing), each row opened
    its own correct, completely unmodified detail view when picked, "← Back to list" correctly returned to
    the identical 2-item list, and dismissing via the panel's own × correctly left nothing open (confirmed via
    real computed `display:none` on the panel, the view-drawer, AND the back-bar — not just DOM text, which
    can hold stale content from an earlier step and give a false positive; an earlier check in this same
    session that showed stale open state was traced to the test's OWN sequencing, not a product bug — a
    previous detail view left open from an earlier step, in a scenario the fix's own code never touches, since
    it only runs on the pin's own click, never a MapLibre-layer click). Flagged rather than silently
    presented as fully covered: the "zero overlap → pin opens directly, no list" branch (the overwhelmingly
    common single-pin-tap case) could not be independently re-confirmed live this session — this sandbox's
    map hit a sustained style-loading stall (no markers ever rendered across a fresh reload, a fresh tab, and
    over a minute of combined waiting, worse than the intermittent stalls documented in several earlier
    sessions' own testing notes, which recovered within a call or two; this one did not recover for the rest
    of the session) right as this specific check was attempted. This is treated as genuinely low remaining
    risk, not silently assumed safe: the "else" branch this session's own edit added is the exact,
    byte-identical `openPinDrawer(pin)` call that already existed before this change and was thoroughly
    re-confirmed working earlier in this same session (both the very first pin click of Session 68's own
    testing and again at the start of this session), and `collectTapStackCandidates()` returning an empty
    array for a point with nothing else there is the same already-proven behavior every other Tap-stack type
    has relied on since Session 46 — but a real single-pin-tap confirmation after this specific code change,
    once the sandbox's map recovers or on a real device, is the natural next check, not assumed already done.
    `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped
    2.58.0 → 2.59.0, SHELL_CACHE bumped v175 → v176.
- Hydrography watershed name display (Session 70) — extends the existing live NHDPlus HR viewport-bbox
  pattern (see the "Hydrography (NHDPlus HR)" Architecture notes entry, unchanged) with a third parallel
  query to the SAME service's layer 12 (WBDHU12), confirmed live before writing any code: field name is
  `name` (lowercase, matching `gnis_name`'s own lowercase convention on layers 3/9), plus `huc12`/`states`/
  `tohuc`/`areaacres`. Also independently confirmed live that `reachcode` (already present on layers 3/9,
  though never requested by this app) embeds the containing HUC8 code as its own first 8 digits — a real
  flowline's `reachcode:"15060202006672"` and the local HUC12 codes `"150602020613"` etc. share the identical
  `"15060202"` prefix — but that's a CODE, not a name, which is why the actual fix reads layer 12's own
  `name` field rather than trying to derive anything from `reachcode`.
  - **No new source, no spatial join**: `hydroBboxGeometryQS()` (renamed from `hydroBboxQueryString()`,
    which used to bake `outFields=gnis_name` into the shared string — now split out per-fetch since layer 12
    needs different fields) builds just the shared geometry/spatialRel portion; `loadHydrographyForViewport()`
    fetches flowline/waterbody/huc12 in one `Promise.all`, same live-viewport-bbox pattern, same
    `HYDRO_MIN_ZOOM` gate, same graceful-empty-on-zoom-out behavior extended to the new
    `hydro-huc12-source`.
  - **Hit-testing, not a spatial join between datasets**: `hydro-huc12-fill` is a real MapLibre fill layer
    (`fill-opacity:0`, always `visibility:'visible'` since `queryRenderedFeatures` skips `'none'` layers) —
    invisible on the map, existing purely so `map.queryRenderedFeatures()` can answer "which HUC12 polygon
    contains this exact point" using MapLibre's own accurate hit-testing, the same "invisible wide layer just
    for click detection" pattern `hydro-flowline-touch` (14px, `line-opacity:0`) already established. This
    was chosen over either a live per-click point-query against the ArcGIS service (an extra network round
    trip per click, and not what "one more bbox query" in the task's own framing implied) or hand-rolled
    point-in-polygon math against the fetched GeoJSON (unnecessary — MapLibre already solves this correctly).
  - **`hydroWatershedNameAt(lngLat, point)`**: shared helper, used both by the direct single-feature click
    path (`handleHydroClick`, which already has a real `e.point` from the click event) and by Tap-stack's own
    `hydroflowline`/`hydrowaterbody` `open(f, lngLat)` functions (which only receive `lngLat`, not a screen
    point, so they derive one via `map.project()`) — added to the latter so a stream/lake popup reached via
    the Tap-stack disambiguation list shows the identical content a direct tap would, rather than silently
    omitting the watershed name only on that one alternate path.
  - **`hydroPopupHtml(props, kind, watershedName)`**: `watershedName` is optional/nullable throughout — the
    popup's meta line is now `kindLabel + (watershedName ? ' · ' + watershedName : '')`, so "Stream" alone
    (no crash, no "undefined") is exactly what renders when no watershed boundary is loaded/found at that
    point — confirmed live, not just reasoned about, per the task's own explicit "verify what the service
    returns for an edge case" ask. Previously `hydroPopupHtml` had NO meta line at all (just a bare name) —
    the kind label ("Stream"/"Lake/pond") is a small additive improvement surfaced here for free, since
    Tap-stack's own `label()` functions already computed those exact same 2 strings separately.
  - **Verified live**, via the already-connected Chrome browser extension against a local `python -m
    http.server`, using REAL data (unlike DEM-derived overlays, this sandbox's own earlier research this
    session confirmed `hydro.nationalmap.gov` is directly reachable, not blocked like Mapbox v4): jumped the
    map to the real Beaver Creek/Verde River area near Camp Verde, AZ (the same area used for this session's
    own research phase) and toggled Hydrography on — confirmed real basemap tiles AND real blue Hydrography
    flowline data rendering (86 real flowline features fetched for the viewport), and confirmed the new
    `hydro-huc12-source` genuinely populated with 4 real watershed names ("Copper Canyon-Verde River",
    "Beaver Creek", "Grief Hill Wash-Verde River", "Wickiup Creek") — exactly matching the names independently
    found via `curl` during this session's own research phase, not approximated. Found a real named flowline
    feature ("Beaver Creek") in the live fetched data, computed its exact on-screen point via `map.project()`,
    and confirmed via `queryRenderedFeatures` (before clicking, not assumed) that both the flowline-touch AND
    huc12-fill layers genuinely overlap there. A real `computer`-tool pixel click landed on empty map
    background instead (opening tap-anywhere) due to the same class of screenshot-vs-CSS-pixel scaling
    mismatch this session's own earlier work already hit — recovered by firing a real, properly-constructed
    MapLibre `click` event (`map.fire('click', {lngLat, point, originalEvent, preventDefault, ...})`) at the
    exact verified point instead of a raw screen-coordinate click, which correctly triggers the SAME
    registered `handleHydroClick` handler a real tap would. Confirmed live: the resulting popup read
    "Beaver Creek" (name) / "Stream · Beaver Creek" (meta — kind label + real watershed name, both correct,
    and in this specific real-world case the creek and its containing watershed happen to share the same
    name, confirmed as a genuine coincidence in the real data, not a bug echoing one value into the other).
    Separately verified the graceful-degradation path with equal rigor, not just reasoned about: temporarily
    cleared `hydro-huc12-source`'s live data (simulating "no watershed boundary loaded/found here," a real
    state the code must handle) and re-fired the identical click at the identical real point — confirmed the
    popup correctly read "Beaver Creek" / "Stream" (watershed portion cleanly omitted, no crash, no
    "undefined") with zero thrown exceptions, then restored the real data afterward. Zero console errors
    throughout. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks.
- Aspect: 4-cardinal-toggle redesign (Session 70) — replaces the original always-on 8-direction hue wheel
  (Session 40) with 4 independent N/E/S/W checkboxes plus a master on/off toggle, per explicit real-device
  design feedback. The underlying color math (`ASPECT_HUE_ANCHORS`/`hueForBearing`/`hslToRgb`) and the
  mutual exclusion with Slope Angle are both completely unchanged — this redesign only adds a filtering
  layer on top of the existing per-pixel computation, it doesn't touch how a passing pixel gets colored.
  - **The 4 arcs**: each cardinal covers a 90°-wide arc centered on itself — "N shows N, NE, and NW" is
    literal: N's own arc runs NW(315°) through N(0°) to NE(45°). `cardinalForBearing(bearing)`
    (`N:[315,360)∪[0,45)`, `E:[45,135)`, `S:[135,225)`, `W:[225,315)`) is duplicated in BOTH
    `terrain-overlay-worker.js` (the actual per-pixel filter) and index.html (the legend wheel) — kept in
    sync manually, the same "a worker can't import from the app's own closure" reasoning already established
    for `ASPECT_HUE_ANCHORS`'s own existing duplication. A standalone Node test
    (`test_aspect_cardinals.js`, run against the real worker file, not a reimplementation) confirmed the 4
    arcs exhaustively partition the full circle with zero gaps or overlaps (every integer bearing 0-359
    mapped to exactly one cardinal, each arc covering exactly 90 of them) before any live testing.
  - **Master toggle vs. selection — genuinely separate state, by design**: `aspectOn` (existing) keeps its
    exact original role as a pure visibility/mutual-exclusion master switch — completely unchanged code,
    same force-reset-at-boot treatment. The new `state.settings.aspectCardinals = {N,E,S,W}` (default all
    true, matching the old always-on-all-directions behavior as the natural starting point) is the actual
    N/E/S/W SELECTION, persisted NORMALLY (unlike `aspectOn` itself) since a saved directional preference is
    a real setting worth keeping, not a "was this actively in use" runtime flag. This split is what makes
    "master toggle shows/hides the current selection without clearing it" literal, not just approximate —
    turning the master off and back on never touches `aspectCardinals` at all, confirmed live through a real
    mutual-exclusion-triggered off/on cycle (see Verified live below).
  - **cardinals baked into the tile URL, matching Elevation Range's own established min/max pattern**:
    `aspectTileUrl()` builds `'aspect://{z}/{x}/{y}?cardinals=N,E,S,W'` (or any subset) from the current
    selection; `setAspectCardinalOn(cardinal, on)` updates `aspectCardinals` and calls
    `.setTiles([aspectTileUrl()])` UNCONDITIONALLY, even while the master is off, so the source is always
    correct and ready the instant the master flips back on — no refresh needed from that path, and (a real,
    if minor, efficiency win) toggling the master off/back on with the selection unchanged reuses whatever
    was already fetched/cached under the same unchanged URL rather than re-fetching. The `aspect://`
    protocol handler's regex now captures an optional `?cardinals=([A-Z,]*)` group — `m[4] ?
    m[4].split(',').filter(Boolean) : []` collapses both "no query string at all" and "present but empty"
    (zero cardinals selected) to the same correct `[]` result, which `computeAspect` treats as "nothing
    matches any active cardinal" — an all-transparent tile, a valid and harmless state, not an error.
  - **Legend reflects active/inactive cardinals**: `renderAspectLegendWheel()` (replacing the old
    build-once-and-cache `loadAspectLegend()` — it must now be cheap to rebuild on every single toggle,
    which 37 short gradient-stop strings comfortably is) computes each 10°-step stop's real HSL color only
    when that stop's own cardinal is active; inactive stops render a flat muted gray
    (`ASPECT_INACTIVE_COLOR`, `rgba(255,255,255,0.08)`) instead — confirmed live via a real screenshot that
    unchecking S correctly grays out exactly the S quadrant of the wheel while N/E/W stay in full color.
  - **A real MapLibre timing gotcha hit and root-caused during this session's own live verification, not a
    bug in the shipped code**: reading `map.getSource('aspect-source').tiles` immediately after calling
    `.setTiles()` (even after an `await` + 50ms `setTimeout`) initially showed the OLD tile URL, looking like
    `.setTiles()` wasn't working. Traced directly in the vendored `maplibre-gl.js` source (not assumed):
    `RasterTileSource.setTiles()` only ever writes to `this._options.tiles`, then calls `this.load()`, which
    — for a plain `tiles:[...]` source with no `url` (this app's case) — resolves via
    `t.h.frame(() => a(null, e))`, a `requestAnimationFrame`-scheduled callback, not a synchronous one; only
    THAT callback's own resolution actually copies the new value onto the live, tile-loading-relevant
    `this.tiles` property. In a backgrounded/inactive automation tab, `requestAnimationFrame` is well-
    documented (Sessions 27-28's own entries) to be throttled hard enough that this can sit pending far
    longer than any reasonable `setTimeout` wait — confirmed directly: forcing the tab to the foreground via
    a screenshot action (the same established workaround from those earlier sessions) let the pending frame
    fire immediately, and `.tiles` then correctly showed the updated cardinals. This is a real, useful
    finding about how `setTiles()` behaves under this specific test harness's own foregrounding requirements
    — not evidence of a bug in `setAspectCardinalOn`/`aspectTileUrl` themselves, which were already proven
    correct by the time this was traced (the underlying `_options.tiles` value, and later the resolved
    `.tiles` value once foregrounded, were both exactly right every time).
  - **Verified live**, via the already-connected Chrome browser extension against a local `python -m
    http.server`: standalone Node test (`test_aspect_cardinals.js`) confirmed the arc-boundary math and — via
    a synthetic uniform south-facing DEM tile — confirmed real gradient-based filtering behavior (26/26
    assertions: `S`-only produces byte-identical colored output to all-4-active for a genuinely south-facing
    slope; `N`-only, an empty cardinals array, and an `undefined` cardinals value all correctly produce zero
    colored pixels with no thrown exception) before any browser testing began. Live: toggling the master
    checkbox correctly showed/hid the 4 N/E/S/W checkboxes and the legend together; unchecking individual
    cardinals (E, then S) correctly updated `state.settings.aspectCardinals` (confirmed via direct
    `localStorage` inspection) and — once the `requestAnimationFrame` timing gotcha above was accounted for
    — correctly updated the live MapLibre source's own resolved tile URL to
    `aspect://{z}/{x}/{y}?cardinals=N,E,W`; the legend wheel visually confirmed showing exactly the S
    quadrant grayed out; a real pan (`map.panBy`) confirmed the full protocol-handler → worker →
    PNG-encode → MapLibre-callback pipeline runs cleanly end to end against the real cardinal-filtered URL
    with zero console errors (the DEM fetch itself fails gracefully in this sandbox, same standing Mapbox v4
    block as every prior session touching DEM data — the pipeline's own error handling, not real terrain
    rendering, is what was being verified here). Mutual exclusion re-confirmed working correctly in both
    directions with the new cardinal-selection state present: turning Slope Angle on correctly forced
    Aspect's master off (with the existing toast) while leaving `aspectCardinals:{N:true,E:true,S:false,
    W:true}` completely untouched in `localStorage`; turning Slope Angle back off and Aspect's master back on
    afterward correctly restored the checkboxes AND the legend to that exact preserved selection — not the
    all-4-default — directly confirming the master/selection split's own core design goal. `node --check`
    confirmed clean syntax on all 4 extracted inline `<script>` blocks and `terrain-overlay-worker.js`.
- Oregon fish NHD stream-order join (Session 71) — a data-prep-only session (no map-UI wiring, matching
  Session 61's own precedent for this exact dataset), adding a real NHD-derived stream-order/prominence field
  to the 4 oversized Oregon fish species' data, for a future zoom-based progressive-detail feature (major
  rivers always visible, minor tributaries appearing only as the user zooms in) to eventually read.
  - **Feasibility check (Step 1), done first and honestly, per explicit instruction not to force a bad join
    through**: confirmed live (not assumed carried forward) that no GDAL/ogr2ogr/geopandas/shapely/QGIS is
    available in this environment — matching Session 61's own already-established finding for this exact
    machine. Built a real, hand-rolled Node.js nearest-line spatial join (no external geometry library, the
    same "hand-rolled geometry, no turf.js" precedent this codebase has followed since Session 21) and tested
    it against a REAL sample: 300 real RedbandTrout stream features in a dense, real bbox (John Day River
    area, eastern OR, found via an actual density scan of the real data, not picked arbitrarily) joined
    against 8,371 real NHD flowline features fetched live for the identical bbox. Results: 94.2% of
    individual sampled points found a real NHD flowline within a 150m cutoff (matching this codebase's own
    already-established offline-trail-snap tolerance for "same real-world feature" — Session 48), median
    match distance among clean matches was 3.6m, and the join computation itself (once NHD data is fetched
    and indexed) was effectively free (14ms for 300 features). The one honest, non-blocking caveat found:
    stream order is NOT always consistent along a single fish-habitat polyline's own length (only ~22% of
    features had every sampled point agree on the exact same order) — investigated rather than assumed to be
    a matching failure, and confirmed to reflect genuine hydrology: a single "fish habitat" line can
    legitimately span a real confluence, where the true order genuinely changes partway through. Resolved
    with a deliberate, documented design choice (see below) rather than treated as a blocker. Concluded:
    feasible, proceed to Step 2.
  - **The join method**: for each fish stream feature, sample up to 5 evenly-spaced points along its own
    length (matching its longest part for a MultiLineString), find the nearest real NHD flowline FEATURE for
    each sampled point within the 150m cutoff (a feature-level spatial grid index, not a segment-level one —
    see the memory section below for why that distinction mattered), then assign:
    - `nhdStreamOrder` = the MINIMUM `streamorde` among sampled points with a good match — deliberately
      conservative: a habitat line touching even one minor/low-order segment is treated as at least that
      minor, so a future "hide until zoomed in" feature never prematurely renders a mixed-order line at a
      too-far-zoomed-out view just because PART of it is a major river.
    - `nhdDrainageAreaSqKm` = the MAXIMUM `totdasqkm` among the same good-match points — the largest real
      upstream drainage area this line's true stream ultimately reaches, a complementary continuous-value
      prominence signal alongside the discrete order.
    - `nhdMatchConfidence` = fraction (0-1) of sampled points that found a good match — surfaced per-feature
      so a lower-confidence assignment is identifiable later, not silently presented with the same authority
      as a clean 100%-confidence one.
    Lake features (`habitatType:'lake'`) are completely untouched — stream order is a linear-network concept
    that doesn't apply to a polygon; only `habitatType:'stream'` features were ever touched.
  - **Real NHD data fetch**: the union of every 0.5°-tile the 4 species' stream features actually touch is
    only 143 tiles (not the sum of each species' own tile count, 272 — real geographic overlap between the
    coldwater coastal species means most tiles are shared, only needing to be fetched once). Fetched live via
    the same `hydro.nationalmap.gov` NHDPlus HR service Hydrography already uses (layer 3, NetworkNHDFlowline,
    `outFields=gnis_name,streamorde,totdasqkm,permanent_identifier`), real adaptive pagination (2000-feature
    server cap per request, matching the same pattern this codebase already uses elsewhere for large ArcGIS
    responses), each tile saved to its own file immediately so the fetch is resumable. Real, live total: 1.9GB
    of raw NHD flowline data. A `field name confirmed live before use` gotcha, consistent with this app's own
    established "USFS-boundaries lesson" (lowercase ArcGIS field names, not the capitalized aliases): Strahler
    order's real field name is `streamorde`, not `streamorder` — a live test query with the wrong name
    silently returned an unrelated 400 error, caught and corrected before the real fetch began.
  - **A real infrastructure gotcha hit and worked around, not a data problem**: the first fetch attempt,
    launched via the Bash tool's own `run_in_background` with a 600000ms (10 min) timeout, was killed by that
    same timeout partway through (only 20/143 tiles done) — the realistic total fetch time (~4.7 minutes once
    resumed, after most tiles were already cached from the first attempt, or a fresh ~279s/123-tile run in
    isolation) genuinely can approach or exceed a single Bash invocation's own 10-minute ceiling depending on
    server responsiveness, and this tool has no way to raise that ceiling. Fixed by re-launching the exact
    same (already resumable-by-design — it skips any tile that already has a saved file) fetch script as a
    genuinely detached OS process via PowerShell's `Start-Process`, decoupling it from any single tool call's
    own timeout entirely; progress was tracked via a separate `Monitor` polling the tile-output directory's
    own file count, not the fetch process's own (unreliably-buffered, when redirected to a file rather than a
    real TTY) stdout. All 143 tiles fetched cleanly, zero errors, confirmed via the fetch's own completion log
    and a direct scan of the saved tile files for any error/failed lines (none found).
  - **A real memory-architecture problem found and fixed during Step 2, not glossed over**: the first join
    attempt tried to build ONE global spatial index over the FULL deduped NHD dataset at once — 1,778,688
    unique features (a real number, confirmed live, far higher than a naive extrapolation from the single-
    sample-tile density in the Step 1 feasibility check would have suggested) — and exhausted a 6GB Node heap
    building it. Root-caused (not just worked around by throwing more memory at it) to the index design
    itself: storing one full JS object per line SEGMENT (not per feature), duplicated across every fine-
    grained (0.01°) grid cell its own bounding box touched, produces tens of millions of small object
    allocations for a dataset this dense — some individual fetched tiles alone had 20,000+ features. Fixed
    with a genuine architecture change, not just a bigger `--max-old-space-size`: process one 0.5° tile GROUP
    at a time (that tile plus its 8 immediate neighbors, bounding real cross-tile-boundary matches), building
    a small LOCAL index scoped to just that group's real NHD data, running the join for every fish feature
    whose PRIMARY tile (the tile its first coordinate falls in) is that group, then letting the local index be
    garbage-collected before moving to the next group — memory stays bounded to roughly "9 tiles' worth of
    data" at any moment, regardless of the 1.78M-feature total. A second, complementary fix: the local index
    itself moved from segment-level objects to FEATURE-level integer references in each grid cell (a coarser
    0.02° cell), with the true point-to-line distance computed lazily by walking each candidate feature's OWN
    already-in-memory coordinate array directly — no per-segment object ever allocated at all. This combined
    fix completed the full real join (82,901 stream features against the full 1.78M-feature NHD dataset) in
    ~412 seconds with peak heap comfortably under 2GB, confirmed via live per-tile-group progress logging
    (heap usage printed every 10 groups) showing it never exceeding ~1.9GB throughout the entire run.
  - **A real correctness bug found during Step 3 verification, not shipped silently**: NHD's own `streamorde`
    field uses `-9` as a genuine NODATA sentinel on a real (if small) fraction of its own flowline features —
    confirmed live by scanning the actual fetched data: 954 of 1,792,465 raw NHD features (0.05%) carry this
    exact value, none of them a real Strahler order. The first join run didn't exclude it, which let a single
    sampled point landing near one of these sentinel features silently poison that fish feature's own MINIMUM-
    order calculation (a real spot-check surfaced multiple named Oregon rivers — Umpqua, Rogue, Siuslaw —
    showing an impossible "order range -9 to 9"). Fixed by requiring `streamorde > 0` (not just `!= null`)
    before a sampled point's match counts toward the minimum — a real Strahler order is always a positive
    integer, so this cleanly excludes the sentinel with no other side effects. Re-run (from the untouched
    `_preNhdJoin_backup/` originals, not from the already-buggy output, so the correction is a clean re-join
    rather than a patch on top of bad data) — CoastalCutthroatTrout's own matched count dropped very slightly
    (53,184 → 53,174, exactly the 10 features whose ENTIRE sample-point set had been NODATA-poisoned and now
    correctly report no match at all rather than a garbage value) with the other 3 species' counts unaffected
    (none of their sampled points happened to hit one of the 954 sentinel features).
  - **Final real match-rate statistics, the full run, not the sample**: CoastalCutthroatTrout 53,174/53,208
    (99.94%), Coho 12,775/12,790 (99.88%), WinterSteelhead 11,485/11,485 (100%), RedbandTrout 5,418/5,418
    (100%) — 82,852/82,901 stream features matched overall (99.94%). No species stood out as notably worse
    than the others; the small residual unmatched counts are consistent with genuine bbox-edge/coverage gaps
    (a habitat line's sampled points all landing more than 150m from any real NHD data), not a systemic
    problem with any one species.
  - **Data integrity, confirmed live, not assumed from the join script's own logic alone**: for all 4 output
    files, directly compared against the untouched `_preNhdJoin_backup/` originals — feature counts identical
    (nothing lost or duplicated), every lake feature confirmed to have zero new fields (completely untouched),
    every original property key confirmed still present on every single feature (nothing dropped or
    restructured — only 3 new keys added to stream features), and confirmed zero remaining non-positive
    `nhdStreamOrder` values anywhere in the corrected output.
  - **Sensible-values spot-check (Step 3)**: real named Oregon rivers reach real high orders at their
    downstream/mainstem extent — Willamette River up to order 9, Umpqua/Rogue up to 8-9, Nehalem/Siuslaw up to
    7-8 — while a real sample of "Unnamed trib to X"-named features (98 of them, in CoastalCutthroatTrout)
    skews heavily toward low orders: 37 at order 1, 26 at order 2, 28 at order 3, only 7 at order 4, and
    ZERO at order 5 or higher — exactly the pattern real hydrology predicts (unnamed tributaries are, almost
    by definition, minor headwater streams) and a strong independent confirmation the join is producing
    geographically/hydrologically sensible results, not just numerically-plausible-looking noise.
  - **App-loading verification (Step 3's second half)**: these 4 species are deliberately NOT wired into the
    live Wildlife > Fish > Oregon State Data picker UI at all (Session 62 explicitly omitted them pending
    geographic sub-sharding — see that entry), so there was no existing UI path to exercise. Verified the
    actual load-bearing mechanism directly instead: this sandbox's main app tab hit the same long-documented
    Mapbox-v4-loading stall as many prior sessions, worked around with the established isolated-
    `maplibregl.Map`-harness technique (a zero-Mapbox-dependency background-only style, proven in Sessions
    60/62/63 for this exact class of verification) — fetched the REAL updated files via the app's own
    `fetch('data/fish/oregon/...')` call, then loaded them through the EXACT real `setData({features:[]})`-
    then-`updateData({add:...})` pattern `applyStateDataToSource` already uses for Oregon's other, already-
    wired species. Confirmed live for both the smallest (RedbandTrout, 7.2MB) and largest
    (CoastalCutthroatTrout, 58MB, the file most likely to stress the exact large-payload mechanism Session 60
    built `updateData()` to solve in the first place) files: zero errors, real rendering confirmed via
    `queryRenderedFeatures` at a real matching viewport (a genuine "Hawkins Creek" RedbandTrout feature
    rendered with `nhdStreamOrder:1`, `nhdDrainageAreaSqKm:907.246`, `nhdMatchConfidence:1` alongside every
    original property, confirmed via direct feature inspection, not just an absence-of-errors check), and the
    larger file's `updateData()` call completed in ~2.5s with no error — confirming the ~7-9% file-size
    increase from the 3 new fields doesn't approach the V8 string-length/payload ceiling this whole mechanism
    exists to avoid.
  - **Backups**: `data/fish/oregon/_preNhdJoin_backup/` holds the untouched pre-join originals for all 4
    species, created before the first write and deliberately left OUT of this session's git commit (kept
    locally, not pushed) — the previous commit in git history already preserves the identical pre-join
    content, so committing a second, duplicate ~90MB copy into the repo would be pure bloat with no real
    recovery benefit git history doesn't already provide.
  - Scratch working files (the tile-fetch scripts, the 1.9GB of raw fetched NHD tiles, and the intermediate
    join-script iterations that hit the memory/sentinel bugs above) live in this session's own scratchpad
    directory, not the repo — reusable if this join is ever re-run (e.g. once the 4 species are eventually
    wired into the map UI and their own geographic sub-sharding is designed, per Session 61's own flagged
    follow-up), but not something this repository needs to carry.
- NHD tiered zoom-based loading (Fish, 4 oversized Oregon species) (Session 72) — wires the Session 71
  `nhdStreamOrder` field into real progressive loading, replacing geographic sub-sharding (Session 62's
  originally-flagged eventual fix) as the actual solution for CoastalCutthroatTrout/Coho/WinterSteelhead/
  RedbandTrout's oversized files (11,500-53,000 features each). Explicitly NOT a `setFilter()`-only approach
  like the Session 66 watershed zoom-auto-hide — a filter-only approach would still load and `updateData()`
  the FULL ~50k-feature file up front and just hide most of it visually, paying exactly the processing cost
  this design exists to avoid until the data is actually needed. Real tiered loading instead: each species'
  raw file is fetched and bucketed into 3 arrays ONCE, and each tier's own `updateData({add:[...]})` call
  fires at most once, the first time its zoom threshold is crossed while that exact species+state is still
  the active selection.
  - **Catalog wiring**: `STATE_DATA_SOURCES.fish.or.species` gained 4 new entries (previously omitted
    entirely, not shown as "coming soon" — see Session 62's own comment on this), each with `tiered: true`
    alongside its existing `file` property. `tagLocalFileFeature()` was extracted out of
    `loadStateDataLayer()`'s existing 'localFile' branch into its own shared function specifically so both
    the normal one-shot path (unchanged, still used by the other 30 Oregon species) and the new tiered path
    tag features into the identical `_sdLayer`/`_sdShape`/`_sdSortKey` shape — no risk of the two paths
    silently drifting apart. `wildlifeSpeciesGroups()` needed zero changes: it already builds the Fish
    dropdown from every `perSpecies`/`localFile` source's own `species` keys, so the 4 new species appeared
    in the real dropdown, correctly grouped (Coldwater, via the already-existing `WILDLIFE_FISH_GROUPS`
    entries for "Coastal Cutthroat Trout"/"Coho"/"Winter Steelhead"/"Redband Trout" — present since Session
    54/61 but never previously reachable, since these species were excluded from the catalog until now), the
    moment the catalog entries existed.
  - **Tier definitions and bucketing** (`nhdTierForFeature()`): lake features (`habitatType==='lake'`, which
    never carry `nhdStreamOrder` at all — that field only exists on stream features from the Session 71 join)
    always go into Tier 1 alongside `nhdStreamOrder >= 6` (major rivers) — deliberately, since lakes are
    comparatively few (3-147 per species) and not the "minor tributary" concern this design exists to defer.
    Tier 2 is `nhdStreamOrder` 3-5, PLUS the small number of unmatched/null-order stream features (0-34 per
    species, the tiny residual from Session 71's own 99.88%-100% match rate) — a safe default so they're
    never permanently invisible rather than folding them into the "small, fast" Tier 1. Tier 3 is
    `nhdStreamOrder` 1-2. Real per-species tier sizes (major/medium/minor, verified against the live data
    both via a standalone count and via the actual `[NHD-TIER] ... fetch+bucket` console log fired from the
    real app): CoastalCutthroatTrout 2015/17907/33415, Coho 1464/7859/3470, WinterSteelhead 1564/7057/2880,
    RedbandTrout 286/2545/2734 — every one of these matches the raw major/medium/minor/lake/noOrder counts
    computed directly from the data files exactly, confirming the bucketing logic has zero off-by-one or
    boundary errors across all 4 species.
  - **State and functions**: `nhdTieredLoad` (module var, `tc -> {speciesName, stateKey, tiers:
    {major,medium,minor}|null, loaded:{major,medium,minor}}`) tracks per-category tiered-load progress.
    `startNhdTieredLoad(tc, stateKey, speciesName)` fetches the raw file, tags + buckets every feature ONCE,
    then calls `loadNhdTier(tc,'major')` immediately and `updateNhdTieredZoomLoading()` right after (so a
    species picked while ALREADY zoomed past 8 or 11 loads the right tiers immediately, rather than waiting
    for a zoom event that may never come). `loadNhdTier(tc, tierKey)` does the actual `updateData({add:
    tier})` call (with the same empty-`setData()`-first reset `applyStateDataToSource` already established
    as required before Tier 1's own updateData() call — later tiers skip this, since the source's diff
    mechanism is already valid by then) and marks that tier loaded — a no-op if the tier's data isn't bucketed
    yet or is already loaded, so it's always safe to call speculatively. `updateNhdTieredZoomLoading()` is
    registered on `map.on('zoom', ...)` alongside the existing Session 66 watershed listener (same "cheap
    unless something actually needs to change" shape — a few property reads unless a real threshold-crossing
    tier load is actually due) and independently re-checks all 3 top categories, though in practice only Fish
    can ever have a tiered species active.
  - **Wired at both real load-bearing call sites**: `setWildlifeStateDataState()` (the manual state-picker
    path) and the boot-time State Data restore block both gained an identical branch — if the resolved
    species' catalog entry has `tiered: true`, call `startNhdTieredLoad()` instead of the normal
    `loadStateDataLayer()`+`applyStateDataToSource()` pair; otherwise, completely unchanged behavior. Missing
    the boot-time path would have meant a device that had one of these 4 species active before a reload
    silently attempted one giant one-shot `updateData()` call on every single boot, defeating the whole
    design exactly at the moment it matters most (a real app launch).
  - **Fresh-load-on-switch-back**: `nhdTieredLoad[tc] = null` is set both in `clearWildlifeStateData()`
    (called on every species change, including switching AWAY from a tiered species) and at the top of
    `setWildlifeStateDataState()`'s own branch-decision point (so switching FROM one tiered species TO
    another, or to a non-tiered one, never leaves stale tier state behind) — combined with
    `startNhdTieredLoad()` always constructing a brand-new `loadState` object with every `loaded` flag reset
    to `false`, this guarantees switching away and back to the same tiered species always re-fetches and
    re-buckets from scratch rather than silently resuming or skipping tiers, per spec ("treat it as a fresh
    load"). Verified directly (not just reasoned through): simulated a switch-away (`nhdTieredLoad.fish =
    null`) on a fully-3-tier-loaded RedbandTrout state, then a switch-back (`startNhdTieredLoad()` called
    again for the same species) — confirmed `loaded` reset to `{major:false,medium:false,minor:false}` and
    `tiers` reset to `null` immediately, not silently reusing the old fully-loaded state.
  - **Real-world timing, measured live, not estimated**: built an isolated `maplibregl.Map` harness (the
    same zero-Mapbox-dependency background-only-style technique established in Sessions 60/62/63) with the
    real `wildlife-statedata-fish-*` source/layer config copied verbatim and the real tiered-loading functions
    copied verbatim (byte-identical to the shipped code) from `index.html`, plus test-only instrumentation (a
    `map.on('sourcedata', ...)` listener recording a real wall-clock timestamp whenever `e.isSourceLoaded`
    fires for the fish source) added ONLY in the harness, never in shipped code — needed because
    `updateData()` itself is fire-and-forget (posts a message to the worker and returns immediately), so
    timing the synchronous call alone (also logged, for reference: 24-1068ms across all tier loads and
    species — this is JUST the diff-object-construction/postMessage cost, not real processing time) would
    have badly understated the real cost, exactly the mistake the earlier synthetic-data `updateData()`
    research already warned about. For CoastalCutthroatTrout (the largest of the 4, the explicit stress-test
    case): Tier 1 (2,015 features, on a freshly-loaded page) showed an anomalously high ~15s real settle time
    — flagged as a likely one-time cold-start/warm-up artifact of this specific automation sandbox (a
    freshly-loaded, initially-backgrounded tab) rather than representative of real Tier 1 cost, since it does
    not fit the pattern of every later measurement; Tier 2 (adding 17,907 features, cumulative ~19,922)
    settled in a real, consistently-measured ~3.0-3.4s; Tier 3 (adding 33,415 more, cumulative to the full
    53,337) settled in ~3.5s. **This is the central finding the task asked for**: cumulative cost does NOT
    grow non-linearly between Tier 2 and Tier 3 despite the cumulative total nearly tripling — both land in
    the same low-single-digit-seconds band, a dramatically better result than the earlier synthetic-data
    research's own timing table (which showed e.g. 17,000 cumulative → 38.6s) would have predicted. The most
    likely explanation, consistent with both datasets' own known properties: that research deliberately used
    vertex-dense synthetic LineStrings (up to 15,000 vertices/feature) to stress-test the worst case, while
    the real Oregon fish data was already put through a 2% mapshaper simplification pass in Session 61 — real
    per-feature vertex complexity here is far below that synthetic worst case, so the worker's real re-tiling
    cost per feature is proportionally far cheaper. Conclusion reported to the task: the 3-tier design with
    zoom thresholds 8/11 holds up at real scale as specified — no adjustment (fewer tiers, different
    thresholds) is indicated by this data. Confirmed the "one-time trigger" rule holds under real repeated
    zoom ticks, not just a single crossing: re-triggering `updateNhdTieredZoomLoading()` at zoom 8.5, 12, and
    9 (all past their respective thresholds, already-loaded) produced zero new log entries and zero new
    `updateData()` calls. Confirmed zoom-out doesn't unload anything, via `querySourceFeatures()` at the
    identical zoom level (4) before and after all 3 tiers loaded: 1,174 features (Tier 1 only) →  26,487
    features (all 3 tiers) at the exact same viewport/zoom — plus a direct visual comparison (two real
    screenshots at zoom 4: a sparse branching major-river-only network, versus a dense, nearly-solid stream
    silhouette once all 3 tiers were loaded and the view zoomed back out). Repeated the full fetch+bucket+
    Tier-1+Tier-2+Tier-3 sequence for the other 3 species (Coho, Winter Steelhead, Redband Trout) and
    confirmed each one's bucket counts match the raw data exactly (see the tier-sizes list above) with the
    one-time-trigger rule holding for each.
  - **Verified in the REAL app, not just the isolated harness**: after clearing a stale `SHELL_CACHE` service-
    worker cache that was initially serving a snapshot from before this session's edits (the same
    well-documented gotcha noted in many prior sessions' own testing notes — resolved the same way, by
    unregistering the SW and clearing Cache Storage before reloading), drove the real Wildlife Layers → Fish
    picker through real DOM `change` events: confirmed the real species `<select>` lists all 4 new species;
    confirmed picking "Coastal Cutthroat Trout" then "Oregon" fired the real, unmodified
    `setWildlifeStateDataState()` → `startNhdTieredLoad()` branch, producing a REAL console log
    (`[NHD-TIER] Coastal Cutthroat Trout fetch+bucket: 879ms (major=2015 medium=17907 minor=33415)`) with
    bucket counts identical to the isolated harness's own real fetch of the SAME production file; confirmed
    the checkbox and active-layers chip (`"Coastal Cutthroat Trout — Oregon data"`) updated correctly,
    coexisting with pre-existing Big Game/Upland Game selections per the established per-category
    independence design; confirmed zero console errors throughout. The remaining, purely-Mapbox-tile-loading
    part of the real app's own map instance never reached `style.load` in this sandbox during this session
    (the same long-documented Mapbox v4 access block hit by every prior session touching DEM/vectorbase/
    wildlife layers) — confirmed via the real app's own `[BOOT]` console markers stopping at
    `styleResolveToMapConstructed` with no `firstStyleLoad`/`idle` markers ever following — which meant
    `reinitializeLayers()` (the function that creates `wildlife-statedata-fish-source`) never actually ran in
    this specific tab, so `loadNhdTier`'s own pre-existing `if (!srcObj) return;` guard correctly, silently
    no-op'd rather than crashing; this is a known environmental limitation, not a bug, and is exactly why the
    isolated-harness measurements above are the load-bearing verification for the actual rendering/timing
    behavior. Also confirmed, in this same real-app session, that a non-tiered species (Bull Trout) still
    routes through the completely unmodified `loadStateDataLayer()`/`applyStateDataToSource()` path with zero
    behavior change — no `[NHD-TIER]` log fired, checkbox/chip updated correctly
    (`"Bull Trout — Oregon data"`), zero console errors — directly confirming the other 30 Oregon species (and
    every non-Oregon State Data source) are completely unaffected by this session's changes, not just by code
    review of the branch condition (`if (speciesSpec && speciesSpec.tiered){ ... } else { /* unchanged */ }`)
    alone.

## Session history
- Session 1: Leaflet → MapLibre swap, base layers, GPS dot, scale bar, zoom controls
- Session 2: Pin rendering (maplibregl.Marker), 4→3-style switcher (Street removed, topo default via local
  topo-style.json + refresh-style.js), modal close/sidebar-refresh fixes for pins/bearings/tracks/areas,
  bearing-tap crash guard, pin-marker persistence fix across style switches, clustering temporarily disabled
- Session 3: Draw Route fully ported to MapLibre (tracks-source, draw preview, vertex editing). Diagnosed and
  fixed pins/tracks disappearing on style switch (map.setStyle diff:false). UX redesign: 6→5 status colors
  with migration, all 4 modals redesigned (quick-category chips, collapsible category list, header row with
  top Save/Cancel), Directions/Copy coords buttons on pin popup
- Session 4: Draw Area and Bearing tool fully ported to MapLibre, following the same pattern as Draw Route —
  polygons-source/bearings-source, draw previews, vertex editing (areas) and endpoint remap (bearings). No
  more L.* calls remain anywhere in the pin/route/area/bearing code paths.
- Session 5: GMU boundaries refactored from bespoke 2-state (AZ/OR) code to a table-driven GMU_STATES catalog
  + generic shared functions (see Architecture notes). Added Utah, Idaho, Nevada as fully-built, verified
  states. Researched and confirmed Washington's live source (WDFW ArcGIS FeatureServer) but left it out of
  GMU_STATES pending go-ahead, per explicit instruction not to build on a guess. Verified AZ/OR/UT/NV
  end-to-end (load, single-select, click-to-popup with correct title/link) via Playwright; root-caused a
  string of false "broken popup" test failures back to test-harness bugs (canvas-vs-page coordinate offset
  from the sidebar, naive polygon-centroid misses on concave shapes) rather than app bugs. Idaho's data/fields
  independently confirmed correct via direct API calls, but in-browser Playwright verification was blocked by
  IDFG's self-hosted ArcGIS server rejecting automated-browser traffic (403, headed and headless) while
  identical non-browser requests succeeded — likely bot/WAF detection on their end, not a FieldMap bug, but
  unconfirmed whether real end-user browsers ever hit the same wall.
- Session 6: Washington wired into GMU_STATES (WDFW ArcGIS FeatureServer, 162 features, GMU_Num/GMU_Name
  fields, per-unit PDF info link) — all 6 states now built. Added durable per-state GMU boundary caching
  (Cache API + localStorage timestamp, see Architecture notes) with an unobtrusive freshness indicator and
  manual refresh in the state picker, and a persistent liability disclaimer in both the Layers panel and every
  GMU popup. Verified end-to-end via Playwright: WA renders/pops up correctly, single-select confirmed across
  all 5 non-Idaho states, durable cache confirmed to load instantly with zero network requests on a page
  reload, manual refresh confirmed to force exactly one live re-fetch and update the timestamp, and the
  180-day stale nudge confirmed to render as inline text with no blocking dialog. Also discovered (see
  Architecture notes) that the service worker's generic fetch passthrough intercepts GMU requests before
  Playwright's page.route() can, which was the actual cause of an initial "WA fetch never fires" false alarm —
  a test-environment fix (disable SW registration in the test), not an app change.
- Session 7: Investigated a user report of GMU state loads still being slow (Idaho: 27s first load, 18s on a
  cached reload) despite Session 6's caching confirming zero network requests. Added [GMU-PERF] timing
  instrumentation and profiled with real (not trimmed/mocked) live agency data fetched via Node — discovered
  the actual live payloads are 7-23MB per state (not a PowerShell-serialization artifact as previously
  assumed in Session 6's testing). Root-caused the slowness to buildLabelPointFeatureCollection, not network
  or caching (see Architecture notes' "FIXED performance bug" entry for full detail and the fix applied).
- Session 8: Fixed a bearing-delete persistence bug — deleteBearingById was the only one of the four
  pin/track/polygon/bearing delete functions NOT calling recordTombstone(id) before scheduleSave(). Confirmed
  via direct code comparison (deletePinById/deleteTrackById/deletePolygonById all call it; deleteBearingById
  didn't) and via mergeStates' logic (mergeArray only drops an id if it's in state.tombstones — an untracked
  delete is indistinguishable from "never existed on this device" during a merge). This meant any Firestore
  snapshot arriving after a local bearing delete but before that delete's own debounced cloud push completed —
  performInitialSync on a fast reload, or startLiveSync's onSnapshot on any device — would resurrect the
  bearing via mergeStates' union-by-id logic, and push that resurrection back to Firestore, undoing the delete
  permanently. Fix: added the missing recordTombstone(id) call, matching the pin/track/polygon pattern exactly.
  Verified via localStorage inspection (not just UI state) that state.tombstones now correctly contains a
  deleted bearing's id and it stays gone after a real page reload; also verified bearing create/edit still
  work unaffected (single-line, additive fix — no other delete path was touched).
- Session 9: Researched (research-only turn) then built a lightweight "has this GMU state's data actually
  changed" check layer in front of the 60/180-day time-based cache — see Architecture notes' "GMU lightweight
  change-check layer" entry for the full design. Confirmed via direct live queries (PowerShell, not browser,
  matching the established pattern for ID/WA) that AZ/UT/NV expose editingInfo.dataLastEditDate, Idaho's
  self-hosted server doesn't but its per-feature last_edited_date field supports an equivalent
  outStatistics MAX() query, Washington has no edit-date signal of any kind (returnCountOnly is the only
  option, an intentionally-disclosed weaker check), and Oregon has no live source to check against at all
  (static vendored file). Verified via Playwright with mocked check+geometry endpoints: all 5 checkable
  states' requests land within a 14ms window (genuinely parallel); a confirmed-unchanged result triggers zero
  geometry requests and zero label recomputation; a simulated changed result correctly triggers
  refreshGmuState's full pipeline when that state is the one on screen, or a cache-invalidate-only (no
  immediate refetch) when it isn't; Washington's freshness text reads "Checked as of" versus AZ/UT/NV/ID's
  "Verified current as of"; Oregon fired exactly one network request total (its static file) with no
  changeSignal/lastCheckedAt ever written to its meta entry.
- Session 10: Fixed a critical cross-account data contamination bug — signing out never cleared local
  durable storage (pins/tracks/polygons/bearings/tags/tombstones), so the old account's data stayed on
  screen and in localStorage after sign-out, and a subsequently signed-in (different) account's
  performInitialSync merge treated it as this device's own unsynced local work and pushed it straight into
  that account's Firestore doc — permanently bleeding one account's data into another's. Fix, in
  window.FieldMapSync.signOut() (index.html, ES module script near the bottom): if genuinely unsynced local
  changes exist (new hasUnsyncedChanges() — checks syncInFlight, a pending debounced cloud-push timer, and
  local.lastLocalEditAt against a new lastSyncedAtMs watermark), flush them via pushNow() first when online
  (re-checking hasUnsyncedChanges() afterward since pushNow always resolves even on failure — a failed push
  now falls through to the same confirm() warning as the offline case rather than silently discarding data);
  if offline, confirm() before proceeding. Only after that does it unsubscribe the live Firestore listener,
  call the new clearLocalDataForSignOut() (classic script — wipes pins/tracks/polygons/bearings/tags/
  tombstones and every associated marker/popup/source, deliberately leaves state.settings alone since
  settings were never synced/account-scoped to begin with — see getSyncableState), reset the sync
  watermark, and only then actually call Firebase's signOut(auth). Also added a wasSignedIn-guarded safety
  net directly in onAuthStateChanged's null branch — clears local data on ANY account-session-ending auth
  transition, not just ones that went through the app's own Sign Out button (e.g. a remotely revoked/expired
  token) — guarded specifically so it never fires on a fresh/guest device that has never signed in (that
  case is also user===null but must not wipe real local-only data). Because sign-out now always fully
  clears before any subsequent sign-in's merge runs, re-signing into the same account also now correctly
  pulls a complete fresh copy from Firestore rather than re-merging anything local-storage-stale, without
  needing to special-case sign-in itself. Separately, added a small amber pending-sync indicator (dot) on
  pin markers (buildPinMarkerHtml) and on every item's sidebar row (buildItemRow, all 4 types) — computed
  from a new isPendingSync(item) = isSignedIn && item.updatedAt > lastSyncedAtMs, so a stuck-syncing or
  offline-created item is visibly distinguishable from a confirmed-synced one instead of looking identical.
  lastSyncedAtMs only ever advances via the new window.FieldMapApp.setLastSyncedAtMs() bridge call, and only
  on an actually-successful write (performInitialSync's two branches, startLiveSync's merge-push success
  path, pushNow's success path) — never optimistically, and never on a failed push. Verified both classic
  and ES-module script blocks still parse cleanly (node --check) after the edits; UI/end-to-end sign-out/
  sign-in behavior itself not yet verified in-browser this session — recommend a manual or Playwright pass
  next session covering: sign-out with no pending changes, sign-out with unsynced changes online, sign-out
  with unsynced changes offline (confirm the warning appears and cancelling it keeps data intact), and
  signing into a second account afterward to confirm zero bleed-through in either direction.
- Session 11: Batch 1 of 2 of the bottom-drawer popup unification (Batch 2 — tap-anywhere-to-open +
  expand-in-place editing — explicitly not started). Built the shared #view-drawer component (see
  Architecture notes for the full design) and converted all 7 existing ad-hoc/per-marker popups to it: pin,
  bearing, track, area, GMU boundary info, USFS forest boundary info, and wildlife/migration habitat info.
  Footer for pin/bearing/track/area is now one row of 4 (Directions/Share/Edit data/⋮ overflow) instead of
  the old split layout (overflow lived in the name row specifically to dodge MapLibre's built-in popup close
  button, which #view-drawer's own custom close button makes unnecessary) — popupFooterHtml and
  popupOverflowHtml were merged into one function, the old popupOverflowHtml deleted outright. Added a
  "Created <date>" line to all 4 of those types' compact view (formatCreatedDate), previously only visible
  after opening the Edit form. "Edit data" still opens the existing centered-modal Edit form unchanged, on
  purpose. Desktop vs. mobile treatment was checked visually (Playwright + real screenshots, not assumed):
  an initial flush-bottom/full-width design read fine at 1400px but stretched into a sparse edge-to-edge bar
  at 1920px and overlapped #map-controls' icon column even after capping its width, so desktop instead
  reuses .floating-panel's own exact position (bottom:24px;right:64px) just wider; mobile keeps the true
  full-width edge-to-edge bottom sheet. Verified end-to-end via Playwright at both 390px and 1400/1920px:
  all dismiss paths (× button, plain map-background tap), map-stays-interactive-behind-it, pin/track/area
  creation → tap → correct footer + Created date, GPX export (Share on a track) still triggers a real .gpx
  download unaffected, and — the actual point of this batch — a pin placed 15px from the very top and very
  bottom of a 390×844 mobile viewport both produced a drawer fully within the viewport (old anchored-callout
  style would have clipped at least one of these). GMU/USFS/wildlife/migration were verified by code review
  only (identical showViewDrawer/shim pattern to the already-tested types, content builders untouched) —
  not live-tested, since this sandbox has no network access to their real data sources; same for bearing's
  live creation flow (compass mode wasn't automated this session), though its code is line-for-line the same
  shim pattern as track's, which was tested. Root-caused and fixed one real regression found only through
  this testing, not visible from reading the diff alone: a pin marker's click handler must call
  e.stopPropagation() before opening the drawer, or the click bubbles into MapLibre's own Map-level 'click'
  handler and its closeAllPanels() call immediately re-closes the drawer this same click just opened (see
  Architecture notes' #view-drawer entry for the full mechanism — this doesn't affect the other 6 types,
  whose layer-click handlers already call e.preventDefault()/stopPropagation() for an unrelated reason).
- Session 12: Batch 2 of 2 of the bottom-drawer work — tap-anywhere quick-capture (new feature) and
  expand-in-place editing (replaces the 4 centered Edit modals). See Architecture notes' "Tap-anywhere" and
  "Expand-in-place editing" entries for the full design; summary here is what it took to get there working.
  Tap-anywhere: added a 30-minute current-conditions cache (getCurrentConditions) since none existed
  anywhere in the weather integration before, a category auto-detector (detectCategoryTagIds) matching
  typed text against the live tag vocabulary by first-word rather than whole-label (needed for multi-word
  labels like "Water source" to fire from natural phrasing — confirmed via testing that whole-label matching
  missed these entirely), and the drop-a-temp-marker/live-title/Save-creates-a-real-pin flow itself. Expand-
  in-place: re-parents each type's existing centered-modal .modal element into #view-drawer-content instead
  of rebuilding an equivalent form, reusing 100% of existing save/delete logic unchanged; added
  drawerExpandedType tracking so closeViewDrawer refuses to close (and isViewDrawerShowing returns false)
  while an edit is in progress, protecting unsaved edits now that the drawer has no blocking scrim. Verified
  end-to-end via Playwright: tap-anywhere trigger only fires on a genuinely empty/mode-less/panel-less tap;
  temp marker drops with correct pin-marker styling and clears on dismiss; category chips detect and are
  removable; Save produces a real pin with correct name/tags/Escout status/empty trip and the SAME drawer
  swaps to that pin's normal view in place; current-conditions cache confirmed NOT refetching on a second
  tap at the same spot (fetch call count unchanged) and confirmed showing "Unavailable offline" (not stale
  data) when actually offline; Edit data confirmed expanding the same drawer in place for all 4 types with
  no centered modal ever appearing, Cancel discarding changes, Save persisting them, Delete working, and a
  background map tap confirmed NOT closing/discarding an in-progress edit; GPX export (Share on a track)
  confirmed still working through the expanded-then-collapsed drawer. Root-caused and fixed 3 real bugs
  found only through this testing (not visible from reading the diff alone) — see Architecture notes'
  "Expand-in-place editing" entry for full detail on each: (1) editPolygon/editBearing's pre-Batch-1
  `.remove()` call before opening the edit modal was silently wiping viewDrawerOpenRef, breaking Save's
  collapse-back-to-compact-view for exactly those two types (pin/track were unaffected and worked first
  try); (2) pin-delete-btn and track-delete-btn were markup-only, never wired to any click handler at all,
  pre-existing and unrelated to this batch, only surfaced because this batch is what finally exercises them
  in a reachable place; (3) the tap-anywhere temp marker was built differently from addMarkerForPin's own
  construction and ended up missing the pin-marker class entirely. Also confirmed via direct in-page fetch
  and curl that api.weather.gov is genuinely reachable from this dev sandbox — an earlier false read of "no
  conditions ever load" during testing turned out to be Playwright's page.route() interfering with the
  service worker's own fetch interception (the same documented GMU/SW testing gotcha, same root cause,
  different feature) rather than a real app or network problem; switching the test to an in-page
  window.fetch monkey-patch (no page.route) resolved it. GMU/USFS/wildlife/migration popups and bearing's
  live creation flow were not re-tested this session (unchanged since Session 11, already covered there).
- Session 13: Three small bug fixes reported after Session 12 shipped.
  (1) Tap-anywhere's "10-day forecast" button was closing the drawer without ever showing the forecast —
  root cause confirmed by tracing the actual event flow (not assumed): weather-panel IS a real, already-
  built forecast view (openWeatherPanel/fetchWeather/renderWeather, the same one Tools > Weather uses; no
  new view needed), but weather-panel is in OUTSIDE_CLICK_DISMISS_IDS, so the click bubbling up from the
  button (which lives inside #view-drawer, not #weather-panel) reached the document-level outside-click
  listener, which saw the panel it had just opened as "clicked outside" and immediately re-hid it — the
  exact same bug the codebase had already hit and fixed once for sheet-weather-btn (see that handler's own
  comment), just not applied when the tap-anywhere button was wired up in Session 12. Fixed the same way:
  stopPropagation, passed through via onclick="...(event)" since this button is built as an HTML string
  rather than a real addEventListener target.
  (2) Arizona GMU info links were 404ing. Confirmed by directly querying the live FeatureServer (not
  assuming from one example) that the AGFDLink field itself — not just this app's old fallback pattern —
  is uniformly stale across every unit: AZGFD migrated their site (azgfd.com, /location/gmu-<unit>/) without
  updating this field, which still points at the old azgfd.gov/h_f/hunting_units_*.shtml pattern for 100%
  of units checked. Verified the new pattern directly in a real Chrome browser (curl/WebFetch both got
  403'd — AZGFD's WAF blocks non-browser requests, same category of gotcha as IDFG/WDFW) across a
  representative spread of unit-code shapes (plain numbers, number+single-letter, number+M) and found one
  real generalization gap this way: units with a further directional sub-split in this app's GIS source
  data (5BN/5BS, 7E/7W) don't have their own pages on the new site — both 5BN and 5BS live at gmu-5b, both
  7E and 7W live at gmu-7 (confirmed each of the 4 codes individually 404s or works as expected). Fixed by
  ignoring AGFDLink entirely and building the URL straight from the live GMU field, with a 4-entry
  AZ_GMU_SLUG_OVERRIDES lookup for those two exceptions; also now returns no link at all (was previously
  generating a guaranteed-broken one) for the handful of features with an empty or "N/A" GMU value.
  (3) Pin/bearing/track/area drawer content (coords/elevation/date) wrapped awkwardly on real mobile
  widths — the "Created" label was dropped everywhere (bare date now) and pin's coords+elevation+date line
  (previously one " · "-joined string) is now 3 flex items in a new .pin-popup-coords-row modifier class
  with justify-content:space-between, confirmed via Playwright at 390px to render coords and date on one
  line, evenly spaced, no wrap. Applied the same treatment to tap-anywhere's own coords+elevation line for
  consistency (not explicitly named in the bug report, but the identical concatenated-line pattern).
  Bearing's Origin/Target lines and track/area's standalone Created line were left as plain
  .pin-popup-coords (no -row modifier) — they were never the crammed-single-line case this fixes, and
  making .pin-popup-coords flex globally would have risked breaking bearing's <br>-separated multi-line
  layout.
- Session 14: Two additions on top of Session 12's tap-anywhere/expand-in-place work — see CLAUDE.md
  Architecture notes' "Current conditions mini-card" and "Area unit tap-to-cycle" entries for the full
  design; this is what it took to build them without duplicating or regressing anything.
  Generalized tap-anywhere's weather mini-card (previously tapAnywhereConditionsHtml/
  updateTapAnywhereConditionsDisplay, tightly coupled to tapAnywhereState) into a shared component
  (conditionsCardHtml/peekCurrentConditions/conditionsCardContainerHtml/fetchConditionsForDrawerItem) reused
  by both tap-anywhere and the pin/bearing/track/area compact views — the SAME getCurrentConditions cache,
  not a second one. The split into a pure render half and a separate side-effecting fetch half mattered in
  practice, not just in theory: bearingPopupHtml/trackPopupHtml are also called to build
  promptDirectionsChoice's "restore" string well before (if ever) it's actually redisplayed, so the render
  half had to be guaranteed fetch-free, with the real fetch triggered explicitly and only once per
  open*/openPinDrawer call (mirroring how pin elevation backfill already worked). Point resolution reused
  Directions' existing logic per type rather than inventing new rules: pin's own coordinate, bearing's
  ORIGIN (not target), track's START point, area's polygonInteriorPoint. Added area unit tap-to-cycle
  (ac → sq ft → sq mi → back to ac) as a separate, narrower display path (polygonAreaDisplayForDrawer) that
  doesn't touch polygonAreaDisplay's own auto-select-by-size logic, still used everywhere else (sidebar,
  Share, edit form). Verified via Playwright: correct weather for all 4 types at their correct resolved
  point; cache genuinely reused for a second nearby item (confirmed by monkey-patching window.fetch to
  count real network calls, not by inspecting the cache object directly — a naive first attempt at this
  check used two points that looked "nearby" on screen but actually straddled the cache's own 0.1°-rounding
  boundary, a good reminder that "nearby on screen" and "same cache cell" aren't the same claim); offline
  shows "Unavailable offline" (confirmed with context.setOffline, not assumed); GMU/USFS/wildlife/migration
  popups confirmed unchanged (no card, same footer); area unit cycles through a full rotation back to its
  starting value and the meta row stays single-line at mobile width (no regression to the fix from the
  session before this one).
- Session 15: Fixed the Measure tool (`Uncaught ReferenceError: L is not defined` — a genuine, never-ported
  Leaflet dependency) and, before touching anything else, audited every item on the "what's broken" list via
  a literal `\bL\.[a-zA-Z]+\(` grep across the whole file (the actual discriminator between a real Leaflet
  dependency and a coincidentally-named identifier), cross-checked against a direct read of each named
  feature's current code. Result: of 8 previously-listed concerns, only the Measure tool had a real Leaflet
  call left. Elevation tap, compass bearing lines, the GPX search-result marker, all 6 overlay toggles, the
  sun-path arc, and the offline-boundary rectangles were all already fully MapLibre-native — the list had
  gone stale as a side effect of work in earlier sessions that never updated it. GPS accuracy circle
  (gpsAccCircle) is a different category entirely: confirmed never implemented at all (no assignment, no
  render call, no leftover Leaflet code to port from) — reported as a gap to flag, not silently built as new
  scope. The same audit surfaced one more genuine crash bug not on the original list: zoomToVisible()'s
  `L.latLngBounds([])`, called from 4 sites (tag/state/trip/date filter-chip toggles) — fixed the same way,
  swapped for `maplibregl.LngLatBounds`, extending per-point (`[lng,lat]` order) since MapLibre's bounds
  object doesn't accept a Leaflet-style raw-array-of-points argument the way `.extend()` used to; also
  handles track points' historical dual format ([[lat,lng],...] or [{lat,lng},...], same normalization
  already used by trackDistanceMiles/trackStartLatLng elsewhere in the file). Verified both fixes live via
  Playwright: Measure tool produces a correct distance/bearing readout across 3 taps with the dashed preview
  line rendering exactly as designed (confirmed visually via screenshot, not just DOM state), Clear resets
  state and exits measure-mode correctly, and toggling a filter chip (the zoomToVisible call path) fires with
  zero console errors. `node --check` on all 4 extracted inline `<script>` blocks confirmed clean syntax.
- Session 16: Stage 1 of 3 of the Active Trip project — converted Trip from a free-text string to a real
  entity (state.trips) with a full migration; see Architecture notes' "Trips" entry for the complete design.
  Explicitly deferred to later stages: Active Trip concept (startup prompt, persistent indicator, trip
  switcher — Stage 2) and tap-anywhere trip integration (Stage 3) — neither was touched this session. Before
  writing any code, surfaced a real discrepancy between the spec (which asked for "a new Firestore
  collection") and the actual codebase (confirmed via a full sweep — zero `collection()` calls anywhere):
  every existing type is an array field on one single `users/{uid}` document, synced via mergeStates/
  mergeArray with a shared tombstones map, not real Firestore sub-collections. Confirmed with the user before
  proceeding — trips are an array field on that same document, exactly like tags/pins/tracks/polygons/
  bearings, specifically because that's the only way to literally reuse the proven mergeArray/tombstone
  machinery the spec asked for rather than building a second, differently-behaved sync system. Verified via a
  from-scratch Playwright run against a realistic seeded pre-migration localStorage snapshot (see the Trips
  architecture entry for full detail): zero duplicate Trip entities, correct .tripId on every item including
  cross-type sharing (a pin/track/bearing all pointing at the same trip correctly resolved to one shared
  entity), no-trip items (including ones missing the .trip field entirely — genuinely ancient data) correctly
  left without a .tripId, three consecutive reloads produced a byte-identical trips array (idempotency),
  sidebar trip filter chips and the "group by trip" view both rendered correct real trip names post-migration,
  and creating a new trip through the real Add-pin UI wrote exactly one new Trip entity with zero legacy
  .trip writes. Trip delete + tombstone + cross-device-merge rigor (no live second Firestore account
  available in this sandbox, same constraint as earlier sessions) was verified by extracting mergeStates()
  verbatim into a standalone Node script and replaying the exact "stale device reconnects after another
  device already deleted something" scenario originally fixed for bearings — confirmed a trip tombstoned on
  one device is correctly dropped by the merge even when a second, not-yet-synced device still has it
  locally, and confirmed an unrelated brand-new trip on the stale device survives that same merge untouched.
  `node --check` on all 4 extracted inline `<script>` blocks confirmed clean syntax after every batch of edits.
- Session 17: Fixed a critical "Edit data" crash reported right after Session 16 shipped — see Architecture
  notes' "Expand-in-place editing" entry's SECOND GOTCHA for the full mechanism. The bug report's own
  hypothesis (a trip-related element renamed/removed) turned out to be wrong: a full line-by-line review of
  every change in Session 16's commit found nothing touching pin-modal-title/pin-lat/pin-lng (the only
  `.textContent` assignments in openPinModal), and the trip field's own `.value` line would have crashed
  identically pre-migration on a null `#pin-trip`, which never happened. The real, pre-existing root cause
  (unrelated to trips, dating to Session 12's expand-in-place work): showViewDrawer() — the single function
  every "open this item's drawer" entry point funnels through — had no guard against overwriting
  #view-drawer-content while a DIFFERENT edit was still expanded into it, unlike closeViewDrawer() which
  already refuses to close under the same condition. Reproduced via Playwright by opening "Edit data" on a
  pin, then (without Cancel/Save/Delete) clicking a different item's row — this permanently destroyed the
  first item's expanded .modal DOM, and the next "Edit data" attempt for that type threw exactly the reported
  `Cannot set properties of null (setting 'textContent')`. Confirmed via direct code review and a live repro
  that this affects all four types identically (pin/track/polygon/bearing all share the same showViewDrawer/
  expandDrawerForEdit machinery) — not a pin-specific or trip-specific bug. Fixed with a single guard clause
  in showViewDrawer() matching closeViewDrawer's existing one. Verified via Playwright: the exact regression
  sequence (edit Pin A, click away to a different pin without saving, attempt to edit again) no longer
  throws, and the in-progress edit is confirmed to survive intact (the click-away is now correctly a no-op,
  not a silent discard) rather than merely not-crashing; all four types' "Edit data" open cleanly with zero
  console errors after that sequence, each showing its correct trip value; Save was verified working for all
  four types (initial pass showed unchanged names, root-caused to the test reading localStorage before
  scheduleSave's 700ms persist debounce elapsed — a test-timing artifact, not an app bug — confirmed by
  re-running with a longer wait). `node --check` on all 4 extracted inline `<script>` blocks confirmed clean
  syntax.
- Session 18: Stage 2 of 3 of the Active Trip project — built the Active Trip UI on top of Stage 1's tripId
  foundation (startup prompt, persistent indicator, trip switcher, auto-tag-on-creation, and the Edit-data
  trip field replaced with a real picker). See Architecture notes' "Active Trip UI" entry for the complete
  design. Key decision made before writing code: the item-level trip picker (opened from inside an already-
  expanded Edit-data form) can't reuse #view-drawer — showViewDrawer() now refuses to overwrite content while
  drawerExpandedType is set (the Session 17 fix) — so it needed its own container; chose a plain
  `.floating-panel` (shared with the device-level switcher via a mode flag) over building a second bespoke
  drawer component, since it gets scrim/outside-click/Escape dismiss for free just by joining the existing
  FLOATING_PANEL_IDS/PANEL_SCRIM_IDS arrays. Verified via a battery of from-scratch Playwright runs against
  realistic seeded pre-Stage-2 data (multiple pins/tracks/areas/bearings with real Stage-1 tripId references,
  a real active trip already set): startup prompt shows every load with an active trip (centered, correct
  name, all 3 buttons — Continue leaves state untouched, Start-new opens the switcher, End-trip clears
  activeTripId) and correctly does NOT show with no active trip; indicator chip shows/hides correctly and is
  tappable at any time, not just at startup; search substring-filters the trip list live and typing a
  non-matching query creates nothing; "+ New trip" creates exactly one entity (confirmed via
  findOrCreateTripByName's own dedup) and immediately activates it; creating a brand-new pin, track, area,
  and bearing while a trip is active all correctly pre-filled and saved with that tripId (all four types
  individually confirmed, not just one); "End trip" clears activeTripId while leaving a previously-auto-tagged
  item's own tripId completely untouched; Edit data's picker correctly reassigns just that one item's tripId
  (confirmed it does NOT touch state.settings.activeTripId) and correctly supports clearing an existing
  assignment back to "No trip"; Stage 1's sidebar grouping and trip filter chips still resolve real names
  with zero regression. Root-caused and fixed one real layout bug found only via a screenshot (not visible
  from DOM-state assertions alone): the indicator chip, being a body-level sibling of `<main id="map">`
  rather than a map-scoped child, initially rendered inside #sidebar's own column (same class of bug
  #wildlife-legend's CSS comment already documents) and then, once corrected, collided with MapLibre's own
  NavigationControl — both fixed with position offsets, the second confirmed visually via a second
  screenshot. Several rounds of test-harness-only failures along the way (all fixed in the test, not the
  app, per the actual root cause found each time): an empty `{}` test seed crashed on a real, separate,
  pre-existing gap in loadState's fixup chain (center/zoom aren't defaulted if entirely missing — never
  reachable for a real account, which always has them from initial boot); the shared `boot()` helper tried
  to click a `Continue as guest` link that was correctly absent/hidden once `fieldmap-onboarded` was
  pre-seeded; and two more instances of the same scheduleSave-debounce-timing mistake identified and fixed in
  Session 17 (reading localStorage inside the 700ms window before persist() actually runs). `node --check` on
  all 4 extracted inline `<script>` blocks confirmed clean syntax after every batch of edits.
- Session 19: Design-gap fix reported right after Session 18 shipped — with no trip ever active, there was no
  way to reach the trip switcher at all (the indicator was hidden entirely with no active trip, and the
  startup prompt only ever fires when a trip is already active). See Architecture notes' "Active Trip UI"
  entry's "Persistent indicator" bullet for the full fix (#active-trip-chip now always visible, muted
  "No active trip" state when inactive, same tap target). Verified via Playwright against a genuinely fresh
  seed (zero trips ever created): indicator visible and correctly muted/labeled, tapping it opens the
  switcher with an empty list, "+ New trip" creates and activates the account's very first trip, and
  previously-verified active-trip behavior (name display, switching, End trip) all confirmed unchanged —
  "End trip" specifically confirmed to return to the visible muted state rather than disappearing again.
  `node --check` confirmed clean syntax.
- Session 20: A combined critical-bug-fix + polish pass reported after Session 19 shipped. Two Priority-1
  items, both root-caused via live reproduction (not guessed) before fixing:
  (1) Auto-tag not firing — turned out to be scoped correctly everywhere EXCEPT tap-anywhere's own
  quick-save, which still hardcoded `tripId: null` (deliberately deferred to "Stage 3" in the original Stage
  2 spec, but tap-anywhere is the single most common pin-creation path in the app, so the gap made the whole
  feature look broken). (2) Mobile Edit-data rendering as an unreadable clipped sliver — root-caused to a
  pre-existing gap in #view-drawer.expanded's mobile CSS dating to Session 12 (a negative max-width on any
  viewport under ~420px), never actually exercised at a real mobile viewport's EXPANDED width before, just
  newly exposed more severely by the trip-picker's extra field height. See Architecture notes' "Active Trip
  UI" entry for both fixes' full detail. Also fixed in the same pass: "End trip" upgraded from a text link to
  a full button matching "+ New trip"; the indicator chip repositioned from top-left (where it collided with
  MapLibre's own zoom controls) to directly under the coords/scale-bar column on desktop and centered
  (clearing the search bar) on mobile, plus a real flexbox min-width:0 fix so long trip names now truncate
  instead of wrapping; and the Compass panel's visual container restyled to match #view-drawer's card
  treatment, with its position/interaction model (map stays fully interactive, no scrim — deliberately shared
  with sunrise-panel) explicitly left untouched. Verified via Playwright: all four item types (pin via both
  the standard Add flow AND tap-anywhere, track, area, bearing) confirmed correctly auto-tagged while a trip
  is active; the mobile Edit-data fix confirmed for all four item types via real 390×844-viewport screenshots
  (not just DOM measurements) showing fully readable, non-overlapping content; "End trip" button confirmed
  restyled; the indicator chip confirmed truncating (not wrapping) a deliberately very long trip name on both
  desktop and mobile, confirmed via real bounding-box overlap checks to not collide with the coords/scale-bar
  column, zoom controls, or the mobile search bar (opened); Compass confirmed to still allow live map-tap
  bearing-target-setting after the restyle. Also caught, mid-session, that Session 19's own indicator fix had
  never been written up in CLAUDE.md at all — backfilled that gap into the "Active Trip UI" entry alongside
  this session's own changes rather than leaving it undocumented. `node --check` confirmed clean syntax after
  every batch of edits.
- Session 21: A large batch run without back-and-forth per explicit instruction, in the given order — see
  Architecture notes' "Range Ring and Buffer", "Compass anchor fix", and "Comma-separation audit" entries for
  full design/implementation detail; this is what it took to get there and what was verified.
  Part 1 (quick fixes): finished closing the Compass position gap Session 20's restyle left open (top-center →
  #view-drawer's own bottom-right anchor, both desktop and mobile), and closed the one remaining comma-
  separation gap found by a targeted grep audit (the scale bar's rounded feet/miles labels — area and
  elevation were already correct everywhere).
  Part 2 (new feature): built Range Ring and Buffer as two new persistent, toggleable object types at the
  same tier as pins/tracks/polygons/bearings — full standard-object treatment (data model + all 6 sync
  touchpoints, GeoJSON source/layer pair, +Add sheet entry, sidebar row, expand-in-place edit modal,
  Directions/Share/Edit data/Delete footer, window.FieldMap.* exports), built on two from-scratch geo-math
  primitives this file didn't have before (destinationPoint, then circlePolygonCoords and bufferPolygonCoords
  on top of it) since no geometry library exists anywhere in the app. Both types are entirely user-distance-
  driven with zero preset/default values and a single generic, non-jurisdiction-specific disclaimer, per the
  explicit "tool not the answer" philosophy in the request.
  Judgment calls made along the way, each flagged as instructed rather than stalling: (1) Buffer's creation
  reuses Draw Route's mechanism so completely that its travel-mode selector and Snap-to-trail control remain
  visible (inert, not disabled) during buffer-line drawing — matches the explicit "reuse directly, not a new
  one" instruction rather than partially reimplementing the draw bar to hide them. (2) Range Ring's per-ring
  label uses a plain CSS class rather than polygon's inline-style pattern for its own area label — a harmless
  stylistic inconsistency, not worth retrofitting either direction. (3) Both new types' bulk-selection bucket
  in the sidebar's existing bulk-edit mode falls into the same shared bucket bearing already uses (bulk edit
  for these types wasn't named in the spec either way) rather than adding two more dedicated bulk-selection
  maps.
  Verified end-to-end via the already-connected Chrome browser extension (this sandbox has no local Playwright
  install, unlike prior sessions) against a local `python -m http.server`: Compass confirmed anchored at
  #view-drawer's exact position with live map-tap-to-set-bearing still working; a 3-radii (100/250/500 ft)
  Range Ring renders 3 correct concentric rings with correctly positioned top labels, compact drawer lists all
  3 radii, in-place radii editing live-updates the map, and it survives a full reload unchanged; a bent-line
  Buffer at 50ft renders a correctly rounded-cap/rounded-join polygon with "Width: 50 ft" visible in the
  drawer both immediately and after a reload (the explicit CalTopo-gap fix); Delete correctly removes both
  object types from map, localStorage, and writes tombstones for each (checked directly, since Session 8 once
  had a real bug here for bearings); no console errors observed. `node --check` confirmed clean syntax on all
  4 extracted inline `<script>` blocks. APP_VERSION bumped 2.26.2 → 2.27.0, SHELL_CACHE bumped v130 → v131.
- Session 22: Three bug reports right after Session 21 shipped Range Ring/Buffer — trip picker broken in
  Range Ring edit/Buffer edit/Compass's save-bearing flow, neither new type clickable on the map, and
  Buffer's Width field styled inconsistently with Range Ring's Radii field. Investigated as instructed before
  patching (the report explicitly suspected one shared root cause) — found it was actually two: a missing
  wiring-array entry (Range Ring/Buffer's Trip button had literally no click listener) and a separate z-index
  stacking gap (the shared trip picker, at z-index 1500, rendered underneath any brand-new-item
  `.modal-overlay`, at z-index 2000 — invisible to clicks despite `classList` showing it as open). The two
  bugs only coincidentally looked identical from the outside; see Architecture notes' "Range Ring/Buffer
  wiring gaps" entry for the full mechanism, including why the z-index bug is not actually Compass-specific
  (any new-item creation modal hits it) even though Compass's bearing-save was the only reported instance of
  it. Also fixed: neither type was registered in the shared map-click-dispatcher system pins/tracks/areas/
  bearings all use (the GeoJSON layers existed since Session 21, just never got their click handlers), and
  Buffer's `type=number` Width input fell outside the shared `.modal input[type=text]` CSS rule. Along the
  way, found and fixed one more related gap via the verification step itself (assigning an EXISTING trip, not
  just creating new ones): `computeTripsPresent()` never scanned `state.rangeRings`/`state.buffers`, so a
  trip assigned only to one of those types was invisible in the picker list, filter chips, and sidebar
  grouping — including from the OTHER new type's own picker. Verified live in Chrome: trip assignment
  confirmed from all three reported contexts (create-and-assign a new trip, then separately re-select that
  same trip from a different item), direct map-tap confirmed opening the drawer for both types with no
  sidebar detour, Width/Radii styling confirmed matching, and Pin's own trip assignment (both new-item and
  existing-item edit) confirmed unaffected. One test-process gotcha, not an app bug: a stale service-worker
  SHELL_CACHE briefly served a pre-fix copy of index.html mid-session because the version bump landed before
  one final source fix — resolved by unregistering the SW/clearing Cache Storage for testing; a real user
  would just get the already-bumped cache key on their next visit. `node --check` confirmed clean syntax on
  all 4 extracted inline `<script>` blocks and on service-worker.js. APP_VERSION bumped 2.27.0 → 2.27.1,
  SHELL_CACHE bumped v131 → v132.
- Session 23: Migration layer style test, scoped explicitly to the West Goose Lake elk POC herd only (not a
  general migration-rendering rework — AZ/CA/NM herds get their own pass later, including AnnualRange, which
  isn't present in this herd's data and wasn't touched here). See Architecture notes' "Migration corridors"
  entry for the full color/opacity/stroke design. Before writing any code, checked whether the request's
  premise ("consolidate the existing Low/Medium/High useclass checkboxes into a single toggle") matched the
  actual code — it didn't: Corridor was already one checkbox controlling all use_class tiers together, so
  that part of the ask was already true going in; the real work was entirely on the paint side (per-tier
  stroke colors → one continuous no-stroke gradient) and the legend side (separate Low/High swatches → one
  gradient swatch). Winter Range moved to a soft no-stroke wash, Corridor to an amber→coral `match`-expression
  gradient with no stroke (a per-tier stroke would show as seams between adjacent polygons, breaking the
  "continuous" read), Stopover to pink/magenta with a darker stroke kept specifically so it stays visually
  distinct from Corridor's now-strokeless gradient. `migration-line`'s filter had to become a genuine subset
  of `migration-fill`'s (Stopover only) rather than the same list reused for both, since only Stopover still
  needs a line layer at all. Legend (both the on-map mini-legend and the Wildlife Layers panel's own
  checkbox-row swatches) rebuilt as one row per category in Winter range/Corridors/Stopover order, with
  Corridors rendered as an actual CSS gradient swatch rather than a flat color. Verified live via the
  already-connected Chrome browser extension (this sandbox still has no local Playwright install) against a
  local `python -m http.server`, navigated to West Goose Lake via the app's own coordinate-search box (herd
  center computed from the raw GeoJSON's bounding box, since there's no in-app shortcut to a specific herd):
  all three layers confirmed toggling independently through the real checkbox UI; the Corridor gradient reads
  as one continuous amber-to-coral flow at both a tight zoom and a whole-herd-extent zoomed-out view; Stopover
  confirmed clearly distinct from Corridor at a glance at every zoom level tried; per-feature popups confirmed
  showing "Corridors · Low use"/"Corridors · High use"/"Stopover" correctly. `node --check` confirmed clean
  syntax on all 4 extracted inline `<script>` blocks and on service-worker.js. APP_VERSION bumped 2.27.1 →
  2.27.2, SHELL_CACHE bumped v132 → v133.
- Session 24: Two-part request — recolor Winter Range tan → purple for basemap contrast, and consolidate the
  scattered floating UI (coords/scale/trip chips plus a separate always-on legend panel) into one stack on
  both desktop and mobile, with a new compact "active layers" chip replacing the old legend entirely. See
  Architecture notes' "Floating info stack" and "Migration corridors" entries for full detail. The Winter
  Range recolor also picked up a thin stroke it didn't have before (Session 23 made it a no-stroke wash,
  matching Corridor's now-strokeless design) — a flat wash at 45-50% opacity with nothing else to define its
  edge risked disappearing against some basemap/zoom combinations, so `migration-line`'s filter/paint grew
  back to cover Winter Range alongside Stopover (both now per-category `case` expressions for color and
  width), while Corridor stays the only category with no stroke at all. The UI consolidation replaced four
  independently-positioned elements (each computing its own pixel offset from the previous one's guessed
  height) with a single flex column that only the wrapper positions — gap and width are never guessed again.
  `updateWildlifeLegend()` was renamed to `updateActiveLayersChip()` (all 8 call sites renamed with it, no
  logic changes) and rewritten to render plain species/migration names instead of color swatches, since the
  swatches duplicated the Wildlife Layers panel's own legend and the tap-to-identify popups. Judgment call
  flagged per the task's own instruction to make reasonable calls rather than stall: mobile's stack top
  offset (105px) had to satisfy two separate collision constraints at once — MapLibre's NavigationControl
  and the search bar when opened — that the old layout had solved with two different, disjoint fixes (bottom
  docking for one, top-centering for the other); 105px is the single number that clears both, discovered by
  computing each constraint's actual measured extent rather than guessing. Verified live via the
  already-connected Chrome browser extension against a local `python -m http.server`: Winter Range's purple
  confirmed contrasting well against both Topo and Topo Dark (Aerial untestable — no network access to
  Mapbox tiles in this sandbox, a pre-existing environment limitation); desktop stack confirmed exactly
  230px wide with exactly 8px gaps via `getBoundingClientRect()` on every child, both longest GAP big_game
  species names confirmed non-truncated alone and in the two-line both-active case; the active-layers chip
  confirmed fully hidden (not just empty) with neither layer active, and the stack confirmed collapsing
  cleanly when it disappears. Mobile verification hit a genuine tooling limitation, flagged rather than
  glossed over: `resize_window` does not actually narrow this sandbox's rendered viewport (confirmed via
  `window.innerWidth` staying at native resolution across multiple fresh tabs, with no dedicated
  device-emulation tool available as a fallback) — worked around by injecting the real mobile CSS block as
  an unconditional override to confirm the layout math itself is correct, but this is not equivalent to true
  mobile-viewport or real-device verification, and that verification is still outstanding. `node --check`
  confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.27.2 → 2.28.0
  (minor, per convention for a UI-scope change this size), SHELL_CACHE bumped v133 → v134.
- Session 25: A four-part polish pass on top of Session 24's floating info stack, all in one batch — see
  Architecture notes' "Floating info stack" entry's own "Session 25" sub-bullet for full detail on each part
  and how it was verified. Reordered the Migration picker's checkbox list to Stopover/Corridors/Winter Range
  (display order only, no paint/z-order change); made the active-layers chip tappable (opens `#wildlife-panel`
  directly — flagged as a deliberate deviation from the task's literal "same as the layers toolbar icon,"
  which actually opens the shallower `#layers-panel`) and gave it a small layers-glyph icon; moved the mobile
  chip stack from top-left to bottom-left and narrowed it 230px → 140px, with the active-layers chip now
  truncating long species names via ellipsis rather than widening; and added a tap-to-toggle to the
  coordinates+elevation chip switching both values together between map-center (crosshair icon) and live GPS
  (pin icon, its own independent `watchPosition`, matching the locate-button/Compass pattern of one dedicated
  watch per feature) — flagged as deliberately removing the previous tap-to-copy-coordinates gesture, since
  the new single-tap-toggle left no room to preserve both. Verified live via the Chrome browser extension:
  picker order, chip-opens-panel, and the GPS toggle's icon/value round-trip (mocked `watchPosition`, no real
  GPS in this sandbox) all confirmed on desktop; mobile layout re-verified via the same CSS-injection
  workaround as Session 24 (`resize_window` still doesn't narrow this sandbox's real viewport) — true
  narrow-viewport/real-device verification remains outstanding, same caveat carried forward from Session 24.
  Zero console errors observed. `node --check` confirmed clean syntax on all 4 extracted inline `<script>`
  blocks. APP_VERSION bumped 2.28.0 → 2.29.0, SHELL_CACHE bumped v134 → v135.
- Session 26: Wired in the compiled 10-state USGS Corridor Mapping Team migration dataset, replacing the
  single-herd West Goose Lake POC entirely — see Architecture notes' "Migration corridors" entry for full
  detail. Four compiled species files (Elk/Mule deer/Pronghorn/White-tailed deer) replace the one POC file;
  a property-schema mismatch between the compiled files (`type`/`useclass`/`herdid`) and this app's existing
  reader code (`geometry_category`/`use_class`/`herd_id`/`herd_name`) was normalized once at merge time
  rather than touching every downstream paint expression/filter/popup builder. White-tailed Deer needed no
  picker code at all — the species dropdown is fully data-driven. Added Annual Range as a fourth toggle/
  category (AZ/CA/NM herds have it; teal fill+stroke, same treatment as Winter Range, picked specifically to
  stay visually distinct from Winter Range's purple), with its picker row hidden entirely for any species/
  herd combination that has none (e.g. White-tailed Deer). Fixed the paint/z-order bug explicitly reported
  from the prior session's shipped work (Winter Range rendering on top of Corridors, backwards) via
  `fill-sort-key`/`line-sort-key` — real MapLibre layout properties, confirmed supported in the vendored
  `maplibre-gl.js` before using them — rather than a manual feature-array resort; verified not just visually
  but programmatically, by capturing the live `Map` instance and calling `queryRenderedFeatures()` at real,
  data-confirmed overlap points (a genuine point-in-polygon test against the raw GeoJSON, after an initial
  bounding-box-based search and a low-zoom/under-tessellated screen-space search both produced false-positive
  "overlaps" that didn't hold up against the raw source data or a properly settled zoom level) — confirmed
  the full required stack Stopover → Corridor → WinterRange → AnnualRange (top to bottom) across two real
  multi-category overlaps (an AZ elk herd, an AZ/NV pronghorn herd pair), not just the picker's already-
  correct checkbox order. `states` (an array like `["OR","NV"]` for a herd deduped across state boundaries)
  is preserved through to the rendered feature's properties per spec, confirmed surviving as a real array on
  the data passed to `GeoJSONSource.setData()`. Deleted the old POC geojson file from the repo after
  confirming via a whole-repo grep that nothing else referenced its path. `node --check` confirmed clean
  syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.29.0 → 2.30.0, SHELL_CACHE bumped
  v135 → v136.
- Session 27: A reachability-focused pass — see Architecture notes' "Reachability: zoom/north-reset
  relocation, left-handed mode, double-tap-drag fix" entry for full detail on all four parts. Investigated
  (root cause first, per explicit instruction) a double-tap-drag-zoom regression reported since tap-anywhere
  shipped: read the actual vendored `maplibre-gl.js` handler classes and ruled out both candidates named in
  the task (this app's pre-existing `doubleClickZoom:false`, and tap-anywhere's own click handler) via direct
  source inspection, then found the real mechanism — tap-anywhere's temp marker sits exactly where the
  gesture's second tap must land (within the native handler's own ~30px tolerance), and a DOM element with no
  click listener still fully absorbs a touch landing on it, so the second tap never reached MapLibre's canvas
  handler. Fixed with `pointer-events:none` on the temp marker (it never had any interaction to lose) — a
  genuinely narrow, zero-delay fix, so no long-press fallback was needed. Flagged clearly: this sandbox has
  no touch hardware or emulation (`maxTouchPoints:0`), so the restored gesture itself couldn't be empirically
  exercised here (confirmed working on a real device in Session 29). Relocated zoom (+/-) and north/reset from
  MapLibre's top-left NavigationControl into custom buttons in the same reachable right-side icon cluster as
  search/layers/filter/locate/download, matching that cluster's round style exactly; north-reset's needle
  icon live-rotates with bearing and resets both bearing and pitch on tap, matching the removed control's own
  behavior. Added two device-local settings: "Show zoom buttons" (default on, hides just the two zoom
  buttons, north-reset always stays, pinch/scroll zoom unaffected either way) and "Left-handed mode" (default
  off, mirrors only `#map-controls` to the opposite edge — desktop needed a sidebar-width-aware offset, caught
  via live testing when the first attempt rendered the cluster on top of the sidebar, the same collision
  class already solved once before for `#active-trip-chip`). Flagged, not silently fixed: mobile left-handed
  mode's relocated cluster visibly overlaps the floating chip stack (both bottom-left on mobile) — a direct,
  foreseeable consequence of the task's own explicit "does not mirror... chips" scope line, confirmed live via
  the established mobile-CSS-injection workaround. Zero console errors. `node --check` confirmed clean syntax
  on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.30.0 → 2.31.0, SHELL_CACHE bumped v136 →
  v137.
- Session 28: A mobile-focused follow-up pass — see Architecture notes' "Mobile layout overhaul, compass
  redesign, Tools menu additions, left-handed mode removal" entry for full detail on every part. Redesigned
  the compass/north-reset icon (two full solid triangles, red north/white south, meeting at the center —
  fixing a real rendering bug where each half was only a thin partial wedge, not a complete triangle) on both
  platforms; the live-rotate and tap-to-reset behavior from Session 27 was untouched. Moved Filter and
  Download out of `#map-controls` entirely into two new Tools-sheet entries, on both platforms — same
  underlying panel/modal, just triggered from Tools now, bringing the icon cluster down to 6. On mobile only:
  turned both the floating chip stack and the icon cluster from vertical columns into full-width horizontal
  rows (top and bottom respectively), made the active-layers chip permanently single-line at half the height
  of its row-mates (a CSS-only change; the JS that builds its content was untouched), moved the search bar to
  render below the new chip row instead of overlapping it, and audited every panel/drawer in the app for any
  dependency on the old column shapes — found and fixed one real, newly-introduced collision (the draw/
  measure/polygon/elevation/bearing status bars, previously never overlapping the old right-side icon column,
  now needed a higher offset to clear the new full-width row) and confirmed every actual panel (Layers,
  Wildlife Layers, Filter, Settings, GMU picker, Trip picker, view drawer, compass panel, sunrise panel,
  cluster panel) was already positioned independently of both the icon cluster and chip stack, needing no
  changes. Removed "Left-handed mode" entirely — setting, checkbox, CSS, and wiring — confirmed via a
  repo-wide grep afterward that nothing references it anywhere, the same verification pattern used for the
  West Goose Lake POC removal. Mobile verification used a genuine `<iframe>` at real mobile CSS dimensions
  (390×844) rather than the CSS-injection workaround used in prior sessions, so the real `@media` rule was
  exercised directly rather than a hand-retyped approximation of it — this is what caught a real spec gap
  (the active-trip chip's pill-shaped desktop radius not matching the other three chips' 8px, a mismatch a
  manually-reconstructed override would likely have missed). Zero console errors. `node --check` confirmed
  clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.31.0 → 2.32.0, SHELL_CACHE
  bumped v137 → v138.
- Session 29: A chip-polish follow-up, plus closing out Session 27's one outstanding verification gap —
  double-tap-and-drag zoom was confirmed working on a real mobile device, resolving the last open item from
  that session's investigation. See Architecture notes' "Chip sizing, mobile active-layers row, padding,
  active-trip stroke" entry for full detail on the four fixes. Fixed a real Session 28 bug, not a new ask:
  the mobile active-layers chip (e.g. "Ring-ne...") was rendering crammed into the same row as the 3
  persistent chips instead of its own full-width row beneath them — split via a new `#floating-info-row1`
  wrapper (`display:contents` on desktop, a real flex row on mobile) so the fix touches mobile only despite
  changing the DOM structure both platforms share. Gave desktop's 3 persistent chips the same uniform-height/
  corner-radius treatment mobile got in Session 28 (the trip chip's old 20px pill radius no longer stands
  apart from the other two's 8px), added real 4-sided padding to every mobile chip (was horizontal-only,
  confirmed via screenshot leaving text/graphics flush against chip edges), and made the active-trip chip's
  border match its own status dot's accent color whenever a trip is active, on both platforms. Verified live
  on desktop (exact height/radius/border-color via computed styles) and mobile (the same real-width `<iframe>`
  technique from Session 28) — active-layers chip confirmed on its own full-width row with zero leftover gap
  when hidden, chip padding confirmed with no content clipping via `scrollHeight`/`clientHeight` equality.
  Zero console errors. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks.
  APP_VERSION bumped 2.32.0 → 2.33.0, SHELL_CACHE bumped v138 → v139.
- Session 30: Fixed a real bug the prior session's own padding fix missed — reported (and re-confirmed via
  real device screenshot, not just re-trusting the earlier "verified" claim) that the scale-bar chip's bar
  *graphic* still touched its chip edges on mobile even after Session 29 added padding. Root cause: Session
  29's padding fix only ever inset `#scale-bar`'s own box (which correctly insets the text label, since
  that's plain content flowing inside the padding), but the bar graphic's width has always been set directly
  in JS (`updateScaleBar()`) from a flat, unconditional `maxBarPx = 120`, entirely independent of the chip's
  real available content width — no padding fix to the container could ever have caught this, since the bug
  was in a sibling calculation, not the box model. Fixed by computing `maxBarPx` live from the chip's actual
  `clientWidth` minus its own padding (capped at the original 120 so desktop's wider chip renders identically
  to before). Verified this time with actual cropped screenshots showing real inset on all sides, plus a
  stress test that artificially narrowed the chip and forced a genuine recompute via `map.panBy()` (not just
  a CSS change) to confirm the bar dynamically re-caps rather than being coincidentally correct at one width.
  Also made the mobile search bar's position fully dynamic — it previously used a second hardcoded offset
  (`top:62px`) that was already stale (never updated when row1's height changed) and never accounted for the
  active-layers row's presence at all; replaced with a JS function reading `#floating-info-stack`'s actual
  rendered bottom edge, so it now correctly sits below whichever chip rows are visible in real time, verified
  live with real screenshots in both the overlay-active and overlay-inactive states plus the transition
  between them. See Architecture notes' "Scale bar overflow fix, dynamic search bar position" entry for full
  detail on both fixes and how each was verified. Zero console errors. `node --check` confirmed clean syntax
  on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.33.0 → 2.34.0, SHELL_CACHE bumped v139 →
  v140.
- Session 31: Dropped `mapbox.mapbox-bathymetry-v2` from the vectorbase composite tileset (Topo/Topo Dark/
  Aerial+Topo's shared style source, and the matching offline-download URL) — see Architecture notes'
  "Bathymetry removal from vectorbase" entry for full detail. Re-confirmed, via a fresh audit rather than
  trusting a prior claim, that `water-depth` (maxzoom:8) is bathymetry's only consumer anywhere across all 3
  styles and that `hillshade` (a different tileset entirely) was correctly left untouched. Edited all 3 style
  JSONs via precise text replacement (not a JSON parse/stringify round-trip) so these large minified files
  stay byte-identical apart from the one targeted substring, verified each file's occurrence count before
  writing and JSON validity after. Flagged, not silently ignored: `refresh-style.js` would silently
  reintroduce this if run again, since it re-fetches these same files fresh from Mapbox Studio's own
  account-side config, which this fix has no way to touch from here. Attempted a live before/after real
  download-size comparison as asked, but hit a genuine sandbox blocker: Mapbox's classic `/v4/` API (tiles,
  TileJSON, DEM, satellite) returned 403 Forbidden for every request despite a token that verifies as valid
  via `tokens/v2` — confirmed this affects the old and new URLs identically (not caused by this change) and
  that it also blocks the app's own live interactive tile rendering right now in this sandbox, a more precise
  and more severe finding than an earlier session's "no network access to Mapbox's satellite tile servers"
  note. Surfaced this to the user rather than fabricating numbers; per their explicit direction, accepted the
  code change as already-verified-correct on its own terms, and noted that the real test for this specific
  change should be an actual on-device offline-download size comparison once shipped, not a synthetic sandbox
  substitute. Verified live via style-switching between all 3 edited styles with zero console errors. `node
  --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.34.0 →
  2.35.0, SHELL_CACHE bumped v140 → v141.
- Session 32: A real on-device before/after test of Session 31's bathymetry fix showed no meaningful size
  difference, directly contradicting that session's "verified" claim — correctly so, since that verification
  only ever covered structural correctness, never actual transferred bytes (blocked by the same Mapbox v4 403
  the whole time). Explicit mandate this session: find the real cause, backed by evidence, not another round
  of "the code looks correct." Re-confirmed fresh (not assumed) that the 403 blocker is real and identical for
  both the old and new composite URLs, ruling it out as a difference-causing factor between them. Root-caused
  the actual "no difference" result with code-level certainty: `estimateSizeMB()` computes
  `tile_count × DOWNLOAD_LAYERS[layerId].avgKB` — a flat constant never tied to real bytes — and this exact
  number, computed BEFORE any tile is fetched, is what both the pre-download size picker and every saved
  area's "X MB" line in `renderOfflineAreasList()` display; `avgKB` (35 for vectorbase) was never adjusted by
  the bathymetry removal, so the app's own displayed size is mathematically incapable of ever reflecting this
  fix, regardless of what the fix actually did on the wire. Also completed, via fresh greps rather than
  memory: confirmed `DOWNLOAD_LAYERS.vectorbase.urlTemplate` is the single source of truth for this tile URL
  anywhere in the codebase (no other cached/hardcoded/independently-derived composite reference found), and
  re-read service-worker.js directly to confirm `TILE_CACHE`/`TILE_CACHE_NAME` are the same Cache Storage name
  by design and are deliberately excluded from the `activate` handler's SHELL_CACHE-bump cache-clearing — but
  reasoned that a genuinely different URL string is still a guaranteed `cache.match()` miss regardless, so
  this isn't the cause either (flagged one caveat: this assumes the real device actually reloaded to the
  post-fix JS between tests, which couldn't be confirmed from here). Added real-bytes instrumentation per the
  task's request — `window.FieldMapDebug` (`logTileBytes`/`tileByteLog`/`summarizeTileBytes()`), off by default,
  logging actual `arrayBuffer().byteLength` per tile only when explicitly enabled — for a future real on-device
  test to get real numbers instead of the static estimate; verified it loads cleanly with zero console errors,
  but (same 403 blocker) could not be exercised end-to-end here. See Architecture notes' "Bathymetry removal
  from vectorbase" entry's own "Session 32" sub-bullet for full detail. Reported clearly to the user: the fix
  remains correct, the "no difference" result is explained by the display never being a real measurement, not
  by the fix being broken or a stale cache masking it — real confirmation still requires the new instrumentation
  run on an actual device. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks and
  on service-worker.js. APP_VERSION bumped 2.35.0 → 2.36.0, SHELL_CACHE bumped v141 → v142.
- Session 33: Replaced Session 32's per-tile clone+arrayBuffer byte logging with a true network-level total,
  per explicit follow-up request — see Architecture notes' "Bathymetry removal from vectorbase" entry's own
  "Session 33" sub-bullet for full detail. `window.FieldMapDebug.captureRealDownloadTotal(startFn)` now reads
  every `performance.getEntriesByType('resource')` entry created during a download window (no filtering by
  request name), sums real `transferSize` (falling back to `encodedBodySize` for cache-served/opaque
  responses), and auto-categorizes by URL pattern (vectorbase/DEM/glyphs/sprite/other-uncategorized) so
  anything genuinely unaccounted for stays visible instead of being silently dropped or misfiled. Added
  `triggerTestDownload(...)` alongside it — a non-interactive way to run the app's real
  `computeTileList → downloadTileList → fetchAndCacheTile → fetch()` path without `startOfflineDownload()`'s
  blocking `prompt()` for the area name, making a repeatable automated measurement possible at all. A real bug
  was caught only through live testing, not code review: reading the Resource Timing buffer immediately after
  the download promise resolved under-counted real entries (confirmed via monkey-patching `window.fetch` to
  independently log every URL actually fetched, then diffing against what Resource Timing captured — 12 of 13
  entries on one run, 0 of 13 on another) — entries can lag slightly behind the fetch() promise that triggered
  them, worse with more async plumbing in front of the response (here, the service worker's own
  `respondWith()`). Fixed with a poll-until-stable wait (`waitForResourceBufferToSettle()`) rather than a
  single immediate read; re-verified after the fix with the same monkey-patched-fetch technique across three
  different test configurations (13/13, 8/8 mixed-layer, 3/3 with a deliberately uncategorizable extra fetch)
  — fetch-call count exactly matched captured-entry count every time, and category buckets always summed
  exactly to the reported grand total. Re-confirmed fresh that this sandbox's Mapbox v4 access is still 403
  Forbidden, unchanged and unrelated to this change — so the "real bytes" this sandbox can capture (13 tiny
  403 error bodies, ~299 bytes total, for a small Wasatch-Range z12-13 test area) cannot be used to judge
  whether the bathymetry fix reduces real transferred bytes; that comparison still requires a real device with
  working Mapbox access. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks.
  APP_VERSION bumped 2.36.0 → 2.37.0, SHELL_CACHE bumped v142 → v143.
- Session 34: Closed the exact gap flagged after Session 33 — the capture tool had only ever been verified
  against `triggerTestDownload()`, a parallel test-only path, never the real production
  `startOfflineDownload()` that `offline-download-btn`'s real click handler calls. See Architecture notes'
  "Bathymetry removal from vectorbase" entry's own "Session 34" sub-bullet for full detail. Exposed
  `window.FieldMapDebug._startOfflineDownload = startOfflineDownload` and made `startOfflineDownload()` itself
  `return` its real `downloadTileList(...)` promise instead of nothing — the actual signal for "network tile
  fetching is done." The one real subtlety: the naming `prompt()` + area-save logic was already chained via
  `.then()` directly onto that same promise, attached before the function returns it — since `prompt()` blocks
  the JS thread synchronously and promise handlers run in attachment order, simply returning the promise
  wouldn't have been enough; any external awaiter (the debug capture included) would still be stuck behind that
  first, prompt-containing handler. Fixed by deferring the naming/save logic one tick via `setTimeout(fn, 0)`
  so it runs as a macrotask after the current microtask queue (including the debug capture's own `.then()`)
  drains — imperceptible to a real user, but what makes the returned promise actually usable by an external
  caller. `captureRealDownloadTotal` also gained a diagnostic for when `startFn()` returns `undefined` (one of
  `startOfflineDownload`'s own guards fired — already downloading, or no base layer checked/panel never
  opened) so that case warns explicitly instead of silently reporting a misleading empty "0 requests, 0 bytes."
  Verified live driving the REAL production UI end to end (not a bypass): searched to `35.35, -111.70` (San
  Francisco Peaks near Flagstaff, AZ), opened Tools → Download for real (confirmed via the panel's own live
  "56 tiles · approximately 2 MB" estimate), left Topo checked, then ran the exact task command —
  `window.FieldMapDebug.captureRealDownloadTotal(window.FieldMapDebug._startOfflineDownload)` — from the
  console. Result: 57 requests, 76,010 bytes, fully internally consistent (56 vectorbase + 1 glyphs/fonts = 57;
  1,288 + 74,722 = 76,010) — non-zero and driven entirely by the real function, matching the picker's own live
  56-tile count exactly. Genuinely useful and unplanned: the capture caught a real 74,722-byte `/fonts/v1/`
  glyph request (MapLibre's own lazy glyph loading, unrelated to the offline tile list) that a tile-only
  measurement approach would have been structurally incapable of seeing — real evidence the no-filtering-by-
  name design is doing real work. Also confirmed the real save flow still completes correctly despite the
  restructuring — a real entry landed in `field-map-offline-areas-v1` shortly after the capture resolved.
  Re-confirmed the 56 vectorbase requests still 403 in this sandbox (same blocker as every prior session,
  unrelated to this fix) — a real byte-vs-estimate comparison for actual tile content still needs a real
  device. Zero console errors. `node --check` confirmed clean syntax on all 4 extracted inline `<script>`
  blocks and on service-worker.js. APP_VERSION bumped 2.37.0 → 2.38.0, SHELL_CACHE bumped v143 → v144.
- Session 35: Corrected the `DOWNLOAD_LAYERS` `avgKB` constants from hand-set-once guesses to real measured
  averages supplied by multiple real device tests (cache-cleared, network-verified via Chrome DevTools,
  across 2 geographic areas) — see Architecture notes' "DOWNLOAD_LAYERS avgKB correction" entry for full
  detail. `vectorbase` 35→10, `satellite` 45→23, `usgstopo` 18→16 (small correction), `dem` 22→85 (the most
  consequential fix — previously underestimated in the opposite direction from the others, the reason
  DEM-inclusive combos sometimes exceeded their own estimate), `publicland` 9→2; `snowdepth`/`nlcd` left
  untouched (not remeasured). Noted DEM's real cost is meaningfully terrain-dependent (~30% higher on
  rougher terrain in this data) — 85 is a reasonable single average, not a precise per-area figure, and a
  future terrain-aware estimate could sharpen it further if precision ever matters enough. Verified live by
  driving the real offline-download picker UI (not a synthetic check) for a mountainous AZ area sized to a
  comparable few-hundred-tile scale: Topo alone (570 tiles) → 6 MB, Topo+DEM (724 tiles) → 18 MB, USGS+DEM+
  Private (878 tiles) → 22 MB — all three landed close to (slightly under) the task's stated target bands,
  with the correct direction and magnitude confirmed for every combo: Topo-alone dropped ~3.5x as expected,
  and both DEM-inclusive combos shifted substantially upward, exactly reversing the old under/over-estimate
  pattern. The gap from the exact target bands is expected, not a discrepancy — this session's test area
  isn't byte-identical to the original real-device measurement area. `node --check` confirmed clean syntax
  on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.38.0 → 2.39.0, SHELL_CACHE bumped v144 →
  v145.
- Session 36: A batch of 4 small, unrelated bug fixes (patch version — no new features). See Architecture
  notes' "Session 36 bug batch" entry for full detail on each.
  1. Bulk-edit delete (and, found as the same root cause, bulk-edit's field-apply too) silently no-op'd for
     Bearings, Range Rings, and Buffers — a stale 3-way pin/track/"everything else assumed polygon" type
     check (`bulkSelMapForType`, new) that predated those 3 object types being added at all. Their ids were
     landing in `bulkSelectedPolygons` alongside real area ids, so `confirmBulkDelete`/`applyBulkEdit`'s own
     `state.polygons` lookups silently matched nothing for them. Fixed with 3 new dedicated selection maps
     and a single routing helper, used everywhere the old 3-way ternary was repeated.
  2. Layers panel section headers (Land and boundaries / Environmental / Water / Wildlife — Base Layer
     deliberately excluded, a single-select radio group) now show a right-justified "X/Y" active-toggle
     count badge, counting only each section's own top-level toggles (GMU boundaries counts as one item
     regardless of state selected; Habitats/Migrations each count as one regardless of their own sub-toggles,
     which live in a separate panel entirely). Updates live via one delegated 'change' listener on the panel.
  3. Export and Download in the Tools sheet used the same "arrow into a tray" glyph, just with slightly
     different coordinates — visually indistinguishable at a glance. Export's arrow now points up-and-out
     (mirrors Download's down-and-in), a well-recognized opposite pairing.
  4. Saved offline areas always displayed the base layer as the shared-source-group label ("Topo map data
     (Topo / Topo Dark / Aerial + Topo)") regardless of which single checkbox was actually selected, since
     `area.layerIds` stores deduped SOURCE ids (`vectorbase`/`satellite`) which 3 or 2 different base-layer
     checkboxes all legitimately share — there was no way to reconstruct which one was actually checked from
     `layerIds` alone. Fixed by capturing `selectedOfflineBaseLayerIds()` at download time into a new
     `areaEntry.baseLayerIds` field (the specific checkbox ids, e.g. `['topo-dark']`) used for the base-layer
     portion of the display label; `layerIds` itself is untouched and still drives all tile computation.
     Older saved areas from before this field existed fall back to the old group-label behavior.
  Verified live via the already-connected Chrome browser extension against a local `python -m http.server`:
  created one real bearing, range ring, and buffer through the actual creation UI, entered bulk-edit mode,
  selected all 3, and deleted — confirmed via `localStorage` (not just the UI list) that all 3 arrays
  emptied and exactly 3 tombstones were recorded, not just a visual list refresh. Layer section badges
  confirmed showing "0/3"/"0/3"/"0/2"/"0/2" on a fresh load and updating live to "2/3" after checking two
  Land-and-boundaries toggles. Export/Download icons confirmed visually distinct in a live screenshot.
  Downloaded a real (if 403-blocked, same confirmed sandbox limitation as every prior session) offline area
  with "Topo Dark" specifically checked (not the default "Topo") — confirmed both in `localStorage`
  (`baseLayerIds:["topo-dark"]`) and in the live saved-areas list UI, which now reads "Topo Dark" instead of
  the old ambiguous group label. One real testing gotcha hit along the way, not an app bug: triggering a real
  download without first overriding `window.prompt` in the test tab caused the native dialog (fired from the
  Session 34 deferred-save `setTimeout`) to block the CDP automation channel — matching a limitation already
  documented in this file for `confirm()` dialogs; resolved by closing that tab and redoing the test in a
  fresh one with `window.prompt` overridden first. Zero console errors. `node --check` confirmed clean syntax
  on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.39.0 → 2.39.1, SHELL_CACHE bumped v145 →
  v146.
- Session 37: Consolidated the locate button's, Compass's, and the coords/elevation toggle's 3 fully
  independent `watchPosition()` calls into one shared, reference-counted GPS watcher
  (`subscribeSharedGps`/`unsubscribeSharedGps`), and restored the coords chip's pre-toggle tap-to-copy
  gesture as a long-press (`attachLongPress` + `copyCurrentReadoutCoords`, 450ms, full-precision, suppresses
  the toggle's own click). See Architecture notes' "Shared GPS watcher + restored long-press-to-copy
  coordinates" entry for full detail, including two premises in the original request that didn't match the
  actual code (the locate button and Compass were never already sharing a watcher — all 3 were independent
  by deliberate prior design; and no long-press gesture, "tap-anywhere" or otherwise, existed anywhere in the
  file before this session, so there was nothing to conflict with) and a genuinely dead 4th GPS mechanism
  (`gpsFollowWatchId`/`toggleGpsFollow()`, calls the Leaflet-only `map.setView()` and is never actually
  invoked from anywhere) found and deliberately left untouched as out of scope. Verified live with
  `navigator.geolocation.watchPosition`/`clearWatch` monkey-patched to count real calls: activating all 3
  consumers in sequence via the real UI held the real watch count at exactly 1 throughout, one injected
  position updated all 3 surfaces correctly and independently, and unsubscribing one at a time kept the real
  `clearWatch` count at 0 until the last consumer turned off, at which point it fired exactly once — the
  reference-counted lifecycle confirmed precisely, not just "eventually cleans up." Long-press verified via
  synthetic `PointerEvent`s (no touch hardware in this sandbox): a 600ms hold copied the correct
  full-precision coordinates and left the toggle un-fired; a 120ms short press toggled normally with zero
  copy calls; a held-then-moved pointer triggered neither. Zero console errors. `node --check` confirmed
  clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.39.1 → 2.40.0, SHELL_CACHE
  bumped v146 → v147.
- Session 38: Built Slope Angle and Custom Elevation Range, two new Environmental-section overlay layers —
  see Architecture notes' "Slope Angle and Custom Elevation Range overlays" entry for the complete design.
  Both are pure client-side derivatives of the same terrain-rgb DEM bytes already fetched for elevation
  lookups, computed in a new `terrain-overlay-worker.js` Web Worker (added to `service-worker.js`'s
  `SHELL_FILES`) and rendered via ordinary `type:'raster'` MapLibre sources whose tiles resolve through a
  custom `maplibregl.addProtocol` handler — chosen deliberately over inventing a per-tile image-source
  scheme, since it reuses MapLibre's own native tile loading/caching/zoom-cap machinery for free. Slope
  Angle: standard 8-neighbor (Horn's method) gradient in real meters/pixel, 6 color bands (green 20-25°
  through blue 45°+, under 20° transparent), its own opacity slider, and a floating color-band legend
  (mirrors Public Land's existing legend pattern, anchored to the opposite corner so both can show at once).
  Custom Elevation Range: user min/max (feet) as paired slider+number-input pairs with live 2-way sync and
  a min-never-exceeds-max clamp, rendered as a solid cyan fill (`#00D9E8`) with a deeper-cyan boundary line
  (`#0A7A85`) detected via neighbor-pixel range-crossing (not a fixed-distance heuristic) — a hard-edged
  contour-band look chosen over a soft gradient at the transition, left to judgment per the task. Neither
  overlay has a DOWNLOAD_LAYERS entry — both ride on the 'dem' layer's own tiles, confirmed absent from the
  offline-download modal and confirmed not to affect its size estimate. Elevation Range's on/off state is
  deliberately the one persisted-layer setting that's hardcoded back to off at every boot regardless of the
  saved value (both the checkbox AND `state.settings.elevRangeOn` itself, since `reinitializeLayers()` reads
  the settings value directly) — min/max/opacity persist normally. A real floating-point bug (an exact
  boundary elevation could land on the wrong side of a `<=` comparison due to encode/decode drift) was found
  and fixed via a standalone Node test (`test_terrain_worker_math.js`, 14/14 assertions covering a flat
  tile, 7 known-angle slope ramps spanning all 6 bands + the transparent case, and elevation-range fill/
  edge/transparent/no-false-tile-seam behavior) before ever touching the browser. Live verification (real
  Mapbox v4 DEM access confirmed blocked in this sandbox, same as every prior session) used a global
  `HTMLImageElement.prototype.src` setter patch redirecting any `terrain-rgb` URL to a locally-generated
  synthetic PNG — exercising the real, unmodified protocol handler → Worker → canvas-PNG-encode → MapLibre
  decode/render pipeline with only the underlying network image swapped out: confirmed a correct diagonal
  cyan band with a visible edge line for Elevation Range, correct green→purple slope colors across zoom
  levels for Slope Angle (consistent with real metersPerPixel shrinking as zoom increases), and zero new DEM
  fetch attempts (plus visually identical upscaled tile content) when zooming from Z14 to Z15, confirming
  the `maxzoom:14` cap. Also verified: the Environmental section's toggle-count badge correctly reads "0/5"/
  "2/5"; the offline-download modal shows only the pre-existing 4 "Additional data" entries; and — the most
  precise test in this session — deliberately setting `elevRangeOn:true` in localStorage and reloading
  confirmed the checkbox and layer both come back off despite the persisted `true`, while
  `elevRangeMinFt`/`MaxFt` and Slope Angle's own on/off state correctly survived the same reload. Zero
  console errors throughout, including with the underlying DEM fetch genuinely failing before the synthetic-
  data patch was applied. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks,
  the new worker file, and service-worker.js. APP_VERSION bumped 2.40.0 → 2.41.0, SHELL_CACHE bumped v147 →
  v148.
- Session 39: Fixed Slope Angle's legend overlapping the sidebar's item list on desktop — see Architecture
  notes' "Slope Angle and Custom Elevation Range overlays" entry's own "Session 39" sub-bullet for full
  detail. Root cause: `#slope-legend` is a body-level sibling of `<main id="map">`, so its Session 38
  `left:14px` positioned it 14px from the whole BROWSER WINDOW's edge — inside the sidebar's own column,
  not the map area, which only starts after `--sidebar-width` (330px). Fixed with a `--sidebar-width`-aware
  `calc()` (the same technique `#view-drawer`'s own `max-width` already uses) that centers the legend
  within the map viewport specifically, plus a matching `max-width` adjustment so it can't grow back past
  the sidebar boundary with more chips. Mobile untouched — already correctly hidden there, reconfirmed at a
  genuine 386px width via a real `<iframe>`. Flagged: `#publicland-legend` almost certainly has the
  identical latent bug, but wasn't in scope for this task and was left untouched. Verified live: measured
  real bounding boxes and confirmed the legend's center lands exactly on the map area's midpoint (0px
  error) with zero sidebar overlap. Zero console errors. `node --check` confirmed clean syntax on all 4
  extracted inline `<script>` blocks. APP_VERSION bumped 2.41.0 → 2.41.1, SHELL_CACHE bumped v148 → v149.
- Session 40: Built Aspect, a third Environmental-section overlay reusing Slope Angle's own DEM gradient
  computation — see Architecture notes' "Slope Angle, Custom Elevation Range, and Aspect overlays" entry's
  own "Session 40" sub-bullet for full detail. Refactored `terrain-overlay-worker.js`'s slope calculation to
  extract a shared `gradientAt()` helper (per the task's own explicit framing that Aspect "uses that same
  underlying computation, keeping the direction component instead"), rather than duplicating the gradient
  math; the compass-bearing formula was hand-derived from first principles before writing any code and
  verified against 5 constructed directional test cases (N/E/S/W plus a diagonal blend) via a standalone
  Node test, satisfying the task's own explicit correctness demand that a south-facing slope reads warm and
  a north-facing slope reads cold, not the reverse. Colors an 8-direction hue wheel (blue=north through
  green-yellow=east, orange-red=south, purple=west, with genuine blended intermediate hues at NE/SE/SW/NW)
  via its own compass-wheel-style legend (not Slope Angle's linear band list), reusing this same session's
  Session 39 legend-centering fix. Made mutually exclusive with Slope Angle at runtime — both fully color-
  wash the same terrain pixels and would otherwise visually fight over the same surface — with a toast
  explaining why whenever one auto-disables the other; confirmed via live interaction (not just built and
  assumed) that this reads as an intentional, well-explained constraint rather than a bug. Resolved an
  internally-contradictory piece of the task's own wording around persistence (asked for "the same
  persistence pattern" as Slope Angle, then immediately described Elevation Range's actual, different
  pattern in a parenthetical) by following the more specific literal instruction: Aspect's on/off state
  resets to off at every launch while its opacity persists, matching Elevation Range's own mechanism, not
  Slope Angle's — documented explicitly in code comments and here rather than silently picking one reading.
  Verified live via the already-connected Chrome browser extension against a local `python -m http.server`
  (guest sign-in; real Mapbox v4 DEM access remains blocked in this sandbox): the Environmental section badge
  correctly reads "0/6"; the color wheel legend renders with the exact specified mapping (confirmed via a
  zoomed screenshot); the legend centers with 0px error against the real map viewport, matching Session 39's
  fix; toggling either overlay on correctly disables the other, both directions, with the toast text
  confirmed visible in a screenshot; the opacity slider confirmed genuinely driving the live `aspect-raster`
  layer's `raster-opacity` (captured the real `Map` instance via the Session 26 `Map.prototype` monkey-patch
  technique, not just read the slider's DOM value); `DOWNLOAD_LAYERS` confirmed via source review to have no
  `aspect`/`slopeangle`/`elevrange` key, so the offline-download checklist and size estimate are unaffected.
  Zero console errors. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks,
  `terrain-overlay-worker.js`, and `service-worker.js`. APP_VERSION bumped 2.41.1 → 2.42.0 (minor — new
  layer), SHELL_CACHE bumped v149 → v150.
- Session 41: Two small, unrelated fixes bundled together — see Architecture notes' "Draw-mode status bar
  anchoring, `#publicland-legend` fix" entry for full detail. Draw Area/Bearing/Range Ring's in-progress
  status bars (`#polygon-bar`/`#bearing-bar`/`#rangering-bar`) had always been centered bottom pills, never
  matching the anchored-bottom-right pattern Draw Route/Track and Measure already used — fixed to the same
  `bottom:24px;right:64px` position. Fixing `#bearing-bar`/`#rangering-bar` surfaced a second, deeper
  pre-existing bug along the way: both had their positioning in an inline `style=""` attribute rather than a
  stylesheet rule, which silently defeated the ALREADY-EXISTING mobile override group that was supposed to
  reposition them there too (inline style specificity beats any external rule) — moving both into a real
  stylesheet rule fixes the desktop anchor and finally lets that mobile fix actually apply. Buffer needed no
  fix at all — confirmed via both a grep (no separate `#buffer-bar` exists) and live testing that it already
  renders correctly, since it reuses Draw Route's own `#draw-bar` directly. Separately, fixed
  `#publicland-legend`'s centering — the identical body-level-sibling-plus-`left:50%` bug `#slope-legend` was
  fixed for in Session 39, which that session's own writeup had flagged as "almost certainly" present but
  out of scope; confirmed live this session and fixed with the same `--sidebar-width`-aware `calc()`.
  Verified live via the already-connected Chrome browser extension: all 3 status bars confirmed anchored
  bottom-right via direct screenshot comparison against Draw Route's/Measure's own position; Buffer confirmed
  already correct; `#publicland-legend` confirmed centered with 0px error against the real map viewport via
  `getBoundingClientRect()`, matching Session 39's own verification rigor. Zero console errors. `node --check`
  confirmed clean syntax on all 4 extracted inline `<script>` blocks. Version bump deferred to and bundled
  with Session 42 below (shipped together in one release) — see that entry for the actual APP_VERSION/
  SHELL_CACHE bump.
- Session 42: Built Disturbance History, a new Environmental-section grouping of 3 independently-toggleable
  live overlays — Wildfires (NIFC fire perimeter history, ~98,168 features nationwide, recency-gradient
  wash), Timber Harvest, and Timber Thinning (both USDA Forest Service EDW/FACTS, diagonal-hatch fill,
  15-year rolling lookback) — see Architecture notes' "Disturbance History" entry for the complete design.
  All 3 are live viewport-bbox queries (same architecture as Hydrography/gauge stations, confirmed necessary
  via a live feature-count query before writing any code — this dataset is far too large to bulk-fetch like
  GMU/USFS), but — a deliberate scope decision beyond what Slope Angle/Elevation Range/Aspect needed — also
  real `DOWNLOAD_LAYERS` entries with their own `bboxUrlBuilder`s, so "download this area" performs a real
  fetch and contributes accurately to the offline size estimate. Investigated and flagged, not silently
  shipped, a real architectural gap this surfaced: because the live online query uses an arbitrary viewport
  bbox while the offline download uses a fixed tile-grid bbox, the two URL shapes essentially never match,
  so an offline-downloaded area's cached data isn't actually read back by the live view while genuinely
  offline — these 3 toggles were deliberately kept OUT of `OVERLAY_OFFLINE_TOGGLE_SOURCE` for exactly this
  reason (a coverage-based "should work offline" hint would have been actively misleading), and the
  offline-download modal's own hint text was updated to say so in plain language, not just in code comments.
  Timber Harvest/Thinning's diagonal hatch fill reuses this file's own existing canvas-pattern-image
  technique (`buildOfflinePlaceholderPattern`, generalized into `buildDisturbanceHatchPattern`) rather than
  inventing a new one, since MapLibre has no native hatch paint type. Verified live via the already-connected
  Chrome browser extension against a local `python -m http.server`, navigated to the Deschutes National
  Forest: confirmed real Wildfires data renders with correct age-band coloring (a 2014 fire — 12 years old —
  correctly showed deep maroon "7+ years") and a correct tap-to-identify popup with real incident
  name/year/acres; confirmed the Environmental badge counted 0/9 → 3/9 correctly across all 3 toggles;
  confirmed the offline-download size estimate jumped from 237 tiles/4MB to 309 tiles/14MB after checking all
  3, proving they contribute real, non-zero size unlike a client-only derivative such as Slope Angle. Timber
  Harvest/Thinning's own live ArcGIS queries hit a genuine external 503 mid-session, confirmed via an
  independent direct `curl` against the same USDA endpoint (ruling out an app bug — most likely transient
  rate-limiting from this same session's earlier research traffic against the identical endpoints); the
  correctly-constructed request URL (right WHERE clause, right decade layer ids, right bbox/SR params) was
  already confirmed via live network-request capture taken just before the outage began, and the app degraded
  gracefully with zero console errors throughout. Verified the rendering pipeline itself (independent of
  which service supplies the GeoJSON) by injecting synthetic GeoJSON directly into the live map sources, the
  same technique this codebase already uses for Mapbox-blocked DEM-derived layers — confirmed both hatch
  patterns render legibly and stay visually distinct from each other and from the wildfire wash, and
  confirmed tap-to-identify on a synthetic feature. Flagged rather than silently claimed: the 15-year-
  lookback exclusion itself could not be re-confirmed against real query results after the outage began — the
  WHERE clause was confirmed correctly built, but not the actual server-side filtering behavior live. `node
  --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.42.0 →
  2.43.0 (minor — new layers; this single release also bundles Session 41's fixes above rather than shipping
  a separate patch), SHELL_CACHE bumped v150 → v151.
- Session 43: Closed the exact offline-cache gap Session 42 flagged — the live viewport-query path for
  Wildfires/Timber Harvest/Timber Thinning now checks Cache Storage for previously-downloaded tiles before
  issuing a live network query, so a downloaded area's data genuinely renders while offline instead of only
  contributing to the download's byte count — see Architecture notes' "Disturbance History" entry, its own
  "Session 43" sub-bullet, for the complete bridge design. Investigated both sides (live query shape, offline
  storage shape) before writing any code, per explicit instruction, and confirmed Session 42's own diagnosis
  was exactly right: the two URL shapes never matched. Found and fixed a real bug during design, before
  writing the bridge itself — Timber's WHERE clause embedded the current year's rolling-lookback cutoff
  directly in the query URL, meaning the bridge would have silently broken every New Year's as the
  reconstructed check-time URL drifted from the download-time URL; moved that filtering out of the URL
  entirely (now a stable `where=1%3D1`) and into a shared client-side filter applied fresh at data-apply time
  regardless of source, which also happens to make the "aged out" half of the rolling window self-correcting
  even from a months-old cached snapshot. Also fixed, found necessary while designing the bridge rather than
  as a separate ask: Session 42's `wildfire`/`timberharvest`/`timberthinning` `DOWNLOAD_LAYERS` entries used a
  5-zoom-level range (z9-z13), which both bloated typical download size ~5x for these layers AND left the
  bridge with no single unambiguous tile grid to check cache against — pinned all 3 to one fixed zoom
  (`DISTURBANCE_MIN_ZOOM`) to fix both at once. Re-added the 3 toggles to the offline-availability graying
  indicator, but via a new precise per-tile Cache Storage check rather than the existing table's
  metadata-trusting bounds check, since the metadata-trusting version was never actually accurate for these
  3 layers even now that the bridge exists. Documented the one deliberately-accepted tradeoff — an
  offline-cached view is frozen at download time and can't gain newly-reported data on its own — in the
  Layers panel's Timber disclaimer, the offline-download modal's own hint text, and CLAUDE.md, not just code
  comments, per explicit instruction. Verified live via the already-connected Chrome browser extension:
  downloaded a real small test area (Deschutes National Forest) with all 3 layers checked through the actual
  UI (hit the known native-`prompt()`-blocks-CDP gotcha, recovered by opening a fresh tab against the same
  origin since Cache Storage/localStorage are both origin- not tab-scoped, and confirmed both were intact);
  proved the render bridge with a real network-level test — monkey-patched `window.fetch` to reject requests
  to the exact ArcGIS/USFS hosts these layers query (leaving Cache Storage itself untouched, since it isn't
  network-dependent) and confirmed all 3 layers still rendered real cached data (368/432/652 features
  respectively, read directly from each MapLibre source, not just eyeballed on the map) with zero console
  errors; confirmed the cached harvest features' completion years all correctly fall within the 15-year
  window with none below the cutoff, proving the client-side filter does real work; confirmed the
  offline-availability indicator with `navigator.onLine` forced false through a full round-trip — available
  at the downloaded viewport, correctly grayed at a random never-downloaded location, correctly available
  again on return. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks.
  APP_VERSION bumped 2.43.0 → 2.43.1 (patch — bridges existing functionality, no new user-facing layer),
  SHELL_CACHE bumped v151 → v152.
- Session 44: Renamed "Wildfires" to "Wildfire History" and split it from one layer into 3 independently-
  toggleable time-tiers (Recent 0-20yr, Older 20-50yr, Even Older 50+yr, all default off) — see Architecture
  notes' "Disturbance History" entry, its own "Session 44" sub-bullet, for the complete design. This was the
  direct fix for a real-world report of slow loading on cellular: the original single-layer design queried
  the full unfiltered ~98K-feature/125-year dataset for every viewport regardless of which ages anyone
  actually cared about; each tier now fetches and renders only its own `FIRE_YEAR_INT` range, filtered
  server-side via a WHERE clause computed fresh from the current year every time (never hardcoded). The 3
  tiers are deliberately independent, not exclusive like Slope Angle/Aspect — a fire can only ever fall in
  one age bucket, so any combination can be active with zero visual conflict, confirmed via live testing
  that turning tiers off/on doesn't cross-affect the others. Generalized Timber Harvest/Thinning's existing
  `TIMBER_KIND_CONFIG`-driven shared-implementation pattern from 2 kinds to 3, rather than writing 3 parallel
  copies of the fetch/render/click-handler logic. Found and fixed one real bug before shipping: the shared
  wildfire popup used to close unconditionally whenever the (single, pre-split) layer turned off — naively
  carried over to 3 independent tiers, this would have closed a popup showing a "Recent" fire the moment
  "Older" was toggled off; fixed by tracking which tier the open popup actually came from. Separately,
  increased Timber Harvest/Thinning's hatch density (~1.6x tighter spacing, 1.5x thicker strokes), confirmed
  too sparse against Topo on a real device screenshot. Verified the tier boundary/WHERE-clause math with a
  standalone Node test before touching the browser (31/31 assertions, including an exhaustive check that
  every year from 1900-2026 matches exactly one tier with no gaps or overlap), then verified live via the
  already-connected Chrome browser extension: real captured network requests confirmed all 3 tiers fire with
  the exact predicted WHERE clauses; a real before/after byte comparison for the same bounding box showed a
  45% byte reduction and 81% feature reduction for checking only "Recent" versus the old full-history query;
  fetching all 3 tiers' real feature counts for that same bbox summed to exactly the old unfiltered total
  (9+17+22=48), proving the partition has zero gaps or overlap against real data, not just the math;
  confirmed a real fire correctly renders in its own tier's own age band with a working popup; confirmed the
  offline-download checklist and Layers panel both show the renamed/split entries correctly; confirmed the
  denser timber hatch pattern via a zoomed screenshot. Zero console errors throughout. `node --check`
  confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.43.1 → 2.44.0
  (minor — restructured layer), SHELL_CACHE bumped v152 → v153.
- Session 45: Corrected Session 44's own timber hatch-density change, which had moved in the wrong direction
  — see Architecture notes' "Disturbance History" entry, its own "Session 45" sub-bullet, for the full root
  cause (conflating "more lines" with "thicker lines" — for this diagonal stripe pattern, tile `size` controls
  repeat count via `size/√2` spacing, stroke width only controls per-line boldness) and the fix (`size` 10→6,
  `lineWidth` 3→1.2). Verified via a real zoomed screenshot of live Forest Service timber data (found and flown
  to via a real query against `apps.fs.usda.gov`, not guessed coordinates — this endpoint is reachable in this
  sandbox even though Mapbox's own v4 tile API remains 403-blocked): confirmed both harvest and thinning fills
  now render as a genuinely fine, closely-spaced weave of thin lines, replacing the prior chunky/sparse look.
  `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks.
- Session 46: Built Tap-stack, a generic disambiguation list for any point where 2+ tappable map features
  overlap — see Architecture notes' "Tap-stack" entry for the complete design (16-entry `TAP_STACK_TYPES`
  registry, the `e.defaultPrevented`-based pre-check mechanism that lets it coexist with every existing
  per-layer click handler with zero changes to any of them, bearing dedup across its 2 layers, the reused-dead-
  `#cluster-panel` UI, and the always-fixed "← Back to list" pill). Investigated the full click-handler surface
  first (grepped and read all ~20 `map.on('click', ...)` registrations, both layer-scoped and loop-based) before
  writing any code, to understand exactly how MapLibre's own dispatch model (all click listeners fire in
  registration order regardless of layer-scoping; `preventDefault()` is purely a flag every handler checks
  manually) could be exploited rather than fought. Verified live via the already-connected Chrome browser
  extension using real overlapping government data — found a genuine 3-feature overlap (2 timber-harvest
  polygons + 1 GMU boundary) via real point-in-polygon math against live-fetched data, drove an actual mouse
  click there (not a synthetic JS event), and confirmed: the list shows all 3 correct items; tapping a row opens
  that item's existing, completely unmodified detail view (tested both a `#view-drawer`-based type [GMU] and a
  raw-`maplibregl.Popup`-based type [timber]); "← Back to list" appears only after reaching a detail view via
  the stack and correctly returns to the identical cached list; a genuine single-feature tap elsewhere opens
  directly with no stack panel ever appearing. Hit and resolved one real tooling gotcha along the way (not an
  app bug): a stale Chrome DevTools device-metrics override on one test tab (left over from earlier mobile-
  viewport testing) silently corrupted `queryRenderedFeatures`' pixel-space hit-testing on that tab alone —
  resolved by testing from a fresh tab instead of trying to repair the corrupted one. Zero console errors
  throughout. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks.
- Session 47: Shortened the Wildfire History sub-layer labels (dropped the redundant "Wildfire History —"
  prefix, since the 3 tiers already live under the "Disturbance History" section header) and fixed a real
  layout bug the rename alone didn't resolve — see Architecture notes' "Disturbance History" entry, its own
  "Session 47" sub-bullet, for the full root cause (a shared `?` info-panel button living inline inside the
  Recent row's own label was eating enough of that ONE row's width to force a wrap, despite Recent's text being
  the shortest of the three) and the fix (moved the button to its own shared line after all 3 rows; zero JS
  changes needed since the existing click handler is delegated by `data-layer-id`, not DOM position). Root-
  caused via live `getBoundingClientRect().height` measurement rather than guessing from the screenshot alone
  (46px for Recent vs. 29.8px for its siblings, despite shorter text — the actual signal that ruled out the
  rename itself as an insufficient fix and pointed at the button instead). Verified live: all 3 rows now measure
  the identical single-line height, and the relocated `?` button confirmed still correctly toggling the shared
  info panel via the unchanged delegated handler (a real show→hide→show round-trip, not just a DOM presence
  check). `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped
  2.44.0 → 2.45.0 (minor — new feature, tap-stack), SHELL_CACHE bumped v153 → v154.
- Session 48: Two unrelated fixes — see Architecture notes' "Draw Route/Buffer mode-selector overflow" and
  "Offline point-snap for Draw Route/Buffer" entries for full detail on each.
  Fixed the mode-selector overflow bug properly this time: an earlier fix attempt had only been checked at 0
  points (empty bar), and broke in real use once a route actually had several points and elevation stats
  populated the stats text wide enough to push the car/walk/hike icons off-screen — root cause was the icons
  sharing the SAME `white-space:nowrap` line as the (unboundedly-growing) stats text. Fixed by giving the
  mode selector its own dedicated row, completely unaffected by how long the stats line grows, and letting
  the stats text wrap normally instead of forcing nowrap. Verified this time at the actual reported bug
  scenario, not just at 0 points — added 6 real points with a realistic long stats string on both a normal
  desktop viewport and a real 390px-wide `<iframe>` (genuine mobile `@media` matching), confirming via
  `getBoundingClientRect()` that all 3 profile buttons stayed fully within the bar's bounds at both
  breakpoints, with screenshots confirming the mode selector renders as its own visible row, never clipped.
  Built offline point-snap for Draw Route/Buffer's "Snap to trail": when the real path-traced ORS snap can't
  run (offline) or fails for any other reason, each dropped waypoint is now independently moved to the
  nearest point on the nearest trail/road line MapLibre currently has rendered from already-downloaded vector
  tile data — pure nearest-line geometry, deliberately NOT real path-tracing/routing between points (a
  separate, larger, already-scoped-elsewhere project). A point with nothing nearby is left unsnapped rather
  than failing the whole action, and the closing toast reports how many of the total points found something
  to snap to. Verified the pure geometric math via a standalone Node test (10/10 assertions) before touching
  a browser, then verified the live query/project/nearest-segment/unproject mechanism end-to-end against real
  rendered line data in this sandbox despite Mapbox's own vector-tile access being blocked here (same
  standing limitation as every prior session touching road/terrain data) — added a small
  `window.FieldMapDebug.nearestTrailPointOffline` hook (mirroring the established Session 32-34 debug-hook
  pattern) whose optional layer-list override let this session point the exact same real mechanism at
  Hydrography flowline data instead, a different but genuinely reachable real line layer: a point offset 5px
  from a real flowline vertex snapped to within 0.483px of the true line geometry, a point beyond the 150ft
  search radius correctly returned null, and a deliberately far-away point also correctly returned null.
  Separately confirmed, using the real production `TRAIL_SNAP_LAYERS` against a real drawn route, that both
  fallback triggers work — forcing `navigator.onLine` false skips the ORS fetch entirely and goes straight to
  the offline fallback (confirmed zero ORS network calls via a monkey-patched `fetch`), and forcing the ORS
  fetch itself to reject (while "online") falls back identically via the existing `.catch()` — both correctly
  showing "Couldn't snap — no downloaded trail/road data near these points" in this sandbox, since no real
  Mapbox road data can load here to snap to; a real device with working Mapbox access is what would exercise
  the actual "points do snap" success path against real road/trail data end-to-end. Hit and worked around a
  real sandbox rendering-pipeline stall along the way (WebGL canvas stuck solid black, `queryRenderedFeatures`
  returning 0 despite populated source data) worse than the `requestAnimationFrame`-throttling gotcha
  documented in Sessions 27-28 — resolved by moving to a fresh, minimally-loaded tab rather than continuing to
  fight an already-degraded one; confirmed via `getStyle().layers.length` and real click-driven interaction
  that the app's own JS/data layer stayed fully functional throughout, distinguishing this from an actual
  functional regression. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks and
  service-worker.js. APP_VERSION bumped 2.45.0 → 2.46.0 (minor — new feature, offline point-snap), SHELL_CACHE
  bumped v154 → v155.
- Session 49: a real-world bug report from a multi-day field trip — a 178MB offline download progressively
  went blank over several days, worse with each app session, while pins/tracks stayed intact — investigated
  first (49a, investigation-only, no code changed) then fixed (49b) in the same overall session.
  49a root-caused the exact mechanism via static code review, no live device or working Mapbox access
  available in this sandbox (same standing limitation as every prior session touching DEM/vectorbase): the
  service worker's `activate` cache whitelist, cache-name consistency across the whole git history, and the
  offline downloader's own URL construction were all confirmed correct/stable — ruling out an LRU/off-by-one
  eviction bug, a cache-name mismatch, or the service worker's own update lifecycle firing too often. The real
  cause turned out to already be documented and half-fixed in this very file: a comment in
  `reinitializeLayers`'s terrain block describes finding and fixing this identical mechanism for the DEM/
  raster-dem source — Mapbox's real v4 TileJSON response injects a session-varying "sku" tracking param into
  the tile URL template it hands back, meaning a TileJSON-mediated source's live tile requests can silently
  stop matching whatever was cached under the offline downloader's own sku-less, hand-built URL pattern. That
  fix was never applied to the composite (vectorbase) or `mapbox.satellite` sources — the actual visible
  basemap tiles for Topo/Topo Dark/Aerial+Topo/Aerial, exactly what the field-trip download used. See
  CLAUDE.md's own "Investigation Findings" writeup (delivered as the 49a report, not committed to this file
  verbatim) for the full reasoning chain, including why USGS Topo/Public Land/DEM were independently ruled out
  as vulnerable (all three use a static `tiles:[...]` array matching the downloader exactly, confirmed via
  direct comparison) and why the white-screen symptom was flagged as a separate, less-certain issue rather
  than folded into the same root cause.
  49b applied the fix: `patchStyleForOfflineTileParity()` rewrites the composite/satellite sources to a
  static `tiles:[...]` array (the same pattern already proven for DEM), a new `OFFLINE_DOWNLOAD_HEADER` marks
  offline-downloaded tiles so the service worker's stale-while-revalidate handler skips background
  revalidation for them entirely (a second, independent layer of protection covering the general "no
  distinction between casually-browsed and deliberately-downloaded" design gap, not just the sku mechanism
  specifically), and `[BOOT]` `console.time`/`console.timeEnd` instrumentation was added across every major
  boot stage to diagnose the separately-reported ~8s white screen — instrumentation only, per explicit
  instruction, no fix attempted for that symptom yet. See Architecture notes' "Offline tile cache-key parity +
  protected downloads + boot timing" entry for full mechanism detail and verification. Verified via a
  standalone Node simulation of the complete `loadStyle()` transform pipeline against the real style JSON
  files (byte-identical resulting tile URLs to what the downloader caches, for all 3 local styles' composite
  source and the satellite source), and a second simulation of the protect/skip-fetch logic against real
  `Headers`/`Response` Web API objects with a mocked Cache Storage container (zero network fetch calls for a
  protected tile, normal revalidation preserved for an unprotected one). Explicitly flagged as still needing a
  real device: the remote `aerial` style's actual JSON structure (this sandbox can't fetch it), the real
  field-trip incident scenario end-to-end, and the `[BOOT]` timing numbers themselves. `node --check` confirmed
  clean syntax on all 4 extracted inline `<script>` blocks and `service-worker.js`. APP_VERSION bumped
  2.46.0 → 2.47.0 (minor — significant reliability fix for a confirmed real-world data-loss bug), SHELL_CACHE
  bumped v155 → v156.
- Session 50: made Session 49's `[BOOT]` console timing markers viewable on-device with no computer — the
  real testing environment (an iOS home-screen PWA, no Mac available for remote Safari inspection) has no
  reachable console at all, which Session 49 hadn't fully accounted for. Replaced the plain `console.time`/
  `console.timeEnd` pairs with `bootMark()`, which both logs (for anyone who does have DevTools) and records
  each stage's elapsed ms into a `bootTiming` object from one call site, then `finalizeBootTiming()` (called
  once the map reaches its first `idle`) builds a plain-readable summary and persists it to localStorage,
  along with a capped rolling history of the last 10 launches — a single snapshot can't answer "is this
  happening every time," which is exactly the question this instrumentation exists to answer. Viewed via 5
  taps on the version number in Tools → About (`showBootTimingDebugView()`, a new `#boot-timing-modal`) —
  chosen over an auto-shown toast (more moving parts for no real benefit) or a `?debug=boot` URL param
  (rejected specifically because a standalone iOS PWA has no visible/editable address bar to append one to).
  Also added a launch-gap diagnostic (`classifyLaunchGap()`), reasoned through carefully since the literal ask
  ("distinguish cold launch from warm resume") doesn't map cleanly onto what this JS environment can actually
  observe: a genuine warm resume never re-executes any of this script at all (the JS context and its timers
  just persist untouched), so there is no boot work to measure in that case — what CAN be measured, and is the
  actually useful diagnostic, is how long the app was backgrounded before THIS reload happened, tracked via a
  `visibilitychange`/`pagehide`/15s-periodic-while-visible timestamp and bucketed into "no prior record" /
  "<60s, SUSPICIOUS (possible aggressive OS reclaim)" / "<30min, fairly short" / "normal cold start," alongside
  the standard `PerformanceNavigationTiming.type` as a complementary signal. See Architecture notes' "Offline
  tile cache-key parity + protected downloads + boot timing" entry, its own "Session 50" sub-bullet, for full
  mechanism detail. Verified via extraction-based tests (the real function source pulled verbatim from
  `index.html` and run against mocked browser globals, not a hand-copied reimplementation, so a bug in the
  shipped code would actually show up): all 4 gap-classification buckets produce correct labels; `bootMark`
  computes correct elapsed ms; `finalizeBootTiming()` produces a complete, correctly-formatted summary and
  persists it; pushing 15 sequential captures confirmed the history stays capped at exactly 10 entries, never
  growing unbounded; the on-device viewer correctly reads back both the current capture and history. The
  5-tap trigger's timing logic (5 rapid taps → fires once; 3 taps + a 3s gap + 2 more taps → does NOT fire,
  confirming the reset actually works; two full sequences back to back → fires twice) was verified with a
  separate deterministic fake-clock simulation of the identical inline logic. One sandbox-only test artifact
  was hit and confirmed harmless via isolated reproduction, not a product bug: this sandbox's Node 24 has its
  own built-in `navigator` global lacking `onLine`, which can't be shadowed by a test mock — real browsers/
  WKWebView (the actual target) have no such collision. `node --check` confirmed clean syntax on all 4
  extracted inline `<script>` blocks and `service-worker.js`. Explicitly flagged as still needing a real
  device, not assumed covered by the sandbox tests: the actual boot-timing numbers themselves, whether the
  cold/warm reasoning holds up against real iOS WKWebView lifecycle behavior (not just spec reading), and
  whether a real touch-tap on the version number fires the same event this trigger listens for. APP_VERSION
  bumped 2.47.0 → 2.47.1 (patch — on-device diagnostics for an already-shipped instrumentation feature, no
  behavior change to the app itself), SHELL_CACHE bumped v156 → v157.
- Session 51: Two follow-ups to Session 50's boot-timing instrumentation, both triggered by a real captured
  data point rather than further code review alone. (1) Added Navigation Timing capture
  (`captureNavigationTiming()`) — a real device showed the app's own [BOOT] stage timers summing to only
  ~600-665ms while the actual observed cold-launch delay was ~8s, meaning most of the delay was happening
  before this app's own boot code even starts, structurally invisible to any in-app marker;
  `performance.getEntriesByType('navigation')[0]` (populated by the browser automatically, zero app-code
  involvement) now surfaces network fetch timing, whether the shell was served from cache or network,
  service worker startup (`workerStart`), and document-parse milestones, plus a headline `preAppCodeGapMs`
  number that directly quantifies the previously-invisible gap. (2) Fixed a real accuracy bug in the launch-
  gap classifier: a genuine 2-minute background gap was flagged "SUSPICIOUS — possible aggressive OS process
  reclaim" and turned out, on inspection, to be an entirely ordinary user-initiated force-close. Investigated
  whether force-close and OS reclaim are actually distinguishable from web code at all before writing any
  fix, per explicit instruction not to add a signal that looks authoritative but isn't — they are not, for a
  structural platform reason (no API exposes OS-level termination cause to page JS, and neither
  `pagehide`/`beforeunload` nor gap duration itself reliably differs between the two cases). The classifier
  no longer attaches a causal verdict — it reports gap duration as plain data with an explicit "cause not
  determinable" disclaimer baked into the label itself. See Architecture notes' "Offline tile cache-key
  parity + protected downloads + boot timing" entry, its own "Session 51" sub-bullet, for full mechanism
  detail and verification (extraction-based tests against a realistic mocked PerformanceNavigationTiming
  entry and mocked browser globals, not a reimplementation). `node --check` confirmed clean syntax on all 4
  extracted inline `<script>` blocks and `service-worker.js`. APP_VERSION bumped 2.47.1 → 2.47.2 (patch),
  SHELL_CACHE bumped v157 → v158.
- Session 52: Added service worker internal timing + Cache Storage size reporting, directly triggered by
  Session 51's own Navigation Timing capture: a real device showed ~8.4 of ~8.68 reported cold-launch seconds
  sitting between fetchStart and responseStart for the shell's own navigation request, with transferSize:0
  (served by the service worker's own cache-first handler, not the network) and TTFB reading n/a — exactly
  the scenario MDN documents Navigation Timing as unreliable for once a service worker intercepts the
  response. `service-worker.js` now times itself directly (script start, install, activate start/complete,
  first fetch event, and specifically the shell/navigation request's own received→respondWith duration,
  identified via the standard `req.mode === 'navigate'` signal) using `Date.now()` throughout — a service
  worker is a genuinely separate JS context from the page with its own unrelated `performance.timeOrigin`,
  so epoch time is what makes these marks directly comparable to the page's own `[BOOT]` marks with zero
  reconciliation math needed. Persisted two independent ways for reliability: a `postMessage` broadcast
  (fast, but can race a genuine cold start where the page's own listener isn't registered yet) and a small
  dedicated Cache Storage entry the page can pull from at its own convenience, any time later — the actually-
  reliable path, and the one `finalizeBootTiming()`'s new async enrichment (`enrichBootTimingWithSwTiming()`)
  uses, only trusting a pulled snapshot if it's less than 60s old (the cache entry persists across sessions
  until next overwritten, so a stale multi-session-old snapshot must never be silently presented as this
  boot's own). Also added `measureCacheStorageStats()` — enumerates every live cache via `caches.keys()`
  (never hardcoding exact versioned names, which change every session for `SHELL_CACHE`), reports each one's
  entry count (always cheap) plus an approximate byte total summed from `Content-Length` HEADERS only (never
  a body read), skipping the per-entry scan above 2000 entries for any one cache — a large offline-downloaded
  tile area could plausibly hold many thousands of entries, and this diagnostic must not itself add real cost
  to the very boot-time problem it exists to investigate — falling back to `navigator.storage.estimate()`'s
  origin-wide total beyond that cap. Both new data sources surface in the same `#boot-timing-modal`/5-tap
  viewer, arriving asynchronously after the initial synchronous write (by design) and rebuilding/re-
  persisting the summary in place once ready — `buildBootTimingSummaryText()` was extracted out of
  `finalizeBootTiming()` and `persistBootTimingRecord(isNewBoot)` replaces the old inline localStorage-write
  logic specifically to support this without duplicating the summary-building block or double-pushing history
  entries. See Architecture notes' "Offline tile cache-key parity + protected downloads + boot timing" entry,
  its own "Session 52" sub-bullet, for full mechanism detail and verification (extraction-based tests against
  a hand-built multi-cache mock of the real Cache Storage API — confirmed correct entry counts and header-
  summed byte totals, confirmed the >2000-entry skip-scan behavior, confirmed exactly one history entry after
  finalize plus both async enrichments run, not a duplicate push — not a reimplementation; two rounds of
  apparent test failures were traced to test-harness mistakes and fixed, and a third to the same Node-24-
  built-in-`navigator` sandbox artifact already documented in Session 50's own entry, not a product bug).
  `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks and `service-worker.js`.
  **Still needs the real phone**: the actual SW timing numbers and cache sizes on the affected device, and —
  the core question this session was built to answer — whether SW startup/shell-fetch duration actually
  scales with cache size, which requires comparing real measurements across offline downloads of genuinely
  different sizes. APP_VERSION bumped 2.47.2 → 2.47.3 (patch), SHELL_CACHE bumped v158 → v159.
- Session 53: Investigated and fixed a real, silent Export failure — clicking Export produced zero visible
  response (no error, no console output, no file prompt). Investigated per explicit instruction before
  writing any fix: confirmed the click handler WAS firing correctly with no early return or account/auth
  guard anywhere in the chain — the real cause was two independent bugs, both introduced together in the same
  historical reorg that moved Export from a sidebar button into the Tools sheet. (1) `#export-menu` lost its
  `.dropdown-wrap` anchor when its dedicated trigger button was removed, and picked up a stray inline
  `position:fixed` override with no JS ever positioning it — under `position:fixed`, the `.dropdown-menu`
  class's own `top:calc(100% + 6px)` resolves against the viewport rather than a nearby element, rendering
  the menu entirely below the visible screen on every open, genuinely invisible with zero errors. (2) the new
  Tools-sheet trigger's click handler never called `e.stopPropagation()`, so the very click that opened the
  menu also bubbled to the document-level outside-click-dismiss listener and immediately closed it again in
  the same event — a second, independent reason it would have stayed invisible even with (1) alone fixed.
  Git archaeology (`git log -S` against both the `#export-menu` HTML and the `sheet-export-btn` handler)
  traced this to a commit pair at `APP_VERSION '1.1'` — meaning Export has almost certainly been silently,
  completely broken since very early in the project's history, undetected across 50+ subsequent tracked
  sessions because none happened to specifically test the Export button. Confirmed via direct code review
  that the account-switching angle from the original bug report was never actually implicated:
  `exportGeoJSON()`/`exportGPX()` read straight from the live, module-scope `state.pins`/`state.tracks` with
  zero account-specific conditionals anywhere in either function or the shared `downloadBlob()` helper they
  call. See Architecture notes' "Silent Export failure, root cause + fix" entry for full mechanism detail on
  both bugs and the exact commits that introduced them. Verified live in guest mode with a real pin created
  through the actual tap-anywhere flow: Export now opens correctly positioned AND stays open (confirmed both
  fixes were needed together — the CSS fix alone still left the menu self-closing on the same click); GeoJSON
  and GPX exports both produce correct files with the real pin's actual data (captured via a
  `document.createElement('a')` monkey-patch, since a native save dialog can't be automation-driven); the
  exported GeoJSON was fed back through the real import pipeline via a programmatic `DataTransfer`/`change`
  event (the closest reproducible proxy for "a different account importing this file," since two genuinely
  distinct signed-in Google accounts aren't simulable in this sandbox) and correctly parsed back into the
  same pin, correctly flagged as a likely duplicate against the still-present original; zero console errors
  throughout, confirmed via `read_console_messages` with `onlyErrors:true`. One real testing-only gotcha hit
  and resolved, not a product bug: a stale service worker served a cached pre-fix copy of `index.html`
  mid-session after the second fix landed, making it briefly look like the fix hadn't worked — resolved by
  unregistering the SW and clearing Cache Storage before reloading, the same documented gotcha noted in many
  earlier sessions. `node --check` confirmed clean syntax on all 4 extracted inline `<script>` blocks.
  APP_VERSION bumped 2.47.3 → 2.47.4 (patch), SHELL_CACHE bumped v159 → v160.
- Session 54: Restructured the Wildlife Layers panel from a 2-top-level-tab (Habitats/Migrations) + 3-subtab
  picker into 3 flat categories (Big Game/Upland Game/Fish) with a species-first flow, folded Migrations into
  a collapsible per-species sub-section instead of its own tab, and wired in 5 confirmed state-wildlife-
  agency "State Data" sources (Washington/Oregon/Arizona fish, Utah upland, Nevada big game/upland/fish) as a
  third data-source tier alongside the existing Habitat range and Migrations — see Architecture notes'
  "Wildlife Layers restructure: Big Game/Upland Game/Fish, State Data" entry for the complete design. Every
  REST endpoint was independently confirmed via the ArcGIS Online sharing API rather than guessed from a URL
  pattern, per explicit instruction for the two sources (Utah, Nevada) found only via Hub dataset pages. All
  user-facing "GAP" jargon was replaced with "Habitat range." Caught one real gap in this entry's own first
  draft before finishing — Nevada's fish tier (Lahontan Cutthroat Trout) had been designed but never actually
  wired into `STATE_DATA_SOURCES`, despite the task's explicit "Nevada — Big Game, Upland, Fish (all 3
  categories)" — found and fixed by re-running the same ArcGIS sharing-API search this session used for every
  other source, confirming NDOW's own "Lahontan Cutthroat Trout Distribution in Nevada" service (same org id
  as Nevada's already-wired big-game/upland services) via a live `curl` query before wiring it in. Found and
  fixed two real MapLibre bugs while building the State Data map layers, both the "silently never added, no
  thrown exception" shape and both only caught via live testing, not code review: a data-driven expression on
  `line-dasharray` (a camera-only style-spec property) and a `!in` legacy-filter operator mixed with modern
  `['get',...]`/`['literal',...]` expression syntax — see that same Architecture notes entry for the full
  mechanism and fix (splitting into two fixed-dasharray layers by filter; using `['!', ['in', ...]]` instead
  of `['!in', ...]`). Also found and fixed a third bug the same way (live-testing-only, not visible from code
  review): turning State Data on genuinely rendered its map layer but never added a line to the active-layers
  chip, because `setWildlifeStateDataState`/`setWildlifeStateDataOn` were the only two on/off setters in this
  file that didn't call `updateActiveLayersChip()` — fixed by adding the same call already used by every
  other setter (`setWildlifeOn`, `setMigrationCategoryOn`). The connected Chrome browser extension broke down
  twice mid-session (new tabs/navigations stopped responding — distinct from the WebGL-stall gotcha
  documented in Sessions 27-28/48 — recovering both times on its own after non-browser work), which is why
  verification happened in two rounds rather than one continuous pass: round 1 confirmed the 3-category
  structure, Fish's species dropdown grouping (exactly matching Oregon's approved 34-species list plus
  Arizona's 3 additional coldwater species, zero extras/missing), the State Data picker's per-species state
  filtering, and a real live 3-layer merge/render of Arizona's Apache Trout data with the dasharray/`!in`
  fixes confirmed correct via a genuinely fresh full reload; round 2 (after the first recovery) confirmed Big
  Game's Elk (Rocky Mountain) — Habitat range auto-check, the Migrations section's real "0/4"→"1/4" badge
  update and expand/collapse, and Nevada State Data rendering a real third fill layer — which is what
  surfaced the third (chip) bug above. The chip fix itself was written right as the tooling broke down a
  second time, so it's a direct code-reviewed fix matching an already-proven pattern, not independently
  re-confirmed via a live screenshot. Not click-tested this session, flagged rather than silently presented
  as verified: Upland Game specifically (same code path as Big Game/Fish, not a different one), the State
  Data fill layer's tap-to-identify popup (an exact copy of `migration-fill`'s own already-proven handler),
  and Washington/Oregon/Utah/Nevada-fish's endpoints through the actual in-app picker (all confirmed reachable
  via direct `curl`, including a live feature-count check on Nevada's fish endpoint, but not driven through
  the UI — only Arizona and Nevada-big-game went through the real in-browser flow). `node --check` confirmed
  clean syntax on all 4 extracted inline `<script>` blocks after every edit, including all three fixes.
  APP_VERSION bumped 2.47.4 → 2.48.0 (minor — significant structural change to an existing feature, per
  explicit instruction), SHELL_CACHE bumped v160 → v161.
- Session 55: Three related fixes to Session 54's Wildlife Layers restructure, all reported from real use —
  see Architecture notes' "Wildlife panel flow fix, unified per-species view, Fish color/geometry correction"
  entry for full mechanism detail on each. (1) Root-caused the "category checkbox only works for Upland"
  report to a single shared bug, not 3 separate ones: the Layers panel's Big Game/Upland Game/Fish checkboxes
  called the same function the species panel's own "Habitat range" checkbox uses, which only ever renders
  anything when a species is ALREADY the active selection — Upland's checkbox looked functional purely
  because Chukar happened to already be selected from prior testing, while Big Game/Fish (nothing selected
  yet) looked broken for the identical underlying reason. Fixed by making it a real master toggle
  (`wildlifeMasterOn`) that shows/hides everything currently configured for the active species — Habitat
  range, Migrations, State Data — together, without clearing any of those individual selections, same
  philosophy as the Aspect master toggle from an earlier session. (2) Embedded the State Data state picker
  directly into the species panel instead of a separate popout screen reached by tapping a compact row — the
  old flow required leaving species selection to pick a state, then leaving that screen again to get back to
  the rest of the species' sources; now Habitat range, Migrations, and State Data all stay visible and
  configurable together in one connected view once a species is picked. (3) Recolored Fish's State Data
  layers from a brown/tan "Habitat range" look to a blue family matching AZGFD's own Trout Challenge site
  (picked deliberately further from Elevation Range's existing cyan than a naive blue choice would land, so
  the two can never read as the same overlay), and fixed a real bug where Streams (polylines) were rendering
  with a fill — root-caused to shape being guessed from each source's semantic layer name rather than its
  real GeoJSON geometry type, which would ALSO have kept mis-rendering Washington's own fish layer (itself a
  polyline despite being named "range" like every polygon source in the catalog) even after a name-based fix
  for Arizona's streams specifically; fixed with a geometry-driven `_sdShape` tag instead. **This session
  could not reach a live browser at all** — every attempt (multiple fresh tabs, fully closing/recreating the
  tab group, retrying after waits) left the connected Chrome extension unable to actually render the page, a
  harder and non-recoverable version of the tooling breakdown Session 54 hit partway through (which did
  eventually clear on its own; this one never did). None of this session's changes were verified live as a
  result — flagged explicitly and repeatedly rather than silently presented as tested; every change was
  instead verified via a full manual code-path trace and a complete `git diff` re-read before finalizing, but
  a real live pass (the real mobile device the task asked for, ideally) is the necessary next step before
  trusting this in practice, not an optional follow-up. `node --check` confirmed clean syntax on all 4
  extracted inline `<script>` blocks after every edit. APP_VERSION bumped 2.48.0 → 2.49.0 (minor — real UX
  restructuring, per explicit instruction), SHELL_CACHE bumped v161 → v162.
- Session 56: Confirmed a genuinely working live browser FIRST, per explicit instruction, before touching any
  code — Session 55 had shipped entirely code-reviewed, never actually rendered. Used it extensively to
  root-cause and live-verify most of a 7-item bug list reported against that session's own work — see
  Architecture notes' "Wildlife panel category checkboxes, cross-tab persistence, Oregon CORS block,
  Washington pagination" entry for full detail on every item. Fixed and live-confirmed: (1) Big Game's
  duplicated/alphabetical-only species grouping, root-caused to a missing `biggame`→`big_game` key-name
  bridge in `WILDLIFE_GROUP_ORDER` that Session 54 had already added for Upland Game but never for Big Game;
  (1b) removed "Blackbeard Island Deer" (a real Georgia-island-only subspecies, confirmed via its own data
  irrelevant to this app's western-hunting focus) via a new species-code exclusion filter, and confirmed via
  a direct read of the underlying data files that the broader "uncurated national list" concern doesn't apply
  — this is a small, mostly-legitimate corpus with exactly one genuine outlier. Investigated and could NOT
  reproduce the reported Fish-blue-leaking-into-Big-Game/Upland bug — direct live paint-property inspection
  showed all 3 Habitat range layer sets correctly still `#c2622d`, with blue correctly scoped to State Data
  only; documented as "not reproducible in current code" rather than papering over it with an unnecessary
  change. Root-caused and fixed the real architectural bug behind BOTH the cross-tab-data-loss report and the
  Washington-self-unchecking report as the exact same cause: Session 55's own "master toggle" writeup implied
  per-category independence that was never actually built — the code still used one shared
  `wildlifeActive`/`wildlifeOn`/`wildlifeStateDataActive`/etc. variable set for all 3 categories, so
  configuring a second category silently wiped the first's entire selection, confirmed via live reproduction
  (configure Big Game, then Fish, then reopen — Big Game's config is gone). Fixed with a genuine per-category
  data model (5 new `*ByCategory` state objects) plus, since a single shared MapLibre source/layer set has
  the identical one-active-category-at-a-time ceiling regardless of JS state, splitting State Data's map
  layers into 3 independent per-category sets (15 layers total, matching the pattern Habitat range's own GAP
  layers already used) — confirmed live end to end: Big Game/Elk + Fish/Rainbow Trout/Washington configured
  in the same panel session both persisted simultaneously on the active-layers chip and in the Layers panel
  after closing and reopening. Implemented, syntax-checked, but NOT live-clicked before this session's own
  browser tooling broke down a second time (flagged explicitly, not silently claimed as tested): the
  checkbox-opens-species-picker-when-empty UX fix (reuses an already-proven helper function, just never
  exercised via a truly-empty category this session) and a new Migrations header "select all" checkbox with
  real tri-state (checked/unchecked/indeterminate) behavior. For item 7 (Oregon/Washington fish not
  rendering), investigated each state's fetch path independently rather than assuming Arizona's working UI
  said anything about the others, per explicit instruction — found two genuinely different root causes, not
  one: Oregon's own ArcGIS server sends zero CORS response headers on any request (confirmed via
  `curl -H "Origin: ..."` against the real endpoint, contrasted directly against Washington/Arizona/Utah/
  Nevada's servers, which all correctly send them) — a permanent, server-side, client-unfixable block, not a
  bug in this app; the fetch failure is now surfaced as an honest toast instead of a silent empty result.
  Washington's own real bug was fixable: its SWIFD table has 73,373 total features against a server-declared
  `maxRecordCount` of 2000, so every previous unpaginated fetch was silently returning ~2.7% of the real
  statewide data with zero indication anything was missing — fixed with real adaptive-backoff pagination
  (`fetchStateDataLayerPaged`, also handling a second, harder-limit HTTP-500 failure mode found on Oregon's
  own server via direct curl bisection during this work), confirmed live via real captured sequential-offset
  network requests against the real Washington server. Also found and fixed, while testing the pagination fix
  rather than as a separately reported item: Washington's species-independent "unified" data source was being
  cache-keyed by species anyway, so switching species with Washington selected re-fetched its entire
  73K-record table from scratch every time — confirmed live via a captured duplicate full-fetch sequence,
  fixed by keying unified sources' cache by state alone. `node --check` confirmed clean syntax on all 4
  extracted inline `<script>` blocks after every edit; a full `git diff` was re-read end to end before
  finalizing. APP_VERSION bumped 2.49.0 → 2.50.0, SHELL_CACHE bumped v162 → v163.
- Session 57: Explicit hard requirement — no fix marked done without actual live browser confirmation, since
  code-review-only claims on this feature had already been wrong twice before this session. The browser
  extension was fully disconnected partway through (not just the permission/frozen-tab symptoms from earlier
  sessions) and needed the user to reconnect it — flagged and paused for, not worked around. Fixed and
  live-verified: (1) Fish stream-vs-HUC12 click priority, root-caused to click-handler REGISTRATION order
  (not paint order, confirmed by reading the vendored `maplibre-gl.js`'s own delegated-listener dispatch code)
  plus a genuine `fill-sort-key`/`line-sort-key` paint-order fix for HUC12/Lakes sharing one layer — confirmed
  live via a real click at a mathematically-verified real overlap point in Arizona's own data. (2) A real,
  previously-unknown crash bug in `updateActiveLayersChip()` (an unguarded `STATE_DATA_SOURCES` lookup) that
  was silently aborting `setWildlifeSpecies`'s own execution every time it ran, for the entire rest of a
  browser session — this, not a Nevada-specific rendering bug, was the actual reason Big Game's own species/
  State Data testing looked completely broken; fixed with a defensive guard. (3) Confirmed live, with the
  crash bug fixed, that Nevada + Elk (Rocky Mountain) State Data renders correctly (real 140-feature NDOW
  data, matching the count independently confirmed via `curl`), closing out item 4 as "not a data-coverage
  gap, was the crash bug." (4) Root-caused and fixed the real State Data staleness race behind item 5: the
  boot-time restore path had no staleness guard at all, unlike the manual-selection path — caught live, in
  the act, watching a stale Washington fetch silently overwrite a correctly-configured Arizona selection
  before the fix; verified the fix deterministically afterward via a new `testStateDataStaleGuard` debug hook
  that raced the REAL ~230-request, 73,373-feature Washington pagination fetch against a switch-away, and
  confirmed the fix correctly discards the stale result. (5) Confirmed Upland Game's own Habitat range
  correctly renders rust/orange, not blue (matching Session 56's Big Game finding), and confirmed the
  strongest available explanation for both "renders blue" reports: State Data's blue color is shared by
  design across all 3 top categories, not Fish-specific — demonstrated live by rendering Upland's own Utah
  State Data at full opacity. Along the way, discovered a serious NEW bug, deliberately NOT fixed this
  session and flagged prominently in "What's broken": Washington's real, complete 73,373-feature State Data
  dataset crashes MapLibre's own internal `setData()` with `RangeError: Invalid string length` — confirmed via
  real stack traces, confirmed the same crash independently hits the unrelated 7.2MB `big_game` Habitat range
  file too, live-bisected the failure boundary to between 40,000 (renders) and 73,373 (crashes) features. This
  means Washington's fish data likely has never actually been visible in this app regardless of the staleness
  fix, and item 2's own visual check could only confirm the real data exists at the target location, not that
  it currently renders there — a real architectural fix (splitting the dataset, or a MapLibre version change)
  is out of scope for this session's already-large fix list. See Architecture notes' "Fish z-order, Big Game
  crash bug, State Data staleness race, Washington render-size limit" entry for full mechanism detail on
  every item, including exactly what was confirmed via real clicks/screenshots/network-backed async tests vs.
  what the new MapLibre-limit finding still leaves open. `node --check` confirmed clean syntax on all 4
  extracted inline `<script>` blocks after every edit. APP_VERSION bumped 2.50.0 → 2.51.0, SHELL_CACHE bumped
  v163 → v164.
- Session 58: Re-diagnosed two Wildlife panel reports from scratch, live, after being told directly that
  three prior "confirmed" claims on this feature hadn't held up on the real device — the explicit instruction
  was to re-verify with real clicks/screenshots, not trust the previous session's conclusions. Both turned out
  to be real, previously-unfound bugs, not restatements of what was already fixed. (1) "Upland Game shows
  blue": confirmed again that Habitat range's own color is correctly rust for every Upland species tested
  (Ring-necked Pheasant this time, not just Chukar) — but found, via a screenshot the prior session never
  took, that turning on BOTH Habitat range AND State Data for the same species (an entirely ordinary thing to
  do) produces solid, fully saturated blue with the rust completely invisible, because State Data's layers
  are added to the map after Habitat range's and always paint on top. Fixed by moving Habitat range's own
  fill/line to the top of the layer stack; confirmed live this changes the result from solid blue to a
  visibly muted blend with rust now present — a real improvement, honestly reported as not a fully "clean
  rust" look, since two translucent washes over the same pixels can only ever blend, not fully override one
  another, without a bigger opacity/design change not attempted here. (2) "State Data auto-unchecks itself,
  not category-specific": the prior session's crash-guard fix in `updateActiveLayersChip()` was real but was
  a different bug that happened to surface through Big Game testing — root-caused the actual shared cause as
  `setWildlifeSpecies()` unconditionally clearing State Data on every call, even when the species passed in
  was IDENTICAL to the one already active. Reproduced live: on a freshly reloaded, fully-configured session,
  simply re-dispatching a `'change'` event on the species `<select>` with its value unchanged was enough to
  silently wipe State Data — a real, plausible mobile-Safari trigger (native pickers there are documented to
  sometimes fire `'change'` on a same-value re-selection or dismissal), not a sandbox artifact. Fixed with a
  same-species no-op guard; verified live across all 3 categories via real DOM checkbox reads after genuine
  species switches, category switches, and simulated same-value dispatches on each — all three correctly held
  their own independent configuration throughout, confirmed via a real screenshot showing all 5 expected
  active-layers-chip lines simultaneously. See Architecture notes' "Upland Game z-order fix, State Data
  same-species no-op guard" entry for full mechanism detail on both. `node --check` confirmed clean syntax on
  all 4 extracted inline `<script>` blocks after every edit. APP_VERSION bumped 2.51.0 → 2.52.0, SHELL_CACHE
  bumped v164 → v165.
- Session 59: Opened with the user directly contradicting the prior session's own "confirmed working" claim
  for Nevada + Elk (Rocky Mountain) State Data, plus a wider real-device matrix (Big Game universally broken;
  Upland Game broken for Dusky Grouse/NV and Ring-necked Pheasant/UT, working for Chukar/NV and California
  Quail/NV) and an explicit instruction not to write off Ring-necked Pheasant/Utah as a legitimate no-data
  case without checking a real network request/response first. Ruled out the Session 58 same-species no-op
  guard as the cause via direct code-path tracing (the guard lives in `setWildlifeSpecies()`, the checkbox's
  own handler is a completely separate function with no call relationship to it) rather than by re-running
  the old test. Found and ruled out a real, useful, but ultimately non-causal finding along the way — Nevada's
  real ArcGIS state-wildlife-agency endpoint takes ~39.4 real seconds to respond (measured via a direct in-page
  `fetch()`), which looked like a very plausible race explanation but didn't reproduce under direct testing of
  the exact check → dismiss → reopen cycle with a guaranteed-in-flight fetch. Found the real, single,
  100%-reproducible root cause by re-reading `renderStateDataSection()`: it always shows a state pre-selected
  in the `<select>`, whether or not one has actually been committed — visually indistinguishable to the user —
  and the checkbox's own change handler (`setWildlifeStateDataOn`) only ever flipped the `on` flag, never the
  `active` selection that only the select's own `'change'` handler sets and that both the real fetch and the
  active-layers chip require. Clicking the checkbox alone, without ever touching a `<select>` that already
  LOOKS correctly set, left the app with `on:true` but `active:null` forever — nothing fetches, no chip line,
  and the checkbox itself renders unchecked on reopen despite the underlying flag never having changed. This
  single mechanism explained every data point in the report once tested per-combo: Big Game has exactly one
  state per species (never needs the select touched — universally broken); Upland Game's Dusky Grouse and (a
  real catalog re-check this session corrected an earlier mis-read of) Ring-necked Pheasant both turn out to
  be single-option species too (Nevada-only and Utah-only respectively) — hitting the same mechanism, and a
  real live fetch against Utah's actual endpoint (captured network request, HTTP 200, 5 real features)
  confirmed Ring-necked Pheasant was never a legitimate data gap, exactly as instructed to verify rather than
  assume; Chukar and California Quail both exist in TWO states' catalogs with Utah (not the desired Nevada)
  as the `<select>`'s default, so reaching Nevada required a real dropdown interaction that correctly
  triggered the fetch all along — explaining why exactly these two, and only these two, "worked." Fixed by
  making the checkbox, when turning on with nothing active yet, route through the exact same
  `setWildlifeStateDataState()` path a real dropdown pick already takes. Also added an honest toast for a
  genuinely successful-but-empty fetch result, distinct from the existing fetch-failure toast, so a real
  no-data combination is never again visually indistinguishable from this bug. Verified live end to end for
  all 3 categories via the already-connected Chrome browser extension (checkbox-only clicks reproducing
  correctly-fixed behavior for Big Game/Elk/Nevada, Upland Game/Ring-necked Pheasant/Utah with a real captured
  network request, and Fish/Brook Trout/Washington; Nevada Chukar re-confirmed unaffected/still working) with
  zero console errors throughout. See Architecture notes' "State Data checkbox silently unchecking — the real
  single-cause fix" entry for full mechanism detail. `node --check` confirmed clean syntax on all extracted
  inline `<script>` blocks. APP_VERSION bumped 2.52.0 → 2.53.0, SHELL_CACHE bumped v165 → v166.
- Session 60: Closed out the one open question left by an earlier, undocumented research session (a real
  CLAUDE.md gap — that work happened but was never written up, confirmed via git log/reflog/stash showing no
  trace of it) — whether MapLibre's `updateData({add:[...]})` diff path, already confirmed to avoid the
  `setData()`/`JSON.stringify()` `RangeError` crash on very large datasets, also correctly triggers a real
  paint refresh, not just an error-free data load. This was the direct blocker for scoping Oregon fish habitat
  processing (34 species, one raw source file 884MB before conversion). Read the vendored `maplibre-gl.js`
  source directly for both `_updateWorkerData()` (confirming exactly why `setData()` crashes and exactly why
  `updateData()`'s diff path avoids it — structured-clone `postMessage`, never a full-dataset
  `JSON.stringify()`) and the worker's own diff-application code (confirming a real, previously-undocumented
  prerequisite: every feature needs a stable unique id, or `promoteId`, for the diff mechanism to work at all;
  a missing id silently drops that one feature rather than erroring). Built an isolated `maplibregl.Map`
  instance (same vendored library, a background-only style with zero Mapbox dependency, sidestepping this
  sandbox's own well-documented slow/blocked Mapbox v4 access) and proved, live, with dense synthetic
  polyline data explicitly shaped to match Oregon's real geometry (50-15,000 vertices/feature, ~3% very-dense
  tail): `setData()` on oversized data throws the real `RangeError` synchronously via the real public API;
  `updateData({add:[...]})` on the same class of data throws nothing AND paints correctly — confirmed via
  matched before/after screenshots at an identical viewport, not just absence of console errors — with no
  forced repaint or special lifecycle trigger needed. Discovered, empirically, the one real remaining catch:
  `updateData()`'s worker-side diff re-derives and re-tiles the WHOLE accumulated dataset on every call, not
  just the new chunk, so cost scales with the RUNNING TOTAL already in a source, not the added chunk's own
  size — confirmed by timing progressively larger additions to one growing source (2,000 feat/17MB → 3.3s;
  +5,000 more → 12.3s; +10,000 more → 38.6s) and, conclusively, by adding just 500 MORE features to an
  already-17,000-feature source and finding it took ~17.5s, matching the cost of the cumulative total rather
  than a small diff. This produces a concrete recommendation for Oregon: shard by species (the natural
  boundary this codebase's own `loadStateDataLayer` already uses per-species), not one giant shared source,
  keeping each source's own cumulative total in the low-thousands-of-features/low-tens-of-MB range where this
  session's own timing data shows sub-few-second responsiveness. Hit and worked around this sandbox's own
  well-documented `requestAnimationFrame`-throttling-while-hidden gotcha (Sessions 27-28/48) repeatedly during
  testing — every `style.load`/paint-related stall was resolved by a foreground-forcing screenshot action, not
  a real app or MapLibre bug. Also confirmed a `gl.readPixels()`-based pixel-level paint verification attempt
  was unreliable specifically because MapLibre's default `preserveDrawingBuffer:false` clears the WebGL buffer
  after each compositor swap — screenshots (which capture the actual compositor output) remained the
  reliable visual-proof method, not a flaw in the paint-refresh finding itself. See Architecture notes'
  "MapLibre large-dataset payload ceiling: updateData() pattern" entry for the complete mechanism, the full
  empirical timing table, and the reusable 5-step pattern for any future large dataset, not just this one. No
  application source code was changed this session (a pure investigation/documentation session, matching the
  established pattern for sessions like this one) — APP_VERSION and SHELL_CACHE were still bumped per explicit
  instruction. APP_VERSION bumped 2.53.0 → 2.53.1, SHELL_CACHE bumped v166 → v167.
- Session 61: Processed Oregon fish habitat data end to end — 56 raw Esri JSON files (32 species with
  stream data, 24 with lake data, 34 unique species) from ODFW's ArcGIS REST exports into 34 clean
  per-species GeoJSON files in `data/fish/oregon/`, the first real production run of the Session 60
  `updateData()` payload-ceiling pattern. Deliberately data-prep only — no map-UI wiring, per explicit
  instruction. GDAL/`ogr2ogr` (the named conversion tool) wasn't available on this machine and a quick
  `choco install` attempt failed outright, so a hand-rolled, directly-verified Node converter was
  substituted instead — flagged openly rather than silently presented as if `ogr2ogr` had been used.
  Verified each of the 6 pipeline stages live before moving to the next, per explicit instruction not to
  assume a later stage would catch an earlier one's problems, and found four real bugs doing so — none of
  them hypothetical: (1) `stream-json`'s parser leaks state across sequential in-process calls, fixed by
  running each file's conversion in its own process; (2) OBJECTID is only unique WITHIN one ArcGIS layer, so
  merging a species' stream and lake data without fixing this would have silently dropped/overwritten
  colliding features in MapLibre's own `updateData()` diff map later — exactly the bug class this whole
  project has spent weeks chasing — fixed by reassigning globally-unique sequential ids at merge time while
  preserving the original OBJECTID in properties for traceability; (3) mapshaper can't hold mixed
  polyline+polygon geometry in one layer and silently SPLIT mixed-type files into numbered outputs rather
  than erroring, caught by noticing unexpected filenames mid-run, fixed by simplifying stream/lake halves
  separately and merging after; (4) 24 features in CoastalCutthroatTrout came back with null geometry after
  simplification despite `keep-shapes` — investigated rather than dismissed, confirmed all 24 were
  pre-existing zero-length degenerate lines in the raw ODFW source (identical start/end coordinates,
  already invisible on any real render), explicitly filtered out with a logged count rather than silently
  left in the shipped data. Final results: CoastalCutthroatTrout 905MB raw → 582MB converted → 54.4MB after
  2% mapshaper simplification (90.7% reduction); all 5 species flagged as unusually vertex-dense in the
  pre-simplification density check ended up tiny post-simplification, confirming the uniform 2% default
  was sufficient without species-specific treatment. 4 of 34 species (CoastalCutthroatTrout, Coho,
  WinterSteelhead, RedbandTrout) still exceed the "low-thousands-of-features" comfort band from the
  `updateData()` timing research — none are anywhere near the actual crash threshold anymore, but per
  explicit instruction to propose rather than just flag, the concrete next step is geographic sub-sharding
  by region once these are actually wired into the map, matching the same recommendation already on file
  for Washington's oversized SWIFD dataset — not attempted this session, out of scope. Also handled, per
  explicit instruction at the start of the session: captured the pre-existing AC monitor-timeout power
  setting before changing it (3600s), set both monitor-timeout-ac and standby-timeout-ac to 0 for the
  remote session, and restored monitor-timeout-ac to its original value at the end while leaving
  standby-timeout-ac disabled permanently, per instruction. See Architecture notes' "Oregon fish habitat
  data processing pipeline" entry for the complete mechanism and verification detail on every stage. No
  application source code logic was changed this session (data files + version bump only). APP_VERSION
  bumped 2.53.1 → 2.54.0 (minor — new data asset added to the repo), SHELL_CACHE bumped v167 → v168.
- Session 62: Wired the Session 61 processed Oregon fish habitat dataset and the Session 60 `updateData()`
  payload-ceiling pattern into the real Fish State Data UI — the first time both pieces of prior work
  actually shipped together as a real user-facing feature. Scope: 30 of the 34 processed species; the 4
  still needing geographic sub-sharding (CoastalCutthroatTrout/Coho/WinterSteelhead/RedbandTrout) were
  omitted from the species list entirely rather than marked "coming soon," since omission required zero new
  UI and matches how any species with no State Data source already behaves. Reused the existing Fish State
  Data architecture completely as instructed — species dropdown, checkbox, state `<select>`, and critically
  the EXISTING `wildlife-statedata-fish-fill`/`-line`/`-line-streams` paint layers, which needed zero
  changes at all, since Oregon's data gets tagged into the exact same `_sdLayer`/`_sdShape` shape every
  other state's data already produces. Also found, with no changes needed, that Fish already had a complete
  Coldwater/Warmwater grouping system (`WILDLIFE_FISH_GROUPS`/`WILDLIFE_FISH_GROUP_ORDER`) sitting unused
  for State Data species — simply worked correctly the moment real species existed to group. Replaced
  Oregon's old `perSpecies` catalog entry (a live ArcGIS fetch against a server confirmed in Session 56 to
  send no CORS headers at all — permanently, silently broken since it was first written) with a new
  `type: 'localFile'` source kind, and updated the 3 other places in the file that branch on `src.type`
  (`stateDataOptionsFor`, `wildlifeSpeciesGroups`, the cache-key logic) to recognize it — found by directly
  grepping every `src.type ===` check in the file rather than assuming the existing 2-type pattern was
  exhaustively handled. Implemented the explicitly-requested `updateData()`-not-`setData()` loading via a
  new shared `applyStateDataToSource()` helper, deliberately WITHOUT setting a `promoteId` source option —
  the Session 61 pipeline's unique id lives at the GeoJSON-standard top-level `feature.id`, not a properties
  field, which MapLibre's own diff mechanism already uses by default; setting `promoteId` would have been
  wrong here, not just unnecessary. Found and fixed one real prerequisite by reasoning through the mechanism
  before writing code, not by trial and error: since Washington/Arizona/Nevada share the same source and
  still use plain `setData()` with data never guaranteed to carry clean ids, switching from one of those
  states to Oregon without precaution could inherit an invalid internal diff-tracking state and throw —
  fixed by always clearing via a trivial empty `setData()` immediately before every `updateData()` call, a
  reset that can never itself fail. Verified the actual real geometry types in the shipped data rather than
  assuming (`lake` is always Polygon, `stream` is LineString/MultiLineString, no MultiPolygon anywhere in
  the 30 in-scope files) before writing the tagging logic. Live-verified 3 species across both groups (Bull
  Trout, Rainbow Trout — Coldwater; Largemouth Bass — Warmwater): real network fetches confirmed, checkbox/
  chip/state-select correctness confirmed immediately and through a full check→dismiss→reopen cycle for all
  3 (including a deliberate checkbox-only-click test — the exact interaction the Session 59 fix addressed —
  confirmed still working for this new source type). Real visual rendering was confirmed via an isolated
  `maplibregl.Map` harness using the exact real paint config and real fetched data (this sandbox's own
  embedded app map was stuck in the same long-documented Mapbox-loading limbo every prior session has hit,
  unrelated to this feature) — a real dense stream network and a real lake polygon shoreline both confirmed
  rendering correctly in genuine screenshots, though this doesn't by itself prove the identical result inside
  the live app's own map instance, only that it couldn't be gotten to a paintable state in this sandbox to
  check directly; flagged as the natural next real-device check. Confirmed zero new console errors from this
  session's own changes. Also handled, per explicit instruction at the start of the session: captured the
  pre-existing AC monitor-timeout power setting (3600s) before changing it, set both monitor-timeout-ac and
  standby-timeout-ac to 0 for the remote session, and restored monitor-timeout-ac to its original value at
  the end while leaving standby-timeout-ac disabled permanently. See Architecture notes' "Oregon fish State
  Data wiring" entry for full mechanism detail and everything verified live. `node --check` confirmed clean
  syntax on all extracted inline `<script>` blocks and service-worker.js. APP_VERSION bumped 2.54.0 → 2.55.0
  (minor — new user-facing feature), SHELL_CACHE bumped v168 → v169.
- Session 63: Two real-device bug reports against Session 62's Oregon fish State Data wiring, deliberately
  treated and verified as two fully independent fixes per explicit instruction — see Architecture notes'
  "Fish State Data: state persistence across species switches, Washington `updateData()` retrofit" entry for
  complete mechanism detail on both. Fix 1: the state `<select>` was silently resetting to a default state on
  every species switch instead of remembering what the user last picked, and — the harder half of the ask —
  when the remembered state genuinely has no data for a newly-picked species, the app now says so explicitly
  ("No data available for [state] — [species]") and leaves the `<select>` still showing that state (via a
  phantom `<option>` injected just for this case) rather than silently jumping to some other state the user
  never chose. Root cause was two compounding gaps: `renderStateDataSection`'s active-selection check is, by
  design, always false right after a species change (a State Data selection has always been scoped to one
  specific species), and `setWildlifeSpecies` then discarded ALL memory of the picked state on every switch,
  not just its "active" status — there was nothing left to fall back to except `options[0]`. Fixed with a new
  `wildlifeStateDataLastStateByCategory` var, deliberately separate from the species-scoped active/on pair and
  never cleared by a species switch, updated only by a real user pick — `setWildlifeSpecies` now reads it
  before clearing and either reloads it for the new species (if it was genuinely on and still has data),
  leaves it remembered-but-inactive (if it was off), or flags the new no-data case, rather than unconditionally
  wiping it. Fix 2: Washington's fish State Data — real, correct SWIFD data, confirmed rendering correctly
  since Session 58 — still routed through plain `setData()`, carrying the exact `RangeError: Invalid string
  length` crash risk Session 57 found and bisected for its own real 73,373-feature table (the ORIGINAL
  motivating case for the whole `updateData()` research thread, ironically never actually retrofitted onto
  Washington itself when Session 62 built the pattern for Oregon). Fixed with a one-line, deliberately generic
  condition change (`src.type === 'localFile' || src.type === 'unified'` in `applyStateDataToSource`) rather
  than hardcoding Washington's own state key — `'unified'` sources are architecturally guaranteed to be a
  single paginated fetch of one ArcGIS layer, the same "no cross-layer id collision" property Oregon's local
  files have. Confirmed before writing the fix, via a live query against WDFW's actual SWIFD endpoint from
  this sandbox (directly reachable here, unlike Mapbox's v4 API), that Washington's real `f=geojson` responses
  already carry a stable, unique top-level `feature.id` (Esri's own OBJECTID-derived GeoJSON `id`) with zero
  extra id-assignment code needed. Verified independently for each fix, per explicit instruction: Fix 1 live
  in the real embedded app (species switches between Bull Trout/Apache Trout/Rainbow Trout/Brown Trout/Sockeye
  covering both the "state persists and reloads" and "state persists but shows an honest no-data message"
  cases, the Session 59 checkbox-only-click fix explicitly re-confirmed afterward per instruction, and a real
  full panel close→reopen cycle holding throughout); Fix 2 two ways — in the real embedded app (a genuine
  ~35-request paginated fetch of the real 73,373-feature Washington table completing with zero console errors
  of any kind, a full page reload afterward correctly restoring the selection via the SEPARATE boot-time
  restore code path without crashing either, and a real mouse-click-driven check→dismiss→reopen cycle holding),
  and via the same isolated zero-Mapbox-dependency `maplibregl.Map` harness technique Sessions 60/62
  established (this sandbox's main app tab intermittently stalled on style-loading mid-session, the same
  long-documented Mapbox limitation as every prior session touching DEM/vectorbase) — a real live fetch
  against WDFW's actual endpoint at the real West Patit Creek test area (224 real features) applied through
  the exact retrofitted pattern and confirmed rendering correctly via a genuine screenshot. One real self-
  inflicted test-harness mistake was found and corrected mid-session, not a product bug: an early attempt to
  capture the live `Map` instance via raw `classList`/`.closest('button').click()` DOM manipulation (instead
  of real clicks or the app's own functions) left one test tab's Washington state key as an empty string in
  that tab's own localStorage, traced to dispatching a 'change' event while the `<select>` had no rendered
  options — repaired directly in that tab's test data, and the affected verification steps were redone
  cleanly with only real interactions. Also handled per explicit instruction at the start of the session:
  captured the pre-existing AC monitor-timeout power setting before changing it, set both monitor-timeout-ac
  and standby-timeout-ac to 0 for the remote session, and restored monitor-timeout-ac to its original captured
  value at the end while leaving standby-timeout-ac disabled permanently. `node --check` confirmed clean
  syntax on all extracted inline `<script>` blocks and service-worker.js. APP_VERSION bumped 2.55.0 → 2.55.1
  (patch — two real bug fixes to an existing feature, no new UI), SHELL_CACHE bumped v169 → v170.
- Session 64: A real regression reported right after Session 63 shipped — see Architecture notes' "Fish
  State Data: state persistence across species switches, Washington `updateData()` retrofit" entry, its own
  "Session 64" sub-bullet, for complete mechanism detail. Repro: Oregon Rainbow Trout State Data rendered
  correctly, but switching the state `<select>` to Washington left Oregon's old data visibly rendered
  instead of/alongside Washington's, even though the chip/dropdown updated correctly; same for Arizona →
  Washington; Oregon ↔ Arizona cycling (never touching Washington) worked fine. Investigated the report's
  own hypothesis — a type-conditional gap in `applyStateDataToSource` — and ruled it out directly: that
  function's `localFile`/`unified` branch is byte-identical for both, no type-based bug exists there at all.
  The real root cause was about WHEN, not IF: `applyStateDataToSource` only ever runs inside the new state's
  own fetch-completion callback, so nothing clears the map until the ENTIRE new fetch resolves — a
  pre-existing gap present for every state switch, imperceptible for Oregon's static file and Arizona/
  Nevada/Utah's small live fetches, but stretched into a many-seconds-long visible window by Washington's
  real ~35-request paginated fetch of its full 73,373-feature table. Fixed with a new, deliberately
  type-agnostic `clearWildlifeStateDataSource(tc)` helper — a single empty `setData()` call needing no
  branch on source type at all — called synchronously the instant a new state is picked, before the new
  fetch even starts, rather than waiting for `applyStateDataToSource`'s own (unchanged, still-needed)
  clear-then-apply to run once data arrives. Verified live with a direct, deterministic timing proof (zero
  wait after the `<select>`'s `change` dispatch, confirming Arizona's real 223-feature dataset was genuinely
  gone from the source the instant a switch to Washington fired, well before Washington's fetch could
  possibly have started) across all 4 directions (Oregon↔Washington, Arizona↔Washington), confirming the fix
  isn't directional; closed the one remaining gap — `GeoJSONSource.updateData()` never updates the
  client-side `_data` property (confirmed by reading the vendored `maplibre-gl.js` source directly), so
  `_data` alone can't prove Washington's real content actually renders post-fix — with a dedicated isolated
  `maplibregl.Map` harness that applied a synthetic "fake Oregon" feature, ran the new immediate clear, then
  fetched and applied REAL Washington data for the real West Patit Creek area: a genuine screenshot showed a
  clean real stream network with zero artifacts, and `queryRenderedFeatures` explicitly confirmed the marked
  synthetic feature was NOT present in the final output — directly proving the old state's data is gone, not
  just visually overlapping. Re-confirmed live, per explicit instruction since this fix touches the same
  area again, that Session 63's species-switch persistence, the Session 59 checkbox-only-click fix, and a
  real mouse-driven check→dismiss→reopen cycle all still hold unchanged. `node --check` confirmed clean
  syntax on all 4 extracted inline `<script>` blocks and service-worker.js. APP_VERSION bumped 2.55.1 →
  2.55.2 (patch — a real regression fix), SHELL_CACHE bumped v170 → v171.
- Session 65: A deliberate, explicitly-not-a-bug-fix removal — Washington taken out of the selectable Fish
  State Data state dropdown after confirming live that WDFW's own real endpoint now returns a bare HTTP 500
  at every page size the existing adaptive-backoff pagination tries, a genuine server-side outage unrelated
  to this app's own code or to Sessions 63/64's `updateData()`/immediate-clear fixes (both re-confirmed
  correct and left untouched). See Architecture notes' "Fish State Data: state persistence across species
  switches, Washington `updateData()` retrofit" entry, its own "Session 65" sub-bullet, for full detail.
  Added a single `disabled: true` flag to `STATE_DATA_SOURCES.fish.wa` and one matching guard at the top of
  `stateDataOptionsFor`'s per-state loop, reusing the exact same "omit entirely, not greyed out" mechanism
  Session 62 already built for Oregon's 4 deferred species — Washington's catalog entry, real URL/
  attribution, and every loading/clearing code path that reads it are all deliberately left untouched, so
  re-enabling it later is a one-line revert. Traced every other `STATE_DATA_SOURCES` read site in the file
  by hand and confirmed none of them needed a matching change: the species-dropdown-building function
  already structurally excludes `type:'unified'` sources for an unrelated reason, and every other read site
  is keyed by an already-chosen stateKey that can now never resolve to `'wa'` through the UI. **This
  session's browser tooling could not be gotten into a working state at all**, flagged explicitly rather
  than silently skipped or faked: 8+ navigation attempts across several freshly created tab groups, an
  explicit browser reselect, and real wall-clock waits between attempts all reported plausible-looking
  success while the tab remained genuinely stuck on `chrome://newtab` every single time — a harder, more
  persistent failure than the intermittent stalls documented in several earlier sessions (those recovered
  within a call or two; this one never did, across the whole session). None of the 3 requested live checks
  (Washington absent from the dropdown, the other 4 states still working, clean cycling between them) were
  completed. The change was instead verified as rigorously as possible without a browser — a full manual
  trace of every relevant read site, a diff re-read confirming exactly the intended two-line change and
  nothing else, and `node --check` clean on all 4 extracted inline `<script>` blocks and service-worker.js —
  but this is real, un-downgraded risk on an otherwise very small and low-complexity change, and a live pass
  once the browser tooling is usable again should be the first thing done, not assumed from this session's
  code-review-only confidence. APP_VERSION bumped 2.55.2 → 2.55.3, SHELL_CACHE bumped v171 → v172.
- Session 66: Built watershed (huc12) zoom-based auto-hide for Fish State Data, inspired by the AZGFD Trout
  Challenge's own public map — once zoomed past Z10 (fixed app-wide per explicit instruction), the huc12
  coarse-basin-context wash auto-hides so it doesn't clutter the real stream/lake detail data it shares a
  layer with, reappearing when zoomed back out; stays visible at any zoom if there's no detail layer to
  declutter for. See Architecture notes' "Watershed (huc12) zoom-based auto-hide" entry for full mechanism
  detail. Pure `map.setFilter()` refinement on the existing shared `wildlife-statedata-{tc}-fill`/`-line`
  layers (huc12 has never had its own layer — it's filtered apart from real lake/range data within the same
  one), driven by a `map.on('zoom', ...)` listener plus a recompute wired into the existing
  `updateWildlifeStateDataMapFilter()` so every existing State Data change trigger gets it for free — no new
  toggle or setting, matching the explicit "purely automatic behavior" scope. The explicit click-priority
  regression check (does this reintroduce the bug Session 57 fixed, where streams/lakes must win over the
  huc12 wash they share a layer with) was investigated and confirmed clean by tracing the actual mechanism:
  Session 57's fix is entirely about click-HANDLER REGISTRATION ORDER, completely orthogonal to which
  features a `setFilter` happens to include — below the threshold the filter is byte-identical to before
  this session, and above it huc12 is excluded from the layer's data entirely, so there's nothing left for a
  click to ambiguously resolve to. Verified live in two complementary ways, both real: (1) directly on the
  production app with real Apache Trout/Arizona State Data active, read `map.getFilter(...)` before and
  after real `map.jumpTo` zoom changes across Z8→Z11→Z8 — confirmed the real `map.on('zoom', ...)` listener
  correctly toggles the filter with zero manual intervention, definitive proof of the actual shipped wiring;
  (2) for the click-priority check specifically, this sandbox's main app tab hit an unresolved click-
  coordinate-mapping issue this session (confirmed unrelated to the feature — even known, large UI buttons
  failed to respond to computer-tool clicks at their own precisely-computed screen coordinates, in both a
  screenshot-scaled and a true-resolution coordinate hypothesis, while the app's own JS/map state stayed
  fully correct and responsive throughout) — worked around with an isolated `maplibregl.Map` harness using
  byte-identical filter expressions and click-handler registration order copied verbatim from the shipped
  code, real Apache Trout data fetched live from AZGFD's own endpoint, and a real point-in-polygon-confirmed
  overlap point (the same "Silver Creek" feature Session 57's own verification used) — real clicks on this
  harness confirmed the full below-Z10/above-Z10/reverted-below-Z10 cycle all correctly resolve to the
  stream, with huc12 confirmed genuinely present via `queryRenderedFeatures` below the threshold and
  genuinely absent above it (not just visually covered). The one edge case not reachable through today's
  real catalog data (a watershed-only pick with no detail layer, which per spec must stay visible at any
  zoom) was verified instead via a standalone Node reproduction of the exact catalog-reading logic against 7
  synthetic shapes, all passing, including the specific unreachable-in-practice case. `node --check`
  confirmed clean syntax on all 4 extracted inline `<script>` blocks and service-worker.js. APP_VERSION
  bumped 2.55.3 → 2.56.0 (minor — new feature), SHELL_CACHE bumped v172 → v173.
- Session 67: Investigated first, per explicit instruction, whether Tap-stack (referenced from earlier
  project history) still exists before building anything — confirmed it does, fully intact and unregressed,
  covering 16 real types since Session 46. A complete audit of every `map.on('click', ...)` registration in
  the file (18 sites) cross-referenced against the registry found exactly one real gap: Wildlife STATE DATA
  (`wildlife-statedata-{tc}-fill`/`-line-streams`, e.g. Nevada Chukar — genuinely clickable on its own since
  Session 54) was never added, simply because it didn't exist yet when Tap-stack was built — not a
  regression, an incomplete registry. Reported this back before writing any code, as asked, then extended
  the existing registry with one new `wildlifestatedata` entry rather than building anything from scratch —
  see Architecture notes' "Tap-stack: Wildlife State Data extension" entry for the full audit and mechanism
  detail, including hoisting the shared `WILDLIFE_STATEDATA_KIND_LABELS` constant so the new list row and
  the existing popup it opens can never show different text for the same feature. Verified live end-to-end
  with a real overlap, not synthetic data: found the real Nevada Chukar State Data polygon's genuine
  interior point via a proper point-in-ring test, created a real Buffer straddling it (injected via
  localStorage using the app's own real data shape, picked up through a genuine reload — this project's
  established testing pattern), and confirmed via `queryRenderedFeatures` the two genuinely overlap before
  ever clicking. A real tap at that point showed "3 items here" (the Buffer, GAP Habitat "Chukar", and the
  new State Data "Chukar — Distribution · Nevada") with correct real names for all three; each opened its
  own correct, completely unmodified popup when picked, "← Back to list" working for the new type with zero
  extra wiring needed; temporarily hiding the Wildlife layers left only the Buffer at the same point, and
  tapping there opened its popup directly with no list step, confirming single-hit taps are unaffected;
  dismissing a fresh list via its own × was confirmed, via the drawer's actual computed `display:none` (not
  just DOM text, which can hold stale content from a prior open and give a false positive), to open nothing.
  One real test-setup bug caught and fixed in the TEST DATA, not the app: an empty `tags: []` array on the
  injected buffer failed the app's own real `itemVisible()` filter (`[].some(...)` is always false), which is
  correct, expected behavior for a genuinely tag-less item, not a bug — fixed by giving the test buffer the
  same `['uncategorized']` default real items get. One real coordinate-click miscalculation happened and was
  caught mid-session: using `map.project()`'s container-relative pixel directly as a screenshot click
  coordinate (forgetting the container's own offset and the screenshot-vs-true-window scale factor) briefly
  landed a click on empty background instead of the intended point — re-derived the correct math from
  `getBoundingClientRect()` and the real screenshot dimensions, cross-checked against a value already proven
  working earlier in the same session, and used the corrected math for the remaining clicks. `node --check`
  confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.56.0 → 2.57.0
  (minor — extends a real feature to a real gap), SHELL_CACHE bumped v173 → v174.
- Session 68: Built pin-to-pin navigation — a live, north-relative bearing+distance readout to a single
  selected pin, reached via a new "Navigate to" item in the pin popup's overflow menu (reachable identically
  from a marker tap or a sidebar-row click, both of which already open the same popup). Reused every piece of
  existing math (Compass/Bearing's own `bearingDegrees`/`bearingCardinalLabel`/`formatDist`) rather than
  writing anything new, and resolved a real unit-convention ambiguity the task explicitly asked to be
  resolved rather than guessed — Compass's own live display inconsistently mixes mi+km, so the new chip
  instead follows the more general, already-documented app-wide feet/miles-only convention. Reused the
  Session 37 shared GPS watcher as a 4th consumer instead of a new independent `watchPosition`. Renders as a
  new 5th chip in the existing desktop floating-info-stack column, and as its own full-width 3-column
  (distance/arrow/bearing) bar on mobile, positioned as a plain DOM sibling right after the active-layers chip
  so it naturally sits below whichever rows are currently visible with no extra position-tracking code. Found
  and fixed one real bug via live testing, not code review: a bearing near the 360°/0° wrap point rounded to
  the literal string "360°" instead of "0°" — fixed with a modulo in the new code, deliberately left
  unfixed in Compass's own pre-existing code that has the identical gap (out of scope, flagged not silently
  copied-forward). Also caught and corrected a real spec-matching gap during verification: the chip initially
  showed two different messages for "GPS unsupported" vs. "no fix yet," when the task asked for one unified
  "Waiting for GPS…" message covering both — collapsed to match exactly. Verified live end-to-end via the
  already-connected Chrome browser extension: both entry points (a real marker click and a real sidebar-row
  click, the former requiring a live coordinate-space fix for a devicePixelRatio/screenshot-scaling mismatch,
  the same class of gotcha already hit in this session's own Tap-stack work); the chip/bar's correct
  appearance on both desktop (screenshot) and a genuine 390×844 mobile `<iframe>` (screenshot, plus its own
  now-familiar stale-service-worker-inside-the-iframe hiccup, resolved the established way); arrow direction
  confirmed correct from 2 different synthetic GPS positions (due south → N/0°/arrow up; due west →
  E/90°/arrow right); live recompute confirmed across multiple injected position fixes, including the
  360°-wrap case that caught the rounding bug; the unified "Waiting for GPS…" state confirmed for a real
  injected permission-denied error with no fix ever received; both × dismiss buttons confirmed exiting nav
  mode; single-target replacement confirmed by selecting a second injected test pin mid-navigation and
  observing the chip swap immediately with zero accumulation. Zero console errors throughout. `node --check`
  confirmed clean syntax on all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.57.0 → 2.58.0
  (minor — new feature), SHELL_CACHE bumped v174 → v175.
- Session 69: Two real-device follow-up items, bundled into one session — see Architecture notes' "Pin-to-pin
  navigation refinements + Tap-stack pin-overlap fix" entry for full mechanism/verification detail.
  Item 1 (pin-to-pin nav chip refinements): made the chip taller (56px desktop/44px mobile) and replaced the
  old symmetric "▲" text-glyph arrow with an SVG elongated dart/chevron, per feedback that the arrow needed
  more visual prominence and a clearer directional read — both deliberate deviations from Session 68's
  original "match the other chips exactly" spec. Switched the arrow from north-relative to device-heading-
  relative rotation ("the phone acts as the compass") — a real design change, not a bug fix — requesting
  `DeviceOrientationEvent` permission at the exact moment navigation mode starts (not upfront), with a
  one-line explanatory toast shown immediately before the native iOS prompt, and a clean fallback to the
  original north-relative rotation (distance/bearing text always staying absolute either way) if permission
  is denied or unavailable — reused the exact permission/listener pattern already proven for Compass and the
  locate button's GPS dot, as a third fully independent listener rather than inventing a shared abstraction.
  Fixed "Navigate to" leaving the pin's popup open — it now auto-closes via `closeViewDrawer()` the instant
  navigation starts. Item 2 (Tap-stack Bearing+pin gap): re-ran the same registry-audit approach used for
  the earlier Wildlife State Data gap, per explicit instruction, and found a genuinely different root cause
  this time — Bearing was already correctly registered and working in `TAP_STACK_TYPES`; the real problem is
  that pins are DOM markers whose own click handler calls `e.stopPropagation()`, which structurally prevents
  a click landing on a pin from ever reaching the MapLibre canvas-level dispatch Tap-stack's pre-check relies
  on — not a missing table row, but the exact, deliberate exclusion `TAP_STACK_TYPES`' own comment already
  documents. Fixed by having the pin marker's own click handler independently call the existing
  `collectTapStackCandidates()` against the pin's own projected point before deciding whether to open its
  drawer directly (zero other candidates, the common case, completely unchanged) or show the shared
  disambiguation list alongside whatever else is really there. Verified live: both permission paths for the
  compass rotation (mocked `DeviceOrientationEvent.requestPermission`, since desktop Chrome has no native
  implementation) — granted path confirmed the toast fires with the right text and the arrow correctly
  rotates device-relative once a synthetic orientation event arrives (bearing 0°, device heading 90° →
  arrow at 270°, computed exactly as `(bearing - heading + 360) % 360`), with the bearing TEXT confirmed
  staying absolute/unchanged throughout; denied path confirmed the chip stays fully functional with correct
  distance/bearing and confirmed, via a stray orientation event dispatched right after denial having zero
  effect, that the listener was genuinely never attached, not just coincidentally ignored. Popup auto-close
  confirmed live via the real UI. The Tap-stack fix was verified with a real injected test Bearing whose line
  passes exactly through the existing test pin (confirmed overlapping via a real screenshot before testing):
  a real click dispatched directly on the pin marker correctly showed "2 items here," each row opened its own
  correct unmodified detail view, "← Back to list" returned to the identical list, and the panel's own ×
  correctly left nothing open (computed `display:none` on all three surfaces, not just DOM text). Flagged
  rather than silently claimed as fully covered: the "zero overlap → pin opens directly, no list" branch (the
  overwhelmingly common single-pin-tap case) could not be independently re-confirmed after this specific edit
  — this sandbox's map hit a sustained style-loading stall (no markers rendered across a fresh reload, a
  fresh tab, and over a minute of combined waiting) right as this check was attempted, worse than the
  intermittent stalls documented in earlier sessions that recovered within a call or two. Treated as low,
  not zero, remaining risk — the branch is the exact pre-existing `openPinDrawer(pin)` call already thoroughly
  proven working earlier this session, guarded by the same already-proven `collectTapStackCandidates()` every
  other Tap-stack type relies on — but a real single-pin-tap confirmation once the sandbox recovers or on a
  real device is the natural next check, not assumed already done. `node --check` confirmed clean syntax on
  all 4 extracted inline `<script>` blocks. APP_VERSION bumped 2.58.0 → 2.59.0, SHELL_CACHE bumped v175 →
  v176.
- Session 70: Two independent feature tasks in one session, run through without stopping for confirmation
  in between per explicit instruction — see Architecture notes' "Hydrography watershed name display" and
  "Aspect: 4-cardinal-toggle redesign" entries for full mechanism/verification detail on each.
  Task 1 (Hydrography watershed names): extended the existing live NHDPlus HR viewport-bbox query pattern
  with a third parallel fetch to the same service's layer 12 (WBDHU12) — confirmed live before coding that
  its name field is `name` (lowercase, matching `gnis_name`'s own convention) — and used a real, invisible
  MapLibre hit-testing layer (`hydro-huc12-fill`, `fill-opacity:0`) rather than a spatial join or a second
  per-click network request to answer "which watershed contains this tapped point." A stream/lake popup's
  meta line now reads "Stream · [watershed name]" when a HUC12 boundary is found at that point, or plain
  "Stream" when it isn't — confirmed live, not just reasoned about, that the "not found" case degrades
  gracefully with zero crash. Verified against real data in the Beaver Creek/Verde River area near Camp
  Verde, AZ (the same area this session's own earlier research phase used): real flowline data, real HUC12
  watershed names matching the research exactly, and a real popup showing both the stream name and its
  watershed name together after firing a genuine MapLibre click event at a `queryRenderedFeatures`-confirmed
  overlap point (a raw pixel click missed due to the same screenshot-vs-CSS-pixel scaling issue this session
  had already hit once before — recovered by dispatching a real, properly-shaped `map.fire('click', ...)`
  event instead of retrying pixel coordinates).
  Task 2 (Aspect redesign): replaced the always-on 8-direction hue wheel with 4 independent N/E/S/W
  checkboxes (each covering its own cardinal plus its 2 adjacent intercardinals — a 90°-wide arc) plus a
  master on/off toggle that shows/hides the current selection without ever clearing it — achieved by keeping
  the selection (`aspectCardinals`, normally persisted) and the master (`aspectOn`, force-reset at boot,
  completely unchanged role) as genuinely separate state. The cardinal filter lives in the tile URL itself
  (`aspect://.../?cardinals=N,E,W`), matching Elevation Range's own established min/max-in-the-URL pattern,
  and is applied worker-side as a simple post-gradient arc check — the underlying color math and the mutual
  exclusion with Slope Angle are both completely untouched. A standalone Node test against the real worker
  file (26/26 assertions: exact arc boundaries, an exhaustive 360°-partition check, and real gradient-based
  filtering behavior against a synthetic directional DEM tile) passed before any browser testing. Live
  verification hit and root-caused a real MapLibre timing gotcha (not a bug in the new code): a raster
  source's `setTiles()` only resolves via `requestAnimationFrame` for a plain `tiles:[...]` source, which
  this automation tab's own backgrounding throttled hard enough to look like a stuck update until the tab
  was foregrounded — traced directly in the vendored `maplibre-gl.js` source, not assumed, and matching the
  same rAF-throttling class of gotcha this project's own Sessions 27-28 already documented. Once accounted
  for, confirmed live: individual cardinal toggles correctly update both the persisted selection and the
  live tile URL; the legend wheel correctly grays out inactive cardinal arcs; and — the core design goal —
  a full mutual-exclusion-triggered off/on cycle (Slope Angle forcing Aspect's master off, then manually
  turning Slope Angle back off and Aspect's master back on) correctly restored the exact preserved N/E/S/W
  selection, not the all-4 default. `node --check` confirmed clean syntax on all 4 extracted inline
  `<script>` blocks and `terrain-overlay-worker.js`. APP_VERSION bumped 2.59.0 → 2.60.0, SHELL_CACHE bumped
  v176 → v177.
- Session 71: Waterway-prominence tiering for the 4 oversized Oregon fish species — see Architecture notes'
  "Oregon fish NHD stream-order join" entry for full mechanism/verification detail; this is what it took to
  get there. Step 1 (feasibility, done first per explicit instruction not to force a bad join through):
  confirmed live that no GDAL/geopandas/QGIS is available (matching Session 61's own established finding),
  built a real hand-rolled Node.js nearest-line spatial join (no external geometry library, matching this
  codebase's own established precedent), and tested it against a real 300-feature RedbandTrout sample in a
  dense real bbox joined against 8,371 real NHD flowline features fetched live for the identical area — 94.2%
  of sampled points matched within 150m, median distance 3.6m among clean matches, join computation itself
  effectively free. The one honest caveat (stream order not always consistent along one line's own length)
  was investigated and confirmed to reflect genuine hydrology (a habitat line can span a real confluence),
  resolved with a documented design choice (report the MINIMUM order across sampled points) rather than
  treated as a blocker. Concluded feasible and proceeded to Step 2. Real NHD data was fetched for the union
  of 143 tiles the 4 species' data actually touches (not the sum per-species — real geographic overlap means
  most tiles are shared). Hit and worked around a real infrastructure limit: the first fetch attempt was
  killed by the Bash tool's own 10-minute background-timeout ceiling partway through; recovered by relaunching
  the same already-resumable fetch script as a genuinely detached OS process via PowerShell's `Start-Process`,
  decoupling it from any single tool call's timeout, with progress tracked via a separate `Monitor` polling
  the output directory rather than the process's own unreliably-buffered stdout. All 143 tiles fetched
  cleanly (1.9GB, zero errors). The first join attempt then blew a 6GB heap trying to build one global
  spatial index over the full 1,778,688-feature deduped NHD dataset — a real number, far higher than the
  single-sample-tile density would have suggested — root-caused to storing a full JS object per line segment
  duplicated across fine grid cells, not a memory-size problem alone; fixed with a genuine architecture
  change (process one 0.5° tile group at a time with a small local index, feature-level integer references
  instead of per-segment objects, lazy distance computation against each feature's own already-in-memory
  coordinates) that completed the full real join in ~412 seconds with peak heap comfortably under 2GB. A
  real correctness bug was then found during Step 3 spot-checking, not shipped silently: NHD uses `-9` as a
  genuine NODATA sentinel on 954 of 1,792,465 real flowline features, which the first join pass let poison
  a small number of features' minimum-order calculation (caught via a real spot-check showing an impossible
  "order range -9 to 9" for named Oregon rivers) — fixed by requiring a positive order value, then re-run
  cleanly from the untouched pre-join backups. Final real match rates across the full run: 99.88%-100% per
  species, 82,852/82,901 stream features overall (99.94%). Step 3 verification: confirmed real data
  integrity (feature counts, lake features, and all original properties all unchanged from the pre-join
  backups, zero remaining invalid order values); confirmed sensible real-world values via a spot-check (named
  Oregon rivers reaching order 8-9, unnamed tributaries skewing to order 1-4 with zero at 5+, matching real
  hydrology); and confirmed the app's actual loading mechanism still works correctly with the updated files
  — since these 4 species aren't wired into any live UI yet (Session 62 deliberately deferred them), verified
  the real `fetch()` + `updateData()` pattern directly via an isolated MapLibre harness (the same technique
  established in Sessions 60/62/63 for when this sandbox's own Mapbox-loading stall blocks direct in-app
  testing), confirmed for both the smallest and largest (58MB) files with zero errors and real rendered
  output. Pre-join backups kept locally, deliberately not committed (git history already preserves the same
  content from the previous commit). APP_VERSION bumped 2.60.0 → 2.61.0, SHELL_CACHE bumped v177 → v178.
- Session 72: wired the Session 71 `nhdStreamOrder` field into real progressive zoom-tiered loading for the
  same 4 oversized Oregon fish species, replacing the geographic-sub-sharding plan Session 62 had originally
  flagged as the eventual fix — see Architecture notes' "NHD tiered zoom-based loading (Fish, 4 oversized
  Oregon species)" entry for full mechanism/verification detail. Explicit, non-negotiable design constraint
  going in: this could NOT be a `setFilter()`-only approach like the Session 66 watershed zoom-auto-hide,
  since a filter still pays the full ~50k-feature `updateData()` cost up front and just hides most of it
  visually — real tiered loading was required, where each of the 3 tiers (major/medium/minor, split on the
  real `nhdStreamOrder` field, thresholds at zoom 8 and 11) only ever calls `updateData()` once, the first
  time its own zoom threshold is crossed, and never unloads on zoom-out. Added `tiered: true` to the 4
  species' catalog entries (previously fully excluded from the Fish species dropdown), extracted a shared
  `tagLocalFileFeature()` helper so the new tiered path and the existing one-shot path for the other 30
  Oregon species tag features identically, and branched both real call sites
  (`setWildlifeStateDataState()` and the boot-time State Data restore path) to route a tiered species through
  the new `startNhdTieredLoad()`/`loadNhdTier()`/`updateNhdTieredZoomLoading()` machinery instead of the
  unchanged `loadStateDataLayer()`+`applyStateDataToSource()` pair. The task's own explicit ask — real,
  live-measured timing for each tier transition, not an estimate, specifically to check whether the design
  holds up given the earlier finding that `updateData()` re-tiles the ENTIRE cumulative source on every call
  — was answered with an isolated `maplibregl.Map` harness (the established zero-Mapbox-dependency technique
  from Sessions 60/62/63) using byte-identical copies of the real shipped functions and the real production
  data, plus test-only `sourcedata`/`isSourceLoaded` event instrumentation (needed because `updateData()`
  itself is fire-and-forget — timing just the synchronous call, as an early attempt did, would have badly
  understated the real cost). Result for CoastalCutthroatTrout (the largest species, the explicit stress
  test): Tier 2's `updateData()` (17,907 features, cumulative ~19,922) settled in ~3.0-3.4s real wall-clock
  time; Tier 3's (33,415 more, cumulative to the full 53,337) settled in ~3.5s — essentially flat, not the
  non-linear blowup the earlier synthetic-data `updateData()` research predicted for comparable cumulative
  sizes, most plausibly because the real Oregon data is already mapshaper-simplified (Session 61) while that
  earlier research deliberately used vertex-dense synthetic data to stress-test the worst case. Conclusion
  reported back to the task: the 3-tier design at zoom 8/11 holds up at real scale as specified, no
  adjustment needed. (Tier 1's own first-ever measurement showed an anomalous ~15s, flagged as a likely
  one-time cold-start artifact of this specific automation sandbox rather than representative — it didn't fit
  the pattern of every later, consistent ~3-3.5s measurement.) Verified live end to end: CoastalCutthroatTrout
  showing only major rivers immediately after selection (screenshot: a sparse branching network), medium
  tributaries appearing exactly once at zoom 8 and minor streams exactly once at zoom 11 (confirmed via
  `querySourceFeatures()` counts and real console log entries, with re-triggered zoom ticks past each
  threshold producing zero new `updateData()` calls — the one-time-trigger rule holding under real repeated
  crossings, not just a single one), zoom-out never unloading anything (1,174 → 26,487 features at the
  identical zoom level once all 3 tiers were loaded, plus a visual before/after screenshot comparison showing
  a dramatically denser stream network), and the other 3 species (Coho, Winter Steelhead, Redband Trout) all
  producing bucket counts matching the raw data exactly with the same one-time-trigger behavior. Also
  confirmed directly (not just via the isolated harness) in the real app, after clearing a stale
  `SHELL_CACHE` service-worker cache that was initially serving a pre-edit snapshot (the same well-documented
  gotcha noted in many prior sessions): the real Fish species dropdown now lists all 4 new species, picking
  Coastal Cutthroat Trout + Oregon fires the real `startNhdTieredLoad()` branch with a real console log
  matching the harness's own bucket counts exactly, the checkbox/active-layers chip update correctly and
  coexist with pre-existing Big Game/Upland Game selections, and — closing the loop on the "other 30 species
  unaffected" requirement — picking a non-tiered species (Bull Trout) fires zero `[NHD-TIER]` log lines and
  routes through the completely unchanged old path with a correct chip update and zero console errors. The
  real map's own base-layer tile loading never reached `style.load` in this sandbox during this session (the
  same long-documented Mapbox v4 access limitation hit by every prior session touching DEM/vectorbase/
  wildlife layers — confirmed via the real app's own `[BOOT]` markers stopping short, not assumed), which is
  why `wildlife-statedata-fish-source` didn't exist yet in that specific tab and `loadNhdTier`'s own
  pre-existing `if (!srcObj) return;` guard correctly no-op'd there rather than crashing — this is exactly
  why the isolated-harness measurements are the load-bearing verification for the actual timing/rendering
  behavior, not a gap in what was checked. `node --check` confirmed clean syntax on all 4 extracted inline
  `<script>` blocks and `service-worker.js`. APP_VERSION bumped 2.61.0 → 2.62.0 (minor — new feature),
  SHELL_CACHE bumped v178 → v179.
