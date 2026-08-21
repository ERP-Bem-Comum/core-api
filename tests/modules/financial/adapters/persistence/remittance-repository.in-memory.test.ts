import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create,
  markFailed,
  discard,
  confirmTransmitted,
} from '#src/modules/financial/domain/remittance/remittance.ts';

let seq = 0;
const build = (payableIds: readonly string[]) => {
  seq += 1;
  const r = create({
    id: RemittanceId.generate(),
    cedenteAccountId: CedenteAccountId.generate(),
    nsa: seq,
    fileName: `PAG_1.1108202614000${seq}_00000${seq}.REM`,
    contentHash: 'a'.repeat(64),
    // A referência de G064 (#752) sai de NSA + posição. Derivada aqui do mesmo `seq` que numera a
    // remessa, para que duas remessas do fixture nunca colidam — que é a invariante do CA4.
    // Cada id do fixture nomeia UM título; a nota de origem recebe o mesmo valor porque estes casos
    // medem o vínculo remessa→título, não o agrupamento por nota.
    payables: payableIds.map((payableId, i) => ({
      payableId,
      documentId: payableId,
      yourNumber: `${String(seq).padStart(6, '0')}${String(i + 1).padStart(6, '0')}`,
    })),
    generatedAt: '2026-08-11T14:00:00.000Z',
  });
  assert.ok(isOk(r));
  return r.value;
};

describe('RemittanceRepository (fake) — round-trip', () => {
  it('salva e recupera por id e por nome de arquivo', async () => {
    const repo = createInMemoryRemittanceRepository();
    const rem = build(['doc-1']);

    assert.equal((await repo.save(rem)).ok, true);

    const byId = await repo.findById(rem.id);
    assert.ok(isOk(byId) && byId.value !== null);
    assert.equal(byId.value.fileName, rem.fileName);

    const byName = await repo.findByFileName(rem.fileName);
    assert.ok(isOk(byName) && byName.value !== null);
    assert.equal(byName.value.id, rem.id);
  });
});

describe('RemittanceRepository (fake) — quem está preso', () => {
  // A consulta que a SELEÇÃO faz antes de montar remessa nova. É ela que substitui a transição
  // imediata para `Transmitted` e impede o mesmo documento de sair duas vezes.
  it('remessa enfileirada prende seus documentos', async () => {
    const repo = createInMemoryRemittanceRepository();
    await repo.save(build(['doc-1', 'doc-2']));

    const held = await repo.findHeldPayableIds(['doc-1', 'doc-2', 'doc-3']);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, ['doc-1', 'doc-2']);
  });

  it('remessa transmitida continua prendendo', async () => {
    const repo = createInMemoryRemittanceRepository();
    const rem = build(['doc-1']);
    const t = confirmTransmitted(rem, '2026-08-11T14:05:00.000Z', 'ok');
    assert.ok(isOk(t));
    await repo.save(t.value.remittance, t.value.events);

    const held = await repo.findHeldPayableIds(['doc-1']);
    assert.ok(isOk(held) && held.value.length === 1);
  });

  // "Sem confirmação" não é "não transmitiu": o arquivo pode ter saído e o status ter se perdido.
  it('remessa em FALHA continua prendendo', async () => {
    const repo = createInMemoryRemittanceRepository();
    const f = markFailed(build(['doc-1']), '2026-08-11T14:05:00.000Z', 'sem confirmacao');
    assert.ok(isOk(f));
    await repo.save(f.value.remittance, f.value.events);

    const held = await repo.findHeldPayableIds(['doc-1']);
    assert.ok(isOk(held) && held.value.length === 1);
  });

  it('só o descarte devolve o documento para a fila', async () => {
    const repo = createInMemoryRemittanceRepository();
    const f = markFailed(build(['doc-1']), '2026-08-11T14:05:00.000Z', 'sem confirmacao');
    assert.ok(isOk(f));
    const d = discard(
      f.value.remittance,
      '2026-08-11T15:00:00.000Z',
      'confirmado com o banco que nao saiu',
    );
    assert.ok(isOk(d));
    await repo.save(d.value.remittance, d.value.events);

    const held = await repo.findHeldPayableIds(['doc-1']);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, []);
  });

  it('lista vazia não consulta nada e devolve vazio', async () => {
    const repo = createInMemoryRemittanceRepository();
    const held = await repo.findHeldPayableIds([]);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, []);
  });
});

// #789 — a trava anti-dupla-emissão não pode viver só na consulta do use case.
//
// `findHeldPayableIds` responde sobre o passado: entre a resposta dela e a gravação cabe a tradução
// CNAB inteira, e duas emissões concorrentes leem "livre" antes de qualquer uma gravar. Quem fecha a
// janela é o próprio `save`, que reconfere o hold no mesmo ato em que grava.
//
// O fake espelha a SEMÂNTICA, não o mecanismo: no adapter real a exclusão vem de lock de linha, aqui
// de uma checagem síncrona. Um fake que aceitasse o que o banco recusa deixaria a suíte verde
// descrevendo produção errado — que é o motivo de este describe existir.
describe('RemittanceRepository (fake) — o save reconfere o hold (#789)', () => {
  it('recusa criar remessa com título já preso por outra remessa viva', async () => {
    const repo = createInMemoryRemittanceRepository();
    await repo.save(build(['doc-1', 'doc-2']));

    // A segunda emissão passou pela consulta antes da primeira gravar — é exatamente o cenário da
    // corrida, encenado em sequência.
    const segunda = await repo.save(build(['doc-2', 'doc-3']));
    assert.equal(segunda.ok, false, 'esperava recusa: doc-2 já está preso');
    assert.equal(isErr(segunda) ? segunda.error : null, 'remittance-payables-already-held');
  });

  // ⚠️ O caso que uma reconferência ingênua quebraria. Ao confirmar, mudar status ou descartar, a
  // remessa encontra os PRÓPRIOS títulos presos — por ela mesma. Recusar aqui travaria o
  // `confirmRemittance` e deixaria toda remessa transmitida sem desfecho.
  it('permite atualizar uma remessa existente, cujos títulos ela mesma prende', async () => {
    const repo = createInMemoryRemittanceRepository();
    const rem = build(['doc-1']);
    await repo.save(rem);

    const t = confirmTransmitted(rem, '2026-08-11T14:05:00.000Z', 'ok');
    assert.ok(isOk(t));
    const atualizacao = await repo.save(t.value.remittance, t.value.events);
    assert.equal(atualizacao.ok, true, 'atualização de desfecho não passa pela reserva');
  });

  it('libera o título depois que a remessa que o prendia foi descartada', async () => {
    const repo = createInMemoryRemittanceRepository();
    const primeira = build(['doc-1']);
    await repo.save(primeira);

    const f = markFailed(primeira, '2026-08-11T14:05:00.000Z', 'sem confirmacao');
    assert.ok(isOk(f));
    const d = discard(
      f.value.remittance,
      '2026-08-11T15:00:00.000Z',
      'banco confirmou que nao saiu',
    );
    assert.ok(isOk(d));
    await repo.save(d.value.remittance, d.value.events);

    const segunda = await repo.save(build(['doc-1']));
    assert.equal(segunda.ok, true, 'descarte devolve o título para a fila');
  });
});
