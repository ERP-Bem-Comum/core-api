import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import { type Money, ZERO } from '../../../../shared/kernel/money.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import * as PayableId from '../shared/payable-id.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { ContractRef, BudgetPlanRef, CategoryRef, ProgramRef } from '../shared/refs.ts';
import type { Retention, RetentionType } from '../shared/retention.ts';
import type { RegisteredTax } from '../shared/registered-tax.ts';
import type {
  DocumentType,
  PaymentMethod,
  OpenDocument,
  ApprovedDocument,
  DraftDocument,
  Document,
} from './types.ts';
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

// Retenções permitidas por tipo de documento (R8): só NFS-e e RPA geram filhos.
const EMPTY_RETENTIONS: ReadonlySet<RetentionType> = new Set();
const ALLOWED_RETENTIONS: Readonly<Partial<Record<DocumentType, ReadonlySet<RetentionType>>>> = {
  'NFS-e': new Set<RetentionType>(['ISS', 'IRRF', 'INSS', 'CSRF']),
  RPA: new Set<RetentionType>(['ISS', 'IRRF', 'INSS', 'CSRF']),
};

const retentionsAllowed = (type: DocumentType, retentions: readonly Retention[]): boolean => {
  const allowed = ALLOWED_RETENTIONS[type] ?? EMPTY_RETENTIONS;
  return retentions.every((r) => allowed.has(r.type));
};

// Gera os títulos em `Open`: 1 pai (valor líquido) + 1 filho por retenção. Usado por create e adjust
// (no adjust, os filhos antigos são descartados e estes substituem — hard delete + recria, R8.1).
const buildOpenPayables = (params: {
  readonly documentId: DocumentId;
  readonly retentions: readonly Retention[];
  readonly netValue: Money;
  readonly dueDate: Date;
  readonly paymentMethod: PaymentMethod;
}): Payables => {
  const parent: Payable = immutable<Payable>({
    id: PayableId.generate(),
    origin: params.documentId,
    kind: 'Parent',
    retentionType: null,
    status: 'Open',
    value: params.netValue,
    dueDate: params.dueDate,
    paymentMethod: params.paymentMethod,
  });
  const children: readonly Payable[] = params.retentions.map((r) =>
    immutable<Payable>({
      id: PayableId.generate(),
      origin: params.documentId,
      kind: 'Child',
      retentionType: r.type,
      status: 'Open',
      value: r.value,
      dueDate: params.dueDate,
      paymentMethod: params.paymentMethod,
    }),
  );
  return immutable<Payables>({ parent, children });
};

const documentSavedEvents = (
  documentId: DocumentId,
  payables: Payables,
): readonly DocumentEvent[] => [
  {
    type: 'DocumentSaved',
    documentId,
    payableIds: [payables.parent.id, ...payables.children.map((c) => c.id)],
  },
];

// Salva o documento (Fato Gerador) e gera os títulos em `Open`: 1 pai (líquido) + 1 filho por retenção
// (apenas NFS-e/RPA — R8). Retenção em tipo não permitido é rejeitada.
export const create = (input: CreateDocumentInput): Result<CreateDocumentOutput, DocumentError> => {
  if (!retentionsAllowed(input.type, input.retentions))
    return err('retention-not-allowed-for-type');

  const net = computeNetValue({
    grossValue: input.grossValue,
    sourceDiscounts: input.sourceDiscounts,
    discounts: input.discounts,
    penalty: input.penalty,
    interest: input.interest,
    retentions: input.retentions,
  });
  if (!net.ok) return err(net.error);

  const payables = buildOpenPayables({
    documentId: input.id,
    retentions: input.retentions,
    netValue: net.value,
    dueDate: input.dueDate,
    paymentMethod: input.paymentMethod,
  });

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

  return ok(
    immutable<CreateDocumentOutput>({
      document,
      payables,
      events: documentSavedEvents(input.id, payables),
    }),
  );
};

export type ApproveDocumentInput = Readonly<{
  document: OpenDocument;
  payables: Payables;
  by: UserRef;
  at: Date;
}>;

export type ApproveDocumentOutput = Readonly<{
  document: ApprovedDocument;
  payables: Payables;
  events: readonly DocumentEvent[];
}>;

