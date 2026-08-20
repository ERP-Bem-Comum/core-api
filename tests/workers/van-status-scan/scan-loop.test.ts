import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { ok, err } from '#src/shared/index.ts';
import { scanOnce, runScanLoop } from '#src/workers/van-status-scan/scan-loop.ts';
import type { ConfirmRemittanceOutput } from '#src/modules/financial/application/use-cases/confirm-remittance.ts';

const EMPTY: ConfirmRemittanceOutput = {
  confirmed: [],
  failed: [],
  ignored: [],
  unmatched: [],
  unreadable: [],
  conflicted: [],
  persistFailed: [],
};

const TAG = '[van-status-scan] ';

// Captura o que o loop escreve, para provar o que ele diz e o que ele CALA.
const capturing = async <T>(fn: (lines: readonly string[]) => Promise<T>): Promise<T> => {
  const lines: string[] = [];
  const original = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    lines.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    return await fn(lines);
  } finally {
    process.stderr.write = original;
  }
};

const confirmWith = (out: Partial<ConfirmRemittanceOutput>) => async () =>
  Promise.resolve(ok({ ...EMPTY, ...out }));

describe('scanOnce — o que a passagem conta', () => {
  it('conta confirmadas e falhas', async () => {
    const stats = await capturing(async () =>
      scanOnce({ confirm: confirmWith({ confirmed: ['A.REM'], failed: ['B.REM'] }), tag: TAG }),
    );

    assert.equal(stats.rounds, 1);
    assert.equal(stats.confirmed, 1);
    assert.equal(stats.failed, 1);
    assert.equal(stats.errors, 0);
  });

  it('soma ilegíveis e conflitantes como anomalia', async () => {
    const stats = await capturing(async () =>
      scanOnce({
        confirm: confirmWith({ unreadable: ['status/x.json'], conflicted: ['C.REM'] }),
        tag: TAG,
      }),
    );

    assert.equal(stats.anomalies, 2);
  });

  // `unmatched` é normal num bucket que pode ser compartilhado — não infla o contador de anomalia.
  it('não conta `unmatched` como anomalia', async () => {
    const stats = await capturing(async () =>
      scanOnce({ confirm: confirmWith({ unmatched: ['DE_OUTRO.REM'] }), tag: TAG }),
    );

    assert.equal(stats.anomalies, 0);
  });

  // O worker não pode morrer porque o bucket piscou: a próxima passagem tenta de novo.
  it('erro da varredura vira contador, não exceção', async () => {
    const stats = await capturing(async () =>
      scanOnce({
        confirm: async () => Promise.resolve(err('van-status-unavailable' as const)),
        tag: TAG,
      }),
    );

    assert.equal(stats.errors, 1);
    assert.equal(stats.rounds, 1);
  });
});

describe('scanOnce — o que ele registra', () => {
  it('nomeia as remessas confirmadas', async () => {
    const lines = await capturing(async (l) => {
      await scanOnce({ confirm: confirmWith({ confirmed: ['A.REM'] }), tag: TAG });
      return l;
    });

    assert.ok(
      lines.some((l) => l.includes('confirmadas') && l.includes('A.REM')),
      `esperava a confirmação nomeada, veio ${JSON.stringify(lines)}`,
    );
  });

  it('marca falha e envelope ilegível com destaque', async () => {
    const lines = await capturing(async (l) => {
      await scanOnce({
        confirm: confirmWith({ failed: ['B.REM'], unreadable: ['status/x.json'] }),
        tag: TAG,
      });
      return l;
    });

    const joined = lines.join('');
    assert.match(joined, /⚠️.*B\.REM/, 'falha deveria sair com destaque');
    assert.match(joined, /⚠️.*status\/x\.json/, 'ilegível deveria sair com destaque');
  });

  // Rodando de 5 em 5 minutos, uma linha por passagem seriam ~288/dia dizendo "nada" — e o log que
  // ninguém lê é onde o evento raro se esconde.
  it('cala quando não há nada a dizer', async () => {
    const lines = await capturing(async (l) => {
      await scanOnce({ confirm: confirmWith({}), tag: TAG });
      return l;
    });

    assert.deepEqual(lines, [], `passagem vazia não deveria logar, logou ${JSON.stringify(lines)}`);
  });

  // Sobrou UM erro que aborta a passagem, e ele é da varredura: não deu para listar o prefixo.
  // Falha de uma chave não chega mais aqui (#782) — vai em `persistFailed` e as demais seguem.
  it('registra a falha da varredura', async () => {
    const lines = await capturing(async (l) => {
      await scanOnce({
        confirm: async () => Promise.resolve(err('van-status-unavailable' as const)),
        tag: TAG,
      });
      return l;
    });

    assert.match(lines.join(''), /varredura falhou: van-status-unavailable/);
  });

  // O sintoma antigo era uma linha a cada 5 minutos dizendo que "a varredura falhou", SEM dizer qual
  // objeto — o erro era do use case, não da chave, e diagnosticar exigia ler o bucket na mão.
  it('nomeia a chave que não persistiu, e diz que as demais seguiram', async () => {
    const lines = await capturing(async (l) => {
      await scanOnce({
        confirm: confirmWith({
          persistFailed: [
            { key: 'status/PAG.REM.json', error: 'remittance-repository-unavailable' },
          ],
          confirmed: ['OUTRA.REM'],
        }),
        tag: TAG,
      });
      return l;
    });

    const saida = lines.join('');
    assert.match(saida, /status\/PAG\.REM\.json/, 'a chave precisa aparecer');
    assert.match(saida, /remittance-repository-unavailable/, 'e o motivo junto dela');
    assert.match(saida, /as demais seguiram/);
  });

  it('conta a falha de persistência como anomalia', async () => {
    const stats = await capturing(async () =>
      scanOnce({
        confirm: confirmWith({ persistFailed: [{ key: 'status/x.json', error: 'boom' }] }),
        tag: TAG,
      }),
    );

    assert.equal(stats.anomalies, 1);
    assert.equal(stats.errors, 0, 'não é erro da varredura — a passagem completou');
  });
});

