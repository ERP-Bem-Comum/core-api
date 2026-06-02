/**
 * Entrypoint do ETL Parceiros (PARTNERS-ETL-ORCHESTRATOR, slice 3b-ii) - wiring real.
 *
 * `runEtl({ dumpPath, connectionString, dryRun })` cabeia tudo:
 *   1. `withLegacyMysql(dump, fn)` sobe o MySQL efemero legado, restaura o dump e roda `fn`.
 *   2. dentro de `fn`: `readLegacyData()` (READER) -> `orchestrate(deps)(data)` (logica pura).
 *   3. ports de ESCRITA: `buildAuthEtlPort` + `buildPartnersEtlPort` (core-api destino).
 *   4. quarentena dupla (D12): resumo PII-free versionavel + detalhe com PII (gitignored).
 *
 * O caminho real e exercido SO pela integracao gated (`PARTNERS_ETL_INTEGRATION=1`). Sem o
 * opt-in, a suite skipa (o import resolve agora que este modulo existe). NUNCA roda contra o
 * dump de producao: o dump default e o sintetico de testes. ASCII puro.
 *
 * Lint estrito em scripts/: `node:child_process`/`fs` via funcoes async, callbacks com `{ }`,
 * `import type` para tipos, params readonly, booleans explicitos.
 */

import process from 'node:process';
import { mkdir, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import {
  installLastResortHandlers,
  processLastResortDeps,
} from '#src/shared/runtime/last-resort.ts';

import {
  buildAuthEtlPort,
  type AuthEtlPort,
  type BuildAuthEtlPortError,
} from '#src/modules/auth/public-api/etl.ts';
import {
  buildPartnersEtlPort,
  type PartnersEtlPort,
  type BuildPartnersEtlPortError,
} from '#src/modules/partners/public-api/etl.ts';

import { withLegacyMysql, type RestoreError } from '#scripts/etl/legacy/restore.ts';
import { readLegacyData } from '#scripts/etl/legacy/reader.ts';
import { toSummary, describeReason } from '#scripts/etl/quarantine/reason.ts';
import {
  orchestrate,
  type OrchestrateError,
  type QuarantineRecord,
  type QuarantineSink,
  type ReconciliationReport,
} from '#scripts/etl/orchestrate.ts';

// Dump sintetico (dados fake) — JAMAIS o de producao.
const DEFAULT_DUMP = 'tests/etl/fixtures/legacy-mini.sql';
// Quarentena: detalhe COM PII fica em .tmp/ (gitignored); resumo PII-free ao lado.
const QUARANTINE_DIR = '.tmp/etl-quarantine';
const SUMMARY_PATH = `${QUARANTINE_DIR}/quarantine.summary.jsonl`;
const DETAIL_PATH = `${QUARANTINE_DIR}/quarantine.detail.jsonl`;

export type RunEtlOptions = Readonly<{
  dumpPath: string;
  connectionString: string;
  dryRun: boolean;
}>;

export type RunEtlError =
  | Readonly<{ kind: 'restore'; detail: RestoreError }>
  | Readonly<{ kind: 'auth-port'; detail: BuildAuthEtlPortError }>
  | Readonly<{ kind: 'partners-port'; detail: BuildPartnersEtlPortError }>
  | Readonly<{ kind: 'orchestrate'; detail: OrchestrateError }>;

// ---------------------------------------------------------------------------
// Sink de quarentena `.jsonl` (D12): grava DUAS linhas por registro —
//   - resumo PII-free (`toSummary` descarta `attempted`) no arquivo versionavel;
//   - detalhe completo (com `attempted`) no arquivo gitignored (.tmp/).
// ---------------------------------------------------------------------------

const makeJsonlQuarantineSink = (summaryPath: string, detailPath: string): QuarantineSink => ({
  record: async (record: Readonly<QuarantineRecord>): Promise<void> => {
    const summaryLine = JSON.stringify({
      legacyId: record.legacyId,
      table: record.table,
      reason: toSummary(record.reason),
      describe: describeReason(record.reason),
    });
    const detailLine = JSON.stringify({
      legacyId: record.legacyId,
      table: record.table,
      reason: record.reason,
    });
    await appendFile(summaryPath, `${summaryLine}\n`, 'utf8');
    await appendFile(detailPath, `${detailLine}\n`, 'utf8');
  },
});

// ---------------------------------------------------------------------------
// runEtl — orquestra o ciclo completo (legado efemero -> core-api destino).
// ---------------------------------------------------------------------------

export const runEtl = async (
  opts: Readonly<RunEtlOptions>,
): Promise<Result<ReconciliationReport, RunEtlError>> => {
  await mkdir(resolve(QUARANTINE_DIR), { recursive: true });
  const quarantineSink = makeJsonlQuarantineSink(resolve(SUMMARY_PATH), resolve(DETAIL_PATH));

  // Abre os DOIS handles de escrita na connection-string do core-api de destino.
  const authPortR = await buildAuthEtlPort({ connectionString: opts.connectionString });
  if (!authPortR.ok) return err({ kind: 'auth-port', detail: authPortR.error });
  const authPort: AuthEtlPort = authPortR.value;

  const partnersPortR = await buildPartnersEtlPort({ connectionString: opts.connectionString });
  if (!partnersPortR.ok) {
    await authPort.close();
    return err({ kind: 'partners-port', detail: partnersPortR.error });
  }
  const partnersPort: PartnersEtlPort = partnersPortR.value;

  try {
    // withLegacyMysql sobe o efemero, restaura o dump e roda a costura com o ciclo vivo.
    const restored = await withLegacyMysql(opts.dumpPath, async () => {
      const data = await readLegacyData();
      return orchestrate({ authPort, partnersPort, quarantineSink, dryRun: opts.dryRun })(data);
    });
    if (!restored.ok) return err({ kind: 'restore', detail: restored.error });

    const report = restored.value;
    if (!report.ok) return err({ kind: 'orchestrate', detail: report.error });
    return ok(report.value);
  } finally {
    await partnersPort.close();
    await authPort.close();
  }
};

// ---------------------------------------------------------------------------
// CLI: parse de flags + entrypoint standalone (SIGTERM/cleanup via last-resort).
// ---------------------------------------------------------------------------

const parseArgs = (argv: readonly string[]): RunEtlOptions => {
  let dumpPath = DEFAULT_DUMP;
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      dryRun = true;
    } else if (token === '--dump') {
      const next = argv[i + 1];
      if (next !== undefined) {
        dumpPath = next;
        i += 1;
      }
    } else if (token?.startsWith('--dump=') === true) {
      dumpPath = token.slice('--dump='.length);
    }
  }
  const connectionString =
    process.env['ETL_CORE_CONNECTION_STRING'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3307/core';
  return { dumpPath, connectionString, dryRun };
};

