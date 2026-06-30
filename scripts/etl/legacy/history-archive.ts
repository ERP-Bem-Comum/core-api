/**
 * history-archive.ts — D11: exporta `collaborator_history` para cold storage `.jsonl`.
 *
 * `collaborator_history` fica FORA do MVP da ETL (sem tabela-alvo). Em vez de migrar ou
 * descartar, exportamos as linhas para um `.jsonl` auditável (fora do git via `.gitignore`),
 * fonte para um futuro ticket de `par_collaborator_history`.
 */

import type { RowDataPacket } from 'mysql2/promise';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { connectReadonly } from './connect.ts';

/** Exporta `collaborator_history` para `outPath` (.jsonl). Retorna a contagem exportada. */
export const archiveCollaboratorHistory = async (outPath: string): Promise<number> => {
  const conn = await connectReadonly();
  try {
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM `collaborator_history`');
    await mkdir(dirname(outPath), { recursive: true });
    const jsonl = rows.map((r) => JSON.stringify(r)).join('\n');
    await writeFile(outPath, rows.length > 0 ? `${jsonl}\n` : '', 'utf8');
    return rows.length;
  } finally {
    await conn.end().catch(() => {
      /* fechamento best-effort */
    });
  }
};
