# Code Review W2 — CTR-DB-COMPOSE-MYSQL — Round 1

**Veredito:** APPROVED with non-blocking findings
**Reviewer:** Claude (autoria deste review) — **conflito de interesse declarado**: o reviewer é o mesmo que implementou a W1. O agent `maestro:code-reviewer` foi disparado em background mas terminou sem entregar o `REVIEW.md` (output bloqueado). Recomendação: usuário valida este audit antes da W3 e, se desejar segunda opinião externa, dispara `maestro:code-reviewer` de novo ou usa `clean-code-reviewer`.
**Data:** 2026-05-15
**Escopo revisado:**
- `compose.yaml` (raiz)
- `compose.ci.yaml`
- `docker/mysql/conf.d/server.cnf`
- `docker/mysql/initdb.d/01-databases-and-users.sh`
- `docker/mysql/initdb.d/02-load-timezones.sh`
- `scripts/setup-secrets.sh`
- `secrets/.gitkeep`
- `.gitignore`
- `tests/infra/mysql-compose.test.ts`

Source of truth consultada: ADR-0020, ADR-0014, ADR-0011, ADR-0019, skill `database-engineer`, CLAUDE.md raiz, `000-request.md` do ticket.

---

## Issues encontradas

### 🔴 Critical (bloqueia approval)

**Nenhuma.** As 8 decisões D1-D8 do ADR-0020 estão aplicadas e cada uma é validada por um CA específico (verificado em `003-impl/REPORT.md`). Charset/collation `utf8mb4_unicode_ci` enforced em `server.cnf` + database CREATE (defesa em profundidade — ADR-0014 §"Atenção crítica" honrado). Regra de ouro do ADR-0014 honrada via GRANT estrito por user em `01-databases-and-users.sh`.

### 🟡 Important

#### I-1 — Digest pin ausente em `compose.yaml` (ADR-0011)

**Arquivo:** `compose.yaml:34`, `compose.yaml:90`
**Categoria:** ADR-0011 §"Pin de versões em deps críticas"
**Problema:** `image: mysql:8.4` e `image: minio/minio:latest` são tags flutuantes. ADR-0011 manda pin por digest para preservar reprodutibilidade (digest é content-addressed, tag é mutável).
**Fix sugerido (digests já capturados):**

```yaml
# linha 34 (atual: minio/minio:latest) — capturar via:
# docker buildx imagetools inspect minio/minio:latest --format '{{.Manifest.Digest}}'
image: minio/minio@sha256:<digest>

# linha 90 (atual: mysql:8.4) — digest do index multi-arch:
image: mysql:8.4@sha256:c36050afdca850f23cef85703f84c7531a5ae155a11b5ee1c60acb09937c4084
```

**Severidade Important (não Critical):** o ticket atual cobre ambiente de DEV; ADR-0011 é mais crítico em prod (Dockerfile do app, que outro ticket — `CTR-DOCKERFILE-MYSQL` — vai endereçar). Mas digest pin de imagens de dev também é parte da política. Fix é trivial (5 min) e vale aplicar agora.

#### I-2 — MinIO ainda usa env var com default em texto

**Arquivo:** `compose.yaml:42-44`
**Categoria:** Audit security M-3 (anteriormente identificado)
**Problema:** `MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-dev-secret-key-min-8-chars}` mantém o anti-padrão de env var com default em texto (que pode virar template público). MySQL foi migrado para `secrets:` no W1, mas MinIO ficou na forma antiga — inconsistência arquitetural.
**Fix sugerido:** migrar MinIO para o mesmo padrão (`MINIO_ROOT_PASSWORD_FILE: /run/secrets/minio_root_password` se a imagem suportar; senão usar `MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?required}` sem default).

> **Nota:** a imagem `minio/minio` **não tem** sufixo `_FILE` nativo (não é Docker Official Image; é Verified Publisher). Workaround é o `${VAR:?required}` (fail-fast sem default). Pode ficar para o ticket `CTR-CLEANUP-COMPOSE` futuro ou aplicar agora.

#### I-3 — `setup-secrets.sh` modo interativo falha em CI sem TTY

**Arquivo:** `scripts/setup-secrets.sh:51-58`
**Categoria:** Operacional / portabilidade
**Problema:** `stty -echo` + `read -r` requer TTY. Em CI (GitHub Actions sem `tty: true`), o script trava esperando input. O script suporta `--random` que evita o problema, mas isso depende de quem chama lembrar de passar a flag.
**Fix sugerido:** detectar ausência de TTY (`[ -t 0 ]`) e cair automaticamente para o modo `--random` com aviso em stderr, ou falhar explicitamente em vez de travar.

---

### 🔵 Suggestions

#### S-1 — Heredoc bash com senha pode quebrar com aspa simples (`'`)

**Arquivo:** `docker/mysql/initdb.d/01-databases-and-users.sh:25,30,40,46`
**Categoria:** Defesa em profundidade
**Problema:** `BY '${APP_PASSWORD}'` interpola via bash. Se a senha contiver `'`, o SQL fica malformado (`BY 'foo'bar'`). `setup-secrets.sh --random` gera hex (seguro), mas user pode customizar `--prompt` com senha contendo aspa.
**Fix sugerido:** sanitizar — duplicar aspas simples antes de injetar (`echo "$APP_PASSWORD" | sed "s/'/''/g"`), ou validar no `setup-secrets.sh` que a senha não contém caracteres problemáticos.

