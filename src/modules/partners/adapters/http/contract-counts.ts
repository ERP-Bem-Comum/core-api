/**
 * 010-partner-contract-counts — composição das contagens de contratos/aditivos nos itens de lista
 * dos grids (collaborator/supplier/act). Uma única chamada de `countByContractor` por página
 * (batch — FR-003/SC-002). Degrada para 0/0 se o port falhar (não derruba a listagem — FR-004).
 *
 * Função pura de borda: recebe os DTOs de detalhe (cada um com `id`) já mapeados e devolve os
 * itens enriquecidos. Sem I/O além da chamada ao port.
 */

import type {
  ContractCountReadPort,
  ContractorType,
} from '#src/modules/contracts/public-api/index.ts';

type WithId = Readonly<{ id: string }>;
type WithCounts = Readonly<{ contractsCount: number; amendmentsCount: number }>;

/**
 * Enriquece `items` com `{ contractsCount, amendmentsCount }` para o `type` dado, em lote.
 * `items` vazio → não consulta o port. Falha do port → todos 0/0.
 */
export const attachContractCounts = async <T extends WithId>(
  port: ContractCountReadPort,
  type: ContractorType,
  items: readonly T[],
): Promise<readonly (T & WithCounts)[]> => {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);
  const result = await port.countByContractor(type, ids);
  const counts = result.ok ? result.value : undefined;
  return items.map((item) => {
    const c = counts?.get(item.id);
    return {
      ...item,
      contractsCount: c?.contracts ?? 0,
      amendmentsCount: c?.amendments ?? 0,
    };
  });
};
