import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type { Remittance } from '../../../domain/remittance/types.ts';
import type { RemittanceId } from '../../../domain/remittance/remittance-id.ts';
import { holdsDocuments } from '../../../domain/remittance/remittance.ts';
import type {
  RemittanceRepository,
  RemittanceRepositoryError,
} from '../../../application/ports/remittance-repository.ts';

// Adapter in-memory do RemittanceRepository (testes / boot sem DB).
export const createInMemoryRemittanceRepository = (): RemittanceRepository => {
  const remittances = new Map<string, Remittance>();

  return {
    save: async (remittance: Remittance): Promise<Result<void, RemittanceRepositoryError>> => {
      remittances.set(remittance.id, remittance);
      return Promise.resolve(ok(undefined));
    },

    findById: async (
      id: RemittanceId,
    ): Promise<Result<Remittance | null, RemittanceRepositoryError>> =>
      Promise.resolve(ok(remittances.get(id) ?? null)),

    findByFileName: async (
      fileName: string,
    ): Promise<Result<Remittance | null, RemittanceRepositoryError>> =>
      Promise.resolve(ok([...remittances.values()].find((r) => r.fileName === fileName) ?? null)),

    // Espelha a semântica do adapter real: só remessas que PRENDEM contam. `Discarded` não prende —
    // é o único estado que devolve o documento para a fila, e depende de decisão humana.
    findHeldDocumentIds: async (
      documentIds: readonly string[],
    ): Promise<Result<readonly string[], RemittanceRepositoryError>> => {
      const wanted = new Set(documentIds);
      const held = new Set<string>();

      for (const remittance of remittances.values()) {
        if (!holdsDocuments(remittance)) continue;
        for (const id of remittance.documentIds) {
          if (wanted.has(id)) held.add(id);
        }
      }

      return Promise.resolve(ok([...held].sort()));
    },

    listByStatus: async (
      status: Remittance['status'],
    ): Promise<Result<readonly Remittance[], RemittanceRepositoryError>> =>
      Promise.resolve(ok([...remittances.values()].filter((r) => r.status === status))),
  };
};
