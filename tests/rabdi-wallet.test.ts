// The Five steps slide's live buttons without a browser (lib/data/rabdi-wallet.ts): a fake wallet
// records every request, so the order, the parameters and every line the slide shows are checked
// here; tests/ui-layout.mjs clicks the real buttons. Fake network details only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addChainParams, COPY, formatBalance, injectedWallet, rabdiController, shortAddress, walletMessage, type Wallet } from "../lib/data/rabdi-wallet.ts";
import type { RabdiNetwork } from "../shared/writer-api.ts";

const NETWORK: RabdiNetwork = { chainId: 424242, chainIdHex: "0x67932", rpcUrl: "https://rpc.rabdi.example/", explorerUrl: "https://explorer.rabdi.example/", currencySymbol: "tGLM" };
const ACCOUNT = "0x1234567890AbcdEF1234567890aBcdef12345678";
/** 12.34567 tGLM, shown as 12.3457. */
const BALANCE = `0x${(12_345_670_000_000_000_000n).toString(16)}`;
const walletError = (code: number, message: string) => Object.assign(new Error(message), { code });
const refused = () => { throw walletError(4001, "User rejected the request."); };

type Answer = (params: unknown[]) => unknown;
/** Answers like a wallet on another chain until it is switched; `answers` can change mid-test. */
function fakeWallet(overrides: Record<string, Answer> = {}) {
  const calls: { method: string; params: unknown[] }[] = [];
  let chain = "0x1";
  const answers: Record<string, Answer> = {
    eth_requestAccounts: () => [ACCOUNT],
    wallet_addEthereumChain: () => null,
    wallet_switchEthereumChain: (params) => { chain = (params[0] as { chainId: string }).chainId; return null; },
    eth_chainId: () => chain,
    eth_getBalance: () => BALANCE,
    ...overrides,
  };
  const wallet: Wallet = {
    isRabby: true,
    async request({ method, params = [] }) {
      calls.push({ method, params });
      const answer = answers[method];
      if (!answer) throw walletError(4200, `The fake wallet does not support ${method}.`);
      return answer(params);
    },
  };
  return { wallet, calls, answers, moveTo: (value: string) => { chain = value; } };
}

function controller(wallet: Wallet | null, loadNetwork: () => Promise<unknown> = async () => NETWORK) {
  const warnings: string[] = [];
  let loads = 0;
  const rabdi = rabdiController({ wallet: () => wallet, loadNetwork: () => { loads++; return loadNetwork(); }, warn: (message) => { warnings.push(message); } });
  return { rabdi, warnings, loads: () => loads };
}

test("Add network asks for an account, adds Rabdi and switches to it, in that order; Get balance reads it", async () => {
  const fake = fakeWallet();
  const { rabdi, loads, warnings } = controller(fake.wallet);
  const seen: (string | undefined)[] = [];
  rabdi.subscribe(() => { seen.push(rabdi.get().add?.text); });
  await rabdi.addNetwork();
  assert.deepEqual(seen, [COPY.connecting, "Connected 0x1234…5678 on Rabdi"]);
  assert.equal(loads(), 1);
  assert.deepEqual(fake.calls, [
    { method: "eth_requestAccounts", params: [] },
    {
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x67932",
        chainName: "Arkiv Rabdi",
        nativeCurrency: { name: "GLM", symbol: "tGLM", decimals: 18 },
        rpcUrls: ["https://rpc.rabdi.example/"],
        blockExplorerUrls: ["https://explorer.rabdi.example/"],
      }],
    },
    { method: "wallet_switchEthereumChain", params: [{ chainId: "0x67932" }] },
  ]);
  assert.deepEqual(rabdi.get().add, { tone: "done", text: "Connected 0x1234…5678 on Rabdi" });
  fake.calls.length = 0;
  await rabdi.getBalance();
  assert.deepEqual(rabdi.get().balance, { tone: "done", text: "12.3457 tGLM" });
  assert.deepEqual(fake.calls, [
    { method: "eth_chainId", params: [] },
    { method: "eth_getBalance", params: ["0x1234567890abcdef1234567890abcdef12345678", "latest"] },
  ], "A read: no signature and no transaction.");
  assert.deepEqual(warnings, []);
});

test("Get balance before Add network asks for it and calls nothing", async () => {
  const fake = fakeWallet();
  const { rabdi, loads } = controller(fake.wallet);
  await rabdi.getBalance();
  assert.deepEqual(rabdi.get().balance, { tone: "error", text: COPY.addFirst });
  assert.deepEqual(fake.calls, []);
  assert.equal(loads(), 0);
});

test("a wallet that moved off Rabdi is asked to switch back; if it won't, the slide says so", async () => {
  const fake = fakeWallet();
  const { rabdi } = controller(fake.wallet);
  await rabdi.addNetwork();
  fake.moveTo("0x1");
  fake.calls.length = 0;
  await rabdi.getBalance();
  assert.deepEqual(fake.calls.map((call) => call.method), ["eth_chainId", "wallet_switchEthereumChain", "eth_getBalance"]);
  assert.equal(rabdi.get().balance?.text, "12.3457 tGLM");

  fake.moveTo("0x1");
  fake.answers.wallet_switchEthereumChain = refused;
  fake.calls.length = 0;
  await rabdi.getBalance();
  assert.deepEqual(rabdi.get().balance, { tone: "error", text: COPY.switchFirst });
  assert.deepEqual(fake.calls.map((call) => call.method), ["eth_chainId", "wallet_switchEthereumChain"], "No balance read off Rabdi.");

  const stubborn = controller(fakeWallet({ wallet_switchEthereumChain: refused }).wallet);
  await stubborn.rabdi.addNetwork();
  assert.deepEqual(stubborn.rabdi.get().add, { tone: "error", text: COPY.rejected }, "Add network stops at a refused switch.");
  assert.equal(stubborn.rabdi.get().connection, null);
});

