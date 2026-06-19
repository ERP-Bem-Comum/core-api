/**
 * Export CSV do histórico de alterações do Colaborador (#126) — FORMATO LEGADO de 9 colunas.
 *
 * Cabeçalho literal:
 *   nome;email;cpf;programa;inicio_contrato;tipo_alteracao;historico_antes;historico_depois;data_alteracao
 *
 * A identidade (nome/email/cpf/programa/inicio_contrato) é repetida em cada linha de alteração;
 * `programa` = área de atuação. Serve tanto o export da LISTA (vários colaboradores) quanto o do
 * DETALHE (um). Separador `;`, datas `dd/MM/aaaa` (UTC). Escape/anti-fórmula via util compartilhado.
 *
 * Adapter de apresentação puro (sem port, sem IO).
 */

import { toCsv } from '#src/shared/utils/csv.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/application/ports/collaborator-history.ts';

/** Identidade do colaborador repetida por linha (colunas 1-5 do formato legado). */
export type CollaboratorHistoryIdentity = Readonly<{
  name: string;
  email: string;
  cpf: string;
  programa: string; // = área de atuação (occupationArea)
  startOfContract: Date;
}>;

/** Um colaborador + suas entradas de histórico. Colaborador sem alterações não gera linhas. */
export type CollaboratorHistoryGroup = Readonly<{
  identity: CollaboratorHistoryIdentity;
  entries: readonly CollaboratorHistoryEntry[];
}>;

const SEPARATOR = ';';
const HEADER: readonly string[] = [
  'nome',
  'email',
  'cpf',
  'programa',
  'inicio_contrato',
  'tipo_alteracao',
  'historico_antes',
  'historico_depois',
  'data_alteracao',
];

const formatDate = (d: Date): string => {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
};

const groupToRows = (g: CollaboratorHistoryGroup): readonly (readonly string[])[] =>
  g.entries.map((e) => [
    g.identity.name,
    g.identity.email,
    g.identity.cpf,
    g.identity.programa,
    formatDate(g.identity.startOfContract),
    e.fieldLabel,
    e.valueBefore ?? '',
    e.valueAfter ?? '',
    formatDate(e.occurredAt),
  ]);

export const collaboratorHistoryToCsv = (groups: readonly CollaboratorHistoryGroup[]): string =>
  toCsv(HEADER, groups.flatMap(groupToRows), SEPARATOR);
