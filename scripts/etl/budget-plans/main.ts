/**
 * Entrypoint do ETL do Planejamento Orcamentario (BGP-ETL-READER-MAPPER, fatia 3/3) — wiring real.
 *
 * `runBudgetPlansEtl({ connectionString, dryRun })`:
 *   1. `readLegacyBudgetPlansData()` le o legado direto pela ETL_LEGACY_CONNECTION_STRING (sem
 *      Docker; env ausente -> Result err 'legacy-read', CA8), ja pre-juntado (siglas/UF resolvidas);
 *   2. refs de core: `programs.abbreviation -> prg_programs.id` (ponte por sigla) e
 *      `auth.legacy_id -> auth_user.id` (autoria migrada) — lidos SELECT-only do core;
 *   3. `buildBudgetPlansEtlPort` (fatia 2, idempotente por legacy_id) grava na ordem FK-segura
 *      plano -> cost center -> categoria -> subcategoria -> budget -> lancamento; `parentId` do
 *      plano na 2a passada (todos os UUID gerados antes; ordem topologica pai-antes-de-filho);
 *   4. reconciliacao por entidade (`reconcile.ts` — `read = migrated + quarantined + alreadyExists`)
 *      + quarentena estruturada (`quarantine/reason.ts`), de-para e detalhe em `.tmp/` (gitignored).
 *
 * A ETL so conhece a public-api do modulo (ADR-0006) — nunca domain/ nem application/. UUID + de-para
 * + 2a passada do parentId vivem AQUI (o mapper e' puro). ASCII puro. Codigo EN, comentarios PT-BR.
 */

import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createConnection, type RowDataPacket } from 'mysql2/promise';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import {
  installLastResortHandlers,
  processLastResortDeps,
} from '#src/shared/runtime/last-resort.ts';
import {
  buildBudgetPlansEtlPort,
  type BudgetPlansEtlPort,
  type BuildBudgetPlansEtlPortError,
  type LegacyEntityStore,
} from '#src/modules/budget-plans/public-api/etl.ts';

import {
  readLegacyBudgetPlansData,
  type LegacyBudgetPlansData,
} from '#scripts/etl/budget-plans/reader.ts';
import {
  mapBudgetPlanRow,
  mapBudgetRow,
  mapCostCenterRow,
  mapCategoryRow,
  mapSubcategoryRow,
  mapBudgetResultRow,
  type BudgetPlanMapRefs,
  type BudgetResultMapRefs,
} from '#scripts/etl/budget-plans/mapper.ts';
import {
  emptyTally,
  countRead,
  countMigrated,
  countQuarantined,
  countAlreadyExists,
  type EntityTally,
} from '#scripts/etl/reconcile.ts';
import {
  toSummary,
  describeReason,
  type QuarantineReason,
} from '#scripts/etl/quarantine/reason.ts';

const OUT_DIR = '.tmp/etl-budget-plans';
const SUMMARY_PATH = `${OUT_DIR}/quarantine.summary.jsonl`;
const DETAIL_PATH = `${OUT_DIR}/quarantine.detail.jsonl`;
const DEPARA_PATH = `${OUT_DIR}/de-para.jsonl`;

export type RunBudgetPlansEtlOptions = Readonly<{
  connectionString: string;
  dryRun: boolean;
}>;

// Os 3 modelos com volume medido (CAED=0). Sao literais do enum de dominio (launchType), nao
// identificadores — daí o UPPER_CASE (via union, sem declarar type-property em camelCase).
export type ModelKind = 'IPCA' | 'DESPESAS_PESSOAIS' | 'DESPESAS_LOGISTICAS';
export type ModelTally = Readonly<Record<ModelKind, number>>;

export type BudgetPlansEtlReport = Readonly<{
  plans: EntityTally;
  budgets: EntityTally;
  costCenters: EntityTally;
  categories: EntityTally;
  subcategories: EntityTally;
  budgetResults: EntityTally;
  // CA4 — distribuicao do `model` DERIVADO da releaseType (medido: 4367/276/36).
  byModel: ModelTally;
  // CA5/CA10 — soma dos valueCents migrados por Rede vs budgets.valueInCents do legado (diff 0).
  valueDiffCents: number;
}>;

export type RunBudgetPlansEtlError =
  | Readonly<{ kind: 'legacy-read'; detail: string }>
  | Readonly<{ kind: 'core-refs'; detail: string }>
  | Readonly<{ kind: 'budget-plans-port'; detail: BuildBudgetPlansEtlPortError }>;

// ── Sink de quarentena/de-para (molde financial): resumo PII-free versionavel + detalhe .tmp/ ──

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

