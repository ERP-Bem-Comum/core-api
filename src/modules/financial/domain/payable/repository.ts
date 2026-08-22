import type { Result } from '../../../../shared/primitives/result.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { DocumentEvent } from '../document/events.ts';
import type { FinancialTimelineEntry } from '../timeline/types.ts';

// Port de ESCRITA por título, separado do `DocumentRepository` (Fatia 1).
//
// POR QUE ELE EXISTE
//   `registerManualPayment` e `updatePayableDueDate` não alteram o documento — o comentário de
//   `register-manual-payment.ts` diz, por escrito, "after = mesmo documento (status inalterado)".
//   Mesmo assim os dois passavam pelo `DocumentRepository.save`, que escreve `fin_documents` com
//   `version + 1`, varre as três tabelas filhas e serializa tudo num `SELECT … FOR UPDATE` na PK
//   do documento. Escrever o que não mudou tem dois custos medidos, e nenhum deles é teórico:
//
//     • o `DELETE … WHERE document_id = ?` das filhas percorre índice NÃO-único e, sob
//       REPEATABLE READ, trava a FAIXA varrida — o gap onde o INSERT de OUTRO documento quer
//       entrar (deadlock da #803, `child-rows-diff.ts`).
//     • dois operadores baixando títulos IRMÃOS do mesmo documento colidem em
//       `document-version-conflict`. Não há conflito real: a unidade de escrita é que era maior
//       que a unidade de mudança.
//
//   Aqui a escrita é `UPDATE … WHERE id = ?` — PK, record lock, sem faixa. O documento não é
//   tocado, e títulos irmãos deixam de disputar qualquer coisa entre si.
//
// CONTROLE DE CONCORRÊNCIA: COMPARE-AND-SWAP POR ESTADO, NÃO `version`
//   O título não ganha coluna de versão. A escrita carrega no próprio `WHERE` a pré-condição da
//   operação (`status = 'Approved'`, para a baixa), e `affectedRows = 0` significa que ela deixou
//   de valer entre a leitura do use case e a escrita. É mais estreito que um contador genérico:
//   `version` acusa conflito quando QUALQUER campo mudou, inclusive um que a operação não lê.
//   Uma `version` por título continua aditiva se um dia o ciclo de vida exigir (Fatia 4).
//
// O QUE ESTE PORT NÃO FAZ
//   Não decide regra: quem valida se o título pode ser pago é `Document.payPayableManually`, no
//   domínio. O port só persiste a decisão e devolve o desfecho do CAS.
//
// `timelineEntries` e `events` vão na MESMA transação do UPDATE — trilha (SC-004/NFR-001,
// Vernon:3257) e outbox (ADR-0015): evento durável SSE estado persistido.

export type PayableRepositoryError =
  // O CAS não casou: o título não estava mais no estado que a operação pressupõe quando a escrita
  // chegou ao banco. Análogo por-título do `document-version-conflict`.
  'payable-state-conflict' | 'payable-repository-failure';

export type MarkPaidInput = Readonly<{
  payableId: PayableId;
  /** Data da saída bancária (#232) — pode ser retroativa; o domínio já rejeitou data futura. */
  paidAt: Date;
  timelineEntries: readonly FinancialTimelineEntry[];
  events: readonly DocumentEvent[];
}>;

export type RescheduleInput = Readonly<{
  payableId: PayableId;
  /** Novo vencimento do título alvo. */
  dueDate: Date;
  /**
   * Vencimento que o cliente tinha na tela — a pré-condição do CAS.
   *
   * ⚠️ NÃO é o valor recém-lido pelo use case. Ancorar o CAS na leitura do próprio use case
   * protegeria só os milissegundos entre o `findById` e o `UPDATE`; ancorá-lo no que o CLIENTE viu
   * cobre a janela inteira — desde a tela até a gravação. É a diferença entre detectar duas
   * requisições simultâneas e detectar que alguém reagendou enquanto o operador decidia.
   */
  expectedDueDate: Date;
  timelineEntries: readonly FinancialTimelineEntry[];
  events: readonly DocumentEvent[];
}>;

export type PayableRepository = Readonly<{
  /**
   * Baixa manual de UM título: `Approved` → `Paid` (#223).
   *
   * Pré-condição verificada NO BANCO, não em memória: o `UPDATE` só casa enquanto o título
   * estiver `Approved`. Os irmãos seguem intocados, e `fin_documents` não é escrito.
   */
  markPaid: (input: MarkPaidInput) => Promise<Result<void, PayableRepositoryError>>;

  /**
   * Reagendamento de UM título (#270): novo `dueDate`, sem tocar o documento nem os irmãos.
   *
   * ⚠️ A pré-condição é OUTRA, e a diferença é de natureza, não de campo. A baixa é uma TRANSIÇÃO
   * — `Approved → Paid` acontece uma vez só, e o próprio estado de destino serve de guarda. O
   * reagendamento é uma ATRIBUIÇÃO: reagendar duas vezes é legítimo, e nenhum estado nomeado
   * distingue "já reagendei" de "ainda não". Por isso o CAS aqui compara o VALOR anterior.
   *
   * Traduzir o molde do `markPaid` campo a campo daria um `WHERE status IN (…)` que aceita a
   * escrita sempre — last-write-wins mudo, justo onde hoje existe detecção.
   */
  reschedule: (input: RescheduleInput) => Promise<Result<void, PayableRepositoryError>>;
}>;
