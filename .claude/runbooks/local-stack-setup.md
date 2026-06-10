# Runbook — Setup do stack local (para agentes de IA)

> **Objetivo:** subir o `core-api` localmente com **persistência real** — MySQL para dados e
> **MinIO** para arquivos (PDFs, imagens). Escrito passo-a-passo para um agente executar sem adivinhar.
> Cada nome de env/secret aqui foi verificado no código-fonte (não decorado). Fontes citadas ao final.
>
> **Regra absoluta:** `pnpm`, **nunca** `npm` (ADR-0012; há hook `PreToolUse(Bash)` que bloqueia `npm`).

---

## 0. Mapa mental — o que existe

O projeto tem **dois modos de armazenamento** e a confusão mais comum é trocá-los:

| Modo | Onde os bytes ficam | Persiste? | Quando roda |
| --- | --- | --- | --- |
| `memory` (default) | RAM do processo Node | ❌ some ao reiniciar | boot sem env de DB/S3; testes |
| `mysql` + S3/MinIO | MySQL (dados) + disco do MinIO (arquivos) | ✅ durável | este runbook |

Subir "de verdade" = **driver `mysql` + MinIO ligados via env vars**. Sem isso, tudo é efêmero.

### Dependências do stack

| Dependência | Papel | Como sobe | ADR |
| --- | --- | --- | --- |
| **Node.js 24 + pnpm** | Runtime do `core-api` | local (nvm + corepack) | ADR-0009, ADR-0012 |
| **Docker + Compose** | Orquestra a infra local | Docker Desktop | — |
| **MySQL 8.4** | Persistência relacional (dados) | `docker compose up -d mysql` | ADR-0013, ADR-0020 |
| **MinIO** | Object storage S3-compatível (arquivos) | `docker compose up -d minio` | ADR-0019 |
| **Secrets (`./secrets/*.txt`)** | Senhas do MySQL via file (não env) | `pnpm secrets:setup` | ADR-0011 |
| **Worker de outbox** | Publica eventos cross-módulo | `pnpm run worker:outbox` | ADR-0015 |

---

## 1. Pré-requisitos (verificar antes)

```bash
node --version      # deve ser v24.x
pnpm --version      # deve ser 11.x (via corepack); se faltar: corepack enable
docker version      # daemon precisa estar rodando
pnpm install --frozen-lockfile   # instala deps respeitando o lockfile
```

---

## 2. Gerar os secrets do MySQL

O compose do MySQL lê as senhas de **arquivos** em `./secrets/` (não env vars — ADR-0011). O script gera os 3:

```bash
pnpm secrets:setup --random      # senhas aleatórias, sem prompt (ideal para automação/IA)
```

Gera (`scripts/setup-secrets.ts`):

| Arquivo | Para quê |
| --- | --- |
| `secrets/mysql_root_password.txt` | root do MySQL |
| `secrets/mysql_app_password.txt` | user `core_app` — **escritor único** de `core.*` |
| `secrets/mysql_readonly_password.txt` | user `readonly_bi` — SELECT em `core.*` |

> ⚠️ **Nunca commitar `secrets/*.txt`** (já no `.gitignore`). Para um agente: leia o valor do app password
> com `cat secrets/mysql_app_password.txt` apenas quando for montar a connection string — não ecoe em logs.

---

## 3. Subir a infra (MySQL + MinIO)

```bash
docker compose up -d --wait        # sobe minio, minio-bootstrap, mysql e espera ficarem healthy
```

O que sobe (`compose.yaml`):

| Serviço | Porta host | Credenciais (default dev) | Observação |
| --- | --- | --- | --- |
| `mysql` | `3306` | user `core_app`, db `core`, senha = `secrets/mysql_app_password.txt` | migrations aplicam no boot do app (não aqui) |
| `minio` | `9000` (API) · `9001` (console web) | `dev-access-key` / `dev-secret-key-min-8-chars` | dados no volume `core-api-minio-data` (disco) |
| `minio-bootstrap` | — | — | cria o bucket **`contracts-documents`** e sai |

