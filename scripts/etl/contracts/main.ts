/**
 * Entrypoint do ETL de CONTRATOS (+ programas) — ETL-CONTRACTS-WRITER, wiring real.
 *
 * `runContractsEtl({ dumpPath, connectionString, dryRun })`:
 *   1. `withLegacyMysql(dump, fn)` sobe o MySQL efêmero, restaura o dump e roda `fn`;
 *   2. dentro de `fn`: `readLegacyContractsData()` → programas (use case `createProgram`,
 *      idempotente por sigla) → contratos (Contract.create/terminate → repo.save,
 *      idempotente por `findBySequentialNumber`) → reconcile do `ctr_contract_seq`
 *      (GREATEST por ano — batch do ETL pré-autorizado pelo schema, mysql.ts §ctr_contract_seq);
 *   3. quarentena dupla (resumo PII-free + detalhe gitignored) + de-para auditável
 *      (legacy_id → uuid; extras que não entram pelo create: URLs, pix/bancário,
 *      budgetPlanId legado — D3/D5).
 *
 * 100% via domínio: nenhuma escrita direta em tabela de NEGÓCIO. A única exceção
 * deliberada é o contador de infra `ctr_contract_seq` (não é dado de negócio; a
 * reconciliação em batch é prevista pelo próprio schema e ratificada na decisão (a)).
 * NUNCA roda contra produção: o dump default é o sintético de testes.
 *
 * ⚠️ Ressalvas do --dry-run (herdadas do padrão de parceiros, W2 issue 5):
 *   - abrir os ports APLICA as migrations DDL no destino (schema, nunca dados);
 *   - o destino NÃO é consultado — linhas já migradas reportam como `migrated`
 *     (o run real é quem distingue `alreadyExists` via findBySequentialNumber/sigla).
 */

import process from 'node:process';
import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { sql } from 'drizzle-orm';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import {
  installLastResortHandlers,
  processLastResortDeps,
} from '#src/shared/runtime/last-resort.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';

import {
  buildPartnersEtlPort,
  type PartnersEtlPort,
  type BuildPartnersEtlPortError,
} from '#src/modules/partners/public-api/etl.ts';
import {
  openProgramsMysql,
  type ProgramsMysqlHandle,
} from '#src/modules/programs/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleProgramRepository } from '#src/modules/programs/adapters/persistence/repos/program-repository.drizzle.ts';
import { createProgram } from '#src/modules/programs/application/use-cases/create-program.ts';
import {
  openMysql,
  type MysqlHandle,
} from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type { ContractEvent } from '#src/modules/contracts/domain/contract/events.ts';

import { withLegacyMysql, type RestoreError } from '#scripts/etl/legacy/restore.ts';
import { readLegacyContractsData } from '#scripts/etl/contracts/reader.ts';
import {
  mapLegacyContractRow,
  mapLegacyProgramRow,
  sequentialParts,
  type ContractMapRefs,
} from '#scripts/etl/contracts/mapper.ts';
import {
  toSummary,
  describeReason,
  type QuarantineReason,
} from '#scripts/etl/quarantine/reason.ts';

// Dump sintético (dados fake) — JAMAIS o de produção.
const DEFAULT_DUMP = 'tests/etl/fixtures/legacy-mini.sql';
const OUT_DIR = '.tmp/etl-contracts';
const SUMMARY_PATH = `${OUT_DIR}/quarantine.summary.jsonl`;
const DETAIL_PATH = `${OUT_DIR}/quarantine.detail.jsonl`;
const DEPARA_PATH = `${OUT_DIR}/de-para.jsonl`;

export type RunContractsEtlOptions = Readonly<{
  dumpPath: string;
  connectionString: string;
  dryRun: boolean;
}>;

export type Tally = Readonly<{
  read: number;
  migrated: number;
  quarantined: number;
  alreadyExists: number;
}>;

export type ContractsEtlReport = Readonly<{
  programs: Tally;
  contracts: Tally;
  seqReconciled: readonly Readonly<{ year: number; lastSeq: number }>[];
}>;

export type RunContractsEtlError =
  | Readonly<{ kind: 'restore'; detail: RestoreError }>
  | Readonly<{ kind: 'partners-port'; detail: BuildPartnersEtlPortError }>
  | Readonly<{ kind: 'programs-driver'; detail: string }>
  | Readonly<{ kind: 'contracts-driver'; detail: string }>;

type Sink = Readonly<{
  quarantine: (
    table: string,
    legacyId: unknown,
    reasons: readonly QuarantineReason[],
  ) => Promise<void>;
  depara: (record: Readonly<Record<string, unknown>>) => Promise<void>;
}>;

