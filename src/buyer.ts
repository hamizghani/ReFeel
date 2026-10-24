import { allListings, type AppState } from "./domain";
export function shoppingQuery(query: string) {
  const size = query.match(/\bsize\s+([sml])\b/i)?.[1].toUpperCase();
  const price = query.match(/\b(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*(\d+(?:\.\d+)?)/i);
  const maxPrice = price ? Number(price[1]) : undefined;
  const exclusivePrice = !!price && /^(under|below|less than)\b/i.test(price[0]);
  const text = query.replace(/\bsize\s+[sml]\b/gi, '').replace(/\b(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*\d+(?:\.\d+)?/gi,'').trim().toLowerCase();
  const tokens = text.split(/\s+/).filter(Boolean).filter(x=>!['a','the','in','with','for','please','find','me'].includes(x));
  return {size,maxPrice,exclusivePrice,tokens};
}
export function visibleListings(
  state: AppState,
  filters: { query: string; category: string; size: string; saved: boolean; maxPrice?:number; color?:string; condition?:string; evidenceOnly?:boolean },
) {
  const {size:explicitSize,maxPrice:queryMax,exclusivePrice,tokens}=shoppingQuery(filters.query);
  const ceiling=Math.min(filters.maxPrice??Infinity,queryMax??Infinity);
  return allListings(state).filter(
    (item) =>
      tokens.every((token) =>
        [item.name, item.category, item.color, item.seller, item.description,item.material??'',...(item.feelNotes??[])]
          .join(" ")
          .toLowerCase()
          .includes(token),
      ) &&
      (filters.category === "All" || item.category === filters.category) &&
      (filters.size === "All" || item.size === filters.size) &&
      (!explicitSize || item.size === explicitSize) &&
      item.price<=ceiling &&
      (!exclusivePrice || queryMax===undefined || item.price<queryMax) &&
      (!filters.color || filters.color==='All' || item.color.toLowerCase().includes(filters.color.toLowerCase())) &&
      (!filters.condition || filters.condition==='All' || item.condition.toLowerCase().startsWith(filters.condition.toLowerCase())) &&
      (!filters.evidenceOnly || item.evidence.some(e=>e.support!=='unavailable')) &&
      (!filters.saved || state.saved.includes(item.id)),
  );
}
