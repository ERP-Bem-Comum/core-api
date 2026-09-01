/**
 * Fail-fast do storage de logo do programs — issues #516 e #799, ADR-0068.
 *
 * O defeito medido em 2026-07-22: nem produção nem QA declaravam qualquer `PROGRAMS_LOGO_*`, e os
 * dois subiam com store EM MEMÓRIA sem erro e sem aviso. O upload respondia sucesso e o arquivo
 * evaporava no restart seguinte.
 *
 * O #516 curou isso **só em produção**. O **ADR-0068 (31/08/2026) removeu a assimetria**: ausente ou
 * pela metade derruba o boot em TODO ambiente. Não existe mais o desfecho "memória com aviso".
 *
 * O caso que ainda separa este arquivo do #456 é o **CA3**, e ele NÃO é degradação: **ausência das
 * DUAS credenciais é caminho legítimo** — é como a task roda no ECS, autenticando pelo IAM Role via
 * provider chain. Um teste que exigisse chave estática quebraria produção para "consertar" um
 * defeito de produção.
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

/**
 * Endpoint e bucket declarados e SEM credencial — o desenho real do ECS (CA3).
 * **Sem `NODE_ENV`, de propósito:** sob o ADR-0068 o ambiente não participa da decisão, e um fixture
 * que carregasse `production` esconderia isso.
 */
const IAM_ROLE: Env = {
  PROGRAMS_LOGO_S3_ENDPOINT: ENDPOINT,
  PROGRAMS_LOGO_S3_BUCKET: BUCKET,
};

const withEnv = (base: Env, extra: Env): Env => ({ ...base, ...extra });

/** Cópia do ambiente sem as chaves informadas (simula variável não declarada). */
const without = (env: Env, ...keys: readonly string[]): Env =>
  Object.fromEntries(Object.entries(env).filter(([key]) => !keys.includes(key)));

const errorText = (result: ConfigResult): string => (result.ok ? '' : result.error.join('\n'));

describe('programs logo storage — CA1: sem endpoint/bucket o boot nao segue (#516)', () => {
  it('CA1.1 — nada declarado: erro nomeia AS DUAS variaveis no mesmo retorno', () => {
    const r = readProgramsLogoConfig({});

    assert.equal(r.ok, false);
    if (r.ok) return;
    // Diagnostico completo numa tentativa: quem le o stderr declara as duas de uma vez.
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_ENDPOINT/);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_BUCKET/);
  });

  it('CA1.2 — bucket ausente: erro nomeia o bucket', () => {
    const r = readProgramsLogoConfig(without(IAM_ROLE, 'PROGRAMS_LOGO_S3_BUCKET'));

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_BUCKET/);
  });

  it('CA1.3 — endpoint ausente: erro nomeia o endpoint', () => {
    const r = readProgramsLogoConfig(without(IAM_ROLE, 'PROGRAMS_LOGO_S3_ENDPOINT'));

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_ENDPOINT/);
  });

  it('CA1.4 — variavel VAZIA conta como ausente, nunca como endpoint valido', () => {
    const r = readProgramsLogoConfig(withEnv(IAM_ROLE, { PROGRAMS_LOGO_S3_ENDPOINT: '' }));

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_ENDPOINT/);
  });
});

describe('programs logo storage — CA2: credencial pela metade e erro, nunca memoria (#516)', () => {
  it('CA2.1 — ACCESS_KEY_ID sem SECRET: erro nomeia o SECRET que falta', () => {
    const r = readProgramsLogoConfig(
      withEnv(IAM_ROLE, { PROGRAMS_LOGO_S3_ACCESS_KEY_ID: 'AKIAEXEMPLO' }),
    );

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY/);
  });

  it('CA2.2 — SECRET sem ACCESS_KEY_ID: erro nomeia a chave que falta', () => {
    const r = readProgramsLogoConfig(
      withEnv(IAM_ROLE, { PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY: 'segredo-de-teste' }),
    );

    assert.equal(r.ok, false);
    assert.match(errorText(r), /PROGRAMS_LOGO_S3_ACCESS_KEY_ID/);
  });

  it('CA2.3 — a mensagem do XOR NAO ecoa o valor da credencial declarada (CWE-532)', () => {
    const secret = 'segredo-que-nao-pode-vazar';
    const r = readProgramsLogoConfig(
      withEnv(IAM_ROLE, { PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY: secret }),
    );

    assert.equal(r.ok, false);
    assert.equal(errorText(r).includes(secret), false);
  });
});

