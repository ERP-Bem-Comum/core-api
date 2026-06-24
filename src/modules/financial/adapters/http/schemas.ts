/**
 * Schemas Zod da borda HTTP do módulo financial (ADR-0027 — Zod contract-first).
 *
 * Money trafega como string decimal de centavos (bigint não é JSON-safe). Input de
 * grossValueCents etc. é string que o use case converte via Money.fromCents(BigInt(...)).
 * `version` (optimistic lock) viaja como number inteiro.
 *
 * Rota /api/v2/financial/documents.
 */

import * as z from 'zod/v4';
import { TIMELINE_EVENT_TYPES } from '../../domain/document/events.ts';

// ─── Shared ──────────────────────────────────────────────────────────────────

/**
 * Centavos serializados como string decimal de inteiro não-negativo.
 *
 * Bounds de segurança (ADR-0027 — validação na borda): `.max(16)` barra string longa antes do `Number()`
 * (DoS/amplificação) e o `refine` garante inteiro seguro — `Number("9".repeat(30))` === 1e30 passaria pelo regex
 * mas não é safe integer. MAX_SAFE_INTEGER (9007199254740991) tem 16 dígitos → margem suficiente p/ valor real.
 */
const centsStringSchema = z
  .string()
  .regex(/^\d+$/, 'deve ser string de dígitos representando centavos')
  .max(16, 'valor de centavos excede o limite seguro (máx. 16 dígitos)')
  .refine((s) => Number.isSafeInteger(Number(s)), 'valor de centavos não é um inteiro seguro');

const retentionTypeSchema = z.enum(['ISS', 'IRRF', 'INSS', 'CSRF']);
const registeredTaxTypeSchema = z.enum([
  'ICMS',
  'IPI',
  'PIS',
  'COFINS',
  'CBS',
  'IBS_Municipal',
  'IBS_Estadual',
]);

const retentionItemSchema = z.object({
  type: retentionTypeSchema,
  baseCents: centsStringSchema,
  rateBps: z.number().int().min(0).max(10000),
  valueCents: centsStringSchema,
});

const registeredTaxItemSchema = z.object({
  type: registeredTaxTypeSchema,
  baseCents: centsStringSchema,
  rateBps: z.number().int().min(0).max(10000),
  valueCents: centsStringSchema,
});

const documentTypeSchema = z.enum([
  'NFS-e',
  'DANFE',
  'RPA',
  'Fatura',
  'Boleto',
  'Recibo',
  'Imposto',
]);

const paymentMethodSchema = z.enum([
  'TED',
  'TransferenciaBancaria',
  'PIX',
  'Boleto',
  'CartaoCorporativo',
  'Cambio',
  'GuiaRecolhimento',
  'Outro',
]);

// ─── POST /documents (saveDocument) ─────────────────────────────────────────

/**
 * Body de criação de documento fiscal. `asDraft: false` (default) → Open com títulos;
 * `asDraft: true` → Draft (campos opcionais, sem geração de títulos).
 */
export const createDocumentBodySchema = z.object({
  type: documentTypeSchema,
  documentNumber: z.string().min(1).max(60),
  series: z.string().max(20).optional(),
  supplierRef: z.uuid(),
  payeeKind: z.enum(['supplier', 'financier', 'act', 'collaborator']).optional(),
  approverRef: z.uuid().optional(),
  contractRef: z.uuid().optional(),
  budgetPlanRef: z.uuid().optional(),
  categoryRef: z.uuid().optional(),
  costCenterRef: z.uuid().optional(),
  programRef: z.uuid().optional(),
  paymentMethod: paymentMethodSchema,
  grossValueCents: centsStringSchema,
  sourceDiscountsCents: centsStringSchema.default('0'),
  discountsCents: centsStringSchema.default('0'),
  penaltyCents: centsStringSchema.default('0'),
  interestCents: centsStringSchema.default('0'),
  retentions: z.array(retentionItemSchema).default([]),
  registeredTaxes: z.array(registeredTaxItemSchema).default([]),
  dueDate: z.iso.date().optional(),
  issueDate: z.iso.date().optional(), // #163: data de emissão (opcional)
  description: z.string().max(500).optional(),
  asDraft: z.boolean().default(false),
});

