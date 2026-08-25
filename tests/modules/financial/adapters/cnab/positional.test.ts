import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: as primitivas posicionais do CNAB ainda não existem.
import {
  alpha,
  num,
  cents,
  dateDDMMYYYY,
  timeHHMMSS,
  digits,
} from '#src/modules/financial/adapters/cnab/positional.ts';

const unwrap = (r: ReturnType<typeof num>): string => {
  assert.ok(isOk(r), 'esperava ok');
  return r.value;
};

describe('CNAB positional — numérico alinha à direita com zeros', () => {
  it('preenche com zeros à esquerda até o tamanho', () => {
    assert.equal(unwrap(num(237, 3)), '237');
    assert.equal(unwrap(num(1, 4)), '0001');
    assert.equal(unwrap(num(0, 6)), '000000');
  });

  it('aceita string de dígitos e preserva zeros significativos', () => {
    assert.equal(unwrap(num('00123', 8)), '00000123');
  });

  // O campo numérico NUNCA trunca: cortar um valor ou um documento produz arquivo
  // sintaticamente válido e semanticamente errado — o pior defeito possível aqui.
  it('recusa valor que não cabe no campo, em vez de truncar', () => {
    const r = num(1234, 3);
    assert.ok(isErr(r));
    assert.equal(r.error, 'numeric-field-overflow');
  });

  it('recusa valor não inteiro ou não numérico', () => {
    assert.ok(isErr(num(12.5, 5)));
    assert.ok(isErr(num('12a', 5)));
    assert.ok(isErr(num(-1, 5)));
  });
});

describe('CNAB positional — alfanumérico alinha à esquerda com brancos', () => {
  it('preenche com brancos à direita até o tamanho', () => {
    assert.equal(alpha('BEM COMUM', 12), 'BEM COMUM   ');
    assert.equal(alpha('', 3), '   ');
  });

  it('trunca no tamanho do campo — o layout corta nome longo por desenho', () => {
    assert.equal(alpha('NOME MUITO LONGO', 4), 'NOME');
  });

  it('normaliza para maiúsculas sem acento, que é o que o banco aceita', () => {
    assert.equal(alpha('Associação', 10), 'ASSOCIACAO');
    assert.equal(alpha('José Ç', 8), 'JOSE C  ');
  });
});

