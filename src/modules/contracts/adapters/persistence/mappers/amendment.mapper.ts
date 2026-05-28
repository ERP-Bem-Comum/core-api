// Amendment mapper para MySQL (dialeto único — ADR-0020).

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { NonZeroMoney } from '#src/shared/kernel/non-zero-money.ts';
import * as NonZeroMoneyNS from '#src/shared/kernel/non-zero-money.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import type {
  Amendment,
  AmendmentKind,
  AmendmentStatus,
  PendingWithoutDocumentAmendment,
  PendingWithDocumentAmendment,
  HomologatedAmendment,
} from '../../../domain/amendment/types.ts';
import * as AmendmentId from '../../../domain/shared/amendment-id.ts';
import type { AmendmentId as AmendmentIdType } from '../../../domain/shared/amendment-id.ts';
import * as ContractId from '../../../domain/shared/contract-id.ts';
import type { ContractId as ContractIdType } from '../../../domain/shared/contract-id.ts';
import * as DocumentId from '../../../domain/shared/document-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { moneyFromCents } from './money.mapper.ts';
import type { amendments as amendmentsTable } from '../schemas/mysql.ts';

export type AmendmentRow = typeof amendmentsTable.$inferSelect;
export type AmendmentInsert = typeof amendmentsTable.$inferInsert;

// ─── Tagged error variants (Padrão D — DO D§22/23/24) ────────────────────────
//
// Cada variant carrega payload de evidência da colisão (DO D§23).
// Case constructors são free functions (DO D§22 — module-as-namespace).
// `AmendmentMapperImpossibleShape` cobre shapes impossíveis do DB (campos
// obrigatórios ausentes para o status dado) — `reason` descreve o contexto.
// `AmendmentMapperInvalidDate` reservado para futura validação de campos Date;
// casos de campos numéricos/referência ausentes para um dado kind/status são
// cobertos por `AmendmentMapperImpossibleShape`.

export type AmendmentMapperInvalidId = Readonly<{
  tag: 'AmendmentMapperInvalidId';
  attemptedValue: string;
}>;

export type AmendmentMapperInvalidContractId = Readonly<{
  tag: 'AmendmentMapperInvalidContractId';
  attemptedValue: string;
}>;

export type AmendmentMapperInvalidStatus = Readonly<{
  tag: 'AmendmentMapperInvalidStatus';
  attemptedValue: string;
}>;

export type AmendmentMapperInvalidKind = Readonly<{
  tag: 'AmendmentMapperInvalidKind';
  attemptedValue: string;
}>;

export type AmendmentMapperInvalidMoney = Readonly<{
  tag: 'AmendmentMapperInvalidMoney';
  attemptedCents: number;
}>;

// Reservado para futura validação de campos Date (ex.: datas impossíveis no DB).
export type AmendmentMapperInvalidDate = Readonly<{
  tag: 'AmendmentMapperInvalidDate';
  field: string;
}>;

export type AmendmentMapperInvalidDocumentId = Readonly<{
  tag: 'AmendmentMapperInvalidDocumentId';
  attemptedValue: string;
}>;

export type AmendmentMapperInvalidUserRef = Readonly<{
  tag: 'AmendmentMapperInvalidUserRef';
  attemptedValue: string;
}>;

export type AmendmentMapperImpossibleShape = Readonly<{
  tag: 'AmendmentMapperImpossibleShape';
  reason: string;
}>;

// ─── Union ────────────────────────────────────────────────────────────────────

export type AmendmentMapperError =
  | AmendmentMapperInvalidId
  | AmendmentMapperInvalidContractId
  | AmendmentMapperInvalidStatus
  | AmendmentMapperInvalidKind
  | AmendmentMapperInvalidMoney
  | AmendmentMapperInvalidDate
  | AmendmentMapperInvalidDocumentId
  | AmendmentMapperInvalidUserRef
  | AmendmentMapperImpossibleShape;

// ─── Case constructors (Padrão D — free functions, DO D§22) ──────────────────

export const amendmentMapperInvalidId = (attemptedValue: string): AmendmentMapperInvalidId => ({
  tag: 'AmendmentMapperInvalidId',
  attemptedValue,
});

export const amendmentMapperInvalidContractId = (
  attemptedValue: string,
): AmendmentMapperInvalidContractId => ({
  tag: 'AmendmentMapperInvalidContractId',
  attemptedValue,
});

export const amendmentMapperInvalidStatus = (
  attemptedValue: string,
): AmendmentMapperInvalidStatus => ({
  tag: 'AmendmentMapperInvalidStatus',
  attemptedValue,
});

export const amendmentMapperInvalidKind = (attemptedValue: string): AmendmentMapperInvalidKind => ({
  tag: 'AmendmentMapperInvalidKind',
  attemptedValue,
});

