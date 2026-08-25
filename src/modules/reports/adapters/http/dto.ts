/** Mapeadores application -> DTO HTTP. */
import type { TeamMember } from '../../application/ports/team-report-read.ts';
import type { TeamDemographics } from '../../application/ports/team-demographics-read.ts';
import type { SupplierWithoutContract } from '../../application/ports/suppliers-without-contract-read.ts';
import type { PaymentPositionRow } from '../../application/ports/payment-position-read.ts';
import type { CashflowRow, CashflowChartRow } from '../../application/ports/cashflow-read.ts';
import type { AnalysisRow } from '../../application/ports/analysis-read.ts';
import type { RealizedReport } from '../../application/ports/realized-read.ts';
import type { DashboardRealizedChart } from '../../application/ports/dashboard-realized-read.ts';
import type { GeneralReportPage } from '../../application/ports/general-report-read.ts';
import type {
  TeamDemographicsResponseDto,
  TeamReportResponseDto,
  SuppliersWithoutContractResponseDto,
  PaymentPositionResponseDto,
  AnalysisReportResponseDto,
  AnalysisChartResponseDto,
  RealizedReportResponseDto,
  DashboardRealizedResponseDto,
  GeneralReportResponseDto,
  CashflowResponseDto,
  CashflowChartResponseDto,
} from './schemas.ts';

export const teamToDto = (members: readonly TeamMember[]): TeamReportResponseDto => ({
  team: members.map((m) => ({ ...m })),
});

// REP-1 demográficos: cópia rasa dos 3 vetores de contagem. Nenhum campo por pessoa entra aqui.
export const teamDemographicsToDto = (
  demographics: TeamDemographics,
): TeamDemographicsResponseDto => ({
  totalActive: demographics.totalActive,
  gender: demographics.gender.map((bucket) => ({ ...bucket })),
  ageRange: demographics.ageRange.map((bucket) => ({ ...bucket })),
  race: demographics.race.map((bucket) => ({ ...bucket })),
});

export const suppliersWithoutContractToDto = (
  rows: readonly SupplierWithoutContract[],
  labels: ReadonlyMap<string, string>,
): SuppliersWithoutContractResponseDto => ({
  // #694: costura o rótulo do plano (budget-plans/public-api). Sem plano/costura → null.
  suppliers: rows.map((s) => ({
    ...s,
    budgetPlanName: s.budgetPlanRef !== null ? (labels.get(s.budgetPlanRef) ?? null) : null,
  })),
});

export const paymentPositionToDto = (
  rows: readonly PaymentPositionRow[],
): PaymentPositionResponseDto => ({
  positions: rows.map((p) => ({ ...p })),
});

// REP (#590 · Slice A): traduz as linhas EN internas (`realizedCents`…) para o shape LEGADO
// (`REALIZED`/`Category_id`…) e monta o envelope `{ Receivables, Payables }`. `Receivables` é SEMPRE
// `[]` (financial é payables-centric — A-Receber não existe no modelo, #179). `Category_id`/
// `SubCategory_id` recebem os refs (UUID string do nosso domínio; no legado eram integer).
export const cashflowToDto = (rows: readonly CashflowRow[]): CashflowResponseDto => ({
  Receivables: [],
  Payables: rows.map((r) => ({
    Category_id: r.categoryRef,
    Category_name: r.categoryName,
    SubCategory_id: r.subcategoryRef,
    SubCategory_name: r.subcategoryName,
    REALIZED: r.realizedCents,
    EXPECTED: r.expectedCents,
  })),
});

// REP (#590 · Slice B): série temporal — traduz as linhas EN datadas para o shape LEGADO das 7
// chaves (as 6 do Slice A + `Installments_dueDate`). Sem envelope: ARRAY plano de linhas datadas
// (o front monta a linha do tempo). `Category_id`/`SubCategory_id` recebem os refs (UUID string).
export const cashflowChartToDto = (rows: readonly CashflowChartRow[]): CashflowChartResponseDto =>
  rows.map((r) => ({
    Category_id: r.categoryRef,
    Category_name: r.categoryName,
    SubCategory_id: r.subcategoryRef,
    SubCategory_name: r.subcategoryName,
    REALIZED: r.realizedCents,
    EXPECTED: r.expectedCents,
    Installments_dueDate: r.installmentsDueDate,
  }));

// REP-6 (#442 · Slice A/B/C): a página do port já tem exatamente o shape do DTO (string/number/null
// + os objetos `pixKey`/`bankAccount` do Slice C). Cópia estrutural rasa das linhas planas (o port é
// Readonly aninhado → arrays mutáveis no DTO; pix/banco copiados por referência, serializados iguais).
export const generalReportToDto = (page: GeneralReportPage): GeneralReportResponseDto => ({
  items: page.items.map((r) => ({ ...r })),
  page: page.page,
  pageSize: page.pageSize,
  total: page.total,
});

