/**
 * AUTH-JWT-KEY-BOOT-GUARD (#515) — guarda de boot da chave de assinatura do access token.
 *
 * Molde: `tests/shared/persistence/module-driver-config.test.ts` e
 * `tests/shared/http/email-link-base-urls.test.ts` — env INJETADO por parâmetro, nunca
 * `process.env` mutado, para que o teste não dependa de estado global.
 *
 * Nenhuma asserção depende de acentuação nem de frase exata — só do nome do módulo e do nome
 * da variável, que são os elementos que o operador precisa ler no stderr.
 */
import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose';

import { readAuthJwtKeys } from '#src/modules/auth/adapters/http/jwt-key-config.ts';

/** Par ES256 real, gerado uma vez — CA5 precisa de chave que importe de verdade. */
let VALID_PRIVATE = '';
let VALID_PUBLIC = '';

before(async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  VALID_PRIVATE = await exportPKCS8(privateKey);
  VALID_PUBLIC = await exportSPKI(publicKey);
});

const errorText = (result: Awaited<ReturnType<typeof readAuthJwtKeys>>): string =>
  result.ok ? '' : result.error.join('\n');

describe('AUTH-JWT-KEY-BOOT-GUARD — US1: producao sem chave nao sobe', () => {
  it('CA1 — producao + as duas variaveis ausentes: falha nomeando ambas', async () => {
    const r = await readAuthJwtKeys({ NODE_ENV: 'production' });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(errorText(r), /AUTH_JWT_PRIVATE_KEY/);
    assert.match(errorText(r), /AUTH_JWT_PUBLIC_KEY/);
    assert.match(errorText(r), /auth/);
  });

  it('CA2 — producao + so a privada presente: falha nomeando a PUBLICA que falta', async () => {
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: VALID_PRIVATE,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(errorText(r), /AUTH_JWT_PUBLIC_KEY/);
  });

  it('CA2 — producao + so a publica presente: falha nomeando a PRIVADA que falta', async () => {
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PUBLIC_KEY: VALID_PUBLIC,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(errorText(r), /AUTH_JWT_PRIVATE_KEY/);
  });

  it('CA2 — par incompleto reporta UMA falha, nao duas (so a que falta)', async () => {
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: VALID_PRIVATE,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 1);
  });

  it('CA1 — as duas ausentes reportam DUAS falhas de uma vez (acumulacao)', async () => {
    const r = await readAuthJwtKeys({ NODE_ENV: 'production' });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 2);
  });

  it('variavel vazia conta como AUSENTE, nunca como valor invalido', async () => {
    // Prova sem prescrever texto: o relatorio de `X=""` tem de ser IDENTICO ao de `X` nao declarada.
    const omitted = await readAuthJwtKeys({ NODE_ENV: 'production' });
    const empty = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: '',
      AUTH_JWT_PUBLIC_KEY: '',
    });

    assert.equal(omitted.ok, false);
    assert.equal(empty.ok, false);
    if (omitted.ok || empty.ok) return;
    assert.deepEqual(empty.error, omitted.error);
  });
});

describe('AUTH-JWT-KEY-BOOT-GUARD — US2: chave malformada e erro de CONFIGURACAO', () => {
  it('CA3 — producao + privada malformada: falha identificando a variavel invalida', async () => {
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: 'isto-nao-e-um-pem-pkcs8',
      AUTH_JWT_PUBLIC_KEY: VALID_PUBLIC,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(errorText(r), /AUTH_JWT_PRIVATE_KEY/);
  });

  it('CA3 — producao + publica malformada: falha identificando a variavel invalida', async () => {
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: VALID_PRIVATE,
      AUTH_JWT_PUBLIC_KEY: 'isto-nao-e-um-pem-spki',
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(errorText(r), /AUTH_JWT_PUBLIC_KEY/);
  });

  it('CA3 — chave malformada NAO escapa como excecao (o guard devolve Result)', async () => {
    // Hoje `importPKCS8` lança e a excecao sobe ate `main().catch` → exit 1 em vez de 78.
    await assert.doesNotReject(async () => {
      await readAuthJwtKeys({
        NODE_ENV: 'production',
        AUTH_JWT_PRIVATE_KEY: 'quebrada',
        AUTH_JWT_PUBLIC_KEY: 'quebrada',
      });
    });
  });

  it('par incompleto fora de producao TAMBEM falha (W2/M2)', async () => {
    // Trava de refactor: hoje o ramo de par incompleto nao consulta `isProduction`, e nao deve
    // passar a consultar. Se alguem reintroduzir um `if (isProduction)` ali, cair no efemero
    // ignoraria em silencio a metade que o operador configurou — a classe de defeito do #515.
    const soPrivada = await readAuthJwtKeys({ AUTH_JWT_PRIVATE_KEY: VALID_PRIVATE });
    const soPublica = await readAuthJwtKeys({ AUTH_JWT_PUBLIC_KEY: VALID_PUBLIC });

    assert.equal(soPrivada.ok, false);
    assert.equal(soPublica.ok, false);
    if (soPrivada.ok || soPublica.ok) return;
    assert.match(errorText(soPrivada), /AUTH_JWT_PUBLIC_KEY/);
    assert.match(errorText(soPublica), /AUTH_JWT_PRIVATE_KEY/);
  });

  it('CA3 — chave malformada fora de producao TAMBEM falha (valor errado e sempre erro)', async () => {
    // Ausencia degrada fora de producao (CA4); valor PRESENTE porem invalido e engano do operador
    // em qualquer ambiente — degradar aqui esconderia o defeito ate a producao.
    const r = await readAuthJwtKeys({
      AUTH_JWT_PRIVATE_KEY: 'quebrada',
      AUTH_JWT_PUBLIC_KEY: 'quebrada',
    });

    assert.equal(r.ok, false);
  });
});

