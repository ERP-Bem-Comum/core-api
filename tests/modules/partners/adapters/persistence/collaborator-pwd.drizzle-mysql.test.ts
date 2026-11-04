/**
 * Spec 131 do web-app — Pessoa com Deficiência contra MySQL real (gated `MYSQL_INTEGRATION=1`).
 *
 *   - ida e volta das três colunas (`pwd_answer`, `pwd_types` em CSV, `pwd_description`);
 *   - o "Sim" sem tipo (como a migration deixa o dado antigo) fica ABERTO: o PUT completa, e depois
 *     trava;
 *   - a CONVERSÃO da migration 0023 roda os UPDATEs do próprio arquivo numa tabela temporária com o
 *     formato antigo (`is_pwd` + `pwd_description`) — prova o SQL que vai para produção, não uma cópia.
 *
 * Fixtures sintéticas: nenhum relato de pessoa real.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { sql, eq } from 'drizzle-orm';

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

const clock = ClockFixed(new Date('2026-10-23T12:00:00.000Z'));

const MIGRATION_0023 = new URL(
  '../../../../../src/modules/partners/adapters/persistence/migrations/mysql/0023_fearless_spot.sql',
  import.meta.url,
);

const CADASTRAIS = {
  name: 'Colaboradora Teste',
  email: 'colaboradora.131@example.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Educadora',
  startOfContract: '2025-03-01',
  employmentRelationship: 'CLT',
} as const;

const putInput = (over: Record<string, unknown>) => {
  const parsed = updateCollaboratorBodySchema.safeParse({ ...CADASTRAIS, ...over });
  if (!parsed.success) throw new Error(`body inválido: ${parsed.error.message}`);
  return parsed.data;
};

const registered = (): CollaboratorEntity => {
  const r = Collaborator.register({
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
  if (!r.ok) throw new Error(`fixture register: ${r.error}`);
  return r.value.collaborator;
};

// Os UPDATEs da migration, apontados para a tabela temporária. Os ALTER TABLE ficam de fora: a
// temporária já nasce com as colunas novas.
const conversionStatements = (table: string): readonly string[] =>
  readFileSync(MIGRATION_0023, 'utf8')
    .split('--> statement-breakpoint')
    .map((s) => s.replace(/^--.*$/gm, '').trim())
    .filter((s) => s.startsWith('UPDATE'))
    .map((s) => s.replaceAll('`par_collaborators`', `\`${table}\``));

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

  beforeEach(async () => {
    if (handle !== null) await handle.db.delete(handle.schema.parCollaborators);
  });

  const store = (h: PartnersMysqlHandle) => createDrizzleCollaboratorStore(h, clock);

  const reload = async (h: PartnersMysqlHandle, c: CollaboratorEntity) => {
    const found = await store(h).findById(c.id);
    if (!found.ok || found.value === null) assert.fail('colaborador não encontrado após save');
    return found.value;
  };

  describe('Spec 131 — PcD no MySQL real', () => {
    it('ida e volta: "Sim" com tipos e o texto de "Outra"', async () => {
      if (handle === null) return;
      const base = registered();
      await store(handle).save(base);

      const edited = Collaborator.edit(
        base,
        putInput({
          pwd: { answer: 'SIM', types: ['OUTRA', 'FISICA'], otherDescription: 'fibromialgia' },
        }),
        clock.now(),
      );
      assert.ok(edited.ok, edited.ok ? '' : edited.error);
      await store(handle).save(edited.value.collaborator);

      const [row] = await handle.db
        .select()
        .from(handle.schema.parCollaborators)
        .where(eq(handle.schema.parCollaborators.id, String(base.id)));
      assert.equal(row?.pwdAnswer, 'SIM');
      assert.equal(row?.pwdTypes, 'FISICA,OUTRA', 'CSV na ordem do formulário');
      assert.equal(row?.pwdDescription, 'fibromialgia');
      assert.deepEqual((await reload(handle, base)).pwd, {
        answer: 'SIM',
        types: ['FISICA', 'OUTRA'],
        otherDescription: 'fibromialgia',
      });
    });

    it('"Sim" sem tipo (dado antigo convertido) fica aberto; completo, trava', async () => {
      if (handle === null) return;
      const base = registered();
      await store(handle).save(base);
      await handle.db
        .update(handle.schema.parCollaborators)
        .set({ pwdAnswer: 'SIM', pwdTypes: null, pwdDescription: null })
        .where(eq(handle.schema.parCollaborators.id, String(base.id)));

      const open = await reload(handle, base);
      const filled = Collaborator.edit(
        open,
        putInput({ pwd: { answer: 'SIM', types: ['AUDITIVA'] } }),
        clock.now(),
      );
      assert.ok(filled.ok, filled.ok ? '' : filled.error);
      await store(handle).save(filled.value.collaborator);

      const locked = await reload(handle, base);
      const swapped = Collaborator.edit(locked, putInput({ pwd: { answer: 'NAO' } }), clock.now());
      assert.equal(swapped.ok ? null : swapped.error, 'collaborator-personal-data-immutable');
    });
  });

  describe('Spec 131 — conversão da migration 0023 (dado antigo)', () => {
    const TABLE = 'tmp_pwd_conversion_131';

    it('Sim→SIM; texto "Qual?"→OUTRA com o mesmo texto; Não→NAO; vazio segue vazio', async () => {
      if (handle === null) return;
      const db = handle.db;
      await db.execute(sql.raw(`DROP TEMPORARY TABLE IF EXISTS \`${TABLE}\``));
      await db.execute(
        sql.raw(
          `CREATE TEMPORARY TABLE \`${TABLE}\` (
             id int PRIMARY KEY,
             is_pwd boolean NULL,
             pwd_description varchar(255) NULL,
             pwd_answer varchar(30) NULL,
             pwd_types varchar(120) NULL
           )`,
        ),
      );
      await db.execute(
        sql.raw(
          `INSERT INTO \`${TABLE}\` (id, is_pwd, pwd_description) VALUES
             (1, TRUE, NULL),
             (2, TRUE, '  cadeirante '),
             (3, NULL, 'baixa visão'),
             (4, FALSE, NULL),
             (5, NULL, NULL),
             (6, TRUE, '   ')`,
        ),
      );

      for (const statement of conversionStatements(TABLE)) await db.execute(sql.raw(statement));

      const [rows] = (await db.execute(
        sql.raw(`SELECT id, pwd_answer, pwd_types, pwd_description FROM \`${TABLE}\` ORDER BY id`),
      )) as unknown as [
        readonly {
          id: number;
          pwd_answer: string | null;
          pwd_types: string | null;
          pwd_description: string | null;
        }[],
      ];
      assert.deepEqual(
        rows.map((r) => [r.id, r.pwd_answer, r.pwd_types, r.pwd_description]),
        [
          [1, 'SIM', null, null],
          [2, 'SIM', 'OUTRA', 'cadeirante'],
          [3, 'SIM', 'OUTRA', 'baixa visão'],
          [4, 'NAO', null, null],
          [5, null, null, null],
          [6, 'SIM', null, '   '],
        ],
      );
      await db.execute(sql.raw(`DROP TEMPORARY TABLE IF EXISTS \`${TABLE}\``));
    });
  });
}
