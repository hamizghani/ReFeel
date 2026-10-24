/** Local prepared demonstration: photos and attributed descriptions are separate from animated walkthrough progress. */
import { coverFor, mediaFor } from "./media";
export type Property = "Drape" | "Movement" | "Stretch" | "Surface";
export type Support = "supported" | "limited" | "unavailable";
export type ReviewStatus = "unreviewed" | "confirmed" | "corrected" | "unsure";
export type ViewMode = "neutral" | "drape" | "movement" | "surface" | "front" | "label" | "wear";
export interface Evidence {
    property: Property;
    support: Support;
    observation: string;
    source: string;
    frame: string;
    sellerStatus: ReviewStatus;
    correctionNote?: string;
    originalSupport?: Support;
    preparedTake?: boolean;
}
export interface FeelDescription {
    softness: "not-soft" | "somewhat-soft" | "very-soft" | "unknown";
    give: "little" | "some" | "plenty" | "unknown";
    shape: "relaxed" | "balanced" | "crisp" | "unknown";
    texture: "smooth" | "some-texture" | "textured" | "unknown";
}
export type FeelDescriptionSource = "seller" | "owner" | "prepared";
export interface Listing {
    id: string;
    name: string;
    category: "Tops" | "Knitwear" | "Shirts" | "Bottoms" | "Dresses" | "Outerwear";
    price: number;
    size: "S" | "M" | "L";
    color: string;
    background: string;
    seller: string;
    condition: string;
    description: string;
    measurements: {
        chest?: number;
        length?: number;
        sleeve?: number;
        shoulder?: number;
    };
    material?: string;
    compositionSource?: string;
    feelNotes?: string[];
    feelDescription?: FeelDescription;
    feelDescriptionSource?: FeelDescriptionSource;
    templateId?: string;
    model?: string;
    poster: string;
    evidence: Evidence[];
    hero: boolean;
}
export type OrderStatus = "reserved" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "expired" | "disputed";
export interface OrderItemSnapshot {
    readonly id: string;
    readonly name: string;
    readonly price: number;
    readonly size: Listing["size"];
    readonly poster: string;
    readonly condition: string;
}
export interface DeliveryDetails {
    fullName: string;
    address: string;
}
export interface Order {
    id: string;
    items: string[];
    total: number;
    status: OrderStatus;
    createdAt: string;
    itemSnapshots?: readonly OrderItemSnapshot[];
    disputeNote?: string;
    delivery?: DeliveryDetails;
    paymentMethod?: "card" | "wallet";
    feedback?: {
        fit: "as-expected" | "different";
        note: string;
    };
}
export type Availability = "active" | "reserved" | "sold" | "paused" | "removed";
export interface AppState {
    version: 1;
    saved: string[];
    bag: string[];
    checkoutMode: "bag" | "buy-now";
    buyNowId?: string;
    availability: Record<string, Availability>;
    selectedReference: string;
    privateReferenceName: string;
    referenceAvailable: boolean;
    comparison: ComparisonContext;
    captureStage: number;
    captureComplete: boolean;
    decisions: Record<string, {
        status: ReviewStatus;
        note: string;
    }>;
    published: boolean;
    publishedSnapshot?: PublishedSnapshot;
    draft: {
        name: string;
        price: number;
        size: "S" | "M" | "L";
        description: string;
    };
    orders: Order[];
    guided: boolean;
    paymentError: boolean;
    localListings: Listing[];
    localDrafts: LocalDraft[];
    activeDraftId: string;
    cloudDraftListing?: Listing;
    cloudDraftSession?: LocalDraft;
    capturedSteps: number[];
    privateReferences: PrivateReference[];
    feelIntent: FeelIntent;
}
export interface FeelIntent {
    query: string;
    likes: string[];
    dislikes: string[];
    priority: Property;
    qualities: string[];
    goal: string;
}
export interface LocalDraft {
    progressKind: "animated-demo";
    id: string;
    templateId: string;
    listing: Listing;
    captureStage: number;
    captureComplete: boolean;
    capturedSteps: number[];
    decisions: AppState["decisions"];
    published: boolean;
}
export interface PrivateReference {
    progressKind: "animated-demo";
    id: string;
    templateId: string;
    listing: Listing;
    captureStage: number;
    capturedSteps: number[];
    ready: boolean;
}
export interface ComparisonContext {
    listingId?: string;
    property: Property;
    size: "All" | Listing["size"];
    category: "All" | Listing["category"];
}
export interface PublishedSnapshot {
    draft: AppState["draft"];
    decisions: AppState["decisions"];
    listing?: Listing;
}
export type Action = {
    type: "SAVE";
    id: string;
} | {
    type: "BAG_ADD";
    id: string;
} | {
    type: "BAG_REMOVE";
    id: string;
} | {
    type: "BUY_NOW";
    id: string;
} | {
    type: "BAG_VIEW";
} | {
    type: "LISTING_PAUSE";
    id: string;
} | {
    type: "LISTING_RESUME";
    id: string;
} | {
    type: "LISTING_REMOVE";
    id: string;
} | {
    type: "COMPARISON";
    comparison: Partial<AppState["comparison"]>;
} | {
    type: "REFERENCE";
    id: string;
} | {
    type: "REFERENCE_RENAME";
    name: string;
    id?: string;
} | {
    type: "REFERENCE_DELETE";
    id?: string;
} | {
    type: "REFERENCE_RESTORE";
} | {
    type: "CAPTURE_NEXT";
} | {
    type: "CAPTURE_BACK";
} | {
    type: "CAPTURE_RETAKE";
    stage: number;
} | {
    type: "DECIDE";
    property: Property;
    status: ReviewStatus;
    note?: string;
} | {
    type: "PUBLISH";
} | {
    type: "DRAFT";
    draft: Partial<AppState["draft"]>;
} | {
    type: "CHECKOUT";
    payment: "success" | "declined";
    delivery?: DeliveryDetails;
    paymentMethod?: "card" | "wallet";
} | {
    type: "ORDER_ADVANCE";
    id: string;
} | {
    type: "ORDER_CANCEL";
    id: string;
} | {
    type: "ORDER_EXPIRE";
    id: string;
} | {
    type: "ORDER_DISPUTE";
    id: string;
    note: string;
} | {
    type: "ORDER_FEEDBACK";
    id: string;
    fit: "as-expected" | "different";
    note?: string;
} | {
    type: "GUIDE";
    value: boolean;
} | {
    type: "LOCAL_DRAFT_CREATE";
    templateId?: string;
} | {
    type: "LOCAL_DRAFT_SELECT";
    id: string;
} | {
    type: "LOCAL_DRAFT_UPDATE";
    listing: Partial<Pick<Listing, "name" | "price" | "size" | "description" | "category" | "measurements" | "material" | "feelNotes" | "condition">>;
} | {
    type: "RECORDING_COMPLETE";
    step: number;
} | {
    type: "RECORDING_NEXT";
} | {
    type: "RECORDING_PREVIOUS";
} | {
    type: "RECORDING_VIEW";
    step: number;
} | {
    type: "RECORDING_RETRY";
    step: number;
} | {
    type: "REFERENCE_FROM_ORDER";
    orderId: string;
    itemId: string;
} | {
    type: "REFERENCE_CREATE";
    templateId?: string;
} | {
    type: "REFERENCE_CAPTURE_START";
    templateId?: string;
} | {
    type: "REFERENCE_RECORDING_COMPLETE";
    step: number;
} | {
    type: "REFERENCE_RECORDING_NEXT";
} | {
    type: "REFERENCE_RECORDING_PREVIOUS";
} | {
    type: "REFERENCE_RECORDING_VIEW";
    step: number;
} | {
    type: "REFERENCE_RECORDING_RETAKE";
    step: number;
} | {
    type: "REFERENCE_RECORDING_RETRY";
    step: number;
} | {
    type: "REFERENCE_FINISH";
} | {
    type: "REFERENCE_CAPTURE_SAVE";
    name?: string;
} | {
    type: "DESCRIBE_FEEL";
    id?: string;
    qualities: FeelDescription;
} | {
    type: "FEEL_INTENT";
    intent: Partial<FeelIntent>;
} | {
    type: "RESET";
};
export interface MatchProperty {
    property: Property;
    support: Support;
    explanation: string;
    evidenceCount: number;
}
export interface MatchResult {
    listing: Listing;
    properties: MatchProperty[];
    discoveryKind?: "authored-fixture-order";
    discoveryReason?: string;
}
export interface MatchFilters {
    size?: "All" | Listing["size"];
    category?: "All" | Listing["category"];
}
export const PROPERTIES: Property[] = [
    "Drape",
    "Movement",
    "Stretch",
    "Surface",
];
export const SHIPPING = 5;
interface FixtureInput {
    id: string;
    name: string;
    category: Listing["category"];
    price: number;
    size: Listing["size"];
    color: string;
    background: string;
    seller: string;
    condition: string;
    description: string;
    measurements: Listing["measurements"];
    drape: string;
    surface: string;
    movement?: string;
    stretch?: string;
    hero?: boolean;
}
function fixture(input: FixtureInput): Listing {
    const { drape: _drape, surface: _surface, movement, stretch, ...listing } = input;
    const source = (role: string) => {
        const items = mediaFor(input.id).photos;
        return items.find((item) => item.kind === role)?.src ?? coverFor(input.id);
    };
    const knit = input.category === "Knitwear";
    const descriptions: Record<string, string> = {
        "cloud-poplin": "An ivory cotton blouse with a structured collar, button placket and crisp hem. Seller describes light wear at the right cuff; inspect the garment photographs and ask for a close-up.",
        "moss-knit": "A moss-green fine-knit button-front cardigan with a round neckline, ribbed edges and full sleeves. Seller reports light wear; exact warmth and stretch recovery have not been measured.",
        "airloom-linen": "A relaxed stone overshirt with a pointed collar, button front and patch pockets. Seller describes a textured linen feel and natural creases; composition is not label-verified.",
    };
    const evidence: Evidence[] = [
        { property: "Drape", support: "supported", observation: knit ? "The garment photograph shows a relaxed knit outline. Hanging shape can be inspected; body fit and fabric weight are not established." : "Inspect the photographed outline, seams and visible folds. Hanging shape is visible, but exact fit and fabric weight are not established.", source: source("front"), frame: "Full garment photograph · front view", sellerStatus: "unreviewed" },
        { property: "Movement", support: movement ? "limited" : "unavailable", observation: movement ? "A prepared movement example illustrates the action. This is authored demonstration context; movement during wear and fabric weight are not measured." : "There is no garment-specific movement recording. An animated example cannot establish movement during wear.", source: source("front"), frame: "Prepared movement gesture · source photograph", sellerStatus: "unreviewed" },
        { property: "Stretch", support: stretch ? "limited" : "unavailable", observation: stretch ? "A prepared pull example and attributed description provide context. Elasticity, force and recovery have not been measured." : "There is no garment-specific pull-and-release recording. Give may be described separately, while elasticity and recovery remain unmeasured.", source: source("detail"), frame: "Prepared pull gesture · no measured elasticity", sellerStatus: "unreviewed" },
        { property: "Surface", support: "limited", observation: input.id === "cloud-poplin" ? "Seller describes a crisp cotton surface and light wear at the right cuff. The supplied photo does not verify that mark or exact skin softness; ask for a close-up." : "Inspect the photographed fabric and seller notes. No hidden damage, exact skin softness, cleanliness or authenticity is established by these photographs.", source: source("detail"), frame: "Garment photograph · fabric detail where supplied", sellerStatus: "unreviewed" },
    ];
    const material = input.id.includes("linen") ? "Seller-described linen" : knit ? "Seller-described knit blend" : input.id.includes("denim") ? "Seller-described cotton denim" : input.id === "petal-tee" ? "Seller-described cotton jersey" : input.id === "cloud-poplin" ? "Seller-described cotton" : "Seller-described woven blend";
    const appearance: Record<string, string> = {
        "petal-tee": "Jersey appearance", "moss-knit": "Fine-knit appearance",
        "oat-vest": "Ribbed knit appearance", "sunday-denim": "Denim twill appearance",
        "rose-jacket": "Twill appearance", "apricot-slip": "Satin-like sheen"
    };
    const feelNotes = [appearance[input.id] ?? "Woven appearance", "Hanging shape shown", "Exact skin softness unknown"];
    const descriptionsByGarment: Record<string, FeelDescription> = {
        "cloud-poplin": { softness: "somewhat-soft", give: "little", shape: "crisp", texture: "smooth" },
        "my-blue-blouse": { softness: "somewhat-soft", give: "little", shape: "balanced", texture: "smooth" },
        "moss-knit": { softness: "unknown", give: "some", shape: "relaxed", texture: "textured" },
        "airloom-linen": { softness: "unknown", give: "little", shape: "relaxed", texture: "some-texture" },
        "petal-tee": { softness: "unknown", give: "some", shape: "relaxed", texture: "smooth" },
        "sunday-denim": { softness: "unknown", give: "unknown", shape: "crisp", texture: "textured" },
        "ink-trousers": { softness: "unknown", give: "unknown", shape: "balanced", texture: "smooth" },
        "apricot-slip": { softness: "unknown", give: "unknown", shape: "relaxed", texture: "smooth" },
        "tide-shirt": { softness: "unknown", give: "little", shape: "balanced", texture: "smooth" },
        "oat-vest": { softness: "unknown", give: "some", shape: "balanced", texture: "textured" },
        "lilac-wrap": { softness: "unknown", give: "little", shape: "relaxed", texture: "smooth" },
        "rose-jacket": { softness: "unknown", give: "unknown", shape: "crisp", texture: "some-texture" },
        "sage-skirt": { softness: "unknown", give: "unknown", shape: "relaxed", texture: "smooth" },
    };
    return { ...listing, condition: input.condition.startsWith("Very good") ? "Very good · seller-described" : "Good · seller-described", description: descriptions[input.id] ?? `${input.description.split(". ")[0]}. Seller describes light wear; check the photographs and ask about condition.`, hero: !!input.hero, model: undefined, poster: coverFor(input.id), templateId: input.id, material, compositionSource: "Seller description; label composition is not verified", feelNotes, feelDescription: { ...descriptionsByGarment[input.id] }, feelDescriptionSource: "prepared", evidence };
}
export const CATALOG: Listing[] = [
    fixture({
        id: "cloud-poplin",
        name: "Cloud Poplin Blouse",
        category: "Tops",
        price: 32,
        size: "M",
        color: "Warm ivory",
        background: "#e3e8ef",
        seller: "Maya",
        condition: "Very good · small cuff mark",
        description: "An ivory cotton blouse with a structured collar, button placket and crisp hem. A tiny mark sits on the right cuff; exact feel and hidden wear remain unknown.",
        measurements: { chest: 52, length: 62, sleeve: 54, shoulder: 44 },
        drape: "The structured collar and straight button placket hold their shape. Angular side folds meet a crisp, nearly level hem in the prepared hanging frame.",
        movement: "The prepared side sequence shows a small shift at the structured hem and cuff. It cannot establish movement during wear or fabric weight.",
        surface: "The prepared close-up shows a fine plain weave, button placket and tiny mark on the right cuff. Hidden damage and tactile softness remain unknown.",
        hero: true,
    }),
    fixture({
        id: "moss-knit",
        name: "Moss Knit Cardigan",
        category: "Knitwear",
        price: 46,
        size: "M",
        color: "Moss green",
        background: "#e7e9db",
        seller: "June",
        condition: "Good · light visible pilling",
        description: "A moss-green button-front cardigan with a round neckline, ribbed edges and full sleeves. Seller-described warmth and stretch recovery remain unverified.",
        measurements: { chest: 54, length: 59, sleeve: 56, shoulder: 46 },
        drape: "The open front falls in two loose vertical edges; fuller sleeves gather above the ribbed cuffs in the prepared hanging frame.",
        movement: "The prepared side illustration shows a small change at the cuff and hem. A still sequence does not establish movement when worn.",
        stretch: "The rib structure is visible, but no controlled stretch-and-return test was captured. Stretch recovery is unknown.",
        surface: "Raised knit loops, ribbed cuffs and light pilling are visible in the prepared detail frame.",
        hero: true,
    }),
    fixture({
        id: "airloom-linen",
        name: "Airloom Linen Overshirt",
        category: "Shirts",
        price: 38,
        size: "L",
        color: "Stone",
        background: "#e9e2d6",
        seller: "Ari",
        condition: "Very good · visible natural creases",
        description: "A relaxed stone overshirt with a pointed collar, button front and two patch pockets. Creases run through the textured weave. Fibre content and breathability are unverified.",
        measurements: { chest: 58, length: 72, sleeve: 57, shoulder: 49 },
        drape: "Long creases follow the button placket between two raised patch pockets. The relaxed body falls into a broad, nearly level hem in the prepared frame.",
        movement: "An authored side view shows the open hem shifting outward. Real fluidity and breathability cannot be established from the fixture.",
        surface: "A textured plain weave, raised patch-pocket edges and visible creases appear in the prepared close-up; tactile feel remains unknown.",
        hero: true,
    }),
    fixture({
        id: "petal-tee",
        name: "Petal Cotton Tee",
        category: "Tops",
        price: 18,
        size: "S",
        color: "Dusty pink",
        background: "#f0e1e3",
        seller: "Elena",
        condition: "Good · faint collar wear",
        description: "A dusty-pink tee with short sleeves and an easy round neckline. The collar edge shows faint wear. Composition, exact feel and stretch are unknown.",
        measurements: { chest: 46, length: 57, sleeve: 18 },
        drape: "The straight body ends in a level hem, with two small folds visible below the armholes.",
        surface: "Fine jersey-like lines and a faintly worn collar edge appear in the prepared detail; other wear is unknown.",
    }),
    fixture({
        id: "sunday-denim",
        name: "Sunday Straight Denim",
        category: "Bottoms",
        price: 42,
        size: "M",
        color: "Washed blue",
        background: "#dce7ed",
        seller: "Noor",
        condition: "Good · faded knee panels",
        description: "Washed-blue denim with straight legs and a high waistband. Faded knees and contrast stitching give it a lived-in look. Waist, inseam and fibre content are unknown.",
        measurements: { length: 98 },
        drape: "The legs hold a straight outline with angular folds below the waistband and near the hems.",
        surface: "Diagonal weave lines, faded knee panels and contrast stitching are visible in the prepared detail.",
    }),
    fixture({
        id: "ink-trousers",
        name: "Ink Pleated Trousers",
        category: "Bottoms",
        price: 44,
        size: "L",
        color: "Charcoal",
        background: "#e5e3df",
        seller: "Robin",
        condition: "Very good · minor hem rub",
        description: "Charcoal trousers with front pleats and gently tapered legs. A small pale rub appears at the right hem. Waist and inseam measurements are unavailable.",
        measurements: { length: 102 },
        drape: "Front pleats continue into long vertical folds; the narrower hems gather slightly inward.",
        surface: "The prepared detail shows a close plain weave and a small pale rub at the right hem.",
    }),
    fixture({
        id: "apricot-slip",
        name: "Apricot Slip Dress",
        category: "Dresses",
        price: 52,
        size: "S",
        color: "Soft apricot",
        background: "#efe1d7",
        seller: "Lina",
        condition: "Very good · tiny strap crease",
        description: "An apricot slip dress with narrow straps, a gentle flare and a directional sheen. One strap has a tiny crease. Lining, daylight opacity and exact softness are unknown.",
        measurements: { chest: 43, length: 109 },
        drape: "Narrow diagonal folds run from the bust toward a gently flared, curved hem.",
        surface: "A smooth-looking face with a directional sheen and a tiny strap crease is visible in the authored detail.",
    }),
    fixture({
        id: "tide-shirt",
        name: "Tide Stripe Shirt",
        category: "Shirts",
        price: 36,
        size: "M",
        color: "Sea blue stripe",
        background: "#e0e8e9",
        seller: "Sam",
        condition: "Good · slight collar fading",
        description: "A sea-blue striped shirt with a pointed collar, button front and rounded hem. The collar edge is slightly faded. Fibre composition and laundering history are unknown.",
        measurements: { chest: 54, length: 69, sleeve: 58 },
        drape: "The placket stays straight while soft side folds lead toward a rounded shirt-tail hem.",
        surface: "Narrow blue stripes and slight fading along the collar edge are visible in the prepared close-up.",
    }),
    fixture({
        id: "oat-vest",
        name: "Oat Knit Vest",
        category: "Knitwear",
        price: 29,
        size: "M",
        color: "Oat beige",
        background: "#ebe5d8",
        seller: "Kit",
        condition: "Good · small knit snag",
        description: "A cream ribbed sleeveless knit vest with a round neckline and button front. Seller-described warmth and elasticity remain unverified.",
        measurements: { chest: 50, length: 55 },
        drape: "The sleeveless body keeps a compact, square outline; the ribbed hem turns gently inward.",
        surface: "Knit loops, ribbed edging and a small snag at the lower edge are visible in the authored close-up.",
        stretch: "Ribbing is visible, but no controlled stretch or recovery test is supplied.",
    }),
    fixture({
        id: "lilac-wrap",
        name: "Lilac Wrap Top",
        category: "Tops",
        price: 58,
        size: "L",
        color: "Lilac",
        background: "#e6e0ec",
        seller: "Tessa",
        condition: "Very good · faint tie crease",
        description: "A lilac wrap top with a diagonal front fold, short sleeves and a side tie. A faint crease runs across the tie. Opacity, fibre composition and exact feel are unknown.",
        measurements: { chest: 53, length: 60, sleeve: 31 },
        drape: "The wrap overlap creates a diagonal front fold that meets a side tie above the short, gently curved hem.",
        surface: "A fine plain-looking face and a faint crease across the waist tie appear in the prepared detail.",
    }),
    fixture({
        id: "rose-jacket",
        name: "Rose Chore Jacket",
        category: "Outerwear",
        price: 64,
        size: "M",
        color: "Dusty rose",
        background: "#eee1dd",
        seller: "Bea",
        condition: "Good · cuff edge wear",
        description: "A dusty-rose cropped twill jacket with a collar, four-button front, roomy sleeves and drawstring hem. Lining, water resistance and hidden seam damage are unknown.",
        measurements: { chest: 56, length: 56, sleeve: 57 },
        drape: "The cropped body keeps a structured outline, with angular folds at the elbows and a nearly level hem.",
        surface: "Matte woven panels, button edges, patch-pocket stitching and light abrasion at the cuff edge are visible in the prepared detail.",
    }),
    fixture({
        id: "sage-skirt",
        name: "Sage Midi Skirt",
        category: "Bottoms",
        price: 34,
        size: "S",
        color: "Sage green",
        background: "#e6eadf",
        seller: "Nell",
        condition: "Very good · light waistband creasing",
        description: "A dark sage gathered-tier midi skirt with a ruffled lower tier. Waist circumference, lining and stretch are unknown.",
        measurements: { length: 78 },
        drape: "Gathered waist folds open into a broad A-line silhouette and a slightly waved hem.",
        surface: "Fine woven lines and light creasing near the waistband appear in the prepared detail.",
    }),
];
export const REFERENCE: Listing = fixture({
    id: "my-blue-blouse",
    name: "My blue blouse",
    category: "Tops",
    price: 30,
    size: "M",
    color: "Cornflower blue",
    background: "#e0e9ef",
    seller: "You · private reference",
    condition: "Private · your familiar garment",
    description: "Your cornflower-blue relaxed shirt, with a pointed collar, button front and long sleeves. Keep it private as the familiar side of a comparison.",
    measurements: { chest: 51, length: 61, sleeve: 52, shoulder: 43 },
    drape: "Vertical front folds and a softly curved hem appear in the prepared full-garment frame.",
    movement: "The authored side sequence illustrates a loose hem moving outward. Real movement during wear cannot be verified from the fixture.",
    surface: "A plain-looking weave and a lightly creased cuff appear in the prepared reference detail.",
    hero: true,
});
const ids = new Set(CATALOG.map((listing) => listing.id));
const categories: Listing["category"][] = [
    "Tops",
    "Knitwear",
    "Shirts",
    "Bottoms",
    "Dresses",
    "Outerwear",
];
const statuses: ReviewStatus[] = [
    "unreviewed",
    "confirmed",
    "corrected",
    "unsure",
];
const orderStatuses: OrderStatus[] = [
    "reserved",
    "confirmed",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
    "expired",
    "disputed",
];
const lifecycle: OrderStatus[] = [
    "reserved",
    "confirmed",
    "packed",
    "shipped",
    "delivered",
];
const isPrice = (value: unknown): value is number => typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 9999;
const isSize = (value: unknown): value is Listing["size"] => value === "S" || value === "M" || value === "L";
const cleanText = (value: unknown, max: number): string | undefined => typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= max
    ? value.trim()
    : undefined;
