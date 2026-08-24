import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
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

    const held = await repo.findHeldPayables(['doc-1', 'doc-2', 'doc-3']);
    assert.ok(isOk(held));
    assert.deepEqual(
      held.value.map((h) => h.payableId),
      ['doc-1', 'doc-2'],
    );

    // O vínculo carrega a remessa, não só o título: é o `nsa` que o operador reconhece na tela
    // quando o ajuste é recusado. Asserir a PROPRIEDADE (todo vínculo aponta para uma remessa
    // identificável) e não o valor literal — o `nsa` vem do `build`, e prendê-lo aqui faria o teste
    // quebrar por mudança de fixture em vez de por mudança de comportamento.
    for (const vinculo of held.value) {
      assert.ok(vinculo.remittanceId.length > 0);
      assert.ok(Number.isInteger(vinculo.nsa) && vinculo.nsa >= 1);
    }
  });

  it('remessa transmitida continua prendendo', async () => {
    const repo = createInMemoryRemittanceRepository();
    const rem = build(['doc-1']);
    const t = confirmTransmitted(rem, '2026-08-11T14:05:00.000Z', 'ok');
    assert.ok(isOk(t));
    await repo.save(t.value.remittance, t.value.events);

    const held = await repo.findHeldPayables(['doc-1']);
    assert.ok(isOk(held) && held.value.length === 1);
  });

  // "Sem confirmação" não é "não transmitiu": o arquivo pode ter saído e o status ter se perdido.
  it('remessa em FALHA continua prendendo', async () => {
    const repo = createInMemoryRemittanceRepository();
    const f = markFailed(build(['doc-1']), '2026-08-11T14:05:00.000Z', 'sem confirmacao');
    assert.ok(isOk(f));
    await repo.save(f.value.remittance, f.value.events);

    const held = await repo.findHeldPayables(['doc-1']);
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

    const held = await repo.findHeldPayables(['doc-1']);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, []);
  });

  it('lista vazia não consulta nada e devolve vazio', async () => {
    const repo = createInMemoryRemittanceRepository();
    const held = await repo.findHeldPayables([]);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, []);
  });
});