export const amendmentMapperInvalidMoney = (
  attemptedCents: number,
): AmendmentMapperInvalidMoney => ({
  tag: 'AmendmentMapperInvalidMoney',
  attemptedCents,
});

export const amendmentMapperInvalidDate = (field: string): AmendmentMapperInvalidDate => ({
  tag: 'AmendmentMapperInvalidDate',
  field,
});

export const amendmentMapperInvalidDocumentId = (
  attemptedValue: string,
): AmendmentMapperInvalidDocumentId => ({
  tag: 'AmendmentMapperInvalidDocumentId',
  attemptedValue,
});

export const amendmentMapperInvalidUserRef = (
  attemptedValue: string,
): AmendmentMapperInvalidUserRef => ({
  tag: 'AmendmentMapperInvalidUserRef',
  attemptedValue,
});

export const amendmentMapperImpossibleShape = (reason: string): AmendmentMapperImpossibleShape => ({
  tag: 'AmendmentMapperImpossibleShape',
  reason,
});

// ─── Helpers internos ────────────────────────────────────────────────────────

const KINDS: readonly AmendmentKind[] = ['Addition', 'Suppression', 'TermChange', 'Misc'];
const STATUSES: readonly AmendmentStatus[] = ['Pending', 'Homologated'];

const isKind = (v: string): v is AmendmentKind => (KINDS as readonly string[]).includes(v);
const isStatus = (v: string): v is AmendmentStatus => (STATUSES as readonly string[]).includes(v);

export const amendmentToInsert = (a: Amendment): AmendmentInsert => {
  const base = {
    id: a.id as unknown as string,
    contractId: a.contractId as unknown as string,
    amendmentNumber: a.amendmentNumber,
    description: a.description,
    createdAt: a.createdAt,
    kind: a.kind,
    status: a.status,
    signedDocumentRef:
      a.signedDocumentRef === null ? null : (a.signedDocumentRef as unknown as string),
    homologatedAt: a.homologatedAt,
    homologatedBy: a.homologatedBy === null ? null : (a.homologatedBy as unknown as string),
  };
  switch (a.kind) {
    case 'Addition':
    case 'Suppression':
      return { ...base, impactValueCents: a.impactValue.cents, newEndDate: null };
    case 'TermChange':
      // Coluna `new_end_date` segue `DATETIME(3)`; converte PlainDate → Date UTC
      // na borda (ver inquiry 0020 / period.mapper). Fase 2b migra a coluna.
      return {
        ...base,
        impactValueCents: null,
        newEndDate: new Date(Date.UTC(a.newEndDate.year, a.newEndDate.month - 1, a.newEndDate.day)),
      };
    case 'Misc':
      return { ...base, impactValueCents: null, newEndDate: null };
    default: {
      const _exhaustive: never = a;
      return _exhaustive;
    }
  }
};

// Parte variant (eixo kind — independente do status, DO C§28).
// Tipada explicitamente para evitar inferência complexa de `ReturnType<>`.
// Addition e Suppression usam NonZeroMoney (rota α DO D§25) — espelha AmendmentVariant.
// Row com impactValueCents = 0 em Addition/Suppression é estado impossível e gera
// err(amendmentMapperImpossibleShape(...)) em variantFromRow.
type VariantPart =
  | Readonly<{ kind: 'Addition'; impactValue: NonZeroMoney }>
  | Readonly<{ kind: 'Suppression'; impactValue: NonZeroMoney }>
  | Readonly<{ kind: 'TermChange'; newEndDate: PlainDate.PlainDate }>
  | Readonly<{ kind: 'Misc' }>;

// Campos base comuns (sem variant, sem estado).
type CoreBase = Readonly<{
  id: AmendmentIdType;
  contractId: ContractIdType;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
}>;

/**
 * Lê a parte variant do row (eixo kind — independente do status, DON'T C§26).
 * Extrai como função helper para evitar `let variantPart` não-inicializado.
 * Recebe `kind: AmendmentKind` (já validado pelo caller via `isKind`) para que
 * o switch exhaustive funcione — `AmendmentRow.kind` é `string`, não `AmendmentKind`.
 */
