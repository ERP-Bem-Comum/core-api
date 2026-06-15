// Implementação Drizzle do DocumentRepository (módulo Financial).
//
// Padrão: espelha `contracts/adapters/persistence/repos/contract-repository.drizzle.ts`.
// Port implementado: `domain/document/repository.ts` § DocumentRepository.
//
// Decisões de implementação:
//
// Upsert via SELECT-then-UPDATE-or-INSERT (ADR-0020 §"Padrão de upsert"):
//   INSERT...ON DUPLICATE KEY UPDATE (ODKU) é proibido sem ADR nesta camada —
//   ele atua em QUALQUER UNIQUE violada, podendo sobrescrever rows alheias
//   silenciosamente (Refman §13.2.6.2). O padrão SELECT-then-UPDATE-or-INSERT
//   com `.for('update')` serializa escritas concorrentes via next-key lock (Refman §15.7).
//
// Optimistic lock (R5 do spec, data-model.md §"Optimistic lock"):
//   UPDATE WHERE id=? AND version=?  →  version = version + 1.
//   Se 0 rows afetadas: outra tx ganhou a corrida → err('document-repository-failure').
//   O `version` atual é lido no mesmo SELECT FOR UPDATE do upsert (sem extra round-trip).
//
// Transação única para todo o boundary (ADR-0015 + Evans §"AGGREGATE BOUNDARY"):
//   save() abre UMA transação que persiste:
//     1. fin_documents (INSERT ou UPDATE com version check)
//     2. DELETE + INSERT em lote de fin_payables    (hard replace — R8.1)
//     3. DELETE + INSERT em lote de fin_retentions  (hard replace)
//     4. DELETE + INSERT em lote de fin_registered_taxes (hard replace)
//   Rollback automático se qualquer operação falhar (Drizzle garante).
//
// delete() usa DELETE FROM fin_documents — ON DELETE CASCADE remove automaticamente
//   fin_payables, fin_retentions e fin_registered_taxes (schema.ts §"FK ON DELETE CASCADE").
//
// findById() faz 1+3 queries (documento + 3 tabelas filhas) para evitar produto
//   cartesiano com LEFT JOINs em tabelas 1-N independentes.
//
// Boundary: todo try/catch converte para Result. Nenhum Error cruza a borda
//   (.claude/rules/adapters.md §"converter para Result na borda").

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
  StoredDocument,
} from '../../../domain/document/repository.ts';
import type { DocumentId } from '../../../domain/shared/document-id.ts';
import type { FinancialMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  mapRowToDocument,
  mapPayableRows,
  mapDocumentToRow,
  mapPayablesToRows,
  mapRetentionsToRows,
  mapRegisteredTaxesToRows,
} from '../mappers/document.mapper.ts';

