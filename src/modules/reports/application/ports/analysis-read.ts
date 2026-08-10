/**
 * ANALYSIS-READ — Port de LEITURA (read-only) da "Análise de Pagamentos" (REP-3 · #114/#446).
 *
 * Rows planas na grão **Plano Orçamentário × Centro de Custo × mês**, lidas da agregação de
 * `fin_payable_view` do financial via ACL. #446 Slice C: a raiz da árvore é o Plano Orçamentário
 * (`budgetPlanRef`) — a categoria saiu do grão. A borda HTTP aninha em `AnalysisReport`
 * (plano → itens[] mensais + costCenters[] folha) e deriva o chart; o RÓTULO do plano é costurado
 * na borda via `budget-plans/public-api`. Filtro por período `[dueStart, dueEnd)` + status opcional.
 */
import type { Result } from '#src/shared/primitives/result.ts';

export type AnalysisFilter = Readonly<{
  dueStart: string; // 'YYYY-MM-DD' inclusivo
  dueEnd: string; // 'YYYY-MM-DD' exclusivo (half-open)
  status?: string;
  // #682: filtros de servidor (paridade #588). Grão inalterado (Plano × CC × mês); só recortam.
  programRef?: string;
  debitAccountRef?: string;
  categoryRef?: string;
  subcategoryRef?: string;
}>;

export type AnalysisRow = Readonly<{
  budgetPlanRef: string | null;
  costCenterRef: string | null;
  costCenterName: string | null;
  monthYear: string; // 'YYYY-MM'
  totalCents: number;
}>;

export type AnalysisReadError = 'analysis-read-unavailable';

export type AnalysisReadPort = Readonly<{
  list: (filter: AnalysisFilter) => Promise<Result<readonly AnalysisRow[], AnalysisReadError>>;
}>;
