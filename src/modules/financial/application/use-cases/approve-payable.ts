/**
 * Use case `approvePayable` — primeiro use case real do módulo Financial.
 *
 * Transição **Open → Approved** (R1 Soberania da Aprovação —
 * `handbook/domain/04-titulos-liquidacao-context.md` §5). Aprovador autorizado
 * move o título da fila de pendências para a fila de remessa bancária.
 *
 * **Sequência canônica** (`.claude/rules/application.md`):
 *   1. Validar `payableId` via `PayableId.rehydrate` (UUID v4 check).
 *   2. Validar `approvedByRaw` via `UserRef.rehydrate` (UUID v4 check).
 *   3. `clock.now()` → `approvedAt` (use case injeta data; domínio é puro).
 *   4. `repo.findById` — guard `not-found` se `null`.
 *   5. `Payable.approve(payable, approvedBy, approvedAt)` — operação de domínio.
 *   6. `repo.save(payable, [event])` — persiste state + outbox atomicamente
 *      (ADR-0015 D2). Use case **NÃO** chama `outbox.append` diretamente.
 *   7. Retorna `{ payable, event }`.
 *
 * Pattern espelha `src/modules/contracts/application/use-cases/create-contract.ts`
 * (sem `EventBus` em Deps — evento é passado no `save`).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import { Payable } from '#src/modules/financial/domain/payable/payable.ts';
import type { ApprovedPayable } from '#src/modules/financial/domain/payable/types.ts';
import type { PayableEvent } from '#src/modules/financial/domain/payable/events.ts';
import type * as PayableError from '#src/modules/financial/domain/payable/errors.ts';
import type {
  PayableRepository,
  PayableRepositoryError,
} from '#src/modules/financial/domain/payable/repository.ts';

export type ApprovePayableCommand = Readonly<{
  payableId: string; // string crua — use case faz rehydrate
  approvedByRaw: string; // string crua — use case faz rehydrate
}>;

export type ApprovePayableError =
  | 'approve-payable-invalid-id'
  | 'approve-payable-not-found'
  | UserRef.UserRefError
  | PayableError.PayableError
  | PayableRepositoryError;

export type ApprovePayableOutput = Readonly<{
  payable: ApprovedPayable;
  event: PayableEvent;
}>;

type Deps = Readonly<{
  payableRepo: PayableRepository;
  clock: Clock;
}>;

export const approvePayable =
  (deps: Deps) =>
  async (
    cmd: ApprovePayableCommand,
  ): Promise<Result<ApprovePayableOutput, ApprovePayableError>> => {
    const idResult = PayableId.rehydrate(cmd.payableId);
    if (!idResult.ok) return err('approve-payable-invalid-id');

    const approverResult = UserRef.rehydrate(cmd.approvedByRaw);
    if (!approverResult.ok) return approverResult;

    const fetched = await deps.payableRepo.findById(idResult.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('approve-payable-not-found');

    const approvedAt = deps.clock.now();
    const transition = Payable.approve(fetched.value, approverResult.value, approvedAt);
    if (!transition.ok) return transition;

    const saveResult = await deps.payableRepo.save(transition.value.payable, [
      transition.value.event,
    ]);
    if (!saveResult.ok) return saveResult;

    return ok({
      payable: transition.value.payable,
      event: transition.value.event,
    });
  };
