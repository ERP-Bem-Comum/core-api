/**
 * DISCARD-REMITTANCE (#792, ADR-0065 §4) — o descarte devolve os títulos.
 *
 * A via de saída que a P.O. descreveu: depois de uma transmissão que falhou, o padrão do setor NÃO é
 * retentar pelo mesmo canal (o banco bloqueia duplicidade) — é tirar o título da VAN e pagá-lo à mão.
 * Este use case é o passo 3 dos cinco: falha → operador confere o banco → **devolve o título** →
 * paga no internet banking → baixa manual com a data real (#224).
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { discardRemittance } from '#src/modules/financial/application/use-cases/discard-remittance.ts';
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';
import { createInMemoryVanStorage } from '#src/modules/financial/adapters/van/van-storage.in-memory.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create, markFailed } from '#src/modules/financial/domain/remittance/remittance.ts';

const NOW = new Date(Date.UTC(2026, 7, 24, 18, 0, 0));
const FILE = 'PAG_000000.24082026180000_000001.REM';
const REASON = 'operador conferiu no banco: o arquivo nao chegou';

let seq = 0;
const build = (payableIds: readonly string[], fileName = FILE) => {
  seq += 1;
  const r = create({
    id: RemittanceId.generate(),
    cedenteAccountId: CedenteAccountId.generate(),
    nsa: seq,
    fileName,
    contentHash: 'a'.repeat(64),
    payables: payableIds.map((payableId, i) => ({
      payableId,
      documentId: `doc-of-${payableId}`,
      yourNumber: `${String(seq).padStart(6, '0')}${String(i + 1).padStart(6, '0')}`,
    })),
    generatedAt: '2026-08-24T17:00:00.000Z',
  });
  assert.ok(isOk(r));
  return r.value;
};

const approved = (ids: readonly string[]): Readonly<Record<string, 'Approved'>> =>
  Object.fromEntries(ids.map((id) => [id, 'Approved' as const]));

/**
 * Monta o cenário completo: títulos aprovados, remessa criada (o que já os transiciona a
 * `Transmitted`) e, opcionalmente, o objeto no bucket e a remessa em `Failed`.
 */
const setup = async (
  over: Partial<{ payableIds: readonly string[]; fileInBucket: boolean; failed: boolean }> = {},
) => {
  const payableIds = over.payableIds ?? ['pay-1', 'pay-2'];
  const remittances = createInMemoryRemittanceRepository({
    payableStatuses: approved(payableIds),
  });
  const storage = createInMemoryVanStorage();

  const remittance = build(payableIds);
  assert.equal((await remittances.save(remittance)).ok, true);

  if (over.fileInBucket ?? true) storage.seed(`saida/${FILE}`, 'conteudo');

  if (over.failed ?? true) {
    const f = markFailed(remittance, '2026-08-24T17:30:00.000Z', 'sem confirmacao');
    assert.ok(isOk(f));
    await remittances.save(f.value.remittance, f.value.events);
  }

  return {
    remittances,
    storage,
    remittanceId: String(remittance.id),
    payableIds,
    run: discardRemittance({ remittances, storage, now: () => NOW }),
  };
};

describe('discardRemittance — o caminho que devolve o título', () => {
  it('descarta a remessa em Failed e devolve os títulos a Aprovado', async () => {
    const s = await setup();

    const r = await s.run({ remittanceId: s.remittanceId, reason: REASON });

    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
    assert.deepEqual([...r.value.releasedPayableIds].sort(), [...s.payableIds].sort());

    for (const id of s.payableIds) {
      assert.equal(s.remittances.payableStatus(id), 'Approved', `título ${id} voltou à fila`);
    }
  });

  it('a remessa fica Descartada e para de prender', async () => {
    const s = await setup();
    assert.ok(isOk(await s.run({ remittanceId: s.remittanceId, reason: REASON })));

    const held = await s.remittances.findHeldPayables(s.payableIds);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, [], 'remessa descartada não prende');
  });

  // Os DOIS eventos, e não são duplicata: um anuncia o lote, o outro o item. Quem pergunta "esta
  // remessa foi descartada?" consome o primeiro; quem pergunta "este título voltou?" consome o
  // segundo, que é o projetado na trilha da nota (#823).
  it('emite RemittanceDiscarded (lote) e um PayableTransmissionDiscarded por título', async () => {
    const s = await setup();
    assert.ok(isOk(await s.run({ remittanceId: s.remittanceId, reason: REASON })));

    const publicados = s.remittances.published();
    const doLote = publicados.filter((e) => e.type === 'RemittanceDiscarded');
    const doTitulo = publicados.filter((e) => e.type === 'PayableTransmissionDiscarded');

    assert.equal(doLote.length, 1, 'um evento para a remessa');
    assert.equal(doTitulo.length, s.payableIds.length, 'um evento por título');

    for (const e of doTitulo) {
      assert.equal(e.reason, REASON, 'o motivo viaja em cada evento — é o que a auditoria lê');
      assert.equal(String(e.remittanceId), s.remittanceId);
      assert.ok(e.documentId.length > 0, 'a nota de origem viaja junto, para a trilha');
    }
  });

  it('o motivo é obrigatório — liberar valor sem registro é o que ninguém audita', async () => {
    const s = await setup();
    const r = await s.run({ remittanceId: s.remittanceId, reason: '   ' });

    assert.equal(isErr(r) ? r.error : null, 'remittance-discard-requires-reason');
    for (const id of s.payableIds) {
      assert.equal(s.remittances.payableStatus(id), 'Transmitted', 'nada foi devolvido');
    }
  });

  it('remessa inexistente → remittance-not-found', async () => {
    const s = await setup();
    const r = await s.run({
      remittanceId: '99999999-9999-4999-8999-999999999999',
      reason: REASON,
    });
    assert.equal(isErr(r) ? r.error : null, 'remittance-not-found');
  });

  it('id malformado nem chega ao banco', async () => {
    const s = await setup();
    const r = await s.run({ remittanceId: 'nao-e-uuid', reason: REASON });
    assert.equal(isErr(r) ? r.error : null, 'remittance-id-invalid');
  });
});

