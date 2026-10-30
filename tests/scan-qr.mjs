// What a phone camera reads from the stage's QR (Santiago, October 30: the QR must open the public
// production page, never a preview). The image is drawn at its own pixels and sampled in the middle
// of each module: the dark modules' extent is the symbol (finder patterns fill three of its corners),
// and a finder pattern's top edge is seven modules wide, which gives the module count, snapped to a
// QR size (17 + 4 × version). The grid is then compared with the modules the same encoder (qrcode)
// makes for a text, at any error correction level: only that text gives those modules.
import { expect } from "@playwright/test";
import QRCode from "qrcode";
import { isDeepStrictEqual } from "node:util";

export const SCAN_URL = "https://mumbai-ethglobal.vercel.app/scan";

/** The modules of a QR image on the page, one array per row: 1 dark, 0 light. */
export async function qrModules(img) {
  await expect(img).toBeVisible({ timeout: 20000 });
  return img.evaluate(async (element) => {
    await element.decode();
    const canvas = document.createElement("canvas");
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    const draw = canvas.getContext("2d");
    draw.drawImage(element, 0, 0);
    const { data, width, height } = draw.getImageData(0, 0, canvas.width, canvas.height);
    const dark = (x, y) => data[(Math.floor(y) * width + Math.floor(x)) * 4] < 128;
    let left = width, top = height, right = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (dark(x, y)) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); }
    let edge = 0;
    while (dark(left + edge, top)) edge++;
    const size = 17 + 4 * Math.round(((right + 1 - left) / (edge / 7) - 17) / 4);
    const cell = (right + 1 - left) / size;
    return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => (dark(left + (col + 0.5) * cell, top + (row + 0.5) * cell) ? 1 : 0)));
  });
}

/** Whether a module grid is the QR of `text`. */
export function encodes(grid, text) {
  return ["L", "M", "Q", "H"].some((level) => {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: level });
    const rows = Array.from({ length: modules.size }, (_, row) => Array.from(modules.data.subarray(row * modules.size, (row + 1) * modules.size)));
    return isDeepStrictEqual(rows, grid);
  });
}
