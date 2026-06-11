# Guia: `.env` + docker-compose com paridade de servidor (MySQL + S3/MinIO + e-mail)

> **Objetivo:** rodar o `core-api` localmente **exatamente como rodaria num servidor** — MySQL real,
> object storage S3 (MinIO), e **e-mail saindo de verdade** (convite de usuário, reset de senha).
> Tudo via `docker compose` + um único arquivo `.env`.
>
> **Cada env aqui foi verificada no código** (`src/server.ts`, `…/auth/adapters/http/composition.ts`,
> `…/contracts/adapters/storage/s3-config-aws.ts`, `…/notifications/adapters/email/nodemailer-config.ts`).
> Em caso de divergência, **o código vence**.
>
> Este guia foca no **`.env` e no e-mail**. Para o passo-a-passo de MySQL/MinIO/RBAC já existe o
> runbook [`.claude/runbooks/local-stack-setup.md`](../../.claude/runbooks/local-stack-setup.md) —
> aqui a gente fecha o que falta (e-mail, JWT estável) e entrega um `.env` completo copia-e-cola.

---

## 0. Como o app lê configuração (leia primeiro — pega muita gente)

- O servidor (`src/server.ts`) lê **100% da config de variáveis de ambiente**. Sem env de DB/S3/SMTP,
  cada módulo cai no driver **`memory`** (efêmero) e o mailer vira **no-op** (não envia nada).
- **`.env` NÃO é carregado automaticamente.** `pnpm run serve` não passa `--env-file`. Você tem 2 formas:
  1. **Docker (recomendado — paridade real):** o serviço `app` do compose carrega via `env_file: .env`.
  2. **No host:** `node --env-file=.env --experimental-strip-types --enable-source-maps --no-warnings src/server.ts`.
- ⚠️ **Host nas connection strings muda conforme onde o app roda:**
  - dentro do **compose** → use o **nome do serviço** (`mysql`, `minio`, `mailpit`).
  - rodando no **host** → use `127.0.0.1`.
- `.env` está no `.gitignore` (junto com `.env.local`). **Nunca commite.**

---

## 1. Quick start (caminho docker, paridade total)

```bash
# 1. Secrets do MySQL (senhas em arquivos — ADR-0011)
pnpm secrets:setup --random

# 2. Sobe infra: MySQL + MinIO (+ bucket) + Mailpit (e-mail)  — ver §4 p/ o override
docker compose -f compose.yaml -f compose.override.yaml up -d --wait

# 3. Cria o .env (copie o bloco da §2, troque a senha do MySQL)  e sobe o app
docker compose -f compose.yaml -f compose.override.yaml --profile app up -d --build

# 4. Verifique
curl -s http://localhost:3000/health        # → {"status":"ok"}
# E-mails capturados: abra http://localhost:8025  (Mailpit)
```

A senha do MySQL para a connection string sai de `cat secrets/mysql_app_password.txt`.

---

## 2. O `.env` completo (copie, ajuste a senha do MySQL)

> Versão para rodar **dentro do docker** (hosts = nomes de serviço). Para rodar no host, troque
> `mysql`→`127.0.0.1`, `minio`→`127.0.0.1`, `mailpit`→`127.0.0.1` (ver comentários).

