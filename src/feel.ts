import { allListings, type AppState, type Listing, type Property, type FeelDescription } from "./domain";

/** Qualitative prepared profiles, not measured textile mechanics. */
export interface FabricProfile {
  material: string;
  materialSource: string;
  construction: string;
  summary: string;
  drape: number;
  movement?: number;
  surface: number;
  structure: number;
  stretch?: number;
  observations: Record<Property, string>;
}
export interface FeelPreferences {
  query: string;
  likes: string[];
  dislikes: string[];
  priority: Property;
  goal?: string;
}
export const FEEL_CHOICES = [
  "Smooth texture", "Crisp shape", "Relaxed shape", "Visible texture", "Some give", "Soft touch",
] as const;
export const FEEL_DEFAULTS: FeelPreferences = { query: "", likes: ["Smooth texture"], dislikes: [], priority: "Drape" };

const profiles: Record<string, FabricProfile> = {
  "my-blue-blouse": profile("Cotton blouse", "A familiar, lightly structured woven blouse.", .40, .40, .24, .56),
  "cloud-poplin": profile("Cotton poplin", "Crisp woven fabric with a clean, structured fall.", .24, .30, .18, .84),
  "moss-knit": profile("Knit fabric; fibre content not recorded", "A relaxed knit with visible loops and ribbed edges.", .76, .66, .86, .20),
  "airloom-linen": profile("Linen-style weave; fibre content not recorded", "A relaxed woven shape with visible texture and creases.", .64, .60, .62, .36),
  "petal-tee": profile("Cotton jersey, seller description", "An easy jersey-like shape with a fine-looking surface.", .60, undefined, .36, .22),
  "sunday-denim": profile("Denim; fibre content not recorded", "A firm twill-looking fabric with faded areas.", .16, undefined, .72, .90),
  "ink-trousers": profile("Woven fabric; fibre content not recorded", "Long pleats and a close-looking woven surface.", .48, undefined, .24, .56),
  "apricot-slip": profile("Satin-like surface; fibre content not recorded", "A fluid-looking shape with directional sheen.", .88, undefined, .12, .10),
  "tide-shirt": profile("Woven shirt; fibre content not recorded", "Loose side folds with a relatively smooth-looking surface.", .48, .48, .26, .54),
  "oat-vest": profile("Knit fabric; fibre content not recorded", "Visible knit loops with a compact, ribbed shape.", .50, undefined, .82, .46),
  "lilac-wrap": profile("Woven fabric; fibre content not recorded", "Diagonal folds and a smooth-looking face.", .72, undefined, .26, .30),
  "rose-jacket": profile("Woven jacket; fibre content not recorded", "A structured outline with matte woven panels.", .18, undefined, .52, .86),
  "sage-skirt": profile("Woven fabric; fibre content not recorded", "Gathered folds open into a gently waved hem.", .78, undefined, .36, .30),
};
// Prepared qualitative declarations, not a measured elasticity or image inference.
const declaredGive: Record<string, number> = { "my-blue-blouse": .08, "cloud-poplin": .08, "moss-knit": .68, "airloom-linen": .12, "petal-tee": .42, "tide-shirt": .14, "oat-vest": .58, "lilac-wrap": .18 };
for (const [id, value] of Object.entries(declaredGive)) {
  profiles[id].stretch = value;
  profiles[id].observations.Stretch = value > .4 ? "Some give, according to the prepared seller description. Return after stretching has not been measured." : "Little give, according to the prepared seller description. Return after stretching has not been measured.";
}
function profile(material: string, summary: string, drape: number, movement: number | undefined, surface: number, structure: number): FabricProfile {
  return {
    material,
    materialSource: "Prepared seller description; check the label photograph where supplied",
    construction: surface > .7 ? "Visible knit or twill texture" : "Fine-looking woven or jersey surface",
    summary, drape, movement, surface, structure,
    observations: {
      Drape: drape > .6 ? "Looser folds and a relaxed hanging shape." : drape < .3 ? "A straighter outline that holds its shape." : "Gentle folds with some visible structure.",
      Movement: movement === undefined ? "Not recorded" : "A prepared guided sequence shows the hem changing position. Movement when worn is not recorded.",
      Stretch: "Not recorded. A pull-and-release sequence is needed to compare give and recovery.",
      Surface: surface > .7 ? "Raised texture is visible in the prepared garment views." : surface > .45 ? "Visible weave and creasing add surface texture." : "The surface looks fine and relatively smooth in the prepared views.",
    },
  };
}
export function fabricProfile(listing: Listing): FabricProfile {
  const templateId = (listing as Listing & { templateId?: string }).templateId;
  const prepared = profiles[templateId || listing.id];
  if (prepared) return prepared;
  return { ...profile("Fibre content not recorded", "No prepared fabric profile is available for this garment.", .5, undefined, .5, .5), observations: { Drape: "Not recorded", Movement: "Not recorded", Stretch: "Not recorded", Surface: "Not recorded" } };
}
export function hasFabricProfile(listing: Listing): boolean { return !!profiles[(listing as Listing & { templateId?: string }).templateId || listing.id]; }