// Aprovação (Open → Approved): herança ao(s) filho(s); campos vitais imutáveis (garantido pelo tipo refinado).
// Separação de funções (Operador ≠ Aprovador) é imposta na borda HTTP (permissão `payable:approve`), não no domínio.
export const approve = (
  input: ApproveDocumentInput,
): Result<ApproveDocumentOutput, DocumentError> => {
  const toApproved = (p: Payable): Payable => immutable<Payable>({ ...p, status: 'Approved' });
  const parent = toApproved(input.payables.parent);
  const children = input.payables.children.map(toApproved);

  const document: ApprovedDocument = immutable<ApprovedDocument>({
    ...input.document,
    status: 'Approved',
    approvedAt: input.at,
    approvedBy: input.by,
  });

  const events: readonly DocumentEvent[] = [parent, ...children].map(
    (p): DocumentEvent => ({
      type: 'PayableApproved',
      documentId: input.document.id,
      payableId: p.id,
      approvedBy: input.by,
      approvedAt: input.at,
    }),
  );

  return ok(
    immutable<ApproveDocumentOutput>({
      document,
      payables: immutable<Payables>({ parent, children }),
      events,
    }),
  );
};

export type AdjustDocumentChanges = Readonly<{
  grossValue?: Money;
  sourceDiscounts?: Money;
  discounts?: Money;
  penalty?: Money;
  interest?: Money;
  retentions?: readonly Retention[];
  dueDate?: Date;
  description?: string | null;
}>;

export type AdjustDocumentInput = Readonly<{
  document: OpenDocument;
  payables: Payables;
  changes: AdjustDocumentChanges;
}>;

export type AdjustDocumentOutput = Readonly<{
  document: OpenDocument;
  payables: Payables;
  events: readonly DocumentEvent[];
}>;

// Ajuste em `Open` (US4): recalcula o líquido e REGENERA os filhos a partir das retenções atuais.
export const adjust = (input: AdjustDocumentInput): Result<AdjustDocumentOutput, DocumentError> => {
  const d = input.document;
  const c = input.changes;
  const retentions = c.retentions ?? d.retentions;
  if (!retentionsAllowed(d.type, retentions)) return err('retention-not-allowed-for-type');

  const grossValue = c.grossValue ?? d.grossValue;
  const sourceDiscounts = c.sourceDiscounts ?? d.sourceDiscounts;
  const discounts = c.discounts ?? d.discounts;
  const penalty = c.penalty ?? d.penalty;
  const interest = c.interest ?? d.interest;
  const dueDate = c.dueDate ?? d.dueDate;

  const net = computeNetValue({
    grossValue,
    sourceDiscounts,
    discounts,
    penalty,
    interest,
    retentions,
  });
  if (!net.ok) return err(net.error);

  const payables = buildOpenPayables({
    documentId: d.id,
    retentions,
    netValue: net.value,
    dueDate,
    paymentMethod: d.paymentMethod,
  });

  const document: OpenDocument = immutable<OpenDocument>({
    ...d,
    grossValue,
    sourceDiscounts,
    discounts,
    penalty,
    interest,
    retentions,
    netValue: net.value,
    dueDate,
    description: c.description ?? d.description,
    status: 'Open',
  });

  return ok(
    immutable<AdjustDocumentOutput>({
      document,
      payables,
      events: documentSavedEvents(d.id, payables),
    }),
  );
};

export type UndoApprovalInput = Readonly<{
  document: ApprovedDocument;
  payables: Payables;
}>;

export type UndoApprovalOutput = Readonly<{
  document: OpenDocument;
  payables: Payables;
  events: readonly DocumentEvent[];
}>;

// Desfazer aprovação (US5): Approved → Open; filhos voltam a `Open` (reaproveitados). A alteração de valores
// — que dispara hard delete + recriação dos filhos (R8.1) — ocorre no `adjust` subsequente.
export const undoApproval = (
  input: UndoApprovalInput,
): Result<UndoApprovalOutput, DocumentError> => {
  const d = input.document;
  const toOpen = (p: Payable): Payable => immutable<Payable>({ ...p, status: 'Open' });
  const payables = immutable<Payables>({
    parent: toOpen(input.payables.parent),
    children: input.payables.children.map(toOpen),
  });

  const document: OpenDocument = immutable<OpenDocument>({
    id: d.id,
    documentNumber: d.documentNumber,
    series: d.series,
    type: d.type,
    supplier: d.supplier,
    contractRef: d.contractRef,
    budgetPlanRef: d.budgetPlanRef,
    categoryRef: d.categoryRef,
    programRef: d.programRef,
    paymentMethod: d.paymentMethod,
    grossValue: d.grossValue,
    sourceDiscounts: d.sourceDiscounts,
    retentions: d.retentions,
    registeredTaxes: d.registeredTaxes,
    discounts: d.discounts,
    penalty: d.penalty,
    interest: d.interest,
    netValue: d.netValue,
    description: d.description,
    dueDate: d.dueDate,
    status: 'Open',
  });

  const events: readonly DocumentEvent[] = [{ type: 'ApprovalUndone', documentId: d.id }];

  return ok(immutable<UndoApprovalOutput>({ document, payables, events }));
};

export type CancelDocumentInput = Readonly<{
  document: OpenDocument;
  payables: Payables;
}>;

export type CancelDocumentOutput = Readonly<{
  events: readonly DocumentEvent[];
}>;

