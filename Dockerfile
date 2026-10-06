# syntax=docker/dockerfile:1
#
# ⚠️ `:1` e NUNCA um minor fixo. A doc oficial é explícita: `docker/dockerfile:1` acompanha a
# última 1.x.x e o BuildKit checa atualização a cada build, enquanto "if a specific version is
# used, such as `1.2` or `1.2.1`, the Dockerfile needs to be updated manually to continue
# receiving bugfixes and new features" (https://docs.docker.com/build/buildkit/frontend/).
# Este arquivo ficou em `1.10` até 06/10/2026 — 17 minors atrás da ponta (`1.27.1`), sem receber
# correção desde que a `1.11` saiu, e ninguém tinha como notar.
#
# Por que isto NÃO contraria o digest pin do ADR-0011, que vale para a imagem base abaixo: o
# frontend do `# syntax` é baixado em tempo de BUILD e não entra na imagem final — ele não afeta a
# reprodutibilidade do que roda em produção, que é o que aquele ADR protege. Um minor fixo aqui
# não era nem imutável (recebe patches `1.10.x`) nem atualizado: era o pior dos dois mundos.
#
# core-api — módulo Contracts
# ─────────────────────────────────────────────────────────────────────────────
# Stack: Node.js 24 LTS (Krypton) + TypeScript 6 — ver ADR-0009.
# Persistência: MySQL 8 (ADR-0020). `mysql2` é JS puro, sem binário nativo —
# stage `deps` não precisa de toolchain C++.
#
# Camadas:
#   1. base    — pin do node:24.21-bookworm-slim por digest (ADR-0011 supply chain)
#   2. deps    — instala dependências (sem toolchain C++)
#   3. runtime — imagem final mínima, non-root, signal-safe
#
# Por que bookworm-slim e não alpine?
#   - `drizzle-kit` puxa `esbuild` como dependência transitiva. O esbuild distribui
#     binários nativos pré-compilados para linux/x64 ligados contra glibc (gnu libc).
#     Alpine usa musl libc — ABI incompatível. O pnpm não encontra variant musl no
#     lockfile (que só tem entradas linux-x64 glibc) e falha com
#     ERR_PNPM_NO_RESOLUTION_MATCHED. bookworm-slim é Debian 12, glibc nativa —
#     elimina essa classe de erro definitivamente.
#   - ADR-0011 exige digest pin e frozen-lockfile; não exige Alpine.
#   - `tini` está disponível via apt (pacote `tini`) — mesma função de PID 1.
#   - `addgroup`/`adduser` Alpine → `groupadd`/`useradd` Debian (ajuste de sintaxe).
#
# Por que esta arquitetura?
#   - Multi-stage isola pnpm install no estágio `deps` (cache mount BuildKit),
#     mantendo o estágio `runtime` enxuto.
#   - Digest pin garante reproducibilidade — não pega rebuild silencioso da tag.
#   - --ignore-scripts barra postinstall scripts maliciosos (Inquiry-0005).
# ─────────────────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────────────────
# Stage 1 — base
# Pin: digest do índice multi-arch (amd64 + arm64), Debian 12 Bookworm Slim.
# Para atualizar: `docker buildx imagetools inspect node:24.21-bookworm-slim --format '{{.Manifest.Digest}}'`
# Digest atual (2026-10-06): sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
#
# A major.minor desta tag é cobrada contra o `.nvmrc` por
# `tests/cleanup/node-version-single-source.test.ts` — subir aqui sem subir lá (ou vice-versa) fica
# vermelho no gate. O digest em si o teste NÃO cobra: a tag é reconstruída upstream a cada patch
# de Debian, e digest errado já falha o build com `manifest unknown`.
# ────────────────────────────────────────────────────────────────────────────
FROM node:24.21-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS base

# tini é o init mínimo (PID 1) para reaping de zumbis e forward de SIGTERM/SIGINT.
# Disponível via apt em Debian — equivalente ao `apk add tini` do Alpine anterior.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

# Corepack habilita pnpm sem npm install global. Versão pinada (ADR-0029).
ENV PNPM_VERSION=11.18.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# ────────────────────────────────────────────────────────────────────────────
# Stage 2 — deps
# Sem toolchain C++ (CTR-CLEANUP-SQLITE #5 removeu better-sqlite3). Cache mount
# BuildKit acelera builds repetidos em CI.
# esbuild (transitiva de drizzle-kit) resolve corretamente em glibc/linux-x64.
# ────────────────────────────────────────────────────────────────────────────
FROM base AS deps

# pnpm-workspace.yaml é necessário aqui: carrega `overrides` (security fixes —
# Dependabot/esbuild) que o `--frozen-lockfile` valida contra o lock. Sem ele o
# build falha com ERR_PNPM_LOCKFILE_CONFIG_MISMATCH (override no lock sem config).
# pnpm 11 ignora package.json#pnpm.overrides quando há pnpm-workspace.yaml.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --frozen-lockfile (ADR-0011) + --ignore-scripts (zero allowlist necessária
# após remoção de better-sqlite3 — `mysql2` e `drizzle-orm` são JS puros).
# Cache mount do BuildKit acelera builds repetidos em CI.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install \
      --frozen-lockfile \
      --prod \
      --ignore-scripts

