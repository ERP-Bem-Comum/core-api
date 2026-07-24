/**
 * MYSQL-TEST-PORT-HELPER — W0 (RED) — teste comportamental do helper único.
 *
 * Alvo: `tests/support/mysql-conn.ts` (a ser criado no W1). Torna a porta do MySQL de
 * teste configurável por `MYSQL_PORT`, hoje fixada como literal `127.0.0.1:3306` em 69
 * arquivos de tests/. Este arquivo é o RED PRINCIPAL: enquanto o helper não existir, o
 * import estático abaixo dispara ERR_MODULE_NOT_FOUND e derruba TODOS os casos.
 *
 * Cobertura: CA2 (compat. retroativa), CA3 (override de porta), CA4 (sem fallback à 3306),
 * CA5 (precedência MYSQL_TEST_URL) + endurecimento (porta vazia) + overrides de credencial.
 *
 * Sustentação: 000-request.md §Escopo(in).1 + §Critérios de aceite.
 *
 * ⚠️ Fakes injetáveis (disciplina do tdd-strategist): cada caso injeta um `env` EXPLÍCITO
 * em vez de depender do ambiente ambiente do runner — determinístico, sem MYSQL_PORT vazando.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// RED-by-inexistence: este import resolve para um módulo que o W1 vai criar. Enquanto
// tests/support/mysql-conn.ts não existir, ERR_MODULE_NOT_FOUND falha o arquivo inteiro.
import {
  mysqlTestConnectionString,
  mysqlTestUrl,
  MYSQL_TEST_HOST,
  MYSQL_TEST_DEFAULT_PORT,
} from '../support/mysql-conn.ts';

// 🔒 String CONGELADA — CA2. Errar UM caractere aqui quebra os 69 arquivos migrados no W1.
// É exatamente o literal dominante (64/73 ocorrências no grep) que a migração substitui.
const FROZEN_DEFAULT_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

// ─── CA2 — compatibilidade retroativa (o crítico) ───────────────────────────
describe('mysqlTestConnectionString — CA2 (compatibilidade retroativa)', () => {
  it('sem MYSQL_PORT, a conn é EXATAMENTE o literal congelado', () => {
    // Arrange: env vazio injetado → sem MYSQL_PORT ambiente (determinístico).
    const env = {};
    // Act
    const conn = mysqlTestConnectionString({ env });
    // Assert
    assert.equal(conn, FROZEN_DEFAULT_CONN);
  });
});

// ─── CA3 — override de porta via MYSQL_PORT ─────────────────────────────────
describe('mysqlTestConnectionString — CA3 (override de porta)', () => {
  it('MYSQL_PORT=3310 → a conn aponta para 3310', () => {
    const conn = mysqlTestConnectionString({ env: { MYSQL_PORT: '3310' } });
    assert.equal(conn, 'mysql://root:rootpw-migration-test-only@127.0.0.1:3310/core');
  });

  it('MYSQL_PORT=3310 → a conn NÃO contém a substring "3306"', () => {
    const conn = mysqlTestConnectionString({ env: { MYSQL_PORT: '3310' } });
    assert.equal(conn.includes('3306'), false, `fallback silencioso à 3306 detectado em: ${conn}`);
  });
});

// ─── CA4 — caminho de erro: sem fallback silencioso à 3306 ──────────────────
describe('mysqlTestConnectionString — CA4 (sem fallback silencioso à 3306)', () => {
  // O ECONNREFUSED real (porta livre sem MySQL) é propriedade de RUNTIME: exige rede,
  // seria flaky/lento no `pnpm test` puro e pertence ao W3/integração. O núcleo testável
  // SEM banco é: a conn aponta para a porta pedida e JAMAIS volta à 3306 por baixo dos panos.
  it('MYSQL_PORT=9999 (porta provável sem MySQL) → conn aponta :9999, nunca :3306', () => {
    const conn = mysqlTestConnectionString({ env: { MYSQL_PORT: '9999' } });
    assert.equal(conn, 'mysql://root:rootpw-migration-test-only@127.0.0.1:9999/core');
    assert.equal(conn.includes('3306'), false);
  });
});

// ─── Endurecimento — MYSQL_PORT vazio/branco cai no default ──────────────────
describe('mysqlTestConnectionString — endurecimento MYSQL_PORT vazio/branco', () => {
  // `?? '3306'` sozinho NÃO pega string vazia (só null/undefined) → produziria ":/core".
  for (const blank of ['', '   ']) {
    it(`MYSQL_PORT=${JSON.stringify(blank)} → cai no default 3306 (não vira ":/core")`, () => {
      const conn = mysqlTestConnectionString({ env: { MYSQL_PORT: blank } });
      assert.equal(conn, FROZEN_DEFAULT_CONN);
      assert.equal(conn.includes(':/core'), false, `porta vazia vazou como ":/core" em: ${conn}`);
    });
  }
});

// ─── Overrides de user/password/database ────────────────────────────────────
describe('mysqlTestConnectionString — overrides user/password/database', () => {
  it('override user+password (ex.: mysql://core:pw@...)', () => {
    const conn = mysqlTestConnectionString({ user: 'core', password: 'pw', env: {} });
    assert.equal(conn, 'mysql://core:pw@127.0.0.1:3306/core');
  });

  it('override database (ex.: .../inexistente — caminho de erro de conexão)', () => {
    const conn = mysqlTestConnectionString({
      user: 'invalid',
      password: 'invalid',
      database: 'inexistente',
      env: {},
    });
    assert.equal(conn, 'mysql://invalid:invalid@127.0.0.1:3306/inexistente');
  });

  it('override de credencial + MYSQL_PORT juntos (porta e usuário)', () => {
    const conn = mysqlTestConnectionString({
      user: 'core_app',
      password: 'apppw-migration-test-only',
      env: { MYSQL_PORT: '3310' },
    });
    assert.equal(conn, 'mysql://core_app:apppw-migration-test-only@127.0.0.1:3310/core');
  });
});

// ─── CA5 — precedência de MYSQL_TEST_URL ────────────────────────────────────
describe('mysqlTestUrl — CA5 (precedência de MYSQL_TEST_URL)', () => {
  it('com MYSQL_TEST_URL presente → retorna-a verbatim (precedência preservada)', () => {
    const override = 'mysql://root:rootpw-migration-test-only@db-ci:7777/core';
    const url = mysqlTestUrl({ MYSQL_TEST_URL: override });
    assert.equal(url, override);
  });

  it('sem MYSQL_TEST_URL → cai na connectionString default', () => {
    const url = mysqlTestUrl({});
    assert.equal(url, FROZEN_DEFAULT_CONN);
  });

  it('sem MYSQL_TEST_URL mas com MYSQL_PORT → connectionString honra a porta', () => {
    const url = mysqlTestUrl({ MYSQL_PORT: '3310' });
    assert.equal(url, 'mysql://root:rootpw-migration-test-only@127.0.0.1:3310/core');
  });
});

// ─── Constantes exportadas (host não parametrizável, porta default) ─────────
describe('mysql-conn — constantes exportadas', () => {
  it('MYSQL_TEST_HOST === "127.0.0.1" (host fora de escopo — não parametrizável)', () => {
    assert.equal(MYSQL_TEST_HOST, '127.0.0.1');
  });

  it('MYSQL_TEST_DEFAULT_PORT === "3306"', () => {
    assert.equal(MYSQL_TEST_DEFAULT_PORT, '3306');
  });
});
