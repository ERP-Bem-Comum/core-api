/**
 * FinancialEtlStore (InMemory) — par de teste do drizzle (regra de adapters: cada
 * port tem InMemory + real). Mesma semântica: mark blindado (só marca quem ainda
 * não tem legacy_id; legacy_id duplicado → conflict) e adoção de órfão.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import type {
  EtlDocumentRef,
  FinancialEtlStore,
  FinancialEtlStoreError,
} from '#src/modules/financial/application/ports/financial-etl-store.ts';

export type InMemoryEtlDocument = Readonly<{
  id: string;
  status: DocumentStatus;
  version: number;
  documentNumber: string | null;
  supplierRef: string | null;
  grossValueCents: number | null;
  legacyId: number | null;
}>;

export type InMemoryFinancialEtlStore = FinancialEtlStore &
  Readonly<{
    /** Espelho mutável para asserts/seeds nos testes. */
    documents: Map<string, InMemoryEtlDocument>;
  }>;

export const createInMemoryFinancialEtlStore = (
  seed: readonly InMemoryEtlDocument[] = [],
): InMemoryFinancialEtlStore => {
  const documents = new Map<string, InMemoryEtlDocument>(seed.map((d) => [d.id, d]));

  const toRef = (d: InMemoryEtlDocument): EtlDocumentRef => ({
    id: d.id,
    status: d.status,
    version: d.version,
  });

  return {
    documents,

    findDocumentByLegacyId: async (
      legacyId: number,
    ): Promise<Result<EtlDocumentRef | null, FinancialEtlStoreError>> => {
      for (const d of documents.values()) {
        if (d.legacyId === legacyId) return Promise.resolve(ok(toRef(d)));
      }
      return Promise.resolve(ok(null));
    },

    findOrphanCandidate: async (
      documentNumber: string,
      supplierRef: string | null,
      grossValueCents: number | null,
    ): Promise<Result<EtlDocumentRef | null, FinancialEtlStoreError>> => {
      for (const d of documents.values()) {
        if (
          d.legacyId === null &&
          d.documentNumber === documentNumber &&
          d.supplierRef === supplierRef &&
          d.grossValueCents === grossValueCents
        ) {
          return Promise.resolve(ok(toRef(d)));
        }
      }
      return Promise.resolve(ok(null));
    },

    markDocumentLegacyId: async (
      documentId: string,
      legacyId: number,
    ): Promise<Result<void, FinancialEtlStoreError>> => {
      const target = documents.get(documentId);
      if (target?.legacyId !== null) {
        return Promise.resolve(err('financial-etl-store-conflict'));
      }
      for (const d of documents.values()) {
        if (d.legacyId === legacyId) return Promise.resolve(err('financial-etl-store-conflict'));
      }
      documents.set(documentId, { ...target, legacyId });
      return Promise.resolve(ok(undefined));
    },
  };
};