const record = (value: unknown): Record<string, unknown> | undefined => value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const uniqueIds = (value: unknown, allowed: ReadonlySet<string> = ids): string[] => Array.isArray(value)
    ? [
        ...new Set(value.filter((id): id is string => typeof id === "string" && allowed.has(id))),
    ]
    : [];
function orderItemSnapshots(value: unknown, items: string[], total: number, templates: ReadonlyMap<string, string> = new Map()): readonly OrderItemSnapshot[] | undefined {
    if (!Array.isArray(value) || value.length !== items.length)
        return undefined;
    const snapshots: OrderItemSnapshot[] = [];
    for (let i = 0; i < items.length; i++) {
        const item = record(value[i]), name = cleanText(item?.name, 100), condition = cleanText(item?.condition, 200);
        if (!item ||
            item.id !== items[i] ||
            !name ||
            !condition ||
            !isPrice(item.price) ||
            !isSize(item.size) ||
            !validPoster(item.poster, templates.get(items[i]) ?? items[i]))
            return undefined;
        snapshots.push(Object.freeze({
            id: items[i],
            name,
            price: item.price,
            size: item.size,
            poster: item.poster,
            condition,
        }));
    }
    if (Math.round((snapshots.reduce((sum, item) => sum + item.price, 0) + SHIPPING) * 100) !== Math.round(total * 100))
        return undefined;
    return Object.freeze(snapshots);
}
function comparisonContext(value: unknown, previous: ComparisonContext, allowed: ReadonlySet<string> = ids): ComparisonContext {
    const input = record(value);
    if (!input)
        return { ...previous };
    const comparison = { ...previous };
    if (typeof input.listingId === "string" && allowed.has(input.listingId))
        comparison.listingId = input.listingId;
    if (PROPERTIES.includes(input.property as Property))
        comparison.property = input.property as Property;
    if (input.size === "All" || isSize(input.size))
        comparison.size = input.size;
    if (input.category === "All" ||
        categories.includes(input.category as Listing["category"]))
        comparison.category = input.category as ComparisonContext["category"];
    return comparison;
}
export function initialState(): AppState {
    const cloud = CATALOG[0];
    return {
        version: 1,
        saved: [],
        bag: [],
        checkoutMode: "bag",
        availability: Object.fromEntries(CATALOG.map((x) => [x.id, "active"])),
        selectedReference: REFERENCE.id,
        privateReferenceName: REFERENCE.name,
        referenceAvailable: true,
        comparison: { property: "Drape", size: "All", category: "All" },
        captureStage: 0,
        captureComplete: false,
        decisions: {},
        published: false,
        draft: {
            name: cloud.name,
            price: cloud.price,
            size: cloud.size,
            description: cloud.description,
        },
        orders: [],
        guided: false,
        paymentError: false,
        localListings: [], localDrafts: [], activeDraftId: "cloud-poplin", capturedSteps: [],
        privateReferences: [{ progressKind: "animated-demo", id: REFERENCE.id, templateId: REFERENCE.id, listing: REFERENCE, captureStage: 6, capturedSteps: [0, 1, 2, 3, 4, 5], ready: true }],
        feelIntent: { query: "", likes: [], dislikes: [], priority: "Drape", qualities: [], goal: "shape" },
    };
}
export function getListing(state: AppState, id: string): Listing | undefined {
    const privateRecord = state.privateReferences.find((x) => x.id === id);
    if (privateRecord)
        return referenceListing(privateRecord, state);
    if (id === REFERENCE.id)
        return undefined;
    if (state.availability[id] === "removed")
        return undefined;
    const listing = state.localListings.find((x) => x.id === id) ?? CATALOG.find((x) => x.id === id);
    const snapshot = state.publishedSnapshot;
    if (!listing || id !== "cloud-poplin" || !snapshot)
        return listing;
    return {
        ...(snapshot.listing ?? listing),
        ...snapshot.draft,
        evidence: listing.evidence.map((e) => {
            const decision = snapshot.decisions[e.property];
            if (!decision)
                return e;
            return {
                ...e,
                originalSupport: e.support,
                sellerStatus: decision.status,
                support: decision.status === "unsure" && e.support !== "unavailable"
                    ? "limited"
                    : e.support,
                ...(decision.status === "corrected"
                    ? { correctionNote: decision.note }
                    : {}),
            };
        }),
    };
}
export function allListings(state: AppState): Listing[] {
    return [...CATALOG, ...state.localListings].map((x) => getListing(state, x.id)).filter((listing): listing is Listing => listing !== undefined);
}
export const canPublish = (state: AppState) => state.captureComplete &&
    state.capturedSteps.length === 6 &&
    PROPERTIES.every((p) => {
        const d = state.decisions[p];
        return (d &&
            d.status !== "unreviewed" &&
            (d.status !== "corrected" || !!d.note.trim()));
    });
