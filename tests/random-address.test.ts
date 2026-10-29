import { test } from "node:test";
import assert from "node:assert/strict";
import { getAddress } from "viem";
import { randomAddress } from "../lib/data/random-address.ts";

test("0x then Space fills in a fresh, checksummed wallet address", () => {
  const address = randomAddress();
  assert.match(address, /^0x[0-9a-fA-F]{40}$/, "what the transfer form accepts");
  assert.equal(getAddress(address), address, "EIP-55 checksum, as a wallet shows it");
  assert.equal(new Set(Array.from({ length: 50 }, () => randomAddress().toLowerCase())).size, 50, "a new wallet every time");
});
