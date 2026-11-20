const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerSchema = {
  name: { type: 'string', required: true, min: 2, max: 60 },
  email: { type: 'string', required: true, pattern: EMAIL, lowercase: true, max: 120 },
  password: { type: 'string', required: true, min: 8, max: 128 },
  phone: { type: 'string', max: 30 },
  // Only these two can be chosen at sign-up. "admin" is granted manually, never by the user.
  role: { type: 'string', enum: ['seeker', 'owner'], default: 'seeker' },
};

const loginSchema = {
  email: { type: 'string', required: true, lowercase: true },
  password: { type: 'string', required: true },
};

const updateMeSchema = {
  name: { type: 'string', min: 2, max: 60 },
  phone: { type: 'string', max: 30 },
  role: { type: 'string', enum: ['seeker', 'owner'] },
};

module.exports = { registerSchema, loginSchema, updateMeSchema };
