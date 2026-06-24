import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
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
import type { DocumentType, PaymentMethod, PayeeKind } from '../../domain/document/types.ts';
import type { PayableId } from '../../domain/shared/payable-id.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type {
  ContractCategorizationReadPort,
  ContractCategorizationReadError,
} from '#src/modules/contracts/public-api/index.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

export type SaveDocumentDeps = Readonly<{
  repo: DocumentRepository;
  clock: Clock;
  // #48: leitura cross-módulo (ADR-0006) p/ herdar a categorização do contrato vinculado.
  contractCategorizationReader: ContractCategorizationReadPort;
}>;

export type SaveDocumentCommand = Readonly<{
  documentNumber: string;
  series?: string | null;
  type: DocumentType;
  supplierRef: string;
  payeeKind?: PayeeKind;
  contractRef?: string | null;
  budgetPlanRef?: string | null;
  categoryRef?: string | null;
  costCenterRef?: string | null;
  programRef?: string | null;
  paymentMethod: PaymentMethod;
  grossValueCents: number;
  sourceDiscountsCents?: number;
  discountsCents?: number;
  penaltyCents?: number;
  interestCents?: number;
  retentions?: readonly Retention.RetentionInput[];
  registeredTaxes?: readonly RegisteredTax.RegisteredTaxInput[];
  dueDate: Date;
  issueDate?: Date | null; // #163
  description?: string | null;
  approverRef?: string | null; // #148: aprovador pretendido
  accessKey?: string | null; // #115: chave de acesso (DANFE)
}>;

export type SaveDocumentOutput = Readonly<{
  documentId: DocumentId.DocumentId;
  payableIds: readonly PayableId[];
}>;

export type SaveDocumentError =
  | DocumentError
  | DocumentRepositoryError
  | PartnerRefError
  | FinancialRefError
  | ContractCategorizationReadError
  | Money.MoneyError
  | Retention.RetentionError
  | RegisteredTax.RegisteredTaxError
  | UserRef.UserRefError;

// Imperative Shell: traduz primitivos → VOs (smart constructors), chama o domínio, persiste e publica.
// Sequência canônica (.claude/rules/application.md): validar → domain → persist → publish.
export const saveDocument =
  (deps: SaveDocumentDeps) =>
  async (cmd: SaveDocumentCommand): Promise<Result<SaveDocumentOutput, SaveDocumentError>> => {
    const supplier = SupplierRef.rehydrate(cmd.supplierRef);
    if (!supplier.ok) return err(supplier.error);

    const contractRef = cmd.contractRef == null ? null : ContractRef.rehydrate(cmd.contractRef);
    if (contractRef !== null && !contractRef.ok) return err(contractRef.error);
    const budgetPlanRef =
      cmd.budgetPlanRef == null ? null : BudgetPlanRef.rehydrate(cmd.budgetPlanRef);
    if (budgetPlanRef !== null && !budgetPlanRef.ok) return err(budgetPlanRef.error);
    const categoryRef = cmd.categoryRef == null ? null : CategoryRef.rehydrate(cmd.categoryRef);
    if (categoryRef !== null && !categoryRef.ok) return err(categoryRef.error);
    const costCenterRef =
      cmd.costCenterRef == null ? null : CostCenterRef.rehydrate(cmd.costCenterRef);
    if (costCenterRef !== null && !costCenterRef.ok) return err(costCenterRef.error);
    const programRef = cmd.programRef == null ? null : ProgramRef.rehydrate(cmd.programRef);
    if (programRef !== null && !programRef.ok) return err(programRef.error);
    const approverRef = cmd.approverRef == null ? null : UserRef.rehydrate(cmd.approverRef);
    if (approverRef !== null && !approverRef.ok) return err(approverRef.error);

    // #48: herda programRef/budgetPlanRef do contrato vinculado quando não informados pelo front
    // (pré-fill editável). categoria/centro de custo são rótulos livres do contrato, sem campo-ref
    // no documento → fora desta fatia. Leitura cross-módulo via public-api de contracts (#178).
    let resolvedProgramRef = programRef?.value ?? null;
    let resolvedBudgetPlanRef = budgetPlanRef?.value ?? null;
    if (
      contractRef?.value != null &&
      (resolvedProgramRef === null || resolvedBudgetPlanRef === null)
    ) {
      const cat = await deps.contractCategorizationReader.getCategorization(
        String(contractRef.value),
      );
      if (!cat.ok) return err(cat.error);
      if (cat.value !== null) {
        if (resolvedProgramRef === null && cat.value.programId !== null) {
          const r = ProgramRef.rehydrate(cat.value.programId);
          if (r.ok) resolvedProgramRef = r.value;
        }
        if (resolvedBudgetPlanRef === null && cat.value.budgetPlanId !== null) {
          const r = BudgetPlanRef.rehydrate(cat.value.budgetPlanId);
          if (r.ok) resolvedBudgetPlanRef = r.value;
        }
      }
    }

    const grossValue = Money.fromCents(cmd.grossValueCents);
    if (!grossValue.ok) return err(grossValue.error);
    const sourceDiscounts = Money.fromCents(cmd.sourceDiscountsCents ?? 0);
    if (!sourceDiscounts.ok) return err(sourceDiscounts.error);
    const discounts = Money.fromCents(cmd.discountsCents ?? 0);
    if (!discounts.ok) return err(discounts.error);
    const penalty = Money.fromCents(cmd.penaltyCents ?? 0);
    if (!penalty.ok) return err(penalty.error);
    const interest = Money.fromCents(cmd.interestCents ?? 0);
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

    const created = Document.create({
      id: DocumentId.generate(),
      documentNumber: cmd.documentNumber,
      series: cmd.series ?? null,
      type: cmd.type,
      supplier: supplier.value,
      payeeKind: cmd.payeeKind ?? 'supplier',
      contractRef: contractRef?.value ?? null,
      budgetPlanRef: resolvedBudgetPlanRef,
      categoryRef: categoryRef?.value ?? null,
      costCenterRef: costCenterRef?.value ?? null,
      programRef: resolvedProgramRef,
      paymentMethod: cmd.paymentMethod,
      grossValue: grossValue.value,
      sourceDiscounts: sourceDiscounts.value,
      discounts: discounts.value,
      penalty: penalty.value,
      interest: interest.value,
      retentions,
      registeredTaxes,
      dueDate: cmd.dueDate,
      issueDate: cmd.issueDate ?? null,
      description: cmd.description ?? null,
      approverRef: approverRef?.value ?? null,
      accessKey: cmd.accessKey ?? null,
    });
    if (!created.ok) return err(created.error);

    // Trilha (Time Travel): marco de criação. before/payablesBefore=null (documento novo);
    // actor=null (criação não carrega autoria nesta fatia). events[0] sempre presente — o
    // domínio emite ≥1 evento em create; guard mantém Result-clean sob noUncheckedIndexedAccess.
    const event = created.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: null,
      after: created.value.document,
      payablesBefore: null,
      payablesAfter: created.value.payables,
      actor: null,
    });

    const saved = await deps.repo.save(
      {
        document: created.value.document,
        payables: created.value.payables,
      },
      entries,
      undefined,
      created.value.events,
    );
    if (!saved.ok) return err(saved.error);

    return ok({
      documentId: created.value.document.id,
      payableIds: [
        created.value.payables.parent.id,
        ...created.value.payables.children.map((c) => c.id),
      ],
    });
  };
