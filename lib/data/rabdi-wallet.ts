// The two live buttons on the Five steps slide (app/deck/scenes/ST.tsx), kept free of React so tests
// drive them with a fake wallet (tests/rabdi-wallet.test.ts). Add network asks the presenter's browser
// wallet for an account, adds Rabdi and switches to it. Get balance reads that account's balance on
// Rabdi through the same wallet: a read, so no signature and no transaction. Nothing here signs or
// sends anything. Rabdi's details come from the writer (GET /api/presenter/rabdi), never from this
// public repo.

import { formatEther } from "viem";
import { RabdiNetwork } from "../../shared/writer-api";

/** An injected EIP-1193 wallet (MetaMask, Rabby). Its errors are often plain `{ code, message }` objects. */
export interface Wallet {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isRabby?: boolean;
  providers?: Wallet[];
}

/** Rabby when several wallets inject (as the map's Extend does), else whatever `ethereum` is. */
export function injectedWallet(scope: { ethereum?: Wallet }): Wallet | null {
  const injected = scope.ethereum;
  const wallet = injected?.providers?.find((item) => item.isRabby) ?? injected;
  return typeof wallet?.request === "function" ? wallet : null;
}

/** Everything the slide says, in one place. */
export const COPY = {
  connecting: "Connecting…",
  connected: (account: string) => `Connected ${shortAddress(account)} on Rabdi`,
  noWallet: "No wallet found",
  rejected: "Rejected in your wallet",
  pending: "Finish in your wallet",
  notConfigured: "Network details not configured",
  addFailed: "Couldn't add the network",
  addFirst: "Add the network first",
  switchFirst: "Switch to Rabdi first",
  reading: "Reading…",
  readFailed: "Couldn't read the balance",
} as const;

/** `0x1234…abcd`. */
export function shortAddress(account: string): string {
  return `${account.slice(0, 6)}…${account.slice(-4)}`.toLowerCase();
}

/** wallet_addEthereumChain's one parameter (EIP-3085). */
export function addChainParams(network: RabdiNetwork) {
  return {
    chainId: network.chainIdHex,
    chainName: "Arkiv Rabdi",
    nativeCurrency: { name: "GLM", symbol: network.currencySymbol, decimals: 18 },
    rpcUrls: [network.rpcUrl],
    blockExplorerUrls: [network.explorerUrl],
  };
}

/** A failure that already has its words for the slide. */
class Shown extends Error {}

export interface RabdiConnection { wallet: Wallet; account: string; network: RabdiNetwork }

/** Add network: the details first (no wallet popup if the writer has none), then the wallet shares an
 * account, adds Rabdi and switches to it, one request after the other. */
export async function connectRabdi(wallet: Wallet | null, loadNetwork: () => Promise<unknown>): Promise<RabdiConnection> {
  if (!wallet) throw new Shown(COPY.noWallet);
  const details = RabdiNetwork.safeParse(await loadNetwork());
  if (!details.success) throw new Shown(COPY.notConfigured);
  const network = details.data;
  const accounts = await wallet.request({ method: "eth_requestAccounts" });
  const account: unknown = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof account !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(account)) throw new Shown(COPY.rejected);
  await wallet.request({ method: "wallet_addEthereumChain", params: [addChainParams(network)] });
  await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: network.chainIdHex }] });
  return { wallet, account: account.toLowerCase(), network };
}

function onChain(value: unknown, chainId: number): boolean {
  if (typeof value === "number") return value === chainId;
  return typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value) && BigInt(value) === BigInt(chainId);
}

/** Get balance: the wallet must be on Rabdi (asked to switch back if it moved), then one free read. */
export async function rabdiBalance({ wallet, account, network }: RabdiConnection): Promise<string> {
  if (!onChain(await wallet.request({ method: "eth_chainId" }), network.chainId)) {
    try {
      await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: network.chainIdHex }] });
    } catch (error) {
      throw new Shown(COPY.switchFirst, { cause: error });
    }
  }
  const wei = await wallet.request({ method: "eth_getBalance", params: [account, "latest"] });
  if (typeof wei !== "string" || !/^0x[0-9a-fA-F]+$/.test(wei)) throw new Shown(COPY.readFailed);
  return formatBalance(BigInt(wei), network.currencySymbol);
}

const TEN_THOUSANDTH = 10n ** 14n;

/** `<amount> <symbol>`, rounded to 4 decimals; a balance too small to show says so instead of 0. */
export function formatBalance(wei: bigint, symbol: string): string {
  const rounded = ((wei + TEN_THOUSANDTH / 2n) / TEN_THOUSANDTH) * TEN_THOUSANDTH;
  return rounded === 0n && wei > 0n ? `< 0.0001 ${symbol}` : `${formatEther(rounded)} ${symbol}`;
}

/** The first `code` on the error or its causes: wallets answer EIP-1193 codes, the writer its own. */
function errorCode(error: unknown): unknown {
  let cause = error;
  for (let depth = 0; depth < 8 && cause !== null && typeof cause === "object"; depth++) {
    if ("code" in cause && cause.code !== undefined) return cause.code;
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return undefined;
}

/** What the slide says about a failure: a short line, never the wallet's own text. */
export function walletMessage(error: unknown, fallback: string): string {
  if (error instanceof Shown) return error.message;
  const code = errorCode(error);
  if (code === 4001 || code === "ACTION_REJECTED") return COPY.rejected;
  if (code === -32002) return COPY.pending;
  if (code === "network_not_configured") return COPY.notConfigured;
  return fallback;
}

export interface Status { tone: "busy" | "done" | "error"; text: string }
export interface RabdiState { connection: RabdiConnection | null; add: Status | null; balance: Status | null }

/** The buttons' shared state for one window, for `useSyncExternalStore`. A click while its button
 * waits on the wallet does nothing, so the presenter never gets two popups. */
export function rabdiController({ wallet, loadNetwork, warn = console.warn }: {
  wallet: () => Wallet | null;
  loadNetwork: () => Promise<unknown>;
  /** Where the raw error goes (the console): the slide shows only the short line. */
  warn?: (message: string, error: unknown) => void;
}) {
  let state: RabdiState = { connection: null, add: null, balance: null };
  const listeners = new Set<() => void>();
  const set = (next: Partial<RabdiState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    get: (): RabdiState => state,
    async addNetwork() {
      if (state.add?.tone === "busy") return;
      set({ add: { tone: "busy", text: COPY.connecting } });
      try {
        const connection = await connectRabdi(wallet(), loadNetwork);
        set({ connection, add: { tone: "done", text: COPY.connected(connection.account) }, balance: null });
      } catch (error) {
        warn("Add network failed:", error);
        set({ add: { tone: "error", text: walletMessage(error, COPY.addFailed) } });
      }
    },
    async getBalance() {
      if (state.balance?.tone === "busy") return;
      const connection = state.connection;
      if (!connection) {
        set({ balance: { tone: "error", text: COPY.addFirst } });
        return;
      }
      set({ balance: { tone: "busy", text: COPY.reading } });
      try {
        set({ balance: { tone: "done", text: await rabdiBalance(connection) } });
      } catch (error) {
        warn("Get balance failed:", error);
        set({ balance: { tone: "error", text: walletMessage(error, COPY.readFailed) } });
      }
    },
  };
}
