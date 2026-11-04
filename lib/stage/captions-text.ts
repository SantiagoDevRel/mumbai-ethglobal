// Pure helpers for the live captions (lib/stage/captions.ts): the Deepgram streaming URL, the
// keyterms and the transcript text. No browser or React here, so tests import it directly.

/** Words the room will hear that a general model would misspell or split, taken from the deck and
 * its notes (Santiago, November 4: "entities, records, attributes, values, Arkiv, Rabdi, Tiramisu,
 * DB-Chain…"). Deepgram keyterm prompting: plain terms, proper nouns capitalized, common nouns lower
 * case, at most 500 tokens in all (tests/captions.test.ts keeps a margin). Everyday words the model
 * already gets right (wallet, query, owner) stay out, so the boost goes to the rare ones. */
export const CAPTION_KEYTERMS = [
  // Arkiv and its networks
  "Arkiv", "Arkiv entities", "Arkiv DB-Chain", "DB-Chain", "DB-Chains", "Web3 database", "Golem", "GLM", "tGLM",
  "Rabdi", "Tiramisu", "Sorbet", "Braga", "Kaolin", "Mendoza", "testnet", "faucet", "Hub", "access key",
  // The data model
  "entity", "entities", "records", "attributes", "attribute", "values", "entity key", "entityKey", "createEntity",
  "query language", "indexing data", "Entity Expiration", "Lifetime Extension", "permissionless extension",
  "ownership", "transfer ownership", "block explorer", "tamper-evidence", "ciphertext", "plain text", "arkiv-encryption",
  // Chains, wallets and tools
  "Ethereum", "Ethereum mainnet", "Ethereum-aligned", "EVM", "Arbitrum", "Optimism", "Solana", "Swarm", "IPFS",
  "Sourcify", "Rabby", "MetaMask", "JSON-RPC", "RPC", "SDK", "npm", "TypeScript", "smart contracts",
  "MCP", "plugin", "skills", "Claude Code", "Codex", "OpenAI", "your agent",
  // The event and the speaker, with the opening lines (Santiago, November 4: "I'm Santiago, I work as
  // developer relations at Arkiv" came out "that's why I was in shadow"; "my voice is not doing that
  // well" came out "my price is not in that file")
  "ETHGlobal", "ETHGlobal Mumbai", "Mumbai", "Devcon", "web2", "web3", "santiagodevrel", "DevRel",
  "ChainSafe", "Cosmos", "Lisk", "web3.js", "Web3 Africa tour", "Continuity", "Node tooling",
  "Santiago", "I'm Santiago", "developer relations", "first DevRel", "my voice", "Telegram",
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
const CORRECTIONS: [RegExp, string | ((match: string) => string)][] = [
  [/\b(?:archive|arkive|archiv)\b/gi, "Arkiv"],
  [/\bentit(?:y|ies) expiration\b/gi, "Entity Expiration"],
  [/\blifetime extension\b/gi, "Lifetime Extension"],
  [/\bdb[\s-]?chain(s?)\b/gi, (match) => (/s$/i.test(match) ? "DB-Chains" : "DB-Chain")],
  [/\beth[\s-]?global\b/gi, "ETHGlobal"],
  [/\bjson[\s-]?rpc\b/gi, "JSON-RPC"],
  [/\btiramisu\b/gi, "Tiramisu"],
  [/\bdev[\s-]?rel\b/gi, "DevRel"],
];
export function correctTerms(text: string): string {
  return CORRECTIONS.reduce((out, [pattern, word]) => (typeof word === "string" ? out.replace(pattern, word) : out.replace(pattern, word)), text);
}

