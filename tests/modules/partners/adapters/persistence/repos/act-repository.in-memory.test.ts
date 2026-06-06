/**
 * Testes do InMemory ActRepository — guarda duplicidade de CPF/email e CRUD básico.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryActStore } from '#src/modules/partners/adapters/persistence/repos/act-repository.in-memory.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';

const buildAct = (cpf: string, email: string) => {
  const r = Act.register({
    id: ActId.generate(),
    name: 'Maria Silva',
    email,
    cpf,
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: new Date('2026-01-10'),
    employmentRelationship: 'CLT',
    registeredAt: new Date('2026-01-01'),
  });
  if (!r.ok) throw new Error(`fixture act: ${r.error}`);
  return r.value.act;
};

describe('makeInMemoryActStore', () => {
  it('save e findById retornam o mesmo agregado', async () => {
    const { repository } = makeInMemoryActStore();
    const act = buildAct('11144477735', 'maria@example.com');
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

  it('findByCpf retorna o act correspondente', async () => {
    const { repository } = makeInMemoryActStore();
    const act = buildAct('11144477735', 'cpf@example.com');
    await repository.save(act);

    const found = await repository.findByCpf(act.cpf);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.equal(String(found.value?.cpf), String(act.cpf));
  });

  it('findByEmail retorna o act correspondente', async () => {
    const { repository } = makeInMemoryActStore();
    const act = buildAct('11144477735', 'unique@example.com');
    await repository.save(act);

    const found = await repository.findByEmail(act.email);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.equal(found.value?.email, act.email);
  });

  it('list retorna todos os acts salvos', async () => {
    const { repository } = makeInMemoryActStore();
    const a = buildAct('11144477735', 'a@example.com');
    const b = buildAct('52998224725', 'b@example.com');
    await repository.save(a);
    await repository.save(b);

    const list = await repository.list();
    assert.equal(list.ok, true);
    if (!list.ok) return;
    assert.equal(list.value.length, 2);
  });

  it('save com CPF duplicado de id diferente → act-cpf-duplicate', async () => {
    const { repository } = makeInMemoryActStore();
    const a = buildAct('11144477735', 'a@example.com');
    const b = buildAct('11144477735', 'b@example.com');
    await repository.save(a);
    const dup = await repository.save(b);
    assert.equal(dup.ok, false);
    if (dup.ok) return;
    assert.equal(dup.error, 'act-cpf-duplicate');
  });

  it('save com email duplicado de id diferente → act-email-duplicate', async () => {
    const { repository } = makeInMemoryActStore();
    const a = buildAct('11144477735', 'dup@example.com');
    const b = buildAct('52998224725', 'dup@example.com');
    await repository.save(a);
    const dup = await repository.save(b);
    assert.equal(dup.ok, false);
    if (dup.ok) return;
    assert.equal(dup.error, 'act-email-duplicate');
  });

  it('save do mesmo id (update) não falha por duplicidade', async () => {
    const { repository } = makeInMemoryActStore();
    const act = buildAct('11144477735', 'upd@example.com');
    await repository.save(act);
    const again = await repository.save(act);
    assert.equal(again.ok, true);
  });

  it('clear remove todos os acts', async () => {
    const { repository, clear } = makeInMemoryActStore();
    await repository.save(buildAct('11144477735', 'c@example.com'));
    clear();
    const list = await repository.list();
    assert.equal(list.ok, true);
    if (!list.ok) return;
    assert.equal(list.value.length, 0);
  });
});
