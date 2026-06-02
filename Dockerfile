# syntax=docker/dockerfile:1.10
#
# core-api — módulo Contracts
# ─────────────────────────────────────────────────────────────────────────────
# Stack: Node.js 24 LTS (Krypton) + TypeScript 6 — ver ADR-0009.
# Persistência: MySQL 8 (ADR-0020). `mysql2` é JS puro, sem binário nativo —
# stage `deps` não precisa de toolchain C++.
#
# Camadas:
#   1. base      — pin do node:24.16-bookworm-slim por digest (ADR-0011 supply chain)
#   2. deps      — instala TODAS as dependências (incl. devDeps) — para CI/lint
#   3. deps-prod — instala apenas produção (--prod); alimenta o runtime
#   4. runtime   — imagem final mínima, non-root, signal-safe
#
# Por que esta arquitetura?
#   - Multi-stage isola pnpm install no estágio `deps` (cache mount BuildKit),
#     mantendo o estágio `runtime` enxuto.
#   - Digest pin garante reproducibilidade — não pega rebuild silencioso da tag.
#   - --ignore-scripts barra postinstall scripts maliciosos (Inquiry-0005).
# ─────────────────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────────────────
# Stage 1 — base
# Pin: digest do índice multi-arch (amd64 + arm64), Debian bookworm-slim (glibc).
# glibc (não Alpine/musl): binários nativos de devDeps — ex. @typescript/native-preview
# (tsgo, ADR-0009) — só publicam variante glibc; em musl o pnpm install quebra com
# ERR_PNPM_NO_RESOLUTION_MATCHED. Para atualizar o digest:
#   docker buildx imagetools inspect node:24.16-bookworm-slim --format '{{.Manifest.Digest}}'
# ────────────────────────────────────────────────────────────────────────────
FROM node:24.16-bookworm-slim@sha256:242549cd46785b480c832479a730f4f2a20865d61ea2e404fdb2a5c3d3b73ecf AS base

# tini é o init mínimo (PID 1) para reaping de zumbis e forward de SIGTERM/SIGINT
# (equivalente ao flag `--init` do `docker run`).
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

# Corepack habilita pnpm sem npm install global. Versão pinada (ADR-0029).
ENV PNPM_VERSION=11.5.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# ────────────────────────────────────────────────────────────────────────────
# Stage 2 — deps (todas as dependências, incluindo devDeps)
# Usada apenas para CI/typecheck/lint. Não vai para a imagem final.
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
# Stage 3 — deps-prod (somente dependências de produção)
# Multi-stage builds §"Stop at a specific build stage" — instala apenas as
# deps declaradas em `dependencies` (sem devDeps: drizzle-kit, typescript,
# eslint, prettier, @types/*, etc.). Reduz node_modules copiado para o runtime.
#
# drizzle-kit é devDep — NÃO é necessário em runtime. O migrador usa
# `drizzle-orm/mysql2/migrator` (produção) com os arquivos SQL já gerados em
# src/modules/*/adapters/persistence/migrations/. Nunca chama `drizzle-kit` em
# runtime (confirmado: zero imports de 'drizzle-kit' em src/).
# ────────────────────────────────────────────────────────────────────────────
FROM base AS deps-prod

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm-prod,target=/root/.local/share/pnpm/store \
    pnpm install \
      --frozen-lockfile \
      --prod \
      --ignore-scripts

# ────────────────────────────────────────────────────────────────────────────
# Stage 4 — runtime
# Imagem final: Node + tini + node_modules (prod-only) + src. Non-root, signal-safe.
# Base glibc (bookworm-slim): binários nativos rodam sem shim de compatibilidade.
# ────────────────────────────────────────────────────────────────────────────
FROM base AS runtime

# OCI labels para descoberta/auditoria — usados por scanners (Docker Scout,
# Trivy, Snyk) e registries (Harbor, GitHub Container Registry).
LABEL org.opencontainers.image.title="core-api" \
      org.opencontainers.image.description="ERP Bem Comum — Modular Monolith. Fase 1: módulo Contracts." \
      org.opencontainers.image.vendor="Envolve / Bem Comum" \
      org.opencontainers.image.source="https://github.com/envolve/bem-comum-core-api" \
      org.opencontainers.image.licenses="proprietary" \
      org.opencontainers.image.base.name="docker.io/library/node:24.16-bookworm-slim"

# Variáveis de runtime.
# - NODE_ENV=production: stripping de warnings, otimizações.
# - NODE_NO_WARNINGS=1: silencia avisos experimentais (strip-types em Node 24).
# - NODE_OPTIONS: habilita strip-types nativamente + suprime warning explícito
#   (defesa em profundidade contra NODE_NO_WARNINGS ser desativado por debugger).
ENV NODE_ENV=production \
    NODE_NO_WARNINGS=1 \
    NODE_OPTIONS="--experimental-strip-types --enable-source-maps --no-warnings"

# Copia node_modules do estágio deps-prod (somente produção — sem drizzle-kit,
# typescript, eslint, etc.). Reduz a superfície da imagem final.
COPY --from=deps-prod /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

# Código de produção. `tsconfig.json` e `drizzle.config.ts` ficam pra suportar
# o carregamento de módulos TS em runtime via --experimental-strip-types.
# `drizzle-kit` NÃO está no node_modules desta imagem (produção); migrations
# já são SQL pré-gerados em src/modules/*/adapters/persistence/migrations/.
COPY src ./src
COPY tsconfig.json drizzle.config.ts ./

# Usuário não-root com UID explícito (estabilidade entre rebuilds — Docker
# Building best practices §USER). 10001 escolhido fora do range padrão do
# Debian (1000-59999) para evitar conflito.
ARG APP_UID=10001
ARG APP_GID=10001
RUN groupadd -r -g ${APP_GID} app \
 && useradd -r -u ${APP_UID} -g app -d /app -s /usr/sbin/nologin app \
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
