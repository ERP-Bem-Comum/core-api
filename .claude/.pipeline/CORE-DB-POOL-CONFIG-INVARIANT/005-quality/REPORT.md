# W3 — GATE — CORE-DB-POOL-CONFIG-INVARIANT

**Skill:** `ts-quality-checker` · **Data:** 2026-07-10 · **Resultado: VERDE (estrutural)**

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ |
| Lint | `pnpm run lint` | ✅ |
| Format | `pnpm run format:check` | ✅ |
| Testes | `pnpm test` | ✅ **tests 3818 · pass 3795 · fail 0** · skipped 18 · todo 5 |

Delta: +20 testes (CA-1..CA-6 = 6, CA-7 = 14). CA-8 = skip (opt-in).

## CA-8 (efeito de reaping) — VALIDADO NO x99 ✅
MySQL 8.4 efêmero (`docker run` no x99 `100.99.66.84` + túnel SSH `-L 3306`, método `mac-dev-x99-docker-runner-tunnel`). `MYSQL_INTEGRATION=1`:
```
✔ CA-8: conexões ociosas acima de maxIdle fecham após idleTimeout (3658ms)
tests 7 · pass 7 · fail 0 · skipped 0
```
Pool `connectionLimit=4, maxIdle=1, idleTimeout=1500ms`: 4 conexões adquiridas/liberadas → após o idleTimeout a contagem viva **convergiu para maxIdle (1)**. Prova empírica da reciclagem — a lição-mãe do Incident-0001 ("config presente ≠ config com efeito"), exatamente o que o CTR-DB-DRIVER-POOL-TUNING não tinha.

## Estado
**Todos os 8 CAs verdes** (CA-1..CA-7 sem DB + CA-8 no x99). W0→W3 done. Ticket pronto para fechar.
**Leftover:** container `ca-pool-ca8` no x99 exige `sudo docker rm -f` (permissão do docker-snap) — removível só pelo humano.
