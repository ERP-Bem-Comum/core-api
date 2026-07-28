/**
 * Schemas Zod da rota de relatórios (ADR-0027). Zod só na borda.
 *
 * `teamMemberSchema` espelha `TeamMember` (13 colunas — 10 do #238 + as 3 demográficas).
 */
import * as z from 'zod/v4';

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  program: z.string().nullable(),
  role: z.string(),
  employmentRelationship: z.string(),
  startOfContract: z.string(),
  registrationStatus: z.string(),
  active: z.boolean(),
  education: z.string().nullable(),
  experienceInPublicSector: z.boolean().nullable(),
  // REPORTS-TEAM-DEMOGRAPHIC-COLUMNS: sem declarar aqui, o serializer descarta os campos e o
  // payload sai errado mesmo com o mapper certo.
  genderIdentity: z.string().nullable(),
  race: z.string().nullable(),
  age: z.number().nullable(),
});

export type TeamMemberDto = z.infer<typeof teamMemberSchema>;

export const teamReportResponseSchema = z.object({
  team: z.array(teamMemberSchema),
});

export type TeamReportResponseDto = z.infer<typeof teamReportResponseSchema>;

// REP-1 (REPORTS-TEAM-DEMOGRAPHICS) — 3 distribuições demográficas como CONTAGEM agregada.
// `.strict()`: fail-loud se o mapper vazar campo por pessoa (CA2 — nada de race/dateOfBirth).
export const categoryCountSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    count: z.number(),
  })
  .strict();

export type CategoryCountDto = z.infer<typeof categoryCountSchema>;

export const teamDemographicsResponseSchema = z
  .object({
    totalActive: z.number(),
    gender: z.array(categoryCountSchema),
    ageRange: z.array(categoryCountSchema),
    race: z.array(categoryCountSchema),
  })
  .strict();

export type TeamDemographicsResponseDto = z.infer<typeof teamDemographicsResponseSchema>;

// REP-2 (#240) — "Fornecedores sem Contrato": agregação por fornecedor.
// `.strict()` — fail-loud se o mapper de DTO vazar campo extra (alinha ao padrão do `financial`).
export const supplierWithoutContractSchema = z
  .object({
    supplierRef: z.string(),
    name: z.string().nullable(),
    totalCents: z.number(),
    payableCount: z.number(),
  })
  .strict();

export type SupplierWithoutContractDto = z.infer<typeof supplierWithoutContractSchema>;

export const suppliersWithoutContractResponseSchema = z
  .object({
    suppliers: z.array(supplierWithoutContractSchema),
  })
  .strict();

export type SuppliersWithoutContractResponseDto = z.infer<
  typeof suppliersWithoutContractResponseSchema
>;

// REP-4 (#243) — "Posição de Pagamentos": linha por Fornecedor×CentroCusto×Categoria com 3 baldes.
export const paymentPositionRowSchema = z
  .object({
    supplierRef: z.string().nullable(),
    supplierName: z.string().nullable(),
    costCenterRef: z.string().nullable(),
    costCenterName: z.string().nullable(),
    categoryRef: z.string().nullable(),
    categoryName: z.string().nullable(),
    pendingCents: z.number(),
    paidCents: z.number(),
    overdueCents: z.number(),
  })
  .strict();

export type PaymentPositionRowDto = z.infer<typeof paymentPositionRowSchema>;

export const paymentPositionResponseSchema = z
  .object({
    positions: z.array(paymentPositionRowSchema),
  })
  .strict();

export type PaymentPositionResponseDto = z.infer<typeof paymentPositionResponseSchema>;

// REP-4 (#588) — filtros da "Posição de Pagamentos": todos OPCIONAIS, ausente = sem restrição,
// combinação = AND. Refs aplicam direto em `fin_payable_view`; `status` (6 valores granulares)
// filtra o status VIVO em `fin_documents` via LEFT JOIN — o status do payable-view é reduzido a
// 4 (Open/Approved/Paid/Cancelled) e não distingue Transmitted/PartiallyReconciled/Reconciled.
// Os 6 valores = `DocumentStatus` do domínio MENOS Draft e Refused (decisão da P.O.).
export const paymentPositionStatusValues = [
  'Open',
  'Approved',
  'Transmitted',
  'Paid',
  'PartiallyReconciled',
  'Reconciled',
] as const;

