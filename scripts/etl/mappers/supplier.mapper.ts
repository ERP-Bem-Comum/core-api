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
import type { ServiceRating as ServiceRatingType } from '#src/modules/partners/domain/supplier/service-rating.ts';
import * as PaymentTarget from '#src/modules/partners/domain/shared/payment-target.ts';
import type { Supplier as SupplierEntity } from '#src/modules/partners/domain/supplier/types.ts';
import type {
  BankAccount,
  PixKey,
  PixKeyType,
} from '#src/modules/partners/domain/shared/payment-target.ts';
import type { LegacySupplierRow } from '../legacy/rows.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import {
  type MapperResult,
  requireField,
  requireEmail,
  parseCnpjField,
  statusFromActive,
} from './shared.ts';

// ACL translator: legacy pix_key_type vocabulary → core PixKeyType (#275, Evans DDD p.226).
const LEGACY_PIX_KEY_TYPE_MAP: Readonly<Record<string, PixKeyType>> = {
  CNPJ: 'cnpj',
  CPF: 'cpf',
  EMAIL: 'email',
  CELLPHONE: 'phone',
  ALEATORY_KEY: 'random-key',
};

const translatePixKeyType = (raw: string): string => LEGACY_PIX_KEY_TYPE_MAP[raw] ?? raw;

// ACL translator: nota 1..5 do legado (`serviceEvaluation`) → ServiceRating do core
// (ETL-SUPPLIER-RATING-MAPPING; decisão D2 do mapa de migração 2026-07-02:
// 5→OTIMO, 4→BOM, 3/2→REGULAR, 1→RUIM, null→não avaliado). Fora de 1..5 → quarentena
// (nunca dropa em silêncio).
const LEGACY_SERVICE_RATING_MAP: Readonly<Record<number, ServiceRatingType>> = {
  1: 'RUIM',
  2: 'REGULAR',
  3: 'REGULAR',
  4: 'BOM',
  5: 'OTIMO',
};

const translateServiceRating = (
  raw: number | null,
): Result<ServiceRatingType | null, QuarantineReason> => {
  if (raw === null) return ok(null);
  const rating = LEGACY_SERVICE_RATING_MAP[raw];
  return rating !== undefined
    ? ok(rating)
    : err({ tag: 'EnumUnknown', field: 'service_evaluation', attempted: String(raw) });
};

// Comentário legado: branco → null. Normalização é do ACL — `rehydrate` confia no
// estado que recebe (só register/edit normalizam no domínio).
const normalizeLegacyComment = (raw: string | null): string | null => {
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
};

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
      keyType: translatePixKeyType(row.pixInfoKeyType ?? ''),
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
  const rating = translateServiceRating(row.serviceEvaluation);

  // Acumula erros de campos escalares + destino de pagamento + avaliação numa única quarentena.
  if (!fields.ok || !targets.ok || !rating.ok) {
    const all = [
      ...(fields.ok ? [] : fields.error),
      ...(targets.ok ? [] : targets.error),
      ...(rating.ok ? [] : [rating.error]),
    ];
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
    // Avaliação do legado (`serviceEvaluation`/`commentEvaluation`) traduzida pelo ACL acima.
    serviceRating: rating.value,
    ratingComment: normalizeLegacyComment(row.commentEvaluation),
    status,
    deactivatedAt,
  });
  if (!rehydrated.ok) return err([{ tag: 'RequiredFieldMissing', field: 'payment_target' }]);

  return ok({ aggregate: rehydrated.value, legacyId: row.id });
};
