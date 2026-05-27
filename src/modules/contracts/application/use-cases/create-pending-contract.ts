import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import {
  parseOriginalValueAndPeriod,
  type ContractInputParseError,
} from './contract-input-parse.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type { PendingContract } from '../../domain/contract/types.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';

// CTR-USECASE-CREATE-PENDING-CONTRACT (ADR-0023): cadastra um contrato `Pending`
// (sem assinatura). Porta de entrada para `Contract.createPending`. O `createdAt`
// do evento `ContractCreated` é injetado via `clock` (não há `signedAt` aqui).

export type CreatePendingContractCommand = Readonly<{
  sequentialNumber: string;
  title: string;
  objective: string;
  originalValueCents: number;
  periodStart: string;
  periodEnd: string | null;
}>;

export type CreatePendingContractError =
  | ContractInputParseError
  | 'contract-sequential-number-duplicated'
  | ContractError
  | ContractRepositoryError;

export type CreatePendingContractOutput = Readonly<{
  contract: PendingContract;
  event: ContractEvent;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  clock: Clock;
}>;

export const createPendingContract =
  (deps: Deps) =>
  async (
    cmd: CreatePendingContractCommand,
  ): Promise<Result<CreatePendingContractOutput, CreatePendingContractError>> => {
    const parsed = parseOriginalValueAndPeriod({
      originalValueCents: cmd.originalValueCents,
      periodStart: cmd.periodStart,
      periodEnd: cmd.periodEnd,
    });
    if (!parsed.ok) return parsed;

    // Unicidade de sequentialNumber (R4) — antes do save (UNIQUE INDEX é a rede).
    const existing = await deps.contractRepo.findBySequentialNumber(cmd.sequentialNumber);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('contract-sequential-number-duplicated');

    const created = Contract.createPending({
      id: ContractId.generate(),
      sequentialNumber: cmd.sequentialNumber,
      title: cmd.title,
      objective: cmd.objective,
      originalValue: parsed.value.originalValue,
      originalPeriod: parsed.value.originalPeriod,
      createdAt: deps.clock.now(),
    });
    if (!created.ok) return created;

    const saved = await deps.contractRepo.save(created.value.contract, [created.value.event]);
    if (!saved.ok) return saved;

    return ok(created.value);
  };
