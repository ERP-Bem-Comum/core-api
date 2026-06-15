import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { Money } from '../../../../shared/kernel/money.ts';
import type { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import * as PayableId from '../shared/payable-id.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { ContractRef, BudgetPlanRef, CategoryRef, ProgramRef } from '../shared/refs.ts';
import type { Retention } from '../shared/retention.ts';
import type { RegisteredTax } from '../shared/registered-tax.ts';
import type { DocumentType, PaymentMethod, OpenDocument } from './types.ts';
import type { Payable, Payables } from '../payable/types.ts';
import type { DocumentEvent } from './events.ts';
import type { DocumentError } from './errors.ts';
import { computeNetValue } from './financial-data.ts';

// Padrão D (module-as-namespace): consumir com `import * as Document from './document.ts'`.

export type CreateDocumentInput = Readonly<{
  id: DocumentId;
  documentNumber: string;
  series?: string | null;
  type: DocumentType;
  supplier: SupplierRef;
  contractRef?: ContractRef | null;
  budgetPlanRef?: BudgetPlanRef | null;
  categoryRef?: CategoryRef | null;
  programRef?: ProgramRef | null;
  paymentMethod: PaymentMethod;
  grossValue: Money;
  sourceDiscounts: Money;
  discounts: Money;
  penalty: Money;
  interest: Money;
  retentions: readonly Retention[];
  registeredTaxes: readonly RegisteredTax[];
  dueDate: Date;
  description?: string | null;
}>;

export type CreateDocumentOutput = Readonly<{
  document: OpenDocument;
  payables: Payables;
  events: readonly DocumentEvent[];
}>;

// Salva o documento (Fato Gerador) e gera os títulos em `Open`.
// US1 (não-fiscal): apenas o título pai (valor líquido). Geração de filhos (NFS-e/RPA) entra na US2.
export const create = (input: CreateDocumentInput): Result<CreateDocumentOutput, DocumentError> => {
  const net = computeNetValue({
    grossValue: input.grossValue,
    sourceDiscounts: input.sourceDiscounts,
    discounts: input.discounts,
    penalty: input.penalty,
    interest: input.interest,
    retentions: input.retentions,
  });
  if (!net.ok) return err(net.error);

  const parent: Payable = immutable<Payable>({
    id: PayableId.generate(),
    origin: input.id,
    kind: 'Parent',
    retentionType: null,
    status: 'Open',
    value: net.value,
    dueDate: input.dueDate,
    paymentMethod: input.paymentMethod,
  });

  const children: readonly Payable[] = [];

  const document: OpenDocument = immutable<OpenDocument>({
    id: input.id,
    documentNumber: input.documentNumber,
    series: input.series ?? null,
    type: input.type,
    supplier: input.supplier,
    contractRef: input.contractRef ?? null,
    budgetPlanRef: input.budgetPlanRef ?? null,
    categoryRef: input.categoryRef ?? null,
    programRef: input.programRef ?? null,
    paymentMethod: input.paymentMethod,
    grossValue: input.grossValue,
    sourceDiscounts: input.sourceDiscounts,
    retentions: input.retentions,
    registeredTaxes: input.registeredTaxes,
    discounts: input.discounts,
    penalty: input.penalty,
    interest: input.interest,
    netValue: net.value,
    description: input.description ?? null,
    dueDate: input.dueDate,
    status: 'Open',
  });

  const events: readonly DocumentEvent[] = [
    { type: 'DocumentSaved', documentId: input.id, payableIds: [parent.id] },
  ];

  return ok(
    immutable<CreateDocumentOutput>({
      document,
      payables: immutable<Payables>({ parent, children }),
      events,
    }),
  );
};
