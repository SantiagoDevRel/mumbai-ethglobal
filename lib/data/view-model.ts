import type { AppSideFilters, BusinessCategory, LiveEntity } from "../../shared/types.ts";

const CATEGORIES: BusinessCategory[] = ["cafe", "restaurant", "street-food", "bakery", "bookstore", "gym", "market", "bar"];

export function businessPresentation(entity: LiveEntity) {
  if (entity.attrs.kind === "business") return { name: entity.attrs.name, category: entity.attrs.category, rating: entity.attrs.rating, opens: entity.attrs.opens, closes: entity.attrs.closes, appSide: false };
  const seed = [...entity.key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { name: "name" in entity.attrs ? entity.attrs.name : "Review", category: CATEGORIES[seed % CATEGORIES.length]!, rating: (35 + seed % 15) / 10, opens: 480, closes: 1320, appSide: true };
}

export function isOpen(opens: number, closes: number, minutes: number) {
  if (opens === closes) return true;
  return opens < closes ? minutes >= opens && minutes < closes : minutes >= opens || minutes < closes;
}

export function mumbaiMinutes(now: number): number {
  const date = new Date(now + 330 * 60 * 1000);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function applyAppFilters(entities: LiveEntity[], filters: AppSideFilters, overlays: Record<string, Record<string, string>>, now: number) {
  let result = [...entities];
  const steps: string[] = [];
  if (filters.openNow) {
    result = result.filter((entity) => { const business = businessPresentation(entity); return isOpen(business.opens, business.closes, mumbaiMinutes(now)); });
    steps.push("open now · Mumbai local time");
  }
  if (filters.custom) {
    const { name, value } = filters.custom;
    result = result.filter((entity) => overlays[entity.key]?.[name] === value);
    steps.push(`${name} = ${JSON.stringify(value)} · local overlay`);
  }
  if (filters.sort) {
    const sort = filters.sort;
    result.sort((a, b) => sort === "expiry" ? Number(a.expiresAtBlock - b.expiresAtBlock) : sort === "rating" ? businessPresentation(b).rating - businessPresentation(a).rating : businessPresentation(a).name.localeCompare(businessPresentation(b).name));
    steps.push(`No ORDER BY. Your app sorts · ${sort}`);
  }
  return { entities: result, steps };
}
