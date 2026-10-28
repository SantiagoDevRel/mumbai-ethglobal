/** Partition the actual adapter description for projection: the fixed scope (app, kind, session) and
 * the predicates that change. The talk names one wallet per entity, `$owner`, so the `$creator`
 * scoping that every read keeps is never projected (outline v3, October 28). */
export function queryLayout(text: string, kind: "code" | "query") {
  const pieces = (kind === "code" ? text.split("\n") : text.split(/\n| && | AND /)).filter((line) => !/\$creator|createdBy/.test(line));
  const isChanging = (line: string) => /(?:eq|gte|lte)\("(?:color|country|category|rating|lat|lng|\$expiresAt|business)"|\.ownedBy\(|(?:^|\s)(?:color|country|category|rating|lat|lng|\$expiresAt|\$owner|business)\s*(?:=|>=|<=)/.test(line);
  const scope = pieces.filter((line) => !isChanging(line));
  const changing = pieces.filter(isChanging);
  const fixed = scope.filter((line) => /(?:eq\("(?:app|kind|session)"|(?:^|\s)(?:app|kind|session)\s*=)/.test(line));
  return {
    scope: fixed.map((line) => line.trim().replace(/,$/, "")).join(kind === "query" ? " AND " : " · ").replace(/\s+/g, " "),
    changing: !fixed.length && !changing.length ? pieces.join("\n") : kind === "query" ? changing.map((line) => line.trim()).join("\nAND ") : changing.join("\n"),
  };
}
