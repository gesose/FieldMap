// FieldMap offline trail-network worker
//
// One-time, per-downloaded-area processing (see buildOfflineTrailGraph() in index.html, the only
// thing that ever posts to this worker, right after an offline area's own tile download finishes —
// never during in-field route drawing). Decodes the cached vector-tile bytes for every vectorbase
// tile downloaded at the area's own single highest zoom level, extracts real trail/road LineString
// geometry (the same real-world road/path/track/etc. classes TRAIL_SNAP_LAYERS already selects for
// the online-vs-offline point-snap fallback in index.html — see TRAIL_NETWORK_CLASSES below), and
// feeds the merged network into geojson-path-finder's own internal preprocess() step (topology
// building + graph compaction) — normally hidden behind the PathFinder constructor, exposed
// separately here (see path-finder-bundle.js's own comment) specifically so this expensive
// one-time cost can be paid ONCE, here, off the main thread, rather than again on every single
// draw-time route request.
//
// The resulting graph is a plain, JSON-serializable object (no functions, no Maps, no circular
// references — confirmed by reading geojson-path-finder's own preprocessor source before relying
// on this) that the main thread stores as-is in IndexedDB via FieldMapLocalDB, then reconstitutes
// at draw time by directly assigning it onto a real PathFinder instance's own .graph property —
// skipping the constructor's own preprocess() call entirely (confirmed, via a direct comparison
// against going through the real constructor, to produce byte-identical findPath() results) — see
// offlinePathFinderForRoute() in index.html for that reuse trick, and why it's what makes
// draw-time lookups feel instant regardless of how expensive building the graph itself was here.
//
// TILE-BOUNDARY STITCHING (added after a real-device report of only 1 of 4 route segments
// tracing correctly offline, despite the whole route being fully within a downloaded/processed
// area — confirmed NOT a road-vs-trail layer-scope issue, see TRAIL_NETWORK_CLASSES below, which
// already includes ordinary paved-road classes). Root cause, confirmed via a synthetic
// reproduction using real Rocky Butte/Portland OR coordinates and a real Mapbox-scale tile
// buffer ratio (1/32 of tile width at extent 4096): each tile is clipped to its OWN buffer
// boundary independently — a long, sparse-vertex road (an entirely ordinary shape for a
// generalized/simplified paved road, not a contrived edge case) can have NO real source vertex
// anywhere near a given tile edge, so the two tiles' own clips each interpolate a DIFFERENT
// real-world endpoint there — the reproduction measured a 53.54m gap for one realistic buffer/
// vertex-density combination, and a sparser real road could produce a far larger one. This is
// nowhere close to geojson-path-finder's own default ~1.1m coordinate-rounding tolerance (the
// mechanism the original, too-optimistic version of this file relied on entirely, verified only
// against a synthetic test that — unrealistically — placed a shared vertex exactly at the tile
// boundary in both tiles' data). stitchTileBoundaries() below explicitly reconciles this BEFORE
// preprocess() ever runs: it finds every LineString's OPEN endpoints (first/last coordinate only
// — a real mid-line vertex is never touched) that sit within BOUNDARY_SNAP_METERS of a real
// internal boundary between two ADJACENT tiles that were both actually decoded, nearest-neighbor-
// matches endpoints from the two tiles' own separate features across that specific boundary, and
// snaps each matched pair to one shared coordinate (their real-world midpoint) — after which
// geojson-path-finder's own ordinary vertex-key matching (now operating on literally-identical
// coordinates) connects them correctly, with no change needed to preprocess() or findPath()
// themselves.

self.window = self; // vector-tile-bundle.js/path-finder-bundle.js both assign to `window.X` (the
                     // same bundles the main thread loads via a plain <script src>) — this makes
                     // that resolve correctly inside a plain (non-module) Worker's own global
                     // scope, which has no `window` of its own.
importScripts('./vector-tile-bundle.js', './path-finder-bundle.js');

var VectorTile = self.FieldMapVectorTile.VectorTile;
var PbfReader = self.FieldMapVectorTile.PbfReader;
var preprocess = self.FieldMapPathFinder.preprocess;

// Every real vector-tile `class` value TRAIL_SNAP_LAYERS' own MapLibre style-layer filters cover —
// the union of road-motorway-trunk/road-primary/road-secondary-tertiary/road-street/road-minor/
// road-major-link/road-minor-link/road-path-trail/road-path-cycleway-piste/road-path/road-steps/
// road-pedestrian and their bridge-/tunnel- counterparts, all confirmed live against the real
// topo-style.json layer filters before writing this list, not guessed. Deliberately an ALLOWLIST,
// not a denylist, so rail ('major_rail'/'minor_rail'), 'aerialway', and ferry (none of which
// appear here) are automatically excluded with no explicit exclusion needed — matching
// TRAIL_SNAP_LAYERS' own "deliberately excludes... rail/aerialway/ferry" doc comment exactly.
// 'service'/'track' are included unconditionally (unlike the "road-minor" STYLE layer's own
// zoom-gated display filter, which only paints 'service' class at zoom>=14) — a real forest
// service road is a genuinely traversable edge in the network at any zoom; the style's own
// zoom gate is a pure rendering-density concern that has nothing to do with whether the road
// exists for routing purposes.
var TRAIL_NETWORK_CLASSES = {
  motorway: 1, trunk: 1, primary: 1, secondary: 1, tertiary: 1, street: 1, street_limited: 1,
  track: 1, service: 1, motorway_link: 1, trunk_link: 1, primary_link: 1, secondary_link: 1,
  tertiary_link: 1, path: 1, pedestrian: 1
};
var TRAIL_SOURCE_LAYER = 'road'; // every TRAIL_SNAP_LAYERS style layer reads this one source-layer
                                  // (confirmed live against all 3 local style JSON files — see
                                  // this project's own build notes)