describe('AUTH-JWT-KEY-BOOT-GUARD — US3: fora de producao segue efemero, com aviso', () => {
  it('CA4 — sem NODE_ENV e sem chaves: ok, sem chaves resolvidas, COM aviso', async () => {
    const r = await readAuthJwtKeys({});

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.keys, undefined);
    assert.equal(r.value.warnings.length > 0, true);
    assert.match(r.value.warnings.join('\n'), /AUTH_JWT_PRIVATE_KEY|efemer|restart/i);
  });

  it('CA4 — NODE_ENV=development sem chaves: mesmo comportamento', async () => {
    const r = await readAuthJwtKeys({ NODE_ENV: 'development' });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.keys, undefined);
    assert.equal(r.value.warnings.length > 0, true);
  });

  it('CA4 — o aviso e emitido SO quando as chaves faltam (ambiente correto e silencioso)', async () => {
    const r = await readAuthJwtKeys({
      AUTH_JWT_PRIVATE_KEY: VALID_PRIVATE,
      AUTH_JWT_PUBLIC_KEY: VALID_PUBLIC,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.warnings.length, 0);
  });
});

describe('AUTH-JWT-KEY-BOOT-GUARD — US4: ambiente correto nao muda de comportamento', () => {
  it('CA5 — producao + as duas validas: ok, chaves resolvidas, sem aviso', async () => {
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: VALID_PRIVATE,
      AUTH_JWT_PUBLIC_KEY: VALID_PUBLIC,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.notEqual(r.value.keys, undefined);
    assert.equal(r.value.warnings.length, 0);
  });

  it('CA5 — as chaves resolvidas sao CryptoKey utilizaveis pelo emissor ES256', async () => {
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: VALID_PRIVATE,
      AUTH_JWT_PUBLIC_KEY: VALID_PUBLIC,
    });

    assert.equal(r.ok, true);
    if (!r.ok || r.value.keys === undefined) return;
    assert.equal(r.value.keys.privateKey.type, 'private');
    assert.equal(r.value.keys.publicKey.type, 'public');
    assert.equal(r.value.keys.privateKey.algorithm.name, 'ECDSA');
  });
});

describe('AUTH-JWT-KEY-BOOT-GUARD — invariante de credencial (CWE-532 / CWE-117)', () => {
  it('nenhuma mensagem de erro ecoa o material da chave PRIVADA', async () => {
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: VALID_PRIVATE,
      AUTH_JWT_PUBLIC_KEY: 'quebrada',
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    const texto = errorText(r);
    // nem o PEM inteiro, nem qualquer linha de base64 dele
    assert.equal(texto.includes(VALID_PRIVATE), false, 'o PEM da chave privada vazou na mensagem');
    for (const linha of VALID_PRIVATE.split('\n')) {
      if (linha.length > 16 && !linha.startsWith('-----')) {
        assert.equal(texto.includes(linha), false, 'um trecho do PEM privado vazou na mensagem');
      }
    }
    // a mensagem segue util
    assert.match(texto, /AUTH_JWT_PUBLIC_KEY/);
  });

  it('o valor invalido nao e ecoado cru (nem truncado) na mensagem', async () => {
    const VENENO = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQSEGREDO';
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: VENENO,
      AUTH_JWT_PUBLIC_KEY: VENENO,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    const texto = errorText(r);
    assert.equal(texto.includes(VENENO), false, 'o valor da variavel vazou cru');
    assert.equal(texto.includes(VENENO.slice(0, 20)), false, 'um prefixo do valor vazou');
  });

  it('valor com quebra de linha nao forja linha extra no relatorio de erro', async () => {
    // CWE-117: um `\n` no valor nao pode virar uma linha inteira de diagnostico no stderr.
    const r = await readAuthJwtKeys({
      NODE_ENV: 'production',
      AUTH_JWT_PRIVATE_KEY: 'x\nserver: AUTH_JWT_PUBLIC_KEY configurada corretamente',
      AUTH_JWT_PUBLIC_KEY: VALID_PUBLIC,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    for (const mensagem of r.error) {
      assert.equal(mensagem.includes('\n'), false, 'uma mensagem carrega quebra de linha');
    }
  });
});