function copyPublishedSnapshot(state: Pick<AppState, "draft" | "decisions">): PublishedSnapshot {
    return {
        draft: { ...state.draft },
        decisions: Object.fromEntries(PROPERTIES.map((p) => [p, { ...state.decisions[p] }])),
    };
}
/** Public snapshots require a complete valid draft and a decision for every source property. */
function validatedSnapshot(value: unknown): PublishedSnapshot | undefined {
    const snapshot = record(value), draft = record(snapshot?.draft), rawDecisions = record(snapshot?.decisions);
    const name = cleanText(draft?.name, 100);
    if (!draft ||
        !name ||
        !isPrice(draft.price) ||
        !isSize(draft.size) ||
        typeof draft.description !== "string" ||
        draft.description.trim().length > 2000 ||
        !rawDecisions)
        return undefined;
    const decisions: AppState["decisions"] = {};
    for (const property of PROPERTIES) {
        const d = record(rawDecisions[property]);
        if (!d ||
            !statuses.includes(d.status as ReviewStatus) ||
            d.status === "unreviewed" ||
            typeof d.note !== "string" ||
            d.note.trim().length > 2000 ||
            (d.status === "corrected" && !d.note.trim()))
            return undefined;
        decisions[property] = {
            status: d.status as ReviewStatus,
            note: d.note.trim(),
        };
    }
    return {
        draft: {
            name,
            price: draft.price,
            size: draft.size,
            description: draft.description.trim(),
        },
        decisions,
        ...(snapshot?.listing && validLocalListing(snapshot.listing, "cloud-poplin") ? { listing: validLocalListing(snapshot.listing, "cloud-poplin")! } : {}),
    };
}
const retakeProperties: Record<number, Property[]> = {
    0: PROPERTIES,
    1: ["Stretch"],
    2: [],
    3: ["Surface"],
    4: ["Drape", "Movement"],
    5: ["Surface"],
};
function updateOrder(state: AppState, order: Order, updated: Order, availability = state.availability): AppState {
    return {
        ...state,
        orders: state.orders.map((x) => (x.id === order.id ? updated : x)),
        availability,
    };
}
const stepValid = (value: number) => Number.isInteger(value) && value >= 0 && value < 6;
const recordingProperties: Record<number, Property[]> = { 0: ["Drape"], 1: ["Drape"], 2: ["Surface"], 3: ["Movement"], 4: ["Stretch"], 5: ["Surface"] };
const cloneListing = (listing: Listing): Listing => ({ ...listing, feelDescription: listing.feelDescription ? { ...listing.feelDescription } : undefined, measurements: { ...listing.measurements }, feelNotes: listing.feelNotes ? [...listing.feelNotes] : undefined, evidence: listing.evidence.map(e => ({ ...e })) });
const isPublicId = (state: AppState, id: string) => ids.has(id) || state.localListings.some(x => x.id === id);
const nextId = (prefix: string, values: {
    id: string;
}[]) => { let n = 1; while (values.some(x => x.id === `${prefix}-${String(n).padStart(3, "0")}`))
    n++; return `${prefix}-${String(n).padStart(3, "0")}`; };
