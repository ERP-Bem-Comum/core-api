import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import { SupplierRef, type PartnerRefError } from '#src/modules/partners/public-api/refs.ts';
import {
  ContractRef,
  BudgetPlanRef,
  CategoryRef,
  SubcategoryRef,
  CostCenterRef,
  ProgramRef,
  type FinancialRefError,
} from '../../domain/shared/refs.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as SourceFileRef from '../../domain/document/source-file-ref.ts';
import * as Retention from '../../domain/shared/retention.ts';
import * as RegisteredTax from '../../domain/shared/registered-tax.ts';
import * as Document from '../../domain/document/document.ts';
import * as Competencia from '../../domain/document/competencia.ts';
import type { DocumentType, PaymentMethod, PayeeKind } from '../../domain/document/types.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

export type SaveDraftDeps = Readonly<{
  repo: DocumentRepository;
  clock: Clock;
}>;

// Campos opcionais para o rascunho — qualquer campo pode ser nulo/omitido (US7).
export type SaveDraftCommand = Readonly<{
  // #62: id fornecido pelo ingest (para casar a key do storage); ausente → gerado.
  id?: DocumentId.DocumentId;
  documentNumber?: string | null;
  series?: string | null;
  type?: DocumentType | null;
  supplierRef?: string | null;
  payeeKind?: PayeeKind | null;
  contractRef?: string | null;
  budgetPlanRef?: string | null;
  categoryRef?: string | null;
  subcategoryRef?: string | null; // #502: folha da árvore do plano (opcional no rascunho)
  costCenterRef?: string | null;
  programRef?: string | null;
  paymentMethod?: PaymentMethod | null;
  grossValueCents?: number | null;
  sourceDiscountsCents?: number | null;
  discountsCents?: number | null;
  penaltyCents?: number | null;
  interestCents?: number | null;
  retentions?: readonly Retention.RetentionInput[];
  registeredTaxes?: readonly RegisteredTax.RegisteredTaxInput[];
  dueDate?: Date | null;
  issueDate?: Date | null; // #163
  description?: string | null;
  approverRef?: string | null; // #148
  accessKey?: string | null; // #115
  competencia?: string | null; // #197
  contaDebitoRef?: string | null; // #197
  paymentDetail?: string | null; // #273
  sourceFile?: SourceFileRef.SourceFileRefInput | null; // #62: comprovante-fonte (crus → VO no use case)
}>;

export type SaveDraftOutput = Readonly<{ documentId: DocumentId.DocumentId }>;

export type SaveDraftError =
  | SourceFileRef.SourceFileRefError
  | DocumentError
  | DocumentRepositoryError
  | PartnerRefError
  | FinancialRefError
  | Money.MoneyError
  | Retention.RetentionError
  | RegisteredTax.RegisteredTaxError
  | UserRef.UserRefError;

const optionalMoney = (
  cents: number | null | undefined,
): Result<Money.Money | null, Money.MoneyError> => {
  if (cents == null) return ok(null);
  const m = Money.fromCents(cents);
  if (!m.ok) return err(m.error);
  return ok(m.value);
};

