/**
 * REPORTS-REALIZED-ENDPOINT (S6 do epico #502 · fatia final de REPORTS-REALIZED-VS-PLANNED) —
 * W0 RED · Frente B (a costura).
 *
 * Testa a FUNCAO PURA `stitchRealizedReport(planned, financial)` — o coracao do ticket. Recebe DUAS
 * fontes planas (ja lidas via public-api, ADR-0006):
 *   - `planned`   : linhas do orcado (subcategoria x mes 1..12) — grao de SUBCATEGORIA (fatia 1).
 *   - `financial` : realizado/provisionado (subcategoria x mes 'YYYY-MM') — grao de SUBCATEGORIA (S5).
 * e devolve a arvore de 3 niveis (centro -> categoria -> subcategoria), com os 3 totais por no +
 * months[12] em categoria e subcategoria (nunca em centro/raiz — espelha o legado).
 *
 * DEVE FALHAR em W0: `#src/modules/reports/adapters/persistence/realized-read.stitch.ts` ainda NAO
 * existe — o import de topo quebra (ERR_MODULE_NOT_FOUND) e TODO este arquivo fica vermelho. RED pelo
 * motivo certo (inexistencia do modulo). Roda no `pnpm test` PURO (funcao pura, zero DB).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * DECISAO DE CONTRATO TRAVADA AQUI — grao de SUBCATEGORIA na folha (RE-ESCOPO 2026-07-21):
 *   O W0 ANTIGO travava "financial so tem grao de CATEGORIA; subcategoria = SO expected, realized=0".
 *   As fatias S1..S5 INVERTERAM isso: o financial agora carrega `subcategoryRef` e agrega no grao de
 *   SUBCATEGORIA (incluindo titulos manuais). Logo:
 *     - REALIZADO/PROVISIONADO PREENCHEM A FOLHA (subcategoria) — a folha tem NUMERO, nao zero.
 *     - Casamento por `(budgetPlanId==budgetPlanRef, subcategoryId==subcategoryRef, mes)`.
 *   >> A CATEGORIA e a TRILHA vem SEMPRE do PLANO (da linha `planned`), NUNCA do `categoryRef` da
 *      linha financeira: o titulo manual sai com `categoryRef=null` (S5) e ate o documento pode ter
 *      categoria inconsistente. O plano e o dono (ADR-0051). >> `categoryRef` do financial e IGNORADO
 *      na montagem da arvore <<. Ver CA6.
 *   CA5 (conservacao): "soma dos 12 meses == total do no" e "soma dos filhos == pai" valem para as
 *   3 medidas em TODOS os niveis (subcat -> cat -> centro -> raiz), pois agora as 3 medidas tem grao
 *   de subcategoria (nada de rateio inventado; a folha recebe o numero direto da S5).
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { stitchRealizedReport } from '#src/modules/reports/adapters/persistence/realized-read.stitch.ts';
import type {
  RealizedReport,
  RealizedCostCenter,
  RealizedCategory,
  RealizedSubCategory,
  RealizedMonth,
} from '#src/modules/reports/application/ports/realized-read.ts';
import type { PlannedAmountRow } from '#src/modules/budget-plans/public-api/read.ts';
import type { RealizedProvisionedRow } from '#src/modules/financial/public-api/realized-provisioned-projection.ts';

// ── Assinatura pinada pelo W0 (o W1 implementa EXATAMENTE isto) ──────────────────────────────────
//   stitchRealizedReport(
//     planned:   readonly PlannedAmountRow[],        // grao subcategoria x mes (1..12)
//     financial: readonly RealizedProvisionedRow[],  // grao subcategoria x mes ('YYYY-MM')
//   ): RealizedReport
//
//   RealizedMonth       = Readonly<{ month: 1..12; expected; realized; provisioned }>  // cents
//   RealizedSubCategory = Readonly<{ id; name; totalExpected; totalRealized; totalProvisioned;
//                                    months: RealizedMonth[12] }>  // realized/provisioned NA FOLHA
//   RealizedCategory    = Readonly<{ id; name; totalExpected; totalRealized; totalProvisioned;
//                                    months: RealizedMonth[12]; subCategories: RealizedSubCategory[] }>
//   RealizedCostCenter  = Readonly<{ id; name; budgetPlanId; totalExpected; totalRealized;
//                                    totalProvisioned; categories: RealizedCategory[] }>  // sem months
//   RealizedReport      = Readonly<{ totalExpected; totalRealized; totalProvisioned;
//                                    costCenters: RealizedCostCenter[] }>                 // sem months
//
//   No sintetico CA7b: centro `name === 'Sem orcamento previsto'`, budgetPlanId = budgetPlanRef do
//   financial; categoria sintetica de mesmo nome; subcategoria sintetica carregando o realizado/
//   provisionado orfao; expected = 0 em toda a subarvore.

// UUID v4 VALIDOS (so hex; a S1 teve typo 'u' — NAO repetir). y ∈ {8,9,a,b}.
const P1 = '10000000-0000-4000-8000-000000000001';
const CC1 = 'cc100000-0000-4000-8000-0000000000c1';
const CAT1 = 'ca100000-0000-4000-8000-0000000000a1';
const SUB1 = '5b100000-0000-4000-8000-0000000000b1';
const SUB2 = '5b200000-0000-4000-8000-0000000000b2';
const SUB_ORPHAN = 'aa900000-0000-4000-8000-0000000000f9';

const ALL_MONTHS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Constroi as 12 linhas planas de UMA subcategoria; `byMonth` preenche os meses com lancamento.
const plannedGrid = (
  sub: Readonly<{ id: string; name: string }>,
  byMonth: Readonly<Record<number, number>>,
): PlannedAmountRow[] =>
  ALL_MONTHS.map((month) => ({
    budgetPlanId: P1,
    costCenterId: CC1,
    costCenterName: 'Centro 1',
    categoryId: CAT1,
    categoryName: 'Categoria 1',
    subcategoryId: sub.id,
    subcategoryName: sub.name,
    month,
    plannedCents: byMonth[month] ?? 0,
  }));

// Linha financeira no grao de SUBCATEGORIA (S5). `categoryRef` PODE ser null (titulo manual) — e a
// costura DEVE ignora-lo (a categoria vem do plano). `subcategoryRef` e a chave de casamento.
const fin = (
  over: Readonly<{
    budgetPlanRef?: string;
    categoryRef?: string | null;
    subcategoryRef: string | null;
    month: string;
    realizedCents?: number;
    provisionedCents?: number;
  }>,
): RealizedProvisionedRow => ({
  budgetPlanRef: over.budgetPlanRef ?? P1,
  categoryRef: over.categoryRef === undefined ? CAT1 : over.categoryRef,
  subcategoryRef: over.subcategoryRef,
  month: over.month,
  realizedCents: over.realizedCents ?? 0,
  provisionedCents: over.provisionedCents ?? 0,
});

// ── Fixture canonica (reusada): 1 plano, 1 centro, 1 categoria, 2 subcategorias. ─────────────────
//   Orcado:  S1 mes3=300, mes7=700 (exp 1000) ; S2 mes3=100 (exp 100)         -> totalExpected 1100
//   Financeiro (grao SUBCATEGORIA):
//     S1 mes3 real=250 ; S1 mes5 real=50 (mes SEM expected) ; S1 mes7 prov=700
//     S2 mes3 real=80  com categoryRef=null (titulo manual — CA6: cai em S2/CAT1 pela trilha do plano)
//   -> S1: exp 1000 / real 300 / prov 700 ; S2: exp 100 / real 80 / prov 0
//   -> CAT1: exp 1100 / real 380 / prov 700     (totalRealized/Provisioned agora VEM da folha)
const PLANNED: readonly PlannedAmountRow[] = [
  ...plannedGrid({ id: SUB1, name: 'Sub 1' }, { 3: 300, 7: 700 }),
  ...plannedGrid({ id: SUB2, name: 'Sub 2' }, { 3: 100 }),
];
const FINANCIAL: readonly RealizedProvisionedRow[] = [
  fin({ subcategoryRef: SUB1, categoryRef: CAT1, month: '2026-03', realizedCents: 250 }),
  fin({ subcategoryRef: SUB1, categoryRef: CAT1, month: '2026-05', realizedCents: 50 }),
  fin({ subcategoryRef: SUB1, categoryRef: CAT1, month: '2026-07', provisionedCents: 700 }),
  // Titulo manual: categoryRef=null, mas subcategoryRef=SUB2 -> tem de cair em S2 sob CAT1 (CA6).
  fin({ subcategoryRef: SUB2, categoryRef: null, month: '2026-03', realizedCents: 80 }),
];

const sumMonths = (months: readonly RealizedMonth[], k: keyof RealizedMonth): number =>
  months.reduce((a, m) => a + m[k], 0);

const onlyCostCenter = (report: RealizedReport, name: string): RealizedCostCenter => {
  const cc = report.costCenters.find((c) => c.name === name);
  assert.ok(cc, `esperava centro de custo '${name}'`);
  return cc;
};
const onlyCategory = (cc: RealizedCostCenter, id: string): RealizedCategory => {
  const cat = cc.categories.find((c) => c.id === id);
  assert.ok(cat, `esperava categoria '${id}'`);
  return cat;
};
const onlySub = (cat: RealizedCategory, id: string): RealizedSubCategory => {
  const s = cat.subCategories.find((x) => x.id === id);
  assert.ok(s, `esperava subcategoria '${id}'`);
  return s;
};
const monthOf = (months: readonly RealizedMonth[], m: number): RealizedMonth => {
  const found = months.find((x) => x.month === m);
  assert.ok(found, `esperava mes ${String(m)}`);
  return found;
};

describe('REPORTS-REALIZED · stitch · CA1 — arvore de 3 niveis com months[12] por no', () => {
  it('monta centro -> categoria -> subcategoria; months[12] em categoria e subcategoria', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);

    const cc = onlyCostCenter(report, 'Centro 1');
    assert.equal(cc.budgetPlanId, P1);
    assert.equal(cc.categories.length, 1);

    const cat = onlyCategory(cc, CAT1);
    assert.equal(cat.months.length, 12, 'categoria tem 12 meses');
    assert.deepEqual(
      cat.months.map((m) => m.month),
      ALL_MONTHS,
      'meses em ordem 1..12',
    );
    assert.equal(cat.subCategories.length, 2, 'as 2 subcategorias do plano aparecem');

    for (const sub of cat.subCategories) {
      assert.equal(sub.months.length, 12, `subcategoria ${sub.id} tem 12 meses`);
      assert.deepEqual(
        sub.months.map((m) => m.month),
        ALL_MONTHS,
      );
    }
  });

  it('cada RealizedMonth tem exatamente {month, expected, realized, provisioned}', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    const sub = onlySub(onlyCategory(onlyCostCenter(report, 'Centro 1'), CAT1), SUB1);
    for (const m of sub.months) {
      assert.deepEqual(Object.keys(m).sort(), ['expected', 'month', 'provisioned', 'realized']);
    }
  });
});

describe('REPORTS-REALIZED · stitch · CA2/CA3/CA4 — grao de SUBCATEGORIA (a folha tem numero)', () => {
  it('CA2: previsto vem do orcado, na folha, por mes', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    const cat = onlyCategory(onlyCostCenter(report, 'Centro 1'), CAT1);

    const s1 = onlySub(cat, SUB1);
    assert.equal(monthOf(s1.months, 3).expected, 300);
    assert.equal(monthOf(s1.months, 7).expected, 700);
    assert.equal(s1.totalExpected, 1000);

    const s2 = onlySub(cat, SUB2);
    assert.equal(monthOf(s2.months, 3).expected, 100);
    assert.equal(s2.totalExpected, 100);
  });

  it('CA3/CA4 (A INVERSAO): realizado/provisionado PREENCHEM A FOLHA — nao ficam zerados', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    const cat = onlyCategory(onlyCostCenter(report, 'Centro 1'), CAT1);

    const s1 = onlySub(cat, SUB1);
    assert.equal(monthOf(s1.months, 3).realized, 250, 'realizado de marco NA SUBCATEGORIA S1');
    assert.equal(
      monthOf(s1.months, 5).realized,
      50,
      'realizado em maio (mes SEM expected) ainda aparece na folha',
    );
    assert.equal(monthOf(s1.months, 7).provisioned, 700, 'provisionado de julho na folha S1');
    assert.equal(s1.totalRealized, 300, 'a folha S1 NAO fica zerada — tem o numero');
    assert.equal(s1.totalProvisioned, 700);
  });
});

describe('REPORTS-REALIZED · stitch · CA6 — categoria/trilha vem do PLANO (categoryRef ignorado)', () => {
  it('titulo manual (categoryRef=null, subcategoryRef=S2) cai em S2 sob CAT1 — pela trilha do plano', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    const cat = onlyCategory(onlyCostCenter(report, 'Centro 1'), CAT1);

    const s2 = onlySub(cat, SUB2);
    assert.equal(
      monthOf(s2.months, 3).realized,
      80,
      'o realizado manual (categoryRef=null) casa por subcategoryRef=S2 e cai na folha S2',
    );
    assert.equal(s2.totalRealized, 80);

    // Prova NEGATIVA: o categoryRef=null do financial NAO cria categoria/centro fantasma. A arvore
    // continua com 1 centro e 1 categoria — a linha manual foi posicionada pela trilha do PLANO.
    assert.equal(
      report.costCenters.length,
      1,
      'nenhum centro fantasma por causa do categoryRef=null',
    );
    assert.equal(cat.subCategories.length, 2, 'as MESMAS 2 subcategorias do plano, nada inventado');
  });

  it('duas linhas financeiras na MESMA (plano, subcategoria, mes) com categoryRef diferente SOMAM na folha (ancora da nota 10)', () => {
    // S5 emite o documento e o titulo manual como DUAS linhas (uma com categoryRef, outra null); a
    // costura soma AMBAS no no da subcategoria. Ancora: real 5500 = 5000 doc + 500 manual, na folha.
    const planned = plannedGrid({ id: SUB1, name: 'Sub 1' }, { 8: 6000 });
    const financial: readonly RealizedProvisionedRow[] = [
      fin({ subcategoryRef: SUB1, categoryRef: CAT1, month: '2026-08', realizedCents: 5000 }),
      fin({ subcategoryRef: SUB1, categoryRef: null, month: '2026-08', realizedCents: 500 }),
    ];
    const report = stitchRealizedReport(planned, financial);
    const s1 = onlySub(onlyCategory(onlyCostCenter(report, 'Centro 1'), CAT1), SUB1);
    assert.equal(monthOf(s1.months, 8).realized, 5500, 'doc 5000 + manual 500 = 5500 na folha');
    assert.equal(s1.totalRealized, 5500);
  });
});

describe('REPORTS-REALIZED · stitch · CA5 — somas conservam (nada some nem duplica), nas 3 medidas', () => {
  it('em TODO no, a soma dos 12 meses == total do no (subcategoria e categoria, 3 medidas)', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    const cat = onlyCategory(onlyCostCenter(report, 'Centro 1'), CAT1);

    for (const measure of ['expected', 'realized', 'provisioned'] as const) {
      assert.equal(
        sumMonths(cat.months, measure),
        cat[totalKey(measure)],
        `cat: meses==total ${measure}`,
      );
      for (const sub of cat.subCategories) {
        assert.equal(
          sumMonths(sub.months, measure),
          sub[totalKey(measure)],
          `sub ${sub.id}: meses==total ${measure}`,
        );
      }
    }
  });

  it('soma dos filhos == pai em TODOS os niveis (subcat -> cat -> centro -> raiz), nas 3 medidas', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    for (const measure of ['expected', 'realized', 'provisioned'] as const) {
      const tk = totalKey(measure);
      for (const cc of report.costCenters) {
        for (const cat of cc.categories) {
          const childSum = cat.subCategories.reduce((a, s) => a + s[tk], 0);
          assert.equal(childSum, cat[tk], `subcats somam ${measure} da categoria`);
        }
        const ccSum = cc.categories.reduce((a, c) => a + c[tk], 0);
        assert.equal(ccSum, cc[tk], `categorias somam ${measure} do centro`);
      }
      const rootSum = report.costCenters.reduce((a, c) => a + c[tk], 0);
      assert.equal(rootSum, report[tk], `centros somam ${measure} geral`);
    }
  });

  it('meses casam entre pai e filhos: cat.months[m] == soma das subcategorias no mes m (3 medidas)', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    const cat = onlyCategory(onlyCostCenter(report, 'Centro 1'), CAT1);
    for (const m of ALL_MONTHS) {
      for (const measure of ['expected', 'realized', 'provisioned'] as const) {
        const childSum = cat.subCategories.reduce((a, s) => a + monthOf(s.months, m)[measure], 0);
        assert.equal(monthOf(cat.months, m)[measure], childSum, `cat mes ${String(m)}: ${measure}`);
      }
    }
  });

  it('conservacao: total geral == soma das entradas planas (dinheiro nao se perde nem duplica)', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    const inExpected = PLANNED.reduce((a, r) => a + r.plannedCents, 0);
    const inRealized = FINANCIAL.reduce((a, r) => a + r.realizedCents, 0);
    const inProvisioned = FINANCIAL.reduce((a, r) => a + r.provisionedCents, 0);
    assert.equal(report.totalExpected, inExpected, `expected geral == orcado (${inExpected})`);
    assert.equal(report.totalRealized, inRealized, `realizado geral == financeiro (${inRealized})`);
    assert.equal(
      report.totalProvisioned,
      inProvisioned,
      `provisionado geral == financeiro (${inProvisioned})`,
    );
  });

  it('nao duplica: categoria com 2 subcategorias soma o realizado da folha UMA vez', () => {
    // Armadilha de costura: anexar o realizado tambem no no CATEGORIA (alem da folha) e depois somar
    // -> conta 2x. O realizado da categoria deve ser EXATAMENTE a soma das folhas (S1 300 + S2 80).
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    const cat = onlyCategory(onlyCostCenter(report, 'Centro 1'), CAT1);
    assert.equal(cat.totalRealized, 380, 'S1(300) + S2(80), contado uma vez');
  });
});

describe('REPORTS-REALIZED · stitch · CA7 — no do plano sem movimento aparece zerado', () => {
  it('subcategoria S2 vem com os 12 meses; meses sem lancamento zerados nas 3 medidas', () => {
    const report = stitchRealizedReport(PLANNED, FINANCIAL);
    const s2 = onlySub(onlyCategory(onlyCostCenter(report, 'Centro 1'), CAT1), SUB2);
    assert.equal(s2.months.length, 12);
    // S2 tem expected e realized so em marco; os demais 11 meses zerados nas 3 medidas.
    const nonMarch = s2.months.filter((m) => m.month !== 3);
    assert.equal(
      nonMarch.every((m) => m.expected === 0 && m.realized === 0 && m.provisioned === 0),
      true,
      'meses sem lancamento vem zerados, nao ausentes',
    );
  });
});

describe('REPORTS-REALIZED · stitch · CA7b — realizado/provisionado sem contraparte no plano', () => {
  it('subcategoria financeira ausente do plano vira "Sem orcamento previsto" (expected=0) e entra no total', () => {
    const orphan = fin({
      subcategoryRef: SUB_ORPHAN,
      categoryRef: CAT1,
      month: '2026-04',
      realizedCents: 999,
    });
    const report = stitchRealizedReport(PLANNED, [...FINANCIAL, orphan]);

    const ghost = onlyCostCenter(report, 'Sem orcamento previsto');
    assert.equal(ghost.budgetPlanId, P1, 'o centro fantasma carrega o budgetPlanRef do lancamento');
    assert.equal(ghost.totalExpected, 0, 'sem orcamento previsto => expected 0');
    assert.equal(ghost.totalRealized, 999, 'o realizado orfao aparece, nunca some');

    const ghostCat = ghost.categories.find((c) => c.totalRealized === 999);
    assert.ok(ghostCat, 'a categoria orfa existe sob o centro fantasma');
    assert.equal(ghostCat.name, 'Sem orcamento previsto');
    assert.equal(ghostCat.totalExpected, 0);

    // Conservacao com o orfao incluso: o total geral de realizado cresce exatamente 999.
    assert.equal(report.totalRealized, 380 + 999, 'realizado geral inclui o orfao');
  });

  it('lancamento sem plano E sem subcategoria (subcategoryRef=null) tambem aparece e conta', () => {
    const orphan = fin({
      budgetPlanRef: P1,
      categoryRef: null,
      subcategoryRef: null,
      month: '2026-08',
      provisionedCents: 42,
    });
    const report = stitchRealizedReport(PLANNED, [...FINANCIAL, orphan]);
    assert.equal(
      report.totalProvisioned,
      700 + 42,
      'provisionado orfao (sem subcategoria) entra no total, nunca some',
    );
  });
});

// Helper de tipagem: mapeia a medida do mes para a chave de total do no (evita string cru no acesso).
function totalKey(
  measure: 'expected' | 'realized' | 'provisioned',
): 'totalExpected' | 'totalRealized' | 'totalProvisioned' {
  if (measure === 'expected') return 'totalExpected';
  if (measure === 'realized') return 'totalRealized';
  return 'totalProvisioned';
}
