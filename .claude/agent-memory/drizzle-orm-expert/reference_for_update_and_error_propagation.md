---
name: for-update-and-error-propagation
description: ADR-0020 não cita FOR UPDATE (só precedente de código); errno real de deadlock/lock-timeout mora em e.cause.errno, não em e.errno
metadata:
  type: reference
---

Duas conclusões confirmadas lendo o pacote `drizzle-orm@0.45.2` instalado e o ADR-0020 inteiro (evitando repetir a investigação):

**1. `FOR UPDATE` (`.for('update')`, `mysql-core/query-builders/select.d.ts:599`, tipos `LockStrength`/`LockConfig` em `select.types.d.ts:64-74`) NÃO tem citação literal no ADR-0020.** As três listas do ADR (`✅ Permitidas`, `🆕 Agora permitidas`, `❌ Continuam proibidas`, §"Lista normativa atualizada") não mencionam locking read em nenhuma linha. `handbook/reference/drizzle/select.mdx` também não documenta `.for()`. O que sustenta o padrão é só **precedente de código**: `cedente-account-store.drizzle.ts:178-182` (select completo), `role-repository.drizzle.ts:256-260` (select parcial — gêmeo mais próximo de qualquer uso novo com `{ id: ... }`), `remittance-repository.drizzle.ts:150-154`. `.for()` compõe sem restrição com `.select({...})` parcial e com `inArray` no `where` — não há armadilha de tipo.

**2. Toda query Drizzle (SELECT incl. `.for('update')`, INSERT, UPDATE) passa por `queryWithCache` (`mysql-core/session.js:20-26`) que embrulha QUALQUER erro do driver em `new DrizzleQueryError(sql, params, e)` (`errors.js:10-19`), e `DrizzleQueryError.cause = e`.** O `errno`/`sqlMessage`/`code` reais (setados pelo mysql2 em `packet.js:790`) ficam em `e.cause.errno`, nunca em `e.errno` direto — `e` (o `DrizzleQueryError`) não tem `errno` próprio. Deadlock = 1213 (`ER_LOCK_DEADLOCK`), lock wait timeout = 1205 (`ER_LOCK_WAIT_TIMEOUT`) — confirmado em `node_modules/mysql2/lib/constants/errors.js`. O padrão `getDupEntryInfo` de `role-repository.drizzle.ts:38-53` (checa `e` E `e.cause`) é o gabarito correto para qualquer detector de errno específico — o duplo-check é defensivo, não redundante.

**3. Rollback:** `mysql2/session.js:206-217` — qualquer `throw` dentro do callback de `db.transaction` (erro nomeado seu, erro de driver, ou `tx.rollback()` que só lança `TransactionRollbackError`) cai no `catch` genérico do driver, executa `ROLLBACK` de tudo que rodou na tx (INSERTs incluídos) e relança o MESMO erro para fora. O repo nunca usa `tx.rollback()` do `.mdx` oficial — sempre `throw` de erro custom + `try/catch` em volta de `db.transaction(...)` convertendo para `Result` na borda (`.claude/rules/adapters.md`). Isso diverge do exemplo do handbook de propósito.

Ver [[cedente-account-store-lock-pattern]] se essa nota for criada depois para o padrão de allocateNsa.
