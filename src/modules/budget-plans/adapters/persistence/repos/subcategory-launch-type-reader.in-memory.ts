import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { SubcategoryId } from '../../../domain/cost-structure/subcategory-id.ts';
import type { LaunchType } from '../../../domain/cost-structure/launch-type.ts';
import type { SubcategoryLaunchTypeReader } from '../../../application/ports/subcategory-launch-type-reader.ts';

// Seed chaveado pelo subcategoryId (string). Ausência -> subcategory-not-found (paridade com o
// SELECT real que não acha a linha).
export const InMemorySubcategoryLaunchTypeReader = (
  seed: Readonly<Record<string, LaunchType>>,
): SubcategoryLaunchTypeReader => ({
  launchTypeOf: async (id: SubcategoryId) => {
    const launchType = seed[String(id)];
    return launchType === undefined ? err('subcategory-not-found') : ok(launchType);
  },
});
