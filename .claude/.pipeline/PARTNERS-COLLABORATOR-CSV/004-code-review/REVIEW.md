# W2 — REVIEW · PARTNERS-COLLABORATOR-CSV

**Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ APPROVED

## Escopo auditado (read-only)

- `src/modules/partners/adapters/export/collaborator-csv.ts`
- `tests/modules/partners/adapters/export/collaborator-csv.test.ts`

## Aderência

- ✅ **Adapter de apresentação puro** — função pura, sem port, sem use case, sem IO, sem `Result`
  (entrada já é domínio válido). Determinístico.
- ✅ **Reuso do util** — importa `toCsv` de `#src/shared/utils/csv.ts`; **zero** escape/BOM/separador
  local (anti-fórmula é security MUST e vive num lugar só — ADR-0006, não duplicar).
- ✅ **Switch exaustivo por `status`** sem `default` — `noFallthroughCasesInSwitch`/exhaustiveness OK;
  o TS estreita `Inactive` dentro do `case` (acesso a `disableBy`/`deactivatedAt` válido).
- ✅ **Idioma**: código EN; sem JSON.
- ✅ **Header/ordem estáveis** (26 colunas); cada linha CRLF (herdado do util).
- ✅ **Sem import de `domain/` alheio** — só do próprio módulo (`../../domain/collaborator/types.ts`).

## Observações (não-bloqueantes)

1. **Helpers `isoOrEmpty`/`boolOrEmpty`** — pequenos, locais, sem estado. Tradução de apresentação
   (null → ''), não regra de domínio. Lugar correto (adapter).
2. **`disableBy` sem tradução PT** — sai com o código legado (`TEMPO_CONTRATO_FINALIZADO`), coerente com
   D2 (rótulo PT fica no formatter da CLI, ticket futuro). CSV exporta o valor canônico. OK.
3. **Ajuste de fixture no W0** (vírgula em `completeAddress`) — corretamente diagnosticado como artefato
   do assert por índice, não da implementação; o escape de vírgula segue coberto em bloco próprio.

## Conclusão

Fiel ao template `supplier-csv`, sem scope creep, security-MUST delegado ao util. **APPROVED** — segue para W3.
