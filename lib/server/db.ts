// The writer's state lives in Postgres (Neon, through the Vercel Marketplace): the queue, tickets,
// device counts, the one-sender lease and the in-flight transaction checkpoint. Single reads use
// Neon's HTTP endpoint (one round trip); changes run in interactive transactions over a pool.

import { neon, Pool } from "@neondatabase/serverless";

export type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
export interface Db {
  /** Table name inside the writer's schema. */
  t(name: "meta" | "tickets" | "devices" | "kv" | "logins"): string;
  /** One statement on its own (autocommit). */
  query: Query;
  /** Several statements in one transaction; any error rolls them all back. */
  transaction<T>(work: (query: Query) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const SCHEMA_NAME = /^[a-z_][a-z0-9_]{0,40}$/;

export function createDb(connectionString: string, schema = "writer"): Db {
  if (!SCHEMA_NAME.test(schema)) throw new Error("Invalid writer schema name.");
  const http = neon(connectionString);
  // Short idle timeout: a paused function instance should not hold Neon connections.
  const pool = new Pool({ connectionString, max: 4, idleTimeoutMillis: 5_000 });
  const t: Db["t"] = name => `${schema}.${name}`;
  let ready: Promise<void> | undefined;
  const ensure = () => ready ??= (async () => {
    const client = await pool.connect();
    try {
      await client.query(`
        create schema if not exists ${schema};
        create table if not exists ${t("meta")} (
          id int primary key check (id = 1),
          session text, doors text not null default 'closed', phase text not null default 'talk',
          replay boolean not null default false, held_until bigint not null default 0,
          accepted int not null default 0, written int not null default 0, failed int not null default 0,
          last_batch jsonb, last_flush_block text not null default '0', in_flight jsonb,
          lease_holder text, lease_until bigint not null default 0,
          balance_wei text not null default '0', balance_at bigint not null default 0,
          op_day text not null default '', ops_today int not null default 0);
        insert into ${t("meta")} (id) values (1) on conflict do nothing;
        create table if not exists ${t("tickets")} (
          id uuid primary key, seq bigserial, session text not null, device text not null,
          status text not null, dot jsonb not null, lat double precision not null, lng double precision not null,
          entity_key text, tx_hash text, block text, expires_at_block text, error text, accepted_at bigint not null);
        create index if not exists tickets_queue on ${t("tickets")} (seq) where status = 'queued';
        create table if not exists ${t("devices")} (id text primary key, count int not null default 0, last_ticket uuid);
        create table if not exists ${t("kv")} (key text primary key, value jsonb, updated_at bigint not null default 0, lock_until bigint not null default 0);
        create table if not exists ${t("logins")} (ip text primary key, count int not null, reset_at bigint not null);
      `);
    } finally { client.release(); }
  })().catch(error => { ready = undefined; throw error; });
  return {
    t,
    async query<T>(text: string, params: unknown[] = []) {
      await ensure();
      try { return await http.query(text, params) as T[]; }
      catch (error) {
        // A read that never reached the database (a dropped connection under a burst of polls) is
        // safe to repeat once. Writes are never repeated: their outcome would be unknown.
        if (!/^\s*select\b/i.test(text) || !/fetch failed|Error connecting to database/i.test(error instanceof Error ? error.message : "")) throw error;
        await new Promise(resolve => setTimeout(resolve, 150));
        return await http.query(text, params) as T[];
      }
    },
    async transaction<T>(work: (query: Query) => Promise<T>): Promise<T> {
      await ensure();
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await work(async <R>(text: string, params: unknown[] = []) => (await client.query(text, params)).rows as R[]);
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally { client.release(); }
    },
    async close() { await pool.end(); },
  };
}
