/**
 * Constrói `dominios-spb.db` a partir da Tabela de Domínio publicada em .xls.
 *
 *   bun .claude/skills/cnab240-bradesco/dominios/build.ts
 *
 * Determinístico: mesma entrada → mesmo banco. O .db é artefato derivado; a
 * fonte de verdade é o .xls ao lado, e a proveniência fica gravada na tabela
 * `meta` (nome do arquivo, sha256, contagens) para que uma resposta do agente
 * possa citar de onde o dado veio — não de memória.
 *
 * Runtime: bun (harness local, nunca `src/`).
 */
import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, unlinkSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { readXls, type CellValue } from './xls-biff8.ts';

const HERE = dirname(Bun.fileURLToPath(import.meta.url));
const SOURCE_XLS = join(HERE, '..', 'tabela_de_dominio_20260724.xls');
const TARGET_DB = join(HERE, 'dominios-spb.db');

/** Colunas da planilha, na ordem em que o Bacen publica. */
const COLUMN = {
  TIPO: 0,
  DOMINIO: 1,
  DESCRICAO: 2,
  CONTROLE: 3,
  HOM_INICIO: 4,
  PROD_INICIO: 5,
  HOM_FIM: 6,
  PROD_FIM: 7,
} as const;

const text = (v: CellValue): string => (v === null || v === undefined ? '' : String(v)).trim();

/** `dd/mm/aaaa` → `aaaa-mm-dd`. ISO ordena e compara em SQL; BR não. */
function toIsoDate(value: CellValue): string | null {
  const raw = text(value);
  if (raw === '') return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; // já veio como serial convertido
  throw new Error(`data em formato inesperado: ${JSON.stringify(raw)}`);
}

const SCHEMA = `
-- A linha inteira mora nas folhas da B-Tree de (tipo, dominio): um único
-- descenso por consulta, sem o salto índice → rowid → linha. E como a árvore
-- é ordenada por tipo, "todos os domínios de um tipo" é varredura de range.
CREATE TABLE dominio (
  tipo        TEXT NOT NULL COLLATE NOCASE,
  dominio     TEXT NOT NULL COLLATE NOCASE,
  descricao   TEXT NOT NULL,
  controle    TEXT,
  hom_inicio  TEXT,
  prod_inicio TEXT,
  hom_fim     TEXT,
  prod_fim    TEXT,
  PRIMARY KEY (tipo, dominio)
) WITHOUT ROWID;

-- Busca por descrição. remove_diacritics 2 faz "negociacao" achar "Negociação":
-- quem consulta digita sem acento, e a fonte é toda acentuada.
CREATE VIRTUAL TABLE dominio_fts USING fts5(
  tipo UNINDEXED,
  dominio UNINDEXED,
  descricao,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Proveniência: o agente precisa poder citar a edição, não afirmar de memória.
CREATE TABLE meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL) WITHOUT ROWID;
`;

function main(): void {
  const bytes = readFileSync(SOURCE_XLS);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const sheets = readXls(bytes);

  const dictionary = sheets.find((s) => /dicion/i.test(s.name));
  if (!dictionary) {
    throw new Error(`planilha de dicionário não encontrada — abas: ${sheets.map((s) => s.name).join(', ')}`);
  }

  const rows = dictionary.rows.slice(1).filter((r) => text(r?.[COLUMN.TIPO]) !== '');
  if (rows.length === 0) throw new Error('nenhuma linha de dado — o parser regrediu');

  try {
    unlinkSync(TARGET_DB);
  } catch {
    /* primeira construção */
  }

  const db = new Database(TARGET_DB, { create: true });
  db.run('PRAGMA journal_mode = OFF');
  db.run('PRAGMA synchronous = OFF');
  db.run(SCHEMA);

  const insertDomain = db.prepare(
    `INSERT INTO dominio (tipo, dominio, descricao, controle, hom_inicio, prod_inicio, hom_fim, prod_fim)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertFts = db.prepare('INSERT INTO dominio_fts (tipo, dominio, descricao) VALUES (?, ?, ?)');

  let inserted = 0;
  let desativados = 0;
  const collisions: string[] = [];

  db.transaction(() => {
    for (const row of rows) {
      const tipo = text(row[COLUMN.TIPO]);
      const dominio = text(row[COLUMN.DOMINIO]);
      const descricao = text(row[COLUMN.DESCRICAO]);
      const controle = text(row[COLUMN.CONTROLE]) || null;
      const prodFim = toIsoDate(row[COLUMN.PROD_FIM]);
      try {
        insertDomain.run(
          tipo,
          dominio,
          descricao,
          controle,
          toIsoDate(row[COLUMN.HOM_INICIO]),
          toIsoDate(row[COLUMN.PROD_INICIO]),
          toIsoDate(row[COLUMN.HOM_FIM]),
          prodFim,
        );
      } catch (error) {
        // COLLATE NOCASE pode fundir chaves que a planilha distingue por caixa.
        // Silenciar isso perderia domínio; falhar alto é o comportamento certo.
        collisions.push(`${tipo}/${dominio}: ${(error as Error).message}`);
        continue;
      }
      insertFts.run(tipo, dominio, descricao);
      inserted++;
      if (prodFim !== null) desativados++;
    }
  })();

  if (collisions.length > 0) {
    throw new Error(`colisão de chave sob COLLATE NOCASE (${collisions.length}):\n  ${collisions.slice(0, 10).join('\n  ')}`);
  }

  const tipos = db.query('SELECT COUNT(DISTINCT tipo) AS n FROM dominio').get() as { n: number };
  const meta: [string, string][] = [
    ['fonte_arquivo', basename(SOURCE_XLS)],
    ['fonte_sha256', sha256],
    ['fonte_planilha', dictionary.name],
    ['linhas', String(inserted)],
    ['tipos', String(tipos.n)],
    ['desativados_em_producao', String(desativados)],
    ['abas_no_xls', sheets.map((s) => s.name).join(' | ')],
  ];
  const insertMeta = db.prepare('INSERT INTO meta (chave, valor) VALUES (?, ?)');
  db.transaction(() => {
    for (const [k, v] of meta) insertMeta.run(k, v);
  })();

  db.run('ANALYZE');
  db.run('VACUUM');
  db.close();

  const size = statSync(TARGET_DB).size;
  console.log(`ok  ${basename(TARGET_DB)}  ${inserted} domínios · ${tipos.n} tipos · ${desativados} desativados em produção · ${(size / 1024).toFixed(0)} KB`);
}

main();
