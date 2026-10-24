import type { StyleSpecification } from "maplibre-gl";

export const BASE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export async function darkStyle(signal?: AbortSignal): Promise<StyleSpecification> {
  const response = await fetch(BASE_STYLE_URL, { signal });
  if (!response.ok) throw new Error("Map tiles unavailable");
  const style = await response.json() as StyleSpecification;
  for (const layer of style.layers) {
    if (layer.type === "background") layer.paint = { ...layer.paint, "background-color": "#111111" };
    if (layer.type === "fill") layer.paint = { ...layer.paint, "fill-color": /water/.test(layer.id) ? "#181ea9" : "#111111", "fill-opacity": /water/.test(layer.id) ? 0.25 : 0.95 };
    if (layer.type === "line") layer.paint = { ...layer.paint, "line-color": "#e9e6de", "line-opacity": /boundary/.test(layer.id) ? 0.22 : 0.07 };
    if (layer.type === "symbol") layer.paint = { ...layer.paint, "text-color": "#f6f4ef", "text-halo-color": "#111111", "text-halo-width": 1 };
    if (layer.type === "fill-extrusion") layer.paint = { ...layer.paint, "fill-extrusion-color": "#181ea9" };
  }
  return style;
}