test("each failure gets one short line", async () => {
  const none = controller(null);
  await none.rabdi.addNetwork();
  assert.deepEqual(none.rabdi.get().add, { tone: "error", text: COPY.noWallet });
  assert.equal(none.loads(), 0, "No wallet: the writer is not asked either.");

  const notConfigured = fakeWallet();
  const missing = controller(notConfigured.wallet, async () => { throw Object.assign(new Error("Rabdi's network details are not configured."), { code: "network_not_configured" }); });
  await missing.rabdi.addNetwork();
  assert.equal(missing.rabdi.get().add?.text, COPY.notConfigured);
  assert.deepEqual(notConfigured.calls, [], "Without details, no wallet popup.");

  const malformed = fakeWallet();
  const odd = controller(malformed.wallet, async () => ({ chainId: 424242 }));
  await odd.rabdi.addNetwork();
  assert.equal(odd.rabdi.get().add?.text, COPY.notConfigured);
  assert.deepEqual(malformed.calls, []);

  // Rabby rejects with a plain object, MetaMask with an Error; both carry 4001.
  for (const refusal of [{ code: 4001, message: "User rejected the request." }, walletError(4001, "User rejected the request.")]) {
    const fake = fakeWallet({ eth_requestAccounts: () => { throw refusal; } });
    const { rabdi, warnings } = controller(fake.wallet);
    await rabdi.addNetwork();
    assert.deepEqual(rabdi.get().add, { tone: "error", text: COPY.rejected });
    assert.equal(rabdi.get().connection, null);
    assert.deepEqual(warnings, ["Add network failed:"], "The raw error goes to the console only.");
  }
  const pending = controller(fakeWallet({ eth_requestAccounts: () => { throw walletError(-32002, "Already processing eth_requestAccounts."); } }).wallet);
  await pending.rabdi.addNetwork();
  assert.equal(pending.rabdi.get().add?.text, COPY.pending);
  const broken = controller(fakeWallet({ wallet_addEthereumChain: () => { throw new Error("Could not fetch chain ID. Is your RPC URL correct?"); } }).wallet);
  await broken.rabdi.addNetwork();
  assert.equal(broken.rabdi.get().add?.text, COPY.addFailed, "Never the wallet's own text, which can quote the RPC URL.");
  const empty = controller(fakeWallet({ eth_requestAccounts: () => [] }).wallet);
  await empty.rabdi.addNetwork();
  assert.equal(empty.rabdi.get().add?.text, COPY.rejected);

  const reader = controller(fakeWallet({ eth_getBalance: () => "lots" }).wallet);
  await reader.rabdi.addNetwork();
  await reader.rabdi.getBalance();
  assert.deepEqual(reader.rabdi.get().balance, { tone: "error", text: COPY.readFailed });
  assert.equal(walletMessage(new Error("anything"), "fallback"), "fallback");
});

test("a second click while the wallet is open does nothing", async () => {
  let release: () => void = () => undefined;
  const fake = fakeWallet({ eth_requestAccounts: () => new Promise((resolve) => { release = () => resolve([ACCOUNT]); }) });
  const { rabdi, loads } = controller(fake.wallet);
  const first = rabdi.addNetwork();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(rabdi.get().add, { tone: "busy", text: COPY.connecting });
  await rabdi.addNetwork();
  assert.equal(loads(), 1);
  assert.deepEqual(fake.calls.map((call) => call.method), ["eth_requestAccounts"]);
  release();
  await first;
  assert.equal(rabdi.get().add?.tone, "done");
});

test("Rabby is picked when several wallets inject, and amounts round to 4 decimals", () => {
  const rabby: Wallet = { isRabby: true, request: async () => null };
  const other: Wallet = { request: async () => null };
  assert.equal(injectedWallet({ ethereum: { ...other, providers: [other, rabby] } }), rabby);
  assert.equal(injectedWallet({ ethereum: other }), other);
  assert.equal(injectedWallet({}), null);
  assert.equal(injectedWallet({ ethereum: {} as Wallet }), null);
  assert.equal(formatBalance(0n, "tGLM"), "0 tGLM");
  assert.equal(formatBalance(10n ** 18n * 500n, "tGLM"), "500 tGLM");
  assert.equal(formatBalance(12_345_650_000_000_000_000n, "tGLM"), "12.3457 tGLM");
  assert.equal(formatBalance(12_345_649_999_999_999_999n, "tGLM"), "12.3456 tGLM");
  assert.equal(formatBalance(49_999_999_999_999n, "tGLM"), "< 0.0001 tGLM");
  assert.equal(formatBalance(50_000_000_000_000n, "tGLM"), "0.0001 tGLM");
  assert.equal(shortAddress(ACCOUNT), "0x1234…5678");
  assert.deepEqual(addChainParams(NETWORK).nativeCurrency, { name: "GLM", symbol: "tGLM", decimals: 18 });
});
