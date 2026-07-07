# Quality Check (W3) — BATCH-PARTNERS-SUPPLIERS (#356)

**Skill:** ts-quality-checker (inline, main loop) · **Veredito:** ✅ ALL GREEN
**Validação e2e (CA7):** ✅ VERDE (MySQL 8.4 real no x99, 2026-07-07)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | typecheck (`tsc --noEmit`) | ✅ | zero erros |
| 2 | format (`prettier --check .`) | ✅ | limpo |
| 2b | lint (`eslint .`) | ✅ | zero |
| 3 | test (`pnpm test` partners) | ✅ | **660 pass / 0 fail / 0 skip** |
| 4 | build | ⏭️ SKIPPED | Fase 1 (strip-types) |

## Check 3 — testes do ticket
- `suppliers-batch.schema.test.ts` (CA3/CA6) + `suppliers-batch.routes.test.ts` (CA1/CA2/CA4/CA5) → GREEN.
- `suppliers-batch-reader.drizzle.test.ts` (integração) → skip correto no `pnpm test` (opt-in `MYSQL_INTEGRATION`).

## CA7 — anti-N+1 contra MySQL 8.4 real (x99)
Rodado no x99 (`mysql:8.4` docker direto no host, loopback):

```
▶ suppliers-batch-reader — e2e par_suppliers (CA7 WHERE IN)
  ✔ CA7/CA1/CA2 — resolve N refs em 1 query (WHERE IN): existentes→items, ausente→missing
ℹ tests 1 · pass 1 · fail 0
```

Prova: `getSuppliersView([A, B, MISSING])` → `items` com A/B (id/name/taxId=cnpj/serviceCategory), `missing=[MISSING]`, numa única query `inArray`. **CA5 reforçado:** o seed persiste `bankAccount` completo, e o item resolvido carrega **só os 4 campos mínimos** (`Object.keys` == `[name, ref, serviceCategory, taxId]`) — o bancário não vaza.

Gate de integração: teste adicionado à suíte `partners` do runner (`test-integration.ts`). Correção de seed no caminho: faltava alvo de pagamento (CHECK `par_suppliers_payment_target_chk`) — bug do teste, não do código.

Nota de ambiente: container `bkf356-mysql` a remover no x99 (`sudo snap restart docker; docker rm -f bkf356-mysql` — docker-snap Ubuntu Core, [[x99-ubuntu-core-container-validation]]).

## Veredito
ALL GREEN + CA7 e2e ✅ → ticket **closed-green**. PR base `go-live`.
