# W2 — Code Review (read-only) · PAR-COLLABORATOR-TERRITORY (US3)

**Veredito:** APPROVED (round 1) · auto-review do implementador.

| Critério | Status |
|----------|--------|
| Domínio puro (Result, sem throw) | ✅ `createTerritory` retorna Result |
| Erro kebab-case (`territory-uf-invalid`) | ✅ |
| UF validada contra catálogo (não regex solta) | ✅ via `State.parse` (27 UFs IBGE) |
| ADR-0020 (varchar; sem JSON) | ✅ `territory_uf`/`territory_municipality` |
| ADR-0035 (distinção parceria territorial × atributo) | ✅ documentado no VO |
| Preservação em deactivate (CA4) | ✅ spread + teste de domínio |
| Migration gerada | ✅ `0012` |

## Achados
- **Nenhum Blocker/Major.**
- **Nota:** `municipality` é texto livre (sem catálogo de municípios) — escopo da US (`municipalities.data.ts` existe mas validação exaustiva fica fora). `createTerritory` no fromRow revalida a UF (defensivo contra corrupção).

## Conclusão
Aprovado para W3.
