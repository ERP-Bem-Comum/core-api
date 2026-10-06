/**
 * `SupplierDocument` — documento do Fornecedor: CPF (pessoa física, pago por RPA) ou CNPJ
 * (pessoa jurídica). Consumir via `import * as SupplierDocument from './supplier-document.ts'`.
 *
 * Vive no módulo `partners`, NÃO no kernel (#1022): só o Fornecedor aceita os dois documentos.
 * `Financier` e `Act` continuam com o `Cnpj` do kernel e recusam CPF.
 *
 * O tipo de pessoa (PF/PJ) não é campo próprio: é o `kind` do documento. Um campo separado
 * permitiria gravar PF com um CNPJ — aqui o estado inválido não é representável.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';

export type CpfDocument = Readonly<{ kind: 'cpf'; value: Cpf.Cpf }>;
export type CnpjDocument = Readonly<{ kind: 'cnpj'; value: Cnpj.Cnpj }>;

export type SupplierDocument = CpfDocument | CnpjDocument;

export type SupplierDocumentError = 'invalid-supplier-document';

/** Tamanhos da forma canônica, sem máscara — fonte única, reusada pela borda HTTP. */
export const CPF_LENGTH = 11;
export const CNPJ_LENGTH = 14;

// Mesma máscara que os VOs do kernel removem (`.` `-` `/` espaços).
const stripMask = (raw: string): string => raw.replace(/[.\-/\s]/g, '');

/**
 * Decide o documento pelo formato e delega a validação ao VO do kernel:
 *   - qualquer letra ou 14 caracteres → `Cnpj.parse` (o CNPJ pode ser alfanumérico — ADR-0044);
 *   - 11 dígitos → `Cpf.parse`;
 *   - outro tamanho → `invalid-supplier-document`.
 */
export const parse = (raw: string): Result<SupplierDocument, SupplierDocumentError> => {
  const bare = stripMask(raw);
  if (/[A-Za-z]/.test(bare) || bare.length === CNPJ_LENGTH) {
    const cnpj = Cnpj.parse(bare);
    return cnpj.ok ? ok({ kind: 'cnpj', value: cnpj.value }) : err('invalid-supplier-document');
  }
  if (bare.length === CPF_LENGTH) {
    const cpf = Cpf.parse(bare);
    return cpf.ok ? ok({ kind: 'cpf', value: cpf.value }) : err('invalid-supplier-document');
  }
  return err('invalid-supplier-document');
};

/** Forma canônica sem máscara (11 dígitos ou 14 caracteres uppercase) — chave de unicidade. */
export const toRaw = (document: SupplierDocument): string => document.value;

export const equals = (a: SupplierDocument, b: SupplierDocument): boolean =>
  a.kind === b.kind && a.value === b.value;
