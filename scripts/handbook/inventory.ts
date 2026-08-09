import process from 'node:process';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { markdownFiles, loadRedirects } from './link-scan.ts';
import { buildBacklinks, SOURCE_DIRS } from './tombstone.ts';

// Inventário de `handbook/` e `.claude/` — o levantamento que precede qualquer higienização.
//
// POR QUE GERADO, e não escrito: um documento com estes números nasce desatualizado no primeiro
// commit seguinte. Foi exatamente assim que o `PERGUNTAS-EM-ABERTO.md` ficou três meses divergente
// e que o `INDEX.md` passou a declarar-se "gerado" sem gerador. A interpretação é humana e datada;
// os números se pedem de novo com `pnpm run docs:inventory`.
//
// O QUE ESTE INVENTÁRIO NÃO DIZ: se um documento é BOM, ou se ainda descreve a realidade. Ele mede
// alcance (quem cita), silêncio (há quanto tempo ninguém toca) e volume. Documento órfão e antigo é
// candidato a revisão, não condenado — a leitura continua sendo julgamento de quem conhece o
// conteúdo.

/**
 * Caminho do repositório citado em PROSA — `handbook/research/x.md` escrito no texto, geralmente
 * entre crases, sem ser link clicável.
 *
 * DUAS PERGUNTAS DIFERENTES, e confundi-las condenou material vivo na primeira aplicação deste
 * inventário:
 *
 *   tombstone  — "alguém QUEBRA se eu apagar?"  → só link clicável quebra. Menção em prosa não.
 *   inventário — "alguém REFERENCIA isto?"      → menção em prosa referencia, e conta como alcance.
 *
 * Por isso `buildBacklinks` (tombstone) segue ignorando código inline, e esta função existe
 * separada em vez de afrouxar aquela. O caso real: `handbook/research/feture_propose/` aparecia com
 * ZERO citadores e é a fonte canônica declarada de quatro specs — 4 das 6 citações estavam em
 * crase, e as outras 2 vinham por um caminho que só resolve via `redirects.json`.
 */
const MENTION =
  /(?:handbook|\.claude|context|scripts|src|tests|db)\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*/g;

/**
 * Diretório específico o bastante para creditar o conteúdo: raiz conhecida + ao menos DOIS
 * segmentos abaixo dela. `handbook/research` é listagem; `handbook/research/feture_propose` é
 * referência ao material.
 */
const DIR_CREDIT = /^(?:handbook|\.claude|context)\/[^/]+\/[^/]+/;

export function extractMentions(markdown: string): readonly string[] {
  // Sobre o texto CRU, de propósito: é justamente o que `stripCode` remove que interessa aqui.
  // O único recorte é o bloco cercado, onde caminho costuma ser saída de comando, não referência.
  const semBloco = markdown.replace(/```[\s\S]*?```/g, '');
  return [...new Set([...semBloco.matchAll(MENTION)].map((m) => m[0].replace(/[.,;:)]+$/, '')))];
}

export interface DirStat {
  readonly dir: string;
  readonly files: number;
  readonly lines: number;
  /** Arquivos `.md` que nenhum outro documento cita. */
  readonly orphans: number;
  /** Documentos de FORA do diretório que citam algo dentro dele — o alcance real. */
  readonly citedBy: number;
  /** Dias desde o último commit que tocou o diretório. */
  readonly quietDays: number | null;
}

const daysSince = (iso: string): number =>
  Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);

/** Data do último commit que tocou o caminho. `null` quando o git não conhece. */
export function lastTouched(root: string, path: string): string | null {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', path], {
      cwd: root,
      encoding: 'utf-8',
    }).trim();
    return out === '' ? null : out;
  } catch {
    return null;
  }
}

