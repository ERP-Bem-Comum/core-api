/** Mapeadores application -> DTO HTTP. */
import type { TeamMember } from '../../application/ports/team-report-read.ts';
import type { SupplierWithoutContract } from '../../application/ports/suppliers-without-contract-read.ts';
import type { PaymentPositionRow } from '../../application/ports/payment-position-read.ts';
import type { AnalysisRow } from '../../application/ports/analysis-read.ts';
import type {
  TeamReportResponseDto,
  SuppliersWithoutContractResponseDto,
  PaymentPositionResponseDto,
  AnalysisReportResponseDto,
  AnalysisChartResponseDto,
} from './schemas.ts';

export const teamToDto = (members: readonly TeamMember[]): TeamReportResponseDto => ({
  team: members.map((m) => ({ ...m })),
});

export const suppliersWithoutContractToDto = (
  rows: readonly SupplierWithoutContract[],
): SuppliersWithoutContractResponseDto => ({
  suppliers: rows.map((s) => ({ ...s })),
});

export const paymentPositionToDto = (
  rows: readonly PaymentPositionRow[],
): PaymentPositionResponseDto => ({
  positions: rows.map((p) => ({ ...p })),
});

// REP-3: aninha as rows planas (categoria × cc × mês) em AnalysisReport
// (categoria → itens[] mensais + costCenters[]). Agrupamento estável (ordem de 1ª ocorrência).
export const analysisToReport = (rows: readonly AnalysisRow[]): AnalysisReportResponseDto => {
  const totalValueOfPeriod = rows.reduce((sum, r) => sum + r.totalCents, 0);

  const byCategory = new Map<string | null, AnalysisRow[]>();
  for (const r of rows) {
    const bucket = byCategory.get(r.categoryRef);
    if (bucket === undefined) byCategory.set(r.categoryRef, [r]);
    else bucket.push(r);
  }

  const data = [...byCategory.entries()].map(([categoryRef, catRows]) => {
    const total = catRows.reduce((sum, r) => sum + r.totalCents, 0);
    const name = catRows[0]?.categoryName ?? null;

    const monthTotals = new Map<string, number>();
    for (const r of catRows)
      monthTotals.set(r.monthYear, (monthTotals.get(r.monthYear) ?? 0) + r.totalCents);
    const itens = [...monthTotals.entries()].map(([monthYear, monthTotal]) => ({
      monthYear,
      total: monthTotal,
    }));

    const ccTotals = new Map<string | null, { name: string | null; total: number }>();
    for (const r of catRows) {
      const cur = ccTotals.get(r.costCenterRef);
      if (cur === undefined)
        ccTotals.set(r.costCenterRef, { name: r.costCenterName, total: r.totalCents });
      else cur.total += r.totalCents;
    }
    const costCenters = [...ccTotals.entries()].map(([id, cc]) => ({
      id,
      name: cc.name,
      total: cc.total,
    }));

    return { id: categoryRef, name, total, itens, costCenters };
  });

  return { totalValueOfPeriod, data };
};

export const analysisToChart = (rows: readonly AnalysisRow[]): AnalysisChartResponseDto => {
  const byCategory = new Map<string | null, { name: string | null; total: number }>();
  for (const r of rows) {
    const cur = byCategory.get(r.categoryRef);
    if (cur === undefined)
      byCategory.set(r.categoryRef, { name: r.categoryName, total: r.totalCents });
    else cur.total += r.totalCents;
  }
  return [...byCategory.entries()].map(([id, cat]) => ({ id, name: cat.name, total: cat.total }));
};