// REP-3 (#446 Slice C): aninha as rows planas (PLANO × cc × mês) em AnalysisReport
// (Plano Orçamentário → itens[] mensais + costCenters[] folha). Agrupamento estável (ordem de 1ª
// ocorrência). O `name` da raiz é o RÓTULO do plano, costurado a partir de `labels` (id → rótulo)
// resolvido no `budget-plans`; plano sem ref (budgetPlanRef null) ou id fora do map → `name: null`
// (gracioso, como o grupo sem-CC na folha).
export const analysisToReport = (
  rows: readonly AnalysisRow[],
  labels: ReadonlyMap<string, string>,
): AnalysisReportResponseDto => {
  const totalValueOfPeriod = rows.reduce((sum, r) => sum + r.totalCents, 0);

  const byPlan = new Map<string | null, AnalysisRow[]>();
  for (const r of rows) {
    const bucket = byPlan.get(r.budgetPlanRef);
    if (bucket === undefined) byPlan.set(r.budgetPlanRef, [r]);
    else bucket.push(r);
  }

  const data = [...byPlan.entries()].map(([budgetPlanRef, planRows]) => {
    const total = planRows.reduce((sum, r) => sum + r.totalCents, 0);
    const name = budgetPlanRef !== null ? (labels.get(budgetPlanRef) ?? null) : null;

    const monthTotals = new Map<string, number>();
    for (const r of planRows)
      monthTotals.set(r.monthYear, (monthTotals.get(r.monthYear) ?? 0) + r.totalCents);
    const itens = [...monthTotals.entries()].map(([monthYear, monthTotal]) => ({
      monthYear,
      total: monthTotal,
    }));

    // #446 Gap 3 (Slice A, preservado): acumula a série mensal PRÓPRIA de cada Centro de Custo (folha
    // da matriz), não só o total — a projeção já entrega o grão cc × mês; aqui ele não é achatado.
    const ccTotals = new Map<
      string | null,
      { name: string | null; total: number; months: Map<string, number> }
    >();
    for (const r of planRows) {
      let cur = ccTotals.get(r.costCenterRef);
      if (cur === undefined) {
        cur = { name: r.costCenterName, total: 0, months: new Map() };
        ccTotals.set(r.costCenterRef, cur);
      }
      cur.total += r.totalCents;
      cur.months.set(r.monthYear, (cur.months.get(r.monthYear) ?? 0) + r.totalCents);
    }
    const costCenters = [...ccTotals.entries()].map(([id, cc]) => ({
      id,
      name: cc.name,
      total: cc.total,
      itens: [...cc.months.entries()].map(([monthYear, ccMonthTotal]) => ({
        monthYear,
        total: ccMonthTotal,
      })),
    }));

    return { id: budgetPlanRef, name, total, itens, costCenters };
  });

  return { totalValueOfPeriod, data };
};

// REALIZED (S6 · #502): a árvore do port já tem exatamente o shape do DTO (só string/number). O
// mapper reconstrói arrays MUTÁVEIS (o port é Readonly aninhado) sem alterar valor — cópia estrutural.
export const realizedToDto = (report: RealizedReport): RealizedReportResponseDto => ({
  totalExpected: report.totalExpected,
  totalRealized: report.totalRealized,
  totalProvisioned: report.totalProvisioned,
  costCenters: report.costCenters.map((cc) => ({
    id: cc.id,
    name: cc.name,
    budgetPlanId: cc.budgetPlanId,
    totalExpected: cc.totalExpected,
    totalRealized: cc.totalRealized,
    totalProvisioned: cc.totalProvisioned,
    categories: cc.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      totalExpected: cat.totalExpected,
      totalRealized: cat.totalRealized,
      totalProvisioned: cat.totalProvisioned,
      months: cat.months.map((m) => ({ ...m })),
      subCategories: cat.subCategories.map((sub) => ({
        id: sub.id,
        name: sub.name,
        totalExpected: sub.totalExpected,
        totalRealized: sub.totalRealized,
        totalProvisioned: sub.totalProvisioned,
        months: sub.months.map((m) => ({ ...m })),
      })),
    })),
  })),
});

// DASH-F4 (#112): a série do port já tem exatamente o shape do DTO (só string/number). Cópia
// estrutural rasa dos 12 pontos (o port é Readonly aninhado → array mutável no DTO, sem alterar valor).
export const dashboardRealizedToDto = (
  chart: DashboardRealizedChart,
): DashboardRealizedResponseDto => ({
  budgetPlanId: chart.budgetPlanId,
  year: chart.year,
  chart: chart.chart.map((p) => ({ ...p })),
});

// REP-3 (#446 Slice C): resumo por PLANO Orçamentário (raiz). `name` = rótulo costurado de `labels`.
export const analysisToChart = (
  rows: readonly AnalysisRow[],
  labels: ReadonlyMap<string, string>,
): AnalysisChartResponseDto => {
  const byPlan = new Map<string | null, number>();
  for (const r of rows) {
    byPlan.set(r.budgetPlanRef, (byPlan.get(r.budgetPlanRef) ?? 0) + r.totalCents);
  }
  return [...byPlan.entries()].map(([id, total]) => ({
    id,
    name: id !== null ? (labels.get(id) ?? null) : null,
    total,
  }));
};
