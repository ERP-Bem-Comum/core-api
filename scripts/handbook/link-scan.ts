import process from 'node:process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fase 0 do plano `handbook/specs/041-handbook-reference-integrity/plan.md`.
//
// Varre os links relativos do handbook e classifica cada um. NÃO bloqueia nada: a Fase 4 é que liga
// o gate, e só depois que o estoque estiver endereçado — gate que nasce vermelho obriga a violar o
// ADR-0057 §5 (registro histórico não se reescreve) para ficar verde.
//
// A medição de 2026-08-07 que originou o plano: 3045 ESCAPES-REPO, 45 MIRROR, 138 não endereçados.
//
// MENÇÃO NÃO É USO — e esta é a regra que mais custou. A primeira varredura do próprio plano acusou
// dois "links mortos" que eram EXEMPLOS de sintaxe escritos para explicar o defeito. Por isso o
// extrator remove blocos cercados E código inline antes de procurar link: todo documento que
// DOCUMENTA a convenção cita a forma quebrada, e um extrator ingênuo o acusa por documentá-la.

/** Onde o link aparece e para onde aponta, tudo relativo à raiz do repositório. */
export interface LinkRef {
  /** Arquivo que cita, relativo à raiz. */
  readonly from: string;
  /** O destino exatamente como escrito no markdown. */
  readonly raw: string;
  /** Destino resolvido, relativo à raiz. Começa com `..` quando escapa do repositório. */
  readonly target: string;
}

export type LinkClass =
  /** Resolve para fora da raiz — espelho de doc de terceiro, cópia fiel da origem. */
  | 'escapes-repo'
  /** Citado por `handbook/reference/` — material de terceiro, não autoral. */
  | 'mirror'
  /** O alvo existe. */
  | 'live'
  /** O alvo não existe, mas há entrada de redirect com destino vivo. */
  | 'redirected'
  /**
   * O alvo não existe e `redirects.json` o declara morto sem substituto (`to: null` + motivo).
   * Conta como ENDEREÇADO: o link segue quebrado para quem clica, mas deixou de ser um mistério —
   * alguém decidiu, escreveu por quê, e datou. O gate existe para exigir a decisão, não para
   * proibir que documento morra.
   */
  | 'tombstoned'
  /** O alvo não existe e é aparato expurgado — declarado, nunca consertado (ADR-0057 §5). */
  | 'historical'
  /** O alvo não existe e nenhuma saída o cobre. É o passivo que o plano zera. */
  | 'unaddressed';

export interface ClassifyInput {
  readonly link: LinkRef;
  readonly targetExists: boolean;
  /** Prefixo do material de terceiro espelhado. */
  readonly mirrorPrefix: string;
  /** Prefixos de aparato expurgado. Vazio na Fase 0; a Fase 4 os pina. */
  readonly historicalPrefixes: readonly string[];
  /** `from` morto → destino, ou `null` para "declarado perdido". Vazio até a Fase 3. */
  readonly redirects: ReadonlyMap<string, string | null>;
}

/** Destinos que não são caminho de arquivo e não interessam a esta varredura. */
const EXTERNAL = /^(https?:|mailto:|data:|tel:|#)/;

/**
 * 🔒 Allowlist PINADA — aparato de processo expurgado pelas specs 038 e 039, cujas referências o
 * [ADR-0057](../../handbook/architecture/adr/0057-claude-md-as-canonical-agent-doc.md) §5 declara
 * invariante: "são registro do que era verdade na data em que foram escritas" e **MUST NOT** ser
 * atualizadas. Não é dívida a pagar — é decisão a respeitar.
 *
 * O pin por `deepEqual` em `tests/cleanup/handbook-links.test.ts` existe para que a lista não
 * cresça em silêncio: acrescentar prefixo aqui é como afrouxar o gate, e tem de aparecer em diff de
 * PR com justificativa. O mesmo teste também exige que cada prefixo esteja MESMO ausente do disco —
 * ressuscitar `.specify/` e manter a entrada transformaria a allowlist em desculpa.
 */
export const HISTORICAL_PREFIXES: readonly string[] = [
  '.claude/.pipeline/', // tickets do pipeline W0→W3 (spec 038)
  '.claude/.planning/', // planejamento do mesmo aparato
  '.claude/skills/pipeline-maestro/', // skill orquestradora do pipeline
  '.claude/skills/speckit-', // família speckit-* (spec 039)
  '.specify/', // engine do spec-kit
  'scripts/pipeline/', // CLI de estado do pipeline
  'AGENTS.md', // doc canônica anterior, aposentada em 2026-08-03 (ADR-0057)
  'ERP-CONTRACTS/', // topologia de repositório anterior ao core-api ser a raiz
];

/**
 * Remove o que é AMOSTRA de sintaxe, não citação: blocos cercados e código inline.
 * Sem isto, o `plan.md` que explica o defeito é acusado de cometê-lo.
 */
export function stripCode(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/**
 * Extrai os destinos de link markdown que são caminho relativo. Âncora é cortada — este scanner
 * verifica existência de ARQUIVO; validar âncora é outro problema e outro gate.
 *
 * Limitação declarada: só a forma inline `[texto](destino)`. Link de referência (`[texto][ref]`
 * com `[ref]: destino` embaixo) não é usado no handbook hoje; se passar a ser, esta função fica
 * cega para ele — e cegueira silenciosa é o defeito que o plano inteiro combate.
 */
export function extractRelativeLinks(markdown: string): readonly string[] {
  const out: string[] = [];
  for (const m of stripCode(markdown).matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const raw = m[1];
    if (raw === undefined || EXTERNAL.test(raw)) continue;
    const withoutAnchor = decodeURIComponent(raw.split('#')[0] ?? '');
    if (withoutAnchor === '') continue;
    out.push(raw);
  }
  return out;
}

/**
 * A ordem é a definição. `live` vem ANTES de `mirror` de propósito: um link de terceiro que resolve
 * é simplesmente vivo, e `mirror` fica significando exatamente uma coisa — link QUEBRADO em material
 * espelhado, que não é nosso para consertar. Classe que mistura vivo e morto não mede nada.
 */
export function classifyLink(input: ClassifyInput): LinkClass {
  const { link, targetExists, mirrorPrefix, historicalPrefixes, redirects } = input;
  if (link.target.startsWith('..')) return 'escapes-repo';
  if (targetExists) return 'live';
  if (link.from.startsWith(mirrorPrefix)) return 'mirror';
  if (historicalPrefixes.some((p) => link.target.startsWith(p))) return 'historical';
  if (redirects.has(link.target)) {
    return redirects.get(link.target) === null ? 'tombstoned' : 'redirected';
  }
  return 'unaddressed';
}

export interface ScanOptions {
  readonly mirrorPrefix?: string;
  readonly historicalPrefixes?: readonly string[];
  readonly redirects?: ReadonlyMap<string, string | null>;
}

export type ScanResult = ReadonlyMap<LinkClass, readonly LinkRef[]>;

export const markdownFiles = (dir: string): readonly string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return markdownFiles(p);
    return e.name.endsWith('.md') ? [p] : [];
  });

