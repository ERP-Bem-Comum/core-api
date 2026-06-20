import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import { SupplierRef, type PartnerRefError } from '#src/modules/partners/public-api/refs.ts';
import {
  ContractRef,
  BudgetPlanRef,
  CategoryRef,
  CostCenterRef,
  ProgramRef,
  type FinancialRefError,
} from '../../domain/shared/refs.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Retention from '../../domain/shared/retention.ts';
import * as RegisteredTax from '../../domain/shared/registered-tax.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentType, PaymentMethod } from '../../domain/document/types.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

export type SaveDraftDeps = Readonly<{
  repo: DocumentRepository;
  outbox: FinancialOutbox;
  clock: Clock;
}>;

// Campos opcionais para o rascunho — qualquer campo pode ser nulo/omitido (US7).
export type SaveDraftCommand = Readonly<{
  documentNumber?: string | null;
  series?: string | null;
  type?: DocumentType | null;
  supplierRef?: string | null;
  contractRef?: string | null;
  budgetPlanRef?: string | null;
  categoryRef?: string | null;
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
}>;

export type SaveDraftOutput = Readonly<{ documentId: DocumentId.DocumentId }>;

export type SaveDraftError =
  | DocumentError
  | DocumentRepositoryError
  | OutboxAppendError
  | PartnerRefError
  | FinancialRefError
  | Money.MoneyError
  | Retention.RetentionError
  | RegisteredTax.RegisteredTaxError;

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
    const costCenterRef =
      cmd.costCenterRef == null ? ok(null) : CostCenterRef.rehydrate(cmd.costCenterRef);
    if (!costCenterRef.ok) return err(costCenterRef.error);
    const programRef = cmd.programRef == null ? ok(null) : ProgramRef.rehydrate(cmd.programRef);
    if (!programRef.ok) return err(programRef.error);

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

    const id = DocumentId.generate();
    // exactOptionalPropertyTypes: só incluir chave quando o valor é definido (não undefined).
    // Campos que são `string | null | undefined` no command devem omitir a chave se undefined,
    // pois SaveDraftInput tipifica cada campo como `?: T | null` (undefined implícito via ?).
    const draft = Document.saveDraft({
      id,
      ...(cmd.documentNumber !== undefined ? { documentNumber: cmd.documentNumber } : {}),
      ...(cmd.series !== undefined ? { series: cmd.series } : {}),
      ...(cmd.type !== undefined ? { type: cmd.type } : {}),
      supplier: supplier.value,
      ...(contractRef.value !== null ? { contractRef: contractRef.value } : {}),
      ...(budgetPlanRef.value !== null ? { budgetPlanRef: budgetPlanRef.value } : {}),
      ...(categoryRef.value !== null ? { categoryRef: categoryRef.value } : {}),
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

    const saved = await deps.repo.save({ document: draft.value.document, payables: null }, entries);
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(draft.value.events);
    if (!published.ok) return err(published.error);

    return ok({ documentId: id });
  };
