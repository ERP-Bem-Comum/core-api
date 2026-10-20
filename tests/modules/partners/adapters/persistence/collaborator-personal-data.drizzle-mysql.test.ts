/**
 * #1072 CA7 — dado pessoal do colaborador contra MySQL real (gated `MYSQL_INTEGRATION=1`).
 *
 * Os dois casos que o fake em memória NÃO reproduz, porque só existem no banco:
 *   - CA2: `rg = ''` gravado (o ETL do legado gravava assim) tem de contar como vazio — o PUT
 *     preenche, em vez de devolver 409 para sempre;
 *   - CA5: `date_of_birth` é DATETIME(3), não DATE. Data com fuso (`-03:00`) grava o DIA CIVIL
 *     escrito; reenviar a data pura não é troca; e um nascimento legado gravado com hora
 *     diferente de meia-noite também não vira 409.
 *
 * O caminho é o da produção: schema Zod da borda → domínio → repositório Drizzle → MySQL.
 * Fixtures sintéticas: nenhum RG, CPF ou nascimento de pessoa real.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { eq } from 'drizzle-orm';

import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type { Collaborator as CollaboratorEntity } from '#src/modules/partners/domain/collaborator/types.ts';
import { updateCollaboratorBodySchema } from '#src/modules/partners/adapters/http/schemas.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.drizzle.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const clock = ClockFixed(new Date('2026-06-01T12:00:00.000Z'));

const CADASTRAIS = {
  name: 'Colaboradora Teste',
  email: 'colaboradora.1072@example.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Educadora',
  startOfContract: '2025-03-01',
  employmentRelationship: 'CLT',
} as const;

// Body do PUT passado pelo MESMO schema Zod da rota — a conversão de data é parte do que se prova.
const putInput = (over: Record<string, unknown>) => {
  const parsed = updateCollaboratorBodySchema.safeParse({ ...CADASTRAIS, ...over });
  if (!parsed.success) throw new Error(`body inválido: ${parsed.error.message}`);
  return parsed.data;
};

const completedWithout = (): CollaboratorEntity => {
  const registered = Collaborator.register({
    id: CollaboratorId.generate(),
    name: CADASTRAIS.name,
    email: CADASTRAIS.email,
    cpf: CADASTRAIS.cpf,
    occupationArea: CADASTRAIS.occupationArea,
    role: CADASTRAIS.role,
    startOfContract: new Date('2025-03-01T00:00:00.000Z'),
    employmentRelationship: CADASTRAIS.employmentRelationship,
    registeredAt: clock.now(),
  });
  if (!registered.ok) throw new Error(`fixture register: ${registered.error}`);
  const completed = Collaborator.completeRegistration(
    registered.value.collaborator,
    {
      rg: null,
      dateOfBirth: null,
      genderIdentity: null,
      genderIdentityDescription: null,
      race: null,
      education: null,
      foodCategory: null,
      foodCategoryDescription: null,
      completeAddress: null,
      telephone: null,
      emergencyContactName: null,
      emergencyContactTelephone: null,
      allergies: null,
      biography: null,
      experienceInThePublicSector: null,
    },
    clock.now(),
  );
  if (!completed.ok) throw new Error(`fixture complete: ${completed.error}`);
  return completed.value.collaborator;
};

if (integrationEnabled()) {
  let handle: PartnersMysqlHandle | null = null;

  before(async () => {
    const opened = await openPartnersMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!opened.ok) throw new Error(`openPartnersMysql falhou: ${opened.error}`);
    handle = opened.value;
  });

  after(async () => {
    if (handle !== null) await handle.close();
  });

  // Limpa na ENTRADA e por TABELA (rules/testing.md): a UNIQUE de CPF/e-mail colide com resíduo.
  beforeEach(async () => {
    if (handle !== null) await handle.db.delete(handle.schema.parCollaborators);
  });

  const reload = async (h: PartnersMysqlHandle, c: CollaboratorEntity) => {
    const found = await createDrizzleCollaboratorStore(h, clock).findById(c.id);
    if (!found.ok || found.value === null) assert.fail('colaborador não encontrado após save');
    return found.value;
  };

  const save = async (h: PartnersMysqlHandle, c: CollaboratorEntity): Promise<void> => {
    const saved = await createDrizzleCollaboratorStore(h, clock).save(c);
    assert.ok(saved.ok, saved.ok ? '' : saved.error);
  };

  describe("#1072 CA7 — rg = '' e DATETIME(3) no MySQL real", () => {
    it("CA2: rg '' gravado no banco → PUT com rg preenche (não 409) e o MySQL guarda o valor", async () => {
      if (handle === null) return;
      const base = completedWithout();
      await save(handle, base);
      await handle.db
        .update(handle.schema.parCollaborators)
        .set({ rg: '' })
        .where(eq(handle.schema.parCollaborators.id, String(base.id)));

      const stored = await reload(handle, base);
      assert.equal(stored.rg, '', 'pré-condição: o banco devolve a string vazia');

      const edited = Collaborator.edit(stored, putInput({ rg: '12345' }), clock.now());
      assert.ok(edited.ok, edited.ok ? '' : edited.error);
      await save(handle, edited.value.collaborator);
      assert.equal((await reload(handle, base)).rg, '12345');
    });

    it('CA5: data com fuso -03:00 grava o dia civil; reenviar a data pura → sem troca', async () => {
      if (handle === null) return;
      const base = completedWithout();
      await save(handle, base);

      const first = Collaborator.edit(
        base,
        putInput({ dateOfBirth: '1990-05-10T22:00:00-03:00' }),
        clock.now(),
      );
      assert.ok(first.ok, first.ok ? '' : first.error);
      await save(handle, first.value.collaborator);
      const stored = await reload(handle, base);
      assert.equal(stored.dateOfBirth?.toISOString(), '1990-05-10T00:00:00.000Z');

      const again = Collaborator.edit(stored, putInput({ dateOfBirth: '1990-05-10' }), clock.now());
      assert.ok(again.ok, again.ok ? '' : again.error);
      assert.equal(again.value.collaborator.dateOfBirth?.toISOString(), '1990-05-10T00:00:00.000Z');
    });

    it('CA5: nascimento legado gravado com hora (DATETIME) + reenvio do mesmo dia → sem 409', async () => {
      if (handle === null) return;
      const base = completedWithout();
      await save(handle, base);
      await handle.db
        .update(handle.schema.parCollaborators)
        .set({ dateOfBirth: new Date('1990-05-10T15:45:00.000Z') })
        .where(eq(handle.schema.parCollaborators.id, String(base.id)));

      const stored = await reload(handle, base);
      assert.equal(stored.dateOfBirth?.toISOString(), '1990-05-10T15:45:00.000Z');

      const resent = Collaborator.edit(
        stored,
        putInput({ dateOfBirth: '1990-05-10' }),
        clock.now(),
      );
      assert.ok(resent.ok, resent.ok ? '' : resent.error);
      const swapped = Collaborator.edit(
        stored,
        putInput({ dateOfBirth: '1990-05-11' }),
        clock.now(),
      );
      assert.equal(swapped.ok ? null : swapped.error, 'collaborator-personal-data-immutable');
    });
  });
}
