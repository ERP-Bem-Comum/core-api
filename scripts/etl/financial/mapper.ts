/**
 * Mapper ETL: linhas legadas `accounts`/`payables` → planos de domínio (ETL-FINANCIAL-WRITER).
 *
 * Evidências de origem em auditoria-transformacoes-legado.md §5 (F1-F9). Decisões:
 * D7 (mapas de vocabulário fechados nos dados reais), (c) allowlist F5, D11 (aprovador
 * via join determinístico — o `approvedAtByPayableId` chega pronto do reader/writer),
 * F2 (aprovação órfã → fallback `updatedAt`, documentado), F3/F4 (incompletos → Draft).
 *
 * O mapper NÃO toca banco: produz planos puros; o writer decide save/approve/draft e a
 * idempotência (por `fin_documents.legacy_id` — identifierCode NÃO é único no dump).
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { DocumentType, PaymentMethod } from '#src/modules/financial/domain/document/types.ts';
import type { LegacyAccountRow, LegacyPayableRow } from '../legacy/rows.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import { EXCLUDED_PAYABLE_LEGACY_IDS } from './exclusions.ts';

// ── Contas-cedente ───────────────────────────────────────────────────────────

// Único banco presente no dump (5/5 'BRADESCO' — F7). Sem chute p/ outros: EnumUnknown.
const LEGACY_BANK_CODE_MAP: Readonly<Record<string, string>> = {
  BRADESCO: '237',
};

export type CedenteAccountPlan = Readonly<{
  legacyId: number;
  input: Readonly<{
    bankCode: string;
    agency: string;
    accountNumber: string;
    accountDigit: string;
    convenio: string;
    nickname: string;
    openingBalanceCents: number;
    openingBalanceDate: string;
  }>;
}>;

const toIsoDay = (d: Date): string => {
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const mapLegacyAccountRow = (
  row: LegacyAccountRow,
): Result<CedenteAccountPlan, readonly QuarantineReason[]> => {
  const errors: QuarantineReason[] = [];

  const bankCode = LEGACY_BANK_CODE_MAP[row.bank.trim().toUpperCase()];
  if (bankCode === undefined) {
    errors.push({ tag: 'EnumUnknown', field: 'bank', attempted: row.bank });
  }

  if (errors.length > 0 || bankCode === undefined) return err(errors);

  return ok({
    legacyId: row.id,
    input: {
      bankCode,
      // F7: agência legada vem com DV embutido ('0288-7') E dv separado — preservamos
      // a agência como veio (domínio só exige não-blank) e o dv no campo próprio.
      agency: row.agency,
      accountNumber: row.accountNumber,
      accountDigit: row.dv,
      // D6 pendente: convênio real Bradesco não existe no legado — placeholder auditado.
      convenio: 'LEGADO',
      nickname: row.name,
      openingBalanceCents: Math.round(row.initialBalance * 100),
      // Par coeso com cents (validação do domínio): data do saldo = criação da conta.
      openingBalanceDate: toIsoDay(row.createdAt),
    },
  });
};

// ── Payables ─────────────────────────────────────────────────────────────────

// Mapas D7 — fechados nos literais REAIS do dump; desconhecido → quarentena.
const LEGACY_DOC_TYPE_MAP: Readonly<Record<string, DocumentType>> = {
  'NOTA FISCAL': 'NFS-e', // contractModel 'Serviço' em 100% do dump confirma NFS-e
  FATURA: 'Fatura',
};

const LEGACY_PAYMENT_METHOD_MAP: Readonly<Record<string, PaymentMethod>> = {
  BOLETO: 'Boleto',
  PIX: 'PIX',
  TED: 'TED',
};

type StatusKind = 'open' | 'approved';
const LEGACY_STATUS_MAP: Readonly<Record<string, StatusKind>> = {
  ['LANÇADO']: 'open',
  ['EM APROVAÇÃO']: 'open',
  APROVADO: 'approved',
};

export type PayableMapRefs = Readonly<{
  supplierRefByLegacyId: ReadonlyMap<number, string>;
  contractRefByLegacyId: ReadonlyMap<number, string>;
  cedenteRefByLegacyId: ReadonlyMap<number, string>;
  /** payableId legado → data da aprovação (approvals.createdAt; D11/F1). */
  approvedAtByPayableId: ReadonlyMap<number, Date>;
}>;