export type CreateDocumentBody = z.infer<typeof createDocumentBodySchema>;

// ─── PATCH /documents/:id (adjustDocument) ──────────────────────────────────

/**
 * Body do ajuste de documento Open. `version` = optimistic lock. Campos são todos opcionais
 * (PATCH semântico), mas ao menos um deve ser informado além do `version`. O domínio recalcula
 * líquido e regenera filhos.
 */
export const adjustDocumentBodySchema = z
  .object({
    version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    grossValueCents: centsStringSchema.optional(),
    sourceDiscountsCents: centsStringSchema.optional(),
    discountsCents: centsStringSchema.optional(),
    penaltyCents: centsStringSchema.optional(),
    interestCents: centsStringSchema.optional(),
    retentions: z.array(retentionItemSchema).optional(),
    dueDate: z.iso.date().optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((b) => Object.keys(b).filter((k) => k !== 'version').length > 0, {
    message: 'pelo menos um campo além de version deve ser informado',
  });

export type AdjustDocumentBody = z.infer<typeof adjustDocumentBodySchema>;

// ─── POST /documents/:id/approve · /undo-approval ───────────────────────────

/** Body das ações approve / undo-approval — só o optimistic lock. */
export const approveBodySchema = z.object({
  version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

export type ApproveBody = z.infer<typeof approveBodySchema>;

// Optimistic lock no cancelamento (#55): o cliente envia a `version` que leu (FR-009).
export const cancelDocumentBodySchema = z.object({
  version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

export type CancelDocumentBody = z.infer<typeof cancelDocumentBodySchema>;

// ─── Params ──────────────────────────────────────────────────────────────────

export const documentIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do documento fiscal' }),
});

// ─── GET /documents (lista paginada) ─────────────────────────────────────────

export const listDocumentsQuerySchema = z.object({
  // #204: Paid/Reconciled habilitam a fila de conciliação no grid (Reconciled é derivado em leitura).
  status: z.enum(['Draft', 'Open', 'Approved', 'Paid', 'Reconciled']).optional(),
  supplierRef: z.uuid().optional(),
  type: documentTypeSchema.optional(),
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  issuedFrom: z.iso.date().optional(), // #163: filtro por emissão (janela inclusiva)
  issuedTo: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

// ─── Responses ───────────────────────────────────────────────────────────────

const payableResponseSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['Parent', 'Child']),
  retentionType: retentionTypeSchema.nullable(),
  valueCents: centsStringSchema,
  status: z.string(),
});

/** Resposta de criação/escrita (POST/PATCH/approve/undo-approval) — documento + títulos. */
export const documentResponseSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  documentNumber: z.string().nullable(),
  type: z.string().nullable(),
  supplierRef: z.string().nullable(),
  // Tipo do favorecido (#90) — round-trip p/ o front exibir o kind correto.
  payeeKind: z.string().nullable(),
  // Aprovador pretendido definido na inclusão (#148).
  approverRef: z.string().nullable(),
  // Refs de categorização editável (#147) — round-trip p/ o drawer refletir a categorização salva.
  contractRef: z.string().nullable(),
  budgetPlanRef: z.string().nullable(),
  categoryRef: z.string().nullable(),
  costCenterRef: z.string().nullable(),
  programRef: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  grossValueCents: centsStringSchema.nullable(),
  netValueCents: centsStringSchema.nullable(),
  dueDate: z.string().nullable(),
  issueDate: z.string().nullable(), // #163: data de emissão
  description: z.string().nullable(),
  payables: z.array(payableResponseSchema),
  version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).meta({
    description:
      'Versão atual do documento (optimistic lock) — reenvie no próximo PATCH/approve/undo-approval',
  }),
});

export type DocumentResponseDto = z.infer<typeof documentResponseSchema>;

