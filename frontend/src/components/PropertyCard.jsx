import { Link } from 'react-router-dom';
import { formatPrice } from '../api.js';

const FALLBACK = {
  house: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=60',
  apartment: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=60',
  shop: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=60',
};

export const coverOf = (p) => p.images?.[0] || FALLBACK[p.type];

export default function PropertyCard({ property: p }) {
  return (
    <Link to={`/properties/${p.id}`} className="card">
      <div className="card-img" style={{ backgroundImage: `url(${coverOf(p)})` }}>
        <span className={`tag ${p.purpose}`}>{p.purpose === 'sale' ? 'For sale' : 'For rent'}</span>
      </div>
      <div className="card-body">
        <div className="price">{formatPrice(p)}</div>
        <h3>{p.title}</h3>
        <p className="muted">{p.city} · {p.type}</p>
        <p className="facts">
          {p.type !== 'shop' && <span>🛏 {p.bedrooms}</span>}
          <span>🛁 {p.bathrooms}</span>
          {p.areaSqm && <span>📐 {p.areaSqm} m²</span>}
        </p>
      </div>
    </Link>
  );
}