// geojson-path-finder's own vertex-key rounding tolerance (in degrees), used for BOTH building
// the graph here (preprocess) and querying it later at draw time (findPath, via the PathFinder
// reuse trick in index.html's offlinePathFinderForRoute). These two MUST use the identical
// tolerance value — findPath() computes its own query-time vertex key by rounding the tapped
// point's coordinate at whatever tolerance its own `this.options.tolerance` says, and that key
// is looked up directly against `graph.vertices`, whose OWN keys were rounded at whatever
// tolerance preprocess() used to build them; a mismatch between the two silently breaks every
// lookup, not just near tile boundaries (confirmed the hard way — an earlier version of this fix
// bumped ONLY the build-time preprocess() call without also updating the query-time options,
// which broke offline snapping outright rather than fixing it, caught by this session's own
// test suite before shipping). Posted back in the 'done' message and stored alongside the graph
// in IndexedDB specifically so the two can never drift apart again — the main thread never
// hardcodes this value a second time, it reads it back from what was actually used to build the
// graph it's about to query.
var TRAIL_GRAPH_TOLERANCE = 3e-5; // ~3.3m — see the preprocess() call below for the full
                                   // reasoning on this specific value

self.onmessage = function(evt){
  var msg = evt.data;
  if (!msg || msg.type !== 'build') return;
  var id = msg.id;
  try {
    var tiles = msg.tiles || []; // [{ z, x, y, bytes: ArrayBuffer }, ...]
    var features = [];
    for (var i = 0; i < tiles.length; i++){
      extractTrailFeatures(tiles[i], features);
      self.postMessage({ id: id, phase: 'decode', done: i + 1, total: tiles.length });
    }
    var graph = null, featureCount = features.length;
    if (features.length){
      stitchTileBoundaries(features, tiles);
      // Strip the internal _srcTileKey tracking field before handing features to preprocess() —
      // harmless either way (preprocess()/topology.js never enumerate unknown feature-level
      // properties), but keeping the network object clean of internal-only fields.
      features.forEach(function(f){ delete f._srcTileKey; });
      var network = { type: 'FeatureCollection', features: features };
      // TRAIL_GRAPH_TOLERANCE bumped from the library's own default (1e-5deg, ~1.1m) to ~3.3m as
      // a small, low-risk additional safety margin for near-miss cases just outside whatever
      // exact snap decision stitchTileBoundaries makes — NOT a substitute for it (3.3m is nowhere
      // near enough to bridge the real tens-of-meters gaps stitchTileBoundaries exists to close;
      // a much larger tolerance was deliberately avoided here since it would also loosen vertex-
      // merging everywhere else in the graph, not just near tile boundaries, risking incorrectly
      // merging two genuinely distinct nearby trail/road vertices anywhere in the network).
      graph = preprocess(network, { tolerance: TRAIL_GRAPH_TOLERANCE });
    }
    self.postMessage({ id: id, phase: 'done', ok: true, featureCount: featureCount, graph: graph, tolerance: TRAIL_GRAPH_TOLERANCE });
  } catch (err){
    self.postMessage({ id: id, phase: 'done', ok: false, error: (err && err.message) || String(err) });
  }
};

function extractTrailFeatures(tile, out){
  var vt;
  try { vt = new VectorTile(new PbfReader(tile.bytes)); }
  catch (e){ return; } // a corrupt/unexpected tile shouldn't abort the whole area's processing
  var layer = vt.layers[TRAIL_SOURCE_LAYER];
  if (!layer) return;
  var tileKey = tile.z + '/' + tile.x + '/' + tile.y;
  for (var i = 0; i < layer.length; i++){
    var f = layer.feature(i);
    var cls = f.properties && f.properties['class'];
    if (!cls || !TRAIL_NETWORK_CLASSES[cls]) continue;
    var gj = f.toGeoJSON(tile.x, tile.y, tile.z);
    var geom = gj && gj.geometry;
    if (!geom) continue;
    if (geom.type === 'LineString'){
      out.push({ type: 'Feature', properties: {}, geometry: geom, _srcTileKey: tileKey });
    } else if (geom.type === 'MultiLineString'){
      // geojson-path-finder's own topology builder only ever reads LineString features (confirmed
      // via its source — a MultiLineString would be silently dropped from the network entirely,
      // not an error), so each part is split into its own independent LineString feature here.
      for (var p = 0; p < geom.coordinates.length; p++){
        out.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: geom.coordinates[p] }, _srcTileKey: tileKey });
      }
    }
  }
}

