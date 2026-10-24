import { allListings, CATALOG, type AppState, type Listing } from './domain';

export function sellerId(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase());
}

export function sellerHref(name: string): string {
  return `/seller/${sellerId(name)}`;
}

export interface SellerProfile {
  id: string;
  name: string;
  listings: Listing[];
}

export function getSeller(state: AppState, id: string): SellerProfile | undefined {
  // Public inventory identifies sellers even when their last piece is unavailable.
  const seller = [...CATALOG, ...state.localListings].find(listing => sellerId(listing.seller) === id);
  if (!seller) return undefined;
  return {
    id,
    name: seller.seller,
    listings: allListings(state).filter(listing =>
      sellerId(listing.seller) === id && state.availability[listing.id] === 'active'
    ),
  };
}
