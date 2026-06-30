/**
 * PARTNERS-ETL-STORE-INTEGRITY-ERROR (Achado 2) — W0 RED.
 *
 * Testa o classificador puro de erro de provision do store ETL do partners, SEM MySQL real.
 * DEVE FALHAR em W0: `classifyProvisionError` ainda nao e exportado de
 * `partners-etl-store.drizzle.ts` (a logica vive embutida no catch de `runProvision`).
 *
 * O classificador distingue:
 *   - 1062 (ER_DUP_ENTRY) em *_legacy_id_idx          -> 'already-exists'   (idempotencia ETL; preservar)
 *   - 1062 em QUALQUER outra UNIQUE (cnpj/cpf/email)   -> 'integrity-violation' (dado do legado, NAO infra)
 *   - demais erros                                      -> 'unavailable'     (infra)
 * E reconhece o errno mesmo aninhado em `.cause` (forma DrizzleQueryError -> mysql2).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  classifyProvisionError,
  type ProvisionErrorClass,
} from '#src/modules/partners/adapters/persistence/repos/partners-etl-store.drizzle.ts';

// Espelha a forma de um erro mysql2 (errno + sqlMessage). O sqlMessage cita o indice
// E o valor duplicado (PII) — exatamente como o MySQL emite ER_DUP_ENTRY.
const mysql2DupError = (sqlMessage: string): Error => {
  const e = new Error('ER_DUP_ENTRY') as Error & {
    errno: number;
    code: string;
    sqlMessage: string;
  };
  e.errno = 1062;
  e.code = 'ER_DUP_ENTRY';
  e.sqlMessage = sqlMessage;
  return e;
};

// Espelha o DrizzleQueryError, que embrulha o erro do mysql2 em `.cause`.
const drizzleWrapped = (inner: Error): Error => {
  const e = new Error('Failed query: insert into ...');
  (e as Error & { cause: unknown }).cause = inner;
  return e;
};

const LEGACY_IDX = 'par_suppliers_legacy_id_idx';

describe('classifyProvisionError (PARTNERS-ETL-STORE-INTEGRITY-ERROR)', () => {
  it('1062 no indice de legacy_id (direto) -> already-exists (idempotencia preservada)', () => {
    // Arrange
    const cause = mysql2DupError("Duplicate entry '7' for key 'par_suppliers_legacy_id_idx'");
    // Act
    const klass: ProvisionErrorClass = classifyProvisionError(cause, LEGACY_IDX);
    // Assert
    assert.equal(klass, 'already-exists');
  });

  it('1062 no indice de legacy_id aninhado em .cause (DrizzleQueryError) -> already-exists', () => {
    // Arrange
    const cause = drizzleWrapped(
      mysql2DupError("Duplicate entry '7' for key 'par_suppliers_legacy_id_idx'"),
    );
    // Act
    const klass = classifyProvisionError(cause, LEGACY_IDX);
    // Assert
    assert.equal(klass, 'already-exists');
  });

  it('1062 numa UNIQUE secundaria de CNPJ -> integrity-violation (dado do legado, NAO infra)', () => {
    // Arrange — mesma entidade (suppliers), mas o 1062 caiu no cnpj_idx, nao no legacy_id_idx
    const cause = mysql2DupError(
      "Duplicate entry '11222333000181' for key 'par_suppliers_cnpj_idx'",
    );
    // Act
    const klass = classifyProvisionError(cause, LEGACY_IDX);
    // Assert
    assert.equal(klass, 'integrity-violation');
  });

  it('1062 numa UNIQUE secundaria de CPF (collaborators) -> integrity-violation', () => {
    const cause = mysql2DupError(
      "Duplicate entry '111.444.777-35' for key 'par_collaborators_cpf_idx'",
    );
    const klass = classifyProvisionError(cause, 'par_collaborators_legacy_id_idx');
    assert.equal(klass, 'integrity-violation');
  });

  it('1062 numa UNIQUE secundaria de email (collaborators) -> integrity-violation', () => {
    const cause = mysql2DupError(
      "Duplicate entry 'm1@bemcomum.org' for key 'par_collaborators_email_idx'",
    );
    const klass = classifyProvisionError(cause, 'par_collaborators_legacy_id_idx');
    assert.equal(klass, 'integrity-violation');
  });

  it('1062 numa UNIQUE secundaria de CNPJ aninhada em .cause -> integrity-violation', () => {
    const cause = drizzleWrapped(
      mysql2DupError("Duplicate entry '11222333000181' for key 'par_financiers_cnpj_idx'"),
    );
    const klass = classifyProvisionError(cause, 'par_financiers_legacy_id_idx');
    assert.equal(klass, 'integrity-violation');
  });

  it('1062 numa UNIQUE secundaria de CPF (user_profiles) -> integrity-violation', () => {
    const cause = mysql2DupError(
      "Duplicate entry '111.444.777-35' for key 'par_user_profiles_cpf_idx'",
    );
    const klass = classifyProvisionError(cause, 'par_user_profiles_legacy_id_idx');
    assert.equal(klass, 'integrity-violation');
  });

  it('erro nao-1062 (ex.: connection reset) -> unavailable (infra)', () => {
    // Arrange
    const e = new Error('read ECONNRESET') as Error & { errno: number; code: string };
    e.errno = -54;
    e.code = 'ECONNRESET';
    // Act
    const klass = classifyProvisionError(e, LEGACY_IDX);
    // Assert
    assert.equal(klass, 'unavailable');
  });

  it('1062 sem nome de indice reconhecivel no sqlMessage -> unavailable (conservador)', () => {
    const cause = mysql2DupError("Duplicate entry 'x' for key 'PRIMARY'");
    const klass = classifyProvisionError(cause, LEGACY_IDX);
    assert.equal(klass, 'unavailable');
  });

  it('erro opaco (string, sem errno) -> unavailable', () => {
    const klass = classifyProvisionError('boom', LEGACY_IDX);
    assert.equal(klass, 'unavailable');
  });

  it('o reason que cruza a public-api e PII-free: classe nao carrega o valor duplicado', () => {
    // Arrange — sqlMessage contem o CNPJ (PII)
    const pii = '11222333000181';
    const cause = mysql2DupError(`Duplicate entry '${pii}' for key 'par_suppliers_cnpj_idx'`);
    // Act
    const klass = classifyProvisionError(cause, LEGACY_IDX);
    // Assert — a classe e um literal kebab-case fixo, jamais o valor
    assert.equal(klass, 'integrity-violation');
    assert.equal(klass.includes(pii), false);
  });
});
