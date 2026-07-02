/**
 * W0 (RED) - Tests para parseSmtpConfig (parser puro env -> SmtpConfig).
 *
 * Ticket: CTR-EMAIL-ADAPTER-NODEMAILER.
 *
 * Cobre CA-T1..T6:
 *   - T1: env valido completo retorna ok com pool=true, maxConnections=5 default
 *   - T2: SMTP_HOST ausente retorna err missing-env field SMTP_HOST
 *   - T3: SMTP_PORT='abc' retorna err invalid-port raw 'abc'
 *   - T4: SMTP_POOL='false' retorna ok com pool=false
 *   - T5: SMTP_MAX_CONNS='10' retorna ok com maxConnections=10
 *   - T6: SMTP_MAX_CONNS='-3' retorna err invalid-max-connections raw '-3'
 *
 * Estes tests DEVEM FALHAR em W0 - nodemailer-config.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseSmtpConfig } from '#src/modules/notifications/adapters/email/nodemailer-config.ts';

const baseEnv = (): NodeJS.ProcessEnv => ({
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'sekret',
});

describe('parseSmtpConfig', () => {
  it('CA-T1: env valido completo retorna ok com pool=true e maxConnections=5 (defaults)', () => {
    // Act
    const r = parseSmtpConfig(baseEnv());

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.host, 'smtp.example.com');
      assert.equal(r.value.port, 587);
      assert.equal(r.value.secure, false);
      assert.equal(r.value.user, 'user@example.com');
      assert.equal(r.value.pass, 'sekret');
      assert.equal(r.value.pool, true, 'pool default deve ser true');
      assert.equal(r.value.maxConnections, 5, 'maxConnections default deve ser 5');
    }
  });

  it('CA-T2: SMTP_HOST ausente retorna err missing-env', () => {
    // Arrange
    const env = baseEnv();
    delete env['SMTP_HOST'];

    // Act
    const r = parseSmtpConfig(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'missing-env') {
      assert.equal(r.error.field, 'SMTP_HOST');
    } else {
      assert.fail(`esperado missing-env SMTP_HOST; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA-T3: SMTP_PORT nao-numerico retorna err invalid-port', () => {
    // Arrange
    const env = baseEnv();
    env['SMTP_PORT'] = 'abc';

    // Act
    const r = parseSmtpConfig(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'invalid-port') {
      assert.equal(r.error.raw, 'abc');
    } else {
      assert.fail(`esperado invalid-port raw='abc'; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA-T4: SMTP_POOL=false retorna ok com pool=false', () => {
    // Arrange
    const env = baseEnv();
    env['SMTP_POOL'] = 'false';

    // Act
    const r = parseSmtpConfig(env);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.pool, false);
    }
  });

  it('CA-T5: SMTP_MAX_CONNS=10 retorna ok com maxConnections=10', () => {
    // Arrange
    const env = baseEnv();
    env['SMTP_MAX_CONNS'] = '10';

    // Act
    const r = parseSmtpConfig(env);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.maxConnections, 10);
    }
  });

  it('CA-T6: SMTP_MAX_CONNS negativo retorna err invalid-max-connections', () => {
    // Arrange
    const env = baseEnv();
    env['SMTP_MAX_CONNS'] = '-3';

    // Act
    const r = parseSmtpConfig(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'invalid-max-connections') {
      assert.equal(r.error.raw, '-3');
    } else {
      assert.fail(`esperado invalid-max-connections raw='-3'; obtido: ${JSON.stringify(r)}`);
    }
  });
});

/**
 * W0 (RED) - NOTIF-SMTP-REQUIRETLS: STARTTLS obrigatorio (hardening).
 *
 * Novo campo `requireTLS` em SmtpConfig, derivado da env SMTP_REQUIRE_TLS.
 *
 * Contrato (decidido no W0, ver 002-tests/REPORT.md secao "Decisao CA4"):
 *   - SMTP_REQUIRE_TLS === 'false'  -> requireTLS = false (opt-out explicito)
 *   - qualquer outro valor / ausente -> requireTLS = default fail-secure = !secure
 *       (true quando SMTP_SECURE=false; false quando SMTP_SECURE=true)
 *
 * Rationale do fail-secure tolerante: espelha o parsing booleano JA existente
 * nesta funcao (SMTP_POOL linha 75, SMTP_SECURE linha 80) que NUNCA rejeita valor
 * malformado - so a string exata decide, resto cai no default. Como e um controle
 * de seguranca, o default e seguro: um typo nunca desativa a exigencia de TLS.
 *
 * Estes tests DEVEM FALHAR em W0 - o campo requireTLS ainda nao existe em SmtpConfig
 * (r.value.requireTLS === undefined em runtime).
 *
 * ASCII puro.
 */
describe('parseSmtpConfig - requireTLS (NOTIF-SMTP-REQUIRETLS)', () => {
  it('CA1: SMTP_SECURE=false e SMTP_REQUIRE_TLS ausente -> requireTLS=true (default fail-secure)', () => {
    // Arrange - baseEnv() ja tem SMTP_SECURE='false' e nenhum SMTP_REQUIRE_TLS.

    // Act
    const r = parseSmtpConfig(baseEnv());

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.requireTLS, true, 'default fail-secure quando secure=false');
    }
  });

  it('CA2: SMTP_REQUIRE_TLS=false explicito -> requireTLS=false (opt-out consciente, dev/Mailpit)', () => {
    // Arrange
    const env = baseEnv();
    env['SMTP_REQUIRE_TLS'] = 'false';

    // Act
    const r = parseSmtpConfig(env);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.requireTLS, false);
    }
  });

  it('CA3: SMTP_SECURE=true (465) e SMTP_REQUIRE_TLS ausente -> secure=true e requireTLS=false (nao interfere)', () => {
    // Arrange
    const env = baseEnv();
    env['SMTP_SECURE'] = 'true';
    env['SMTP_PORT'] = '465';

    // Act
    const r = parseSmtpConfig(env);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.secure, true, 'comportamento atual do secure preservado');
      assert.equal(r.value.requireTLS, false, 'fail-secure default so aplica quando secure=false');
    }
  });

  it('CA4: SMTP_REQUIRE_TLS malformado -> tolerante fail-secure (ok, requireTLS=true, sem rejeitar)', () => {
    // Arrange
    const env = baseEnv();
    env['SMTP_REQUIRE_TLS'] = 'banana';

    // Act
    const r = parseSmtpConfig(env);

    // Assert
    assert.equal(
      r.ok,
      true,
      'env booleana nao e rejeitada (padrao SMTP_POOL linha 75 / SMTP_SECURE linha 80)',
    );
    if (r.ok) {
      assert.equal(
        r.value.requireTLS,
        true,
        'so a string exata "false" desativa; typo mantem TLS exigido (fail-secure)',
      );
    }
  });

  it('CA4 (boundary): SMTP_REQUIRE_TLS=FALSE (maiusculo) nao desativa (match exato, como SMTP_POOL)', () => {
    // Arrange
    const env = baseEnv();
    env['SMTP_REQUIRE_TLS'] = 'FALSE';

    // Act
    const r = parseSmtpConfig(env);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.requireTLS, true, 'apenas "false" minusculo e opt-out');
    }
  });
});
