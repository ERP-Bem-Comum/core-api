import { type Result, ok, err } from '../../../../shared/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import { AmendmentId, ContractId, type ContractIdError } from '../../domain/shared/ids.ts';
import { Money, type MoneyError } from '../../domain/shared/money.ts';
import { Amendment } from '../../domain/amendment/amendment.ts';
import type {
  Amendment as AmendmentEntity,
  CreateAmendmentInput,
} from '../../domain/amendment/types.ts';
import type { AmendmentEvent } from '../../domain/amendment/events.ts';
import type { AmendmentError } from '../../domain/amendment/errors.ts';
import type { ContractRepository, ContractRepositoryError } from '../ports/contract-repository.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../ports/amendment-repository.ts';
import type { EventBus, EventBusError } from '../ports/event-bus.ts';

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
  | AmendmentRepositoryError
  | EventBusError;

export type CreateAmendmentOutput = Readonly<{
  amendment: AmendmentEntity;
  event: AmendmentEvent;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  eventBus: EventBus;
  clock: Clock;
}>;

const buildDomainInput = (
  cmd: CreateAmendmentCommand,
  contractId: ContractId,
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
      return ok({ ...baseFields, kind: cmd.kind, impactValue: money.value });
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

    // Defeito #11: fail-fast em TermChange retroativo (em vez de só detectar na homologação).
    if (domainInput.value.kind === 'TermChange') {
      const currentPeriod = contractLoad.value.currentPeriod;
      if (currentPeriod.kind === 'Indefinite') {
        return err('create-amendment-cannot-extend-indefinite');
      }
      if (domainInput.value.newEndDate.getTime() <= currentPeriod.end.getTime()) {
        return err('create-amendment-term-change-not-extending');
      }
    }

    // REGR #7 (2026-05-15): fail-fast em Suppression que excederia o valor
    // vigente. Sem isso, o aditivo ficava em status `Pending` (persistido +
    // evento publicado) e só falhava na homologação com
    // `contract-value-would-go-negative` — UX terrível e leaks de estado
    // inconsistente. Agora validamos contra `contractLoad.value.currentValue`
    // já na criação, sem persistir nem publicar evento.
    if (
      domainInput.value.kind === 'Suppression' &&
      domainInput.value.impactValue.cents > contractLoad.value.currentValue.cents
    ) {
      return err('amendment-suppression-exceeds-current-value');
    }

    const created = Amendment.create(domainInput.value);
    if (!created.ok) return created;

    const saveResult = await deps.amendmentRepo.save(created.value.amendment);
    if (!saveResult.ok) return saveResult;

    const publishResult = await deps.eventBus.publish(created.value.event);
    if (!publishResult.ok) return publishResult;

    return ok({
      amendment: created.value.amendment,
      event: created.value.event,
    });
  };
