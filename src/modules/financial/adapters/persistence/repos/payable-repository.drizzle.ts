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

import { and, eq, inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  PayableRepository,
  PayableRepositoryError,
  MarkPaidInput,
  RescheduleInput,
} from '../../../domain/payable/repository.ts';
import type { FinancialTimelineEntry } from '../../../domain/timeline/types.ts';
import type { DocumentEvent } from '../../../domain/document/events.ts';
import { MANUALLY_PAYABLE_STATUSES } from '../../../domain/document/document.ts';
import type { FinancialMysqlHandle } from '../drivers/mysql-driver.ts';
import { mapEntryToRows } from '../mappers/timeline.mapper.ts';
import { appendFinOutboxInTx } from './fin-outbox-helpers.ts';
import { describeDriverError } from '../../../../../shared/persistence/driver-error.ts';
import { withDeadlockRetry } from '../../../../../shared/persistence/retry-on-deadlock.ts';

/** Os desfechos de CAS, derivados do port: o que sobra do erro de repositório quando se tira a infra. */
type CasConflictError = Exclude<PayableRepositoryError, 'payable-repository-failure'>;

// Sentinela do conflito de CAS. Existe pela mesma razão da `VERSION_CONFLICT_SYMBOL` do
// `document-repository`: dentro de `db.transaction` só `throw` reverte — um `return` deixaria a
// transação seguir e gravar trilha e outbox de uma escrita que não aconteceu. E o `catch` precisa
// distinguir este caso de falha de infra, que tem outro slug e outro tratamento a montante.
// `Symbol` em vez de `class` — `no-restricted-syntax` do projeto.
//
// ⚠️ A sentinela TRANSPORTA o slug, em vez de ser um marcador booleano. Antes ela só dizia "houve
// conflito", e o `catch` tinha de escolher um slug sozinho — o que só funciona enquanto existir um
// desfecho de conflito. Com dois, quem sabe qual ocorreu é o `applyUpdate` que falhou, não o `catch`.
const CAS_CONFLICT_SYMBOL = Symbol('payable-cas-conflict');

type CasConflictSentinel = Error & Readonly<{ [CAS_CONFLICT_SYMBOL]: CasConflictError }>;

const makeCasConflict = (error: CasConflictError, payableId: string): CasConflictSentinel => {
  const e = new Error(`${error}:${payableId}`) as CasConflictSentinel;
  (e as unknown as Record<symbol, CasConflictError>)[CAS_CONFLICT_SYMBOL] = error;
  return e;
};

/** O slug do conflito, ou `null` se a causa não for uma sentinela nossa (aí é falha de infra). */
const readCasConflict = (cause: unknown): CasConflictError | null => {
  if (!(cause instanceof Error)) return null;
  const slug = (cause as unknown as Record<symbol, unknown>)[CAS_CONFLICT_SYMBOL];
  return slug === 'payable-payment-conflict' || slug === 'payable-reschedule-conflict'
    ? slug
    : null;
};

