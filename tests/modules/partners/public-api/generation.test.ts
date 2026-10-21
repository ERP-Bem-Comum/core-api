/**
 * #1055 — geração por pessoa (recorte Pew pelo ANO de nascimento), derivada no `partners`.
 *
 * Testes de FRONTEIRA: cada corte é exercitado no último dia de um balde e no primeiro do seguinte,
 * porque geração é por ANO e uma idade cobre dois anos — a régua tem de cair no dia certo. Sem data
 * → `NA`; fora dos recortes Pew (≤1945 ou ≥2013) → `OUTROS` (residual, nunca estica Boomer nem Z).
 *
 * `generationIdOf` depende SÓ do ano de nascimento (não de uma data de referência) e extrai o ano
 * em UTC — então o resultado independe do fuso da máquina.
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  generationIdOf,
  GENERATION_CATEGORIES,
} from '#src/modules/partners/public-api/generation.ts';

// UTC explícito: o ano sai de `getUTC*` (PlainDate.fromDate), então um nascido em 31/12 não
// escorrega para o ano vizinho conforme o fuso.
const birth = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

// Tabela de fronteira: [data ISO de nascimento, código de geração esperado].
const boundaries: readonly (readonly [string, string])[] = [
  ['1945-07-01', 'OUTROS'], // ≤1945: balde residual, não estica Boomer
  ['1946-01-01', 'BOOMER'], // primeiro ano Boomer
  ['1964-12-31', 'BOOMER'], // último dia Boomer
  ['1965-01-01', 'GEN_X'], // primeiro dia X
  ['1980-12-31', 'GEN_X'], // último dia X
  ['1981-01-01', 'MILLENNIAL'], // primeiro dia Millennial
  ['1996-12-31', 'MILLENNIAL'], // último dia Millennial
  ['1997-01-01', 'GEN_Z'], // primeiro dia Z
  ['2012-07-01', 'GEN_Z'], // dentro de Z
  ['2012-12-31', 'GEN_Z'], // último dia Z
  ['2013-01-01', 'OUTROS'], // ≥2013: residual, não estica Z
];

describe('partners/public-api — generationIdOf (recorte Pew por ano de nascimento · #1055)', () => {
  for (const [iso, expected] of boundaries) {
    it(`${iso} → ${expected}`, () => {
      assert.equal(generationIdOf(birth(iso)), expected);
    });
  }

  it('sem data de nascimento → NA (nunca null)', () => {
    const g = generationIdOf(null);
    assert.equal(g, 'NA');
    assert.notEqual(g, null, 'o contrato é string; sem data → código NA');
  });

  it('o ano é extraído em UTC — 31/12 23:59Z continua no mesmo ano', () => {
    // 1980-12-31T23:59:59Z ainda é 1980 em UTC → GEN_X (não 1981/Millennial).
    assert.equal(generationIdOf(new Date('1980-12-31T23:59:59.000Z')), 'GEN_X');
    // 1981-01-01T00:00:00Z é 1981 em UTC → Millennial.
    assert.equal(generationIdOf(new Date('1981-01-01T00:00:00.000Z')), 'MILLENNIAL');
  });

  describe('GENERATION_CATEGORIES (template id+label, molde de AGE_RANGE_CATEGORIES)', () => {
    it('lista os 4 recortes Pew + NA, com id e label não-vazios e count zerado', () => {
      const ids = GENERATION_CATEGORIES.map((c) => c.id);
      assert.deepEqual(ids, ['BOOMER', 'GEN_X', 'MILLENNIAL', 'GEN_Z', 'NA']);
      for (const c of GENERATION_CATEGORIES) {
        assert.ok(c.label.length > 0, `bucket sem label: ${c.id}`);
        assert.equal(c.count, 0, 'template é zerado');
      }
    });

    it('OUTROS NÃO entra no template — é residual (como nos demográficos)', () => {
      assert.equal(
        GENERATION_CATEGORIES.some((c) => c.id === 'OUTROS'),
        false,
        'OUTROS é balde residual, acrescentado só quando há gente nele',
      );
    });

    it('todo código derivável de um ano conhecido existe no template (exceto o residual)', () => {
      const templateIds = new Set(GENERATION_CATEGORIES.map((c) => c.id));
      for (const [iso, expected] of boundaries) {
        if (expected === 'OUTROS') continue;
        assert.ok(templateIds.has(expected), `${iso}→${expected} não está no template`);
      }
    });
  });
});
