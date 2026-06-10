/**
 * Testes do InMemory ActRepository (Acordo de Cooperação Técnica) — guarda
 * duplicidade de `actNumber` e CRUD básico.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryActStore } from '#src/modules/partners/adapters/persistence/repos/act-repository.in-memory.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';

const buildAct = (actNumber: string, cnpj = '11.222.333/0001-81') => {
  const r = Act.register({
    id: ActId.generate(),
    actNumber,
    name: 'Acordo de Cooperação X',
    email: 'contato@instituicao.org',
    cnpj,
    corporateName: 'Instituição Parceira LTDA',
    fantasyName: 'IP',
    occupationArea: 'PARC',
    legalRepresentative: 'João Diretor',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    hasFinancialTransfer: false,
    bankAccount: null,
    pixKey: null,
    registeredAt: new Date('2026-01-01'),
  });
  if (!r.ok) throw new Error(`fixture act: ${r.error}`);
  return r.value.act;
};

describe('makeInMemoryActStore', () => {
  it('save e findById retornam o mesmo agregado', async () => {
    const { repository } = makeInMemoryActStore();
    const act = buildAct('ACT-2026-001');
    const saved = await repository.save(act);
    assert.equal(saved.ok, true);

    const found = await repository.findById(act.id);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.equal(found.value?.id, act.id);
  });

  it('findById de id inexistente → null', async () => {
    const { repository } = makeInMemoryActStore();
    const id = ActId.generate();
    const found = await repository.findById(id);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.equal(found.value, null);
  });

  it('findByActNumber retorna o act correspondente', async () => {
    const { repository } = makeInMemoryActStore();
    const act = buildAct('ACT-2026-007');
    await repository.save(act);

    const found = await repository.findByActNumber(act.actNumber);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.equal(String(found.value?.actNumber), String(act.actNumber));
  });

  it('list retorna todos os acts salvos', async () => {
    const { repository } = makeInMemoryActStore();
    await repository.save(buildAct('ACT-2026-001'));
    await repository.save(buildAct('ACT-2026-002'));

    const list = await repository.list();
    assert.equal(list.ok, true);
    if (!list.ok) return;
    assert.equal(list.value.length, 2);
  });

  it('save com actNumber duplicado de id diferente → act-number-duplicate', async () => {
    const { repository } = makeInMemoryActStore();
    await repository.save(buildAct('ACT-2026-001'));
    const dup = await repository.save(buildAct('ACT-2026-001'));
    assert.equal(dup.ok, false);
    if (dup.ok) return;
    assert.equal(dup.error, 'act-number-duplicate');
  });

  it('mesmo CNPJ em acts diferentes é permitido (instituição com vários acordos)', async () => {
    const { repository } = makeInMemoryActStore();
    await repository.save(buildAct('ACT-2026-001', '11.222.333/0001-81'));
    const ok2 = await repository.save(buildAct('ACT-2026-002', '11.222.333/0001-81'));
    assert.equal(ok2.ok, true);
  });

  it('save do mesmo id (update) não falha por duplicidade', async () => {
    const { repository } = makeInMemoryActStore();
    const act = buildAct('ACT-2026-001');
    await repository.save(act);
    const again = await repository.save(act);
    assert.equal(again.ok, true);
  });

  it('clear remove todos os acts', async () => {
    const { repository, clear } = makeInMemoryActStore();
    await repository.save(buildAct('ACT-2026-001'));
    clear();
    const list = await repository.list();
    assert.equal(list.ok, true);
    if (!list.ok) return;
    assert.equal(list.value.length, 0);
  });
});
