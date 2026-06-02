// Contract mapper para MySQL (dialeto único — ADR-0020).
// `DATETIME(3)` retorna `Date` nativo (schemas/mysql.ts: `datetime(..., { mode: 'date' })`).

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  Contract,
  PendingContract,
  ActiveContract,
  ExpiredContract,
  TerminatedContract,
  ContractStatus,
} from '../../../domain/contract/types.ts';
import * as AmendmentId from '../../../domain/shared/amendment-id.ts';
import * as ContractId from '../../../domain/shared/contract-id.ts';
import * as ContractorRef from '../../../domain/shared/contractor-ref.ts';
import * as Classification from '../../../domain/contract/classification.ts';
import * as ContractModel from '../../../domain/contract/contract-model.ts';
import * as Category from '../../../domain/contract/category.ts';
import * as CostCenter from '../../../domain/contract/cost-center.ts';
import type { AmendmentId as AmendmentIdType } from '../../../domain/shared/amendment-id.ts';
import { moneyFromCents } from './money.mapper.ts';
import { periodFromColumns, periodToColumns, type PeriodKindRaw } from './period.mapper.ts';
import type { contracts as contractsTable } from '../schemas/mysql.ts';

export type ContractRow = typeof contractsTable.$inferSelect;
export type ContractInsert = typeof contractsTable.$inferInsert;

// ─── Tagged error variants (Padrão D — DO D§22/23/24) ────────────────────────
//
// Cada variant carrega payload de evidência da colisão (DO D§23).
// Case constructors são free functions (DO D§22 — module-as-namespace).
// Padrão espelha `src/modules/contracts/domain/contract/errors.ts`.

export type ContractMapperInvalidId = Readonly<{
  tag: 'ContractMapperInvalidId';
  attemptedValue: string;
}>;

export type ContractMapperInvalidStatus = Readonly<{
  tag: 'ContractMapperInvalidStatus';
  attemptedValue: string;
}>;

export type ContractMapperInvalidMoney = Readonly<{
  tag: 'ContractMapperInvalidMoney';
  field: 'originalValueCents' | 'currentValueCents';
  attemptedCents: number;
}>;

export type ContractMapperInvalidPeriod = Readonly<{
  tag: 'ContractMapperInvalidPeriod';
  field: 'originalPeriod' | 'currentPeriod';
  reason: string;
}>;

export type ContractMapperInvalidAmendmentId = Readonly<{
  tag: 'ContractMapperInvalidAmendmentId';
  attemptedValue: string;
}>;

export type ContractMapperInvalidEndedAt = Readonly<{
  tag: 'ContractMapperInvalidEndedAt';
  status: ContractStatus;
  endedAtPresent: boolean;
}>;

// ADR-0023: inconsistência entre `status` e a presença da vigência/assinatura.
// `Pending` exige vigência NULL; estados efetivos exigem vigência preenchida.
// (O CHECK `pending_consistency_chk` evita gravar; este erro é a rede do mapper.)
export type ContractMapperInvalidPendingShape = Readonly<{
  tag: 'ContractMapperInvalidPendingShape';
  status: ContractStatus;
  effectiveFieldsPresent: boolean;
}>;

// Vínculo do contratado corrompido no banco (CTR-CONTRACT-CONTRACTOR-REF):
// `contractor_type` fora do conjunto ou `contractor_id` malformado. O CHECK
// `ctr_contracts_contractor_type_chk` evita gravar `type` inválido; este erro
// é a rede do mapper (defesa em profundidade, incluindo o `id`).
export type ContractMapperInvalidContractorType = Readonly<{
  tag: 'ContractMapperInvalidContractorType';
  attemptedType: string;
  attemptedId: string;
}>;

// Metadado de cadastro corrompido no banco (CTR-CONTRACT-REGISTRATION-METADATA):
// `classification`/`contract_model`/`category`/`cost_center` fora do conjunto. O
// CHECK respectivo evita gravar; este erro é a rede do mapper (defesa em profundidade).
export type ContractMapperInvalidMetadata = Readonly<{
  tag: 'ContractMapperInvalidMetadata';
  field: 'classification' | 'contractModel' | 'category' | 'costCenter';
  attemptedValue: string;
}>;

