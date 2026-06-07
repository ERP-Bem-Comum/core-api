# syntax=docker/dockerfile:1.10
#
# core-api — módulo Contracts
# ─────────────────────────────────────────────────────────────────────────────
# Stack: Node.js 24 LTS (Krypton) + TypeScript 6 — ver ADR-0009.
# Persistência: MySQL 8 (ADR-0020). `mysql2` é JS puro, sem binário nativo —
# stage `deps` não precisa de toolchain C++.
#
# Camadas:
#   1. base    — pin do node:24.15-bookworm-slim por digest (ADR-0011 supply chain)
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
# Para atualizar: `docker buildx imagetools inspect node:24.15-bookworm-slim --format '{{.Manifest.Digest}}'`
# Digest atual (2026-06-07): sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d
# ────────────────────────────────────────────────────────────────────────────
FROM node:24.15-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS base

# tini é o init mínimo (PID 1) para reaping de zumbis e forward de SIGTERM/SIGINT.
# Disponível via apt em Debian — equivalente ao `apk add tini` do Alpine anterior.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

# Corepack habilita pnpm sem npm install global. Versão pinada (ADR-0029).
ENV PNPM_VERSION=11.5.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# ────────────────────────────────────────────────────────────────────────────
# Stage 2 — deps
# Sem toolchain C++ (CTR-CLEANUP-SQLITE #5 removeu better-sqlite3). Cache mount
# BuildKit acelera builds repetidos em CI.
# esbuild (transitiva de drizzle-kit) resolve corretamente em glibc/linux-x64.
# ────────────────────────────────────────────────────────────────────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

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
      org.opencontainers.image.base.name="docker.io/library/node:24.15-bookworm-slim"

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

# CLI ainda não expõe HTTP — sem healthcheck por enquanto. Quando o adapter
# HTTP entrar, descomentar abaixo:
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD wget -q --spider http://localhost:8080/health || exit 1

# `tini` como PID 1, depois `node` com flags. ENTRYPOINT é o binário Node
# direto (sem shell) — encaminha sinais corretamente sem precisar de shell-trap.
ENTRYPOINT ["tini", "--", "node", "src/modules/contracts/cli/main.ts"]

# Default: lista contratos. Override com `docker run <image> <subcomando> ...`.
CMD ["listar-contratos"]
