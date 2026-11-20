import React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const EMPTY = {
  title: '', description: '', type: 'apartment', purpose: 'rent', rentPeriod: 'month', price: '',
  currency: 'USD', city: '', address: '', bedrooms: 1, bathrooms: 1, areaSqm: '', images: '',
};

const NUMBER_FIELDS = ['price', 'bedrooms', 'bathrooms', 'areaSqm'];

/** Create (/sell) and edit (/properties/:id/edit) share this form. */
export default function PropertyForm() {
  const { id } = useParams();
  const { user, becomeOwner } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getProperty(id).then(({ property: p }) => {
      setForm({ ...EMPTY, ...p, rentPeriod: p.rentPeriod || 'month', areaSqm: p.areaSqm ?? '', images: (p.images || []).join('\n') });
    }).catch(setError);
  }, [id]);

  if (!id && user.role === 'seeker') {
    return (
      <div className="auth-box">
        <h1>List your place</h1>
        <p>Your account is set up for finding places. Switch to an owner account to post listings — you can still rent or buy too.</p>
        <button className="btn block" onClick={becomeOwner}>Become an owner</button>
      </div>
    );
  }

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {};
    for (const [k, v] of Object.entries(form)) {
      if (!(k in EMPTY)) continue; // don't send id, ownerId, status, timestamps back
      if (v === '' || v === null) continue;
      body[k] = NUMBER_FIELDS.includes(k) ? Number(v) : v;
    }
    body.images = form.images.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    if (body.purpose === 'sale') delete body.rentPeriod;
    if (body.type === 'shop') body.bedrooms = 0; // field is hidden for shops
    try {
      const { property } = id ? await api.updateProperty(id, body) : await api.createProperty(body);
      navigate(`/properties/${property.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <h1>{id ? 'Edit listing' : 'List your place'}</h1>
      <form onSubmit={submit} className="form-grid">
        <label className="span2">Title<input name="title" required minLength="5" maxLength="120" value={form.title} onChange={update} placeholder="Sunny 2-bedroom apartment near the park" /></label>

        <label>I want to
          <select name="purpose" value={form.purpose} onChange={update}>
            <option value="rent">Rent it out</option>
            <option value="sale">Sell it</option>
          </select>
        </label>
        <label>Type
          <select name="type" value={form.type} onChange={update}>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="shop">Shop</option>
          </select>
        </label>

        <label>Price<input name="price" type="number" min="1" required value={form.price} onChange={update} /></label>
        <div className="row">
          <label>Currency
            <select name="currency" value={form.currency} onChange={update}>
              <option>USD</option><option>KRW</option><option>EUR</option>
            </select>
          </label>
          {form.purpose === 'rent' && (
            <label>Per
              <select name="rentPeriod" value={form.rentPeriod} onChange={update}>
                <option value="month">month</option>
                <option value="year">year</option>
              </select>
            </label>
          )}
        </div>

        <label>City<input name="city" required value={form.city} onChange={update} /></label>
        <label>Address<input name="address" required value={form.address} onChange={update} /></label>

        <div className="row span2">
          {form.type !== 'shop' && <label>Bedrooms<input name="bedrooms" type="number" min="0" value={form.bedrooms} onChange={update} /></label>}
          <label>Bathrooms<input name="bathrooms" type="number" min="0" value={form.bathrooms} onChange={update} /></label>
          <label>Area (m²)<input name="areaSqm" type="number" min="1" value={form.areaSqm} onChange={update} /></label>
        </div>

        <label className="span2">Description<textarea name="description" rows="5" required minLength="20" value={form.description} onChange={update} placeholder="What makes this place special? Transport, light, neighbourhood…" /></label>
        <label className="span2">Image URLs (one per line)<textarea name="images" rows="3" value={form.images} onChange={update} placeholder="https://…" /></label>

        {error && (
          <div className="error span2">
            {error.message}
            {error.details?.map((d) => <div key={d.field}>• {d.field} {d.message}</div>)}
          </div>
        )}
        <button className="btn span2" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Publish listing'}</button>
      </form>
    </div>
  );
}
