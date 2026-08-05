/**
 * CNPJ-ALPHANUMERIC-LANGUAGE — nada descreve CNPJ como "dígitos".
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Desde 07/2026 a Receita emite **CNPJ alfanumérico**: 14 caracteres uppercase sem máscara, no
 * formato `^[0-9A-Z]{12}[0-9]{2}$` — 12 alfanuméricos + 2 DVs numéricos ([ADR-0044]). `12ABC34501DE35`
 * é válido. O VO do kernel já está correto; o que estava errado era a LINGUAGEM em volta dele.
 *
 * Por que uma frase merece gate: seis das ocorrências corrigidas eram `.meta({ description })` de
 * Zod, que alimenta o **OpenAPI público**. Quem integra lê "CNPJ (14 dígitos)" e implementa
 * validação numérica do lado dele — o erro sai do nosso repositório e vira problema de terceiro.
 * O inventário de decisões registrou o caso como `ADR-0044-C5`, com 6 ocorrências; quando esta
 * sessão mediu, eram 10, todas em linguagem, nenhuma em validação.
 *
 * A allowlist NÃO é tolerância: é o ponto onde o problema é de CÓDIGO, não de frase. A busca por
 * CNPJ em `list-suppliers`/`list-financiers` estava lá e SAIU — foi corrigida, com teste em
 * `tests/modules/partners/application/use-cases/cnpj-search-alphanumeric.test.ts`. Resta o leitor
 * fiscal, cuja correção exige fixture real. Qualquer NOVA ocorrência reprova.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, walkFiles, readSource } from '../support/source-scan.ts';

/** Linha que fala de CNPJ e o descreve em termos numéricos. */
const mentionsCnpj = /cnpj/i;
const claimsDigits = /d[ií]gito|somente n[uú]mero|apenas n[uú]mero/i;

/**
 * 🔒 Allowlist PINADA — pontos onde o defeito é de CÓDIGO e a correção muda comportamento.
 * Registrados, não anistiados; cada um precisa de decisão própria.
 */
const KNOWN_CODE_DEFECTS: readonly string[] = [
  // VAZIA por desenho — não é lacuna. A única entrada era o leitor de documento fiscal
  // (`native-pdf.ts`), e o #627 fechou o defeito que a sustentava: o braço `CNPJ:` da cascata passou
  // a aceitar letras (ADR-0044). Com o conserto, a entrada ficaria MORTA — e allowlist morta anistia
  // o arquivo inteiro contra regressões futuras, que é o oposto do que ela existe para fazer.
  //
  // A linha que ainda acionava a varredura descrevia o recorte do ramo legado de `normalizeTaxId`,
  // não uma afirmação de que CNPJ é numérico: menção, não uso. Foi reescrita citando o próprio
  // regex (`[\d.\-/\s]`) em vez da palavra — mais precisa, e sem o falso positivo.
];

const offendingFiles = (): readonly string[] =>
  walkFiles(join(PROJECT_ROOT, 'src'), { ext: '.ts' })
    .filter((rel) =>
      readSource(rel)
        .split('\n')
        .some((line) => mentionsCnpj.test(line) && claimsDigits.test(line)),
    )
    .sort();

describe('CNPJ-ALPHANUMERIC — a linguagem acompanha o formato', () => {
  it('nenhum arquivo novo descreve CNPJ como "dígitos"', () => {
    const offenders = offendingFiles().filter((f) => !KNOWN_CODE_DEFECTS.includes(f));
    assert.deepEqual(
      offenders,
      [],
      'CNPJ descrito como numérico — desde 07/2026 ele aceita letras (ADR-0044), e a descrição ' +
        'de borda alimenta o OpenAPI público:\n' +
        offenders.join('\n'),
    );
  });

  it('a allowlist de defeitos de código está pinada (vazia desde o #627)', () => {
    assert.deepEqual(
      [...KNOWN_CODE_DEFECTS].sort(),
      [],
      'entrada nova na allowlist exige decisão própria: ela anistia o ARQUIVO inteiro, não a linha',
    );
  });

  it('o VO do kernel aceita letras (guarda contra regressão na fonte)', () => {
    const cnpj = readSource('src/shared/kernel/cnpj.ts');
    assert.match(
      cnpj,
      /\[0-9A-Z\]\{12\}\[0-9\]\{2\}/,
      'o shape do VO deixou de aceitar alfanumérico — é a única fonte que valida CNPJ',
    );
  });
});