// ─── Union ────────────────────────────────────────────────────────────────────

export type ContractMapperError =
  | ContractMapperInvalidId
  | ContractMapperInvalidStatus
  | ContractMapperInvalidMoney
  | ContractMapperInvalidPeriod
  | ContractMapperInvalidAmendmentId
  | ContractMapperInvalidEndedAt
  | ContractMapperInvalidPendingShape
  | ContractMapperInvalidContractorType
  | ContractMapperInvalidMetadata;

// ─── Case constructors (Padrão D — free functions, DO D§22) ──────────────────
//
// Cada constructor declara o subtipo exato que produz — preserva narrowing
// nos callers via `r.error.tag === 'ContractMapperInvalidId'`.

export const contractMapperInvalidId = (attemptedValue: string): ContractMapperInvalidId => ({
  tag: 'ContractMapperInvalidId',
  attemptedValue,
});

export const contractMapperInvalidStatus = (
  attemptedValue: string,
): ContractMapperInvalidStatus => ({
  tag: 'ContractMapperInvalidStatus',
  attemptedValue,
});

export const contractMapperInvalidMoney = (
  field: 'originalValueCents' | 'currentValueCents',
  attemptedCents: number,
): ContractMapperInvalidMoney => ({
  tag: 'ContractMapperInvalidMoney',
  field,
  attemptedCents,
});

export const contractMapperInvalidPeriod = (
  field: 'originalPeriod' | 'currentPeriod',
  reason: string,
): ContractMapperInvalidPeriod => ({
  tag: 'ContractMapperInvalidPeriod',
  field,
  reason,
});

export const contractMapperInvalidAmendmentId = (
  attemptedValue: string,
): ContractMapperInvalidAmendmentId => ({
  tag: 'ContractMapperInvalidAmendmentId',
  attemptedValue,
});

export const contractMapperInvalidEndedAt = (
  status: ContractStatus,
  endedAtPresent: boolean,
): ContractMapperInvalidEndedAt => ({
  tag: 'ContractMapperInvalidEndedAt',
  status,
  endedAtPresent,
});

export const contractMapperInvalidPendingShape = (
  status: ContractStatus,
  effectiveFieldsPresent: boolean,
): ContractMapperInvalidPendingShape => ({
  tag: 'ContractMapperInvalidPendingShape',
  status,
  effectiveFieldsPresent,
});

export const contractMapperInvalidContractorType = (
  attemptedType: string,
  attemptedId: string,
): ContractMapperInvalidContractorType => ({
  tag: 'ContractMapperInvalidContractorType',
  attemptedType,
  attemptedId,
});

export const contractMapperInvalidMetadata = (
  field: ContractMapperInvalidMetadata['field'],
  attemptedValue: string,
): ContractMapperInvalidMetadata => ({
  tag: 'ContractMapperInvalidMetadata',
  field,
  attemptedValue,
});

// ─── Helpers internos ────────────────────────────────────────────────────────

const KNOWN_STATUSES = ['Pending', 'Active', 'Expired', 'Terminated'] as const;
const isStatus = (v: string): v is (typeof KNOWN_STATUSES)[number] =>
  (KNOWN_STATUSES as readonly string[]).includes(v);

const isPeriodKind = (v: string): v is PeriodKindRaw => v === 'Fixed' || v === 'Indefinite';

// Extrai string de reason a partir de PeriodMapperError heterogêneo
// (PeriodError = string literal | PeriodMapperFixedMissingEnd = { tag: string }).
const periodErrorReason = (e: unknown): string =>
  typeof e === 'string' ? e : (e as { tag: string }).tag;