O bucket `contracts-documents` é criado automaticamente pelo `minio-bootstrap`. Console web do MinIO:
`http://localhost:9001` (login com as credenciais acima).

> ⚠️ **Conflito de porta comum:** se a `9000` já estiver ocupada (ex.: outro projeto), o MinIO falha.
> Verifique com `lsof -iTCP:9000 -sTCP:LISTEN -P`. Para remapear, suba com
> `MINIO_API_PORT=9100 docker compose up -d` e ajuste `S3_ENDPOINT` (seção 4) para a porta nova.

---

## 4. Variáveis de ambiente do `core-api`

O servidor (`src/server.ts`) lê **tudo de env vars**. Cada módulo escolhe seu driver. Para persistência real,
**todos os módulos compartilham o mesmo MySQL `core`** (isolamento por prefixo de tabela `ctr_*`/`par_*`/etc.,
ADR-0014), então a connection string é a mesma.

### 4.1 Connection string do MySQL

Formato: `mysql://core_app:<APP_PASSWORD>@127.0.0.1:3306/core`
onde `<APP_PASSWORD>` é o conteúdo de `secrets/mysql_app_password.txt`.

### 4.2 Drivers + bancos (por módulo)

| Env | Valor para persistência real | Default se ausente |
| --- | --- | --- |
| `AUTH_DRIVER` | `mysql` | `memory` |
| `AUTH_DATABASE_URL` | `mysql://core_app:<pass>@127.0.0.1:3306/core` | — |
| `CONTRACTS_DRIVER` | `mysql` | `memory` |
| `CONTRACTS_DATABASE_URL` | `mysql://core_app:<pass>@127.0.0.1:3306/core` | — |
| `PARTNERS_DRIVER` | `mysql` | `memory` |
| `PARTNERS_DATABASE_URL` | `mysql://core_app:<pass>@127.0.0.1:3306/core` | — |
| `PROGRAMS_DRIVER` | `mysql` | `memory` |
| `PROGRAMS_DATABASE_URL` | `mysql://core_app:<pass>@127.0.0.1:3306/core` | — |

> As migrations são aplicadas **automaticamente no boot** do pool writer (não há comando manual de migrate).
> Réplica de leitura é opcional: `CONTRACTS_READER_URL` / `PARTNERS_READER_URL` (ausente → reusa o writer).

### 4.3 Storage de documentos do Contracts (S3/MinIO) — **OBRIGATÓRIO quando `CONTRACTS_DRIVER=mysql`**

⚠️ **Crítico:** se `CONTRACTS_DRIVER=mysql` e as envs `S3_*` faltarem/forem inválidas, o boot **falha de
propósito** (`composition.ts` → `contracts-composition: storage S3 mal configurado`). Não é opcional nesse modo.

Valores para apontar ao **MinIO local** (`s3-config-aws.ts` → `parseAwsS3Env`):

| Env | Obrigatória? | Valor para MinIO local |
| --- | --- | --- |
| `S3_ENDPOINT` | opcional | `http://127.0.0.1:9000` |
| `S3_REGION` | **sim** | `us-east-1` (MinIO ignora, mas o SDK exige) |
| `S3_BUCKET` | **sim** | `contracts-documents` (criado pelo bootstrap) |
| `S3_ACCESS_KEY_ID` | **sim** | `dev-access-key` |
| `S3_SECRET_ACCESS_KEY` | **sim** | `dev-secret-key-min-8-chars` |
| `S3_FORCE_PATH_STYLE` | opcional | `true` (auto-ativa se endpoint tem `localhost`/`127.0.0.1`) |

### 4.4 Storage de logo do Programs (S3/MinIO) — **opcional, degrada**

Só liga se **todas** as `PROGRAMS_LOGO_S3_*` estiverem presentes; ausência de qualquer uma → logo in-memory
(degradado, `src/server.ts` → `readProgramsLogoConfig`). Precisa de um bucket próprio (crie via console MinIO
ou reuse `contracts-documents`):

