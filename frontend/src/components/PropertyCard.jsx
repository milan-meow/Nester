import { Link } from 'react-router-dom';
import { formatPrice } from '../api.js';

const FALLBACK = {
  house: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=60',
  apartment: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=60',
  shop: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=60',
};

const PLACEHOLDER = 'radial-gradient(circle at 75% 25%, rgba(244,163,0,.45), transparent 45%), linear-gradient(135deg, #14213d, #3d4a66)';

/** CSS background: the photo on top, a branded gradient underneath in case the photo fails. */
export const coverOf = (p) => `url("${encodeURI(p.images?.[0] || FALLBACK[p.type])}"), ${PLACEHOLDER}`;

export default function PropertyCard({ property: p }) {
  return (
    <Link to={`/properties/${p.id}`} className="card">
      <div className="card-img" style={{ backgroundImage: coverOf(p) }}>
        <span className={`tag ${p.purpose}`}>{p.purpose === 'sale' ? 'For sale' : 'For rent'}</span>
      </div>
      <div className="card-body">
        <div className="price">{formatPrice(p)}</div>
        <h3>{p.title}</h3>
        <p className="muted">{p.city} · <span className="cap">{p.type}</span></p>
        <p className="facts">
          {p.type !== 'shop' && <span>🛏 {p.bedrooms}</span>}
          <span>🛁 {p.bathrooms}</span>
          {p.areaSqm && <span>📐 {p.areaSqm} m²</span>}
        </p>
      </div>
    </Link>
  );
}
