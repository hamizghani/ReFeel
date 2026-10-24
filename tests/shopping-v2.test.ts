import { describe, expect, it } from 'vitest';
import { initialState } from '../src/domain';
import { visibleListings } from '../src/buyer';

describe('ordinary shopping queries', () => {
  it('distinguishes under from an inclusive up-to price', () => {
    const filters = {category:'All',size:'All',saved:false};
    expect(visibleListings(initialState(), {...filters,query:'under $32'}).map(x=>x.id)).not.toContain('cloud-poplin');
    expect(visibleListings(initialState(), {...filters,query:'up to $32'}).map(x=>x.id)).toContain('cloud-poplin');
  });
  it('keeps descriptive words while interpreting an under-price and size request', () => {
    const results = visibleListings(initialState(), {query:'ivory blouse under $40 size M',category:'All',size:'All',saved:false});
    expect(results.map(item=>item.id)).toContain('cloud-poplin');
    expect(results.every(item=>item.price<40 && item.size==='M')).toBe(true);
  });
  it('applies a price-only query without requiring the price words in product descriptions', () => {
    const results = visibleListings(initialState(), {query:'under $30',category:'All',size:'All',saved:false});
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(item=>item.price<30)).toBe(true);
  });
  it('combines a query price with the selected category', () => {
    const results = visibleListings(initialState(), {query:'under $50',category:'Knitwear',size:'All',saved:false});
    expect(results.map(item=>item.id)).toContain('moss-knit');
    expect(results.every(item=>item.category==='Knitwear' && item.price<50)).toBe(true);
  });
});
