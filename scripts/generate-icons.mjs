// Generates simple, dependency-free PWA icons (no external assets, no trademarked logos).
// Draws a plain geometric star badge on a flat background using a hand-rolled PNG encoder.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const BG = [0x12, 0x14, 0x1c]; // near-black slate
const FG = [0xd8, 0x3a, 0x2f]; // legion red

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function starPoints(cx, cy, outerR, innerR, points = 5, rotationDeg = -90) {
  const pts = [];
  const step = Math.PI / points;
  const rot = (rotationDeg * Math.PI) / 180;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rot + i * step;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function makeIcon(size, { padding = 0.14, maskable = false } = {}) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc((width * 4 + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const maxR = width * (0.5 - padding);
  const star = starPoints(cx, cy, maxR, maxR * 0.42);
  const cornerR = maskable ? 0 : width * 0.22; // rounded square only for non-maskable "any" icon

  const inRoundedSquare = (x, y) => {
    if (cornerR <= 0) return true;
    const nx = Math.max(cornerR, Math.min(width - cornerR, x));
    const ny = Math.max(cornerR, Math.min(height - cornerR, y));
    const dx = x - nx;
    const dy = y - ny;
    return dx * dx + dy * dy <= cornerR * cornerR + 1e-6 || (x >= cornerR && x <= width - cornerR) || (y >= cornerR && y <= height - cornerR);
  };

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < width; x++) {
      const idx = rowStart + 1 + x * 4;
      let r = BG[0], g = BG[1], b = BG[2], a = 255;
      if (!maskable && !inRoundedSquare(x + 0.5, y + 0.5)) {
        a = 0;
      } else if (pointInPolygon(x + 0.5, y + 0.5, star)) {
        r = FG[0]; g = FG[1]; b = FG[2];
      }
      raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b; raw[idx + 3] = a;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", makeIcon(192));
writeFileSync("public/icons/icon-512.png", makeIcon(512));
writeFileSync("public/icons/maskable-512.png", makeIcon(512, { maskable: true, padding: 0.22 }));
writeFileSync("public/icons/apple-touch-icon.png", makeIcon(180));
console.log("Icons generated in public/icons/");
