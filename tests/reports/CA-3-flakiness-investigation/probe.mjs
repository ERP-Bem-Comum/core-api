import { createConnection } from 'mysql2/promise';
const start = Date.now();
try {
  const conn = await createConnection('mysql://core_app:apppw-migration-test-only@127.0.0.1:3306/core');
  const [rows] = await conn.query('SELECT 1 AS ok');
  console.log(`OK ${Date.now() - start}ms`, JSON.stringify(rows));
  await conn.end();
  process.exit(0);
} catch (e) {
  console.error(`FAIL ${Date.now() - start}ms`, e.code || e.message);
  process.exit(1);
}
