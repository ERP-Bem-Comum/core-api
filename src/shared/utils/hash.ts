import { createHash } from 'node:crypto';

// Encapsula node:crypto (como id.ts encapsula randomUUID). sha256 é determinístico e puro —
// usado para chaves anti-duplicidade determinísticas (ex.: Fitid sintética de CSV sem FITID nativo).
export const sha256Hex = (input: string): string =>
  createHash('sha256').update(input, 'utf8').digest('hex');
