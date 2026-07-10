// Factories dos WorkerSpec do worker-runner (issue #407). Cada factory extrai o bootstrap de um
// worker standalone (`run.ts`) e o adapta para rodar SOBRE um pool COMPARTILHADO (PoolRegistry) em
// vez de abrir pool próprio — cortando pools redundantes contra o mesmo RDS/db `core` (ADR-0014).
//
// Contrato: cada factory é um `SpecBuilder` puro — lê a config do `env` (parâmetro, não process.env),
// obtém o(s) handle(s) via `openXMysqlOnPool(pool)` (variante síncrona, close no-op: o registry é dono
// do pool) e devolve `Result<WorkerSpec, string>` (string = mensagem humana p/ o log do run.ts). Erros
// de config/pool viram `err(...)`; nenhum `throw` cruza a borda. O `run(signal)` do WorkerSpec roda
// o(s) `runLoop` passando `abortSignal: signal` — o run.ts do runner cuida do SIGTERM/SIGINT.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { PoolRegistry } from '#src/shared/persistence/pool-registry.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { runLoop as runGenericLoop } from '#src/shared/outbox/index.ts';
import type { WorkerOutboxOps } from '#src/shared/outbox/index.ts';
import type { WorkerSpec } from './group.ts';

// ── contracts (outbox) ────────────────────────────────────────────────────────
import { readWorkerConfig as readContractsWorkerConfig } from '#src/modules/contracts/worker/config.ts';
import { runLoop as runContractsOutboxLoop } from '#src/modules/contracts/worker/outbox-worker.ts';
import { LoggerEventDelivery as ContractsLoggerEventDelivery } from '#src/modules/contracts/adapters/event-delivery/event-delivery.logger.ts';
import { createDrizzleOutboxRepository as createContractsOutboxRepo } from '#src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts';
import { openMysqlOnPool as openContractsOnPool } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';

// ── partners (outbox + email-outbox + contract-count store) ───────────────────
import { readWorkerConfig as readPartnersWorkerConfig } from '#src/modules/partners/worker/config.ts';
import { runLoop as runPartnersOutboxLoop } from '#src/modules/partners/worker/outbox-worker.ts';
import { LoggerEventDelivery as PartnersLoggerEventDelivery } from '#src/modules/partners/adapters/event-delivery/event-delivery.logger.ts';
import { createDrizzleOutboxRepository as createPartnersOutboxRepo } from '#src/modules/partners/adapters/persistence/repos/outbox-repository.drizzle.ts';
import { createDrizzleParEmailOutboxRepository } from '#src/modules/partners/adapters/persistence/repos/email-outbox-repository.drizzle.ts';
import { createDrizzleContractCountStore } from '#src/modules/partners/adapters/persistence/repos/contract-count-store.drizzle.ts';
import { openPartnersMysqlOnPool } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';

