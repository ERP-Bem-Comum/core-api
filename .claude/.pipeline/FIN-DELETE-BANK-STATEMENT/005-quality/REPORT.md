# W3 — gate de qualidade — FIN-DELETE-BANK-STATEMENT

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm exec eslint <use-case+2 repos+composition+plugin+error-map+2 testes>` | ✅ 0 erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4413 tests · 4393 pass · **0 fail** · 20 skip |

- Use-case (guardas): CA1 (exclui), CA2/CA2b (conciliada/manual bloqueiam), CA3 (período fechado), CA4
  (inexistente) — 5 casos verdes.
- Borda: DELETE 401/403/404 (rota + gate + error-map) — 3 casos verdes.

`deleteById` real (cascade contra MySQL) é #500-gated; a lógica de guarda + wiring HTTP provados no `pnpm test`.
