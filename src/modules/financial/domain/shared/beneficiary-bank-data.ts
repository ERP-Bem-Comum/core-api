/**
 * BeneficiaryBankData — dados bancários do beneficiário do pagamento.
 *
 * VO **composto** que agrupa banco, agência, conta corrente, identificação
 * fiscal e nome do titular. Campo obrigatório do agregado `Payable` quando
 * o método de pagamento é `Remessa_Bancaria`.
 *
 * **Fonte normativa (handbook):**
 *
 *   - `handbook/domain/04-titulos-liquidacao-context.md:23` —
 *     `TituloFinanceiro.beneficiario: DadosBancarios`.
 *
 * O handbook NÃO detalha os campos internos de `DadosBancarios`. As decisões
 * de modelagem (regex, charset, comprimento) estão documentadas em
 * `.claude/.pipeline/FIN-VO-BENEFICIARY-BANK-DATA/000-request.md §2.2`.
 *
 * **Campos:**
 *
 *   | Campo | Regex / regra | Origem |
 *   | :--- | :--- | :--- |
 *   | `bankCode` | `/^\d{3}$/` | código Bacen — sempre 3 dígitos |
 *   | `agency` | `/^\d{1,5}(-[\dXx])?$/` | 1-5 dígitos + opcional DV (incl. X módulo 11) |
 *   | `account` | `/^\d{1,12}-[\dXx]$/` | dígitos + DV obrigatório |
 *   | `holderTaxId` | `TaxId` validado | predecessor FIN-VO-TAX-ID |
 *   | `holderName` | trim + 1..255 chars | sem restrição de charset |
 *
 * **Fail-fast:** validação retorna **primeiro** erro encontrado, na ordem
 * declarativa do `fromRaw`. UI/CLI pode chamar validações granulares ou
 * combinar `Result` na camada de application se quiser coletar todos.
 *
 * Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
 * Consumir com `import * as BeneficiaryBankData from './beneficiary-bank-data.ts'`.
 */

import type { Brand } from '#src/shared/primitives/brand.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { type TaxId, equals as taxIdEquals } from './tax-id.ts';

// ─── Types ──────────────────────────────────────────────────────────────

export type BeneficiaryBankData = Brand<
  {
    readonly bankCode: string;
    readonly agency: string;
    readonly account: string;
    readonly holderTaxId: TaxId;
    readonly holderName: string;
  },
  'BeneficiaryBankData'
>;

export type BeneficiaryBankDataError =
  | 'bank-code-invalid'
  | 'agency-invalid'
  | 'account-invalid'
  | 'holder-name-empty'
  | 'holder-name-too-long';

export type BeneficiaryBankDataInput = Readonly<{
  bankCode: string;
  agency: string;
  account: string;
  holderTaxId: TaxId;
  holderName: string;
}>;

// ─── Internal regexes ──────────────────────────────────────────────────

const BANK_CODE_REGEX = /^\d{3}$/;
const AGENCY_REGEX = /^\d{1,5}(-[\dXx])?$/;
const ACCOUNT_REGEX = /^\d{1,12}-[\dXx]$/;
const HOLDER_NAME_MAX = 255;

// ─── Smart constructor ─────────────────────────────────────────────────

export const fromRaw = (
  input: BeneficiaryBankDataInput,
): Result<BeneficiaryBankData, BeneficiaryBankDataError> => {
  if (!BANK_CODE_REGEX.test(input.bankCode)) return err('bank-code-invalid');
  if (!AGENCY_REGEX.test(input.agency)) return err('agency-invalid');
  if (!ACCOUNT_REGEX.test(input.account)) return err('account-invalid');

  const trimmedName = input.holderName.trim();
  if (trimmedName.length === 0) return err('holder-name-empty');
  if (trimmedName.length > HOLDER_NAME_MAX) return err('holder-name-too-long');

  return ok(immutable({ ...input, holderName: trimmedName }) as BeneficiaryBankData);
};

// ─── Equality field-by-field ───────────────────────────────────────────

export const equals = (a: BeneficiaryBankData, b: BeneficiaryBankData): boolean =>
  a.bankCode === b.bankCode &&
  a.agency === b.agency &&
  a.account === b.account &&
  a.holderName === b.holderName &&
  taxIdEquals(a.holderTaxId, b.holderTaxId);
