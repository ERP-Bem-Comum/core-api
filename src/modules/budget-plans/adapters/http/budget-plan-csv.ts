// Projeção CSV do export de planos (US5) — paridade com o legado (ERP-BACKEND getOneForCsv). Puro:
// achata `PlanExportSection` (carregada pela application) em linhas e serializa via o util canônico
// `src/shared/utils/csv.ts` (BOM + CRLF + anti-fórmula). Separador `;` (legado). Uma linha por
// (orçamento × subcategoria); consolidado = concatenação, sem linha de total.
import { toCsv } from '#src/shared/utils/csv.ts';
import type { PlanExportSection } from '../../application/use-cases/get-plan-export.ts';

export const BUDGET_PLAN_CSV_SEPARATOR = ';';

// 8 dimensões + 12 meses (header do legado). O core-api não modela mês (BudgetResult = 1 valor por
// orçamento×subcategoria; parcelamento fora de escopo #233): o valor vai em JAN, `R$ 0,00` em FEV..DEZ.
export const BUDGET_PLAN_CSV_HEADER: readonly string[] = [
  'plano_orcamentario_id',
  'plano_orcamentario',
  'orcamento_id',
  'orcamento',
  'nome_centro_custo',
  'nome_categoria',
  'nome_sub_categoria',
  'tipo_sub_categoria',
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];

const MONTHS_AFTER_JAN = 11;

// pt-BR currency — paridade com o legado (mesmo toLocaleString): `R$ 1.234,56` (espaço U+00A0).
export const formatCentsBRL = (cents: number): string =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const valueKey = (budgetId: string, subcategoryId: string): string =>
  `${budgetId}::${subcategoryId}`;

export const buildSectionRows = (section: PlanExportSection): readonly (readonly string[])[] => {
  const centsByKey = new Map(
    section.values.map((v) => [valueKey(v.budgetId, v.subcategoryId), v.valueCents] as const),
  );
  const zero = formatCentsBRL(0);
  return section.budgets.flatMap((budget) =>
    section.subcategories.map((sub) => {
      const cents = centsByKey.get(valueKey(budget.id, sub.id)) ?? 0;
      return [
        section.planId,
        section.planLabel,
        budget.id,
        budget.partnerName,
        sub.costCenterName,
        sub.categoryName,
        sub.name,
        sub.launchType,
        formatCentsBRL(cents), // JAN
        ...Array.from({ length: MONTHS_AFTER_JAN }, () => zero), // FEV..DEZ
      ];
    }),
  );
};

export const sectionsToCsv = (sections: readonly PlanExportSection[]): string =>
  toCsv(BUDGET_PLAN_CSV_HEADER, sections.flatMap(buildSectionRows), BUDGET_PLAN_CSV_SEPARATOR);
