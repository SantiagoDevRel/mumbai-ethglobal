import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BLOCKED_TERMS,
  ENGLISH_TERMS,
  HINDI_DEVANAGARI_TERMS,
  HINGLISH_TERMS,
  MARATHI_ROMAN_TERMS,
  REJECTION_MESSAGE,
  SAFE_WORDS,
  WHOLE_WORD_ONLY,
  findBlockedTerm,
  isNameAllowed,
  moderateName,
  normalizeName,
} from "./blocklist.ts";

const ALLOWED = [
  // Names from the brief
  "Priya", "Arjun", "Ananya", "Rohan", "Meera", "Kabir", "Sara", "Diego", "Scunthorpe",
  "Dickens", "Cassandra", "Shital", "Harshit", "Dhruv", "Sakshi", "Pushpa", "Shitanshu",
  "Analyn", "Bharat", "Mohammed", "Krishna", "Joseph", "BLOK fan", "🚀 Ravi",
  // Names and places that contain a blocked term
  "Anusha", "Anushka", "Nazia", "Ishita", "Akshita", "Kshitij", "Harshita", "Gandhi", "Kamini",
  "Kamineni", "Bhosale", "Lodha", "Lodaya", "Chodankar", "Randhir", "Randhawa", "Randive",
  "Wankhede", "Phukan", "Phuket", "Milford", "Pornima", "Pakistan", "Pakiza", "Chamaria",
  "Nangia", "Suarez", "Tattikonda", "Dallas", "Kutiyana", "Chinkara", "Coonoor", "Boobalan",
  "Arsenal fan", "Bombay", "Saturday", "Skill", "Grape", "Hancock", "Therapist", "Assam",
  "Class of 2026", "Spicy", "Torpedo", "Kumar", "Gandiva", "Hijrah",
  // Devanagari, other scripts, handles and emoji
  "प्रिया", "अर्जुन", "कृष्ण", "राहुल शर्मा", "प्रियंका", "@ravi", "@priya_dev", "Ravi 🔥",
  "Ana L", "José", "Zoë", "Søren", "Агата", "李明", "007", "R4hul", "Dr. Meera", "A. Dev",
];

const REJECTED = [
  // English, with leetspeak, repeats, spacing and look-alikes
  "fuck", "FUCK", "fuuuuck", "ffuucckk", "f u c k", "f.u.c.k", "f*ck you", "fück", "fu​ck",
  "ｆｕｃｋ", "fuсk" /* Cyrillic с */, "sh1t", "5hit", "$hit", "shit head", "a$$", "a.s.s",
  "b1tch", "@sshole", "Ravi the bitch", "motherfucker", "k1ll", "kill yourself",
  "killyourself", "nazi", "Hitler fan", "nigger", "n1gg3r", "faggot", "cunt", "pussy", "porn",
  "xxx", "boobs", "dickhead", "Scunthorpe cunt",
  // Romanized Hindi and Marathi
  "chutiya", "ch00tiya", "chutiyaaaa", "Ravi_chutiya", "madarchod", "bhenchod", "behenchod",
  "bsdk", "mc bc", "gaandu", "1und", "lund", "randi", "harami", "kamina", "bhosdike",
  "chamar", "katua", "hijra", "goli maro", "goli maaro", "zavadya", "aighala", "lavdya",
  "bhikarchot", "aai zavli",
  // Devanagari, including spelling variants folded together
  "चूतिया", "चुतिया", "मादरचोद", "भोसड़ीके", "भोसडीके", "रंडी", "गाँड", "गांड", "हरामी",
  "मार डालो", "बलात्कार", "चमार", "राहुल चूत", "झवाड्या",
];

test("common real names stay allowed", () => {
  for (const name of ALLOWED) {
    assert.equal(isNameAllowed(name), true, `${name} was blocked by ${findBlockedTerm(name)}`);
  }
});

test("offensive names are rejected", () => {
  for (const name of REJECTED) {
    assert.equal(isNameAllowed(name), false, `${name} was allowed`);
  }
});

