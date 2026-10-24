"use client";

import { useState } from "react";
import { queryChange } from "../../lib/data/query-change";

export function QueryText({ text }: { text: string }) {
  const [history, setHistory] = useState({ current: text, previous: "" });
  let previous = history.previous;
  if (history.current !== text) {
    previous = history.current;
    setHistory({ current: text, previous });
  }
  const change = queryChange(previous, text);
  return <pre tabIndex={0} aria-label="Executed query text"><code>{change.before}<mark key={text} className={change.removed ? "query-change query-removal" : "query-change"}>{change.changed}</mark>{change.after}</code></pre>;
}