```dotenv
# ─────────────────────────────────────────────────────────────────────────────
# core-api — .env de paridade de servidor (dev/homologação local)
# NÃO COMMITAR. Hosts = nomes de serviço do compose (no host, use 127.0.0.1).
# ─────────────────────────────────────────────────────────────────────────────

# ── HTTP ─────────────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
# CSV de origens liberadas no CORS (front local). Vazio = sem CORS.
CORS_ORIGINS=http://localhost:5173
TRUST_PROXY=true

# ── MySQL (todos os módulos compartilham o database `core`, ADR-0014) ─────────
# Formato: mysql://core_app:<SENHA>@<host>:3306/core
# <SENHA> = conteúdo de secrets/mysql_app_password.txt   (host: troque mysql→127.0.0.1)
AUTH_DRIVER=mysql
AUTH_DATABASE_URL=mysql://core_app:COLE_A_SENHA_DO_APP_AQUI@mysql:3306/core
CONTRACTS_DRIVER=mysql
CONTRACTS_DATABASE_URL=mysql://core_app:COLE_A_SENHA_DO_APP_AQUI@mysql:3306/core
PARTNERS_DRIVER=mysql
PARTNERS_DATABASE_URL=mysql://core_app:COLE_A_SENHA_DO_APP_AQUI@mysql:3306/core
PROGRAMS_DRIVER=mysql
PROGRAMS_DATABASE_URL=mysql://core_app:COLE_A_SENHA_DO_APP_AQUI@mysql:3306/core
# (opcional) réplica de leitura; ausente → reusa o writer:
# CONTRACTS_READER_URL=...
# PARTNERS_READER_URL=...

# ── S3 / MinIO — documentos de contrato E fotos de perfil ─────────────────────
# OBRIGATÓRIO quando CONTRACTS_DRIVER=mysql (senão o boot FALHA de propósito).
# Mesmo conjunto S3_* é usado pelo storage de foto de perfil (auth).
# (host: troque minio→127.0.0.1)
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=contracts-documents
S3_ACCESS_KEY_ID=dev-access-key
S3_SECRET_ACCESS_KEY=dev-secret-key-min-8-chars
S3_FORCE_PATH_STYLE=true

# ── S3 / MinIO — logo de Programas (tudo-ou-nada; ausência → logo in-memory) ───
# Precisa de um bucket próprio (crie no console MinIO antes — §5).
PROGRAMS_LOGO_S3_ENDPOINT=http://minio:9000
PROGRAMS_LOGO_S3_REGION=us-east-1
PROGRAMS_LOGO_S3_BUCKET=program-logos
PROGRAMS_LOGO_S3_ACCESS_KEY_ID=dev-access-key
PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY=dev-secret-key-min-8-chars
PROGRAMS_LOGO_S3_FORCE_PATH_STYLE=true

# ── E-mail (convite de usuário + reset de senha) — via SMTP/Nodemailer ────────
# ⚠️ As 5 SMTP_* + AUTH_RESET_FROM são OBRIGATÓRIAS p/ e-mail sair. Falta qualquer
# uma → mailer NO-OP (não envia, não loga). Ver §3 (Mailpit vs Resend).
# Mailpit local (captura e mostra no navegador):  (host: mailpit→127.0.0.1)
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=dev
SMTP_PASS=dev
AUTH_RESET_FROM=no-reply@bemcomum.dev
AUTH_INVITE_FROM=no-reply@bemcomum.dev
# Origem confiável do link de reset (nunca o header Host):
AUTH_RESET_BASE_URL=http://localhost:5173

# ── JWT (ES256) — opcional; ausente = par efêmero (tokens morrem no restart) ───
# Para tokens estáveis entre reinícios, gere as chaves (§3.3) e cole o PEM aqui.
# Em .env de uma linha não dá pra multi-linha: prefira o compose.override (YAML |)
# ou rodar no host com  export AUTH_JWT_PRIVATE_KEY="$(cat private-pkcs8.pem)".
# AUTH_JWT_PRIVATE_KEY=
# AUTH_JWT_PUBLIC_KEY=

# ── Seed RBAC (DEV/HOMOLOGAÇÃO APENAS — nunca em produção) ─────────────────────
# Cria um admin já com permissões (resolve o "primeiro admin"). Guarda dupla:
# só aplica com CORE_API_E2E=1 + AUTH_SEED_JSON. Catálogo completo no runbook §9.
CORE_API_E2E=1
AUTH_SEED_JSON={"users":[{"email":"admin@bemcomum.dev","password":"Str0ng-Passphrase-2026!","permissions":["user:list","user:read","user:create","user:register","user:update","user:activate","user:deactivate","user:assign-role","program:read","program:write","program:deactivate","contract:read","contract:write","contract:delete","contract:mass-approve","collaborator:read","collaborator:write","supplier:read","supplier:write","financier:read","financier:write","act:read","act:write","geography:read","geography:write","role:read","role:create","role:update","role:assign","role:revoke","etl:mass-approver"]}]}

# ── Worker de outbox (eventos cross-módulo, ADR-0015) — processo separado ──────
# Reusa CONTRACTS_DATABASE_URL. Defaults seguros; ajuste se quiser:
# OUTBOX_POLL_MS=1000
# OUTBOX_BATCH_SIZE=10
# Expiração automática de contratos (spec 009): intervalo do sweep que finaliza
# contratos vencidos (Active → Expired, borda D+1 em UTC-3). Default 1 h.
# CONTRACTS_EXPIRE_SWEEP_MS=3600000
```

> **Como preencher a senha:** `cat secrets/mysql_app_password.txt` e cole no lugar de
> `COLE_A_SENHA_DO_APP_AQUI` nas 4 `*_DATABASE_URL`. Se a senha tiver caracteres especiais
> (`@`, `:`, `/`), faça URL-encode.

---

## 3. E-mail funcionando (o ponto-chave)

O servidor HTTP envia **dois** e-mails transacionais: **convite de usuário** (`POST /api/v1/users`)
e **reset de senha** (`forgot-password` / `me/password-reset`). Ambos usam o adapter **SMTP
(Nodemailer)**. Regra do código (`composition.ts`):

