/**
 * COLLATION-TWO-ONLY — o repositório usa DUAS collations, e nunca uma terceira.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma (`ADR-0014-C8`, promovida a `accepted` em 2026-08-05, com o enunciado REESCRITO): o ADR-0014
 * mandava `utf8mb4_unicode_ci`. A prática divergiu e revelou uma distinção que o ADR não tinha:
 *
 *   `utf8mb4_bin`         identificador e chave natural — comparação determinística, case-sensitive
 *   `utf8mb4_unicode_ci`  texto de leitura humana — ordenação e busca sensíveis a acento/caixa
 *
 * A regra que se sustenta não é "use X", é **duas, e só duas**. Uma terceira collation cria o
 * defeito caro — mas o modo de falha depende de QUAL par se encontra, e generalizar aqui erra nos
 * dois sentidos. Refman 8.4 §12.8.4 separa os dois casos:
 *
 *   bin ↔ ci, mesmo charset      o `_bin` VENCE, em silêncio — "For an operation with operands
 *                                from the same character set but that mix a _bin collation and a
 *                                _ci or _cs collation, the _bin collation is used" (:86239)
 *   ci  ↔ ci, mesma coercibil.   ERRO — "If both sides are Unicode, or both sides are not
 *                                Unicode, it is an error" (:86234)
 *
 * **O primeiro par é o que um identificador sem `bin` produz, e ele é MUDO.** Medido em MySQL
 * 8.4.10 real (x99, 2026-08-05):
 *
 *   JOIN bin↔bin      `type: eq_ref`, `key: PRIMARY`  — índice usado
 *   JOIN bin↔ci       `type: ALL`,    `key: NULL`     — full scan, "Range checked for each record"
 *
 * Lentidão sem erro, longe da causa, e que cresce com o volume.
 *
 * **O segundo par é o que uma TERCEIRA collation produz, e ele é RUIDOSO** — é a razão de este
 * gate existir. A [#808](https://github.com/ERP-Bem-Comum/core-api/issues/808) colheu
 * `1267 ER_CANT_AGGREGATE_2COLLATIONS` num `=` de backfill entre `utf8mb4_0900_ai_ci` e
 * `utf8mb4_unicode_ci`, ao provisionar um MySQL 8.4 limpo cujo `collation-server` divergia.
 *
 * ⚠️ A versão anterior deste docblock afirmava que `Illegal mix` "aparece em outros contextos
 * (UNION, funções de string), **não** no predicado de JOIN". É falso, e a #808 é a prova: aparece
 * em qualquer comparação multi-operando cujo par caia na segunda linha da tabela acima. Foi essa
 * generalização que fez um achado descrever o defeito de `ctr_documents.deleted_by` como "vira
 * 1267 no dia em que alguém der JOIN" — quando aquele par cai na PRIMEIRA linha e nunca levanta
 * erro nenhum.
 *
 * A diferença também é SEMÂNTICA, e ela morde exatamente onde NÃO há lado binário para vencer:
 * literal em `WHERE`, `UNIQUE`, ordenação de índice. Buscar `A1B2C3D4-…` (mesmo UUID em caixa alta)
 * devolve 0 linhas na coluna `bin` e 1 na `unicode_ci`. Para identificador opaco casar por caixa é
 * errado; numa chave de object storage é pior que errado, porque dois valores que diferem só na
 * caixa são arquivos DISTINTOS no bucket e a mesma linha no banco.
 *
 * ## Por que o gate ataca o JOIN e não as colunas
 *
 * A pesquisa que produziu este desenho (2026-08-05) mediu três coisas antes de escrever qualquer
 * asserção:
 *
 *  1. **250 de 439** colunas de texto NÃO declaram `COLLATE` e herdam o default da tabela (remedido
 *     em 24/08/2026; a pesquisa original lia 293 de 428). Um gate de "collation explícita por
 *     coluna" nasceria com 250 violações — é projeto de migração, não gate.
 *  2. **A collation dependia de EDIÇÃO MANUAL da migration gerada — não depende mais (#636).** O
 *     `varchar()` do Drizzle não tem opção de collate, mas `customType` tem: `dataType()` é emitido
 *     VERBATIM no DDL. Os tipos de `src/shared/persistence/identifier-columns.ts` carregam o
 *     `COLLATE utf8mb4_bin`, e `tests/cleanup/identifier-collation-from-type.test.ts` cobra que
 *     toda coluna binária seja declarada com um deles. O que sobrou de manual é o CHARSET
 *     table-level, que a API do Drizzle 0.45.x realmente não expressa.
 *
 *     ⚠️ Os números desta pesquisa foram corrigidos duas vezes. Onde se lia "51 colunas `bin`", o
 *     levantamento do #636 achou 130 em 7 larguras; hoje o SQL aplicado tem **188 em 10 larguras**
 *     (24/08/2026). As duas causas de subcontagem originais foram corrigidas — casar `COLLATE` só
 *     logo após o tipo (perdia `char(64) NOT NULL COLLATE …`) e ler apenas colunas de
 *     `CREATE TABLE` (perdia o que nasceu de `ALTER TABLE … ADD`). O crescimento de 130 para 188 já
 *     não é erro de contagem: é adoção dos tipos avançando.
 *  3. **Nenhum JOIN cruza collation** — e a razão MUDOU, o que este parágrafo levou meses para
 *     registrar. Em 2026-08-05 a ausência de mistura era ACIDENTE: o levantamento achou
 *     identificadores vivos sem `bin` (`fin_payable_view.cost_center_ref`, `fin_outbox.event_id`,
 *     `fin_categories.id`), e o predicado `finPayableView.costCenterRef = finCostCenters.id`
 *     juntava dois deles sem estourar só porque os DOIS lados haviam herdado `unicode_ci`.
 *
 *     ⚠️ **Hoje é deliberado, e a redação anterior virou fonte de erro.** O #637 fechou: as três
 *     colunas nomeadas acima são `varchar(36) COLLATE utf8mb4_bin` (medido em 24/08/2026), e o
 *     predicado — vivo em `payment-position-projection.ts:98` e `payables-analysis-projection.ts:74`
 *     — junta dois binários. O número "34 identificadores vivos sem `bin`" que este docblock
 *     afirmava **não existe mais**, e chegou a ser citado como premissa de um achado externo. É o
 *     padrão "artefato citando artefato" que o `CLAUDE.md` proíbe, e ele nasceu AQUI: quem precisar
 *     do número mede o DDL, não lê este parágrafo.
 *
 * Conclusão: o risco nunca foram as 250 colunas — é a COMBINAÇÃO, juntar uma coluna `bin` com uma
 * que herdou `unicode_ci`. Como toda coluna `bin` é identificador, isso só acontece se alguém fizer
 * JOIN por algo que NÃO é identificador (`email`, `code`, `name`). Barrar essa forma custa uma
 * asserção, passa verde na chegada e fecha o flanco que as 250 colunas deixariam aberto.
 *
 * Fundamento canônico — MySQL 8.4 Reference Manual §12.8.4, _Collation Coercibility in Expressions_
 * (Oracle Corporation, p. 1976; `shared-references/database/mysql-refman-8.4--oracle.md:86202`):
 *
 * > "In the great majority of statements, it is obvious what collation MySQL uses to resolve a
 * > comparison operation. (…) However, with multiple operands, there can be ambiguity."
 *
 * A ambiguidade exige múltiplos operandos — que é exatamente o JOIN, e não a coluna isolada. É o
 * texto que justifica atacar o predicado em vez da declaração.
 *
 * A collation vive nas MIGRATIONS, e é lá que ESTE gate a lê. Quando isto foi escrito, varrer os
 * `schemas/*.ts` daria zero — a collation aparecia neles só em comentário. **Deixou de ser
 * verdade**: desde o #636 os tipos de `identifier-columns.ts` carregam o `COLLATE`, então o schema
 * passou a dizer a intenção, e `identifier-collation-from-type.test.ts` varre os dois lados de
 * propósito. Foi o que expôs `ctr_documents.deleted_by`: declarada com `char()` cru, ela era
 * invisível a qualquer gate que só lesse migration, porque `drizzle-kit generate` não tinha diff
 * para emitir. Quem for escrever gate de collation daqui em diante escolhe a fonte pelo defeito que
 * quer pegar — migration para o DDL divergente, schema para a declaração que nunca gerou DDL.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, walkFiles, readSource } from '../support/source-scan.ts';

const MIGRATIONS = join(PROJECT_ROOT, 'src', 'modules');

/** `COLLATE utf8mb4_bin` / `COLLATE=utf8mb4_unicode_ci` — as duas formas que o SQL usa. */
const COLLATE_DECL = /COLLATE[= ]+([a-zA-Z0-9_]+)/g;

