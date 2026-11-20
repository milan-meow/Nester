const { badRequest } = require('./errors');

/**
 * Tiny schema validator — enough for this project without pulling in a big library.
 *
 * Rule shape: { type: 'string'|'number'|'integer'|'boolean'|'array'|'date',
 *               required, min, max, enum, pattern, trim, items }
 * Returns a new object with only known keys (unknown keys are dropped = mass-assignment safe).
 */
function validate(schema, input, { partial = false } = {}) {
  const data = input && typeof input === 'object' ? input : {};
  const out = {};
  const errors = [];

  for (const [key, rule] of Object.entries(schema)) {
    let value = data[key];
    const missing = value === undefined || value === null || value === '';

    if (missing) {
      if (rule.required && !partial) errors.push({ field: key, message: 'is required' });
      else if (!partial && rule.default !== undefined) out[key] = rule.default;
      continue;
    }

    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') { errors.push({ field: key, message: 'must be a string' }); continue; }
        value = value.trim();
        if (rule.min !== undefined && value.length < rule.min) errors.push({ field: key, message: `must be at least ${rule.min} characters` });
        if (rule.max !== undefined && value.length > rule.max) errors.push({ field: key, message: `must be at most ${rule.max} characters` });
        if (rule.pattern && !rule.pattern.test(value)) errors.push({ field: key, message: 'has an invalid format' });
        if (rule.lowercase) value = value.toLowerCase();
        break;
      case 'number':
      case 'integer': {
        const n = typeof value === 'string' ? Number(value) : value;
        if (typeof n !== 'number' || !Number.isFinite(n)) { errors.push({ field: key, message: 'must be a number' }); continue; }
        if (rule.type === 'integer' && !Number.isInteger(n)) { errors.push({ field: key, message: 'must be a whole number' }); continue; }
        if (rule.min !== undefined && n < rule.min) errors.push({ field: key, message: `must be >= ${rule.min}` });
        if (rule.max !== undefined && n > rule.max) errors.push({ field: key, message: `must be <= ${rule.max}` });
        value = n;
        break;
      }
      case 'boolean':
        if (typeof value === 'string') value = value === 'true';
        if (typeof value !== 'boolean') { errors.push({ field: key, message: 'must be true or false' }); continue; }
        break;
      case 'date': {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) { errors.push({ field: key, message: 'must be a valid date' }); continue; }
        value = d.toISOString();
        break;
      }
      case 'array':
        if (!Array.isArray(value)) { errors.push({ field: key, message: 'must be a list' }); continue; }
        if (rule.max !== undefined && value.length > rule.max) errors.push({ field: key, message: `can have at most ${rule.max} items` });
        if (rule.items === 'url' && value.some((v) => typeof v !== 'string' || !/^https?:\/\/\S+$/i.test(v))) {
          errors.push({ field: key, message: 'must contain only http(s) URLs' });
        }
        break;
      default:
        break;
    }

    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({ field: key, message: `must be one of: ${rule.enum.join(', ')}` });
    }
    out[key] = value;
  }

  if (errors.length) throw badRequest('Validation failed', errors);
  return out;
}

module.exports = { validate };
