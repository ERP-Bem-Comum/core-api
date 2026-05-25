/**
 * CLI `pnpm run pipeline:metrics` - agregador estatistico.
 *
 * Ticket: CTR-PIPELINE-METRICS (W1).
 *
 * Flags:
 *   --json    output JSON (default: Markdown)
 *   --write   grava em .claude/.pipeline/_METRICS.md (ou _METRICS.json se --json)
 *
 * Exit codes:
 *   0 - sucesso
 *   1 - pipelineRoot ausente
 */

import * as fsp from 'node:fs/promises';
import { join } from 'node:path';

import { loadAllStates } from './dashboard.ts';
import { computeMetrics, renderMetricsJson, renderMetricsMd } from './metrics.ts';

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
  const flags = parseFlags(process.argv.slice(2));
  const cwd = process.cwd();
  const asJson = flags.get('json') === true;
  const shouldWrite = flags.get('write') === true;

  const pipelineRoot = join(cwd, '.claude', '.pipeline');

  let pipelineExists = false;
  try {
    const stat = await fsp.stat(pipelineRoot);
    pipelineExists = stat.isDirectory();
  } catch {
    // missing
  }
  if (!pipelineExists) {
    process.stderr.write(`pipelineRoot nao existe: ${pipelineRoot}\n`);
    process.exit(1);
  }

  const result = await loadAllStates(pipelineRoot);
  const metrics = computeMetrics(result.snapshots);
  const output = asJson ? renderMetricsJson(metrics) : renderMetricsMd(metrics);

  if (shouldWrite) {
    const filename = asJson ? '_METRICS.json' : '_METRICS.md';
    const targetPath = join(pipelineRoot, filename);
    await fsp.writeFile(targetPath, output, 'utf8');
    process.stdout.write(`metrics gravado em ${targetPath}\n`);
    return;
  }

  process.stdout.write(output);
};

main().catch((e: unknown) => {
  process.stderr.write(`erro inesperado: ${(e as Error).message}\n`);
  process.exit(1);
});
