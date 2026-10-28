"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { queryChange } from "../../lib/data/query-change";

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

export function QueryText({ text }: { text: string }) {
  const mark = useRef<HTMLElement>(null);
  const [history, setHistory] = useState({ current: text, previous: "" });
  let previous = history.previous;
  if (history.current !== text) {
    previous = history.current;
    setHistory({ current: text, previous });
  }
  const change = queryChange(previous, text);
  useEffect(() => { mark.current?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [text]);
  return <pre tabIndex={0} aria-label="Executed query text"><code>{highlight(change.before)}<mark ref={mark} key={text} className={change.removed ? "query-change query-removal" : "query-change"}>{highlight(change.changed)}</mark>{highlight(change.after)}</code></pre>;
}
