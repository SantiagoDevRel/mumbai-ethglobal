# App surfaces

The projector's map uses viewport pixels. Its HUD and QR use `StageBox` and a single 1920x1080 coordinate system. The corner QR is top-right; S7 uses the left column and L8 uses a larger build QR. The QR and link encode the production join URL and the current session. Every card displays the full host and join path on one line, with the room code underneath. Mock mode displays MOCK. The corner card is 424x216; right-side panels start at y252 and remain above the query panel.

Typing `/j` opens an eight-character room-code form. It normalizes case and whitespace, validates only the supplied code through `GET /api/session?s=`, and replaces the URL with its session-bearing equivalent before opening the regular phone form. Invalid or ended sessions cannot submit. There is no public session discovery. Refreshing a valid URL follows the scanned-QR path, including the existing device identity and per-session allowance.

`lib/data/source-mode.ts` exports `isMockSource(mode, writerUrl?)` and `useIsMock()` for the stage and deck. Auto uses the mock only when the writer URL is absent; explicit Mock/Live selections override Auto. `useLiveData` and JoinQR consume this same rule.

`lib/stage/choreography.ts` owns scene and reveal state. The app reflects those filters as chips, highlights the current L4 badge, and opens a seeded business with its linked reviews at L5 step 2. Choosing an inspection example performs no chain write.

The query panel displays `QueryRun.description`. Fixed scope collapses to one row; changing predicates remain verbatim and scroll into view. Expanding Scope shows the full original description, including both queries when audience entities are combined with session-free businesses. Business mode presents the business query and discloses the audience merge and invented audience-business attributes on one app-side line.

The dot canvas is mounted only for live scenes. The bundled map style is in `lib/map/arkiv-night.json`; country borders retain its disputed-boundary exclusion. Entity disappearance remains query-driven. Long-lived businesses display their opening hours instead of a participant countdown. Dashed business pins identify app-side presentation data.

`components/notes/WriterControls.tsx` takes no props. It includes the source selector and filter/query controls; keyboard commands also remain available. Source selection is synchronized between same-origin notes and stage tabs over `arkiv-mumbai-source`. That channel carries only Auto/Mock/Live selection. The block feed is mirrored separately over `arkiv-mumbai-block` so /notes can show the stage block without making its own RPC requests. Presenter credentials continue to use the separate sessionStorage/auth flow.

Verification uses the shared/app unit tests, `tests/ui-layout.mjs`, and `scripts/stage-shots.mjs`. The browser scripts serve the exact static `out/` build in an isolated context and send no chain writes. Screenshots use mock stage data; layout checks briefly select public live reads to verify source synchronization. Inspect the generated PNGs at both stage sizes and the two phone widths before accepting a visual change.
