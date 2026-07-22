/**
 * Carrega uma fixture `.sql` num MySQL apontado por `connectionString`, SEM Docker
 * (ETL-LEGACY-DIRECT-CONNECTION). Substitui o antigo restore via `docker exec mysql < dump`.
 *
 * Reseta o database (DROP + CREATE) para ser idempotente entre arquivos de teste e re-runs —
 * a fixture sintética não traz DROP/CREATE DATABASE. Conecta ao servidor SEM selecionar o DB
 * (ele pode não existir ainda), recria-o e roda o SQL. Só para uso em teste; exige um user com
 * privilégio de DROP/CREATE DATABASE (root no CI).
 */

import { readFile } from 'node:fs/promises';
import { createConnection } from 'mysql2/promise';

// `allowPublicKeyRetrieval` é opção válida do mysql2 em runtime, mas não está no tipo
// `ConnectionOptions` — como em connect.ts, passamos via objeto TIPADO (não-fresh) para
// escapar do excess-property check.
type AdminConnectOptions = Readonly<{
  host: string;
  port: number;
  user: string;
  password: string;
  multipleStatements: true;
  allowPublicKeyRetrieval: true;
}>;

export const loadLegacyFixture = async (
  connectionString: string,
  fixturePath: string,
): Promise<void> => {
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'legacy';
  const sql = await readFile(fixturePath, 'utf8');

  const config: AdminConnectOptions = {
    host: url.hostname,
    port: url.port === '' ? 3306 : Number(url.port),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    multipleStatements: true,
    allowPublicKeyRetrieval: true,
  };
  const admin = await createConnection(config);
  try {
    await admin.query(
      `DROP DATABASE IF EXISTS \`${database}\`; CREATE DATABASE \`${database}\`; USE \`${database}\`;`,
    );
    await admin.query(sql);
  } finally {
    await admin.end();
  }
};
