// Rabdi's network details for the Add network button on the Five steps slide (app/deck/scenes/ST.tsx).
// The wallet gets Rabdi's keyless RPC base: an access key never reaches a wallet (a keyed URL fails
// validation in shared/writer-api.ts), and the app's own reads and writes go through /api. The
// details live in four server-only env vars, and only a presenter login reads them, through
// GET /api/presenter/rabdi (lib/server/writer.ts).

import { RabdiNetwork } from "../../shared/writer-api";

export interface RabdiEnv {
  /** The chain ID, in decimal. */
  RABDI_CHAIN_ID?: string;
  /** An https URL. */
  RABDI_RPC_URL?: string;
  /** An https URL. */
  RABDI_EXPLORER_URL?: string;
  /** The native token's symbol as the wallet shows it: 2 to 6 letters or digits. */
  RABDI_CURRENCY_SYMBOL?: string;
}

const NAMES = ["RABDI_CHAIN_ID", "RABDI_RPC_URL", "RABDI_EXPLORER_URL", "RABDI_CURRENCY_SYMBOL"] as const;

/** The variable each field comes from, for the 503 message. */
const SOURCE: Record<keyof RabdiNetwork, keyof RabdiEnv> = {
  chainId: "RABDI_CHAIN_ID",
  chainIdHex: "RABDI_CHAIN_ID",
  rpcUrl: "RABDI_RPC_URL",
  explorerUrl: "RABDI_EXPLORER_URL",
  currencySymbol: "RABDI_CURRENCY_SYMBOL",
};

/** The details, or what to fix. A message names variables, never their values. */
export function rabdiNetwork(env: RabdiEnv): { ok: true; network: RabdiNetwork } | { ok: false; message: string } {
  const value = (name: keyof RabdiEnv) => env[name]?.trim() ?? "";
  const missing = NAMES.filter((name) => !value(name));
  if (missing.length) return { ok: false, message: `Rabdi's network details are not configured: set ${missing.join(", ")}.` };
  const chainId = /^[1-9][0-9]*$/.test(value("RABDI_CHAIN_ID")) ? Number(value("RABDI_CHAIN_ID")) : Number.NaN;
  const parsed = RabdiNetwork.safeParse({
    chainId,
    chainIdHex: Number.isSafeInteger(chainId) ? `0x${chainId.toString(16)}` : "",
    rpcUrl: value("RABDI_RPC_URL"),
    explorerUrl: value("RABDI_EXPLORER_URL"),
    currencySymbol: value("RABDI_CURRENCY_SYMBOL"),
  });
  if (parsed.success) return { ok: true, network: parsed.data };
  const invalid = [...new Set(parsed.error.issues.map((issue) => SOURCE[issue.path[0] as keyof RabdiNetwork]))];
  return { ok: false, message: `Rabdi's network details are not valid: check ${invalid.join(", ")}.` };
}
