import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { pixInitiationFor } from '#src/modules/financial/adapters/cnab/pix-initiation.ts';

/*
 * A tradução `keyType` → `G100` (#838, CA3).
 *
 * Os cinco valores do `G100` estão em `.claude/skills/cnab240-bradesco/referencias/03-dominios-campos.md:254`
 * e são domínio FECHADO do banco — por isso o assert literal aqui é legítimo, ao contrário do que
 * vale para a tabela de ISPB (que muda quando o Bacen republica, e cujo teste irmão compara contra a
 * própria fonte). O que este arquivo NÃO faz é decorar chave Pix de ninguém: o insumo é o TIPO da
 * chave, nunca a chave.
 */

// O vocabulário de `partners` (`domain/shared/payment-target.ts:10`), replicado aqui de propósito.
//
// ⚠️ Não é a duplicação que a rule proíbe — é o oposto dela. O `financial` mantém o `keyType` opaco
// e NÃO importa a união de `partners`, então nada no compilador liga um módulo ao outro: se
// `partners` acrescentar um tipo de chave, `pixInitiationFor` passa a recusá-lo em silêncio e a
// remessa perde o título sem que uma linha sequer fique vermelha. Esta lista é o que transforma
// aquele silêncio numa falha — o custo de mantê-la em dia é exatamente o aviso que se quer.
const PARTNERS_PIX_KEY_TYPES = ['cpf', 'cnpj', 'email', 'phone', 'random-key'] as const;

describe('pixInitiationFor — forma de iniciação do Pix a partir do tipo da chave (#838)', () => {
  it('traduz cada tipo de chave para o código do domínio G100', () => {
    const expected = new Map([
      ['phone', '01'],
      ['email', '02'],
      ['cpf', '03'],
      ['cnpj', '03'],
      ['random-key', '04'],
    ]);

    for (const [keyType, code] of expected) {
      const r = pixInitiationFor(keyType);
      assert.ok(isOk(r), `${keyType} deveria traduzir`);
      assert.equal(r.value, code, `${keyType} → ${code}`);
    }
  });

  it('todo tipo de chave que `partners` sabe cadastrar tem tradução', () => {
    // A guarda contra o drift entre os dois vocabulários. Um tipo novo em `partners` sem entrada
    // aqui não quebra o typecheck (o `keyType` é opaco por desenho) — quebra este teste, que é o
    // único lugar onde os dois lados se encontram.
    const untranslatable = PARTNERS_PIX_KEY_TYPES.filter((t) => !isOk(pixInitiationFor(t)));
    assert.deepEqual(untranslatable, []);
  });

  it('devolve DOIS dígitos — o alinhamento em 3 posições é do montador', () => {
    // `G100` é campo Alfa de 3 posições com domínio de 2 dígitos: o preenchimento é `'04 '`, não
    // `'004'` (`02-layout-registros.md:204-207`). Devolver 3 aqui faria o montador escrever `'04  '`
    // ou truncar — nos dois casos, uma forma de iniciação que não existe no domínio.
    for (const keyType of PARTNERS_PIX_KEY_TYPES) {
      const r = pixInitiationFor(keyType);
      assert.ok(isOk(r));
      assert.match(r.value, /^\d{2}$/, `${keyType} deveria produzir dois dígitos`);
    }
  });

  it('nunca produz `05` — Dados Bancários não se origina de chave', () => {
    // `05` é o Pix iniciado por agência/conta, e nele o bloco 128-226 do Segmento B carrega tipo de
    // conta em vez da chave (`02-layout-registros.md:201`). Traduzir qualquer tipo de chave para
    // `05` emitiria 99 posições que o banco lê com outra régua.
    const wrong = PARTNERS_PIX_KEY_TYPES.filter((t) => {
      const r = pixInitiationFor(t);
      return isOk(r) && r.value === '05';
    });
    assert.deepEqual(wrong, []);
  });

  // ── O caminho de erro, que é a CA3 ────────────────────────────────────────────────────────────

  it('recusa tipo de chave fora do domínio, com nome próprio', () => {
    const r = pixInitiationFor('iban');
    assert.equal(isOk(r), false);
    assert.equal(isOk(r) ? null : r.error, 'remittance-pix-key-type-unsupported');
  });

  it('recusa entrada vazia, com espaço ou em caixa trocada — a chave é exata', () => {
    // `'CPF'` e `'cpf '` não são o vocabulário de `partners`. Normalizar aqui esconderia um cadastro
    // que gravou fora do contrato; recusar o expõe.
    for (const bad of ['', ' ', 'CPF', 'cpf ', 'Random-Key', 'chave-aleatoria']) {
      const r = pixInitiationFor(bad);
      assert.equal(isOk(r), false, `deveria recusar ${JSON.stringify(bad)}`);
    }
  });

  it('não alcança o protótipo — `toString` não é forma de iniciação', () => {
    // Com um objeto literal no lugar do `Map`, `INITIATION_BY_KEY_TYPE['toString']` devolveria uma
    // função, que não é `undefined` e atravessaria a guarda como se fosse código G100.
    for (const attack of ['toString', 'constructor', '__proto__', 'valueOf', 'hasOwnProperty']) {
      const r = pixInitiationFor(attack);
      assert.equal(isOk(r), false, `deveria recusar ${attack}`);
    }
  });
});
