/**
 * Costura pura do "Realizado × Planejado" (S6 do épico #502) — o coração do ticket.
 *
 * `stitchRealizedReport(planned, financial)` recebe DUAS fontes planas (já lidas via public-api,
 * ADR-0006) e devolve a árvore de 3 níveis (centro → categoria → subcategoria):
 *   - `planned`   : orçado, grão SUBCATEGORIA × mês (1..12), com a TRILHA completa do plano.
 *   - `financial` : realizado/provisionado, grão SUBCATEGORIA × mês ('YYYY-MM') — S5.
 *
 * Regras travadas no W0:
 *   1. A ÁRVORE VEM DO PLANO (o `planned` é o esqueleto: trilha + `expected` por mês, grade de 12).
 *   2. Realizado/provisionado casam por `(budgetPlanId==budgetPlanRef, subcategoryId==subcategoryRef,
 *      mês)` — na FOLHA. >> A categoria/trilha vêm SEMPRE do PLANO; o `categoryRef` da linha
 *      financeira é IGNORADO (CA6). Duas linhas na mesma folha (doc + manual) SOMAM.
 *   3. Somas de baixo pra cima (CA5): folha (12 meses) → categoria → centro → raiz, nas 3 medidas.
 *      Realizado/provisionado vivem só na folha e sobem por soma — nunca somados direto na categoria
 *      (evita duplicar).
 *   4. CA7b — realizado/provisionado cujo `(budgetPlanRef, subcategoryRef)` não casa NENHUM plano →
 *      centro/categoria/subcategoria sintéticos "Sem orcamento previsto" (expected=0), nunca
 *      descartado. Inclui `subcategoryRef=null`.
 *
 * Função pura, determinística: a ordem de primeira ocorrência (preservada pela iteração de `Map`)
 * mantém a árvore estável — nós reais primeiro, sintéticos por último.
 *
 * NOTA sobre `prefer-readonly-parameter-types`: as funções `finalize*` recebem os acumuladores
 * MUTÁVEIS (que carregam `Map` interno usado só na fase de construção) apenas para LEITURA. Um
 * deep-readonly desses structs não é expressável sem DeepReadonly; o disable pontual segue o idioma
 * do repo para acumuladores (ex.: `shared/outbox/outbox-worker.ts`). ASCII no código; PT-BR nos
 * comentários.
 */
import type { PlannedAmountRow } from '#src/modules/budget-plans/public-api/read.ts';
import type { RealizedProvisionedRow } from '#src/modules/financial/public-api/realized-provisioned-projection.ts';
import type {
  RealizedReport,
  RealizedCostCenter,
  RealizedCategory,
  RealizedSubCategory,
  RealizedMonth,
} from '#src/modules/reports/application/ports/realized-read.ts';

const GHOST_NAME = 'Sem orcamento previsto';
const MONTHS_IN_YEAR = 12;

// Sentinela para chaves compostas quando o ref é null (folha sintética do CA7b). O caractere de
// espaço não aparece em UUID nem em 'YYYY-MM', então a decomposição fica inequívoca.
const NULL_REF = ' ';

// ── Acumuladores mutáveis (congelados na finalização). ─────────────────────────────────────────
interface MonthAcc {
  expected: number;
  realized: number;
  provisioned: number;
}
interface SubAcc {
  id: string;
  name: string;
  months: MonthAcc[]; // índice 0..11 = mês 1..12
}
interface CatAcc {
  id: string;
  name: string;
  subs: Map<string, SubAcc>;
}
interface CcAcc {
  id: string;
  name: string;
  budgetPlanId: string;
  cats: Map<string, CatAcc>;
}

const sumBy = <T>(items: readonly T[], pick: (item: T) => number): number =>
  items.reduce((acc, item) => acc + pick(item), 0);

const zeroMonths = (): MonthAcc[] =>
  Array.from({ length: MONTHS_IN_YEAR }, () => ({ expected: 0, realized: 0, provisioned: 0 }));

const leafKey = (budgetPlanRef: string, subcategoryRef: string | null): string =>
  `${budgetPlanRef}|${subcategoryRef ?? NULL_REF}`;

// Soma as medidas informadas no bucket do mês (1..12). Índice fora de faixa é ignorado (defensivo).
const addTo = (
  months: MonthAcc[], // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types -- acumulador mutável
  month: number,
  delta: Readonly<Partial<MonthAcc>>,
): void => {
  const bucket = months[month - 1];
  if (bucket === undefined) return;
  bucket.expected += delta.expected ?? 0;
  bucket.realized += delta.realized ?? 0;
  bucket.provisioned += delta.provisioned ?? 0;
};

const finalizeSub = (
  sub: SubAcc, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types -- acumulador mutável, só leitura
): RealizedSubCategory => {
  const months: RealizedMonth[] = sub.months.map((acc, i) => ({
    month: i + 1,
    expected: acc.expected,
    realized: acc.realized,
    provisioned: acc.provisioned,
  }));
  return {
    id: sub.id,
    name: sub.name,
    totalExpected: sumBy(months, (m) => m.expected),
    totalRealized: sumBy(months, (m) => m.realized),
    totalProvisioned: sumBy(months, (m) => m.provisioned),
    months,
  };
};

// Célula do mês `i` (0..11) de uma folha já finalizada; ausência vira zero (grade sempre de 12).
const ZERO_MONTH: RealizedMonth = { month: 0, expected: 0, realized: 0, provisioned: 0 };
const monthCell = (sub: RealizedSubCategory, i: number): RealizedMonth =>
  sub.months[i] ?? ZERO_MONTH;