| Env | Valor para MinIO local |
| --- | --- |
| `PROGRAMS_LOGO_S3_ENDPOINT` | `http://127.0.0.1:9000` |
| `PROGRAMS_LOGO_S3_REGION` | `us-east-1` |
| `PROGRAMS_LOGO_S3_BUCKET` | `program-logos` (criar antes) |
| `PROGRAMS_LOGO_S3_ACCESS_KEY_ID` | `dev-access-key` |
| `PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY` | `dev-secret-key-min-8-chars` |
| `PROGRAMS_LOGO_S3_FORCE_PATH_STYLE` | `true` |

### 4.5 Config HTTP (opcional — defaults seguros em `config.ts`)

| Env | Default |
| --- | --- |
| `PORT` | `3000` |
| `HOST` | `0.0.0.0` |
| `CORS_ORIGINS` | (vazio) — CSV de origens |
| `RATE_LIMIT_MAX` | `200` |
| `TRUST_PROXY` | `true` |

---

## 5. Subir o servidor

Monte um `.env` local (ou exporte as vars) e suba. Exemplo mínimo de persistência real:

```bash
APP_PASS="$(cat secrets/mysql_app_password.txt)"
export AUTH_DRIVER=mysql       AUTH_DATABASE_URL="mysql://core_app:${APP_PASS}@127.0.0.1:3306/core"
export CONTRACTS_DRIVER=mysql  CONTRACTS_DATABASE_URL="mysql://core_app:${APP_PASS}@127.0.0.1:3306/core"
export PARTNERS_DRIVER=mysql   PARTNERS_DATABASE_URL="mysql://core_app:${APP_PASS}@127.0.0.1:3306/core"
export PROGRAMS_DRIVER=mysql   PROGRAMS_DATABASE_URL="mysql://core_app:${APP_PASS}@127.0.0.1:3306/core"
export S3_ENDPOINT=http://127.0.0.1:9000 S3_REGION=us-east-1 S3_BUCKET=contracts-documents \
       S3_ACCESS_KEY_ID=dev-access-key S3_SECRET_ACCESS_KEY=dev-secret-key-min-8-chars S3_FORCE_PATH_STYLE=true

pnpm run serve        # node src/server.ts → escuta em http://localhost:3000
```

Worker de outbox (processo separado, para eventos cross-módulo — ADR-0015):

```bash
CONTRACTS_DATABASE_URL="mysql://core_app:${APP_PASS}@127.0.0.1:3306/core" pnpm run worker:outbox
```

---

## 6. Verificar que está no ar

```bash
curl -s http://localhost:3000/health        # → {"status":"ok"}
```

Provar persistência de arquivo (upload → reiniciar container → download deve sobreviver):
1. Faça upload de um PDF via a rota de documento do contrato (autenticado).
2. Confirme o objeto no console MinIO (`http://localhost:9001` → bucket `contracts-documents`).
3. `docker compose restart minio` e baixe de novo — **persiste** (está em disco, não RAM).

---

## 7. Encerrar

```bash
docker compose down           # para os containers, PRESERVA os dados (volumes intactos)
docker compose down -v        # ⚠️ para E APAGA os volumes (perde MySQL + arquivos do MinIO)
```

---

## 8. Troubleshooting rápido

| Sintoma | Causa provável | Ação |
| --- | --- | --- |
| Boot falha: `storage S3 mal configurado` | `CONTRACTS_DRIVER=mysql` sem `S3_*` | preencher as envs da seção 4.3 |
| MinIO não sobe | porta `9000` ocupada | `lsof -iTCP:9000`; remapear via `MINIO_API_PORT` |
| MySQL `up --wait` trava | secrets ausentes | rodar `pnpm secrets:setup --random` antes |
| `npm` bloqueado | hook anti-npm (ADR-0012) | usar `pnpm` |
| Logo de programa não persiste | falta alguma `PROGRAMS_LOGO_S3_*` | preencher TODAS (é tudo-ou-nada) |

---

## 9. Permissões (RBAC) e seed de usuários

