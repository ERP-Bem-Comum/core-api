# W0 — Testes RED · PAR-COLLAB-FOODCAT-LENGTH

**Outcome**: RED ✅ · **Agente**: drizzle-orm-expert · **Issue**: #274

## Arquivo de teste criado

`tests/modules/partners/adapters/persistence/collaborator-food-category-length.drizzle-mysql.test.ts` — integração Drizzle-MySQL, **gated por `MYSQL_INTEGRATION`** (padrão dos `*.drizzle-mysql.test.ts` do partners).

- **CA1 (RED):** `save` + `findById` de um `Collaborator` com `foodCategory = 'PREFIRO_NAO_RESPONDER'` (21 chars). Hoje o MySQL rejeita com `ER_DATA_TOO_LONG (1406)` → `save` devolve `err('collaborator-repo-unavailable')` → assert falha. Passa após o W1 (`varchar(30)`).
- **CA3 (guarda de regressão):** `foodCategory = 'VEGETARIANO'` (11 chars) — passa hoje e após o widening (garante que o INPLACE não trunca valores menores).

## Prova do RED (sem Docker no Mac)

- **Empírica:** o ETL falhou com `errno 1406` nos colaboradores com `food_category = 'PREFIRO_NAO_RESPONDER'` na VM de validação (5 quarentenados).
- **Inspeção:** `migrations/mysql/0002_young_cerise.sql:18` → `food_category varchar(20)`; `'PREFIRO_NAO_RESPONDER'.length === 21`.

## Validação do orquestrador

- `git status` → só o teste novo + a pasta do ticket; **`src/` intocado**.
- `pnpm run typecheck` → **verde** (o teste compila; APIs `Collaborator.register`/`completeRegistration` + `openPartnersMysql` existem).
- O teste é gated → não roda no `pnpm test` puro (sem falso vermelho na suíte unit). O RED roda no `test:integration:partners` (Docker) e está provado empiricamente.

## Garantia canônica para o W1 (MCP)

MySQL 8.4 Reference Manual, p.3141: "Extending VARCHAR column size ... `ALGORITHM=INPLACE, LOCK=NONE`". `varchar(20)→varchar(30)` utf8mb4 (80→120 bytes, ≤255) → INPLACE/online/prod-safe.
