import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as SourceDocumentRef from './source-document-ref.ts'`.
//
// FK opaca para o agregado `FiscalDocument` do BC Gestão de Documentos
// (ainda não implementado — Fatia 6+). Branded preserva isolamento do BC
// e evita coupling antes da hora. Quando `FiscalDocumentId` chegar, refactor
// swap (1 tipo).
//
// handbook/domain/04-titulos-liquidacao-context.md:17 — `Payable.origem: DocumentoID`.

export type SourceDocumentRef = Brand<string, 'SourceDocumentRef'>;
export type SourceDocumentRefError = 'source-document-ref-invalid';

export const generate = (): SourceDocumentRef => newUuid() as SourceDocumentRef;

export const rehydrate = (raw: string): Result<SourceDocumentRef, SourceDocumentRefError> =>
  isUuidV4(raw) ? ok(raw as SourceDocumentRef) : err('source-document-ref-invalid');
