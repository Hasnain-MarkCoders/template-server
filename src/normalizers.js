import { normalizeYesNoValue, YES_NO_FORM_FIELDS } from './yesNo.js';

const NORMALIZERS = {
  loi: normalizeYesNoValue,
  isTeam: normalizeYesNoValue,
  agentType: (v) => {
    const s = String(v ?? '').trim();
    if (s.toLowerCase() === 'new') return 'New';
    if (s.toLowerCase() === 'seasoned') return 'Seasoned';
    return s;
  },
  zendesk_office_id: (v) => String(v ?? '').trim(),
};

export function getValue(formData, key) {
  const raw = formData?.[key];
  const norm = NORMALIZERS[key];
  return norm ? norm(raw) : String(raw ?? '').trim();
}

/** Applies Yes/No + routing normalizers for match and envelope resolve. */
export function normalizeFormData(formData) {
  const out = { ...(formData ?? {}) };
  for (const key of YES_NO_FORM_FIELDS) {
    if (key in out) {
      out[key] = normalizeYesNoValue(out[key]);
    }
  }
  for (const key of ['agentType', 'zendesk_office_id']) {
    if (key in out) {
      out[key] = getValue(out, key);
    }
  }
  return out;
}

/** Normalized routing slice for logging and error responses */
export function buildMatchContext(formData, allowedFields = []) {
  const ctx = {};
  for (const key of allowedFields) {
    ctx[key] = getValue(formData, key);
  }
  return ctx;
}
