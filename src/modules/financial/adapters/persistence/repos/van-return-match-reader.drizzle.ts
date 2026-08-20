// Adapter Drizzle do lookup de casamento do retorno (#690).
//
// JOIN de `fin_remittance_documents` com `fin_remittances` para trazer, junto do vínculo, o nome do
// arquivo de remessa — é o que permite dizer ao operador de QUAL envio aquele retorno veio, em vez
// de só devolver dois UUIDs.
//
// Boundary: todo try/catch converte para Result; nenhum Error cruza a borda
//   (.claude/rules/adapters.md §"converter para Result na borda").

import { eq, inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  RemittanceDocumentRef,
  VanReturnMatchError,
  VanReturnMatchReader,
} from '#src/modules/financial/application/ports/van-return-match-reader.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finRemittanceDocuments, finRemittances } from '../schemas/mysql.ts';

const logReader = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-van-return-match] ${op} failed: ${String(cause)}\n`);
};

/**
 * Teto de chaves por consulta.
 *
 * Um retorno de dia cheio traz centenas de registros, e um `IN` com todas elas de uma vez cresce o
 * texto do statement sem teto — o `max_allowed_packet` do MySQL é um limite real, e estourá-lo
 * falha a consulta inteira em vez de degradar. Fatiar é mais barato que descobrir esse limite em
 * produção, num dia de movimento.
 */
const CHUNK = 500;

const chunked = <T>(items: readonly T[], size: number): readonly (readonly T[])[] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push([...items.slice(i, i + size)]);
  return out;
};

export const createDrizzleVanReturnMatchReader = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): VanReturnMatchReader => {
  const { db } = handle;

  return {
    findByYourNumbers: async (
      yourNumbers,
    ): Promise<Result<readonly RemittanceDocumentRef[], VanReturnMatchError>> => {
      // `inArray` com lista vazia produz SQL degenerado; e não há o que perguntar ao banco quando
      // não há chave. Sair aqui é correção, não otimização.
      if (yourNumbers.length === 0) return ok([]);

      try {
        const found: RemittanceDocumentRef[] = [];

        for (const chunk of chunked(yourNumbers, CHUNK)) {
          const rows = await db
            .select({
              yourNumber: finRemittanceDocuments.yourNumber,
              remittanceId: finRemittanceDocuments.remittanceId,
              documentId: finRemittanceDocuments.documentId,
              fileName: finRemittances.fileName,
            })
            .from(finRemittanceDocuments)
            .innerJoin(finRemittances, eq(finRemittances.id, finRemittanceDocuments.remittanceId))
            .where(inArray(finRemittanceDocuments.yourNumber, [...chunk]));

          found.push(...rows);
        }

        return ok(found);
      } catch (cause) {
        logReader('findByYourNumbers', cause);
        return err('van-return-match-unavailable');
      }
    },
  };
};
