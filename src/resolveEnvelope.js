/**
 * Evaluates n8n-style {{ $json.... }} placeholders embedded in DocuSign envelope JSON.
 * Generic — no per-field switches.
 */

function formatEvalResult(result) {
  if (result === undefined || result === null) return '';
  if (typeof result === 'boolean') return result ? 'true' : 'false';
  return String(result);
}

export function evaluateExpression(inner, item) {
  const expr = inner.replace(/\$json/g, 'json');
  try {
    const result = Function('json', `return (${expr})`)(item);
    return formatEvalResult(result);
  } catch (e) {
    throw new Error(`Failed to evaluate: {{ ${inner} }} — ${e.message}`);
  }
}

export function resolveString(str, item) {
  if (typeof str !== 'string' || !str.includes('{{')) return str;
  return str.replace(/\{\{([\s\S]*?)\}\}/g, (_, inner) =>
    evaluateExpression(inner.trim(), item)
  );
}

export function resolveDeep(value, item) {
  if (typeof value === 'string') return resolveString(value, item);
  if (Array.isArray(value)) return value.map((v) => resolveDeep(v, item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolveDeep(v, item)])
    );
  }
  return value;
}

export function resolveEnvelope(envelope, item) {
  const resolved = resolveDeep(envelope, item);
  const serialized = JSON.stringify(resolved);
  if (serialized.includes('{{')) {
    throw new Error('Unresolved n8n expressions remain in envelope');
  }
  return resolved;
}
