import type { StyleSpecification } from "maplibre-gl";
import approvedStyle from "./arkiv-night.json";

export async function darkStyle(): Promise<StyleSpecification> {
  // Trusted design asset; MapLibre validates expressions when it installs this style.
  return structuredClone(approvedStyle) as unknown as StyleSpecification;
}
