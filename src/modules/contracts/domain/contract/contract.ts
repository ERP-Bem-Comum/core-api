import { type Result, ok, err } from '../../../../shared/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import { isBlank } from '../../../../shared/utils/string.ts';
import { Money } from '../shared/money.ts';
import { Period } from '../shared/period.ts';
import type {
  Contract as ContractEntity,
  ContractAdjustment,
  CreateContractInput,
} from './types.ts';
import type { ContractEvent } from './events.ts';
import type { ContractError } from './errors.ts';

type CommandOutput = Readonly<{
  contract: ContractEntity;
  event: ContractEvent;
}>;

const assertActive = (contract: ContractEntity): Result<ContractEntity, 'contract-not-active'> =>
  contract.status === 'Active' ? ok(contract) : err('contract-not-active');

const assertValidEventDate = (at: Date): Result<Date, 'contract-invalid-event-date'> =>
  isValidDate(at) ? ok(at) : err('contract-invalid-event-date');

const stateUpdatedEvent = (
  contract: ContractEntity,
  occurredAt: Date,
  amendmentId: ContractAdjustment['amendmentId'],
): ContractEvent => ({
  type: 'ContractStateUpdated',
  contractId: contract.id,
  occurredAt,
  amendmentId,
  newCurrentValue: contract.currentValue,
  newCurrentPeriod: contract.currentPeriod,
});

// Defeito #6: formato canônico XXX/AAAA (3 dígitos, barra, 4 dígitos)
const SEQUENTIAL_NUMBER_FORMAT = /^\d{3}\/\d{4}$/;

const create = (input: CreateContractInput): Result<CommandOutput, ContractError> => {
  if (isBlank(input.sequentialNumber)) {
    return err('contract-sequential-number-required');
  }
  if (!SEQUENTIAL_NUMBER_FORMAT.test(input.sequentialNumber)) {
    return err('contract-sequential-number-invalid-format');
  }
  if (isBlank(input.title)) return err('contract-title-required');
  if (isBlank(input.objective)) return err('contract-objective-required');
  if (!isValidDate(input.signedAt)) return err('contract-invalid-signed-at');
  // Defeito #9: contrato com valor original zero não tem propósito de negócio.
  if (input.originalValue.cents === 0) return err('contract-original-value-zero');

  const contract = {
    id: input.id,
    sequentialNumber: input.sequentialNumber,
    title: input.title,
    objective: input.objective,
    signedAt: input.signedAt,
    originalValue: input.originalValue,
    originalPeriod: input.originalPeriod,
    currentValue: input.originalValue,
    currentPeriod: input.originalPeriod,
    status: 'Active',
    homologatedAmendmentIds: [],
    endedAt: null,
  } as unknown as ContractEntity;

  const event: ContractEvent = {
    type: 'ContractCreated',
    contractId: contract.id,
    occurredAt: input.signedAt,
  };

  return ok({ contract, event });
};

const expire = (contract: ContractEntity, at: Date): Result<CommandOutput, ContractError> => {
  const activeCheck = assertActive(contract);
  if (!activeCheck.ok) return activeCheck;
  const atCheck = assertValidEventDate(at);
  if (!atCheck.ok) return atCheck;

  if (contract.currentPeriod.kind === 'Indefinite') {
    return err('contract-cannot-expire-indefinite-period');
  }

  if (at.getTime() < contract.currentPeriod.end.getTime()) {
    return err('contract-cannot-expire-yet');
  }

  const next = {
    ...contract,
    status: 'Expired',
    endedAt: at,
  } as unknown as ContractEntity;

  const event: ContractEvent = {
    type: 'ContractEnded',
    contractId: contract.id,
    occurredAt: at,
    kind: 'Expired',
  };

  return ok({ contract: next, event });
};

const terminate = (contract: ContractEntity, at: Date): Result<CommandOutput, ContractError> => {
  const activeCheck = assertActive(contract);
  if (!activeCheck.ok) return activeCheck;
  const atCheck = assertValidEventDate(at);
  if (!atCheck.ok) return atCheck;

  const next = {
    ...contract,
    status: 'Terminated',
    endedAt: at,
  } as unknown as ContractEntity;

  const event: ContractEvent = {
    type: 'ContractEnded',
    contractId: contract.id,
    occurredAt: at,
    kind: 'Terminated',
  };

  return ok({ contract: next, event });
};

const applyHomologatedAdjustment = (
  contract: ContractEntity,
  adjustment: ContractAdjustment,
  at: Date,
): Result<CommandOutput, ContractError> => {
  const activeCheck = assertActive(contract);
  if (!activeCheck.ok) return activeCheck;
  const atCheck = assertValidEventDate(at);
  if (!atCheck.ok) return atCheck;

  if (contract.homologatedAmendmentIds.includes(adjustment.amendmentId)) {
    return err('contract-amendment-already-applied');
  }

  const nextIds = [...contract.homologatedAmendmentIds, adjustment.amendmentId] as const;

  switch (adjustment.kind) {
    case 'ValueIncrease': {
      const next = {
        ...contract,
        currentValue: Money.add(contract.currentValue, adjustment.amount),
        homologatedAmendmentIds: nextIds,
      } as unknown as ContractEntity;
      return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
    }
    case 'ValueDecrease': {
      const subtracted = Money.subtract(contract.currentValue, adjustment.amount);
      if (!subtracted.ok) return err('contract-value-would-go-negative');
      const next = {
        ...contract,
        currentValue: subtracted.value,
        homologatedAmendmentIds: nextIds,
      } as unknown as ContractEntity;
      return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
    }
    case 'PeriodExtension': {
      if (contract.currentPeriod.kind === 'Indefinite') {
        return err('contract-cannot-extend-indefinite-period');
      }
      if (adjustment.newEnd.getTime() <= contract.currentPeriod.end.getTime()) {
        return err('contract-period-extension-not-after-current-end');
      }
      const newPeriod = Period.create(contract.currentPeriod.start, adjustment.newEnd);
      if (!newPeriod.ok) {
        return err('contract-period-extension-not-after-current-end');
      }
      const next = {
        ...contract,
        currentPeriod: newPeriod.value,
        homologatedAmendmentIds: nextIds,
      } as unknown as ContractEntity;
      return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
    }
    case 'Acknowledgment': {
      const next = {
        ...contract,
        homologatedAmendmentIds: nextIds,
      } as unknown as ContractEntity;
      return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
    }
  }
  // Exhaustive switch acima cobre todas as variantes de ContractAdjustment.
  // tsconfig.noFallthroughCasesInSwitch + tsc enforce exhaustividade no compile.
  // Sem ramo `default` com `throw` — regra "Zero throw" do domain.
};

export const Contract = {
  create,
  expire,
  terminate,
  applyHomologatedAdjustment,
};
