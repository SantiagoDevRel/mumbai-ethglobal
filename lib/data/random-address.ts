import { bytesToHex, getAddress } from "viem";
import type { Hex } from "../../shared/types.ts";

/** A new random wallet address, checksummed: 20 bytes from the browser's random source. Nobody holds
 * its key. The presenter types "0x" and Space in the entity card's New owner field to get one, instead
 * of pasting an address on stage (Santiago, October 29). */
export function randomAddress(): Hex {
  return getAddress(bytesToHex(crypto.getRandomValues(new Uint8Array(20))));
}
