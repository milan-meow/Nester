import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatPrice } from '../api.js';
import { useAuth } from '../auth.jsx';
import { coverOf } from '../components/PropertyCard.jsx';

export default function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProperty(id).then((r) => setP(r.property)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container"><p className="error">{error}</p><Link to="/">← Back to search</Link></div>;
  if (!p) return <p className="container muted">Loading…</p>;

  const isOwner = user && (user.id === p.ownerId || user.role === 'admin');

  const remove = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    await api.deleteProperty(p.id);
    navigate('/dashboard');
  };

  return (
    <div className="container detail">
      <Link to="/" className="muted">← Back to search</Link>
      <div className="detail-hero" style={{ backgroundImage: coverOf(p) }} />
      {p.images?.length > 1 && (
        <div className="thumbs">{p.images.slice(1).map((src) => <img key={src} src={src} alt="" />)}</div>
      )}
      <div className="detail-grid">
        <div>
          <span className={`tag ${p.purpose}`}>{p.purpose === 'sale' ? 'For sale' : 'For rent'}</span>
          {p.status !== 'available' && <span className="tag closed">{p.status}</span>}
          <h1>{p.title}</h1>
          <p className="muted">{p.address}, {p.city}</p>
          <div className="price big">{formatPrice(p)}</div>
          <ul className="facts big">
            <li><b className="cap">{p.type}</b><span>Type</span></li>
            {p.type !== 'shop' && <li><b>{p.bedrooms}</b><span>Bedrooms</span></li>}
            <li><b>{p.bathrooms}</b><span>Bathrooms</span></li>
            {p.areaSqm && <li><b>{p.areaSqm} m²</b><span>Area</span></li>}
          </ul>
          <h3>About this place</h3>
          <p className="description">{p.description}</p>
          <p className="muted">Listed by {p.ownerName || 'an owner'} · {new Date(p.createdAt).toLocaleDateString()}</p>
        </div>
        <aside className="panel">
          {isOwner ? (
            <>
              <h3>Your listing</h3>
              <Link className="btn block" to={`/properties/${p.id}/edit`}>Edit listing</Link>
              <button className="btn ghost block danger" onClick={remove}>Delete</button>
            </>
          ) : p.status !== 'available' ? (
            <p>This place is no longer available.</p>
          ) : user ? (
            <RequestForm property={p} />
          ) : (
            <>
              <h3>Interested?</h3>
              <p>Log in to make an offer, ask to rent, or book a viewing.</p>
              <Link className="btn block" to="/login" state={{ from: `/properties/${p.id}` }}>Log in</Link>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function RequestForm({ property }) {
  const mainKind = property.purpose === 'sale' ? 'offer' : 'rent_request';
  const [kind, setKind] = useState(mainKind);
  const [form, setForm] = useState({ amount: property.purpose === 'sale' ? property.price : '', visitDate: '', moveInDate: '', message: '' });
  const [state, setState] = useState({ busy: false, error: '', done: false });
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '', done: false });
    const body = { propertyId: property.id, kind, message: form.message || undefined };
    if (kind === 'offer') body.amount = Number(form.amount);
    if (kind === 'viewing') body.visitDate = new Date(form.visitDate).toISOString();
    if (kind === 'rent_request' && form.moveInDate) body.moveInDate = form.moveInDate;
    try {
      await api.createBooking(body);
      setState({ busy: false, error: '', done: true });
    } catch (err) {
      setState({ busy: false, error: err.message, done: false });
    }
  };

  if (state.done) {
    return (
      <div>
        <h3>Request sent ✅</h3>
        <p>The owner has been notified. Track it in your <Link to="/dashboard">dashboard</Link>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack">
      <h3>Interested?</h3>
      <div className="segmented">
        <button type="button" className={kind === mainKind ? 'active' : ''} onClick={() => setKind(mainKind)}>
          {mainKind === 'offer' ? 'Make an offer' : 'Request to rent'}
        </button>
        <button type="button" className={kind === 'viewing' ? 'active' : ''} onClick={() => setKind('viewing')}>Book a viewing</button>
      </div>
      {kind === 'offer' && (
        <label>Your offer ({property.currency || 'USD'})
          <input name="amount" type="number" min="1" required value={form.amount} onChange={update} />
        </label>
      )}
      {kind === 'rent_request' && (
        <label>Move-in date (optional)
          <input name="moveInDate" type="date" value={form.moveInDate} onChange={update} />
        </label>
      )}
      {kind === 'viewing' && (
        <label>When would you like to visit?
          <input name="visitDate" type="datetime-local" required value={form.visitDate} onChange={update} />
        </label>
      )}
      <label>Message to the owner
        <textarea name="message" rows="3" maxLength="1000" placeholder="Introduce yourself…" value={form.message} onChange={update} />
      </label>
      {state.error && <p className="error">{state.error}</p>}
      <button className="btn block" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send request'}</button>
    </form>
  );
}
