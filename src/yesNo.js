/** Fields compared in DocuSign templates as `== 'Yes'` / `== 'No'`. */
export const YES_NO_FORM_FIELDS = ['isTeam', 'loi', 'waiveFirstYearFee', 'resideInCal'];

export function normalizeYesNoValue(value) {
  if (value === true || value === 'true') return 'Yes';
  if (value === false || value === 'false') return 'No';
  if (value === 'Yes' || value === 'No') return value;
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'yes') return 'Yes';
  if (s === 'no') return 'No';
  return String(value ?? '').trim();
}
