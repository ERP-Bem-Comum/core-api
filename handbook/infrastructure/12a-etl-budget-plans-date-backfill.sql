-- ============================================================================
-- Correção das datas dos planos de orçamento migrados (produção)
--
-- Contexto: o ETL de Orçamento gravou created_at/updated_at com o horário da
-- migração (2026-07-17 ~21:00) em vez das datas reais do legado. O código já foi
-- corrigido (PR #489, na dev), mas o ETL é skip-by-legacy_id: re-rodar NÃO
-- sobrescreve linhas já migradas. Este script corrige as 5 linhas existentes.
--
-- Fonte dos valores: dump "Cloud_SQL_Export_2026-04-30" — o MESMO que gerou os
-- dados em produção. (NÃO a réplica do legado: ela foi alterada depois do dump —
-- o plano legacy_id=19 lá mostra 17/07/2026 12:08, divergente do dump.)
--
-- Segurança:
--   * Filtra por legacy_id: só toca linhas MIGRADAS. Linhas criadas na tela
--     (legacy_id IS NULL) não são afetadas.
--   * Só a tabela bgp_budget_plans. As outras bgp_* não têm essas colunas.
--     Colaboradores (par_*), contratos e financeiro não são tocados.
--   * Dentro de transação, com verificação antes e depois.
--
-- Fuso: os valores abaixo são exatamente os do legado (a tela aplica −3h na
-- exibição, então 2025-09-29 20:38:08 aparece como 29/09/2025 17:38).
-- ============================================================================

-- 1) ANTES — confirme que as 5 linhas estão com o carimbo da migração
SELECT legacy_id, year, version_major, version_minor, created_at, updated_at
FROM bgp_budget_plans
WHERE legacy_id IN (13, 14, 15, 18, 19)
ORDER BY legacy_id;

-- 2) CORREÇÃO
START TRANSACTION;

UPDATE bgp_budget_plans SET created_at = '2025-09-12 20:24:19.441',
                            updated_at = '2025-09-29 20:38:08.000'
WHERE legacy_id = 13;   -- 2025 PARC 1.0

UPDATE bgp_budget_plans SET created_at = '2025-09-12 20:24:53.420',
                            updated_at = '2025-09-29 20:38:02.000'
WHERE legacy_id = 14;   -- 2025 EPV 1.0

UPDATE bgp_budget_plans SET created_at = '2025-09-12 20:28:01.631',
                            updated_at = '2025-09-12 20:28:35.000'
WHERE legacy_id = 15;   -- 2025 PARC 1.1 (Cenário 01 - Bruno)

UPDATE bgp_budget_plans SET created_at = '2026-01-20 15:12:22.941',
                            updated_at = '2026-01-26 13:18:53.000'
WHERE legacy_id = 18;   -- 2026 PARC 1.0

UPDATE bgp_budget_plans SET created_at = '2026-01-29 16:05:34.487',
                            updated_at = '2026-01-29 16:05:34.000'
WHERE legacy_id = 19;   -- 2026 PARC 2.0

-- 3) CONFERE ANTES DE CONFIRMAR — devem ser 5 linhas com as datas de 2025/2026,
--    nenhuma com 2026-07-17. Se estiver certo: COMMIT. Se não: ROLLBACK.
SELECT legacy_id, year, created_at, updated_at
FROM bgp_budget_plans
WHERE legacy_id IN (13, 14, 15, 18, 19)
ORDER BY legacy_id;

-- COMMIT;
-- ROLLBACK;

-- ============================================================================
-- Esperado na tela após o COMMIT (a tela mostra em UTC-3):
--   2025 PARC 1.0  -> Bruno Costa    29/09/2025 17:38
--   2025 EPV 1.0   -> Bruno Costa    29/09/2025 17:38
--   2025 PARC 1.1  -> Eduardo Silva  12/09/2025 17:28
--   2026 PARC 1.0  -> Bruno Costa    26/01/2026 10:18
--   2026 PARC 2.0  -> Bruno Costa    29/01/2026 13:05
--
-- ATENÇÃO ao 2026 PARC 2.0: vai aparecer 29/01/2026 13:05 (o valor do dump),
-- e NÃO 17/07/2026 12:08 como na réplica — porque a réplica foi editada depois
-- do dump que gerou os dados de produção. Data e valor ficam do mesmo retrato.
-- ============================================================================
