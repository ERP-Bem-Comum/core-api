# 11 — Seed one-shot do usuário admin (`seed:admin`)

> Seed de produção idempotente para criação do usuário administrador inicial do módulo `auth` (issue [#245](https://github.com/ERP-Bem-Comum/core-api/issues/245)).
> Implementa o padrão de jobs one-shot descrito em [ADR-0041](../architecture/adr/0041-specialized-workers-and-oneshot-jobs.md).

---

## Visão geral

O `seed:admin` é um **script one-shot idempotente** que cria o usuário administrador inicial do sistema sem nunca exigir SQL bruto ou hash manual. Ele:

1. Valida as env vars obrigatórias antes de qualquer escrita.
2. Faz hash da senha via `argon2id` com parâmetros OWASP (adapter `makeArgon2PasswordHasher` — `memorySize 19456 KiB, iterations 2, parallelism 1, hashLength 32`).
3. Garante a role `admin-sistema` com **todas** as permissões de `PermissionCatalog.all` (upsert idempotente).
4. Cria o usuário admin se o e-mail ainda não existe; se já existe, encerra sem sobrescrever (re-rodar é seguro).
5. Atribui a role ao usuário (idempotente pela PK composta `userId+roleId`).

**Nunca deleta, nunca sobrescreve usuário existente.** Re-rodar em qualquer estado é seguro.

---

## Pré-requisitos

1. **Migrations aplicadas** no módulo `auth` antes do primeiro disparo. O script usa `applyMigrations: false` (prod-safe) e falha com `exit 1` se as tabelas `auth_user`, `auth_role`, `auth_permission`, `auth_role_permission` ou `auth_user_role` não existirem. Aplique as migrations via:

   ```bash
   pnpm run job:migrate
   ```

   ou via o serviço `migrate` do compose antes de subir o app.

2. **Connection string** disponível na env `AUTH_DATABASE_URL` (ver seção abaixo). Nunca passe via argv — isso vaza em `ps aux`.

---

## Env vars obrigatórias

> Todas as variáveis são lidas de **variáveis de ambiente**, **nunca de argumentos de linha de comando** (`argv`). Argumentos de processo ficam visíveis em `ps aux` para qualquer usuário do sistema.

| Variável           | Descrição                                              | Formato / Restrições                     |
| :----------------- | :----------------------------------------------------- | :--------------------------------------- |
| `AUTH_DATABASE_URL` | Connection string MySQL do módulo auth                | `mysql://user:pass@host:port/db`         |
| `ADMIN_EMAIL`      | E-mail do usuário admin (deve ser único em `auth_user`) | String; case-insensitive no banco        |
| `ADMIN_PASSWORD`   | Senha em claro — **nunca logada nem persistida em claro** | Min. caracteres definidos pela política |
| `ADMIN_NAME`       | Nome completo do admin                                 | Até 128 chars                            |
| `ADMIN_CPF`        | CPF (o script normaliza: extrai só dígitos, trunca em 11) | Aceita `000.000.000-00` ou `00000000000` |
| `ADMIN_PHONE`      | Telefone (o script normaliza: só dígitos, trunca em 13) | Aceita `(11) 99999-9999` ou `11999999999` |

Se qualquer variável estiver ausente, o script imprime **todas** as ausentes no stderr e encerra com `exitCode 78` (EX_CONFIG) **sem fazer nenhuma escrita**.

---

## Comando canônico

```bash
AUTH_DATABASE_URL='mysql://core_app:senha@127.0.0.1:3306/core' \
ADMIN_EMAIL='admin@bemcomum.org.br' \
ADMIN_PASSWORD='SenhaForte!2026' \
ADMIN_NAME='Administrador do Sistema' \
ADMIN_CPF='000.000.000-00' \
ADMIN_PHONE='(11) 99999-9999' \
  pnpm seed:admin
```

> Em produção, prefira injetar as variáveis via Secrets Manager ou arquivo `.env` com permissão `600` — nunca hardcode no script de deploy.

### Usando arquivo `.env` (desenvolvimento)

```bash
# .env.admin-seed (chmod 600 — nunca commitar)
AUTH_DATABASE_URL=mysql://core_app:senha@127.0.0.1:3306/core
ADMIN_EMAIL=admin@bemcomum.org.br
ADMIN_PASSWORD=SenhaForte!2026
ADMIN_NAME=Administrador do Sistema
ADMIN_CPF=00000000000
ADMIN_PHONE=11999999999
```

```bash
set -a && source .env.admin-seed && set +a && pnpm seed:admin
```

---

## Idempotência

O script foi desenhado para ser re-executado com segurança em qualquer momento:

| Situação                                   | Comportamento                                                   |
| :----------------------------------------- | :-------------------------------------------------------------- |
| Primeira execução, usuário não existe       | Cria role + permissões + usuário + atribuição. `exit 0`         |
| Re-execução, usuário já existe             | Avisa no stdout, não sobrescreve. `exit 0`                      |
| Re-execução, role já existe                | Reusa o id existente; re-sincroniza permissões. `exit 0`        |
| Re-execução, permissão já existe           | Reusa o id existente (SELECT-then-INSERT). `exit 0`             |
| Re-execução, atribuição role→usuário já existe | Detecta pela PK composta; não duplica. `exit 0`             |
| Usuário existe mas sem atribuição de role   | Atribui a role ao usuário existente. `exit 0`                   |

A sincronização de permissões da role usa `DELETE + INSERT batch` dentro de uma transação — garante que novas permissões adicionadas ao `PermissionCatalog` sejam incluídas em re-execuções futuras.

---

## Exit codes

| Exit code | Significado                                                      | Ação recomendada                              |
| :-------- | :--------------------------------------------------------------- | :-------------------------------------------- |
| `0`       | Sucesso (criação ou usuário já existia — idempotente)            | Nenhuma                                       |
| `1`       | Erro de runtime (conexão MySQL, hash argon2id, I/O)             | Verificar stderr; investigar conectividade    |
| `78`      | `EX_CONFIG` — env var obrigatória ausente                        | Corrigir env e re-executar                    |

---

## Segurança

- **Senha nunca logada**: o script usa apenas o hash PHC (`$argon2id$...`) resultante; a senha em claro não aparece em nenhum log, mensagem de erro ou variável intermediária impressa.
- **Hash argon2id OWASP**: parâmetros do adapter `makeArgon2PasswordHasher` — `memorySize: 19456 KiB`, `iterations: 2`, `parallelism: 1`, `hashLength: 32`, `salt: 16 bytes` aleatórios (via `node:crypto`). Conforme OWASP Password Storage Cheat Sheet (2024).
- **Env vars, nunca argv**: variáveis de processo são visíveis em `ps aux`; env vars de subprocesso não (em sistemas Unix padrão com `/proc` restrito).
- **`applyMigrations: false`**: o script não aplica migrations — não assume permissões de DDL em produção. Schema deve estar provisionado previamente.
- **Sem sobrescrita de usuário existente**: se `ADMIN_EMAIL` já existe, o script encerra sem modificar senha, nome, CPF ou telefone. Para alterar dados de um admin existente, use a API HTTP com autenticação adequada.

---

## Permissões concedidas

A role `admin-sistema` recebe **todas** as permissões definidas em `src/modules/auth/domain/authorization/permission-catalog.ts` (`PermissionCatalog.all`). O catálogo é a fonte única de verdade — ao adicionar novas permissões ao catálogo, uma re-execução do seed garante que a role admin as receba automaticamente.

Permissões atuais incluem (não exhaustivo): `contract:read/write/delete`, `fiscal-document:read/write`, `reconciliation:read/write/import/close`, `role:create/read/update/assign/revoke`, `user:create/read/list/activate/deactivate`, entre outras. Consulte o arquivo do catálogo para a lista completa e atualizada.

---

## Observabilidade

O script emite em stdout (mensagens ao operador):

```
[admin-seed] conectando ao banco...
[admin-seed] computando hash da senha...
[admin-seed] verificando role 'admin-sistema'...
[admin-seed] role criada: <uuid>           ← ou: role existente reutilizada: <uuid>
[admin-seed] verificando usuario 'admin@bemcomum.org.br'...
[admin-seed] usuario admin criado: <uuid>  ← ou: usuario ja existe (id=<uuid>) — nenhuma alteracao feita. Idempotente.
[admin-seed] role 'admin-sistema' atribuida ao usuario.
[admin-seed] concluido com sucesso.
```

Erros vão para stderr:

```
[admin-seed] env ausente: env-missing-ADMIN_PASSWORD
[admin-seed] falha ao conectar: auth-mysql-driver-connect-failed
[admin-seed] erro de runtime: <mensagem do mysql2 ou argon2>
```

---

## Agendamento

O seed é **one-shot** (criação inicial) — roda **uma vez** por ambiente no bootstrap da produção. Não precisa de cron. Re-rodar é seguro pela garantia de idempotência. Caso seja necessário criar um segundo admin ou alterar dados do existente, usar a API HTTP com autenticação adequada.

---

## Referências

- `scripts/seed/admin-user.ts` — entrypoint do seed.
- `src/modules/auth/adapters/crypto/password-hasher.argon2.ts` — adapter argon2id OWASP.
- `src/modules/auth/domain/authorization/permission-catalog.ts` — catálogo de permissões.
- `src/modules/auth/adapters/persistence/drivers/mysql-driver.ts` — `openAuthMysql`.
- `src/modules/auth/adapters/persistence/schemas/mysql.ts` — tabelas `auth_*`.
- [ADR-0041](../architecture/adr/0041-specialized-workers-and-oneshot-jobs.md) — workers especializados e jobs one-shot.
- [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — MySQL único dialeto; lista normativa de features SQL.
- [ADR-0014](../architecture/adr/0014-mysql-database-isolation.md) — isolamento por prefixo (`auth_*`).
- Issue [#245](https://github.com/ERP-Bem-Comum/core-api/issues/245) — origem desta entrega.
