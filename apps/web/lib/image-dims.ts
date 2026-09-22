// Pixel size and type of an uploaded raster, from its header bytes alone (no decoder, no dependency).
export type Dims = { mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; width: number; height: number; ext: "png" | "jpg" | "webp" | "gif" };

export function imageDims(b: Buffer): Dims | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47 && b.toString("ascii", 12, 16) === "IHDR") return { mime: "image/png", ext: "png", width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length > 10 && b.toString("ascii", 0, 6).startsWith("GIF8")) return { mime: "image/gif", ext: "gif", width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { mime: "image/webp", ext: "webp", width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") { const bits = b.readUInt32LE(21); return { mime: "image/webp", ext: "webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
    if (chunk === "VP8X") return { mime: "image/webp", ext: "webp", width: (b.readUIntLE(24, 3)) + 1, height: (b.readUIntLE(27, 3)) + 1 };
    return null;
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { mime: "image/jpeg", ext: "jpg", width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}
