/**
 * `echoEnvValue` — eco seguro do valor de uma env em mensagem de boot (CWE-117).
 *
 * Nasceu de um achado do revisor no PR #916: `describeAwsS3EnvError` e `describeVanS3ConfigError`
 * interpolavam `error.raw` cru, e o valor vem do ambiente. A guarda dos 7 drivers já cobrava a mesma
 * propriedade (caso 16), com um controle PRÓPRIO e mais restritivo — a régua existia de um lado e
 * não tinha sido aplicada aos dois novos.
 *
 * ⚠️ Esta função resolve **log forging**, não vazamento de credencial. A distinção está no docblock
 * de `env-echo.ts` e é o que impede alguém de usá-la onde a regra correta é a de forma.
 *
 * ⚠️ Os caracteres de controle entram por `String.fromCodePoint`, nunca como escape no fonte: a
 * ferramenta de edição converte `\uXXXX` no caractere literal, e um caractere de controle literal
 * aqui seria invisível na revisão — exatamente o que este teste existe para pegar.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { echoEnvValue } from '#src/shared/runtime/env-echo.ts';

const LF = String.fromCodePoint(0x0a);

describe('echoEnvValue — nenhum valor de env parte a linha do stderr (CWE-117)', () => {
  it('neutraliza a quebra de linha que forjaria uma linha de diagnostico', () => {
    // O ataque real: quem controla a env escreve um valor que, ecoado cru, faz o boot parecer ter
    // emitido uma mensagem tranquilizadora que ninguem emitiu.
    const forjado = `saida/${LF}server: financial: tudo certo`;
    const eco = echoEnvValue(forjado);

    assert.equal(eco.includes(LF), false, 'o eco ainda parte a linha');
    // o conteudo continua legivel — a mensagem existe para o operador consertar o valor
    assert.match(eco, /saida\//);
  });

  it('neutraliza CR, tab, DEL, C1 e os separadores de linha Unicode — nao so o LF', () => {
    // CR sozinho reposiciona o cursor no terminal e some com o que veio antes; U+2028/U+2029 sao
    // quebras de linha para muitos parsers de log; C1 (U+0080..U+009F) passa despercebido em revisao.
    const pontos = [0x0d, 0x09, 0x00, 0x1f, 0x7f, 0x85, 0x9f, 0x2028, 0x2029];

    for (const cp of pontos) {
      const bruto = `a${String.fromCodePoint(cp)}b`;
      assert.match(
        echoEnvValue(bruto),
        /^a\?b$/,
        `nao neutralizou U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
      );
    }
  });

  it('marca o que removeu em vez de apagar em silencio', () => {
    // Apagar sem deixar rastro esconderia a tentativa de quem a fez — e faria o operador procurar um
    // valor que a mensagem nao mostra por inteiro.
    assert.equal(echoEnvValue(`x${LF}y`), 'x?y');
  });

  it('preserva intacto o valor legitimo, que e o caso comum', () => {
    for (const valor of ['saida/', 'talvez', 'MEU-BUCKET', 'erp-programs-logo', '1', '']) {
      assert.equal(echoEnvValue(valor), valor);
    }
  });

  it('trunca valor absurdamente longo, dizendo quanto ficou de fora', () => {
    const eco = echoEnvValue('a'.repeat(200));

    assert.ok(eco.length < 200, 'nao truncou');
    assert.match(eco, /\+120 caracteres/);
  });

  // Itera por code point, e nao por unidade UTF-16: partir um emoji ao meio deixaria um par
  // substituto solto na mensagem, que e lixo diferente do que se queria evitar.
  it('nao parte caractere fora do BMP ao sanitizar', () => {
    const eco = echoEnvValue(`bucket-${String.fromCodePoint(0x1f600)}`);

    assert.match(eco, /bucket-/);
    assert.equal(eco.includes(String.fromCodePoint(0x1f600)), true, 'o emoji foi partido');
  });

  // O caso que so aparece EXATAMENTE no limite, e que a primeira versao deste helper errava: contar
  // por code point e cortar com `slice` (que corta por unidade UTF-16) parte o emoji da posicao 80.
  it('nao parte caractere fora do BMP ao TRUNCAR, no limite exato', () => {
    const emoji = String.fromCodePoint(0x1f600);
    // 79 ASCII + 1 emoji = 80 code points; o emoji ocupa as unidades UTF-16 80 e 81.
    const eco = echoEnvValue(`${'a'.repeat(79)}${emoji}${'b'.repeat(50)}`);

    assert.match(eco, /caracteres\)$/, 'deveria ter truncado');
    // nenhum par substituto solto: se o corte partisse o emoji, sobraria um high surrogate
    for (const ch of eco) {
      const cp = ch.codePointAt(0) ?? 0;
      assert.equal(cp >= 0xd800 && cp <= 0xdfff, false, 'sobrou um par substituto solto no eco');
    }
  });
});
