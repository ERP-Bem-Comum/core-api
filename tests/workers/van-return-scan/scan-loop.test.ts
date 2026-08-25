// O loop da varredura do retorno (#753) — o que ele conta, o que ele DIZ e o que ele cala.
//
// Espelha `van-status-scan/scan-loop.test.ts`. O que muda de assunto aqui é a decisão de não
// despejar a quarentena item a item: ela é consultável, e a fila é o caso normal de uma caixa que
// é do convênio.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { ok, err } from '#src/shared/index.ts';
import { scanReturnsOnce, runReturnScanLoop } from '#src/workers/van-return-scan/scan-loop.ts';
import type { ScanVanReturnsOutput } from '#src/modules/financial/application/use-cases/scan-van-returns.ts';

const EMPTY: ScanVanReturnsOutput = {
  processable: [],
  quarantined: [],
  missingObjects: [],
  unlogged: [],
  unreadable: [],
};

const TAG = '[van-return-scan] ';

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

const scanWith = (out: Partial<ScanVanReturnsOutput>) => async () =>
  Promise.resolve(ok({ ...EMPTY, ...out }));

describe('scanReturnsOnce — o que a passagem conta', () => {
  it('conta processáveis e quarentenados', async () => {
    const stats = await capturing(async () =>
      scanReturnsOnce({
        scan: scanWith({
          processable: ['retorno/A.RET'],
          quarantined: [{ key: 'retorno/B.RET', reason: 'missing-provenance' }],
        }),
        tag: TAG,
      }),
    );

    assert.equal(stats.rounds, 1);
    assert.equal(stats.processable, 1);
    assert.equal(stats.quarantined, 1);
    assert.equal(stats.errors, 0);
  });

  it('soma envelope-sem-objeto, sem-correlação e ilegível como anomalia', async () => {
    const stats = await capturing(async () =>
      scanReturnsOnce({
        scan: scanWith({
          missingObjects: ['retorno/SUMIU.RET'],
          unlogged: ['retorno/C.RET'],
          unreadable: ['retorno/D.RET'],
        }),
        tag: TAG,
      }),
    );

    assert.equal(stats.anomalies, 3);
    assert.equal(stats.quarantined, 0, 'anomalia não é quarentena');
  });

  it('erro da varredura conta como erro e não derruba a passagem', async () => {
    const stats = await capturing(async () =>
      scanReturnsOnce({
        scan: async () => Promise.resolve(err('van-returns-unavailable' as const)),
        tag: TAG,
      }),
    );

    assert.equal(stats.errors, 1);
    assert.equal(stats.rounds, 1);
  });

  it('passagem sem novidade não escreve nada — 288 linhas/dia de "nada a fazer" escondem o raro', async () => {
    const lines = await capturing(async (captured) => {
      await scanReturnsOnce({ scan: scanWith({}), tag: TAG });
      return captured;
    });

    assert.deepEqual(lines, []);
  });
});

describe('scanReturnsOnce — o que o log diz', () => {
  it('a quarentena sai como CONTAGEM POR MOTIVO, nunca item a item', async () => {
    const lines = await capturing(async (captured) => {
      await scanReturnsOnce({
        scan: scanWith({
          quarantined: [
            { key: 'retorno/A.RET', reason: 'missing-provenance' },
            { key: 'retorno/B.RET', reason: 'missing-provenance' },
            { key: 'retorno/C.RET', reason: 'hash-mismatch', expectedSha256: 'a'.repeat(64) },
          ],
        }),
        tag: TAG,
      });
      return captured;
    });

    const linha = lines.join('');
    assert.match(linha, /em quarentena: 3/);
    assert.match(linha, /missing-provenance=2/);
    assert.match(linha, /hash-mismatch=1/);
    // O motivo entra porque muda quem investiga; as chaves não, porque a tabela responde melhor —
    // e uma fila de centenas repetida a cada 5 minutos treinaria o leitor a ignorar o ⚠️.
    assert.doesNotMatch(linha, /retorno\/A\.RET/, 'a lista mora na tabela, não no log');
  });

  it('sem correlação com o log do ciclo aponta a INSTALAÇÃO, não os arquivos', async () => {
    const lines = await capturing(async (captured) => {
      await scanReturnsOnce({ scan: scanWith({ unlogged: ['retorno/A.RET'] }), tag: TAG });
      return captured;
    });

    // Quem lê esta linha precisa saber onde mexer. "Sem correlação" sozinho manda investigar o
    // arquivo, que é o lugar errado: o gatilho provável é o padrão do log na instalação.
    assert.match(lines.join(''), /padrão do log na instalação/);
  });
});

describe('runReturnScanLoop — ciclo de vida', () => {
  it('para quando o sinal aborta, e acumula o que viu', async () => {
    const controller = new AbortController();
    let calls = 0;

    const totals = await capturing(async () =>
      runReturnScanLoop(
        {
          scan: async () => {
            calls += 1;
            if (calls >= 2) controller.abort();
            return Promise.resolve(ok({ ...EMPTY, processable: ['retorno/A.RET'] }));
          },
          tag: TAG,
          abortSignal: controller.signal,
        },
        { pollIntervalMs: 1 },
      ),
    );

    assert.equal(totals.rounds, 2);
    assert.equal(totals.processable, 2, 'o acumulador soma as passagens');
  });

  it('sinal já abortado não executa passagem alguma', async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    const totals = await runReturnScanLoop(
      {
        scan: async () => {
          calls += 1;
          return Promise.resolve(ok(EMPTY));
        },
        tag: TAG,
        abortSignal: controller.signal,
      },
      { pollIntervalMs: 1 },
    );

    assert.equal(calls, 0);
    assert.equal(totals.rounds, 0);
  });
});
