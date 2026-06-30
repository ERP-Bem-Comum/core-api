# W3 — QUALITY GATE — CON-ACT-CONTRACTOR-RAZAO-SOCIAL

**Data:** 2026-06-15 · **Skill:** ts-quality-checker · **Resultado:** GREEN ✅

Gate final — 4 comandos verdes. Regressão zero. Não há teste de integração novo (o ticket não toca
storage/S3).

## Comandos

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` | ✅ 0 erros |
| Format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| Lint | `pnpm run lint` | ✅ limpo (após corrigir 3 erros — ver abaixo) |
| Test | `pnpm test` | ✅ **2628 pass / 0 fail** / 18 skipped (2646 total) |

## Correção de lint (causa, não paliativo)

O primeiro `pnpm run lint` falhou (exit 1, 3 erros — **não** OOM; o fix de heap do ticket anterior
segue válido):

1. `contractor-composition.ts:53` — `@typescript-eslint/no-unnecessary-condition`: `view.corporateName ?? view.name`
   tem lado esquerdo não-nullable (`ActView.corporateName: string`). **Fix:** `name: view.corporateName`
   (remove o fallback morto — YAGNI).
2. `partner-aggregate-query.ts:85` — mesmo erro em `r.act.corporateName ?? r.act.name`. **Fix:**
   `name: r.act.corporateName`.
3. `contractor-act-razao-social.routes.test.ts:151` — `@typescript-eslint/consistent-type-definitions`:
   `type DetailBody = {...}` → **fix:** `interface DetailBody {...}`.

Após os 3 fixes, `pnpm run lint` passou (exit 0) e `pnpm test` seguiu **2628 pass / 0 fail** (remover o
`??` não muda comportamento — `corporateName` é sempre presente).

> **Nota de processo:** o review W2 afirmou que `no-unnecessary-condition` estava `off` — estava
> **incorreto**; o gate mecânico do W3 pegou. Reforça o valor do W3 como backstop e a regra de não
> confiar em afirmações de config sem o gate real.

## Prova do verde

```
$ tsc --noEmit         → 0 erros
$ prettier --check .   → All matched files use Prettier code style!
$ eslint .             → exit 0 (limpo)
$ pnpm test            → tests 2646 · pass 2628 · fail 0 · skipped 18
```

## Critérios de aceitação

CA1–CA6 do `000-request.md` cobertos: snapshot do ACT = razão social (detalhe via GET; criação via
POST→GET), agregador de seleção com razão social, não-regressão dos demais tipos, degradação graciosa
preservada, e gate W3 verde. Opção 1 (zero mudança no front) implementada conforme decisão baseada em
evidência do `web-app`.
