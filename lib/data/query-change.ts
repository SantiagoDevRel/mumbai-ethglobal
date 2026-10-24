/** Keep the displayed string exact, including when a filter is removed. */
export function queryChange(previous: string, current: string) {
  let start = 0;
  while (start < previous.length && start < current.length && previous[start] === current[start]) start++;
  let oldEnd = previous.length, newEnd = current.length;
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === current[newEnd - 1]) { oldEnd--; newEnd--; }
  return { before: current.slice(0, start), changed: current.slice(start, newEnd), after: current.slice(newEnd), removed: oldEnd > start && newEnd === start };
}