/** Varre `<root>/handbook` e classifica todo link relativo encontrado. */
export function scanHandbook(root: string, opts: ScanOptions = {}): ScanResult {
  const mirrorPrefix = opts.mirrorPrefix ?? 'handbook/reference/';
  const historicalPrefixes = opts.historicalPrefixes ?? HISTORICAL_PREFIXES;
  const redirects = opts.redirects ?? new Map<string, string | null>();

  const out = new Map<LinkClass, LinkRef[]>();
  for (const file of markdownFiles(join(root, 'handbook'))) {
    const from = relative(root, file);
    const body = readFileSync(file, 'utf-8');
    for (const raw of extractRelativeLinks(body)) {
      const clean = decodeURIComponent(raw.split('#')[0] ?? '');
      const abs = resolve(dirname(file), clean);
      const link: LinkRef = { from, raw, target: relative(root, abs) };
      const cls = classifyLink({
        link,
        targetExists: existsSync(abs),
        mirrorPrefix,
        historicalPrefixes,
        redirects,
      });
      out.set(cls, [...(out.get(cls) ?? []), link]);
    }
  }
  return out;
}

/** Lê `handbook/redirects.json` se existir. A Fase 3 o cria; até lá, mapa vazio. */
export function loadRedirects(root: string): ReadonlyMap<string, string | null> {
  const file = join(root, 'handbook/redirects.json');
  if (!existsSync(file)) return new Map();
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf-8'));
  const out = new Map<string, string | null>();
  if (typeof parsed === 'object' && parsed !== null) {
    for (const [from, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof entry === 'object' && entry !== null && 'to' in entry) {
        const to = (entry as { to: unknown }).to;
        out.set(from, typeof to === 'string' ? to : null);
      }
    }
  }
  return out;
}

function main(): void {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
  const result = scanHandbook(root, { redirects: loadRedirects(root) });
  const count = (c: LinkClass): number => (result.get(c) ?? []).length;

  const unaddressed = result.get('unaddressed') ?? [];
  for (const c of [
    'escapes-repo',
    'mirror',
    'live',
    'redirected',
    'tombstoned',
    'historical',
  ] as const) {
    process.stdout.write(`${c.padEnd(14)} ${String(count(c)).padStart(5)}\n`);
  }
  process.stdout.write(`${'unaddressed'.padEnd(14)} ${String(unaddressed.length).padStart(5)}\n`);

  if (process.argv.includes('--list') || process.argv.includes('--check')) {
    const byTarget = new Map<string, number>();
    for (const l of unaddressed) byTarget.set(l.target, (byTarget.get(l.target) ?? 0) + 1);
    for (const [t, n] of [...byTarget].sort((a, b) => b[1] - a[1])) {
      process.stdout.write(`${String(n).padStart(5)}  ${t}\n`);
    }
  }

  // `--check` é o modo que a Fase 4 liga no gate. Hoje ele falha de propósito: o estoque de 138
  // ainda não foi endereçado, e é isso que o plano executa.
  if (process.argv.includes('--check') && unaddressed.length > 0) process.exitCode = 1;
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