export type FeelDimension = keyof FeelDescription;
export const HUMAN_FEEL_DIMENSIONS: FeelDimension[] = ["shape", "give", "texture", "softness"];
export const FEEL_LABELS: Record<FeelDimension, string> = { shape: "Shape", give: "Give", texture: "Texture", softness: "Softness" };
export const FEEL_OPTIONS = {
  shape: [{ value: "unknown", label: "Not described" }, { value: "relaxed", label: "Relaxed / falls loosely" }, { value: "balanced", label: "Some shape, some flow" }, { value: "crisp", label: "Crisp / holds its shape" }],
  give: [{ value: "unknown", label: "Not described" }, { value: "little", label: "Little give" }, { value: "some", label: "Some give" }, { value: "plenty", label: "Plenty of give" }],
  texture: [{ value: "unknown", label: "Not described" }, { value: "smooth", label: "Smooth-looking" }, { value: "some-texture", label: "Some visible texture" }, { value: "textured", label: "Clearly textured" }],
  softness: [{ value: "unknown", label: "Not described" }, { value: "not-soft", label: "Not especially soft" }, { value: "somewhat-soft", label: "Somewhat soft to touch" }, { value: "very-soft", label: "Very soft to touch" }],
} as const;
export const UNKNOWN_FEEL: FeelDescription = { shape: "unknown", give: "unknown", texture: "unknown", softness: "unknown" };
const qualityValues: Record<FeelDimension, readonly string[]> = {
  shape: ["relaxed", "balanced", "crisp"], give: ["little", "some", "plenty"], texture: ["smooth", "some-texture", "textured"], softness: ["not-soft", "somewhat-soft", "very-soft"],
};
const qualityText: Record<FeelDimension, readonly string[]> = {
  shape: ["Relaxed / falls loosely", "Some shape, some flow", "Crisp / holds its shape"], give: ["Little give", "Some give", "Plenty of give"], texture: ["Smooth-looking", "Some visible texture", "Clearly textured"], softness: ["Not especially soft", "Somewhat soft to touch", "Very soft to touch"],
};
export interface DescribedQuality { known: boolean; value?: number; text: string; source: string; }
/** These are attributed descriptions. A model motion or saved demo step cannot establish a quality. */
export function describeQuality(listing: Listing, key: FeelDimension): DescribedQuality {
  const source = listing.feelDescriptionSource;
  const value = source && ["owner", "seller", "prepared"].includes(source) ? qualityValues[key].indexOf(listing.feelDescription?.[key] || "unknown") : -1;
  if (value < 0) return { known: false, text: "Not described", source: "Description missing" };
  return { known: true, value, text: qualityText[key][value], source: source === "owner" ? "Your description" : source === "seller" ? "Seller description" : "Prepared description" };
}
export interface RelativeFeelRow {
  key: FeelDimension; label: string; reference: DescribedQuality; candidate: DescribedQuality; relation: "more" | "similar" | "less" | "unknown"; summary: string;
}
export function relativeFeelRows(reference: Listing, listing: Listing): RelativeFeelRow[] {
  return HUMAN_FEEL_DIMENSIONS.map(key => {
    const a = describeQuality(reference, key), b = describeQuality(listing, key);
    if (!a.known || !b.known) return { key, label: FEEL_LABELS[key], reference: a, candidate: b, relation: "unknown", summary: `${FEEL_LABELS[key]} hasn’t been described for both pieces` };
    const delta = b.value! - a.value!;
    const relation = delta === 0 ? "similar" : delta > 0 ? "more" : "less";
    const qualifier = Math.abs(delta) === 1 ? "A little " : "";
    let summary: string;
    if (key === "shape") summary = delta === 0 ? "Similar shape" : `${qualifier}${delta > 0 ? "more structured" : "more relaxed"}`;
    else if (key === "give") summary = delta === 0 ? "Similar give" : `${qualifier}${delta > 0 ? "more give" : "less give"}`;
    else if (key === "texture") summary = delta === 0 ? "Similar-looking texture" : `${qualifier}${delta > 0 ? "more visible texture" : "less visible texture"}`;
    else summary = delta === 0 ? "Similar described softness" : `Described as ${Math.abs(delta) === 1 ? "a little " : ""}${delta > 0 ? "softer" : "less soft"}`;
    summary = summary.charAt(0).toUpperCase() + summary.slice(1);
    return { key, label: FEEL_LABELS[key], reference: a, candidate: b, relation, summary };
  });
}
function familiarName(listing: Listing): string {
  const name = listing.name.replace(/^(?:my|your)\s+/i, "");
  return `your ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}
export function relativeFeelSummary(reference: Listing, listing: Listing): string {
  const rows = relativeFeelRows(reference, listing);
  const shape = rows.find(row => row.key === "shape")!;
  if (shape.relation === "more") return `Like ${familiarName(reference)}, with a ${shape.candidate.value! - shape.reference.value! === 1 ? "crisper" : "more structured"} shape.`;
  if (shape.relation === "less") return `Like ${familiarName(reference)}, with a more relaxed shape.`;
  const other = rows.find(row => row.relation !== "unknown" && row.relation !== "similar");
  if (other) return `${other.summary}, compared with ${familiarName(reference)}.`;
  const known = rows.filter(row => row.relation !== "unknown");
  if (known.length === 4) return `A similar described feel to ${familiarName(reference)}.`;
  if (known.length) return `${known[0].summary}, compared with ${familiarName(reference)}.`;
  return "A few familiar details still need describing.";
}
function garmentFamily(category: Listing["category"]) {
  return ["Tops", "Shirts", "Knitwear"].includes(category) ? "upper" : category;
}
export function compatibleGarments(reference: Listing, listing: Listing): boolean {
  return garmentFamily(reference.category) === garmentFamily(listing.category);
}
export function hasStretchDeclaration(listing: Listing): boolean { return describeQuality(listing, "give").known; }
export interface FeelMatch { listing: Listing; reason: string; differences: string[]; profile: FabricProfile; }
const propertyDimension: Record<Property, FeelDimension> = { Drape: "shape", Movement: "shape", Stretch: "give", Surface: "texture" };
export function feelFocus(intent: FeelPreferences): FeelDimension {
  return HUMAN_FEEL_DIMENSIONS.includes(intent.goal as FeelDimension) ? intent.goal as FeelDimension : propertyDimension[intent.priority];
}
function requestedTargets(intent: FeelPreferences): Partial<Record<FeelDimension, number>> {
  const targets: Partial<Record<FeelDimension, number>> = {};
  const text = [intent.query, ...intent.likes].join(" ").toLowerCase();
  const avoid = intent.dislikes.join(" ").toLowerCase();
  if (/smooth|fine|silky/.test(text) || /textured|texture|rough/.test(avoid)) targets.texture = 0;
  if (/textured|texture|ribbed|knit/.test(text) || /smooth/.test(avoid)) targets.texture = 2;
  if (/relaxed|flowy|flowing|fluid|loose|drapey/.test(text) || /crisp|stiff|structured/.test(avoid)) targets.shape = 0;
  if (/crisp|structured|firm/.test(text) || /relaxed|floppy/.test(avoid)) targets.shape = 2;
  if (/less (?:crisp|stiff|structured)|not (?:crisp|stiff|structured)/.test(text)) targets.shape = 0;
  if (/give|stretch|elastic/.test(text)) targets.give = /some give/.test(text) ? 1 : 2;
  if (/give|stretch|elastic/.test(avoid)) targets.give = 0;
  if (/soft(?:er|ness)?|supple/.test(text)) targets.softness = 2;
  if (/soft(?:ness)?/.test(avoid)) targets.softness = 0;
  if (/less soft|not soft/.test(text)) targets.softness = 0;
  return targets;
}
function comparativeDirections(query: string): Partial<Record<FeelDimension, number>> {
  const text = query.toLowerCase();
  const directions: Partial<Record<FeelDimension, number>> = {};
  if (/softer|more soft/.test(text)) directions.softness = 1;
  if (/less soft|firmer to touch/.test(text)) directions.softness = -1;
  if (/crisper|more structured|stiffer/.test(text)) directions.shape = 1;
  if (/less crisp|less structured|more relaxed/.test(text)) directions.shape = -1;
  if (/more give|stretchier/.test(text)) directions.give = 1;
  if (/less give|less stretch/.test(text)) directions.give = -1;
  if (/more (?:visible )?texture|more textured/.test(text)) directions.texture = 1;
  if (/smoother|less (?:visible )?texture|less textured/.test(text)) directions.texture = -1;
  return directions;
}
export function passesFeelSearchFilters(listing: Listing, queryText: string, filters: { category: string; size: string }): boolean {
  const query = queryText.toLowerCase();
  const explicitSize = query.match(/\bsize\s+([sml])\b/i)?.[1]?.toUpperCase();
  const price = query.match(/\b(under|below|less than|up to|max)\s*\$?\s*(\d+(?:\.\d+)?)/);
  const ordinary = query
    .replace(/\bsize\s+[sml]\b/g, "")
    .replace(/\b(?:under|below|less than|up to|max)\s*\$?\s*\d+(?:\.\d+)?/g, "")
    .replace(/\b(smooth(?:er)?|fine|silky|textured|texture|ribbed|knit|relaxed|flowy|flowing|fluid|soft(?:er|ness)?|supple|loose|drapey|crisp(?:er)?|structured|stiff(?:er)?|firm|give|stretch(?:y)?|elastic|similar|feeling|feel|like|to|my|a|the|and|with|some|fabric|surface|finish|structure|drape|less|more|not|but|touch|shape|visible|than|piece|slightly|little)\b/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/).filter(Boolean);
  if (filters.category !== "All" && listing.category !== filters.category) return false;
  if (filters.size !== "All" && listing.size !== filters.size) return false;
  if (explicitSize && listing.size !== explicitSize) return false;
  if (price && (/up to|max/.test(price[1]) ? listing.price > Number(price[2]) : listing.price >= Number(price[2]))) return false;
  const haystack = [listing.name, listing.category, listing.color, listing.description, listing.material, fabricProfile(listing).material].join(" ").toLowerCase();
  return ordinary.every(token => ["shirt", "blouse", "top"].includes(token) ? garmentFamily(listing.category) === "upper" : haystack.includes(token));
}
/** Match attributed, known qualities. Unknown values never silently become similar or soft. */
export function findFeelMatches(state: AppState, reference: Listing, intent: FeelPreferences, filters: { category: string; size: string }, limit = 3): FeelMatch[] {
  const focus = feelFocus(intent);
  const requested = requestedTargets(intent);
  const directions = comparativeDirections(intent.query);
  const required = new Set<FeelDimension>([focus, ...Object.keys(requested) as FeelDimension[]]);
  if ([...required].some(key => !describeQuality(reference, key).known)) return [];
  const ranked = allListings(state).filter(listing => {
    if ((state.availability[listing.id] || "active") !== "active" || !compatibleGarments(reference, listing)) return false;
    return passesFeelSearchFilters(listing, intent.query, filters) && [...required].every(key => describeQuality(listing, key).known) && (Object.keys(directions) as FeelDimension[]).every(key => {
      const a = describeQuality(reference, key), b = describeQuality(listing, key);
      return a.known && b.known && (b.value! - a.value!) * directions[key]! > 0;
    });
  }).map(listing => {
    let distance = 0;
    for (const key of HUMAN_FEEL_DIMENSIONS) {
      const a = describeQuality(reference, key), b = describeQuality(listing, key);
      if (!a.known || !b.known) { distance += .35; continue; }
      const target = requested[key] ?? a.value!;
      const weight = requested[key] !== undefined ? 5 : key === focus ? 3 : 1;
      distance += Math.abs(b.value! - target) * weight;
    }
    return { listing, profile: fabricProfile(listing), reason: relativeFeelSummary(reference, listing), differences: relativeFeelRows(reference, listing).map(row => row.summary), distance };
  }).sort((a, b) => a.distance - b.distance || a.listing.id.localeCompare(b.listing.id));
  return ranked.slice(0, limit).map(({ distance: _distance, ...result }) => result);
}

export type MeasurementKey = "chest" | "length" | "shoulder" | "sleeve";
export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = { chest: "Chest width", length: "Length", shoulder: "Shoulder width", sleeve: "Sleeve length" };
export function measurementDifference(reference: Listing, listing: Listing, key: MeasurementKey): { reference?: number; candidate?: number; delta?: number; text: string } {
  const a = (reference.measurements as Partial<Record<MeasurementKey, number>>)[key];
  const b = (listing.measurements as Partial<Record<MeasurementKey, number>>)[key];
  if (a === undefined || b === undefined) return { reference: a, candidate: b, text: "Not recorded" };
  const delta = Math.round((b - a) * 10) / 10;
  if (delta === 0) return { reference: a, candidate: b, delta, text: "Same measurement" };
  const dimension = key === "chest" || key === "shoulder" ? (delta > 0 ? "wider" : "narrower") : (delta > 0 ? "longer" : "shorter");
  return { reference: a, candidate: b, delta, text: `${Math.abs(delta)} cm ${dimension}` };
}
