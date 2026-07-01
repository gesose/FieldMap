# FieldMap - MapLibre Migration

## Project context
FieldMap is a PWA for hunters/outdoor recreationists to manage pins, routes, areas, and bearings on a map. Built in vanilla JS, single HTML file (index.html), Firebase/Firestore backend.

## Current state
Sessions 1 and 2 complete. Base map, GPS dot, and pin rendering all working with MapLibre.
- Pins render as maplibregl.Marker with custom SVG HTML (buildPinMarkerHtml)
- Style switching works — pins persist correctly across all base layer switches, including off-screen pins
- Clustering is temporarily disabled: all pins always show as individual markers regardless of zoom. The
  cluster-circles/cluster-counts bubble layers and pins-source still exist but no longer drive individual
  marker visibility (see Architecture notes) — proper clustering to be implemented in a later session

## What's broken (expected, to be fixed in later sessions)
- Routes, areas, bearings on map, draw/measure tools, search (L.polyline, L.polygon, L.circleMarker) — Session 3
- All overlay toggles (FSTopo, MVUM, public land, hydro, snow depth, NLCD) — Session 4
- GMU boundaries — Session 4
- GPS accuracy circle (gpsAccCircle) — needs MapLibre source/layer

## Architecture notes
- Single file app: index.html (~9000 lines)
- Mapbox token in const MAPBOX_TOKEN; 3 styles in MAPBOX_STYLES (topo default — local topo-style.json, aerial, aerial-streets); Street removed
- refresh-style.js (project root, run with `node refresh-style.js`) re-fetches topo-style.json from Mapbox Studio and re-applies the sprite/glyphs/source-url token-placeholder transforms
- GPS dot: 3-state machine (off/following/free) using gpsDotState + maplibregl.Marker
- Base layer switching: loadStyle(styleName) fetches (topo-style.json locally, others via MAPBOX_STYLES URLs) + strips name + rewrites mapbox:// refs, then map.setStyle()
- mapbox:// source URLs resolved via https://api.mapbox.com/v4/{id}.json?secure&access_token=TOKEN
- Pin markers: maplibregl.Marker + custom HTML (buildPinMarkerHtml), maplibregl.Popup, openPopup() polyfill
- pins-source (GeoJSON, cluster:true) + cluster-circles/cluster-counts layers still exist and are re-added by
  reinitializeLayers(), but only drive the aggregated bubble count display now
- reinitializeLayers() called on map.on('style.load') — rebuilds every pin marker fresh (remove + re-add all)
  and re-adds source/layers after every setStyle(), so icons/colors/positions stay correct post-switch
- updateMarkerVisibility() called on map.on('idle') — always shows every pin marker (subject only to the
  filter-panel mapItemVisible() check); no longer hides markers based on cluster-source query results, since
  querySourceFeatures() only sees currently rendered/loaded tiles and was hiding off-screen pins after a style
  switch. A clustered pin may render its marker underneath the cluster bubble for now.
- Routes/areas/bearings save flows (saveTrackFromModal, savePolygonFromModal, saveBearingFromModal) wrap their
  still-Leaflet map-draw calls (addTrackToMap, addPolygonToMap, addBearingToMap, refresh* variants) in
  try/catch so a Session-3-pending L.* failure can't block closing the modal / refreshing the sidebar / saving

## Session history
- Session 1: Leaflet → MapLibre swap, base layers, GPS dot, scale bar, zoom controls
- Session 2: Pin rendering (maplibregl.Marker), 4→3-style switcher (Street removed, topo default via local
  topo-style.json + refresh-style.js), modal close/sidebar-refresh fixes for pins/bearings/tracks/areas,
  bearing-tap crash guard, pin-marker persistence fix across style switches, clustering temporarily disabled
