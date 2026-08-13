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

  it('registra a falha da varredura', async () => {
    const lines = await capturing(async (l) => {
      await scanOnce({
        confirm: async () => Promise.resolve(err('remittance-persist-failed' as const)),
        tag: TAG,
      });
      return l;
    });

    assert.match(lines.join(''), /varredura falhou: remittance-persist-failed/);
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
