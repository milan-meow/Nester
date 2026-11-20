import React from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import PropertyCard from '../components/PropertyCard.jsx';

const FIELDS = ['purpose', 'type', 'city', 'minPrice', 'maxPrice', 'bedrooms', 'sort', 'page'];

export default function Home() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FIELDS.map((f) => [f, params.get(f) || '']));
  const [form, setForm] = useState(filters);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const key = params.toString();

  useEffect(() => {
    setForm(filters);
    setError('');
    api.searchProperties({ ...filters, limit: 12 })
      .then(setResult)
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    const next = Object.fromEntries(Object.entries({ ...form, page: '' }).filter(([, v]) => v));
    setParams(next);
  };
  const goPage = (page) => setParams({ ...Object.fromEntries(params), page: String(page) });
  const tab = (purpose) => setParams(purpose ? { purpose } : {});

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Find your place,<br />under your star.</h1>
          <p>Houses, apartments and shops — to buy, sell or rent.</p>
          <div className="tabs">
            <button className={!filters.purpose ? 'active' : ''} onClick={() => tab('')}>All</button>
            <button className={filters.purpose === 'sale' ? 'active' : ''} onClick={() => tab('sale')}>Buy</button>
            <button className={filters.purpose === 'rent' ? 'active' : ''} onClick={() => tab('rent')}>Rent</button>
          </div>
          <form className="search" onSubmit={submit}>
            <input name="city" placeholder="City (e.g. Seoul)" value={form.city} onChange={update} />
            <select name="type" value={form.type} onChange={update}>
              <option value="">Any type</option>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="shop">Shop</option>
            </select>
            <input name="minPrice" type="number" min="0" placeholder="Min price" value={form.minPrice} onChange={update} />
            <input name="maxPrice" type="number" min="0" placeholder="Max price" value={form.maxPrice} onChange={update} />
            <select name="bedrooms" value={form.bedrooms} onChange={update}>
              <option value="">Any beds</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ beds</option>)}
            </select>
            <button className="btn">Search</button>
          </form>
        </div>
      </section>

      <section className="container">
        <div className="results-head">
          <h2>{result ? `${result.total} place${result.total === 1 ? '' : 's'} found` : 'Searching…'}</h2>
          <select value={filters.sort} onChange={(e) => setParams({ ...Object.fromEntries(params), sort: e.target.value, page: '1' })}>
            <option value="">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        {result && result.items.length === 0 && (
          <div className="empty">No places match these filters yet. Try widening your search.</div>
        )}
        <div className="grid">
          {result?.items.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
        {result && result.pages > 1 && (
          <div className="pager">
            <button className="btn ghost" disabled={result.page <= 1} onClick={() => goPage(result.page - 1)}>← Prev</button>
            <span>Page {result.page} of {result.pages}</span>
            <button className="btn ghost" disabled={result.page >= result.pages} onClick={() => goPage(result.page + 1)}>Next →</button>
          </div>
        )}
      </section>
    </>
  );
}
