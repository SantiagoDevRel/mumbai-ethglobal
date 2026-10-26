// The workshop writer API (shared/writer-api.ts) on Vercel Functions. See lib/server/writer.ts.
import { after } from "next/server";
import { createDb } from "../../../lib/server/db";
import { createWriter, type WriterEnv } from "../../../lib/server/writer";
import { WRITER_ADDRESS } from "../../../shared/arkiv/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A sender run lasts at most 90 s after its response; Hold waits up to 25 s for an idle writer.
export const maxDuration = 120;

let writer: ReturnType<typeof createWriter> | undefined;
function instance() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  writer ??= createWriter({
    db: createDb(process.env.DATABASE_URL),
    env: process.env as Record<string, string | undefined> as WriterEnv,
    writerAddress: WRITER_ADDRESS,
    defer: task => after(task),
  });
  return writer;
}
const handle = (request: Request) => instance().handle(request);
export { handle as GET, handle as POST, handle as OPTIONS };
