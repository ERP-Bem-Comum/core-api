/**
 * reader.ts — leitura de `contracts` + `programs` do MySQL efêmero (ETL-CONTRACTS-WRITER).
 *
 * Mesmo padrão do `legacy/reader.ts` (conexão `etl_ro` SELECT-only, decode linha a linha,
 * falha de decode vira quarentena com legacy id). Separado do `readLegacyData` para não
 * acoplar o ETL de parceiros ao de contratos (cada writer lê só o que consome).
 */

import type { RowDataPacket } from 'mysql2/promise';
import { connectReadonly } from '../legacy/connect.ts';
import { decodeAll, type TableRead } from '../legacy/reader.ts';
import { decodeContractRow, decodeProgramRow } from '../legacy/decode.ts';
import type { LegacyContractRow, LegacyProgramRow } from '../legacy/rows.ts';

export type LegacyContractsData = Readonly<{
  contracts: TableRead<LegacyContractRow>;
  programs: TableRead<LegacyProgramRow>;
}>;

/** Conecta como SELECT-only, lê contratos + programas e decodifica. `end()` garantido. */
export const readLegacyContractsData = async (): Promise<LegacyContractsData> => {
  const conn = await connectReadonly();
  try {
    const select = async (table: string): Promise<readonly Readonly<Record<string, unknown>>[]> => {
      const [raws] = await conn.query<RowDataPacket[]>(`SELECT * FROM \`${table}\``);
      return raws;
    };
    return {
      contracts: decodeAll(await select('contracts'), decodeContractRow),
      programs: decodeAll(await select('programs'), decodeProgramRow),
    };
  } finally {
    await conn.end().catch(() => {
      /* fechamento best-effort */
    });
  }
};