describe('programs logo storage — CA3: provider chain (IAM Role) e caminho legitimo (#516)', () => {
  it('CA3.1 — CRITICO: endpoint/bucket sem credencial NENHUMA sobe normalmente', () => {
    const r = readProgramsLogoConfig(IAM_ROLE);

    // Se este teste virar vermelho, o fail-fast derrubou o boot de producao no ECS. Ausencia das
    // duas credenciais NAO e degradacao — e a forma como a task autentica.
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.endpoint, ENDPOINT);
    assert.equal(r.value.bucket, BUCKET);
    // Credencial ausente tem de continuar AUSENTE: quem resolve e a provider chain do SDK.
    assert.equal(r.value.accessKeyId, undefined);
    assert.equal(r.value.secretAccessKey, undefined);
  });

  it('CA3.2 — as duas credenciais: config estatica', () => {
    const r = readProgramsLogoConfig(
      withEnv(IAM_ROLE, {
        PROGRAMS_LOGO_S3_ACCESS_KEY_ID: 'AKIAEXEMPLO',
        PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY: 'segredo-de-teste',
      }),
    );

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.accessKeyId, 'AKIAEXEMPLO');
    assert.equal(r.value.secretAccessKey, 'segredo-de-teste');
  });

  it('CA3.3 — defaults preservados: region us-east-1 e forcePathStyle ligado (MinIO/ADR-0019)', () => {
    const r = readProgramsLogoConfig(IAM_ROLE);

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.region, 'us-east-1');
    assert.equal(r.value.forcePathStyle, true);
  });

  it('CA3.4 — region e forcePathStyle declarados vencem os defaults', () => {
    const r = readProgramsLogoConfig(
      withEnv(IAM_ROLE, {
        PROGRAMS_LOGO_S3_REGION: 'br-se1',
        PROGRAMS_LOGO_S3_FORCE_PATH_STYLE: 'false',
      }),
    );

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.region, 'br-se1');
    assert.equal(r.value.forcePathStyle, false);
  });
});

/**
 * O grupo que o ADR-0068 acrescentou, e o mais fácil de desfazer sem querer: reintroduzir um
 * `isProductionEnv` neste arquivo faria a assimetria do #516 voltar em silêncio. Os casos aqui
 * comparam o MESMO ambiente com e sem `NODE_ENV=production` e exigem retorno idêntico.
 */
describe('programs logo storage — ADR-0068: a decisao NAO olha o ambiente', () => {
  const cenarios: readonly Env[] = [
    {},
    IAM_ROLE,
    withEnv(IAM_ROLE, { PROGRAMS_LOGO_S3_ACCESS_KEY_ID: 'AKIAEXEMPLO' }),
    without(IAM_ROLE, 'PROGRAMS_LOGO_S3_BUCKET'),
  ];

  it('CA4 — nada declarado derruba o boot tambem FORA de producao', () => {
    // Antes do ADR-0068 este caminho devolvia `ok` com storage em memoria e um aviso. Era o modo
    // como um dev descobria, no restart, que o upload nunca tinha sido gravado.
    for (const nodeEnv of ['development', 'test', undefined]) {
      const env = nodeEnv === undefined ? {} : { NODE_ENV: nodeEnv };
      const r = readProgramsLogoConfig(env);
      assert.equal(r.ok, false, `deveria falhar com NODE_ENV=${String(nodeEnv)}`);
    }
  });

  it('CA5 — NODE_ENV nao muda desfecho NENHUM, nem no erro nem no sucesso', () => {
    for (const env of cenarios) {
      const fora = readProgramsLogoConfig(env);
      const dentro = readProgramsLogoConfig({ ...env, NODE_ENV: 'production' });
      assert.equal(fora.ok, dentro.ok, 'o ambiente mudou o veredito');
      assert.deepEqual(
        fora.ok ? fora.value : fora.error,
        dentro.ok ? dentro.value : dentro.error,
        'o ambiente mudou o conteudo do retorno',
      );
    }
  });

  it('CA6 — MinIO local completo (compose do dev) sobe configurado', () => {
    // O caminho que o ADR-0068 deixa para quem roda local: declarar as envs apontando para o
    // container, em vez de contar com a degradacao.
    const r = readProgramsLogoConfig({
      NODE_ENV: 'development',
      PROGRAMS_LOGO_S3_ENDPOINT: 'http://localhost:9000',
      PROGRAMS_LOGO_S3_BUCKET: 'programs-logo',
      PROGRAMS_LOGO_S3_ACCESS_KEY_ID: 'minioadmin',
      PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY: 'minioadmin',
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.endpoint, 'http://localhost:9000');
  });
});
