/**
 * Conexão SELECT-only ao MySQL efêmero do ETL (`etl_ro`, native auth, localhost).
 * Compartilhada por `reader.ts` e `history-archive.ts`.
 */

import { createConnection, type Connection } from 'mysql2/promise';
import { READONLY_USER, READONLY_PW, LEGACY_DB } from './restore.ts';

export const connectReadonly = async (): Promise<Connection> =>
  createConnection({
    host: '127.0.0.1',
    port: Number(process.env['ETL_MYSQL_PORT'] ?? 3309),
    user: READONLY_USER,
    password: READONLY_PW,
    database: LEGACY_DB,
    multipleStatements: false,
    dateStrings: false,
    timezone: 'Z',
    decimalNumbers: false,
  });
