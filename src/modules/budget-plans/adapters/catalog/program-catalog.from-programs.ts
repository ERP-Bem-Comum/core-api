// ACL: ProgramCatalogPort ← ProgramCatalogReadPort (programs/public-api). Projeção
// mínima {ref, name, abbreviation, active}; o budget-plans nunca vê o agregado Program.
// O catálogo real tem poucas linhas (ETI/PARC/EPV…) — buscar tudo e filtrar é o simples
// que basta; sem cache (cada request relê, coerente com os demais read ports).

import { ok, err } from '../../../../shared/primitives/result.ts';
import type { ProgramCatalogReadPort } from '../../../programs/public-api/read.ts';
import type {
  ProgramCatalogPort,
  ProgramSnapshot,
} from '../../application/ports/program-catalog.ts';

const toSnapshot = (
  view: Readonly<{ ref: string; name: string; sigla: string; status: 'ATIVO' | 'INATIVO' }>,
): ProgramSnapshot => ({
  ref: view.ref,
  name: view.name,
  abbreviation: view.sigla,
  active: view.status === 'ATIVO',
});

export const ProgramCatalogFromPrograms = (reader: ProgramCatalogReadPort): ProgramCatalogPort => ({
  getByRef: async (ref) => {
    const catalog = await reader.listCatalog();
    if (!catalog.ok) return err('program-catalog-unavailable');
    const found = catalog.value.find((p) => p.ref === String(ref));
    return ok(found === undefined ? null : toSnapshot(found));
  },
  listActive: async () => {
    const catalog = await reader.listCatalog();
    if (!catalog.ok) return err('program-catalog-unavailable');
    return ok(catalog.value.filter((p) => p.status === 'ATIVO').map(toSnapshot));
  },
});