// Objeto simples (sem `.strict()`, como `listDocumentsQuerySchema` do financial): parâmetro
// desconhecido é ignorado, não vira 400. `dueFrom`/`dueTo` = janela half-open [dueFrom, dueTo).
export const paymentPositionQuerySchema = z.object({
  budgetPlanRef: z.uuid().optional(),
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  cedenteAccountRef: z.uuid().optional(), // → fin_payable_view.debit_account_ref
  status: z.enum(paymentPositionStatusValues).optional(), // via LEFT JOIN fin_documents.status
  costCenterRef: z.uuid().optional(),
  categoryRef: z.uuid().optional(),
  subcategoryRef: z.uuid().optional(),
  supplierRef: z.uuid().optional(),
});

export type PaymentPositionQueryDto = z.infer<typeof paymentPositionQuerySchema>;

// REP-6 (#442 · Slice A) — "Relatório Geral": linhas PLANAS PAGINADAS de títulos a-pagar.
// Os 6 valores de status = `DocumentStatus` do domínio MENOS Draft e Refused (mesmo conjunto do
// #588/REP-4); filtram o status VIVO em `fin_documents` via LEFT JOIN.
export const generalReportStatusValues = [
  'Open',
  'Approved',
  'Transmitted',
  'Paid',
  'PartiallyReconciled',
  'Reconciled',
] as const;

// Ordenação servível no Slice A (só por vencimento). Default (aplicado na borda) = 'dueDate:desc'.
export const generalReportOrderValues = ['dueDate:asc', 'dueDate:desc'] as const;

// Catálogo de colunas do REP-6 (contrato de seleção `columns`, CSV). As 9 primeiras são servíveis
// no Slice A; as 5 últimas são cross-módulo (Slices B/C/D) — ACEITAS na validação (não viram 400),
// mas NÃO servidas ainda. No Slice A a seleção não altera o shape da linha (todas as colunas locais
// sempre presentes); o parâmetro existe para o contrato forward-compat da grade.
export const generalReportColumnValues = [
  'code',
  'tipo',
  'dueDate',
  'supplier',
  'costCenter',
  'category',
  'subcategory',
  'value',
  'contract',
  // Slices B/C/D (aceitos, ainda não servidos):
  'financier',
  'collaborator',
  'pix',
  'bankInfo',
  'contractNumber',
] as const;

const isKnownColumn = (token: string): boolean =>
  (generalReportColumnValues as readonly string[]).includes(token.trim());

// Objeto simples (sem `.strict()`, como o REP-4): parâmetro desconhecido é ignorado, não vira 400.
// 9 filtros opcionais + search/order/page/limit + columns. `dueFrom`/`dueTo` = janela half-open.
export const generalReportQuerySchema = z.object({
  programId: z.uuid().optional(), // → program_ref
  budgetPlanId: z.uuid().optional(), // → budget_plan_ref
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  accountId: z.uuid().optional(), // → debit_account_ref
  costCenterId: z.uuid().optional(), // → cost_center_ref
  categoryId: z.uuid().optional(), // → category_ref
  subCategoryId: z.uuid().optional(), // → subcategory_ref
  entityId: z.uuid().optional(), // → supplier_ref
  status: z.enum(generalReportStatusValues).optional(), // via LEFT JOIN fin_documents.status
  search: z.string().min(1).optional(), // LIKE contains em document_number + fornecedor
  order: z.enum(generalReportOrderValues).optional(), // default dueDate:desc
  page: z.coerce.number().int().min(1).optional(), // default 1
  limit: z.coerce.number().int().min(1).max(200).optional(), // default 50, teto 200
  // CSV do catálogo de colunas — cada token deve ∈ generalReportColumnValues (senão 400).
  columns: z
    .string()
    .refine((s) => s.split(',').every((token) => isKnownColumn(token)), {
      message: 'coluna desconhecida em `columns`',
    })
    .optional(),
});

export type GeneralReportQueryDto = z.infer<typeof generalReportQuerySchema>;

// Slice C (#442): PIX + Dados Bancários (espelham `PixKey`/`BankAccount` do partners public-api).
// Os 5 tipos de chave PIX = `PixKeyType`; os 4 campos bancários são strings opacas.
export const pixKeyDtoSchema = z.object({
  keyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random-key']),
  key: z.string(),
});

export const bankAccountDtoSchema = z.object({
  bank: z.string(),
  agency: z.string(),
  accountNumber: z.string(),
  checkDigit: z.string(),
});

