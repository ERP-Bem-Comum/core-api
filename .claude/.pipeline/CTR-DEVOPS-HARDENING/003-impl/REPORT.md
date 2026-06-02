# W1 — Implementação (CTR-DEVOPS-HARDENING)

**Data:** 2026-06-02 · 3 fatias disjuntas, agentes especialistas.

## Fatia PNPM/CI (`pnpm-workspace-expert`)
- **`.github/workflows/test-and-quality.yml`** (novo) — Node 24 + corepack pnpm 11.5.0 + cache do store; gates em ordem: typecheck → format:check → lint → audit → test. Trigger push `main` + PR. (`test:integration` omitido com nota: exige serviço MySQL.)
- **`.npmrc`** — `+audit-level=high`, `+strict-peer-dependencies=true` (sem duplicar `only-allow`/supply-chain já em `pnpm-workspace.yaml`).
- **`package.json`** — scripts `audit`, `outdated`.

## Fatia DOCKER (`docker-compose-expert`)
- **`compose.yaml`** — MinIO via `*_FILE` + bloco `secrets:` (root user/password); `minio-bootstrap` lê de `/run/secrets/*`; `minio/mc` e `minio/minio` pinados em tag `RELEASE.*` + digest.
- **`scripts/setup-secrets.ts`** — gera `minio_root_user.txt`/`minio_root_password.txt`.
- **`Dockerfile`** — estágio `deps-prod` (`pnpm install --prod --ignore-scripts`); runtime copia `node_modules` dele (exclui devDeps/tsgo, alvo ~924MB→~300-400MB); `+--enable-source-maps` no `NODE_OPTIONS`.
- **`.dockerignore`** — exclui `tests/` completo.

## Fatia NODE (`nodejs-runtime-expert`)
- **`src/shared/runtime/shutdown-once.ts`** (novo) — `makeShutdownOnce` com guard booleano.
- **`src/server.ts`** — usa `makeShutdownOnce` nos sinais + last-resort (idempotência).
- **`src/shared/runtime/last-resort.ts`** — stack completo em `uncaughtException`.
- **`.env.example`** (novo) — variáveis de `src/server.ts`/`config.ts`, sem valores reais.