const makeSink = (): Sink => ({
  quarantine: async (table, legacyId, reasons): Promise<void> => {
    for (const reason of reasons) {
      const summary = JSON.stringify({
        legacyId,
        table,
        reason: toSummary(reason),
        describe: describeReason(reason),
      });
      const detail = JSON.stringify({ legacyId, table, reason });
      await appendFile(resolve(SUMMARY_PATH), `${summary}\n`, 'utf8');
      await appendFile(resolve(DETAIL_PATH), `${detail}\n`, 'utf8');
    }
  },
  depara: async (record): Promise<void> => {
    await appendFile(resolve(DEPARA_PATH), `${JSON.stringify(record)}\n`, 'utf8');
  },
});

// Erro de port pode ser literal kebab OU objeto tagged (ex.: OutboxAppendError). Extrai
// SÓ o código (contrato do reason.ts: "codigo kebab-case EN... nunca dado de linha") —
// jamais serializa o objeto inteiro, que pode carregar mensagem de exceção (W2 issue 4).
const portCode = (e: unknown): string => {
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e !== null && 'tag' in e) {
    const tag = (e as Readonly<{ tag: unknown }>).tag;
    if (typeof tag === 'string') return tag;
  }
  return 'unknown-port-error';
};

// ---------------------------------------------------------------------------
// runContractsEtl — ciclo completo (legado efêmero → core-api destino).
// ---------------------------------------------------------------------------

