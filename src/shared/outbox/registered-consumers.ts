/**
 * Quem consome cada outbox — a lista que o sweeper usa para decidir que um evento já foi
 * resolvido por TODOS (ADR-0062 §3).
 *
 * ## Por que esta lista existe, e por que errá-la para MENOS é perigoso
 *
 * O sweeper marca `processed_at` na linha do outbox quando todos os consumidores daqui já
 * concluíram ou desistiram dela. Essa marca é o que devolve a indexabilidade ao claim — mas
 * também **exclui a linha do claim de todo mundo**. Portanto:
 *
 *   - consumidor a MAIS nesta lista (que não existe de verdade) → a linha nunca é marcada.
 *     O claim volta a ser o lento. **Perde performance, nunca evento.**
 *   - consumidor a MENOS (existe e não está aqui) → a linha é marcada sem que ele tenha
 *     processado, e ele **deixa de recebê-la**. Perda silenciosa — exatamente o defeito que o
 *     ADR-0062 fecha.
 *
 * A assimetria é deliberada: na dúvida, sobre-declare. `tests/cleanup/outbox-claim-per-consumer.test.ts`
 * cobra que todo `consumerId` literal registrado em `src/workers/` esteja aqui.
 *
 * ## O caso do logger, que não é literal
 *
 * Os dois `LoggerEventDelivery` recebem o id por env (`OUTBOX_CONSUMER_ID`) — o mesmo nome de
 * variável para os dois, com defaults distintos. É frágil e está registrado como pendência 3 do
 * ADR-0062. Aqui a resolução **repete exatamente** a dos `worker/config.ts` de cada módulo, para
 * que sweeper e worker nunca discordem sobre quem é o consumidor; se aquela mudar, esta muda
 * junto, e o gate acima acusa.
 */

/** As cinco tabelas de outbox do repositório. */
export type OutboxName =
  | 'ctr_outbox'
  | 'par_outbox'
  | 'fin_outbox'
  | 'auth_outbox'
  | 'par_email_outbox';

const loggerConsumerId = (
  env: Readonly<Record<string, string | undefined>>,
  fallback: string,
): string => {
  const fromEnv = env['OUTBOX_CONSUMER_ID'];
  return fromEnv !== undefined && fromEnv !== '' ? fromEnv : fallback;
};

/**
 * Consumidores registrados de cada outbox, resolvidos contra o ambiente.
 *
 * Recebe `env` por parâmetro (nunca lê `process.env` direto) porque é assim que o resto do
 * composition root deste repositório funciona, e porque torna o mapa testável sem variável global.
 */
export const registeredConsumers = (
  env: Readonly<Record<string, string | undefined>>,
): Readonly<Record<OutboxName, readonly string[]>> => ({
  // `outbox-logger-default` espelha `src/modules/contracts/worker/config.ts`.
  ctr_outbox: [loggerConsumerId(env, 'outbox-logger-default'), 'partners-contract-count'],
  // `partners-outbox-logger-default` espelha `src/modules/partners/worker/config.ts`.
  par_outbox: [loggerConsumerId(env, 'partners-outbox-logger-default'), 'financial-supplier-view'],
  fin_outbox: ['financial-payable-view'],
  auth_outbox: ['notifications-email-dispatch'],
  par_email_outbox: ['notifications-email-dispatch'],
});