O `core-api` tem RBAC no módulo `auth`. **Três conceitos**, do menor para o maior:

1. **Permission** — string `resource:action` (ex.: `user:list`, `contract:write`). O conjunto é um
   **catálogo fixo**, definido em deploy-time (`domain/authorization/permission-catalog.ts`) e **imutável
   em runtime**. Permissão fora do catálogo é rejeitada.
2. **Role** — agrupa permissões. Gerenciável em runtime via `/api/v1/roles` (exige permissão `role:*`).
3. **Usuário** — recebe Roles. Suas **permissões efetivas** = união das permissões de todos os seus Roles.

Toda rota protegida exige uma permissão. Sem ela → **HTTP 403** (`forbidden`). Exceção: **Minha Conta**
(`/api/v1/me`) é autosserviço — não exige `user:*`. Por isso um usuário sem permissões consegue editar o
próprio perfil mas leva 403 em `GET /api/v1/users`.

### Catálogo completo de permissões (fonte: `permission-catalog.ts`)

| Recurso | Permissões (`action`) |
| --- | --- |
| `act` (partners / atos) | `read`, `write` |
| `collaborator` (partners) | `read`, `write` |
| `contract` | `read`, `write`, `delete`, `mass-approve` |
| `etl` (ingestão) | `mass-approver` |
| `financier` (partners) | `read`, `write` |
| `geography` (partners / território) | `read`, `write` |
| `program` | `read`, `write`, `deactivate` |
| `role` (gestão de acessos) | `read`, `create`, `update`, `assign`, `revoke` |
| `supplier` (partners) | `read`, `write` |
| `user` (gestão de usuários) | `list`, `read`, `create`, `register`, `update`, `activate`, `deactivate`, `assign-role` |

> Não existe wildcard `user:*` literal — é preciso listar cada `resource:action`. (A expressão `user:*` nos
> tickets é só uma abreviação para "o conjunto das permissões de `user`".)

### Como semear um usuário com permissões (dev / homologação local)

O seed é injetado por **env var**, com **guarda dupla** (`e2e-seed.ts`): só é aplicado quando
`CORE_API_E2E=1` **E** `AUTH_SEED_JSON` estão presentes. Em produção (sem `CORE_API_E2E`) é **inerte** —
o seed jamais é lido. Cada usuário semeado recebe um **Role inline** com exatamente as permissões listadas
(isso *bypassa* o fluxo normal de `assignRole`, que exigiria um ator já privilegiado — resolve o problema do
"primeiro admin" / bootstrap).

**Formato do `AUTH_SEED_JSON`:**

```json
{ "users": [ { "email": "...", "password": "...", "permissions": ["resource:action", "..."] } ] }
```

**Exemplo real** (de `scripts/e2e-contracts.sh`) — um operador só com contratos:

```bash
CORE_API_E2E=1 \
AUTH_SEED_JSON='{"users":[{"email":"e2e-operator@example.com","password":"Str0ng-Passphrase-2026!","permissions":["contract:read","contract:write"]}]}'
```

### Admin "full" para homologação local (resolve o cenário do ticket `USR-SEED-PERMISSIONS`)

Para validar tudo localmente (usuários, programas, contratos, parceiros), semeie um admin com o catálogo
inteiro. Isso cobre o gap do `admin@bemcomum.dev` que hoje leva 403 em `/users` e `/programs`:

```bash
APP_PASS="$(cat secrets/mysql_app_password.txt)"
export CORE_API_E2E=1
export AUTH_DRIVER=mysql AUTH_DATABASE_URL="mysql://core_app:${APP_PASS}@127.0.0.1:3306/core"
export AUTH_SEED_JSON='{"users":[{"email":"admin@bemcomum.dev","password":"Str0ng-Passphrase-2026!","permissions":["user:list","user:read","user:create","user:register","user:update","user:activate","user:deactivate","user:assign-role","program:read","program:write","program:deactivate","contract:read","contract:write","contract:delete","contract:mass-approve","collaborator:read","collaborator:write","supplier:read","supplier:write","financier:read","financier:write","act:read","act:write","geography:read","geography:write","role:read","role:create","role:update","role:assign","role:revoke","etl:mass-approver"]}]}'
pnpm run serve
```

