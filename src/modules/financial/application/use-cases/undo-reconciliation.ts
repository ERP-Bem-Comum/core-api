import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as ReconciliationId from '../../domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationId as ReconciliationIdT } from '../../domain/reconciliation/reconciliation-id.ts';
import { undo } from '../../domain/reconciliation/reconciliation.ts';
import type { ReconciliationError } from '../../domain/reconciliation/errors.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';

export type UndoReconciliationDeps = Readonly<{
  reconciliationRepo: Pick<ReconciliationRepository, 'findById' | 'undo'>;
  clock: Pick<Clock, 'now'>;
  outbox: FinancialOutbox;
}>;

export type UndoReconciliationInput = Readonly<{
  reconciliationId: string;
  undoneBy: string;
  reason?: string;
}>;

export type UndoReconciliationOutput = Readonly<{
  reconciliationId: ReconciliationIdT;
  status: 'Undone';
}>;

export type UndoReconciliationError =
  | ReconciliationError
  | 'reconciliation-id-invalid'
  | 'reconciliation-not-found'
  | ReconciliationRepositoryError
  | OutboxAppendError;

// Desfaz a conciliação (R7): carrega → domínio `undo` (Active→Undone) → unit-of-work atômico (reverte
// status de título/transação) → publica `ReconciliationUndone`. Preserva o registro (nunca deleta).
export const undoReconciliation =
  (deps: UndoReconciliationDeps) =>
  async (
    input: UndoReconciliationInput,
  ): Promise<Result<UndoReconciliationOutput, UndoReconciliationError>> => {
    const idR = ReconciliationId.rehydrate(input.reconciliationId);
    if (!idR.ok) return err('reconciliation-id-invalid');

    const found = await deps.reconciliationRepo.findById(idR.value);
    if (!found.ok) return err(found.error);
    if (found.value === null) return err('reconciliation-not-found');

    const undone = undo(found.value, {
      undoneBy: input.undoneBy,
      occurredAt: deps.clock.now(),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
    });
    if (!undone.ok) return err(undone.error);

    const saved = await deps.reconciliationRepo.undo(undone.value.reconciliation);
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(undone.value.events);
    if (!published.ok) return err(published.error);

    return ok({ reconciliationId: found.value.id, status: 'Undone' });
  };
