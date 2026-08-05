/**
 * IDENTIFIER-COLLATION-FROM-TYPE — coluna com `utf8mb4_bin` no banco é declarada com TIPO, nunca
 * com `varchar`/`char` cru (#636).
 *
 * ## O que este gate impede
 *
 * Antes do #636 a collation binária era inserida à mão no SQL que `drizzle-kit generate` emite. A
 * garantia morava na memória de quem rodava o comando, e o esquecimento é silencioso: a coluna
 * herda `utf8mb4_unicode_ci` e só aparece quando alguém a usa num JOIN — onde o MySQL 8.4 ou
 * recusa com `Illegal mix of collations`, ou converte em runtime e derruba o índice.
 *
 * Isso não é hipótese. O levantamento do #636 encontrou 24 identificadores vivos que ficaram sem
 * `bin` exatamente assim.
 *
 * ## Por que a asserção é nesta direção
 *
 * O gate cobra que toda coluna que JÁ tem `utf8mb4_bin` no DDL aplicado seja declarada com um dos
 * tipos de `identifier-columns.ts`. Ele não cobra o inverso — "todo `*_id` deve ser binário" —
 * porque isso reprovaria as 24 colunas divergentes, que exigem `ALTER` em produção e decisão
 * própria. Este gate protege o que está certo; corrigir o que está errado é outro ciclo.
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

/** Colunas que o DDL aplicado declara com `COLLATE utf8mb4_bin`, por módulo. */
const binColumnsOf = (mod: string): Map<string, string> => {
  const dir = join(PROJECT_ROOT, `src/modules/${mod}/adapters/persistence/migrations/mysql`);
  const found = new Map<string, string>();
  if (!existsSync(dir)) return found;
  let table = '?';
  for (const f of readdirSync(dir)
    .filter((x) => x.endsWith('.sql'))
    .sort()) {
    for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
      const t = /(?:CREATE TABLE(?: IF NOT EXISTS)?|ALTER TABLE)\s+`([a-z_0-9]+)`/i.exec(line);
      if (t?.[1] !== undefined) table = t[1];
      const c = /^\s*`([a-z_0-9]+)`\s+((?:var)?char\(\d+\))/i.exec(line);
      if (c?.[1] === undefined) continue;
      const key = `${table}.${c[1]}`;
      if (/COLLATE utf8mb4_bin/i.test(line)) found.set(key, c[2] ?? '');
      else found.delete(key); // redefinição posterior sem bin vence
    }
  }
  return found;
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