function templateFor(state: AppState, id?: string): Listing | undefined {
    if (!id)
        return CATALOG[0];
    if (id === REFERENCE.id)
        return REFERENCE;
    return CATALOG.find(x => x.id === id) ?? state.localListings.find(x => x.id === id);
}
function decisionsCopy(value: AppState["decisions"]) { return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, { ...v }])); }
function referenceListing(reference: PrivateReference, state: AppState): Listing {
    // Photo sources and descriptions exist independently of watching the animated instructions.
    const listing = cloneListing(reference.listing);
    if (reference.id === REFERENCE.id)
        listing.name = state.privateReferenceName;
    return listing;
}
export function allReferences(state: AppState): PrivateReference[] { return state.privateReferences; }
export const getPrivateReferences = allReferences;
export function getReference(state: AppState, id = state.selectedReference): Listing | undefined { return getListing(state, id); }
export const getSelectedReference = getReference;
export function getActiveReferenceCapture(state: AppState) {
    const reference = state.privateReferences.find(x => x.id === state.selectedReference);
    return reference ? { progressKind: "animated-demo" as const, stage: reference.captureStage, capturedSteps: reference.capturedSteps, templateId: reference.templateId, ready: reference.ready } : undefined;
}
export function getActiveDraft(state: AppState): LocalDraft {
    const active = state.localDrafts.find(x => x.id === state.activeDraftId);
    const listing = cloneListing(active?.listing ?? state.cloudDraftListing ?? CATALOG[0]);
    return { progressKind: "animated-demo", id: state.activeDraftId, templateId: active?.templateId ?? "cloud-poplin", listing: { ...listing, ...state.draft }, captureStage: state.captureStage, captureComplete: state.captureComplete, capturedSteps: [...state.capturedSteps], decisions: decisionsCopy(state.decisions), published: state.published };
}
function syncDraft(state: AppState): AppState {
    const active = getActiveDraft(state);
    return state.activeDraftId === "cloud-poplin" ? { ...state, cloudDraftListing: active.listing, cloudDraftSession: active } : { ...state, localDrafts: state.localDrafts.map(x => x.id === active.id ? active : x) };
}
function selectDraft(state: AppState, draft: LocalDraft): AppState {
    return { ...state, activeDraftId: draft.id, draft: { name: draft.listing.name, price: draft.listing.price, size: draft.listing.size, description: draft.listing.description }, captureStage: draft.captureStage, captureComplete: draft.captureComplete, capturedSteps: [...draft.capturedSteps], decisions: decisionsCopy(draft.decisions), published: draft.published };
}
function applyReview(listing: Listing, decisions: AppState["decisions"]): Listing {
    return { ...cloneListing(listing), evidence: listing.evidence.map(e => { const d = decisions[e.property]; return d ? { ...e, originalSupport: e.support, sellerStatus: d.status, support: d.status === "unsure" && e.support !== "unavailable" ? "limited" : e.support, ...(d.status === "corrected" ? { correctionNote: d.note } : {}) } : e; }) };
}
function validDelivery(value: unknown): DeliveryDetails | undefined { const raw = record(value), fullName = cleanText(raw?.fullName, 100), address = cleanText(raw?.address, 500); return fullName && address ? { fullName, address } : undefined; }
function textList(value: unknown, fallback: string[] = []): string[] { return Array.isArray(value) ? [...new Set(value.map(x => cleanText(x, 100)).filter((x): x is string => !!x))].slice(0, 12) : fallback; }
function cleanFeel(value: unknown, fallback: FeelIntent): FeelIntent {
    const raw = record(value);
    if (!raw)
        return fallback;
    const aliases: Record<string, string> = { "Smooth surface": "Smooth texture", "Crisp structure": "Crisp shape", "Relaxed drape": "Relaxed shape", "Textured finish": "Visible texture" };
    const choices = (value: unknown, previous: string[]) => textList(value, previous).map(x => aliases[x] ?? x);
    const priority = PROPERTIES.includes(raw.priority as Property) ? raw.priority as Property : fallback.priority;
    const goal = cleanText(raw.goal, 100) ?? fallback.goal;
    return { query: typeof raw.query === "string" && raw.query.length <= 300 ? raw.query : fallback.query, likes: choices(raw.likes, fallback.likes), dislikes: choices(raw.dislikes, fallback.dislikes), priority, qualities: choices(raw.qualities, fallback.qualities), goal: goal === "similar" ? priority === "Stretch" ? "give" : priority === "Surface" ? "texture" : "shape" : goal };
}
export const UNKNOWN_FEEL_DESCRIPTION: FeelDescription = { softness: "unknown", give: "unknown", shape: "unknown", texture: "unknown" };
export const FEEL_DESCRIPTION_VALUES: { [K in keyof FeelDescription]: readonly FeelDescription[K][] } = {
    softness: ["not-soft", "somewhat-soft", "very-soft", "unknown"],
    give: ["little", "some", "plenty", "unknown"],
    shape: ["relaxed", "balanced", "crisp", "unknown"],
    texture: ["smooth", "some-texture", "textured", "unknown"],
};
function validFeelDescription(value: unknown, strict = false): FeelDescription | undefined {
    const raw = record(value);
    if (!raw) return undefined;
    const result = { ...UNKNOWN_FEEL_DESCRIPTION };
    for (const key of Object.keys(result) as (keyof FeelDescription)[]) {
        const candidate = raw[key];
        if ((FEEL_DESCRIPTION_VALUES[key] as readonly unknown[]).includes(candidate))
            (result[key] as string) = candidate as string;
        else if (strict) return undefined;
    }
    return result;
}
function qualitySource(value: unknown): FeelDescriptionSource | undefined {
    return value === "seller" || value === "owner" || value === "prepared" ? value : undefined;
}
function editedListing(listing: Listing, value: unknown): Listing {
    const raw = record(value);
    if (!raw)
        return listing;
    const next = cloneListing(listing);
    if (Object.prototype.hasOwnProperty.call(raw, "feelDescription")) {
        next.feelDescription = validFeelDescription(raw.feelDescription) ?? { ...UNKNOWN_FEEL_DESCRIPTION };
        next.feelDescriptionSource = qualitySource(raw.feelDescriptionSource) ?? "prepared";
    }
    for (const key of ["name", "condition", "description", "material"] as const) {
        const max = key === "description" ? 2000 : key === "name" ? 100 : 300;
        const text = cleanText(raw[key], max);
        if (text)
            next[key] = text;
    }
    if (isPrice(raw.price))
        next.price = raw.price;
    if (isSize(raw.size))
        next.size = raw.size;
    if (categories.includes(raw.category as Listing["category"]))
        next.category = raw.category as Listing["category"];
    if (Array.isArray(raw.feelNotes))
        next.feelNotes = textList(raw.feelNotes);
    const measurements = record(raw.measurements);
    if (measurements)
        for (const key of ["chest", "length", "sleeve", "shoulder"] as const) {
            const v = measurements[key];
            if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 250)
                next.measurements[key] = v;
        }
    return next;
}
export function transition(state: AppState, action: Action): AppState {
    switch (action.type) {
        case "DESCRIBE_FEEL": {
            const qualities = validFeelDescription(action.qualities, true);
            if (!qualities) return state;
            const id = action.id ?? state.selectedReference;
            if (state.privateReferences.some(x => x.id === id)) {
                return { ...state, privateReferences: state.privateReferences.map(x => x.id === id ? { ...x, listing: { ...cloneListing(x.listing), feelDescription: qualities, feelDescriptionSource: "owner" } } : x) };
            }
            if (action.id === undefined || id !== state.activeDraftId) return state;
            const active = getActiveDraft(state);
            const listing: Listing = { ...active.listing, feelDescription: qualities, feelDescriptionSource: "seller" };
            const decisions = decisionsCopy(state.decisions);
            const reviewForQuality: Record<keyof FeelDescription, Property> = { softness: "Surface", give: "Stretch", shape: "Drape", texture: "Surface" };
            for (const key of Object.keys(qualities) as (keyof FeelDescription)[])
                if (active.listing.feelDescription?.[key] !== qualities[key]) delete decisions[reviewForQuality[key]];
            const next = { ...state, decisions, published: false };
            if (id === "cloud-poplin") next.cloudDraftListing = listing;
            else next.localDrafts = state.localDrafts.map(x => x.id === id ? { ...x, listing } : x);
            return syncDraft(next);
        }
        case "LOCAL_DRAFT_CREATE": {
            if (state.localDrafts.length >= 30)
                return state;
            const template = templateFor(state, action.templateId);
            if (!template)
                return state;
            const prior = syncDraft(state), id = nextId("local", [...state.localDrafts, ...state.localListings]);
            const draft: LocalDraft = { progressKind: "animated-demo", id, templateId: template.templateId ?? template.id, listing: { ...cloneListing(template), id, templateId: template.templateId ?? template.id, seller: "You" }, captureStage: 0, captureComplete: false, capturedSteps: [], decisions: {}, published: false };
            return selectDraft({ ...prior, localDrafts: [...prior.localDrafts, draft] }, draft);
        }
        case "LOCAL_DRAFT_SELECT": {
            if (action.id === state.activeDraftId)
                return state;
            const prior = syncDraft(state);
            const draft = action.id === "cloud-poplin" ? prior.cloudDraftSession : prior.localDrafts.find(x => x.id === action.id);
            return draft ? selectDraft(prior, draft) : state;
        }
        case "LOCAL_DRAFT_UPDATE": {
            const active = getActiveDraft(state), listing = editedListing(active.listing, action.listing);
            const next = { ...state, draft: { name: listing.name, price: listing.price, size: listing.size, description: listing.description }, published: false };
            if (state.activeDraftId === "cloud-poplin")
                next.cloudDraftListing = listing;
            else
                next.localDrafts = state.localDrafts.map(x => x.id === state.activeDraftId ? { ...x, listing } : x);
            return syncDraft(next);
        }
        case "RECORDING_COMPLETE": {
            if (!stepValid(action.step) || state.captureStage !== action.step || state.capturedSteps.includes(action.step))
                return state;
            // This stores completed walkthrough steps, never garment recordings or new material evidence.
            return syncDraft({ ...state, capturedSteps: [...state.capturedSteps, action.step] });
        }
        case "RECORDING_NEXT": {
            if (state.captureStage >= 6 || !state.capturedSteps.includes(state.captureStage))
                return state;
            const stage = state.captureStage + 1;
            return syncDraft({ ...state, captureStage: stage, captureComplete: state.capturedSteps.length === 6 });
        }
        case "RECORDING_PREVIOUS": {
            return state.captureStage > 0 ? syncDraft({ ...state, captureStage: state.captureStage - 1 }) : state;
        }
        case "RECORDING_VIEW": {
            return stepValid(action.step) && (action.step === state.captureStage || state.capturedSteps.includes(action.step))
                ? syncDraft({ ...state, captureStage: action.step }) : state;
        }
        case "RECORDING_RETRY": {
            if (!stepValid(action.step))
                return state;
            const decisions = { ...state.decisions };
            for (const p of recordingProperties[action.step])
                delete decisions[p];
            return syncDraft({ ...state, captureStage: action.step, captureComplete: false, capturedSteps: state.capturedSteps.filter(x => x !== action.step), decisions, published: false });
        }
        case "REFERENCE_CREATE":
        case "REFERENCE_CAPTURE_START": {
            if (state.privateReferences.length >= 30)
                return state;
            const template = templateFor(state, action.templateId ?? REFERENCE.id);
            if (!template)
                return state;
            const id = nextId("private", state.privateReferences), templateId = template.templateId ?? template.id;
            const reference: PrivateReference = { progressKind: "animated-demo", id, templateId, listing: { ...cloneListing(template), id, templateId, name: template.id === REFERENCE.id ? REFERENCE.name : `My ${template.name.toLowerCase()}`, seller: "You · private reference", condition: "Private · your familiar garment" }, captureStage: 0, capturedSteps: [], ready: false };
            return { ...state, privateReferences: [...state.privateReferences, reference], selectedReference: id };
        }
        case "REFERENCE_FROM_ORDER": {
            const order = state.orders.find(x => x.id === action.orderId), item = order?.itemSnapshots?.find(x => x.id === action.itemId);
            if (!order || !["delivered", "disputed"].includes(order.status) || !item)
                return state;
            const next = transition(state, { type: "REFERENCE_CREATE", templateId: item.id });
            if (next === state)
                return state;
            return { ...next, privateReferences: next.privateReferences.map(x => x.id === next.selectedReference ? { ...x, listing: { ...x.listing, name: item.name, size: item.size, poster: item.poster, description: "Your purchase-time garment saved privately. Describe its feel and follow the animated guide to add comparison details." } } : x) };
        }
        case "REFERENCE_RECORDING_COMPLETE":
        case "REFERENCE_RECORDING_NEXT":
        case "REFERENCE_RECORDING_PREVIOUS":
        case "REFERENCE_RECORDING_VIEW":
        case "REFERENCE_RECORDING_RETAKE":
        case "REFERENCE_RECORDING_RETRY":
        case "REFERENCE_FINISH":
        case "REFERENCE_CAPTURE_SAVE": {
            const ref = state.privateReferences.find(x => x.id === state.selectedReference);
            if (!ref)
                return state;
            let next = ref;
            if (action.type === "REFERENCE_RECORDING_COMPLETE") {
                if (!stepValid(action.step) || ref.captureStage !== action.step || ref.capturedSteps.includes(action.step))
                    return state;
                next = { ...ref, capturedSteps: [...ref.capturedSteps, action.step], ready: false };
            }
            else if (action.type === "REFERENCE_RECORDING_NEXT") {
                if (ref.captureStage >= 6 || !ref.capturedSteps.includes(ref.captureStage))
                    return state;
                next = { ...ref, captureStage: ref.captureStage + 1 };
            }
            else if (action.type === "REFERENCE_RECORDING_PREVIOUS") {
                if (ref.captureStage === 0) return state;
                next = { ...ref, captureStage: ref.captureStage - 1 };
            }
            else if (action.type === "REFERENCE_RECORDING_VIEW") {
                if (!stepValid(action.step) || (action.step !== ref.captureStage && !ref.capturedSteps.includes(action.step))) return state;
                next = { ...ref, captureStage: action.step };
            }
            else if (action.type === "REFERENCE_RECORDING_RETAKE" || action.type === "REFERENCE_RECORDING_RETRY") {
                if (!stepValid(action.step))
                    return state;
                next = { ...ref, captureStage: action.step, capturedSteps: ref.capturedSteps.filter(x => x !== action.step), ready: false };
            }
            else {
                if (ref.captureStage !== 6 || ref.capturedSteps.length !== 6)
                    return state;
                const name = action.type === "REFERENCE_CAPTURE_SAVE" ? cleanText(action.name, 100) : undefined;
                next = { ...ref, ready: true, listing: name ? { ...ref.listing, name } : ref.listing };
            }
            return { ...state, privateReferences: state.privateReferences.map(x => x.id === ref.id ? next : x) };
        }
        case "REFERENCE_RENAME": {
            const id = action.id ?? state.selectedReference, name = cleanText(action.name, 100);
            if (!name || !state.privateReferences.some(x => x.id === id))
                return state;
            return { ...state, privateReferenceName: id === REFERENCE.id ? name : state.privateReferenceName, privateReferences: state.privateReferences.map(x => x.id === id ? { ...x, listing: { ...x.listing, name } } : x) };
        }
        case "REFERENCE_DELETE": {
            // Legacy callers delete the default reference; new callers may identify another explicitly.
            const id = action.id ?? (state.privateReferences.some(x => x.id === state.selectedReference) ? state.selectedReference : REFERENCE.id);
            if (!state.privateReferences.some(x => x.id === id))
                return state;
            const privateReferences = state.privateReferences.filter(x => x.id !== id);
            return { ...state, privateReferences, referenceAvailable: id === REFERENCE.id ? false : state.referenceAvailable, selectedReference: state.selectedReference === id || action.id === undefined ? privateReferences[0]?.id ?? "" : state.selectedReference };
        }
        case "REFERENCE_RESTORE": {
            if (state.privateReferences.some(x => x.id === REFERENCE.id))
                return state;
            return { ...state, referenceAvailable: true, privateReferenceName: REFERENCE.name, selectedReference: REFERENCE.id, privateReferences: [{ progressKind: "animated-demo", id: REFERENCE.id, templateId: REFERENCE.id, listing: cloneListing(REFERENCE), captureStage: 6, capturedSteps: [0, 1, 2, 3, 4, 5], ready: true }, ...state.privateReferences] };
        }
        case "FEEL_INTENT": {
            const feelIntent = cleanFeel(action.intent, state.feelIntent);
            return JSON.stringify(feelIntent) === JSON.stringify(state.feelIntent) ? state : { ...state, feelIntent };
        }
        case "PUBLISH": {
            if (!canPublish(state) || state.published)
                return state;
            const active = getActiveDraft(state), listing = applyReview(active.listing, state.decisions);
            if (state.activeDraftId !== "cloud-poplin") {
                const previous = state.localListings.find(x => x.id === active.id), localListings = previous ? state.localListings.map(x => x.id === active.id ? listing : x) : [...state.localListings, listing];
                return syncDraft({ ...state, localListings, published: true, availability: { ...state.availability, [active.id]: state.availability[active.id] ?? "active" } });
            }
            return syncDraft({ ...state, published: true, publishedSnapshot: { ...copyPublishedSnapshot(state), listing: cloneListing(active.listing) } });
        }
    }
    const next = transitionLegacy(state, action);
    if (next === state)
        return state;
    if (action.type === "CAPTURE_NEXT")
        return syncDraft({ ...next, capturedSteps: [...new Set([...state.capturedSteps, state.captureStage])].filter(stepValid) });
    if (["DRAFT", "DECIDE", "CAPTURE_BACK", "CAPTURE_RETAKE"].includes(action.type))
        return syncDraft(next);
    return next;
}
function transitionLegacy(state: AppState, action: Action): AppState {
    switch (action.type) {
        case "SAVE":
            return isPublicId(state, action.id)
                ? {
                    ...state,
                    saved: state.saved.includes(action.id)
                        ? state.saved.filter((x) => x !== action.id)
                        : [...state.saved, action.id],
                }
                : state;
        case "BAG_ADD": {
            if (!isPublicId(state, action.id) || state.availability[action.id] !== "active")
                return state;
            const bagState = bagCheckoutState(state);
            return state.bag.includes(action.id)
                ? bagState
                : { ...bagState, bag: [...state.bag, action.id], paymentError: false };
        }
        case "BUY_NOW":
            return isPublicId(state, action.id) && state.availability[action.id] === "active"
                ? {
                    ...state,
                    checkoutMode: "buy-now",
                    buyNowId: action.id,
                    paymentError: false,
                }
                : state;
        case "BAG_VIEW":
            return bagCheckoutState(state);
        case "LISTING_PAUSE":
        case "LISTING_REMOVE":
        case "LISTING_RESUME": {
            if (action.id !== "cloud-poplin" && !state.localListings.some(x => x.id === action.id))
                return state;
            const current = state.availability[action.id];
            const allowed = action.type === "LISTING_PAUSE"
                ? current === "active"
                : action.type === "LISTING_REMOVE"
                    ? current === "active" || current === "paused"
                    : current === "paused" || current === "removed";
            if (!allowed)
                return state;
            const status: Availability = action.type === "LISTING_PAUSE"
                ? "paused"
                : action.type === "LISTING_REMOVE"
                    ? "removed"
                    : "active";
            return {
                ...state,
                availability: { ...state.availability, [action.id]: status },
            };
        }
        case "COMPARISON": {
            const comparison = comparisonContext(action.comparison, state.comparison, new Set([...ids, ...state.localListings.map(x => x.id)]));
            return comparison.listingId !== state.comparison.listingId ||
                comparison.property !== state.comparison.property ||
                comparison.size !== state.comparison.size ||
                comparison.category !== state.comparison.category
                ? { ...state, comparison }
                : state;
        }
        case "BAG_REMOVE":
            return state.bag.includes(action.id)
                ? {
                    ...state,
                    bag: state.bag.filter((x) => x !== action.id),
                    paymentError: false,
                }
                : state;
        case "REFERENCE":
            return getListing(state, action.id) &&
                action.id !== state.selectedReference
                ? { ...state, selectedReference: action.id }
                : state;
        case "REFERENCE_RENAME": {
            const name = cleanText(action.name, 100);
            return state.referenceAvailable &&
                name &&
                name !== state.privateReferenceName
                ? { ...state, privateReferenceName: name }
                : state;
        }
        case "REFERENCE_DELETE":
            return state.referenceAvailable
                ? { ...state, referenceAvailable: false, selectedReference: "" }
                : state;
        case "REFERENCE_RESTORE":
            return !state.referenceAvailable
                ? {
                    ...state,
                    referenceAvailable: true,
                    privateReferenceName: REFERENCE.name,
                    selectedReference: REFERENCE.id,
                }
                : state;
        case "CAPTURE_NEXT": {
            if (state.captureStage >= 6)
                return state;
            const stage = state.captureStage + 1;
            return { ...state, captureStage: stage, captureComplete: stage === 6 };
        }
        case "CAPTURE_BACK":
            return state.captureStage > 0
                ? {
                    ...state,
                    captureStage: state.captureStage - 1,
                    captureComplete: false,
                    published: false,
                }
                : state;
        case "CAPTURE_RETAKE": {
            if (!Number.isInteger(action.stage) ||
                action.stage < 0 ||
                action.stage > 5)
                return state;
            const decisions = { ...state.decisions };
            for (const p of retakeProperties[action.stage])
                delete decisions[p];
            return {
                ...state,
                captureStage: action.stage,
                captureComplete: false,
                decisions,
                published: false,
            };
        }
        case "DECIDE": {
            if (!state.captureComplete ||
                !PROPERTIES.includes(action.property) ||
                !statuses.includes(action.status))
                return state;
            const note = typeof action.note === "string" ? action.note.trim() : "";
            if (note.length > 2000 || (action.status === "corrected" && !note))
                return state;
            return {
                ...state,
                decisions: {
                    ...state.decisions,
                    [action.property]: { status: action.status, note },
                },
                published: false,
            };
        }
        case "PUBLISH":
            return canPublish(state) && !state.published
                ? {
                    ...state,
                    published: true,
                    publishedSnapshot: copyPublishedSnapshot(state),
                }
                : state;
        case "DRAFT": {
            const draft = { ...state.draft };
            const name = cleanText(action.draft.name, 100);
            if (name)
                draft.name = name;
            if (isPrice(action.draft.price))
                draft.price = action.draft.price;
            if (isSize(action.draft.size))
                draft.size = action.draft.size;
            if (typeof action.draft.description === "string" &&
                action.draft.description.trim().length <= 2000)
                draft.description = action.draft.description.trim();
            return Object.keys(draft).some((k) => draft[k as keyof typeof draft] !==
                state.draft[k as keyof typeof draft])
                ? { ...state, draft, published: false }
                : state;
        }
        case "CHECKOUT": {
            const items = checkoutItems(state);
            if (!items.length ||
                items.some((id) => !isPublicId(state, id) || state.availability[id] !== "active"))
                return state;
            if (action.payment === "declined")
                return { ...state, paymentError: true };
            if (action.payment !== "success")
                return state;
            const availability = { ...state.availability };
            for (const id of items)
                availability[id] = "reserved";
            const itemSnapshots = Object.freeze(items.map((id) => {
                const listing = getListing(state, id)!;
                return Object.freeze({
                    id,
                    name: listing.name,
                    price: listing.price,
                    size: listing.size,
                    poster: listing.poster,
                    condition: listing.condition,
                });
            }));
            let sequence = state.orders.length + 1;
            const existingOrderIds = new Set(state.orders.map((order) => order.id));
            while (existingOrderIds.has(`FAM-${String(sequence).padStart(4, "0")}`))
                sequence++;
            const order: Order = {
                id: `FAM-${String(sequence).padStart(4, "0")}`,
                items: [...items],
                itemSnapshots,
                total: Math.round((itemSnapshots.reduce((total, item) => total + item.price, 0) +
                    SHIPPING) *
                    100) / 100,
                status: "reserved",
                ...(validDelivery(action.delivery) ? { delivery: validDelivery(action.delivery) } : {}),
                ...(action.paymentMethod === "card" || action.paymentMethod === "wallet" ? { paymentMethod: action.paymentMethod } : {}),
                createdAt: new Date(Date.UTC(2026, 9, 13, 12, sequence - 1)).toISOString(),
            };
            return {
                ...bagCheckoutState(state),
                bag: state.bag.filter((id) => !items.includes(id)),
                availability,
                orders: [...state.orders, order],
                paymentError: false,
            };
        }
        case "ORDER_ADVANCE": {
            const order = state.orders.find((x) => x.id === action.id);
            if (!order)
                return state;
            const index = lifecycle.indexOf(order.status);
            if (index < 0 || index === lifecycle.length - 1)
                return state;
            const availability = { ...state.availability };
            for (const id of order.items)
                availability[id] = "sold";
            return updateOrder(state, order, { ...order, status: lifecycle[index + 1] }, availability);
        }
        case "ORDER_CANCEL":
        case "ORDER_EXPIRE": {
            const order = state.orders.find((x) => x.id === action.id);
            if (!order || !["reserved", "confirmed"].includes(order.status))
                return state;
            const availability = { ...state.availability };
            for (const id of order.items)
                availability[id] = "active";
            return updateOrder(state, order, {
                ...order,
                status: action.type === "ORDER_CANCEL" ? "cancelled" : "expired",
            }, availability);
        }
        case "ORDER_DISPUTE": {
            const order = state.orders.find((x) => x.id === action.id);
            const note = cleanText(action.note, 2000);
            return order?.status === "delivered" && note
                ? updateOrder(state, order, {
                    ...order,
                    status: "disputed",
                    disputeNote: note,
                })
                : state;
        }
        case "ORDER_FEEDBACK": {
            const order = state.orders.find((x) => x.id === action.id);
            const note = typeof action.note === "string" ? action.note.trim() : "";
            return order?.status === "delivered" &&
                ["as-expected", "different"].includes(action.fit) &&
                note.length <= 2000
                ? updateOrder(state, order, {
                    ...order,
                    feedback: { fit: action.fit, note },
                })
                : state;
        }
        case "GUIDE":
            return typeof action.value === "boolean" && action.value !== state.guided
                ? { ...state, guided: action.value }
                : state;
        case "RESET":
            return initialState();
        default:
            return state;
    }
}
/** Recorded discovery orders are authored examples grounded in the supplied source silhouettes/weaves. */
export const MATCH_DISCOVERY_ORDER: Record<Property, readonly string[]> = {
    Drape: ["cloud-poplin", "airloom-linen", "moss-knit"],
    Movement: ["airloom-linen", "cloud-poplin", "moss-knit"],
    Stretch: ["moss-knit", "oat-vest"],
    Surface: ["cloud-poplin", "airloom-linen", "petal-tee"],
};
const discoveryBasis: Record<Property, string> = {
    Drape: "Source silhouettes: structured blouse, relaxed overshirt, then open knit.",
    Movement: "Limited source sequences: relaxed overshirt, structured blouse, then open knit. Movement during wear remains unverified.",
    Stretch: "Limited source details: ribbed cardigan, then ribbed vest. Rib structure does not establish stretch or recovery.",
    Surface: "Source weave details: fine plain weave, textured plain weave, then fine jersey-like lines.",
};
/** Focus changes candidate discovery, while evidence always stays in Drape/Movement/Stretch/Surface order. */
export function rankMatches(state: AppState, reference: Listing, property?: Property, filters: MatchFilters = {}): MatchResult[] {
    const focus: Property = property && PROPERTIES.includes(property) ? property : "Drape";
    const priority = MATCH_DISCOVERY_ORDER[focus];
    const sequence = [
        ...priority,
        ...allListings(state).map((x) => x.id).filter((id) => !priority.includes(id)),
    ];
    const evidenceFor = (listing: Listing, p: Property) => listing.evidence.find((e) => e.property === p);
    return allListings(state)
        .filter((x) => x.id !== reference.id &&
        state.availability[x.id] === "active" &&
        (!filters.size || filters.size === "All" || x.size === filters.size) &&
        (!filters.category ||
            filters.category === "All" ||
            x.category === filters.category))
        .sort((a, b) => sequence.indexOf(a.id) - sequence.indexOf(b.id))
        .slice(0, 3)
        .map((listing) => ({
        listing,
        discoveryKind: "authored-fixture-order",
        discoveryReason: `${discoveryBasis[focus]} ${priority.includes(listing.id) ? "This candidate appears in the recorded priority sequence." : "Remaining candidates follow catalog order after the priority sequence."} Active inventory and filters determine eligibility; comparisons use source frames.`,
        properties: PROPERTIES.map((p) => {
            const candidate = evidenceFor(listing, p), familiar = evidenceFor(reference, p);
            const support: Support = !candidate ||
                !familiar ||
                candidate.support === "unavailable" ||
                familiar.support === "unavailable"
                ? "unavailable"
                : candidate.support === "limited" || familiar.support === "limited"
                    ? "limited"
                    : "supported";
            const evidenceCount = support === "unavailable" ? 0 : 2;
            const explanation = support === "unavailable"
                ? `A property comparison is unavailable: ${!familiar || familiar.support === "unavailable" ? "the reference" : "the candidate"} source lacks supported ${p.toLowerCase()} evidence. No material behaviour is inferred.`
                : `${support === "limited" ? "Limited source comparison" : "Visible source comparison"}: ${listing.name} — ${candidate!.observation} Reference — ${familiar!.observation} Two prepared frames; this does not establish feel or fit.`;
            return { property: p, support, explanation, evidenceCount };
        }),
    }));
}
export function money(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value);
}
function validPoster(value: unknown, templateId: string): value is string {
    return typeof value === "string" && (value === `/posters/${templateId}.svg` || value === coverFor(templateId) || mediaFor(templateId).photos.some(x => x.src === value));
}
function validLocalListing(value: unknown, forcedId?: string): Listing | undefined {
    const raw = record(value), id = forcedId ?? cleanText(raw?.id, 100), templateId = cleanText(raw?.templateId, 100);
    const template = templateId === REFERENCE.id ? REFERENCE : CATALOG.find(x => x.id === templateId);
    if (!raw || !id || (!forcedId && !/^local-\d{3,6}$/.test(id)) || !template || (forcedId && template.id !== forcedId) || !isPrice(raw.price) || !isSize(raw.size) || !cleanText(raw.name, 100) || (typeof raw.description !== "string" || raw.description.length > 2000) || !validPoster(raw.poster, template.id))
        return undefined;
    const result = { ...editedListing(template, raw), id, templateId: template.id, poster: raw.poster, seller: forcedId ? template.seller : "You" };
    const rawEvidence = Array.isArray(raw.evidence) ? raw.evidence : [];
    result.evidence = result.evidence.map(e => {
        const rawEntry = record(rawEvidence.find(x => record(x)?.property === e.property));
        const status = statuses.includes(rawEntry?.sellerStatus as ReviewStatus) ? rawEntry!.sellerStatus as ReviewStatus : "unreviewed";
        const note = cleanText(rawEntry?.correctionNote, 2000);
        const recorded = e;
        return { ...recorded, sellerStatus: status, ...(["supported", "limited", "unavailable"].includes(rawEntry?.originalSupport as string) ? { originalSupport: rawEntry!.originalSupport as Support } : {}), ...(status === "corrected" && note ? { correctionNote: note } : {}), support: status === "unsure" && recorded.support !== "unavailable" ? "limited" : recorded.support };
    });
    return result;
}
function validDecisions(value: unknown): AppState["decisions"] {
    const raw = record(value), result: AppState["decisions"] = {};
    for (const property of PROPERTIES) {
        const d = record(raw?.[property]);
        if (!d || !statuses.includes(d.status as ReviewStatus) || typeof d.note !== "string" || d.note.length > 2000 || (d.status === "corrected" && !d.note.trim()))
            continue;
        result[property] = { status: d.status as ReviewStatus, note: d.note.trim() };
    }
    return result;
}
function validSteps(value: unknown): number[] { return Array.isArray(value) ? [...new Set(value.filter((x): x is number => typeof x === "number" && stepValid(x)))].sort((a, b) => a - b) : []; }
function validStage(value: unknown): number { return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6 ? value : 0; }
function validLocalDraft(value: unknown): LocalDraft | undefined {
    const raw = record(value), listing = validLocalListing(raw?.listing), id = cleanText(raw?.id, 100);
    if (!raw || !id || !listing || id !== listing.id || raw.templateId !== listing.templateId)
        return undefined;
    const captureStage = validStage(raw.captureStage), capturedSteps = validSteps(raw.capturedSteps), captureComplete = capturedSteps.length === 6 && raw.captureComplete === true, decisions = validDecisions(raw.decisions);
    return { progressKind: "animated-demo", id, listing, templateId: listing.templateId!, captureStage, capturedSteps, captureComplete, decisions, published: raw.published === true && captureComplete && PROPERTIES.every(p => decisions[p] && decisions[p].status !== "unreviewed") };
}
function validPrivateReference(value: unknown): PrivateReference | undefined {
    const raw = record(value), listingRaw = record(raw?.listing), id = cleanText(raw?.id, 100), templateId = cleanText(raw?.templateId, 100), template = templateId === REFERENCE.id ? REFERENCE : CATALOG.find(x => x.id === templateId);
    if (!raw || !id || (id !== REFERENCE.id && !/^private-\d{3,6}$/.test(id)) || !template || !listingRaw || listingRaw.id !== id || !cleanText(listingRaw.name, 100) || !validPoster(listingRaw.poster, template.id))
        return undefined;
    const captureStage = validStage(raw.captureStage), capturedSteps = validSteps(raw.capturedSteps);
    let listing: Listing = { ...editedListing(template, listingRaw), id, templateId: template.id, poster: listingRaw.poster, seller: "You · private reference" };
    return { progressKind: "animated-demo", id, templateId: template.id, listing, captureStage, capturedSteps, ready: raw.ready === true && capturedSteps.length === 6 };
}
/** Accept only known schema values. Orphan reservations recover to active; sold inventory remains conservative. */
export function sanitizeStoredState(value: unknown): AppState {
    const raw = record(value), base = initialState();
    if (!raw || raw.version !== 1)
        return base;
    const localDrafts = Array.isArray(raw.localDrafts)
        ? raw.localDrafts.slice(0, 30).map(validLocalDraft).filter((x): x is LocalDraft => !!x).filter((x, i, all) => all.findIndex(y => y.id === x.id) === i) : [];
    const localListings = Array.isArray(raw.localListings)
        ? raw.localListings.slice(0, 30).map(x => validLocalListing(x)).filter((x): x is Listing => !!x)
            .filter((x, i, all) => all.findIndex(y => y.id === x.id) === i && localDrafts.some(d => d.id === x.id && d.templateId === x.templateId) && x.evidence.every(e => e.sellerStatus !== "unreviewed" && (e.sellerStatus !== "corrected" || !!e.correctionNote))) : [];
    const allowedIds = new Set([...ids, ...localListings.map(x => x.id)]);
    const templates = new Map(localListings.map(x => [x.id, x.templateId!]));
    const privateReferences = Array.isArray(raw.privateReferences)
        ? raw.privateReferences.slice(0, 30).map(validPrivateReference).filter((x): x is PrivateReference => !!x).filter((x, i, all) => all.findIndex(y => y.id === x.id) === i)
        : raw.referenceAvailable === false ? [] : base.privateReferences;
    const availability = { ...base.availability };
    for (const listing of localListings)
        availability[listing.id] = "active";
    const rawAvailability = record(raw.availability);
    for (const id of allowedIds)
        if (rawAvailability?.[id] === "sold")
            availability[id] = "sold";
    if (rawAvailability?.["cloud-poplin"] === "paused" ||
        rawAvailability?.["cloud-poplin"] === "removed")
        availability["cloud-poplin"] = rawAvailability["cloud-poplin"];
    for (const listing of localListings)
        if (rawAvailability?.[listing.id] === "paused" || rawAvailability?.[listing.id] === "removed")
            availability[listing.id] = rawAvailability[listing.id] as Availability;
    const orders: Order[] = [];
    const orderIds = new Set<string>(), claimed = new Set<string>();
    if (Array.isArray(raw.orders))
        for (const item of raw.orders.slice(0, 500)) {
            const order = record(item);
            if (!order)
                continue;
            const id = cleanText(order.id, 100), items = uniqueIds(order.items, allowedIds), status = order.status as OrderStatus;
            if (!id ||
                orderIds.has(id) ||
                !items.length ||
                !Array.isArray(order.items) ||
                items.length !== order.items.length ||
                !orderStatuses.includes(status) ||
                typeof order.total !== "number" ||
                !Number.isFinite(order.total) ||
                order.total <= 0 ||
                order.total > allowedIds.size * 9999 + SHIPPING ||
                typeof order.createdAt !== "string" ||
                !Number.isFinite(Date.parse(order.createdAt)))
                continue;
            const occupying = !["cancelled", "expired"].includes(status);
            if (occupying && items.some((id) => claimed.has(id)))
                continue;
            const disputeNote = cleanText(order.disputeNote, 2000);
            if (status === "disputed" && !disputeNote)
                continue;
            const output: Order = {
                id,
                items,
                total: order.total,
                status,
                createdAt: order.createdAt,
            };
            if (disputeNote)
                output.disputeNote = disputeNote;
            const delivery = validDelivery(order.delivery);
            if (delivery)
                output.delivery = delivery;
            if (order.paymentMethod === "card" || order.paymentMethod === "wallet")
                output.paymentMethod = order.paymentMethod;
            const snapshots = orderItemSnapshots(order.itemSnapshots, items, order.total, templates);
            if (snapshots)
                output.itemSnapshots = snapshots;
            const feedback = record(order.feedback);
            if (feedback &&
                (feedback.fit === "as-expected" || feedback.fit === "different") &&
                typeof feedback.note === "string" &&
                feedback.note.trim().length <= 2000 &&
                (status === "delivered" || status === "disputed"))
                output.feedback = { fit: feedback.fit, note: feedback.note.trim() };
            orders.push(output);
            orderIds.add(id);
            if (occupying)
                for (const id of items) {
                    claimed.add(id);
                    availability[id] = status === "reserved" ? "reserved" : "sold";
                }
        }
    const captureStage = typeof raw.captureStage === "number" &&
        Number.isInteger(raw.captureStage) &&
        raw.captureStage >= 0 &&
        raw.captureStage <= 6
        ? raw.captureStage
        : 0;
    const captureComplete = (Array.isArray(raw.capturedSteps) ? validSteps(raw.capturedSteps).length === 6 : captureStage === 6) && raw.captureComplete === true;
    const decisions: AppState["decisions"] = {};
    const rawDecisions = record(raw.decisions);
    for (const p of PROPERTIES) {
        const d = record(rawDecisions?.[p]);
        if (!d ||
            !statuses.includes(d.status as ReviewStatus) ||
            typeof d.note !== "string" ||
            d.note.trim().length > 2000 ||
            (d.status === "corrected" && !d.note.trim()))
            continue;
        decisions[p] = { status: d.status as ReviewStatus, note: d.note.trim() };
    }
    const rawDraft = record(raw.draft), draft = { ...base.draft };
    const name = cleanText(rawDraft?.name, 100);
    if (name)
        draft.name = name;
    if (isPrice(rawDraft?.price))
        draft.price = rawDraft.price;
    if (isSize(rawDraft?.size))
        draft.size = rawDraft.size;
    if (typeof rawDraft?.description === "string" &&
        rawDraft.description.trim().length <= 2000)
        draft.description = rawDraft.description.trim();
    const referenceAvailable = privateReferences.some(x => x.id === REFERENCE.id);
    const selectedReference = typeof raw.selectedReference === "string" &&
        (allowedIds.has(raw.selectedReference) ||
            privateReferences.some(x => x.id === raw.selectedReference))
        ? raw.selectedReference
        : privateReferences[0]?.id ?? "";
    const state: AppState = {
        ...base,
        comparison: comparisonContext(raw.comparison, base.comparison, allowedIds),
        saved: uniqueIds(raw.saved, allowedIds),
        bag: uniqueIds(raw.bag, allowedIds).filter((id) => availability[id] === "active"),
        availability,
        orders,
        captureStage,
        captureComplete,
        decisions,
        draft,
        referenceAvailable,
        selectedReference,
        privateReferenceName: cleanText(raw.privateReferenceName, 100) ?? base.privateReferenceName,
        guided: raw.guided === true,
        paymentError: raw.paymentError === true,
        published: false,
        localDrafts, localListings, privateReferences,
        activeDraftId: typeof raw.activeDraftId === "string" && localDrafts.some(x => x.id === raw.activeDraftId) ? raw.activeDraftId : "cloud-poplin",
        capturedSteps: Array.isArray(raw.capturedSteps) ? validSteps(raw.capturedSteps) : Array.from({ length: captureStage }, (_, i) => i).filter(stepValid),
        feelIntent: cleanFeel(raw.feelIntent, base.feelIntent),
    };
    if (raw.cloudDraftListing)
        state.cloudDraftListing = validLocalListing(raw.cloudDraftListing, "cloud-poplin");
    const cloudSession = record(raw.cloudDraftSession);
    if (cloudSession) {
        const listing = validLocalListing(cloudSession.listing, "cloud-poplin");
        if (listing)
            state.cloudDraftSession = { progressKind: "animated-demo", id: "cloud-poplin", templateId: "cloud-poplin", listing, captureStage: validStage(cloudSession.captureStage), capturedSteps: validSteps(cloudSession.capturedSteps), captureComplete: cloudSession.captureComplete === true && validSteps(cloudSession.capturedSteps).length === 6, decisions: validDecisions(cloudSession.decisions), published: cloudSession.published === true };
    }
    if (raw.checkoutMode === "buy-now" &&
        typeof raw.buyNowId === "string" &&
        allowedIds.has(raw.buyNowId) &&
        availability[raw.buyNowId] === "active") {
        state.checkoutMode = "buy-now";
        state.buyNowId = raw.buyNowId;
    }
    const snapshot = validatedSnapshot(raw.publishedSnapshot);
    if (snapshot)
        state.publishedSnapshot = snapshot;
    const currentSnapshot = validatedSnapshot({
        draft: raw.draft,
        decisions: raw.decisions,
    });
    state.published =
        raw.published === true &&
            canPublish(state) &&
            !!currentSnapshot &&
            (!snapshot || JSON.stringify({ draft: snapshot.draft, decisions: snapshot.decisions }) === JSON.stringify({ draft: currentSnapshot?.draft, decisions: currentSnapshot?.decisions }));
    if (state.published && !snapshot)
        state.publishedSnapshot = currentSnapshot;
    if (state.activeDraftId !== "cloud-poplin") {
        const active = localDrafts.find(x => x.id === state.activeDraftId)!;
        return selectDraft(state, active);
    }
    if (Array.isArray(raw.capturedSteps) && state.capturedSteps.length !== 6)
        state.captureComplete = false;
    return state;
}
export function checkoutItems(state: AppState): string[] {
    if (state.checkoutMode === "buy-now")
        return state.buyNowId &&
            isPublicId(state, state.buyNowId) &&
            state.availability[state.buyNowId] === "active"
            ? [state.buyNowId]
            : [];
    return [...state.bag];
}
function bagCheckoutState(state: AppState): AppState {
    if (state.checkoutMode === "bag" && state.buyNowId === undefined)
        return state;
    const { buyNowId: _discard, ...rest } = state;
    return { ...rest, checkoutMode: "bag", paymentError: false };
}