// Cancelamento (US6): só em `Open` (garantido pelo tipo refinado). O hard delete físico dos títulos é do
// repositório; o domínio autoriza e emite `DocumentCancelled` com os ids removidos (pai + filhos).
export const cancel = (input: CancelDocumentInput): Result<CancelDocumentOutput, DocumentError> => {
  const payableIds = [input.payables.parent.id, ...input.payables.children.map((c) => c.id)];
  const events: readonly DocumentEvent[] = [
    { type: 'DocumentCancelled', documentId: input.document.id, payableIds },
  ];
  return ok(immutable<CancelDocumentOutput>({ events }));
};

export type SaveDraftInput = Readonly<{
  id: DocumentId;
  documentNumber?: string | null;
  series?: string | null;
  type?: DocumentType | null;
  supplier?: SupplierRef | null;
  contractRef?: ContractRef | null;
  budgetPlanRef?: BudgetPlanRef | null;
  categoryRef?: CategoryRef | null;
  programRef?: ProgramRef | null;
  paymentMethod?: PaymentMethod | null;
  grossValue?: Money | null;
  sourceDiscounts?: Money | null;
  discounts?: Money | null;
  penalty?: Money | null;
  interest?: Money | null;
  retentions?: readonly Retention[];
  registeredTaxes?: readonly RegisteredTax[];
  dueDate?: Date | null;
  description?: string | null;
}>;

export type SaveDraftOutput = Readonly<{
  document: DraftDocument;
  events: readonly DocumentEvent[];
}>;

// Rascunho (US7): persistência parcial, sem validação plena (autosave é responsabilidade do cliente). Não gera títulos.
export const saveDraft = (input: SaveDraftInput): Result<SaveDraftOutput, DocumentError> => {
  const document: DraftDocument = immutable<DraftDocument>({
    id: input.id,
    status: 'Draft',
    documentNumber: input.documentNumber ?? null,
    series: input.series ?? null,
    type: input.type ?? null,
    supplier: input.supplier ?? null,
    contractRef: input.contractRef ?? null,
    budgetPlanRef: input.budgetPlanRef ?? null,
    categoryRef: input.categoryRef ?? null,
    programRef: input.programRef ?? null,
    paymentMethod: input.paymentMethod ?? null,
    grossValue: input.grossValue ?? null,
    sourceDiscounts: input.sourceDiscounts ?? null,
    discounts: input.discounts ?? null,
    penalty: input.penalty ?? null,
    interest: input.interest ?? null,
    retentions: input.retentions ?? [],
    registeredTaxes: input.registeredTaxes ?? [],
    dueDate: input.dueDate ?? null,
    description: input.description ?? null,
  });
  const events: readonly DocumentEvent[] = [{ type: 'DocumentDraftSaved', documentId: input.id }];
  return ok(immutable<SaveDraftOutput>({ document, events }));
};

// Submissão (US7): Draft → Open. Exige os campos obrigatórios preenchidos; delega a geração de títulos a `create`.
export const submit = (draft: DraftDocument): Result<CreateDocumentOutput, DocumentError> => {
  const { documentNumber, type, supplier, paymentMethod, grossValue, dueDate } = draft;
  if (
    documentNumber === null ||
    type === null ||
    supplier === null ||
    paymentMethod === null ||
    grossValue === null ||
    dueDate === null
  ) {
    return err('document-incomplete');
  }
  return create({
    id: draft.id,
    documentNumber,
    series: draft.series,
    type,
    supplier,
    contractRef: draft.contractRef,
    budgetPlanRef: draft.budgetPlanRef,
    categoryRef: draft.categoryRef,
    programRef: draft.programRef,
    paymentMethod,
    grossValue,
    sourceDiscounts: draft.sourceDiscounts ?? ZERO,
    discounts: draft.discounts ?? ZERO,
    penalty: draft.penalty ?? ZERO,
    interest: draft.interest ?? ZERO,
    retentions: draft.retentions,
    registeredTaxes: draft.registeredTaxes,
    dueDate,
    description: draft.description,
  });
};

// Refinement constructors (ts-domain-modeler §3.D.2): estreitam o estado lido do repositório (union `Document`).
// É aqui que "transição inválida" vira erro runtime — o use case carrega o agregado e refina antes da operação.
export const parseOpen = (d: Document): Result<OpenDocument, DocumentError> =>
  d.status === 'Open' ? ok(d) : err('invalid-state-transition');

export const parseApproved = (d: Document): Result<ApprovedDocument, DocumentError> =>
  d.status === 'Approved' ? ok(d) : err('invalid-state-transition');

export const parseDraft = (d: Document): Result<DraftDocument, DocumentError> =>
  d.status === 'Draft' ? ok(d) : err('invalid-state-transition');
