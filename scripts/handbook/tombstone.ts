import process from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractRelativeLinks, markdownFiles, loadRedirects } from './link-scan.ts';

// Fase 2 do plano `handbook/specs/041-handbook-reference-integrity/plan.md`.
//
// O único item do plano que ataca a CAUSA e não o estoque: `handbook/domain/` evaporou num commit
// levando 59 referências, e nada avisou. Este gate exige que apagar ou mover um `.md` citado seja
// um ato DECLARADO — com destino novo, ou com lápide (`to: null` + motivo) em `handbook/redirects.json`.
//
// Lápide PASSA de propósito. O objetivo não é impedir a remoção — é impedir a remoção SILENCIOSA.
// Quem declara "este documento morreu e não tem substituto" deixou rastro para o próximo leitor;
// quem apaga sem declarar transfere o custo para quem for seguir o link daqui a três meses.
//
// Por que não vive dentro do `pre-commit-typecheck.sh`: aquele gate sai cedo quando não há `.ts`
// staged — e o commit que apaga só documentação é exatamente o que ele nunca inspecionaria.

/** Onde procurar por quem cita. Documentação do handbook é citada de fora dele. */
export const SOURCE_DIRS: readonly string[] = ['handbook', '.claude', 'context'];

export interface TombstoneViolation {
  /** Caminho removido, relativo à raiz. */
  readonly path: string;
  /** Quem ainda cita — limitado na apresentação, completo aqui. */
  readonly citedBy: readonly string[];
}

export interface TombstoneInput {
  /** `.md` deletados ou renomeados no diff staged, relativos à raiz. */
  readonly removed: readonly string[];
  /** alvo → arquivos que o citam. */
  readonly backlinks: ReadonlyMap<string, readonly string[]>;
  /** Entradas de `redirects.json`. `null` é lápide declarada — e passa. */
  readonly redirects: ReadonlyMap<string, string | null>;
}

/**
 * Um arquivo removido só é violação se alguém ainda o cita E não há declaração a respeito dele.
 * Arquivo órfão sai sem cerimônia: ninguém quebra.
 */
export function checkTombstones(input: TombstoneInput): readonly TombstoneViolation[] {
  const violations: TombstoneViolation[] = [];
  for (const path of input.removed) {
    if (input.redirects.has(path)) continue;
    const citedBy = input.backlinks.get(path) ?? [];
    if (citedBy.length > 0) violations.push({ path, citedBy: [...citedBy].sort() });
  }
  return violations;
}

/**
 * Constrói o mapa alvo → quem cita, varrendo os diretórios de documentação.
 *
 * Usa o mesmo extrator do `link-scan` — logo herda a regra de menção × uso de graça: um documento
 * que menciona `caminho/arquivo.md` dentro de crase não conta como citação, e não deve mesmo
 * impedir a remoção.
 */
export function buildBacklinks(
  root: string,
  dirs: readonly string[] = SOURCE_DIRS,
): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, string[]>();
  for (const dir of dirs) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const file of markdownFiles(abs)) {
      const from = relative(root, file);
      for (const raw of extractRelativeLinks(readFileSync(file, 'utf-8'))) {
        const clean = decodeURIComponent(raw.split('#')[0] ?? '');
        const target = relative(root, resolve(dirname(file), clean));
        const list = out.get(target) ?? [];
        if (!list.includes(from)) list.push(from);
        out.set(target, list);
      }
    }
  }
  return out;
}

/**
 * `.md` que DEIXARAM de existir no caminho antigo — deletados (D) ou renomeados (R).
 *
 * `--name-status`, e não `--name-only`, porque num rename o `--name-only` devolve o caminho de
 * DESTINO: o gate lia o arquivo recém-criado como removido e recusava toda reorganização, inclusive
 * a que preserva os links. Foi o que aconteceu na primeira movimentação real de pasta.
 *
 * Formato: `D<TAB>caminho` para deleção, `R100<TAB>antigo<TAB>novo` para rename. O que interessa
 * nos dois casos é o PRIMEIRO caminho — o endereço que deixou de responder.
 */
export function stagedRemovedMarkdown(root: string): readonly string[] {
  const raw = execFileSync('git', ['diff', '--cached', '--diff-filter=DR', '--name-status'], {
    cwd: root,
    encoding: 'utf-8',
  });
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t')[1] ?? '')
    .map((p) => p.trim())
    .filter((p) => p.endsWith('.md'));
}

export function formatViolations(violations: readonly TombstoneViolation[]): string {
  const blocks = violations.map((v) => {
    const shown = v.citedBy.slice(0, 5);
    const rest = v.citedBy.length - shown.length;
    const list = shown.map((c) => `      · ${c}`).join('\n');
    const more = rest > 0 ? `\n      … e mais ${String(rest)}` : '';
    return `  ${v.path}\n    citado por ${String(v.citedBy.length)} arquivo(s):\n${list}${more}`;
  });
  return (
    '❌ pre-commit: documento citado sendo removido sem declaração.\n\n' +
    blocks.join('\n\n') +
    '\n\nApagar um .md que outros citam produz link morto silencioso — foi assim que\n' +
    'handbook/domain/ levou 59 referências junto. Declare em handbook/redirects.json:\n\n' +
    '  { "<caminho removido>": { "to": "<novo caminho>", "reason": "...", "since": "AAAA-MM-DD" } }\n\n' +
    'Sem substituto, a lápide é explícita e igualmente válida:\n\n' +
    '  { "<caminho removido>": { "to": null, "reason": "por que morreu", "since": "AAAA-MM-DD" } }\n\n' +
    'Escape de emergência: git commit --no-verify\n'
  );
}

function main(): void {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
  const removed = stagedRemovedMarkdown(root);
  if (removed.length === 0) return;

  const violations = checkTombstones({
    removed,
    backlinks: buildBacklinks(root),
    redirects: loadRedirects(root),
  });
  if (violations.length === 0) return;

  process.stderr.write(formatViolations(violations));
  process.exit(1);
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
