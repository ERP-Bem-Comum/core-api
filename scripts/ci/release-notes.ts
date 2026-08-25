import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Gera o CHANGELOG.md a partir do HISTÓRICO, nunca de redação à mão.
//
// O porquê: um CHANGELOG escrito manualmente é um registro que passa a mentir sobre o código no dia
// seguinte — a mesma classe de defeito que o CLAUDE.md trata como invariante. Derivar de `git log`
// amarra o documento à única fonte que não pode divergir da entrega.
//
// `--first-parent` é deliberado: ele conta as UNIDADES DE ENTREGA (192 merges de PR revisados) em vez
// dos 572 commits internos das branches. Quem lê um CHANGELOG quer a primeira medida; a segunda é
// arqueologia e já vive no `git log`.
//
// A janela padrão é `origin/main..HEAD` porque `main` É produção neste repo (o merge nela dispara o
// deploy). Quando existir tag de versão, passe o range explicitamente: `pnpm release:notes v1.0.0..HEAD`.

/** Seções do CHANGELOG, em PT-BR (o documento é para humano — ver tabela de idioma do CLAUDE.md). */
export type ChangelogSection = 'Adicionado' | 'Corrigido' | 'Alterado' | 'Interno';

export const SECTION_ORDER: readonly ChangelogSection[] = [
  'Adicionado',
  'Corrigido',
  'Alterado',
  'Interno',
];

export interface ReleaseEntry {
  readonly sha: string;
  /** Nº do PR quando o merge veio do GitHub; `null` em merge local. */
  readonly pr: number | null;
  /** Tipo convencional: feat, fix, chore, docs, ci, test, revert… */
  readonly type: string;
  /** Escopo entre parênteses — quase sempre o módulo (`financial`, `auth`, `cnab`). */
  readonly scope: string | null;
  readonly description: string;
  /** `true` quando o commit marca quebra de contrato (`feat!:` ou `BREAKING CHANGE:` no corpo). */
  readonly breaking: boolean;
}