// Erro de port -> codigo kebab (contrato PII-free do reason.ts).
const portCode = (e: unknown): string => (typeof e === 'string' ? e : 'unknown-port-error');

// Leitura do legado como Result (env ausente -> connectReadonly throw -> err, CA8).
const readLegacyData = async (): Promise<Result<LegacyBudgetPlansData, string>> => {
  try {
    return ok(await readLegacyBudgetPlansData());
  } catch (cause) {
    return err(String(cause));
  }
};

// ── Refs de core (ponte por sigla + autoria migrada) — SELECT-only, sem tocar modulos ─────────

type CoreRefs = Readonly<{
  programRefBySigla: ReadonlyMap<string, string>;
  updatedByByLegacyId: ReadonlyMap<number, string>;
}>;

const loadCoreRefs = async (connectionString: string): Promise<Result<CoreRefs, string>> => {
  let conn: Awaited<ReturnType<typeof createConnection>> | null = null;
  try {
    conn = await createConnection(connectionString);
    const [programRows] = await conn.query<RowDataPacket[]>('SELECT id, sigla FROM prg_programs');
    const programRefBySigla = new Map<string, string>();
    for (const r of programRows) {
      programRefBySigla.set(String(r['sigla']), String(r['id']));
    }
    const [userRows] = await conn.query<RowDataPacket[]>(
      'SELECT id, legacy_id FROM auth_user WHERE legacy_id IS NOT NULL',
    );
    const updatedByByLegacyId = new Map<number, string>();
    for (const r of userRows) {
      updatedByByLegacyId.set(Number(r['legacy_id']), String(r['id']));
    }
    return ok({ programRefBySigla, updatedByByLegacyId });
  } catch (cause) {
    return err(String(cause));
  } finally {
    if (conn !== null) {
      await conn.end().catch(() => {
        /* fechamento best-effort */
      });
    }
  }
};

// ── Helper generico: resolve o UUID persistido por legacy_id ou provisiona (idempotente) ──────
// Devolve o UUID canonico (existente ou recem-criado) + o outcome de reconciliacao.

type ProvisionResult = Readonly<{
  uuid: string | null;
  outcome: 'created' | 'already-exists' | 'error';
}>;

// Contexto estavel de escrita (table/sink/dryRun) — agrupado para caber no limite de params.
type ProvisionCtx = Readonly<{ table: string; sink: Sink; dryRun: boolean }>;

const resolveOrProvision = async <I extends Readonly<{ id: string }>>(
  store: LegacyEntityStore<I, string>,
  input: I,
  legacyId: number,
  ctx: ProvisionCtx,
): Promise<ProvisionResult> => {
  if (ctx.dryRun) return { uuid: input.id, outcome: 'created' };

  const existing = await store.findByLegacyId(legacyId);
  if (!existing.ok) {
    await ctx.sink.quarantine(ctx.table, legacyId, [
      { tag: 'PortError', field: 'find_by_legacy_id', portError: portCode(existing.error) },
    ]);
    return { uuid: null, outcome: 'error' };
  }
  if (existing.value !== null) return { uuid: existing.value, outcome: 'already-exists' };

  const prov = await store.provision(input, legacyId);
  if (!prov.ok) {
    await ctx.sink.quarantine(ctx.table, legacyId, [
      { tag: 'PortError', field: 'provision', portError: portCode(prov.error) },
    ]);
    return { uuid: null, outcome: 'error' };
  }
  if (prov.value === 'already-exists') {
    // Corrida: a linha nasceu com OUTRO uuid — resolve o canonico para o de-para/FKs.
    const refound = await store.findByLegacyId(legacyId);
    return { uuid: refound.ok ? refound.value : null, outcome: 'already-exists' };
  }
  return { uuid: input.id, outcome: 'created' };
};

const bump = (tally: EntityTally, outcome: ProvisionResult['outcome']): EntityTally => {
  switch (outcome) {
    case 'created':
      return countMigrated(tally);
    case 'already-exists':
      return countAlreadyExists(tally);
    case 'error':
      return countQuarantined(tally);
  }
};

