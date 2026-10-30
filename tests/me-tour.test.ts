import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { BEFORE_ARKIV, flagSrc, HANDLE, ME_STEPS, photoSrc, profileLabel, PROFILES, TOUR } from "../app/deck/scenes/me-tour.ts";
import { SCENES } from "../shared/scenes.ts";

const file = (src: string) => new URL(`../public${src}`, import.meta.url);

// "Who I am" (ME) shows the speaker's photos, one per →, each with its country's flag, then one more →
// for the route's "10+ countries" stop (Santiago, October 30).
test("ME has one step per photo plus the 10+ stop, and every photo and flag is in public/", () => {
  assert.equal(ME_STEPS, TOUR.length + 1);
  assert.equal(SCENES.find((scene) => scene.id === "ME")?.steps, ME_STEPS);
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

/** A PNG's size and whether it has an alpha channel (color type 6: RGBA). */
function png(src: string) {
  const bytes = readFileSync(file(src));
  assert.equal(bytes.toString("latin1", 1, 4), "PNG", src);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), alpha: bytes[25] === 6 };
}

// The logos replace the "Worked for" title (Santiago, October 30), in the order he named them. Each is
// the official file, drawn at its own proportions: a stretched logo would break the brand's rules.
test("ME's logos are the official files, each at its own proportions", () => {
  assert.deepEqual(BEFORE_ARKIV.map((logo) => logo.name), ["Cosmos", "ChainSafe", "web3.js", "Lisk"]);
  for (const logo of BEFORE_ARKIV) {
    assert.ok(existsSync(file(logo.src)), logo.src);
    assert.ok(logo.height >= 40 && logo.height <= 56, `${logo.name}: one height for the row`);
    const viewBox = /viewBox="([\d.\s-]+)"/.exec(readFileSync(file(logo.src), "utf8"))?.[1]?.trim().split(/\s+/).map(Number);
    assert.equal(viewBox?.length, 4, `${logo.src} has a viewBox`);
    const [, , width = 0, height = 1] = viewBox ?? [];
    assert.ok(Math.abs(logo.ratio / (width / height) - 1) < 0.005, `${logo.name}: ratio ${logo.ratio} matches the file (${width} x ${height})`);
  }
});

// X, LinkedIn and Telegram, all @santiagodevrel, open in a new tab from the slide (Santiago, October 30).
test("ME's profile links go to @santiagodevrel, each with an icon and a label", () => {
  assert.equal(HANDLE, "@santiagodevrel");
  assert.deepEqual(
    PROFILES.map((profile) => profile.href),
    ["https://x.com/santiagodevrel", "https://www.linkedin.com/in/santiagodevrel", "https://t.me/santiagodevrel"],
  );
  for (const profile of PROFILES) {
    assert.equal(profileLabel(profile), `Santiago on ${profile.name}`);
    const { icon } = profile;
    if ("path" in icon) {
      assert.match(icon.path, /^M[\d.\s,a-zA-Z-]+$/, `${profile.name}: an SVG path`);
    } else {
      const picture = png(icon.src);
      assert.ok(picture.alpha, `${icon.src} has a transparent background`);
      assert.ok(Math.abs(icon.ratio / (picture.width / picture.height) - 1) < 0.005, `${profile.name}: ratio matches the file`);
    }
  }
});
