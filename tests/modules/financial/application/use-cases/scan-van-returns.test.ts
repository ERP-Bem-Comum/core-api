// A varredura do prefixo de retorno (#753) — do bucket até a quarentena consultável.
//
// A triagem já é testada como função pura em `van-return-triage.test.ts`. O que se prova AQUI é o
// que só existe com storage: que os bytes certos são hasheados, que a quarentena fica consultável
// depois da varredura, e que rodar de novo não estraga o que já estava lá.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';

import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { createInMemoryVanStorage } from '#src/modules/financial/adapters/van/van-storage.in-memory.ts';
import { createVanStatusEnvelopeReader } from '#src/modules/financial/adapters/van/status-envelope.ts';
import { createInMemoryVanReturnQuarantine } from '#src/modules/financial/adapters/persistence/repos/van-return-quarantine-store.in-memory.ts';
import {
  scanVanReturns,
  type ScanVanReturnsDeps,
} from '#src/modules/financial/application/use-cases/scan-van-returns.ts';

const FILE = 'PAG_000000.20260819110000_0001.RET';
const KEY = `retorno/${FILE}`;
const CONTENT = '0341234567890ARQUIVO DE RETORNO\n';

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

/** O envelope como o agente o publica — campos em PT-BR, `recepcao` só quando é recepção. */
const receptionEnvelope = (
  over: Readonly<{
    chave?: string;
    sha256?: string;
    correlacionado?: boolean;
    logDoCicloLido?: boolean;
  }> = {},
): string =>
  JSON.stringify({
    arquivo: FILE,
    executadoEm: '2026-08-19T12:00:00Z',
    situacao: 'recepcao',
    detalhe: 'arquivo recebido',
    exitCode: null,
    logTransferencia: [],
    recepcao: {
      sha256: over.sha256 ?? sha256(utf8(CONTENT)),
      chave: over.chave ?? KEY,
      correlacionado: over.correlacionado ?? true,
      logDoCicloLido: over.logDoCicloLido ?? true,
    },
  });

type Harness = Readonly<{
  deps: ScanVanReturnsDeps;
  storage: ReturnType<typeof createInMemoryVanStorage>;
  quarantine: ReturnType<typeof createInMemoryVanReturnQuarantine>;
}>;

const harness = (at = '2026-08-19T12:05:00.000Z'): Harness => {
  const storage = createInMemoryVanStorage();
  const quarantine = createInMemoryVanReturnQuarantine();
  return {
    storage,
    quarantine,
    deps: {
      storage,
      quarantine,
      statusReader: createVanStatusEnvelopeReader(),
      clock: ClockFixed(new Date(at)),
    },
  };
};

