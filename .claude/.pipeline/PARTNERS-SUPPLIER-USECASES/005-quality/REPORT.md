# W3 — QUALITY · PARTNERS-SUPPLIER-USECASES

> Agente: ts-quality-checker · Resultado: **GREEN** (escopo)

## Gate

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ zero erros (`tsc --noEmit`) |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm run lint` | ✅ zero erros (`eslint .`) |
| `pnpm test` (exceto `tests/infra`) | ✅ `tests 1668 · pass 1652 · fail 0 · skipped 16` |
| `tests/modules/partners/**` (escopo do ticket) | ✅ `tests 81 · pass 81 · fail 0` |

Os 16 `skipped` são os testes de integração gated por `MYSQL_INTEGRATION=1` (mesmo
padrão do W3 de `PARTNERS-FINANCIER-USECASES`).

## Ressalva ambiental (fora de escopo, não-regressão)

`tests/infra/mysql-compose.test.ts` (CTR-DB-COMPOSE-MYSQL) reporta 16/21 `fail` neste
ambiente. **Causa-raiz: conflito de porta** — o container externo `bemcomum-mysql`
ocupa `0.0.0.0:3306`, impedindo o `composeUp()` da própria suite de subir seu MySQL.

- A suite é gated por skip-guard (`tests/infra/mysql-compose.test.ts:8-10`): "Em ambiente
  sem Docker, `pnpm test` sai 0 com a suite marcada `skipped`, nunca `failed`". Com o
  daemon UP **e** a porta ocupada, o bootstrap roda e falha em vez de pular.
- Este ticket é **application pura** (port InMemory + use cases) — não toca
  `compose.yaml`/`Dockerfile`/`secrets`/infra (`git status` confirma: nenhum arquivo de
  infra modificado). A falha independe do código entregue.
- No W3 do ticket irmão `PARTNERS-FINANCIER-USECASES` (também application pura) esta mesma
  suite apareceu como `skipped`, não `fail` — diferença puramente de estado de Docker local.

Remediação (ambiente, não código): parar `bemcomum-mysql` antes de `pnpm test`, ou rodar
o gate de infra via `pnpm run test:integration` (que gerencia o ciclo do container).

## Veredito

Verde em typecheck/format/lint e em 100% dos testes não-infra (1652 pass, 0 fail). A única
vermelhidão é a suite de infra Docker bloqueada por conflito de porta externo — ambiental,
pré-existente, sem relação com o escopo. Ticket pronto para fechar.
