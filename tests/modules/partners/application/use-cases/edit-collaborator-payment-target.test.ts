/**
 * #1029 — `editCollaborator`: banco/PIX editáveis depois do cadastro + autor no histórico.
 *
 * Os migrados do legado vieram sem dados bancários (o legado não tinha o campo); a edição é o
 * caminho para incluir e para trocar. A troca fica no histórico com quem a fez (id + nome do
 * momento). `null` em banco/PIX MANTÉM o gravado — é o que o front em produção envia.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { makeInMemoryCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts';
import { makeInMemoryCollaboratorHistory } from '#src/modules/partners/adapters/persistence/repos/collaborator-history-repository.in-memory.ts';
import { registerCollaborator } from '#src/modules/partners/application/use-cases/register-collaborator.ts';
import { editCollaborator } from '#src/modules/partners/application/use-cases/edit-collaborator.ts';
import type { CollaboratorHistoryRepository } from '#src/modules/partners/application/ports/collaborator-history.ts';
import type { UserNameReader } from '#src/modules/partners/application/ports/user-name-reader.ts';
import type { CollaboratorRepository } from '#src/modules/partners/domain/collaborator/repository.ts';

const NOW = new Date('2026-10-07T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

const EDITOR_ID = '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const BANK = { bank: '237', agency: '1234', accountNumber: '56789', checkDigit: '0' };
const PIX = { keyType: 'email', key: 'maria.silva@bemcomum.org' };

const cadastrais = () => ({
  name: 'Maria Silva',
  email: 'maria.silva@bemcomum.org',
  cpf: '111.444.777-35',
  occupationArea: 'PARC',
  role: 'Educadora',
  startOfContract: new Date('2025-02-01T00:00:00.000Z'),
  employmentRelationship: 'CLT',
});

const namesOf = (names: Readonly<Record<string, string>>): UserNameReader => ({
  getUserName: (userId) => Promise.resolve(names[userId] ?? null),
});

let repo: CollaboratorRepository;
let history: CollaboratorHistoryRepository;

beforeEach(() => {
  repo = makeInMemoryCollaboratorStore().repository;
  history = makeInMemoryCollaboratorHistory();
});

const register = async (over: Record<string, unknown> = {}): Promise<string> => {
  const r = await registerCollaborator({ collaboratorRepo: repo, clock })({
    ...cadastrais(),
    ...over,
  });
  assert.ok(r.ok, r.ok ? '' : r.error);
  return String(r.value.collaborator.id);
};

const edit = (userNameReader: UserNameReader = namesOf({ [EDITOR_ID]: 'Ana Revisora' })) =>
  editCollaborator({ collaboratorRepo: repo, historyRepo: history, userNameReader, clock });

describe('editCollaborator — banco/PIX + autor no histórico (#1029)', () => {
  it('inclui banco/PIX em quem veio sem e grava a linha "Dados bancários" com o autor', async () => {
    const id = await register();
    const r = await edit()({
      collaboratorId: id,
      canEditSensitive: false,
      changedByUserId: EDITOR_ID,
      ...cadastrais(),
      bankAccount: BANK,
      pixKey: PIX,
    });
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.deepEqual(r.value.collaborator.bankAccount, BANK);

    const listed = await history.listByCollaborator(id);
    assert.ok(listed.ok);
    const bank = listed.value.find((e) => e.fieldName === 'bankAccount');
    assert.ok(bank, 'esperava linha de bankAccount');
    assert.equal(bank.fieldLabel, 'Dados bancários');
    assert.equal(bank.valueBefore, null);
    assert.equal(bank.valueAfter, '237/1234/56789-0');
    assert.equal(bank.changedByUserId, EDITOR_ID);
    assert.equal(bank.changedByName, 'Ana Revisora');
    const pix = listed.value.find((e) => e.fieldName === 'pixKey');
    assert.equal(pix?.changedByName, 'Ana Revisora');
  });

  it('null em banco/PIX mantém o gravado e não gera linha de banco/PIX (regressão do front atual)', async () => {
    const id = await register({ bankAccount: BANK, pixKey: PIX });
    const r = await edit()({
      collaboratorId: id,
      canEditSensitive: false,
      changedByUserId: EDITOR_ID,
      ...cadastrais(),
      role: 'Coordenadora',
      bankAccount: null,
      pixKey: null,
    });
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.deepEqual(r.value.collaborator.bankAccount, BANK);
    assert.deepEqual(r.value.collaborator.pixKey, PIX);

    const listed = await history.listByCollaborator(id);
    assert.ok(listed.ok);
    assert.deepEqual(
      listed.value.map((e) => e.fieldName),
      ['role'],
    );
    assert.equal(listed.value[0]?.changedByName, 'Ana Revisora');
  });

  it('banco inválido → erro do domínio, nada gravado nem registrado', async () => {
    const id = await register({ bankAccount: BANK });
    const r = await edit()({
      collaboratorId: id,
      canEditSensitive: false,
      changedByUserId: EDITOR_ID,
      ...cadastrais(),
      bankAccount: { ...BANK, agency: 'abc' },
    });
    assert.equal(r.ok ? null : r.error, 'invalid-bank-agency');

    const listed = await history.listByCollaborator(id);
    assert.ok(listed.ok);
    assert.equal(listed.value.length, 0);
  });

  it('nome do autor indisponível → edição passa e a linha guarda o id com nome null', async () => {
    const id = await register();
    const r = await edit(namesOf({}))({
      collaboratorId: id,
      canEditSensitive: false,
      changedByUserId: EDITOR_ID,
      ...cadastrais(),
      bankAccount: BANK,
    });
    assert.ok(r.ok, r.ok ? '' : r.error);

    const listed = await history.listByCollaborator(id);
    assert.ok(listed.ok);
    const bank = listed.value.find((e) => e.fieldName === 'bankAccount');
    assert.equal(bank?.changedByUserId, EDITOR_ID);
    assert.equal(bank?.changedByName, null);
  });
});
