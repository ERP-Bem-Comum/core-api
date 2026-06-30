# W3 — Gate de Qualidade — AUTH-HTTP-PLUGIN-EXPORT

**Wave:** W3 · **Skill:** ts-quality-checker · **Outcome:** ALL-GREEN · **Data:** 2026-05-28

## Comandos e saídas

### `pnpm run typecheck` (tsc --noEmit)
```
zero erros
```
> O `satisfies FastifyZodOpenApiSchema` + `withTypeProvider` compilam sem fricção; `authHttpPlugin`
> (FastifyPluginAsync default) atribuível a `BuildAppOptions.routes`.

### `pnpm run lint` (eslint .)
```
limpo
```
> `src/modules/auth/adapters/http/**` herda as folgas de adapter de borda (glob estendido no
> `CORE-HTTP-SHELL-RELOCATE`/ADR-0028) — handler sync e plugin async sem await passam.

### `pnpm run format:check`
```
All matched files use Prettier code style!
```

### `pnpm test`
```
ℹ tests 1419 · ℹ pass 1403 · ℹ fail 0 · ℹ skipped 16
```
> +5 testes (os 5 CAs do plugin) sobre os 1398 do baseline pós-relocate. Zero regressão. Os 16 skip são
> o gate de integração `auth` (`MYSQL_INTEGRATION=1`, fora do gate padrão).

## CAs

| CA | Status |
| :-- | :-- |
| CA1 wiring (`/api/v2/auth/__ping` = 200 `{pong:true}`) | ✅ |
| CA2 sem plugin → 404 envelope | ✅ |
| CA3 path no `/docs/json` | ✅ |
| CA4 encapsulamento (raiz `/__ping` 404, `/health` 200) | ✅ |
| CA5 importável de `public-api/http.ts` | ✅ |

## Veredito

**ALL-GREEN.** Pronto para `close`.
