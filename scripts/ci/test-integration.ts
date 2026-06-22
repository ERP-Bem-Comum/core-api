// Orquestrador único dos testes de integração (Fase 1 — repo cleanup).
// Substitui as ~10 linhas gigantes de `test:integration:*` no package.json por um manifesto
// declarativo + um runner. Uso: `node scripts/ci/test-integration.ts <suite>`.
//
// Cada suite declara: serviços Docker a subir (mysql|minio), se cria os secrets de TESTE,
// a env var de gate (MYSQL_INTEGRATION etc.), a concorrência e os paths de teste.
// O runner: cria secrets → `docker compose up --wait` → `node --test` → SEMPRE derruba e limpa.
//
// Sem dependências novas (ADR-0011): só node:child_process (spawnSync, shell:false) + node:fs.

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import process from 'node:process';

const EX_USAGE = 64; // sysexits.h — uso inválido.

type Suite = Readonly<{
  services: readonly ('mysql' | 'minio')[];
  secrets: boolean; // cria os secrets de teste do MySQL
  env: Readonly<Record<string, string>>;
  concurrency1: boolean; // --test-concurrency=1
  paths: readonly string[];
}>;

// Secrets de TESTE (valores fixos, não-prod) — espelham o que os scripts inline criavam.
const TEST_SECRETS: Readonly<Record<string, string>> = {
  'secrets/mysql_root_password.txt': 'rootpw-migration-test-only',
  'secrets/mysql_app_password.txt': 'apppw-migration-test-only',
  'secrets/mysql_readonly_password.txt': 'ropw-migration-test-only',
};

const mysqlSuite = (env: Readonly<Record<string, string>>, paths: readonly string[]): Suite => ({
  services: ['mysql'],
  secrets: true,
  env,
  concurrency1: true,
  paths,
});

const SUITES: Readonly<Record<string, Suite>> = {
  contracts: mysqlSuite({ MYSQL_INTEGRATION: '1' }, [
    'tests/modules/contracts/adapters/persistence/migrations/*.test.ts',
    'tests/modules/contracts/adapters/persistence/mysql-driver.test.ts',
    'tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts',
    'tests/modules/contracts/adapters/persistence/contract-contractor-schema.mysql.test.ts',
    'tests/modules/contracts/adapters/persistence/contract-repository-paged.integration.test.ts',
    'tests/modules/contracts/adapters/persistence/outbox-schema.test.ts',
    'tests/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.test.ts',
    'tests/modules/contracts/adapters/persistence/repos/find-expirable.mysql.test.ts',
    'tests/modules/contracts/adapters/persistence/job-run.drizzle-mysql.test.ts',
    'tests/modules/contracts/worker/outbox-worker.integration.test.ts',
  ]),
  auth: mysqlSuite({ MYSQL_INTEGRATION: '1' }, [
    'tests/modules/auth/adapters/persistence/refresh-token-repository.drizzle.test.ts',
    'tests/modules/auth/adapters/persistence/user-repository.drizzle.test.ts',
    'tests/modules/auth/adapters/persistence/user-query.drizzle.test.ts',
    'tests/modules/auth/adapters/persistence/role-repository.drizzle.test.ts',
    'tests/modules/auth/adapters/persistence/schema-hardening.test.ts',
    'tests/modules/auth/public-api/auth-etl-port.integration.test.ts',
  ]),
  partners: mysqlSuite({ MYSQL_INTEGRATION: '1' }, [
    'tests/modules/partners/adapters/persistence/repos/financier-repository.drizzle.test.ts',
    'tests/modules/partners/adapters/persistence/repos/supplier-repository.drizzle.test.ts',
    'tests/modules/partners/adapters/persistence/outbox-repository.drizzle-mysql.test.ts',
    'tests/modules/partners/adapters/persistence/repos/collaborator-repository.drizzle.test.ts',
    'tests/modules/partners/adapters/persistence/repos/collaborator-invite-token-repository.drizzle.test.ts',
    'tests/modules/partners/adapters/persistence/repos/contract-count-store.drizzle.test.ts',
    'tests/modules/partners/adapters/persistence/repos/user-profile-repository.drizzle.test.ts',
    'tests/modules/partners/public-api/partners-etl-port.integration.test.ts',
    'tests/modules/partners/public-api/partners-etl-store-integrity.integration.test.ts',
    'tests/modules/partners/public-api/partners-read-port.integration.test.ts',
  ]),
  programs: mysqlSuite({ MYSQL_INTEGRATION: '1' }, [
    'tests/modules/programs/adapters/persistence/drizzle-mysql.test.ts',
    'tests/modules/programs/adapters/persistence/program-list-read.drizzle-mysql.test.ts',
  ]),
  financial: mysqlSuite({ MYSQL_INTEGRATION: '1' }, [
    'tests/modules/financial/adapters/persistence/document-repository.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/supplier-view-store.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/document-supplier-view-join.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/cedente-account-store.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/bank-statement-repository.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/reconciliation-repository.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/match-suggestion.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/manual-entry.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/reconciliation-period.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/category-read.drizzle-mysql.test.ts',
    'tests/modules/financial/adapters/persistence/cost-center-read.drizzle-mysql.test.ts',
    // #127 — outbox transacional do financial (atomicidade estado+evento)
    'tests/modules/financial/adapters/persistence/fin-outbox-schema.drizzle-mysql.test.ts',
    'tests/workers/supplier-view-projection/projection.integration.test.ts',
  ]),
  'etl:orchestrate': mysqlSuite({ PARTNERS_ETL_INTEGRATION: '1' }, [
    'tests/etl/orchestrate.integration.test.ts',
  ]),
  storage: {
    services: ['minio'],
    secrets: false,
    env: { STORAGE_INTEGRATION: '1' },
    concurrency1: false,
    paths: ['tests/modules/contracts/adapters/storage/s3.integration.test.ts'],
  },
  photo: {
    services: ['minio'],
    secrets: false,
    env: { STORAGE_INTEGRATION: '1' },
    concurrency1: false,
    paths: ['tests/modules/auth/adapters/storage/profile-photo-storage.s3.integration.test.ts'],
  },
  logo: {
    services: ['minio'],
    secrets: false,
    env: { STORAGE_INTEGRATION: '1' },
    concurrency1: false,
    paths: ['tests/modules/programs/adapters/storage/logo-storage.s3.integration.test.ts'],
  },
  infra: {
    services: [],
    secrets: false,
    env: { COMPOSE_INTEGRATION: '1' },
    concurrency1: true,
    paths: ['tests/infra/mysql-compose.test.ts'],
  },
  notifications: {
    services: [],
    secrets: false,
    env: { NOTIFICATIONS_INTEGRATION: '1' },
    concurrency1: false,
    paths: ['tests/modules/notifications/**/*.test.ts'],
  },
  etl: {
    services: [],
    secrets: false,
    env: { PARTNERS_ETL_INTEGRATION: '1' },
    concurrency1: false,
    paths: ['tests/etl/legacy/reader.integration.test.ts'],
  },
};

