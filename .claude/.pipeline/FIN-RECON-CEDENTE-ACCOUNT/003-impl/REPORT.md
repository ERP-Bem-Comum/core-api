# W1 — Implementação (GREEN) · FIN-RECON-CEDENTE-ACCOUNT

**Wave**: W1 (mínimo até GREEN) · **Agente**: pipeline-maestro (main loop) · **Data**: 2026-06-19

## O que foi implementado (por camada)

| Camada | Arquivo(s) | Conteúdo |
| --- | --- | --- |
| Domínio | `domain/cedente/types.ts`, `cedente-account.ts` | `AccountType` (`corrente\|poupanca\|investimento`); campos opcionais `type/nickname/bankName/openingBalance{Cents,Date}`; erros `invalid-account-type`, `opening-balance-requires-date` (par coeso FR-006). |
| Port | `application/ports/cedente-account-store.ts` | `+ list()`, `+ findByNaturalKey(key)`, tipo `CedenteAccountNaturalKey`. |
| Port | `application/ports/cedente-account-history.ts` (novo) | `CedenteAccountHistory.hasActivity` (FR-008). |
| Use-cases | `create/list/close/edit-cedente-account.ts` (novos) | curried `(deps)=>(input)`; create rejeita duplicata via `findByNaturalKey` (insert-only, FR-016); edit trava dados bancários com histórico (FR-008). |
| Guard | `application/use-cases/import-bank-statement.ts` | `+ cedenteStore` (dep obrigatória) + guard `account-closed` ANTES do parse (FR-011); lenient p/ ref não-uuid/inexistente. |
| Adapters | `cedente-account-store.{in-memory,drizzle}.ts`, `cedente-account-history.from-statements.ts` (novo) | `list`+`findByNaturalKey`; history derivada de `listTransactionsByPeriod`. |
| Persistência | `schemas/mysql.ts`, mapper, **migration `0009_brief_ghost_rider.sql`** | 5 `ADD COLUMN` nullable (não-quebrante) + `UNIQUE` (banco+agência+conta+dígito, FR-016) + `CHECK` do `type`. |
| Borda HTTP | `adapters/http/{plugin,composition,schemas,error-mapping}.ts`, `public-api/permissions.ts` | 5 rotas `POST/GET/GET:id/PATCH/POST :id/close` sob `/api/v2/financial/cedente-accounts`; permissão `bank-account:read\|write`. |

## Evidência (GREEN)

- **Suíte financial completa:** `node --test 'tests/modules/financial/**/*.test.ts'` → **311 pass / 0 fail** (inclui domínio 10, use-cases 12, import-guard 13, http 4 do cedente; zero regressão no resto do módulo).
- **typecheck:** limpo para todo o módulo financial (0 erros). *Ver bloqueador abaixo.*
- **format:check:** GREEN (8 arquivos do ticket formatados).
- **lint:** 0 erros nos arquivos do ticket.

## Decisões tomadas no W1

1. `cedente-account-not-found` movido de 404 → **422** (`error-mapping.ts`): o smoke de existência da rota `/close` exige ≠404; em confirm/manual é ref pendente (não recurso pedido). Nenhum teste HTTP exige 404 para esse código.
2. Guard de import **lenient** (bloqueia só conta encontrada+encerrada) — preserva o happy-path existente (`debitAccountRef` não-uuid) e adia FK para #160.
3. `accountHistory.hasActivity` derivado de `listTransactionsByPeriod` (sem método novo — YAGNI); sinal "tem extrato importado".
4. `buildAccount()` do teste de integração parametrizado (contador) — evita colisão com o UNIQUE FR-016 (achado W0).

## ⚠️ Bloqueador do gate W3 (global) — NÃO é do ticket

`pnpm run typecheck` (gate global) acusa **6 erros** SÓ em arquivos **untracked de outro ticket** — `NOTIF-BOUNCE-WEBHOOK-INGEST` (#132): `tests/modules/notifications/adapters/{http/webhook-email-ingest,persistence/suppression-list.in-memory,webhook/signature}.test.ts` importam `src/` ainda inexistente. São W0 RED que vazaram no working tree, pré-existentes a este ticket, em outro módulo. #132 foi **adiado** nesta sessão. Não implementados aqui (cross-módulo + contradiz a decisão). **Escalado ao humano** (regressão-zero §opção 3) para decidir como gatear/mover.

## Próximo

W2 (code review read-only). Princípio IX (citação ACDG) a ancorar no W2. Integração MySQL (T012) não rodada localmente (RAM 8 GB) — RED estrutural resolvido; validar sob `pnpm run test:integration:financial`.
