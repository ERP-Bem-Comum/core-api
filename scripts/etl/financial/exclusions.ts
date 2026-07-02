/**
 * Allowlist de exclusão DELIBERADA de payables legados (decisão (c), 2026-07-02).
 *
 * Mesma regra do contracts writer: lista EXPLÍCITA por legacy_id versionada em git,
 * nunca predicado heurístico. Entram no balanço como `quarantined` com tag
 * `ExcludedByDecision`. Evidência: auditoria-transformacoes-legado.md §5 F5 —
 * os ÚNICOS payables parcelados do dump, com valores de teste.
 */

export const EXCLUDED_PAYABLE_LEGACY_IDS: ReadonlyMap<number, string> = new Map([
  [
    45,
    'Parcelamento de TESTE (R$ 10.000 em 12x — único 12x do dump; F5). Decisão (c) ' +
      'ratificada 2026-07-02; parcelamento temporal real = R-1 do ADR-0048 (reabrir ' +
      'se surgir caso legítimo). relatorio-decisao-3-marteladas.md',
  ],
  [
    46,
    'Parcelamento de TESTE (R$ 0,10 em 10x — único 10x do dump; F5). Decisão (c) ' +
      'ratificada 2026-07-02; R-1 do ADR-0048. relatorio-decisao-3-marteladas.md',
  ],
]);