const writeTestSecrets = (): void => {
  mkdirSync('secrets', { recursive: true });
  for (const [path, value] of Object.entries(TEST_SECRETS)) {
    writeFileSync(path, value);
    chmodSync(path, 0o644);
  }
};

const removeTestSecrets = (): void => {
  for (const path of Object.keys(TEST_SECRETS)) {
    rmSync(path, { force: true });
  }
};

const dockerUp = (services: readonly string[]): number =>
  spawnSync('docker', ['compose', 'up', '-d', ...services, '--wait'], { stdio: 'inherit' })
    .status ?? 1;

const dockerDown = (): void => {
  spawnSync('docker', ['compose', 'down', '-v'], { stdio: 'ignore' });
};

const runNodeTest = (suite: Suite): number => {
  const flags = [
    '--test',
    ...(suite.concurrency1 ? ['--test-concurrency=1'] : []),
    '--experimental-strip-types',
    '--enable-source-maps',
    '--no-warnings',
  ];
  return (
    spawnSync('node', [...flags, ...suite.paths], {
      stdio: 'inherit',
      env: { ...process.env, ...suite.env },
    }).status ?? 1
  );
};

const main = (): number => {
  const name = process.argv[2];
  const suite = name === undefined ? undefined : SUITES[name];
  if (suite === undefined) {
    process.stderr.write(
      `uso: node scripts/ci/test-integration.ts <suite>\nsuites: ${Object.keys(SUITES).join(', ')}\n`,
    );
    return EX_USAGE;
  }

  if (suite.secrets) writeTestSecrets();
  try {
    if (suite.services.length > 0) {
      const up = dockerUp(suite.services);
      if (up !== 0) return up;
    }
    return runNodeTest(suite);
  } finally {
    if (suite.services.length > 0) dockerDown();
    if (suite.secrets) removeTestSecrets();
  }
};

process.exitCode = main();