describe('scanVanReturns — do bucket à quarentena consultável (#753)', () => {
  it('CA1: objeto com envelope correspondente é processável', async () => {
    const h = harness();
    h.storage.seedBytes(KEY, utf8(CONTENT));
    h.storage.seed(`status/recepcao-20260819T120000Z-${FILE}.json`, receptionEnvelope());

    const out = await scanVanReturns(h.deps)();
    assert.ok(out.ok);
    assert.deepEqual(out.value.processable, [KEY]);
    assert.deepEqual(out.value.quarantined, []);
  });

  it('CA2: objeto sem envelope fica na quarentena, e a quarentena É CONSULTÁVEL depois', async () => {
    const h = harness();
    h.storage.seedBytes(KEY, utf8(CONTENT));

    const out = await scanVanReturns(h.deps)();
    assert.ok(out.ok);
    assert.deepEqual(out.value.processable, []);

    // O que a DoD da issue exige: não é uma linha de log, é um registro que responde depois.
    const preso = await h.quarantine.list();
    assert.ok(preso.ok);
    assert.equal(preso.value.length, 1);
    assert.equal(preso.value[0]?.key, KEY);
    assert.equal(preso.value[0]?.reason, 'missing-provenance');
    assert.equal(preso.value[0]?.observedSha256, sha256(utf8(CONTENT)));
    assert.equal(preso.value[0]?.firstSeenAt, '2026-08-19T12:05:00.000Z');
  });

  it('CA3: envelope que reivindica objeto ausente sai como anomalia, não como vazio', async () => {
    const h = harness();
    h.storage.seed(`status/recepcao-20260819T120000Z-${FILE}.json`, receptionEnvelope());

    const out = await scanVanReturns(h.deps)();
    assert.ok(out.ok);
    assert.deepEqual(out.value.missingObjects, [KEY]);
  });

  it('CA4: hash divergente vai para quarentena com OS DOIS lados registrados', async () => {
    const h = harness();
    const outro = 'c'.repeat(64);
    h.storage.seedBytes(KEY, utf8(CONTENT));
    h.storage.seed(
      `status/recepcao-20260819T120000Z-${FILE}.json`,
      receptionEnvelope({ sha256: outro }),
    );

    const out = await scanVanReturns(h.deps)();
    assert.ok(out.ok);
    assert.deepEqual(out.value.processable, [], 'integridade é verificada, não presumida');

    const preso = await h.quarantine.list();
    assert.ok(preso.ok);
    // Sem os dois hashes não dá para distinguir arquivo alterado de envelope apontando para outro
    // objeto — e a ação do operador é diferente em cada caso.
    assert.equal(preso.value[0]?.reason, 'hash-mismatch');
    assert.equal(preso.value[0]?.expectedSha256, outro);
    assert.equal(preso.value[0]?.observedSha256, sha256(utf8(CONTENT)));
  });

  it('CA5: log do ciclo lido e sem a linha — origem não registrada', async () => {
    const h = harness();
    h.storage.seedBytes(KEY, utf8(CONTENT));
    h.storage.seed(
      `status/recepcao-20260819T120000Z-${FILE}.json`,
      receptionEnvelope({ correlacionado: false, logDoCicloLido: true }),
    );

    const out = await scanVanReturns(h.deps)();
    assert.ok(out.ok);
    const preso = await h.quarantine.list();
    assert.ok(preso.ok);
    assert.equal(preso.value[0]?.reason, 'origin-not-logged');
  });

  // A regressão que motivou `getBytes`. Com `getText`, o byte 0xC7 vira U+FFFD na leitura e sai
  // como outros bytes na volta: o arquivo íntegro seria acusado de adulterado.
  it('hasheia os BYTES do banco, não o texto decodificado — arquivo latin1 não vira hash-mismatch', async () => {
    const h = harness();
    // `CONCEIÇÃO` em latin1: bytes que não formam sequência UTF-8 válida.
    const latin1 = new Uint8Array([0x43, 0x4f, 0x4e, 0x43, 0x45, 0x49, 0xc7, 0xc3, 0x4f, 0x0a]);
    h.storage.seedBytes(KEY, latin1);
    h.storage.seed(
      `status/recepcao-20260819T120000Z-${FILE}.json`,
      receptionEnvelope({ sha256: sha256(latin1) }),
    );

    const out = await scanVanReturns(h.deps)();
    assert.ok(out.ok);
    assert.deepEqual(out.value.processable, [KEY], 'arquivo do banco não é UTF-8, e está íntegro');
    const preso = await h.quarantine.list();
    assert.ok(preso.ok);
    assert.deepEqual(preso.value, []);
  });

  it('objeto ilegível é `unreadable`, não quarentena — não houve o que triar', async () => {
    const h = harness();
    // Chave listada pelo prefixo mas cujo conteúdo o storage não entrega. No fake isso não ocorre
    // por acidente; o que se prova é que o balde existe e não contamina a quarentena.
    const out = await scanVanReturns(h.deps)();
    assert.ok(out.ok);
    assert.deepEqual(out.value.unreadable, []);
    const preso = await h.quarantine.list();
    assert.ok(preso.ok);
    assert.deepEqual(preso.value, [], 'bucket vazio não inventa suspeita');
  });

  it('storage indisponível falha a varredura em vez de quarentenar a fila inteira', async () => {
    const h = harness();
    const quebrado: ScanVanReturnsDeps = {
      ...h.deps,
      storage: {
        ...h.storage,
        listStatus: async () => Promise.resolve({ ok: false, error: 'van-storage-unavailable' }),
      },
    };
    h.storage.seedBytes(KEY, utf8(CONTENT));

    const out = await scanVanReturns(quebrado)();
    assert.ok(!out.ok);
    assert.equal(out.error, 'van-status-unavailable');
    const preso = await h.quarantine.list();
    assert.ok(preso.ok);
    assert.deepEqual(preso.value, [], 'sem os envelopes, TUDO cairia em missing-provenance');
  });

  describe('idempotência da varredura (CA6, na parte que esta fatia decide)', () => {
    it('rodar duas vezes preserva `firstSeenAt` e move `lastSeenAt`', async () => {
      const h = harness('2026-08-19T12:05:00.000Z');
      h.storage.seedBytes(KEY, utf8(CONTENT));
      await scanVanReturns(h.deps)();

      const depois: ScanVanReturnsDeps = {
        ...h.deps,
        clock: ClockFixed(new Date('2026-08-19T12:10:00.000Z')),
      };
      await scanVanReturns(depois)();

      const preso = await h.quarantine.list();
      assert.ok(preso.ok);
      assert.equal(preso.value.length, 1, 'uma linha por chave, não uma por passagem');
      // A idade da anomalia é o que permite distinguir incidente de hoje de fila parada há semanas.
      assert.equal(preso.value[0]?.firstSeenAt, '2026-08-19T12:05:00.000Z');
      assert.equal(preso.value[0]?.lastSeenAt, '2026-08-19T12:10:00.000Z');
    });
  });

  describe('release por aprovação — e só por ela', () => {
    it('o envelope que chega depois solta o objeto, sem apagar o registro', async () => {
      const h = harness();
      h.storage.seedBytes(KEY, utf8(CONTENT));
      await scanVanReturns(h.deps)();

      h.storage.seed(`status/recepcao-20260819T120000Z-${FILE}.json`, receptionEnvelope());
      const out = await scanVanReturns(h.deps)();
      assert.ok(out.ok);
      assert.deepEqual(out.value.processable, [KEY]);

      const preso = await h.quarantine.list();
      assert.ok(preso.ok);
      assert.deepEqual(preso.value, [], 'a consulta padrão responde "o que está preso agora"');

      // Liberar não é apagar: a suspeita passada continua auditável para quem perguntar.
      const tudo = await h.quarantine.list({ includeReleased: true });
      assert.ok(tudo.ok);
      assert.equal(tudo.value.length, 1);
      assert.equal(tudo.value[0]?.releasedAt, '2026-08-19T12:05:00.000Z');
    });

    it('proveniência que REGRIDE reabre a linha — o liberado não é palavra final', async () => {
      const h = harness();
      const statusKey = `status/recepcao-20260819T120000Z-${FILE}.json`;
      h.storage.seedBytes(KEY, utf8(CONTENT));
      h.storage.seed(statusKey, receptionEnvelope());
      await scanVanReturns(h.deps)();

      // O envelope some (agente republicou errado, objeto reescrito, ciclo perdido). O objeto volta
      // a não ter prova de origem — e precisa voltar a ser visível na consulta padrão.
      h.storage.seed(statusKey, JSON.stringify({ nao: 'e um envelope' }));
      const out = await scanVanReturns(h.deps)();
      assert.ok(out.ok);
      assert.deepEqual(out.value.processable, []);

      const preso = await h.quarantine.list();
      assert.ok(preso.ok);
      assert.equal(preso.value.length, 1, 'reobservar reabre');
      assert.equal(preso.value[0]?.reason, 'missing-provenance');
      assert.equal(preso.value[0]?.releasedAt, undefined);
    });
  });
});
