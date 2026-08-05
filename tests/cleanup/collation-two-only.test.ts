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
 * A regra que se sustenta não é "use X", é **duas, e só duas**. Uma terceira collation é o que cria
 * o defeito caro: JOIN entre colunas de collations diferentes no MySQL 8.4 ou falha com
 * `Illegal mix of collations`, ou passa convertendo em runtime e derruba o índice — lentidão sem
 * erro, longe da causa.
 *
 * ## Por que o gate ataca o JOIN e não as colunas
 *
 * A pesquisa que produziu este desenho (2026-08-05) mediu três coisas antes de escrever qualquer
 * asserção:
 *
 *  1. **293 de 428** colunas de texto NÃO declaram `COLLATE` e herdam o default da tabela. Um gate
 *     de "collation explícita por coluna" nasceria com 293 violações — é projeto de migração, não
 *     gate.
 *  2. **A collation das 51 colunas `bin` depende de EDIÇÃO MANUAL da migration gerada.** O
 *     `varchar()` do Drizzle não tem opção de collate — nem a doc viva
 *     (`orm.drizzle.team/docs/mysql/column-types`, verificada em 2026-08-05) nem a vendorizada
 *     documentam uma —, e por isso `schemas/mysql.ts:17-20` instrui a inserir `COLLATE` à mão no
 *     SQL gerado. Uma coluna `*_id` nova cuja edição manual for esquecida herda `unicode_ci` em
 *     silêncio, e só aparece quando alguém a usa num JOIN.
 *
 *     ⚠️ Isso NÃO significa que o Drizzle seja incapaz de expressar collation. Medido em worktree
 *     descartável (2026-08-05): `customType` com `dataType()` devolvendo
 *     `'varchar(36) COLLATE utf8mb4_bin'` emite o `COLLATE` VERBATIM no DDL, e a 2ª geração responde
 *     "No schema changes" — é idempotente, sem drift. O passo manual é evitável; ver o `rationale`
 *     da `ADR-0014-C8` para a decisão de adotar ou não.
 *  3. **Nenhum JOIN cruza collation hoje.** Dos 37 JOINs em `adapters/persistence/`, há 8 predicados
 *     distintos e TODOS são identificador↔identificador (`*_id`, `*_ref`), todos com `utf8mb4_bin`
 *     explícito. As 51 colunas `bin` do repositório são, sem exceção, identificador, ref ou chave
 *     natural (`cnpj`, `cpf`).
 *
 * Conclusão: o risco nunca foram as 293 colunas — é a COMBINAÇÃO, juntar uma coluna `bin` com uma
 * que herdou `unicode_ci`. Como toda coluna `bin` é identificador, isso só acontece se alguém fizer
 * JOIN por algo que NÃO é identificador (`email`, `code`, `name`). Barrar essa forma custa uma
 * asserção, passa verde na chegada e fecha o flanco que as 293 colunas deixariam aberto.
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
 * A collation vive nas MIGRATIONS, não nos schemas Drizzle — nos `schemas/*.ts` ela aparece só em
 * comentário (zero linhas de código). Varrer o schema, que era o caminho óbvio, daria zero.
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
