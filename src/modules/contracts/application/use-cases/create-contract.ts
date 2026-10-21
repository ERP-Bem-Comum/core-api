import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import * as ContractorRef from '../../domain/shared/contractor.ts';
import type { MoneyError } from '#src/shared/kernel/money.ts';
import type { PeriodError } from '#src/shared/kernel/period.ts';
import { parseOriginalValueAndPeriod } from './contract-input-parse.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type { ActiveContract, ContractClassification } from '../../domain/contract/types.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import type { ContractRepository } from '../../domain/contract/repository.ts';
import {
  createWithSequentialNumber,
  type SequentialNumberError,
} from './sequential-number-input.ts';

// CA-5+CA-6 (CTR-OUTBOX-INTEGRATION-IN-REPOS):
//   - eventBus removido de Deps — use case NÃO conhece mais EventBus.
//   - O evento é passado como 2º argumento de contractRepo.save — o adapter
//     persiste state + outbox atomicamente (D2, ADR-0015).

export type CreateContractCommand = Readonly<{
  // CTR-CONTRACT-SEQUENTIAL-NUMBER (#1024): opcional. Ausente/vazio → o backend gera `NNNN/YYYY`
  // pelo ano do clock. Informado (POST /contracts) → normalizado para 4 dígitos e checado.
  sequentialNumber?: string;
  title: string;
  objective: string;
  signedAt: string;
  originalValueCents: number;
  originalPeriodStart: string;
  originalPeriodEnd: string | null;
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

// Input do builder puro: o número sequencial JÁ resolvido (gerado ou preservado).
// `createContract` resolve antes de chamar `buildContract`; o import sempre traz `numero`.
export type BuildContractInput = Omit<CreateContractCommand, 'sequentialNumber'> &
  Readonly<{ sequentialNumber: string }>;

// Erros da construção PURA (validação + Contract.create), sem IO. Reusados pelo
// import legado (CTR-IMPORT-LEGACY) para garantir determinismo dry-run = persistente.
export type BuildContractError =
  | 'create-contract-invalid-signed-at'
  | 'create-contract-invalid-period-start'
  | 'create-contract-invalid-period-end'
  | ContractorRef.ContractorRefError
  | MoneyError
  | PeriodError
  | ContractError;

export type CreateContractError = BuildContractError | SequentialNumberError;

export type CreateContractOutput = Readonly<{
  contract: ActiveContract;
  event: ContractEvent;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  clock: Clock;
}>;

/**
 * Construção pura de um Contrato a partir do command — validação + `Contract.create`,
 * SEM IO (sem repo, sem checagem de duplicidade, sem save). Extraído para que
 * `createContract` e `importContracts` compartilhem exatamente a mesma validação
 * (determinismo dry-run = persistente, NFR-4 do CTR-IMPORT-LEGACY).
 */
export const buildContract = (
  cmd: BuildContractInput,
): Result<CreateContractOutput, BuildContractError> => {
  const signedAt = new Date(cmd.signedAt);
  if (!isValidDate(signedAt)) return err('create-contract-invalid-signed-at');

  const parsed = parseOriginalValueAndPeriod({
    originalValueCents: cmd.originalValueCents,
    periodStart: cmd.originalPeriodStart,
    periodEnd: cmd.originalPeriodEnd,
  });
  if (!parsed.ok) return parsed;

  const contractor = ContractorRef.make(cmd.contractorType, cmd.contractorId);
  if (!contractor.ok) return contractor;

  const created = Contract.create({
    id: ContractId.generate(),
    sequentialNumber: cmd.sequentialNumber,
    title: cmd.title,
    objective: cmd.objective,
    signedAt,
    originalValue: parsed.value.originalValue,
    originalPeriod: parsed.value.originalPeriod,
    contractor: contractor.value,
    // CTR-NUMBER-PROGRAM: classification omitida quando ausente (default CT no domínio,
    // exactOptionalPropertyTypes); metadados nuláveis repassados.
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

  return ok({ contract: created.value.contract, event: created.value.event });
};

export const createContract =
  (deps: Deps) =>
  async (
    cmd: CreateContractCommand,
  ): Promise<Result<CreateContractOutput, CreateContractError>> => {
    // CTR-CONTRACT-SEQUENTIAL-NUMBER (#1024, #1071): gerado por ano quando ausente/vazio
    // (transacional no adapter, FOR UPDATE, pulando ocupados; colisão no save gera o próximo);
    // informado é normalizado e recusado se já existir (Defeito #5 / R4 — antes do save; o UNIQUE
    // INDEX é a rede). CA-5: o save recebe o evento — state + outbox atomicamente.
    return createWithSequentialNumber(deps, cmd.sequentialNumber, (sequentialNumber) =>
      buildContract({ ...cmd, sequentialNumber }),
    );
  };
