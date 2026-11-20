import React from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seeker' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await register(form);
      navigate(location.state?.from || (user.role === 'owner' ? '/sell' : '/'), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-box">
      <h1>Join Nestar</h1>
      <form onSubmit={submit} className="stack">
        <div className="choice">
          <label className={form.role === 'seeker' ? 'active' : ''}>
            <input type="radio" name="role" value="seeker" checked={form.role === 'seeker'} onChange={update} />
            🔎 I want to find a place
          </label>
          <label className={form.role === 'owner' ? 'active' : ''}>
            <input type="radio" name="role" value="owner" checked={form.role === 'owner'} onChange={update} />
            🏠 I want to list a place
          </label>
        </div>
        <label>Full name<input name="name" required minLength="2" value={form.name} onChange={update} /></label>
        <label>Email<input name="email" type="email" required autoComplete="email" value={form.email} onChange={update} /></label>
        <label>Password<input name="password" type="password" required minLength="8" autoComplete="new-password" value={form.password} onChange={update} /></label>
        {error && (
          <div className="error">
            {error.message}
            {error.details?.map((d) => <div key={d.field}>• {d.field} {d.message}</div>)}
          </div>
        )}
        <button className="btn block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="muted">Already have an account? <Link to="/login" state={location.state}>Log in</Link></p>
    </div>
  );
}
