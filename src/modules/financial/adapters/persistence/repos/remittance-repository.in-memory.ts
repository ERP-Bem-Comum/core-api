import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type { Remittance } from '../../../domain/remittance/types.ts';
import type { RemittanceEvent } from '../../../domain/remittance/events.ts';
import type { RemittanceId } from '../../../domain/remittance/remittance-id.ts';
import { holdsPayables } from '../../../domain/remittance/remittance.ts';
import type {
  HeldPayable,
  RemittanceRepository,
  RemittanceRepositoryError,
} from '../../../application/ports/remittance-repository.ts';

// Adapter in-memory do RemittanceRepository (testes / boot sem DB).
//
// Guarda os eventos publicados junto do estado, e não porque o teste precisa espiar: o adapter real
// grava os dois na MESMA transação, e um fake que aceitasse o evento e o jogasse fora deixaria
// passar verde um caminho que em produção não publica nada.
export const createInMemoryRemittanceRepository = (): RemittanceRepository &
  Readonly<{ published: () => readonly RemittanceEvent[] }> => {
  const remittances = new Map<string, Remittance>();
  const published: RemittanceEvent[] = [];

  return {
    save: async (
      remittance: Remittance,
      events: readonly RemittanceEvent[] = [],
    ): Promise<Result<void, RemittanceRepositoryError>> => {
      remittances.set(remittance.id, remittance);
      published.push(...events);
      return Promise.resolve(ok(undefined));
    },

    published: () => [...published],

    findById: async (
      id: RemittanceId,
    ): Promise<Result<Remittance | null, RemittanceRepositoryError>> =>
      Promise.resolve(ok(remittances.get(id) ?? null)),

    findByFileName: async (
      fileName: string,
    ): Promise<Result<Remittance | null, RemittanceRepositoryError>> =>
      Promise.resolve(ok([...remittances.values()].find((r) => r.fileName === fileName) ?? null)),

    // Espelha a semântica do adapter real: só remessas que PRENDEM contam. `Discarded` não prende —
    // é o único estado que devolve o título para a fila, e depende de decisão humana.
    findHeldPayables: async (
      payableIds: readonly string[],
    ): Promise<Result<readonly HeldPayable[], RemittanceRepositoryError>> => {
      const wanted = new Set(payableIds);
      const held: HeldPayable[] = [];

      for (const remittance of remittances.values()) {
        if (!holdsPayables(remittance)) continue;
        for (const { payableId } of remittance.payables) {
          // Sem `Set` de deduplicação: o mesmo título em duas remessas vivas é o defeito que #789
          // detecta, e colapsar as linhas aqui faria o fake mentir sobre o real — que também não
          // deduplica mais.
          if (wanted.has(payableId)) {
            held.push({ payableId, remittanceId: remittance.id, nsa: remittance.nsa });
          }
        }
      }

      return Promise.resolve(ok(held.sort((a, b) => a.payableId.localeCompare(b.payableId))));
    },

    listByStatus: async (
      status: Remittance['status'],
    ): Promise<Result<readonly Remittance[], RemittanceRepositoryError>> =>
      Promise.resolve(ok([...remittances.values()].filter((r) => r.status === status))),

    // #728: página de acompanhamento sobre o store semeado. Ordena por `generatedAt` DESC (desempate
    // por id desc, estável — espelha o adapter Drizzle), fatia por limit/offset e devolve o total.
    listPaged: async (
      pagination: Readonly<{ limit: number; offset: number }>,
    ): Promise<
      Result<Readonly<{ items: readonly Remittance[]; total: number }>, RemittanceRepositoryError>
    > => {
      const ordered = [...remittances.values()].sort((a, b) => {
        if (a.generatedAt !== b.generatedAt) return a.generatedAt < b.generatedAt ? 1 : -1;
        return a.id < b.id ? 1 : -1;
      });
      const items = ordered.slice(pagination.offset, pagination.offset + pagination.limit);
      return Promise.resolve(ok({ items, total: ordered.length }));
    },
  };
};
