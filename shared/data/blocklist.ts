// Display-name moderation for the workshop's public projector.
//
// Participants type a display name on their phone and it appears on a big screen in front of
// the whole room. The writer (a Cloudflare Worker) calls `isNameAllowed` before it writes a name
// and answers a rejected one with REJECTION_MESSAGE. No dependencies, so it runs in a Worker,
// in the browser and in Node.
//
// How matching works:
// - Every name is normalized (NFKC, lower case, invisible characters and Latin accents removed,
//   look-alike Cyrillic/Greek letters mapped to Latin, leetspeak mapped, runs of 3+ identical
//   characters collapsed to 2) into a "spaced" form (punctuation becomes spaces) and a
//   "squashed" form (no spaces or punctuation at all).
// - A blocked term matches as a whole word in the spaced form. Each run of letters in a term
//   matches that letter repeated at least as often, so "fuck" also catches "fuuuck" while "ass"
//   (double s) does not catch "as".
// - Terms of SUBSTRING_MIN_LENGTH or more characters also match inside the squashed form, unless
//   they are in WHOLE_WORD_ONLY because they occur inside real names (Harshit, Anusha, Wankhede).
//   Shorter terms only ever match as whole words, which avoids the Scunthorpe problem.
// - Tokens in SAFE_WORDS are removed before substring matching.
//
// The lists are plain arrays so anyone can audit them. Entries are lower case.

export const REJECTION_MESSAGE = "Try another name.";

/** Terms at least this long (after normalization) also match inside other words. */
export const SUBSTRING_MIN_LENGTH = 4;

export const ENGLISH_TERMS: readonly string[] = [
  // Profanity
  "fuck", "fck", "fuk", "fuq", "fvck", "phuck", "phuk", "wtf", "stfu", "gtfo", "mofo",
  "shit", "shitty", "shithead", "bullshit", "horseshit", "bitch", "biatch", "bastard",
  "asshole", "ass", "arse", "arsehole", "jackass", "dumbass", "dick", "dickhead", "cock",
  "cocksucker", "cunt", "twat", "prick", "piss", "crap", "bollocks", "douche", "wanker",
  "wank", "tosser", "turd",
  // Sexual terms
  "sex", "sexy", "porn", "porno", "pornhub", "pornstar", "xxx", "nsfw", "boob", "boobs",
  "boobies", "tits", "titty", "titties", "penis", "vagina", "pussy", "dildo", "blowjob",
  "handjob", "rimjob", "cum", "cumshot", "jizz", "orgasm", "horny", "nude", "nudes", "naked",
  "milf", "hentai", "anal", "anus", "slut", "whore", "hoe", "skank", "hooker", "clit",
  "clitoris", "erection", "boner", "masturbate", "masturbation", "fap", "bdsm", "incest",
  "pedo", "pedophile", "paedo", "molest", "gangbang", "threesome", "deepthroat", "stripper",
  "prostitute", "onlyfans",
  // Slurs: ethnic, religious, homophobic, transphobic, ableist
  "nigger", "nigga", "negro", "coon", "darkie", "chink", "gook", "spic", "wetback", "kike",
  "raghead", "towelhead", "paki", "kaffir", "jihadi", "honky", "redskin", "beaner", "faggot",
  "fag", "fags", "dyke", "tranny", "shemale", "ladyboy", "homo", "lesbo", "retard", "tard",
  "spastic", "spaz", "mongoloid",
  // Violence and hate
  "kill", "killer", "killing", "kill yourself", "kys", "murder", "rape", "raped", "rapist",
  "suicide", "terrorist", "terrorism", "bomb", "bomber", "massacre", "genocide", "behead",
  "slaughter", "torture", "hitler", "nazi", "nazis", "heil", "holocaust", "lynching",
];

