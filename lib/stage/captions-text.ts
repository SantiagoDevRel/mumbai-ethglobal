// Pure helpers for the live captions (lib/stage/captions.ts): the Deepgram streaming URL, the
// keyterms and the transcript text. No browser or React here, so tests import it directly.

/** Words the room will hear that a general model would misspell (Deepgram keyterm prompting: plain
 * terms, proper nouns capitalized, at most 500 tokens; the docs suggest 20 to 50). */
export const CAPTION_KEYTERMS = [
  "Arkiv", "Arkiv entities", "Arkiv DB-Chain", "DB-Chain", "DB-Chains", "Web3 database", "Rabdi", "Sorbet", "Tiramisu", "Golem",
  "ETHGlobal", "ETHGlobal Mumbai", "Devcon", "Ethereum", "Ethereum-aligned", "Solana", "Swarm", "Sourcify",
  "Rabby", "MetaMask", "wallet", "testnet", "faucet", "GLM", "SDK", "npm", "TypeScript", "createEntity",
  "entity", "entities", "Entity Expiration", "Lifetime Extension", "owner", "query", "indexing data",
  "attributes", "explorer", "Hub", "MCP", "Claude", "Codex", "your agent", "santiagodevrel", "DevRel",
] as const;

const DEEPGRAM_LISTEN = "wss://api.deepgram.com/v1/listen";
const KEEP_CHARS = 360;

export function deepgramListenUrl(keyterms: readonly string[] = CAPTION_KEYTERMS): string {
  const params = new URLSearchParams({
    model: "nova-3",
    language: "en",
    smart_format: "true",
    interim_results: "true",
    endpointing: "300",
  });
  for (const term of keyterms) params.append("keyterm", term);
  return `${DEEPGRAM_LISTEN}?${params.toString()}`;
}

/** Keeps the last `max` characters, cut at a word, so the band always ends with the newest words. */
export function tailWords(text: string, max = KEEP_CHARS): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(clean.length - max);
  const space = cut.indexOf(" ");
  return space === -1 ? cut : cut.slice(space + 1);
}

/** One Deepgram streaming message → the transcript and whether it is settled, or null. */
export function readResult(data: unknown): { text: string; isFinal: boolean } | null {
  if (typeof data !== "string") return null;
  let message: unknown;
  try { message = JSON.parse(data); } catch { return null; }
  const m = message as { type?: unknown; is_final?: unknown; channel?: { alternatives?: { transcript?: unknown }[] } } | null;
  if (!m || m.type !== "Results") return null;
  const text = m.channel?.alternatives?.[0]?.transcript;
  if (typeof text !== "string") return null;
  return { text: correctTerms(text.trim()), isFinal: m.is_final === true };
}

/** Words the model still hears as everyday English even with keyterms (November 4 test: "Today we
 * write archive entities", "we watch entities Expiration"). In this talk "archive" always means Arkiv. */
const CORRECTIONS: [RegExp, string][] = [
  [/\barchive\b/gi, "Arkiv"],
  [/\bentit(?:y|ies) expiration\b/gi, "Entity Expiration"],
  [/\blifetime extension\b/gi, "Lifetime Extension"],
];
export function correctTerms(text: string): string {
  return CORRECTIONS.reduce((out, [pattern, word]) => out.replace(pattern, word), text);
}

