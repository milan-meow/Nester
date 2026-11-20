const TYPES = ['house', 'apartment', 'shop'];
const PURPOSES = ['sale', 'rent'];
const STATUSES = ['available', 'pending', 'sold', 'rented'];

const propertySchema = {
  title: { type: 'string', required: true, min: 5, max: 120 },
  description: { type: 'string', required: true, min: 20, max: 5000 },
  type: { type: 'string', required: true, enum: TYPES },
  purpose: { type: 'string', required: true, enum: PURPOSES },
  price: { type: 'number', required: true, min: 1 },
  currency: { type: 'string', enum: ['KRW', 'USD', 'EUR'], default: 'USD' },
  rentPeriod: { type: 'string', enum: ['month', 'year'] },
  city: { type: 'string', required: true, min: 2, max: 80 },
  address: { type: 'string', required: true, min: 3, max: 200 },
  bedrooms: { type: 'integer', min: 0, max: 50, default: 0 },
  bathrooms: { type: 'integer', min: 0, max: 50, default: 0 },
  areaSqm: { type: 'number', min: 1, max: 100000 },
  images: { type: 'array', items: 'url', max: 10, default: [] },
};

// Owners may also change status themselves (e.g. sold outside Nestar).
const updateSchema = { ...propertySchema, status: { type: 'string', enum: STATUSES } };

const searchSchema = {
  purpose: { type: 'string', enum: PURPOSES },
  type: { type: 'string', enum: TYPES },
  city: { type: 'string', max: 80 },
  q: { type: 'string', max: 80 },
  minPrice: { type: 'number', min: 0 },
  maxPrice: { type: 'number', min: 0 },
  bedrooms: { type: 'integer', min: 0 },
  sort: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'], default: 'newest' },
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 50, default: 12 },
};

const statusSchema = {
  status: { type: 'string', required: true, enum: STATUSES },
  // Optional compare-and-set: only change if the current status is this one.
  expectedStatus: { type: 'string', enum: STATUSES },
};

module.exports = { propertySchema, updateSchema, searchSchema, statusSchema, TYPES, PURPOSES, STATUSES };
