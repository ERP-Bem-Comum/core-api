import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Enforcement da ADR-0054 §1 (formato do trailer `Assisted-by`) via check de CI, LABEL-GATED:
//   - PR com label `ai-assisted` → TODO commit do range precisa de `Assisted-by` bem-formado.
//   - PR sem a label → só valida o FORMATO quando presente (commit humano puro legitimamente não tem).
// A função pura `checkCommitTrailers` é testável; o `main()` é glue fina (lê git + env, exit 1).

export interface CommitTrailers {
  readonly sha: string;
  readonly assistedBy: readonly string[];
}

export interface TrailerViolation {
  readonly sha: string;
  readonly kind: 'missing-assisted-by' | 'malformed-assisted-by';
  readonly detail: string;
}

// ADR-0054 §1: `AGENT_NAME:MODEL_VERSION [ferramenta]`. AGENT/MODEL = tokens sem espaço separados
// por `:`; sufixo `[ferramenta]` opcional. Ex.: `Claude-Code:claude-opus-4-8`.
export const ASSISTED_BY_FORMAT = /^\S+:\S+(?:\s+\[[^\]]+\])?$/;

export function checkCommitTrailers(
  commits: readonly CommitTrailers[],
  opts: { readonly aiAssisted: boolean },
): TrailerViolation[] {
  const violations: TrailerViolation[] = [];
  for (const commit of commits) {
    if (opts.aiAssisted && commit.assistedBy.length === 0) {
      violations.push({
        sha: commit.sha,
        kind: 'missing-assisted-by',
        detail: 'PR marcado ai-assisted, mas o commit nao tem trailer Assisted-by (ADR-0054)',
      });
    }
    for (const value of commit.assistedBy) {
      if (!ASSISTED_BY_FORMAT.test(value.trim())) {
        violations.push({ sha: commit.sha, kind: 'malformed-assisted-by', detail: value });
      }
    }
  }
  return violations;
}

// Separadores de controle no output do git: 0x1f (%x1f) entre campos, 0x1e entre valores de trailer.
const UNIT_SEP = String.fromCharCode(0x1f);
const REC_SEP = String.fromCharCode(0x1e);

function readCommits(range: string): CommitTrailers[] {
  const out = execFileSync(
    'git',
    ['log', '--format=%H%x1f%(trailers:key=Assisted-by,valueonly,separator=%x1e)', range],
    { encoding: 'utf8' },
  );
  const commits: CommitTrailers[] = [];
  for (const line of out.split('\n')) {
    if (line.trim() === '') continue;
    const [sha = '', assistedRaw = ''] = line.split(UNIT_SEP);
    const assistedBy =
      assistedRaw === '' ? [] : assistedRaw.split(REC_SEP).filter((s) => s.trim() !== '');
    commits.push({ sha, assistedBy });
  }
  return commits;
}

function main(): void {
  const base = process.env['BASE_SHA'];
  const head = process.env['HEAD_SHA'] ?? 'HEAD';
  const aiAssisted = (process.env['PR_AI_ASSISTED'] ?? '') === 'true';
  if (base === undefined || base === '') {
    process.stderr.write('BASE_SHA ausente — nao da pra determinar o range do PR.\n');
    process.exit(1);
  }
  const commits = readCommits(`${base}..${head}`);
  const violations = checkCommitTrailers(commits, { aiAssisted });
  if (violations.length > 0) {
    process.stderr.write(`Politica de commit ADR-0054 violada (${String(violations.length)}):\n`);
    for (const v of violations) {
      process.stderr.write(`  - ${v.sha.slice(0, 8)} [${v.kind}] ${v.detail}\n`);
    }
    process.stderr.write(
      '\nFormato: Assisted-by: AGENT_NAME:MODEL_VERSION [ferramenta]. A IA nunca assina Signed-off-by (ADR-0054).\n',
    );
    process.exit(1);
  }
  process.stdout.write(
    `OK — ${String(commits.length)} commit(s) conformes a ADR-0054 (ai-assisted=${String(aiAssisted)}).\n`,
  );
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
