/**
 * Allowlist de exclusão DELIBERADA de contratos legados (decisão (c), 2026-07-02).
 *
 * Regra do debate de especialistas (relatorio-decisao-3-marteladas.md): exclusão é
 * dirigida por lista EXPLÍCITA de legacy_ids versionada em git — nunca por predicado
 * heurístico ("valor=0"), que engoliria linhas legítimas em cargas futuras. Cada item
 * carrega a justificativa; a linha excluída entra no balanço como `quarantined` com
 * tag `ExcludedByDecision` (identidade read = migrated + quarantined + alreadyExists).
 */

export const EXCLUDED_CONTRACT_LEGACY_IDS: ReadonlyMap<number, string> = new Map([
  [
    3,
    'Cadastro abortado no legado: valor 0 (domínio rejeita — Defeito #9) + código ' +
      'duplicado 000000001/2025 (perdedor determinístico: maior legacy_id) + único ' +
      'vínculo colaborador. Decisão (c) ratificada 2026-07-02 — ' +
      'bem_comum/database/prod_dump/relatorio-decisao-3-marteladas.md',
  ],
]);