# ────────────────────────────────────────────────────────────────────────────
# Stage 3 — runtime
# Imagem final: Node + tini + node_modules + src. Non-root, signal-safe.
# glibc nativa (bookworm-slim) — sem shim de compatibilidade necessário.
# ────────────────────────────────────────────────────────────────────────────
FROM base AS runtime

# OCI labels para descoberta/auditoria — usados por scanners (Docker Scout,
# Trivy, Snyk) e registries (Harbor, GitHub Container Registry).
LABEL org.opencontainers.image.title="core-api" \
      org.opencontainers.image.description="ERP Bem Comum — Modular Monolith. Fase 1: módulo Contracts." \
      org.opencontainers.image.vendor="Envolve / Bem Comum" \
      org.opencontainers.image.source="https://github.com/envolve/bem-comum-core-api" \
      org.opencontainers.image.licenses="proprietary" \
      org.opencontainers.image.base.name="docker.io/library/node:24.21-bookworm-slim"

# Variáveis de runtime.
# - NODE_ENV=production: stripping de warnings, otimizações.
#
# NÃO há mais NODE_OPTIONS nem NODE_NO_WARNINGS aqui, e as duas remoções foram medidas no runtime
# do `devEngines` (ver `tests/cleanup/node-flags-not-redundant.test.ts`):
#   - `--experimental-strip-types` é redundante: o stripping é DEFAULT desde o Node 23.6 — a prova
#     é `--no-strip-types` existir como negação no `--help`. O ENTRYPOINT abaixo executa `.ts`
#     direto, sem flag, porque o runtime já faz isso.
#   - `NODE_NO_WARNINGS=1` + `--no-warnings` existiam para calar o `ExperimentalWarning` do
#     stripping, que não é mais emitido. Mantê-los passou a significar **engolir
#     `DeprecationWarning` em produção** — justamente o canal pelo qual o Node anuncia o que
#     quebra na próxima major, e a informação que torna acionável a disciplina de subida de
#     runtime do ADR-0073. Em contêiner, esse aviso vai para o stderr → log do ECS, que é onde
#     deveria ter estado desde sempre.
ENV NODE_ENV=production

# Copia node_modules do estágio deps.
COPY --from=deps /app/node_modules ./node_modules
# pnpm-workspace.yaml também no runtime: `pnpm <script>` (ex.: `pnpm job:auth:sync-permissions`
# no deploy) roda o deps-status-check do pnpm 11, que revalida `overrides` (esbuild) contra o lock.
# Sem o workspace aqui, `overrides` fica vazio vs. lock → ERR_PNPM_LOCKFILE_CONFIG_MISMATCH.
# (O exemplo era `pnpm seed:admin` — comando que não existe na imagem, já que `scripts/` não é
# copiado. Era o sintoma do #462: a intenção estava documentada e quebrada.)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Código de produção. `tsconfig.json` fica pra suportar tooling; os configs do
# drizzle-kit (dev-only, devDependency) vivem em db/drizzle/ e não vão pro runtime.
COPY src ./src
COPY tsconfig.json ./

# Usuário não-root com UID explícito (estabilidade entre rebuilds — Docker
# Building best practices §USER). Sintaxe Debian: groupadd/useradd.
# UID/GID 10001 fora do range padrão Debian para evitar conflito.
ARG APP_UID=10001
ARG APP_GID=10001
RUN groupadd -r app --gid ${APP_GID} \
 && useradd -r -g app --uid ${APP_UID} -d /app -s /sbin/nologin app \
 && chown -R app:app /app
USER app:app

# Sinal de parada limpa. Node 24 responde a SIGTERM via `process.on('SIGTERM')`.
STOPSIGNAL SIGTERM

# HTTP-first (ADR-0037): a borda primária é o servidor HTTP (`src/server.ts`).
# Endpoint /health: src/shared/http/app.ts:185 → retorna {"status":"ok"}.
# Porta: DEFAULT_PORT=3000 (src/shared/http/config.ts); override via env PORT.
# Probe via node (Node 24 fetch global) — a imagem base (bookworm-slim) NÃO tem
# curl nem wget, então `CMD wget ...` seria exit 127. O probe node é puro runtime.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

# `tini` como PID 1, depois `node` executando o `.ts` direto (stripping é default no Node 24).
# ENTRYPOINT é o binário Node direto (sem shell) — encaminha sinais corretamente sem shell-trap.
#
# CLI-RETIRE-EMBEDDED (ADR-0037): a CLI embutida foi removida; o entrypoint é o servidor HTTP.
# O worker de outbox roda em processo dedicado: `node src/modules/contracts/worker/run.ts`
# (override do command no orquestrador / `pnpm run worker:outbox`).
ENTRYPOINT ["tini", "--", "node", "src/server.ts"]
