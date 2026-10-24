import type { AdapterOptions, ArkivAdapter } from "../../shared/arkiv/adapter";

/** The chain lane installs the implementation through this boundary once its adapter lands. */
type Factory = (options: AdapterOptions) => ArkivAdapter;
let factory: Factory | null = null;
export function registerLiveAdapter(next: Factory) { factory = next; }
export function createLiveAdapter(options: AdapterOptions): ArkivAdapter {
  if (!factory) throw new Error("Network not configured: the live adapter is not connected yet.");
  return factory(options);
}
