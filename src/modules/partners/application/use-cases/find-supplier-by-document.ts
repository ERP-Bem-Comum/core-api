/**
 * Query `findSupplierByDocument` — busca single por documento (CPF ou CNPJ — #1022). Valida o
 * documento na borda (`SupplierDocument.parse`); `null` é o "não encontrado" canônico (não-erro).
 */

import type { Result } from '#src/shared/index.ts';
import * as SupplierDocument from '#src/modules/partners/domain/supplier/supplier-document.ts';
import type { SupplierDocumentError } from '#src/modules/partners/domain/supplier/supplier-document.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';
import type {
  SupplierRepository,
  SupplierRepositoryError,
} from '#src/modules/partners/domain/supplier/repository.ts';

export type FindSupplierByDocumentCommand = Readonly<{ document: string }>;

export type FindSupplierByDocumentError = SupplierDocumentError | SupplierRepositoryError;

type Deps = Readonly<{ supplierRepo: SupplierRepository }>;

export const findSupplierByDocument =
  (deps: Deps) =>
  async (
    cmd: FindSupplierByDocumentCommand,
  ): Promise<Result<Supplier | null, FindSupplierByDocumentError>> => {
    const document = SupplierDocument.parse(cmd.document);
    if (!document.ok) return document;
    return deps.supplierRepo.findByDocument(document.value);
  };
