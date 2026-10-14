/**
 * `describeEmailConfigError` — a mensagem de boot NOMEIA a variável culpada.
 *
 * O caso que originou a função: o `worker-email` imprimia só o `tag`
 * (`config de e-mail inválida (invalid-provider-config)`) e saía com 78. O `reason`, que carrega o
 * `field`, era descartado — e sob o overmind os outros quatro processos caem em cima da mensagem,
 * então o terminal fica cheio de `Interrupting...` e nenhuma pista. Dois boots seguidos em
 * 14/10/2026 só se resolveram com uma sonda que chamava `parseEmailConfig` à parte.
 *
 * O ADR-0068 justifica o fail-fast assim: "o processo não sobe E DIZ QUAL CAMPO FALTA — é o único
 * [modo de falha] que chega a quem tem a mão no problema". Sem o nome do campo, metade da política
 * não era cumprida.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  describeEmailConfigError,
  type EmailConfigError,
} from '#src/modules/notifications/public-api/index.ts';

describe('describeEmailConfigError', () => {
  it('nomeia a variável quando o adapter SMTP recusa por campo ausente ou vazio', () => {
    const msg = describeEmailConfigError({
      tag: 'invalid-provider-config',
      provider: 'smtp',
      reason: { tag: 'missing-env', field: 'SMTP_USER' },
    });

    assert.match(msg, /SMTP_USER/, 'a mensagem tem de citar o campo — é o que faltava');
    assert.match(msg, /VAZIA/, 'vazio conta como ausente, e quem lê precisa saber disso');
    assert.match(msg, /smtp/, 'o provider selecionado situa o erro');
  });

  it('nomeia a variável quando o adapter Resend recusa', () => {
    const msg = describeEmailConfigError({
      tag: 'invalid-provider-config',
      provider: 'resend',
      reason: { tag: 'missing-env', field: 'RESEND_API_KEY' },
    });

    assert.match(msg, /RESEND_API_KEY/);
    assert.match(msg, /resend/);
  });

  it('cita o valor recusado só onde ele não é credencial', () => {
    const porta = describeEmailConfigError({
      tag: 'invalid-provider-config',
      provider: 'smtp',
      reason: { tag: 'invalid-port', raw: '66000' },
    });
    assert.match(porta, /SMTP_PORT/);
    assert.match(porta, /66000/, 'porta não é segredo: ecoar ajuda a achar o erro de digitação');

    const conns = describeEmailConfigError({
      tag: 'invalid-provider-config',
      provider: 'smtp',
      reason: { tag: 'invalid-max-connections', raw: 'muitas' },
    });
    assert.match(conns, /SMTP_MAX_CONNS/);
    assert.match(conns, /muitas/);
  });

  it('NUNCA ecoa o valor de campo que pode ser credencial (CWE-532)', () => {
    // `SMTP_PASS` e `SMTP_USER` só falham como `missing-env`, que carrega o NOME e nada mais.
    // Esta asserção é a guarda: variante nova que traga `raw` de campo sensível quebra aqui.
    const msg = describeEmailConfigError({
      tag: 'invalid-provider-config',
      provider: 'smtp',
      reason: { tag: 'missing-env', field: 'SMTP_PASS' },
    });

    assert.match(msg, /SMTP_PASS/);
    assert.doesNotMatch(
      msg,
      /senha|s3nh4|password/i,
      'a mensagem descreve a AUSÊNCIA; nenhum valor entra nela',
    );
  });

  it('neutraliza caractere de controle no valor ecoado (CWE-117, forja de linha)', () => {
    const msg = describeEmailConfigError({
      tag: 'invalid-provider-config',
      provider: 'smtp',
      reason: { tag: 'invalid-port', raw: '80\nFAKE: linha forjada no stderr' },
    });

    assert.doesNotMatch(
      msg,
      /\n/,
      'um `\\n` cru no valor forjaria uma linha inteira de diagnóstico que ninguém emitiu',
    );
  });

  it('cobre as outras variantes sem cair em string vazia', () => {
    const casos: readonly EmailConfigError[] = [
      { tag: 'invalid-provider', raw: 'sendgrid' },
      { tag: 'invalid-from', field: 'EMAIL_FROM', reason: 'invalid-format' as never },
      { tag: 'from-domain-not-allowed', field: 'EMAIL_FROM', domain: 'exemplo.com' },
      { tag: 'invalid-rate-limit', reason: 'EMAIL_RATE_LIMIT_MAX não é inteiro' },
    ];

    for (const caso of casos) {
      const msg = describeEmailConfigError(caso);
      assert.ok(
        msg.length > 10,
        `variante \`${caso.tag}\` devolveu mensagem vazia ou curta demais`,
      );
    }
  });
});
