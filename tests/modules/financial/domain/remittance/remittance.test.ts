import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
// W0 RED: o agregado Remittance ainda não existe.
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import {
  create,
  confirmTransmitted,
  markFailed,
  discard,
  holdsPayables,
  includes,
  payableIdsOf,
  documentIdsOf,
} from '#src/modules/financial/domain/remittance/remittance.ts';

const AT = '2026-08-11T14:00:00.000Z';
const LATER = '2026-08-11T14:05:00.000Z';

// Título + a nota de origem + a referência de G064 emitida por ele (#752). O formato do
// `yourNumber` é o que `referenceFor` produz: NSA (6) + posição do pagamento (6).
const pays = (...triples: readonly (readonly [string, string, string])[]) =>
  triples.map(([payableId, documentId, yourNumber]) => ({ payableId, documentId, yourNumber }));

const base = () => ({
  id: RemittanceId.generate(),
  cedenteAccountId: CedenteAccountId.generate(),
  nsa: 7,
  fileName: 'PAG_000000.11082026140000_000007.REM',
  contentHash: 'a'.repeat(64),
  payables: pays(['pay-1', 'doc-1', '000007000001'], ['pay-2', 'doc-2', '000007000002']),
  generatedAt: AT,
});

const queued = () => {
  const r = create(base());
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  return r.value;
};