/** Diretórios de primeiro nível que contêm markdown. */
export function topLevelDirs(root: string, base: string): readonly string[] {
  const abs = join(root, base);
  return execFileSync('git', ['ls-files', base], { cwd: root, encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean)
    .map((p) => p.slice(base.length + 1).split('/')[0] ?? '')
    .filter((seg) => seg !== '' && !seg.includes('.'))
    .filter((seg, i, all) => all.indexOf(seg) === i)
    .filter((seg) => {
      try {
        return statSync(join(abs, seg)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}

/**
 * alvo → quem o referencia, por LINK ou por MENÇÃO em prosa, com os redirects resolvidos.
 *
 * Resolver o redirect importa: uma citação escrita com prefixo errado (`handbook/handbook/…`)
 * aponta para um caminho que não existe, mas referencia um documento que existe — e ignorá-la faz
 * o documento parecer órfão.
 */
export function buildReferences(
  root: string,
  dirs: readonly string[],
): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, string[]>();
  const redirects = loadRedirects(root);

  const credit = (target: string, from: string): void => {
    const list = out.get(target) ?? [];
    if (!list.includes(from)) list.push(from);
    out.set(target, list);
  };

  const add = (target: string, from: string): void => {
    // `??` aqui era bug: colapsa `null` (lápide declarada) com `undefined` (sem entrada no mapa),
    // e a lápide passava a creditar o próprio alvo morto. O lint pegou como "tipos sem overlap";
    // a consequência era um documento enterrado aparecer com alcance.
    const entry = redirects.get(target);
    if (entry === null) return; // lápide: o alvo morreu, não há o que creditar
    const resolved = entry ?? target;
    credit(resolved, from);
    // Referência a DIRETÓRIO credita o que vive dentro. "O insumo é `…/gestao_de_usuarios`" fala
    // dos documentos daquela pasta — creditar só a pasta deixaria cada arquivo dela órfão, que foi
    // como dois documentos vivos apareceram sem citador nenhum na primeira leitura.
    // Crédito por diretório vale só para caminho ESPECÍFICO — 3 segmentos ou mais. Duas razões,
    // ambas descobertas quebrando:
    //
    //   · sem exigir subdiretório de raiz conhecida, um alvo curto mandava a varredura recursiva
    //     subir e estourar fora do repositório (`EACCES` em `/Library/…`);
    //   · creditando diretório de TOPO, este próprio inventário zerava os órfãos do repositório
    //     inteiro: o review que lista `handbook/research`, `handbook/specs` etc. numa tabela
    //     passava a "citar" os 1418 arquivos. Documento que enumera diretórios é índice, não
    //     referência ao conteúdo de cada um.
    if (!resolved.endsWith('.md') && DIR_CREDIT.test(resolved)) {
      const abs = join(root, resolved);
      if (!existsSync(abs) || !statSync(abs).isDirectory()) return;
      for (const file of markdownFiles(abs)) credit(relative(root, file), from);
    }
  };

  for (const [target, froms] of buildBacklinks(root)) for (const f of froms) add(target, f);

  for (const dir of dirs) {
    const abs = join(root, dir);
    for (const file of markdownFiles(abs)) {
      const from = relative(root, file);
      for (const mention of extractMentions(readFileSync(file, 'utf-8'))) add(mention, from);
    }
  }
  return out;
}

export function inventory(root: string, dirs: readonly string[]): readonly DirStat[] {
  const backlinks = buildReferences(root, SOURCE_DIRS);
  return dirs.map((dir) => {
    const abs = join(root, dir);
    let files = 0;
    let lines = 0;
    let orphans = 0;
    const citers = new Set<string>();
    for (const file of markdownFiles(abs)) {
      const rel = relative(root, file);
      files += 1;
      lines += readFileSync(file, 'utf-8').split('\n').length;
      const from = backlinks.get(rel) ?? [];
      if (from.length === 0) orphans += 1;
      for (const c of from) if (!c.startsWith(`${dir}/`)) citers.add(c);
    }
    const touched = lastTouched(root, dir);
    return {
      dir,
      files,
      lines,
      orphans,
      citedBy: citers.size,
      quietDays: touched === null ? null : daysSince(touched),
    };
  });
}

const pad = (s: string | number, n: number): string => String(s).padStart(n);

function main(): void {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
  const dirs = [
    ...topLevelDirs(root, 'handbook').map((d) => `handbook/${d}`),
    ...topLevelDirs(root, '.claude').map((d) => `.claude/${d}`),
  ];
  const stats = [...inventory(root, dirs)].sort((a, b) => b.files - a.files);

  process.stdout.write(
    `${'diretório'.padEnd(30)}${pad('arqs', 6)}${pad('linhas', 8)}${pad('órfãos', 8)}${pad('citado', 8)}${pad('quieto', 8)}\n`,
  );
  process.stdout.write(`${'─'.repeat(68)}\n`);
  for (const s of stats) {
    process.stdout.write(
      `${s.dir.padEnd(30)}${pad(s.files, 6)}${pad(s.lines, 8)}${pad(s.orphans, 8)}${pad(s.citedBy, 8)}${pad(s.quietDays ?? '?', 7)}d\n`,
    );
  }
  const total = stats.reduce(
    (acc, s) => ({ f: acc.f + s.files, l: acc.l + s.lines, o: acc.o + s.orphans }),
    { f: 0, l: 0, o: 0 },
  );
  process.stdout.write(`${'─'.repeat(68)}\n`);
  process.stdout.write(
    `${'TOTAL'.padEnd(30)}${pad(total.f, 6)}${pad(total.l, 8)}${pad(total.o, 8)}\n`,
  );
  process.stdout.write(
    `\nórfão = nenhum outro documento o cita · citado = documentos de fora que apontam para dentro\n` +
      `quieto = dias desde o último commit no diretório\n`,
  );
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
