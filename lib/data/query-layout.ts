/** Partition the actual adapter description for projection. The full source stays available. */
export function queryLayout(text: string, kind: "code" | "query") {
  const pieces = kind === "code" ? text.split("\n") : text.split(/\n| && | AND /);
  const isChanging = (line: string) => /(?:eq|gte|lte)\("(?:color|country|category|rating|lat|lng|\$expiresAt|business)"|\.ownedBy\(|(?:^|\s)(?:color|country|category|rating|lat|lng|\$expiresAt|\$owner|business)\s*(?:=|>=|<=)/.test(line);
  const scope = pieces.filter((line) => !isChanging(line));
  const changing = pieces.filter(isChanging);
  const fixed = scope.filter((line) => /(?:eq\("(?:app|kind|session)"|(?:^|\s)(?:app|kind|session)\s*=)/.test(line));
  return { scope: fixed.join(" · ").replace(/\s+/g, " ").trim(), changing: !fixed.length && !changing.length ? text : changing.join("\n") };
}
