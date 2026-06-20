import type { Result } from '../../../../shared/primitives/result.ts';
import type { CostCenter } from '../../domain/cost-center/cost-center.ts';

// Port de LEITURA dos centros de custo de referência (020 · US2). Read-only: lista para popular o
// select de rateio (#124/#5/#147). Implementações: in-memory (testes/seed) + drizzle (SELECT lean).

export type CostCenterReadError = 'cost-center-read-unavailable';

export type CostCenterReadPort = Readonly<{
  // active=true, ordenado por code. Lista vazia → ok([]). Falha de infra → err (sem vazar Error).
  list: () => Promise<Result<readonly CostCenter[], CostCenterReadError>>;
}>;
