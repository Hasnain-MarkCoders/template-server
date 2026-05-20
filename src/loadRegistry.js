import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..', 'data');
export const REGISTRY_PATH = path.join(DATA_DIR, 'registry.json');
export const TEMPLATES_DIR = path.join(DATA_DIR, 'templates');

let cachedRegistry = null;

export function readRegistryFromDisk() {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  return JSON.parse(raw);
}

export function loadRegistry() {
  if (!cachedRegistry) {
    cachedRegistry = readRegistryFromDisk();
  }
  return cachedRegistry;
}

export function setRegistryCache(registry) {
  cachedRegistry = registry;
}

export function loadTemplateFile(fileName) {
  const filePath = path.join(TEMPLATES_DIR, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}
