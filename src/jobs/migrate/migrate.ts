// Orquestrador puro do job `migrate` (CORE-MIGRATE-JOB).
//
// Recebe a lista de migradores de módulo + a connection string e aplica em ordem
// determinística, FAIL-FAST: para na 1ª falha (o schema é pré-condição — não faz
// sentido seguir migrando se um módulo falhou). Sem I/O direto → testável sem DB.
//
// Cada migrador é uma porta pública de módulo (`<m>/public-api/migrate.ts`). O erro
// de driver (string literal union por módulo) é assignável a `string` aqui — o
// orquestrador é genérico sobre os 6 erros distintos.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';

export type ModuleMigrator = Readonly<{
  module: string;
  apply: (connectionString: string) => Promise<Result<true, string>>;
}>;

export type MigrateFailure = Readonly<{ module: string; error: string }>;

export const runMigrations = async (
  migrators: readonly ModuleMigrator[],
  connectionString: string,
  // Observabilidade: chamado por módulo migrado com sucesso, na ordem. Permite
  // ao run.ts logar progresso — num fail-fast no k-ésimo módulo, o operador sabe
  // quais já passaram sem vasculhar os logs dos drivers.
  onMigrated?: (module: string) => void,
): Promise<Result<readonly string[], MigrateFailure>> => {
  const migrated: string[] = [];
  for (const migrator of migrators) {
    const r = await migrator.apply(connectionString);
    if (!r.ok) return err({ module: migrator.module, error: r.error });
    migrated.push(migrator.module);
    onMigrated?.(migrator.module);
  }
  return ok(migrated);
};
