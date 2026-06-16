/**
 * VO/tipos do histórico de alterações do Colaborador (#44).
 *
 *   - `CollaboratorChangeType` — tipo de alteração (string-literal-union EN). Espelha o ciclo de
 *     vida do agregado: cadastro inicial NÃO gera entry (decisão CA1b), mas mantemos 'Cadastro'
 *     no conjunto para compatibilidade legada/ETL futura. A captura ativa usa Complementacao/
 *     Edicao/Desativacao/Reativacao.
 *   - `CollaboratorHistoryEntry` — uma linha append-only do histórico. `before`/`after` são
 *     snapshots serializados GENÉRICOS do agregado (ver `collaborator-snapshot.ts`), o que
 *     desacopla a tabela dos campos do agregado (CA5). `before` é null no primeiro registro
 *     (sem estado anterior); `after` é sempre presente.
 *
 * Smart constructor `make` injeta id/occurredAt (sem `Date.now()`/`randomUUID` aqui — domínio puro).
 */

import { immutable } from '#src/shared/primitives/immutable.ts';
import type { CollaboratorId } from './collaborator-id.ts';
import type { CollaboratorHistoryId } from './collaborator-history-id.ts';

export const COLLABORATOR_CHANGE_TYPES = [
  'Cadastro',
  'Complementacao',
  'Edicao',
  'Desativacao',
  'Reativacao',
] as const;

export type CollaboratorChangeType = (typeof COLLABORATOR_CHANGE_TYPES)[number];

export type CollaboratorHistoryEntry = Readonly<{
  id: CollaboratorHistoryId;
  collaboratorRef: CollaboratorId;
  changeType: CollaboratorChangeType;
  /** Snapshot serializado do agregado ANTES (null = sem estado anterior). */
  before: string | null;
  /** Snapshot serializado do agregado DEPOIS (sempre presente). */
  after: string;
  occurredAt: Date;
  /** UUID do auth.User autor da alteração (null enquanto a borda não propaga o ator). */
  changedByRef: string | null;
}>;

export type MakeCollaboratorHistoryEntryInput = Readonly<{
  id: CollaboratorHistoryId;
  collaboratorRef: CollaboratorId;
  changeType: CollaboratorChangeType;
  before: string | null;
  after: string;
  occurredAt: Date;
  changedByRef?: string | null;
}>;

export const make = (input: MakeCollaboratorHistoryEntryInput): CollaboratorHistoryEntry =>
  immutable({
    id: input.id,
    collaboratorRef: input.collaboratorRef,
    changeType: input.changeType,
    before: input.before,
    after: input.after,
    occurredAt: input.occurredAt,
    changedByRef: input.changedByRef ?? null,
  });
