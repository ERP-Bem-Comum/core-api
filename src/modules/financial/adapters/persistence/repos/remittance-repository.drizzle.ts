// Adapter Drizzle do RemittanceRepository (MySQL).
//
// Boundary: todo try/catch converte para Result; nenhum Error cruza a borda
// (.claude/rules/adapters.md §"converter para Result na borda").
import { eq, inArray, and, desc, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  Remittance,
  RemittanceStatus,
} from '#src/modules/financial/domain/remittance/types.ts';
import type { RemittanceEvent } from '#src/modules/financial/domain/remittance/events.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type {
  RemittanceRepository,
  RemittanceRepositoryError,
} from '#src/modules/financial/application/ports/remittance-repository.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finRemittances, finRemittanceDocuments } from '../schemas/mysql.ts';
import { appendFinOutboxInTx } from './fin-outbox-helpers.ts';
import type { FinRemittanceRow } from '../schemas/mysql.ts';

const logRepo = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-remittance-repository] ${op} failed: ${String(cause)}\n`);
};

// Estados que PRENDEM o documento. `Discarded` fica de fora — é o único que devolve o documento
// para a fila, e exige decisão humana. Espelha `holdsDocuments` do domínio; a lista está aqui
// porque o filtro precisa ir para o SQL, não para a memória.
const HOLDING: readonly RemittanceStatus[] = ['Queued', 'Transmitted', 'Failed'];

const toDomain = (
  row: Readonly<FinRemittanceRow>,
  documentIds: readonly string[],
): Result<Remittance, 'remittance-row-invalid'> => {
  const id = RemittanceId.rehydrate(row.id);
  if (!id.ok) return err('remittance-row-invalid');

  const cedenteAccountId = CedenteAccountId.rehydrate(row.cedenteAccountId);
  if (!cedenteAccountId.ok) return err('remittance-row-invalid');

  return ok({
    id: id.value,
    cedenteAccountId: cedenteAccountId.value,
    nsa: row.nsa,
    fileName: row.fileName,
    contentHash: row.contentHash,
    documentIds,
    status: row.status as RemittanceStatus,
    generatedAt: row.generatedAt,
    ...(row.settledAt !== null ? { settledAt: row.settledAt } : {}),
    ...(row.detail !== null ? { detail: row.detail } : {}),
  });
};

export const createDrizzleRemittanceRepository = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): RemittanceRepository => {
  const { db } = handle;

  const loadDocumentIds = async (remittanceId: string): Promise<readonly string[]> => {
    const rows = await db
      .select({ documentId: finRemittanceDocuments.documentId })
      .from(finRemittanceDocuments)
      .where(eq(finRemittanceDocuments.remittanceId, remittanceId));
    return rows.map((r) => r.documentId).sort();
  };

  return {
    // Cabeçalho e vínculos na MESMA transação: uma remessa sem seus documentos não prenderia nada,
    // e é justamente o vínculo que impede a segunda inclusão. Meia gravação aqui reabre o caminho
    // para pagamento em dobro.
    //
    // SELECT ... FOR UPDATE + UPDATE-ou-INSERT, NUNCA `ON DUPLICATE KEY UPDATE` (ADR-0020
    // §"Padrão de upsert"). O ODKU dispara em QUALQUER UNIQUE violada, não só na PK: uma remessa
    // NOVA com NSA já usado na conta cairia no ramo de update e SOBRESCREVERIA o status da remessa
    // existente — que pode estar `Transmitted`. O UNIQUE deixaria de recusar, e uma remessa já
    // enviada passaria a constar com o desfecho de outra. Foi exatamente esse defeito que o teste
    // de integração pegou.
    save: async (
      remittance: Remittance,
      events: readonly RemittanceEvent[] = [],
    ): Promise<Result<void, RemittanceRepositoryError>> => {
      try {
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: finRemittances.id })
            .from(finRemittances)
            .where(eq(finRemittances.id, remittance.id))
            .for('update');

          if (existing[0] === undefined) {
            // Criação: INSERT puro. Violação de UNIQUE (NSA por conta, nome de arquivo) LANÇA e
            // vira `Result` de erro no catch — que é o comportamento que se quer.
            await tx.insert(finRemittances).values({
              id: remittance.id,
              cedenteAccountId: remittance.cedenteAccountId,
              nsa: remittance.nsa,
              fileName: remittance.fileName,
              contentHash: remittance.contentHash,
              status: remittance.status,
              generatedAt: remittance.generatedAt,
              settledAt: remittance.settledAt ?? null,
              detail: remittance.detail ?? null,
            });

            // Vínculo é imutável: os documentos de uma remessa não mudam depois de criada, então
            // só são gravados na criação.
            for (const documentId of remittance.documentIds) {
              await tx
                .insert(finRemittanceDocuments)
                .values({ remittanceId: remittance.id, documentId });
            }
          } else {
            // Atualização de desfecho, por ID. Só o que a máquina de estados muda — nunca NSA, nome
            // ou hash, que são imutáveis depois de gerada.
            await tx
              .update(finRemittances)
              .set({
                status: remittance.status,
                settledAt: remittance.settledAt ?? null,
                detail: remittance.detail ?? null,
              })
              .where(eq(finRemittances.id, remittance.id));
          }

          // Estado e evento na MESMA transação (ADR-0015): o evento existe se e somente se o
          // desfecho foi persistido. Anunciar "remessa transmitida" e perder a gravação seria pior
          // que não anunciar — o operador agiria sobre um estado que o banco de dados não tem.
          //
          // No-op quando `events` é vazio, que é o caso da revarredura idempotente: o desfecho já
          // tinha sido anunciado, e reemitir encheria o outbox a cada 5 minutos, para sempre.
          await appendFinOutboxInTx(tx, events);
        });
        return ok(undefined);
      } catch (cause) {
        logRepo('save', cause);
        return err('remittance-repository-unavailable');
      }
    },

    findById: async (id): Promise<Result<Remittance | null, RemittanceRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finRemittances)
          .where(eq(finRemittances.id, id))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const mapped = toDomain(row, await loadDocumentIds(row.id));
        if (!mapped.ok) {
          logRepo('findById:map', mapped.error);
          return err('remittance-repository-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logRepo('findById', cause);
        return err('remittance-repository-unavailable');
      }
    },

    findByFileName: async (
      fileName: string,
    ): Promise<Result<Remittance | null, RemittanceRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finRemittances)
          .where(eq(finRemittances.fileName, fileName))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const mapped = toDomain(row, await loadDocumentIds(row.id));
        if (!mapped.ok) {
          logRepo('findByFileName:map', mapped.error);
          return err('remittance-repository-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logRepo('findByFileName', cause);
        return err('remittance-repository-unavailable');
      }
    },

    // JOIN no banco, não filtro em memória: outra instância pode ter enfileirado o mesmo documento
    // há dois segundos, e uma resposta desatualizada aqui custa pagamento em dobro.
    findHeldDocumentIds: async (
      documentIds: readonly string[],
    ): Promise<Result<readonly string[], RemittanceRepositoryError>> => {
      if (documentIds.length === 0) return ok([]);

      try {
        const rows = await db
          .select({ documentId: finRemittanceDocuments.documentId })
          .from(finRemittanceDocuments)
          .innerJoin(finRemittances, eq(finRemittances.id, finRemittanceDocuments.remittanceId))
          .where(
            and(
              inArray(finRemittanceDocuments.documentId, [...documentIds]),
              inArray(finRemittances.status, [...HOLDING]),
            ),
          );

        return ok([...new Set(rows.map((r) => r.documentId))].sort());
      } catch (cause) {
        logRepo('findHeldDocumentIds', cause);
        return err('remittance-repository-unavailable');
      }
    },

    listByStatus: async (
      status: RemittanceStatus,
    ): Promise<Result<readonly Remittance[], RemittanceRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finRemittances)
          .where(eq(finRemittances.status, status));
        const out: Remittance[] = [];

        for (const row of rows) {
          const mapped = toDomain(row, await loadDocumentIds(row.id));
          if (!mapped.ok) {
            logRepo('listByStatus:map', mapped.error);
            return err('remittance-repository-unavailable');
          }
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logRepo('listByStatus', cause);
        return err('remittance-repository-unavailable');
      }
    },

    // #728: página de acompanhamento. Um COUNT para o total; um SELECT ordenado por `generatedAt`
    // DESC (desempate por id desc, estável) com limit/offset; e os documentIds da página em UMA
    // query batch (`WHERE remittance_id IN (ids)`) agrupada num Map — evita o N+1 de chamar
    // `loadDocumentIds` por linha.
    listPaged: async (
      pagination: Readonly<{ limit: number; offset: number }>,
    ): Promise<
      Result<Readonly<{ items: readonly Remittance[]; total: number }>, RemittanceRepositoryError>
    > => {
      try {
        const totalRows = await db.select({ n: sql<number>`count(*)` }).from(finRemittances);
        const total = totalRows[0]?.n ?? 0;

        const rows = await db
          .select()
          .from(finRemittances)
          .orderBy(desc(finRemittances.generatedAt), desc(finRemittances.id))
          .limit(pagination.limit)
          .offset(pagination.offset);

        // Vínculos da página inteira numa consulta só — depois agrupados por remessa.
        const ids = rows.map((r) => r.id);
        const linkRows =
          ids.length === 0
            ? []
            : await db
                .select({
                  remittanceId: finRemittanceDocuments.remittanceId,
                  documentId: finRemittanceDocuments.documentId,
                })
                .from(finRemittanceDocuments)
                .where(inArray(finRemittanceDocuments.remittanceId, ids));

        const documentIdsByRemittance = new Map<string, string[]>();
        for (const link of linkRows) {
          const bucket = documentIdsByRemittance.get(link.remittanceId);
          if (bucket === undefined) {
            documentIdsByRemittance.set(link.remittanceId, [link.documentId]);
          } else {
            bucket.push(link.documentId);
          }
        }

        const items: Remittance[] = [];
        for (const row of rows) {
          const documentIds = (documentIdsByRemittance.get(row.id) ?? []).sort();
          const mapped = toDomain(row, documentIds);
          if (!mapped.ok) {
            logRepo('listPaged:map', mapped.error);
            return err('remittance-repository-unavailable');
          }
          items.push(mapped.value);
        }
        return ok({ items, total });
      } catch (cause) {
        logRepo('listPaged', cause);
        return err('remittance-repository-unavailable');
      }
    },
  };
};
