/**
 * Adapter InMemory do `SupplierRepository` (módulo partners). Para teste/CLI.
 *
 * `Map<SupplierId, Supplier>`. `save` recusa CNPJ duplicado com id diferente
 * (espelha o UNIQUE de `par_suppliers.cnpj` que o adapter Drizzle terá).
 * `findByCnpj` por varredura (cardinalidade modesta — ADR-0031).
 *
 * Outbox (PAR-SUPPLIER-EVENTS / ADR-0043): `save(supplier, events)` publica os
 * eventos publicáveis (Registered/Edited) num `InMemoryOutbox` opcionalmente
 * INJETADO — espelha o padrão de `createInMemoryDocumentRepository(timelineStore?)`
 * do financial. Quando fornecido, os testes inspecionam o que foi publicado
 * (`outbox.all()`); quando omitido, a publicação é descartada (testes que passam `[]`).
 *
 * Divergência de atomicidade vs adapter Drizzle (deliberada): aqui o agregado é
 * gravado no `Map` e SÓ ENTÃO os eventos são publicados — sem rollback se o append
 * falhar. O adapter Drizzle envolve persist + `appendOutboxInTx` na MESMA `db.transaction`,
 * então ambos commitam ou ambos sofrem rollback (atomicidade exigida pelo ADR-0015).
 * Este InMemory é fake de teste/CLI; o invariante de atomicidade real é coberto pela
 * suíte de integração MySQL do adapter Drizzle.
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import type { SupplierRepository } from '#src/modules/partners/domain/supplier/repository.ts';
import type { SupplierId } from '#src/modules/partners/domain/supplier/supplier-id.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';
import type { InMemoryOutbox } from '#src/modules/partners/adapters/outbox/outbox.in-memory.ts';
import { supplierEventsToOutboxMessages } from '../mappers/supplier-outbox.mapper.ts';

export type InMemorySupplierStore = Readonly<{
  repository: SupplierRepository;
  clear: () => void;
}>;

/** Outbox in-memory injetado (para inspeção em testes). `append` é a única operação usada. */
type InjectableOutbox = Readonly<{ port: ReturnType<typeof InMemoryOutbox>['port'] }>;

export const makeInMemorySupplierStore = (outbox?: InjectableOutbox): InMemorySupplierStore => {
  const map = new Map<SupplierId, Supplier>();

  const repository: SupplierRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findByCnpj: async (cnpj) => ok([...map.values()].find((s) => s.cnpj === cnpj) ?? null),
    list: async () => ok([...map.values()]),
    save: async (supplier, events) => {
      for (const existing of map.values()) {
        if (existing.cnpj === supplier.cnpj && existing.id !== supplier.id) {
          return err('supplier-cnpj-duplicate');
        }
      }
      map.set(supplier.id, supplier);

      // Publica eventos de integração (Registered/Edited) no outbox injetado, a
      // partir do snapshot recém-persistido. Atômico em memória (já gravamos acima).
      if (outbox !== undefined) {
        const messages = supplierEventsToOutboxMessages(events, supplier);
        if (messages.length > 0) {
          const appended = await outbox.port.append(messages);
          // append só falha por eventId duplicado (não acontece — UUID novo por mensagem);
          // tratamos como indisponibilidade do repo para não vazar erro de outbox.
          if (!appended.ok) return err('supplier-repo-unavailable');
        }
      }
      return ok(undefined);
    },
  };

  return {
    repository,
    clear: () => {
      map.clear();
    },
  };
};
