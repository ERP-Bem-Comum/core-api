import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import { type Money, ZERO } from '../../../../shared/kernel/money.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import * as PayableId from '../shared/payable-id.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { Competencia } from './competencia.ts';
import type {
  ContractRef,
  BudgetPlanRef,
  CategoryRef,
  SubcategoryRef,
  CostCenterRef,
  ProgramRef,
} from '../shared/refs.ts';
import type { Retention } from '../shared/retention.ts';
import type { RegisteredTax } from '../shared/registered-tax.ts';
import type { SourceFileRef } from './source-file-ref.ts';
import type {
  DocumentType,
  PaymentMethod,
  PayeeKind,
  OpenDocument,
  ApprovedDocument,
  DraftDocument,
  Document,
  DocumentStatus,
} from './types.ts';
import type { Payable, Payables } from '../payable/types.ts';
import type { DocumentEvent, PayableSnapshot } from './events.ts';
import type { DocumentError } from './errors.ts';
import { computeNetValue } from './financial-data.ts';
import { allowedRetentionsFor } from './document-type-metadata.ts';
// A MESMA régua que o pré-voo e o gerador da remessa usam (#708). Uma segunda definição de "este
// título paga?" divergiria da primeira, e a divergência apareceria como título que uma camada
// aprova e a outra recusa.
import { checkPayoutReadiness } from '../payout/payout-readiness.ts';

// Padrão D (module-as-namespace): consumir com `import * as Document from './document.ts'`.

export type CreateDocumentInput = Readonly<{
  id: DocumentId;
  documentNumber: string;
  series?: string | null;
  type: DocumentType;
  supplier: SupplierRef;
  payeeKind?: PayeeKind;
  contractRef?: ContractRef | null;
  budgetPlanRef?: BudgetPlanRef | null;
  categoryRef?: CategoryRef | null;
  subcategoryRef?: SubcategoryRef | null; // #502: folha da árvore do plano
  costCenterRef?: CostCenterRef | null;
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
  issueDate?: Date | null; // #163: data de emissão (opcional no create)
  approverRef?: UserRef | null; // #148: aprovador pretendido (opcional)
  accessKey?: string | null; // #115: chave de acesso (DANFE); já normalizada na borda
  competencia?: Competencia | null; // #197: mês contábil (VO já validado)
  debitAccountRef?: string | null; // #197: conta-débito (validada by-identity no use-case)
  paymentDetail?: string | null; // #273: complemento da forma de pagamento
  sourceFileRef?: SourceFileRef | null; // #62: comprovante-fonte guardado no storage
}>;

export type CreateDocumentOutput = Readonly<{
  document: OpenDocument;
  payables: Payables;
  events: readonly DocumentEvent[];
}>;

// Retenções permitidas por tipo (R8): fonte única em document-type-metadata.ts (#292).
const retentionsAllowed = (type: DocumentType, retentions: readonly Retention[]): boolean => {
  const allowed = allowedRetentionsFor(type);
  return retentions.every((r) => allowed.includes(r.type));
};

// O id do filho de `type` na `occurrence`-ésima aparição, entre os títulos ANTERIORES — ou `null`
// quando não havia um equivalente (retenção nova). Casar por `(kind, retentionType)` e consumir cada
// anterior uma única vez dá bijeção determinística mesmo com duas retenções do mesmo tipo: a n-ésima
// casa com a n-ésima. Retenção removida simplesmente não é procurada; o título dela deixa de existir.
const priorChildId = (
  prior: Payables | null,
  type: Retention['type'],
  occurrence: number,
): Payable['id'] | null => {
  if (prior === null) return null;
  return prior.children.filter((c) => c.retentionType === type)[occurrence]?.id ?? null;
};

