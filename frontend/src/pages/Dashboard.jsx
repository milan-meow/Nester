import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPrice } from '../api.js';
import { useAuth } from '../auth.jsx';

const KIND = { offer: 'Offer', rent_request: 'Rent request', viewing: 'Viewing' };

function describe(b) {
  if (b.kind === 'offer') return `Offer: ${new Intl.NumberFormat('en-US').format(b.amount)}`;
  if (b.kind === 'viewing') return `Visit on ${new Date(b.visitDate).toLocaleString()}`;
  return b.moveInDate ? `Move in ${new Date(b.moveInDate).toLocaleDateString()}` : 'Rent request';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('notifications');
  const [data, setData] = useState({ notifications: [], unread: 0, mine: [], incoming: [], listings: [] });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [n, mine, incoming, listings] = await Promise.all([
        api.notifications(), api.myBookings(), api.incomingBookings(), api.myProperties(),
      ]);
      setData({ notifications: n.items, unread: n.unreadCount, mine: mine.items, incoming: incoming.items, listings: listings.items });
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const pendingIncoming = data.incoming.filter((b) => b.status === 'pending').length;
  const tabs = [
    ['notifications', `Notifications${data.unread ? ` (${data.unread})` : ''}`],
    ['incoming', `Requests on my listings${pendingIncoming ? ` (${pendingIncoming})` : ''}`],
    ['mine', 'My requests'],
    ['listings', 'My listings'],
  ];

  return (
    <div className="container">
      <h1>Hi, {user.name.split(' ')[0]} 👋</h1>
      <div className="tabs underline">
        {tabs.map(([k, label]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>)}
      </div>
      {error && <p className="error">{error}</p>}

      {tab === 'notifications' && (
        <div className="list">
          {data.unread > 0 && <button className="link" onClick={() => act(api.readAllNotifications)}>Mark all as read</button>}
          {data.notifications.length === 0 && <div className="empty">Nothing yet.</div>}
          {data.notifications.map((n) => (
            <div key={n.id} className={`row-item ${n.read ? '' : 'unread'}`}>
              <div>
                <div>{n.message}</div>
                <small className="muted">{new Date(n.createdAt).toLocaleString()}</small>
              </div>
              {!n.read && <button className="link" onClick={() => act(() => api.readNotification(n.id))}>Mark read</button>}
            </div>
          ))}
        </div>
      )}

      {tab === 'incoming' && (
        <div className="list">
          {data.incoming.length === 0 && <div className="empty">No requests yet. Share your listings!</div>}
          {data.incoming.map((b) => (
            <div key={b.id} className="row-item">
              <div>
                <b>{KIND[b.kind]}</b> from {b.requesterName} on <Link to={`/properties/${b.propertyId}`}>{b.propertyTitle}</Link>
                <div className="muted">{describe(b)}{b.message && ` · “${b.message}”`}</div>
              </div>
              {b.status === 'pending' ? (
                <div className="actions">
                  <button className="btn small" onClick={() => act(() => api.setBookingStatus(b.id, 'accepted'))}>Accept</button>
                  <button className="btn small ghost" onClick={() => act(() => api.setBookingStatus(b.id, 'rejected'))}>Decline</button>
                </div>
              ) : <span className={`status ${b.status}`}>{b.status}</span>}
            </div>
          ))}
        </div>
      )}

      {tab === 'mine' && (
        <div className="list">
          {data.mine.length === 0 && <div className="empty">You haven't sent any requests. <Link to="/">Start searching</Link>.</div>}
          {data.mine.map((b) => (
            <div key={b.id} className="row-item">
              <div>
                <b>{KIND[b.kind]}</b> on <Link to={`/properties/${b.propertyId}`}>{b.propertyTitle}</Link>
                <div className="muted">{describe(b)}{b.reply && ` · Owner: “${b.reply}”`}</div>
              </div>
              {b.status === 'pending' ? (
                <button className="btn small ghost" onClick={() => act(() => api.setBookingStatus(b.id, 'cancelled'))}>Cancel</button>
              ) : <span className={`status ${b.status}`}>{b.status}</span>}
            </div>
          ))}
        </div>
      )}

      {tab === 'listings' && (
        <div className="list">
          <Link to="/sell" className="btn small">+ New listing</Link>
          {data.listings.length === 0 && <div className="empty">No listings yet.</div>}
          {data.listings.map((p) => (
            <div key={p.id} className="row-item">
              <div>
                <Link to={`/properties/${p.id}`}><b>{p.title}</b></Link>
                <div className="muted">{formatPrice(p)} · {p.city}</div>
              </div>
              <span className={`status ${p.status}`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