export type PayableDocFields = Readonly<{
  documentNumber: string;
  type: DocumentType;
  supplierRef: string;
  paymentMethod: PaymentMethod;
  grossValueCents: number;
  dueDate: Date;
  contractRef: string | null;
  contaDebitoRef: string | null;
  competencia: string | null;
  paymentDetail: string | null;
  description: string | null;
}>;

export type PayableArtifact = Readonly<{
  legacyIdentifierCode: string | null;
  legacyStatus: string;
  legacyPaymentType: string;
  legacyDocType: string | null;
  recurrent: boolean;
  legacyPaymentDate: Date | null;
  /** liquid≠total com tax=0 (não deveria ocorrer): diferença em cents p/ auditoria da soma. */
  valueMismatchCents: number | null;
}>;

/** Campos do SaveDraftCommand (tudo nulável — US7): usado quando kind='draft'. */
export type PayableDraftFields = Readonly<{
  documentNumber: string | null;
  type: DocumentType | null;
  supplierRef: string | null;
  paymentMethod: PaymentMethod | null;
  grossValueCents: number | null;
  dueDate: Date | null;
  contractRef: string | null;
  contaDebitoRef: string | null;
  competencia: string | null;
  paymentDetail: string | null;
  description: string | null;
}>;

export type PayablePlan = Readonly<{
  legacyId: number;
  kind: 'draft' | 'open' | 'approved';
  /** Preenchido apenas em kind='approved' (approvals.createdAt ou fallback updatedAt — F2). */
  approvedAt: Date | null;
  /** Motivo do rebaixamento p/ Draft (F3/F4); null quando não-draft. */
  draftReason: string | null;
  /** Campos do SaveDocumentCommand (open/approved); null em draft. */
  doc: PayableDocFields | null;
  /** Campos do SaveDraftCommand; preenchido apenas em kind='draft'. */
  draft: PayableDraftFields | null;
  /** Instante de criação legado — Clock histórico do saveDocument/saveDraft. */
  createdAtLegacy: Date;
  artifact: PayableArtifact;
}>;

