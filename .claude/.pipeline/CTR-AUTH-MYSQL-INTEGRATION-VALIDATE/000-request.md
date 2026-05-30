# CTR-AUTH-MYSQL-INTEGRATION-VALIDATE — Validação de integração MySQL dos adapters auth novos

> **Size:** S · **Épico:** `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md` (último follow-up).

## Escopo

Validar contra MySQL 8.4 real que as migrations e repos Drizzle novos (reset token + lockout)
funcionam. Bloqueio: a porta 3306 estava ocupada por container alheio (`bemcomum-mysql`).

## Solução do conflito de porta

- O compose já parametriza: `ports: '${MYSQL_PORT:-3306}:3306'`. Subi o MySQL do projeto na **3307**
  (`MYSQL_PORT=3307`), sem colidir com o `bemcomum-mysql` (3306, **não tocado**).
- Os 3 testes drizzle de integração hardcodavam `127.0.0.1:3306` → parametrizados para
  `127.0.0.1:${MYSQL_PORT:-3306}` (mantém 3306 default; permite override).

## Critérios de aceite

- [x] Migrations 0000+0001+0002 aplicam no MySQL real (via `openAuthMysql(applyMigrations:true)` nos 29 testes existentes — todos pass).
- [x] Repos Drizzle novos exercidos (`reset-lockout.integration.test.ts`, gated `MYSQL_INTEGRATION=1`): reset token save/findByTokenHash/findUnusedByUserId; lockout save (upsert por PK)/findByUserId. **2/2 pass.**
- [x] `bemcomum-mysql` alheio intacto; MySQL do projeto derrubado (down -v) + secrets limpos.
- [x] typecheck + lint + format verdes.
