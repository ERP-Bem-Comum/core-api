# W1 — Implementação GREEN · PAR-ETL-PIX-KEY-TYPE

**Outcome**: GREEN ✅ · **Agente**: nodejs-runtime-expert · **Issue**: #275

## Diff (1 arquivo — `scripts/etl/mappers/supplier.mapper.ts`)

- `import type { ..., PixKeyType }` (para tipar o mapa).
- `LEGACY_PIX_KEY_TYPE_MAP: Readonly<Record<string, PixKeyType>>` — translator ACL com 5 entradas (`CNPJ→cnpj`, `CPF→cpf`, `EMAIL→email`, `CELLPHONE→phone`, `ALEATORY_KEY→random-key`). Comentário cita #275 + Evans DDD p.226.
- `translatePixKeyType(raw) = LEGACY_PIX_KEY_TYPE_MAP[raw] ?? raw` — puro; `noUncheckedIndexedAccess` força o `?? raw` (pass-through de valores fora do mapa → `createPixKey` falha → `EnumUnknown` mantido, **CA3 estrito**).
- `resolvePaymentTargets`: `keyType: translatePixKeyType(row.pixInfoKeyType ?? '')` antes de `createPixKey`.

**VO `PaymentTarget` intocado** — a tradução vive no ETL (ACL); o core segue estrito.

## Gates (validados pelo orquestrador)

| Gate | Resultado |
|---|---|
| `typecheck` | ✅ |
| `lint` | ✅ |
| `format:check` | ✅ (após `prettier --write` no mapper + teste — edição do subagent não passa pelo hook) |
| `test` | ✅ 3247 · **3229 pass · 0 fail** · 18 skipped |

Os 5 RED do W0 → GREEN; CA3 + 7 pré-existentes seguem verdes.

## Pendente

E2E na VM (CA4): re-rodar o ETL → `suppliers quarantined` cai de 83 para ~1 (só o `EmailInvalid`).
