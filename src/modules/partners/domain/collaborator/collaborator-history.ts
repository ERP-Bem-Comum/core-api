// Histórico de alterações do Colaborador (US4 feature 015). Audit trail como LOG DE
// ATUALIZAÇÕES por campo (Ramakrishnan & Gehrke §"rastreamento de auditoria") — uma
// mudança por campo rastreado. Domínio EN-puro: produz `fieldName` (EN) + valores como
// texto neutro; o label PT e a formatação do CSV legado ficam no adapter/export.

import type { Collaborator } from './types.ts';

/** Mudança de um campo: nome interno (EN) + valor antes/depois serializado (texto). */
export type CollaboratorFieldChange = Readonly<{
  fieldName: string;
  valueBefore: string | null;
  valueAfter: string | null;
}>;

// Campos sob auditoria (os editáveis via PUT + situação). Cadastro/completeRegistration
// inicial não passam por aqui. Projeção neutra (texto) — sem label PT, sem tradução de enum.
const trackedValues = (c: Collaborator): Readonly<Record<string, string | null>> => ({
  name: c.name,
  email: c.email,
  cpf: String(c.cpf),
  role: c.role,
  occupationArea: c.occupationArea,
  startOfContract: c.startOfContract.toISOString(),
  employmentRelationship: c.employmentRelationship,
  status: c.status,
  disableBy: c.status === 'Inactive' ? c.disableBy : null,
});

/**
 * Diff por campo entre dois estados do mesmo colaborador. Retorna uma `CollaboratorFieldChange`
 * por campo rastreado cujo valor mudou. Determinístico e puro (sem I/O, sem `Date.now`).
 */
export const diffCollaborator = (
  before: Collaborator,
  after: Collaborator,
): readonly CollaboratorFieldChange[] => {
  const b = trackedValues(before);
  const a = trackedValues(after);
  const changes: CollaboratorFieldChange[] = [];
  for (const fieldName of Object.keys(a)) {
    const valueBefore = b[fieldName] ?? null;
    const valueAfter = a[fieldName] ?? null;
    if (valueBefore !== valueAfter) changes.push({ fieldName, valueBefore, valueAfter });
  }
  return changes;
};
