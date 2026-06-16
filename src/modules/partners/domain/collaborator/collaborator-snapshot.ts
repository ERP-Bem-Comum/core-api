/**
 * `snapshotOf(c: Collaborator): string` — serialização determinística e AGNÓSTICA do agregado
 * `Collaborator` para o histórico de alterações (#44).
 *
 * Decisão de desacoplamento (CA5): o snapshot é genérico — itera as chaves do agregado em ordem
 * estável e emite `key=value` por linha. Quando a trilha A adicionar um campo novo ao agregado,
 * ele entra no snapshot SEM mudança no schema de `par_collaborator_history` nem neste serializer
 * (as chaves novas são captadas automaticamente). Funções puras, sem I/O, sem `throw`.
 *
 * Codificação: cada par vira `key=value`, linhas unidas por `\n`. Chaves ordenadas
 * lexicograficamente (determinismo). Valores normalizados:
 *   - `null`/`undefined` → '' (string vazia).
 *   - `Date` → ISO 8601 (`toISOString`).
 *   - demais → `String(value)` (VOs branded são strings; enums são literais string).
 */

import type { Collaborator } from './types.ts';

const normalize = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  // Primitivos do agregado (string/number/boolean — VOs branded são string; enums são literais).
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  // Defensivo (CA5): um campo objeto novo é serializado por JSON, não como '[object Object]'.
  return JSON.stringify(value);
};

export const snapshotOf = (c: Collaborator): string => {
  // `Record<string, unknown>` para varrer chaves de forma agnóstica (sem listar campos à mão).
  const flat = c as unknown as Record<string, unknown>;
  const keys = Object.keys(flat).sort((a, b) => a.localeCompare(b));
  return keys.map((key) => `${key}=${normalize(flat[key])}`).join('\n');
};
