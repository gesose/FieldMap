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
