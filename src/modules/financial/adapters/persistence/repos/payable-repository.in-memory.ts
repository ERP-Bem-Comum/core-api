import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type { Payable, Payables } from '#src/modules/financial/domain/payable/types.ts';
import type {
  PayableRepository,
  PayableRepositoryError,
  MarkPaidInput,
} from '#src/modules/financial/domain/payable/repository.ts';
import type { FinancialOutbox } from '#src/modules/financial/application/ports/outbox.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { DocumentStore, StoreEntry } from './document-repository.in-memory.ts';
import type { TimelineStore } from './timeline-repository.in-memory.ts';

// Paridade in-memory do `payable-repository.drizzle.ts`.
//
// Compartilha o `DocumentStore` do `createInMemoryDocumentRepository` — o mesmo arranjo que o
// `PayableListView` in-memory usa desde o #222. Sem isso o teste semearia num store e leria de
// outro, e o verde não significaria nada.
//
// ⚠️ O QUE ESTE ADAPTER PRECISA ESPELHAR, E É FÁCIL ERRAR: a `version` do documento **não muda**.
// Um in-memory que incrementasse a versão descreveria produção errado justamente no ponto que esta
// fatia existe para mudar — e o teste que a compara passaria aqui e falharia contra MySQL.

/** Localiza o título e o documento que o contém. `null` quando nenhum documento o guarda. */
const locate = (
  store: DocumentStore,
  payableId: string,
): { documentId: string; entry: StoreEntry; payables: Payables; target: Payable } | null => {
  for (const [documentId, entry] of store) {
    const { payables } = entry.aggregate;
    if (payables === null) continue;
    const target = [payables.parent, ...payables.children].find((p) => String(p.id) === payableId);
    if (target !== undefined) return { documentId, entry, payables, target };
  }
  return null;
};

export const createInMemoryPayableRepository = (
  store: DocumentStore,
  timelineStore?: TimelineStore,
  outbox: FinancialOutbox = createInMemoryOutbox().port,
): PayableRepository =>
  immutable<PayableRepository>({
    markPaid: async (input: MarkPaidInput): Promise<Result<void, PayableRepositoryError>> => {
      const payableId = String(input.payableId);
      const found = locate(store, payableId);

      // Sem o título no store não há o que gravar. O Drizzle chega ao mesmo desfecho por outro
      // caminho — `affectedRows = 0` —, e é o mesmo slug: quando o use case leu o título e ele
      // sumiu no meio, o que mudou foi o estado.
      if (found === null) return err('payable-state-conflict');

      // CAS: a mesma pré-condição que viaja no `WHERE status = 'Approved'` do adapter real.
      if (found.target.status !== 'Approved') return err('payable-state-conflict');

      const pay = (p: Payable): Payable =>
        String(p.id) === payableId
          ? immutable<Payable>({ ...p, status: 'Paid', paidAt: input.paidAt })
          : p;

      // Atomicidade (ADR-0015): outbox ANTES de persistir — falha no append não deixa estado gravado.
      if (input.events.length > 0) {
        const appended = await outbox.append(input.events);
        if (!appended.ok) return err('payable-repository-failure');
      }

      store.set(found.documentId, {
        // `version` preservada de propósito — ver o aviso no topo.
        version: found.entry.version,
        aggregate: {
          document: found.entry.aggregate.document,
          payables: immutable<Payables>({
            parent: pay(found.payables.parent),
            children: found.payables.children.map(pay),
          }),
        },
      });

      if (timelineStore !== undefined && input.timelineEntries.length > 0) {
        for (const entry of input.timelineEntries) {
          const key = entry.documentId as unknown as string;
          const existing = timelineStore.get(key);
          if (existing !== undefined) existing.push(entry);
          else timelineStore.set(key, [entry]);
        }
      }

      return ok(undefined);
    },
  });
