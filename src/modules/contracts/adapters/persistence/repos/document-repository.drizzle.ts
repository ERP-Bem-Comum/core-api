/**
 * Adapter Drizzle/MySQL do DocumentRepository.
 *
 * Ticket: CTR-DOCUMENT-AGGREGATE-PERSISTENCE (W1).
 *
 * Padrao CTR-OUTBOX-INTEGRATION-IN-REPOS: save(doc, events) executa transacao
 * MySQL com INSERT no ctr_documents + appendOutboxInTx dentro do mesmo db.tx.
 * Atomicidade ACID garante outbox + agregado consistentes.
 *
 * ASCII puro.
 */

import process from 'node:process';

import { and, eq } from 'drizzle-orm';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../../domain/document/repository.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';
import { documentFromRow, documentToInsert } from '../mappers/document.mapper.ts';
import * as schema from '../schemas/mysql.ts';
import { ctrDocuments } from '../schemas/mysql.ts';
import { appendOutboxInTx } from './outbox-repository.drizzle.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, DocumentRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[document-repo:${ctx}] ${String(cause)}\n`);
    return err('document-repository-unavailable');
  }
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const DocumentRepositoryDrizzle = (db: MysqlHandle['db']): DocumentRepository => {
  const findById: DocumentRepository['findById'] = async (id) =>
    safe('findById', async () => {
      const rows = await db
        .select()
        .from(ctrDocuments)
        .where(eq(ctrDocuments.id, String(id)))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      const r = documentFromRow(row);
      if (!r.ok) {
        process.stderr.write(
          `[document-repo:findById:mapper] ${r.error.tag} ${r.error.field}: ${r.error.cause}\n`,
        );
        throw new Error(`mapper-failed: ${r.error.field}`);
      }
      return r.value;
    }).then((res) => {
      if (!res.ok) return err(res.error);
      return ok(res.value);
    });

  const findByParent: DocumentRepository['findByParent'] = async (parentType, parentId) =>
    safe('findByParent', async () => {
      const rows = await db
        .select()
        .from(ctrDocuments)
        .where(
          and(eq(ctrDocuments.parentType, parentType), eq(ctrDocuments.parentId, String(parentId))),
        );
      const docs = [];
      for (const row of rows) {
        const r = documentFromRow(row);
        if (!r.ok) {
          process.stderr.write(
            `[document-repo:findByParent:mapper] ${r.error.tag} ${r.error.field}: ${r.error.cause}\n`,
          );
          throw new Error(`mapper-failed: ${r.error.field}`);
        }
        docs.push(r.value);
      }
      docs.sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
      return docs;
    }).then((res) => {
      if (!res.ok) return err(res.error);
      return ok(res.value);
    });

  const save: DocumentRepository['save'] = async (doc, events) =>
    safe('save', async () => {
      await db.transaction(async (tx) => {
        await tx.insert(ctrDocuments).values(documentToInsert(doc));
        if (events.length > 0) {
          await appendOutboxInTx(tx, schema, events);
        }
      });
      return undefined;
    });

  return { findById, findByParent, save };
};
