import type { ChainFilters } from "../../shared/types";
let viewport: ChainFilters["viewport"];
export const mapViewport = { get: () => viewport, set: (next: ChainFilters["viewport"]) => { viewport = next; } };
