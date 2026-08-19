// Os critérios de aceite da #753 — o que tem direito de ser processado do prefixo de retorno.
//
// A triagem é função pura, então estes testes não simulam bucket nenhum: montam envelopes e objetos
// e afirmam o balde. O que exige storage é a fatia seguinte (listar, ler, hashear).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  triageVanReturns,
  type ReturnObject,
} from '#src/modules/financial/application/van-return-triage.ts';
import type {
  VanReceptionProvenance,
  VanStatus,
} from '#src/modules/financial/application/ports/van-status-reader.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const KEY_A = 'retorno/PAG_000000.20260819110000_0001.RET';

/** Envelope de recepção, com a proveniência completa por padrão. */
const reception = (over: Partial<VanReceptionProvenance> = {}): VanStatus => ({
  kind: 'reception',
  fileName: 'PAG_000000.20260819110000_0001.RET',
  executedAt: '2026-08-19T12:00:00Z',
  situation: 'recepcao',
  detail: '',
  exitCode: null,
  logLines: [],
  reception: { sha256: HASH_A, key: KEY_A, correlated: true, cycleLogRead: true, ...over },
});

const object = (key: string, sha256: string): ReturnObject => ({ key, sha256 });

describe('van-return-triage — o que tem direito de entrar (#753)', () => {
  it('CA1: objeto com envelope correspondente é processado', () => {
    const t = triageVanReturns([object(KEY_A, HASH_A)], [reception()]);
    assert.deepEqual(
      t.processable.map((p) => p.key),
      [KEY_A],
    );
    assert.deepEqual(t.quarantined, []);
  });

  it('CA2: objeto sem envelope vai para quarentena com motivo nomeado', () => {
    const t = triageVanReturns([object(KEY_A, HASH_A)], []);
    assert.deepEqual(t.quarantined, [{ key: KEY_A, reason: 'missing-provenance' }]);
    assert.deepEqual(t.processable, [], 'não pode ser processado');
  });

  it('CA3: envelope sem o objeto correspondente é registrado como anomalia', () => {
    const t = triageVanReturns([], [reception()]);
    assert.deepEqual(t.missingObjects, [KEY_A]);
    assert.deepEqual(t.processable, []);
  });

  it('CA4: hash divergente impede o processamento e é reportado', () => {
    const t = triageVanReturns([object(KEY_A, HASH_B)], [reception({ sha256: HASH_A })]);
    assert.deepEqual(t.quarantined, [{ key: KEY_A, reason: 'hash-mismatch' }]);
    assert.deepEqual(t.processable, [], 'integridade é verificada, não presumida');
  });

  it('CA5: log do ciclo lido e sem a linha — origem não registrada, vai para quarentena', () => {
    const t = triageVanReturns(
      [object(KEY_A, HASH_A)],
      [reception({ correlated: false, cycleLogRead: true })],
    );
    assert.deepEqual(t.quarantined, [{ key: KEY_A, reason: 'origin-not-logged' }]);
  });

  // A correção que o van-agent trouxe no PR #12, e que muda o CA5 escrito na issue.
  describe('quando o log do ciclo NÃO foi lido, o agente não sabe', () => {
    const semLog = reception({ correlated: false, cycleLogRead: false });

    it('processa em vez de quarentenar', () => {
      const t = triageVanReturns([object(KEY_A, HASH_A)], [semLog]);
      assert.deepEqual(
        t.processable.map((p) => p.key),
        [KEY_A],
      );
      assert.deepEqual(t.quarantined, []);
    });

    it('mas alarma — a operação precisa saber que a correlação não funcionou', () => {
      const t = triageVanReturns([object(KEY_A, HASH_A)], [semLog]);
      assert.deepEqual(t.unlogged, [KEY_A]);
    });

    // O motivo de não quarentenar: o gatilho mais provável é configuração, não arquivo suspeito.
    // Com o glob errado, TODO retorno sai assim — e represar pagamento confirmado por causa de um
    // padrão de log é o mais caro dos dois erros.
    it('vale para a fila inteira, que é o caso do glob mal configurado', () => {
      const outra = 'retorno/PAG_000000.20260819120000_0002.RET';
      const t = triageVanReturns(
        [object(KEY_A, HASH_A), object(outra, HASH_B)],
        [semLog, reception({ key: outra, sha256: HASH_B, correlated: false, cycleLogRead: false })],
      );
      assert.equal(t.processable.length, 2);
      assert.equal(t.unlogged.length, 2);
      assert.deepEqual(t.quarantined, []);
    });
  });

  // P3 do van-agent: o nome é opaco, colisão gera chave desempatada. Casar por nome perde objeto.
  it('casa por CHAVE, não por nome do arquivo', () => {
    const desempatada = `${KEY_A}.1`;
    const t = triageVanReturns(
      [object(desempatada, HASH_A)],
      [reception({ key: desempatada })], // mesmo fileName, chave diferente
    );
    assert.deepEqual(
      t.processable.map((p) => p.key),
      [desempatada],
      'o objeto foi encontrado pela chave que o envelope declara',
    );
  });

  // Envelope de versão anterior ao PR #12 não traz `recepcao`. Para quem consome, "sem prova de
  // origem" é o mesmo que não ter envelope — e o default seguro é quarentena, nunca processamento.
  it('envelope sem proveniência não autoriza processamento', () => {
    const antigo: VanStatus = {
      kind: 'reception',
      fileName: 'PAG_000000.20260819110000_0001.RET',
      executedAt: '2026-08-19T12:00:00Z',
      situation: 'recepcao',
      detail: '',
      exitCode: null,
      logLines: [],
    };
    const t = triageVanReturns([object(KEY_A, HASH_A)], [antigo]);
    assert.deepEqual(t.quarantined, [{ key: KEY_A, reason: 'missing-provenance' }]);
  });

  // Envelope de remessa não é prova de recepção — se entrasse no índice, um status de transmissão
  // autorizaria processar um arquivo de retorno.
  it('ignora envelopes que não são de recepção', () => {
    const remessa: VanStatus = {
      kind: 'remittance',
      fileName: 'PAG_000000.20260819110000_0001.REM',
      executedAt: '2026-08-19T12:00:00Z',
      situation: 'transmitido',
      detail: '',
      exitCode: 0,
      logLines: [],
      reception: { sha256: HASH_A, key: KEY_A, correlated: true, cycleLogRead: true },
    };
    const t = triageVanReturns([object(KEY_A, HASH_A)], [remessa]);
    assert.deepEqual(t.quarantined, [{ key: KEY_A, reason: 'missing-provenance' }]);
  });

  it('separa os baldes num lote misto, sem perder nenhum objeto', () => {
    const comProva = KEY_A;
    const semProva = 'retorno/DESCONHECIDO.RET';
    const corrompido = 'retorno/CORROMPIDO.RET';
    const ausente = 'retorno/SO_ENVELOPE.RET';

    const t = triageVanReturns(
      [object(comProva, HASH_A), object(semProva, HASH_B), object(corrompido, HASH_B)],
      [
        reception(),
        reception({ key: corrompido, sha256: HASH_A }),
        reception({ key: ausente, sha256: HASH_A }),
      ],
    );

    assert.deepEqual(
      t.processable.map((p) => p.key),
      [comProva],
    );
    assert.deepEqual(t.quarantined, [
      { key: semProva, reason: 'missing-provenance' },
      { key: corrompido, reason: 'hash-mismatch' },
    ]);
    assert.deepEqual(t.missingObjects, [ausente]);
    assert.equal(
      t.processable.length + t.quarantined.length,
      3,
      'todo objeto lido termina em algum balde — nada some em silêncio',
    );
  });
});
