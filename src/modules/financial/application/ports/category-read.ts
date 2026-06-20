import type { Result } from '../../../../shared/primitives/result.ts';
import type { Category } from '../../domain/category/category.ts';

// Port de LEITURA das categorias de referência (020 · US1). Read-only: lista para popular o
// select agrupado (#124/#5/#147). Implementações: in-memory (testes/seed) + drizzle (SELECT lean).

export type CategoryReadError = 'category-read-unavailable';

export type CategoryReadPort = Readonly<{
  // active=true, ordenado por (group, name). Lista vazia → ok([]). Falha de infra → err (sem vazar Error).
  list: () => Promise<Result<readonly Category[], CategoryReadError>>;
}>;
