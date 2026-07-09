import type { Result } from '../../../../shared/primitives/result.ts';
import type { SubcategoryId } from '../../domain/cost-structure/subcategory-id.ts';
import type { LaunchType } from '../../domain/cost-structure/launch-type.ts';

// Leitura focada (ISP): o use case de lançamento só precisa do launchType da subcategoria alvo
// para guardar o modelo (CA2). Encapsula o SELECT em bgp_subcategories — não expõe a árvore.
export type SubcategoryLaunchTypeReadError =
  | 'subcategory-not-found'
  | 'subcategory-reader-unavailable';

export type SubcategoryLaunchTypeReader = Readonly<{
  launchTypeOf: (id: SubcategoryId) => Promise<Result<LaunchType, SubcategoryLaunchTypeReadError>>;
}>;
