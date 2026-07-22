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
// Optimistic lock (FR-009 / feature 010):
//   save(agg, entries, expectedVersion) com expectedVersion definido:
//     UPDATE WHERE id=? AND version=expectedVersion → version = expectedVersion+1.
//     mysql2 retorna affectedRows=0 se o WHERE não casa (Refman §13.2.17).
//     → err('document-version-conflict').
//   save(agg, entries) sem expectedVersion (criação): INSERT com version=0.
//   SELECT FOR UPDATE antes do UPDATE serializa txs concorrentes (Refman §15.7.2.4).
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

import { and, asc, count, desc, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import * as Money from '../../../../../shared/kernel/money.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
  LoadedDocument,
  StoredDocument,
} from '../../../domain/document/repository.ts';
import type { DocumentId } from '../../../domain/shared/document-id.ts';
import type { DocumentListFilter, DocumentListItem, Page } from '../../../domain/document/query.ts';
import type { DocumentStatus, DocumentType } from '../../../domain/document/types.ts';
import type { FinancialTimelineEntry } from '../../../domain/timeline/types.ts';
import type { FinancialMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  mapRowToDocument,
  mapPayableRows,
  mapDocumentToRow,
  mapPayablesToRows,
  mapRetentionsToRows,
  mapRegisteredTaxesToRows,
} from '../mappers/document.mapper.ts';
import { mapEntryToRows } from '../mappers/timeline.mapper.ts';
import { appendFinOutboxInTx } from './fin-outbox-helpers.ts';
import type { DocumentEvent } from '../../../domain/document/events.ts';

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

// Sentinela interna: distingue conflito de versão (semântico) de falha de infra no catch.
// Usa Symbol único para identificação sem `class` (regra no-restricted-syntax do projeto).
const VERSION_CONFLICT_SYMBOL = Symbol('version-conflict');

type VersionConflictSentinel = Error & Readonly<{ [VERSION_CONFLICT_SYMBOL]: true }>;

const makeVersionConflict = (
  documentId: string,
  expectedVersion: number,
): VersionConflictSentinel => {
  const e = new Error(
    `version-conflict:${documentId}:expected:${expectedVersion}`,
  ) as VersionConflictSentinel;
  (e as unknown as Record<symbol, boolean>)[VERSION_CONFLICT_SYMBOL] = true;
  return e;
};

