import fs from 'fs';
import path from 'path';
import {
  readRegistryFromDisk,
  TEMPLATES_DIR,
  loadTemplateFile,
} from './loadRegistry.js';

function canonicalizeMatchValue(value) {
  if (Array.isArray(value)) {
    return [...value].map((x) => String(x).trim()).sort();
  }
  return String(value).trim();
}

export function canonicalizeMatch(match) {
  const keys = Object.keys(match).sort();
  const out = {};
  for (const key of keys) {
    out[key] = canonicalizeMatchValue(match[key]);
  }
  return JSON.stringify(out);
}

/**
 * @param {object} registry
 * @param {{ checkFiles?: boolean }} [options]
 */
export function validateRegistry(registry, options = {}) {
  const { checkFiles = true } = options;
  const allowed = registry.allowedMatchFields ?? [];
  const payloads = registry.payloads ?? {};
  const rules = registry.rules ?? [];

  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error('registry.rules must be a non-empty array');
  }

  const seenIds = new Set();
  const seenMatchSigs = new Map();

  for (const rule of rules) {
    if (!rule.id) {
      throw new Error('Every rule must have an id');
    }
    if (seenIds.has(rule.id)) {
      throw new Error(`Duplicate rule id: ${rule.id}`);
    }
    seenIds.add(rule.id);

    if (!rule.payloadKey || !payloads[rule.payloadKey]) {
      throw new Error(`Rule ${rule.id}: unknown payloadKey ${rule.payloadKey}`);
    }

    const match = rule.match ?? {};
    if (Object.keys(match).length === 0) {
      throw new Error(`Rule ${rule.id}: match must not be empty`);
    }

    for (const key of Object.keys(match)) {
      if (allowed.length && !allowed.includes(key)) {
        throw new Error(`Rule ${rule.id}: disallowed match field ${key}`);
      }
    }

    const sig = canonicalizeMatch(match);
    if (seenMatchSigs.has(sig)) {
      throw new Error(
        `Duplicate match signature for rules ${seenMatchSigs.get(sig)} and ${rule.id}`
      );
    }
    seenMatchSigs.set(sig, rule.id);
  }

  for (const [payloadKey, meta] of Object.entries(payloads)) {
    if (!meta?.file) {
      throw new Error(`payloads.${payloadKey}: missing file`);
    }
    if (!checkFiles) continue;

    const filePath = path.join(TEMPLATES_DIR, meta.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`payloads.${payloadKey}: file not found ${meta.file}`);
    }

    const envelope = loadTemplateFile(meta.file);
    if (meta.templateId && envelope.templateId !== meta.templateId) {
      throw new Error(
        `payloads.${payloadKey}: registry templateId ${meta.templateId} !== envelope ${envelope.templateId}`
      );
    }
  }

  return registry;
}

export function validateRegistryOnDisk() {
  const registry = readRegistryFromDisk();
  return validateRegistry(registry, { checkFiles: true });
}
