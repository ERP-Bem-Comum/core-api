/**
 * Limpeza de `bgp_budget_plans` para testes de integração — o ÚNICO jeito certo de apagar a tabela.
 *
 * `bgp_budget_plans.parent_id` referencia a própria tabela com `ON DELETE RESTRICT`
 * (`bgp_budget_plans_parent_id_fk`: plano-filho → plano-pai). O InnoDB confere essa FK linha a linha
 * e na hora, sem adiar: um `DELETE FROM bgp_budget_plans` falha com 1451 quando há filho, conforme a
 * ordem em que o motor visita as linhas. Medido em 06/11/2026: a suíte `budget-plans` passava em
 * banco limpo e na repetição, e falhava 9 casos na ordem invertida — um vizinho deixava filhos.
 *
 * Os arquivos tinham três versões disto: o `DELETE` cru (quebra com qualquer filho), o de dois
 * passos `WHERE parent_id IS NOT NULL` + resto (quebra com neto) e nenhuma. Desfazer a
 * autorreferência antes resolve qualquer profundidade — e, morando aqui, não volta a divergir.
 * `tests/cleanup/budget-plans-reset-single-source.test.ts` impede o `DELETE` direto fora deste arquivo.
 *
 * As tabelas que referenciam `bgp_budget_plans` (árvore de custo, orçamentos, lançamentos) continuam
 * sendo responsabilidade de quem chama: apague-as ANTES, filhas antes das mães.
 */

import { sql, type SQL } from 'drizzle-orm';

/** O mínimo do Drizzle que a limpeza usa — qualquer `db` MySQL do repositório serve. */
export type SqlExecutor = Readonly<{ execute: (query: SQL) => Promise<unknown> }>;

export const deleteAllBudgetPlans = async (db: SqlExecutor): Promise<void> => {
  await db.execute(sql`UPDATE bgp_budget_plans SET parent_id = NULL WHERE parent_id IS NOT NULL`);
  await db.execute(sql`DELETE FROM bgp_budget_plans`);
};