describe('runScanLoop — ciclo de vida', () => {
  it('para quando o sinal aborta, e acumula o que viu', async () => {
    const controller = new AbortController();
    let calls = 0;

    const stats = await capturing(async () =>
      runScanLoop(
        {
          confirm: async () => {
            calls += 1;
            // Aborta na terceira passagem: prova que o loop repete e que o sinal o encerra.
            if (calls >= 3) controller.abort();
            return Promise.resolve(ok({ ...EMPTY, confirmed: [`R${String(calls)}.REM`] }));
          },
          tag: TAG,
          abortSignal: controller.signal,
        },
        { pollIntervalMs: 1 },
      ),
    );

    assert.equal(calls, 3);
    assert.equal(stats.rounds, 3);
    assert.equal(stats.confirmed, 3);
  });

  // Falha isolada é ruído normal (deadlock, indisponibilidade). Falha que se repete é outra coisa:
  // aquele objeto NUNCA vai passar. Sem a distinção, a mesma linha a cada 5 minutos treina o time a
  // ignorá-la — que é como o evento raro se esconde no log que ninguém lê.
  it('a chave que falha SEMPRE ganha linha própria, e só a partir da terceira passagem', async () => {
    const controller = new AbortController();
    let calls = 0;

    const lines = await capturing(async (l) => {
      await runScanLoop(
        {
          confirm: async () => {
            calls += 1;
            if (calls >= 4) controller.abort();
            return Promise.resolve(
              ok({ ...EMPTY, persistFailed: [{ key: 'status/travada.json', error: 'boom' }] }),
            );
          },
          tag: TAG,
          abortSignal: controller.signal,
        },
        { pollIntervalMs: 1 },
      );
      return l;
    });

    const repetidas = lines.filter((x) => x.includes('falha SEMPRE'));
    assert.equal(repetidas.length, 1, 'o alarme escala UMA vez, não a cada passagem');
    assert.match(repetidas[0] ?? '', /status\/travada\.json/);
  });

  it('chave que volta a passar zera o contador — aviso que não desliga não vale nada', async () => {
    const controller = new AbortController();
    let calls = 0;

    const lines = await capturing(async (l) => {
      await runScanLoop(
        {
          confirm: async () => {
            calls += 1;
            // Cinco passagens: falha, falha, CURA, falha, falha. A cura zera, então a maior sequência
            // é DOIS — nunca chega ao limiar. Rodar seis reintroduziria a terceira falha seguida e o
            // alarme escalaria com razão, medindo o oposto do que este caso afirma.
            if (calls >= 5) controller.abort();
            const falha = calls !== 3;
            return Promise.resolve(
              ok({
                ...EMPTY,
                persistFailed: falha ? [{ key: 'status/intermitente.json', error: 'boom' }] : [],
              }),
            );
          },
          tag: TAG,
          abortSignal: controller.signal,
        },
        { pollIntervalMs: 1 },
      );
      return l;
    });

    assert.equal(
      lines.filter((x) => x.includes('falha SEMPRE')).length,
      0,
      'intermitente não é travada — escalar aqui seria alarme falso',
    );
  });

  // Sem isto, um SIGTERM durante o sono só teria efeito quando o timer de 5 min vencesse.
  it('sinal já abortado não executa passagem alguma', async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    const stats = await capturing(async () =>
      runScanLoop(
        {
          confirm: async () => {
            calls += 1;
            return Promise.resolve(ok(EMPTY));
          },
          tag: TAG,
          abortSignal: controller.signal,
        },
        { pollIntervalMs: 60_000 },
      ),
    );

    assert.equal(calls, 0);
    assert.equal(stats.rounds, 0);
  });
});
