// Contract mapper para MySQL (dialeto único — ADR-0020).
// `DATETIME(3)` retorna `Date` nativo (schemas/mysql.ts: `datetime(..., { mode: 'date' })`).

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  Contract,
  PendingContract,
  ActiveContract,
  ExpiredContract,
  TerminatedContract,
  CancelledContract,
  ContractStatus,
} from '../../../domain/contract/types.ts';
import * as AmendmentId from '../../../domain/shared/amendment-id.ts';
import * as ContractId from '../../../domain/shared/contract-id.ts';
import * as ContractorRef from '../../../domain/shared/contractor.ts';
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

// CTR-NUMBER-PROGRAM: classificação corrompida no banco (fora de CT|OS).
export type ContractMapperInvalidClassification = Readonly<{
  tag: 'ContractMapperInvalidClassification';
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

export type ContractMapperInvalidContractor = Readonly<{
  tag: 'ContractMapperInvalidContractor';
  attemptedType: string;
  attemptedId: string;
}>;

// ─── Union ────────────────────────────────────────────────────────────────────

export type ContractMapperError =
  | ContractMapperInvalidId
  | ContractMapperInvalidStatus
  | ContractMapperInvalidClassification
  | ContractMapperInvalidMoney
  | ContractMapperInvalidPeriod
  | ContractMapperInvalidAmendmentId
  | ContractMapperInvalidEndedAt
  | ContractMapperInvalidPendingShape
  | ContractMapperInvalidContractor;

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

export const contractMapperInvalidClassification = (
  attemptedValue: string,
): ContractMapperInvalidClassification => ({
  tag: 'ContractMapperInvalidClassification',
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

export const contractMapperInvalidContractor = (
  attemptedType: string,
  attemptedId: string,
): ContractMapperInvalidContractor => ({
  tag: 'ContractMapperInvalidContractor',
  attemptedType,
  attemptedId,
});

// ─── Helpers internos ────────────────────────────────────────────────────────

const KNOWN_STATUSES = ['Pending', 'Active', 'Expired', 'Terminated', 'Cancelled'] as const;
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

  // ADR-0023/0039: `Pending` e `Cancelled` não têm assinatura nem vigência efetiva
  // (colunas NULL). `Cancelled` (terminal) carrega `endedAt`; `Pending` não.
  if (c.status === 'Pending' || c.status === 'Cancelled') {
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
        status: c.status,
        endedAt: c.status === 'Cancelled' ? c.endedAt : null,
        contractorType: c.contractor.type,
        contractorId: c.contractor.id as unknown as string,
        classification: c.classification,
        programId: c.programId,
        budgetPlanId: c.budgetPlanId,
        categorizacao: c.categorizacao,
        centroDeCusto: c.centroDeCusto,
        observations: c.observations,
        email: c.email,
        telephone: c.telephone,
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
      // Motivo só existe em TerminatedContract; demais estados → null (CHECK no schema).
      terminationReason: c.status === 'Terminated' ? c.terminationReason : null,
      contractorType: c.contractor.type,
      contractorId: c.contractor.id as unknown as string,
      classification: c.classification,
      programId: c.programId,
      budgetPlanId: c.budgetPlanId,
      categorizacao: c.categorizacao,
      centroDeCusto: c.centroDeCusto,
      observations: c.observations,
      email: c.email,
      telephone: c.telephone,
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

  // Contratado — reidrata e valida (rejeita estado inválido vindo do banco).
  const contractorR = ContractorRef.make(row.contractorType, row.contractorId);
  if (!contractorR.ok)
    return err(contractMapperInvalidContractor(row.contractorType, row.contractorId));

  // CTR-NUMBER-PROGRAM: classificação restrita a CT|OS (CHECK garante; defesa em profundidade).
  if (row.classification !== 'CT' && row.classification !== 'OS') {
    return err(contractMapperInvalidClassification(row.classification));
  }

  // Campos de cadastro — comuns a todos os estados (inclusive Pending).
  const registration = {
    id: idR.value,
    sequentialNumber: row.sequentialNumber,
    title: row.title,
    objective: row.objective,
    originalValue: origValue.value,
    originalPeriod: origPeriod.value,
    contractor: contractorR.value,
    classification: row.classification,
    programId: row.programId,
    budgetPlanId: row.budgetPlanId,
    categorizacao: row.categorizacao,
    centroDeCusto: row.centroDeCusto,
    observations: row.observations,
    email: row.email,
    telephone: row.telephone,
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

  // ADR-0039: `Cancelled` é terminal mas registration-only (signed/current NULL) —
  // como Pending, mas com `endedAt` preenchido. Defesa em profundidade contra shape
  // corrompido (CHECKs `pending_consistency` + `ended_at_consistency` garantem na gravação).
  if (row.status === 'Cancelled') {
    if (row.signedAt !== null || row.currentValueCents !== null || row.currentPeriodKind !== null) {
      return err(contractMapperInvalidPendingShape('Cancelled', true));
    }
    if (row.endedAt === null) return err(contractMapperInvalidEndedAt('Cancelled', false));
    const cancelled: CancelledContract = {
      ...registration,
      status: 'Cancelled',
      endedAt: row.endedAt,
    };
    return ok(cancelled);
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
        // Terminated legado (pré-feature) pode ter motivo null.
        terminationReason: row.terminationReason ?? null,
      };
      return ok(contract);
    }
  }
  // Switch acima é exaustivo sobre ContractStatus ('Active' | 'Expired' | 'Terminated').
  // tsconfig.noFallthroughCasesInSwitch + isStatus guard garantem que row.status
  // só pode ser um desses três valores ao chegar aqui. Sem `default` com `throw`.
};