describe('Remittance — nasce enfileirada, nunca transmitida', () => {
  // Gravar no bucket NÃO é transmitir. A remessa nasce `Queued` e só o `status/` do agente a move.
  it('create devolve Queued', () => {
    assert.equal(queued().status, 'Queued');
  });

  it('guarda os títulos que a compõem', () => {
    const r = queued();
    assert.equal(includes(r, 'pay-1'), true);
    assert.equal(includes(r, 'pay-3'), false);
  });

  // A REGRA que a mudança de grão introduz. O pai de valor líquido e a retenção de ISS são títulos
  // distintos da MESMA nota, com formas e vencimentos próprios, e nada impede que saiam no mesmo
  // arquivo. Enquanto a remessa prendia documentos, esta seleção legítima era recusada como
  // duplicata — e o operador teria de emitir dois arquivos para pagar uma nota só.
  it('dois títulos da MESMA nota entram na mesma remessa', () => {
    const r = create({
      ...base(),
      payables: pays(['pay-1', 'doc-1', '000007000001'], ['pay-2', 'doc-1', '000007000002']),
    });
    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
    assert.deepEqual([...payableIdsOf(r.value)], ['pay-1', 'pay-2']);
    // A nota aparece UMA vez: `documentIdsOf` deduplica, porque quem pergunta "quais notas esta
    // remessa tocou?" não quer a mesma repetida por título.
    assert.deepEqual([...documentIdsOf(r.value)], ['doc-1']);
  });

  it('recusa remessa sem título — envelope vazio o banco processa e ninguém recebe', () => {
    const r = create({ ...base(), payables: [] });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-without-payables');
  });

  it('recusa o MESMO título repetido na mesma remessa', () => {
    const r = create({
      ...base(),
      payables: pays(['pay-1', 'doc-1', '000007000001'], ['pay-1', 'doc-1', '000007000002']),
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-duplicated-payable');
  });

  // CA3 da #752. O `?? ''` do emissor produzia exatamente isto — um documento na remessa sem chave
  // de casamento — e o arquivo saía válido, aceito pelo banco. A recusa tem nome próprio para que o
  // defeito apareça na emissão, e não meses depois no primeiro retorno.
  it('recusa título sem referência de casamento, em vez de emitir em branco', () => {
    const r = create({
      ...base(),
      payables: pays(['pay-1', 'doc-1', '000007000001'], ['pay-2', 'doc-2', '']),
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-payable-without-reference');
  });

  it('recusa referência em branco disfarçada de espaço', () => {
    const r = create({ ...base(), payables: pays(['pay-1', 'doc-1', '   ']) });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-payable-without-reference');
  });

  // CA4/CA2. Dois documentos com a MESMA referência tornam o retorno ambíguo: o banco devolve uma
  // referência que aponta para dois títulos, e não há como decidir qual foi pago.
  it('recusa referência repetida — o retorno apontaria para dois títulos', () => {
    const r = create({
      ...base(),
      payables: pays(['pay-1', 'doc-1', '000007000001'], ['pay-2', 'doc-2', '000007000001']),
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-duplicated-reference');
  });

  it('recusa nome de arquivo ou hash vazios', () => {
    assert.ok(isErr(create({ ...base(), fileName: '' })));
    assert.ok(isErr(create({ ...base(), contentHash: '' })));
  });
});

describe('Remittance — só o status do agente decide o desfecho', () => {
  it('confirma transmissão a partir de Queued', () => {
    const r = confirmTransmitted(queued(), LATER, 'Arquivo consta em BACKUP');
    assert.ok(isOk(r));
    assert.equal(r.value.remittance.status, 'Transmitted');
    assert.equal(r.value.remittance.settledAt, LATER);
  });

  it('marca falha a partir de Queued', () => {
    const r = markFailed(queued(), LATER, 'Sem confirmacao');
    assert.ok(isOk(r));
    assert.equal(r.value.remittance.status, 'Failed');
  });

  // Idempotência: o mesmo objeto de status pode ser lido duas vezes (o agente não apaga nada, e a
  // varredura pode reprocessar). Confirmar duas vezes não pode virar erro operacional.
  it('confirmar uma remessa já transmitida é no-op, não erro', () => {
    const first = confirmTransmitted(queued(), LATER, 'ok');
    assert.ok(isOk(first));

    const second = confirmTransmitted(
      first.value.remittance,
      '2026-08-11T15:00:00.000Z',
      'ok de novo',
    );
    assert.ok(isOk(second));
    assert.equal(second.value.remittance.settledAt, LATER, 'mantém o primeiro desfecho');
  });

  // Uma remessa que o banco confirmou NÃO pode ser rebaixada para falha por leitura tardia.
  it('não rebaixa transmitida para falha', () => {
    const t = confirmTransmitted(queued(), LATER, 'ok');
    assert.ok(isOk(t));

    const f = markFailed(t.value.remittance, '2026-08-11T16:00:00.000Z', 'tardio');
    assert.ok(isErr(f));
    assert.equal(f.error, 'remittance-already-transmitted');
  });
});

describe('Remittance — o que ela anuncia', () => {
  it('confirmar emite RemittanceTransmitted com o que o consumidor precisa', () => {
    const r = confirmTransmitted(queued(), LATER, 'Arquivo consta em BACKUP');
    assert.ok(isOk(r));
    assert.equal(r.value.events.length, 1);

    const [event] = r.value.events;
    assert.equal(event?.type, 'RemittanceTransmitted');
    assert.equal(event?.settledAt, LATER);
    assert.equal(event?.detail, 'Arquivo consta em BACKUP');
    assert.equal(event?.nsa, queued().nsa);
    assert.equal(event?.fileName, queued().fileName);
    // Sem os documentos, "quais pagamentos saíram?" exigiria voltar ao nosso banco.
    //
    // O evento carrega só os IDS, não os pares com a referência (#752): o contrato do evento é
    // consumido fora do módulo, e a referência de G064 pertence ao casamento do retorno — que é
    // trabalho interno. Ampliar o payload publicaria vocabulário de layout num contrato de integração.
    assert.deepEqual(event?.payableIds, payableIdsOf(queued()));
  });

  it('falhar emite RemittanceFailed', () => {
    const r = markFailed(queued(), LATER, 'Sem confirmacao');
    assert.ok(isOk(r));
    assert.equal(r.value.events.length, 1);
    assert.equal(r.value.events[0]?.type, 'RemittanceFailed');
  });

  // A propriedade que sustenta a varredura de 5 em 5 minutos. Sem ela, o outbox cresceria sem teto
  // e qualquer consumidor anunciaria o mesmo pagamento para sempre.
  it('reconfirmar NÃO reemite — o desfecho já foi anunciado', () => {
    const first = confirmTransmitted(queued(), LATER, 'ok');
    assert.ok(isOk(first));
    assert.equal(first.value.events.length, 1);

    const second = confirmTransmitted(first.value.remittance, LATER, 'ok');
    assert.ok(isOk(second));
    assert.deepEqual(second.value.events, [], 'segunda leitura do mesmo status não reemite');
  });

  it('remarcar falha NÃO reemite', () => {
    const first = markFailed(queued(), LATER, 'sem confirmacao');
    assert.ok(isOk(first));

    const second = markFailed(first.value.remittance, LATER, 'sem confirmacao');
    assert.ok(isOk(second));
    assert.deepEqual(second.value.events, []);
  });

  // Escopo declarado: o descarte ainda não tem evento próprio. O teste existe para que a ausência
  // seja deliberada e visível, em vez de descoberta como surpresa por quem consumir o outbox.
  it('descartar ainda não emite evento', () => {
    const failed = markFailed(queued(), LATER, 'sem confirmacao');
    assert.ok(isOk(failed));

    const discarded = discard(failed.value.remittance, LATER, 'operador confirmou com o banco');
    assert.ok(isOk(discarded));
    assert.deepEqual(discarded.value.events, []);
  });
});

describe('Remittance — o que prende o documento', () => {
  // O CORAÇÃO desta fatia. Como o documento não vira `Transmitted` ao gravar no bucket, é a remessa
  // que impede a segunda inclusão. Sem isso, a próxima seleção pegaria o mesmo documento e o banco
  // receberia o pagamento duas vezes.
  it('remessa enfileirada prende os documentos', () => {
    assert.equal(holdsPayables(queued()), true);
  });

  it('remessa transmitida prende os documentos', () => {
    const r = confirmTransmitted(queued(), LATER, 'ok');
    assert.ok(isOk(r));
    assert.equal(holdsPayables(r.value.remittance), true);
  });

  // Falha NÃO libera. "Sem confirmação" não é "não transmitiu": pode ter saído e o status ter se
  // perdido. Liberar automaticamente reabriria o caminho para pagamento em dobro — e o agente
  // também não retransmite sozinho, pelo mesmo motivo.
  it('remessa em FALHA continua prendendo, até decisão humana', () => {
    const r = markFailed(queued(), LATER, 'sem confirmacao');
    assert.ok(isOk(r));
    assert.equal(holdsPayables(r.value.remittance), true);
  });

  it('só o descarte explícito libera os documentos', () => {
    const failed = markFailed(queued(), LATER, 'sem confirmacao');
    assert.ok(isOk(failed));

    const discarded = discard(
      failed.value.remittance,
      LATER,
      'operador confirmou com o banco que nao saiu',
    );
    assert.ok(isOk(discarded));
    assert.equal(discarded.value.remittance.status, 'Discarded');
    assert.equal(holdsPayables(discarded.value.remittance), false);
  });

  it('não descarta remessa transmitida', () => {
    const t = confirmTransmitted(queued(), LATER, 'ok');
    assert.ok(isOk(t));

    const d = discard(t.value.remittance, LATER, 'engano');
    assert.ok(isErr(d));
    assert.equal(d.error, 'remittance-already-transmitted');
  });

  it('descarte exige motivo — liberar pagamento sem registro é o que ninguém consegue auditar', () => {
    const failed = markFailed(queued(), LATER, 'sem confirmacao');
    assert.ok(isOk(failed));

    const d = discard(failed.value.remittance, LATER, '   ');
    assert.ok(isErr(d));
    assert.equal(d.error, 'remittance-discard-requires-reason');
  });
});