/** Item resumido na listagem. */
export const documentSummarySchema = z.object({
  id: z.uuid(),
  status: z.string(),
  documentNumber: z.string().nullable(),
  type: z.string().nullable(),
  supplierRef: z.string().nullable(),
  // Campos locais do documento no grid de Contas a Pagar (#47/US1).
  series: z.string().max(20).nullable(),
  grossValueCents: centsStringSchema.nullable(),
  paymentMethod: paymentMethodSchema.nullable(),
  contractRef: z.string().max(36).nullable(),
  netValueCents: centsStringSchema.nullable(),
  dueDate: z.string().nullable(),
  issueDate: z.string().nullable(), // #163: data de emissão
  version: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .meta({ description: 'Versão atual (optimistic lock) para ações inline' }),
  // Fornecedor resolvido pelo read-model local `fin_supplier_view` (#47/US2).
  // null quando supplierRef é nulo ou ainda não processado (consistência eventual).
  supplierName: z.string().nullable(),
  supplierDocument: z.string().nullable(),
});

export type DocumentSummaryDto = z.infer<typeof documentSummarySchema>;

/** Response do GET /documents — lista paginada. */
export const documentListResponseSchema = z.object({
  items: z.array(documentSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type DocumentListResponseDto = z.infer<typeof documentListResponseSchema>;

// ─── GET /documents/:id/timeline ─────────────────────────────────────────────

// Valores válidos de `DocumentEvent['type']` — fonte única exaustiva importada do domínio
// (`domain/document/events.ts`). A garantia é "no extra AND no missing": adicionar um membro
// à union sem listá-lo lá QUEBRA `pnpm run typecheck` (não falha em runtime na validação do
// response de GET /timeline).

/** Uma entrada da trilha por-campo (Time Travel). */
export const timelineEntrySchema = z.object({
  eventType: z.enum(TIMELINE_EVENT_TYPES).meta({
    description: 'Tipo do evento de domínio que originou esta entrada na trilha',
  }),
  target: z.object({
    kind: z.enum(['Document', 'Payable']).meta({
      description: 'Entidade afetada pelo evento — documento principal ou título filho',
    }),
    id: z.uuid().meta({
      description: 'UUID da entidade afetada (Document.id ou Payable.id)',
    }),
  }),
  occurredAt: z.iso.datetime().meta({
    description: 'Instante UTC em que o evento ocorreu (ISO-8601 com offset)',
  }),
  actor: z.uuid().nullable().meta({
    description: 'UUID do usuário responsável pela ação; nulo em ações automáticas do sistema',
  }),
  changes: z
    .array(
      z.object({
        field: z.string().max(60).meta({
          description: 'Nome do campo de domínio alterado (espelha varchar(60) no storage)',
        }),
        before: z.string().max(65535).nullable().meta({
          description: 'Valor anterior serializado; null se o campo não existia (limite TEXT)',
        }),
        after: z.string().max(65535).nullable().meta({
          description: 'Valor novo serializado; null se o campo foi removido (limite TEXT)',
        }),
      }),
    )
    .meta({
      description:
        'Lista de campos alterados com o valor anterior e o novo valor serializados como string',
    }),
});

/** Response do GET /documents/:id/timeline. */
export const documentTimelineResponseSchema = z.object({
  entries: z.array(timelineEntrySchema),
});

export type DocumentTimelineResponseDto = z.infer<typeof documentTimelineResponseSchema>;

// ─── POST /bank-statements (importBankStatement, US1 conciliação) ────────────

/**
 * Body de importação de extrato. `content` é o arquivo bruto (OFX/CSV) como texto; o `.max` barra
 * payload gigante antes do parse (DoS). `fileName` é opcional (rótulo de origem).
 */
export const importBankStatementBodySchema = z.object({
  debitAccountRef: z.uuid(),
  format: z.enum(['OFX', 'CSV']),
  content: z.string().min(1).max(5_000_000),
  fileName: z.string().min(1).max(255).optional(),
});

export type ImportBankStatementBody = z.infer<typeof importBankStatementBodySchema>;

export const bankStatementIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do extrato bancário' }),
});

/** Response da importação (201). `duplicatesDiscarded` = transações já conhecidas (descarte silencioso). */
export const importBankStatementResponseSchema = z.object({
  statementId: z.uuid(),
  imported: z.number().int().min(0),
  duplicatesDiscarded: z.number().int().min(0),
  period: z.object({
    start: z.iso.datetime(),
    end: z.iso.datetime(),
  }),
});

export type ImportBankStatementResponseDto = z.infer<typeof importBankStatementResponseSchema>;

// ─── GET /bank-statements/:id/transactions ──────────────────────────────────

// valueCents/balanceAfterCents trafegam como string (cents). Não usam o regex não-negativo de
// `centsStringSchema`: saldo pode ser negativo (cheque especial); é serialização nossa (confiável).
const statementTransactionSchema = z.object({
  id: z.uuid(),
  fitid: z.string(),
  date: z.iso.datetime(),
  movement: z.enum(['Debit', 'Credit']),
  entryType: z.string(),
  payeeName: z.string(),
  memo: z.string(),
  valueCents: z.string(),
  balanceAfterCents: z.string(),
  reconciliationStatus: z.enum(['Pending', 'Reconciled', 'ManualEntry']),
});

export const statementTransactionsResponseSchema = z.object({
  items: z.array(statementTransactionSchema),
});

export type StatementTransactionsResponseDto = z.infer<typeof statementTransactionsResponseSchema>;

// ─── POST /reconciliations (confirmReconciliation, US2/US4) ──────────────────

// `reconciledBy` NÃO vem no body — é o usuário autenticado (req.userId). `difference.valueCents` pode
// ser negativo (Discount): número inteiro JSON (não a string não-negativa de centavos). A validação de
// consistência sinal×tratamento (ex.: Discount deve ser negativo) é da conciliação parcial avançada (#141);
// aqui o domínio só checa o fechamento 100% (R3).
export const confirmReconciliationBodySchema = z.object({
  transactionId: z.uuid(),
  payableIds: z.array(z.uuid()).min(1).max(100),
  difference: z
    .object({
      valueCents: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
      treatment: z.enum(['Interest', 'Penalty', 'Discount', 'Fee', 'Partial']),
    })
    .optional(),
});

export type ConfirmReconciliationBody = z.infer<typeof confirmReconciliationBodySchema>;

export const reconciliationIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID da conciliação' }),
});