const ALLOWED = ['utf8mb4_bin', 'utf8mb4_unicode_ci'] as const;

/** Coluna com `COLLATE utf8mb4_bin` explícito na declaração — o conjunto dos identificadores. */
const BIN_COLUMN = /`([a-z_0-9]+)`\s+(?:varchar\(\d+\)|char\(\d+\))[^,\n]*COLLATE\s+utf8mb4_bin/gi;

/** `innerJoin(t, eq(a.b, c.d))` — só a forma `ident.ident`, nunca expressão livre. */
const JOIN_PREDICATE =
  /(?:inner|left|right)Join\([^,]+,\s*eq\(\s*([\w.]+)\.(\w+)\s*,\s*([\w.]+)\.(\w+)\s*\)/g;

const camelToSnake = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

const migrationFiles = (): readonly string[] =>
  walkFiles(MIGRATIONS, { ext: '.sql' }).filter((f) => f.includes('/migrations/'));

const binColumns = (): ReadonlySet<string> => {
  const out = new Set<string>();
  for (const abs of migrationFiles()) {
    const rel = abs.startsWith(PROJECT_ROOT) ? abs.slice(PROJECT_ROOT.length + 1) : abs;
    for (const m of readSource(rel).matchAll(BIN_COLUMN)) if (m[1] !== undefined) out.add(m[1]);
  }
  return out;
};

/** Cada lado de cada predicado de JOIN, com o nome da coluna já em snake_case. */
const joinedColumns = (): readonly { file: string; column: string; predicate: string }[] => {
  const out: { file: string; column: string; predicate: string }[] = [];
  for (const abs of walkFiles(join(PROJECT_ROOT, 'src', 'modules'), { ext: '.ts' })) {
    if (!abs.includes('/adapters/persistence/')) continue;
    const rel = abs.startsWith(PROJECT_ROOT) ? abs.slice(PROJECT_ROOT.length + 1) : abs;
    for (const m of readSource(rel).matchAll(JOIN_PREDICATE)) {
      const predicate = `${String(m[1])}.${String(m[2])} ↔ ${String(m[3])}.${String(m[4])}`;
      for (const prop of [m[2], m[4]]) {
        if (prop !== undefined) out.push({ file: rel, column: camelToSnake(prop), predicate });
      }
    }
  }
  return out;
};

const declaredCollations = (): ReadonlyMap<string, readonly string[]> => {
  const out = new Map<string, string[]>();
  for (const abs of migrationFiles()) {
    const rel = abs.startsWith(PROJECT_ROOT) ? abs.slice(PROJECT_ROOT.length + 1) : abs;
    for (const m of readSource(rel).matchAll(COLLATE_DECL)) {
      const value = (m[1] ?? '').toLowerCase();
      if (value === '') continue;
      out.set(value, [...(out.get(value) ?? []), rel]);
    }
  }
  return out;
};

describe('COLLATION-TWO-ONLY — duas collations, e a terceira é o defeito', () => {
  it('nenhuma migration declara collation fora das duas permitidas', () => {
    const found = [...declaredCollations().keys()].sort();
    const offenders = found.filter((c) => !ALLOWED.includes(c as (typeof ALLOWED)[number]));
    assert.deepEqual(
      offenders,
      [],
      'Collation fora das duas permitidas (`utf8mb4_bin` p/ identificador, ' +
        '`utf8mb4_unicode_ci` p/ texto humano). Uma terceira faz JOIN entre colunas quebrar com ' +
        '`Illegal mix of collations` — ou pior, converter em runtime e derrubar o índice:\n' +
        offenders.join('\n'),
    );
  });

  it('as duas collations permitidas estão de fato em uso (guarda contra verde por vacuidade)', () => {
    const found = declaredCollations();
    for (const c of ALLOWED) {
      assert.ok(
        (found.get(c) ?? []).length > 0,
        `\`${c}\` não aparece em migration alguma — ou a varredura quebrou, ou a norma mudou`,
      );
    }
  });

  it('a varredura enxerga as migrations (guarda contra glob morto)', () => {
    const n = migrationFiles().length;
    assert.ok(n > 20, `esperado 20+ migrations varridas, encontrado ${n}`);
  });

  it('todo predicado de JOIN é entre colunas com `utf8mb4_bin` explícito', () => {
    const bin = binColumns();
    const offenders = joinedColumns()
      .filter(({ column }) => !bin.has(column))
      .map(({ file, column, predicate }) => `${file}: ${predicate} → \`${column}\` sem bin`)
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'JOIN por coluna que não é identificador com `utf8mb4_bin` explícito. Ela herda o default ' +
        '`utf8mb4_unicode_ci` da tabela, e o outro lado do predicado é `bin` — a comparação vira ' +
        'multi-operando com collations distintas (Refman 8.4 §12.8.4). O MySQL ou recusa com ' +
        '`Illegal mix of collations`, ou converte em runtime e derruba o índice: lentidão sem erro, ' +
        'longe da causa.\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga JOINs (guarda contra regex que casa nada)', () => {
    const n = joinedColumns().length;
    assert.ok(n > 8, `esperado 8+ colunas em predicado de JOIN, encontrado ${n}`);
  });
});