test("every blocked term is rejected on its own and inside a name", () => {
  for (const term of BLOCKED_TERMS) {
    assert.equal(isNameAllowed(term), false, `${term} was allowed`);
    assert.equal(isNameAllowed(`Ravi ${term}`), false, `Ravi ${term} was allowed`);
  }
});

test("long terms match inside other words; whole-word-only terms do not", () => {
  assert.equal(isNameAllowed("superfuckingcool"), false);
  assert.equal(isNameAllowed("xchutiyax"), false);
  assert.equal(isNameAllowed("Ravishit"), true); // shit is whole-word only
  assert.equal(isNameAllowed("Ravi shit"), false);
  assert.equal(isNameAllowed("classic"), true); // ass is short: whole word only
});

test("names that are only symbols or whitespace are rejected", () => {
  for (const name of ["", "   ", "!!!", "...", "🚀🔥", "​​", "ㅤ", "☆★"]) {
    assert.equal(moderateName(name).allowed, false, JSON.stringify(name));
  }
});

test("URLs are rejected, @handles are allowed", () => {
  for (const name of ["http://spam", "https x", "www.spam", "buy.com", "Spam.io", "t.me/x"]) {
    assert.deepEqual(moderateName(name), { allowed: false, reason: "url" }, name);
  }
  assert.equal(isNameAllowed("@meera"), true);
});

test("control characters, bidi overrides and blocked emoji are rejected", () => {
  assert.equal(moderateName("kcuf‮").allowed, false);
  assert.equal(moderateName("Ravi\nPriya").allowed, false);
  assert.equal(moderateName("Ravi 🖕").allowed, false);
  assert.equal(moderateName("🖕🏽").allowed, false);
});

test("normalizeName produces spaced and squashed forms", () => {
  assert.deepEqual(normalizeName("Sh!t  H3ad"), { spaced: "shit head", squashed: "shithead" });
  assert.deepEqual(normalizeName("fuuuuck"), { spaced: "fuuck", squashed: "fuuck" });
  assert.deepEqual(normalizeName("Fü​ck"), { spaced: "fuck", squashed: "fuck" });
  assert.deepEqual(normalizeName("ｆｕｃｋ"), { spaced: "fuck", squashed: "fuck" });
  assert.equal(normalizeName("1und", { one: "l" }).spaced, "lund");
  assert.equal(normalizeName("$1ck", { one: "i" }).spaced, "sick");
  assert.equal(normalizeName("Ravi_the-Dev").spaced, "ravi the dev");
  // Devanagari matras survive; nukta and long vowels fold.
  assert.equal(normalizeName("भोसड़ी").spaced, normalizeName("भोसडि").spaced);
  assert.equal(normalizeName("प्रिया").spaced.length > 0, true);
});

test("lists are lower case, unique after normalization and in the expected size", () => {
  const seen = new Map<string, string>();
  for (const term of BLOCKED_TERMS) {
    assert.equal(term, term.toLowerCase().trim(), term);
    const key = normalizeName(term, { leet: false }).spaced;
    assert.ok(!seen.has(key), `${term} duplicates ${seen.get(key)}`);
    seen.set(key, term);
  }
  const all = new Set(BLOCKED_TERMS);
  for (const term of WHOLE_WORD_ONLY) assert.ok(all.has(term), `${term} is not a blocked term`);
  for (const word of SAFE_WORDS) assert.equal(isNameAllowed(word), true, word);
  assert.ok(BLOCKED_TERMS.length >= 150 && BLOCKED_TERMS.length <= 400);
  assert.equal(
    BLOCKED_TERMS.length,
    ENGLISH_TERMS.length + HINDI_DEVANAGARI_TERMS.length + HINGLISH_TERMS.length +
      MARATHI_ROMAN_TERMS.length,
  );
  assert.equal(REJECTION_MESSAGE, "Try another name.");
});