const isVersionConflict = (cause: unknown): cause is VersionConflictSentinel =>
  cause instanceof Error &&
  (cause as unknown as Record<symbol, unknown>)[VERSION_CONFLICT_SYMBOL] === true;

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
  ): Promise<Result<LoadedDocument, DocumentRepositoryError>> => {
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

      // FR-009: expõe `version` para participação no optimistic lock pelo cliente HTTP.
      // A `version` vem diretamente da coluna `fin_documents.version` lida no SELECT acima.
      // Os use cases de mutação continuam usando `cmd.expectedVersion` (versão que o CLIENTE
      // enviou) — a versão aqui serve apenas para serialização/resposta; não altera o lock.
      return ok({ document: documentR.value, payables: payablesR.value, version: docRow.version });
    } catch (cause) {
      process.stderr.write(`[document-repo:findById] ${String(cause)}\n`);
      return err('document-repository-failure');
    }
  };

  // ─── save ──────────────────────────────────────────────────────────────────
  //
  // Transação única: documento + tabelas filhas (hard replace) + trilha de timeline.
  //
  // `expectedVersion` controla o caminho de optimistic lock (FR-009/ADR-0002 feature 010):
  //
  //   undefined → criação / saveDraft / submit: executa SELECT FOR UPDATE para adquirir
  //     next-key lock e detectar se o documento já existe (INSERT) ou houve race condition
  //     inesperada (erro genérico). Não compara versão.
  //
  //   number    → mutação (adjust/approve/undo): o UPDATE usa
  //     AND version = expectedVersion no WHERE. Refman MySQL 8.4 §13.2.17 (UPDATE):
  //     "The affected-rows value reflects the number of rows actually changed."
  //     Com InnoDB, mysql2 retorna affectedRows = 0 quando o WHERE não casa nenhuma
  //     row — seja porque o doc não existe ou porque a versão foi incrementada por
  //     outra transação. O use case fez findById antes, então affectedRows = 0 aqui
  //     significa necessariamente que a versão divergiu → err('document-version-conflict').
  //     O SELECT FOR UPDATE ainda é emitido para serializar leituras concorrentes
  //     (next-key lock na PK) antes do UPDATE, evitando que duas txs leiam a mesma
  //     versão e tentem incrementar em paralelo (Refman §15.7.2.4).
  //
  // `timelineEntries`: gravadas NA MESMA transação (SC-004/NFR-001 — Vernon:3257:
  //   "update synchronously [...] in the same transaction"). Quem não tem trilha
  //   passa [] — noop sem overhead.
  const save = async (
    aggregate: StoredDocument,
    timelineEntries: readonly FinancialTimelineEntry[],
    expectedVersion?: number,
    events?: readonly DocumentEvent[],
  ): Promise<Result<void, DocumentRepositoryError>> => {
    // `save` não usa o helper `safe()` porque precisa distinguir dois tipos de falha:
    //   1. 'document-version-conflict' — erro de domínio semântico (affectedRows = 0)
    //   2. 'document-repository-failure' — falha de infra (I/O, constraint violada)
    // O safe() converte qualquer exception para 'document-repository-failure', o que
    // apagaria a distinção. Por isso usamos try/catch direto com uma sentinela tipada.
    //
    // Mecanismo de optimistic lock (FR-009):
    //   expectedVersion === undefined → caminho de criação: INSERT com version=0.
    //   expectedVersion definido → caminho de mutação: UPDATE WHERE id=? AND version=?
    //     Refman MySQL 8.4 §13.2.17 (UPDATE): "The affected-rows value reflects the
    //     number of rows actually changed." mysql2 expõe como ResultSetHeader.affectedRows.
    //     InnoDB com REPEATABLE READ: o WHERE compara o valor FÍSICO da coluna (não a
    //     snapshot de leitura), garantindo detecção de concurrent writes (Refman §15.7.2.3).
    //     affectedRows=0 com id existente → versão divergiu → 'document-version-conflict'.
    //
    // SELECT FOR UPDATE antes do UPDATE (em ambos os caminhos):
    //   Adquire next-key lock exclusivo na PK antes de qualquer escrita.
    //   Refman MySQL 8.4 §15.7.2.4: "SELECT...FOR UPDATE sets an exclusive next-key
    //   lock on every index record the search encounters."
    //   Isso serializa duas txs que chegam simultaneamente ao mesmo documento,
    //   evitando leituras de versão idênticas seguidas de dois UPDATEs concorrentes.
    try {
      const { document, payables } = aggregate;
      const documentId = document.id as unknown as string;

      await db.transaction(async (tx) => {
        // 1. SELECT FOR UPDATE — serializa escritas concorrentes via next-key lock na PK.
        const existing = await tx
          .select({ version: schema.finDocuments.version })
          .from(schema.finDocuments)
          .where(eq(schema.finDocuments.id, documentId))
          .for('update');

        const currentVersion = existing[0]?.version;

        if (expectedVersion === undefined) {
          // Caminho de criação: INSERT com version = 0 (default do schema).
          // Se o doc já existe (race condition entre dois criadores), o INSERT
          // falhará por violação de PK → capturado no catch abaixo como
          // 'document-repository-failure' — comportamento correto.
          const row = mapDocumentToRow(document, 0);
          await tx.insert(schema.finDocuments).values(row);
        } else {
          // Caminho de mutação: UPDATE com optimistic lock enforçado no WHERE.
          // WHERE id=? AND version=expectedVersion → só modifica se versão bate.
          const nextVersion = expectedVersion + 1;
          const row = mapDocumentToRow(document, nextVersion);
          const updateResult = await tx
            .update(schema.finDocuments)
            .set(row)
            .where(
              and(
                eq(schema.finDocuments.id, documentId),
                eq(schema.finDocuments.version, expectedVersion),
              ),
            );

          // mysql2 retorna [ResultSetHeader, FieldPacket[]]. Drizzle expõe o raw
          // do driver via cast. affectedRows=0 significa que o WHERE não casou —
          // i.e., a versão foi incrementada por outra transação antes desta.
          const affectedRows = (updateResult as unknown as [{ affectedRows: number }])[0]
            .affectedRows;
          if (affectedRows === 0) {
            // Versão divergiu. Lançamos uma sentinela ANTES do catch genérico
            // para que o catch consiga distinguir este caso de falhas de infra.
            // O Error é capturado imediatamente no catch abaixo.
            throw makeVersionConflict(documentId, expectedVersion);
          }

          // currentVersion lida no SELECT FOR UPDATE é informativa.
          // A checagem real é o affectedRows acima. void suprime unused warning.
          void currentVersion;
        }

        // 2. Hard replace de tabelas filhas (R8.1: ajuste recria payables inteiros).
        //    DELETE explícito: não dependemos de CASCADE aqui — garantimos que o
        //    INSERT em lote subsequente não colide em PK.
        await tx.delete(schema.finPayables).where(eq(schema.finPayables.documentId, documentId));
        await tx
          .delete(schema.finRetentions)
          .where(eq(schema.finRetentions.documentId, documentId));
        await tx
          .delete(schema.finRegisteredTaxes)
          .where(eq(schema.finRegisteredTaxes.documentId, documentId));

        // 3. INSERT em lote de filhos (1 round-trip por tabela; skip se vazio).
        //    mysql2 lança ER_PARSE_ERROR se values([]) — guard obrigatório.
        if (payables !== null) {
          const payableRows = mapPayablesToRows(payables, documentId);
          if (payableRows.length > 0) {
            await tx.insert(schema.finPayables).values([...payableRows]);
          }
        }

        const retentions = document.retentions;
        if (retentions.length > 0) {
          const retentionRows = mapRetentionsToRows(retentions, documentId);
          await tx.insert(schema.finRetentions).values([...retentionRows]);
        }

        const registeredTaxes = document.registeredTaxes;
        if (registeredTaxes.length > 0) {
          const taxRows = mapRegisteredTaxesToRows(registeredTaxes, documentId);
          await tx.insert(schema.finRegisteredTaxes).values([...taxRows]);
        }

        // 4. Timeline (SC-004/NFR-001): gravar entries na MESMA transação.
        //    Append-only (ADR-0020 §"sem UPDATE/DELETE em read-model").
        //    mysql2 lança ER_PARSE_ERROR se values([]) — guard obrigatório.
        if (timelineEntries.length > 0) {
          const mapped = timelineEntries.map(mapEntryToRows);
          const entryRows = mapped.map((m) => m.entryRow);
          await tx.insert(schema.finDocumentTimeline).values([...entryRows]);

          const changeRows = mapped.flatMap((m) => [...m.changeRows]);
          if (changeRows.length > 0) {
            await tx.insert(schema.finTimelineFieldChanges).values(changeRows);
          }
        }

        // 5. Outbox (#127): eventos de domínio na MESMA transação (ADR-0015). Falha aqui reverte
        //    tudo (estado + timeline + outbox) — evento durável SSE estado persistido.
        await appendFinOutboxInTx(tx, events ?? []);
      });

      return ok(undefined);
    } catch (cause) {
      // Distinguir conflito de versão (semântico) de falha de infra (I/O, constraint).
      if (isVersionConflict(cause)) {
        return err('document-version-conflict');
      }
      process.stderr.write(`[document-repo:save] ${String(cause)}\n`);
      return err('document-repository-failure');
    }
  };

  // ─── delete ────────────────────────────────────────────────────────────────
  //
  // Hard delete do documento raiz com optimistic lock (FR-009 — espelha o `save`). As filhas
  // (payables, retentions, registered_taxes, timeline) saem via ON DELETE CASCADE.
  // ADR-0002 (Evans): "A delete operation must remove everything within the AGGREGATE boundary
  // at once." O DELETE só remove se `version = expectedVersion`; affectedRows=0 (versão divergiu
  // ou doc removido por outra tx entre o findById do use case e este DELETE) → conflito.
  const deleteDoc = async (
    id: DocumentId,
    expectedVersion: number,
    events?: readonly DocumentEvent[],
  ): Promise<Result<void, DocumentRepositoryError>> => {
    const documentId = id as unknown as string;
    try {
      await db.transaction(async (tx) => {
        // SELECT FOR UPDATE — efeito colateral: next-key lock na PK (mesmo do save), serializa
        // mutações concorrentes. O retorno é descartado; a checagem de versão é o WHERE do DELETE.
        await tx
          .select({ version: schema.finDocuments.version })
          .from(schema.finDocuments)
          .where(eq(schema.finDocuments.id, documentId))
          .for('update');

        const deleteResult = await tx
          .delete(schema.finDocuments)
          .where(
            and(
              eq(schema.finDocuments.id, documentId),
              eq(schema.finDocuments.version, expectedVersion),
            ),
          );

        const affectedRows = (deleteResult as unknown as [{ affectedRows: number }])[0]
          .affectedRows;
        if (affectedRows === 0) {
          throw makeVersionConflict(documentId, expectedVersion);
        }

        // Outbox (#127): evento de cancelamento na MESMA transação do DELETE (atomicidade).
        await appendFinOutboxInTx(tx, events ?? []);
      });
      return ok(undefined);
    } catch (cause) {
      if (isVersionConflict(cause)) {
        return err('document-version-conflict');
      }
      process.stderr.write(`[document-repo:delete] ${String(cause)}\n`);
      return err('document-repository-failure');
    }
  };

  // ─── findPaged ─────────────────────────────────────────────────────────────
  //
  // Read-model leve (US1 — FR-004): lê APENAS fin_documents (sem tabelas filhas),
  // retornando Page<DocumentListItem> com `total` filtrado e `items` paginados.
  //
  // Ordenação ESTÁVEL: dueDate ASC, desempate por id ASC.
  //   - Rows com dueDate NULL (Drafts) aparecem PRIMEIRO — MySQL 8.4 Refman §11.4.2:
  //     "NULL values are considered lower than any non-NULL value".
  //   - Quando dois documentos têm o mesmo dueDate (ou ambos NULL), o tie-breaker
  //     `id ASC` (UUID v4, varchar(36)) garante ordem determinística em paginação
  //     OFFSET — sem ele, InnoDB pode variar a ordem dentro do mesmo índice.
  //   - `fin_documents_due_date_idx` cobre ORDER BY dueDate; o desempate por `id`
  //     é servido pela PK do cluster InnoDB (fin_documents.id é a PK).
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
  // #167: termo de busca → padrão LIKE contains, com `%`/`_`/`\` escapados (viram literais).
  // MySQL usa `\` como escape default no LIKE; sem cláusula ESCAPE explícita.
  const likeContains = (term: string): string => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const findPaged = async (
    filter: DocumentListFilter,
    page: number,
    pageSize: number,
  ): Promise<Result<Page<DocumentListItem>, DocumentRepositoryError>> =>
    safe('findPaged', async () => {
      const { finDocuments, finSupplierView, finPayables } = schema;

      // Derivação de conciliação (#204, ADR-0022 — read-model DERIVADO, sem escrita em fin_documents):
      // por documento, total de títulos pagáveis e quantos estão Reconciled. Subquery agrupada (1 linha
      // por documento → LEFT JOIN 1:0..1, não multiplica o COUNT). ADR-0020 permite GROUP BY/agregação.
      const recon = db
        .select({
          documentId: finPayables.documentId,
          total: sql<number>`count(*)`.as('total'),
          reconciled: sql<number>`sum(${finPayables.status} = 'Reconciled')`.as('reconciled'),
        })
        .from(finPayables)
        .groupBy(finPayables.documentId)
        .as('recon');

      // Documento conta como Conciliado sse status='Paid' E tem ≥1 título E TODOS Reconciled (FR-004).
      const isReconciled = sql`${finDocuments.status} = 'Paid' and ${recon.total} is not null and ${recon.total} = ${recon.reconciled}`;
      // Status exibido: reflete 'Reconciled' quando derivado; senão o status próprio do documento.
      const displayStatus = sql<string>`case when ${isReconciled} then 'Reconciled' else ${finDocuments.status} end`;

      // Filtro de status: 'Reconciled'/'Paid' usam a derivação; os demais são eq direto.
      const statusCondition =
        filter.status === 'Reconciled'
          ? isReconciled
          : filter.status === 'Paid'
            ? sql`${finDocuments.status} = 'Paid' and (${recon.total} is null or ${recon.total} <> ${recon.reconciled})`
            : filter.status !== undefined
              ? eq(finDocuments.status, filter.status)
              : undefined;

      // Constrói predicados condicionalmente — filtros ausentes não entram no WHERE.
      // and() com array vazio emite WHERE sem condições (SELECT all), que é o comportamento
      // correto para listagem sem filtro. (operators.mdx §"and")
      const conditions = [
        statusCondition,
        // #164: multi-valor tem precedência sobre o single (retrocompat) quando presente.
        filter.supplierRefs !== undefined
          ? inArray(finDocuments.supplierRef, filter.supplierRefs)
          : filter.supplierRef !== undefined
            ? eq(finDocuments.supplierRef, filter.supplierRef)
            : undefined,
        filter.types !== undefined
          ? inArray(finDocuments.type, filter.types)
          : filter.type !== undefined
            ? eq(finDocuments.type, filter.type)
            : undefined,
        filter.contractRef !== undefined
          ? eq(finDocuments.contractRef, filter.contractRef)
          : undefined,
        filter.programRef !== undefined
          ? eq(finDocuments.programRef, filter.programRef)
          : undefined,
        filter.valorMin !== undefined ? gte(finDocuments.netValue, filter.valorMin) : undefined,
        filter.valorMax !== undefined ? lte(finDocuments.netValue, filter.valorMax) : undefined,
        filter.dueFrom !== undefined ? gte(finDocuments.dueDate, filter.dueFrom) : undefined,
        filter.dueTo !== undefined ? lte(finDocuments.dueDate, filter.dueTo) : undefined,
        filter.issuedFrom !== undefined
          ? gte(finDocuments.issueDate, filter.issuedFrom)
          : undefined,
        filter.issuedTo !== undefined ? lte(finDocuments.issueDate, filter.issuedTo) : undefined,
        // #167: busca textual (OR entre nº documento + nome/CNPJ do fornecedor). Requer o LEFT JOIN
        // fin_supplier_view também na query de COUNT (adicionado abaixo).
        filter.q !== undefined
          ? or(
              like(finDocuments.documentNumber, likeContains(filter.q)),
              like(finSupplierView.name, likeContains(filter.q)),
              like(finSupplierView.document, likeContains(filter.q)),
            )
          : undefined,
      ].filter((c): c is NonNullable<typeof c> => c !== undefined);

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // 1. COUNT(*) com o mesmo WHERE + LEFT JOIN da derivação (o WHERE pode referenciar `recon`).
      const countRows = await db
        .select({ value: count() })
        .from(finDocuments)
        .leftJoin(recon, eq(recon.documentId, finDocuments.id))
        // #167: mesmo LEFT JOIN das rows — o WHERE pode referenciar fin_supplier_view (busca por q).
        // 1:0..1 (supplierRef→PK), não multiplica o COUNT.
        .leftJoin(finSupplierView, eq(finDocuments.supplierRef, finSupplierView.supplierRef))
        .where(whereClause);

      const total = countRows[0]?.value ?? 0;

      // Conjunto vazio → retornar imediatamente sem fazer a query de items.
      if (total === 0) {
        return { items: [], page, pageSize, total: 0 };
      }

      // 2. SELECT read-model com LIMIT/OFFSET.
      //    Ordenação estável: dueDate ASC (NULLs primeiro), desempate por id ASC.
      //    `status` é o DERIVADO (displayStatus) — reflete Conciliado sem escrever em fin_documents.
      //    `version` incluída (FR-009): grids do front precisam para ações inline
      //    (PATCH/approve) sem findById extra — Vernon, _Implementing DDD_ (ddd--vernon-livro-vermelho.md:8869).
      const rows = await db
        .select({
          id: finDocuments.id,
          status: displayStatus,
          documentNumber: finDocuments.documentNumber,
          type: finDocuments.type,
          supplierRef: finDocuments.supplierRef,
          series: finDocuments.series,
          grossValue: finDocuments.grossValue,
          paymentMethod: finDocuments.paymentMethod,
          contractRef: finDocuments.contractRef,
          netValue: finDocuments.netValue,
          dueDate: finDocuments.dueDate,
          issueDate: finDocuments.issueDate,
          version: finDocuments.version,
          // Fornecedor resolvido pelo read-model local (#47/US2) — LEFT JOIN intra-financial.
          supplierName: finSupplierView.name,
          supplierDocument: finSupplierView.document,
        })
        .from(finDocuments)
        .leftJoin(recon, eq(recon.documentId, finDocuments.id))
        .leftJoin(finSupplierView, eq(finDocuments.supplierRef, finSupplierView.supplierRef))
        .where(whereClause)
        // #164: ordenação configurável (default dueDate asc); desempate estável por id asc.
        .orderBy(
          (filter.order === 'desc' ? desc : asc)(
            filter.sort === 'netValue'
              ? finDocuments.netValue
              : filter.sort === 'supplierName'
                ? finSupplierView.name
                : finDocuments.dueDate,
          ),
          asc(finDocuments.id),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      // 3. Mapper inline: row → DocumentListItem.
      //    netValue: bigint(mode:'number') chega como number | null.
      //    status/type: varchar com CHECK — cast seguro para os tipos de domínio.
      //    documentNumber/supplierRef/dueDate: passam direto (nullable conforme schema).
      //    version: int NOT NULL — passa direto (já é number).
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

        let grossValue: DocumentListItem['grossValue'] = null;
        if (row.grossValue !== null) {
          const grossResult = Money.fromCents(row.grossValue);
          if (!grossResult.ok) {
            process.stderr.write(
              `[document-repo:findPaged:mapper] invalid grossValue=${String(row.grossValue)} id=${row.id}: ${grossResult.error}\n`,
            );
            throw new Error(`corrupt-gross-value:${row.id}`);
          }
          grossValue = grossResult.value;
        }

        items.push({
          id: row.id,
          // CHECK fin_documents_status_chk garante o conjunto válido — cast seguro.
          status: row.status as DocumentStatus,
          documentNumber: row.documentNumber,
          // CHECK fin_documents_type_chk garante o conjunto válido (ou NULL) — cast seguro.
          type: row.type as DocumentType | null,
          supplierRef: row.supplierRef,
          series: row.series,
          grossValue,
          // CHECK fin_documents_payment_method_chk garante o conjunto válido (ou NULL) — cast seguro.
          paymentMethod: row.paymentMethod as DocumentListItem['paymentMethod'],
          contractRef: row.contractRef,
          netValue,
          dueDate: row.dueDate,
          issueDate: row.issueDate,
          version: row.version,
          // LEFT JOIN fin_supplier_view → null quando sem match (#47/US2).
          supplierName: row.supplierName,
          supplierDocument: row.supplierDocument,
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