export const undoReconciliationBodySchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

export type UndoReconciliationBody = z.infer<typeof undoReconciliationBodySchema>;

export const confirmReconciliationResponseSchema = z.object({
  reconciliationId: z.uuid(),
  type: z.enum(['Individual', 'Multiple', 'Partial']),
  itemCount: z.number().int().min(1),
});

export const undoReconciliationResponseSchema = z.object({
  reconciliationId: z.uuid(),
  status: z.literal('Undone'),
});

// ─── GET /payables?status=Paid (searchPaidPayables, US2) ─────────────────────

export const paidPayablesQuerySchema = z.object({
  status: z.literal('Paid'),
});

const paidPayableSchema = z.object({
  id: z.uuid(),
  documentId: z.uuid(),
  valueCents: z.string(),
  dueDate: z.string(),
  paymentMethod: z.string(),
});

export const paidPayablesResponseSchema = z.object({
  items: z.array(paidPayableSchema),
});

export type PaidPayablesResponseDto = z.infer<typeof paidPayablesResponseSchema>;

// ─── GET /statement-transactions/:id/suggestions (suggestMatches, US2) ───────

export const statementTransactionIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID da transação de extrato' }),
});

// band `baixa` (<50) não é retornada (R1/FR-011) → só alta|media na resposta.
const matchSuggestionSchema = z.object({
  payableId: z.uuid(),
  score: z.number().int().min(0).max(100),
  band: z.enum(['alta', 'media']),
  criteria: z.object({
    payeeMatch: z.boolean(),
    exactValue: z.boolean(),
    dateD0: z.boolean(),
    memoRef: z.boolean(),
    supplierOpenCount: z.number().int().min(0),
  }),
  // #140: breakdown por critério (peso + ok|parcial|falha) p/ a UI renderizar chips sem heurística.
  criteriaBreakdown: z.array(
    z.object({
      criterion: z.enum(['exactValue', 'payeeMatch', 'dateD0', 'memoRef', 'supplierOpen']),
      weight: z.number().int().min(0).max(100),
      result: z.enum(['ok', 'parcial', 'falha']),
      detail: z.string(),
    }),
  ),
});

