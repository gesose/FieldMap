// Re-fetches FieldMap's custom Mapbox Studio styles and rewrites their local JSON files
// with the same mapbox:// -> https transforms applied at runtime by loadStyle() in
// index.html. Run with: node refresh-style.js

const fs = require('fs');
const path = require('path');

var MAPBOX_TOKEN = 'pk.eyJ1IjoiZ3Nvc2ViZWUiLCJhIjoiY21yMjdsNGtqMDJydzJ4bzlpMXk0cGVtaiJ9.S94QGMtU7iSvgEIoadAKyg';

// Every custom Studio style FieldMap loads locally (see LOCAL_STYLE_FILES in index.html).
// Aerial (mapbox/satellite-v9) is a stock Mapbox style fetched remotely at runtime, so it's
// not refreshed here.
var STYLES = [
  { name: 'topo',           owner: 'gsosebee', id: 'cmr14lfx6002x01stbk0tfhjv', outputFile: 'topo-style.json' },
  { name: 'topo-dark',      owner: 'gsosebee', id: 'cmr2ko4xn000z01szc670a0rj', outputFile: 'topo-dark-style.json' },
  { name: 'aerial-streets', owner: 'gsosebee', id: 'cmr2oxtcd001401sz7v3933cj', outputFile: 'aerial-streets-style.json' }
];

function refreshStyle(style){
  var styleUrl = 'https://api.mapbox.com/styles/v1/' + style.owner + '/' + style.id
    + '?access_token=' + MAPBOX_TOKEN;
  var outputPath = path.join(__dirname, style.outputFile);

  return fetch(styleUrl)
    .then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching "' + style.name + '" from Mapbox Studio');
      return r.text();
    })
    .then(function(text){
      // sprite: mapbox://sprites/owner/style_id[/hash] -> HTTPS with token placeholder
      text = text.replace(/"sprite"\s*:\s*"mapbox:\/\/sprites\/([^"\/]+\/[^"\/]+)[^"]*"/g,
        '"sprite": "https://api.mapbox.com/styles/v1/$1/sprite?access_token={{MAPBOX_TOKEN}}"');
      // glyphs: mapbox://fonts/... -> HTTPS with token placeholder
      text = text.replace(/"glyphs"\s*:\s*"mapbox:\/\/fonts\/([^"]+)"/g,
        '"glyphs": "https://api.mapbox.com/fonts/v1/$1?access_token={{MAPBOX_TOKEN}}"');
      // source urls: mapbox://tilesets -> TileJSON with token placeholder
      text = text.replace(/"url"\s*:\s*"mapbox:\/\/([^"]+)"/g,
        '"url": "https://api.mapbox.com/v4/$1.json?secure&access_token={{MAPBOX_TOKEN}}"');
      // fix any line-join:"none" (invalid in MapLibre)
      text = text.replace(/"line-join"\s*:\s*"none"/g, '"line-join": "miter"');

      var styleObj = JSON.parse(text);
      delete styleObj.name;
      flattenImports(styleObj);

      fs.writeFileSync(outputPath, JSON.stringify(styleObj));
      console.log('Wrote ' + outputPath);
    });
}

// Recursively checks any paint/layout/filter value for a ["config", ...] expression —
// a v3-only reference to a Standard-style runtime toggle (e.g. showRoadsAndTransit).
// These can be nested arbitrarily deep inside "case"/"step"/"match"/etc. expressions.
function containsConfigExpression(value){
  if (Array.isArray(value)){
    if (value[0] === 'config') return true;
    return value.some(containsConfigExpression);
  }
  if (value && typeof value === 'object'){
    return Object.keys(value).some(function(k){ return containsConfigExpression(value[k]); });
  }
  return false;
}

// v3-only lighting paint properties: *-emissive-strength (line-emissive-strength,
// raster-emissive-strength, fill-emissive-strength, circle-emissive-strength,
// fill-extrusion-emissive-strength, etc.) — matched generically by suffix so any
// property in the family is caught, not just the two Studio happens to use today.
function hasV3OnlyPaintProperty(layer){
  return !!(layer.paint && Object.keys(layer.paint).some(function(key){
    return /-emissive-strength$/.test(key);
  }));
}

function isV3OnlyLayer(layer){
  return containsConfigExpression(layer.paint) ||
    containsConfigExpression(layer.layout) ||
    containsConfigExpression(layer.filter) ||
    hasV3OnlyPaintProperty(layer);
}

// Layers we need even if flagged as v3-only: the satellite raster imagery, and (for
// topo/topo-dark, if Studio ever adds one) a hillshade layer driven by the terrain DEM.
function isKeepLayer(layer){
  if (layer.id === 'mapbox-satellite') return true;
  if (layer.type === 'hillshade' && /dem/i.test(layer.source || '')) return true;
  return false;
}

