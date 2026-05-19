import { type Result, ok, err } from '../../../../shared/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import { ContractId } from '../../domain/shared/ids.ts';
import { Money, type MoneyError } from '../../domain/shared/money.ts';
import { Period, type PeriodError } from '../../domain/shared/period.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type { Contract as ContractEntity } from '../../domain/contract/types.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import type { ContractRepository, ContractRepositoryError } from '../ports/contract-repository.ts';
import type { EventBus, EventBusError } from '../ports/event-bus.ts';

export type CreateContractCommand = Readonly<{
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAt: string;
  originalValueCents: number;
  originalPeriodStart: string;
  originalPeriodEnd: string | null;
}>;

export type CreateContractError =
  | 'create-contract-invalid-signed-at'
  | 'create-contract-invalid-period-start'
  | 'create-contract-invalid-period-end'
  | 'contract-sequential-number-duplicated'
  | MoneyError
  | PeriodError
  | ContractError
  | ContractRepositoryError
  | EventBusError;

export type CreateContractOutput = Readonly<{
  contract: ContractEntity;
  event: ContractEvent;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  eventBus: EventBus;
  clock: Clock;
}>;

export const createContract =
  (deps: Deps) =>
  async (
    cmd: CreateContractCommand,
  ): Promise<Result<CreateContractOutput, CreateContractError>> => {
    const signedAt = new Date(cmd.signedAt);
    if (!isValidDate(signedAt)) return err('create-contract-invalid-signed-at');

    const periodStart = new Date(cmd.originalPeriodStart);
    if (!isValidDate(periodStart)) {
      return err('create-contract-invalid-period-start');
    }

    const moneyResult = Money.fromCents(cmd.originalValueCents);
    if (!moneyResult.ok) return moneyResult;

    const periodResult =
      cmd.originalPeriodEnd === null
        ? Period.createIndefinite(periodStart)
        : (() => {
            const end = new Date(cmd.originalPeriodEnd);
            if (!isValidDate(end)) {
              return err('create-contract-invalid-period-end' as const);
            }
            return Period.create(periodStart, end);
          })();
    if (!periodResult.ok) return periodResult;

    const created = Contract.create({
      id: ContractId.generate(),
      sequentialNumber: cmd.sequentialNumber,
      title: cmd.title,
      objective: cmd.objective,
      signedAt,
      originalValue: moneyResult.value,
      originalPeriod: periodResult.value,
    });
    if (!created.ok) return created;

    // Defeito #5: regra de unicidade de sequentialNumber (R4 do handbook).
    // Check antes do save; MySQL real terá UNIQUE INDEX como rede de segurança.
    const existing = await deps.contractRepo.findBySequentialNumber(cmd.sequentialNumber);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('contract-sequential-number-duplicated');

    const saveResult = await deps.contractRepo.save(created.value.contract);
    if (!saveResult.ok) return saveResult;

    const publishResult = await deps.eventBus.publish(created.value.event);
    if (!publishResult.ok) return publishResult;

    return ok({
      contract: created.value.contract,
      event: created.value.event,
    });
  };