Depois, autentique e use o token:

```bash
# login (rota v2 do auth)
curl -s -X POST http://localhost:3000/api/v2/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@bemcomum.dev","password":"Str0ng-Passphrase-2026!"}'
# → use o accessToken retornado como  Authorization: Bearer <token>  nas rotas /api/v1/*
```

### Injetar o seed no docker compose (serviço `app`)

O serviço `app` do `compose.yaml` roda o servidor HTTP. Para homologação local com seed **sem editar o
compose versionado**, crie um `compose.override.yaml` (Compose mescla automaticamente):

```yaml
services:
  app:
    environment:
      CORE_API_E2E: "1"
      AUTH_DRIVER: mysql
      # No compose, o host do banco é o NOME DO SERVIÇO (`mysql`), não 127.0.0.1:
      AUTH_DATABASE_URL: "mysql://core_app:SENHA_DO_APP@mysql:3306/core"
      AUTH_SEED_JSON: '{"users":[{"email":"admin@bemcomum.dev","password":"Str0ng-Passphrase-2026!","permissions":["user:list","user:read","program:read","contract:read","contract:write"]}]}'
      # + CONTRACTS_*, PARTNERS_*, PROGRAMS_*, S3_* conforme seções 4.2–4.4
    ports:
      - "3000:3000"   # o serviço app do compose não expõe porta por padrão — adicione aqui
    depends_on:
      mysql:
        condition: service_healthy
      minio:
        condition: service_healthy
```

```bash
docker compose --profile app up -d --build      # sobe mysql + minio + app já com o seed
```

> ⚠️ **Regras de ouro do RBAC em ambientes:**
> - `CORE_API_E2E` / `AUTH_SEED_JSON` são **EXCLUSIVOS de dev/test/homologação** — **NUNCA** em produção.
> - Em produção o primeiro admin é provisionado por outro mecanismo (migration/seed operacional), não por env.
> - Use as strings **exatas** da tabela do catálogo — um typo (`user:lists`) é silenciosamente descartado.
> - Driver `memory`: o seed re-aplica a cada boot (estado efêmero). Driver `mysql`: se o e-mail já existir de
>   um boot anterior, valide o comportamento antes de assumir idempotência (ou parta de um MySQL limpo).

---

## Fontes (verificadas no código)

- `src/modules/auth/domain/authorization/permission-catalog.ts` — catálogo fixo de permissões.
- `src/modules/auth/adapters/http/e2e-seed.ts` — parser do seed (guarda `CORE_API_E2E` + `AUTH_SEED_JSON`).
- `src/modules/auth/adapters/http/composition.ts` — bootstrap RBAC (Role inline por usuário semeado).
- `scripts/e2e-contracts.sh` — exemplo real de `AUTH_SEED_JSON` em uso.
- `handbook/tickets/todo/USR-SEED-PERMISSIONS.md` — gap do admin de dev (`user:*`/`program:*`).
- `compose.yaml` — serviços minio/mysql, volumes, bootstrap do bucket.
- `scripts/setup-secrets.ts` — gera os 3 secrets.
- `src/modules/contracts/adapters/storage/s3-config-aws.ts` — envs `S3_*` (canônicas).
- `src/modules/contracts/adapters/http/composition.ts` — S3 obrigatório no driver mysql.
- `src/server.ts` — envs de driver/DB por módulo + `PROGRAMS_LOGO_S3_*`.
- `src/shared/http/config.ts` — defaults HTTP (`PORT`/`HOST`/...).
- Detalhes formais de ambiente e secrets: `handbook/infrastructure/02-environments.md`,
  `handbook/infrastructure/03-secrets-catalog.md`.
- ADRs: 0011 (supply-chain/secrets), 0013 (MySQL), 0014 (isolamento por prefixo), 0015 (outbox),
  0019 (storage S3+MinIO), 0020 (MySQL único).
