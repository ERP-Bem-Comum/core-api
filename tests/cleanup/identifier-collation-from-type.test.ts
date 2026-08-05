/**
 * IDENTIFIER-COLLATION-FROM-TYPE — coluna com `utf8mb4_bin` no banco é declarada com TIPO, nunca
 * com `varchar`/`char` cru (#636).
 *
 * ## O que este gate impede
 *
 * Antes do #636 a collation binária era inserida à mão no SQL que `drizzle-kit generate` emite. A
 * garantia morava na memória de quem rodava o comando, e o esquecimento é silencioso: a coluna
 * herda `utf8mb4_unicode_ci` e só aparece quando alguém a usa num JOIN — onde o MySQL 8.4 NÃO
 * reclama: ele converte em silêncio e o plano cai de `eq_ref` para `ALL` (medido em 8.4.10 real).
 * Lentidão sem erro, longe da causa.
 *
 * Isso não é hipótese: 34 identificadores vivos ficaram sem `bin` exatamente assim (#637).
 *
 * ## Por que a asserção é nesta direção
 *
 * O gate cobra que toda coluna que JÁ tem `utf8mb4_bin` no DDL aplicado seja declarada com um dos
 * tipos de `identifier-columns.ts`. Ele não cobra o inverso — "todo `*_id` deve ser binário" —
 * porque isso reprovaria as 34 colunas divergentes, que exigem `ALTER` em produção e decisão
 * própria (#637). Este gate protege o que está certo; corrigir o que está errado é outro ciclo.
 *
 * A fonte da verdade é o SQL das migrations, não o snapshot: o snapshot descreve o que o Drizzle
 * acha que existe, e foi justamente ele que divergiu quando a edição manual começou.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

const TYPE_FNS = [
  'uuidKey',
  'uuidKeyFixed',
  'cnpjKey',
  'cpfKey',
  'sha256HexKey',
  'opaqueKey',
  'permissionKey',
];

/**
 * Estado de cada coluna char/varchar depois de aplicar as migrations EM ORDEM.
 *
 * As três formas precisam ser lidas, e a primeira versão deste gate lia só uma. Ela casava
 * `^\s*\`col\` tipo` — a linha de coluna dentro de `CREATE TABLE` — e por isso ficava cega a tudo
 * que nasceu de `ALTER TABLE ... ADD \`col\` …`, porque essa linha começa com `ALTER`. O caso que
 * expôs o buraco foi `bgp_budget_plans.parent_id`: ele TEM `utf8mb4_bin` desde a migration 0003 e
 * o gate o classificava como se não tivesse. Onze colunas ficaram fora do #636 por causa disso.
 */
const ddlStateOf = (mod: string): Map<string, { type: string; bin: boolean }> => {
  const dir = join(PROJECT_ROOT, `src/modules/${mod}/adapters/persistence/migrations/mysql`);
  const cols = new Map<string, { type: string; bin: boolean }>();
  if (!existsSync(dir)) return cols;

  let table = '?';
  for (const f of readdirSync(dir)
    .filter((x) => x.endsWith('.sql'))
    .sort()) {
    for (const raw of readFileSync(join(dir, f), 'utf8').split('\n')) {
      const line = raw.trim();
      if (line.startsWith('--')) continue;
      const bin = /COLLATE utf8mb4_bin/i.test(line);

      const t = /^(?:CREATE TABLE(?: IF NOT EXISTS)?|ALTER TABLE)\s+`([a-z_0-9]+)`/i.exec(line);
      if (t?.[1] !== undefined) table = t[1];

      const altered =
        /ALTER TABLE\s+`([a-z_0-9]+)`\s+(?:ADD|MODIFY|CHANGE)(?:\s+COLUMN)?\s+`([a-z_0-9]+)`\s+((?:var)?char\(\d+\))/i.exec(
          line,
        );
      if (altered !== null) {
        const [, at = '', ac = '', atype = ''] = altered;
        cols.set(`${at}.${ac}`, { type: atype.toLowerCase(), bin });
        continue;
      }

      const dropped = /ALTER TABLE\s+`([a-z_0-9]+)`\s+DROP COLUMN\s+`([a-z_0-9]+)`/i.exec(line);
      if (dropped !== null) {
        const [, dt = '', dc = ''] = dropped;
        cols.delete(`${dt}.${dc}`);
        continue;
      }

      const created = /^`([a-z_0-9]+)`\s+((?:var)?char\(\d+\))/i.exec(line);
      if (created !== null) {
        const [, cc = '', ctype = ''] = created;
        cols.set(`${table}.${cc}`, { type: ctype.toLowerCase(), bin });
      }
    }
  }
  return cols;
};

/** Só as que o DDL aplicado deixou com `COLLATE utf8mb4_bin`. */
const binColumnsOf = (mod: string): Map<string, string> => {
  const out = new Map<string, string>();
  for (const [key, v] of ddlStateOf(mod)) if (v.bin) out.set(key, v.type);
  return out;
};

/** Fatia o schema por bloco de `mysqlTable`, porque `id` existe em várias tabelas. */
const blocksOf = (mod: string): Map<string, string> => {
  const src = readSource(`src/modules/${mod}/adapters/persistence/schemas/mysql.ts`);
  const marks = [...src.matchAll(/mysqlTable\(\s*\n?\s*'([a-z_0-9]+)'/g)];
  const out = new Map<string, string>();
  marks.forEach((m, i) => {
    const start = m.index ?? 0;
    const end = i + 1 < marks.length ? (marks[i + 1]?.index ?? src.length) : src.length;
    out.set(m[1] ?? '', src.slice(start, end));
  });
  return out;
};

const MODULES = readdirSync(join(PROJECT_ROOT, 'src/modules')).filter((m) =>
  existsSync(join(PROJECT_ROOT, `src/modules/${m}/adapters/persistence/schemas/mysql.ts`)),
);

describe('IDENTIFIER-COLLATION-FROM-TYPE — a collation binária vem do tipo', () => {
  it('nenhuma coluna com utf8mb4_bin é declarada com varchar/char cru', () => {
    const offenders: string[] = [];
    for (const mod of MODULES) {
      const blocks = blocksOf(mod);
      for (const [key] of binColumnsOf(mod)) {
        const [table = '', col = ''] = key.split('.');
        const block = blocks.get(table);
        if (block === undefined) continue; // tabela morta ou declarada fora deste schema
        const declaredWithType = TYPE_FNS.some((fn) => block.includes(`${fn}('${col}')`));
        const declaredRaw = new RegExp(`\\b(?:var)?char\\('${col}',`).test(block);
        if (!declaredWithType && declaredRaw) offenders.push(`${mod} ${key}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'coluna com utf8mb4_bin declarada como varchar/char cru — a collation voltaria a depender de ' +
        'edição manual da migration, e o esquecimento é silencioso:\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga colunas binárias (guarda contra verde por vacuidade)', () => {
    const total = MODULES.reduce((n, m) => n + binColumnsOf(m).size, 0);
    assert.ok(total > 100, `esperado >100 colunas binárias no DDL, achei ${total}`);
  });

  it('a varredura enxerga os blocos de tabela (guarda contra fatiamento quebrado)', () => {
    const total = MODULES.reduce((n, m) => n + blocksOf(m).size, 0);
    assert.ok(total > 40, `esperado >40 tabelas nos schemas, achei ${total}`);
  });
});