// ---- Tile-boundary stitching (see the file-level comment above for the full root-cause story) ----

var BOUNDARY_SNAP_METERS = 200; // generous vs. the ~53m gap the reproduction measured for one
                                 // realistic buffer/vertex-density combination (a sparser real
                                 // road, or a larger real buffer, could need more) — bounded well
                                 // under typical real-world block/road spacing so it can't casually
                                 // bridge two genuinely unrelated roads that happen to both cross
                                 // near the same point on the same tile boundary (a real, accepted,
                                 // low-consequence tradeoff: at worst a route briefly uses a nearby
                                 // parallel road instead of the correct one, not a systemic failure).

function tileBoundsLngLat(z, x, y){
  function tile2lon(xx, zz){ return xx / Math.pow(2, zz) * 360 - 180; }
  function tile2lat(yy, zz){
    var n = Math.PI - 2 * Math.PI * yy / Math.pow(2, zz);
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }
  return { west: tile2lon(x, z), east: tile2lon(x + 1, z), north: tile2lat(y, z), south: tile2lat(y + 1, z) };
}

function haversineMetersLocal(a, b){
  var R = 6371000;
  function toRad(d){ return d * Math.PI / 180; }
  var dLat = toRad(b[1] - a[1]), dLng = toRad(b[0] - a[0]);
  var s = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Mutates `features` in place, snapping matched cross-tile-boundary endpoint pairs to a shared
// coordinate. `tiles` is the same { z, x, y, bytes } list the caller decoded — used only for its
// z/x/y identity here, to compute the real internal boundary lines between adjacent tiles.
function stitchTileBoundaries(features, tiles){
  var present = {};
  tiles.forEach(function(t){ present[t.z + '/' + t.x + '/' + t.y] = true; });

  // Every real internal boundary between two tiles that were BOTH actually decoded — the outer
  // edge of the whole downloaded area is deliberately excluded (no neighbor tile exists there to
  // stitch with; a route ending at the edge of a downloaded area is expected to just end there).
  var boundaries = [];
  tiles.forEach(function(t){
    var b = tileBoundsLngLat(t.z, t.x, t.y);
    var selfKey = t.z + '/' + t.x + '/' + t.y;
    var eastKey = t.z + '/' + (t.x + 1) + '/' + t.y;
    if (present[eastKey]) boundaries.push({ axis: 'lng', value: b.east, keyA: selfKey, keyB: eastKey });
    var southKey = t.z + '/' + t.x + '/' + (t.y + 1);
    if (present[southKey]) boundaries.push({ axis: 'lat', value: b.south, keyA: selfKey, keyB: southKey });
  });
  if (!boundaries.length) return; // a single-tile area — nothing to stitch

  function metersPerDegLng(lat){ return 111320 * Math.cos(lat * Math.PI / 180); }
  var METERS_PER_DEG_LAT = 111320;

  // Every LineString's OPEN endpoints only (index 0 and the last index) — a mid-line vertex was
  // never touched by tile clipping and must never be treated as a stitch candidate.
  var candidates = [];
  features.forEach(function(f, fi){
    var coords = f.geometry.coordinates;
    if (!coords || coords.length < 2) return;
    candidates.push({ fi: fi, end: 0, coord: coords[0], tileKey: f._srcTileKey });
    candidates.push({ fi: fi, end: coords.length - 1, coord: coords[coords.length - 1], tileKey: f._srcTileKey });
  });

  boundaries.forEach(function(b){
    var nearA = [], nearB = [];
    candidates.forEach(function(c){
      var distM = (b.axis === 'lng')
        ? Math.abs(c.coord[0] - b.value) * metersPerDegLng(c.coord[1])
        : Math.abs(c.coord[1] - b.value) * METERS_PER_DEG_LAT;
      if (distM > BOUNDARY_SNAP_METERS) return;
      if (c.tileKey === b.keyA) nearA.push(c);
      else if (c.tileKey === b.keyB) nearB.push(c);
    });
    if (!nearA.length || !nearB.length) return;
    // Nearest-neighbor match, real haversine distance (robust regardless of how shallow an angle
    // the road crosses the boundary at — no along-line projection needed). Each B candidate is
    // used at most once, so 2 distinct A-side roads near the same boundary can't both snap to the
    // same B-side endpoint.
    var usedB = {};
    nearA.forEach(function(ca){
      var best = null, bestDist = Infinity, bestBi = -1;
      nearB.forEach(function(cb, bi){
        if (usedB[bi]) return;
        var d = haversineMetersLocal(ca.coord, cb.coord);
        if (d < bestDist){ bestDist = d; best = cb; bestBi = bi; }
      });
      if (best && bestDist <= BOUNDARY_SNAP_METERS){
        usedB[bestBi] = true;
        var shared = [ (ca.coord[0] + best.coord[0]) / 2, (ca.coord[1] + best.coord[1]) / 2 ];
        features[ca.fi].geometry.coordinates[ca.end] = shared;
        features[best.fi].geometry.coordinates[best.end] = shared;
      }
    });
  });
}
