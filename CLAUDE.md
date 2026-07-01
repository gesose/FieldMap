# FieldMap - MapLibre Migration

## Project context
FieldMap is a PWA for hunters/outdoor recreationists to manage pins, routes, areas, and bearings on a map. Built in vanilla JS, single HTML file (index.html), Firebase/Firestore backend.

## Current state
Migrating from Leaflet to MapLibre GL JS. Session 1 complete: base map rendering with Mapbox Outdoors and Street styles, GPS dot with 3-state follow behavior, scale bar, zoom controls.

## What's broken (expected, to be fixed in later sessions)
- All pin/marker rendering (L.marker references)
- Routes, areas, bearings (L.polyline, L.polygon)
- All overlay toggles (FSTopo, MVUM, public land, hydro, snow depth, NLCD)
- GMU boundaries
- Search (uses L.circleMarker)
- Draw/measure tools
- Cluster layer (clusterLayerGroup.removeLayer on null)
- Settings "Default base layer" dropdown (uses map.hasLayer)

## Architecture notes
- Single file app: index.html (~9000 lines)
- Mapbox token stored in const MAPBOX_TOKEN near top of file
- GPS dot: 3-state machine (off/following/free) using gpsDotState variable
- Base layer switching: map.setStyle() with full https://api.mapbox.com/styles/v1/... URLs + access token
- Style URLs must use https://api.mapbox.com/... format, NOT mapbox:// shorthand (MapLibre doesn't support it)
- Mapbox sources inside style JSON also need TileJSON resolution via https://api.mapbox.com/v4/{id}.json?secure&access_token=TOKEN

## Session history
- Session 1: Leaflet → MapLibre swap, base layers, GPS dot, scale bar, zoom controls
