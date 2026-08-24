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
 *
 * ## A direção inversa, e onde ela para
 *
 * O gate acima é cego a quem **nunca** teve `bin`. Foi assim que `ctr_documents.deleted_by` e
 * `.superseded_by` atravessaram a migration `0019` — que existia justamente para corrigir collation
 * nessa tabela, e tocou as cinco colunas vizinhas. Não houve descuido de revisão: as duas estavam
 * declaradas com `char(…, { length: 36 })` cru, então `drizzle-kit generate` não tinha diff para
 * emitir. O defeito era invisível ao diff de migration, e só um gate que lê o SCHEMA o alcança.
 *
 * Os dois casos abaixo fecham esse flanco pela largura 36 — ver {@link UUID_WIDTH} para a medição
 * que torna essa largura não-ambígua.
 *
 * ### Por que para na 36 — e o que faria valer estendê-lo
 *
 * A asserção só é possível onde a LARGURA já decide a intenção, e isso não vale para as sete
 * larguras binárias. Medido nas 60 declarações cruas que restam no repositório, por largura:
 *
 *     36    0 cruas   — UUID, e nada mais: nenhum nome, título ou descrição usa 36
 *     14    0 cruas   — CNPJ
 *     11    1 crua    — `auth.users.cpf`, identificador genuíno declarado sem `cpfKey`
 *     64   15 cruas   — `event_type` e `name` (texto) MISTURADOS com `content_hash` e `run_key`
 *    128    2 cruas   — texto
 *    255   42 cruas   — texto
 *
 * De 64 para cima a largura não distingue mais nada: `varchar(64)` é `opaqueKey` E `event_type`,
 * `varchar(255)` é `objectStorageKey` E `pix_key`. Decidir ali exigiria classificar pelo NOME da
 * coluna — a heurística que `tests/support/source-scan.ts:9-14` documenta como tendo invertido
 * veredito seis vezes neste repositório, duas delas em ADR. Um gate assim erra em silêncio, e erra
 * no sentido pior: aprovando o que devia barrar.
 *
 * As larguras 11 e 14 são tão não-ambíguas quanto a 36, e é para lá que a extensão aponta. Ela não
 * entrou aqui por uma razão de escopo, não de mérito: a única violação de 11 vive em `auth`, e este
 * gate nasceu no conserto de `ctr_documents` — puxá-la para dentro misturaria módulos e faria o
 * gate estrear vermelho por dívida de outro dono, que é como um gate novo vira `skip` em duas
 * semanas. Ela é barata (uma coluna) e cabe num ciclo próprio.
 *
 * Acima de 64, o que destravaria não é ampliar a varredura e sim mudar o que se varre: enquanto a
 * intenção só estiver registrada onde o helper FOI usado, o gate não tem como perguntar por quem
 * não o usou. E o que sobra ali **não é dívida de forma, é dívida de julgamento** — o #637 fechou,
 * e das colunas que restam sem `bin` com nome de identificador, a maioria não deveria mesmo ser
 * binária (`pix_key` é dado de negócio, não chave opaca; `password_hash` nunca entra em predicado).
 * Nenhuma varredura decide isso: alguém precisa olhar coluna por coluna e dizer o que ela é.
 *
 * O gate por largura é, portanto, andaime — e o que o substitui não é uma varredura maior, é um
 * helper para cada intenção que ainda não tem um. Enquanto `objectStorageKey` for `varchar(255)` e
 * as chaves de S3 vivas forem `varchar(1024)` e `varchar(512)`, elas não têm como vir de tipo, e
 * nenhum gate as alcança sem virar a heurística por nome que este arquivo recusa duas vezes.
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

/**
 * Largura canônica do UUID textual — 36 é o comprimento do UUID com hífens, e não é largura
 * natural de nome nem de descrição. Nenhuma coluna de texto humano deste repositório a usa; ver a
 * medição por largura no docblock do topo.
 *
 * É essa exclusividade que permite cobrar a direção INVERSA à do gate acima sem colidir com o
 * #637: aqui não se pergunta "esta coluna tem bin?", e sim "esta coluna é UUID?". A resposta vem
 * da largura, não do DDL aplicado — então a asserção alcança a coluna que **nunca** teve `bin`,
 * que é exatamente o ponto cego que deixou `ctr_documents.deleted_by` passar pela migration 0019.
 */
const UUID_WIDTH = 36;

/** `deletedBy: char('deleted_by', { length: 36 })` — a declaração crua que este gate proíbe. */
const RAW_UUID_COLUMN = /(?:var)?char\(\s*'([a-z_0-9]+)'\s*,\s*\{\s*length:\s*36\s*\}/g;

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

  it('nenhuma coluna de largura 36 é declarada com char/varchar cru — 36 é UUID', () => {
    const offenders: string[] = [];
    for (const mod of MODULES) {
      for (const [table, block] of blocksOf(mod)) {
        for (const m of block.matchAll(RAW_UUID_COLUMN)) {
          if (m[1] !== undefined) offenders.push(`${mod} ${table}.${m[1]}`);
        }
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `coluna de ${UUID_WIDTH} declarada com char/varchar cru. A largura ${UUID_WIDTH} é o UUID ` +
        'textual e nada mais neste repositório, então a coluna É identificador e precisa de ' +
        '`uuidKey`/`uuidKeyFixed` — o tipo cru a faz herdar o default da tabela em silêncio, e o ' +
        'gate acima não a alcança porque ele só olha quem JÁ tem `bin` no DDL:\n' +
        offenders.join('\n'),
    );
  });

  it('toda coluna de largura 36 no DDL aplicado tem COLLATE utf8mb4_bin', () => {
    const offenders: string[] = [];
    for (const mod of MODULES) {
      for (const [key, { type, bin }] of ddlStateOf(mod)) {
        if (type === `char(${UUID_WIDTH})` || type === `varchar(${UUID_WIDTH})`) {
          if (!bin) offenders.push(`${mod} ${key} ${type}`);
        }
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `coluna de ${UUID_WIDTH} sem \`COLLATE utf8mb4_bin\` no DDL aplicado. Ela herda ` +
        '`@@collation_server` no `CREATE TABLE`, então a comparação passa a depender de ' +
        'configuração externa correta — é o modo de falha do #808, onde um MySQL no default do ' +
        'produto (`utf8mb4_0900_ai_ci`) derrubou a migration com errno 1267. E enquanto isso a ' +
        'busca por igualdade casa por CAIXA, porque `_ci` compara `A` igual a `a` num valor que ' +
        'é opaco por definição:\n' +
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
