"use client";

// BT · Find us at the booth (Santiago, November 4): the Arkiv team at ETHGlobal Mumbai, three rows of
// three in his order, each with the photo from the team's Slack (public/deck/team, 360 x 360, cropped
// to the face, metadata stripped; Marco's is the one Santiago sent) and the role he gave. Marco's role is the title on his Slack profile.

import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { PANEL, Slide, T } from "../ui";

export const TEAM = [
  { file: "seweryn", name: "Seweryn", role: "Software Engineer" },
  { file: "shantelle", name: "Shantelle", role: "Ecosystem" },
  { file: "santiago", name: "Santiago", role: "DevRel", me: true },
  { file: "martin", name: "Martin", role: "Marketing" },
  { file: "alexey", name: "Alexey", role: "Marketing" },
  { file: "priya", name: "Priya", role: "Ops" },
  { file: "marco", name: "Marco T.", role: "COO" },
  { file: "pawel", name: "Paweł", role: "CEO" },
  { file: "matthias", name: "Matthias", role: "CTO" },
] as const;

export const teamPhoto = (file: string) => `/deck/team/${file}.jpg`;

/** Cards 560 x 200 with 24 px between them: x 96-1824, y 320-968, clear of the logo at the bottom. */
const CARD = { width: 560, height: 200, gap: 24, top: 320 } as const;

export function BT(_props: SceneContentProps) {
  return (
    <Slide headline="Find us at the booth" under="Come say hi: ask us anything about Arkiv, all weekend." wash={0.82}>
      <ul
        className="absolute left-[96px] grid list-none grid-cols-3"
        style={{ top: CARD.top, gap: CARD.gap, gridTemplateColumns: `repeat(3, ${CARD.width}px)`, gridAutoRows: CARD.height }}
      >
        {TEAM.map((person) => (
          <li
            key={person.file}
            className={`${PANEL} flex items-center gap-7 px-6`}
            style={"me" in person ? { borderColor: "var(--arkiv-orange)", borderWidth: 2 } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed photo, preloaded with the deck */}
            <img
              src={teamPhoto(person.file)}
              alt={person.name}
              width={152}
              height={152}
              draggable={false}
              className="block h-[152px] w-[152px] shrink-0 rounded-full object-cover"
              style={{ boxShadow: "0 0 0 3px rgba(246,244,239,0.14)" }}
            />
            <span className="flex min-w-0 flex-col gap-2">
              <span className="truncate text-[44px] font-semibold leading-[1.1]">{person.name}</span>
              <span className="text-[28px] leading-[1.2]" style={{ color: "me" in person ? "var(--arkiv-orange)" : T.t64 }}>
                {person.role}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Slide>
  );
}

export const BOOTH_NOTES: string[] = [
  "That's the team, and we're all here this weekend at the Arkiv booth. Seweryn writes the code, Shantelle runs the ecosystem, and me, DevRel. Martin and Alexey do marketing, Priya runs ops. Marco, our COO, Paweł, our CEO, and Matthias, our CTO. Come say hi: bring your questions, your bugs and your ideas for the prizes.",
];
