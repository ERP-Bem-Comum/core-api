/**
 * Export CSV do histórico de alterações do Colaborador (US4) — FORMATO LEGADO.
 *
 * Cabeçalho literal `tipo_alteracao;historico_antes;historico_depois;data_alteracao` + coluna
 * `programa` mantida VAZIA (descartada no core-api; preservada para compatibilidade do importador
 * legado). Separador `;`, datas `dd/MM/aaaa` (UTC). Escape/anti-fórmula via util compartilhado.
 *
 * Adapter de apresentação puro (sem port, sem IO).
 */

import { toCsv } from '#src/shared/utils/csv.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/application/ports/collaborator-history.ts';

const SEPARATOR = ';';
const HEADER: readonly string[] = [
  'tipo_alteracao',
  'historico_antes',
  'historico_depois',
  'data_alteracao',
  'programa',
];

const formatDate = (d: Date): string => {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
};

const entryToCells = (e: CollaboratorHistoryEntry): readonly string[] => [
  e.fieldLabel,
  e.valueBefore ?? '',
  e.valueAfter ?? '',
  formatDate(e.occurredAt),
  '', // programa — vazia (formato legado)
];

export const collaboratorHistoryToCsv = (entries: readonly CollaboratorHistoryEntry[]): string =>
  toCsv(HEADER, entries.map(entryToCells), SEPARATOR);