const MERGE_PR = /^Merge pull request #(\d+) from /;
/** Sufixo que o GitHub anexa ao assunto num squash merge: `fix(reports): … (#499)`. */
const SQUASH_PR = /\(#(\d+)\)\s*$/;
const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?:\s*(?<description>.+)$/;

/**
 * Extrai uma entrada do par (assunto, corpo) de um merge commit.
 *
 * O assunto do merge do GitHub carrega o nº do PR; o CORPO carrega a mensagem convencional real
 * (`fix(cnab): P013 (225-226) sai da forma do lote`). Por isso os dois são necessários — ler só o
 * assunto devolveria "Merge pull request #872 from …", que não descreve nada ao leitor.
 *
 * A varredura percorre TODAS as linhas do corpo, não só a primeira. Entrega consolidada abre com
 * prosa e só depois traz o cabeçalho convencional — o PR #835 ("Entrega consolidada das frentes
 * abertas") é exatamente esse formato, e lendo só a linha 1 ele sumiria do CHANGELOG em silêncio.
 *
 * Devolve `null` quando nenhuma linha é convencional: entrada sem tipo não tem seção, e chutar uma
 * seria inventar informação que o histórico não deu. Quem descarta REPORTA — ver `main()`.
 */
export function parseEntry(sha: string, subject: string, body: string): ReleaseEntry | null {
  const mergeCommitPr = MERGE_PR.exec(subject);

  // Duas estratégias de merge convivem neste histórico e guardam a mensagem em lugares diferentes:
  //   merge commit → assunto é "Merge pull request #N from …", a mensagem real está no CORPO;
  //   squash       → o próprio ASSUNTO é a mensagem convencional, com "(#N)" no fim.
  // Ler só o corpo perdia 30 dos 192 merges do range, todos squash — e os perdia em silêncio.
  const candidates = mergeCommitPr === null ? [subject, ...body.split('\n')] : body.split('\n');
  const conventional = candidates
    .map((line) => CONVENTIONAL.exec(line.trim()))
    .find((match) => match !== null);
  if (conventional?.groups === undefined) return null;

  const squashPr = SQUASH_PR.exec(subject);
  const prMatch = mergeCommitPr ?? squashPr;

  const { type, scope, bang, description } = conventional.groups;
  if (type === undefined || description === undefined) return null;

  return {
    sha,
    pr: prMatch?.[1] === undefined ? null : Number(prMatch[1]),
    type,
    scope: scope ?? null,
    // O `(#N)` do squash sai daqui: o nº do PR já vira link no render, e mantê-lo no texto o
    // imprimiria duas vezes na mesma linha.
    description: description.replace(SQUASH_PR, '').trim(),
    breaking: bang === '!' || /^BREAKING[ -]CHANGE:/m.test(body),
  };
}

/**
 * Tipos convencionais que, por declaração do próprio autor, não alteram comportamento observável —
 * qualquer que seja o escopo. `docs(financial)` e `test(financial)` existem neste range e mexem em
 * módulo de negócio sem mudar nada do que a API faz.
 */
const NEVER_USER_FACING: ReadonlySet<string> = new Set(['docs', 'test', 'ci', 'style', 'refactor']);

/**
 * Escopos que descrevem PROCESSO — harness, acervo, CI, tooling, infraestrutura de teste.
 *
 * A lista enumera os escopos de PROCESSO, e não os de NEGÓCIO, de propósito. As duas envelhecem, mas
 * erram para lados opostos: módulo novo ausente de uma lista de negócio faria seu `chore` cair em
 * "Interno" e a release **esconderia** a mudança; escopo de processo novo ausente desta lista cai em
 * "Alterado" e a release apenas **mostra ruído**. Entre esconder e mostrar demais, um CHANGELOG de
 * release erra para mostrar — a mesma disciplina fail-secure de `resolveRbacMode`.
 *
 * Medida em `origin/main..HEAD` (2026-08-25) e ajustável: acrescentar escopo aqui é ato deliberado,
 * visível em diff de PR. Dos escopos de `chore` do range, só `auth` (2) e `financial` (1) são de
 * negócio — todo o resto é processo, com `pipeline` (11) e `harness` (9) à frente.
 */
const PROCESS_SCOPES: ReadonlySet<string> = new Set([
  'adr',
  'ci',
  'cleanup',
  'deadman',
  'deploy',
  'deps',
  'docs',
  'dx',
  'handbook',
  'harness',
  'incidents',
  'infra',
  'integration',
  'lint',
  // Processo W0→W3 removido em 2026-08-06. Os 11 `chore(pipeline): registra STATE do ticket …` do
  // range descrevem um harness que já não existe — ruído puro numa release de produto.
  'pipeline',
  'release',
  'rules',
  'scripts',
  'spec',
  'tooling',
  'ts',
]);

/**
 * Decide em qual seção do CHANGELOG uma entrada aparece.
 *
 * O prefixo do commit NÃO é confiável sozinho, e o escopo tampouco: `chore(financial)` do PR #855
 * ligou a rota de download da remessa em produção — tipo diz "interno", escopo diz "negócio" — e
 * `docs(financial)` do mesmo range não muda nada. A regra usa os dois, nessa ordem: o tipo primeiro,
 * porque só ele distingue novidade de correção; o escopo depois, como desempate para os tipos cuja
 * declaração é ambígua neste repositório (`chore` acima de tudo).
 */
export function sectionFor(entry: ReleaseEntry): ChangelogSection {
  // Quebra de contrato é visível a quem consome a API qualquer que seja o tipo do commit — e é o que
  // o leitor mais precisa achar. Vence tudo o que vem abaixo.
  if (entry.breaking) return 'Alterado';

  switch (entry.type) {
    case 'feat':
      return 'Adicionado';
    case 'fix':
      return 'Corrigido';
    // `revert` desfaz comportamento que já esteve publicado: não é defeito corrigido nem novidade.
    case 'revert':
      return 'Alterado';
    default:
      if (NEVER_USER_FACING.has(entry.type)) return 'Interno';
      // Sobram `chore`, `build`, `perf` e qualquer tipo novo. Escopo desconhecido — inclusive ausente
      // — cai em "Alterado" por decisão: o default desta função é MOSTRAR.
      return entry.scope === null || !PROCESS_SCOPES.has(entry.scope) ? 'Alterado' : 'Interno';
  }
}

/** Agrupa preservando a ordem de aparição (git log já vem do mais recente para o mais antigo). */
export function groupBySection(
  entries: readonly ReleaseEntry[],
): ReadonlyMap<ChangelogSection, readonly ReleaseEntry[]> {
  const grouped = new Map<ChangelogSection, ReleaseEntry[]>();
  for (const entry of entries) {
    const section = sectionFor(entry);
    const bucket = grouped.get(section);
    if (bucket === undefined) grouped.set(section, [entry]);
    else bucket.push(entry);
  }
  return grouped;
}

/** Usada só quando o manifesto não declara `repository` — o valor de verdade vive lá. */
const FALLBACK_REPO_URL = 'https://github.com/ERP-Bem-Comum/core-api';

/**
 * Normaliza o `repository.url` do `package.json` para a forma navegável:
 * `git+https://github.com/org/repo.git` → `https://github.com/org/repo`.
 *
 * O prefixo `git+` e o sufixo `.git` são convenção de clone e quebram o link no Markdown.
 */
export function repoUrlFrom(raw: unknown): string {
  const url = typeof raw === 'string' ? raw : undefined;
  if (url === undefined || url.trim() === '') return FALLBACK_REPO_URL;
  return url
    .trim()
    .replace(/^git\+/, '')
    .replace(/\.git$/, '');
}

function renderEntry(entry: ReleaseEntry, repoUrl: string): string {
  const scope = entry.scope === null ? '' : `**${entry.scope}:** `;
  const ref = entry.pr === null ? '' : ` ([#${entry.pr}](${repoUrl}/pull/${entry.pr}))`;
  return `- ${scope}${entry.description}${ref}`;
}

export interface RenderOptions {
  /** Merges que nenhuma linha convencional descreveu. Saem nomeados no documento. */
  readonly skipped?: readonly { readonly sha: string; readonly subject: string }[];
  /** Base dos links de PR. Vem do `repository` do manifesto — ver `repoUrlFrom`. */
  readonly repoUrl?: string;
}

export function renderChangelog(
  version: string,
  date: string,
  entries: readonly ReleaseEntry[],
  options: RenderOptions = {},
): string {
  const skipped = options.skipped ?? [];
  const repoUrl = options.repoUrl ?? FALLBACK_REPO_URL;
  // Entrada `breaking` sai UMA vez, na seção de destaque — repeti-la na seção temática seria ruído
  // exatamente onde o leitor precisa de sinal.
  const grouped = groupBySection(entries.filter((entry) => !entry.breaking));
  const lines: string[] = [
    '# Changelog',
    '',
    'Gerado por `pnpm release:notes` a partir de `git log --first-parent`. **Não editar à mão** —',
    'a próxima geração sobrescreve, e um CHANGELOG divergente do histórico é registro que mente.',
    '',
    'Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) ·',
    'versionamento: [SemVer 2.0.0](https://semver.org/lang/pt-BR/).',
    '',
    `## [${version}] — ${date}`,
    '',
  ];

  const breaking = entries.filter((entry) => entry.breaking);
  if (breaking.length > 0) {
    lines.push('### ⚠️ Mudanças incompatíveis', '');
    for (const entry of breaking) lines.push(renderEntry(entry, repoUrl));
    lines.push('');
  }

  for (const section of SECTION_ORDER) {
    const bucket = grouped.get(section);
    if (bucket === undefined || bucket.length === 0) continue;
    lines.push(`### ${section}`, '');
    for (const entry of bucket) lines.push(renderEntry(entry, repoUrl));
    lines.push('');
  }

  // O que o gerador não conseguiu classificar aparece NO DOCUMENTO, não só no stderr de quem rodou.
  // Sem isto, o leitor não teria como suspeitar que a lista acima está incompleta.
  if (skipped.length > 0) {
    lines.push(
      '### Não classificado',
      '',
      `${String(skipped.length)} merge(s) do range sem linha de mensagem convencional no corpo —`,
      'listados aqui para que a ausência seja visível, e não deduzida:',
      '',
    );
    for (const merge of skipped) {
      lines.push(`- \`${merge.sha.slice(0, 8)}\` — ${merge.subject}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

const FIELD_SEP = String.fromCharCode(0x1f);
const RECORD_SEP = String.fromCharCode(0x1e);

function git(args: readonly string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

export interface ReadResult {
  readonly entries: readonly ReleaseEntry[];
  /** Merges do range que nenhuma linha convencional descreveu — reportados, nunca engolidos. */
  readonly skipped: readonly { readonly sha: string; readonly subject: string }[];
}

/**
 * Lê os merges do range. Cada registro: sha, assunto, corpo — separados por 0x1f, terminados em 0x1e.
 *
 * O que não vira entrada sai em `skipped` porque um gerador que descarta em silêncio produz um
 * CHANGELOG que se lê como "cobriu tudo" sem ter coberto — e essa é a forma mais cara de registro
 * mentiroso, já que ninguém tem como suspeitar dela olhando o resultado.
 */
export function readEntries(range: string): ReadResult {
  const raw = git([
    'log',
    '--first-parent',
    `--format=%H${FIELD_SEP}%s${FIELD_SEP}%b${RECORD_SEP}`,
    range,
  ]);
  const entries: ReleaseEntry[] = [];
  const skipped: { sha: string; subject: string }[] = [];
  for (const record of raw.split(RECORD_SEP)) {
    const trimmed = record.trim();
    if (trimmed === '') continue;
    const [sha, subject, body] = trimmed.split(FIELD_SEP);
    if (sha === undefined || subject === undefined) continue;
    const entry = parseEntry(sha, subject, body ?? '');
    if (entry === null) skipped.push({ sha, subject });
    else entries.push(entry);
  }
  return { entries, skipped };
}

function main(): void {
  const range = process.argv[2] ?? 'origin/main..HEAD';
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const parsed: unknown = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'));
  const manifest: Record<string, unknown> =
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};

  const version = 'version' in manifest ? String(manifest['version']) : 'desconhecida';

  // A URL dos links de PR sai do manifesto, e não de constante daqui: duplicar o endereço do
  // repositório em dois arquivos é como o segundo passa a mentir quando o primeiro muda.
  const repository = manifest['repository'];
  const repoUrl = repoUrlFrom(
    typeof repository === 'object' && repository !== null
      ? (repository as { url?: unknown }).url
      : repository,
  );

  // A data vem do ÚLTIMO COMMIT do range, não do relógio: assim rodar o gerador duas vezes no mesmo
  // conteúdo produz o mesmo arquivo, e o diff só muda quando a entrega muda.
  const date = git(['log', '-1', '--format=%ad', '--date=short', range.split('..').pop() ?? 'HEAD'])
    .trim()
    .slice(0, 10);

  const { entries, skipped } = readEntries(range);
  writeFileSync(
    `${root}/CHANGELOG.md`,
    renderChangelog(version, date, entries, { skipped, repoUrl }),
    'utf8',
  );
  for (const merge of skipped) {
    process.stderr.write(`  nao classificado: ${merge.sha.slice(0, 8)} ${merge.subject}\n`);
  }
  process.stderr.write(
    `CHANGELOG.md gerado: ${String(entries.length)} entradas, ${String(skipped.length)} nao classificados, de ${range} (versao ${version})\n`,
  );
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