// Strip just the offending paint/layout keys from a kept layer instead of dropping it.
function sanitizeV3OnlyLayer(layer){
  ['paint', 'layout'].forEach(function(bucket){
    if (!layer[bucket]) return;
    Object.keys(layer[bucket]).forEach(function(key){
      if (/-emissive-strength$/.test(key) || containsConfigExpression(layer[bucket][key])){
        delete layer[bucket][key];
      }
    });
  });
  return layer;
}

// Studio exports these as Mapbox "Standard" fragment styles: imports[].data holds a full
// nested style (sources + layers) that Mapbox GL JS v3 merges into the render pipeline at
// runtime. MapLibre GL JS (pinned version here predates fragment/import support) never reads
// imports[].data at all, so anything living only in there — critically, the raster satellite
// layer for aerial-streets — silently never renders. Flatten it into the classic top-level
// sources/layers structure so it renders the same without fragment support.
//
// Studio also re-lists every layer you've customized at the top level using the SAME id as
// its fragment counterpart (the top-level copy is the edited override) — but customizing a
// layer doesn't always keep its id: splitting the fragment's generic "roads"/"roads-case"
// into per-class layers (road-minor, road-primary, road-motorway-trunk, etc., a normal
// outcome of Studio's road-styling panel) produces ids that exist ONLY at the top level,
// with no fragment counterpart at all. An earlier version of this function used the
// fragment's order as the skeleton and appended every such "no fragment match" layer at
// the very end, regardless of type — which pushed all the real road line layers after
// road-label (a same-id override matched to a much earlier fragment position), even
// though the top-level array itself already has them in the correct relative order
// (confirmed by fetching the raw Studio JSON directly: road-label sits after every
// road-*-case/road-minor/road-primary/etc. line layer in styleObj.layers already). Root
// cause: merging around the fragment's skeleton instead of the top-level one.
//
// Fix: use the top-level layers array as the skeleton (it's Studio's fully-resolved
// order, covering both same-id overrides and split/renamed layers alike), and only pull
// in genuinely fragment-only layers (never customized at top level — e.g. the raster
// satellite base layer) by splicing them in next to the nearest fragment neighbor that
// DOES have a top-level match, preserving their position relative to that context
// instead of dumping them all at the front or back.
function flattenImports(styleObj){
  if (!styleObj.imports || !styleObj.imports.length) return;

  styleObj.imports.forEach(function(imp){
    var fragSources = (imp.data && imp.data.sources) || {};
    var fragLayers = (imp.data && imp.data.layers) || [];

    // Sources: fragment fills in whatever the top level doesn't already define;
    // top-level always wins on a key collision (it's the user's own version).
    Object.keys(fragSources).forEach(function(key){
      if (!(key in styleObj.sources)) styleObj.sources[key] = fragSources[key];
    });

    var topIds = {};
    styleObj.layers.forEach(function(l){ topIds[l.id] = true; });

    // Bucket fragment-only layers by "anchor" — the id of the nearest PRECEDING fragment
    // layer that also has a top-level match. '' means "before any anchor was seen yet"
    // (prepended at the very front). "slot" layers are fragment-only placeholders
    // (bottom/middle/top) with no classic-spec meaning, so they're skipped entirely
    // (not treated as anchors, not kept). Fragment-only layers using v3-only constructs
    // (["config",...] expressions, *-emissive-strength paint, model/building/clip types)
    // get dropped too — except the handful we actually need (isKeepLayer), which get
    // sanitized (offending keys stripped) instead.
    var buckets = {};
    var currentAnchor = '';
    fragLayers.forEach(function(fl){
      if (fl.type === 'slot') return;
      if (topIds[fl.id]){
        currentAnchor = fl.id;
        return;
      }
      if (isV3OnlyLayer(fl)){
        if (!isKeepLayer(fl)) return;
        fl = sanitizeV3OnlyLayer(fl);
      }
      if (!buckets[currentAnchor]) buckets[currentAnchor] = [];
      buckets[currentAnchor].push(fl);
    });

    var merged = (buckets[''] || []).slice();
    styleObj.layers.forEach(function(l){
      merged.push(l);
      if (buckets[l.id]) merged = merged.concat(buckets[l.id]);
    });
    styleObj.layers = merged;
  });

  delete styleObj.imports;
  pruneUnsupportedSources(styleObj);
}

// MapLibre 3.6.2's supported source types. Fragment sources like 3dbuildings/mapbox-3d-events
// (batched-model) and mapbox-landmarks (raster-array) are v3-only and fail validation just by
// being declared, even once every layer that referenced them has been filtered out above.
var SUPPORTED_SOURCE_TYPES = ['vector', 'raster', 'raster-dem', 'geojson', 'image', 'video'];

function pruneUnsupportedSources(styleObj){
  Object.keys(styleObj.sources).forEach(function(key){
    if (SUPPORTED_SOURCE_TYPES.indexOf(styleObj.sources[key].type) === -1){
      delete styleObj.sources[key];
    }
  });
}

STYLES.reduce(function(chain, style){
  return chain.then(function(){ return refreshStyle(style); });
}, Promise.resolve())
  .catch(function(err){
    console.error('[refresh-style] Failed:', err.message);
    process.exitCode = 1;
  });
