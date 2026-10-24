import { test } from "node:test";
import assert from "node:assert/strict";
import { isMockSource, type SourceMode } from "../lib/data/source-mode.ts";

test("stage and deck resolve explicit and automatic mock sources with the same rule", () => {
  for (const writer of ["", "https://writer.example"]) {
    for (const mode of ["auto", "mock", "live"] as SourceMode[]) {
      assert.equal(isMockSource(mode, writer), mode === "mock" || (mode === "auto" && !writer), `${mode}, writer=${writer}`);
    }
  }
  assert.equal(isMockSource("auto", "/"), true, "Normalize the writer URL exactly as writer-client does.");
});
