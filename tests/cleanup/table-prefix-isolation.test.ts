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

import { PROJECT_ROOT, filesUsing, readSource, walkFiles } from '../support/source-scan.ts';

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

/**
 * Tabelas declaradas em `src/shared/persistence/schemas/` — fora de qualquer módulo.
 *
 * Varre o disco, e não o git, de propósito: aqui não se decide "este caminho existe" (o caso que
 * a rule de gate estrutural endereça, de alvo deliberadamente gitignored), e sim se enumera fonte
 * para ler o conteúdo. Um gate que consultasse `git ls-files` reprovaria schema recém-escrito e
 * ainda não commitado — exatamente o momento em que ele precisa avisar.
 */
const sharedDeclaredTables = (): readonly string[] => {
  const dir = join(PROJECT_ROOT, 'src/shared/persistence/schemas');
  if (!existsSync(dir)) return [];
  return walkFiles(dir, { ext: '.ts' }).flatMap((rel) =>
    [...readSource(rel).matchAll(TABLE_DECL)].map((m) => m[1] ?? '').filter((t) => t !== ''),
  );
};

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

  // A declaração de `eventos_processados` saiu do schema do `contracts` e foi para
  // `src/shared/persistence/schemas/` (#800, #824): mais de um módulo lê a tabela, e declará-la
  // em dois `schemas/mysql.ts` faria `drizzle-kit generate` emitir dois `CREATE TABLE` para a
  // mesma tabela física.
  //
  // Isso abriu um buraco NESTE gate, que só varre `src/modules/*/adapters/persistence/schemas/`:
  // qualquer tabela declarada em `shared/` passaria despercebida — inclusive uma com prefixo
  // alheio, que é exatamente o que o arquivo existe para impedir. As duas asserções abaixo fecham
  // o buraco: `shared/` só pode declarar o que está na allowlist, e a allowlist tem de estar
  // efetivamente declarada em algum lugar (senão vira entrada morta e o pin acima passa a
  // aprovar uma lista que não descreve nada).
  it('shared/persistence/schemas só declara tabela da allowlist cross-módulo', () => {
    const offenders = sharedDeclaredTables()
      .filter((t) => !CROSS_MODULE_TABLES.includes(t))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      `Tabela declarada em src/shared/persistence/schemas/ fora da allowlist cross-módulo — ` +
        `"shared" não é escapatória do isolamento por prefixo (ADR-0014): ${offenders.join(', ')}`,
    );
  });

  it('toda tabela da allowlist está declarada em algum schema (sem entrada morta)', () => {
    const declared = new Set([
      ...Object.keys(MODULE_PREFIX).flatMap((m) => declaredTables(m)),
      ...sharedDeclaredTables(),
    ]);
    const dead = CROSS_MODULE_TABLES.filter((t) => !declared.has(t)).sort();
    assert.deepEqual(
      dead,
      [],
      `Allowlist cita tabela que nenhum schema declara: ${dead.join(', ')}`,
    );
  });

  // `ADR-0014-C7`, promovida a `accepted` em 2026-08-05. A metade PROIBITIVA da norma — "nenhuma
  // outbox compartilhada" — já é coberta pelas asserções acima: uma tabela `outbox` sem prefixo cai
  // fora da allowlist e reprova. O que faltava é a metade POSITIVA, que nenhum gate cobria: quem
  // publica é dono da própria outbox. Um módulo que escrevesse na outbox alheia não seria pego pelo
  // `module-boundary` (o append passa por helper de `shared/`, não por import de módulo).
  //
  // O ADR-0014 previa outbox por DATABASE (`core.outbox`); o que existe é uma por MÓDULO, sete no
  // total. A propriedade que vale é a de PROPRIEDADE, não a de localização.
  it('todo módulo que escreve na outbox declara a própria, com o seu prefixo', () => {
    const publishers = Object.keys(MODULE_PREFIX).filter((m) =>
      existsSync(join(PROJECT_ROOT, 'src/modules', m))
        ? filesUsing(join(PROJECT_ROOT, 'src/modules', m), 'appendOutboxInTx(').length > 0
        : false,
    );
    const semOutboxPropria = publishers
      .filter((m) => !declaredTables(m).some((t) => t === `${MODULE_PREFIX[m] ?? ''}outbox`))
      .sort();
    assert.deepEqual(
      semOutboxPropria,
      [],
      'Módulo que escreve na outbox sem declarar a sua — estaria publicando na outbox de outro, e ' +
        'o dono do evento deixaria de ser o dono da tabela:\n' +
        semOutboxPropria.join('\n'),
    );
    assert.ok(publishers.length > 0, 'nenhum publisher encontrado — a varredura não vê o append');
  });
});
