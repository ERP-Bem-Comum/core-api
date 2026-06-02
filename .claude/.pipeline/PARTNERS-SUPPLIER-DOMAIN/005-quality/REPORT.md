# W3 — QUALITY · PARTNERS-SUPPLIER-DOMAIN

> Agente: ts-quality-checker · Resultado: **GREEN**

## Gate

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ zero erros |
| `pnpm run lint` | ✅ zero erros |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm test` (`MYSQL_PORT=3307`) | ✅ `tests 1677 · pass 1661 · fail 0 · skipped 16` |
| módulo partners isolado | ✅ `tests/modules/partners/** → 66 pass / 0 fail` |

## Achado corrigido durante o W3

- **lint (`no-use-before-define`)** — no teste, `validInput` referenciava `baseInput` antes da
  definição; ordem invertida.

## Nota ambiental (não introduzida pelo ticket)

A suíte de infra `tests/infra/mysql-compose.test.ts` (CA-3..19) tenta subir o container
`core-api-mysql` na porta **3306**, que nesta máquina está ocupada pelo container alheio
`bemcomum-mysql`. Com o Docker daemon vivo, sem `MYSQL_PORT` essas 16 verificações **falham** (colisão
de porta no `docker compose up`); com **`MYSQL_PORT=3307`** elas voltam a `skipped` e o `pnpm test`
sai limpo (0 fail). É fragilidade ambiental (container alheio + Docker acordado), **independente do
supplier** — confirmado isolando `tests/modules/partners/**` (66/66). Em CI (ambiente limpo) não ocorre.

## Veredito

Verde em todos os gates (`pnpm test` com `MYSQL_PORT=3307`). Ticket pronto para fechar.