const variantFromRow = (
  kind: AmendmentKind,
  impactValueCents: number | null,
  newEndDate: Date | null,
): Result<VariantPart, AmendmentMapperError> => {
  switch (kind) {
    case 'Addition':
    case 'Suppression': {
      if (impactValueCents === null)
        return err(amendmentMapperImpossibleShape('missing-impact-value-for-addition-suppression'));
      const m = moneyFromCents(impactValueCents);
      if (!m.ok) return err(amendmentMapperInvalidMoney(impactValueCents));
      // Rehidrata como NonZeroMoney (rota α DO D§25).
      // Row com impactValueCents = 0 para Addition/Suppression é estado impossível:
      // não deveria ter sido persistido após este ticket. Emite impossible-shape
      // em vez de silenciar para forçar detecção de corrupção no state file/DB.
      const nonZero = NonZeroMoneyNS.from(m.value);
      if (!nonZero.ok)
        return err(amendmentMapperImpossibleShape('impact-value-zero-for-addition-suppression'));
      return ok({ kind, impactValue: nonZero.value });
    }
    case 'TermChange': {
      if (newEndDate === null)
        return err(amendmentMapperImpossibleShape('missing-new-end-date-for-term-change'));
      return ok({ kind: 'TermChange' as const, newEndDate: PlainDate.fromDate(newEndDate) });
    }
    case 'Misc':
      return ok({ kind: 'Misc' as const });
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
};

export const amendmentFromRow = (
  row: Readonly<AmendmentRow>,
): Result<Amendment, AmendmentMapperError> => {
  // 1. Validar VOs comuns
  const idR = AmendmentId.rehydrate(row.id);
  if (!idR.ok) return err(amendmentMapperInvalidId(row.id));
  const contractIdR = ContractId.rehydrate(row.contractId);
  if (!contractIdR.ok) return err(amendmentMapperInvalidContractId(row.contractId));
  if (!isKind(row.kind)) return err(amendmentMapperInvalidKind(row.kind));
  if (!isStatus(row.status)) return err(amendmentMapperInvalidStatus(row.status));

  const coreBase: CoreBase = {
    id: idR.value,
    contractId: contractIdR.value,
    amendmentNumber: row.amendmentNumber,
    description: row.description,
    createdAt: row.createdAt,
  };

  // 2. Construir a parte variant (eixo kind — lida antes do status para evitar
  //    cross-product no código do mapper, conforme DON'T C§26).
  //    `row.kind` já foi validado por `isKind` acima → cast estreito para `AmendmentKind`.
  const variantR = variantFromRow(row.kind as AmendmentKind, row.impactValueCents, row.newEndDate);
  if (!variantR.ok) return variantR;
  const variantPart = variantR.value;

  // 3. Switch em status × signedDocumentRef para decidir o subtipo refinado.
  //    Valida shapes impossíveis (DO C§29: estados eliminam null-as-state).
  //
  //    Cast `as unknown as SubType` necessário porque o spread de objetos
  //    tipados separados (coreBase + variantPart + campos de estado) produz
  //    um tipo achatado que o TS não reduz automaticamente para a intersection
  //    de branded types. O invariante é garantido em runtime pelo switch exaustivo.
  switch (row.status) {
    case 'Pending': {
      // Shape impossível: Pending não pode ter homologatedAt nem homologatedBy.
      if (row.homologatedAt !== null || row.homologatedBy !== null) {
        return err(amendmentMapperImpossibleShape('pending-with-homologated-fields-populated'));
      }
      if (row.signedDocumentRef === null) {
        // Estado 1: PendingWithoutDocumentAmendment
        return ok({
          ...coreBase,
          ...variantPart,
          status: 'Pending' as const,
          signedDocumentRef: null,
          homologatedAt: null,
          homologatedBy: null,
        } as unknown as PendingWithoutDocumentAmendment);
      }
      // Estado 2: PendingWithDocumentAmendment
      const docR = DocumentId.rehydrate(row.signedDocumentRef);
      if (!docR.ok) return err(amendmentMapperInvalidDocumentId(row.signedDocumentRef));
      return ok({
        ...coreBase,
        ...variantPart,
        status: 'Pending' as const,
        signedDocumentRef: docR.value,
        homologatedAt: null,
        homologatedBy: null,
      } as unknown as PendingWithDocumentAmendment);
    }
    case 'Homologated': {
      // Shape impossível: Homologated exige todos os 3 campos terminais.
      if (
        row.signedDocumentRef === null ||
        row.homologatedAt === null ||
        row.homologatedBy === null
      ) {
        return err(amendmentMapperImpossibleShape('homologated-with-terminal-fields-missing'));
      }
      const docR = DocumentId.rehydrate(row.signedDocumentRef);
      if (!docR.ok) return err(amendmentMapperInvalidDocumentId(row.signedDocumentRef));
      const userR = UserRef.rehydrate(row.homologatedBy);
      if (!userR.ok) return err(amendmentMapperInvalidUserRef(row.homologatedBy));
      return ok({
        ...coreBase,
        ...variantPart,
        status: 'Homologated' as const,
        signedDocumentRef: docR.value,
        homologatedAt: row.homologatedAt,
        homologatedBy: userR.value,
      } as unknown as HomologatedAmendment);
    }
    default: {
      const _exhaustive: never = row.status;
      return _exhaustive;
    }
  }
};
