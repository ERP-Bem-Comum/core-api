import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

// VO do grupo (natureza) da categoria de classificação. Conjunto FECHADO = agrupamento do
// protótipo §9.4.5 (research.md D3 / data-model.md:9). Padrão module-as-namespace:
// `import * as CategoryGroup from './category-group.ts'`.
// Persistido como varchar(12) + CHECK (ADR-0020 — sem ENUM nativo); cast row→union seguro pós-CHECK.

export type CategoryGroup = 'despesa' | 'receita' | 'ajuste';

export type CategoryGroupError = 'category-group-invalid';

export const VALUES: readonly CategoryGroup[] = ['despesa', 'receita', 'ajuste'];

const VALUE_SET: ReadonlySet<string> = new Set<string>(VALUES);

// Rejeita valor fora do union vindo do banco/seed (domínio rejeita estado inválido — adapters.md).
export const rehydrate = (raw: string): Result<CategoryGroup, CategoryGroupError> =>
  VALUE_SET.has(raw) ? ok(raw as CategoryGroup) : err('category-group-invalid');
