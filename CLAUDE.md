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

## What's broken (expected, to be fixed in later sessions)
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
  batch is what finally exercises those buttons in a place they'd get used.
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