export const contractToInsert = (
  c: Contract,
): { row: ContractInsert; homologatedAmendmentIds: readonly string[] } => {
  const orig = periodToColumns(c.originalPeriod);

  // ADR-0023: `Pending` não tem assinatura nem vigência efetiva — colunas NULL.
  if (c.status === 'Pending') {
    return {
      row: {
        id: c.id as unknown as string,
        sequentialNumber: c.sequentialNumber,
        title: c.title,
        objective: c.objective,
        signedAt: null,
        originalValueCents: c.originalValue.cents,
        originalPeriodKind: orig.kind,
        originalPeriodStart: orig.start,
        originalPeriodEnd: orig.end,
        currentValueCents: null,
        currentPeriodKind: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        status: 'Pending',
        endedAt: null,
        contractorType: c.contractorRef.kind,
        contractorId: c.contractorRef.id as unknown as string,
        classification: c.classification,
        contractModel: c.contractModel,
        category: c.category,
        costCenter: c.costCenter,
        observations: c.observations,
      },
      homologatedAmendmentIds: [],
    };
  }

  // `c` é efetivo (Active | Expired | Terminated) — vigência presente.
  const curr = periodToColumns(c.currentPeriod);
  return {
    row: {
      id: c.id as unknown as string,
      sequentialNumber: c.sequentialNumber,
      title: c.title,
      objective: c.objective,
      signedAt: c.signedAt,
      originalValueCents: c.originalValue.cents,
      originalPeriodKind: orig.kind,
      originalPeriodStart: orig.start,
      originalPeriodEnd: orig.end,
      currentValueCents: c.currentValue.cents,
      currentPeriodKind: curr.kind,
      currentPeriodStart: curr.start,
      currentPeriodEnd: curr.end,
      status: c.status,
      // `endedAt` só existe em ExpiredContract / TerminatedContract (DO C§29).
      // ActiveContract não tem o campo — usa null para a coluna MySQL.
      endedAt: c.status === 'Active' ? null : c.endedAt,
      contractorType: c.contractorRef.kind,
      contractorId: c.contractorRef.id as unknown as string,
      classification: c.classification,
      contractModel: c.contractModel,
      category: c.category,
      costCenter: c.costCenter,
      observations: c.observations,
    },
    homologatedAmendmentIds: c.homologatedAmendmentIds.map((id) => id as unknown as string),
  };
};

