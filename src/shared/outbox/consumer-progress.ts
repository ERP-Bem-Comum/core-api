/**
 * Progresso de UM consumidor sobre UM evento do outbox — a unidade que faltava (#800, #824).
 *
 * ## O defeito que este arquivo existe para fechar
 *
 * O claim do outbox era `WHERE processed_at IS NULL … FOR UPDATE SKIP LOCKED` + `UPDATE
 * processed_at` na própria linha do outbox. Isso é o padrão de **fila de trabalho**: N workers
 * DIVIDEM a carga e o `SKIP LOCKED` existe justamente para que dois nunca peguem o mesmo item.
 * Só que o requisito aqui é **fanout** — o logger e a projeção precisam, cada um, de TODOS os
 * eventos. Resultado medido em ambiente de simulação: 11 fornecedores cadastrados, 1 na
 * `fin_supplier_view`, `pendentes = 0` no outbox. Perda silenciosa nas duas pontas.
 *
 * Com o progresso por consumidor, a pergunta "este evento está pendente?" deixa de ter uma
 * resposta global e passa a ter uma resposta POR CONSUMIDOR — que é a semântica que o
 * ADR-0015:54-55 já descrevia ("consumidor marca event_id como visto" é um passo distinto de
 * "worker atualiza processed_at na origem") e que a implementação fundiu num campo só.
 *
 * ## Por que a regra vive aqui, e não só no SQL
 *
 * Ela é aplicada em DOIS lugares que precisam concordar: o `WHERE` do claim no adapter Drizzle e
 * o filtro do adapter in-memory que os testes de unidade usam. Se divergirem, a suíte fica verde
 * descrevendo um comportamento que produção não tem — que é o modo de falha mais caro deste
 * repositório. A função abaixo é a fonte única; o predicado SQL a espelha e cita esta linha.
 */

/**
 * Progresso registrado em `eventos_processados` para o par (consumidor, evento).
 * `undefined` — no lugar de uma linha — significa que este consumidor nunca tocou este evento.
 */
export type ConsumerProgress = Readonly<{
  consumerId: string;
  eventId: string;
  /** NULL = ainda não concluído por este consumidor. NOT NULL = entregue com sucesso. */
  processedAt: Date | null;
  /** Tentativas DESTE consumidor — nunca o contador global do outbox. */
  attempts: number;
  lastError: string | null;
  /** NOT NULL = este consumidor esgotou `maxAttempts` e desistiu (foi para a DLQ dele). */
  deadLetteredAt: Date | null;
}>;

/**
 * `isPendingForConsumer` — decide se um evento ainda deve ser ENTREGUE a este consumidor.
 *
 * É o predicado do claim: o adapter Drizzle traduz esta regra no `WHERE … NOT EXISTS (…)` e o
 * in-memory a chama diretamente. Uma resposta `true` significa "entregue de novo"; `false`
 * significa "este consumidor já resolveu este evento, de um jeito ou de outro".
 *
 * Os três estados possíveis do progresso:
 *
 *   | progresso                                   | significado                          |
 *   | ------------------------------------------- | ------------------------------------ |
 *   | `undefined`                                 | nunca visto por este consumidor      |
 *   | `processedAt: null`, `deadLetteredAt: null` | tentou e falhou; retry em aberto     |
 *   | `processedAt` preenchido                    | entregue com sucesso                 |
 *   | `deadLetteredAt` preenchido                 | desistiu — já está na DLQ dele       |
 *
 * ⚠️ Um evento na DLQ **continua no outbox**, à disposição dos OUTROS consumidores. Sob fanout,
 * apagar a linha de origem (que é o que `moveToDeadLetter` fazia) rouba o evento de quem ainda
 * não o processou — trocaria uma perda silenciosa por outra. Apagar a origem também quebrava, em
 * silêncio, a garantia do ADR-0022:27-29 — "o outbox RETÉM as entradas após a entrega: o worker
 * faz `markProcessed`…, NÃO deleta" — e com ela a reconstrução prometida em `0022:40`. Esse
 * defeito é anterior ao fanout: valia para um consumidor só.
 *
 * ## Por que dead-letter é TERMINAL aqui
 *
 * Porque é o que o sistema já faz, e a alternativa é pior. Não existe hoje nenhum caminho de
 * volta da DLQ — nenhum job, rota ou script republica de lá; `scripts/financial/diagnostics/
 * projection-health.ts:76,127` apenas conta as linhas. Reentregar um evento dead-lettered o
 * devolveria ao worker a cada poll (100ms no grupo `outbox`), onde ele falharia de novo pelo
 * mesmo motivo que já esgotou `maxAttempts`: um giro infinito sobre um evento venenoso, já que
 * não há backoff. Nenhum ADR decidiu se a DLQ é terminal ou reprocessável — é lacuna, não
 * decisão —, então a escolha vira norma nova e está registrada em ADR próprio.
 *
 * A volta continua possível, e é deliberada: limpar `dead_lettered_at` daquela linha torna o
 * evento elegível outra vez, porque ele nunca saiu do outbox. Recuperação por decisão humana,
 * não por reentrega automática.
 */
export const isPendingForConsumer = (progress: ConsumerProgress | undefined): boolean => {
  // Nunca visto por este consumidor — o caso dominante sob fanout, e o que o desenho antigo
  // tornava impossível: lá, o evento que o OUTRO consumidor reivindicasse já nascia invisível.
  if (progress === undefined) return true;
  // Visto: só segue pendente enquanto não houve nem sucesso nem desistência. Note que `attempts`
  // NÃO entra aqui — `maxAttempts` é config de worker (`WorkerConfig`), e a desistência é decidida
  // em `runOnce`. Repetir o teto neste predicado criaria duas regras para a mesma coisa.
  return progress.processedAt === null && progress.deadLetteredAt === null;
};
