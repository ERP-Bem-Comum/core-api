import { eq, inArray } from 'drizzle-orm';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../../domain/contract/repository.ts';
import type { Contract, EffectiveContract } from '../../../domain/contract/types.ts';
import type { ContractId } from '../../../domain/shared/ids.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';
import { contractFromRow, contractToInsert, type ContractRow } from '../mappers/contract.mapper.ts';
import { appendOutboxInTx } from './outbox-repository.drizzle.ts';
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
    c: EffectiveContract,
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

    // CA-3: save(contract, events) abre UMA transação que persiste state + outbox atomicamente.
    // appendOutboxInTx é chamado dentro do mesmo callback — rollback automático se qualquer
    // operação falhar (Drizzle garante rollback quando o callback lança).
    save: async (contract: EffectiveContract, events: readonly ContractsModuleEvent[]) =>
      safe('save', async () => {
        await db.transaction(async (tx) => {
          await persistContractInTx(tx, contract);
          await appendOutboxInTx(tx, schema, events);
        });
      }),
  };
};
