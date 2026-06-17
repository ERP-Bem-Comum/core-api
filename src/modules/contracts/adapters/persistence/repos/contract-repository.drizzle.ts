import { and, asc, desc, eq, inArray, like, lt, or, sql, type SQL } from 'drizzle-orm';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
  ListContractsQuery,
} from '../../../domain/contract/repository.ts';
import type { Contract, ActiveContract } from '../../../domain/contract/types.ts';
import type { ContractId } from '../../../domain/shared/ids.ts';
import type { PlainDate as PlainDateType } from '../../../../../shared/kernel/plain-date.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';
import { contractFromRow, contractToInsert, type ContractRow } from '../mappers/contract.mapper.ts';
import { appendOutboxInTx } from './outbox-repository.drizzle.ts';
import { formatSequentialNumber } from '../../../domain/contract/sequential-number.ts';
import process from 'node:process';

// Boundary: try/catch que converte para Result. mysql2/Drizzle lança em erros
// de I/O e violação de constraints (UNIQUE, CHECK, FK) — capturamos aqui.
// W2 NOTE 1: o port só conhece 2 códigos; o `error` original (incluindo sinais
// de corrupção do mapper) é registrado via `process.stderr.write` para
// diagnóstico antes de ser substituído.
const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, ContractRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[contract-repo:${ctx}] ${String(cause)}\n`);
    return err('contract-repo-unavailable');
  }
};

const buildContract = (
  row: Readonly<ContractRow>,
  homologatedRows: readonly Readonly<{ amendmentId: string }>[],
): Result<Contract, ContractRepositoryError> => {
  const ids = homologatedRows.map((r) => r.amendmentId);
  const r = contractFromRow(row, ids);
  if (!r.ok) {
    process.stderr.write(`[contract-repo:mapper] ${r.error.tag}\n`);
    return err('contract-repo-unavailable');
  }
  return ok(r.value);
};

// Drizzle MySQL `MySql2Database` expõe interface internamente mutável (insert/
// update/delete são parte da API). Handle é leitura — não mutamos.
export const createDrizzleContractRepository = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ContractRepository => {
  const { db, schema } = handle;

  // CA-3: persistContract agora recebe o tx aberto pelo caller — ele participa
  // da transação do repo pai (que inclui também o appendOutboxInTx).
  const persistContractInTx = async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    c: Contract,
  ): Promise<void> => {
    const { row, homologatedAmendmentIds } = contractToInsert(c);
    // Upsert estrito por PK (`id`), com defesa em profundidade contra
    // violações de outras UNIQUE (`sequential_number`).
    //
    // Por que NÃO usar `ON DUPLICATE KEY UPDATE`: o ODKU do MySQL aciona em
    // QUALQUER UNIQUE violada (Refman §13.2.6.2) — não é dirigível à PK como
    // o Postgres/SQLite `ON CONFLICT (col) DO UPDATE`. Se outra row já tem o
    // mesmo `sequential_number`, ODKU faria um UPDATE silencioso sobrescrevendo
    // a row alheia (inclusive seu `id`). Padrão SELECT-then-UPDATE-or-INSERT
    // em transação reproduz a semântica do `onConflictDoUpdate({target:id})`
    // do SQLite e respeita o princípio de Date/Ramakrishnan de que o schema
    // é o system of record — qualquer caller (admin script, futuro HTTP) que
    // tentar gravar com `sequential_number` colidindo recebe ER_DUP_ENTRY,
    // não corrupção silenciosa.

    // Audit §M3 — `.for('update')` adquire next-key lock se a row existe ou
    // gap lock no PK ausente. Elimina a janela de corrida em que duas tx
    // leem "não existe" → ambas tentam INSERT → uma ER_DUP_ENTRY (que
    // `safe()` traduziria falsamente para *-repo-unavailable). Refman §15.7.
    const existing = await tx
      .select({ id: schema.contracts.id })
      .from(schema.contracts)
      .where(eq(schema.contracts.id, row.id))
      .for('update');

    if (existing.length > 0) {
      // UPDATE by PK — UNIQUE(sequential_number) ainda pega se `row` tiver
      // sequential_number que colidiria com outra row.
      await tx.update(schema.contracts).set(row).where(eq(schema.contracts.id, row.id));
    } else {
      // INSERT puro — falha com ER_DUP_ENTRY se PK ou outra UNIQUE colidir.
      await tx.insert(schema.contracts).values(row);
    }

    // Reset+reinsert da junction; idempotente para upsert.
    await tx
      .delete(schema.contractHomologatedAmendments)
      .where(eq(schema.contractHomologatedAmendments.contractId, row.id));
    // Audit §M4 — insert em batch (`VALUES (r1), (r2), ...`). 1 round-trip
    // independente do tamanho. Skip se vazio (mysql2 lança em `values([])`).
    if (homologatedAmendmentIds.length > 0) {
      await tx.insert(schema.contractHomologatedAmendments).values(
        homologatedAmendmentIds.map((amendmentId) => ({
          contractId: row.id,
          amendmentId,
        })),
      );
    }
  };

  const loadContract = async (
    id: string,
  ): Promise<Result<Contract | null, ContractRepositoryError>> => {
    const rows = await db.select().from(schema.contracts).where(eq(schema.contracts.id, id));
    const row = rows[0];
    if (row === undefined) return ok(null);
    const homologatedRows = await db
      .select({ amendmentId: schema.contractHomologatedAmendments.amendmentId })
      .from(schema.contractHomologatedAmendments)
      .where(eq(schema.contractHomologatedAmendments.contractId, id));
    return buildContract(row, homologatedRows);
  };

  const loadBySequentialNumber = async (
    sequentialNumber: string,
  ): Promise<Result<Contract | null, ContractRepositoryError>> => {
    const rows = await db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.sequentialNumber, sequentialNumber));
    const row = rows[0];
    if (row === undefined) return ok(null);
    const homologatedRows = await db
      .select({ amendmentId: schema.contractHomologatedAmendments.amendmentId })
      .from(schema.contractHomologatedAmendments)
      .where(eq(schema.contractHomologatedAmendments.contractId, row.id));
    return buildContract(row, homologatedRows);
  };

  // CTR-HTTP-CONTRACT-LIST-FILTERS — predicado WHERE da listagem paginada.
  // search → LIKE %term% em title/objective/sequential_number (collation
  // utf8mb4_unicode_ci já é case-insensitive; ADR-0020 permite LIKE). Escapa
  // os curingas `%`/`_`/`\` do termo do usuário para tratá-los como literais.
  const listWhere = (query: ListContractsQuery): SQL | undefined => {
    const clauses: SQL[] = [];
    if (query.status !== undefined) {
      clauses.push(eq(schema.contracts.status, query.status));
    }
    if (query.search !== undefined && query.search.length > 0) {
      const escaped = query.search.replace(/[\\%_]/g, (ch) => `\\${ch}`);
      const pattern = `%${escaped}%`;
      const textMatch = or(
        like(schema.contracts.title, pattern),
        like(schema.contracts.objective, pattern),
        like(schema.contracts.sequentialNumber, pattern),
      );
      if (textMatch !== undefined) clauses.push(textMatch);
    }
    return clauses.length === 0 ? undefined : and(...clauses);
  };

  return {
    findById: async (id: ContractId) =>
      safe('findById', async () => {
        const inner = await loadContract(id as unknown as string);
        if (!inner.ok) throw new Error(JSON.stringify(inner.error));
        return inner.value;
      }),

    findBySequentialNumber: async (sequentialNumber: string) =>
      safe('findBySequentialNumber', async () => {
        const inner = await loadBySequentialNumber(sequentialNumber);
        if (!inner.ok) throw new Error(JSON.stringify(inner.error));
        return inner.value;
      }),

    // CTR-CONTRACT-SEQUENTIAL-NUMBER: gera o próximo número do ano de forma transacional.
    // Padrão CHILD_CODES (Refman 8.4 §17.7.2.4): nunca consistent/shared read — o
    // `.for('update')` adquire o lock exclusivo da linha do ano, serializando geradores
    // concorrentes e eliminando a janela de corrida (duas tx lendo o mesmo last_seq).
    //   (1) INSERT ... ON DUPLICATE KEY UPDATE garante a linha do ano (a PK `year` é a
    //       ÚNICA UNIQUE da tabela — ODKU é dirigível à PK aqui, ao contrário de
    //       `ctr_contracts`; ADR-0020 permite ON DUPLICATE KEY UPDATE).
    //   (2) SELECT last_seq ... FOR UPDATE bloqueia + lê o valor atual.
    //   (3) UPDATE last_seq + 1 grava o próximo.
    nextSequentialNumber: async (year: number) =>
      safe('nextSequentialNumber', async () =>
        db.transaction(async (tx) => {
          await tx
            .insert(schema.ctrContractSeq)
            .values({ year, lastSeq: 0 })
            .onDuplicateKeyUpdate({ set: { year } });

          const rows = await tx
            .select({ lastSeq: schema.ctrContractSeq.lastSeq })
            .from(schema.ctrContractSeq)
            .where(eq(schema.ctrContractSeq.year, year))
            .for('update');

          const nextSeq = (rows[0]?.lastSeq ?? 0) + 1;
          await tx
            .update(schema.ctrContractSeq)
            .set({ lastSeq: nextSeq })
            .where(eq(schema.ctrContractSeq.year, year));

          return formatSequentialNumber(nextSeq, year);
        }),
      ),

    list: async () =>
      safe('list', async () => {
        // Audit §H1 — antipadrão N+1 substituído por 1+1 queries:
        //   (1) SELECT em ctr_contracts.
        //   (2) SELECT em ctr_contract_homologated_amendments com
        //       `WHERE contract_id IN (...)` (drizzle `inArray`).
        // Agrupa por contractId num Map<string, string[]>, depois reconstrói
        // os agregados no app. O(M+N) memória, sem cartesiano (preferido a
        // leftJoin que duplicaria contract rows).
        const rows = await db.select().from(schema.contracts);
        if (rows.length === 0) return [] as readonly Contract[];

        const contractIds = rows.map((r) => r.id);
        const links = await db
          .select({
            contractId: schema.contractHomologatedAmendments.contractId,
            amendmentId: schema.contractHomologatedAmendments.amendmentId,
          })
          .from(schema.contractHomologatedAmendments)
          .where(inArray(schema.contractHomologatedAmendments.contractId, contractIds));

        const byContract = new Map<string, string[]>();
        for (const link of links) {
          const arr = byContract.get(link.contractId) ?? [];
          arr.push(link.amendmentId);
          byContract.set(link.contractId, arr);
        }

        const results: Contract[] = [];
        for (const row of rows) {
          const homologatedIds = (byContract.get(row.id) ?? []).map((amendmentId) => ({
            amendmentId,
          }));
          const r = buildContract(row, homologatedIds);
          if (!r.ok) throw new Error(JSON.stringify(r.error));
          results.push(r.value);
        }
        return results as readonly Contract[];
      }),

    // CTR-HTTP-CONTRACT-LIST-FILTERS — listagem filtrada/paginada NO BANCO.
    //   (1) COUNT(*) com o mesmo WHERE → total absoluto (para `meta`).
    //   (2) SELECT ... WHERE ... ORDER BY sequential_number ... LIMIT ? OFFSET ?.
    //   (3) SELECT junction só para os ids da página (`IN`), reconstrói agregados.
    // ORDER BY sequential_number (UNIQUE) é determinístico — sem tie-break extra.
    listPaged: async (query: ListContractsQuery) =>
      safe('listPaged', async () => {
        const where = listWhere(query);

        const totalRows = await db
          .select({ total: sql<number>`count(*)` })
          .from(schema.contracts)
          .where(where);
        const total = totalRows[0]?.total ?? 0;

        const offset = (query.page - 1) * query.limit;
        const orderBy =
          query.order === 'DESC'
            ? desc(schema.contracts.sequentialNumber)
            : asc(schema.contracts.sequentialNumber);
        const rows = await db
          .select()
          .from(schema.contracts)
          .where(where)
          .orderBy(orderBy)
          .limit(query.limit)
          .offset(offset);

        if (rows.length === 0) {
          return { items: [] as readonly Contract[], total };
        }

        const pageIds = rows.map((r) => r.id);
        const links = await db
          .select({
            contractId: schema.contractHomologatedAmendments.contractId,
            amendmentId: schema.contractHomologatedAmendments.amendmentId,
          })
          .from(schema.contractHomologatedAmendments)
          .where(inArray(schema.contractHomologatedAmendments.contractId, pageIds));

        const byContract = new Map<string, string[]>();
        for (const link of links) {
          const arr = byContract.get(link.contractId) ?? [];
          arr.push(link.amendmentId);
          byContract.set(link.contractId, arr);
        }

        const items: Contract[] = [];
        for (const row of rows) {
          const homologatedIds = (byContract.get(row.id) ?? []).map((amendmentId) => ({
            amendmentId,
          }));
          const r = buildContract(row, homologatedIds);
          if (!r.ok) throw new Error(JSON.stringify(r.error));
          items.push(r.value);
        }
        return { items: items as readonly Contract[], total };
      }),

    // CA-3: save(contract, events) abre UMA transação que persiste state + outbox atomicamente.
    // appendOutboxInTx é chamado dentro do mesmo callback — rollback automático se qualquer
    // operação falhar (Drizzle garante rollback quando o callback lança).
    save: async (contract: Contract, events: readonly ContractsModuleEvent[]) =>
      safe('save', async () => {
        await db.transaction(async (tx) => {
          await persistContractInTx(tx, contract);
          // US6a (ADR-0046): enriquece os eventos de ciclo de vida com contractorRef (Opção A).
          await appendOutboxInTx(tx, schema, events, contract.contractor);
        });
      }),

    // CTR-AUTO-EXPIRE (issue #39 · ADR-0041): contratos elegíveis para expiração automática.
    //
    // Query: WHERE status='Active' AND current_period_kind='Fixed' AND current_period_end < :cutoff
    //        ORDER BY current_period_end ASC, id ASC   LIMIT :limit
    //
    // Índice composto `ctr_contracts_expirable_idx` (status, current_period_kind, current_period_end)
    // cobre o filtro completo: igualdades nas 2 primeiras colunas + range scan na terceira
    // (Refman 8.4 §10.2.1.2 — index range scan; igualdades antes do range maximizam seletividade).
    //
    // Decisão CA5 (opção a): SELECT simples, SEM FOR UPDATE.
    // Fundamentação: `runSweep` usa 2 transações separadas — findExpirable (tx A) + save (tx B).
    // Um FOR UPDATE dentro de tx A liberaria os locks no COMMIT antes do save (tx B).
    // O lock NÃO persiste entre as duas transações → não previne double-expire em multi-instância.
    // ADR-0041 §"Decisão (4)": coordenação multi-instância via GET_LOCK / UNIQUE(job_name, run_date)
    // é F-Plus. Hoje (single-instance + cron one-shot): SELECT simples é suficiente e correto.
    //
    // cutoff é PlainDate (data-calendário). O adapter Drizzle persiste current_period_end como
    // `date` (mode:'date' no schema → Date meia-noite UTC). Convertemos cutoff → Date UTC antes
    // de comparar com `lt` (less-than) — mesmo toUTCDate do period.mapper.ts.
    findExpirable: async (cutoff: PlainDateType, limit: number) =>
      safe('findExpirable', async () => {
        // Converter PlainDate → Date UTC (meia-noite) para comparação com coluna `date`.
        const cutoffDate = new Date(Date.UTC(cutoff.year, cutoff.month - 1, cutoff.day));

        const rows = await db
          .select()
          .from(schema.contracts)
          .where(
            and(
              eq(schema.contracts.status, 'Active'),
              eq(schema.contracts.currentPeriodKind, 'Fixed'),
              lt(schema.contracts.currentPeriodEnd, cutoffDate),
            ),
          )
          // Ordena por (current_period_end ASC, id ASC): contratos mais antigos primeiro;
          // id como tie-break determinístico (consistente com o InMemory adapter).
          .orderBy(asc(schema.contracts.currentPeriodEnd), asc(schema.contracts.id))
          .limit(limit);

        if (rows.length === 0) return [] as readonly ActiveContract[];

        // Todos os contratos elegíveis são Active + Fixed → sem homologatedAmendmentIds
        // ainda carregados. Precisamos da junction table para reconstituir o agregado completo.
        const contractIds = rows.map((r) => r.id);
        const links = await db
          .select({
            contractId: schema.contractHomologatedAmendments.contractId,
            amendmentId: schema.contractHomologatedAmendments.amendmentId,
          })
          .from(schema.contractHomologatedAmendments)
          .where(inArray(schema.contractHomologatedAmendments.contractId, contractIds));

        const byContract = new Map<string, string[]>();
        for (const link of links) {
          const arr = byContract.get(link.contractId) ?? [];
          arr.push(link.amendmentId);
          byContract.set(link.contractId, arr);
        }

        const active: ActiveContract[] = [];
        for (const row of rows) {
          const homologatedIds = (byContract.get(row.id) ?? []).map((amendmentId) => ({
            amendmentId,
          }));
          const r = buildContract(row, homologatedIds);
          if (!r.ok) throw new Error(JSON.stringify(r.error));
          // Narrowing seguro: a query WHERE status='Active' garante o subtipo.
          // buildContract retorna Contract; o status === 'Active' no WHERE garante
          // que a row que chegou aqui é Active. O mapper também valida isso
          // (contractMapperInvalidEndedAt protege se o DB estiver corrompido).
          if (r.value.status !== 'Active') {
            // Estado corrompido no DB (CHECK violado); buildContract não lança →
            // logamos e pulamos para não derrubar o lote inteiro.
            process.stderr.write(
              `[contract-repo:findExpirable] row ${row.id} retornou status=${r.value.status} inesperado\n`,
            );
            continue;
          }
          active.push(r.value as ActiveContract);
        }

        return active as readonly ActiveContract[];
      }),
  };
};