export const HINDI_DEVANAGARI_TERMS: readonly string[] = [
  // Profanity
  "चूतिया", "चूत", "मादरचोद", "बहनचोद", "बहेनचोद", "भेनचोद", "भोसड़ी", "भोसड़ीके", "भोसड़ा",
  "गांड", "गांडू", "गान्डू", "लौड़ा", "लोडा", "लवडा", "लंड", "लण्ड", "रंडी", "रण्डी", "रांड",
  "कुत्ता", "कुत्ते", "कुतिया", "कमीना", "कमीने", "हरामी", "हरामज़ादा", "हरामखोर", "झाटू",
  "झांट", "भड़वा", "भड़वे", "बकचोद", "चोद", "चोदू", "छिनाल", "टट्टी", "सुअर", "दल्ला",
  // Sexual terms
  "चुदाई", "नंगी", "चूची", "सेक्स", "सेक्सी", "पोर्न",
  // Slurs: caste, religious, ethnic, homophobic and transphobic
  "चमार", "भंगी", "चूहड़ा", "अछूत", "कटुआ", "म्लेच्छ", "काफ़िर", "जिहादी", "चिंकी", "हब्शी",
  "हिजड़ा", "छक्का",
  // Violence
  "बलात्कार", "बलात्कारी", "आतंकवादी", "मार डालो", "गोली मारो", "क़त्ल", "हत्यारा",
  // Marathi in Devanagari
  "झवाड्या", "लवड्या", "भडव्या", "आईघाला", "भिकारचोट", "रांडेच्या",
];

export const HINGLISH_TERMS: readonly string[] = [
  // Profanity (romanized Hindi). Doubled vowels need no separate entry: "jhatu" also
  // matches "jhaatu" because each letter in a term matches one or more of that letter.
  "chutiya", "chutia", "chootiya", "chutiye", "choot", "chut", "madarchod", "maderchod",
  "madarchood", "madarjaat", "behenchod", "bhenchod", "benchod", "behnchod", "bhencho",
  "bahanchod", "bhosdike", "bhosadike", "bhosdi", "bhosadi", "bhosda", "bsdk", "mkc", "bkl",
  "mc bc", "gaand", "gaandu", "gandu", "gand", "lund", "lauda", "lawda", "lavda", "loda",
  "lodu", "lavde", "lawde", "laude", "jhatu", "jhant", "chodu", "chod", "chodna", "randi",
  "raand", "randwa", "randibaaz", "kutta", "kutte", "kuttiya", "kutiya", "kamina", "kamine",
  "kaminey", "harami", "haramkhor", "haramzada", "haramzaade", "haramjada", "bhadwa", "bhadwe",
  "bhadve", "bhadva", "bakchod", "chinal", "tatti", "tatte", "suar", "suwar", "sooar", "dalla",
  // Sexual terms
  "chudai", "nangi", "chuchi", "choochi", "laundebaaz",
  // Slurs: caste, religious, ethnic, homophobic and transphobic
  "chamar", "bhangi", "chuhra", "dhed", "chapri", "achhoot", "katua", "katwa", "katue", "kafir",
  "mlechh", "malechh", "chinki", "chinky", "madrasi", "habshi", "hijra", "hijda", "hijde",
  "chakka",
  // Violence
  "mar dalo", "goli maro", "qatl", "balatkar", "balatkari", "atankwadi", "hatyara",
];

export const MARATHI_ROMAN_TERMS: readonly string[] = [
  // Profanity and sexual insults (romanized Marathi)
  "aighala", "aai zhavli", "aai zavli", "zavadya", "zhavadya", "zavnya", "zhavnya", "lavdya",
  "bhadvya", "bhikarchot", "randya", "randecha", "randechya", "chutmarichya", "gandit",
  "kutrya", "zhatu", "dukkar",
  // Caste slur
  "chambhar",
];

/** Every blocked term, from all lists. */
export const BLOCKED_TERMS: readonly string[] = [
  ...ENGLISH_TERMS,
  ...HINDI_DEVANAGARI_TERMS,
  ...HINGLISH_TERMS,
  ...MARATHI_ROMAN_TERMS,
];