// ── financial (supplier-view + payable-view stores + outbox reader) ───────────
import { createDrizzleSupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.drizzle.ts';
import { createDrizzleFinancialOutboxReader } from '#src/modules/financial/adapters/persistence/repos/fin-outbox-reader.drizzle.ts';
import { createDrizzlePayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.drizzle.ts';
import { openMysqlFinancialOnPool } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';

// ── auth (email-outbox) ───────────────────────────────────────────────────────
import { createDrizzleAuthOutboxRepository } from '#src/modules/auth/adapters/persistence/repos/outbox-repository.drizzle.ts';
import { openAuthMysqlOnPool } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';

// ── notifications (composição de e-mail por env) ──────────────────────────────
import {
  buildEmailSender,
  parseEmailConfig,
  resolveFrom,
} from '#src/modules/notifications/public-api/index.ts';

// ── deliveries (composition root — colam evento lido → aplicação no read-model) ─
import {
  createSupplierProjectionDelivery,
  rowToMessage as supplierRowToMessage,
} from '../supplier-view-projection/delivery.ts';
import {
  createPayableProjectionDelivery,
  rowToMessage as payableRowToMessage,
} from '../payable-view-projection/delivery.ts';
import {
  createContractCountProjectionDelivery,
  rowToMessage as contractCountRowToMessage,
} from '../contract-count-projection/delivery.ts';
import { buildEmailDispatchDelivery, rowToEmailRow } from '../email-dispatch/delivery.ts';

// ── contrato exportado ────────────────────────────────────────────────────────

/**
 * SpecBuilder — monta um `WorkerSpec` sobre o pool compartilhado do `registry`, lendo a config do
 * `env`. Falha de config/pool → `err(mensagem-humana)`; sucesso → `ok(spec)`.
 */
export type SpecBuilder = (
  registry: PoolRegistry,
  env: Readonly<Record<string, string | undefined>>,
) => Result<WorkerSpec, string>;

// Config de loop dos consumers de projeção/e-mail (espelha os run.ts originais).
const PROJECTION_LOOP = { batchSize: 10, maxAttempts: 5, pollIntervalMs: 500, idleSleepMs: 1000 };

// ── outbox: contracts ─────────────────────────────────────────────────────────

export const buildContractsOutboxSpec: SpecBuilder = (registry, env) => {
  const configR = readContractsWorkerConfig(env);
  if (!configR.ok) return err(`config outbox contracts: ${configR.error}`);
  const config = configR.value;

  const pool = registry.getOrCreate(config.connectionString);
  if (!pool.ok) return err(`pool config inválida (contracts): ${pool.error}`);
  const handle = openContractsOnPool(pool.value);

  const outbox = createContractsOutboxRepo(handle);
  const delivery = ContractsLoggerEventDelivery(config.consumerId, config.logFile);

  return ok({
    name: 'contracts-outbox',

    run: async (signal) => {
      await runContractsOutboxLoop(
        { outbox, delivery, clock: ClockReal(), abortSignal: signal },
        config.loop,
      );
    },
  });
};

// ── outbox: partners ──────────────────────────────────────────────────────────

export const buildPartnersOutboxSpec: SpecBuilder = (registry, env) => {
  const configR = readPartnersWorkerConfig(env);
  if (!configR.ok) return err(`config outbox partners: ${configR.error}`);
  const config = configR.value;

  const pool = registry.getOrCreate(config.connectionString);
  if (!pool.ok) return err(`pool config inválida (partners): ${pool.error}`);
  const handle = openPartnersMysqlOnPool(pool.value);

  const outbox = createPartnersOutboxRepo(handle);
  const delivery = PartnersLoggerEventDelivery(config.consumerId, config.logFile);

  return ok({
    name: 'partners-outbox',

    run: async (signal) => {
      await runPartnersOutboxLoop(
        { outbox, delivery, clock: ClockReal(), abortSignal: signal },
        config.loop,
      );
    },
  });
};

// ── projections: supplier-view (par_outbox → fin_supplier_view) ───────────────

export const buildSupplierProjectionSpec: SpecBuilder = (registry, env) => {
  const partnersUrl = env['PARTNERS_DATABASE_URL'];
  if (partnersUrl === undefined || partnersUrl === '') {
    return err('supplier-view-projection: PARTNERS_DATABASE_URL ausente');
  }
  const financialUrl = env['FINANCIAL_DATABASE_URL'];
  if (financialUrl === undefined || financialUrl === '') {
    return err('supplier-view-projection: FINANCIAL_DATABASE_URL ausente');
  }

  const partnersPool = registry.getOrCreate(partnersUrl);
  if (!partnersPool.ok) return err(`pool config inválida (partners): ${partnersPool.error}`);
  const financialPool = registry.getOrCreate(financialUrl);
  if (!financialPool.ok) return err(`pool config inválida (financial): ${financialPool.error}`);

  const clock = ClockReal();
  const outbox = createPartnersOutboxRepo(openPartnersMysqlOnPool(partnersPool.value));
  const store = createDrizzleSupplierViewStore(
    openMysqlFinancialOnPool(financialPool.value),
    clock,
  );
  const delivery = createSupplierProjectionDelivery(store);

  return ok({
    name: 'supplier-view-projection',

    run: async (signal) => {
      await runGenericLoop(
        {
          outbox,
          delivery,
          rowToProcessed: supplierRowToMessage,
          clock,
          tag: '[supplier-projection-worker] ',
          abortSignal: signal,
        },
        PROJECTION_LOOP,
      );
    },
  });
};

// ── projections: payable-view (fin_outbox → fin_payable_view) ─────────────────

export const buildPayableProjectionSpec: SpecBuilder = (registry, env) => {
  const financialUrl = env['FINANCIAL_DATABASE_URL'];
  if (financialUrl === undefined || financialUrl === '') {
    return err('payable-view-projection: FINANCIAL_DATABASE_URL ausente');
  }

  const financialPool = registry.getOrCreate(financialUrl);
  if (!financialPool.ok) return err(`pool config inválida (financial): ${financialPool.error}`);

  const clock = ClockReal();
  const handle = openMysqlFinancialOnPool(financialPool.value);
  const outbox = createDrizzleFinancialOutboxReader(handle);
  const store = createDrizzlePayableViewStore(handle, clock);
  const delivery = createPayableProjectionDelivery(store);

  return ok({
    name: 'payable-view-projection',

    run: async (signal) => {
      await runGenericLoop(
        {
          outbox,
          delivery,
          rowToProcessed: payableRowToMessage,
          clock,
          tag: '[payable-projection-worker] ',
          abortSignal: signal,
        },
        PROJECTION_LOOP,
      );
    },
  });
};

// ── projections: contract-count (ctr_outbox → par_contract_count_view) ────────

export const buildContractCountSpec: SpecBuilder = (registry, env) => {
  const contractsUrl = env['CONTRACTS_DATABASE_URL'];
  if (contractsUrl === undefined || contractsUrl === '') {
    return err('contract-count-projection: CONTRACTS_DATABASE_URL ausente');
  }
  const partnersUrl = env['PARTNERS_DATABASE_URL'];
  if (partnersUrl === undefined || partnersUrl === '') {
    return err('contract-count-projection: PARTNERS_DATABASE_URL ausente');
  }

  const contractsPool = registry.getOrCreate(contractsUrl);
  if (!contractsPool.ok) return err(`pool config inválida (contracts): ${contractsPool.error}`);
  const partnersPool = registry.getOrCreate(partnersUrl);
  if (!partnersPool.ok) return err(`pool config inválida (partners): ${partnersPool.error}`);

  const clock = ClockReal();
  const outbox = createContractsOutboxRepo(openContractsOnPool(contractsPool.value));
  const store = createDrizzleContractCountStore(openPartnersMysqlOnPool(partnersPool.value));
  const delivery = createContractCountProjectionDelivery(store);

  return ok({
    name: 'contract-count-projection',

    run: async (signal) => {
      await runGenericLoop(
        {
          outbox,
          delivery,
          rowToProcessed: contractCountRowToMessage,
          clock,
          tag: '[contract-count-projection-worker] ',
          abortSignal: signal,
        },
        PROJECTION_LOOP,
      );
    },
  });
};

// ── email: dispatch (auth_outbox [+ par_email_outbox] → EmailSender) ──────────

export const buildEmailDispatchSpec: SpecBuilder = (registry, env) => {
  const authUrl = env['AUTH_DATABASE_URL'];
  if (authUrl === undefined || authUrl.length === 0) {
    return err('email-dispatch: AUTH_DATABASE_URL ausente');
  }

  // Config de e-mail (provider + remetente) resolvida por env — falha alta no boot (fail-loud).
  const config = parseEmailConfig(env);
  if (!config.ok) return err(`email-dispatch: config de e-mail inválida (${config.error.tag})`);
  const from = resolveFrom('reset', config.value) ?? resolveFrom('invite', config.value);
  if (from === undefined) {
    return err('email-dispatch: remetente (EMAIL_FROM) não configurado');
  }
  const senderR = buildEmailSender(env);
  if (!senderR.ok) {
    return err(`email-dispatch: provider de e-mail inválido (${senderR.error.tag})`);
  }

  const authPool = registry.getOrCreate(authUrl);
  if (!authPool.ok) return err(`pool config inválida (auth): ${authPool.error}`);

  const clock = ClockReal();
  const authOutbox = createDrizzleAuthOutboxRepository(openAuthMysqlOnPool(authPool.value));
  // O MESMO EventDelivery serve as duas fontes (multi-fonte — ADR-0047): decodifica por eventType.
  const delivery = buildEmailDispatchDelivery({ emailSender: senderR.value, from });

  // PARTNERS-INVITE-DOMAIN-EVENT (ADR-0047): segunda fonte par_email_outbox (opcional). Sem
  // PARTNERS_DATABASE_URL, o worker roda só a fonte auth (degradação graciosa).
  const partnersUrl = env['PARTNERS_DATABASE_URL'];
  let partnersOutbox: WorkerOutboxOps | null = null;
  if (partnersUrl !== undefined && partnersUrl.length > 0) {
    const partnersPool = registry.getOrCreate(partnersUrl);
    if (!partnersPool.ok) return err(`pool config inválida (partners): ${partnersPool.error}`);
    partnersOutbox = createDrizzleParEmailOutboxRepository(
      openPartnersMysqlOnPool(partnersPool.value),
    );
  }

  return ok({
    name: 'email-dispatch',

    run: async (signal) => {
      const loops: Promise<unknown>[] = [
        runGenericLoop(
          {
            outbox: authOutbox,
            delivery,
            rowToProcessed: rowToEmailRow,
            clock,
            tag: '[email-dispatch-worker] [auth] ',
            abortSignal: signal,
          },
          PROJECTION_LOOP,
        ),
      ];
      if (partnersOutbox !== null) {
        loops.push(
          runGenericLoop(
            {
              outbox: partnersOutbox,
              delivery,
              rowToProcessed: rowToEmailRow,
              clock,
              tag: '[email-dispatch-worker] [partners] ',
              abortSignal: signal,
            },
            PROJECTION_LOOP,
          ),
        );
      }
      await Promise.all(loops);
    },
  });
};

// ── grupos (consumidos pelo run.ts via WORKER_GROUP) ──────────────────────────

export const GROUPS: Readonly<Record<'outbox' | 'projections' | 'email', readonly SpecBuilder[]>> =
  {
    outbox: [buildContractsOutboxSpec, buildPartnersOutboxSpec],
    projections: [buildSupplierProjectionSpec, buildPayableProjectionSpec, buildContractCountSpec],
    email: [buildEmailDispatchSpec],
  };
