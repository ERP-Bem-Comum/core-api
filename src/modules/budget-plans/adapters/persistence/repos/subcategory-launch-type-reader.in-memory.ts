import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { SubcategoryId } from '../../../domain/cost-structure/subcategory-id.ts';
import type { LaunchType } from '../../../domain/cost-structure/launch-type.ts';
import type { SubcategoryLaunchTypeReader } from '../../../application/ports/subcategory-launch-type-reader.ts';

// launchType de: (a) o seed OU (b) a árvore de custos do store (`fromTree`) — #458. O (b) mantém
// paridade com o drizzle (que lê bgp_subcategories): uma subcategoria criada via HTTP passa a ser
// lançável. O seed (a) segue valendo para testes que não montam árvore. Ausência -> not-found.
export const InMemorySubcategoryLaunchTypeReader = (
  seed: Readonly<Record<string, LaunchType>>,
  fromTree: (subcategoryId: string) => string | null = () => null,
): SubcategoryLaunchTypeReader => ({
  launchTypeOf: async (id: SubcategoryId) => {
    // `??`: seed primeiro; ausente cai na árvore (que devolve null quando não acha). Resultado é
    // `LaunchType | null` — o undefined do seed já foi resolvido pelo `??`.
    const launchType = seed[String(id)] ?? (fromTree(String(id)) as LaunchType | null);
    return launchType === null ? err('subcategory-not-found') : ok(launchType);
  },
});
