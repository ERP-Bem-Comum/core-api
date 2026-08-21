// Implementação Drizzle do `PayableRepository` (Fatia 1) — escrita por TÍTULO.
//
// Contraste com `document-repository.drizzle.ts`, e é o ponto inteiro deste arquivo:
//
//   o `save` do documento          este adapter
//   ─────────────────────────      ─────────────────────────
//   SELECT … FOR UPDATE na PK      nenhum lock preventivo
//   UPDATE fin_documents (version) não toca fin_documents
//   varre 3 tabelas filhas         UPDATE de UMA linha, por PK
//   DELETE … WHERE document_id=?   nenhum DELETE — logo, nenhum gap lock
//
// CONTROLE DE CONCORRÊNCIA — COMPARE-AND-SWAP
//   A pré-condição da operação viaja no `WHERE` (`status = 'Approved'`). Quem chega em segundo
//   encontra a linha já `Paid` e recebe `affectedRows = 0`. Não há leitura prévia a proteger:
//   a checagem e a escrita são o MESMO statement, então não existe janela entre uma e outra.
//
//   O `Document.payPayableManually` já validou o estado em memória antes de chegar aqui. Por isso
//   `affectedRows = 0` não significa "título inexistente" nem "estado inválido" — significa que o
//   estado MUDOU entre a leitura do use case e esta escrita. É o mesmo raciocínio que o `save` faz
//   para `document-version-conflict` (ver `document-repository.drizzle.ts`, § SELECT FOR UPDATE).
//
// Boundary: todo `throw` vira `Result` aqui (`.claude/rules/adapters.md`).

import { and, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  PayableRepository,
  PayableRepositoryError,
  MarkPaidInput,
} from '../../../domain/payable/repository.ts';
import type { FinancialMysqlHandle } from '../drivers/mysql-driver.ts';
import { mapEntryToRows } from '../mappers/timeline.mapper.ts';
import { appendFinOutboxInTx } from './fin-outbox-helpers.ts';
import { describeDriverError } from '../../../../../shared/persistence/driver-error.ts';
import { withDeadlockRetry } from '../../../../../shared/persistence/retry-on-deadlock.ts';

// Sentinela do conflito de CAS. Existe pela mesma razão da `VERSION_CONFLICT_SYMBOL` do
// `document-repository`: dentro de `db.transaction` só `throw` reverte — um `return` deixaria a
// transação seguir e gravar trilha e outbox de uma baixa que não aconteceu. E o `catch` precisa
// distinguir este caso de falha de infra, que tem outro slug e outro tratamento a montante.
// `Symbol` em vez de `class` — `no-restricted-syntax` do projeto.
const STATE_CONFLICT_SYMBOL = Symbol('payable-state-conflict');

type StateConflictSentinel = Error & Readonly<{ [STATE_CONFLICT_SYMBOL]: true }>;

const makeStateConflict = (payableId: string): StateConflictSentinel => {
  const e = new Error(`payable-state-conflict:${payableId}`) as StateConflictSentinel;
  (e as unknown as Record<symbol, boolean>)[STATE_CONFLICT_SYMBOL] = true;
  return e;
};

const isStateConflict = (cause: unknown): cause is StateConflictSentinel =>
  cause instanceof Error &&
  (cause as unknown as Record<symbol, unknown>)[STATE_CONFLICT_SYMBOL] === true;

export const createDrizzlePayableRepository = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PayableRepository => {
  const { db, schema } = handle;

  const markPaid = async (input: MarkPaidInput): Promise<Result<void, PayableRepositoryError>> => {
    const payableId = input.payableId as unknown as string;

    try {
      // O retry é rede residual, não a correção: sem DELETE de faixa não há o gap lock da #803.
      // Sobra o que qualquer OLTP concorrente tem, e a unidade repetida é a transação inteira —
      // depois de um 1213 o `tx` está morto (ver `retry-on-deadlock.ts`).
      await withDeadlockRetry(async () =>
        db.transaction(async (tx) => {
          // CAS: a pré-condição está no WHERE. `status = 'Approved'` é a mesma guarda que
          // `Document.payPayableManually` aplica em memória — aqui ela vale no instante da escrita.
          const updateResult = await tx
            .update(schema.finPayables)
            .set({ status: 'Paid', paidAt: input.paidAt })
            .where(
              and(eq(schema.finPayables.id, payableId), eq(schema.finPayables.status, 'Approved')),
            );

          const affectedRows = (updateResult as unknown as [{ affectedRows: number }])[0]
            .affectedRows;

          if (affectedRows === 0) {
            // Chegar aqui significa: o use case leu o título `Approved`, o domínio aprovou a baixa,
            // e quando o UPDATE alcançou o banco o título já não estava mais `Approved` — outra
            // baixa entrou primeiro (duplo clique, retry de rede do front, dois operadores).
            //
            // A escolha é CONFLITO EXPLÍCITO, e o que se recusa aqui é a alternativa idempotente:
            // devolver sucesso silencioso engoliria junto uma segunda baixa LEGÍTIMA — título
            // rebaixado e reaprovado no mesmo dia — e a operação sumiria sem deixar rastro. Numa
            // baixa de caixa, "não aconteceu nada e ninguém avisou" é pior que um erro na tela.
            //
            // O `throw` (e não `return`) é o que reverte a transação: sem ele a callback seguiria
            // para os inserts abaixo e gravaria trilha e outbox de uma baixa que não ocorreu.
            throw makeStateConflict(payableId);
          }

          // Trilha na MESMA transação (SC-004/NFR-001 — Vernon:3257).
          if (input.timelineEntries.length > 0) {
            const mapped = input.timelineEntries.map(mapEntryToRows);
            await tx.insert(schema.finDocumentTimeline).values(mapped.map((m) => m.entryRow));

            const changeRows = mapped.flatMap((m) => [...m.changeRows]);
            if (changeRows.length > 0) {
              await tx.insert(schema.finTimelineFieldChanges).values(changeRows);
            }
          }

          // Outbox na MESMA transação (ADR-0015): evento durável SSE estado persistido.
          await appendFinOutboxInTx(tx, input.events);
        }),
      );

      return ok(undefined);
    } catch (cause) {
      if (isStateConflict(cause)) return err('payable-state-conflict');
      process.stderr.write(`[payable-repo:markPaid] ${describeDriverError(cause)}\n`);
      return err('payable-repository-failure');
    }
  };

  return { markPaid };
};