/**
 * Terms long enough for substring matching that also occur inside real names or places, so
 * they only match as whole words. Examples of what each protects: shit (Harshit, Ishita,
 * Kshitij), anal/anus (Analyn, Anusha, Anushka), dick (Dickens), cock (Hancock), rape (Grape),
 * kill (Skill), nazi (Nazia), paki (Pakistan), porn (Pornima), wank (Wankhede), milf (Milford),
 * phuk (Phuket, Phukan), arse (Arsenal), turd (Saturday), bomb (Bombay), gand (Gandhi),
 * chod (Chodankar), loda (Lodaya), randi (Randive), kamine (Kamineni), chamar (Chamaria).
 */
export const WHOLE_WORD_ONLY: readonly string[] = [
  // English
  "shit", "anal", "anus", "dick", "cock", "rape", "raped", "rapist", "kill", "killer", "killing",
  "nazi", "nazis", "homo", "paki", "porn", "porno", "nude", "nudes", "boob", "tits", "penis",
  "clit", "wank", "pedo", "crap", "arse", "turd", "tard", "spic", "coon", "dyke", "kike",
  "negro", "chink", "gook", "fags", "spaz", "bomb", "bomber", "heil", "hooker", "boner", "piss",
  "prick", "mofo", "phuk", "milf",
  // Romanized Hindi and Marathi
  "chut", "gand", "lund", "lauda", "loda", "lodu", "lavde", "lawde", "laude", "chod", "randi",
  "randya", "kutta", "kutte", "kutiya", "kamina", "kamine", "kaminey", "hijra", "hijda", "hijde",
  "chakka", "tatti", "tatte", "suar", "suwar", "dalla", "chamar", "chambhar", "katua", "katwa",
  "katue", "kafir", "chinki", "chinky", "chapri", "bhangi", "chuhra", "chinal", "nangi", "chuchi",
  "qatl", "gandit", "dukkar", "dhed", "habshi",
  // Devanagari
  "चमार", "छक्का",
];

/** Whole tokens that are removed before substring matching (real places and names). */
export const SAFE_WORDS: readonly string[] = ["scunthorpe"];

/** Emoji that are rejected wherever they appear (skin-tone variants included). */
export const BLOCKED_EMOJI: readonly string[] = ["🖕"];

// ---------------------------------------------------------------------------------------------
// Normalization

export interface NormalizedName {
  /** Letters, digits and marks; every run of anything else becomes one space. */
  spaced: string;
  /** The spaced form without spaces. */
  squashed: string;
}

export interface NormalizeOptions {
  /** Map leetspeak (0→o, 1→i/l, 3→e, 4→a, 5→s, 7→t, @→a, $→s, !→i, |→l). Default true. */
  leet?: boolean;
  /** What "1" becomes when `leet` is on. Default "i". */
  one?: "i" | "l";
}

const LEET: Readonly<Record<string, string>> = {
  "0": "o", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "|": "l",
};

// Cyrillic and Greek letters that look like Latin ones, after lower-casing.
const CONFUSABLES: Readonly<Record<string, string>> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j",
  "ѕ": "s", "к": "k", "м": "m", "т": "t",
  "α": "a", "ε": "e", "ι": "i", "κ": "k", "ν": "v", "ο": "o", "ρ": "p", "τ": "t", "υ": "u",
  "χ": "x",
};

// Devanagari spelling variants folded together: nukta dropped, chandrabindu to anusvara,
// long i/u to short i/u. Applied to names and terms alike, so चूतिया also matches चुतिया.
const DEVANAGARI_FOLD: Readonly<Record<string, string>> = {
  "़": "", "ँ": "ं", "ी": "ि", "ू": "ु",
  "ई": "इ", "ऊ": "उ",
};

// Format characters (zero-width space/joiners, soft hyphen, bidi marks, tags) and blank fillers
// that render as nothing.
const INVISIBLE = /[\p{Cf}ᅟᅠㅤﾠ⠀᠎]/gu;
const LATIN = /\p{Script=Latin}/u;
const LETTER = /\p{L}/u;

