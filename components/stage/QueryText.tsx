"use client";

import type { ReactNode } from "react";
import type { QueryLine } from "../../lib/data/query-layout";

// Strings, comments, $fields, numbers, calls and keywords, in that order of precedence.
const TOKEN = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\$[A-Za-z_]+)|(\b0x[0-9a-fA-F]+\b|\b\d+n?\b)|(\b[A-Za-z_][A-Za-z0-9_]*(?=\())|(\b(?:await|let|const|new|AND|OR|NOT|STARTSWITH)\b|&&|\|\||[=<>!]=?)/g;
const KIND = ["comment", "string", "field", "number", "call", "keyword"] as const;

/** Colors the query text so it reads at a glance; the text itself stays exactly what ran. */
export function highlight(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const kind = KIND[match.slice(1).findIndex((group) => group !== undefined)] ?? "plain";
    out.push(<span key={index} className={`tok-${kind}`}>{match[0]}</span>);
    last = index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The query that ran, one predicate per line. The filters set on stage (name, country, color) stay
 * marked for as long as they are on, so the room sees which lines the presenter is changing. */
export function QueryLines({ lines }: { lines: QueryLine[] }) {
  return <pre tabIndex={0} aria-label="Executed query text"><code>{lines.map((line, i) => (
    <span key={`${i}:${line.text}`} className="query-line" data-live={line.live || undefined}>
      {line.live ? <mark className="query-change">{highlight(line.text)}</mark> : highlight(line.text)}
    </span>
  ))}</code></pre>;
}
