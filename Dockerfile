# syntax=docker/dockerfile:1.10
#
# core-api — módulo Contracts
# ─────────────────────────────────────────────────────────────────────────────
# Stack: Node.js 24 LTS (Krypton) + TypeScript 6 — ver ADR-0009.
# Persistência: MySQL 8 (ADR-0020). `mysql2` é JS puro, sem binário nativo —
# stage `deps` não precisa de toolchain C++.
#
# Camadas:
#   1. base    — pin do node:24.15-alpine por digest (ADR-0011 supply chain)
#   2. deps    — instala dependências (sem toolchain C++)
#   3. runtime — imagem final mínima, non-root, signal-safe
#
# Por que esta arquitetura?
#   - Multi-stage isola pnpm install no estágio `deps` (cache mount BuildKit),
#     mantendo o estágio `runtime` enxuto.
#   - Digest pin garante reproducibilidade — não pega rebuild silencioso da tag.
#   - --ignore-scripts barra postinstall scripts maliciosos (Inquiry-0005).
# ─────────────────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────────────────
# Stage 1 — base
# Pin: digest do índice multi-arch (amd64 + arm64 + s390x), Alpine 3.23.
# Para atualizar: `docker buildx imagetools inspect node:24.15-alpine --format '{{.Manifest.Digest}}'`
# ────────────────────────────────────────────────────────────────────────────
FROM node:24.15-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS base

# tini é o init mínimo (PID 1) para reaping de zumbis e forward de SIGTERM/SIGINT
# (Alpine não monta `/init`; equivalente ao flag `--init` do `docker run`).
RUN apk add --no-cache tini

# Corepack habilita pnpm sem npm install global. Versão pinada (ADR-0012).
ENV PNPM_VERSION=10.0.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# ────────────────────────────────────────────────────────────────────────────
# Stage 2 — deps
# Sem toolchain C++ (CTR-CLEANUP-SQLITE #5 removeu better-sqlite3). Cache mount
# BuildKit acelera builds repetidos em CI.
# ────────────────────────────────────────────────────────────────────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

# --frozen-lockfile (ADR-0011) + --ignore-scripts (zero allowlist necessária
# após remoção de better-sqlite3 — `mysql2` e `drizzle-orm` são JS puros).
# Cache mount do BuildKit acelera builds repetidos em CI.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install \
      --frozen-lockfile \
      --prod=false \
      --ignore-scripts

# ────────────────────────────────────────────────────────────────────────────
# Stage 3 — runtime
# Imagem final: Node + tini + node_modules + src. Non-root, signal-safe.
# Sem libc6-compat (nenhum binário nativo linkado contra glibc).
# ────────────────────────────────────────────────────────────────────────────
FROM base AS runtime

# OCI labels para descoberta/auditoria — usados por scanners (Docker Scout,
# Trivy, Snyk) e registries (Harbor, GitHub Container Registry).
LABEL org.opencontainers.image.title="core-api" \
      org.opencontainers.image.description="ERP Bem Comum — Modular Monolith. Fase 1: módulo Contracts." \
      org.opencontainers.image.vendor="Envolve / Bem Comum" \
      org.opencontainers.image.source="https://github.com/envolve/bem-comum-core-api" \
      org.opencontainers.image.licenses="proprietary" \
      org.opencontainers.image.base.name="docker.io/library/node:24.15-alpine"

# Variáveis de runtime.
# - NODE_ENV=production: stripping de warnings, otimizações.
# - NODE_NO_WARNINGS=1: silencia avisos experimentais (strip-types em Node 24).
# - NODE_OPTIONS: habilita strip-types nativamente + suprime warning explícito
#   (defesa em profundidade contra NODE_NO_WARNINGS ser desativado por debugger).
ENV NODE_ENV=production \
    NODE_NO_WARNINGS=1 \
    NODE_OPTIONS="--experimental-strip-types --no-warnings"

# Copia node_modules do estágio deps.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

# Código de produção. `tsconfig.json` e `drizzle.config.ts` ficam pra suportar
# `drizzle-kit` se chamado em runtime para migrations.
COPY src ./src
COPY tsconfig.json drizzle.config.ts ./

# Usuário não-root com UID explícito (estabilidade entre rebuilds — Docker
# Building best practices §USER). 10001 escolhido fora do range padrão do
# Alpine (1000-9999) para evitar conflito.
ARG APP_UID=10001
ARG APP_GID=10001
RUN addgroup -S -g ${APP_GID} app \
 && adduser -S -u ${APP_UID} -G app -h /app -s /sbin/nologin app \
 && chown -R app:app /app
USER app:app

# Sinal de parada limpa. Node 24 responde a SIGTERM via `process.on('SIGTERM')`.
STOPSIGNAL SIGTERM

# CLI ainda não expõe HTTP — sem healthcheck por enquanto. Quando o adapter
# HTTP entrar, descomentar abaixo:
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD wget -q --spider http://localhost:8080/health || exit 1

# `tini` como PID 1, depois `node` com flags. ENTRYPOINT é o binário Node
# direto (sem shell) — encaminha sinais corretamente sem precisar de shell-trap.
ENTRYPOINT ["tini", "--", "node", "src/modules/contracts/cli/main.ts"]

# Default: lista contratos. Override com `docker run <image> <subcomando> ...`.
CMD ["listar-contratos"]
