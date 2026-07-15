/**
 * Schemas Zod da rota de relatórios (ADR-0027). Zod só na borda.
 *
 * `teamMemberSchema` espelha o subconjunto LGPD-safe de `TeamMember` (9 colunas).
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
});

export type TeamMemberDto = z.infer<typeof teamMemberSchema>;

export const teamReportResponseSchema = z.object({
  team: z.array(teamMemberSchema),
});

export type TeamReportResponseDto = z.infer<typeof teamReportResponseSchema>;

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
  .object({ id: z.string().nullable(), name: z.string().nullable(), total: z.number() })
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
