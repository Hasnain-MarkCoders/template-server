const NORMALIZERS = {
  loi: (v) => {
    if (v === true || v === 'true') return 'Yes';
    if (v === false || v === 'false') return 'No';
    const s = String(v ?? '').trim().toLowerCase();
    if (s === 'yes') return 'Yes';
    if (s === 'no') return 'No';
    return String(v ?? '').trim();
  },
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

/** Normalized routing slice for logging and error responses */
export function buildMatchContext(formData, allowedFields = []) {
  const ctx = {};
  for (const key of allowedFields) {
    ctx[key] = getValue(formData, key);
  }
  return ctx;
}
