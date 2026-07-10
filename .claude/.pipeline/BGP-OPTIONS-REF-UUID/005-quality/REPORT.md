# W3 — GATE — BGP-OPTIONS-REF-UUID (#394)

**Skill:** `ts-quality-checker` · **Data:** 2026-07-10 · **Resultado: VERDE**

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ sem erros |
| Lint | `pnpm run lint` (`eslint .`) | ✅ sem erros |
| Format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| Testes | `pnpm test` | ✅ **tests 3798 · pass 3775 · fail 0** · skipped 18 · todo 5 |

## Notas
- **fail 0** em toda a suíte. O `AssertionError` visível no output é de um teste `todo` (`native-pdf-real.local.test.ts` #388, reader de PDF real) — roda mas **não falha o gate** (marcado `todo`); é gap conhecido de `financial`, **fora deste diff** (100% budget-plans). Confirmado: isolado dá `fail 0` (5 todo + 2 pass).
- Suíte budget-plans não-integração: 34 arquivos, 198 tests, 0 fail.

## Pendência (não bloqueia o gate)
Validação no **x99** dos testes `*.drizzle-mysql` (mapper rehidratando `partner_ref` com chave natural) — pulam sem DB. Sem migration (varchar). Recomendada antes do merge do PR.

## DoD
Gate W3 verde. `/options` 200; identidade de Rede = chave natural validada (UF/IBGE) na borda e no domínio; ciclo options→create→detalhe coerente. Fecha #394.