export const suggestionsResponseSchema = z.object({
  suggestions: z.array(matchSuggestionSchema),
});

export type SuggestionsResponseDto = z.infer<typeof suggestionsResponseSchema>;

// ─── POST /statement-transactions/:id/reject-suggestion (rejectSuggestion, US2) ──

export const rejectSuggestionBodySchema = z.object({
  payableId: z.uuid(),
});

export type RejectSuggestionBody = z.infer<typeof rejectSuggestionBodySchema>;

export const rejectSuggestionResponseSchema = z.object({
  transactionId: z.uuid(),
  payableId: z.uuid(),
});

// ─── POST /statement-transactions/:id/manual-entry + /reconciliations/batch (US5) ──

const manualEntryTypeSchema = z.enum([
  'Payment',
  'Receipt',
  'Transfer',
  'FeePenaltyInterest',
  'Investment',
  'Redemption',
]);

// `value` NÃO vem no body — é o valor da transação (derivado no use-case).
export const manualEntryBodySchema = z.object({
  type: manualEntryTypeSchema,
  supplierRef: z.uuid().optional(),
  categoryRef: z.uuid().optional(),
  costCenterRef: z.uuid().optional(),
  programRef: z.uuid().optional(),
  description: z.string().min(1).max(500).optional(),
});

export type ManualEntryBody = z.infer<typeof manualEntryBodySchema>;

export const manualEntryResponseSchema = z.object({
  reconciliationId: z.uuid(),
  type: z.literal('ManualEntry'),
  manualEntryId: z.uuid(),
});

export const batchBodySchema = z.object({
  transactionIds: z.array(z.uuid()).min(1).max(500),
  template: manualEntryBodySchema,
});

export type BatchBody = z.infer<typeof batchBodySchema>;

export const batchResponseSchema = z.object({
  created: z.number().int().min(0),
  reconciliationIds: z.array(z.uuid()),
  // Best-effort: transações que falharam (estado/guard) com o code público — o lote não aborta por uma.
  failed: z.array(z.object({ transactionId: z.uuid(), error: z.string() })),
});

// ─── US6 — fechar período + exportar ─────────────────────────────────────────

export const closePeriodBodySchema = z.object({
  debitAccountRef: z.uuid(),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
});

export type ClosePeriodBody = z.infer<typeof closePeriodBodySchema>;

export const closePeriodResponseSchema = z.object({
  periodId: z.uuid(),
  status: z.literal('Closed'),
});

export const reconciliationPeriodIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do período de conciliação' }),
});

export const exportReconciliationQuerySchema = z.object({
  format: z.enum(['ofx', 'csv']),
});

// ─── Conta-cedente (019 — CRUD + encerrar) ─────────────────────────────────────

const accountTypeSchema = z.enum(['corrente', 'poupanca', 'investimento', 'cartao', 'outro']);

export const createCedenteAccountBodySchema = z.object({
  bankCode: z.string().min(1).max(10),
  bankName: z.string().min(1).max(120).optional(),
  type: accountTypeSchema,
  // #206: texto livre p/ identificar conta `outro`/`cartao` (opcional).
  typeLabel: z.string().min(1).max(120).optional(),
  agency: z.string().min(1).max(10),
  accountNumber: z.string().min(1).max(20),
  accountDigit: z.string().max(2),
  convenio: z.string().max(20).optional(),
  document: z.string().min(1).max(18),
  nickname: z.string().min(1).max(120).optional(),
  openingBalanceCents: centsStringSchema.optional(),
  openingBalanceDate: z.iso.date().optional(),
});

