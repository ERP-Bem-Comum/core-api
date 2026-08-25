// Tipos de domínio do resultado da leitura de documento (fatia 1 — FIN-DOC-READER-PORT).
// Imutável (`Readonly`) e MINIMIZADO (LGPD): só campos extraídos + `resolvedVia`.
// NENHUM campo de texto bruto do documento — ver CA2 do 000-request.md.
//
// Identificadores em EN (ADR-0023 §"Nomenclatura canônica (EN no código · PT na borda)").
// Reusa os VOs/tipos canônicos do módulo (não redefine): `DocumentType`, `Competencia`,
// `Money`, `Retention` — para casar 1:1 com o agregado `Document` no wiring das fatias seguintes.
import type { Money } from '../../../../shared/kernel/money.ts';
import type { DocumentType } from '../document/types.ts';
import type { Competencia } from '../document/competencia.ts';
import type { Retention } from '../shared/retention.ts';

// Identidade do fornecedor EXTRAÍDA do documento — distinta de `SupplierRef` (referência
// cadastral): o fornecedor pode ainda não existir no cadastro. Campos EN.
export type SupplierIdentity = Readonly<{
  legalName: string;
  taxId: string;
}>;

// Resultado da leitura. `resolvedVia` é a TAG DE PROVENIÊNCIA da via que resolveu — NÃO é uma
// discriminated union: os demais campos coexistem no mesmo shape independentemente da via, e são
// opcionais (readers parciais devolvem só o que conseguiram extrair). Valores monetários são `Money`
// (VO validado, ADR-0018), compet./tipo/retenções reusam os VOs canônicos do agregado `Document`.
export type DocumentReaderResult = Readonly<{
  resolvedVia: 'xml' | 'native-text' | 'unpdf';
  type?: DocumentType;
  documentNumber?: string;
  competence?: Competencia;
  issueDate?: Date;
  supplier?: SupplierIdentity;
  grossValue?: Money;
  retentions?: readonly Retention[];
  // #566: descrição do serviço da NFS-e (ex.: "Descrição do Serviço …") → campo `description` do
  // rascunho. NÃO carrega o fornecedor (que resolve para `supplierRef` via #560).
  description?: string;
}>;