export const createDrizzlePayableRepository = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PayableRepository => {
  const { db, schema } = handle;

  /**
   * Esqueleto comum das escritas por título. O que varia entre elas é UMA coisa — o `UPDATE` com
   * a sua própria pré-condição —, e é ela que entra por `applyUpdate`, devolvendo `affectedRows`.
   *
   * O resto é idêntico e não se duplica: repetição em deadlock, transação, `affectedRows = 0` →
   * conflito, trilha, outbox e a tradução do erro na borda. Duplicar isso faria a segunda operação
   * herdar por cópia decisões que ninguém revisaria de novo — e a trilha ou o outbox ficariam de
   * fora numa delas sem que nada acusasse.
   *
   * `ctx` só aparece no log de falha: é o nome da operação, para quem depura saber qual `UPDATE`
   * não casou sem ter de inferir pelo `payableId`.
   */
  const writeWithCas = async (
    args: Readonly<{
      ctx: string;
      payableId: string;
      /** O slug devolvido quando o CAS desta operação não casar — é ela quem sabe qual é. */
      conflictError: CasConflictError;
      // O `tx` do Drizzle expõe interface mutável (mesmo motivo do `handle` na assinatura abaixo):
      // o builder acumula estado interno a cada `.update()/.where()`. Não o mutamos — só o
      // encadeamos —, e não há forma read-only do tipo para declarar aqui.
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
      applyUpdate: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<number>;
      timelineEntries: readonly FinancialTimelineEntry[];
      events: readonly DocumentEvent[];
    }>,
  ): Promise<Result<void, PayableRepositoryError>> => {
    const { ctx, payableId, conflictError, applyUpdate, timelineEntries, events } = args;
    try {
      // O retry é rede residual, não a correção: sem DELETE de faixa não há o gap lock da #803.
      // Sobra o que qualquer OLTP concorrente tem, e a unidade repetida é a transação inteira —
      // depois de um 1213 o `tx` está morto (ver `retry-on-deadlock.ts`).
      await withDeadlockRetry(async () =>
        db.transaction(async (tx) => {
          const affectedRows = await applyUpdate(tx);

          if (affectedRows === 0) {
            // O CAS não casou: entre a leitura do use case e a chegada do UPDATE ao banco, a
            // pré-condição desta operação deixou de valer — outra escrita chegou primeiro (duplo
            // clique, retry de rede do front, dois operadores).
            //
            // A escolha é CONFLITO EXPLÍCITO, e o que se recusa aqui é a alternativa idempotente:
            // devolver sucesso silencioso engoliria junto uma segunda operação LEGÍTIMA — um título
            // rebaixado e reaprovado no mesmo dia — e ela sumiria sem deixar rastro. Em operação de
            // caixa, "não aconteceu nada e ninguém avisou" é pior que um erro na tela.
            //
            // O `throw` (e não `return`) é o que reverte a transação: sem ele a callback seguiria
            // para os inserts abaixo e gravaria trilha e outbox de uma escrita que não ocorreu.
            throw makeCasConflict(conflictError, payableId);
          }

          // Trilha na MESMA transação (SC-004/NFR-001 — Vernon:3257).
          if (timelineEntries.length > 0) {
            const mapped = timelineEntries.map(mapEntryToRows);
            await tx.insert(schema.finDocumentTimeline).values(mapped.map((m) => m.entryRow));

            const changeRows = mapped.flatMap((m) => [...m.changeRows]);
            if (changeRows.length > 0) {
              await tx.insert(schema.finTimelineFieldChanges).values(changeRows);
            }
          }

          // Outbox na MESMA transação (ADR-0015): evento durável SSE estado persistido.
          await appendFinOutboxInTx(tx, events);
        }),
      );

      return ok(undefined);
    } catch (cause) {
      const conflict = readCasConflict(cause);
      if (conflict !== null) return err(conflict);
      process.stderr.write(`[payable-repo:${ctx}] ${describeDriverError(cause)}\n`);
      return err('payable-repository-failure');
    }
  };

  /** mysql2 devolve `[ResultSetHeader, FieldPacket[]]`; o Drizzle expõe o raw do driver via cast. */
  const rowsAffected = (result: unknown): number =>
    (result as [{ affectedRows: number }])[0].affectedRows;

  const markPaid = async (input: MarkPaidInput): Promise<Result<void, PayableRepositoryError>> => {
    const payableId = input.payableId as unknown as string;

    return writeWithCas({
      ctx: 'markPaid',
      payableId,
      conflictError: 'payable-payment-conflict',
      // Pré-condição de TRANSIÇÃO: a mesma guarda que `Document.payPayableManually` aplica em
      // memória — aqui ela vale no instante da escrita. A lista vem do DOMÍNIO, importada e não
      // copiada: duas cópias divergiriam em silêncio, e a divergência apareceria como baixa aceita
      // em memória e recusada no banco.
      //
      // ⚠️ `IN ('Approved','Transmitted')` é legítimo aqui, e o ADR-0063 é explícito sobre o porquê:
      // ele proíbe `IN` na pré-condição de ATRIBUIÇÃO — onde comparar um conjunto aceitaria toda
      // escrita e devolveria last-write-wins mudo (é o caso do `reschedule`, logo abaixo, que compara
      // o VALOR anterior). Isto é TRANSIÇÃO: o conjunto é fechado, são os dois estados a partir dos
      // quais a baixa é legítima (ADR-0065 §6), e qualquer outro continua afetando zero linhas.
      applyUpdate: async (tx) =>
        rowsAffected(
          await tx
            .update(schema.finPayables)
            .set({ status: 'Paid', paidAt: input.paidAt })
            .where(
              and(
                eq(schema.finPayables.id, payableId),
                inArray(schema.finPayables.status, [...MANUALLY_PAYABLE_STATUSES]),
              ),
            ),
        ),
      timelineEntries: input.timelineEntries,
      events: input.events,
    });
  };

  const reschedule = async (
    input: RescheduleInput,
  ): Promise<Result<void, PayableRepositoryError>> => {
    const payableId = input.payableId as unknown as string;

    return writeWithCas({
      ctx: 'reschedule',
      payableId,
      conflictError: 'payable-reschedule-conflict',
      // Pré-condição de ATRIBUIÇÃO: compara o VALOR anterior, não um estado. Reagendar duas vezes é
      // legítimo, então nenhum status distingue "já reagendei" de "ainda não" — e um
      // `WHERE status IN (…)` aceitaria toda escrita, devolvendo last-write-wins mudo.
      //
      // `due_date` é coluna DATE (sem hora): a comparação é de dia civil, e o `Date` que chega aqui
      // vem de um `YYYY-MM-DD` do cliente. É o teste de integração que prova essa igualdade contra
      // MySQL real — em memória ela sempre "funciona", e é justamente onde um fuso mordido passaria.
      applyUpdate: async (tx) =>
        rowsAffected(
          await tx
            .update(schema.finPayables)
            .set({ dueDate: input.dueDate })
            .where(
              and(
                eq(schema.finPayables.id, payableId),
                eq(schema.finPayables.dueDate, input.expectedDueDate),
              ),
            ),
        ),
      timelineEntries: input.timelineEntries,
      events: input.events,
    });
  };

  return { markPaid, reschedule };
};
