"use client";

import { useEffect, useRef, useState } from "react";
import type { ArkivAdapter } from "../../shared/arkiv/adapter";
import { createMockAdapter } from "../../shared/arkiv/mock";
import type { ChainFilters, LiveEntity, QueryRun, StageEvent } from "../../shared/types";
import { blockFeed } from "./block-feed";
import { diffEntities, snapshotEntities } from "./entity-state";
import { usePresenterToken } from "./presenter-auth";
import { WRITER_ROUTES, WRITER_URL } from "./writer-client";
import { getProfile, WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { createLiveAdapter } from "./adapter-loader";
import { queryStage } from "./query-stage";
import { SEED_BUSINESSES } from "../../shared/data/seed-businesses";
import { useSourceMode } from "./source-mode";

export interface LiveData {
  adapter: ArkivAdapter | null;
  source: "mock" | "live";
  run: QueryRun | null;
  events: StageEvent[];
  error: string | null;
}

export function useLiveData(filters: ChainFilters, session: string | null): LiveData {
  const token = usePresenterToken();
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
        const live = mode === "live" || (mode === "auto" && !!WRITER_URL);
        const mock = live ? null : createMockAdapter({ autoSpawnMs: 1500 });
        const adapter = mock ?? createLiveAdapter({ profile, creator: WRITER_ADDRESS, read: token ? { kind: "proxy", url: WRITER_URL + WRITER_ROUTES.rpc, presenterToken: token } : { kind: "public" } });
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
        if (!stopped) setData((old) => ({ ...old, error: error instanceof Error ? error.message : "Unable to read the DB-Chain" }));
      }
      if (!stopped) timer = setTimeout(tick, 700);
    };
    void tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [data.adapter, queryKey]);
  return data;
}