// Gera os títulos em `Open`: 1 pai (valor líquido) + 1 filho por retenção.
//
// ⚠️ `prior` é o que separa CRIAR de REAJUSTAR. Com `prior`, o título que continua existindo mantém
// o `PayableId` — porque a identidade de uma entidade não é atributo dela, e sim o fio de
// continuidade que a torna referenciável de fora (Evans, DDD p.49). E `fin_remittance_payables`
// referencia exatamente esse id: regenerá-lo transformava toda remessa emitida num vínculo órfão, e
// fazia a trava anti-dupla-emissão (`findHeldPayableIds`) deixar de reconhecer o título — pagamento
// em duplicidade, que é o que aquela tabela existe para impedir (`schemas/mysql.ts:1199-1201`).
//
// Isto REVISA a R8.1: o ajuste continua regenerando VALOR, forma e complemento; deixa de regenerar
// IDENTIDADE. A premissa original da R8.1 — nada fora do agregado referencia `Payable.id` — deixou
// de valer quando a migration 0050 passou a apontar para dentro.
const buildOpenPayables = (params: {
  readonly documentId: DocumentId;
  readonly retentions: readonly Retention[];
  readonly netValue: Money;
  readonly dueDate: Date;
  readonly paymentMethod: PaymentMethod;
  readonly paymentDetail: string | null;
  readonly prior: Payables | null;
}): Payables => {
  const parent: Payable = immutable<Payable>({
    // O pai é único por documento: se havia um, é o mesmo título economicamente — mudou quanto, não o quê.
    id: params.prior?.parent.id ?? PayableId.generate(),
    origin: params.documentId,
    kind: 'Parent',
    retentionType: null,
    status: 'Open',
    value: params.netValue,
    dueDate: params.dueDate,
    paymentMethod: params.paymentMethod,
    paymentDetail: params.paymentDetail,
    paidAt: null,
  });
  const children: readonly Payable[] = params.retentions.map((r, index) => {
    const occurrence = params.retentions.slice(0, index).filter((x) => x.type === r.type).length;
    return immutable<Payable>({
      id: priorChildId(params.prior, r.type, occurrence) ?? PayableId.generate(),
      origin: params.documentId,
      kind: 'Child',
      retentionType: r.type,
      status: 'Open',
      value: r.value,
      dueDate: params.dueDate,
      // O filho nasce herdando a forma e o complemento da nota — e é só uma SEMENTE. A guia de
      // recolhimento do imposto tem código de barras próprio, que chega por `updatePayablePayment`.
      // Herdar mantém a compatibilidade de quem já lançava sem distinguir; divergir é o caso novo.
      paymentMethod: params.paymentMethod,
      paymentDetail: params.paymentDetail,
      paidAt: null,
    });
  });
  return immutable<Payables>({ parent, children });
};

// #235: refs necessárias ao snapshot de projeção — subset estrutural de Open/ApprovedDocument.
type DocumentRefsSource = Readonly<{
  id: DocumentId;
  supplier: SupplierRef;
  contractRef: ContractRef | null;
  categoryRef: CategoryRef | null;
  budgetPlanRef: BudgetPlanRef | null;
  costCenterRef: CostCenterRef | null;
  programRef: ProgramRef | null;
  debitAccountRef: string | null;
}>;

const payableSnapshot = (p: Payable): PayableSnapshot => ({
  payableId: p.id,
  kind: p.kind,
  retentionType: p.retentionType,
  valueCents: String(p.value.cents),
  dueDate: p.dueDate.toISOString().slice(0, 10),
  status: p.status,
});

