/**
 * Mapper ETL: linha legada `financiers` → agregado `Financier`.
 *
 * Parseia campos → VOs acumulando erros (`combine`), deriva status/deactivatedAt de
 * `active` (D10) e delega a `Financier.rehydrate`. Gera UUID novo; `legacyId` carrega o
 * `int` de origem (idempotência no WRITER). Linha inválida → `QuarantineReason[]`.
 */

import { ok, err, combine } from '#src/shared/primitives/result.ts';
import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import type { Financier as FinancierEntity } from '#src/modules/partners/domain/financier/types.ts';
import type { LegacyFinancierRow } from '../legacy/rows.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import { type MapperResult, requireField, parseCnpjField, statusFromActive } from './shared.ts';

export const mapLegacyFinancierRow = (row: LegacyFinancierRow): MapperResult<FinancierEntity> => {
  // Type args explícitos: a inferência do `combine` falha com tupla de `Result` de 2 ramos.
  const fields = combine<readonly [string, string, string, string, string, Cnpj], QuarantineReason>(
    [
      requireField(row.name, 'name'),
      requireField(row.corporateName, 'corporate_name'),
      requireField(row.legalRepresentative, 'legal_representative'),
      requireField(row.telephone, 'telephone'),
      requireField(row.address, 'address'),
      parseCnpjField(row.cnpj, 'cnpj'),
    ],
  );
  if (!fields.ok) return err(fields.error);

  const [name, corporateName, legalRepresentative, telephone, address, cnpj] = fields.value;
  const status = statusFromActive(row.active);
  const deactivatedAt = status === 'Inactive' ? row.updatedAt : null;

  const rehydrated = Financier.rehydrate({
    id: FinancierId.generate(),
    name,
    corporateName,
    legalRepresentative,
    cnpj,
    telephone,
    address,
    bankAccount: null,
    pixKey: null,
    status,
    deactivatedAt,
  });
  // Defensivo: rehydrate só falha p/ Inactive sem deactivatedAt — que sempre fornecemos.
  if (!rehydrated.ok) return err([{ tag: 'RequiredFieldMissing', field: 'deactivated_at' }]);

  return ok({ aggregate: rehydrated.value, legacyId: row.id });
};
