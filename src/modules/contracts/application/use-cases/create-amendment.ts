import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as AmendmentId from '../../domain/shared/amendment-id.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import * as Money from '#src/shared/kernel/money.ts';
import type { MoneyError } from '#src/shared/kernel/money.ts';
import * as NonZeroMoney from '#src/shared/kernel/non-zero-money.ts';
import { Amendment } from '../../domain/amendment/amendment.ts';
import type {
  PendingWithoutDocumentAmendment,
  CreateAmendmentInput,
} from '../../domain/amendment/types.ts';
import type { AmendmentEvent } from '../../domain/amendment/events.ts';
import * as AmendmentErrors from '../../domain/amendment/errors.ts';
import type { AmendmentError } from '../../domain/amendment/errors.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../../domain/amendment/repository.ts';

// CA-5+CA-6 (CTR-OUTBOX-INTEGRATION-IN-REPOS):
//   - eventBus removido de Deps.
//   - Evento passado como 2º argumento de amendmentRepo.save.

type CommonFields = Readonly<{
  contractId: string;
  amendmentNumber: string;
  description: string;
}>;

export type CreateAmendmentCommand = CommonFields &
  Readonly<
    | { kind: 'Addition'; impactValueCents: number }
    | { kind: 'Suppression'; impactValueCents: number }
    | { kind: 'TermChange'; newEndDate: string }
    | { kind: 'Misc' }
  >;

export type CreateAmendmentError =
  | ContractIdError
  | 'contract-not-found'
  | 'create-amendment-invalid-new-end-date'
  | 'create-amendment-term-change-not-extending'
  | 'create-amendment-cannot-extend-indefinite'
  | 'amendment-suppression-exceeds-current-value'
  | MoneyError
  | AmendmentError
  | ContractRepositoryError
  | AmendmentRepositoryError;

export type CreateAmendmentOutput = Readonly<{
  amendment: PendingWithoutDocumentAmendment;
  event: AmendmentEvent;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  clock: Clock;
}>;

const buildDomainInput = (
  cmd: CreateAmendmentCommand,
  contractId: ContractId.ContractId,
  createdAt: Date,
): Result<CreateAmendmentInput, CreateAmendmentError> => {
  const baseFields = {
    id: AmendmentId.generate(),
    contractId,
    amendmentNumber: cmd.amendmentNumber,
    description: cmd.description,
    createdAt,
  };

  switch (cmd.kind) {
    case 'Addition':
    case 'Suppression': {
      const money = Money.fromCents(cmd.impactValueCents);
      if (!money.ok) return money;
      // DO D§26 (rota γ): caso de uso é o orquestrador que refina Money → NonZeroMoney.
      const nonZero = NonZeroMoney.from(money.value);
      if (!nonZero.ok) return err(AmendmentErrors.amendmentImpactValueZero());
      return ok({ ...baseFields, kind: cmd.kind, impactValue: nonZero.value });
    }
    case 'TermChange': {
      const newEnd = new Date(cmd.newEndDate);
      if (!isValidDate(newEnd)) {
        return err('create-amendment-invalid-new-end-date');
      }
      return ok({ ...baseFields, kind: 'TermChange', newEndDate: newEnd });
    }
    case 'Misc':
      return ok({ ...baseFields, kind: 'Misc' });
  }
  // Exhaustive: TS valida `cmd.kind` em compile time.
};

export const createAmendment =
  (deps: Deps) =>
  async (
    cmd: CreateAmendmentCommand,
  ): Promise<Result<CreateAmendmentOutput, CreateAmendmentError>> => {
    const contractIdResult = ContractId.rehydrate(cmd.contractId);
    if (!contractIdResult.ok) return contractIdResult;

    const contractLoad = await deps.contractRepo.findById(contractIdResult.value);
    if (!contractLoad.ok) return contractLoad;
    if (contractLoad.value === null) return err('contract-not-found');

    const domainInput = buildDomainInput(cmd, contractIdResult.value, deps.clock.now());
    if (!domainInput.ok) return domainInput;

    // Defeito #11: fail-fast em TermChange retroativo.
    if (domainInput.value.kind === 'TermChange') {
      const currentPeriod = contractLoad.value.currentPeriod;
      if (currentPeriod.kind === 'Indefinite') {
        return err('create-amendment-cannot-extend-indefinite');
      }
      if (domainInput.value.newEndDate.getTime() <= currentPeriod.end.getTime()) {
        return err('create-amendment-term-change-not-extending');
      }
    }

    // REGR #7: fail-fast em Suppression que excederia o valor vigente.
    if (
      domainInput.value.kind === 'Suppression' &&
      domainInput.value.impactValue.cents > contractLoad.value.currentValue.cents
    ) {
      return err('amendment-suppression-exceeds-current-value');
    }

    const created = Amendment.create(domainInput.value);
    if (!created.ok) return created;

    // CA-5: evento passado diretamente no save — persiste state + outbox atomicamente.
    const saveResult = await deps.amendmentRepo.save(created.value.amendment, [
      created.value.event,
    ]);
    if (!saveResult.ok) return saveResult;

    return ok({
      amendment: created.value.amendment,
      event: created.value.event,
    });
  };
