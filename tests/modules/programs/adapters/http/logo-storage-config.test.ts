/**
 * Fail-fast do storage de logo do programs — issue #516.
 *
 * O defeito medido em 2026-07-22: nem produção nem QA declaravam qualquer `PROGRAMS_LOGO_*`, e os
 * dois subiam com store EM MEMÓRIA sem erro e sem aviso. O upload respondia sucesso e o arquivo
 * evaporava no restart seguinte. Molde de desenho: `shared/persistence/module-driver-config.ts`
 * (#456) e `shared/http/email-link-base-urls.ts` (#331/#332).
 *
 * O caso que separa esta issue do #456 é o CA3: **ausência das DUAS credenciais é caminho legítimo**
 * — é como a task roda no ECS, autenticando pelo IAM Role via provider chain. Um teste que exigisse
 * chave estática em produção quebraria produção para "consertar" um defeito de produção.
 *
 * Nenhuma asserção depende de frase exata nem de acentuação: só do nome da variável que o operador
 * precisa declarar, que é o que a mensagem existe para dizer.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { readProgramsLogoConfig } from '#src/modules/programs/public-api/http.ts';

type Env = Readonly<Record<string, string | undefined>>;
type ConfigResult = ReturnType<typeof readProgramsLogoConfig>;

const ENDPOINT = 'https://br-se1.magaluobjects.com';
const BUCKET = 'erp-programs-logo';

/** Produção com endpoint e bucket declarados e SEM credencial — o desenho real do ECS (CA3). */
const PROD_IAM_ROLE: Env = {
  NODE_ENV: 'production',
  PROGRAMS_LOGO_S3_ENDPOINT: ENDPOINT,
  PROGRAMS_LOGO_S3_BUCKET: BUCKET,
};

const withEnv = (base: Env, extra: Env): Env => ({ ...base, ...extra });

/** Cópia do ambiente sem as chaves informadas (simula variável não declarada). */
const without = (env: Env, ...keys: readonly string[]): Env =>
  Object.fromEntries(Object.entries(env).filter(([key]) => !keys.includes(key)));

const errorText = (result: ConfigResult): string => (result.ok ? '' : result.error.join('\n'));

const warningText = (result: ConfigResult): string =>
  result.ok ? result.value.warnings.join('\n') : '';

describe('programs logo storage — CA1: producao sem endpoint/bucket derruba o boot (#516)', () => {
  it('CA1.1 — producao + nada declarado: erro nomeia AS DUAS variaveis no mesmo retorno', () => {
    const r = readProgramsLogoConfig({ NODE_ENV: 'production' });

    assert.equal(r.ok, false);
    if (r.ok) return;
    // Diagnostico completo numa tentativa: quem le o stderr declara as duas de uma vez.
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_ENDPOINT/);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_BUCKET/);
  });

  it('CA1.2 — producao + bucket ausente: erro nomeia o bucket', () => {
    const r = readProgramsLogoConfig(without(PROD_IAM_ROLE, 'PROGRAMS_LOGO_S3_BUCKET'));

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_BUCKET/);
  });

  it('CA1.3 — producao + endpoint ausente: erro nomeia o endpoint', () => {
    const r = readProgramsLogoConfig(without(PROD_IAM_ROLE, 'PROGRAMS_LOGO_S3_ENDPOINT'));

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_ENDPOINT/);
  });

  it('CA1.4 — variavel VAZIA conta como ausente, nunca como endpoint valido', () => {
    const r = readProgramsLogoConfig(withEnv(PROD_IAM_ROLE, { PROGRAMS_LOGO_S3_ENDPOINT: '' }));

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_ENDPOINT/);
  });

  it('CA1.5 — NODE_ENV normalizado (#606): "Production" tambem e producao e barra o boot', () => {
    const r = readProgramsLogoConfig({ NODE_ENV: 'Production' });

    assert.equal(r.ok, false);
  });
});

describe('programs logo storage — CA2: credencial pela metade e erro, nunca memoria (#516)', () => {
  it('CA2.1 — producao + ACCESS_KEY_ID sem SECRET: erro nomeia o SECRET que falta', () => {
    const r = readProgramsLogoConfig(
      withEnv(PROD_IAM_ROLE, { PROGRAMS_LOGO_S3_ACCESS_KEY_ID: 'AKIAEXEMPLO' }),
    );

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY/);
  });

  it('CA2.2 — producao + SECRET sem ACCESS_KEY_ID: erro nomeia a chave que falta', () => {
    const r = readProgramsLogoConfig(
      withEnv(PROD_IAM_ROLE, { PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY: 'segredo-de-teste' }),
    );

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_ACCESS_KEY_ID/);
  });

  it('CA2.3 — a mensagem do XOR NAO ecoa o valor da credencial declarada (CWE-532)', () => {
    const secret = 'segredo-que-nao-pode-vazar';
    const r = readProgramsLogoConfig(
      withEnv(PROD_IAM_ROLE, { PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY: secret }),
    );

    assert.equal(r.ok, false);
    assert.equal(errorText(r).includes(secret), false);
  });
});

