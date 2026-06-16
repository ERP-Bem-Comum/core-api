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

import { and, asc, count, eq, gte, lte } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import * as Money from '../../../../../shared/kernel/money.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
  StoredDocument,
} from '../../../domain/document/repository.ts';
import type { DocumentId } from '../../../domain/shared/document-id.ts';
import type { DocumentListFilter, DocumentListItem, Page } from '../../../domain/document/query.ts';
import type { DocumentStatus, DocumentType } from '../../../domain/document/types.ts';
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
          const affectedRows = (result as unknown as [{ affectedRows: number }])[0].affectedRows;
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

  // ─── findPaged ─────────────────────────────────────────────────────────────
  //
  // Read-model leve (US1 — FR-004): lê APENAS fin_documents (sem tabelas filhas),
  // retornando Page<DocumentListItem> com `total` filtrado e `items` paginados.
  //
  // Índice utilizado: `fin_documents_due_date_idx` (schema.ts §"Índices") cobre
  // ORDER BY dueDate ASC — ordenação determinística escolhida por ser o campo de
  // maior relevância funcional (agenda de vencimentos) e por já ter índice explícito.
  // Rows com dueDate NULL (Drafts) aparecem primeiro no ASC — comportamento MySQL 8.4
  // (Refman §11.4.2: "NULL values are considered lower than any non-NULL value").
  //
  // Filtros combinados via and(...) (operators.mdx §"and"):
  //   status   → eq   (fin_documents_status_idx cobre)
  //   supplierRef → eq (fin_documents_supplier_ref_idx cobre)
  //   type     → eq   (sem índice; seletividade baixa no modelo atual)
  //   dueFrom  → gte  (fin_documents_due_date_idx cobre range)
  //   dueTo    → lte  (idem)
  //
  // `total`: COUNT(*) com o MESMO WHERE antes do LIMIT/OFFSET — select.mdx §"count":
  //   `await db.select({ value: count() }).from(users)` retorna number diretamente.
  //   Não usa cast manual (count() do drizzle-orm já mapeia para number).
  //
  // Mapper inline: evita dependência de função de mapper dedicada para read-model
  // leve. netValue NULL → null; netValue número → Money.fromCents(). Falha no
  // fromCents = corrupção de row → err('document-repository-failure').
  // status/type são cast seguros: CHECK de banco garante o conjunto válido.
  const findPaged = async (
    filter: DocumentListFilter,
    page: number,
    pageSize: number,
  ): Promise<Result<Page<DocumentListItem>, DocumentRepositoryError>> =>
    safe('findPaged', async () => {
      const { finDocuments } = schema;

      // Constrói predicados condicionalmente — filtros ausentes não entram no WHERE.
      // and() com array vazio emite WHERE sem condições (SELECT all), que é o comportamento
      // correto para listagem sem filtro. (operators.mdx §"and")
      const conditions = [
        filter.status !== undefined ? eq(finDocuments.status, filter.status) : undefined,
        filter.supplierRef !== undefined
          ? eq(finDocuments.supplierRef, filter.supplierRef)
          : undefined,
        filter.type !== undefined ? eq(finDocuments.type, filter.type) : undefined,
        filter.dueFrom !== undefined ? gte(finDocuments.dueDate, filter.dueFrom) : undefined,
        filter.dueTo !== undefined ? lte(finDocuments.dueDate, filter.dueTo) : undefined,
      ].filter((c): c is NonNullable<typeof c> => c !== undefined);

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // 1. COUNT(*) com o mesmo WHERE — retorna { value: number }[].
      //    select.mdx §"count": `count()` importado de drizzle-orm retorna number sem cast.
      const countRows = await db.select({ value: count() }).from(finDocuments).where(whereClause);

      const total = countRows[0]?.value ?? 0;

      // Conjunto vazio → retornar imediatamente sem fazer a query de items.
      if (total === 0) {
        return { items: [], page, pageSize, total: 0 };
      }

      // 2. SELECT read-model com LIMIT/OFFSET.
      //    Ordenação determinística por dueDate ASC (fin_documents_due_date_idx).
      //    Colunas: apenas as necessárias para DocumentListItem (sem gross_value,
      //    retentions, payables, version etc — evita overfetch).
      const rows = await db
        .select({
          id: finDocuments.id,
          status: finDocuments.status,
          documentNumber: finDocuments.documentNumber,
          type: finDocuments.type,
          supplierRef: finDocuments.supplierRef,
          netValue: finDocuments.netValue,
          dueDate: finDocuments.dueDate,
        })
        .from(finDocuments)
        .where(whereClause)
        .orderBy(asc(finDocuments.dueDate))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      // 3. Mapper inline: row → DocumentListItem.
      //    netValue: bigint(mode:'number') chega como number | null.
      //    status/type: varchar com CHECK — cast seguro para os tipos de domínio.
      //    documentNumber/supplierRef/dueDate: passam direto (nullable conforme schema).
      const items: DocumentListItem[] = [];
      for (const row of rows) {
        let netValue: DocumentListItem['netValue'] = null;
        if (row.netValue !== null) {
          const moneyResult = Money.fromCents(row.netValue);
          if (!moneyResult.ok) {
            process.stderr.write(
              `[document-repo:findPaged:mapper] invalid netValue=${String(row.netValue)} id=${row.id}: ${moneyResult.error}\n`,
            );
            // Corrupção de row: valor monetário inválido no banco.
            // Propaga como falha de repositório (adapters.md §"converter para Result na borda").
            throw new Error(`corrupt-net-value:${row.id}`);
          }
          netValue = moneyResult.value;
        }

        items.push({
          id: row.id,
          // CHECK fin_documents_status_chk garante o conjunto válido — cast seguro.
          status: row.status as DocumentStatus,
          documentNumber: row.documentNumber,
          // CHECK fin_documents_type_chk garante o conjunto válido (ou NULL) — cast seguro.
          type: row.type as DocumentType | null,
          supplierRef: row.supplierRef,
          netValue,
          dueDate: row.dueDate,
        });
      }

      return { items, page, pageSize, total };
    });

  return {
    // findById tem seu próprio try/catch interno que preserva 'document-not-found'
    // como retorno semântico (não convertido para 'document-repository-failure').
    findById,

    save,

    delete: deleteDoc,

    findPaged,
  };
};
