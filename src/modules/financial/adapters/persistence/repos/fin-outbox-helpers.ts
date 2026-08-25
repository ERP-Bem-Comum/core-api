// Helper do outbox transacional do Financeiro (#127, ADR-0015).
//
// `appendFinOutboxInTx(tx, events)` insere os eventos de domínio no `fin_outbox` DENTRO de uma
// transação (tipo estrutural `{ insert }` — aceita `MySql2Database` ou `MySqlTransaction`), de modo
// que o repo pai grave estado + evento na MESMA `db.transaction` (atomicidade; evento durável SSE
// estado persistido). Espelha `appendOutboxInTx` de contracts. Produtor apenas — o consumo/worker
// (delivery, DLQ) é fatia futura (fora do escopo do #127).

import { randomUUID } from 'node:crypto';

import type { FinancialAppendableEvent } from '../../../application/ports/outbox.ts';
import type { FinancialMysqlHandle } from '../drivers/mysql-driver.ts';
import { finOutbox, type FinOutboxAggregateType, type NewFinOutboxRow } from '../schemas/mysql.ts';

/** Versão canônica do contrato do payload (wire format). */
export const FIN_OUTBOX_SCHEMA_VERSION = 1;

// Deriva o agregado dono do evento. Cada FinancialAppendableEvent carrega exatamente um id de
// agregado (documento / conciliação / extrato / período / remessa). Adapter → uso de `in` é
// permitido aqui.
//
// O retorno é `FinOutboxAggregateType`, não `string`, e isso é o mecanismo: um agregado novo que
// não esteja na fonte única NÃO COMPILA. Antes, com `string`, o valor só encontrava resistência no
// CHECK do banco — em runtime, dentro de uma transação que revertia inteira.
const extractAggregateInfo = (
  e: FinancialAppendableEvent,
): { id: string; type: FinOutboxAggregateType } => {
  if ('documentId' in e) return { id: String(e.documentId), type: 'Document' };
  if ('reconciliationId' in e) return { id: String(e.reconciliationId), type: 'Reconciliation' };
  if ('statementId' in e) return { id: String(e.statementId), type: 'Statement' };
  if ('counterpartId' in e) return { id: String(e.counterpartId), type: 'ExpectedCounterpart' };
  // ⚠️ A ORDEM entre este ramo e o do documento é significativa, e desde o ADR-0065 §2 ela decide um
  // caso real — não é mais "não colide". `PayableTransmitted` carrega os DOIS ids (`documentId`, para
  // a nota, e `remittanceId`, para dizer em qual remessa o título foi), e cai no ramo do documento
  // por chegar primeiro. É o desfecho correto: o evento é do TÍTULO, e é a nota que o exibe na
  // trilha (#823). Inverter a ordem destes dois `if` o mandaria para o agregado `Remittance` e a
  // nota nunca o veria — em silêncio, porque ambos os `aggregateType` são válidos no CHECK.
  //
  // Os eventos da própria remessa (`RemittanceTransmitted`/`RemittanceFailed`) seguem caindo aqui:
  // eles carregam `payableIds` (plural), e `'documentId' in e` não casa com nenhum deles.
  if ('remittanceId' in e) return { id: String(e.remittanceId), type: 'Remittance' };
  return { id: String(e.periodId), type: 'ReconciliationPeriod' };
};

/** Mapeia um evento de domínio do Financeiro para a linha de INSERT do `fin_outbox`. */
export const finEventToOutboxInsert = (
  event: FinancialAppendableEvent,
  now: Date,
  idGenerator: () => string = randomUUID,
): NewFinOutboxRow => {
  const agg = extractAggregateInfo(event);
  return {
    eventId: idGenerator(),
    aggregateId: agg.id,
    aggregateType: agg.type,
    eventType: event.type,
    schemaVersion: FIN_OUTBOX_SCHEMA_VERSION,
    // DocumentEvent não carrega `occurredAt` (≠ Reconciliation/Statement/Period); usa `now` (a
    // operação acabou de ocorrer, então enqueue ≈ ocorrência).
    occurredAt: 'occurredAt' in event ? event.occurredAt : now,
    enqueuedAt: now,
    processedAt: null,
    attempts: 0,
    // Payload serializado (VARCHAR, nunca JSON nativo — ADR-0020). Branded IDs → string, Date → ISO.
    payload: JSON.stringify(event),
  };
};

/**
 * Insere os eventos no `fin_outbox` na transação `tx`. No-op se `events` for vazio. Lança em falha
 * de I/O/constraint — o repo pai captura no `safe()` e converte para o slug de erro de persistência
 * (a transação inteira reverte: estado + outbox, tudo-ou-nada — ADR-0015).
 */
export const appendFinOutboxInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: { insert: FinancialMysqlHandle['db']['insert'] },
  events: readonly FinancialAppendableEvent[],
  now: Date = new Date(),
): Promise<void> => {
  if (events.length === 0) return;
  const rows = events.map((e) => finEventToOutboxInsert(e, now));
  await tx.insert(finOutbox).values(rows);
};
