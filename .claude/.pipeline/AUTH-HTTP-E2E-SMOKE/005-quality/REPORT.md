# W3 — Gate de Qualidade — AUTH-HTTP-E2E-SMOKE

**Wave:** W3 · **Skill:** ts-quality-checker · **Outcome:** ALL-GREEN · **Data:** 2026-05-28

## Gate padrão (sem Docker)

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ zero erros (`.e2e.ts` com fetch/Response globais) |
| `pnpm run lint` | ✅ limpo |
| `pnpm run format:check` | ✅ Prettier ok |
| `pnpm test` | ✅ **1444 pass · 0 fail · 16 skip** — `.e2e.ts` NÃO descoberto pelo glob `tests/**/*.test.ts` (CA9) |

## Gate E2E (com Docker — executado pelo usuário)

```
pnpm run test:e2e:auth
 ✔ core-api-mysql Healthy (10.7s)
 ✔ CA1 (health 200 + /me 401) · ✔ CA2-CA7 (register→login→me→refresh→logout→refresh-revogado)
 ℹ tests 2 · pass 2 · fail 0
```

## CAs

| CA | Status |
| :-- | :-- |
| CA1 health 200 + /me sem token 401 | ✅ |
| CA2 register 201 | ✅ |
| CA3 login 200 + tokens | ✅ |
| CA4 /me Bearer 200 (userId == login) | ✅ |
| CA5 refresh 200 + rotação | ✅ |
| CA6 logout 204 | ✅ |
| CA7 refresh revogado 401 | ✅ |
| CA8 persistência real MySQL (register persiste, login lê) | ✅ |
| CA9 isolado do `pnpm test` | ✅ |

## Veredito
**ALL-GREEN.** Borda auth HTTP validada **end-to-end** contra MySQL real via fetch. Branch `mysql` do composition coberto. Teardown limpo (sem órfãos).
