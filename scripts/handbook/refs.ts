import process from 'node:process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { markdownFiles, stripCode } from './link-scan.ts';

// Fase 5 do plano `handbook/specs/041-handbook-reference-integrity/plan.md`.
//
// O defeito estrutural que as fases anteriores só contiveram: o caminho do arquivo virou API
// pública sem nunca ter sido declarado como tal. Uma citação por caminho acopla identidade,
// localização e título num token só — mudar qualquer um quebra todas as citações, e dentro de ADR
// aceito não há conserto possível, porque o texto é imutável.
//
// A referência por IDENTIFICADOR desacopla: `adr-0017` é o que o documento É; onde ele mora e como
// se chama o arquivo passam a ser detalhe. É o mesmo movimento que a Oxide fez nos RFDs (`[rfd5]`).
//
// LIMITAÇÃO DECLARADA, não resolvida aqui: `[[adr-0017]]` não é clicável no GitHub. O ganho é que
// renomear deixa de quebrar; o custo é um clique. Enquanto a expansão para link markdown não for
// decidida, a recomendação é usar ID onde o alvo é volátil (inquiry, spec) e caminho onde é
// estável e a navegação importa.
//
// A SINTAXE COLIDE, e por isso o padrão é restritivo. `[[` … `]]` aparece no repositório em teste
// de bash (`[[ "$x" == y ]]`) e em array aninhado de exemplo (`[['a','b']]`). O regex exige
// `tipo-numero` em minúsculas, sem espaço nem aspas — nenhum dos dois casos casa.

/** `adr-0017`, `inquiry-0011`, `spec-041`. Minúsculas, hífen único, 3 ou 4 dígitos. */
export const REF_PATTERN = /\[\[([a-z]+-\d{3,4})\]\]/g;

export interface RefSource {
  /** Prefixo do identificador. */
  readonly kind: string;
  /** Diretório, relativo à raiz. */
  readonly dir: string;
  /** Se true, cada ENTRADA DE DIRETÓRIO é um documento (caso das specs). */
  readonly directories?: boolean;
}

export const REF_SOURCES: readonly RefSource[] = [
  { kind: 'adr', dir: 'handbook/architecture/adr' },
  { kind: 'inquiry', dir: 'handbook/inquiries' },
  { kind: 'spec', dir: 'handbook/specs', directories: true },
];

/**
 * Constrói o registro id → caminho. O número vem do PREFIXO do nome, que já é convenção cobrada
 * por `tests/cleanup/handbook-numbering.test.ts` — este registro não inventa identidade nova, só
 * torna endereçável a que já existe.
 */
export function buildRegistry(
  root: string,
  sources: readonly RefSource[] = REF_SOURCES,
): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const src of sources) {
    const abs = join(root, src.dir);
    for (const entry of readdirSync(abs)) {
      const full = join(abs, entry);
      const isDir = statSync(full).isDirectory();
      if (src.directories === true ? !isDir : isDir || !entry.endsWith('.md')) continue;
      const m = /^(\d{3,4})[-.]/.exec(entry);
      const num = m?.[1];
      if (num === undefined) continue;
      const id = `${src.kind}-${num}`;
      // Primeiro vence: `handbook-numbering` já barra colisão de prefixo, então dois arquivos com
      // o mesmo número aqui indicam que aquele gate foi contornado — o teste de refs acusa.
      if (!out.has(id)) out.set(id, relative(root, full));
    }
  }
  return out;
}

export interface RefUse {
  readonly from: string;
  readonly id: string;
}

/** Toda citação `[[id]]` nos diretórios dados, ignorando código (menção não é uso). */
export function findRefs(root: string, dirs: readonly string[]): readonly RefUse[] {
  const out: RefUse[] = [];
  for (const dir of dirs) {
    for (const file of markdownFiles(join(root, dir))) {
      const body = stripCode(readFileSync(file, 'utf-8'));
      for (const m of body.matchAll(REF_PATTERN)) {
        const id = m[1];
        if (id !== undefined) out.push({ from: relative(root, file), id });
      }
    }
  }
  return out;
}

/** Citações que o registro não resolve. */
export function unresolved(
  refs: readonly RefUse[],
  registry: ReadonlyMap<string, string>,
): readonly RefUse[] {
  return refs.filter((r) => !registry.has(r.id));
}

function main(): void {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
  const registry = buildRegistry(root);
  const refs = findRefs(root, ['handbook']);
  const bad = unresolved(refs, registry);

  process.stdout.write(`identificadores registrados: ${String(registry.size)}\n`);
  process.stdout.write(`citações [[id]] encontradas: ${String(refs.length)}\n`);
  process.stdout.write(`não resolvidas: ${String(bad.length)}\n`);

  if (process.argv.includes('--list')) {
    const ordered = [...registry].sort(([a], [b]) => a.localeCompare(b));
    for (const [id, path] of ordered) process.stdout.write(`  ${id}  ${path}\n`);
  }
  for (const r of bad) process.stderr.write(`  ✖ ${r.from} → [[${r.id}]]\n`);
  if (bad.length > 0) process.exitCode = 1;
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
