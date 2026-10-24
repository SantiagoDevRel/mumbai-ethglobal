// Network and SDK profiles: the ONE place to change the chain or the SDK (WORKSHOP.md 6.3).
// See AGENTS.md "Changing the network or the SDK" for the checks to run after a switch.

export interface NetworkProfile {
  id: ProfileId;
  /** Shown on screen (footer, L7 code). */
  name: string;
  chainId: number;
  rpcHttp: string;
  rpcWs: string;
  /** Explorer base URL, or null if none is verified for this network. */
  explorer: string | null;
  faucet: string;
  sdk: { package: string; version: string };
  /** False for placeholders: selecting it fails closed. */
  ready: boolean;
}

export type ProfileId = "tiramisu" | "udc";

export const PROFILES: Record<ProfileId, NetworkProfile> = {
  tiramisu: {
    id: "tiramisu",
    name: "Tiramisu",
    chainId: 7738577,
    rpcHttp: "https://rpc.tiramisu.db-chain.testnet.arkiv.network",
    rpcWs: "wss://rpc.tiramisu.db-chain.testnet.arkiv.network",
    // TODO(chain): verify the explorer URL and its entity/tx paths live before showing links.
    explorer: null,
    faucet: "https://hub.arkiv.network/faucet",
    sdk: { package: "@arkiv-network/sdk", version: "0.8.1" },
    ready: true,
  },
  // Placeholder for the user-defined columns chain. Fill in only when it is live and its SDK
  // is released on npm; until then selecting it stops the writer ("Network not configured").
  udc: {
    id: "udc",
    name: "",
    chainId: 0,
    rpcHttp: "",
    rpcWs: "",
    explorer: null,
    faucet: "",
    sdk: { package: "@arkiv-network/sdk", version: "" },
    ready: false,
  },
};

export const DEFAULT_PROFILE: ProfileId = "tiramisu";

export class NetworkNotConfiguredError extends Error {
  constructor(reason: string) {
    super(`Network not configured: ${reason}`);
    this.name = "NetworkNotConfiguredError";
  }
}

/** Fail closed: unknown or placeholder profile throws. */
export function getProfile(id: string | undefined | null): NetworkProfile {
  const key = (id ?? DEFAULT_PROFILE) as ProfileId;
  const profile = PROFILES[key];
  if (!profile) throw new NetworkNotConfiguredError(`unknown profile "${String(id)}"`);
  if (!profile.ready) throw new NetworkNotConfiguredError(`profile "${key}" is a placeholder`);
  return profile;
}

/** Compare a live `eth_chainId` answer with the profile; throws on mismatch. */
export function assertChainId(profile: NetworkProfile, chainIdHex: string): void {
  const live = Number.parseInt(chainIdHex, 16);
  if (live !== profile.chainId) {
    throw new NetworkNotConfiguredError(
      `chain ID ${live} does not match profile ${profile.id} (${profile.chainId})`,
    );
  }
}

/** The writer address, labeled *santiago* on screen. Public by design. */
export const WRITER_ADDRESS = "0x2F6E6aDB6bc8F79799CB479FB5Cb237fa3Caa690" as const;
export const WRITER_LABEL = "santiago";