const documentSavedEvents = (
  document: DocumentRefsSource,
  payables: Payables,
): readonly DocumentEvent[] => {
  const all = [payables.parent, ...payables.children];
  return [
    {
      type: 'DocumentSaved',
      documentId: document.id,
      payableIds: all.map((p) => p.id),
      supplierRef: document.supplier,
      contractRef: document.contractRef,
      categoryRef: document.categoryRef,
      budgetPlanRef: document.budgetPlanRef,
      costCenterRef: document.costCenterRef,
      programRef: document.programRef,
      debitAccountRef: document.debitAccountRef,
      payables: all.map(payableSnapshot),
    },
  ];
};

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
    paymentDetail: input.paymentDetail ?? null,
    // Criação: não há título anterior de quem herdar identidade.
    prior: null,
  });

  // #115: formato (44 dígitos) e obrigatoriedade na DANFE são invariantes do documento submetido.
  if (input.accessKey != null && !/^\d{44}$/.test(input.accessKey))
    return err('invalid-access-key');
  if (input.type === 'DANFE' && (input.accessKey == null || input.accessKey === ''))
    return err('access-key-required-for-danfe');

  const document: OpenDocument = immutable<OpenDocument>({
    id: input.id,
    documentNumber: input.documentNumber,
    series: input.series ?? null,
    type: input.type,
    supplier: input.supplier,
    payeeKind: input.payeeKind ?? 'supplier',
    contractRef: input.contractRef ?? null,
    budgetPlanRef: input.budgetPlanRef ?? null,
    categoryRef: input.categoryRef ?? null,
    subcategoryRef: input.subcategoryRef ?? null,
    costCenterRef: input.costCenterRef ?? null,
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
    issueDate: input.issueDate ?? null,
    approverRef: input.approverRef ?? null,
    accessKey: input.accessKey ?? null,
    competencia: input.competencia ?? null,
    debitAccountRef: input.debitAccountRef ?? null,
    paymentDetail: input.paymentDetail ?? null,
    sourceFileRef: input.sourceFileRef ?? null,
    status: 'Open',
  });

  return ok(
    immutable<CreateDocumentOutput>({
      document,
      payables,
      events: documentSavedEvents(document, payables),
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

export type PayPayableManuallyInput = Readonly<{
  document: ApprovedDocument;
  payables: Payables;
  payableId: PayableId.PayableId;
  by: UserRef;
  at: Date;
  reason?: string;
}>;

export type PayPayableManuallyOutput = Readonly<{
  document: ApprovedDocument;
  payables: Payables;
  events: readonly DocumentEvent[];
}>;

// As DUAS origens de uma baixa manual (ADR-0065 §6), e a fonte única da pré-condição.
//
//  - `Approved`    — pagamento feito FORA da VAN: cheque, caixa, boleto avulso. O caminho de sempre.
//  - `Transmitted` — pagamento que saiu pela VAN e que o operador conferiu no site do banco. A P.O.
//    decidiu na #59 que `Pago` continua manual: o retorno do banco (#690) não existe, então quem
//    afirma que o dinheiro saiu é a pessoa que olhou o extrato.
//
// É a MESMA ação humana, e por isso não há slug distinto por origem — inventar um obrigaria a tela a
// explicar uma diferença que não muda o que ninguém faz.
//
// ⚠️ Exportada porque o CAS do adapter (`payable-repository.drizzle.ts`) precisa da mesma lista: lá a
// pré-condição vale no INSTANTE da escrita, aqui vale sobre o agregado que se leu. Duas listas
// divergiriam em silêncio, e a divergência apareceria como baixa aceita em memória e recusada no
// banco — ou pior, o contrário.
export const MANUALLY_PAYABLE_STATUSES: readonly DocumentStatus[] = ['Approved', 'Transmitted'];

// #223: baixa manual de UM título (→Pago), por título (#201). Relaxa a invariante "payable espelha
// documento": um título pode ficar Pago enquanto os irmãos seguem Aprovados. O documento permanece
// Approved (rollup do documento p/ Pago é fatia futura).
export const payPayableManually = (
  input: PayPayableManuallyInput,
): Result<PayPayableManuallyOutput, DocumentError> => {
  const all = [input.payables.parent, ...input.payables.children];
  const target = all.find((p) => p.id === input.payableId);
  if (target === undefined) return err('payable-not-found');
  // O slug continua `payable-not-approved` mesmo agora que `Transmitted` também serve: ele nomeia o
  // que o operador precisa fazer (aprovar), e `Draft`/`Open` — os únicos que chegam aqui recusados —
  // são exatamente os que ainda não passaram pela aprovação.
  if (!MANUALLY_PAYABLE_STATUSES.includes(target.status)) return err('payable-not-approved');

  const pay = (p: Payable): Payable =>
    p.id === input.payableId ? immutable<Payable>({ ...p, status: 'Paid', paidAt: input.at }) : p;

  const event: DocumentEvent = {
    type: 'PayableManuallyPaid',
    documentId: input.document.id,
    payableId: input.payableId,
    paidBy: input.by,
    paidAt: input.at,
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  };

  return ok(
    immutable<PayPayableManuallyOutput>({
      document: input.document,
      payables: immutable<Payables>({
        parent: pay(input.payables.parent),
        children: input.payables.children.map(pay),
      }),
      events: [event],
    }),
  );
};

export type UpdatePayableDueDateInput = Readonly<{
  document: OpenDocument | ApprovedDocument;
  payables: Payables;
  payableId: PayableId.PayableId;
  dueDate: Date;
}>;

export type UpdatePayableDueDateOutput = Readonly<{
  document: OpenDocument | ApprovedDocument;
  payables: Payables;
  events: readonly DocumentEvent[];
}>;

// #270: altera o vencimento de UM título isolado — sem propagar ao documento-pai nem aos irmãos
// (contrasta com `editMetadata`, que leva o dueDate a TODOS os payables). O documento permanece
// intacto; só o título alvo recebe o novo `dueDate`. Reemite `DocumentSaved` (reprojeta o read-model
// com o snapshot atualizado), como `editMetadata`/`adjust` — sem evento novo nem migration.
export const updatePayableDueDate = (
  input: UpdatePayableDueDateInput,
): Result<UpdatePayableDueDateOutput, DocumentError> => {
  const all = [input.payables.parent, ...input.payables.children];
  const target = all.find((p) => p.id === input.payableId);
  if (target === undefined) return err('payable-not-found');

  const retime = (p: Payable): Payable =>
    p.id === input.payableId ? immutable<Payable>({ ...p, dueDate: input.dueDate }) : p;

  const payables = immutable<Payables>({
    parent: retime(input.payables.parent),
    children: input.payables.children.map(retime),
  });

  return ok(
    immutable<UpdatePayableDueDateOutput>({
      document: input.document,
      payables,
      events: documentSavedEvents(input.document, payables),
    }),
  );
};

export type UpdatePayablePaymentInput = Readonly<{
  document: OpenDocument | ApprovedDocument;
  payables: Payables;
  payableId: PayableId.PayableId;
  // Ambos opcionais e independentes: `undefined` preserva, e em `paymentDetail` o `null` APAGA —
  // mesma semântica de `editMetadata`/`adjust`, para não haver duas convenções no mesmo agregado.
  paymentMethod?: PaymentMethod;
  paymentDetail?: string | null;
}>;

export type UpdatePayablePaymentOutput = Readonly<{
  document: OpenDocument | ApprovedDocument;
  payables: Payables;
  events: readonly DocumentEvent[];
}>;

// Altera a FORMA DE PAGAMENTO e o COMPLEMENTO de UM título isolado, sem propagar ao documento-pai
// nem aos irmãos — irmã de `updatePayableDueDate` (#270), mesma natureza e mesmo contrato de erro.
//
// A premissa que a justifica: retenção É título a pagar. O pai pode sair em boleto e o filho de ISS
// em guia de recolhimento, cada um com o seu código de barras — e o pai pode ser pago sem que o
// filho seja. Enquanto forma e complemento vivessem só na nota, esse arranjo não tinha onde existir.
export const updatePayablePayment = (
  input: UpdatePayablePaymentInput,
): Result<UpdatePayablePaymentOutput, DocumentError> => {
  const all = [input.payables.parent, ...input.payables.children];
  const target = all.find((p) => p.id === input.payableId);
  if (target === undefined) return err('payable-not-found');

  const paymentMethod = input.paymentMethod ?? target.paymentMethod;
  const paymentDetail =
    input.paymentDetail !== undefined ? input.paymentDetail : target.paymentDetail;

  // Decisão do P.O.: o dado entra limpo ou não entra. Complemento ausente e complemento torto são
  // recusados igualmente — os dois terminam no mesmo lugar, um arquivo que o banco não processa, e
  // o momento barato de descobrir é agora, com o operador ainda na tela do título.
  //
  // ⚠️ A régua vale só onde o dinheiro segue o CÓDIGO DE BARRAS. PIX e transferência pagam por
  // chave e por conta do favorecido — dado do cadastro, que este agregado não alcança (o `payee`
  // chega por composição na borda, ADR-0032). Julgá-las aqui com `payee: null` reprovaria toda
  // troca para PIX, recusando por ignorância em vez de por dado sujo. Quem as julga é o pré-voo,
  // que tem o favorecido em mãos.
  const paysByBarcode = paymentMethod === 'Boleto' || paymentMethod === 'GuiaRecolhimento';
  if (paysByBarcode) {
    const readiness = checkPayoutReadiness({ paymentMethod, paymentDetail, payee: null });
    if (readiness.status !== 'ready') return err('payable-payment-detail-invalid');
  }

  const repay = (p: Payable): Payable =>
    p.id === input.payableId ? immutable<Payable>({ ...p, paymentMethod, paymentDetail }) : p;

  const payables = immutable<Payables>({
    parent: repay(input.payables.parent),
    children: input.payables.children.map(repay),
  });

  return ok(
    immutable<UpdatePayablePaymentOutput>({
      document: input.document,
      payables,
      events: documentSavedEvents(input.document, payables),
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
  paymentDetail?: string | null;
}>;

export type AdjustDocumentInput = Readonly<{
  document: OpenDocument;
  payables: Payables;
  changes: AdjustDocumentChanges;
  // Títulos presos numa remessa viva, resolvidos pela aplicação (`findHeldPayableIds`). O domínio
  // não conhece remessa — recebe o fato pronto e decide sobre ele, que é o que mantém a regra aqui
  // em vez de virar um `if` de orquestração (`.claude/rules/application.md`).
  //
  // `string` e não `PayableId`: são ids apurados por OUTRA parte do sistema, e o que se faz com eles
  // aqui é comparar. Marcá-los como branded exigiria um cast — que produz um tipo que mente sobre
  // uma validação que não aconteceu (`.claude/rules/domain.md`). Comparar string com string é o que
  // a operação de fato é.
  heldPayableIds: readonly string[];
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

  // Guarda ANTES de qualquer cálculo: se há dinheiro em trânsito por esta nota, o ajuste de valor
  // não acontece. A comparação é contra os títulos DESTA nota — hold de outra não trava esta.
  const ownIds: readonly string[] = [
    input.payables.parent.id,
    ...input.payables.children.map((child) => child.id),
  ];
  if (input.heldPayableIds.some((heldId) => ownIds.includes(heldId))) {
    return err('document-has-held-payable');
  }

  const retentions = c.retentions ?? d.retentions;
  if (!retentionsAllowed(d.type, retentions)) return err('retention-not-allowed-for-type');

  const grossValue = c.grossValue ?? d.grossValue;
  const sourceDiscounts = c.sourceDiscounts ?? d.sourceDiscounts;
  const discounts = c.discounts ?? d.discounts;
  const penalty = c.penalty ?? d.penalty;
  const interest = c.interest ?? d.interest;
  const dueDate = c.dueDate ?? d.dueDate;
  // null apaga (undefined preserva) — calculado ANTES dos payables porque a semente dos títulos usa
  // o mesmo valor que o documento vai guardar; lê-lo em dois lugares abriria a porta para divergirem.
  const paymentDetail = c.paymentDetail !== undefined ? c.paymentDetail : d.paymentDetail;

  const net = computeNetValue({
    grossValue,
    sourceDiscounts,
    discounts,
    penalty,
    interest,
    retentions,
  });
  if (!net.ok) return err(net.error);

  // ⚠️ `adjust` REGENERA os títulos (R8.1): forma e complemento próprios de um título são perdidos
  // aqui. É o contrato do ajuste completo, não um descuido — quem quer preservar o complemento usa
  // `editMetadata` ou `updatePayablePayment`.
  //
  // O que NÃO se perde mais é a IDENTIDADE: `prior` faz o título que continua existindo manter o
  // `PayableId`. A R8.1 original também descartava o id, sob a premissa de que nada fora do agregado
  // o referenciava — premissa que a migration 0050 (`fin_remittance_payables`) revogou.
  const payables = buildOpenPayables({
    documentId: d.id,
    retentions,
    netValue: net.value,
    dueDate,
    paymentMethod: d.paymentMethod,
    paymentDetail,
    prior: input.payables,
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
    paymentDetail,
    status: 'Open',
  });

  return ok(
    immutable<AdjustDocumentOutput>({
      document,
      payables,
      events: documentSavedEvents(document, payables),
    }),
  );
};

export type EditMetadataInput = Readonly<{
  document: OpenDocument | ApprovedDocument;
  payables: Payables;
  dueDate?: Date;
  description?: string | null;
  paymentDetail?: string | null;
}>;

export type EditMetadataOutput = Readonly<{
  document: OpenDocument | ApprovedDocument;
  payables: Payables;
  events: readonly DocumentEvent[];
}>;

// Ajuste leve (#165): edita só dueDate/description, válido em Open E Approved. NÃO regenera os
// títulos-filho — preserva ids e status; apenas propaga o novo dueDate aos payables in-place
// (mesma semântica do adjust completo, que leva o dueDate aos filhos). O status é preservado.
export const editMetadata = (
  input: EditMetadataInput,
): Result<EditMetadataOutput, DocumentError> => {
  const d = input.document;
  const dueDate = input.dueDate ?? d.dueDate;
  const description = input.description !== undefined ? input.description : d.description;
  // null apaga (undefined preserva) — mesma semântica que description neste caminho.
  const paymentDetail = input.paymentDetail !== undefined ? input.paymentDetail : d.paymentDetail;

  const propagate = (p: Payable): Payable => immutable<Payable>({ ...p, dueDate });
  const payables = immutable<Payables>({
    parent: propagate(input.payables.parent),
    children: input.payables.children.map(propagate),
  });

  const document = immutable<OpenDocument | ApprovedDocument>({
    ...d,
    dueDate,
    description,
    paymentDetail,
  });
  const events = documentSavedEvents(document, payables);

  return ok(immutable<EditMetadataOutput>({ document, payables, events }));
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
    payeeKind: d.payeeKind,
    contractRef: d.contractRef,
    budgetPlanRef: d.budgetPlanRef,
    categoryRef: d.categoryRef,
    subcategoryRef: d.subcategoryRef,
    costCenterRef: d.costCenterRef,
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
    issueDate: d.issueDate,
    approverRef: d.approverRef,
    accessKey: d.accessKey,
    competencia: d.competencia,
    debitAccountRef: d.debitAccountRef,
    paymentDetail: d.paymentDetail,
    sourceFileRef: d.sourceFileRef,
    status: 'Open',
  });

  const events: readonly DocumentEvent[] = [
    {
      type: 'ApprovalUndone',
      documentId: d.id,
      payableIds: [payables.parent.id, ...payables.children.map((c) => c.id)],
    },
  ];

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

// Descarte de rascunho (#166): Draft não gera títulos-filho, então o cancelamento emite
// `DocumentCancelled` com `payableIds` vazio. Hard delete físico é do repositório.
export const cancelDraft = (draft: DraftDocument): Result<CancelDocumentOutput, DocumentError> => {
  const events: readonly DocumentEvent[] = [
    { type: 'DocumentCancelled', documentId: draft.id, payableIds: [] },
  ];
  return ok(immutable<CancelDocumentOutput>({ events }));
};

export type SaveDraftInput = Readonly<{
  id: DocumentId;
  documentNumber?: string | null;
  series?: string | null;
  type?: DocumentType | null;
  supplier?: SupplierRef | null;
  payeeKind?: PayeeKind | null;
  contractRef?: ContractRef | null;
  budgetPlanRef?: BudgetPlanRef | null;
  categoryRef?: CategoryRef | null;
  subcategoryRef?: SubcategoryRef | null; // #502: folha da árvore do plano (opcional no rascunho)
  costCenterRef?: CostCenterRef | null;
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
  issueDate?: Date | null; // #163
  approverRef?: UserRef | null; // #148
  accessKey?: string | null; // #115
  competencia?: Competencia | null; // #197
  debitAccountRef?: string | null; // #197
  paymentDetail?: string | null; // #273
  sourceFileRef?: SourceFileRef | null; // #62
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
    payeeKind: input.payeeKind ?? null,
    contractRef: input.contractRef ?? null,
    budgetPlanRef: input.budgetPlanRef ?? null,
    categoryRef: input.categoryRef ?? null,
    subcategoryRef: input.subcategoryRef ?? null,
    costCenterRef: input.costCenterRef ?? null,
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
    issueDate: input.issueDate ?? null,
    approverRef: input.approverRef ?? null,
    accessKey: input.accessKey ?? null,
    competencia: input.competencia ?? null,
    debitAccountRef: input.debitAccountRef ?? null,
    paymentDetail: input.paymentDetail ?? null,
    sourceFileRef: input.sourceFileRef ?? null,
  });
  const events: readonly DocumentEvent[] = [{ type: 'DocumentDraftSaved', documentId: input.id }];
  return ok(immutable<SaveDraftOutput>({ document, events }));
};

// Submissão (US7): Draft → Open. Exige os campos obrigatórios preenchidos; delega a geração de títulos a `create`.
// `approverRefOverride` (#297): quando presente, substitui o aprovador do rascunho — usado pela
// cascata de alçada no submit para reencaminhar ao próximo aprovador apto (paridade com o create).
export const submit = (
  draft: DraftDocument,
  approverRefOverride?: UserRef,
): Result<CreateDocumentOutput, DocumentError> => {
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
    payeeKind: draft.payeeKind ?? 'supplier',
    contractRef: draft.contractRef,
    budgetPlanRef: draft.budgetPlanRef,
    categoryRef: draft.categoryRef,
    subcategoryRef: draft.subcategoryRef,
    costCenterRef: draft.costCenterRef,
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
    approverRef: approverRefOverride ?? draft.approverRef,
    paymentDetail: draft.paymentDetail,
    sourceFileRef: draft.sourceFileRef, // #62: o documento submetido mantém o comprovante-fonte
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
