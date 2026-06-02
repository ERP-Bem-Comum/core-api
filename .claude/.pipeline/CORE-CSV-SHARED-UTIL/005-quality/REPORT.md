# W3 — Gate de Qualidade · CORE-CSV-SHARED-UTIL

> **Outcome:** GREEN (escopo do ticket) · **Agente:** ts-quality-checker · **Data:** 2026-06-01

## Gates

| # | Comando | Resultado |
| --- | --- | --- |
| 1 | `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| 2 | `pnpm run format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| 3 | `pnpm run lint` (`eslint .`) | ✅ zero warnings/errors |
| 4 | `pnpm test` | ⚠️ ver abaixo |

## Detalhe do gate 4 (`pnpm test`)

```
tests 1707 · pass 1675 · fail 16 · skipped 16
```

- **Testes do ticket — GREEN:** `tests/shared/utils/csv.test.ts` (15/15) +
  `tests/modules/contracts/adapters/http/contracts-export-csv.routes.test.ts` (9/9) = **24/24**.
- **16 fails — todos `tests/infra/mysql-compose.test.ts` (CTR-DB-COMPOSE-MYSQL, CA-3..CA-19).**

### Causa-raiz dos 16 fails (ambiente, ortogonal ao diff)

Conflito de porta: `compose.yaml` do teste de infra binda host `0.0.0.0:3306`, já ocupada pelo
container `bemcomum-mysql` (stack `bemcomum`, rodando há 12h — web/core-api/caddy/authentik).
O container do teste sobe e morre no networking (`Bind for 0.0.0.0:3306 failed: port is already
allocated`), cascateando CA-3..CA-19 (`container ... is not running`).

- O CI evita isso via `compose.ci.yaml` (remove o port mapping); o teste local não usa esse override.
- O guard `FIN-TEST-INFRA-SKIP-GUARD` só pula sem o daemon Docker; com daemon vivo + porta ocupada,
  tenta o bootstrap e falha.
- **Independência causal provada:** o diff do ticket toca só `src/shared/utils/csv.ts` (novo) e
  `src/modules/contracts/adapters/http/contracts-csv.ts` (refactor) — nada de infra/MySQL/compose.
  Os 24 testes ligados ao diff são verdes.

### Decisão (dono, 2026-06-01)

W3 fechado **GREEN no escopo do ticket**. Os 16 fails de infra são condição de ambiente
(porta 3306) pré-existente e não relacionada ao CSV — não bloqueiam este ticket. Stack `bemcomum`
preservado intacto (não derrubado).

## Limpeza

- Network/volume `core-api` (criados na tentativa de bootstrap) removidos via `docker compose down -v`.
- Secrets `secrets/mysql_*.txt` (sobrescritos durante a tentativa) regenerados com `setup-secrets.ts
  --random --force` (chmod 0644, gitignored).

## Conclusão

ALL-GREEN para o ticket. Próximo: `pipeline:state close CORE-CSV-SHARED-UTIL`.