export type CreateCedenteAccountBody = z.infer<typeof createCedenteAccountBodySchema>;

export const editCedenteAccountBodySchema = z.object({
  bankCode: z.string().min(1).max(10).optional(),
  agency: z.string().min(1).max(10).optional(),
  accountNumber: z.string().min(1).max(20).optional(),
  accountDigit: z.string().max(2).optional(),
  type: accountTypeSchema.optional(),
  typeLabel: z.string().min(1).max(120).optional(),
  nickname: z.string().min(1).max(120).optional(),
  bankName: z.string().min(1).max(120).optional(),
});

export const cedenteAccountIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID da conta-cedente' }),
});

export const cedenteAccountResponseSchema = z.object({
  id: z.uuid(),
  bankCode: z.string(),
  bankName: z.string().nullable(),
  type: z.string().nullable(),
  typeLabel: z.string().nullable(),
  agency: z.string(),
  accountNumber: z.string(),
  accountDigit: z.string(),
  convenio: z.string(),
  document: z.string(),
  status: z.string(),
  nickname: z.string().nullable(),
  openingBalanceCents: z.string().nullable(),
  openingBalanceDate: z.string().nullable(),
});

// Item da listagem (#89c F1): inclui o saldo ATUAL (abertura + Σ extratos importados). Money em
// string de centavos (convenção). Distinto de openingBalanceCents (saldo de abertura).
export const cedenteAccountListItemSchema = cedenteAccountResponseSchema.extend({
  currentBalanceCents: z.string(),
});

export const cedenteAccountListResponseSchema = z.array(cedenteAccountListItemSchema);

export type CedenteAccountResponseDto = z.infer<typeof cedenteAccountResponseSchema>;
export type CedenteAccountListItemDto = z.infer<typeof cedenteAccountListItemSchema>;

// Dados de referência de categorização (020 · US1) — GET /financial/categories.
export const categoryResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  group: z.enum(['despesa', 'receita', 'ajuste']),
  // Hierarquia auto-referente (#147 F3): pai (subcategoria). null = top-level. UUID v4 (espelha id).
  parentId: z.uuid().nullable(),
});

export const categoryListResponseSchema = z.array(categoryResponseSchema);

export type CategoryResponseDto = z.infer<typeof categoryResponseSchema>;

// Centros de custo de referência (020 · US2) — GET /financial/cost-centers.
export const costCenterResponseSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
});

export const costCenterListResponseSchema = z.array(costCenterResponseSchema);

export type CostCenterResponseDto = z.infer<typeof costCenterResponseSchema>;

// Programas (020 · US3) — GET /financial/programs (passthrough da fonte canônica de `programs`).
export const programResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const programListResponseSchema = z.array(programResponseSchema);

export type ProgramResponseDto = z.infer<typeof programResponseSchema>;

// ─── Read-model do extrato por conta + período (#139) ──────────────────────────

export const accountStatementQuerySchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  filter: z.enum(['all', 'in', 'out', 'reconciled', 'pending']).optional(),
});

const statementViewLineSchema = z.object({
  id: z.string(),
  date: z.iso.datetime(),
  movement: z.enum(['Debit', 'Credit']),
  entryType: z.string(),
  payeeName: z.string(),
  memo: z.string(),
  valueCents: z.string(),
  runningBalanceCents: z.string(),
  reconciliationStatus: z.enum(['Pending', 'Reconciled', 'ManualEntry']),
});

const statementViewDaySchema = z.object({
  date: z.string(),
  lines: z.array(statementViewLineSchema),
  inCents: z.string(),
  outCents: z.string(),
  dayBalanceCents: z.string(),
});

