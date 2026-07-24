// FieldMap terrain overlay worker (Slope Angle + Custom Elevation Range + Aspect)
//
// All three overlays are pure client-side derivatives of the same terrain-rgb DEM bytes the main
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
  } else if (msg.type === 'aspect'){
    computeAspect(demBytes, width, height, msg.metersPerPixel, out);
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
//
// Shared by Slope Angle and Aspect (Session 40) — both are the exact same underlying directional
// gradient vector (dzdx, dzdy); Slope Angle keeps only its magnitude (steepness), Aspect keeps
// only its direction (compass-facing). Extracted here specifically so neither has to duplicate
// the 8-neighbor sampling, matching how the two features were described together.
function gradientAt(demBytes, width, height, x, y, metersPerPixel){
  var ym = clampIdx(y - 1, height), yp = clampIdx(y + 1, height);
  var xm = clampIdx(x - 1, width), xp = clampIdx(x + 1, width);
  var a = decodeElevM(demBytes, ym * width + xm);
  var b = decodeElevM(demBytes, ym * width + x);
  var c = decodeElevM(demBytes, ym * width + xp);
  var d = decodeElevM(demBytes, y * width + xm);
  var f = decodeElevM(demBytes, y * width + xp);
  var g = decodeElevM(demBytes, yp * width + xm);
  var h = decodeElevM(demBytes, yp * width + x);
  var i = decodeElevM(demBytes, yp * width + xp);
  return {
    dzdx: ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * metersPerPixel),
    dzdy: ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * metersPerPixel)
  };
}
function computeSlope(demBytes, width, height, metersPerPixel, out){
  for (var y = 0; y < height; y++){
    for (var x = 0; x < width; x++){
      var grad = gradientAt(demBytes, width, height, x, y, metersPerPixel);
      var slopeDeg = Math.atan(Math.sqrt(grad.dzdx * grad.dzdx + grad.dzdy * grad.dzdy)) * 180 / Math.PI;
      var band = slopeColorFor(slopeDeg);
      if (band){
        var oi = (y * width + x) * 4;
        out[oi] = band.r; out[oi + 1] = band.g; out[oi + 2] = band.b; out[oi + 3] = 255;
      }
    }
  }
}

// Aspect (Session 40) — the compass direction a slope faces (the direction of steepest descent),
// color-mapped around a temperature/sun-exposure wheel rather than avalanche terminology: N=blue
// (coldest/most shaded), E=yellow-green (morning sun), S=orange-red (warmest/earliest snowmelt),
// W=purple (afternoon heat), with NE/SE/SW/NW as smooth blended intermediate hues — a continuous
// hue sweep, not 8 discrete flat wedges, so it visually matches ASPECT_HUE_ANCHORS' own shortest-
// path interpolation exactly (see hueForBearing). ASPECT_HUE_ANCHORS is mirrored on the main
// thread (see index.html's own copy, used to build the legend wheel) — the two must be kept in
// sync manually, a worker script can't import from the app's own closure or vice versa.
var ASPECT_HUE_ANCHORS = [
  { bearing: 0,   hue: 220 }, // N — blue
  { bearing: 90,  hue: 70 },  // E — yellow-green
  { bearing: 180, hue: 20 },  // S — red-orange
  { bearing: 270, hue: 290 }, // W — purple
  { bearing: 360, hue: 220 }  // wraps back to N
];
function hueForBearing(bearing){
  for (var k = 0; k < ASPECT_HUE_ANCHORS.length - 1; k++){
    var a = ASPECT_HUE_ANCHORS[k], b = ASPECT_HUE_ANCHORS[k + 1];
    if (bearing >= a.bearing && bearing <= b.bearing){
      var t = (bearing - a.bearing) / (b.bearing - a.bearing);
      // Shortest signed hue delta (range (-180,180]) so the sweep always takes the visually
      // continuous path around the wheel rather than potentially the "long way" a naive
      // a.hue + (b.hue-a.hue)*t lerp could take.
      var diff = ((b.hue - a.hue + 540) % 360) - 180;
      return (a.hue + diff * t + 360) % 360;
    }
  }
  return ASPECT_HUE_ANCHORS[0].hue;
}
// Standard HSL->RGB (h: 0-360, s/l: 0-1) — no browser color-parsing API is available inside a
// worker, so this is a plain implementation of the well-known algorithm.
function hslToRgb(h, s, l){
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs((h / 60) % 2 - 1));
  var m = l - c / 2;
  var r, g, b;
  if (h < 60){ r = c; g = x; b = 0; }
  else if (h < 120){ r = x; g = c; b = 0; }
  else if (h < 180){ r = 0; g = c; b = x; }
  else if (h < 240){ r = 0; g = x; b = c; }
  else if (h < 300){ r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
// Terrain flat enough to have no meaningful facing direction (a flat pixel's atan2(0,0) would
// otherwise resolve to a spurious "due north") stays transparent — a much lower bar than Slope
// Angle's own 20° hazard threshold, since Aspect's whole premise (thermal cover, snowmelt timing,
// morning/evening sun) is just as meaningful on a gentle hillside as a steep one; this only
// exists to suppress noise on genuinely flat ground.
var ASPECT_MIN_SLOPE_DEG = 3;
function computeAspect(demBytes, width, height, metersPerPixel, out){
  for (var y = 0; y < height; y++){
    for (var x = 0; x < width; x++){
      var grad = gradientAt(demBytes, width, height, x, y, metersPerPixel);
      var slopeDeg = Math.atan(Math.sqrt(grad.dzdx * grad.dzdx + grad.dzdy * grad.dzdy)) * 180 / Math.PI;
      if (slopeDeg < ASPECT_MIN_SLOPE_DEG) continue;
      // Compass bearing of the descent direction (0=N, 90=E, clockwise) — image-space y+ is
      // south and x+ is east, so the descent vector in (east,north) is (-dzdx, dzdy); atan2(x,y)
      // with x=east, y=north gives a standard clockwise-from-north bearing. Verified against
      // hand-worked cases (elevation rising due north -> aspect faces south/180°; elevation
      // rising due east -> aspect faces west/270°) before relying on it.
      var bearing = (Math.atan2(-grad.dzdx, grad.dzdy) * 180 / Math.PI + 360) % 360;
      var hue = hueForBearing(bearing);
      var rgb = hslToRgb(hue, 0.70, 0.50);
      var oi = (y * width + x) * 4;
      out[oi] = rgb[0]; out[oi + 1] = rgb[1]; out[oi + 2] = rgb[2]; out[oi + 3] = 255;
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
