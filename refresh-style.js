// Re-fetches the FieldMap topo style from Mapbox Studio and rewrites topo-style.json
// with the same mapbox:// -> https transforms applied at runtime by loadStyle() in
// index.html. Run with: node refresh-style.js

const fs = require('fs');
const path = require('path');

var MAPBOX_TOKEN = 'pk.eyJ1IjoiZ3Nvc2ViZWUiLCJhIjoiY21yMjdsNGtqMDJydzJ4bzlpMXk0cGVtaiJ9.S94QGMtU7iSvgEIoadAKyg';
var STYLE_OWNER = 'gsosebee';
var STYLE_ID = 'cmr14lfx6002x01stbk0tfhjv';
var OUTPUT_PATH = path.join(__dirname, 'topo-style.json');

var styleUrl = 'https://api.mapbox.com/styles/v1/' + STYLE_OWNER + '/' + STYLE_ID
  + '?access_token=' + MAPBOX_TOKEN;

fetch(styleUrl)
  .then(function(r){
    if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching style from Mapbox Studio');
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

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(styleObj));
    console.log('Wrote ' + OUTPUT_PATH);
  })
  .catch(function(err){
    console.error('[refresh-style] Failed:', err.message);
    process.exitCode = 1;
  });
