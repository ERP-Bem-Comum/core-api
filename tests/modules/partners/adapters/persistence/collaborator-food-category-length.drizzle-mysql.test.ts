/**
 * PAR-COLLAB-FOODCAT-LENGTH — W0 (RED) — Drizzle/MySQL — gated MYSQL_INTEGRATION=1.
 *
 * Prova o bug #274: `par_collaborators.food_category` é `varchar(20)` mas o
 * domínio `FoodCategory` tem `'PREFIRO_NAO_RESPONDER'` (21 chars) como valor
 * válido. Persistir um Collaborator com esse valor falha com ER_DATA_TOO_LONG
 * (MySQL errno 1406) e o adapter retorna err('collaborator-repo-unavailable').
 *
 * Estado RED (por que este teste falha hoje sem tocar src/):
 *   (a) Empiricamente: ETL de produção falhou com errno 1406 nos colaboradores
 *       cujo food_category era 'PREFIRO_NAO_RESPONDER' na VM de validação.
 *   (b) Por inspeção de schema:
 *         migration 0002_young_cerise.sql:18 → `food_category` varchar(20)
 *        'PREFIRO_NAO_RESPONDER'.length === 21  →  excede o limite em 1 char.
 *       As colunas irmãs (gender_identity / race / education) já são varchar(30);
 *       apenas food_category permaneceu em 20.
 *
 * O teste passará após W1:
 *   ALTER TABLE par_collaborators MODIFY food_category varchar(30);  -- sem hint
 *   (achado da validação E2E: no MySQL 8.4.9 este widening NÃO aceita ALGORITHM=
 *    INSTANT nem INPLACE → ERROR 1845; o ALTER sem hint funciona. Ver 003-impl/REPORT.md.)
 *
 * CA1 (RED hoje): save + findById round-trip com foodCategory = 'PREFIRO_NAO_RESPONDER'.
 * CA3 (guarda de regressão): valor curto ('VEGETARIANO') permanece íntegro — widening
 *      não trunca dados menores existentes.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.drizzle.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const clock = ClockFixed(new Date('2026-06-01T12:00:00.000Z'));

/**
 * Registra um colaborador base (PreRegistration, foodCategory: null).
 * Campos mínimos exigidos por Collaborator.register.
 */
const buildBase = (over: Readonly<{ cpf?: string; email?: string }> = {}) => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Beatriz Moura',
    email: over.email ?? 'beatriz.moura@bemcomum.org',
    cpf: over.cpf ?? '111.444.777-35',
    occupationArea: 'PARC',
    role: 'Educadora',
    startOfContract: new Date('2025-03-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture register falhou: ${r.error}`);
  return r.value.collaborator;
};

/**
 * Completa o registro injetando o foodCategory especificado.
 * Todos os outros campos pessoais ficam null — apenas foodCategory é relevante
 * para o bug #274.
 */
const completeWithFoodCategory = (base: ReturnType<typeof buildBase>, foodCategory: string) => {
  const r = Collaborator.completeRegistration(
    base,
    {
      rg: null,
      dateOfBirth: null,
      genderIdentity: null,
      race: null,
      education: null,
      foodCategory,
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
  if (!r.ok) throw new Error(`fixture completeRegistration falhou: ${r.error}`);
  return r.value.collaborator;
};

if (integrationEnabled()) {
  let handle: PartnersMysqlHandle | null = null;

  before(async () => {
    const opened = await openPartnersMysql({
      connectionString: VALID_CONN,
      applyMigrations: true,
    });
    if (!opened.ok) throw new Error(`openPartnersMysql falhou: ${opened.error}`);
    handle = opened.value;
  });

  after(async () => {
    if (handle !== null) await handle.close();
  });

  beforeEach(async () => {
    if (handle !== null) await handle.db.delete(handle.schema.parCollaborators);
  });

  describe('PAR-COLLAB-FOODCAT-LENGTH — food_category varchar(20) vs domínio 21-char', () => {
    /**
     * CA1 — RED hoje.
     *
     * `'PREFIRO_NAO_RESPONDER'` tem 21 chars; `food_category varchar(20)` comporta
     * apenas 20. O MySQL rejeita o INSERT/UPDATE com ER_DATA_TOO_LONG (errno 1406),
     * o adapter captura e devolve err('collaborator-repo-unavailable').
     *
     * Após W1 (ALTER varchar(30)): save retorna ok(undefined) e findById devolve o
     * colaborador com foodCategory === 'PREFIRO_NAO_RESPONDER'.
     */
    it('CA1: save + findById round-trip com foodCategory = PREFIRO_NAO_RESPONDER (21 chars)', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);

      const base = buildBase();
      const completed = completeWithFoodCategory(base, 'PREFIRO_NAO_RESPONDER');

      // RED: retorna err('collaborator-repo-unavailable') por ER_DATA_TOO_LONG 1406.
      // GREEN após W1 (ALTER food_category varchar(30)): retorna ok(undefined).
      const saved = await repo.save(completed);
      assert.equal(
        isOk(saved),
        true,
        `save deve retornar ok — bug atual: food_category varchar(20) < 21 chars`,
      );

      const found = await repo.findById(completed.id);
      assert.equal(isOk(found), true, 'findById deve retornar ok após save bem-sucedido');
      if (!found.ok || found.value === null) {
        assert.fail('collaborator não encontrado após save — findById retornou null ou err');
      }

      assert.equal(
        found.value.foodCategory,
        'PREFIRO_NAO_RESPONDER',
        'foodCategory deve sobreviver ao round-trip sem truncamento',
      );
      assert.equal(
        found.value.registrationStatus,
        'Complete',
        'registrationStatus deve ser Complete após completeRegistration',
      );
    });

    /**
     * CA3 — guarda de regressão (passa hoje e após W1).
     *
     * Valores menores que 20 chars (ex.: 'VEGETARIANO' = 11 chars) já funcionam
     * com varchar(20). Após W1 (ALTER varchar(30)), esses valores não devem ser
     * truncados — o widening in-place do MySQL preserva dados existentes.
     */
    it('CA3: save + findById com foodCategory curto (VEGETARIANO) permanece íntegro', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);

      const base = buildBase();
      const completed = completeWithFoodCategory(base, 'VEGETARIANO');

      const saved = await repo.save(completed);
      assert.equal(
        isOk(saved),
        true,
        'save com valor curto deve funcionar com varchar(20) e continuar após varchar(30)',
      );

      const found = await repo.findById(completed.id);
      assert.equal(isOk(found), true, 'findById deve retornar ok');
      if (!found.ok || found.value === null) {
        assert.fail('collaborator não encontrado após save');
      }

      assert.equal(
        found.value.foodCategory,
        'VEGETARIANO',
        'foodCategory curto deve ser preservado intacto — widening não trunca',
      );
      assert.equal(found.value.registrationStatus, 'Complete');
    });
  });
}
