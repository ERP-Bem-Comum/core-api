// Integração: openCollaboratorDemographicsReader com filtro OPCIONAL por status de cadastro
// (feat/team-demographics-registration-filter). Semeia collaborators Complete e PreRegistration
// com gênero/raça/nascimento variados e prova que o WHERE (registration_status) recorta a
// agregação nas 3 distribuições E no totalActive. Ausente = todos.
// GATE: só roda com MYSQL_INTEGRATION=1 (registrado em test:integration:partners).
// Isolamento: limpa par_collaborators por TABELA na ENTRADA (contrato de isolamento).

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import { openPartnersMysql } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import type { PartnersMysqlHandle } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.drizzle.ts';
import { openCollaboratorDemographicsReader } from '#src/modules/partners/public-api/collaborator-demographics-reader.ts';
import type { CategoryCount } from '#src/modules/partners/public-api/collaborator-demographics.ts';

const CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
// referenceDate fixa da faixa etária (nunca `Date.now()`).
const clock = ClockFixed(new Date('2026-06-01T12:00:00.000Z'));

const sum = (d: readonly CategoryCount[]): number => d.reduce((a, b) => a + b.count, 0);
const countOf = (d: readonly CategoryCount[], id: string): number =>
  d.find((b) => b.id === id)?.count ?? 0;

if (process.env['MYSQL_INTEGRATION'] !== '1') {
  process.stdout.write(
    '[partners:collaborator-demographics-reader] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openCollaboratorDemographicsReader — filtro registrationStatus (Drizzle + MySQL)', () => {
    let handle: PartnersMysqlHandle;

    before(async () => {
      const r = await openPartnersMysql({ connectionString: CONN, applyMigrations: true });
      if (!r.ok) throw new Error(`open: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      await handle.db.delete(handle.schema.parCollaborators);
    });

    // Semeia um collaborator; quando `complete` traz campos pessoais, faz completeRegistration.
    const seed = async (args: {
      cpf: string;
      email: string;
      complete?: { genderIdentity: string; race: string; dateOfBirth: Date };
    }): Promise<void> => {
      const reg = Collaborator.register({
        id: CollaboratorId.generate(),
        name: 'Colaborador Teste',
        email: args.email,
        cpf: args.cpf,
        occupationArea: 'PARC',
        role: 'Educador',
        startOfContract: new Date('2025-02-01T00:00:00.000Z'),
        employmentRelationship: 'CLT',
        registeredAt: clock.now(),
      });
      if (!reg.ok) throw new Error(`fixture register: ${reg.error}`);
      const repo = createDrizzleCollaboratorStore(handle, clock);

      if (args.complete === undefined) {
        assert.equal((await repo.save(reg.value.collaborator)).ok, true);
        return;
      }
      const done = Collaborator.completeRegistration(
        reg.value.collaborator,
        {
          rg: null,
          dateOfBirth: args.complete.dateOfBirth,
          genderIdentity: args.complete.genderIdentity,
          race: args.complete.race,
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
      if (!done.ok) throw new Error(`fixture complete: ${done.error}`);
      assert.equal((await repo.save(done.value.collaborator)).ok, true);
    };

    // CPFs válidos distintos (checksum ok).
    const seedAll = async (): Promise<void> => {
      await seed({
        cpf: '111.444.777-35',
        email: 'a@bemcomum.org',
        complete: {
          genderIdentity: 'HOMEM_CIS',
          race: 'BRANCO',
          dateOfBirth: new Date('1990-01-01'),
        },
      }); // Complete · DE_30_A_39 (36 anos)
      await seed({
        cpf: '529.982.247-25',
        email: 'b@bemcomum.org',
        complete: {
          genderIdentity: 'MULHER_CIS',
          race: 'PARDO',
          dateOfBirth: new Date('2000-01-01'),
        },
      }); // Complete · ATE_29 (26 anos)
      await seed({ cpf: '390.533.447-05', email: 'c@bemcomum.org' }); // PreRegistration (pessoais null)
    };

    it('sem filtro: agrega TODOS (3 ativos) nas 3 distribuições + total', async () => {
      await seedAll();
      const readerR = await openCollaboratorDemographicsReader({ connectionString: CONN, clock });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.list();
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      assert.equal(r.value.totalActive, 3);
      assert.equal(sum(r.value.gender), 3);
      assert.equal(sum(r.value.race), 3);
      assert.equal(sum(r.value.ageRange), 3);
      assert.equal(countOf(r.value.gender, 'NA'), 1, 'o PreRegistration cai em NA');
    });

    it('registrationStatus=Complete: WHERE recorta a agregação (2 ativos, sem NA)', async () => {
      await seedAll();
      const readerR = await openCollaboratorDemographicsReader({ connectionString: CONN, clock });
      if (!readerR.ok) throw new Error(readerR.error);
      const reader = readerR.value;
      const r = await reader.list({ registrationStatus: 'Complete' });
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      assert.equal(r.value.totalActive, 2);
      assert.equal(sum(r.value.gender), 2);
      assert.equal(sum(r.value.race), 2);
      assert.equal(sum(r.value.ageRange), 2);
      assert.equal(countOf(r.value.gender, 'HOMEM_CIS'), 1);
      assert.equal(countOf(r.value.gender, 'MULHER_CIS'), 1);
      assert.equal(countOf(r.value.gender, 'NA'), 0);
      assert.equal(countOf(r.value.race, 'BRANCO'), 1);
      assert.equal(countOf(r.value.race, 'PARDO'), 1);
      assert.equal(countOf(r.value.ageRange, 'DE_30_A_39'), 1);
      assert.equal(countOf(r.value.ageRange, 'ATE_29'), 1);
    });

    it('registrationStatus=PreRegistration: só o pré (1 ativo, tudo em NA)', async () => {
      await seedAll();
      const readerR = await openCollaboratorDemographicsReader({ connectionString: CONN, clock });
      if (!readerR.ok) throw new Error(readerR.error);
      const reader = readerR.value;
      const r = await reader.list({ registrationStatus: 'PreRegistration' });
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      assert.equal(r.value.totalActive, 1);
      assert.equal(sum(r.value.gender), 1);
      assert.equal(sum(r.value.race), 1);
      assert.equal(sum(r.value.ageRange), 1);
      assert.equal(countOf(r.value.gender, 'NA'), 1);
      assert.equal(countOf(r.value.race, 'NA'), 1);
      assert.equal(countOf(r.value.ageRange, 'NA'), 1);
    });
  });
}