// Wrapper de segurança: captura qualquer exceção de I/O ou violação de
// constraint (mysql2 lança ER_DUP_ENTRY, ER_DATA_TOO_LONG etc.) e converte
// para `document-repository-failure`. O erro original é gravado em stderr
// para diagnóstico sem expor para a camada de aplicação.
const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, DocumentRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[document-repo:${ctx}] ${String(cause)}\n`);
    return err('document-repository-failure');
  }
};

// `MySql2Database` expõe interface mutável internamente. Handle é read-only
// do ponto de vista deste módulo — não mutamos o objeto em si.
export const createDrizzleDocumentRepository = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): DocumentRepository => {
  const { db, schema } = handle;

  // ─── findById ──────────────────────────────────────────────────────────────
  //
  // 1+3 queries (documento + 3 filhas) para evitar produto cartesiano.
  // Dois códigos de erro distintos:
  //   - 'document-not-found'      → registro inexistente (semântica de domínio)
  //   - 'document-repository-failure' → falha de infra ou corrupção de row
  // O try/catch aqui é deliberado: captura exceções de I/O sem sobrescrever
  // o 'document-not-found' que é retorno semântico (não exceção).
  const findById = async (
    id: DocumentId,
  ): Promise<Result<StoredDocument, DocumentRepositoryError>> => {
    try {
      const docRows = await db
        .select()
        .from(schema.finDocuments)
        .where(eq(schema.finDocuments.id, id as unknown as string))
        .limit(1);

      const docRow = docRows[0];
      if (docRow === undefined) return err('document-not-found');

      // Lê tabelas filhas em paralelo (3 round-trips independentes).
      const [retentionRows, registeredTaxRows, payableRows] = await Promise.all([
        db
          .select()
          .from(schema.finRetentions)
          .where(eq(schema.finRetentions.documentId, id as unknown as string)),
        db
          .select()
          .from(schema.finRegisteredTaxes)
          .where(eq(schema.finRegisteredTaxes.documentId, id as unknown as string)),
        db
          .select()
          .from(schema.finPayables)
          .where(eq(schema.finPayables.documentId, id as unknown as string)),
      ]);

      // Mapper: row → domínio. Erros de corrupção viram 'document-repository-failure'.
      const documentR = mapRowToDocument({ documentRow: docRow, retentionRows, registeredTaxRows });
      if (!documentR.ok) {
        process.stderr.write(`[document-repo:findById:mapper] ${documentR.error}\n`);
        return err('document-repository-failure');
      }

      const payablesR = mapPayableRows(payableRows);
      if (!payablesR.ok) {
        process.stderr.write(`[document-repo:findById:payable-mapper] ${payablesR.error}\n`);
        return err('document-repository-failure');
      }

      return ok({ document: documentR.value, payables: payablesR.value });
    } catch (cause) {
      process.stderr.write(`[document-repo:findById] ${String(cause)}\n`);
      return err('document-repository-failure');
    }
  };

  // ─── save ──────────────────────────────────────────────────────────────────
  //
  // Transação única: documento + tabelas filhas (hard replace).
  // Optimistic lock (R5): SELECT FOR UPDATE lê o `version` atual;
  // UPDATE WHERE version=? falha se outra tx incrementou.
  const save = async (aggregate: StoredDocument): Promise<Result<void, DocumentRepositoryError>> =>
    safe('save', async () => {
      const { document, payables } = aggregate;
      const documentId = document.id as unknown as string;

      await db.transaction(async (tx) => {
        // 1. SELECT FOR UPDATE — adquire next-key lock na PK, serializa escritas
        //    concorrentes e lê o `version` atual para o optimistic lock (R5).
        //    Refman MySQL 8.4 §15.7: SELECT...FOR UPDATE adquire lock exclusivo.
        const existing = await tx
          .select({ version: schema.finDocuments.version })
          .from(schema.finDocuments)
          .where(eq(schema.finDocuments.id, documentId))
          .for('update');

        const currentVersion = existing[0]?.version;

        if (currentVersion === undefined) {
          // INSERT: documento novo. version = 0 (default do schema).
          const row = mapDocumentToRow(document, 0);
          await tx.insert(schema.finDocuments).values(row);
        } else {
          // UPDATE com optimistic lock: WHERE id=? AND version=currentVersion.
          // Se 0 rows afetadas, outra tx ganhou a corrida → erro de conflito.
          const nextVersion = currentVersion + 1;
          const row = mapDocumentToRow(document, nextVersion);
          const result = await tx
            .update(schema.finDocuments)
            .set(row)
            .where(eq(schema.finDocuments.id, documentId));

          // mysql2 retorna `affectedRows` no ResultSetHeader. Drizzle expõe como
          // array [ResultSetHeader, ...]. Verificamos se ao menos 1 row foi afetada.
          // Se 0 rows afetadas, outra transação incrementou a versão antes de nós.
          const affectedRows = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows;
          if (affectedRows === 0) {
            throw new Error(
              `optimistic-lock-conflict:${documentId}:expected-version:${currentVersion}`,
            );
          }
        }

        // 2. Hard replace de tabelas filhas (R8.1: ajuste recria payables inteiros).
        //    DELETE primeiro (CASCADE não é necessário aqui — fazemos explicitamente
        //    para garantir que o INSERT em lote subsequente não colida em PK).
        await tx.delete(schema.finPayables).where(eq(schema.finPayables.documentId, documentId));
        await tx
          .delete(schema.finRetentions)
          .where(eq(schema.finRetentions.documentId, documentId));
        await tx
          .delete(schema.finRegisteredTaxes)
          .where(eq(schema.finRegisteredTaxes.documentId, documentId));

        // 3. INSERT em lote de filhos (1 round-trip por tabela; skip se vazio).
        //    mysql2 lança se `values([])` for chamado com array vazio.
        if (payables !== null) {
          const payableRows = mapPayablesToRows(payables, documentId);
          if (payableRows.length > 0) {
            await tx.insert(schema.finPayables).values([...payableRows]);
          }
        }

        // Retenções vêm do documento (campo `retentions` em DocumentCore e DraftDocument).
        const retentions = document.status === 'Draft' ? document.retentions : document.retentions;
        if (retentions.length > 0) {
          const retentionRows = mapRetentionsToRows(retentions, documentId);
          await tx.insert(schema.finRetentions).values([...retentionRows]);
        }

        // Impostos registrados.
        const registeredTaxes =
          document.status === 'Draft' ? document.registeredTaxes : document.registeredTaxes;
        if (registeredTaxes.length > 0) {
          const taxRows = mapRegisteredTaxesToRows(registeredTaxes, documentId);
          await tx.insert(schema.finRegisteredTaxes).values([...taxRows]);
        }
      });
    });

  // ─── delete ────────────────────────────────────────────────────────────────
  //
  // Hard delete do documento raiz. As filhas (payables, retentions, registered_taxes)
  // são removidas automaticamente via ON DELETE CASCADE (schema.ts §"FK ON DELETE CASCADE").
  // ADR-0002 (Evans) + data-model.md: "A delete operation must remove everything
  // within the AGGREGATE boundary at once."
  const deleteDoc = async (id: DocumentId): Promise<Result<void, DocumentRepositoryError>> =>
    safe('delete', async () => {
      await db
        .delete(schema.finDocuments)
        .where(eq(schema.finDocuments.id, id as unknown as string));
    });

  return {
    // findById tem seu próprio try/catch interno que preserva 'document-not-found'
    // como retorno semântico (não convertido para 'document-repository-failure').
    findById,

    save,

    delete: deleteDoc,
  };
};
