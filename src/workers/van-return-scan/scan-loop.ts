/**
 * Loop da varredura do prefixo de RETORNO da VAN (#753).
 *
 * Irmão do `van-status-scan`, e o paralelo é exato: nenhum dos dois consome outbox — a fila é um
 * prefixo de bucket escrito por um agente fora deste repositório (ADR-0060/0061). Não há linha para
 * dar claim, nem `attempts`, nem DLQ; o que substitui tudo isso é a idempotência do use case, que
 * relê o mesmo objeto a cada passagem.
 *
 * ⚠️ São varreduras SEPARADAS de propósito, e não duas metades de uma. Elas leem prefixos distintos
 * e respondem a perguntas distintas — `status/` resolve o desfecho de uma remessa NOSSA; `retorno/`
 * decide o que da caixa do CONVÊNIO tem direito de entrar. Fundi-las faria a falha de uma calar a
 * outra, e a caixa é compartilhada justamente na ponta onde não temos controle.
 *
 * O esqueleto (while + sleep + correlation) parece com o do irmão, e a repetição é deliberada: o que
 * cada arquivo tem de próprio é O QUE SE CONTA e O QUE SE LOGA, que é a maior parte deles. Um
 * `runPollLoop<S>` genérico com reducer parametrizado economizaria oito linhas e cobraria três
 * parâmetros de tipo em cada call site. O que de fato não se duplica — `sleep` e
 * `withNewCorrelation` — já é compartilhado.
 */
import process from 'node:process';

import { withNewCorrelation, currentCorrelationId } from '#src/shared/observability/correlation.ts';
import { sleep } from '#src/shared/runtime/sleep.ts';
import type {
  ScanVanReturnsError,
  ScanVanReturnsOutput,
} from '#src/modules/financial/application/use-cases/scan-van-returns.ts';
import type { Result } from '#src/shared/primitives/result.ts';

export type VanReturnScanDeps = Readonly<{
  scan: () => Promise<Result<ScanVanReturnsOutput, ScanVanReturnsError>>;
  tag: string;
  abortSignal?: AbortSignal;
}>;

export type VanReturnScanConfig = Readonly<{ pollIntervalMs: number }>;

export type VanReturnScanStats = Readonly<{
  rounds: number;
  processable: number;
  quarantined: number;
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
 * Uma passagem. Loga o que mudou a situação e devolve os números para o acumulador.
 *
 * Silêncio quando nada aconteceu é deliberado: de 5 em 5 minutos, uma linha por passagem seriam
 * ~288/dia dizendo "nada a fazer" — e o log que ninguém lê é onde o evento raro se esconde.
 *
 * ⚠️ A quarentena NÃO é logada item a item, e essa é a diferença de desenho em relação ao irmão: ela
 * é consultável (`fin_van_return_quarantine`), e o objeto sem envelope é o caso NORMAL de uma caixa
 * que é do convênio. Despejar a fila inteira a cada 5 minutos treinaria o leitor a ignorar o `⚠️` —
 * o log diz QUANTOS estão presos; quem quer saber quais pergunta à tabela.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- AbortSignal não é readonly-representável (mesma saída do `van-status-scan`).
export const scanReturnsOnce = async (deps: VanReturnScanDeps): Promise<VanReturnScanStats> => {
  const result = await deps.scan();

  if (!result.ok) {
    write(deps.tag, `varredura falhou: ${result.error}`);
    return { rounds: 1, processable: 0, quarantined: 0, anomalies: 0, errors: 1 };
  }

  const { processable, quarantined, missingObjects, unlogged, unreadable } = result.value;

  if (processable.length > 0) {
    write(deps.tag, `com proveniência conferida: ${String(processable.length)}`);
  }

  // Quantidade, não lista — ver o aviso acima. O motivo entra porque ele muda quem investiga:
  // `hash-mismatch` chama o dono do canal; `missing-provenance` em massa é sinal do agente.
  if (quarantined.length > 0) {
    const byReason = new Map<string, number>();
    for (const q of quarantined) byReason.set(q.reason, (byReason.get(q.reason) ?? 0) + 1);
    const resumo = [...byReason.entries()].map(([r, n]) => `${r}=${String(n)}`).join(' ');
    write(deps.tag, `⚠️ em quarentena: ${String(quarantined.length)} (${resumo})`);
  }

  // Envelope reivindica objeto que não está no bucket. Não é erro do agente nem nosso — é informação
  // sobre o bucket, e some da varredura se não for dita aqui.
  if (missingObjects.length > 0) {
    write(deps.tag, `⚠️ envelope sem objeto: ${missingObjects.join(', ')}`);
  }

  // O caso mais fácil de ler errado, e o mais caro se ignorado: o agente NÃO conseguiu ler o log do
  // ciclo, então processamos sem prova de origem. É sinal sobre a INSTALAÇÃO (padrão do log mal
  // configurado), não sobre os arquivos — e some sozinho quando alguém arruma o padrão.
  if (unlogged.length > 0) {
    write(
      deps.tag,
      `⚠️ processados SEM correlação com o log do ciclo (verificar o padrão do log na instalação): ${String(unlogged.length)}`,
    );
  }

  if (unreadable.length > 0) {
    write(deps.tag, `⚠️ objetos ilegíveis: ${unreadable.join(', ')}`);
  }

  return {
    rounds: 1,
    processable: processable.length,
    quarantined: quarantined.length,
    anomalies: missingObjects.length + unlogged.length + unreadable.length,
    errors: 0,
  };
};

/** Roda `scanReturnsOnce` até `abortSignal.aborted`, dormindo `pollIntervalMs` entre as passagens. */
export const runReturnScanLoop = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- idem `scanReturnsOnce`.
  deps: VanReturnScanDeps,
  config: VanReturnScanConfig,
): Promise<VanReturnScanStats> => {
  let totals: VanReturnScanStats = {
    rounds: 0,
    processable: 0,
    quarantined: 0,
    anomalies: 0,
    errors: 0,
  };

  while (deps.abortSignal?.aborted !== true) {
    // Correlation por passagem: as linhas de uma mesma varredura ficam amarráveis no log.
    const round = await withNewCorrelation(async () => scanReturnsOnce(deps));

    totals = {
      rounds: totals.rounds + round.rounds,
      processable: totals.processable + round.processable,
      quarantined: totals.quarantined + round.quarantined,
      anomalies: totals.anomalies + round.anomalies,
      errors: totals.errors + round.errors,
    };

    await sleep(config.pollIntervalMs, deps.abortSignal);
  }

  return totals;
};
