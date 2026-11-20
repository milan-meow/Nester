#!/usr/bin/env node
/** Seeds demo users and listings through the public API (so all validation runs). */
const API = process.env.API_URL || 'http://localhost:8080/api';

async function call(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function userToken(user) {
  try {
    return (await call('POST', '/auth/register', user)).token;
  } catch {
    return (await call('POST', '/auth/login', { email: user.email, password: user.password })).token;
  }
}

const img = (id) => `https://images.unsplash.com/photo-${id}?w=1200&q=70`;

const listings = [
  { title: 'Sunny 2-bedroom apartment in Gangnam', type: 'apartment', purpose: 'rent', rentPeriod: 'month', price: 1800, city: 'Seoul', address: '123 Teheran-ro, Gangnam-gu', bedrooms: 2, bathrooms: 1, areaSqm: 68, images: [img('1502672260266-1c1ef2d93688')] },
  { title: 'Family house with garden', type: 'house', purpose: 'sale', price: 520000, city: 'Busan', address: '45 Haeundae-ro', bedrooms: 4, bathrooms: 3, areaSqm: 210, images: [img('1568605114967-8130f3a36994')] },
  { title: 'Corner shop on a busy street', type: 'shop', purpose: 'rent', rentPeriod: 'month', price: 3200, city: 'Seoul', address: '9 Myeongdong-gil, Jung-gu', bedrooms: 0, bathrooms: 1, areaSqm: 45, images: [img('1441986300917-64674bd600d8')] },
  { title: 'Modern studio near the university', type: 'apartment', purpose: 'rent', rentPeriod: 'month', price: 650, city: 'Daejeon', address: '77 Daehak-ro, Yuseong-gu', bedrooms: 0, bathrooms: 1, areaSqm: 24, images: [img('1522708323590-d24dbb6b0267')] },
  { title: 'Penthouse with river view', type: 'apartment', purpose: 'sale', price: 1250000, city: 'Seoul', address: '1 Hangang-daero, Yongsan-gu', bedrooms: 3, bathrooms: 2, areaSqm: 160, images: [img('1512917774080-9991f1c4c750')] },
  { title: 'Café space ready to open', type: 'shop', purpose: 'sale', price: 180000, city: 'Incheon', address: '20 Songdo-dong, Yeonsu-gu', bedrooms: 0, bathrooms: 1, areaSqm: 60, images: [img('1554118811-1e0d58224f24')] },
];

(async () => {
  const ownerToken = await userToken({ name: 'Ann Kim', email: 'owner@nestar.dev', password: 'password123', role: 'owner' });
  await userToken({ name: 'Cho Lee', email: 'seeker@nestar.dev', password: 'password123', role: 'seeker' });

  for (const l of listings) {
    await call('POST', '/properties', {
      ...l,
      description: `${l.title}. Well maintained, close to public transport, shops and parks. Contact us to book a viewing.`,
    }, ownerToken);
  }
  console.log(`Seeded 2 users and ${listings.length} listings.`);
  console.log('  owner@nestar.dev / password123  (owner)');
  console.log('  seeker@nestar.dev / password123 (seeker)');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
