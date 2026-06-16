/**
 * Serialização CSV LEGADA do histórico de alterações do Colaborador (#44).
 *
 * Formato do legado (distinto do export cadastral RFC-4180 do `collaborator-csv.ts`):
 *   - cabeçalho fixo `tipo_alteracao;antes;depois;data`;
 *   - separador `;` (não `,`);
 *   - datas no formato `dd/MM/aaaa`;
 *   - escape de célula reusa `escapeCsvCell` do util compartilhado (aspas/anti-fórmula) — não
 *     parametrizamos o util (que mantém o separador `,` RFC-4180 dos demais exports), só trocamos
 *     o `join` por `;` aqui (ADR-0002 da feature: serialização é borda; util genérico intacto).
 *
 * `antes`/`depois` carregam o snapshot serializado genérico do agregado (agnóstico — CA5).
 * Adapter de apresentação puro: sem port, sem use case, sem IO.
 */

import { escapeCsvCell } from '#src/shared/utils/csv.ts';
import type { CollaboratorHistoryEntry } from '../../domain/collaborator/collaborator-history.ts';

const HISTORY_SEPARATOR = ';';
const HISTORY_LINE_TERMINATOR = '\r\n';

const HEADER: readonly string[] = ['tipo_alteracao', 'antes', 'depois', 'data'];

// `dd/MM/aaaa` (legado). Usa componentes UTC para determinismo independente do fuso do runner.
const toLegacyDate = (d: Date): string => {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = String(d.getUTCFullYear());
  return `${day}/${month}/${year}`;
};

// `escapeCsvCell` (util compartilhado) cobre anti-fórmula + aspas RFC-4180 do separador `,`. Como
// aqui o separador é `;`, uma célula que contenha `;` (e não tenha sido citada pelo util) também
// precisa ser citada — senão quebraria a coluna. Caso já citada (começa com `"`), não reescapa.
const escapeHistoryCell = (raw: string): string => {
  const escaped = escapeCsvCell(raw);
  const alreadyQuoted = escaped.startsWith('"') && escaped.endsWith('"');
  if (!alreadyQuoted && escaped.includes(HISTORY_SEPARATOR)) {
    return `"${escaped.replaceAll('"', '""')}"`;
  }
  return escaped;
};

const toLine = (cells: readonly string[]): string =>
  cells.map(escapeHistoryCell).join(HISTORY_SEPARATOR);

const entryToCells = (e: CollaboratorHistoryEntry): readonly string[] => [
  e.changeType,
  e.before ?? '',
  e.after,
  toLegacyDate(e.occurredAt),
];

export const collaboratorHistoryToCsv = (entries: readonly CollaboratorHistoryEntry[]): string => {
  const lines = [toLine(HEADER), ...entries.map((e) => toLine(entryToCells(e)))];
  return lines.join(HISTORY_LINE_TERMINATOR) + HISTORY_LINE_TERMINATOR;
};
