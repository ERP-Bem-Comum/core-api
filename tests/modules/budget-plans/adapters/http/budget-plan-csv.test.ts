// BDG-CONSOLIDATED-CSV (US5) — W0 RED — projeção CSV pura (paridade com o legado).
// O legado (ERP-BACKEND getOneForCsv + generate-csv.ts) emite 20 colunas, separador ';',
// UTF-8 com BOM, linhas = produto budgets × subcategorias, SEM linha de total/subtotal.
// Decisão Gabriel 2026-07-09: como o core-api não modela mês (BudgetResult = 1 valor por
// orçamento×subcategoria; parcelamento temporal fora de escopo #233), mantemos o header de
// 20 colunas do legado e pomos o valor em JAN, R$ 0,00 em FEV..DEZ.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { BOM } from '#src/shared/utils/csv.ts';
import {
  BUDGET_PLAN_CSV_HEADER,
  formatCentsBRL,
  buildSectionRows,
  sectionsToCsv,
} from '#src/modules/budget-plans/adapters/http/budget-plan-csv.ts';
import type { PlanExportSection } from '#src/modules/budget-plans/application/use-cases/get-plan-export.ts';

const sectionOne: PlanExportSection = {
  planId: 'plan-1',
  planLabel: '2026 Ensino em Tempo Integral 1',
  budgets: [{ id: 'bud-1', partnerName: 'Fortaleza' }],
  subcategories: [
    {
      id: 'sub-1',
      costCenterName: 'Operacional',
      categoryName: 'Pessoal',
      name: 'Salários',
      launchType: 'DESPESAS_PESSOAIS',
    },
    {
      id: 'sub-2',
      costCenterName: 'Operacional',
      categoryName: 'Logística',
      name: 'Frete',
      launchType: 'DESPESAS_LOGISTICAS',
    },
  ],
  values: [{ budgetId: 'bud-1', subcategoryId: 'sub-1', valueCents: 123456 }],
};

describe('BUDGET_PLAN_CSV_HEADER — 20 colunas na ordem exata do legado', () => {
  it('bate coluna a coluna', () => {
    assert.deepEqual(BUDGET_PLAN_CSV_HEADER, [
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
    ]);
  });
});

describe('formatCentsBRL — paridade pt-BR (toLocaleString)', () => {
  it('R$ com espaço não-quebrável (U+00A0), milhar . e decimal ,', () => {
    assert.equal(formatCentsBRL(123456), 'R$ 1.234,56');
    assert.equal(formatCentsBRL(0), 'R$ 0,00');
  });
});

describe('buildSectionRows — produto budgets × subcategorias, valor em JAN', () => {
  it('gera 1 linha por (orçamento × subcategoria), sem linha de total', () => {
    const rows = buildSectionRows(sectionOne);
    // 1 orçamento × 2 subcategorias = 2 linhas; nenhuma linha extra de total/subtotal.
    assert.equal(rows.length, 2);
  });

  it('primeira coluna dimensional espelha o domínio; JAN carrega o valor, FEV..DEZ zeram', () => {
    const rows = buildSectionRows(sectionOne);
    const [first] = rows;
    assert.ok(first !== undefined);
    // 8 dimensões + 12 meses.
    assert.equal(first.length, 20);
    assert.deepEqual(first.slice(0, 8), [
      'plan-1',
      '2026 Ensino em Tempo Integral 1',
      'bud-1',
      'Fortaleza',
      'Operacional',
      'Pessoal',
      'Salários',
      'DESPESAS_PESSOAIS',
    ]);
    assert.equal(first[8], formatCentsBRL(123456)); // JAN
    // FEV..DEZ (índices 9..19) = R$ 0,00
    assert.deepEqual(
      first.slice(9),
      Array.from({ length: 11 }, () => formatCentsBRL(0)),
    );
  });

  it('subcategoria sem budget_result → JAN = R$ 0,00 (default)', () => {
    const rows = buildSectionRows(sectionOne);
    const second = rows[1];
    assert.ok(second !== undefined);
    assert.equal(second[6], 'Frete'); // nome_sub_categoria
    assert.equal(second[8], formatCentsBRL(0)); // sub-2 ausente em values → 0
  });
});

describe('sectionsToCsv — serialização final (BOM, ;, header, concat)', () => {
  it('inicia com BOM, usa ; como separador e header de 20 colunas', () => {
    const csv = sectionsToCsv([sectionOne]);
    assert.ok(csv.startsWith(BOM), 'CSV deve iniciar com BOM UTF-8');
    const withoutBom = csv.slice(BOM.length);
    const firstLine = withoutBom.split('\r\n')[0];
    assert.equal(firstLine, BUDGET_PLAN_CSV_HEADER.join(';'));
  });

  it('consolidado = concatenação das linhas de todos os planos, sem total', () => {
    const sectionTwo: PlanExportSection = {
      ...sectionOne,
      planId: 'plan-2',
      planLabel: '2026 Parceiros 1',
    };
    const csv = sectionsToCsv([sectionOne, sectionTwo]);
    const body = csv.slice(BOM.length).split('\r\n').filter(Boolean);
    // 1 header + (2 planos × 2 linhas) = 5 linhas; nenhuma linha de total.
    assert.equal(body.length, 5);
    assert.ok(body[1]?.startsWith('plan-1;'));
    assert.ok(body[3]?.startsWith('plan-2;'));
  });
});
