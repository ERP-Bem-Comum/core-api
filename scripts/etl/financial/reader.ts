/**
 * reader.ts — leitura financeira do MySQL efêmero (ETL-FINANCIAL-WRITER).
 *
 * Lê `accounts`/`payables`/`approvals` + `collaborators`/`users` (estes dois APENAS
 * para o join determinístico do aprovador — D11/F1: `approvals.userId` é NULL em
 * 100% do dump; a identidade vem de `collaboratorId → email → users`).
 */

import type { RowDataPacket } from 'mysql2/promise';
import { connectReadonly } from '../legacy/connect.ts';
import { decodeAll, type TableRead } from '../legacy/reader.ts';
import {
  decodeAccountRow,
  decodePayableRow,
  decodeApprovalRow,
  decodeCollaboratorRow,
  decodeUserRow,
  decodeCategorizationRow,
  decodeInstallmentRow,
} from '../legacy/decode.ts';
import type {
  LegacyAccountRow,
  LegacyPayableRow,
  LegacyApprovalRow,
  LegacyCollaboratorRow,
  LegacyUserRow,
  LegacyCategorizationRow,
  LegacyInstallmentRow,
} from '../legacy/rows.ts';

export type LegacyFinancialData = Readonly<{
  accounts: TableRead<LegacyAccountRow>;
  payables: TableRead<LegacyPayableRow>;
  approvals: TableRead<LegacyApprovalRow>;
  collaborators: TableRead<LegacyCollaboratorRow>;
  users: TableRead<LegacyUserRow>;
  // Extras do artefato (W2 issue 2): preservados no de-para, nunca descartados em silêncio.
  categorization: TableRead<LegacyCategorizationRow>;
  installments: TableRead<LegacyInstallmentRow>;
}>;

/** Conecta como SELECT-only, lê as 7 tabelas e decodifica. `end()` garantido. */
export const readLegacyFinancialData = async (): Promise<LegacyFinancialData> => {
  const conn = await connectReadonly();
  try {
    const select = async (table: string): Promise<readonly Readonly<Record<string, unknown>>[]> => {
      const [raws] = await conn.query<RowDataPacket[]>(`SELECT * FROM \`${table}\``);
      return raws;
    };
    return {
      accounts: decodeAll(await select('accounts'), decodeAccountRow),
      payables: decodeAll(await select('payables'), decodePayableRow),
      approvals: decodeAll(await select('approvals'), decodeApprovalRow),
      collaborators: decodeAll(await select('collaborators'), decodeCollaboratorRow),
      users: decodeAll(await select('users'), decodeUserRow),
      categorization: decodeAll(await select('categorization'), decodeCategorizationRow),
      installments: decodeAll(await select('installments'), decodeInstallmentRow),
    };
  } finally {
    await conn.end().catch(() => {
      /* fechamento best-effort */
    });
  }
};