/**
 * A segunda porta de entrada (§4) e a guarda que a delimita.
 *
 * `Queued` sem arquivo é o resíduo do caminho que o §2 aceita: o `save` registrou e transicionou, o
 * upload falhou depois, e sobrou uma remessa que nunca existiu no bucket prendendo títulos. Sem esta
 * porta eles ficam presos para sempre — é o "produtor 1" da #787.
 */
describe('discardRemittance — Queued, e o que o arquivo decide (#787)', () => {
  it('Queued SEM arquivo em prefixo nenhum é descartável', async () => {
    const s = await setup({ failed: false, fileInBucket: false });

    const r = await s.run({
      remittanceId: s.remittanceId,
      reason: 'upload falhou; nada foi ao bucket',
    });

    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
    for (const id of s.payableIds) {
      assert.equal(s.remittances.payableStatus(id), 'Approved');
    }
  });

  // ⚠️ A guarda que impede pagamento em dobro. Objeto em `saida/` é pagamento que o agente ainda
  // pode transmitir: devolver o título ali o liberaria para entrar noutra remessa enquanto a
  // primeira caminha para o banco.
  it('Queued COM arquivo é recusada, e nenhum título é devolvido', async () => {
    const s = await setup({ failed: false, fileInBucket: true });

    const r = await s.run({ remittanceId: s.remittanceId, reason: 'quero cancelar' });

    assert.equal(isErr(r) ? r.error : null, 'remittance-discard-requires-failure');
    for (const id of s.payableIds) {
      assert.equal(s.remittances.payableStatus(id), 'Transmitted', 'segue preso, e é o certo');
    }
  });

  // Em `Failed` o transporte já se pronunciou: onde o arquivo parou não muda a decisão do operador,
  // que conferiu o banco. O teste fixa isso para que ninguém "unifique" as duas regras depois.
  it('em Failed, o arquivo presente NÃO impede o descarte', async () => {
    const s = await setup({ failed: true, fileInBucket: true });
    const r = await s.run({ remittanceId: s.remittanceId, reason: REASON });
    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  });
});

describe('discardRemittance — o que ele não pode alcançar', () => {
  // A restrição que o ADR-0065 §4 exige por escrito: a devolução alcança só os títulos que ESTA
  // remessa segura. Sem ela, o conserto abriria pela porta da frente o buraco que o #814 fechou.
  it('não devolve título que outra remessa viva segura', async () => {
    const remittances = createInMemoryRemittanceRepository({
      payableStatuses: approved(['meu', 'alheio']),
    });
    const storage = createInMemoryVanStorage();

    const minha = build(['meu']);
    const outra = build(['alheio'], 'PAG_000000.24082026180000_000002.REM');
    await remittances.save(minha);
    await remittances.save(outra);

    const f = markFailed(minha, '2026-08-24T17:30:00.000Z', 'sem confirmacao');
    assert.ok(isOk(f));
    await remittances.save(f.value.remittance, f.value.events);

    const r = await discardRemittance({ remittances, storage, now: () => NOW })({
      remittanceId: String(minha.id),
      reason: REASON,
    });

    assert.ok(isOk(r));
    assert.equal(remittances.payableStatus('meu'), 'Approved');
    assert.equal(
      remittances.payableStatus('alheio'),
      'Transmitted',
      'título de outra remessa viva não é tocado',
    );
  });

  // Título já pago não volta: o CAS é `WHERE status='Transmitted'`. É a resposta à preocupação que a
  // P.O. levantou — descartar uma remessa cujos títulos o banco pagou devolveria pagamento
  // consumado à fila, candidato a sair de novo.
  it('não devolve título que já foi pago', async () => {
    const s = await setup({ payableIds: ['pago', 'pendente'] });
    s.remittances.setPayableStatus('pago', 'Paid');

    const r = await s.run({ remittanceId: s.remittanceId, reason: REASON });

    assert.ok(isOk(r));
    assert.equal(s.remittances.payableStatus('pago'), 'Paid', 'pagamento consumado não volta');
    assert.equal(s.remittances.payableStatus('pendente'), 'Approved');
  });

  // Remessa que o agente confirmou não é descartável: o desfecho positivo é o mais caro de perder.
  it('não descarta remessa já Transmitida pelo agente', async () => {
    const remittances = createInMemoryRemittanceRepository({ payableStatuses: approved(['p']) });
    const storage = createInMemoryVanStorage();
    const rem = build(['p']);
    await remittances.save(rem);

    const { confirmTransmitted } =
      await import('#src/modules/financial/domain/remittance/remittance.ts');
    const t = confirmTransmitted(rem, '2026-08-24T17:30:00.000Z', 'consta em BACKUP');
    assert.ok(isOk(t));
    await remittances.save(t.value.remittance, t.value.events);

    const r = await discardRemittance({ remittances, storage, now: () => NOW })({
      remittanceId: String(rem.id),
      reason: REASON,
    });

    assert.equal(isErr(r) ? r.error : null, 'remittance-already-transmitted');
    assert.equal(remittances.payableStatus('p'), 'Transmitted');
  });
});
