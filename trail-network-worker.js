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
      var network = { type: 'FeatureCollection', features: features };
      graph = preprocess(network);
    }
    self.postMessage({ id: id, phase: 'done', ok: true, featureCount: featureCount, graph: graph });
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
  for (var i = 0; i < layer.length; i++){
    var f = layer.feature(i);
    var cls = f.properties && f.properties['class'];
    if (!cls || !TRAIL_NETWORK_CLASSES[cls]) continue;
    var gj = f.toGeoJSON(tile.x, tile.y, tile.z);
    var geom = gj && gj.geometry;
    if (!geom) continue;
    if (geom.type === 'LineString'){
      out.push({ type: 'Feature', properties: {}, geometry: geom });
    } else if (geom.type === 'MultiLineString'){
      // geojson-path-finder's own topology builder only ever reads LineString features (confirmed
      // via its source — a MultiLineString would be silently dropped from the network entirely,
      // not an error), so each part is split into its own independent LineString feature here.
      for (var p = 0; p < geom.coordinates.length; p++){
        out.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: geom.coordinates[p] } });
      }
    }
  }
}