export const runContractsEtl = async (
  opts: Readonly<RunContractsEtlOptions>,
): Promise<Result<ContractsEtlReport, RunContractsEtlError>> => {
  await mkdir(resolve(OUT_DIR), { recursive: true });
  // Artefatos POR RUN: trunca no início (W2 issue 2) — runs sucessivos (inclusive
  // dry-run + real) não misturam linhas; o de-para é sempre a fotografia do último run.
  for (const path of [SUMMARY_PATH, DETAIL_PATH, DEPARA_PATH]) {
    await writeFile(resolve(path), '', 'utf8');
  }
  const sink = makeSink();

  const partnersR = await buildPartnersEtlPort({ connectionString: opts.connectionString });
  if (!partnersR.ok) return err({ kind: 'partners-port', detail: partnersR.error });
  const partnersPort: PartnersEtlPort = partnersR.value;

  const programsR = await openProgramsMysql({
    connectionString: opts.connectionString,
    applyMigrations: true,
  });
  if (!programsR.ok) {
    await partnersPort.close();
    return err({ kind: 'programs-driver', detail: programsR.error });
  }
  const programsHandle: ProgramsMysqlHandle = programsR.value;

  const contractsR = await openMysql({
    connectionString: opts.connectionString,
    applyMigrations: true,
  });
  if (!contractsR.ok) {
    await programsHandle.close();
    await partnersPort.close();
    return err({ kind: 'contracts-driver', detail: contractsR.error });
  }
  const contractsHandle: MysqlHandle = contractsR.value;

  try {
    const restored = await withLegacyMysql(opts.dumpPath, async () => {
      const data = await readLegacyContractsData();
      const programRepo = createDrizzleProgramRepository(programsHandle);
      const contractRepo = createDrizzleContractRepository(contractsHandle);
      const clock = ClockReal();

      // ── Programas ──────────────────────────────────────────────────────────
      let pMigrated = 0;
      let pQuarantined = 0;
      let pExisting = 0;
      const programRefByLegacyId = new Map<number, string>();

      for (const failure of data.programs.failures) {
        pQuarantined += 1;
        await sink.quarantine('programs', failure.legacyId, failure.errors);
      }

      for (const row of data.programs.rows) {
        const plan = mapLegacyProgramRow(row);
        if (!plan.ok) {
          pQuarantined += 1;
          await sink.quarantine('programs', row.id, plan.error);
          continue;
        }
        if (opts.dryRun) {
          pMigrated += 1;
          programRefByLegacyId.set(plan.value.legacyId, `dry-run-program-${String(row.id)}`);
          continue;
        }
        const created = await createProgram({ programRepo, clock })(plan.value.cmd);
        if (created.ok) {
          pMigrated += 1;
          programRefByLegacyId.set(plan.value.legacyId, String(created.value.program.id));
          await sink.depara({
            entity: 'program',
            legacyId: plan.value.legacyId,
            newId: String(created.value.program.id),
            programNumber: created.value.program.programNumber,
            ...plan.value.artifact,
          });
        } else if (created.error === 'program-sigla-duplicated') {
          // Idempotência por chave natural (sigla): re-run reaproveita o existente.
          const existing = await programRepo.findBySigla(plan.value.cmd.sigla);
          if (existing.ok && existing.value !== null) {
            pExisting += 1;
            programRefByLegacyId.set(plan.value.legacyId, String(existing.value.id));
            // De-para REGENERADO em re-run (W2 issue 2).
            await sink.depara({
              entity: 'program',
              legacyId: plan.value.legacyId,
              newId: String(existing.value.id),
              programNumber: existing.value.programNumber,
              alreadyExisted: true,
              ...plan.value.artifact,
            });
          } else {
            pQuarantined += 1;
            await sink.quarantine('programs', row.id, [
              { tag: 'PortError', field: 'program_lookup', portError: 'program-sigla-duplicated' },
            ]);
          }
        } else {
          pQuarantined += 1;
          await sink.quarantine('programs', row.id, [
            { tag: 'PortError', field: 'program_save', portError: created.error },
          ]);
        }
      }

      // ── Remap de fornecedores (via porta pública do partners) ─────────────
      // Falha de PORT (infra) ≠ ausência (dado): port com erro entra em
      // `supplierLookupFailed` e os contratos daquele fornecedor quarentenam como
      // PortError — nunca mascarado como RequiredFieldMissing (W2 issue 1).
      const supplierRefByLegacyId = new Map<number, string>();
      const supplierLookupFailed = new Map<number, string>();
      const uniqueSupplierIds = new Set<number>();
      for (const row of data.contracts.rows) {
        if (row.supplierId !== null) uniqueSupplierIds.add(row.supplierId);
      }
      for (const legacyId of uniqueSupplierIds) {
        const found = await partnersPort.suppliers.findByLegacyId(legacyId);
        if (!found.ok) {
          supplierLookupFailed.set(legacyId, portCode(found.error));
        } else if (found.value !== null) {
          supplierRefByLegacyId.set(legacyId, String(found.value));
        }
        // ok+null (ausente de verdade) → mapper quarantena RequiredFieldMissing supplier_ref
      }

      const refs: ContractMapRefs = { supplierRefByLegacyId, programRefByLegacyId };

      // ── Contratos ──────────────────────────────────────────────────────────
      let cMigrated = 0;
      let cQuarantined = 0;
      let cExisting = 0;
      const maxSeqByYear = new Map<number, number>();

      for (const failure of data.contracts.failures) {
        cQuarantined += 1;
        await sink.quarantine('contracts', failure.legacyId, failure.errors);
      }

      for (const row of data.contracts.rows) {
        // Infra indisponível no remap → PortError (antes do mapper, que só vê dados).
        if (row.supplierId !== null && supplierLookupFailed.has(row.supplierId)) {
          cQuarantined += 1;
          await sink.quarantine('contracts', row.id, [
            {
              tag: 'PortError',
              field: 'supplier_lookup',
              portError: supplierLookupFailed.get(row.supplierId) ?? 'unknown-port-error',
            },
          ]);
          continue;
        }

        const plan = mapLegacyContractRow(row, refs);
        if (!plan.ok) {
          cQuarantined += 1;
          await sink.quarantine('contracts', row.id, plan.error);
          continue;
        }

        // Reconcile do contador considera todo número lógico MATERIALIZADO no destino.
        const parts = sequentialParts(row.contractCode);

        if (opts.dryRun) {
          cMigrated += 1;
          if (parts !== null) {
            maxSeqByYear.set(parts.year, Math.max(maxSeqByYear.get(parts.year) ?? 0, parts.seq));
          }
          continue;
        }

        const found = await contractRepo.findBySequentialNumber(
          plan.value.createInput.sequentialNumber,
        );
        if (!found.ok) {
          cQuarantined += 1;
          await sink.quarantine('contracts', row.id, [
            { tag: 'PortError', field: 'contract_lookup', portError: portCode(found.error) },
          ]);
          continue;
        }
        if (found.value !== null) {
          cExisting += 1;
          if (parts !== null) {
            maxSeqByYear.set(parts.year, Math.max(maxSeqByYear.get(parts.year) ?? 0, parts.seq));
          }
          // De-para REGENERADO em re-run (W2 issue 2): artefato reprodutível sempre.
          await sink.depara({
            entity: 'contract',
            legacyId: plan.value.legacyId,
            newId: String(found.value.id),
            sequentialNumber: plan.value.createInput.sequentialNumber,
            status: found.value.status,
            alreadyExisted: true,
            ...plan.value.artifact,
          });
          continue;
        }

        const created = Contract.create(plan.value.createInput);
        if (!created.ok) {
          cQuarantined += 1;
          await sink.quarantine('contracts', row.id, [
            { tag: 'PortError', field: 'contract_create', portError: created.error.tag },
          ]);
          continue;
        }

        let finalContract: Parameters<typeof contractRepo.save>[0] = created.value.contract;
        const events: ContractEvent[] = [created.value.event];
        if (plan.value.terminate !== null) {
          const ended = Contract.terminate(created.value.contract, plan.value.terminate.at);
          if (!ended.ok) {
            cQuarantined += 1;
            await sink.quarantine('contracts', row.id, [
              { tag: 'PortError', field: 'contract_terminate', portError: ended.error.tag },
            ]);
            continue;
          }
          finalContract = ended.value.contract;
          events.push(ended.value.event);
        }

        const saved = await contractRepo.save(finalContract, events);
        if (!saved.ok) {
          cQuarantined += 1;
          await sink.quarantine('contracts', row.id, [
            { tag: 'PortError', field: 'contract_save', portError: portCode(saved.error) },
          ]);
          continue;
        }

        cMigrated += 1;
        if (parts !== null) {
          maxSeqByYear.set(parts.year, Math.max(maxSeqByYear.get(parts.year) ?? 0, parts.seq));
        }
        await sink.depara({
          entity: 'contract',
          legacyId: plan.value.legacyId,
          newId: String(finalContract.id),
          sequentialNumber: plan.value.createInput.sequentialNumber,
          status: finalContract.status,
          ...plan.value.artifact,
        });
      }

      // ── Reconcile do ctr_contract_seq (decisão a — bloqueante de cut-over) ─
      const seqReconciled: Readonly<{ year: number; lastSeq: number }>[] = [];
      if (!opts.dryRun) {
        const { ctrContractSeq } = contractsHandle.schema;
        for (const [year, lastSeq] of maxSeqByYear) {
          await contractsHandle.db
            .insert(ctrContractSeq)
            .values({ year, lastSeq })
            .onDuplicateKeyUpdate({
              set: { lastSeq: sql`GREATEST(${ctrContractSeq.lastSeq}, ${lastSeq})` },
            });
          seqReconciled.push({ year, lastSeq });
        }
      } else {
        for (const [year, lastSeq] of maxSeqByYear) seqReconciled.push({ year, lastSeq });
      }

      const report: ContractsEtlReport = {
        programs: {
          read: data.programs.rows.length + data.programs.failures.length,
          migrated: pMigrated,
          quarantined: pQuarantined,
          alreadyExists: pExisting,
        },
        contracts: {
          read: data.contracts.rows.length + data.contracts.failures.length,
          migrated: cMigrated,
          quarantined: cQuarantined,
          alreadyExists: cExisting,
        },
        seqReconciled,
      };
      return report;
    });

    if (!restored.ok) return err({ kind: 'restore', detail: restored.error });
    return ok(restored.value);
  } finally {
    await contractsHandle.close();
    await programsHandle.close();
    await partnersPort.close();
  }
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const parseArgs = (argv: readonly string[]): RunContractsEtlOptions => {
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

const formatReport = (report: Readonly<ContractsEtlReport>): string => {
  const line = (name: string, t: Tally): string =>
    `  ${name}: read=${String(t.read)} migrated=${String(t.migrated)} ` +
    `quarantined=${String(t.quarantined)} alreadyExists=${String(t.alreadyExists)}`;
  const seq = report.seqReconciled.map((s) => `${String(s.year)}→${String(s.lastSeq)}`).join(', ');
  return [
    'ETL Contratos — reconciliacao:',
    line('programs', report.programs),
    line('contracts', report.contracts),
    `  ctr_contract_seq: ${seq === '' ? '(nenhum ano)' : seq}`,
  ].join('\n');
};

const lastResortShutdown = async (): Promise<void> => {
  await Promise.resolve();
};

const main = async (): Promise<number> => {
  const [, , ...argv] = process.argv;
  const opts = parseArgs(argv);

  const result = await runContractsEtl(opts);
  if (!result.ok) {
    process.stderr.write(`ETL de contratos falhou: ${JSON.stringify(result.error)}\n`);
    return 1;
  }
  process.stdout.write(`${formatReport(result.value)}\n`);
  if (opts.dryRun) {
    process.stdout.write(
      '  (dry-run: nada de dados persistido; migrations DDL do destino foram aplicadas ' +
        'ao abrir os ports; destino não consultado — já-migrados aparecem como migrated)\n',
    );
  }
  return 0;
};

if (process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename) {
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