> SMTP_HOST + SMTP_PORT + SMTP_SECURE + SMTP_USER + SMTP_PASS **válidos** **E** `AUTH_RESET_FROM`
> um e-mail válido → Nodemailer real. **Falta qualquer um → mailer no-op** (boot segue, mas nada sai).

`AUTH_INVITE_FROM` cai para `AUTH_RESET_FROM` se não definido.

> ℹ️ **Sobre o Resend:** existe um adapter Resend no módulo `notifications`
> (`CTR-EMAIL-ADAPTER-RESEND`), mas ele **ainda não está ligado no `src/server.ts`** — o caminho de
> e-mail do servidor hoje é **SMTP/Nodemailer**. A boa notícia: **dá para usar o Resend pelo próprio
> SMTP** (o Resend expõe gateway SMTP), então você "usa Resend" sem mudar código — ver §3.2.

### 3.1 Opção A — Mailpit (recomendado p/ dev: vê o e-mail no navegador)

Captura todo e-mail localmente e mostra numa UI web. Zero dependência externa. Já incluído no
`compose.override.yaml` (§4). No `.env`:

```dotenv
SMTP_HOST=mailpit        # no host: 127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=dev            # Mailpit ignora auth, mas o parser exige os campos
SMTP_PASS=dev
AUTH_RESET_FROM=no-reply@bemcomum.dev
```

Abra **http://localhost:8025** para ver os e-mails enviados.

### 3.2 Opção B — Resend de verdade (entrega real, via SMTP do Resend)

Use a **conta Resend** e um **domínio verificado**. O `AUTH_RESET_FROM` precisa ser de um domínio
verificado no Resend, senão a entrega é recusada.

```dotenv
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend                       # literal "resend"
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxxxxxx   # sua API key do Resend (RESEND_API_KEY)
AUTH_RESET_FROM=no-reply@seu-dominio-verificado.com
AUTH_INVITE_FROM=no-reply@seu-dominio-verificado.com
```

> Não precisa de Mailpit nesse modo. (Se um dia o adapter Resend nativo for ligado no server, ele
> usará a env `RESEND_API_KEY` — mas hoje o caminho ativo é este, via SMTP.)

### 3.3 JWT estável (opcional — só se quiser tokens que sobrevivem a restart)

Sem `AUTH_JWT_PRIVATE_KEY`/`AUTH_JWT_PUBLIC_KEY`, o auth gera um par ES256 **efêmero** a cada boot
(aceitável em dev; os tokens viram inválidos ao reiniciar). Para paridade de prod, gere o par P-256:

```bash
# privada em PKCS8 (formato que o código espera — importPKCS8)
openssl ecparam -name prime256v1 -genkey -noout -out ec-private.pem
openssl pkcs8 -topk8 -nocrypt -in ec-private.pem -out jwt-private-pkcs8.pem
# pública em SPKI
openssl ec -in ec-private.pem -pubout -out jwt-public-spki.pem
```

Como o PEM é multi-linha, **não** caiba num `.env` de uma linha. Duas saídas:
- **Docker:** use bloco YAML no `compose.override.yaml` (`AUTH_JWT_PRIVATE_KEY: |` + indentação).
- **Host:** `export AUTH_JWT_PRIVATE_KEY="$(cat jwt-private-pkcs8.pem)"` antes do `node --env-file`.

---

## 4. `compose.override.yaml` (Mailpit + serviço `app` lendo o `.env`)

O `compose.yaml` versionado **não** expõe porta do `app` nem inclui Mailpit (de propósito). Crie um
`compose.override.yaml` (o Compose mescla automaticamente; **não** é commitado se você adicionar ao
`.gitignore`, ou commite se o time quiser padronizar):

```yaml
# compose.override.yaml — extras de dev: Mailpit + app com env_file + portas
services:
  mailpit:
    image: axllent/mailpit:latest
    container_name: core-api-mailpit
    restart: unless-stopped
    ports:
      - '8025:8025' # UI web
      - '1025:1025' # SMTP
    networks:
      - core-api

  app:
    env_file:
      - .env # carrega TODAS as envs da §2 dentro do container
    ports:
      - '3000:3000'
    depends_on:
      mysql:
        condition: service_healthy
      minio:
        condition: service_healthy
      mailpit:
        condition: service_started
    # (opcional) JWT estável via bloco YAML multi-linha:
    # environment:
    #   AUTH_JWT_PRIVATE_KEY: |
    #     -----BEGIN PRIVATE KEY-----
    #     ...
    #     -----END PRIVATE KEY-----
    #   AUTH_JWT_PUBLIC_KEY: |
    #     -----BEGIN PUBLIC KEY-----
    #     ...
    #     -----END PUBLIC KEY-----
```

> O serviço `app` está sob o profile `app` no `compose.yaml` — por isso o `--profile app` no up.

