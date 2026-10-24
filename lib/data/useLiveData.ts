"use client";

import { useEffect, useRef, useState } from "react";
import type { ArkivAdapter } from "../../shared/arkiv/adapter";
import { createMockAdapter } from "../../shared/arkiv/mock";
import type { ChainFilters, LiveEntity, QueryRun } from "../../shared/types";
import { blockFeed } from "./block-feed";
import { diffEntities, snapshotEntities, type VisualStageEvent } from "./entity-state";
import { stageReadTransport, usePresenterToken } from "./presenter-auth";
import { WRITER_ROUTES, WRITER_URL } from "./writer-client";
import { getProfile, WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { createLiveAdapter } from "./adapter-loader";
import { queryStage } from "./query-stage";
import { SEED_BUSINESSES } from "../../shared/data/seed-businesses";
import { isMockSource, useSourceMode } from "./source-mode";

export interface LiveData {
  adapter: ArkivAdapter | null;
  source: "mock" | "live";
  run: QueryRun | null;
  events: VisualStageEvent[];
  error: string | null;
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
  const [data, setData] = useState<LiveData>({ adapter: null, source: "mock", run: null, events: [], error: null });
  useEffect(() => {
    let stopped = false;
    let stopMock: (() => void) | undefined;
    void Promise.resolve().then(async () => {
      if (stopped) return;
      try {
        const profile = getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE);
        const live = !isMockSource(mode, WRITER_URL);
        const mock = live ? null : createMockAdapter({ autoSpawnMs: 1500 });
        const adapter = mock ?? createLiveAdapter({ profile, creator: WRITER_ADDRESS, read: stageReadTransport(token, WRITER_URL + WRITER_ROUTES.rpc) });
        stopMock = mock?.stop;
        if (mock) {
          const result = await mock.createBusinesses(SEED_BUSINESSES.map((item) => ({ ...item.business, lifetimeSec: 12 * 60 * 60 })));
          await mock.createReviews(SEED_BUSINESSES.flatMap((item, index) => item.reviews.map((review) => ({ ...review, business: result.keys[index]!, lifetimeSec: 12 * 60 * 60 }))));
        }
        if (stopped) return;
        setData({ adapter, source: live ? "live" : "mock", run: null, events: [], error: null });
      } catch (error) { if (!stopped) setData({ adapter: null, source: "live", run: null, events: [], error: error instanceof Error ? error.message : "Network not configured" }); }
    });
    return () => { stopped = true; stopMock?.(); blockFeed.publish(null); };
  }, [token, mode]);
  const effective = { ...filters, session: data.source === "mock" ? "MOCK" : session ?? "__no_session__" };
  const queryKey = JSON.stringify(effective);
  useEffect(() => {
    const adapter = data.adapter;
    if (!adapter) return;
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
          const events = diffEntities(before?.adapter === adapter ? before.entities : [], run, before?.adapter === adapter && before.queryKey === queryKey);
          previous.current = { adapter, queryKey, entities: snapshotEntities(run.entities) };
          lastBlock = run.block;
          setData((old) => ({ ...old, run, events: [...events.reverse(), ...old.events].slice(0, 120), error: null }));
        }
      } catch (error) {
        if (!stopped) setData((old) => ({ ...old, error: readError(error) }));
      }
      if (!stopped) timer = setTimeout(tick, 1000);
    };
    void tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [data.adapter, queryKey]);
  return data;
}
