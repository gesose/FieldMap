# FieldMap - MapLibre Migration

## Project context
FieldMap is a PWA for hunters/outdoor recreationists to manage pins, routes, areas, and bearings on a map. Built in vanilla JS, single HTML file (index.html), Firebase/Firestore backend.

## Current state
Pins, routes, areas, and bearings are all fully ported to MapLibre — draw, edit, vertex/endpoint editing,
and persisted rendering all work with no remaining Leaflet (`L.*`) calls in any of those four item types.
- Pins render as maplibregl.Marker with custom SVG HTML (buildPinMarkerHtml)
- Routes/areas/bearings all render from shared GeoJSON sources (tracks-source, polygons-source,
  bearings-source) rather than one Leaflet layer per item — see Architecture notes
- Style switching works — everything persists correctly across all base layer switches, including
  off-screen items and anything mid-draw or mid-edit at the moment of the switch
- Clustering is temporarily disabled: all pins always show as individual markers regardless of zoom. The
  cluster-circles/cluster-counts bubble layers and pins-source still exist but no longer drive individual
  marker visibility (see Architecture notes) — proper clustering to be implemented in a later session

## What's broken (expected, to be fixed in later sessions)
- Draw/measure tools other than route/area drawing (the standalone "measure" ruler tool, elevation tap,
  compass bearing lines, GPX search-result marker) — still L.circleMarker/L.polyline based
- Fire perimeter, hydrography, and gauge-station popups are still individual maplibregl.Popup instances,
  NOT converted to the new #view-drawer — deliberately out of scope for the drawer-unification batch (not
  named in that spec's list of 6 replaced popup types), not a bug
- Batch 2 of the drawer-unification work (tap-anywhere-on-item to open + expand-in-place editing, replacing
  "Edit data" opening the separate centered modal) is explicitly not started — "Edit data" still opens the
  existing centered-modal Edit form unchanged, on purpose, for this batch
- All overlay toggles (FSTopo, MVUM, public land, hydro, snow depth, NLCD)
- Sun-path arc, offline-area boundary rectangles — still L.geoJSON/L.rectangle based
- GPS accuracy circle (gpsAccCircle) — needs MapLibre source/layer
- "Edit shape" vertex-editing exists for both routes and areas; there is no equivalent "edit vertices" for
  polygons drawn via the (still-Leaflet) offline-boundary rectangles — not in scope, different feature
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
