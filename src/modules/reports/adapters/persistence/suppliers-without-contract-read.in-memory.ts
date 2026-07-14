/**
 * Adapter InMemory do `SuppliersWithoutContractReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um array semeado; sem seed, devolve lista vazia.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type {
  SuppliersWithoutContractReadPort,
  SupplierWithoutContract,
} from '../../application/ports/suppliers-without-contract-read.ts';

export const InMemorySuppliersWithoutContractRead = (
  seed: readonly SupplierWithoutContract[] = [],
): SuppliersWithoutContractReadPort => ({
  list: async () => ok(seed),
});
