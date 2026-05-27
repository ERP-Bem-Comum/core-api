// Contract mapper para MySQL (dialeto único — ADR-0020).
// `DATETIME(3)` retorna `Date` nativo (schemas/mysql.ts: `datetime(..., { mode: 'date' })`).

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  Contract,
  EffectiveContract,
  ActiveContract,
  ExpiredContract,
  TerminatedContract,
  ContractStatus,
} from '../../../domain/contract/types.ts';
import * as AmendmentId from '../../../domain/shared/amendment-id.ts';
import * as ContractId from '../../../domain/shared/contract-id.ts';
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

// ─── Union ────────────────────────────────────────────────────────────────────

export type ContractMapperError =
  | ContractMapperInvalidId
  | ContractMapperInvalidStatus
  | ContractMapperInvalidMoney
  | ContractMapperInvalidPeriod
  | ContractMapperInvalidAmendmentId
  | ContractMapperInvalidEndedAt;

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

// ─── Helpers internos ────────────────────────────────────────────────────────

// Apenas estados EFETIVOS são persistidos (ADR-0023: `Pending` não vai ao banco
// até a migration de schema). O predicado narrowa para os efetivos, mantendo o
// switch de `contractFromRow` exaustivo.
const PERSISTED_STATUSES = ['Active', 'Expired', 'Terminated'] as const;
const isStatus = (v: string): v is (typeof PERSISTED_STATUSES)[number] =>
  (PERSISTED_STATUSES as readonly string[]).includes(v);

const isPeriodKind = (v: string): v is PeriodKindRaw => v === 'Fixed' || v === 'Indefinite';

// Extrai string de reason a partir de PeriodMapperError heterogêneo
// (PeriodError = string literal | PeriodMapperFixedMissingEnd = { tag: string }).
const periodErrorReason = (e: unknown): string =>
  typeof e === 'string' ? e : (e as { tag: string }).tag;

export const contractToInsert = (
  c: EffectiveContract,
): { row: ContractInsert; homologatedAmendmentIds: readonly string[] } => {
  const orig = periodToColumns(c.originalPeriod);
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
  if (!isPeriodKind(row.currentPeriodKind))
    return err(contractMapperInvalidPeriod('currentPeriod', 'invalid-kind'));

  const origValue = moneyFromCents(row.originalValueCents);
  if (!origValue.ok)
    return err(contractMapperInvalidMoney('originalValueCents', row.originalValueCents));
  const currValue = moneyFromCents(row.currentValueCents);
  if (!currValue.ok)
    return err(contractMapperInvalidMoney('currentValueCents', row.currentValueCents));

  const origPeriod = periodFromColumns({
    kind: row.originalPeriodKind,
    start: row.originalPeriodStart,
    end: row.originalPeriodEnd,
  });
  if (!origPeriod.ok)
    return err(contractMapperInvalidPeriod('originalPeriod', periodErrorReason(origPeriod.error)));
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

  // Campos do núcleo comum (ContractCore), excluindo status e endedAt.
  // Usados como base para construir cada subtipo no switch abaixo.
  const core = {
    id: idR.value,
    sequentialNumber: row.sequentialNumber,
    title: row.title,
    objective: row.objective,
    signedAt: row.signedAt,
    originalValue: origValue.value,
    originalPeriod: origPeriod.value,
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
