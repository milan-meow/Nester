// The ONLY file that knows how to talk to the backend.
const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'nestar.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

export class ApiError extends Error {
  constructor(status, error) {
    super(error?.message || `Request failed (${status})`);
    this.status = status;
    this.code = error?.code;
    this.details = error?.details || [];
  }
}

async function request(method, path, body) {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.set(null); // expired session
      window.dispatchEvent(new Event('nestar:logout'));
    }
    throw new ApiError(res.status, data.error);
  }
  return data;
}

const qs = (params) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};

export const api = {
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),
  me: () => request('GET', '/auth/me'),
  updateMe: (body) => request('PATCH', '/auth/me', body),

  searchProperties: (params) => request('GET', `/properties${qs(params)}`),
  myProperties: () => request('GET', '/properties/mine'),
  getProperty: (id) => request('GET', `/properties/${encodeURIComponent(id)}`),
  createProperty: (body) => request('POST', '/properties', body),
  updateProperty: (id, body) => request('PATCH', `/properties/${encodeURIComponent(id)}`, body),
  deleteProperty: (id) => request('DELETE', `/properties/${encodeURIComponent(id)}`),

  createBooking: (body) => request('POST', '/bookings', body),
  myBookings: () => request('GET', '/bookings/mine'),
  incomingBookings: () => request('GET', '/bookings/incoming'),
  setBookingStatus: (id, status) => request('PATCH', `/bookings/${encodeURIComponent(id)}/status`, { status }),

  notifications: () => request('GET', '/notifications'),
  readNotification: (id) => request('PATCH', `/notifications/${encodeURIComponent(id)}/read`),
  readAllNotifications: () => request('PATCH', '/notifications/read-all'),
};

export const formatPrice = (p) => {
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency || 'USD', maximumFractionDigits: 0 }).format(p.price);
  return p.purpose === 'rent' ? `${amount} / ${p.rentPeriod || 'month'}` : amount;
};
