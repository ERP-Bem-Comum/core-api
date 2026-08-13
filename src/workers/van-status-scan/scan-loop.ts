/**
 * Loop da varredura do `status/` da VAN.
 *
 * Diferente dos demais loops de `src/workers/`, este NÃO consome outbox: a fila dele é um prefixo de
 * bucket escrito por um agente que roda fora deste repositório (ADR-0060/0061). Não há linha para
 * dar claim, nem `attempts`, nem DLQ — o que substitui tudo isso é a idempotência do use case, que
 * relê o mesmo envelope a cada passagem e preserva o primeiro desfecho.
 *
 * A cadência espelha a do agente: ele executa a cada 5 minutos, então varrer muito mais rápido só
 * gastaria request contra o bucket para reler o que já foi lido.
 */
import process from 'node:process';

import { withNewCorrelation, currentCorrelationId } from '#src/shared/observability/correlation.ts';
import { sleep } from '#src/shared/runtime/sleep.ts';
import type {
  ConfirmRemittanceError,
  ConfirmRemittanceOutput,
} from '#src/modules/financial/application/use-cases/confirm-remittance.ts';
import type { Result } from '#src/shared/primitives/result.ts';

export type VanStatusScanDeps = Readonly<{
  confirm: () => Promise<Result<ConfirmRemittanceOutput, ConfirmRemittanceError>>;
  tag: string;
  abortSignal?: AbortSignal;
}>;

export type VanStatusScanConfig = Readonly<{ pollIntervalMs: number }>;

export type VanStatusScanStats = Readonly<{
  rounds: number;
  confirmed: number;
  failed: number;
  anomalies: number;
  errors: number;
}>;

const taggedLog = (baseTag: string): string => {
  const id = currentCorrelationId();
  return id === undefined ? baseTag : `${baseTag}(${id}) `;
};

const write = (tag: string, message: string): void => {
  process.stderr.write(`${taggedLog(tag)}${message}\n`);
};

/**
 * Uma passagem. Loga o resultado e devolve os números para o acumulador.
 *
 * Silêncio quando nada aconteceu é deliberado: rodando de 5 em 5 minutos, uma linha por passagem
 * seriam ~288 linhas/dia dizendo "nada a fazer" — e o log que ninguém lê é o log onde o evento raro
 * se esconde.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- AbortSignal não é readonly-representável (mesma saída do runLoop do outbox).
export const scanOnce = async (deps: VanStatusScanDeps): Promise<VanStatusScanStats> => {
  const result = await deps.confirm();

  if (!result.ok) {
    write(deps.tag, `varredura falhou: ${result.error}`);
    return { rounds: 1, confirmed: 0, failed: 0, anomalies: 0, errors: 1 };
  }

  const { confirmed, failed, unmatched, unreadable, conflicted } = result.value;

  if (confirmed.length > 0) {
    write(deps.tag, `confirmadas: ${confirmed.join(', ')}`);
  }
  // Falha da remessa é evento operacional de primeira ordem: ela NÃO libera os documentos, e alguém
  // precisa decidir entre reenviar (após descarte, com motivo) e investigar.
  if (failed.length > 0) {
    write(deps.tag, `⚠️ marcadas como falha (documentos seguem presos): ${failed.join(', ')}`);
  }

  // Envelope ilegível é defeito do canal — ou o agente mudou o formato, ou algo corrompeu o objeto.
  // Some da varredura sem deixar rastro se não for dito aqui.
  if (unreadable.length > 0) {
    write(deps.tag, `⚠️ envelopes ilegíveis: ${unreadable.join(', ')}`);
  }
  // Status tardio contra remessa já resolvida. Não é erro — o agregado recusou o rebaixamento, que é
  // o comportamento desejado —, mas contradição de fonte externa merece registro.
  if (conflicted.length > 0) {
    write(deps.tag, `⚠️ status conflitante (desfecho preservado): ${conflicted.join(', ')}`);
  }
  // Normal num bucket que pode ser compartilhado: arquivo que não é nosso. Fica em nível informativo
  // para não treinar ninguém a ignorar `⚠️`.
  if (unmatched.length > 0) {
    write(deps.tag, `status sem remessa correspondente: ${unmatched.join(', ')}`);
  }

  return {
    rounds: 1,
    confirmed: confirmed.length,
    failed: failed.length,
    anomalies: unreadable.length + conflicted.length,
    errors: 0,
  };
};

/** Roda `scanOnce` até `abortSignal.aborted`, dormindo `pollIntervalMs` entre as passagens. */
export const runScanLoop = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- idem `scanOnce`.
  deps: VanStatusScanDeps,
  config: VanStatusScanConfig,
): Promise<VanStatusScanStats> => {
  let totals: VanStatusScanStats = {
    rounds: 0,
    confirmed: 0,
    failed: 0,
    anomalies: 0,
    errors: 0,
  };

  while (deps.abortSignal?.aborted !== true) {
    // Correlation por passagem: as linhas de uma mesma varredura ficam amarráveis no log.
    const round = await withNewCorrelation(async () => scanOnce(deps));

    totals = {
      rounds: totals.rounds + round.rounds,
      confirmed: totals.confirmed + round.confirmed,
      failed: totals.failed + round.failed,
      anomalies: totals.anomalies + round.anomalies,
      errors: totals.errors + round.errors,
    };

    await sleep(config.pollIntervalMs, deps.abortSignal);
  }

  return totals;
};
