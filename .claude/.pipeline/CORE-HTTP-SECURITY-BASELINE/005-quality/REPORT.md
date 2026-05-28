# W3 — Gate de Qualidade — CORE-HTTP-SECURITY-BASELINE

**Wave:** W3 · **Skill:** ts-quality-checker · **Outcome:** ALL-GREEN · **Data:** 2026-05-28

## Comandos

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` (tsc --noEmit) | ✅ zero erros |
| `pnpm run lint` (eslint .) | ✅ limpo |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm test` | ✅ **1428 tests · 1412 pass · 0 fail · 16 skip** (+9 baseline sobre 1403; 16 skip = gate integração auth) |

## CAs

| CA | Status |
| :-- | :-- |
| CA1 `no-store` em `/api/v2/*`; `/health` 200 isento | ✅ |
| CA2 helmet `nosniff` (regressão) | ✅ |
| CA3 config `NaN` → default seguro | ✅ |
| CA4 `TRUST_PROXY` true/false/CIDR | ✅ |
| CA5 timeouts (config + `keepAliveTimeout` no initialConfig) | ✅ |
| CA6 `buildLoggerOptions` redact de secrets | ✅ |
| CA7 regressão dos 7 CAs do H0 | ✅ |

## Veredito
**ALL-GREEN.** Pronto para `close`. Sem dep nova; nenhum HSTS/TLS adicionado (invariante ADR-0005).