export const contractFromRow = (
  row: Readonly<ContractRow>,
  homologatedAmendmentIdsRaw: readonly string[],
): Result<Contract, ContractMapperError> => {
  const idR = ContractId.rehydrate(row.id);
  if (!idR.ok) return err(contractMapperInvalidId(row.id));

  if (!isStatus(row.status)) return err(contractMapperInvalidStatus(row.status));
  if (!isPeriodKind(row.originalPeriodKind))
    return err(contractMapperInvalidPeriod('originalPeriod', 'invalid-kind'));

  const origValue = moneyFromCents(row.originalValueCents);
  if (!origValue.ok)
    return err(contractMapperInvalidMoney('originalValueCents', row.originalValueCents));

  const origPeriod = periodFromColumns({
    kind: row.originalPeriodKind,
    start: row.originalPeriodStart,
    end: row.originalPeriodEnd,
  });
  if (!origPeriod.ok)
    return err(contractMapperInvalidPeriod('originalPeriod', periodErrorReason(origPeriod.error)));

  const contractorRefR = ContractorRef.rehydrate({
    type: row.contractorType,
    id: row.contractorId,
  });
  if (!contractorRefR.ok)
    return err(contractMapperInvalidContractorType(row.contractorType, row.contractorId));

  // Metadados de cadastro — enums validados (rejeita valor corrompido do banco).
  const classificationR = Classification.parse(row.classification);
  if (!classificationR.ok)
    return err(contractMapperInvalidMetadata('classification', row.classification));
  const contractModelR = ContractModel.parse(row.contractModel);
  if (!contractModelR.ok)
    return err(contractMapperInvalidMetadata('contractModel', row.contractModel));
  const categoryR: Result<Category.Category | null, Category.CategoryError> =
    row.category === null ? ok(null) : Category.parse(row.category);
  if (!categoryR.ok) return err(contractMapperInvalidMetadata('category', row.category ?? ''));
  const costCenterR: Result<CostCenter.CostCenter | null, CostCenter.CostCenterError> =
    row.costCenter === null ? ok(null) : CostCenter.parse(row.costCenter);
  if (!costCenterR.ok)
    return err(contractMapperInvalidMetadata('costCenter', row.costCenter ?? ''));

  // Campos de cadastro — comuns a todos os estados (inclusive Pending).
  const registration = {
    id: idR.value,
    sequentialNumber: row.sequentialNumber,
    title: row.title,
    objective: row.objective,
    originalValue: origValue.value,
    originalPeriod: origPeriod.value,
    contractorRef: contractorRefR.value,
    classification: classificationR.value,
    contractModel: contractModelR.value,
    category: categoryR.value,
    costCenter: costCenterR.value,
    observations: row.observations,
  } as const;

  // ADR-0023: `Pending` bifurca ANTES de exigir vigência/assinatura. As colunas
  // efetivas devem vir NULL (garantido pelo CHECK `pending_consistency_chk`);
  // defesa em profundidade rejeita shape corrompido.
  if (row.status === 'Pending') {
    if (row.signedAt !== null || row.currentValueCents !== null || row.currentPeriodKind !== null) {
      return err(contractMapperInvalidPendingShape('Pending', true));
    }
    const pending: PendingContract = { ...registration, status: 'Pending' };
    return ok(pending);
  }

  // Estados efetivos (Active | Expired | Terminated) — exigem vigência + assinatura
  // não-nulas (CHECK `pending_consistency_chk` garante; guard defensivo + narrowing).
  if (
    row.signedAt === null ||
    row.currentValueCents === null ||
    row.currentPeriodKind === null ||
    row.currentPeriodStart === null
  ) {
    return err(contractMapperInvalidPendingShape(row.status, false));
  }
  if (!isPeriodKind(row.currentPeriodKind))
    return err(contractMapperInvalidPeriod('currentPeriod', 'invalid-kind'));
  const currValue = moneyFromCents(row.currentValueCents);
  if (!currValue.ok)
    return err(contractMapperInvalidMoney('currentValueCents', row.currentValueCents));
  const currPeriod = periodFromColumns({
    kind: row.currentPeriodKind,
    start: row.currentPeriodStart,
    end: row.currentPeriodEnd,
  });
  if (!currPeriod.ok)
    return err(contractMapperInvalidPeriod('currentPeriod', periodErrorReason(currPeriod.error)));

  const homologatedIds: AmendmentIdType[] = [];
  for (const raw of homologatedAmendmentIdsRaw) {
    const r = AmendmentId.rehydrate(raw);
    if (!r.ok) return err(contractMapperInvalidAmendmentId(raw));
    homologatedIds.push(r.value);
  }

  // Núcleo efetivo (cadastro + vigência), excluindo status e endedAt.
  const core = {
    ...registration,
    signedAt: row.signedAt,
    currentValue: currValue.value,
    currentPeriod: currPeriod.value,
    homologatedAmendmentIds: homologatedIds,
  } as const;

  // Switch exaustivo em `row.status` decide o subtipo refinado (DO D§20).
  // Shapes impossíveis (bicondicional endedAt ↔ status violada) retornam
  // err(contractMapperInvalidEndedAt(...)) — Padrão D, payload de evidência.
  switch (row.status) {
    case 'Active': {
      // Active + endedAt preenchido = estado corrompido no DB (DON'T C§29).
      if (row.endedAt !== null) return err(contractMapperInvalidEndedAt('Active', true));
      const contract: ActiveContract = { ...core, status: 'Active' };
      return ok(contract);
    }
    case 'Expired': {
      // Expired + endedAt null = estado corrompido no DB (DON'T C§29).
      if (row.endedAt === null) return err(contractMapperInvalidEndedAt('Expired', false));
      const contract: ExpiredContract = { ...core, status: 'Expired', endedAt: row.endedAt };
      return ok(contract);
    }
    case 'Terminated': {
      // Terminated + endedAt null = estado corrompido no DB (DON'T C§29).
      if (row.endedAt === null) return err(contractMapperInvalidEndedAt('Terminated', false));
      const contract: TerminatedContract = {
        ...core,
        status: 'Terminated',
        endedAt: row.endedAt,
      };
      return ok(contract);
    }
  }
  // Switch acima é exaustivo sobre ContractStatus ('Active' | 'Expired' | 'Terminated').
  // tsconfig.noFallthroughCasesInSwitch + isStatus guard garantem que row.status
  // só pode ser um desses três valores ao chegar aqui. Sem `default` com `throw`.
};