// Ordena os planos pai-antes-de-filho (a FK auto-referente exige o pai inserido). N pequeno (5).
const topoSortPlans = <T extends Readonly<{ legacyId: number; parentLegacyId: number | null }>>(
  mapped: readonly T[],
): readonly T[] => {
  const known = new Set(mapped.map((m) => m.legacyId));
  const emitted = new Set<number>();
  const ordered: T[] = [];
  let progress = true;
  while (progress && ordered.length < mapped.length) {
    progress = false;
    for (const m of mapped) {
      if (emitted.has(m.legacyId)) continue;
      const parent = m.parentLegacyId;
      const parentReady = parent === null || !known.has(parent) || emitted.has(parent);
      if (parentReady) {
        ordered.push(m);
        emitted.add(m.legacyId);
        progress = true;
      }
    }
  }
  // Ciclos (nao esperados no legado): emite no fim, parentId caira em null se o pai nao saiu antes.
  for (const m of mapped) if (!emitted.has(m.legacyId)) ordered.push(m);
  return ordered;
};

// ---------------------------------------------------------------------------
// runBudgetPlansEtl
// ---------------------------------------------------------------------------

export const runBudgetPlansEtl = async (
  opts: Readonly<RunBudgetPlansEtlOptions>,
): Promise<Result<BudgetPlansEtlReport, RunBudgetPlansEtlError>> => {
  await mkdir(resolve(OUT_DIR), { recursive: true });
  for (const path of [SUMMARY_PATH, DETAIL_PATH, DEPARA_PATH]) {
    await writeFile(resolve(path), '', 'utf8');
  }
  const sink = makeSink();

  // 1. Legado (env ausente -> connectReadonly throw -> Result err 'legacy-read', CA8).
  const dataR = await readLegacyData();
  if (!dataR.ok) return err({ kind: 'legacy-read', detail: dataR.error });
  const data = dataR.value;

  // 2. Refs de core (ponte por sigla + autoria migrada).
  const refsR = await loadCoreRefs(opts.connectionString);
  if (!refsR.ok) return err({ kind: 'core-refs', detail: refsR.error });
  const planRefs: BudgetPlanMapRefs = {
    programRefBySigla: refsR.value.programRefBySigla,
    updatedByByLegacyId: refsR.value.updatedByByLegacyId,
  };
  const resultRefs: BudgetResultMapRefs = {
    launchTypeBySubcategoryLegacyId: new Map(
      data.subcategories.map((s) => [s.id, s.releaseType] as const),
    ),
  };

  // 3. Port de escrita (fatia 2, idempotente por legacy_id).
  const portR = await buildBudgetPlansEtlPort({ connectionString: opts.connectionString });
  if (!portR.ok) return err({ kind: 'budget-plans-port', detail: portR.error });
  const port: BudgetPlansEtlPort = portR.value;

  try {
    const planUuidByLegacyId = new Map<number, string>();
    const costCenterUuidByLegacyId = new Map<number, string>();
    const categoryUuidByLegacyId = new Map<number, string>();
    const subcategoryUuidByLegacyId = new Map<number, string>();
    const budgetUuidByLegacyId = new Map<number, string>();

    // ── Planos (2 passadas: gera UUID de todos; provisiona em ordem topologica com parentId) ──
    let plansT = emptyTally();
    const mappedPlans: {
      legacyId: number;
      parentLegacyId: number | null;
      input: Omit<Parameters<(typeof port.plans)['provision']>[0], 'id' | 'parentId'>;
    }[] = [];
    for (const row of data.plans) {
      plansT = countRead(plansT);
      const m = mapBudgetPlanRow(row, planRefs);
      if (!m.ok) {
        plansT = countQuarantined(plansT);
        await sink.quarantine('budget_plans', row.id, m.error);
        continue;
      }
      planUuidByLegacyId.set(m.value.legacyId, randomUUID());
      mappedPlans.push({
        legacyId: m.value.legacyId,
        parentLegacyId: m.value.parentLegacyId,
        input: m.value.input,
      });
    }
    for (const m of topoSortPlans(mappedPlans)) {
      const id = planUuidByLegacyId.get(m.legacyId) ?? randomUUID();
      const parentId =
        m.parentLegacyId === null ? null : (planUuidByLegacyId.get(m.parentLegacyId) ?? null);
      const res = await resolveOrProvision(port.plans, { ...m.input, id, parentId }, m.legacyId, {
        table: 'budget_plans',
        sink,
        dryRun: opts.dryRun,
      });
      plansT = bump(plansT, res.outcome);
      if (res.uuid !== null) {
        planUuidByLegacyId.set(m.legacyId, res.uuid);
        await sink.depara({ entity: 'budget_plan', legacyId: m.legacyId, newId: res.uuid });
      }
    }

    // ── Cost centers ──────────────────────────────────────────────────────────
    let costCentersT = emptyTally();
    for (const row of data.costCenters) {
      costCentersT = countRead(costCentersT);
      const m = mapCostCenterRow(row);
      if (!m.ok) {
        costCentersT = countQuarantined(costCentersT);
        await sink.quarantine('cost_centers', row.id, m.error);
        continue;
      }
      const budgetPlanId = planUuidByLegacyId.get(m.value.budgetPlanLegacyId);
      if (budgetPlanId === undefined) {
        costCentersT = countQuarantined(costCentersT);
        await sink.quarantine('cost_centers', row.id, [
          { tag: 'RequiredFieldMissing', field: 'budget_plan_ref' },
        ]);
        continue;
      }
      const res = await resolveOrProvision(
        port.costCenters,
        { ...m.value.input, id: randomUUID(), budgetPlanId },
        m.value.legacyId,
        { table: 'cost_centers', sink, dryRun: opts.dryRun },
      );
      costCentersT = bump(costCentersT, res.outcome);
      if (res.uuid !== null) costCenterUuidByLegacyId.set(m.value.legacyId, res.uuid);
    }

    // ── Categorias ────────────────────────────────────────────────────────────
    let categoriesT = emptyTally();
    for (const row of data.categories) {
      categoriesT = countRead(categoriesT);
      const m = mapCategoryRow(row);
      if (!m.ok) {
        categoriesT = countQuarantined(categoriesT);
        await sink.quarantine('cost_centers_categories', row.id, m.error);
        continue;
      }
      const costCenterId = costCenterUuidByLegacyId.get(m.value.costCenterLegacyId);
      if (costCenterId === undefined) {
        categoriesT = countQuarantined(categoriesT);
        await sink.quarantine('cost_centers_categories', row.id, [
          { tag: 'RequiredFieldMissing', field: 'cost_center_ref' },
        ]);
        continue;
      }
      const res = await resolveOrProvision(
        port.categories,
        { ...m.value.input, id: randomUUID(), costCenterId },
        m.value.legacyId,
        { table: 'cost_centers_categories', sink, dryRun: opts.dryRun },
      );
      categoriesT = bump(categoriesT, res.outcome);
      if (res.uuid !== null) categoryUuidByLegacyId.set(m.value.legacyId, res.uuid);
    }

    // ── Subcategorias ─────────────────────────────────────────────────────────
    let subcategoriesT = emptyTally();
    for (const row of data.subcategories) {
      subcategoriesT = countRead(subcategoriesT);
      const m = mapSubcategoryRow(row);
      if (!m.ok) {
        subcategoriesT = countQuarantined(subcategoriesT);
        await sink.quarantine('cost_centers_sub_categories', row.id, m.error);
        continue;
      }
      const categoryId = categoryUuidByLegacyId.get(m.value.categoryLegacyId);
      if (categoryId === undefined) {
        subcategoriesT = countQuarantined(subcategoriesT);
        await sink.quarantine('cost_centers_sub_categories', row.id, [
          { tag: 'RequiredFieldMissing', field: 'category_ref' },
        ]);
        continue;
      }
      const res = await resolveOrProvision(
        port.subcategories,
        { ...m.value.input, id: randomUUID(), categoryId },
        m.value.legacyId,
        { table: 'cost_centers_sub_categories', sink, dryRun: opts.dryRun },
      );
      subcategoriesT = bump(subcategoriesT, res.outcome);
      if (res.uuid !== null) subcategoryUuidByLegacyId.set(m.value.legacyId, res.uuid);
    }

    // ── Budgets (Rede) ────────────────────────────────────────────────────────
    let budgetsT = emptyTally();
    for (const row of data.budgets) {
      budgetsT = countRead(budgetsT);
      const m = mapBudgetRow(row);
      if (!m.ok) {
        budgetsT = countQuarantined(budgetsT);
        await sink.quarantine('budgets', row.id, m.error);
        continue;
      }
      const budgetPlanId = planUuidByLegacyId.get(m.value.budgetPlanLegacyId);
      if (budgetPlanId === undefined) {
        budgetsT = countQuarantined(budgetsT);
        await sink.quarantine('budgets', row.id, [
          { tag: 'RequiredFieldMissing', field: 'budget_plan_ref' },
        ]);
        continue;
      }
      const res = await resolveOrProvision(
        port.budgets,
        { ...m.value.input, id: randomUUID(), budgetPlanId },
        m.value.legacyId,
        { table: 'budgets', sink, dryRun: opts.dryRun },
      );
      budgetsT = bump(budgetsT, res.outcome);
      if (res.uuid !== null) budgetUuidByLegacyId.set(m.value.legacyId, res.uuid);
    }

    // ── Lancamentos (o volume: 4.679; model DERIVADO) + agregacoes CA4/CA5 ─────
    let budgetResultsT = emptyTally();
    const byModel = { IPCA: 0, DESPESAS_PESSOAIS: 0, DESPESAS_LOGISTICAS: 0 };
    const migratedCentsByBudgetLegacyId = new Map<number, number>();
    for (const row of data.budgetResults) {
      budgetResultsT = countRead(budgetResultsT);
      const m = mapBudgetResultRow(row, resultRefs);
      if (!m.ok) {
        budgetResultsT = countQuarantined(budgetResultsT);
        await sink.quarantine('budget_results', row.id, m.error);
        continue;
      }
      const budgetId = budgetUuidByLegacyId.get(m.value.budgetLegacyId);
      const subcategoryId = subcategoryUuidByLegacyId.get(m.value.subcategoryLegacyId);
      if (budgetId === undefined || subcategoryId === undefined) {
        budgetResultsT = countQuarantined(budgetResultsT);
        await sink.quarantine('budget_results', row.id, [
          {
            tag: 'RequiredFieldMissing',
            field: budgetId === undefined ? 'budget_ref' : 'subcategory_ref',
          },
        ]);
        continue;
      }
      const res = await resolveOrProvision(
        port.budgetResults,
        { ...m.value.input, id: randomUUID(), budgetId, subcategoryId },
        m.value.legacyId,
        { table: 'budget_results', sink, dryRun: opts.dryRun },
      );
      budgetResultsT = bump(budgetResultsT, res.outcome);
      if (res.outcome === 'created' || res.outcome === 'already-exists') {
        const model = m.value.input.model;
        if (model === 'IPCA' || model === 'DESPESAS_PESSOAIS' || model === 'DESPESAS_LOGISTICAS') {
          byModel[model] += 1;
        }
        migratedCentsByBudgetLegacyId.set(
          m.value.budgetLegacyId,
          (migratedCentsByBudgetLegacyId.get(m.value.budgetLegacyId) ?? 0) +
            m.value.input.valueCents,
        );
      }
    }

    // CA5/CA10 — Σ|soma por Rede − budgets.valueInCents do legado| (esperado 0).
    let valueDiffCents = 0;
    for (const [budgetLegacyId, legadoValue] of data.budgetValueCentsByLegacyId) {
      const migrated = migratedCentsByBudgetLegacyId.get(budgetLegacyId) ?? 0;
      valueDiffCents += Math.abs(migrated - legadoValue);
    }

    return ok({
      plans: plansT,
      budgets: budgetsT,
      costCenters: costCentersT,
      categories: categoriesT,
      subcategories: subcategoriesT,
      budgetResults: budgetResultsT,
      byModel,
      valueDiffCents,
    });
  } finally {
    await port.close();
  }
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const parseArgs = (argv: readonly string[]): RunBudgetPlansEtlOptions => {
  const dryRun = argv.includes('--dry-run');
  const connectionString =
    process.env['ETL_CORE_CONNECTION_STRING'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3307/core';
  return { connectionString, dryRun };
};

const line = (name: string, t: EntityTally): string =>
  `  ${name}: read=${String(t.read)} migrated=${String(t.migrated)} ` +
  `quarantined=${String(t.quarantined)} alreadyExists=${String(t.alreadyExists)}`;

const formatReport = (report: Readonly<BudgetPlansEtlReport>): string =>
  [
    'ETL Orcamento (budget-plans) — reconciliacao:',
    line('plans', report.plans),
    line('budgets', report.budgets),
    line('costCenters', report.costCenters),
    line('categories', report.categories),
    line('subcategories', report.subcategories),
    line('budgetResults', report.budgetResults),
    `  model: IPCA=${String(report.byModel.IPCA)} ` +
      `DESPESAS_PESSOAIS=${String(report.byModel.DESPESAS_PESSOAIS)} ` +
      `DESPESAS_LOGISTICAS=${String(report.byModel.DESPESAS_LOGISTICAS)}`,
    `  diff soma por Rede vs legado: ${String(report.valueDiffCents)} cents`,
  ].join('\n');

const lastResortShutdown = async (): Promise<void> => {
  await Promise.resolve();
};

const main = async (): Promise<number> => {
  const [, , ...argv] = process.argv;
  const opts = parseArgs(argv);

  const result = await runBudgetPlansEtl(opts);
  if (!result.ok) {
    process.stderr.write(`ETL budget-plans falhou: ${JSON.stringify(result.error)}\n`);
    return 1;
  }
  process.stdout.write(`${formatReport(result.value)}\n`);
  if (opts.dryRun) {
    process.stdout.write(
      '  (dry-run: nada persistido; migrations DDL aplicadas ao abrir o port)\n',
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
