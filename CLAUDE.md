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
