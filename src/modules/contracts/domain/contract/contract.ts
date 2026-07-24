import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import { isBlank } from '../../../../shared/utils/string.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as Period from '../../../../shared/kernel/period.ts';
import * as PlainDate from '../../../../shared/kernel/plain-date.ts';
import type {
  Contract as ContractEntity,
  ActiveContract,
  PendingContract,
  ExpiredContract,
  TerminatedContract,
  CancelledContract,
  ContractAdjustment,
  ContractClassification,
  ContractRegistrationMetaInput,
  CreateContractInput,
  CreatePendingContractInput,
} from './types.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { ContractEvent } from './events.ts';
import * as ContractError from './errors.ts';

// ─── Helpers internos ─────────────────────────────────────────────────────────

const assertValidEventDate = (at: Date): Result<Date, ContractError.ContractInvalidEventDate> =>
  isValidDate(at) ? ok(at) : err(ContractError.contractInvalidEventDate());

const stateUpdatedEvent = (
  contract: ActiveContract,
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

// Defeito #6: formato canônico NNN/AAAA ou NNNN/AAAA (3 ou 4 dígitos, barra, 4 dígitos).
// 4 dígitos cobre a numeração GERADA pelo backend (CTR-CONTRACT-SEQUENTIAL-NUMBER,
// `LPAD(seq,4,'0')/year`); 3 dígitos preserva o legado já cadastrado.
const SEQUENTIAL_NUMBER_FORMAT = /^\d{3,4}\/\d{4}$/;

/**
 * Validações de **cadastro** comuns a todo nascimento de contrato (`create` e
 * `createPending`): identificação textual. NÃO inclui `signedAt` (só `create`)
 * nem `originalValue` zero — cada construtor checa o valor na posição original
 * da sua sequência de validação (preserva a precedência de erro histórica).
 */
const validateRegistration = (
  input: Readonly<{ sequentialNumber: string; title: string; objective: string }>,
): Result<null, ContractError.ContractError> => {
  if (isBlank(input.sequentialNumber)) {
    return err(ContractError.contractSequentialNumberRequired());
  }
  if (!SEQUENTIAL_NUMBER_FORMAT.test(input.sequentialNumber)) {
    return err(ContractError.contractSequentialNumberInvalidFormat(input.sequentialNumber));
  }
  if (isBlank(input.title)) return err(ContractError.contractTitleRequired());
  if (isBlank(input.objective)) return err(ContractError.contractObjectiveRequired());
  return ok(null);
};

// CTR-NUMBER-PROGRAM: resolve os metadados de cadastro. `classification` defaulta para 'CT' e
// só aceita 'CT'|'OS'; os demais são refs/rótulos opcionais → `null` quando ausentes.
type ResolvedMeta = Readonly<{
  classification: ContractClassification;
  programId: string | null;
  budgetPlanId: string | null;
  categorizacao: string | null;
  centroDeCusto: string | null;
  // CTR-TAXONOMY-REFS: refs da árvore do plano — `null` quando ausentes (padrão dos demais refs).
  costCenterRef: string | null;
  categoryRef: string | null;
  subcategoryRef: string | null;
}>;

const CONTRACT_CLASSIFICATIONS: readonly ContractClassification[] = ['CT', 'OS'];

const resolveMeta = (
  input: ContractRegistrationMetaInput,
): Result<ResolvedMeta, ContractError.ContractError> => {
  const classification = input.classification ?? 'CT';
  // Validação runtime defensiva (a borda Zod já garante o enum; protege contra bypass de tipo).
  if (!CONTRACT_CLASSIFICATIONS.includes(classification)) {
    return err(ContractError.contractClassificationInvalid(String(input.classification)));
  }
  return ok({
    classification,
    programId: input.programId ?? null,
    budgetPlanId: input.budgetPlanId ?? null,
    categorizacao: input.categorizacao ?? null,
    centroDeCusto: input.centroDeCusto ?? null,
    // CTR-TAXONOMY-REFS: refs da árvore do plano — ausentes nascem `null`.
    costCenterRef: input.costCenterRef ?? null,
    categoryRef: input.categoryRef ?? null,
    subcategoryRef: input.subcategoryRef ?? null,
  });
};

// ─── Operações do agregado ────────────────────────────────────────────────────

/**
 * Cria um contrato no estado `Pending` (ADR-0023) — cadastrado sem documento
 * assinado, sem efetividade. O tipo de retorno `PendingContract` garante
 * estaticamente a ausência de `signedAt`/vigência (DO D§20). A transição
 * `activate` (ticket seguinte) leva a `Active`.
 */
const createPending = (
  input: CreatePendingContractInput,
): Result<{ contract: PendingContract; event: ContractEvent }, ContractError.ContractError> => {
  const reg = validateRegistration(input);
  if (!reg.ok) return reg;
  // Defeito #9: contrato com valor original zero não tem propósito de negócio.
  if (input.originalValue.cents === 0) return err(ContractError.contractOriginalValueZero());
  const meta = resolveMeta(input);
  if (!meta.ok) return meta;

  const contract: PendingContract = immutable({
    id: input.id,
    sequentialNumber: input.sequentialNumber,
    title: input.title,
    objective: input.objective,
    originalValue: input.originalValue,
    originalPeriod: input.originalPeriod,
    contractor: input.contractor,
    ...meta.value,
    observations: null,
    email: null,
    telephone: null,
    status: 'Pending' as const,
  });

  const event: ContractEvent = {
    type: 'ContractCreated',
    contractId: contract.id,
    occurredAt: input.createdAt,
  };

  return ok({ contract, event });
};

/**
 * Transição `Pending → Active` (ADR-0023) — ativação por assinatura.
 *
 * Recebe `PendingContract` — o compilador rejeita estados efetivos em compile
 * time (espelha `expire`/`terminate`). A vigência efetiva inicia aqui:
 * `current = original`. A exigência de documento assinado (RN-CV-02) é validada
 * pelo use case (application), não pelo agregado.
 */
const activate = (
  contract: PendingContract,
  signedAt: Date,
): Result<{ contract: ActiveContract; event: ContractEvent }, ContractError.ContractError> => {
  if (!isValidDate(signedAt)) return err(ContractError.contractInvalidSignedAt());

  const next: ActiveContract = immutable({
    ...contract,
    signedAt,
    currentValue: contract.originalValue,
    currentPeriod: contract.originalPeriod,
    status: 'Active' as const,
    homologatedAmendmentIds: [] as readonly never[],
  });

  const event: ContractEvent = {
    type: 'ContractActivated',
    contractId: contract.id,
    occurredAt: signedAt,
  };

  return ok({ contract: next, event });
};

/**
 * Cria um novo contrato no estado `Active`.
 *
 * Caminho "nasce já assinado" — exige `signedAt`. O tipo de retorno
 * `ActiveContract` garante o estado estaticamente sem checagem extra (DO D§20).
 */
const create = (
  input: CreateContractInput,
): Result<{ contract: ActiveContract; event: ContractEvent }, ContractError.ContractError> => {
  const reg = validateRegistration(input);
  if (!reg.ok) return reg;
  if (!isValidDate(input.signedAt)) return err(ContractError.contractInvalidSignedAt());
  // Defeito #9: contrato com valor original zero não tem propósito de negócio.
  if (input.originalValue.cents === 0) return err(ContractError.contractOriginalValueZero());
  const meta = resolveMeta(input);
  if (!meta.ok) return meta;

  // ActiveContract não tem `endedAt` — o campo simplesmente está ausente.
  // `'Active' as const` garante o narrowing do discriminador (DO D§20).
  const contract: ActiveContract = immutable({
    id: input.id,
    sequentialNumber: input.sequentialNumber,
    title: input.title,
    objective: input.objective,
    signedAt: input.signedAt,
    originalValue: input.originalValue,
    originalPeriod: input.originalPeriod,
    contractor: input.contractor,
    ...meta.value,
    observations: null,
    email: null,
    telephone: null,
    currentValue: input.originalValue,
    currentPeriod: input.originalPeriod,
    status: 'Active' as const,
    homologatedAmendmentIds: [] as readonly never[],
  });

  const event: ContractEvent = {
    type: 'ContractCreated',
    contractId: contract.id,
    occurredAt: input.signedAt,
  };

  return ok({ contract, event });
};

/**
 * Refinement constructor — substitui `assertActive` (DON'T D§19 + DON'T D§23).
 *
 * "Parse, don't validate" (DO D§21): em vez de asserção imperativa que devolve
 * o tipo cru, `parseActive` retorna o subtipo refinado `ActiveContract` dentro
 * de `ok(...)`. Chamadores que precisam operar sobre um contrato ativo passam o
 * resultado de `parseActive` diretamente às transições.
 */
const parseActive = (
  contract: ContractEntity,
): Result<ActiveContract, ContractError.ContractNotActive> =>
  contract.status === 'Active'
    ? ok(contract) // narrowing automático: status === 'Active' => ActiveContract
    : err(ContractError.contractNotActive(contract.status));

/**
 * Transição `Active → Expired` (DO D§20 — transição total sobre tipo refinado).
 *
 * Recebe `ActiveContract` — o compilador rejeita `ExpiredContract` ou
 * `TerminatedContract` em compile time (CA3). Não há `assertActive` interno:
 * a garantia é dada pelo tipo do parâmetro.
 */
const expire = (
  contract: ActiveContract,
  at: Date,
): Result<{ contract: ExpiredContract; event: ContractEvent }, ContractError.ContractError> => {
  const atCheck = assertValidEventDate(at);
  if (!atCheck.ok) return atCheck;

  if (contract.currentPeriod.kind === 'Indefinite') {
    return err(ContractError.contractCannotExpireIndefinitePeriod());
  }

  const atDate = PlainDate.fromDate(at);
  // D+1 (CTR-AUTO-EXPIRE / issue #39): o último dia da vigência conta INTEIRO — o contrato
  // só expira quando `at` é POSTERIOR ao fim (zero hora do dia seguinte). Rejeita `at <= end`.
  if (!PlainDate.isAfter(atDate, contract.currentPeriod.end)) {
    return err(ContractError.contractCannotExpireYet(contract.currentPeriod.end, atDate));
  }

  // Construção direta de ExpiredContract — sem `updateContract` (que retorna
  // `Contract` genérico) para preservar o subtipo refinado no retorno.
  const next: ExpiredContract = immutable({
    ...contract,
    status: 'Expired' as const,
    endedAt: at,
  });

  const event: ContractEvent = {
    type: 'ContractEnded',
    contractId: contract.id,
    occurredAt: at,
    kind: 'Expired',
    // Expiração por chegada da data fim não tem motivo de negócio.
    terminationReason: null,
  };

  return ok({ contract: next, event });
};

/**
 * Transição `Active → Terminated` (DO D§20 — transição total sobre tipo refinado).
 *
 * Mesma garantia estática de `expire`: rejeita não-Active em compile time.
 */
const terminate = (
  contract: ActiveContract,
  at: Date,
  reason?: string,
): Result<{ contract: TerminatedContract; event: ContractEvent }, ContractError.ContractError> => {
  const atCheck = assertValidEventDate(at);
  if (!atCheck.ok) return atCheck;

  // Motivo trim; vazio/ausente → null (Terminated legado pode não ter).
  const terminationReason = reason !== undefined && reason.trim().length > 0 ? reason.trim() : null;

  const next: TerminatedContract = immutable({
    ...contract,
    status: 'Terminated' as const,
    endedAt: at,
    terminationReason,
  });

  const event: ContractEvent = {
    type: 'ContractEnded',
    contractId: contract.id,
    occurredAt: at,
    kind: 'Terminated',
    terminationReason,
  };

  return ok({ contract: next, event });
};

/**
 * Refinement constructor para o estado `Pending` (ADR-0039) — espelha `parseActive`.
 *
 * "Parse, don't validate" (DO D§21): retorna o subtipo refinado `PendingContract` dentro
 * de `ok(...)`; chamadores passam o resultado direto à transição `cancel`. Estados não-Pending
 * recebem `ContractNotPending` carregando o `currentStatus` como evidência (D23).
 */
const parsePending = (
  contract: ContractEntity,
): Result<PendingContract, ContractError.ContractNotPending> =>
  contract.status === 'Pending'
    ? ok(contract) // narrowing automático: status === 'Pending' => PendingContract
    : err(ContractError.contractNotPending(contract.status));

/**
 * Transição `Pending → Cancelled` (ADR-0039 — rascunho descartado antes de vigorar).
 *
 * Recebe `PendingContract` — o compilador rejeita estados efetivos/terminais em compile
 * time (espelha `activate`). `Cancelled` é terminal e carrega só `endedAt` sobre o cadastro;
 * não há vigência efetiva (o contrato nunca foi assinado).
 */
const cancel = (
  contract: PendingContract,
  at: Date,
): Result<{ contract: CancelledContract; event: ContractEvent }, ContractError.ContractError> => {
  const atCheck = assertValidEventDate(at);
  if (!atCheck.ok) return atCheck;

  const next: CancelledContract = immutable({
    ...contract,
    status: 'Cancelled' as const,
    endedAt: at,
  });

  const event: ContractEvent = {
    type: 'ContractCancelled',
    contractId: contract.id,
    occurredAt: at,
  };

  return ok({ contract: next, event });
};

/**
 * Aplica um ajuste homologado ao contrato — mantém o contrato `Active`.
 *
 * Aditivos só se aplicam a contratos ativos (DO D§20): o tipo do parâmetro
 * `ActiveContract` garante isso estaticamente. O contrato permanece `Active`
 * após o ajuste, portanto o retorno também é `ActiveContract`.
 */
const applyHomologatedAdjustment = (
  contract: ActiveContract,
  adjustment: ContractAdjustment,
  at: Date,
): Result<{ contract: ActiveContract; event: ContractEvent }, ContractError.ContractError> => {
  const atCheck = assertValidEventDate(at);
  if (!atCheck.ok) return atCheck;

  if (contract.homologatedAmendmentIds.includes(adjustment.amendmentId)) {
    return err(ContractError.contractAmendmentAlreadyApplied(adjustment.amendmentId));
  }

  const nextIds = [...contract.homologatedAmendmentIds, adjustment.amendmentId] as const;

  switch (adjustment.kind) {
    case 'ValueIncrease': {
      // Construção direta de ActiveContract — preserva o subtipo refinado.
      const next: ActiveContract = immutable({
        ...contract,
        currentValue: Money.add(contract.currentValue, adjustment.amount),
        homologatedAmendmentIds: nextIds,
      });
      return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
    }
    case 'ValueDecrease': {
      const subtracted = Money.subtract(contract.currentValue, adjustment.amount);
      if (!subtracted.ok) {
        return err(
          ContractError.contractValueWouldGoNegative(contract.currentValue, adjustment.amount),
        );
      }
      const next: ActiveContract = immutable({
        ...contract,
        currentValue: subtracted.value,
        homologatedAmendmentIds: nextIds,
      });
      return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
    }
    case 'PeriodExtension': {
      if (contract.currentPeriod.kind === 'Indefinite') {
        return err(ContractError.contractCannotExtendIndefinitePeriod());
      }
      if (PlainDate.compare(adjustment.newEnd, contract.currentPeriod.end) <= 0) {
        return err(
          ContractError.contractPeriodExtensionNotAfterCurrentEnd(
            contract.currentPeriod.end,
            adjustment.newEnd,
          ),
        );
      }
      const newPeriod = Period.create(contract.currentPeriod.start, adjustment.newEnd);
      if (!newPeriod.ok) {
        return err(
          ContractError.contractPeriodExtensionNotAfterCurrentEnd(
            contract.currentPeriod.end,
            adjustment.newEnd,
          ),
        );
      }
      const next: ActiveContract = immutable({
        ...contract,
        currentPeriod: newPeriod.value,
        homologatedAmendmentIds: nextIds,
      });
      return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
    }
    case 'Acknowledgment': {
      const next: ActiveContract = immutable({
        ...contract,
        homologatedAmendmentIds: nextIds,
      });
      return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
    }
  }
  // Exhaustive switch acima cobre todas as variantes de ContractAdjustment.
  // tsconfig.noFallthroughCasesInSwitch + tsc enforce exhaustividade no compile.
  // Sem ramo `default` com `throw` — regra "Zero throw" do domain.
};

// Padrão D não se aplica a agregados (Bloco A DON'T §1 do master doc) — o agregado
// `Contract` permanece exportado como namespace-objeto. Transições mutam estado
// via construção direta de subtipo refinado (DO D§20), sem `Brand` na casca
// (CTR-DOMAIN-DEBRAND-AGG ✓). `assertActive` foi removido (DON'T D§19 + D§23);
// `parseActive` é o único refinement constructor (DO D§21).
export const Contract = {
  create,
  createPending,
  activate,
  parseActive,
  parsePending,
  cancel,
  expire,
  terminate,
  applyHomologatedAdjustment,
};
