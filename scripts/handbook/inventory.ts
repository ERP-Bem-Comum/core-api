import process from 'node:process';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { markdownFiles } from './link-scan.ts';
import { buildBacklinks } from './tombstone.ts';

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

export function inventory(root: string, dirs: readonly string[]): readonly DirStat[] {
  const backlinks = buildBacklinks(root);
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