const toCompetencia = (d: Date | null): string | null => {
  if (d === null) return null;
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const mapLegacyPayableRow = (
  row: LegacyPayableRow,
  refs: PayableMapRefs,
): Result<PayablePlan, readonly QuarantineReason[]> => {
  // Allowlist ANTES de tudo (decisão c) — F5.
  const decisionRef = EXCLUDED_PAYABLE_LEGACY_IDS.get(row.id);
  if (decisionRef !== undefined) {
    return err([{ tag: 'ExcludedByDecision', field: 'legacy_id', decisionRef }]);
  }

  const errors: QuarantineReason[] = [];

  // F6: retenção sem tipo — o domínio exige ISS/IRRF/INSS/CSRF; aguarda insumo D7.
  if (row.taxValue > 0) {
    errors.push({ tag: 'RequiredFieldMissing', field: 'retention_type' });
  }

  const statusKind = LEGACY_STATUS_MAP[row.payableStatus];
  if (statusKind === undefined) {
    errors.push({ tag: 'EnumUnknown', field: 'payable_status', attempted: row.payableStatus });
  }

  const docType = row.docType === null ? undefined : LEGACY_DOC_TYPE_MAP[row.docType];
  if (docType === undefined) {
    errors.push({ tag: 'EnumUnknown', field: 'doc_type', attempted: row.docType ?? '(null)' });
  }

  const method =
    row.paymentMethod === null ? undefined : LEGACY_PAYMENT_METHOD_MAP[row.paymentMethod];
  if (method === undefined) {
    errors.push({
      tag: 'EnumUnknown',
      field: 'payment_method',
      attempted: row.paymentMethod ?? '(null)',
    });
  }

  let supplierRef: string | null = null;
  if (row.supplierId !== null) {
    supplierRef = refs.supplierRefByLegacyId.get(row.supplierId) ?? null;
  }
  if (supplierRef === null) {
    errors.push({ tag: 'RequiredFieldMissing', field: 'supplier_ref' });
  }

  let contractRef: string | null = null;
  if (row.contractId !== null) {
    const mapped = refs.contractRefByLegacyId.get(row.contractId);
    if (mapped === undefined) {
      errors.push({ tag: 'RequiredFieldMissing', field: 'contract_ref' });
    } else {
      contractRef = mapped;
    }
  }

  let contaDebitoRef: string | null = null;
  if (row.accountId !== null) {
    const mapped = refs.cedenteRefByLegacyId.get(row.accountId);
    if (mapped === undefined) {
      errors.push({ tag: 'RequiredFieldMissing', field: 'debit_account_ref' });
    } else {
      contaDebitoRef = mapped;
    }
  }

  if (
    errors.length > 0 ||
    statusKind === undefined ||
    docType === undefined ||
    method === undefined ||
    supplierRef === null
  ) {
    return err(errors);
  }

  const liquidCents = Math.round(row.liquidValue * 100);
  const grossCents = Math.round(row.totalValue * 100);

  const artifact: PayableArtifact = {
    legacyIdentifierCode: row.identifierCode,
    legacyStatus: row.payableStatus,
    legacyPaymentType: row.paymentType,
    legacyDocType: row.docType,
    recurrent: row.recurrent === 1,
    legacyPaymentDate: row.paymentDate,
    // tax=0 aqui (F6 quarentenou tax>0): liquid deveria == total; divergência é auditável.
    valueMismatchCents: grossCents - liquidCents === 0 ? null : grossCents - liquidCents,
  };

  // F3/F4: incompleto p/ Open (net<=0 ou sem vencimento) → Draft auditado.
  if (liquidCents <= 0 || row.dueDate === null) {
    const reason =
      liquidCents <= 0
        ? `liquidValue<=0 (F3: legado permitia; domínio rejeita net-value-not-positive)`
        : 'sem dueDate (F4: Open exige vencimento)';
    return ok({
      legacyId: row.id,
      kind: 'draft',
      approvedAt: null,
      draftReason: reason,
      doc: null,
      draft: {
        documentNumber: row.identifierCode,
        type: docType,
        supplierRef,
        paymentMethod: method,
        grossValueCents: grossCents > 0 ? grossCents : null,
        dueDate: row.dueDate,
        contractRef,
        contaDebitoRef,
        competencia: toCompetencia(row.competenceDate),
        paymentDetail: row.barcode,
        description: row.obs,
      },
      createdAtLegacy: row.createdAt,
      artifact,
    });
  }

  const doc: PayableDocFields = {
    documentNumber: row.identifierCode ?? `LEG-${String(row.id)}`,
    type: docType,
    supplierRef,
    paymentMethod: method,
    grossValueCents: grossCents,
    dueDate: row.dueDate,
    contractRef,
    contaDebitoRef,
    competencia: toCompetencia(row.competenceDate),
    paymentDetail: row.barcode,
    description: row.obs,
  };

  if (statusKind === 'approved') {
    // F1/F2: approvedAt do registro de aprovação; órfão → fallback updatedAt (documentado).
    const approvedAt = refs.approvedAtByPayableId.get(row.id) ?? row.updatedAt;
    return ok({
      legacyId: row.id,
      kind: 'approved',
      approvedAt,
      draftReason: null,
      doc,
      draft: null,
      createdAtLegacy: row.createdAt,
      artifact,
    });
  }

  return ok({
    legacyId: row.id,
    kind: 'open',
    approvedAt: null,
    draftReason: null,
    doc,
    draft: null,
    createdAtLegacy: row.createdAt,
    artifact,
  });
};