function stripMarks(s: string): string {
  // Keep combining marks only on non-Latin letters (Devanagari matras and viramas are marks).
  return s
    .replace(/^\p{M}+/u, "")
    .replace(/(\P{M})(\p{M}+)/gu, (all, base: string) =>
      LETTER.test(base) && !LATIN.test(base) ? all : base,
    );
}

function collapseRuns(s: string): string {
  return s.replace(/(.)\1{2,}/gsu, "$1$1");
}

export function normalizeName(s: string, options: NormalizeOptions = {}): NormalizedName {
  const leet = options.leet ?? true;
  const one = options.one ?? "i";
  let out = s.normalize("NFKC").toLowerCase().replace(INVISIBLE, "");
  out = stripMarks(out.normalize("NFD"));
  let mapped = "";
  for (const ch of out) {
    if (leet && ch === "1") mapped += one;
    else if (leet && LEET[ch] !== undefined) mapped += LEET[ch];
    else mapped += CONFUSABLES[ch] ?? DEVANAGARI_FOLD[ch] ?? ch;
  }
  const spaced = collapseRuns(
    mapped.normalize("NFC").replace(/[^\p{L}\p{N}\p{M}]+/gu, " ").trim(),
  );
  return { spaced, squashed: collapseRuns(spaced.replace(/ /g, "")) };
}

// ---------------------------------------------------------------------------------------------
// Matching

// Matching works on run-length encodings ("fuuck" is f1 u2 c1 k1) instead of one regular
// expression per term, so a cold Worker pays no regex compilation. A term run of n characters
// matches an input run of the same character with n or more.

type Runs = { chars: string[]; counts: number[] };

function toRuns(text: string): Runs {
  const chars: string[] = [];
  const counts: number[] = [];
  for (const ch of text) {
    const last = chars.length - 1;
    if (last >= 0 && chars[last] === ch) counts[last] = (counts[last] as number) + 1;
    else {
      chars.push(ch);
      counts.push(1);
    }
  }
  return { chars, counts };
}

interface CompiledTerm {
  term: string;
  whole: Runs;
  inside: Runs | null;
}

const plain = (s: string) => normalizeName(s, { leet: false });
const WHOLE_ONLY_SET = new Set(WHOLE_WORD_ONLY.map((t) => plain(t).squashed));
const SAFE_SET = new Set(SAFE_WORDS.map((t) => plain(t).squashed));

const COMPILED: readonly CompiledTerm[] = BLOCKED_TERMS.map((term) => {
  const { spaced, squashed } = plain(term);
  const substring =
    [...squashed].length >= SUBSTRING_MIN_LENGTH && !WHOLE_ONLY_SET.has(squashed);
  return { term, whole: toRuns(spaced), inside: substring ? toRuns(squashed) : null };
});

// Terms indexed by their first character.
function indexBy(pick: (c: CompiledTerm) => Runs | null): Map<string, CompiledTerm[]> {
  const map = new Map<string, CompiledTerm[]>();
  for (const c of COMPILED) {
    const runs = pick(c);
    const first = runs?.chars[0];
    if (first === undefined) continue;
    const list = map.get(first) ?? [];
    list.push(c);
    map.set(first, list);
  }
  return map;
}
const WHOLE_INDEX = indexBy((c) => c.whole);
const INSIDE_INDEX = indexBy((c) => c.inside);

function runsMatchAt(input: Runs, at: number, term: Runs): boolean {
  if (at + term.chars.length > input.chars.length) return false;
  for (let j = 0; j < term.chars.length; j++) {
    if (input.chars[at + j] !== term.chars[j]) return false;
    if ((input.counts[at + j] as number) < (term.counts[j] as number)) return false;
  }
  return true;
}