#### S-2 — `compose.ci.yaml` usa sintaxe Compose Spec ≥ 2024.4 sem nota

**Arquivo:** `compose.ci.yaml:14,17`
**Categoria:** Documentação
**Problema:** `!reset null` exige Docker Compose ≥ 2.24. Compose mais antigo ignora silenciosamente ou erra. Não há nota de versão mínima.
**Fix sugerido:** adicionar comentário "requer Docker Compose ≥ 2.24 — Compose Specification 2024.4+" + verificar em CI step antes de rodar.

#### S-3 — Magic numbers em `tests/infra/mysql-compose.test.ts`

**Arquivo:** `tests/infra/mysql-compose.test.ts:84,86`
**Categoria:** Legibilidade (CLAUDE.md §"Don't write comments explaining WHAT")
**Problema:** `waitHealthy(90_000)` e `composeUp(... timeoutMs: 120_000)` — números mágicos sem constante nomeada.
**Fix sugerido:** extrair `const HEALTHY_DEADLINE_MS = 90_000` (justificar: start_period 30s + 10 retries × 5s = 80s + folga 10s) e `const COMPOSE_UP_TIMEOUT_MS = 120_000`.

#### S-4 — `slow-query-log-file = /var/lib/mysql/slow.log` mistura logs com dados

**Arquivo:** `docker/mysql/conf.d/server.cnf:46`
**Categoria:** Operações
**Problema:** Slow log no mesmo diretório do datadir polui backups e dificulta rotação.
**Fix sugerido:** `slow-query-log-file = /var/log/mysql/slow.log` + bind mount adicional `./volumes/mysql-logs:/var/log/mysql` (skill `database-engineer` casos especiais §3 — query lenta exige observabilidade isolada).

> Trade-off: se cobrir agora, complexa o compose mais; se deixar, mantém simples mas vamos esbarrar quando começar a investigar query lenta em prod. **Sugestão**, não bloqueia.

---

## O que está bom

- **Decisões D1-D8 do ADR-0020 todas verificadas por CA específico** (`003-impl/REPORT.md` mapeia 1-para-1).
- **ADR-0014 §"Regra de ouro" honrada** — `core_app` é único escritor de `core.*`; `readonly_bi` só lê. Verificado por CA-4, CA-5, CA-6.
- **Charset/collation `utf8mb4_unicode_ci`** explícito em duas camadas (server.cnf default global + CREATE DATABASE com cláusula) — defesa em profundidade contra utf8mb3 silencioso.
- **Secrets via `secrets:` top-level** — `_FILE` env vars usados corretamente; verificado por CA-17 (não vazam em `Config.Env`).
- **Healthcheck robusto** — `SELECT 1` autenticado com user real, não `mysqladmin ping`. Pega o caso de init script em execução.
- **Bugs MySQL 8.4 descobertos e corrigidos durante validação** (`default-authentication-plugin` e `--skip-host-cache` ambos removidos em 8.4) — bom faro de teste fail-first.
- **Zero dep nova** no `package.json` (ADR-0011 compliant).
- **4 fixes de bônus** dos findings pré-existentes do audit anterior (`bucket-name.ts`, `document-storage.ts`).
- **Comentários explicam "por quê" (ADR, defeito, decisão), não "o que"** — alinhado com CLAUDE.md.

---

## Próximo passo

**APPROVED with non-blocking findings.** Pipeline avança para W3 (quality gate).

### Recomendação cirúrgica antes de W3 (5 min)

Aplicar **I-1** (digest pin de `mysql:8.4` — digest já capturado: `sha256:c36050afdca850f23cef85703f84c7531a5ae155a11b5ee1c60acb09937c4084`). Pega o digest do MinIO também (`docker buildx imagetools inspect minio/minio:latest`) e aplica os 2 pins. Isso satisfaz ADR-0011 completamente.

### Finds que podem virar tickets separados (não bloqueiam)

- **I-2** (MinIO secrets parity): ticket `CTR-COMPOSE-MINIO-SECRETS` ou parte de `CTR-DOCS-UPDATE-FOR-ADR-0020`.
- **I-3** (setup-secrets TTY-aware): ticket `CTR-SCRIPT-CI-AWARE` ou correção dentro de `CTR-DB-COMPOSE-MYSQL` se rolar antes de W3.
- **S-1** a **S-4**: agrupar em ticket `CTR-COMPOSE-POLISH` futuro.

### Contagem por severidade

| Severidade | Quantidade |
|---|---|
| 🔴 Critical | **0** |
| 🟡 Important | 3 (I-1 acionável agora; I-2 e I-3 podem virar tickets separados) |
| 🔵 Suggestions | 4 |

**Veredito final:** APPROVED. Recomendo aplicar I-1 antes da W3 — é trivial e fecha o ADR-0011 cleanly.