// Linha PLANA completa (Slice A + B + C + D). `.strict()` fail-loud se o mapper vazar campo extra.
export const generalReportRowSchema = z
  .object({
    payableId: z.string(),
    documentId: z.string(),
    code: z.string().nullable(),
    tipo: z.literal('a-pagar'),
    dueDate: z.string(),
    // Slice B (#442): tipo do favorecido + nomes cross-módulo (Financiador/Colaborador).
    payeeKind: z.enum(['supplier', 'financier', 'act', 'collaborator']),
    supplierRef: z.string().nullable(),
    supplierName: z.string().nullable(),
    financierName: z.string().nullable(),
    collaboratorName: z.string().nullable(),
    costCenterRef: z.string().nullable(),
    costCenterName: z.string().nullable(),
    categoryRef: z.string().nullable(),
    categoryName: z.string().nullable(),
    subcategoryRef: z.string().nullable(),
    subcategoryName: z.string().nullable(),
    valueCents: z.number(),
    contractRef: z.string().nullable(),
    // Slice C (#442): PIX + Dados Bancários (só supplier com `bank-account:read`; senão null).
    pixKey: pixKeyDtoSchema.nullable(),
    bankAccount: bankAccountDtoSchema.nullable(),
    // Slice D (#442): NÚMERO do contrato (`sequential_number`), costurado do `contractRef`; null se
    // sem contrato ou ref não resolvível.
    contractNumber: z.string().nullable(),
  })
  .strict();

export type GeneralReportRowDto = z.infer<typeof generalReportRowSchema>;

// Resposta paginada `Page<T>` (molde financial/domain/document/query.ts).
export const generalReportResponseSchema = z
  .object({
    items: z.array(generalReportRowSchema),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  })
  .strict();

export type GeneralReportResponseDto = z.infer<typeof generalReportResponseSchema>;

// REP (#590 · Slice A) — "Fluxo de Caixa": Saídas (Payables) agregadas por Categoria × Subcategoria
// em 2 baldes (REALIZED/EXPECTED). Os 6 valores de status = `DocumentStatus` MENOS Draft e Refused
// (mesmo conjunto do #588/#442); filtram o status VIVO em `fin_documents` via LEFT JOIN.
export const cashflowStatusValues = [
  'Open',
  'Approved',
  'Transmitted',
  'Paid',
  'PartiallyReconciled',
  'Reconciled',
] as const;

// Objeto simples (sem `.strict()`, como o REP-4/#588): parâmetro desconhecido é ignorado, não vira
// 400. 10 filtros opcionais (AND). Nomes id-suffixed (padrão #442). `dueFrom`/`dueTo` = janela
// half-open [dueFrom, dueTo). SEM paginação (é agregação — retorna todos os grupos).
export const cashflowQuerySchema = z.object({
  programId: z.uuid().optional(), // → program_ref
  budgetPlanId: z.uuid().optional(), // → budget_plan_ref
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  accountId: z.uuid().optional(), // → debit_account_ref
  costCenterId: z.uuid().optional(), // → cost_center_ref (restringe a população; NÃO é eixo)
  categoryId: z.uuid().optional(), // → category_ref
  subCategoryId: z.uuid().optional(), // → subcategory_ref
  entityId: z.uuid().optional(), // → supplier_ref
  status: z.enum(cashflowStatusValues).optional(), // via LEFT JOIN fin_documents.status
});

export type CashflowQueryDto = z.infer<typeof cashflowQuerySchema>;

// Linha no shape LEGADO (openapi.yaml `CashflowRow`, ~linha 3010). `Category_id`/`SubCategory_id`
// recebem os refs do nosso modelo (UUID string — no legado eram integer). `REALIZED`/`EXPECTED` em
// centavos inteiros. `.strict()` fail-loud se o mapper vazar campo extra.
export const cashflowRowSchema = z
  .object({
    Category_id: z.string().nullable(),
    Category_name: z.string().nullable(),
    SubCategory_id: z.string().nullable(),
    SubCategory_name: z.string().nullable(),
    REALIZED: z.number(),
    EXPECTED: z.number(),
  })
  .strict();

export type CashflowRowDto = z.infer<typeof cashflowRowSchema>;

// Envelope legado `{ Receivables, Payables }`. `Receivables` é SEMPRE `[]` no Slice A (financial é
// payables-centric — A-Receber não existe no modelo, #179). `.strict()`.
export const cashflowResponseSchema = z
  .object({
    Receivables: z.array(cashflowRowSchema),
    Payables: z.array(cashflowRowSchema),
  })
  .strict();

export type CashflowResponseDto = z.infer<typeof cashflowResponseSchema>;

