import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { flagSrc, photoSrc, TOUR } from "../app/deck/scenes/me-tour.ts";
import { SCENES } from "../shared/scenes.ts";

const file = (src: string) => new URL(`../public${src}`, import.meta.url);

// "Who I am" (ME) shows the speaker's photos, one per →, each with its country's flag (Santiago, October 30).
test("ME has one step per photo, and every photo and flag is in public/", () => {
  assert.equal(SCENES.find((scene) => scene.id === "ME")?.steps, TOUR.length);
  assert.equal(new Set(TOUR.map((stop) => stop.code)).size, TOUR.length, "no country twice");
  for (const stop of TOUR) {
    assert.match(stop.code, /^[a-z]{2}$/, stop.name);
    assert.ok(stop.alt.trim(), `${stop.name} has alt text`);
    for (const src of [photoSrc(stop), flagSrc(stop)]) assert.ok(existsSync(file(src)), src);
  }
});

// The photos go out on a public site: no EXIF (where a camera keeps GPS), XMP or colour profile.
test("ME's photos are plain WebP with no metadata", () => {
  for (const stop of TOUR) {
    const bytes = readFileSync(file(photoSrc(stop)));
    assert.equal(bytes.toString("latin1", 0, 4), "RIFF", stop.photo);
    assert.equal(bytes.toString("latin1", 8, 12), "WEBP", stop.photo);
    const chunks: string[] = [];
    for (let at = 12; at + 8 <= bytes.length; at += 8 + bytes.readUInt32LE(at + 4) + (bytes.readUInt32LE(at + 4) % 2)) {
      chunks.push(bytes.toString("latin1", at, at + 4));
    }
    assert.ok(chunks.length > 0, stop.photo);
    for (const chunk of ["EXIF", "XMP ", "ICCP"]) assert.ok(!chunks.includes(chunk), `${stop.photo}: ${chunk} chunk`);
  }
});
