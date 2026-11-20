import React from 'react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (!user) return setUnread(0);
    let alive = true;
    const load = () => api.notifications().then((r) => alive && setUnread(r.unreadCount)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user, location.pathname]);

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand">Nest<span>★</span>r</Link>
        <nav>
          <NavLink to="/?purpose=sale">Buy</NavLink>
          <NavLink to="/?purpose=rent">Rent</NavLink>
          <NavLink to="/sell">List a place</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className="bell">
                Dashboard{unread > 0 && <span className="badge">{unread}</span>}
              </NavLink>
              <button className="link" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <Link to="/register" className="btn small">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
