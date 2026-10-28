"use client";

// D5 · Creation flags: decide once. Two switches, both OFF; → turns readonly ON; → turns
// permissionlessExtension ON; → both are off by default and fixed at creation.
// Steps: 0 both off · 1 readonly · 2 permissionlessExtension · 3 closing line.

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, Slide } from "../../ui";
import { Show, SUB } from "./kit";

function Flag({
  on,
  left,
  name,
  what,
  icon,
  example,
  still,
  chips,
}: {
  on: boolean;
  left: number;
  name: string;
  what: string;
  icon: ReactNode;
  example: string;
  still: string;
  chips: string[];
}) {
  return (
    <div
      className={`${PANEL} absolute top-[330px] box-border flex h-[440px] w-[846px] flex-col gap-5 px-10 py-8 transition-[border-color] duration-[400ms]`}
      style={{ left, borderColor: on ? "#FE7446" : undefined }}
    >
      <div className="flex items-center gap-6">
        <span className="relative h-[52px] w-[96px] flex-none rounded-full transition-colors duration-[350ms]" style={{ background: on ? "#FE7446" : "rgba(246,244,239,0.16)" }} aria-hidden>
          <motion.span
            className="absolute left-[6px] top-[6px] block h-[40px] w-[40px] rounded-full bg-[var(--arkiv-sand)]"
            initial={false}
            animate={{ x: on ? 44 : 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          />
        </span>
        <span className="font-mono text-[34px] font-semibold">{name}</span>
        <span className="ml-auto font-mono text-[20px] font-semibold" style={{ color: on ? "#FE7446" : "rgba(246,244,239,0.5)" }}>
          {on ? "ON" : "OFF"}
        </span>
      </div>
      <motion.div className="flex flex-col gap-5" initial={false} animate={{ opacity: on ? 1 : 0.18 }} transition={{ duration: 0.45, ease: EASE, delay: on ? 0.2 : 0 }}>
        <span className="text-[38px] font-semibold leading-[1.2]">{what}</span>
        <div className="flex items-center gap-5 rounded-[14px] bg-[var(--arkiv-sand)] px-6 py-5 text-[var(--arkiv-ink)]">
          {icon}
          <div className="flex flex-col gap-1">
            <span className="text-[16px] font-bold tracking-[0.06em] text-[rgba(17,17,17,0.56)]">FOR EXAMPLE</span>
            <span className="text-[26px] font-medium leading-[1.3]">{example}</span>
          </div>
        </div>
        <span className="text-[18px] font-bold tracking-[0.06em] text-[rgba(246,244,239,0.56)]">{still}</span>
        <div className="flex flex-wrap gap-2.5">
          {chips.map((c) => (
            <span key={c} className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[rgba(246,244,239,0.3)] px-4 py-2 text-[22px] font-semibold">
              {c}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

const ICON_PROPS = { width: 56, height: 56, viewBox: "0 0 24 24", fill: "none", stroke: "#181EA9", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", className: "flex-none" } as const;

export function D5({ step }: SceneContentProps) {
  return (
    <Slide headline="Creation flags: decide once" under="Two switches you set when you create the entity." wash={0.82}>
      <Flag
        on={step >= 1}
        left={96}
        name="readonly"
        what="Its attributes never change."
        icon={
          <svg {...ICON_PROPS} aria-hidden>
            <path d="M19.4 14.7C20.4 13 21 11.6 21 10a9 9 0 0 0-18 0c0 5 5.5 10.3 7.4 11.9a1 1 0 0 0 1.2 0c.5-.4 1.1-1 1.8-1.6" />
            <circle cx="12" cy="10" r="3" />
            <path d="m16 19 2 2 4-4" />
          </svg>
        }
        example="A check-in at a business. Nobody can edit it later."
        still="THE OWNER CAN STILL"
        chips={["Extend its life", "Transfer ownership", "Delete it"]}
      />
      <Flag
        on={step >= 2}
        left={978}
        name="permissionlessExtension"
        what="Anyone can extend its life."
        icon={
          <svg {...ICON_PROPS} aria-hidden>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
        example="Fans keep a popular business on the map."
        still="STILL ONLY THE OWNER CAN"
        chips={["Change it", "Transfer ownership", "Delete it"]}
      />

      <Show on={step >= 3} className="absolute left-[96px] top-[812px] flex flex-col gap-2.5">
        <span className="text-[30px] font-semibold">Both are off by default. You can&apos;t flip them after creation.</span>
        <span className="text-[26px]" style={{ color: SUB }}>
          Read them back from <span className="font-mono text-[var(--arkiv-orange)]">$creationFlags</span>.
        </span>
      </Show>
    </Slide>
  );
}

export const D5_STEPS = 4;

export const D5_NOTES: string[] = [
  "Two switches you set when you create an entity, and only then.",
  "readonly: its attributes never change, like a check-in at a business. The owner can still extend its life, transfer ownership or delete it. permissionlessExtension: anyone can pay to extend its life, so fans can keep a popular business on the map; only the owner can still change it, transfer it or delete it.",
  "Both are off by default and you can't flip them after creation. You read them back from $creationFlags.",
];
