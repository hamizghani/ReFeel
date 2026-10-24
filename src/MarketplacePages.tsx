import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowRight, Check, Heart, MagnifyingGlass, SlidersHorizontal, Sparkle, X, ArrowUpRight } from '@phosphor-icons/react';
import { allListings, money, type Listing } from './domain';
import { useStore } from './store';
import { Link } from './router';
import { shoppingQuery, visibleListings } from './buyer';
import { coverFor, mediaFor } from './media';
import { GarmentImage } from './components/PhotoGallery';
import { sellerHref } from './sellers';

export const CATEGORIES=['All','Tops','Knitwear','Shirts','Bottoms','Dresses','Outerwear'];
export function ProductCard({listing}:{listing:Listing}) {
  const {state,dispatch}=useStore();
  const saved=state.saved.includes(listing.id);
  const status=state.availability[listing.id]||'active';
  const available=status==='active';
  const inBag=state.bag.includes(listing.id);
  const [added,setAdded]=useState(false);
  const purchaseActions=useRef<HTMLDivElement>(null);
  const focusAfterAdd=useRef(false);
  useEffect(()=>{if(available&&inBag&&focusAfterAdd.current){purchaseActions.current?.querySelector<HTMLAnchorElement>('.card-view-bag')?.focus();focusAfterAdd.current=false;}},[available,inBag]);
  const add=(event:MouseEvent<HTMLButtonElement>)=>{if(available){focusAfterAdd.current=document.activeElement===event.currentTarget;dispatch({type:'BAG_ADD',id:listing.id});setAdded(true);}};
  const notes=listing.feelNotes?.slice(0,2)||[];
  const cover=coverFor(listing.templateId||listing.id);
  const coverPhoto=mediaFor(listing.templateId||listing.id).photos.find(photo=>photo.src===cover);
  return <article className="product-card" data-testid="active-card" data-id={listing.id} data-quantity="1">
    <div className="product-photo" data-landscape={coverPhoto&&coverPhoto.width>coverPhoto.height||undefined}>
      <Link href={`/listing/${listing.id}`} aria-label={`View ${listing.name}`}><GarmentImage src={cover} alt={listing.name} width={coverPhoto?.width} height={coverPhoto?.height}/></Link>
      <button className={`save-button ${saved?'saved':''}`} aria-label={`${saved?'Unsave':'Save'} ${listing.name}`} aria-pressed={saved} onClick={()=>dispatch({type:'SAVE',id:listing.id})}><Heart size={19} weight={saved?'fill':'regular'}/></button>
      {(listing.templateId||listing.id)==='cloud-poplin'&&status==='active'&&<Link className="card-motion-entry" href={`/listing/${listing.id}`} aria-label={`Explore ${listing.name} in motion`}><Sparkle size={14}/>See it move</Link>}{status!=='active'?<span className="product-status">{status==='sold'?'Sold':status==='reserved'?'Reserved':status==='paused'?'Paused':'Unavailable'}</span>:listing.hero&&<span className="photo-note"><Check size={12}/> Photos & details</span>}
    </div>
    <div className="product-card-body"><div className="product-meta"><span>{listing.category}</span><span>Size {listing.size}</span></div><Link className="product-name" href={`/listing/${listing.id}`}>{listing.name}</Link><div className="product-price"><strong>{money(listing.price)}</strong><Link className="card-seller-link" href={sellerHref(listing.seller)}>{listing.seller}’s wardrobe</Link></div><p className="product-condition">{listing.condition.split(' · ')[0]}{listing.condition.includes(' · ')?<span> · {listing.condition.split(' · ').slice(1).join(' · ')}</span>:null}</p>{notes.length>0&&<div className="product-traits">{notes.map(note=><span key={note}>{note}</span>)}</div>}<div className="card-purchase-actions" ref={purchaseActions}><p>{available?'One piece only · Quantity 1':'This piece is '+status}</p>{available&&inBag?<Link className="button secondary card-view-bag" href="/checkout" onClick={()=>dispatch({type:'BAG_VIEW'})}>View bag <ArrowRight size={16}/></Link>:<button className="button secondary" disabled={!available} aria-label={available?`Add ${listing.name} to bag`:`${listing.name} is ${status}`} onClick={add}>{available?'Add to bag':status==='sold'?'Sold':status==='reserved'?'Reserved':'Unavailable'}</button>}<span className="sr-only" role="status" aria-atomic="true">{added&&inBag&&available?`${listing.name} added to your bag. Quantity 1.`:''}</span></div></div>
  </article>;
}