const finalizeCategory = (
  cat: CatAcc, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types -- acumulador mutável, só leitura
): RealizedCategory => {
  const subCategories = [...cat.subs.values()].map(finalizeSub);
  // months[m] da categoria = soma das subcategorias no mês m, nas 3 medidas (nunca conta a folha
  // duas vezes: o realizado/provisionado nasce só na folha e a categoria apenas soma).
  const months: RealizedMonth[] = Array.from({ length: MONTHS_IN_YEAR }, (_unused, i) => ({
    month: i + 1,
    expected: sumBy(subCategories, (s) => monthCell(s, i).expected),
    realized: sumBy(subCategories, (s) => monthCell(s, i).realized),
    provisioned: sumBy(subCategories, (s) => monthCell(s, i).provisioned),
  }));
  return {
    id: cat.id,
    name: cat.name,
    totalExpected: sumBy(subCategories, (s) => s.totalExpected),
    totalRealized: sumBy(subCategories, (s) => s.totalRealized),
    totalProvisioned: sumBy(subCategories, (s) => s.totalProvisioned),
    months,
    subCategories,
  };
};

const finalizeCenter = (
  cc: CcAcc, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types -- acumulador mutável, só leitura
): RealizedCostCenter => {
  const categories = [...cc.cats.values()].map(finalizeCategory);
  return {
    id: cc.id,
    name: cc.name,
    budgetPlanId: cc.budgetPlanId,
    totalExpected: sumBy(categories, (c) => c.totalExpected),
    totalRealized: sumBy(categories, (c) => c.totalRealized),
    totalProvisioned: sumBy(categories, (c) => c.totalProvisioned),
    categories,
  };
};

const finalizeReport = (centers: ReadonlyMap<string, CcAcc>): RealizedReport => {
  const costCenters = [...centers.values()].map(finalizeCenter);
  return {
    totalExpected: sumBy(costCenters, (c) => c.totalExpected),
    totalRealized: sumBy(costCenters, (c) => c.totalRealized),
    totalProvisioned: sumBy(costCenters, (c) => c.totalProvisioned),
    costCenters,
  };
};

export const stitchRealizedReport = (
  planned: readonly PlannedAmountRow[],
  financial: readonly RealizedProvisionedRow[],
): RealizedReport => {
  const centers = new Map<string, CcAcc>();
  // Índice (budgetPlanId, subcategoryId) -> folha do PLANO, para casar o financial em O(1).
  const leafIndex = new Map<string, SubAcc>();

  const getCenter = (key: string, id: string, name: string, budgetPlanId: string): CcAcc => {
    const existing = centers.get(key);
    if (existing !== undefined) return existing;
    const created: CcAcc = { id, name, budgetPlanId, cats: new Map() };
    centers.set(key, created);
    return created;
  };
  const getCategory = (
    cc: CcAcc, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types -- acumulador mutável (é onde a categoria é inserida)
    id: string,
    name: string,
  ): CatAcc => {
    const existing = cc.cats.get(id);
    if (existing !== undefined) return existing;
    const created: CatAcc = { id, name, subs: new Map() };
    cc.cats.set(id, created);
    return created;
  };
  const getSub = (
    cat: CatAcc, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types -- acumulador mutável (é onde a subcategoria é inserida)
    id: string,
    name: string,
  ): SubAcc => {
    const existing = cat.subs.get(id);
    if (existing !== undefined) return existing;
    const created: SubAcc = { id, name, months: zeroMonths() };
    cat.subs.set(id, created);
    return created;
  };

  // ── 1. Esqueleto: a árvore + o `expected` vêm do PLANO. ────────────────────────────────────────
  for (const row of planned) {
    const cc = getCenter(row.costCenterId, row.costCenterId, row.costCenterName, row.budgetPlanId);
    const cat = getCategory(cc, row.categoryId, row.categoryName);
    const sub = getSub(cat, row.subcategoryId, row.subcategoryName);
    addTo(sub.months, row.month, { expected: row.plannedCents });
    leafIndex.set(leafKey(row.budgetPlanId, row.subcategoryId), sub);
  }

  // Resolve (ou cria) a folha sintética do CA7b: um centro/categoria/subcategoria "Sem orcamento
  // previsto" POR budgetPlanRef; a subcategoria órfã é chaveada pelo subcategoryRef (null incluso).
  const ghostLeaf = (row: RealizedProvisionedRow): SubAcc => {
    const scope = `${NULL_REF}ghost|${row.budgetPlanRef}`;
    const cc = getCenter(scope, `${scope}|cc`, GHOST_NAME, row.budgetPlanRef);
    const cat = getCategory(cc, `${scope}|cat`, GHOST_NAME);
    return getSub(cat, row.subcategoryRef ?? `${scope}|sub`, GHOST_NAME);
  };

  // ── 2. Financial: casa na folha do plano por (budgetPlanRef, subcategoryRef, mês). ─────────────
  //   categoryRef IGNORADO (CA6). Sem casamento -> folha sintética "Sem orcamento previsto" (CA7b).
  for (const row of financial) {
    const month = Number(row.month.slice(5, 7));
    const sub = leafIndex.get(leafKey(row.budgetPlanRef, row.subcategoryRef)) ?? ghostLeaf(row);
    addTo(sub.months, month, {
      realized: row.realizedCents,
      provisioned: row.provisionedCents,
    });
  }

  return finalizeReport(centers);
};
