// Presenter login tokens, identical to the Worker's: `p.<expiry ms>.<HMAC of the expiry, keyed by
// the presenter secret>`. Rotating the secret ends every login.

const bytes = (value: string) => new TextEncoder().encode(value);
async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");

export async function signPresenter(secret: string, expiresAt: number): Promise<string> {
  return `p.${expiresAt}.${toHex(await crypto.subtle.sign("HMAC", await hmacKey(secret), bytes(`presenter:${expiresAt}`)))}`;
}

export async function verifyPresenter(secret: string, token: string): Promise<boolean> {
  const match = /^p\.(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match || Number(match[1]) <= Date.now()) return false;
  const signature = new Uint8Array(match[2]!.match(/../g)!.map(pair => parseInt(pair, 16)));
  return crypto.subtle.verify("HMAC", await hmacKey(secret), signature, bytes(`presenter:${match[1]}`));
}

/** Constant-time comparison: both sides are hashed to the same length first. */
export async function sameSecret(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([given, expected].map(value => crypto.subtle.digest("SHA-256", bytes(value))));
  const left = new Uint8Array(a!), right = new Uint8Array(b!);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i]! ^ right[i]!;
  return diff === 0;
}
