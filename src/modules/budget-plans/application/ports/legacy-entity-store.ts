/**
 * Port LegacyEntityStore (modulo budget-plans) — persistencia ciente de legacy_id para a ETL.
 *
 * Molde direto de `partners/application/ports/legacy-entity-store.ts`. Generico por entidade
 * (plano/centro/categoria/subcategoria/orcamento/lancamento): os repos padrao fazem upsert by id
 * e nao conhecem legacy_id. Este port (slice BGP-ETL-WRITE-PORT) correlaciona o registro migrado
 * ao id do legado e e' idempotente por legacy_id (skip, NUNCA UPDATE — re-run nao sobrescreve).
 *
 * Os `*EtlInput` sao PLAIN rows (nao agregados de dominio): a ETL (scripts/etl/, fatia 3) so
 * conhece a public-api (ADR-0006). O port escreve exatamente o que o mapper mandar. ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';

export type BudgetPlansEtlStoreError =
  | 'budget-plans-etl-store-unavailable'
  | 'budget-plans-etl-store-integrity-violation';

export type ProvisionOutcome = 'created' | 'already-exists';

// Ref = id UUID (string) da linha migrada. Generico por (Input, Ref) para espelhar partners.
export type LegacyEntityStore<Input, Ref> = Readonly<{
  // Correlacao por legacy_id: retorna a Ref (PK) ja migrada, ou null.
  findByLegacyId: (legacyId: number) => Promise<Result<Ref | null, BudgetPlansEtlStoreError>>;
  // Insert idempotente: grava o input + legacy_id. Se o legacy_id ja existe, no-op ('already-exists').
  provision: (
    input: Input,
    legacyId: number,
  ) => Promise<Result<ProvisionOutcome, BudgetPlansEtlStoreError>>;
}>;

// ── Inputs de negocio (PLAIN rows). `createdAt/updatedAt` do plano sao carimbados pelo port
//    (ClockReal), fora do input — molde partners. `legacy_id` e' parametro separado do provision. ──

export type BudgetPlanEtlInput = Readonly<{
  id: string;
  year: number;
  programRef: string;
  versionMajor: number;
  versionMinor: number;
  status: string;
  parentId: string | null;
  scenarioName: string | null;
  // Autor da ultima escrita no legado (BGP-UPDATED-BY-AUDIT/#373 fase B; decisao P.O. Opcao A,
  // precedente Gabriel D11: migra o autor, nao deixa null). UUID do usuario (auth), resolvido pela
  // ETL via auth.legacy_id. Nullable: nem todo plano legado tem autor rastreavel (miss -> null).
  updatedBy: string | null;
  // Datas do legado (BGP-ETL-PRESERVE-DATES): a ETL migra createdAt/updatedAt do plano legado, NAO o
  // horario da migracao. A "Ultima Alteracao" da tela le updatedAt — tem de refletir a data real.
  createdAt: Date;
  updatedAt: Date;
}>;

export type CostCenterEtlInput = Readonly<{
  id: string;
  budgetPlanId: string;
  name: string;
  direction: string;
  active: boolean;
}>;

export type CategoryEtlInput = Readonly<{
  id: string;
  costCenterId: string;
  name: string;
  active: boolean;
}>;

export type SubcategoryEtlInput = Readonly<{
  id: string;
  categoryId: string;
  name: string;
  launchType: string;
  active: boolean;
}>;

export type BudgetEtlInput = Readonly<{
  id: string;
  budgetPlanId: string;
  partnerKind: string;
  partnerRef: string;
}>;

export type BudgetResultEtlInput = Readonly<{
  id: string;
  budgetId: string;
  subcategoryId: string;
  month: number;
  model: string;
  valueCents: number;
}>;
