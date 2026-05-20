import { getValue, buildMatchContext } from './normalizers.js';

export function valueMatches(ruleValue, formValue) {
  const fv = String(formValue);
  if (Array.isArray(ruleValue)) {
    return ruleValue.map((x) => String(x).trim()).includes(fv);
  }
  return String(ruleValue).trim() === fv;
}

/** Match only keys present in rule.match — NOT all formData */
export function matchRule(match, formData, allowedFields) {
  for (const key of Object.keys(match)) {
    if (allowedFields?.length && !allowedFields.includes(key)) {
      const err = new Error(`Disallowed match field: ${key}`);
      err.statusCode = 500;
      throw err;
    }
    if (!valueMatches(match[key], getValue(formData, key))) {
      return false;
    }
  }
  return true;
}

export function findRule(registry, formData) {
  const allowed = registry.allowedMatchFields ?? [];
  const ctx = buildMatchContext(formData, allowed);
  const rules = registry.rules ?? [];

  const hits = rules
    .filter((r) => matchRule(r.match, formData, allowed))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  if (hits.length === 0) {
    const err = new Error('No template rule matched');
    err.statusCode = 404;
    err.ctx = ctx;
    throw err;
  }

  if (hits.length > 1) {
    const err = new Error(`Ambiguous match: ${hits.map((h) => h.id).join(', ')}`);
    err.statusCode = 409;
    err.ctx = ctx;
    err.ruleIds = hits.map((h) => h.id);
    throw err;
  }

  return { rule: hits[0], ctx };
}
