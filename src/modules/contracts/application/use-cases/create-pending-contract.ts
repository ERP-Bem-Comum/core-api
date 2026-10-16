import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import * as ContractorRef from '../../domain/shared/contractor.ts';
import {
  parseOriginalValueAndPeriod,
  type ContractInputParseError,
} from './contract-input-parse.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type { PendingContract, ContractClassification } from '../../domain/contract/types.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';
import { pickSequentialNumber, fromSaveError } from './sequential-number-input.ts';

// CTR-USECASE-CREATE-PENDING-CONTRACT (ADR-0023): cadastra um contrato `Pending`
// (sem assinatura). Porta de entrada para `Contract.createPending`. O `createdAt`
// do evento `ContractCreated` é injetado via `clock` (não há `signedAt` aqui).

export type CreatePendingContractCommand = Readonly<{
  // CTR-CONTRACT-SEQUENTIAL-NUMBER (#1024): opcional — gerado pelo backend (ano do clock)
  // quando ausente/vazio; informado pelo usuário é normalizado. Espelha `createContract`.
  sequentialNumber?: string;
  title: string;
  objective: string;
  originalValueCents: number;
  periodStart: string;
  periodEnd: string | null;
  contractorType: string;
  contractorId: string;
  // CTR-NUMBER-PROGRAM: classificação (default CT) + metadados de cadastro (opcionais).
  classification?: ContractClassification;
  programId?: string | null;
  budgetPlanId?: string | null;
  categorizacao?: string | null;
  centroDeCusto?: string | null;
  // CTR-TAXONOMY-REFS: refs da árvore do plano (Centro → Categoria → Subcategoria) — opcionais.
  costCenterRef?: string | null;
  categoryRef?: string | null;
  subcategoryRef?: string | null;
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

    // CTR-CONTRACT-SEQUENTIAL-NUMBER (#1024): gera por ano quando ausente/vazio; informado é
    // normalizado (`NNNN/AAAA`) e recusado se já existir — R4, antes do save.
    const picked = await pickSequentialNumber(deps, cmd.sequentialNumber);
    if (!picked.ok) return picked;
    const sequentialNumber = picked.value;

    const created = Contract.createPending({
      id: ContractId.generate(),
      sequentialNumber,
      title: cmd.title,
      objective: cmd.objective,
      originalValue: parsed.value.originalValue,
      originalPeriod: parsed.value.originalPeriod,
      contractor: contractor.value,
      createdAt: deps.clock.now(),
      // CTR-NUMBER-PROGRAM: classification omitida quando ausente (default CT); metadados repassados.
      ...(cmd.classification !== undefined ? { classification: cmd.classification } : {}),
      programId: cmd.programId ?? null,
      budgetPlanId: cmd.budgetPlanId ?? null,
      categorizacao: cmd.categorizacao ?? null,
      centroDeCusto: cmd.centroDeCusto ?? null,
      // CTR-TAXONOMY-REFS: refs da árvore do plano repassados ao domínio (nuláveis).
      costCenterRef: cmd.costCenterRef ?? null,
      categoryRef: cmd.categoryRef ?? null,
      subcategoryRef: cmd.subcategoryRef ?? null,
    });
    if (!created.ok) return created;

    const saved = await deps.contractRepo.save(created.value.contract, [created.value.event]);
    if (!saved.ok) return err(fromSaveError(saved.error));

    return ok(created.value);
  };