export const saveDraft =
  (deps: SaveDraftDeps) =>
  async (cmd: SaveDraftCommand): Promise<Result<SaveDraftOutput, SaveDraftError>> => {
    // Refs opcionais — validadas se presentes.
    const supplier = cmd.supplierRef == null ? ok(null) : SupplierRef.rehydrate(cmd.supplierRef);
    if (!supplier.ok) return err(supplier.error);

    const contractRef = cmd.contractRef == null ? ok(null) : ContractRef.rehydrate(cmd.contractRef);
    if (!contractRef.ok) return err(contractRef.error);
    const budgetPlanRef =
      cmd.budgetPlanRef == null ? ok(null) : BudgetPlanRef.rehydrate(cmd.budgetPlanRef);
    if (!budgetPlanRef.ok) return err(budgetPlanRef.error);
    const categoryRef = cmd.categoryRef == null ? ok(null) : CategoryRef.rehydrate(cmd.categoryRef);
    if (!categoryRef.ok) return err(categoryRef.error);
    const subcategoryRef =
      cmd.subcategoryRef == null ? ok(null) : SubcategoryRef.rehydrate(cmd.subcategoryRef);
    if (!subcategoryRef.ok) return err(subcategoryRef.error);
    const costCenterRef =
      cmd.costCenterRef == null ? ok(null) : CostCenterRef.rehydrate(cmd.costCenterRef);
    if (!costCenterRef.ok) return err(costCenterRef.error);
    const programRef = cmd.programRef == null ? ok(null) : ProgramRef.rehydrate(cmd.programRef);
    if (!programRef.ok) return err(programRef.error);
    const approverRef = cmd.approverRef == null ? ok(null) : UserRef.rehydrate(cmd.approverRef);
    if (!approverRef.ok) return err(approverRef.error);

    const grossValue = optionalMoney(cmd.grossValueCents);
    if (!grossValue.ok) return err(grossValue.error);
    const sourceDiscounts = optionalMoney(cmd.sourceDiscountsCents);
    if (!sourceDiscounts.ok) return err(sourceDiscounts.error);
    const discounts = optionalMoney(cmd.discountsCents);
    if (!discounts.ok) return err(discounts.error);
    const penalty = optionalMoney(cmd.penaltyCents);
    if (!penalty.ok) return err(penalty.error);
    const interest = optionalMoney(cmd.interestCents);
    if (!interest.ok) return err(interest.error);

    const retentions: Retention.Retention[] = [];
    for (const r of cmd.retentions ?? []) {
      const built = Retention.create(r);
      if (!built.ok) return err(built.error);
      retentions.push(built.value);
    }
    const registeredTaxes: RegisteredTax.RegisteredTax[] = [];
    for (const t of cmd.registeredTaxes ?? []) {
      const built = RegisteredTax.create(t);
      if (!built.ok) return err(built.error);
      registeredTaxes.push(built.value);
    }

    const id = cmd.id ?? DocumentId.generate();
    let competencia: Competencia.Competencia | null = null;
    if (cmd.competencia != null) {
      const c = Competencia.fromString(cmd.competencia);
      if (!c.ok) return err(c.error);
      competencia = c.value;
    }
    let sourceFileRef: SourceFileRef.SourceFileRef | null = null;
    if (cmd.sourceFile != null) {
      const sf = SourceFileRef.create(cmd.sourceFile);
      if (!sf.ok) return err(sf.error);
      sourceFileRef = sf.value;
    }
    // exactOptionalPropertyTypes: só incluir chave quando o valor é definido (não undefined).
    // Campos que são `string | null | undefined` no command devem omitir a chave se undefined,
    // pois SaveDraftInput tipifica cada campo como `?: T | null` (undefined implícito via ?).
    const draft = Document.saveDraft({
      id,
      ...(cmd.documentNumber !== undefined ? { documentNumber: cmd.documentNumber } : {}),
      ...(cmd.series !== undefined ? { series: cmd.series } : {}),
      ...(cmd.type !== undefined ? { type: cmd.type } : {}),
      supplier: supplier.value,
      ...(cmd.payeeKind !== undefined ? { payeeKind: cmd.payeeKind } : {}),
      ...(contractRef.value !== null ? { contractRef: contractRef.value } : {}),
      ...(budgetPlanRef.value !== null ? { budgetPlanRef: budgetPlanRef.value } : {}),
      ...(categoryRef.value !== null ? { categoryRef: categoryRef.value } : {}),
      ...(subcategoryRef.value !== null ? { subcategoryRef: subcategoryRef.value } : {}),
      ...(costCenterRef.value !== null ? { costCenterRef: costCenterRef.value } : {}),
      ...(programRef.value !== null ? { programRef: programRef.value } : {}),
      ...(cmd.paymentMethod !== undefined ? { paymentMethod: cmd.paymentMethod } : {}),
      ...(grossValue.value !== null ? { grossValue: grossValue.value } : {}),
      ...(sourceDiscounts.value !== null ? { sourceDiscounts: sourceDiscounts.value } : {}),
      ...(discounts.value !== null ? { discounts: discounts.value } : {}),
      ...(penalty.value !== null ? { penalty: penalty.value } : {}),
      ...(interest.value !== null ? { interest: interest.value } : {}),
      retentions,
      registeredTaxes,
      ...(cmd.dueDate !== undefined ? { dueDate: cmd.dueDate } : {}),
      ...(cmd.issueDate !== undefined ? { issueDate: cmd.issueDate } : {}),
      ...(cmd.description !== undefined ? { description: cmd.description } : {}),
      ...(approverRef.value !== null ? { approverRef: approverRef.value } : {}),
      ...(cmd.accessKey != null ? { accessKey: cmd.accessKey } : {}),
      ...(competencia !== null ? { competencia } : {}),
      ...(cmd.contaDebitoRef != null ? { debitAccountRef: cmd.contaDebitoRef } : {}),
      ...(cmd.paymentDetail !== undefined ? { paymentDetail: cmd.paymentDetail } : {}),
      ...(sourceFileRef !== null ? { sourceFileRef } : {}),
    });
    if (!draft.ok) return err(draft.error);

    // Trilha: marco de rascunho. before/payables*=null (documento novo, sem títulos no Draft).
    const event = draft.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: null,
      after: draft.value.document,
      payablesBefore: null,
      payablesAfter: null,
      actor: null,
    });

    const saved = await deps.repo.save(
      { document: draft.value.document, payables: null },
      entries,
      undefined,
      draft.value.events,
    );
    if (!saved.ok) return err(saved.error);

    return ok({ documentId: id });
  };