export function MarketplacePage({saved=false}:{saved?:boolean}) {
  const {state,dispatch}=useStore();
  const params=new URLSearchParams(location.search);
  const [query,setQuery]=useState(params.get('q')||'');
  const [category,setCategory]=useState(params.get('category')||'All');
  const [size,setSize]=useState(params.get('size')||'All');
  const [maxPrice,setMaxPrice]=useState(params.get('maxPrice')||'');
  const [color,setColor]=useState(params.get('color')||'All');
  const [condition,setCondition]=useState(params.get('condition')||'All');
  const [evidence,setEvidence]=useState(params.get('details')==='yes');
  const [sort,setSort]=useState(params.get('sort')||'Recommended');
  const [filterOpen,setFilterOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const parsed=shoppingQuery(query);
  useEffect(()=>{const p=new URLSearchParams();if(query)p.set('q',query);if(category!=='All')p.set('category',category);if(size!=='All')p.set('size',size);if(maxPrice)p.set('maxPrice',maxPrice);if(color!=='All')p.set('color',color);if(condition!=='All')p.set('condition',condition);if(evidence)p.set('details','yes');if(sort!=='Recommended')p.set('sort',sort);history.replaceState({...history.state},'',location.pathname+(p.size?'?'+p.toString():''));},[query,category,size,maxPrice,color,condition,evidence,sort]);
  const items=visibleListings(state,{query,category,size,saved,maxPrice:maxPrice?Number(maxPrice):undefined,color,condition,evidenceOnly:evidence});
  if(sort==='Price: low to high')items.sort((a,b)=>a.price-b.price);
  if(sort==='Price: high to low')items.sort((a,b)=>b.price-a.price);
  if(sort==='Recently added')items.reverse();
  const total=allListings(state).length;
  const filterCount=[category!=='All',size!=='All',!!maxPrice,color!=='All',condition!=='All',evidence].filter(Boolean).length;
  const reset=()=>{setQuery('');setCategory('All');setSize('All');setMaxPrice('');setColor('All');setCondition('All');setEvidence(false);};
  const filters=<><div className="filter-section"><h3>Category</h3><div className="category-list">{CATEGORIES.map(c=><button key={c} aria-pressed={category===c} className={category===c?'selected':''} onClick={()=>setCategory(c)}><span>{c==='All'?'All pieces':c}</span><small>{c==='All'?total:allListings(state).filter(x=>x.category===c).length}</small></button>)}</div></div><div className="filter-section"><h3>Find your fit</h3><div className="size-buttons" role="group" aria-label="Filter size">{['All','S','M','L'].map(s=><button key={s} aria-pressed={size===s} className={size===s?'selected':''} onClick={()=>setSize(s)}>{s}</button>)}</div><label className="field">Maximum price · USD<input type="number" min="0" step="1" inputMode="decimal" value={maxPrice} placeholder="Any price" onChange={e=>setMaxPrice(e.target.value)}/></label></div><div className="filter-section"><h3>The details</h3><label className="field">Color<select value={color} onChange={e=>setColor(e.target.value)}><option>All</option>{['ivory','green','blue','pink','rose','lilac','charcoal','beige','stone','apricot'].map(c=><option value={c} key={c}>{c[0].toUpperCase()+c.slice(1)}</option>)}</select></label><label className="field">Condition<select value={condition} onChange={e=>setCondition(e.target.value)}><option>All</option><option>Very good</option><option>Good</option></select></label><label className="check-field"><input type="checkbox" checked={evidence} onChange={e=>setEvidence(e.target.checked)}/>Photos & fabric details</label></div><button className="text-button filter-reset" onClick={reset}>Clear all filters</button><Link className="filter-feel-note" href="/match"><Sparkle size={24}/><strong>Find a familiar feeling.</strong><span>Compare with a piece you already love.</span><span className="text-link">Search by feel <ArrowRight size={15}/></span></Link></>;
  const openFilters=()=>{setFilterOpen(true);dialog.current?.showModal();};
  const closeFilters=()=>{dialog.current?.close();setFilterOpen(false);};
  return <div className="page marketplace-page">
    <div className="marketplace-title"><div><p className="eyebrow">{saved?'YOUR SAVED PIECES':'THE EVERYDAY EDIT'}</p><h1>{saved?'Good pieces, kept in mind.':'Good clothes. A familiar feeling.'}</h1><p>{saved?'Your little collection, ready whenever you are.':'Previously loved pieces, with the details that help you choose.'}</p></div>{!saved&&<Link className="marketplace-reference" href="/match"><span className="icon-disc"><Sparkle size={21}/></span><span><strong>Find something that feels familiar</strong><small>Start with a piece you already own</small></span><ArrowRight size={20}/></Link>}</div>
    {state.guided&&<aside className="guide"><span className="tag">Explore both</span><span>Choose a piece, compare it, then try the seller studio.</span><button className="text-button" onClick={()=>dispatch({type:'GUIDE',value:false})}>End tour</button></aside>}
    <div className="search-toolbar"><div className="market-search"><MagnifyingGlass size={22} aria-hidden="true"/><label className="sr-only" htmlFor="market-query">Search clothes</label><input id="market-query" type="search" value={query} placeholder="Search a piece, color, or fabric…" onChange={e=>setQuery(e.target.value)}/>{query&&<button className="icon-button query-clear" aria-label="Clear search" onClick={()=>setQuery('')}><X size={16}/></button>}<Link className="search-feel-button" href={`/match${query?'?q='+encodeURIComponent(query):''}`} onClick={()=>{if(query)dispatch({type:'FEEL_INTENT',intent:{query}});}} aria-label="Search by feel"><Sparkle size={19}/><span>Search by feel</span></Link></div><button className="button secondary mobile-filter-button" aria-expanded={filterOpen} onClick={openFilters}><SlidersHorizontal size={20}/>Filters{filterCount>0&&<span className="count-badge">{filterCount}</span>}</button></div>
    <div className="category-pills" role="group" aria-label="Garment category">{CATEGORIES.map(c=><button key={c} aria-pressed={category===c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c==='All'?'All pieces':c}</button>)}</div>
    <div className="active-filter-chips" aria-label="Active filters">{category!=='All'&&<button aria-label={`Remove ${category} category filter`} onClick={()=>setCategory('All')}>{category}<X size={13}/></button>}{size!=='All'&&<button aria-label="Remove size filter" onClick={()=>setSize('All')}>Size {size}<X size={13}/></button>}{maxPrice&&<button onClick={()=>setMaxPrice('')} aria-label="Remove maximum price">Up to ${maxPrice}<X size={13}/></button>}{parsed.maxPrice!==undefined&&<span>Under ${parsed.maxPrice} from your search</span>}{parsed.size&&<span>Size {parsed.size} from your search</span>}{color!=='All'&&<button onClick={()=>setColor('All')} aria-label="Remove color filter">{color}<X size={13}/></button>}{condition!=='All'&&<button onClick={()=>setCondition('All')} aria-label="Remove condition filter">{condition}<X size={13}/></button>}{evidence&&<button onClick={()=>setEvidence(false)}>With details<X size={13}/></button>}</div>
    <div className="catalog-layout"><aside className="filter-sidebar" aria-label="Catalogue filters">{filters}</aside><section className="catalog-results" aria-label={saved?'Saved garments':'Available garments'}><div className="results-caption"><span><strong>{items.length}</strong> {saved?'saved ':''}pieces{query&&` for “${query}”`}</span><label>Sort by<select aria-label="Sort pieces" value={sort} onChange={e=>setSort(e.target.value)}>{['Recommended','Recently added','Price: low to high','Price: high to low'].map(s=><option key={s}>{s}</option>)}</select></label></div>{items.length?<div className="product-grid">{items.map(x=><ProductCard key={x.id} listing={x}/>)}</div>:<div className="empty panel"><Heart size={35}/><h2>{saved?'Your next good find is out there.':'No pieces match just yet.'}</h2><p>{saved?'Tap the heart on any garment to keep it here.':'Try a different size, color, or price. Your reference is still saved.'}</p><button className="button primary" onClick={reset}>Clear filters</button>{saved&&<Link className="text-link" href="/shop">Browse all pieces <ArrowRight size={17}/></Link>}</div>}<div className="catalog-end"><span>You’re viewing {items.length} of {total} prepared pieces</span><Link href="/sell" className="text-link">Sell a piece <ArrowUpRight size={16}/></Link></div></section></div>
    {!saved&&<details className="coming-soon-section"><summary><span><span className="eyebrow">MORE GOOD FINDS AHEAD</span><strong>Another chapter, coming soon.</strong></span><span className="tag">50 pieces</span></summary><p className="muted">A preview of future arrivals. These pieces are not available to shop yet.</p><div className="product-grid coming-grid">{Array.from({length:50},(_,i)=><article key={i} className="coming-card" data-testid="coming-soon-card" aria-label={`Coming soon garment ${i+1}`}><div className="coming-photo">{i<12?<GarmentImage src={coverFor(allListings(state)[i%total]?.templateId||allListings(state)[i%total]?.id||'cloud-poplin')} alt=""/>:<span className="coming-number">{String(i+1).padStart(2,'0')}</span>}<span>Coming soon</span></div></article>)}</div></details>}
    <dialog className="filter-dialog" ref={dialog} onClose={()=>setFilterOpen(false)} aria-label="Filter clothes"><header><h2>Make it your find.</h2><button className="icon-button" aria-label="Close filters" onClick={closeFilters}><X size={22}/></button></header><div className="filter-dialog-content">{filterOpen&&filters}</div><footer><button className="button primary" onClick={closeFilters}>Show {items.length} pieces <ArrowRight size={18}/></button></footer></dialog>
  </div>;
}
