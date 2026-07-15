// Entrypoint one-shot do job `auth:sync-permissions` (#462) — reconcilia o catálogo de permissões
// (código) com o banco, no deploy.
//
// Mora em `src/jobs/` porque é o que vai para a imagem: o `seed:admin`, que já fazia isso, vive em
// `scripts/` — não copiado pelo Dockerfile — e por isso nunca rodou em ambiente provisionado.
//
// Espelha `src/jobs/migrate/run.ts`: valida env → sincroniza → sai; `process.exitCode` (não
// `process.exit`) para deixar o event loop esvaziar.
//
// Ordem esperada no deploy: `migrate` (schema) → este (dados do RBAC) → http/workers.
//
// Exit codes (sysexits.h): 0 sucesso/idempotente · 78 EX_CONFIG · 1 runtime.

import process from 'node:process';

import { readSyncPermissionsConfig } from './config.ts';
import {
  syncPermissionCatalog,
  ADMIN_ROLE_NAME,
} from '#src/modules/auth/public-api/sync-permissions.ts';

const EX_CONFIG = 78; // sysexits.h — configuração inválida.

const main = async (): Promise<number> => {
  const configR = readSyncPermissionsConfig(process.env);
  if (!configR.ok) {
    process.stderr.write(
      `[auth:sync-permissions] configuração inválida: ${configR.error} (defina AUTH_DATABASE_URL)\n`,
    );
    return EX_CONFIG;
  }

  const r = await syncPermissionCatalog(configR.value.connectionString);
  if (!r.ok) {
    process.stderr.write(`[auth:sync-permissions] falha ao sincronizar: ${r.error}\n`);
    return 1;
  }

  // Linha de resultado consumível — stdout para pipes/observabilidade. O total é o que permite
  // ao operador comparar ambiente × catálogo sem abrir o banco (o drift do #462 era invisível).
  const { permissionsTotal, roleId, roleCreated } = r.value;
  process.stdout.write(
    `[auth:sync-permissions] ok: ${permissionsTotal} permissões em '${ADMIN_ROLE_NAME}' ` +
      `(role ${roleId}, ${roleCreated ? 'criada' : 'reconciliada'})\n`,
  );
  return 0;
};

// Defesa de segunda camada: rejeição inesperada no main() não deixa o processo travado sem
// exitCode definido.
await main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((cause: unknown) => {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[auth:sync-permissions] rejeição não tratada no main: ${detail}\n`);
    process.exitCode = 1;
  });
