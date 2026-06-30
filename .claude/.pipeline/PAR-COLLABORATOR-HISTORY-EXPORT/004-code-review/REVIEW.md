# W2 — Code Review (read-only) · PAR-COLLABORATOR-HISTORY-EXPORT (US4)

**Veredito:** APPROVED (round 1) · auto-review do implementador.

| Critério | Status |
|----------|--------|
| Domínio puro (diff EN, Result) | ✅ `diffCollaborator` determinístico |
| Erro kebab-case (`collaborator-repo-unavailable`) | ✅ (503 na borda) |
| ADR-0020 (sem JSON; texto) | ✅ valores como `varchar(1000)` |
| ADR-0014 (`par_*`) | ✅ |
| Migration gerada | ✅ `0013` |
| Idempotência | ✅ UNIQUE (collaborator_id, occurred_at, field_name) |
| Audit imutável (label desnormalizado) | ✅ Ramakrishnan §audit |

## Achados / notas conscientes
- **Mudança no shared `csv.ts`** (parâmetro `separator`): aditiva, default `,` — os 5 exports existentes e `csv.test.ts` continuam verdes (validado). Necessária para o `;` legado reusando o hardening anti-fórmula.
- **Captura sequencial** (não tx DB compartilhada entre `save` e `record`): janela mínima (mesmo use case); a consistência forte total (tx única) é refinamento — documentado.
- **Export por colaborador** (`:id/export?type=history`): divergência consciente da spec (cabeçalho legado sem coluna de colaborador exige por-colaborador).
- **Serialização de valores no CSV**: a validar com o importador legado (boolean/data/enum) — não bloqueia o CA (strings).
- Sem Blocker/Major.

## Conclusão
Aprovado para W3.