// #862 — o não-ASCII que SOBREVIVE ao `NFD`.
//
// `normalize('NFD')` decompõe letra + diacrítico COMBINANTE, e mais nada: resolve `Á` e `Ç`, e
// devolve `º`, `ª`, `–`, `½` e as aspas tipográficas intactos, porque são caracteres próprios sem
// decomposição canônica. Eles atravessavam `alpha()` inteiros, e o `remittance-inspector.ts` os
// acusava como `non-ascii-character` DEPOIS de `generate-remittance.ts` ter consumido o NSA — que
// não volta. Um `Nº` no cadastro queimava um número de sequência de arquivo.
describe('CNAB positional — não-ASCII que o NFD não decompõe (#862)', () => {
  const NON_ASCII = /[^\x20-\x7E]/;

  // CA1. A entrada é a mesma tabela medida na issue, acrescida dos casos que o `NFD` também deixa
  // passar. O invariante é duplo, e os dois lados importam: nada fora do ASCII imprimível, e o
  // campo com o comprimento EXATO — transliteração que expande (`½`→`1/2`) não pode empurrar o
  // registro para fora das 240 posições.
  it('CA1 — nada fora do ASCII imprimível sobrevive, e o campo mantém o tamanho', () => {
    const samples = [
      'JOSE DA SILVA',
      'ACOUGUE Nº 12',
      'RUA 1º DE MAIO',
      'CAFE – EXPRESSO',
      'PADARIA — CENTRO',
      'MERCEARIA ½ HORA',
      '“ASPAS” E ‘APOSTROFO’',
      'TEMPERATURA 30° C',
      'CUSTA 10 € HOJE',
      'SEGUE → ADIANTE',
    ];

    for (const sample of samples) {
      const field = alpha(sample, 30);
      assert.equal(field.length, 30, `tamanho errado em ${JSON.stringify(sample)}`);
      assert.equal(
        field.search(NON_ASCII),
        -1,
        `sobrou não-ASCII em ${JSON.stringify(sample)} → ${JSON.stringify(field)}`,
      );
    }
  });

  // CA2. O campo é lido por HUMANO no banco — o operador da outra ponta confere o nome contra o
  // que tem em tela. Trocar o caractere por branco ou por `?` resolveria o inspetor e destruiria a
  // razão de o campo existir.
  it('CA2 — o que tem transliteração óbvia sai legível, não apagado', () => {
    assert.equal(alpha('RUA 1º DE MAIO', 14), 'RUA 1O DE MAIO');
    assert.equal(alpha('ACOUGUE Nº 12', 13), 'ACOUGUE NO 12');
    assert.equal(alpha('1ª TRAVESSA', 11), '1A TRAVESSA');
    assert.equal(alpha('CAFE – EXPRESSO', 15), 'CAFE - EXPRESSO');
    assert.equal(alpha('PADARIA — CENTRO', 16), 'PADARIA - CENTRO');
    assert.equal(alpha('MERCEARIA ½ HORA', 18), 'MERCEARIA 1/2 HORA');
    assert.equal(alpha('“BEM” ‘COMUM’', 13), '"BEM" \'COMUM\'');
    assert.equal(alpha('LATICINIOS BRÜHL', 16), 'LATICINIOS BRUHL');
  });

  // CA3. A regressão mais cara desta mudança seria alterar o que já funciona — o nome de todo
  // favorecido passa por aqui. Varre a faixa imprimível INTEIRA, e não uma amostra: uma entrada
  // errada na tabela de transliteração sequestraria um caractere ASCII em silêncio.
  it('CA3 — ASCII imprimível atravessa idêntico, com a caixa que já era regra', () => {
    const printable = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) =>
      String.fromCodePoint(0x20 + i),
    ).join('');

    assert.equal(alpha(printable, printable.length), printable.toUpperCase());
    assert.equal(alpha('BEM COMUM 123 - LTDA.', 21), 'BEM COMUM 123 - LTDA.');
  });

  // CA5. `€` e `→` são ASCII-incompatíveis sem tradução que um operador reconheça. O preenchedor é
  // o BRANCO, declarado em `positional.ts`: é o caractere que o campo alfanumérico já usa para toda
  // posição não preenchida, então é o único comprovadamente aceito em qualquer posição alfa.
  it('CA5 — sem transliteração óbvia, vira o preenchedor declarado', () => {
    assert.equal(alpha('CUSTA 10 € HOJE', 15), 'CUSTA 10   HOJE');
    assert.equal(alpha('SEGUE → ADIANTE', 15), 'SEGUE   ADIANTE');
  });

  // O espaço não-quebrável é o caso que a revisão humana não pega: no cadastro e no diff ele é
  // indistinguível do branco, e o laudo do inspetor acusa "não-ASCII" numa posição que parece
  // vazia. Este assert é o que impede a chave da tabela de ser normalizada para branco ASCII.
  it('espaço invisível vira branco — a regressão que ninguém veria na revisão', () => {
    const nbsp = String.fromCodePoint(0x00a0);
    assert.equal(alpha(`RUA${nbsp}DAS FLORES`, 14), 'RUA DAS FLORES');
  });

  // Não é acento nem símbolo: é caractere de CONTROLE. Um `\n` colado num nome partiria o registro
  // em duas linhas de comprimento errado, e o defeito chegaria como `line-length` — longe do campo
  // que o causou.
  it('controle vira branco, em vez de partir o registro em duas linhas', () => {
    assert.equal(alpha('LINHA1\nLINHA2', 13), 'LINHA1 LINHA2');
    assert.equal(alpha('COL1\tCOL2', 9), 'COL1 COL2');
  });

  // Fora do BMP o caractere ocupa DUAS unidades UTF-16. Varrer por índice o transformaria em dois
  // preenchedores, e o campo cresceria uma posição — num arquivo posicional, isso desloca tudo o
  // que vem depois. O comprimento do resultado é a testemunha.
  it('caractere fora do BMP vira UM preenchedor, não dois', () => {
    assert.equal(alpha('LOJA 🎉 FESTAS', 13), 'LOJA   FESTAS');
  });
});

describe('CNAB positional — campo mascarado vira dígito', () => {
  it('tira a pontuação de documento, agência, conta e CEP', () => {
    assert.equal(unwrap(digits('12.345.678/0001-99', 14)), '12345678000199');
    assert.equal(unwrap(digits('123.456.789-00', 11)), '12345678900');
    assert.equal(unwrap(digits('60000-000', 8)), '60000000');
  });

  it('normalizar não é engolir: vazio e estouro continuam erro', () => {
    assert.ok(isErr(digits('///', 5)));
    assert.ok(isErr(digits('12.345.678/0001-99', 5)));
  });
});

describe('CNAB positional — conversores de domínio', () => {
  it('valor em centavos vira numérico sem separador', () => {
    assert.equal(unwrap(cents(123456, 18)), '000000000000123456');
    assert.equal(unwrap(cents(0, 8)), '00000000');
  });

  it('data vira DDMMAAAA', () => {
    assert.equal(unwrap(dateDDMMYYYY(new Date(Date.UTC(2026, 7, 10)))), '10082026');
  });

  it('hora vira HHMMSS', () => {
    assert.equal(unwrap(timeHHMMSS(new Date(Date.UTC(2026, 7, 10, 14, 5, 9)))), '140509');
  });
});