// Whole words: the match must start and end at a space or at the edge of the text.
function findWhole(text: string): string | null {
  const input = toRuns(text);
  for (let i = 0; i < input.chars.length; i++) {
    if (i > 0 && input.chars[i - 1] !== " ") continue;
    for (const c of WHOLE_INDEX.get(input.chars[i] as string) ?? []) {
      const end = i + c.whole.chars.length;
      if ((end === input.chars.length || input.chars[end] === " ") && runsMatchAt(input, i, c.whole)) {
        return c.term;
      }
    }
  }
  return null;
}

function findInside(text: string): string | null {
  const input = toRuns(text);
  for (let i = 0; i < input.chars.length; i++) {
    for (const c of INSIDE_INDEX.get(input.chars[i] as string) ?? []) {
      if (c.inside && runsMatchAt(input, i, c.inside)) return c.term;
    }
  }
  return null;
}

// A "*" usually masks a vowel ("f*ck"), so masked names are also checked with each vowel.
function unmaskVariants(name: string): string[] {
  if (!name.includes("*")) return [name];
  return [name, ...["a", "e", "i", "o", "u"].map((v) => name.replaceAll("*", v))];
}

// "s h i t" → "shit": consecutive one-character tokens are joined into one word.
function joinSingleLetters(spaced: string): string {
  const out: string[] = [];
  let run = "";
  for (const token of spaced.split(" ")) {
    if ([...token].length === 1) {
      run += token;
      continue;
    }
    if (run) out.push(run);
    run = "";
    out.push(token);
  }
  if (run) out.push(run);
  return out.join(" ");
}

/** The first blocked term found in the name, or null. For logs and tests; never show it. */
export function findBlockedTerm(name: string): string | null {
  const seen = new Set<string>();
  for (const variant of unmaskVariants(name)) {
    const forms = [
      normalizeName(variant, { leet: false }),
      normalizeName(variant, { one: "i" }),
      normalizeName(variant, { one: "l" }),
    ];
    for (const { spaced } of forms) {
      if (seen.has(spaced)) continue;
      seen.add(spaced);
      const squashed = collapseRuns(
        spaced.split(" ").filter((t) => !SAFE_SET.has(t)).join(""),
      );
      const found = findWhole(spaced) ?? findWhole(joinSingleLetters(spaced)) ?? findInside(squashed);
      if (found !== null) return found;
    }
  }
  return null;
}

const CONTROL_OR_BIDI = /[\p{Cc}؜‎‏‪-‮⁦-⁩]/u;
const URL_LIKE =
  /https?|www\.|t\.me\/|bit\.ly|[\p{L}\p{N}-]\.(?:com|net|org|io|xyz|ly|gg|info|biz|site|online|link|ru|top)(?![\p{L}\p{N}])/u;

export type ModerationResult =
  | { allowed: true }
  | { allowed: false; reason: "empty" | "control" | "url" | "emoji" | "term"; term?: string };

/** Full verdict with the reason. The user only ever sees REJECTION_MESSAGE. */
export function moderateName(name: string): ModerationResult {
  if (typeof name !== "string") return { allowed: false, reason: "empty" };
  // Control characters and bidi overrides can reorder or hide text on the projector.
  if (CONTROL_OR_BIDI.test(name)) return { allowed: false, reason: "control" };
  const visible = name.normalize("NFKC").replace(INVISIBLE, "").toLowerCase();
  // Only symbols, emoji, punctuation or whitespace: nothing readable to show.
  if (!/[\p{L}\p{N}]/u.test(visible)) return { allowed: false, reason: "empty" };
  if (URL_LIKE.test(visible)) return { allowed: false, reason: "url" };
  if (BLOCKED_EMOJI.some((e) => name.includes(e))) return { allowed: false, reason: "emoji" };
  const term = findBlockedTerm(name);
  if (term !== null) return { allowed: false, reason: "term", term };
  return { allowed: true };
}

export function isNameAllowed(name: string): boolean {
  return moderateName(name).allowed;
}