// REP (#590 · Slice B) — "Fluxo de Caixa /chart": as mesmas linhas do Slice A com uma DIMENSÃO DE MÊS
// (`Installments_dueDate`, o primeiro dia do mês 'YYYY-MM-01' como date legado). A resposta é um
// ARRAY plano de linhas datadas (sem envelope Receivables/Payables — o front monta a série temporal).
// `.strict()` fail-loud se o mapper vazar campo extra (7 chaves = as 6 do Slice A + o mês).
export const cashflowChartRowSchema = cashflowRowSchema
  .extend({ Installments_dueDate: z.iso.date() })
  .strict();

export type CashflowChartRowDto = z.infer<typeof cashflowChartRowSchema>;

export const cashflowChartResponseSchema = z.array(cashflowChartRowSchema);

export type CashflowChartResponseDto = z.infer<typeof cashflowChartResponseSchema>;

// REP-3 (#114) — "Análise de Planejamento". Query de filtro (período half-open + status opcional).
export const analysisQuerySchema = z
  .object({
    dueStart: z.iso.date(), // 'YYYY-MM-DD' inclusivo
    dueEnd: z.iso.date(), // 'YYYY-MM-DD' exclusivo
    status: z.string().min(1).optional(),
  })
  .strict();

export type AnalysisQueryDto = z.infer<typeof analysisQuerySchema>;

const analysisMonthItemSchema = z.object({ monthYear: z.string(), total: z.number() }).strict();
const analysisCostCenterItemSchema = z
  .object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    total: z.number(),
    // #446 Gap 3: série mensal PRÓPRIA da folha (Centro de Custo) — sem isto a matriz folha × mês
    // fica com meses zerados (a projeção já tem o grão cc × mês; o DTO parava de propagá-lo).
    itens: z.array(analysisMonthItemSchema),
  })
  .strict();

const analysisGroupSchema = z
  .object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    total: z.number(),
    itens: z.array(analysisMonthItemSchema),
    costCenters: z.array(analysisCostCenterItemSchema),
  })
  .strict();

export const analysisReportResponseSchema = z
  .object({
    totalValueOfPeriod: z.number(),
    data: z.array(analysisGroupSchema),
  })
  .strict();

export type AnalysisReportResponseDto = z.infer<typeof analysisReportResponseSchema>;

// analysis/chart — array de resumo por categoria.
export const analysisChartItemSchema = z
  .object({ id: z.string().nullable(), name: z.string().nullable(), total: z.number() })
  .strict();

export const analysisChartResponseSchema = z.array(analysisChartItemSchema);

export type AnalysisChartResponseDto = z.infer<typeof analysisChartResponseSchema>;

// REALIZED (S6 · #502) — "Realizado × Planejado". Query: `year` OBRIGATÓRIO (coerce de string→number),
// refs opcionais. `.strict()` → parâmetro desconhecido vira 400 (CA8).
export const realizedQuerySchema = z
  .object({
    year: z.coerce.number().int(),
    programId: z.string().min(1).optional(),
    budgetPlanId: z.string().min(1).optional(),
    partnerStateId: z.string().min(1).optional(),
    partnerMunicipalityId: z.string().min(1).optional(),
  })
  .strict();

export type RealizedQueryDto = z.infer<typeof realizedQuerySchema>;

// Árvore de resposta (centro → categoria → subcategoria). `months[12]` só em categoria e
// subcategoria; 3 medidas por nó. `.strict()` fail-loud se o mapper vazar campo extra.
const realizedMonthSchema = z
  .object({
    month: z.number(),
    expected: z.number(),
    realized: z.number(),
    provisioned: z.number(),
  })
  .strict();

const realizedSubCategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    totalExpected: z.number(),
    totalRealized: z.number(),
    totalProvisioned: z.number(),
    months: z.array(realizedMonthSchema),
  })
  .strict();

const realizedCategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    totalExpected: z.number(),
    totalRealized: z.number(),
    totalProvisioned: z.number(),
    months: z.array(realizedMonthSchema),
    subCategories: z.array(realizedSubCategorySchema),
  })
  .strict();

const realizedCostCenterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    budgetPlanId: z.string(),
    totalExpected: z.number(),
    totalRealized: z.number(),
    totalProvisioned: z.number(),
    categories: z.array(realizedCategorySchema),
  })
  .strict();

export const realizedReportResponseSchema = z
  .object({
    totalExpected: z.number(),
    totalRealized: z.number(),
    totalProvisioned: z.number(),
    costCenters: z.array(realizedCostCenterSchema),
  })
  .strict();

export type RealizedReportResponseDto = z.infer<typeof realizedReportResponseSchema>;
