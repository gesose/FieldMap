// FieldMap terrain overlay worker (Slope Angle + Custom Elevation Range)
//
// Both overlays are pure client-side derivatives of the same terrain-rgb DEM bytes the main
// thread already fetches via fetchDemTileImageData() — no network access happens in this file.
// The main thread posts one DEM tile's raw RGBA pixel bytes (a COPY, never the live cached
// ImageData buffer — see the main-thread caller's own comment for why that matters) plus which
// overlay to compute; this worker classifies every pixel and posts back an RGBA buffer the same
// 256x256 size, which the main thread then encodes to a PNG and hands to MapLibre as the tile's
// image bytes. Every "in scale" pixel is written fully opaque (alpha 255); the user's opacity
// slider is applied afterward via the layer's own raster-opacity paint property (the same
// mechanism every other raster overlay in this app already uses), not baked in here — that
// keeps opacity changes instant with zero recomputation.

self.onmessage = function(evt){
  var msg = evt.data;
  var demBytes = new Uint8ClampedArray(msg.demBytes);
  var width = msg.width, height = msg.height;
  var out = new Uint8ClampedArray(width * height * 4); // defaults to all zero = fully transparent

  if (msg.type === 'slope'){
    computeSlope(demBytes, width, height, msg.metersPerPixel, out);
  } else if (msg.type === 'elevrange'){
    computeElevRange(demBytes, width, height, msg.minFt, msg.maxFt, out);
  }

  self.postMessage({ id: msg.id, rgba: out.buffer }, [out.buffer]);
};

// Same Mapbox terrain-rgb decode as decodeTerrainRgbElevationFt() in index.html, just returning
// meters (not feet) since slope's gradient math wants a real-world linear unit to divide by
// metersPerPixel — feet vs. meters doesn't matter for the final degree result as long as
// numerator and denominator agree, but meters is what metersPerPixel is already expressed in.
function decodeElevM(data, pixelIdx){
  var o = pixelIdx * 4;
  return -10000 + (data[o] * 65536 + data[o + 1] * 256 + data[o + 2]) * 0.1;
}

function clampIdx(v, max){
  return v < 0 ? 0 : (v >= max ? max - 1 : v);
}

// 6-band slope-angle color scale, degrees: green 20-25, yellow 25-30, orange 30-35, red 35-40,
// purple 40-45, blue 45+. Under 20 stays fully transparent — only genuinely steep terrain gets
// flagged, matching how avalanche/terrain-steepness tools conventionally shade slope angle.
// Colors picked as saturated, high-contrast shades deliberately offset from every other
// color-coded overlay already in this app (migration corridors' pastel amber/coral/lavender/
// teal/pink, the wildlife coral/blue) so overlapping regions stay visually distinguishable even
// where the general color FAMILY (purple/orange/blue) repeats.
var SLOPE_BANDS = [
  { min: 45,       r: 0x1E, g: 0x88, b: 0xE5 }, // 45°+   blue
  { min: 40,       r: 0x8E, g: 0x24, b: 0xAA }, // 40-45  purple
  { min: 35,       r: 0xE5, g: 0x39, b: 0x35 }, // 35-40  red
  { min: 30,       r: 0xFB, g: 0x8C, b: 0x00 }, // 30-35  orange
  { min: 25,       r: 0xFD, g: 0xD8, b: 0x35 }, // 25-30  yellow
  { min: 20,       r: 0x43, g: 0xA0, b: 0x47 }  // 20-25  green
];
function slopeColorFor(deg){
  for (var i = 0; i < SLOPE_BANDS.length; i++){
    if (deg >= SLOPE_BANDS[i].min) return SLOPE_BANDS[i];
  }
  return null; // under 20° — transparent
}

