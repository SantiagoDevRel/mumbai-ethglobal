// Writer Worker + Durable Object. Skeleton: the chain chat implements it against
// shared/writer-api.ts and shared/arkiv/adapter.ts (WORKSHOP.md 6.2-6.4).
import { phaseZero } from "./phase-zero.ts";

export interface Env {
  WRITER: DurableObjectNamespace;
  ARKIV_PROFILE: string;
  ALLOWED_ORIGINS: string;
  WORKSHOP_WRITER_PRIVATE_KEY: string;
  RPC: string;
  ACCESS_KEY: string;
  WORKSHOP_PRESENTER_TOKEN: string;
}

export class WriterObject implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(_request: Request): Promise<Response> {
    if (_request.headers.get("authorization") !== `Bearer ${this.env.WORKSHOP_PRESENTER_TOKEN}` || !this.env.WORKSHOP_PRESENTER_TOKEN) {
      return Response.json({ error: "unauthorized", message: "Presenter authorization required." }, { status: 401 });
    }
    if (new URL(_request.url).pathname === "/api/presenter/check" && _request.method === "POST") {
      return phaseZero(this.state, this.env);
    }
    return Response.json({ error: "internal", message: "Not implemented yet." }, { status: 501 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.WRITER.idFromName("main");
    return env.WRITER.get(id).fetch(request);
  },
} satisfies ExportedHandler<Env>;
