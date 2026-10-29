/** One line of the query panel: text exactly as the adapter described it, and whether it is a filter
 * the presenter sets on stage (`live`) rather than the app's fixed scope (app, kind, session). */
export interface QueryLine {
  text: string;
  live: boolean;
}

const SCOPE = { code: /eq\("(?:app|kind|session)"/, query: /(?:^|[\s(])(?:app|kind|session)\s*=/ };
/** The code's filter calls, among the builder's other lines (select, createdBy, limit, fetch). */
const FILTER_CALL = /(?:eq|gte|lte|startsWith)\("(?:name|color|country|category|rating|lat|lng|\$expiresAt|business)"|\.ownedBy\(/;
const CREATOR = /\$creator|createdBy/;

/** Query text split on its top-level ANDs (and line breaks), never inside a quoted literal or an
 * OR group in parentheses, so a name with " AND " in it stays one predicate. */
function predicates(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quote) {
      // JSON strings escape with a backslash; the SDK's 'str' literals double the quote instead.
      if (char === "\\" && quote === '"') i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
    const width = char === "\n" ? 1 : depth === 0 && text.startsWith(" AND ", i) ? 5 : depth === 0 && text.startsWith(" && ", i) ? 4 : 0;
    if (width) {
      parts.push(text.slice(start, i));
      start = i + width;
      i = start - 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * The query panel's lines, from the adapter's own description: one predicate per line, the app's
 * scope first and the filters set on stage after it, marked `live` (outline v3, Santiago, October
 * 29). Each line is text that ran, trimmed and without a trailing comma. The talk names one wallet
 * per entity, `$owner`, so the `$creator` scoping that every read keeps is never projected.
 * The query text is nothing but predicates, so every one past the scope is a filter set on stage,
 * however the SDK prints it (a name prefix included); the code keeps only its filter calls.
 * A description with no scope this recognizes is shown whole rather than hidden.
 */
export function queryLayout(text: string, kind: "code" | "query"): QueryLine[] {
  const pieces = (kind === "code" ? text.split("\n") : predicates(text))
    .map((line) => line.trim().replace(/,$/, ""))
    .filter((line) => line && !CREATOR.test(line));
  const scope = pieces.filter((line) => SCOPE[kind].test(line));
  const live = pieces.filter((line) => !SCOPE[kind].test(line) && (kind === "query" || FILTER_CALL.test(line)));
  if (!scope.length) return pieces.map((line) => ({ text: line, live: false }));
  const lines = [...scope.map((line) => ({ text: line, live: false })), ...live.map((line) => ({ text: line, live: true }))];
  // The query text reads as one statement: every predicate after the first starts with its AND.
  return kind === "query" ? lines.map((line, i) => (i ? { ...line, text: `AND ${line.text}` } : line)) : lines;
}