// Standard 8-neighbor (Horn's method) gradient — the conventional GIS slope algorithm (same one
// ArcGIS/QGIS's own "Slope" tool uses): a 3x3 kernel weighting the 4 edge-adjacent neighbors 2x
// relative to the 4 corner neighbors. Edge pixels (tile boundary) clamp to the nearest real
// pixel rather than fetching neighboring tiles — a deliberate simplification (see this worker's
// own file-level comment in CLAUDE.md for the tradeoff) that only affects the outermost 1px
// ring of each 256x256 tile, negligible at the zoom levels this renders at.
function computeSlope(demBytes, width, height, metersPerPixel, out){
  for (var y = 0; y < height; y++){
    var ym = clampIdx(y - 1, height), yp = clampIdx(y + 1, height);
    for (var x = 0; x < width; x++){
      var xm = clampIdx(x - 1, width), xp = clampIdx(x + 1, width);
      var a = decodeElevM(demBytes, ym * width + xm);
      var b = decodeElevM(demBytes, ym * width + x);
      var c = decodeElevM(demBytes, ym * width + xp);
      var d = decodeElevM(demBytes, y * width + xm);
      var f = decodeElevM(demBytes, y * width + xp);
      var g = decodeElevM(demBytes, yp * width + xm);
      var h = decodeElevM(demBytes, yp * width + x);
      var i = decodeElevM(demBytes, yp * width + xp);
      var dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * metersPerPixel);
      var dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * metersPerPixel);
      var slopeDeg = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180 / Math.PI;
      var band = slopeColorFor(slopeDeg);
      if (band){
        var oi = (y * width + x) * 4;
        out[oi] = band.r; out[oi + 1] = band.g; out[oi + 2] = band.b; out[oi + 3] = 255;
      }
    }
  }
}

// Solid cyan fill (#00D9E8) inside [minFt,maxFt], deeper cyan stroke (#0A7A85) exactly where the
// band's own boundary falls (detected via 4-neighbor in/out-of-range comparison, not a fixed
// pixel-distance-from-edge heuristic — this stays accurate regardless of how steep the terrain
// is at the boundary, and correctly avoids a false edge line at a tile seam when the highlighted
// band actually continues into the neighboring tile, since clampIdx replicates the edge pixel
// rather than treating "off the tile" as "out of range"). A hard-edged fill with a highlighted
// boundary line was chosen over a soft alpha gradient at the min/max transition — it reads more
// like a legible contour-interval band (the established convention for elevation-band map
// overlays) than a blurry falloff would, and needs no extra alpha-blending pass.
function computeElevRange(demBytes, width, height, minFt, maxFt, out){
  var n = width * height;
  var inRange = new Uint8Array(n);
  for (var idx = 0; idx < n; idx++){
    // Rounded to the nearest foot before comparing — elevation data has no meaningful sub-foot
    // precision anyway, and without this, IEEE 754 floating-point drift through the
    // encode/decode/meters-to-feet chain can put a genuinely-exact boundary value like 2000ft
    // just on the wrong side of a "<= maxFt" check (e.g. reads as 2000.0000000000011),
    // confirmed via a standalone test with a deliberately exact-2000ft synthetic pixel — same
    // rounding decodeTerrainRgbElevationFt() in index.html already applies for this reason.
    var ft = Math.round(decodeElevM(demBytes, idx) / 0.3048);
    inRange[idx] = (ft >= minFt && ft <= maxFt) ? 1 : 0;
  }
  for (var y = 0; y < height; y++){
    var ym = clampIdx(y - 1, height), yp = clampIdx(y + 1, height);
    for (var x = 0; x < width; x++){
      var idx2 = y * width + x;
      if (!inRange[idx2]) continue;
      var xm = clampIdx(x - 1, width), xp = clampIdx(x + 1, width);
      var isEdge = !inRange[y * width + xm] || !inRange[y * width + xp] ||
                   !inRange[ym * width + x] || !inRange[yp * width + x];
      var oi = idx2 * 4;
      if (isEdge){ out[oi] = 0x0A; out[oi + 1] = 0x7A; out[oi + 2] = 0x85; out[oi + 3] = 255; }
      else { out[oi] = 0x00; out[oi + 1] = 0xD9; out[oi + 2] = 0xE8; out[oi + 3] = 255; }
    }
  }
}