const formatReport = (report: Readonly<ReconciliationReport>): string => {
  const line = (name: string, tally: Readonly<ReconciliationReport['suppliers']>): string =>
    `  ${name}: read=${String(tally.read)} migrated=${String(tally.migrated)} ` +
    `quarantined=${String(tally.quarantined)} alreadyExists=${String(tally.alreadyExists)}`;
  return [
    'ETL Parceiros — reconciliacao:',
    line('suppliers', report.suppliers),
    line('financiers', report.financiers),
    line('collaborators', report.collaborators),
    line('users', report.users),
    `  inativos (LEGACY_MIGRATION): ${String(report.inactiveLegacyMarked)}`,
  ].join('\n');
};

// Shutdown best-effort do entrypoint: `runEtl` ja fecha os dois ports no seu `finally`
// e `withLegacyMysql` derruba o container efemero; aqui so cedemos um tick para drenar
// o stderr antes do `exit`. Async genuino (await) — satisfaz require-await + promise-async.
const lastResortShutdown = async (): Promise<void> => {
  await Promise.resolve();
};

const main = async (): Promise<number> => {
  const [, , ...argv] = process.argv;
  const opts = parseArgs(argv);

  const result = await runEtl(opts);
  if (!result.ok) {
    process.stderr.write(`ETL falhou: ${JSON.stringify(result.error)}\n`);
    return 1;
  }
  process.stdout.write(`${formatReport(result.value)}\n`);
  return 0;
};

// So executa o entrypoint quando rodado diretamente (`node scripts/etl/main.ts`),
// nao quando importado pela suite de integracao (que chama `runEtl`).
if (process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename) {
  // Garante drenagem dos handles em SIGTERM / erro fora da cadeia de promise.
  installLastResortHandlers(lastResortShutdown, processLastResortDeps());
  process.on('SIGTERM', () => {
    process.exit(143);
  });
  main().then(
    (code) => {
      process.exit(code);
    },
    (cause: unknown) => {
      process.stderr.write(`Erro inesperado: ${String(cause)}\n`);
      process.exit(1);
    },
  );
}