describe('programs logo storage — CA3: provider chain (IAM Role) e caminho legitimo (#516)', () => {
  it('CA3.1 — CRITICO: producao + endpoint/bucket sem credencial NENHUMA sobe normalmente', () => {
    const r = readProgramsLogoConfig(PROD_IAM_ROLE);

    // Se este teste virar vermelho, a correcao do #516 derrubou o boot de producao no ECS.
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.notEqual(r.value.config, undefined);
    assert.equal(r.value.config?.endpoint, ENDPOINT);
    assert.equal(r.value.config?.bucket, BUCKET);
    // Credencial ausente tem de continuar AUSENTE: quem resolve e a provider chain do SDK.
    assert.equal(r.value.config?.accessKeyId, undefined);
    assert.equal(r.value.config?.secretAccessKey, undefined);
    // Caminho legitimo nao emite aviso — aviso aqui viraria ruido em todo boot de producao.
    assert.deepEqual(r.value.warnings, []);
  });

  it('CA3.2 — producao + as duas credenciais: config estatica, sem aviso', () => {
    const r = readProgramsLogoConfig(
      withEnv(PROD_IAM_ROLE, {
        PROGRAMS_LOGO_S3_ACCESS_KEY_ID: 'AKIAEXEMPLO',
        PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY: 'segredo-de-teste',
      }),
    );

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.config?.accessKeyId, 'AKIAEXEMPLO');
    assert.equal(r.value.config?.secretAccessKey, 'segredo-de-teste');
    assert.deepEqual(r.value.warnings, []);
  });

  it('CA3.3 — defaults preservados: region us-east-1 e forcePathStyle ligado (MinIO/ADR-0019)', () => {
    const r = readProgramsLogoConfig(PROD_IAM_ROLE);

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.config?.region, 'us-east-1');
    assert.equal(r.value.config?.forcePathStyle, true);
  });

  it('CA3.4 — region e forcePathStyle declarados vencem os defaults', () => {
    const r = readProgramsLogoConfig(
      withEnv(PROD_IAM_ROLE, {
        PROGRAMS_LOGO_S3_REGION: 'br-se1',
        PROGRAMS_LOGO_S3_FORCE_PATH_STYLE: 'false',
      }),
    );

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.config?.region, 'br-se1');
    assert.equal(r.value.config?.forcePathStyle, false);
  });
});

describe('programs logo storage — CA4/CA5: fora de producao degrada AVISANDO (#516)', () => {
  it('CA4.1 — dev sem nada declarado: memoria + aviso que nomeia as variaveis', () => {
    const r = readProgramsLogoConfig({ NODE_ENV: 'development' });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.config, undefined);
    assert.equal(r.value.warnings.length, 1);
    assert.match(warningText(r), /PROGRAMS_LOGO_S3_ENDPOINT/);
    assert.match(warningText(r), /PROGRAMS_LOGO_S3_BUCKET/);
  });

  it('CA4.2 — NODE_ENV ausente (teste local) nao e producao: memoria com aviso, nunca erro', () => {
    const r = readProgramsLogoConfig({});

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.config, undefined);
    assert.equal(r.value.warnings.length, 1);
  });

  it('CA4.3 — dev + credencial pela metade: memoria, e o aviso diz QUAL metade falta', () => {
    const r = readProgramsLogoConfig({
      NODE_ENV: 'development',
      PROGRAMS_LOGO_S3_ENDPOINT: ENDPOINT,
      PROGRAMS_LOGO_S3_BUCKET: BUCKET,
      PROGRAMS_LOGO_S3_ACCESS_KEY_ID: 'minioadmin',
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.config, undefined);
    assert.match(warningText(r), /PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY/);
  });

  it('CA5 — dev com MinIO completo (compose local) sobe configurado e sem aviso', () => {
    const r = readProgramsLogoConfig({
      NODE_ENV: 'development',
      PROGRAMS_LOGO_S3_ENDPOINT: 'http://localhost:9000',
      PROGRAMS_LOGO_S3_BUCKET: 'programs-logo',
      PROGRAMS_LOGO_S3_ACCESS_KEY_ID: 'minioadmin',
      PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY: 'minioadmin',
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.config?.endpoint, 'http://localhost:9000');
    assert.deepEqual(r.value.warnings, []);
  });
});
