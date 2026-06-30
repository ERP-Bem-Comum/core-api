# W3 — Gate de qualidade · PAR-ETL-PIX-KEY-TYPE

**Outcome**: GREEN ✅ · **Agente**: ts-quality-checker · **Issue**: #275

## Gates canônicos — todos verdes

| Gate | Resultado |
|---|---|
| `typecheck` | ✅ |
| `format:check` | ✅ |
| `lint` | ✅ |
| `test` | ✅ 3247 · **3229 pass · 0 fail** · 18 skipped |

W2 APPROVED (0 Blocker/Major; 1 Minor informativo — case-sensitivity por design).

## Validação E2E na VM (CA4) — ✅ EXECUTADA

`supplier.mapper.ts` levado à VM, ETL re-rodado contra o dump de prod:
```
antes:  suppliers read=100 migrated=0  quarantined=83 alreadyExists=17
depois: suppliers read=100 migrated=82 quarantined=1  alreadyExists=17
```
Os **82** suppliers antes quarentenados por `pix_key_type` **migraram**; quarentena **83 → 1** (só o `EmailInvalid` — email malformado no legado, dado sujo fora de escopo). CA4 provado com dados reais.
