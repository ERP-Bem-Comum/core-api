import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { Remittance } from '../../../domain/remittance/types.ts';
import type { RemittanceId } from '../../../domain/remittance/remittance-id.ts';
import { holdsPayables } from '../../../domain/remittance/remittance.ts';
import type { DocumentStatus } from '../../../domain/document/types.ts';
import type {
  HeldPayable,
  RemittanceRepository,
  RemittanceRepositoryError,
  RemittanceSaveError,
  RemittanceSaveEvent,
} from '../../../application/ports/remittance-repository.ts';

// Adapter in-memory do RemittanceRepository (testes / boot sem DB).
//
// Guarda os eventos publicados junto do estado, e não porque o teste precisa espiar: o adapter real
// grava os dois na MESMA transação, e um fake que aceitasse o evento e o jogasse fora deixaria
// passar verde um caminho que em produção não publica nada.
//
// ⚠️ Desde o ADR-0065 §2 o `save` de criação escreve em DOIS agregados: reserva a remessa e
// transiciona cada título `Approved → Transmitted`. Este fake precisa espelhar as duas coisas, e o
// segundo efeito não tinha onde morar — o fake da remessa e o de payables (`payable-repository.
// in-memory.ts`) nunca compartilharam estado. `payableStatuses` é esse lugar: o teste semeia o
// estado dos títulos, o `save` o lê como pré-condição e o reescreve como efeito.
//
// O veredito é por CONTAGEM, como manda o ADR-0065 §2: ou TODOS os títulos da remessa estão
// `Approved` e todos transicionam, ou nenhum transiciona e o `save` recusa com
// `remittance-payable-not-approved`. Título que o `seed` não declarou conta como recusado — no banco
// ele afetaria zero linhas, que é o mesmo conflito.
export const createInMemoryRemittanceRepository = (
  seed: Readonly<{ payableStatuses?: Readonly<Record<string, DocumentStatus>> }> = {},
): RemittanceRepository &
  Readonly<{
    published: () => readonly RemittanceSaveEvent[];
    // Leitura do estado dos títulos, para o teste asserir o EFEITO da transição em vez de inferi-lo
    // da ausência de erro. Sem isto, "o vencedor ficou `Transmitted`" e "o perdedor ficou
    // `Approved`" seriam indistinguíveis de "nada aconteceu".
    payableStatus: (payableId: string) => DocumentStatus | undefined;
  }> => {
  const remittances = new Map<string, Remittance>();
  const published: RemittanceSaveEvent[] = [];
  const payableStatuses = new Map<string, DocumentStatus>(
    Object.entries(seed.payableStatuses ?? {}),
  );

  return {
    // Espelha a SEMÂNTICA da reserva do adapter real (#789), não o mecanismo: lá a exclusão vem de
    // `SELECT … FOR UPDATE` sobre `fin_payables`; aqui, de uma checagem síncrona. O que os dois
    // precisam ter em comum é o veredito — um fake que aceitasse o que o banco recusa deixaria a
    // suíte verde descrevendo produção errado.
    //
    // A reserva vale só na CRIAÇÃO. Na atualização a remessa encontra os próprios títulos presos,
    // por ela mesma, e recusar ali travaria o desfecho de toda remessa transmitida.
    save: async (
      remittance: Remittance,
      events: readonly RemittanceSaveEvent[] = [],
    ): Promise<Result<void, RemittanceSaveError>> => {
      const isCreation = !remittances.has(remittance.id);
      if (isCreation) {
        const mine = new Set(remittance.payables.map((p) => p.payableId));
        for (const other of remittances.values()) {
          if (!holdsPayables(other)) continue;
          if (other.payables.some((p) => mine.has(p.payableId))) {
            return Promise.resolve(err('remittance-payables-already-held'));
          }
        }

        // A transição `Approved → Transmitted` (ADR-0065 §2), na mesma "transação" da reserva. No
        // adapter real ela é um `UPDATE … WHERE id IN (…) AND status = 'Approved'` cuja contagem de
        // linhas é o veredito; aqui o mecanismo é outro, mas o VEREDITO tem de ser o mesmo — um fake
        // que aceitasse o que o banco recusa deixaria a suíte verde descrevendo produção errado.
        //
        // ⚠️ Título AUSENTE de `payableStatuses` é recusado, igual a título não-aprovado. Não é
        // rigor inventado para o fake: é o que o banco faz. Lá o CAS casa `id = ? AND status =
        // 'Approved'`, e um id que a tabela não conhece afeta ZERO linhas — que já é
        // `affectedRows ≠ n`, conflito, transação inteira desfeita. Desconhecido e não-aprovado são
        // o MESMO desfecho no adapter real, e um fake que os separasse estaria prometendo o que o
        // banco não promete (o defeito de `b1973f86`, no casamento do retorno).
        //
        // O preço é que todo cenário que cria remessa por aqui semeia `payableStatuses` — ver o
        // parâmetro `seed`. É preço justo: um teste que não diz em que estado o título estava não
        // descreve produção, e a entrada do use case já exige `Approved` desde o #740.
        if (remittance.payables.some((p) => payableStatuses.get(p.payableId) !== 'Approved')) {
          return Promise.resolve(err('remittance-payable-not-approved'));
        }

        // Só DEPOIS do veredito fechado para todos os títulos. O adapter real desfaz o que escreveu
        // quando a contagem diverge; o fake não tem rollback — o que ele tem é a opção de não
        // começar, e é ela que preserva o "nada persistido" que o teste do caminho recusado assere.
        for (const { payableId } of remittance.payables) {
          payableStatuses.set(payableId, 'Transmitted');
        }
      }

      remittances.set(remittance.id, remittance);
      published.push(...events);
      return Promise.resolve(ok(undefined));
    },

    published: () => [...published],

    payableStatus: (payableId: string) => payableStatuses.get(payableId),

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
