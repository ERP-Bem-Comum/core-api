import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type {
  ContractNumberReadError,
  ContractNumberReadPort,
} from '../../../application/ports/contract-number-read.ts';

// Read store in-memory (testes/dev): projeção semeada por `id → sequential_number` (Map ou registro).
// Filtra o seed pelos ids pedidos — id ausente simplesmente não entra no Map devolvido, espelhando o
// store drizzle. `ids` vazio → Map vazio. Read-only.
export const makeInMemoryContractNumberRead = (
  seed: ReadonlyMap<string, string> | Readonly<Record<string, string>> = {},
): ContractNumberReadPort => {
  // `instanceof Map` alarga os genéricos para `any` no narrowing — recasta para o tipo declarado em
  // cada ramo para manter `string` (satisfaz `no-unsafe-*` sem afrouxar o contrato).
  const table = new Map<string, string>();
  if (seed instanceof Map) {
    for (const [id, num] of seed as ReadonlyMap<string, string>) table.set(id, num);
  } else {
    for (const [id, num] of Object.entries(seed as Readonly<Record<string, string>>)) {
      table.set(id, num);
    }
  }
  return {
    resolveContractNumbers: async (
      ids: readonly string[],
    ): Promise<Result<ReadonlyMap<string, string>, ContractNumberReadError>> => {
      const out = new Map<string, string>();
      for (const id of new Set(ids)) {
        const num = table.get(id);
        if (num !== undefined) out.set(id, num);
      }
      return ok(out);
    },
  };
};
