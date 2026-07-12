# W3 — Gate de Qualidade (GREEN) · BGP-ITEM-PROJECTIONS (#372)

**Skill:** ts-quality-checker.

| Gate | Resultado |
| --- | --- |
| typecheck | ✓ limpo |
| format:check | ✓ limpo |
| lint | ✓ limpo |
| `pnpm test` | ✓ tests 3890 · **pass 3867 · fail 0** · skipped 18 · todo 5 |

- +5 testes do #372 (`item-projections.routes.test.ts`); os 5 `todo` são os PDFs do #388 (alheios).
- **Validação x99: N/A** — projeção pura, sem migration/SQL novo (`plan.budgets[]` já hidratado no `toItem`). Coberto pelos testes de rota (InMemory) + review W2.

## Veredito
**GREEN.** Fecha #372. #373 segue aberto (ticket próprio `BGP-UPDATED-BY-AUDIT`).
