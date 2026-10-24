/** Original listing photographs remain separate from AI-prepared catalogue covers. See docs/PHOTO_ASSET_PROVENANCE.md. */
export type PhotoKind = 'front' | 'back' | 'detail' | 'label' | 'wear';
export interface GarmentPhoto { id: string; kind: PhotoKind; label: string; src: string; width: number; height: number }
export interface GarmentMedia { photos: GarmentPhoto[]; credit: string; sourceUrl: string }
const registry: Record<string, GarmentMedia> = {
  "cloud-poplin": {
    "photos": [
      {
        "id": "cloud-poplin-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/cloud-poplin-front.webp",
        "width": 888,
        "height": 1232
      },
      {
        "id": "cloud-poplin-detail",
        "kind": "detail",
        "label": "Sleeve and cuff detail",
        "src": "/photos/cloud-poplin-detail.webp",
        "width": 1200,
        "height": 1200
      },
      {
        "id": "cloud-poplin-label",
        "kind": "label",
        "label": "Neck label and collar",
        "src": "/photos/cloud-poplin-label.webp",
        "width": 1200,
        "height": 1200
      },
      {
        "id": "cloud-poplin-detail-2",
        "kind": "detail",
        "label": "On-body example",
        "src": "/photos/cloud-poplin-detail-2.webp",
        "width": 1200,
        "height": 1600
      }
    ],
    "credit": "UNIQLO \u00b7 prepared photographic example",
    "sourceUrl": "https://www.uniqlo.com/id/en/products/E480074-000/00"
  },
  "moss-knit": {
    "photos": [
      {
        "id": "moss-knit-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/moss-knit-front.webp",
        "width": 800,
        "height": 1200
      },
      {
        "id": "moss-knit-back",
        "kind": "back",
        "label": "Back view",
        "src": "/photos/moss-knit-back.webp",
        "width": 800,
        "height": 1200
      },
      {
        "id": "moss-knit-detail",
        "kind": "detail",
        "label": "Knit and buttons: photo crop",
        "src": "/photos/moss-knit-detail.webp",
        "width": 528,
        "height": 636
      }
    ],
    "credit": "Select Trends \u00b7 prepared photographic example",
    "sourceUrl": "https://selecttrendsboutique.com/products/moss-green-button-up-cardigan"
  },
  "airloom-linen": {
    "photos": [
      {
        "id": "airloom-linen-front",
        "kind": "front",
        "label": "Full garment, flat",
        "src": "/photos/airloom-linen-front.webp",
        "width": 512,
        "height": 279
      },
      {
        "id": "airloom-linen-detail",
        "kind": "detail",
        "label": "Pocket and fabric: photo crop",
        "src": "/photos/airloom-linen-detail.webp",
        "width": 282,
        "height": 213
      }
    ],
    "credit": "Supplied Stitch export \u00b7 prepared photographic example",
    "sourceUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuDEoXikxmU-gTwvssBxS9vAHNVJ52knZeD8Gen-MsxlP4G0smh6DYM5xQPCtAraJRxY99-Rjgeh15cAQZsOejXIGp9Rie6BNs06KMog-ml9_v9hYieXFNccBh6EoKdL8GR6QIakcLk0h5-DssQkm9aubqkC49kAlEJc7dT0hZVJH6YNaZ_BuVmgnj1ahvkeKcxSXOBaJ8pQedumwL89IxHwTlGPCxzfOSJk6114973zCh0IWoPvS0KsXg"
  },
  "petal-tee": {
    "photos": [
      {
        "id": "petal-tee-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/petal-tee-front.webp",
        "width": 1067,
        "height": 1600
      },
      {
        "id": "petal-tee-back",
        "kind": "back",
        "label": "On-body back view",
        "src": "/photos/petal-tee-back.webp",
        "width": 869,
        "height": 1322
      },
      {
        "id": "petal-tee-detail",
        "kind": "detail",
        "label": "Jersey fabric detail",
        "src": "/photos/petal-tee-detail.webp",
        "width": 1067,
        "height": 1600
      }
    ],
    "credit": "H&M \u00b7 prepared photographic example",
    "sourceUrl": "https://www2.hm.com/en_us/productpage.0963662168.html"
  },
  "sunday-denim": {
    "photos": [
      {
        "id": "sunday-denim-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/sunday-denim-front.webp",
        "width": 912,
        "height": 1232
      },
      {
        "id": "sunday-denim-detail",
        "kind": "detail",
        "label": "Waistband and pocket detail",
        "src": "/photos/sunday-denim-detail.webp",
        "width": 1200,
        "height": 1200
      },
      {
        "id": "sunday-denim-detail-2",
        "kind": "detail",
        "label": "Denim weave detail",
        "src": "/photos/sunday-denim-detail-2.webp",
        "width": 1200,
        "height": 1200
      }
    ],
    "credit": "UNIQLO \u00b7 prepared photographic example",
    "sourceUrl": "https://www.uniqlo.com/id/en/products/E472120-000/00"
  },
  "ink-trousers": {
    "photos": [
      {
        "id": "ink-trousers-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/ink-trousers-front.webp",
        "width": 308,
        "height": 267
      },
      {
        "id": "ink-trousers-detail",
        "kind": "detail",
        "label": "Pleat and waistband: photo crop",
        "src": "/photos/ink-trousers-detail.webp",
        "width": 210,
        "height": 126
      }
    ],
    "credit": "Supplied Stitch export \u00b7 prepared photographic example",
    "sourceUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuCink8SAHRpFgtUWHcEMoGQAXC6RSJxIPQIIcMGc0yW1QI-0B6cKvYfD8FfTfWRufukp7Sg9IGD7ygYZMj4-ESi38L1U4WSSB6bMoUA3Fbba8jrqg5RWa3e4oPvSfgOTxcl6xvMe4nq3ktmE70zh2NwlmCqjohJFK8Zu3jGjm4yVfySPzvi4UknuLeLENw31SSrygzVzI5N-YeBadPbKQv0TZAFkzgW8PU2SNH6AQwgC_7cdGR_YU0HEw"
  },
  "apricot-slip": {
    "photos": [
      {
        "id": "apricot-slip-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/apricot-slip-front.webp",
        "width": 1200,
        "height": 1600
      },
      {
        "id": "apricot-slip-back",
        "kind": "back",
        "label": "On-body back view",
        "src": "/photos/apricot-slip-back.webp",
        "width": 1200,
        "height": 1600
      },
      {
        "id": "apricot-slip-detail",
        "kind": "detail",
        "label": "Bodice and fabric detail",
        "src": "/photos/apricot-slip-detail.webp",
        "width": 1200,
        "height": 1600
      }
    ],
    "credit": "COMMENSE \u00b7 prepared photographic example",
    "sourceUrl": "https://thecommense.com/products/satin-backless-slip-dress"
  },
  "tide-shirt": {
    "photos": [
      {
        "id": "tide-shirt-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/tide-shirt-front.webp",
        "width": 1067,
        "height": 1600
      },
      {
        "id": "tide-shirt-back",
        "kind": "back",
        "label": "On-body back view",
        "src": "/photos/tide-shirt-back.webp",
        "width": 970,
        "height": 1171
      },
      {
        "id": "tide-shirt-detail",
        "kind": "detail",
        "label": "Collar and stripe detail",
        "src": "/photos/tide-shirt-detail.webp",
        "width": 1067,
        "height": 1600
      }
    ],
    "credit": "H&M \u00b7 prepared photographic example",
    "sourceUrl": "https://www2.hm.com/en_us/productpage.1257417011.html"
  },
  "oat-vest": {
    "photos": [
      {
        "id": "oat-vest-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/oat-vest-front.webp",
        "width": 1067,
        "height": 1600
      },
      {
        "id": "oat-vest-detail",
        "kind": "detail",
        "label": "Ribbing and button detail",
        "src": "/photos/oat-vest-detail.webp",
        "width": 1067,
        "height": 1600
      }
    ],
    "credit": "H&M \u00b7 prepared photographic example",
    "sourceUrl": "https://www2.hm.com/en_us/productpage.1313249001.html"
  },
  "lilac-wrap": {
    "photos": [
      {
        "id": "lilac-wrap-front",
        "kind": "front",
        "label": "On-body front view",
        "src": "/photos/lilac-wrap-front.webp",
        "width": 1000,
        "height": 1275
      },
      {
        "id": "lilac-wrap-detail",
        "kind": "detail",
        "label": "Wrap and tie: photo crop",
        "src": "/photos/lilac-wrap-detail.webp",
        "width": 590,
        "height": 536
      }
    ],
    "credit": "ASOS / New Look \u00b7 prepared photographic example",
    "sourceUrl": "https://www.asos.com/new-look/new-look-wrap-blouse-in-lilac/prd/203170837"
  },
  "rose-jacket": {
    "photos": [
      {
        "id": "rose-jacket-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/rose-jacket-front.webp",
        "width": 1067,
        "height": 1600
      },
      {
        "id": "rose-jacket-back",
        "kind": "back",
        "label": "On-body back view",
        "src": "/photos/rose-jacket-back.webp",
        "width": 870,
        "height": 812
      },
      {
        "id": "rose-jacket-detail",
        "kind": "detail",
        "label": "Buttons and fabric detail",
        "src": "/photos/rose-jacket-detail.webp",
        "width": 1067,
        "height": 1600
      }
    ],
    "credit": "H&M \u00b7 prepared photographic example",
    "sourceUrl": "https://www2.hm.com/en_us/productpage.1315959003.html"
  },
  "sage-skirt": {
    "photos": [
      {
        "id": "sage-skirt-front",
        "kind": "front",
        "label": "On-body front view",
        "src": "/photos/sage-skirt-front.webp",
        "width": 1200,
        "height": 1200
      },
      {
        "id": "sage-skirt-back",
        "kind": "back",
        "label": "On-body back view",
        "src": "/photos/sage-skirt-back.webp",
        "width": 840,
        "height": 636
      },
      {
        "id": "sage-skirt-detail",
        "kind": "detail",
        "label": "Hem and gathered tier detail",
        "src": "/photos/sage-skirt-detail.webp",
        "width": 1200,
        "height": 1200
      }
    ],
    "credit": "SeamsFriendly \u00b7 prepared photographic example",
    "sourceUrl": "https://seamsfriendly.com/products/sage-green-100-cotton-tier-gathered-midi-skirt"
  },
  "my-blue-blouse": {
    "photos": [
      {
        "id": "my-blue-blouse-front",
        "kind": "front",
        "label": "Front view",
        "src": "/photos/my-blue-blouse-front.webp",
        "width": 888,
        "height": 1232
      },
      {
        "id": "my-blue-blouse-detail",
        "kind": "detail",
        "label": "Collar and placket: photo crop",
        "src": "/photos/my-blue-blouse-detail.webp",
        "width": 348,
        "height": 496
      },
      {
        "id": "my-blue-blouse-detail-2",
        "kind": "detail",
        "label": "Hem and sleeve: photo crop",
        "src": "/photos/my-blue-blouse-detail-2.webp",
        "width": 660,
        "height": 464
      }
    ],
    "credit": "UNIQLO \u00b7 prepared private reference example",
    "sourceUrl": "https://www.uniqlo.com/id/en/products/E475719-000/00?colorDisplayCode=61"
  }
};
export const PHOTO_IDS = Object.keys(registry);
export function mediaFor(id: string): GarmentMedia { return registry[id] ?? registry['cloud-poplin']; }

/** Catalogue-only representation; never use as an original photograph or condition proof. */
export interface CoverMedia {
  src: string;
  width: number;
  height: number;
  label: string;
  sourcePhotoId: string;
  kind: 'ai-reconstructed-demo';
  conditionProof: false;
}

const covers: Record<string, CoverMedia> = Object.fromEntries(PHOTO_IDS.map(id => [id, {
  src: `/covers/${id}.webp`,
  width: 800,
  height: 1000,
  label: 'Garment-only catalogue cover · AI-prepared demo',
  sourcePhotoId: `${id}-front`,
  kind: 'ai-reconstructed-demo' as const,
  conditionProof: false as const,
}]));

/** Metadata stays explicit so catalogue imagery cannot silently become evidence. */
export function photoCover(id: string): CoverMedia { return covers[id] ?? covers['cloud-poplin']; }
export function coverFor(id: string): string { return photoCover(id).src; }
