/**
 * REALIZED-READ — Port de LEITURA (read-only) do "Realizado × Planejado" (S6 do épico #502 ·
 * fatia final de REPORTS-REALIZED-VS-PLANNED · #416).
 *
 * A árvore de 3 níveis (centro → categoria → subcategoria) que a borda HTTP serializa direto.
 * Montada pela costura (`adapters/persistence/realized-read.stitch.ts`) sobre DUAS fontes lidas via
 * public-api (ADR-0006): o ORÇADO (`budget-plans`) e o REALIZADO/PROVISIONADO (`financial`, S5).
 *
 * Contrato da árvore (espelha o legado `openapi.yaml:3070`):
 *  - `months[12]` só em categoria e subcategoria (NUNCA em centro/raiz — o legado não os expõe lá);
 *  - 3 medidas por nó (`totalExpected`/`totalRealized`/`totalProvisioned`), em cents;
 *  - grão de SUBCATEGORIA na folha: realizado/provisionado PREENCHEM a folha (S5 inverteu a premissa
 *    antiga "subcategoria = só previsto"). As somas conservam de baixo pra cima (CA5).
 */
import type { Result } from '#src/shared/primitives/result.ts';

/** Uma célula mensal (mês 1..12) com as 3 medidas em cents. */
export type RealizedMonth = Readonly<{
  month: number;
  expected: number;
  realized: number;
  provisioned: number;
}>;

/** Folha da árvore: subcategoria. Carrega realizado/provisionado no novo grão (S5). */
export type RealizedSubCategory = Readonly<{
  id: string;
  name: string;
  totalExpected: number;
  totalRealized: number;
  totalProvisioned: number;
  months: readonly RealizedMonth[];
}>;

/** Nível intermediário: categoria. `months[12]` = soma das subcategorias no mês. */
export type RealizedCategory = Readonly<{
  id: string;
  name: string;
  totalExpected: number;
  totalRealized: number;
  totalProvisioned: number;
  months: readonly RealizedMonth[];
  subCategories: readonly RealizedSubCategory[];
}>;

/** Raiz da subárvore: centro de custo. Sem `months` (espelha o legado). */
export type RealizedCostCenter = Readonly<{
  id: string;
  name: string;
  budgetPlanId: string;
  totalExpected: number;
  totalRealized: number;
  totalProvisioned: number;
  categories: readonly RealizedCategory[];
}>;

/** O relatório inteiro. Sem `months` na raiz (espelha o legado). */
export type RealizedReport = Readonly<{
  totalExpected: number;
  totalRealized: number;
  totalProvisioned: number;
  costCenters: readonly RealizedCostCenter[];
}>;

/**
 * Filtro do relatório. `year` OBRIGATÓRIO (o Realizado é sempre de um exercício). Demais opcionais e
 * combináveis; `partnerStateRef` + `partnerMunicipalityRef` juntos = OR (soma as duas Redes, Frente A).
 * Refs OPACOS — este módulo não resolve nome.
 */
export type RealizedFilter = Readonly<{
  year: number;
  programRef?: string;
  budgetPlanId?: string;
  partnerStateRef?: string;
  partnerMunicipalityRef?: string;
}>;

/** Union nomeada (não `string` cru): o consumidor faz switch exaustivo sobre o erro. */
export type RealizedReadError = 'realized-read-unavailable';

export type RealizedReadPort = Readonly<{
  list: (filter: RealizedFilter) => Promise<Result<RealizedReport, RealizedReadError>>;
}>;
