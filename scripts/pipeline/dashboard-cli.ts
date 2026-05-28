/**
 * CLI `pnpm run pipeline:status` — dashboard agregador.
 *
 * Ticket: CTR-PIPELINE-DASHBOARD (W1).
 *
 * Flags:
 *   --filter all|open|closed|blocked   (default: all)
 *   --json                              (default: Markdown table)
 *
 * Exit codes:
 *   0 — sucesso (mesmo se pipelineRoot vazio)
 *   1 — pipelineRoot ausente OU flag inválido
 */

import * as fsp from 'node:fs/promises';
import { join } from 'node:path';

import {
  loadAllStates,
  renderDashboardJson,
  renderDashboardTable,
  type DashboardFilter,
} from './dashboard.ts';

const VALID_FILTERS: readonly DashboardFilter[] = ['all', 'open', 'closed', 'blocked'];

type Flags = ReadonlyMap<string, string | true>;

const parseFlags = (args: readonly string[]): Flags => {
  const out = new Map<string, string | true>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith('--') === true) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out.set(key, next);
        i++;
      } else {
        out.set(key, true);
      }
    }
  }
  return out;
};

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const flags = parseFlags(argv);
  const cwd = process.cwd();

  const filterArg = flags.get('filter');
  let filter: DashboardFilter = 'all';
  if (typeof filterArg === 'string') {
    if (!(VALID_FILTERS as readonly string[]).includes(filterArg)) {
      process.stderr.write(`--filter inválido: ${filterArg} (use all|open|closed|blocked)\n`);
      process.exit(1);
    }
    filter = filterArg as DashboardFilter;
  }
  const asJson = flags.get('json') === true;

  const pipelineRoot = join(cwd, '.claude', '.pipeline');

  let pipelineExists = false;
  try {
    const stat = await fsp.stat(pipelineRoot);
    pipelineExists = stat.isDirectory();
  } catch {
    // missing or stat error
  }
  if (!pipelineExists) {
    process.stderr.write(`pipelineRoot não existe ou não é diretório: ${pipelineRoot}\n`);
    process.exit(1);
  }

  const result = await loadAllStates(pipelineRoot);
  const now = new Date();

  if (asJson) {
    process.stdout.write(renderDashboardJson(result.snapshots, { filter, now }));
    return;
  }

  process.stdout.write(renderDashboardTable(result.snapshots, { filter, now }));

  if (result.legacyCount > 0) {
    process.stdout.write(
      `\n_${result.legacyCount} ticket(s) legacy sem STATE.json — skip silencioso._\n`,
    );
  }

  if (result.errors.length > 0) {
    process.stdout.write('\n## Erros de leitura\n\n');
    for (const e of result.errors) {
      process.stdout.write(`- ${e.ticketDir}: ${e.reason}\n`);
    }
  }
};

main().catch((e: unknown) => {
  process.stderr.write(`erro inesperado: ${(e as Error).message}\n`);
  process.exit(1);
});
