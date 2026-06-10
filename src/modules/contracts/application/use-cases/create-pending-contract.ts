import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import * as ContractorRef from '../../domain/shared/contractor.ts';
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
  // CTR-CONTRACT-SEQUENTIAL-NUMBER: opcional — gerado pelo backend (ano do clock)
  // quando ausente. Espelha `createContract` (POST /contracts modo Pending).
  sequentialNumber?: string;
  title: string;
  objective: string;
  originalValueCents: number;
  periodStart: string;
  periodEnd: string | null;
  contractorType: string;
  contractorId: string;
}>;

export type CreatePendingContractError =
  | ContractInputParseError
  | ContractorRef.ContractorRefError
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

    const contractor = ContractorRef.make(cmd.contractorType, cmd.contractorId);
    if (!contractor.ok) return contractor;

    // CTR-CONTRACT-SEQUENTIAL-NUMBER: gera por ano quando ausente; preserva se fornecido.
    let sequentialNumber = cmd.sequentialNumber;
    if (sequentialNumber === undefined || sequentialNumber === '') {
      const generated = await deps.contractRepo.nextSequentialNumber(
        deps.clock.now().getFullYear(),
      );
      if (!generated.ok) return generated;
      sequentialNumber = generated.value;
    }

    // Unicidade de sequentialNumber (R4) — antes do save (UNIQUE INDEX é a rede).
    const existing = await deps.contractRepo.findBySequentialNumber(sequentialNumber);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('contract-sequential-number-duplicated');

    const created = Contract.createPending({
      id: ContractId.generate(),
      sequentialNumber,
      title: cmd.title,
      objective: cmd.objective,
      originalValue: parsed.value.originalValue,
      originalPeriod: parsed.value.originalPeriod,
      contractor: contractor.value,
      createdAt: deps.clock.now(),
    });
    if (!created.ok) return created;

    const saved = await deps.contractRepo.save(created.value.contract, [created.value.event]);
    if (!saved.ok) return saved;

    return ok(created.value);
  };
