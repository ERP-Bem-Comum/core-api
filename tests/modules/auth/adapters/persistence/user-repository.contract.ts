/**
 * Suite de contrato compartilhada para UserRepository + UserReader (modulo auth).
 *
 * Recebe um factory que devolve { repository, reader } sobre o mesmo store. Toda implementacao
 * (InMemory, Drizzle/MySQL futuro) passa pelos MESMOS cenarios. NAO executa direto (sem .test.ts).
 *
 * ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import type {
  UserRepository,
  UserReader,
} from '#src/modules/auth/domain/identity/user/repository.ts';
import type { ActiveUser } from '#src/modules/auth/domain/identity/user/types.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as Cpf from '#src/modules/auth/domain/identity/cpf.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';

interface UserRepoSetup {
  repository: UserRepository;
  reader: UserReader;
  teardown?: () => Promise<void>;
}

// Aceita setup sincrono (InMemory) ou assincrono (Drizzle/MySQL futuro) — `await` lida com ambos.
export interface UserRepoFactory {
  make: () => UserRepoSetup | Promise<UserRepoSetup>;
}

const AT = new Date('2026-05-27T12:00:00.000Z');

// CPFs sinteticos validos por checksum, ja em uso nas fixtures do modulo auth. Nao introduzir
// numero novo aqui: os repositorios sao publicos e fixture e o caminho por onde dado de cadastro
// real entra.
const CPF_A = '52998224725';
const CPF_B = '11144477735';

// `rawCpf` ausente -> user sem perfil (cpf null), como nasce pelo register/OIDC.
const buildActive = (rawEmail: string, rawCpf?: string): ActiveUser => {
  const email = Email.parse(rawEmail);
  const hash = PasswordHash.fromString('$argon2id$x');
  if (!email.ok || !hash.ok) throw new Error('fixture VO invalido');
  let cpf = null;
  if (rawCpf !== undefined) {
    const parsed = Cpf.parse(rawCpf);
    if (!parsed.ok) throw new Error('fixture cpf invalido');
    cpf = parsed.value;
  }
  const { user } = User.register(
    { id: UserId.generate(), email: email.value, passwordHash: hash.value, roles: [], cpf },
    AT,
  );
  return user;
};

export const runUserRepositoryContract = (label: string, factory: UserRepoFactory): void => {
  describe(`UserRepository contract — ${label}`, () => {
    let repository: UserRepository;
    let reader: UserReader;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repository = built.repository;
      reader = built.reader;
      teardown = built.teardown;
    });

    const cleanup = async (): Promise<void> => {
      if (teardown) await teardown();
    };

    it('CA1: save -> findById retorna o user salvo', async () => {
      const user = buildActive('user@example.com');
      const saved = await repository.save(user);
      assert.equal(saved.ok, true);

      const found = await reader.findById(user.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.id, user.id);
      await cleanup();
    });

    it('CA2: findById de id inexistente retorna ok(null)', async () => {
      const found = await reader.findById(UserId.generate());
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, null);
      await cleanup();
    });

    it('CA3: save -> findByEmail retorna o user', async () => {
      const user = buildActive('person@example.com');
      await repository.save(user);

      const found = await reader.findByEmail(user.email);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.id, user.id);
      await cleanup();
    });

    it('CA4: findByEmail inexistente retorna ok(null)', async () => {
      const missing = Email.parse('ghost@example.com');
      if (!missing.ok) throw new Error('fixture');
      const found = await reader.findByEmail(missing.value);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, null);
      await cleanup();
    });

    it('CA5: save de mesmo id faz upsert (status atualizado)', async () => {
      const user = buildActive('upsert@example.com');
      await repository.save(user);
      const { user: disabled } = User.disable(user, AT);
      await repository.save(disabled);

      const found = await reader.findById(user.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.status, 'disabled');
      await cleanup();
    });

    it('CA6: save de e-mail duplicado (outro id) -> email-already-registered', async () => {
      const a = buildActive('dup@example.com');
      const savedA = await repository.save(a);
      assert.equal(savedA.ok, true);

      const b = buildActive('dup@example.com'); // mesmo e-mail, id diferente
      const savedB = await repository.save(b);
      assert.equal(savedB.ok, false);
      if (!savedB.ok) assert.equal(savedB.error, 'email-already-registered');
      await cleanup();
    });

    // F7 (ciclo de QA 05/10): dois usuarios com o MESMO cpf e e-mails diferentes eram ambos
    // aceitos — duplicacao de identidade, porque cpf e documento. A garantia vive no UNIQUE
    // auth_user_cpf_idx (migration 0010); o contrato a cobra do PORT, nao de uma implementacao.
    it('CA7: save de cpf duplicado (outro id, outro e-mail) -> cpf-already-registered', async () => {
      const a = buildActive('cpf-a@example.com', CPF_A);
      const savedA = await repository.save(a);
      assert.equal(savedA.ok, true);

      const b = buildActive('cpf-b@example.com', CPF_A); // mesmo cpf, e-mail e id diferentes
      const savedB = await repository.save(b);
      assert.equal(savedB.ok, false);
      if (!savedB.ok) assert.equal(savedB.error, 'cpf-already-registered');
      await cleanup();
    });

    // O lado negativo, e o que um fake erra com mais facilidade: cpf null NAO e duplicata.
    // O InnoDB permite multiplos NULL num indice UNIQUE, e quem nasce pelo register/OIDC tem
    // cpf null — se isto colidisse, nenhum usuario sem perfil poderia ser criado apos o primeiro.
    it('CA8: dois users sem cpf (null) coexistem — null nao colide no UNIQUE', async () => {
      const a = buildActive('nocpf-a@example.com');
      const b = buildActive('nocpf-b@example.com');
      assert.equal((await repository.save(a)).ok, true);
      assert.equal((await repository.save(b)).ok, true);

      const found = await reader.findById(b.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.id, b.id);
      await cleanup();
    });

    // Reescrever o PROPRIO registro nao e duplicata: o upsert por id (CA5) tem de continuar
    // valendo para quem tem cpf, senao nenhum usuario com perfil poderia ser atualizado.
    it('CA9: save do mesmo id com o mesmo cpf faz upsert, nao conflito', async () => {
      const user = buildActive('upsert-cpf@example.com', CPF_B);
      assert.equal((await repository.save(user)).ok, true);

      const { user: disabled } = User.disable(user, AT);
      const resaved = await repository.save(disabled);
      assert.equal(resaved.ok, true);

      const found = await reader.findById(user.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.status, 'disabled');
      await cleanup();
    });
  });
};
