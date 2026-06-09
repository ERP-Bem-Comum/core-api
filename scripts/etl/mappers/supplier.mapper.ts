/**
 * Mapper ETL: linha legada `suppliers` → agregado `Supplier`.
 *
 * Renomeia `bancaryInfo*`→bankAccount e `pixInfo*`→pixKey; `serviceCategory` literal
 * (ADR-0031 §D2 — quarentena se fora do Set); valida e-mail por formato. Sem destino de
 * pagamento → quarentena (`Supplier.rehydrate` exige ao menos um). D10 para inativos.
 */

import { type Result, ok, err, combine } from '#src/shared/primitives/result.ts';
import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as ServiceCategory from '#src/modules/partners/domain/supplier/service-category.ts';
import type { ServiceCategory as ServiceCategoryType } from '#src/modules/partners/domain/supplier/service-category.ts';
import * as PaymentTarget from '#src/modules/partners/domain/supplier/payment-target.ts';
import type { Supplier as SupplierEntity } from '#src/modules/partners/domain/supplier/types.ts';
import type { BankAccount, PixKey } from '#src/modules/partners/domain/supplier/payment-target.ts';
import type { LegacySupplierRow } from '../legacy/rows.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import {
  type MapperResult,
  requireField,
  requireEmail,
  parseCnpjField,
  statusFromActive,
} from './shared.ts';

const parseServiceCategory = (raw: string): Result<ServiceCategoryType, QuarantineReason> => {
  const r = ServiceCategory.parse(raw);
  return r.ok
    ? ok(r.value)
    : err({ tag: 'EnumUnknown', field: 'service_category', attempted: raw });
};

type PaymentTargets = Readonly<{ bankAccount: BankAccount | null; pixKey: PixKey | null }>;

// Resolve destino(s) de pagamento do legado. Presente-mas-malformado → quarentena
// (nunca dropa em silêncio); nenhum destino → quarentena (rehydrate exige ao menos um).
const resolvePaymentTargets = (
  row: LegacySupplierRow,
): Result<PaymentTargets, readonly QuarantineReason[]> => {
  const errors: QuarantineReason[] = [];
  let bankAccount: BankAccount | null = null;
  let pixKey: PixKey | null = null;

  if (row.bancaryInfoBank !== null) {
    const r = PaymentTarget.createBankAccount({
      bank: row.bancaryInfoBank,
      agency: row.bancaryInfoAgency ?? '',
      accountNumber: row.bancaryInfoAccountnumber ?? '',
      checkDigit: row.bancaryInfoDv ?? '',
    });
    if (r.ok) bankAccount = r.value;
    else errors.push({ tag: 'RequiredFieldMissing', field: 'bank_account' });
  }

  if (row.pixInfoKey !== null) {
    const r = PaymentTarget.createPixKey({
      keyType: row.pixInfoKeyType ?? '',
      key: row.pixInfoKey,
    });
    if (r.ok) pixKey = r.value;
    else
      errors.push({
        tag: 'EnumUnknown',
        field: 'pix_key_type',
        attempted: row.pixInfoKeyType ?? '',
      });
  }

  if (bankAccount === null && pixKey === null && errors.length === 0) {
    errors.push({ tag: 'RequiredFieldMissing', field: 'payment_target' });
  }

  return errors.length > 0 ? err(errors) : ok({ bankAccount, pixKey });
};

export const mapLegacySupplierRow = (row: LegacySupplierRow): MapperResult<SupplierEntity> => {
  const fields = combine<
    readonly [string, string, string, string, Cnpj, ServiceCategoryType],
    QuarantineReason
  >([
    requireField(row.name, 'name'),
    requireEmail(row.email, 'email'),
    requireField(row.corporateName, 'corporate_name'),
    requireField(row.fantasyName, 'fantasy_name'),
    parseCnpjField(row.cnpj, 'cnpj'),
    parseServiceCategory(row.serviceCategory),
  ]);

  const targets = resolvePaymentTargets(row);

  // Acumula erros de campos escalares + destino de pagamento numa única quarentena.
  if (!fields.ok || !targets.ok) {
    const all = [...(fields.ok ? [] : fields.error), ...(targets.ok ? [] : targets.error)];
    return err(all);
  }

  const [name, email, corporateName, fantasyName, cnpj, serviceCategory] = fields.value;
  const status = statusFromActive(row.active);
  const deactivatedAt = status === 'Inactive' ? row.updatedAt : null;

  const rehydrated = Supplier.rehydrate({
    id: SupplierId.generate(),
    name,
    email,
    cnpj,
    corporateName,
    fantasyName,
    serviceCategory,
    bankAccount: targets.value.bankAccount,
    pixKey: targets.value.pixKey,
    // Legado não possui avaliação de prestador (campo nativo do core-api).
    serviceRating: null,
    ratingComment: null,
    status,
    deactivatedAt,
  });
  if (!rehydrated.ok) return err([{ tag: 'RequiredFieldMissing', field: 'payment_target' }]);

  return ok({ aggregate: rehydrated.value, legacyId: row.id });
};
