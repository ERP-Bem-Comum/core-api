/**
 * ANALYSIS-READ — Port de LEITURA (read-only) da "Análise de Planejamento" (REP-3 · #114).
 *
 * Rows planas na grão Categoria × Centro de Custo × mês, lidas da agregação de `fin_payable_view`
 * do financial via ACL. A borda HTTP aninha em `AnalysisReport` (categoria → itens[] mensais +
 * costCenters[]) e deriva o chart. Filtro por período `[dueStart, dueEnd)` + status opcional.
 */
import type { Result } from '#src/shared/primitives/result.ts';

export type AnalysisFilter = Readonly<{
  dueStart: string; // 'YYYY-MM-DD' inclusivo
  dueEnd: string; // 'YYYY-MM-DD' exclusivo (half-open)
  status?: string;
}>;

export type AnalysisRow = Readonly<{
  categoryRef: string | null;
  categoryName: string | null;
  costCenterRef: string | null;
  costCenterName: string | null;
  monthYear: string; // 'YYYY-MM'
  totalCents: number;
}>;

export type AnalysisReadError = 'analysis-read-unavailable';

export type AnalysisReadPort = Readonly<{
  list: (filter: AnalysisFilter) => Promise<Result<readonly AnalysisRow[], AnalysisReadError>>;
}>;