export const accountStatementResponseSchema = z.object({
  openingBalanceCents: z.string(),
  closingBalanceCents: z.string(),
  counters: z.object({
    all: z.number().int().min(0),
    in: z.number().int().min(0),
    out: z.number().int().min(0),
    reconciled: z.number().int().min(0),
    pending: z.number().int().min(0),
  }),
  days: z.array(statementViewDaySchema),
});

export type AccountStatementResponseDto = z.infer<typeof accountStatementResponseSchema>;

// ─── Lookup da conciliação ativa por transação (#175) ──────────────────────────

export const transactionReconciliationResponseSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  type: z.enum(['Individual', 'Multiple', 'Partial', 'ManualEntry']),
  status: z.enum(['Active', 'Undone']),
  reconciledBy: z.string(),
  reconciledAt: z.iso.datetime(),
  differenceCents: z.string().nullable(),
  items: z.array(z.object({ payableId: z.uuid(), reconciledValueCents: z.string() })),
});

export type TransactionReconciliationResponseDto = z.infer<
  typeof transactionReconciliationResponseSchema
>;

// ─── Listar períodos de conciliação por conta (#173) ───────────────────────────

export const reconciliationPeriodsQuerySchema = z.object({
  debitAccountRef: z.uuid(),
});

const reconciliationPeriodItemSchema = z.object({
  id: z.uuid(),
  debitAccountRef: z.string(),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  status: z.enum(['Open', 'Closed']),
  closedAt: z.iso.datetime().nullable(),
  closedBy: z.string().nullable(),
});

export const reconciliationPeriodsResponseSchema = z.array(reconciliationPeriodItemSchema);

export type ReconciliationPeriodsResponseDto = z.infer<typeof reconciliationPeriodsResponseSchema>;

// ─── Sugestões de match em lote por extrato (#174) ─────────────────────────────

export const statementSuggestionsResponseSchema = z.object({
  items: z.array(
    z.object({
      transactionId: z.uuid(),
      topBand: z.enum(['alta', 'media']).nullable(),
      topScore: z.number().int().min(0).max(100).nullable(),
    }),
  ),
});

export type StatementSuggestionsResponseDto = z.infer<typeof statementSuggestionsResponseSchema>;

// ─── Listagem payable-centric (#201/#222) — GET /financial/payable-titles ──────
// Grid de Contas a Pagar orientado a TÍTULO (pai + filhos como linhas). Distinto da busca de
// conciliação GET /financial/payables?status=Paid (US2, outro concern/RBAC).
export const listPayablesQuerySchema = z.object({
  status: z
    .enum(['Draft', 'Open', 'Approved', 'Transmitted', 'Refused', 'Paid', 'Reconciled'])
    .optional(),
  documentType: documentTypeSchema.optional(),
  supplierRef: z.uuid().optional(),
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPayablesQuery = z.infer<typeof listPayablesQuerySchema>;

export const payableSummarySchema = z.object({
  payableId: z.uuid(),
  documentId: z.uuid(),
  documentNumber: z.string().nullable(),
  series: z.string().nullable(),
  documentType: z.string().nullable(),
  kind: z.string(), // Parent (líquido) | Child (retenção)
  retentionType: z.string().nullable(),
  valueCents: centsStringSchema,
  dueDate: z.string(),
  status: z.string(),
  supplierRef: z.string().nullable(),
  contractRef: z.string().nullable(),
});

export type PayableSummaryDto = z.infer<typeof payableSummarySchema>;

export const payableListResponseSchema = z.object({
  items: z.array(payableSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

// ─── Baixa manual de título (#219/#224) — POST /documents/:id/payables/:payableId/manual-payment ──
export const documentPayableParamsSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do documento' }),
  payableId: z.uuid().meta({ description: 'UUID do título (payable)' }),
});

export const manualPaymentBodySchema = z.object({
  version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  // #232: data de pagamento (saída bancária, retroativa). Ausente → backend usa `clock.now()`.
  paidAt: z.iso.date().optional(),
  // #223: motivo opcional (a trilha já captura quem+quando).
  reason: z.string().min(1).max(500).optional(),
});
