import { ArrowLeft, ArrowRight, Storefront } from '@phosphor-icons/react';
import { ProductCard } from './MarketplacePages';
import { Link } from './router';
import { getSeller } from './sellers';
import { useStore } from './store';

export function SellerPage({ id }: { id: string }) {
  const { state } = useStore();
  const seller = getSeller(state, id);
  if (!seller) return <section className="page empty seller-page">
    <Storefront size={35} aria-hidden="true"/>
    <h1>This wardrobe isn’t here.</h1>
    <p>Explore the available pieces and meet their sellers.</p>
    <Link className="button primary" href="/shop">Browse the edit <ArrowRight size={18}/></Link>
  </section>;

  const count = seller.listings.length;
  return <div className="page seller-page">
    <Link className="back-link" href="/shop"><ArrowLeft size={17}/>Back to the edit</Link>
    <header className="seller-profile-header">
      <span className="avatar seller-profile-avatar" aria-hidden="true">{seller.name.slice(0, 1)}</span>
      <div><p className="eyebrow">MEET THE SELLER</p><h1>{seller.name}’s wardrobe</h1><p>Previously loved pieces, ready for another chapter.</p></div>
      <span className="seller-inventory-count"><Storefront size={19} aria-hidden="true"/>{count} {count === 1 ? 'piece' : 'pieces'} available</span>
    </header>
    <section aria-labelledby="seller-available-heading">
      <div className="seller-listings-heading"><div><h2 id="seller-available-heading">Available now</h2><p>Every listing is one individual piece.</p></div><Link className="text-link" href="/shop">Explore the full edit <ArrowRight size={17}/></Link></div>
      {count > 0 ? <div className="product-grid seller-product-grid">{seller.listings.map(listing => <ProductCard key={listing.id} listing={listing}/>)}</div> : <div className="panel empty seller-empty"><Storefront size={30} aria-hidden="true"/><h2>No pieces available right now.</h2><p>{seller.name}’s current pieces are no longer available to buy.</p><Link className="button secondary" href="/shop">Find another good piece <ArrowRight size={17}/></Link></div>}
    </section>
  </div>;
}