---

## 5. Bucket extra do logo de Programas

O `minio-bootstrap` cria só o `contracts-documents`. Para o logo de programa, crie `program-logos`:

```bash
# via console web: http://localhost:9001  (dev-access-key / dev-secret-key-min-8-chars) → Create Bucket
# ou via mc dentro da rede do compose:
docker run --rm --network core-api minio/mc sh -c "\
  mc alias set local http://minio:9000 dev-access-key dev-secret-key-min-8-chars && \
  mc mb --ignore-existing local/program-logos"
```

Se faltar **qualquer** `PROGRAMS_LOGO_S3_*`, o logo cai para in-memory (degradado) — é tudo-ou-nada.

---

## 6. Verificação end-to-end

```bash
# 1. Servidor no ar
curl -s http://localhost:3000/health        # → {"status":"ok"}

# 2. Login com o admin semeado (rota v2 do auth)
curl -s -X POST http://localhost:3000/api/v2/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@bemcomum.dev","password":"Str0ng-Passphrase-2026!"}'
# → guarde o accessToken (use como  Authorization: Bearer <token>  nas rotas /api/v1/*)

# 3. E-MAIL: dispare um reset e veja chegar no Mailpit
curl -s -X POST http://localhost:3000/api/v2/auth/forgot-password \
  -H 'content-type: application/json' \
  -d '{"email":"admin@bemcomum.dev"}'      # → 202 sempre
# Abra http://localhost:8025 → o e-mail de reset deve aparecer.

# 4. S3: faça upload de um documento PDF num contrato (autenticado) e confirme o objeto
#    no console MinIO (http://localhost:9001 → bucket contracts-documents).
```

Se o e-mail **não** aparecer no Mailpit: confira que **as 5 `SMTP_*` + `AUTH_RESET_FROM`** estão no
`.env` (falta de uma → mailer no-op, silencioso).

---

## 7. Encerrar

```bash
docker compose -f compose.yaml -f compose.override.yaml down       # para, PRESERVA volumes
docker compose -f compose.yaml -f compose.override.yaml down -v    # ⚠️ apaga MySQL + MinIO
```

---

## 8. Tabela-resumo das envs (todas verificadas no código)

| Grupo | Env | Obrigatória? | Fonte no código |
| --- | --- | --- | --- |
| HTTP | `PORT` `HOST` `LOG_LEVEL` `CORS_ORIGINS` `TRUST_PROXY` `RATE_LIMIT_MAX` | não (defaults) | `shared/http/config.ts` |
| MySQL | `AUTH_DRIVER` `CONTRACTS_DRIVER` `PARTNERS_DRIVER` `PROGRAMS_DRIVER` = `mysql` | p/ persistir | `src/server.ts` |
| MySQL | `*_DATABASE_URL` (4) · `*_READER_URL` (opc.) | com driver mysql | `src/server.ts` |
| S3 docs+fotos | `S3_ENDPOINT` `S3_REGION` `S3_BUCKET` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` `S3_FORCE_PATH_STYLE` | **sim** se `CONTRACTS_DRIVER=mysql` | `contracts/adapters/storage/s3-config-aws.ts` · `auth/.../composition.ts` |
| S3 logo | `PROGRAMS_LOGO_S3_*` (5) | tudo-ou-nada | `src/server.ts` (`readProgramsLogoConfig`) |
| E-mail | `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` + `AUTH_RESET_FROM` (`AUTH_INVITE_FROM` opc.) | p/ enviar | `notifications/.../nodemailer-config.ts` · `auth/.../composition.ts` |
| JWT | `AUTH_JWT_PRIVATE_KEY` `AUTH_JWT_PUBLIC_KEY` (PEM ES256) | opc. (efêmero) | `auth/.../composition.ts` (`loadOrGenerateKeys`) |
| Reset link | `AUTH_RESET_BASE_URL` | recomendada | `src/server.ts` |
| RBAC seed | `CORE_API_E2E=1` + `AUTH_SEED_JSON` | dev/homolog | `auth/adapters/http/e2e-seed.ts` |
| Magalu (prod) | `MAGALU_REGION` `MAGALU_BUCKET` `MAGALU_ACCESS_KEY_ID` `MAGALU_SECRET_ACCESS_KEY` | só prod (alt. ao S3_*) | `contracts/.../magalu-cloud-config.ts` |

> **Produção ≠ este guia:** em prod não se usa MinIO/Mailpit nem `CORE_API_E2E`. Storage vira AWS S3
> ou **Magalu Cloud** (`MAGALU_*`), e-mail vira Resend/SES com domínio verificado, segredos vêm de um
> Secrets Manager (não de `.env` em disco). Ver `02-environments.md` e `03-secrets-catalog.md`.
