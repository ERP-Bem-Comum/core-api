import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { TaxonomyPathReadPort } from '#src/modules/budget-plans/public-api/read.ts';
import type {
  TaxonomyPath,
  TaxonomyPathError,
  TaxonomyPathRead,
} from '../../../application/ports/taxonomy-path-read.ts';

// Adapta a public-api do `budget-plans` (ADR-0006) → `TaxonomyPathRead` do financeiro. Molde exato de
// `program-read.from-programs.ts`: o financeiro nunca toca `bgp_*`, e o dono da árvore responde por
// ela (ADR-0051).
//
// O erro do outro lado (`budget-plans-read-query-failed`) é TRADUZIDO, não repassado: aqui ele vira
// `taxonomy-path-read-unavailable`, o vocabulário do consumidor. É a diferença deste adapter para o
// de programas, onde os dois lados já usavam o mesmo slug — vazar o slug alheio faria a união de
// erros do use case crescer com nome de um módulo que ele não conhece.
export const createBudgetPlansTaxonomyPathRead = (
  taxonomyRead: TaxonomyPathReadPort,
): TaxonomyPathRead => ({
  findPathBySubcategory: async (
    subcategoryRef: string,
  ): Promise<Result<TaxonomyPath | null, TaxonomyPathError>> => {
    const r = await taxonomyRead.findPathBySubcategory(subcategoryRef);
    if (!r.ok) return err('taxonomy-path-read-unavailable');
    return ok(r.value);
  },
});
