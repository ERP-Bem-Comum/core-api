/**
 * AUTH-JWT-KEY-BOOT-GUARD (#515) — contrato de BOOT do `src/server.ts`.
 *
 * O teste de unidade (`tests/modules/auth/adapters/http/jwt-key-config.test.ts`) prova a REGRA.
 * Este prova o CONTRATO com a plataforma de deploy: código de saída 78 (EX_CONFIG), o stderr
 * nomeia a variável, e o processo ENCERRA — se a porta tivesse aberto, ele não encerraria.
 *
 * Molde: `tests/jobs/auth/sync-permissions-run.test.ts` — `spawn` em vez de `execFile`
 * promisificado, porque aqui o exit != 0 é o resultado ESPERADO, não uma exceção a capturar.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { mysqlTestConnectionString } from '../support/mysql-conn.ts';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..');
const SERVER = resolve(REPO_ROOT, 'src', 'server.ts');
const EX_CONFIG = 78;

/** Teto de espera: se o boot não encerrar, é porque a porta abriu — o teste deve reprovar. */
const BOOT_TIMEOUT_MS = 20_000;

/**
 * Os 7 módulos configurados e as 3 base URLs de e-mail presentes, para que o boot ULTRAPASSE os
 * dois guards anteriores e alcance o de chave. Sem isso o processo sairia 78 pelo motivo errado e o
 * teste seria um falso-verde.
 *
 * ⚠️ Este fixture declarava `driver: 'memory'` até o **ADR-0068**, que retirou `memory` do domínio
 * de `X_DRIVER` — o boot passou a sair 78 na guarda de persistência, antes de olhar a chave, e o
 * caso virou falso-VERMELHO. Agora declara `mysql` com endereço sintético, e isso é suficiente:
 * `readModuleDriverConfigs` valida PRESENÇA, e o primeiro `connect` só acontece em
 * `buildAuthHttpDeps` (`server.ts:178`), depois do guard que este arquivo mede. O banco não precisa
 * existir; se um dia o boot passar a conectar mais cedo, é este comentário que explica o vermelho.
 */
// Pelo helper, e não por literal: `tests/cleanup/mysql-test-port-single-source.test.ts` cobra que
// nenhum teste fixe host:porta do MySQL por conta própria. O banco não precisa existir — o que
// importa é a URL estar PRESENTE, porque é só isso que a guarda de persistência verifica.
const DB_SINTETICO = mysqlTestConnectionString({ database: 'core_boot_guard' });

const PROD_ENV_SEM_CHAVE: Readonly<Record<string, string>> = {
  NODE_ENV: 'production',
  AUTH_DRIVER: 'mysql',
  AUTH_DATABASE_URL: DB_SINTETICO,
  CONTRACTS_DRIVER: 'mysql',
  CONTRACTS_DATABASE_URL: DB_SINTETICO,
  PARTNERS_DRIVER: 'mysql',
  PARTNERS_DATABASE_URL: DB_SINTETICO,
  PROGRAMS_DRIVER: 'mysql',
  PROGRAMS_DATABASE_URL: DB_SINTETICO,
  FINANCIAL_DRIVER: 'mysql',
  FINANCIAL_DATABASE_URL: DB_SINTETICO,
  BUDGET_PLANS_DRIVER: 'mysql',
  BUDGET_PLANS_DATABASE_URL: DB_SINTETICO,
  REPORTS_DRIVER: 'mysql',
  AUTH_RESET_BASE_URL: 'https://app.example.org/reset-password',
  AUTH_ACTIVATION_BASE_URL: 'https://app.example.org/activate',
  PARTNERS_SELF_REGISTRATION_BASE_URL: 'https://app.example.org/self-registration',
};

type BootResult = Readonly<{ code: number | null; signal: NodeJS.Signals | null; stderr: string }>;

/**
 * Env mínima e explícita: herdar `process.env` vazaria uma `AUTH_JWT_*` da máquina do dev e o
 * teste passaria a depender do ambiente.
 */
const bootServer = (env: Readonly<Record<string, string>>): Promise<BootResult> =>
  new Promise((resolvePromise) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', SERVER], {
      cwd: REPO_ROOT,
      env: { PATH: process.env['PATH'] ?? '', ...env },
    });

    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.stdout.resume(); // descarta stdout sem acumular

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, BOOT_TIMEOUT_MS);

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolvePromise({ code, signal, stderr });
    });
  });

describe('AUTH-JWT-KEY-BOOT-GUARD — contrato de boot do servidor (#515)', () => {
  it(
    'CA1 — producao sem AUTH_JWT_*: encerra com 78, stderr nomeia a variavel, porta nao abre',
    { timeout: BOOT_TIMEOUT_MS + 10_000 },
    async () => {
      const { code, signal, stderr } = await bootServer(PROD_ENV_SEM_CHAVE);

      assert.notEqual(
        signal,
        'SIGKILL',
        'o processo nao encerrou sozinho — a porta abriu apesar da chave ausente',
      );
      assert.equal(
        code,
        EX_CONFIG,
        `esperado ${EX_CONFIG} (EX_CONFIG), veio ${String(code)}. stderr: ${stderr}`,
      );
      assert.match(stderr, /AUTH_JWT_PRIVATE_KEY/, 'o operador precisa ler QUAL variavel falta');
    },
  );

  it(
    'CA3 — producao com chave malformada: encerra com 78, nao com 1 (falha generica)',
    { timeout: BOOT_TIMEOUT_MS + 10_000 },
    async () => {
      // Hoje a excecao de `importPKCS8` sobe ate `main().catch` e sai com 1 — a plataforma de
      // deploy nao consegue distinguir "configuracao errada" de "aplicacao quebrada".
      const { code, stderr } = await bootServer({
        ...PROD_ENV_SEM_CHAVE,
        AUTH_JWT_PRIVATE_KEY: 'nao-e-pem',
        AUTH_JWT_PUBLIC_KEY: 'nao-e-pem',
      });

      assert.equal(
        code,
        EX_CONFIG,
        `esperado ${EX_CONFIG} (EX_CONFIG), veio ${String(code)}. stderr: ${stderr}`,
      );
    },
  );
});
