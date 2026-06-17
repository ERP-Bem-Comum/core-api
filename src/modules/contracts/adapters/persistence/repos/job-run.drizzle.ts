// Adapter Drizzle: coordenação de jobs one-shot em multi-instância (CTR-SWEEPER-JOB-LOCK / ADR-0041).
//
// `claimJobRun` faz `INSERT IGNORE` em `ctr_job_runs` (PK job_name+run_key): a 1ª instância insere
// (affectedRows=1 → adquiriu) e roda o job; as demais batem na PK (affectedRows=0 → não adquiriu) e
// desistem. Backstop barato sobre o cron singleton — lock de EFICIÊNCIA (jobs já idempotentes), sem
// Redis/etcd (ver .claude/.planning/SHARED-STORE-AND-JOB-COORDINATION.md; Kleppmann).
//
// Boundary: try/catch → Result; nenhum Error cruza a borda (.claude/rules/adapters.md).

import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';

export type JobRunClaimError = 'job-run-claim-failed';

/**
 * Tenta reivindicar a execução de `(jobName, runKey)`. Retorna `ok(true)` se esta instância adquiriu
 * (deve rodar o job), `ok(false)` se outra instância já reivindicou (deve pular). `runKey` é a janela
 * de execução (ex.: a data do sweep diário) — torna o claim idempotente por execução.
 */
export const claimJobRun = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  handle: MysqlHandle,
  jobName: string,
  runKey: string,
  now: Date,
): Promise<Result<boolean, JobRunClaimError>> => {
  const { db, schema } = handle;
  try {
    const result = await db
      .insert(schema.ctrJobRuns)
      .ignore()
      .values({ jobName, runKey, startedAt: now });
    // mysql2 retorna [ResultSetHeader, FieldPacket[]] (Drizzle expõe o raw via cast).
    // INSERT IGNORE: affectedRows=1 se inseriu (adquiriu); 0 se a PK já existia (não adquiriu).
    const affectedRows = (result as unknown as [{ affectedRows: number }])[0].affectedRows;
    return ok(affectedRows > 0);
  } catch (cause) {
    process.stderr.write(
      `[contracts-job-run] claim falhou (${jobName}/${runKey}): ${String(cause)}\n`,
    );
    return err('job-run-claim-failed');
  }
};
