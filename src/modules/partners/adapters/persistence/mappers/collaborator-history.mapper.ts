// Montagem das entradas de histórico (US4). Concentra os concerns de apresentação/persistência:
// label PT do campo (desnormalizado na linha — imutabilidade histórica), geração de id e o diff
// de domínio (`diffCollaborator`). O domínio permanece EN-puro.

import { randomUUID } from 'node:crypto';
import { diffCollaborator } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type {
  CollaboratorHistoryEntry,
  RecordHistoryInput,
} from '#src/modules/partners/application/ports/collaborator-history.ts';

// Campos auditados → label PT (CSV legado). Subconjunto dos editáveis via PUT + situação (US4 §2).
export const COLLABORATOR_FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'Nome',
  email: 'E-mail',
  cpf: 'CPF',
  role: 'Cargo',
  occupationArea: 'Área de Atuação',
  startOfContract: 'Início do Contrato',
  employmentRelationship: 'Vínculo',
  status: 'Situação',
  disableBy: 'Motivo de Desativação',
  // #126: novos campos rastreados (linhas adicionais no histórico).
  territory: 'Território',
  bankAccount: 'Banco',
  pixKey: 'Chave PIX',
};

/** Diff por campo → entradas materializadas (id, label PT). Diff vazio → []. */
export const buildHistoryEntries = (
  input: RecordHistoryInput,
): readonly CollaboratorHistoryEntry[] =>
  diffCollaborator(input.before, input.after).flatMap((change) => {
    const fieldLabel = COLLABORATOR_FIELD_LABELS[change.fieldName];
    if (fieldLabel === undefined) return [];
    return [
      {
        id: randomUUID(),
        collaboratorId: input.collaboratorId,
        eventType: input.eventType,
        fieldName: change.fieldName,
        fieldLabel,
        valueBefore: change.valueBefore,
        valueAfter: change.valueAfter,
        occurredAt: input.occurredAt,
      },
    ];
  });
