/**
 * TABLE-PREFIX-ISOLATION — cada módulo só declara tabela com o seu prefixo (ADR-0014).
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: o isolamento entre módulos no MySQL é por PREFIXO DE TABELA, não por database nem por
 * servidor — todos compartilham o mesmo `core`. O prefixo é, portanto, a única fronteira física
 * que existe: `ctr_*` é do contracts, `fin_*` do financial, e assim por diante. Um módulo que
 * declare tabela com prefixo alheio apaga essa fronteira em silêncio, e o efeito colateral é
 * duplo — dois donos para a mesma tabela, e o "um único escritor por database" deixa de valer.
 *
 * Complementa `module-boundary.test.ts`, que cobre a fronteira de IMPORT. São buracos distintos:
 * declarar `fin_payables` dentro do `contracts` não é import de outro módulo, então passaria
 * batido por lá.
 *
 * A allowlist tem UMA entrada e é exceção declarada em ADR, não tolerância: `eventos_processados`
 * é deliberadamente cross-módulo e sem prefixo (ADR-0014 §"Exceção linguística"), com o nome em
 * PT-BR justificado no ADR-0015 §"Idempotência". Está anotada nos dois lugares do schema.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

/** Prefixo canônico de cada módulo que tem schema próprio. */
const MODULE_PREFIX: Readonly<Record<string, string>> = {
  auth: 'auth_',
  'budget-plans': 'bgp_',
  contracts: 'ctr_',
  financial: 'fin_',
  partners: 'par_',
  programs: 'prg_',
};

/**
 * 🔒 Allowlist PINADA — tabelas sem o prefixo do módulo que as declara. Cada uma exige exceção
 * registrada em ADR; o pin por deepEqual impede a lista de crescer em silêncio.
 */
const CROSS_MODULE_TABLES: readonly string[] = [
  // Idempotência do consumer, compartilhada entre módulos por desenho — ADR-0014/ADR-0015.
  'eventos_processados',
];

const TABLE_DECL = /mysqlTable\(\s*'([a-z_0-9]+)'/g;

const declaredTables = (moduleName: string): readonly string[] => {
  const schema = join(
    PROJECT_ROOT,
    'src/modules',
    moduleName,
    'adapters/persistence/schemas/mysql.ts',
  );
  if (!existsSync(schema)) return [];
  const rel = schema.slice(PROJECT_ROOT.length + 1);
  return [...readSource(rel).matchAll(TABLE_DECL)].map((m) => m[1] ?? '').filter((t) => t !== '');
};

describe('TABLE-PREFIX — o prefixo é a única fronteira física entre módulos', () => {
  for (const [moduleName, prefix] of Object.entries(MODULE_PREFIX)) {
    it(`${moduleName} só declara tabelas ${prefix}*`, () => {
      const offenders = declaredTables(moduleName)
        .filter((t) => !t.startsWith(prefix))
        .filter((t) => !CROSS_MODULE_TABLES.includes(t))
        .sort();
      assert.deepEqual(
        offenders,
        [],
        `Tabela sem o prefixo "${prefix}" declarada em ${moduleName} — dois módulos passam a ` +
          `reivindicar a mesma tabela e o "único escritor por database" deixa de valer (ADR-0014): ` +
          offenders.join(', '),
      );
    });
  }

  it('nenhum módulo declara tabela com o prefixo de OUTRO módulo', () => {
    const offenders: string[] = [];
    for (const [moduleName, prefix] of Object.entries(MODULE_PREFIX)) {
      const alheios = Object.entries(MODULE_PREFIX).filter(([m]) => m !== moduleName);
      for (const table of declaredTables(moduleName)) {
        const dono = alheios.find(([, p]) => table.startsWith(p));
        if (dono !== undefined) offenders.push(`${moduleName} declara ${table} (de ${dono[0]})`);
      }
      void prefix;
    }
    assert.deepEqual(offenders.sort(), [], offenders.join('\n'));
  });

  it('a varredura enxerga tabelas (guarda contra verde por vacuidade)', () => {
    const total = Object.keys(MODULE_PREFIX).reduce((n, m) => n + declaredTables(m).length, 0);
    assert.ok(total > 30, `esperado 30+ tabelas declaradas, encontrado ${total}`);
  });

  it('a allowlist de tabelas cross-módulo está pinada', () => {
    assert.deepEqual([...CROSS_MODULE_TABLES].sort(), ['eventos_processados']);
  });
});
