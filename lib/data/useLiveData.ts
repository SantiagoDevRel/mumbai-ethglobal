"use client";

import { useEffect, useRef, useState } from "react";
import type { ArkivAdapter } from "../../shared/arkiv/adapter";
import { createMockAdapter } from "../../shared/arkiv/mock";
import type { ChainFilters, LiveEntity, QueryRun } from "../../shared/types";
import { blockFeed } from "./block-feed";
import { deletedEvent, diffEntities, logEvents, rememberExpired, snapshotEntities, type VisualStageEvent } from "./entity-state";
import { deletions } from "./deleted-entities";
import { stageReadTransport, usePresenterToken } from "./presenter-auth";
import { WRITER_ROUTES, WRITER_URL } from "./writer-client";
import { getProfile, WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { createLiveAdapter } from "./adapter-loader";
import { queryStage } from "./query-stage";
import { SEED_BUSINESSES } from "../../shared/data/seed-businesses";
import { isMockSource, useSourceMode } from "./source-mode";
import { stage } from "../stage/store";

export interface LiveData {
  adapter: ArkivAdapter | null;
  source: "mock" | "live";
  run: QueryRun | null;
  events: VisualStageEvent[];
  /** Expired dots this screen remembers (app-side; see rememberExpired). */
  expired: LiveEntity[];
  error: string | null;
  /** Reads are paused to save the access key's quota (see useReadsAwake). */
  paused: boolean;
}

// Every query spends the access key's quota (10 units of 100,000,000 each), and a /map left open for a
// day used all of it. Reads pause while this window is hidden or after 20 minutes without a scene
// change, key, click or touch, and resume on the next one.
const IDLE_MS = 20 * 60_000;
function useReadsAwake(): boolean {
  const [awake, setAwake] = useState(true);
  useEffect(() => {
    let last = Date.now();
    const check = () => setAwake(document.visibilityState === "visible" && Date.now() - last < IDLE_MS);
    const touch = () => { last = Date.now(); check(); };
    const inputs = ["keydown", "pointerdown", "wheel", "touchstart"] as const;
    for (const input of inputs) window.addEventListener(input, touch, { passive: true });
    document.addEventListener("visibilitychange", check);
    const unsubscribe = stage.subscribe(touch);
    const timer = setInterval(check, 30_000);
    return () => {
      for (const input of inputs) window.removeEventListener(input, touch);
      document.removeEventListener("visibilitychange", check);
      unsubscribe(); clearInterval(timer);
    };
  }, []);
  return awake;
}

/** viem wraps transport errors ("An unknown RPC error occurred. Details: …"); the projector shows only the cause. */
function readError(error: unknown): string {
  if (!(error instanceof Error)) return "Unable to read the DB-Chain";
  return "details" in error && typeof error.details === "string" && error.details ? error.details : error.message;
}

export function useLiveData(filters: ChainFilters, session: string | null): LiveData {
  const token = usePresenterToken() ?? "";
  const mode = useSourceMode();
  const previous = useRef<{ adapter: ArkivAdapter; queryKey: string; entities: LiveEntity[] } | null>(null);
  const awake = useReadsAwake();
  const seen = useRef<{ adapter: ArkivAdapter; session: string; dots: Map<string, LiveEntity> } | null>(null);
  // Every key a query of this window returned: only those get a "deleted" row (a mock world is per window).
  const shown = useRef(new Set<string>());
  const [data, setData] = useState<Omit<LiveData, "paused">>({ adapter: null, source: "mock", run: null, events: [], expired: [], error: null });
  useEffect(() => {
    let stopped = false;
    let stopMock: (() => void) | undefined;
    void Promise.resolve().then(async () => {
      if (stopped) return;
      try {
        const profile = getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE);
        const live = !isMockSource(mode);
        const mock = live ? null : createMockAdapter({ autoSpawnMs: 1500 });
        const adapter = mock ?? createLiveAdapter({ profile, creator: WRITER_ADDRESS, read: stageReadTransport(token, WRITER_URL + WRITER_ROUTES.rpc) });
        stopMock = mock?.stop;
        if (mock) {
          const result = await mock.createBusinesses(SEED_BUSINESSES.map((item) => ({ ...item.business, lifetimeSec: 12 * 60 * 60 })));
          await mock.createReviews(SEED_BUSINESSES.flatMap((item, index) => item.reviews.map((review) => ({ ...review, business: result.keys[index]!, lifetimeSec: 12 * 60 * 60 }))));
        }
        if (stopped) return;
        setData({ adapter, source: live ? "live" : "mock", run: null, events: [], expired: [], error: null });
      } catch (error) { if (!stopped) setData({ adapter: null, source: "live", run: null, events: [], expired: [], error: error instanceof Error ? error.message : "Network not configured" }); }
    });
    return () => { stopped = true; stopMock?.(); blockFeed.publish(null); };
  }, [token, mode]);
  const effective = { ...filters, session: data.source === "mock" ? "MOCK" : session ?? "__no_session__" };
  const queryKey = JSON.stringify(effective);
  useEffect(() => {
    const adapter = data.adapter;
    if (!adapter || !awake) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let lastBlock: bigint | null = null;
    const parsed = JSON.parse(queryKey) as ChainFilters;
    const tick = async () => {
      try {
        const block = await adapter.getBlock();
        if (stopped) return;
        if (blockFeed.get()?.number !== block.number) blockFeed.publish(block);
        if (block.number !== lastBlock) {
          const run = await queryStage(adapter, parsed);
          if (stopped) return;
          const before = previous.current;
          const deleted = deletions.blocks();
          const events = diffEntities(before?.adapter === adapter ? before.entities : [], run, before?.adapter === adapter && before.queryKey === queryKey, deleted);
          previous.current = { adapter, queryKey, entities: snapshotEntities(run.entities) };
          for (const entity of run.entities) shown.current.add(entity.key);
          lastBlock = run.block;
          if (seen.current?.adapter !== adapter || seen.current.session !== parsed.session) seen.current = { adapter, session: parsed.session ?? "", dots: new Map() };
          const expired = rememberExpired(seen.current.dots, run, deleted);
          setData((old) => ({ ...old, run, events: logEvents(old.events, events), expired, error: null }));
        }
      } catch (error) {
        if (!stopped) setData((old) => ({ ...old, error: readError(error) }));
      }
      // Rabdi makes a block every 2 s; polling faster only spends the access key's quota.
      if (!stopped) timer = setTimeout(tick, 2000);
    };
    void tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [data.adapter, queryKey, awake]);
  // A delete from the entity card is logged when the next query no longer has the dot. When a query
  // already dropped it before the receipt (or the leading /map's message) came, it is logged here.
  useEffect(() => deletions.subscribe(({ entity, block }) => {
    if (!shown.current.has(entity.key) || previous.current?.entities.some((item) => item.key === entity.key)) return;
    const event = deletedEvent(entity, block, Date.now());
    setData((old) => ({ ...old, events: logEvents(old.events, [event]), expired: old.expired.filter((item) => item.key !== entity.key) }));
  }), []);
  return { ...data, paused: !awake };
}
